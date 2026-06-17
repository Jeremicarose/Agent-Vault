# AgentVault Engineering Backlog

This backlog translates the market-ready plan into engineering tasks tied to the current repository.

Related docs:

- `MARKET_READY_WORKPLAN.md`
- `SPRINT_PLAN_12_WEEKS.md`
- `FOUNDER_INVESTOR_ROADMAP.md`

## Backlog Usage

- Priority scale:
  - `P0`: must fix before pilots
  - `P1`: required for MVP readiness
  - `P2`: important but can follow MVP
  - `P3`: later optimization or expansion
- Status tracking should be added in the issue tracker:
  - `todo`
  - `in progress`
  - `blocked`
  - `done`

## Epic 1: Remove Demo-Only Behavior

### P0 Tasks

- Remove payment-failure fallback to demo mode in `apps/mcp-server/src/tools/proxy-tool.ts`.
- Add explicit environment gating for any `X-DEMO` behavior across:
  - `apps/mcp-server/src/tools/proxy-tool.ts`
  - `apps/mcp-server/src/stdio-bridge.ts`
  - `apps/web/app/api/proxy/[id]/route.ts`
- Block off-chain fake session creation in production mode in `apps/web/app/api/sessions/route.ts`.
- Add tests proving production mode fails closed when:
  - payment is absent
  - session is invalid
  - auth is missing

### Acceptance Criteria

- no production request reaches a successful response through a demo bypass
- all dev-only shortcuts are clearly isolated by config

## Epic 2: Fix Real Execution Path

### P0 Tasks

- Align request payload names between:
  - `apps/mcp-server/src/tools/workflow-tool.ts`
  - `apps/web/app/api/execute/route.ts`
- Validate ownership and session usage assumptions in workflow execution.
- Add integration test for:
  - create session
  - sign workflow execution
  - relay to `/api/execute`
  - confirm receipt
- Confirm that `ownerAddress` passed through the relay path matches intended smart-account behavior.

### P1 Tasks

- Add explicit typed client or shared schema for the `/api/execute` payload to eliminate drift.
- Add structured error codes for relay failures.

### Acceptance Criteria

- workflow-triggered on-chain execution succeeds using the same contract that validates direct relay calls

## Epic 3: Real Payment and Settlement

### P0 Tasks

- Decide product behavior:
  - implement real settlement now, or
  - remove monetization claims from the MVP until settlement is production-ready
- Implement payment verification in `apps/web/app/api/proxy/[id]/route.ts`.
- Ensure the proxy only forwards upstream requests after valid payment confirmation.
- Record settlement outcomes in request logs and HCS audit trails.

### P1 Tasks

- Add reconciliation logic between proxy request logs, on-chain payment events, and audit events.
- Add refund/failure-state handling for partial execution scenarios.

### Acceptance Criteria

- paid tool invocation is either truly paid and logged, or clearly not marketed as paid

## Epic 4: MCP Auth and Internal Service Boundaries

### P0 Tasks

- Introduce service-to-service authentication between MCP server and backend execution APIs.
- Remove any reliance on browser-session auth for server-side agent execution.
- Review OAuth token flow across:
  - `apps/web/app/api/oauth/authorize/route.ts`
  - `apps/web/app/api/oauth/token/route.ts`
  - `apps/mcp-server/src/auth/oauth.ts`
- Add negative tests for:
  - slug mismatch
  - expired token
  - inactive session
  - invalid client secret

### P1 Tasks

- Add scope-aware authorization checks on tool and workflow execution.
- Add internal auth rotation mechanism for service secrets.

### Acceptance Criteria

- remote MCP execution works with explicit backend trust boundaries and no ambient browser context

## Epic 5: Session State and Horizontal Scalability

### P0 Tasks

- Replace the in-memory `Map` session store in `apps/mcp-server/src/server.ts` with Redis-backed storage.
- Define session TTL, cleanup, and reconnection behavior.
- Ensure MCP session recovery after process restart.

### P1 Tasks

- Add sticky-session-free deployment support.
- Add observability for session creation, expiration, and restore events.

### Acceptance Criteria

- MCP server sessions survive restarts and can scale beyond one process

## Epic 6: Proxy Security and Outbound Controls

### P0 Tasks

- Add SSRF protections for user-configured proxy targets.
- Validate allowed schemes, hosts, and optionally CIDR ranges.
- Block access to internal metadata services and local network targets.
- Add request-size, timeout, and header count limits.

### P1 Tasks

- Add outbound allowlists for certified connectors.
- Add per-tenant egress policy controls.

### Acceptance Criteria

- user-supplied proxy definitions cannot be used to pivot into internal infrastructure

## Epic 7: Key Management and Secret Hardening

### P1 Tasks

- Design a production key-management migration from env-stored RSA material to managed KMS/HSM/MPC.
- Separate connector-secret handling from session-signing key handling.
- Add secret rotation procedures and audit logging.

### P2 Tasks

- Implement hardware-backed or managed signing path.
- Add key versioning and migration support.

### Acceptance Criteria

- production architecture no longer depends on long-lived private material in app env vars alone

## Epic 8: Audit, Logging, and Observability

### P0 Tasks

- Ensure audit logging exists for:
  - successful tool invocations
  - workflow execution
  - denied actions
  - revoked sessions
  - payment failures
- Add correlation IDs from request through relay and audit.
- Add staging dashboards for:
  - execution success rate
  - settlement failures
  - session revocations
  - denied actions

### P1 Tasks

- Build search and export for audit events.
- Add alerting for abnormal failure patterns.

### Acceptance Criteria

- operators can trace every sensitive action end-to-end

## Epic 9: Policy Templates and Approval Controls

### P1 Tasks

- Add policy templates for:
  - read-only price/balance access
  - capped transfer
  - time-boxed session
  - token approval
- Add approval checkpoints for sensitive workflow steps.
- Add revoke, pause, and deny actions in the UI.

### P2 Tasks

- Add multi-stage approvals and role-based approval routing.

### Acceptance Criteria

- non-engineer operators can safely approve or revoke a high-risk workflow

## Epic 10: UX and Trust Dashboard

### P1 Tasks

- Build dashboard views for:
  - active sessions
  - scope summary
  - approved targets/selectors
  - expiry windows
  - recent actions
  - relayer status
- Promote HCS audit data into a usable UI surface.
- Reduce marketplace-first UI emphasis and refocus on control and audit.

### P2 Tasks

- Add risk annotations and anomaly indicators.

### Acceptance Criteria

- the product can be demoed as a control plane, not just a developer prototype

## Epic 11: Repo Quality and Delivery Hygiene

### P0 Tasks

- Fix root `type-check` so it points to a real package script.
- Add a proper `type-check` script in `apps/web/package.json` or update the root script.
- Resolve current lint errors blocking a clean baseline.
- Add CI jobs for:
  - lint
  - typecheck
  - contract tests
  - core integration tests

### P1 Tasks

- Add coverage reporting for critical flows.
- Add smoke test scripts for staging deployment validation.

### Acceptance Criteria

- main branch has reliable automated quality gates

## Epic 12: Productization and Pilot Readiness

### P1 Tasks

- Seed a treasury-focused demo path with realistic data and docs.
- Create a guided onboarding path for:
  - session creation
  - policy setup
  - workflow approval
  - execution review
- Add admin/operator roles and team-facing terminology.

### P2 Tasks

- Add usage analytics and tenant-facing KPI summaries.

### Acceptance Criteria

- a design partner can be onboarded with a repeatable process

## Suggested Issue Creation Order

1. Remove demo fallbacks
2. Fix workflow relay payload mismatch
3. Fix root quality gates
4. Implement real or de-scoped payment path
5. Add internal auth between MCP and backend
6. Replace in-memory MCP session store
7. Add SSRF and outbound request protections
8. Build audit completeness and observability
9. Add policy templates and approval controls
10. Build trust dashboard and pilot UX

## Definition of MVP Engineering Completion

The engineering side of the MVP is complete when:

- production mode has no silent demo fallback
- one narrow execution path is real, testable, and observable
- trust boundaries are explicit
- sessions are durable across restarts
- operator audit and approval workflows exist
- the repo has stable automated checks

