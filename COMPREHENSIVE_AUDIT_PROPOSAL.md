# AgentVault Comprehensive Audit and Proposal

Authoring basis:

- Current repository state
- [README.md](./README.md)
- [LIGHTPAPER.md](./LIGHTPAPER.md)
- [MARKET_READY_WORKPLAN.md](./MARKET_READY_WORKPLAN.md)
- [ENGINEERING_BACKLOG.md](./ENGINEERING_BACKLOG.md)

Date context: June 2026

## 1. Executive Summary

AgentVault is currently a strong prototype for one specific category of software:

**a permission and audit layer for AI agents that need to call tools, spend money, or touch on-chain systems without receiving unrestricted keys or credentials.**

That is the real value in the project. The weakest part of the current positioning is the broad "marketplace for agentic APIs" story. The strongest part is the combination of:

- scoped session-key permissions
- MCP-native tool exposure
- composable HTTP and on-chain workflows
- immutable auditability
- non-custodial execution constraints

The best market-ready form of this project is not a generic open marketplace. It is a **B2B agent permission gateway** for high-trust use cases such as:

- crypto treasury operations
- sensitive enterprise tool access
- compliance-heavy workflow execution
- API monetization where machine payment and policy controls matter

The rest of this document answers the business, product, technical, data, and risk questions directly.

## 2. What Problem Exists Today?

### Short Answer

AI agents can now discover tools and perform meaningful actions, but most organizations still do not have a safe way to let them operate with real authority.

### More Specifically

Today there are four common bad options:

1. Do not let the agent act at all.
2. Give the agent full API keys or wallet control.
3. Put a human in every step, which destroys automation value.
4. Trust a centralized custodian or wrapper to enforce permissions off-chain.

### Why This Is a Problem

- Full access creates catastrophic blast-radius risk.
- Human-only controls create latency and operating cost.
- Off-chain policy enforcement is hard to verify independently.
- Existing automation tools are usually broad-access systems, not least-privilege execution systems.
- AI agent use is increasing faster than trustworthy delegation infrastructure.

## 3. Who Experiences the Problem?

### Primary Buyers

- crypto treasury teams
- fintech operations teams
- exchanges and brokerages
- custody-adjacent platforms
- enterprise teams exposing sensitive internal tools to AI agents

### Primary Users

- operations managers
- treasury analysts
- compliance reviewers
- security administrators
- developers integrating tools into MCP clients

### Secondary Users

- AI agents themselves, as machine actors operating under policy
- API or workflow providers who want to sell controlled agent-accessible services

## 4. How Are They Solving It Now?

Current substitutes fall into several categories:

### 1. Manual Approval Workflows

- spreadsheets
- Slack/Email approvals
- human-operated dashboards
- finance ops review queues

This is safe-ish, but slow and expensive.

### 2. Broad Automation Platforms

- Zapier
- Workato
- n8n

These are good at connectivity and workflow automation, but not built primarily around cryptographic least-privilege execution. Zapier now supports MCP and monetizes usage by tasks, which confirms MCP is becoming a real integration surface, but it still solves a different problem: broad app automation, not agent-safe delegated authority. Sources: Anthropic MCP docs, Zapier MCP docs, Zapier MCP usage docs.

### 3. Custodial or Wallet Infrastructure

- centralized key management systems
- API wallet providers
- policy engines attached to custody infrastructure

These help with signing and secrets, but typically do not combine MCP-native tool discovery, workflow composition, monetizable API access, and end-to-end agent audit in one product.

### 4. Direct API Key or Wallet Sharing

- plaintext service accounts
- server-side stored credentials
- bot wallets with broad permissions

This is operationally common and strategically dangerous.

### 5. Early Machine-Payment Protocols

- x402-style HTTP payment flows

These solve part of the payment layer, not the full permissioned execution problem.

## 5. Who Pays? Who Uses It? Are They the Same Person?

### Demand Side

- **Payer:** usually the organization, department, or budget owner
- **User:** operator, treasury manager, compliance reviewer, or developer
- **Executor:** the AI agent

These are usually **not** the same entity.

### Supply Side

- **Payer:** possibly API provider or workflow publisher if there is a platform fee
- **User:** API provider or workflow creator
- **Receiver of value:** provider earning usage revenue

### Conclusion

No, the payer and the user are not always the same person. In the strongest version of this business:

- the company pays
- staff configure and review
- the agent executes

## 6. What Exactly Is Being Sold?

### Current Repo Reality

Today the repo contains:

- a web application
- an MCP server
- a session-key smart contract
- API proxying
- workflow composition
- audit trail plumbing

This is a prototype platform, not yet a production product.

### Recommended Product

What should be sold is:

**a hosted control plane for least-privilege agent execution**

That includes:

- MCP server endpoint(s)
- policy-controlled tool access
- session and scope management
- workflow execution with bounded permissions
- audit and review dashboards
- approval and revocation controls

## 7. What Does the Customer Receive?

### Operational Deliverables

- secure agent tool access
- bounded execution rights
- auditable action history
- workflow templates for specific use cases
- policy enforcement layer
- admin controls for revocation and scope management

### Technical Deliverables

- hosted UI
- API/MCP integration layer
- policy and scope data model
- signing and relay workflow
- connector definitions
- logs and audit exports

## 8. Why Would Someone Choose This Over Alternatives?

### Reasons to Choose AgentVault

- it is built around **least privilege**, not generic automation convenience
- it supports **MCP-native** agent interaction
- it can combine **HTTP + on-chain** actions in one workflow
- it offers a stronger **verifiability** story through blockchain-backed enforcement/audit
- it is designed around **agents as untrusted actors**

### Reasons They Might Not Choose It Yet

- the repo still contains prototype-era shortcuts and incomplete production hardening
- connector breadth is far smaller than large incumbents
- the blockchain layer adds complexity for customers who only want internal tool governance

## 9. What Is Unique?

The most distinctive combination is:

- **scoped session-key execution**
- **MCP-native tool delivery**
- **composable workflows**
- **verifiable audit trail**
- **machine-payment-ready architecture**

Many alternatives solve one or two of these pieces. Fewer solve them together.

## 10. What Are the Inputs?

Primary inputs into the system include:

- user wallet identity
- session scopes and time bounds
- API proxy definitions
- encrypted upstream API credentials
- workflow definitions
- workflow runtime input variables
- OAuth client metadata
- OAuth tokens and authorization codes
- MCP server configuration
- tool selection
- on-chain relay payloads

## 11. What Processing Happens?

### Core Processing Stages

1. User authenticates and configures a tool/workflow environment.
2. Session key is generated and scoped.
3. MCP server exposes tools/workflows to an agent.
4. Agent invokes a tool or workflow.
5. Variables are resolved and validated.
6. API requests are proxied or on-chain execution is prepared.
7. Relay request is validated and submitted.
8. Result is returned.
9. Action is logged in application records and optionally HCS.

## 12. What Calculations Happen?

AgentVault does several concrete calculations:

- session validity windows (`validAfter`, `validUntil`)
- scope flattening into allowed targets/selectors
- payload validation
- ABI encoding for on-chain calls
- EIP-712 digest creation and signature generation
- workflow variable substitution and JSONPath output mapping
- payment amount derivation by per-request price
- chain/delegator validation
- audit correlation across session, tool, and tx state

These are mostly deterministic rule and encoding calculations rather than predictive ML.

## 13. What Intelligence Is Added?

### Current State

The platform itself adds limited algorithmic intelligence. The main "intelligence" currently comes from:

- the external LLM or agent using MCP
- rules encoded in policies and workflows

### What AgentVault Adds

- policy interpretation
- safe scope shaping
- structured execution path validation
- deterministic workflow orchestration
- trust and audit structure around agent behavior

### Recommended Future Intelligence

- anomaly detection on execution behavior
- scope recommendations
- risk scoring on workflows or sessions
- approval escalation suggestions

## 14. What Data Must Persist?

### Must Persist

- users
- session keys and encrypted private-key material
- session scopes
- API proxy definitions
- request logs
- OAuth clients, auth codes, and access tokens
- MCP server definitions
- tool/workflow configuration
- workflow templates
- audit metadata and reconciliation references

## 15. Where Is It Stored?

### Current Implementation

- **PostgreSQL** via Drizzle ORM for users, sessions, proxies, OAuth, MCP servers, workflows
- **environment variables / key material** for some cryptographic secrets
- **Hedera Consensus Service** for optional immutable audit trail
- **in-memory structures** for some current MCP runtime session handling

### Recommended Production State

- PostgreSQL for operational state
- Redis for durable runtime session/state coordination
- managed KMS/HSM/MPC for sensitive key operations
- HCS or equivalent immutable audit layer for external verifiability

## 16. For How Long?

### Current Repo State

Retention policy is not fully productized in the codebase.

### Recommended Policy

- user and configuration records: until account deletion + compliance window
- session metadata: keep active and revoked records for auditability
- request logs: 30-180 days hot storage, longer cold storage as needed
- audit records: longer retention, potentially 1-7 years depending on buyer profile
- HCS records: effectively immutable/long-lived once published
- OAuth tokens/auth codes: short-lived and aggressively expired

## 17. Who Pays? When Do They Pay? For What?

### Current Prototype Story

The codebase gestures toward:

- pay-per-call API usage
- workflow or proxy monetization

But the project is still transitioning from prototype logic to fully trustworthy production billing and settlement.

### Recommended Commercial Model

#### Primary Revenue

- SaaS subscription for the control plane

#### Secondary Revenue

- usage-based execution or audit volume
- enterprise SLA / private deployment
- optional transaction fee on agent-mediated payment flows

### Payment Timing

- monthly or annual platform subscription
- usage overage billed per period
- optionally per-execution or per-settlement pricing

### What They Pay For

- secure delegated execution
- policy and approval workflows
- auditability
- MCP infrastructure
- integration and operational tooling

## 18. What Breaks If We Remove the Blockchain?

### What Still Works Without Blockchain

- web UI
- MCP tooling layer
- API proxies
- workflow composition
- OAuth
- basic policy enforcement
- operator dashboards

### What Materially Degrades

- cryptographic on-chain permission enforcement
- non-custodial execution guarantees
- independently verifiable audit trail
- machine-payment story tied to on-chain settlement
- portable trust claim that the system enforces rather than merely promises policy

### Conclusion

If blockchain is removed, AgentVault becomes a more conventional secure automation/control-plane product. It can still be useful, but it loses one of its strongest differentiators: **verifiable, non-custodial, policy-constrained execution**.

## 19. What Is the User Journey?

### Recommended Primary Journey

1. Company signs up.
2. Admin connects wallet / identity and configures organization.
3. Admin creates or selects a controlled tool set.
4. Admin configures a workflow and allowed scope.
5. Session is granted for a bounded time and action set.
6. MCP server endpoint is connected to an AI client.
7. Agent discovers tools and proposes or executes actions.
8. Sensitive actions are auto-executed or approval-gated depending on policy.
9. Operator reviews logs, alerts, and audit history.
10. Session is rotated, paused, or revoked when needed.

## 20. What Are the Risks?

## Technical Risks

- incomplete payment settlement path
- runtime session handling not yet fully productionized
- pre-existing repo build/lint issues
- SSRF and outbound request abuse risk in proxying
- relay and signing path bugs
- key management maturity gap
- integration sprawl as more connectors are added

## Legal Risks

- custody and financial-regulation interpretation
- sanctions/AML implications if value transfer is involved
- data-processing and privacy obligations
- terms and liability around agent-caused actions
- enterprise contractual expectations for audit retention and incident disclosure

## Data Quality Risks

- upstream APIs may be stale, wrong, rate-limited, or inconsistent
- workflow variable mappings may produce incorrect execution values
- audit reconciliation may drift between off-chain logs and on-chain state
- JSONPath or transform logic may silently produce bad downstream inputs

## Business Risks

- going too broad with "marketplace" positioning
- weak product-market fit if the product is sold as general agent infra
- incumbents win on convenience and integration breadth
- buyers may want simpler centralized control rather than blockchain-backed trust
- long enterprise sales cycles
- unclear budget owner if use case is not narrow and painful enough

## 21. What Metric Proves Success?

### North Star Metric

**Number of successful high-trust agent actions executed within policy and without manual exception handling.**

That metric proves the actual job-to-be-done:

- agents are being used
- they are doing real work
- policy is not being bypassed
- operators are not constantly intervening

### Supporting Metrics

- blocked out-of-policy actions
- approval turnaround time
- percentage of audited actions with complete traceability
- successful relay execution rate
- number of active scoped sessions
- design partner weekly active usage
- time saved versus manual workflow
- pilot-to-paid conversion rate

## 22. Proposed Product Direction

### Recommendation

Position AgentVault as:

**an agent permission gateway for high-trust execution**

### Recommended Initial Wedge

- crypto treasury operations

### Why This Wedge

- pain is real
- consequences of bad automation are expensive
- blockchain-backed controls are more legible here
- users already accept wallet, signing, and policy concepts

### What To Sell First

- hosted control plane
- scoped session management
- curated workflow templates
- approval and audit dashboard
- MCP gateway for trusted tools

## 23. Final Judgment

AgentVault has real potential, but only if it is narrowed into a control-plane product rather than marketed as a broad open marketplace too early.

### Strongest Assets

- good architectural thesis
- clear least-privilege design
- smart-contract enforcement model
- MCP-native positioning
- credible audit story

### Weakest Areas

- incomplete production hardening
- payment and proxy trust gaps still being closed
- limited integration breadth
- prototype-to-product transition still underway

### Most Defensible Product Version

The most defensible version of this project is:

**a secure, auditable, least-privilege execution layer for AI agents operating in high-risk environments**

## 24. Source Notes

### Local Project Sources

- [README.md](./README.md)
- [LIGHTPAPER.md](./LIGHTPAPER.md)
- [MARKET_READY_WORKPLAN.md](./MARKET_READY_WORKPLAN.md)
- [ENGINEERING_BACKLOG.md](./ENGINEERING_BACKLOG.md)

### External Market Context

- Anthropic MCP overview: https://docs.anthropic.com/en/docs/mcp
- Coinbase x402 overview: https://docs.cdp.coinbase.com/x402/welcome
- Zapier MCP overview: https://help.zapier.com/hc/en-us/articles/36265392843917-Use-Zapier-MCP-with-your-client
- Zapier MCP usage model: https://help.zapier.com/hc/en-us/articles/45645738385805-How-Zapier-MCP-usage-works

