// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/**
 * @dev Mock ERC20 with EIP-3009 transferWithAuthorization for testing x402 payments
 */
contract MockERC20WithEIP3009 is ERC20, EIP712 {
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    error AuthorizationExpired();
    error AuthorizationNotYetValid();
    error AuthorizationAlreadyUsed();
    error InvalidSignature();

    constructor(string memory name, string memory symbol) ERC20(name, symbol) EIP712(name, "1") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Execute a transfer with a signed authorization (EIP-3009)
     * @param from Payer's address (authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix timestamp)
     * @param validBefore The time before which this is valid (unix timestamp)
     * @param nonce Unique nonce
     * @param signature Signature bytes (supports EOA and EIP-1271 smart contract signatures)
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external {
        if (block.timestamp < validAfter) revert AuthorizationNotYetValid();
        if (block.timestamp > validBefore) revert AuthorizationExpired();
        if (authorizationState[from][nonce]) revert AuthorizationAlreadyUsed();

        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));

        bytes32 digest = _hashTypedDataV4(structHash);

        // Use SignatureChecker which supports both EOA and EIP-1271 signatures
        if (!SignatureChecker.isValidSignatureNow(from, digest, signature)) {
            revert InvalidSignature();
        }

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getTransferAuthorizationHash(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) external view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        )));
    }
}
