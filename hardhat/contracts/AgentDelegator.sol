// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Account} from "@openzeppelin/contracts/account/Account.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ERC7821} from "@openzeppelin/contracts/account/extensions/draft-ERC7821.sol";
import {ERC7579Utils, CallType, ExecType} from "@openzeppelin/contracts/account/utils/draft-ERC7579Utils.sol";
import {ERC4337Utils} from "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {AbstractSigner} from "@openzeppelin/contracts/utils/cryptography/signers/AbstractSigner.sol";
import {SignerERC7702} from "@openzeppelin/contracts/utils/cryptography/signers/SignerERC7702.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract AgentDelegator is Account, SignerERC7702, ERC7821, IERC1271 {
    using ECDSA for bytes32;
    using ERC7579Utils for bytes;

    // ========================
    // ERC-7201 Namespaced Storage
    // ========================

    /// @custom:storage-location erc7201:cronos-hackathon.agent.delegator
    struct DelegatorStorage {
        uint256 sessionNonce;
        mapping(bytes32 => Session) sessions;
        // Domain info for EIP-1271 signature validation (per-session, per-contract)
        mapping(bytes32 => mapping(address => DomainInfo)) sessionContractDomains;
    }

    // keccak256(toBytes("cronos-hackathon.agent.delegator")) - 1) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xa0c1d2d7f72a881653f7765d29f368af07d2f3cfc87dd25869b0087cfa6e7900;

    function _getDelegatorStorage() private pure returns (DelegatorStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ========================
    // Data Structures
    // ========================

    struct Session {
        address sessionKey;
        address[] allowedTargets;
        bytes4[] allowedSelectors;
        uint48 validAfter;
        uint48 validUntil;
        bool active;
    }

    /// @notice Domain info for EIP-712 signature verification
    struct DomainInfo {
        bytes32 nameHash;     // keccak256(domain name, e.g., "Bridged USDC (Stargate)")
        bytes32 versionHash;  // keccak256(version, e.g., "1")
    }

    /// @notice Contract approval with domain info for EIP-1271 signatures
    struct ApprovedContract {
        address contractAddress;
        bytes32 nameHash;
        bytes32 versionHash;
    }

    /// @dev Execution struct for ERC-7579 batch format
    struct Execution {
        address target;
        uint256 value;
        bytes callData;
    }

    // ========================
    // Events
    // ========================

    event SessionGranted(bytes32 indexed sessionId, address indexed sessionKey, uint48 validUntil);
    event SessionRevoked(bytes32 indexed sessionId);
    event ContractApproved(bytes32 indexed sessionId, address indexed approvedContract);

    // ========================
    // Errors
    // ========================

    error SessionNotFound();
    error SessionExpired();
    error SessionInactive();
    error InvalidSessionKey();
    error TargetNotAllowed(address target);
    error SelectorNotAllowed(bytes4 selector);
    error ContractNotApproved(address targetContract);
    error InvalidCallData();
    error DomainMismatch();

    // ========================
    // EIP-712 Constants
    // ========================

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("AgentDelegator");
    bytes32 private constant VERSION_HASH = keccak256("1");

    // EIP-712 typehash for EIP-1271 session signatures (binds to verifyingContract and structHash)
    bytes32 private constant SESSION_SIGNATURE_TYPEHASH =
        keccak256("SessionSignature(address verifyingContract,bytes32 structHash)");

    // EIP-712 typehash for ERC-4337 session signatures (binds to sessionId and userOpHash)
    bytes32 private constant ERC4337_SESSION_SIGNATURE_TYPEHASH =
        keccak256("ERC4337SessionSignature(bytes32 sessionId,bytes32 userOpHash)");

    // EIP-712 typehash for executeWithSession
    bytes32 private constant EXECUTE_WITH_SESSION_TYPEHASH =
        keccak256("ExecuteWithSession(bytes32 sessionId,bytes32 mode,bytes executionData)");

    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_domainSeparatorV4(), structHash);
    }

    // ========================
    // Session Management
    // ========================

    /// @notice Grant a new session to a session key
    /// @dev Only callable by the EOA owner (via delegation, so msg.sender == address(this))
    /// @param sessionKey The session key address
    /// @param allowedTargets Contracts the session can call via executeWithSession or ERC-4337
    /// @param allowedSelectors Function selectors the session can call
    /// @param validAfter Timestamp when session becomes valid
    /// @param validUntil Timestamp when session expires
    /// @param approvedContracts Contracts approved for EIP-1271 signatures with domain info
    function grantSession(
        address sessionKey,
        address[] calldata allowedTargets,
        bytes4[] calldata allowedSelectors,
        uint48 validAfter,
        uint48 validUntil,
        ApprovedContract[] calldata approvedContracts
    ) external returns (bytes32 sessionId) {
        require(msg.sender == address(this), "Only owner");

        DelegatorStorage storage $ = _getDelegatorStorage();

        sessionId = keccak256(abi.encode(address(this), sessionKey, $.sessionNonce++));

        Session storage session = $.sessions[sessionId];
        session.sessionKey = sessionKey;
        session.allowedTargets = allowedTargets;
        session.allowedSelectors = allowedSelectors;
        session.validAfter = validAfter;
        session.validUntil = validUntil;
        session.active = true;

        // Store approved contracts with domain info for EIP-1271 validation
        for (uint256 i = 0; i < approvedContracts.length; i++) {
            ApprovedContract calldata ac = approvedContracts[i];
            $.sessionContractDomains[sessionId][ac.contractAddress] = DomainInfo({
                nameHash: ac.nameHash,
                versionHash: ac.versionHash
            });
            emit ContractApproved(sessionId, ac.contractAddress);
        }

        emit SessionGranted(sessionId, sessionKey, validUntil);
    }

    /// @notice Revoke an existing session
    function revokeSession(bytes32 sessionId) external {
        require(msg.sender == address(this), "Only owner");

        DelegatorStorage storage $ = _getDelegatorStorage();
        $.sessions[sessionId].active = false;

        emit SessionRevoked(sessionId);
    }

    /// @notice Add approved contracts for EIP-1271 signatures to an existing session
    function addApprovedContracts(
        bytes32 sessionId,
        ApprovedContract[] calldata contracts
    ) external {
        require(msg.sender == address(this), "Only owner");

        DelegatorStorage storage $ = _getDelegatorStorage();
        Session storage session = $.sessions[sessionId];

        if (session.sessionKey == address(0)) revert SessionNotFound();

        for (uint256 i = 0; i < contracts.length; i++) {
            ApprovedContract calldata ac = contracts[i];
            $.sessionContractDomains[sessionId][ac.contractAddress] = DomainInfo({
                nameHash: ac.nameHash,
                versionHash: ac.versionHash
            });
            emit ContractApproved(sessionId, ac.contractAddress);
        }
    }


    // ========================
    // EIP-1271 Signature Validation
    // ========================

    /// @notice Validates signatures for EIP-1271 (used by USDC.e for x402)
    /// @dev Signature formats:
    ///      - 65 bytes: EOA signature (owner) - full access
    ///      - 97 bytes: REJECTED for EIP-1271 (only valid for ERC-4337)
    ///      - 149 bytes: sessionId (32) + verifyingContract (20) + structHash (32) + ecdsaSignature (65)
    function _rawSignatureValidation(
        bytes32 hash,
        bytes calldata signature
    ) internal view override(AbstractSigner, SignerERC7702) returns (bool) {
        // 65-byte: EOA owner signature (full access)
        if (signature.length == 65) {
            return super._rawSignatureValidation(hash, signature);
        }

        // 97-byte: Session key signature - REJECTED for EIP-1271
        // 97-byte format is only valid for ERC-4337 via validateUserOp
        if (signature.length == 97) {
            return false;
        }

        // 149-byte: EIP-1271 session key with domain preimage verification
        // Format: sessionId (32) + verifyingContract (20) + structHash (32) + ecdsaSignature (65)
        if (signature.length == 149) {
            bytes32 sessionId = bytes32(signature[0:32]);
            address verifyingContract = address(bytes20(signature[32:52]));
            bytes32 structHash = bytes32(signature[52:84]);
            bytes calldata ecdsaSig = signature[84:149];

            DelegatorStorage storage $ = _getDelegatorStorage();
            Session storage session = $.sessions[sessionId];

            // Session validity checks
            if (session.sessionKey == address(0)) return false;
            if (!session.active) return false;
            if (block.timestamp < session.validAfter) return false;
            if (block.timestamp > session.validUntil) return false;

            // Get domain info for this contract
            DomainInfo storage domain = $.sessionContractDomains[sessionId][verifyingContract];
            if (domain.nameHash == bytes32(0)) return false; // Not approved

            // Compute domain separator for the verifying contract
            bytes32 domainSeparator = keccak256(abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                domain.nameHash,
                domain.versionHash,
                block.chainid,
                verifyingContract
            ));

            // CRITICAL: Verify hash matches the preimage components
            // This proves the hash was constructed for this specific contract's domain
            bytes32 expectedHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
            if (expectedHash != hash) return false;

            // Verify session key signature over (verifyingContract, structHash)
            bytes32 sessionStructHash = keccak256(abi.encode(
                SESSION_SIGNATURE_TYPEHASH,
                verifyingContract,
                structHash
            ));
            bytes32 signedHash = _hashTypedDataV4(sessionStructHash);
            address recovered = signedHash.recover(ecdsaSig);

            return recovered == session.sessionKey;
        }

        return false;
    }

    /// @notice EIP-1271 signature validation
    function isValidSignature(
        bytes32 hash,
        bytes calldata signature
    ) external view override returns (bytes4) {
        if (_rawSignatureValidation(hash, signature)) {
            return IERC1271.isValidSignature.selector; // 0x1626ba7e
        }
        return bytes4(0xffffffff);
    }

    // ========================
    // ERC-4337 UserOperation Validation
    // ========================

    /// @notice Override to handle session key signatures for ERC-4337
    function _validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal override returns (uint256) {
        bytes calldata sig = userOp.signature;

        // 65-byte: Owner signature - full access
        if (sig.length == 65) {
            return super._validateUserOp(userOp, userOpHash);
        }

        // 97-byte: ERC-4337 session key signature
        // Format: sessionId (32) + ecdsaSignature (65)
        if (sig.length == 97) {
            return _validateSessionUserOp(userOp, userOpHash);
        }

        return ERC4337Utils.SIG_VALIDATION_FAILED;
    }

    /// @notice Validate session key signature for ERC-4337 UserOperation
    function _validateSessionUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256) {
        bytes calldata sig = userOp.signature;
        bytes32 sessionId = bytes32(sig[0:32]);
        bytes calldata ecdsaSig = sig[32:97];

        DelegatorStorage storage $ = _getDelegatorStorage();
        Session storage session = $.sessions[sessionId];

        // Validate session exists and is active
        if (session.sessionKey == address(0)) return ERC4337Utils.SIG_VALIDATION_FAILED;
        if (!session.active) return ERC4337Utils.SIG_VALIDATION_FAILED;

        // Verify signature over (sessionId, userOpHash)
        bytes32 structHash = keccak256(abi.encode(
            ERC4337_SESSION_SIGNATURE_TYPEHASH,
            sessionId,
            userOpHash
        ));
        bytes32 signedHash = _hashTypedDataV4(structHash);
        address recovered = signedHash.recover(ecdsaSig);

        if (recovered != session.sessionKey) return ERC4337Utils.SIG_VALIDATION_FAILED;

        // Validate scope using userOp.callData
        if (!_validateCallDataScope(session, userOp.callData)) {
            return ERC4337Utils.SIG_VALIDATION_FAILED;
        }

        // Return with time bounds
        return ERC4337Utils.packValidationData(true, session.validAfter, session.validUntil);
    }

    /// @notice Validate that callData respects session scope (targets, selectors)
    function _validateCallDataScope(
        Session storage session,
        bytes calldata callData
    ) internal view returns (bool) {
        // Must call execute(bytes32 mode, bytes executionData)
        if (callData.length < 4) return false;
        bytes4 selector = bytes4(callData[0:4]);
        if (selector != this.execute.selector) return false;

        // Decode mode and executionData
        (bytes32 mode, bytes memory executionData) = abi.decode(callData[4:], (bytes32, bytes));

        // Validate targets and selectors
        return _validateTargetsAndSelectors(session, mode, executionData);
    }

    /// @notice Validate targets and selectors for a given mode and execution data
    function _validateTargetsAndSelectors(
        Session storage session,
        bytes32 mode,
        bytes memory executionData
    ) internal view returns (bool) {
        bytes1 callType = bytes1(mode);

        if (callType == 0x00) {
            // Single execution: packed format (target 20, value 32, data...)
            if (executionData.length < 52) return false;
            address target;
            bytes memory data;
            assembly {
                target := mload(add(executionData, 20))
                let dataLen := sub(mload(executionData), 52)
                data := mload(0x40)
                mstore(data, dataLen)
                let dataStart := add(executionData, 84) // 32 (length) + 20 (target) + 32 (value)
                let destStart := add(data, 32)
                for { let i := 0 } lt(i, dataLen) { i := add(i, 32) } {
                    mstore(add(destStart, i), mload(add(dataStart, i)))
                }
                mstore(0x40, add(destStart, dataLen))
            }
            return _isTargetAllowed(session, target) && _isSelectorAllowed(session, data);
        } else if (callType == 0x01) {
            // Batch execution: ERC-7579 ABI-encoded format abi.encode(Execution[])
            // Execution = (address target, uint256 value, bytes callData)
            Execution[] memory executions = abi.decode(executionData, (Execution[]));

            for (uint256 i = 0; i < executions.length; i++) {
                if (!_isTargetAllowed(session, executions[i].target)) return false;
                if (!_isSelectorAllowed(session, executions[i].callData)) return false;
            }
            return true;
        }

        return false;
    }

    function _isTargetAllowed(Session storage session, address target) internal view returns (bool) {
        for (uint256 i = 0; i < session.allowedTargets.length; i++) {
            if (session.allowedTargets[i] == target) return true;
        }
        return false;
    }

    function _isSelectorAllowed(Session storage session, bytes memory data) internal view returns (bool) {
        // If no selectors restricted, allow all
        if (session.allowedSelectors.length == 0) return true;
        // If data too short for selector, allow (e.g., native transfer)
        if (data.length < 4) return true;

        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }

        for (uint256 i = 0; i < session.allowedSelectors.length; i++) {
            if (session.allowedSelectors[i] == selector) return true;
        }
        return false;
    }

    // ========================
    // ERC-7821 Execution
    // ========================

    /// @notice Override to allow owner and EntryPoint execution
    function _erc7821AuthorizedExecutor(
        address caller,
        bytes32 mode,
        bytes calldata executionData
    ) internal view override returns (bool) {
        // Owner always allowed
        if (caller == address(this)) return true;

        // EntryPoint: scope was validated in _validateSessionUserOp
        if (caller == address(entryPoint())) {
            return true;
        }

        return super._erc7821AuthorizedExecutor(caller, mode, executionData);
    }

    /// @notice Execute with session key authorization (for relayer - non-ERC-4337)
    /// @dev Uses same packed ERC-7579 format as execute() for consistency
    /// @param sessionId The session ID to use for authorization
    /// @param mode Execution mode (0x00 for single, 0x01 for batch)
    /// @param executionData Packed ERC-7579 format: target(20) + value(32) + data...
    /// @param sessionKeySignature Session key's EIP-712 signature
    function executeWithSession(
        bytes32 sessionId,
        bytes32 mode,
        bytes calldata executionData,
        bytes calldata sessionKeySignature
    ) external returns (bytes[] memory) {
        DelegatorStorage storage $ = _getDelegatorStorage();
        Session storage session = $.sessions[sessionId];

        // Validate session
        if (session.sessionKey == address(0)) revert SessionNotFound();
        if (!session.active) revert SessionInactive();
        if (block.timestamp < session.validAfter) revert SessionExpired();
        if (block.timestamp > session.validUntil) revert SessionExpired();

        // Verify signature over (sessionId, mode, executionData)
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            EXECUTE_WITH_SESSION_TYPEHASH,
            sessionId,
            mode,
            keccak256(executionData)
        )));

        address recovered = digest.recover(sessionKeySignature);
        if (recovered != session.sessionKey) revert InvalidSessionKey();

        // Validate scope (targets, selectors) - same logic as ERC-4337 path
        if (!_validateTargetsAndSelectors(session, mode, executionData)) {
            revert TargetNotAllowed(address(0));
        }

        // Execute based on call type (using ERC-7579 utils for packed format)
        bytes1 callType = bytes1(mode);
        if (callType == 0x00) {
            return executionData.execSingle(ERC7579Utils.EXECTYPE_DEFAULT);
        } else if (callType == 0x01) {
            return executionData.execBatch(ERC7579Utils.EXECTYPE_DEFAULT);
        } else {
            revert UnsupportedExecutionMode();
        }
    }

    // ========================
    // View Functions
    // ========================

    function getSession(bytes32 sessionId) external view returns (Session memory) {
        return _getDelegatorStorage().sessions[sessionId];
    }

    function isSessionValid(bytes32 sessionId) external view returns (bool) {
        Session storage session = _getDelegatorStorage().sessions[sessionId];
        return session.active
            && session.sessionKey != address(0)
            && block.timestamp >= session.validAfter
            && block.timestamp <= session.validUntil;
    }

    function getSessionNonce() external view returns (uint256) {
        return _getDelegatorStorage().sessionNonce;
    }

    /// @notice Get domain info for an approved contract
    function getContractDomain(bytes32 sessionId, address contractAddr)
        external view returns (bytes32 nameHash, bytes32 versionHash)
    {
        DomainInfo storage domain = _getDelegatorStorage().sessionContractDomains[sessionId][contractAddr];
        return (domain.nameHash, domain.versionHash);
    }

    /// @notice Check if a contract is approved for a session
    function isContractApproved(bytes32 sessionId, address contractAddr) external view returns (bool) {
        return _getDelegatorStorage().sessionContractDomains[sessionId][contractAddr].nameHash != bytes32(0);
    }
}
