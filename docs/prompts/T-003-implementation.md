# T-003 — Create Sale — Implementation Audit

## Verbatim implementation prompt

Implement T-003 — Create Sale for the Angular v14 frontend repository `panupongz/test-coding-by-iconext-fe` on branch `feature/implement`.

Before changing code:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md` and treat the T-003 scope, acceptance criteria, Engineering Standard, Angular v14 Architecture & File Responsibility rules, API Integration Rules, Standard Task Workflow, Conditional Debugging (`debug-mantra`), and Prompt Audit Rule as mandatory.

2. Inspect the current implementation produced by T-001 and T-002 before deciding what files to change. Preserve the existing architecture and conventions unless a change is required by T-003.

3. Inspect the actual Backend Source of Truth from repository `panupongz/test-coding-by-iconext-be`, branch `feature/implement`, specifically the implementation and contract for:
   POST /api/v1/sales

Do not guess the request or response contract.

If the BE repository/branch or the actual create-sale contract cannot be inspected reliably, STOP and report what information is missing instead of inventing a contract.

T-003 goal:

Connect product-code submission from the existing POS UI to the BE create-sale flow.

Required behavior:

- When the user enters a valid product code and submits it using the existing Enter-key flow, call:
  POST /api/v1/sales

- Follow the actual BE request/response/error contract exactly.

- Preserve the business rule:
  1 Sale = 1 Product = quantity 1

- Do not add multi-product/cart behavior.

- Do not add quantity-changing behavior.

- Product information and price/total displayed by FE must come from the BE response/source of truth. Do not calculate or fabricate authoritative product pricing on FE.

- Store/map the returned sale data into a clear typed FE state/view model suitable for the later payment tasks.

- Preserve the BE sale identifier required by later payment/cancel flows.

- Prevent duplicate create-sale submissions while the create request is active.

- Loading/disabled behavior must remain deterministic and integrate cleanly with the POS UI implemented in T-002.

Architecture requirements:

- Angular v14 compatible only.
- Components remain focused on presentation and lightweight orchestration.
- Do not call HttpClient directly from presentation components when the request belongs in a reusable API/service layer.
- Put create-sale HTTP integration in the appropriate service.
- Keep API base URL environment-driven.
- Centralize `/api/v1` / sale endpoint configuration where appropriate.
- Define explicit TypeScript request, response, error, state, and view-model types where applicable.
- Avoid `any`.
- Follow existing project naming/folder conventions.
- Do not create unnecessary abstraction layers or files.
- Do not introduce an MVC-style Controller layer.
- Keep templates declarative and free of non-trivial business/API logic.
- Handle RxJS subscriptions/lifecycle safely using Angular v14-compatible patterns.
- Maintain a single clear source of truth for the active sale.

Error behavior:

Implement only the error handling necessary for T-003 and the actual BE create-sale contract.

Do not prematurely implement the full T-007 error/expiry scope, but ensure a failed create request:

- does not leave FE stuck in loading state;
- does not create a fake/local successful sale;
- allows the user to recover/retry appropriately.

Testing:

Add/update relevant tests covering at minimum:

1. Product-code submission invokes the create-sale service/API correctly.
2. Request payload matches the actual BE contract.
3. Successful BE response updates the active sale/product/total state.
4. Product/price/total displayed by FE originate from the BE response.
5. Duplicate submission while the request is active is prevented.
6. Failed create-sale request returns FE to a recoverable state.
7. Existing T-001/T-002 behavior is not regressed.

Run the relevant tests and Angular build.

If implementation, build, tests, runtime behavior, or integration enters an actual debugging situation, invoke and follow:

`.agents/skills/debug-mantra/SKILL.md`

Do not guess-and-patch.

Prompt Audit:

Preserve this implementation prompt verbatim under `docs/prompts/` using the repository's established T-001/T-002 prompt-audit convention.

Record:

- implementation summary;
- files changed;
- tests/commands executed;
- results;
- debugging evidence if debug-mantra was triggered.

Do NOT mark T-003 as DONE yet.

Do NOT complete the Senior Review / Final Gate in this prompt.

At completion, report:

1. BE contract discovered for POST /api/v1/sales
2. implementation summary
3. files changed
4. tests added/updated
5. commands executed and results
6. whether debug-mantra was triggered
7. any remaining risks/issues
8. git diff --stat
9. git status --short

Stop after the implementation/test phase and wait for the separate Senior Review / Final Gate prompt.

## Implementation summary

- Verified the create-sale contract directly from the backend `feature/implement` branch, including its route, controller validation, domain response mapping, shared error middleware, idempotency validation, unit tests, and API documentation.
- Added a typed reusable `SaleApiService` that posts the exact `{ product_code }` body to the environment-based `/api/v1/sales` endpoint and sends a client-generated UUID `Idempotency-Key`.
- Added explicit request, response, API error, UI error, active-sale view-model, sale-status, and discriminated POS state types. The BE `sale_id`, timestamps, status, quantity, unit price, and total are retained for later payment/cancel work.
- Replaced the T-002 event-only loading shell with deterministic `ready`, `loading`, `active`, and `error` states while retaining the Enter-key flow and keeping the component limited to form/UI orchestration and response-to-view mapping.
- Mapped product name, code, unit price, quantity, and total directly from the backend response. The frontend does not calculate or fabricate authoritative pricing.
- Prevented duplicate create requests by disabling the input and rejecting additional submissions while loading. Reset is also disabled in-flight so a late HTTP response cannot replace a locally reset screen.
- On failure, no active sale is created, backend error messages are displayed when they match the contract, the input is re-enabled, and the same product code can be retried.
- Kept Cash and QR controls disabled because payment behavior belongs to T-004/T-005.
- T-003 remains `TODO`; no Senior Review / Final Gate or checklist completion was performed.

## Files changed

- Created `src/app/core/models/sale.models.ts`.
- Created `src/app/core/services/sale-api.service.ts`.
- Created `src/app/core/services/sale-api.service.spec.ts`.
- Modified `src/app/features/pos/pos.component.ts`.
- Modified `src/app/features/pos/pos.component.html`.
- Modified `src/app/features/pos/pos.component.spec.ts`.
- Created `docs/prompts/T-003-implementation.md`.

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm run build` | PASS; production build completed without warnings after the new component styles were kept within the existing budget. |
| `npm test` | PASS with normal host browser access; 13/13 tests succeeded in Chrome Headless 152. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |

No lint script is defined in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered after the first restricted Karma run failed before executing tests.

- **Reproduce:** Two unchanged restricted `npm test` runs consistently completed browser bundle generation, then failed to launch Chrome Headless after its GPU process exited repeatedly.
- **Fail path:** No browser connected and zero tests ran. Chrome reported persistent-cache file access failures under its Karma temporary profile followed by `GPU process isn't usable`, isolating the failure to `karma-chrome-launcher → Chrome startup` rather than application compilation or test execution.
- **Hypotheses considered:** restricted host GPU/cache access; broken Chrome/Karma repository configuration; or a test-bundle runtime failure.
- **Falsification:** The identical `npm test` command was run with normal host browser access. Chrome connected immediately and all 13 tests passed, disproving the repository configuration and test-runtime hypotheses.
- **Cross-check:** The final unchanged suite again passed 13/13 with normal host access after the CSS-only build-budget cleanup. No Chrome flags, Karma changes, or environment-specific repository workaround were introduced.

## Implementation phase status

**IMPLEMENTATION COMPLETE — AWAITING SEPARATE SENIOR REVIEW + FINAL GATE**
