

# AgentVault Lightpaper

**Bounded Autonomy for the Agentic Economy on Hedera**

*Version 1.0 — March 2026*

---

## Abstract

AI agents are rapidly becoming capable of autonomous financial decision-making — executing trades, purchasing data, orchestrating multi-step workflows, and interacting with decentralized protocols. Yet today's execution models present a fundamental tradeoff: agents either cannot act at all, or they require full access to private keys, creating unacceptable risk.

AgentVault eliminates this tradeoff. It is a permissioned execution fabric built on Hedera that enables AI agents to discover, pay for, and execute on-chain and off-chain actions — all within scoped, enforceable boundaries. Agents never touch the user's primary key. Instead, they operate via cryptographically scoped session keys with explicit limits on which protocols, assets, methods, and values they may access.

The result: **autonomy without custody, composability without danger, automation without hot wallets.**

---

## 1. The Problem

The rise of agentic AI introduces a new class of actors into digital economies — software entities that can reason, plan, and execute. But the infrastructure to safely embed these actors into financial systems does not exist.

### 1.1 The Broken Status Quo

| Model | Description | Risk |
|---|---|---|
| **No Access** | Agent cannot interact with wallets or APIs | Agents are useless for financial tasks |
| **Full Access** | Agent holds the user's private key | Catastrophic if compromised — unlimited blast radius |
| **Custodial Wrappers** | Third-party custodian holds keys on the user's behalf | Trust assumptions, single point of failure |

None of these models satisfy the requirements of a scalable agentic economy:

- **Least-privilege execution** — agents should only do what they are explicitly permitted to do
- **Cryptographic enforcement** — permissions must be enforced on-chain, not by policy
- **Composability** — agents must be able to chain API calls and on-chain actions into useful workflows
- **Discoverability** — agents must be able to find, evaluate, and pay for services programmatically

### 1.2 Why This Matters Now

The convergence of frontier AI models (GPT-4, Claude, Gemini) with tool-use protocols like MCP (Model Context Protocol) means agents can now autonomously discover and invoke external tools. Without a safe execution substrate, this capability is either locked behind walled gardens or dangerously unrestricted.

---

## 2. The AgentVault Solution

AgentVault is an agent-native execution fabric consisting of five core primitives built on Hedera:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent                                 │
│                 (Claude / GPT / Custom)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │ discovers & invokes
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server                                  │
│          Agent-facing tool discovery & invocation                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ routes to
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AgentVault Core                               │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│     │  API Proxy    │ │  Workflow    │ │  Permission          │  │
│     │  Marketplace  │ │  Engine      │ │  Enforcement         │  │
│     └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘  │
└────────────┼────────────────┼────────────────────┼──────────────┘
             │                │                    │
             ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Hedera Network                            │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │   HSCS   │  │   HTS    │  │   HCS    │  │   Accounts   │   │
│   │ Smart    │  │ Token    │  │ Consensus│  │   & Keys     │   │
│   │ Contract │  │ Service  │  │ Service  │  │              │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Smart Account with Scoped Session Keys

The foundational primitive. A user's standard account is upgraded to a smart account (deployed via Hedera Smart Contract Service) that enforces session-based permissions on-chain.

**Session Key Properties:**
- **Allowed Targets** — which contracts the agent may call
- **Allowed Selectors** — which functions on those contracts are permitted
- **Time Bounds** — `validAfter` and `validUntil` timestamps
- **Revocability** — the owner can revoke any session instantly

Session keys are cryptographic keypairs generated per-agent, per-task. The agent signs transactions with its session key; the smart account validates the signature and enforces the scope before executing.

**Key Insight:** The user's primary private key is never exposed to the agent. The session key is a subordinate credential with strictly bounded authority.

**Signature Formats:**
| Length | Use Case | Description |
|---|---|---|
| 65 bytes | Owner signature | Full access, standard ECDSA |
| 97 bytes | ERC-4337 session | `sessionId (32) + ecdsaSignature (65)` |
| 149 bytes | EIP-1271 session | `sessionId (32) + verifyingContract (20) + structHash (32) + ecdsaSignature (65)` |

### 2.2 API Proxy Marketplace

Any API can be wrapped as a pay-per-call endpoint and listed on the AgentVault marketplace. This transforms traditional APIs into agent-consumable economic primitives.

**Features:**
- **Usage-based pricing** — price per request denominated in USDC (smallest unit)
- **Encrypted header storage** — API keys are stored using hybrid RSA+AES encryption; the proxy never exposes upstream credentials
- **Variable schemas** — dynamic parameters (e.g., token address, chain ID) are templated and injected at call time
- **Discoverability** — APIs are categorized, tagged, and searchable by agents via MCP

**Payment Flow:**
1. Agent discovers an API via the MCP server
2. Agent constructs a payment authorization (EIP-712 typed data)
3. Session key signs the payment within its spending bounds
4. Payment is verified and settled on Hedera via USDC transfer
5. API proxy forwards the request to the upstream service
6. Response is returned to the agent

### 2.3 Workflow Engine

Individual API calls and on-chain actions can be composed into multi-step workflows — reusable, permissionable sequences that agents can invoke as single operations.

**Supported Step Types:**
| Type | Description |
|---|---|
| `http` | External API call with JSONPath-based data extraction |
| `onchain` | Single smart contract call on Hedera |
| `onchain_batch` | Multiple contract calls in a single transaction |
| `condition` | Branching logic based on prior step outputs |
| `transform` | Data transformation between steps |

**Data Flow:** Steps can reference outputs from prior steps using JSONPath expressions (e.g., `$.steps.getPriceData.response.body.price`), enabling complex orchestration without hardcoding values.

**Example Workflow — "Buy Trending Token":**
```
Step 1: [http]       Query trending token API (paid, x402)
Step 2: [transform]  Extract top token address and price
Step 3: [onchain]    Approve token spend on DEX
Step 4: [onchain]    Execute swap via DEX aggregator
```

### 2.4 MCP Server Integration

AgentVault exposes all APIs and workflows as tools via the Model Context Protocol (MCP), the emerging standard for AI agent tool discovery.

**Capabilities:**
- **Dynamic tool registry** — APIs and workflows are loaded as MCP tools with typed input schemas
- **OAuth 2.1 authorization** — agents authenticate via standard OAuth flows with PKCE
- **Session binding** — each OAuth token is bound to a specific session key and its permissions
- **Caching** — tool definitions are cached with configurable TTL for performance

This means any MCP-compatible AI system (Claude, ChatGPT, custom agents) can discover and use AgentVault tools without custom integration.

### 2.5 Hedera-Native Audit Trail (HCS)

Every agent action — API calls, payments, on-chain executions, session key events — is recorded as an immutable, timestamped message on the Hedera Consensus Service (HCS).

**Why HCS:**
- Immutable, ordered, and independently verifiable
- Sub-second finality at ~$0.0001 per message
- Enables third-party auditors, compliance tools, and dashboards to verify agent behavior without trusting AgentVault's database

**Logged Events:**
- Session key creation, modification, revocation
- API proxy invocations and payment settlements
- Workflow step execution and outcomes
- Permission violations and rejected transactions

---

## 3. Why Hedera

AgentVault is purpose-built for the Hedera network. The design requirements of an agentic execution fabric — high throughput, low cost, finality, and native services — align precisely with Hedera's architecture.

| Requirement | Why Hedera Fits |
|---|---|
| **Microtransactions** | Per-API-call payments require fees measured in fractions of a cent. Hedera's ~$0.0001 transaction fees make this economically viable. On Ethereum L1, gas costs would exceed the API price itself. |
| **Fast finality** | Agents operate in real-time. Hedera's 3-5 second finality ensures payments and on-chain actions settle before the agent's next reasoning step. |
| **Native Token Service (HTS)** | USDC and custom tokens can be issued and transferred via HTS without deploying ERC-20 contracts, reducing complexity and cost. |
| **Consensus Service (HCS)** | Transparent, immutable audit trails for agent actions — critical for trust in autonomous systems — are a native Hedera primitive, not a bolted-on solution. |
| **EVM Compatibility (HSCS)** | AgentVault's Solidity smart contracts (session key enforcement, account abstraction) deploy directly to Hedera's Smart Contract Service with minimal modification. |
| **Account Model** | Hedera's native account system enables each AI agent to have a dedicated account, directly contributing to network account growth and monthly active accounts. |
| **Energy Efficiency** | Hedera's carbon-negative, proof-of-stake network aligns with the sustainability expectations of enterprise and institutional users deploying autonomous agents. |

### 3.1 Hedera Services Used

| Service | Usage in AgentVault |
|---|---|
| **HSCS** (Smart Contract Service) | AgentDelegator contract — session key management, permission enforcement, signature validation |
| **HTS** (Token Service) | USDC payment settlement, potential session key NFTs for visual permission management |
| **HCS** (Consensus Service) | Immutable audit trail for all agent actions, payments, and session events |
| **Hedera Accounts** | Dedicated accounts for each AI agent — each onboarded agent creates a new Hedera account |

---

## 4. Security Model

AgentVault's security is grounded in the principle of least privilege, enforced cryptographically rather than by policy.

### 4.1 Threat Model

| Threat | Mitigation |
|---|---|
| **Compromised session key** | Blast radius is bounded by session scope (allowed targets, selectors, time window). Attacker can only do what the session permits. Owner can revoke instantly. |
| **Malicious agent behavior** | On-chain enforcement rejects any transaction outside session scope. The smart contract, not the agent, decides what executes. |
| **API credential exposure** | Upstream API keys are encrypted with hybrid RSA+AES. The agent never sees raw credentials — the proxy injects them server-side. |
| **Replay attacks** | EIP-712 typed data signatures include chain ID, contract address, and nonces. Session signatures bind to specific domains and struct hashes. |
| **Over-permissioned sessions** | Users define granular scopes at session creation. The UI guides users toward minimal permission sets. |

### 4.2 Trust Assumptions

- **The smart contract is trusted** — permissions are enforced on-chain and are verifiable by anyone
- **The AgentVault server is semi-trusted** — it routes requests but cannot forge session key signatures or bypass on-chain enforcement
- **The AI agent is untrusted** — this is the core design principle; the agent operates within a cryptographic sandbox

---

## 5. Economic Model

AgentVault creates a two-sided marketplace for the agentic economy:

### 5.1 Supply Side — API & Workflow Providers

Developers and data providers list APIs and workflows on the marketplace, setting per-request prices. They earn revenue each time an agent invokes their service.

**Incentive:** Passive income from AI agent consumption. As agent populations grow, API providers benefit from compounding demand without additional distribution effort.

### 5.2 Demand Side — AI Agents & Their Operators

Agent operators (individuals, businesses, institutions) create session keys with spending bounds and deploy agents that autonomously discover and consume marketplace services.

**Incentive:** Agents can access a rich ecosystem of tools and data without manual integration, API key management, or billing relationships.

### 5.3 Network Effects

```
More APIs listed → Agents can do more useful things
    → More agents deployed → More API revenue
        → More providers list APIs → Flywheel
```

Each API call generates a Hedera transaction (payment settlement + HCS log), contributing directly to network TPS and transaction volume.

### 5.4 Revenue Model

| Revenue Stream | Description |
|---|---|
| **Transaction fees** | Small percentage on each API payment settlement |
| **Premium listings** | Featured placement in the API marketplace |
| **Enterprise plans** | Custom deployment, SLAs, dedicated infrastructure |
| **Workflow templates** | Curated, audited workflow packages for specific use cases |

---

## 6. Use Cases

### 6.1 Autonomous DeFi Agent
An AI agent monitors token prices via a paid market data API, identifies an arbitrage opportunity, and executes a swap on a Hedera-based DEX — all within a session scoped to the specific DEX contract, the swap function, and a maximum spend of 100 USDC.

### 6.2 Research Agent with Paid Data Access
A research agent queries multiple paid APIs (financial data, news sentiment, on-chain analytics) to compile a report. Each API call is individually metered and settled on Hedera. The agent's session key limits total spend to $5 and expires after 1 hour.

### 6.3 Enterprise Workflow Automation
A supply chain management agent executes a multi-step workflow: (1) query shipment status API, (2) verify on-chain provenance record, (3) trigger payment release to supplier. Each step is logged to HCS for audit compliance.

### 6.4 Agent-to-Agent Commerce
Agent A provides a premium data analysis service via the marketplace. Agent B discovers it via MCP, negotiates the price (pre-set), pays per request, and incorporates the results into its own workflow. No human intervention required.

---

## 7. Technical Specifications

### 7.1 Smart Contract — AgentDelegator

| Property | Value |
|---|---|
| **Language** | Solidity ^0.8.28 |
| **Standards** | ERC-4337 (Account Abstraction), ERC-7702 (Delegation), ERC-7579 (Modular Execution), ERC-7821 (Execution), EIP-1271 (Signature Validation), EIP-712 (Typed Data) |
| **Storage** | ERC-7201 namespaced storage for upgrade safety |
| **Deployment** | Hedera Smart Contract Service (HSCS) |

### 7.2 Application Stack

| Component | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui |
| **Backend** | Next.js API routes, Drizzle ORM |
| **MCP Server** | Express.js 5, @modelcontextprotocol/sdk |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Blockchain SDK** | Hedera SDK (JS), Viem 2.x |
| **Authentication** | Sign-In with Ethereum (SIWE), OAuth 2.1 with PKCE |

### 7.3 Data Schema (Core Tables)

| Table | Purpose |
|---|---|
| `users` | Wallet-authenticated user accounts |
| `sessionKeys` | Encrypted session key storage with scoped permissions |
| `apiProxies` | Registered API endpoints with pricing and encrypted credentials |
| `workflowTemplates` | Multi-step workflow definitions |
| `requestLogs` | API invocation and payment audit logs |
| `mcpServers` | Registered MCP server configurations |
| `oauthClients` | OAuth 2.1 client registrations |
| `paymentNonces` | Payment nonce tracking for replay prevention |

---

## 8. What Makes AgentVault Different

AgentVault is not another AI agent framework or trading bot. It occupies a unique position in the Hedera ecosystem by solving problems that remain unsolved.

### 8.1 Unsolved Problem #1: Agent Key Management is Broken

Every AI agent project on Hedera faces the same dilemma: give the agent your private key (dangerous) or don't let it transact (useless). The Hedera Agent Kit, OpenClaw, and similar frameworks all require the agent to hold a full private key. There is no production-grade, on-chain permission scoping layer for AI agents on Hedera.

**AgentVault solves this.** Session keys with on-chain enforcement via the AgentDelegator contract mean agents operate with cryptographically bounded authority. This is the missing trust layer between "human wallet" and "autonomous agent."

### 8.2 Unsolved Problem #2: No Agent-Native API Economy

Hedera has x402 for HTTP-level payments and HIP-991 for fee-gated topics. But there is no marketplace where agents can discover, evaluate, and pay for APIs and workflows as first-class economic primitives. Agents today must have their APIs hardcoded or manually configured.

**AgentVault solves this.** The API Proxy Marketplace + MCP Server combination creates a self-service economy where providers list services and agents autonomously discover and consume them — with per-call settlement on Hedera.

### 8.3 Unsolved Problem #3: Agent Actions Are Unverifiable

When an AI agent claims it executed a trade, queried an API, or followed its instructions — how do you verify that? Today, you trust the agent's logs. There is no independent, tamper-proof audit trail for agent behavior on Hedera.

**AgentVault solves this.** Every agent action is recorded to HCS via HCS-10 compatible topics, creating an immutable, independently verifiable audit trail. Third-party auditors can reconstruct exactly what any agent did, when, and whether it stayed within its permissions.

### 8.4 Unique Hedera-Native Integrations

| Feature | Hedera Standard | What It Enables |
|---|---|---|
| **Agent Identity** | HCS-11 (Profile Metadata) | Each agent gets a structured on-chain identity with capabilities, trust signals, and session history |
| **Agent Communication** | HCS-10 (OpenConvAI) | Agents discover each other and negotiate via decentralized HCS topics, not centralized APIs |
| **Agent Discovery** | HOL Registry Broker | AgentVault agents register in the universal agent directory, discoverable by 72,000+ indexed agents |
| **Monetized Permissions** | HIP-991 (Fee-Gated Topics) | Session key creation and API marketplace listings can be monetized via fee-gated HCS topics |
| **Payment Settlement** | x402 + HTS | Per-call API payments settle via native HTS token transfers, not ERC-20 contract calls |
| **Batch Execution** | HIP-551 | Multi-step workflow actions execute atomically in a single Hedera transaction |
| **Reputation** | ERC-8004 + HCS | Agent behavior history (from HCS audit trail) feeds into on-chain reputation scores |

### 8.5 Why This Hasn't Been Built Before

Previous Hedera hackathon winners in the AI track (Hedera Chat, Aslan AI, DeCenter AI) focused on agent capabilities — what agents can do. None addressed agent permissions — what agents are allowed to do. This is because:

1. Scoped session keys require deep smart contract work (ERC-4337, EIP-1271, EIP-712) that most hackathon teams don't have time for
2. The Hedera Agent Kit abstracts away the permission problem by assuming the agent holds the key
3. The HCS standards (HCS-10, HCS-11, HIP-991) that make this architecture possible are new in 2025-2026

AgentVault arrives at the exact moment the infrastructure exists to build it properly.

---

## 9. Execution Roadmap — Hackathon Sprint (14 Days)

### Already Completed (Carried from Previous Build)
- [x] AgentDelegator smart contract — session keys, scoped permissions, EIP-1271, ERC-4337
- [x] API Proxy Marketplace — create/edit/delete proxies, encrypted credentials, pricing
- [x] Multi-step Workflow Engine — http, onchain, onchain_batch, condition, transform steps
- [x] MCP Server — dynamic tool registry, OAuth 2.1, session binding
- [x] Payment settlement — x402 compatible, EIP-712 typed data, nonce tracking
- [x] Web Dashboard — session management, proxy management, workflow builder
- [x] Database schema — users, sessions, proxies, workflows, logs, OAuth

---

### Week 1: Hedera Core Migration (Days 1–7)

#### Day 1–2: Smart Contract Deployment on HSCS
| Task | Details | Deliverable |
|---|---|---|
| Port AgentDelegator to Hedera testnet | Compile with Hardhat, deploy via HSCS JSON-RPC Relay | Deployed contract address on testnet |
| Adapt for Hedera EVM differences | Gas accounting adjustments, test all signature validation paths | Passing test suite on Hedera |
| Configure Hedera SDK (JS) | Set up `@hashgraph/sdk` alongside viem for native operations | Dual-SDK integration working |

#### Day 3–4: HCS Audit Trail + HCS-10 Integration
| Task | Details | Deliverable |
|---|---|---|
| Create HCS topics for agent audit trail | Dedicated topics for: session events, API calls, payments, permission violations | Topic IDs provisioned |
| Implement HCS logging middleware | Every agent action writes to HCS before returning response | Middleware integrated in MCP server |
| HCS-10 agent registration | Register AgentVault agents with OpenConvAI-compatible profiles | Agents discoverable via HCS-10 |
| HCS-11 agent identity profiles | Structured metadata (capabilities, session scopes, trust level) stored per-agent | Profile metadata on-chain |

#### Day 5–6: HTS Payment Integration + HIP-991
| Task | Details | Deliverable |
|---|---|---|
| Switch from ERC-20 to HTS for USDC | Use `TokenService` for transfers instead of contract calls | Native HTS payments working |
| Implement HIP-991 fee-gated topics | API marketplace listings as fee-gated topics — providers earn from agent discovery | Fee-gated topic creation UI |
| x402 payment flow on Hedera | Adapt payment verification and settlement for Hedera transaction model | End-to-end paid API call working |

#### Day 7: HOL Registry Broker Integration
| Task | Details | Deliverable |
|---|---|---|
| Register agents in Registry Broker | Use HOL Standards SDK to register AgentVault agents | Agents visible in HOL Portal |
| Expose AgentVault tools via Registry Broker | API proxies and workflows discoverable by external agents | Cross-ecosystem discovery working |
| ERC-8004 reputation hookup | Feed HCS audit trail data into Registry Broker trust scores | Reputation scores updating |

---

### Week 2: Polish, Demo & Submission (Days 8–14)

#### Day 8–9: Wallet Integration + Agent Account Creation
| Task | Details | Deliverable |
|---|---|---|
| HashPack wallet integration | Replace MetaMask/SIWE with HashPack for Hedera-native auth | Login via HashPack working |
| Agent account creation flow | Each new agent gets a dedicated Hedera account via `AccountCreateTransaction` | Automatic account provisioning |
| Session key UX improvements | Visual session scope builder with Hedera-specific presets (SaucerSwap, Bonzo, etc.) | Improved session creation UI |

#### Day 10–11: Demo Workflow — Bonzo Finance Integration
| Task | Details | Deliverable |
|---|---|---|
| Build "DeFi Agent" demo workflow | Agent queries token price API → evaluates risk → supplies to Bonzo lending pool | Working demo workflow |
| Session scoped to Bonzo contracts | Session key allows only Bonzo vault deposit/withdraw + USDC transfer | Scoped permissions enforced |
| Record every step to HCS | Audit trail shows: discovery → payment → price check → deposit → confirmation | Verifiable audit trail |

#### Day 12–13: Demo Video + Pitch Deck
| Task | Details | Deliverable |
|---|---|---|
| Record demo video (3-5 min) | Show: session creation → agent discovery → paid API call → on-chain action → HCS audit | YouTube video |
| Build pitch deck (10-12 slides) | Problem → Solution → Demo → Hedera Integration → Market → Team → Roadmap | PDF deck |
| Write project description (100 words) | Concise, hackathon-ready description | Submission text |

#### Day 14: Submission Day
| Task | Details | Deliverable |
|---|---|---|
| Final testing on Hedera testnet | End-to-end flow: wallet connect → create session → agent executes → payment settles → HCS logged | All flows passing |
| Clean up GitHub repo | README, deployment instructions, testing guide, architecture diagram | Submission-ready repo |
| Submit to StackUp | GitHub link, pitch deck, demo video, demo link, project details | Submitted |

---

## 10. Post-Hackathon Roadmap

### Phase 3 — Production Hardening (Q2 2026)
- [ ] Workflow retry and error recovery logic
- [ ] Rate limiting and per-session spending quotas (on-chain enforcement)
- [ ] Analytics dashboard with cost tracking and agent performance metrics
- [ ] Batch payment settlement via HIP-551 for fee optimization
- [ ] AWS KMS integration for enterprise key management

### Phase 4 — Ecosystem Growth (Q3 2026)
- [ ] Agent reputation marketplace — agents with higher HCS-verified trust scores get priority
- [ ] Curated workflow template library (DeFi, data, governance)
- [ ] SDK for third-party developers to build agents on AgentVault
- [ ] Webhook notifications for workflow events and session alerts
- [ ] Multi-chain session keys (Hedera primary, EVM L2 secondary)

### Phase 5 — Autonomous Agent Economy (Q4 2026)
- [ ] Agent-to-agent commerce via UCP (Universal Commerce Protocol)
- [ ] Scheduled transactions for recurring agent tasks (Hedera native)
- [ ] Threshold key sessions — multi-party approval for high-value agent actions
- [ ] Enterprise deployment with dedicated infrastructure and SLAs
- [ ] Governance token for marketplace curation and fee distribution

---

## 11. Bounty Strategy

AgentVault can submit to the **AI & Agents main track** plus one bounty:

| Bounty | Fit | Strategy |
|---|---|---|
| **Hashgraph Online (HOL)** | **Best fit** | Register agents in Registry Broker, use HCS-10 for communication, HCS-11 for profiles, feed trust scores from HCS audit trail |
| **OpenClaw** | Strong fit | AgentVault IS the infrastructure for autonomous agent commerce — agents discover and pay for services without human intervention |
| **AWS** | Good fit | Session key management via AWS KMS — agents never hold raw private keys, KMS signs on behalf within scoped permissions |
| **Bonzo** | Good for demo | Build a Bonzo Keeper Agent as the demo workflow — automated lending/borrowing with scoped permissions |

**Recommended:** Main Track (AI & Agents) + **HOL Bounty** — deepest integration, most technical differentiation, directly addresses the "agent interoperability" gap.

---

## 12. Team

AgentVault is built by a team of engineers with experience in blockchain infrastructure, AI systems, and security engineering. The project originated at a Web3 hackathon and is being developed into a production-grade platform for the agentic economy.

---

## 13. Conclusion

The agentic economy is inevitable. AI agents will transact, invest, pay for services, and coordinate economic activity at a scale and speed that humans cannot match. But without a safe, permissioned execution layer, this future is either dangerously unrestricted or needlessly constrained.

AgentVault provides the missing substrate: a trust-minimized execution fabric where agents operate with bounded autonomy, payments settle programmatically, and every action is cryptographically scoped and transparently auditable.

Built on Hedera — the network with the speed, cost structure, and native services required for microtransaction-heavy, high-throughput agentic workloads — AgentVault turns the promise of autonomous AI agents into a practical, safe reality.

**Autonomy without custody. Composability without danger. Automation without hot wallets.**

---

## References

1. ERC-4337: Account Abstraction — https://eips.ethereum.org/EIPS/eip-4337
2. ERC-7702: Set EOA Account Code — https://eips.ethereum.org/EIPS/eip-7702
3. ERC-7579: Minimal Modular Smart Accounts — https://eips.ethereum.org/EIPS/eip-7579
4. EIP-712: Typed Structured Data Hashing — https://eips.ethereum.org/EIPS/eip-712
5. EIP-1271: Standard Signature Validation — https://eips.ethereum.org/EIPS/eip-1271
6. Model Context Protocol (MCP) — https://modelcontextprotocol.io
7. Hedera Consensus Service — https://hedera.com/consensus-service
8. Hedera Token Service — https://hedera.com/token-service
9. Hedera Smart Contract Service — https://hedera.com/smart-contract-service

---

*AgentVault — Submission for Hedera Hello Future Apex Hackathon 2026, Theme 1: AI & Agents*

*License: MIT*
