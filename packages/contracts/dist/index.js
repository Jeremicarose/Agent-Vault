// abi/AgentDelegator.ts
var agentDelegatorAbi = [
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "AccountUnauthorized",
    type: "error"
  },
  {
    inputs: [{ internalType: "address", name: "targetContract", type: "address" }],
    name: "ContractNotApproved",
    type: "error"
  },
  { inputs: [], name: "DomainMismatch", type: "error" },
  { inputs: [], name: "ECDSAInvalidSignature", type: "error" },
  {
    inputs: [{ internalType: "uint256", name: "length", type: "uint256" }],
    name: "ECDSAInvalidSignatureLength",
    type: "error"
  },
  {
    inputs: [{ internalType: "bytes32", name: "s", type: "bytes32" }],
    name: "ECDSAInvalidSignatureS",
    type: "error"
  },
  { inputs: [], name: "ERC7579DecodingError", type: "error" },
  {
    inputs: [{ internalType: "ExecType", name: "execType", type: "bytes1" }],
    name: "ERC7579UnsupportedExecType",
    type: "error"
  },
  { inputs: [], name: "FailedCall", type: "error" },
  { inputs: [], name: "InvalidCallData", type: "error" },
  { inputs: [], name: "InvalidSessionKey", type: "error" },
  { inputs: [], name: "OutOfRangeAccess", type: "error" },
  {
    inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }],
    name: "SelectorNotAllowed",
    type: "error"
  },
  { inputs: [], name: "SessionExpired", type: "error" },
  { inputs: [], name: "SessionInactive", type: "error" },
  { inputs: [], name: "SessionNotFound", type: "error" },
  {
    inputs: [{ internalType: "address", name: "target", type: "address" }],
    name: "TargetNotAllowed",
    type: "error"
  },
  { inputs: [], name: "UnsupportedExecutionMode", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "sessionId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "approvedContract", type: "address" }
    ],
    name: "ContractApproved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "batchExecutionIndex", type: "uint256" },
      { indexed: false, internalType: "bytes", name: "returndata", type: "bytes" }
    ],
    name: "ERC7579TryExecuteFail",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "sessionId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "sessionKey", type: "address" },
      { indexed: false, internalType: "uint48", name: "validUntil", type: "uint48" }
    ],
    name: "SessionGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "bytes32", name: "sessionId", type: "bytes32" }],
    name: "SessionRevoked",
    type: "event"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "sessionId", type: "bytes32" },
      {
        components: [
          { internalType: "address", name: "contractAddress", type: "address" },
          { internalType: "bytes32", name: "nameHash", type: "bytes32" },
          { internalType: "bytes32", name: "versionHash", type: "bytes32" }
        ],
        internalType: "struct AgentDelegator.ApprovedContract[]",
        name: "contracts",
        type: "tuple[]"
      }
    ],
    name: "addApprovedContracts",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "entryPoint",
    outputs: [{ internalType: "contract IEntryPoint", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "mode", type: "bytes32" },
      { internalType: "bytes", name: "executionData", type: "bytes" }
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "sessionId", type: "bytes32" },
      { internalType: "bytes32", name: "mode", type: "bytes32" },
      { internalType: "bytes", name: "executionData", type: "bytes" },
      { internalType: "bytes", name: "sessionKeySignature", type: "bytes" }
    ],
    name: "executeWithSession",
    outputs: [{ internalType: "bytes[]", name: "", type: "bytes[]" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "sessionId", type: "bytes32" },
      { internalType: "address", name: "contractAddr", type: "address" }
    ],
    name: "getContractDomain",
    outputs: [
      { internalType: "bytes32", name: "nameHash", type: "bytes32" },
      { internalType: "bytes32", name: "versionHash", type: "bytes32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint192", name: "key", type: "uint192" }],
    name: "getNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "sessionId", type: "bytes32" }],
    name: "getSession",
    outputs: [
      {
        components: [
          { internalType: "address", name: "sessionKey", type: "address" },
          { internalType: "address[]", name: "allowedTargets", type: "address[]" },
          { internalType: "bytes4[]", name: "allowedSelectors", type: "bytes4[]" },
          { internalType: "uint48", name: "validAfter", type: "uint48" },
          { internalType: "uint48", name: "validUntil", type: "uint48" },
          { internalType: "bool", name: "active", type: "bool" }
        ],
        internalType: "struct AgentDelegator.Session",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getSessionNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "sessionKey", type: "address" },
      { internalType: "address[]", name: "allowedTargets", type: "address[]" },
      { internalType: "bytes4[]", name: "allowedSelectors", type: "bytes4[]" },
      { internalType: "uint48", name: "validAfter", type: "uint48" },
      { internalType: "uint48", name: "validUntil", type: "uint48" },
      {
        components: [
          { internalType: "address", name: "contractAddress", type: "address" },
          { internalType: "bytes32", name: "nameHash", type: "bytes32" },
          { internalType: "bytes32", name: "versionHash", type: "bytes32" }
        ],
        internalType: "struct AgentDelegator.ApprovedContract[]",
        name: "approvedContracts",
        type: "tuple[]"
      }
    ],
    name: "grantSession",
    outputs: [{ internalType: "bytes32", name: "sessionId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "sessionId", type: "bytes32" },
      { internalType: "address", name: "contractAddr", type: "address" }
    ],
    name: "isContractApproved",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "sessionId", type: "bytes32" }],
    name: "isSessionValid",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "hash", type: "bytes32" },
      { internalType: "bytes", name: "signature", type: "bytes" }
    ],
    name: "isValidSignature",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "sessionId", type: "bytes32" }],
    name: "revokeSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "mode", type: "bytes32" }],
    name: "supportsExecutionMode",
    outputs: [{ internalType: "bool", name: "result", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "bytes", name: "initCode", type: "bytes" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "bytes32", name: "accountGasLimits", type: "bytes32" },
          { internalType: "uint256", name: "preVerificationGas", type: "uint256" },
          { internalType: "bytes32", name: "gasFees", type: "bytes32" },
          { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" }
        ],
        internalType: "struct PackedUserOperation",
        name: "userOp",
        type: "tuple"
      },
      { internalType: "bytes32", name: "userOpHash", type: "bytes32" },
      { internalType: "uint256", name: "missingAccountFunds", type: "uint256" }
    ],
    name: "validateUserOp",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  { stateMutability: "payable", type: "receive" }
];

// addresses.ts
var AGENT_DELEGATOR_ADDRESS = {
  // Hedera Testnet (chain 296)
  296: "0x624f7c953dac044f3a38e7230c16f410cf7301d2",
  // Hedera Mainnet (chain 295) - not yet deployed
  295: "0x0000000000000000000000000000000000000000"
};
function getAgentDelegatorAddress(chainId) {
  const address = AGENT_DELEGATOR_ADDRESS[chainId];
  if (!address) {
    throw new Error(`AgentDelegator not deployed on chain ${chainId}`);
  }
  return address;
}
function isAgentDelegatorDeployed(chainId) {
  return chainId in AGENT_DELEGATOR_ADDRESS;
}

// execute.ts
var EXECUTE_ERROR_CODES = {
  INVALID_REQUEST: "INVALID_REQUEST",
  OWNER_MISMATCH: "OWNER_MISMATCH",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_INVALID_WINDOW: "SESSION_INVALID_WINDOW",
  OWNER_IS_SESSION_KEY: "OWNER_IS_SESSION_KEY",
  UNSUPPORTED_CHAIN: "UNSUPPORTED_CHAIN",
  DELEGATOR_NOT_DEPLOYED: "DELEGATOR_NOT_DEPLOYED",
  RELAYER_NOT_CONFIGURED: "RELAYER_NOT_CONFIGURED",
  SESSION_NOT_FOUND_ONCHAIN: "SESSION_NOT_FOUND_ONCHAIN",
  SESSION_REVOKED: "SESSION_REVOKED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_SESSION_SIGNATURE: "INVALID_SESSION_SIGNATURE",
  TARGET_NOT_ALLOWED: "TARGET_NOT_ALLOWED",
  SELECTOR_NOT_ALLOWED: "SELECTOR_NOT_ALLOWED",
  EXECUTION_FAILED: "EXECUTION_FAILED"
};
var BYTES32_HEX = /^0x[0-9a-f]{64}$/i;
var HEX = /^0x[0-9a-f]*$/i;
var ADDRESS = /^0x[0-9a-f]{40}$/i;
function validateExecuteSessionRequest(value) {
  if (typeof value !== "object" || value === null) {
    return {
      success: false,
      issues: [{ field: "sessionId", message: "Payload must be an object" }]
    };
  }
  const payload = value;
  const issues = [];
  if (typeof payload.sessionId !== "string" || !BYTES32_HEX.test(payload.sessionId)) {
    issues.push({ field: "sessionId", message: "Invalid sessionId" });
  }
  if (typeof payload.mode !== "string" || !BYTES32_HEX.test(payload.mode)) {
    issues.push({ field: "mode", message: "Invalid mode" });
  }
  if (typeof payload.executionData !== "string" || !HEX.test(payload.executionData)) {
    issues.push({ field: "executionData", message: "Invalid executionData" });
  }
  if (typeof payload.sessionKeySignature !== "string" || !HEX.test(payload.sessionKeySignature)) {
    issues.push({ field: "sessionKeySignature", message: "Invalid sessionKeySignature" });
  }
  if (typeof payload.chainId !== "number" || !Number.isInteger(payload.chainId) || payload.chainId <= 0) {
    issues.push({ field: "chainId", message: "Invalid chainId" });
  }
  if (typeof payload.ownerAddress !== "string" || !ADDRESS.test(payload.ownerAddress)) {
    issues.push({ field: "ownerAddress", message: "Invalid ownerAddress" });
  }
  if (issues.length > 0) {
    return { success: false, issues };
  }
  return {
    success: true,
    data: payload
  };
}
function parseExecuteErrorResponse(value) {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value;
  if (typeof candidate.error !== "string" || typeof candidate.code !== "string") {
    return null;
  }
  return {
    error: candidate.error,
    code: candidate.code,
    details: candidate.details
  };
}

// payment.ts
var TX_HASH = /^0x[0-9a-f]{64}$/i;
var ADDRESS2 = /^0x[0-9a-f]{40}$/i;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateProxyPaymentHeader(value) {
  if (typeof value !== "object" || value === null) {
    return {
      success: false,
      issues: [{ field: "txHash", message: "Payment header must be an object" }]
    };
  }
  const header = value;
  const issues = [];
  if (typeof header.intentId !== "string" || !UUID.test(header.intentId)) {
    issues.push({ field: "intentId", message: "Invalid intentId" });
  }
  if (typeof header.txHash !== "string" || !TX_HASH.test(header.txHash)) {
    issues.push({ field: "txHash", message: "Invalid txHash" });
  }
  if (typeof header.chainId !== "number" || !Number.isInteger(header.chainId) || header.chainId <= 0) {
    issues.push({ field: "chainId", message: "Invalid chainId" });
  }
  if (typeof header.token !== "string" || !ADDRESS2.test(header.token)) {
    issues.push({ field: "token", message: "Invalid token address" });
  }
  if (typeof header.recipient !== "string" || !ADDRESS2.test(header.recipient)) {
    issues.push({ field: "recipient", message: "Invalid recipient address" });
  }
  if (typeof header.amount !== "string" || !/^\d+$/.test(header.amount)) {
    issues.push({ field: "amount", message: "Invalid amount" });
  }
  if (issues.length > 0) {
    return { success: false, issues };
  }
  return {
    success: true,
    data: header
  };
}
function encodeProxyPaymentHeader(value) {
  return JSON.stringify(value);
}
function decodeProxyPaymentHeader(value) {
  try {
    const parsed = JSON.parse(value);
    return validateProxyPaymentHeader(parsed);
  } catch {
    return {
      success: false,
      issues: [{ field: "txHash", message: "Payment header must be valid JSON" }]
    };
  }
}
export {
  AGENT_DELEGATOR_ADDRESS,
  EXECUTE_ERROR_CODES,
  agentDelegatorAbi,
  decodeProxyPaymentHeader,
  encodeProxyPaymentHeader,
  getAgentDelegatorAddress,
  isAgentDelegatorDeployed,
  parseExecuteErrorResponse,
  validateExecuteSessionRequest,
  validateProxyPaymentHeader
};
//# sourceMappingURL=index.js.map