# AgentVault 12-Week Sprint Plan

This document turns the high-level market-ready workplan into a 12-week delivery plan focused on turning AgentVault into a credible **agent permission gateway** MVP.

Related docs:

- `MARKET_READY_WORKPLAN.md`
- `ENGINEERING_BACKLOG.md`
- `FOUNDER_INVESTOR_ROADMAP.md`

## Planning Assumptions

- Team: 1 founder/PM, 1 senior full-stack engineer, 1 smart contract/security engineer, 1 part-time infra/platform engineer, 1 designer.
- Goal of the 12-week window: deliver a production-grade MVP for one narrow wedge, not a general marketplace.
- Recommended wedge: **agent-safe treasury actions**.
- Definition of done for the 12-week window:
  - no demo-mode fallback on production paths
  - one real end-to-end execution flow working in staging
  - a trust dashboard and approval UX for operators
  - a curated connector set and one usable demo story
  - design-partner-ready onboarding and documentation

## Sprint Structure

- Sprint length: 2 weeks
- Total duration: 6 sprints
- Review cadence:
  - weekly internal execution review
  - end-of-sprint demo
  - biweekly product-risk review

## Sprint 1: Product Reset and Technical Stabilization

### Objectives

- lock the initial wedge
- align product positioning
- identify and isolate production blockers
- stop shipping demo behavior as if it were product behavior

### Deliverables

- finalized wedge and MVP scope
- rewritten product narrative in internal docs
- technical gap assessment mapped to repo areas
- delivery board created from `ENGINEERING_BACKLOG.md`

### Engineering Focus

- review and classify every demo-only path in:
  - `apps/web/app/api/proxy/[id]/route.ts`
  - `apps/mcp-server/src/tools/proxy-tool.ts`
  - `apps/web/app/api/sessions/route.ts`
  - `apps/mcp-server/src/stdio-bridge.ts`
- fix root repository quality gate issues:
  - broken root `type-check`
  - current lint blockers
- define production-vs-demo configuration boundaries

### Product Focus

- choose the first use case:
  - recommended: guarded treasury transfer and approval workflow
- rewrite value proposition:
  - from "agent economy infrastructure"
  - to "least-privilege agent execution and audit"

### Exit Criteria

- MVP scope signed off
- backlog prioritized
- demo shortcuts documented and tagged for removal
- quality baseline visible and measurable

## Sprint 2: Fail-Closed Execution Path

### Objectives

- remove silent demo fallbacks
- ensure failed payment or auth states fail hard
- align the relay and workflow execution payloads

### Deliverables

- no automatic fallback to `X-DEMO` in production execution paths
- corrected relay payload contract between MCP server and `/api/execute`
- production gating for fake session creation

### Engineering Focus

- remove the payment-failure-to-demo fallback in `apps/mcp-server/src/tools/proxy-tool.ts`
- update `apps/mcp-server/src/tools/workflow-tool.ts` to send the payload expected by `apps/web/app/api/execute/route.ts`
- add environment-based enforcement to block off-chain fake sessions in production
- add integration tests for:
  - invalid payment
  - invalid session signature
  - invalid session state
  - workflow relay failure

### Security Focus

- verify that every unsafe fallback is either deleted or explicitly dev-only
- confirm failure states are auditable and visible

### Exit Criteria

- production paths fail closed
- end-to-end relay path matches API contract
- fake sessions blocked in production mode

## Sprint 3: Real Payment, Session, and Auth Integrity

### Objectives

- make one paid and permissioned flow real
- harden service-to-service auth and session ownership assumptions

### Deliverables

- real payment verification/settlement path or temporary removal of payment claims
- explicit internal auth between MCP server and web backend
- improved session validation and replay handling

### Engineering Focus

- implement or stub-remove payment settlement in `apps/web/app/api/proxy/[id]/route.ts`
- define service authentication between MCP server and backend APIs
- tighten session ownership checks across:
  - OAuth token issuance
  - workflow execution
  - relay submission
- add request correlation IDs and structured logs

### Infra Focus

- define staging secrets and config model
- separate local dev behavior from staging/production behavior

### Exit Criteria

- one tool execution flow has real auth and real payment semantics
- operator can trace an execution from request to settlement/audit

## Sprint 4: Session State, Infra, and Security Hardening

### Objectives

- prepare the platform to survive process restarts and horizontal scaling
- reduce obvious production security risks

### Deliverables

- Redis-backed MCP session state
- SSRF protections and outbound request controls
- security runbook v1

### Engineering Focus

- replace in-memory MCP session storage in `apps/mcp-server/src/server.ts`
- add allowlist or policy validation for outbound proxy targets
- add limits on headers, payload size, and request duration
- add audit logging coverage for:
  - denied actions
  - revoked sessions
  - settlement failures

### Security Focus

- document threat model:
  - prompt-driven misuse
  - malicious upstream URLs
  - session compromise
  - relayer abuse
- define break-glass and revocation procedures

### Exit Criteria

- MCP sessions survive restarts
- outbound request surface is materially safer
- incident response basics are documented

## Sprint 5: Vertical MVP UX and Trust Layer

### Objectives

- turn the platform from an engineering substrate into an operator-facing product
- make trust, scope, and approval visible in the UI

### Deliverables

- trust dashboard MVP
- approval UX for sensitive actions
- curated policy templates

### Product and Design Focus

- add UI for:
  - active sessions
  - scopes and expiry
  - approved targets
  - revoke/pause actions
  - action history
- add workflow approval checkpoints for sensitive steps
- simplify the workflow and connector story to a curated set

### Engineering Focus

- promote HCS audit data into a usable product surface
- implement reusable policy templates:
  - read-only market data
  - capped transfers
  - time-boxed sessions
  - token approval flow

### Exit Criteria

- internal users can understand trust boundaries without reading code
- one demo story is usable by a non-engineer operator

## Sprint 6: Design Partner Readiness and Launch Prep

### Objectives

- prepare the MVP for external pilots
- package documentation, onboarding, and operating expectations

### Deliverables

- staging-ready pilot environment
- onboarding runbook
- operator documentation
- metrics dashboard

### Product Focus

- finalize the first pilot workflow
- define pilot success metrics
- create onboarding checklist and support workflow

### Engineering Focus

- add observability dashboards
- finalize integration tests and smoke tests
- harden deployment config and rollback path
- create seeded demo data for the treasury wedge

### Business Focus

- create pilot offer structure
- draft beta agreement inputs
- define pricing hypothesis for post-pilot conversion

### Exit Criteria

- product is usable by first design partners
- support and escalation path exists
- MVP metrics are measurable from day one

## Cross-Sprint Workstreams

### Security

- maintain a rolling risk register
- schedule external review prep by Sprint 4
- ensure every high-risk change has explicit test coverage

### Documentation

- keep technical decisions recorded in ADR-style notes
- update README and landing page language as product direction narrows

### Quality

- require green lint and typecheck before merge
- expand integration coverage every sprint

## Weekly Cadence

### Week Structure

- Monday: sprint planning or weekly replanning
- Wednesday: product and architecture review
- Friday: demo, risk review, and metric check

### Core Metrics to Track Weekly

- number of demo fallbacks remaining
- number of end-to-end staging passes
- successful relay execution rate
- blocked out-of-policy actions
- audit completeness rate
- unresolved P0 and P1 issues

## 12-Week Success Definition

At the end of 12 weeks, AgentVault should be able to demonstrate:

- one real, narrow, high-trust agent workflow
- strong permission boundaries with visible policy controls
- auditable action trails
- no hidden demo bypasses in production behavior
- enough product polish and reliability to enter design-partner pilots

