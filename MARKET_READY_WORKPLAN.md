# AgentVault Market-Ready Workplan

Related planning docs:

- `SPRINT_PLAN_12_WEEKS.md`
- `ENGINEERING_BACKLOG.md`
- `FOUNDER_INVESTOR_ROADMAP.md`

## Goal

Recommended goal: turn AgentVault from a hackathon prototype into a **B2B agent permission gateway** for high-risk actions, starting with crypto treasury and sensitive enterprise MCP tools.

That goal fits the current codebase better than a broad public marketplace. The strongest foundations already exist in the session-key contract, scoped permissions, OAuth/MCP integration, and workflow model. The biggest blockers are the demo shortcuts and production gaps in the app layer, especially in:

- `apps/web/app/api/proxy/[id]/route.ts`
- `apps/mcp-server/src/tools/proxy-tool.ts`
- `apps/mcp-server/src/tools/workflow-tool.ts`
- `apps/web/app/api/execute/route.ts`
- `apps/mcp-server/src/server.ts`
- `apps/web/app/api/sessions/route.ts`

## Phase 0: Strategic Reset (Weeks 1-2)

- Pick one initial wedge: "agent-safe treasury actions" or "enterprise MCP gateway for sensitive internal tools." Treasury is the recommended first wedge.
- Freeze scope and explicitly de-prioritize the "open marketplace" until the control plane is trustworthy.
- Define the ICP: crypto treasury teams, fintech ops teams, custody-adjacent platforms, or compliance-heavy internal tooling teams.
- Write a product requirement doc covering user roles, trust model, approval model, audit expectations, and incident response expectations.
- Rewrite positioning in the README, landing page, and sales narrative around "least-privilege agent execution" rather than "agent economy."
- Define success metrics before building: number of successful guarded actions, approval latency, revoked sessions, prevented out-of-policy actions, design partner retention, and time saved versus manual operations.
- Exit criteria: clear customer wedge, one core use case, agreed product language, and a 90-day delivery scope.

## Phase 1: Core Platform Hardening (Weeks 3-8)

- Remove every demo-mode bypass from production paths. Tool calls must fail closed, not fall back to `X-DEMO`.
- Implement real payment verification and settlement, or temporarily remove paid API claims entirely until that flow is complete.
- Fix execution-path mismatches between workflow signing and the relayer payload. The relay contract route expects `sessionKeySignature`; the workflow tool currently sends `signature`.
- Remove or production-gate off-chain fake sessions. Session creation should rely on real on-chain sessions only in production.
- Replace in-memory MCP sessions with Redis or database-backed session state to support restarts and horizontal scaling.
- Add internal service authentication between the MCP server and the web/API backend so remote MCP execution does not depend on browser-authenticated routes.
- Add SSRF protection and egress controls for proxy URLs. This is mandatory because the app forwards user-defined outbound requests with decrypted headers.
- Add policy validation on workflow definitions so only approved targets, selectors, token contracts, and connector categories can be used in production.
- Add nonce, replay, and reconciliation checks for all off-chain signed payment or authorization flows.
- Add structured logs, request correlation IDs, retry policies, dead-letter handling, and error classification.
- Build a staging environment that mirrors production and separates testnet from mainnet concerns.
- Exit criteria: one fully working end-to-end path with no demo fallback, no fake sessions, and deterministic failure behavior.

## Phase 2: Security and Reliability Program (Weeks 5-10, overlaps with Phase 1)

- Commission a smart contract review focused on `grantSession`, `executeWithSession`, selector/target validation, EIP-1271 domain binding, and replay assumptions.
- Commission an application security review focused on auth boundaries, secret handling, proxy behavior, and MCP exposure.
- Replace RSA env-key storage with a managed key system for production. Use KMS, HSM, or MPC-backed subordinate key infrastructure.
- Add security controls for secret rotation, audit retention, break-glass access, and operator action logging.
- Build runbooks for session compromise, relayer outage, key compromise, settlement mismatch, and upstream provider abuse.
- Add rate limiting, tenant isolation, webhook validation, and abuse prevention on public endpoints.
- Exit criteria: documented threat model, external review findings triaged, P0/P1 issues closed, and incident runbooks tested.

## Phase 3: Vertical MVP Productization (Weeks 9-14)

- Simplify the product to a few curated capabilities instead of an open-ended builder.
- Ship policy templates such as read-only market data access, capped token transfers, token approvals, spend-limited payment flows, and time-boxed agent sessions.
- Add human approval checkpoints for sensitive workflow steps. Support one-click approve, deny, revoke, and pause.
- Build a trust dashboard showing active sessions, scopes, approved targets, expiry, action history, and relayer status.
- Upgrade the HCS audit feature into a product surface: searchable timelines, export to CSV/JSON, immutable proof links, and "show me what this agent was allowed to do vs what it did."
- Curate 5-10 trusted connectors instead of supporting arbitrary APIs first. Suggested first set: wallet balance, price feed, settlement, exchange API, accounting export, notification, and internal approval systems.
- Restrict the workflow builder for MVP. Make it policy-first, not infinitely flexible.
- Exit criteria: a buyer can understand the value in one demo, and an operator can run one real use case safely without engineering help.

## Phase 4: Design Partner Beta (Weeks 15-22)

- Recruit 3-5 design partners that already have manual high-risk workflows and a clear need for agent controls.
- Offer white-glove onboarding and weekly operational reviews.
- Instrument everything. Measure attempted actions, blocked actions, approvals, execution success rate, settlement time, workflow completion time, and operational incidents.
- Collect hard evidence of value: time saved, reduced operator burden, faster approvals, fewer permission mistakes, and auditable execution.
- Use partner feedback to refine policy templates, approval UX, connector set, and reporting needs.
- Start drafting enterprise requirements: SSO, RBAC, audit export, data retention controls, private networking, dedicated infra, and support SLAs.
- Exit criteria: at least 2 partners using the platform repeatedly for a real workflow and willing to continue after the beta.

## Phase 5: Commercial Launch Prep (Weeks 23-28)

- Package the product into a hosted control plane with clean onboarding, setup checklists, sample policies, and quickstarts.
- Add support for team accounts, admin roles, audit reviewers, and operations users.
- Publish clear documentation for operators, developers, and security reviewers.
- Build a minimal SDK or API layer so customers can integrate their own internal tools and approvals.
- Prepare legal and commercial foundations: terms, privacy policy, risk disclosure, DPA, enterprise security FAQ, incident policy, and support model.
- Decide pricing. Recommended starting model: platform fee plus seat/workspace fee plus usage-based execution or audit volume pricing.
- Build case studies from beta partners and turn them into concrete launch proof.
- Exit criteria: production onboarding path, pricing page, documented controls, and at least one convertible paid customer.

## Phase 6: Post-Launch Expansion (Months 7-12)

- Expand from treasury to adjacent high-trust workflows: vendor payouts, exchange rebalancing, investment approvals, operational runbooks, and internal tool governance.
- Add enterprise identity features: SSO, SCIM, RBAC, delegated administration, policy bundles, and environment separation.
- Add anomaly detection and AI-assisted risk flags: unusual targets, out-of-hours execution, novel workflow branches, or unusual spend patterns.
- Add multi-chain support only after the first wedge is stable and paying.
- Add a connector marketplace later, but only after you have demand-side usage and clear certification requirements.
- Build a moat around policy templates, audit fidelity, safety UX, and verified connector quality, not around generic workflow editing.

## Immediate Repo Backlog: First Engineering Sprint

- Implement real settlement or remove payment claims in `apps/web/app/api/proxy/[id]/route.ts`.
- Remove the "payment failed, use demo mode" fallback in `apps/mcp-server/src/tools/proxy-tool.ts`.
- Align workflow relay payloads between `apps/mcp-server/src/tools/workflow-tool.ts` and `apps/web/app/api/execute/route.ts`.
- Remove or hard-disable fake off-chain sessions in `apps/web/app/api/sessions/route.ts` for production builds.
- Replace the in-memory `Map` session store in `apps/mcp-server/src/server.ts` with Redis-backed state.
- Fix repo quality gates. The root `type-check` currently points to a missing script, and the web lint pass has multiple failures in the current tree.
- Add integration tests that cover the real path: create session, mint scope, request tool, pay, relay, audit, revoke, retry, and failure cases.

## Team Plan

- 1 product founder/PM who owns wedge discipline and design partner learning.
- 1 senior full-stack engineer who owns API/backend and auth boundaries.
- 1 smart contract/security engineer who owns policy enforcement and audits.
- 1 infra/platform engineer, even part-time, for environments, observability, secrets, and reliability.
- 1 product designer for trust UX, approval flows, and audit visibility.
- 1 GTM/operator once beta begins, to onboard and support design partners.

## KPIs by Stage

- Phase 1 KPIs: zero demo fallbacks in production paths, 95% or better successful happy-path execution in staging, all P0 bugs fixed.
- Phase 3 KPIs: one repeatable use case demoed live, setup time under one hour, audit trail complete for every action.
- Phase 4 KPIs: 2 or more weekly active design partners, 70% or better workflow completion rate, measurable operator time savings.
- Launch KPIs: first paid pilot, low support burden per tenant, strong retention within first 60 days.

## What Can Cause Failure

- Staying too broad and trying to build a marketplace, automation platform, custody product, and AI framework at once.
- Shipping with demo-mode behavior still present anywhere near real money or enterprise trust boundaries.
- Failing to secure design partners early and building against imagined demand.
- Treating the contract layer as the product while underinvesting in operator UX, controls, reliability, and reporting.
- Expanding chains and connectors before one wedge is operationally excellent.

## Recommended Outcome

If executed well, the realistic target is not "the universal agent economy layer" in the first year. It is: **the safest way for an organization to let agents perform a narrow class of sensitive actions under explicit policy and audit.** That is a credible, valuable, and sellable product.
