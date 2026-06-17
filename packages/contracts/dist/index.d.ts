import { Address } from 'viem';
export { Address } from 'viem';

/**
 * AgentDelegator ABI
 *
 * Source: hardhat/artifacts/contracts/AgentDelegator.sol/AgentDelegator.json
 * Contract: AgentDelegator
 * Solidity: 0.8.28
 *
 * Signature formats for EIP-1271:
 * - 65 bytes: EOA owner signature (full access)
 * - 97 bytes: sessionId (32) + ecdsaSig (65) - ONLY for ERC-4337, NOT for EIP-1271
 * - 149 bytes: sessionId (32) + verifyingContract (20) + structHash (32) + ecdsaSig (65) - for EIP-1271 with contract restriction
 */
declare const agentDelegatorAbi: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "sender";
        readonly type: "address";
    }];
    readonly name: "AccountUnauthorized";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "targetContract";
        readonly type: "address";
    }];
    readonly name: "ContractNotApproved";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "DomainMismatch";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "ECDSAInvalidSignature";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "length";
        readonly type: "uint256";
    }];
    readonly name: "ECDSAInvalidSignatureLength";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "s";
        readonly type: "bytes32";
    }];
    readonly name: "ECDSAInvalidSignatureS";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "ERC7579DecodingError";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "ExecType";
        readonly name: "execType";
        readonly type: "bytes1";
    }];
    readonly name: "ERC7579UnsupportedExecType";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "FailedCall";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidCallData";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidSessionKey";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "OutOfRangeAccess";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "selector";
        readonly type: "bytes4";
    }];
    readonly name: "SelectorNotAllowed";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "SessionExpired";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "SessionInactive";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "SessionNotFound";
    readonly type: "error";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "target";
        readonly type: "address";
    }];
    readonly name: "TargetNotAllowed";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "UnsupportedExecutionMode";
    readonly type: "error";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "approvedContract";
        readonly type: "address";
    }];
    readonly name: "ContractApproved";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "batchExecutionIndex";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes";
        readonly name: "returndata";
        readonly type: "bytes";
    }];
    readonly name: "ERC7579TryExecuteFail";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "sessionKey";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "uint48";
        readonly name: "validUntil";
        readonly type: "uint48";
    }];
    readonly name: "SessionGranted";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }];
    readonly name: "SessionRevoked";
    readonly type: "event";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "contractAddress";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "nameHash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "versionHash";
            readonly type: "bytes32";
        }];
        readonly internalType: "struct AgentDelegator.ApprovedContract[]";
        readonly name: "contracts";
        readonly type: "tuple[]";
    }];
    readonly name: "addApprovedContracts";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "entryPoint";
    readonly outputs: readonly [{
        readonly internalType: "contract IEntryPoint";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "mode";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "executionData";
        readonly type: "bytes";
    }];
    readonly name: "execute";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes32";
        readonly name: "mode";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "executionData";
        readonly type: "bytes";
    }, {
        readonly internalType: "bytes";
        readonly name: "sessionKeySignature";
        readonly type: "bytes";
    }];
    readonly name: "executeWithSession";
    readonly outputs: readonly [{
        readonly internalType: "bytes[]";
        readonly name: "";
        readonly type: "bytes[]";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly internalType: "address";
        readonly name: "contractAddr";
        readonly type: "address";
    }];
    readonly name: "getContractDomain";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "nameHash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes32";
        readonly name: "versionHash";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint192";
        readonly name: "key";
        readonly type: "uint192";
    }];
    readonly name: "getNonce";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getNonce";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }];
    readonly name: "getSession";
    readonly outputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "sessionKey";
            readonly type: "address";
        }, {
            readonly internalType: "address[]";
            readonly name: "allowedTargets";
            readonly type: "address[]";
        }, {
            readonly internalType: "bytes4[]";
            readonly name: "allowedSelectors";
            readonly type: "bytes4[]";
        }, {
            readonly internalType: "uint48";
            readonly name: "validAfter";
            readonly type: "uint48";
        }, {
            readonly internalType: "uint48";
            readonly name: "validUntil";
            readonly type: "uint48";
        }, {
            readonly internalType: "bool";
            readonly name: "active";
            readonly type: "bool";
        }];
        readonly internalType: "struct AgentDelegator.Session";
        readonly name: "";
        readonly type: "tuple";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getSessionNonce";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "sessionKey";
        readonly type: "address";
    }, {
        readonly internalType: "address[]";
        readonly name: "allowedTargets";
        readonly type: "address[]";
    }, {
        readonly internalType: "bytes4[]";
        readonly name: "allowedSelectors";
        readonly type: "bytes4[]";
    }, {
        readonly internalType: "uint48";
        readonly name: "validAfter";
        readonly type: "uint48";
    }, {
        readonly internalType: "uint48";
        readonly name: "validUntil";
        readonly type: "uint48";
    }, {
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "contractAddress";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "nameHash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "versionHash";
            readonly type: "bytes32";
        }];
        readonly internalType: "struct AgentDelegator.ApprovedContract[]";
        readonly name: "approvedContracts";
        readonly type: "tuple[]";
    }];
    readonly name: "grantSession";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }, {
        readonly internalType: "address";
        readonly name: "contractAddr";
        readonly type: "address";
    }];
    readonly name: "isContractApproved";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }];
    readonly name: "isSessionValid";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "hash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "signature";
        readonly type: "bytes";
    }];
    readonly name: "isValidSignature";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "sessionId";
        readonly type: "bytes32";
    }];
    readonly name: "revokeSession";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "mode";
        readonly type: "bytes32";
    }];
    readonly name: "supportsExecutionMode";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "result";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "nonce";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "initCode";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes";
            readonly name: "callData";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes32";
            readonly name: "accountGasLimits";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "preVerificationGas";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes32";
            readonly name: "gasFees";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes";
            readonly name: "paymasterAndData";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes";
            readonly name: "signature";
            readonly type: "bytes";
        }];
        readonly internalType: "struct PackedUserOperation";
        readonly name: "userOp";
        readonly type: "tuple";
    }, {
        readonly internalType: "bytes32";
        readonly name: "userOpHash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "uint256";
        readonly name: "missingAccountFunds";
        readonly type: "uint256";
    }];
    readonly name: "validateUserOp";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly stateMutability: "payable";
    readonly type: "receive";
}];

/**
 * Deployed Contract Addresses
 *
 * Source: hardhat/ignition/deployments/chain-{id}/deployed_addresses.json
 */

/**
 * AgentDelegator contract addresses by chain ID
 */
declare const AGENT_DELEGATOR_ADDRESS: Record<number, Address>;
/**
 * Get AgentDelegator address for a specific chain
 * @throws if contract is not deployed on the chain
 */
declare function getAgentDelegatorAddress(chainId: number): Address;
/**
 * Check if AgentDelegator is deployed on a chain
 */
declare function isAgentDelegatorDeployed(chainId: number): boolean;

interface ExecuteSessionRequest {
    sessionId: string;
    mode: string;
    executionData: string;
    sessionKeySignature: string;
    chainId: number;
    ownerAddress: string;
}
declare const EXECUTE_ERROR_CODES: {
    readonly INVALID_REQUEST: "INVALID_REQUEST";
    readonly OWNER_MISMATCH: "OWNER_MISMATCH";
    readonly SESSION_NOT_FOUND: "SESSION_NOT_FOUND";
    readonly SESSION_INVALID_WINDOW: "SESSION_INVALID_WINDOW";
    readonly OWNER_IS_SESSION_KEY: "OWNER_IS_SESSION_KEY";
    readonly UNSUPPORTED_CHAIN: "UNSUPPORTED_CHAIN";
    readonly DELEGATOR_NOT_DEPLOYED: "DELEGATOR_NOT_DEPLOYED";
    readonly RELAYER_NOT_CONFIGURED: "RELAYER_NOT_CONFIGURED";
    readonly SESSION_NOT_FOUND_ONCHAIN: "SESSION_NOT_FOUND_ONCHAIN";
    readonly SESSION_REVOKED: "SESSION_REVOKED";
    readonly SESSION_EXPIRED: "SESSION_EXPIRED";
    readonly INVALID_SESSION_SIGNATURE: "INVALID_SESSION_SIGNATURE";
    readonly TARGET_NOT_ALLOWED: "TARGET_NOT_ALLOWED";
    readonly SELECTOR_NOT_ALLOWED: "SELECTOR_NOT_ALLOWED";
    readonly EXECUTION_FAILED: "EXECUTION_FAILED";
};
type ExecuteErrorCode = typeof EXECUTE_ERROR_CODES[keyof typeof EXECUTE_ERROR_CODES];
interface ExecuteErrorResponse {
    error: string;
    code: ExecuteErrorCode;
    details?: unknown;
}
interface ValidationIssue$1 {
    field: keyof ExecuteSessionRequest;
    message: string;
}
type ValidationResult$1 = {
    success: true;
    data: ExecuteSessionRequest;
} | {
    success: false;
    issues: ValidationIssue$1[];
};
declare function validateExecuteSessionRequest(value: unknown): ValidationResult$1;
declare function parseExecuteErrorResponse(value: unknown): ExecuteErrorResponse | null;

interface ProxyPaymentHeader {
    intentId: string;
    txHash: string;
    chainId: number;
    token: string;
    recipient: string;
    amount: string;
}
interface ValidationIssue {
    field: keyof ProxyPaymentHeader;
    message: string;
}
type ValidationResult = {
    success: true;
    data: ProxyPaymentHeader;
} | {
    success: false;
    issues: ValidationIssue[];
};
declare function validateProxyPaymentHeader(value: unknown): ValidationResult;
declare function encodeProxyPaymentHeader(value: ProxyPaymentHeader): string;
declare function decodeProxyPaymentHeader(value: string): ValidationResult;

/**
 * @x402/contracts
 *
 * Shared contract ABIs and addresses for the AgentVault platform
 */

/**
 * Session struct from AgentDelegator contract
 */
interface Session {
    sessionKey: `0x${string}`;
    allowedTargets: readonly `0x${string}`[];
    allowedSelectors: readonly `0x${string}`[];
    validAfter: bigint;
    validUntil: bigint;
    active: boolean;
}
/**
 * TokenLimit struct from AgentDelegator contract
 */
interface TokenLimit {
    token: `0x${string}`;
    maxPerTx: bigint;
    totalBudget: bigint;
}
/**
 * TokenBudget view result from getTokenBudget
 */
interface TokenBudgetInfo {
    maxPerTx: bigint;
    totalBudget: bigint;
    spent: bigint;
    remaining: bigint;
}

export { AGENT_DELEGATOR_ADDRESS, EXECUTE_ERROR_CODES, type ExecuteErrorCode, type ExecuteErrorResponse, type ExecuteSessionRequest, type ProxyPaymentHeader, type Session, type TokenBudgetInfo, type TokenLimit, agentDelegatorAbi, decodeProxyPaymentHeader, encodeProxyPaymentHeader, getAgentDelegatorAddress, isAgentDelegatorDeployed, parseExecuteErrorResponse, validateExecuteSessionRequest, validateProxyPaymentHeader };
