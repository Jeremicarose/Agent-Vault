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
export const agentDelegatorAbi = [
  {
    inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
    name: 'AccountUnauthorized',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'targetContract', type: 'address' }],
    name: 'ContractNotApproved',
    type: 'error',
  },
  { inputs: [], name: 'DomainMismatch', type: 'error' },
  { inputs: [], name: 'ECDSAInvalidSignature', type: 'error' },
  {
    inputs: [{ internalType: 'uint256', name: 'length', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 's', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS',
    type: 'error',
  },
  { inputs: [], name: 'ERC7579DecodingError', type: 'error' },
  {
    inputs: [{ internalType: 'ExecType', name: 'execType', type: 'bytes1' }],
    name: 'ERC7579UnsupportedExecType',
    type: 'error',
  },
  { inputs: [], name: 'FailedCall', type: 'error' },
  { inputs: [], name: 'InvalidCallData', type: 'error' },
  { inputs: [], name: 'InvalidSessionKey', type: 'error' },
  { inputs: [], name: 'OutOfRangeAccess', type: 'error' },
  {
    inputs: [{ internalType: 'bytes4', name: 'selector', type: 'bytes4' }],
    name: 'SelectorNotAllowed',
    type: 'error',
  },
  { inputs: [], name: 'SessionExpired', type: 'error' },
  { inputs: [], name: 'SessionInactive', type: 'error' },
  { inputs: [], name: 'SessionNotFound', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
    name: 'TargetNotAllowed',
    type: 'error',
  },
  { inputs: [], name: 'UnsupportedExecutionMode', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'approvedContract', type: 'address' },
    ],
    name: 'ContractApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'batchExecutionIndex', type: 'uint256' },
      { indexed: false, internalType: 'bytes', name: 'returndata', type: 'bytes' },
    ],
    name: 'ERC7579TryExecuteFail',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'sessionKey', type: 'address' },
      { indexed: false, internalType: 'uint48', name: 'validUntil', type: 'uint48' },
    ],
    name: 'SessionGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }],
    name: 'SessionRevoked',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      {
        components: [
          { internalType: 'address', name: 'contractAddress', type: 'address' },
          { internalType: 'bytes32', name: 'nameHash', type: 'bytes32' },
          { internalType: 'bytes32', name: 'versionHash', type: 'bytes32' },
        ],
        internalType: 'struct AgentDelegator.ApprovedContract[]',
        name: 'contracts',
        type: 'tuple[]',
      },
    ],
    name: 'addApprovedContracts',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'entryPoint',
    outputs: [{ internalType: 'contract IEntryPoint', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'mode', type: 'bytes32' },
      { internalType: 'bytes', name: 'executionData', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'mode', type: 'bytes32' },
      { internalType: 'bytes', name: 'executionData', type: 'bytes' },
      { internalType: 'bytes', name: 'sessionKeySignature', type: 'bytes' },
    ],
    name: 'executeWithSession',
    outputs: [{ internalType: 'bytes[]', name: '', type: 'bytes[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { internalType: 'address', name: 'contractAddr', type: 'address' },
    ],
    name: 'getContractDomain',
    outputs: [
      { internalType: 'bytes32', name: 'nameHash', type: 'bytes32' },
      { internalType: 'bytes32', name: 'versionHash', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint192', name: 'key', type: 'uint192' }],
    name: 'getNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }],
    name: 'getSession',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'sessionKey', type: 'address' },
          { internalType: 'address[]', name: 'allowedTargets', type: 'address[]' },
          { internalType: 'bytes4[]', name: 'allowedSelectors', type: 'bytes4[]' },
          { internalType: 'uint48', name: 'validAfter', type: 'uint48' },
          { internalType: 'uint48', name: 'validUntil', type: 'uint48' },
          { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        internalType: 'struct AgentDelegator.Session',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSessionNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'sessionKey', type: 'address' },
      { internalType: 'address[]', name: 'allowedTargets', type: 'address[]' },
      { internalType: 'bytes4[]', name: 'allowedSelectors', type: 'bytes4[]' },
      { internalType: 'uint48', name: 'validAfter', type: 'uint48' },
      { internalType: 'uint48', name: 'validUntil', type: 'uint48' },
      {
        components: [
          { internalType: 'address', name: 'contractAddress', type: 'address' },
          { internalType: 'bytes32', name: 'nameHash', type: 'bytes32' },
          { internalType: 'bytes32', name: 'versionHash', type: 'bytes32' },
        ],
        internalType: 'struct AgentDelegator.ApprovedContract[]',
        name: 'approvedContracts',
        type: 'tuple[]',
      },
    ],
    name: 'grantSession',
    outputs: [{ internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'sessionId', type: 'bytes32' },
      { internalType: 'address', name: 'contractAddr', type: 'address' },
    ],
    name: 'isContractApproved',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }],
    name: 'isSessionValid',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'hash', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'isValidSignature',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'sessionId', type: 'bytes32' }],
    name: 'revokeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'mode', type: 'bytes32' }],
    name: 'supportsExecutionMode',
    outputs: [{ internalType: 'bool', name: 'result', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { internalType: 'bytes', name: 'initCode', type: 'bytes' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
          { internalType: 'bytes32', name: 'accountGasLimits', type: 'bytes32' },
          { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' },
          { internalType: 'bytes32', name: 'gasFees', type: 'bytes32' },
          { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'struct PackedUserOperation',
        name: 'userOp',
        type: 'tuple',
      },
      { internalType: 'bytes32', name: 'userOpHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'missingAccountFunds', type: 'uint256' },
    ],
    name: 'validateUserOp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
] as const
