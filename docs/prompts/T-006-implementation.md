# T-006 (FE) — Implementation Prompt Audit

## Verbatim implementation prompt

You are implementing **T-006 (FE)** in the current Angular v14 frontend repository on branch `feature/implement`.

Before making any code changes:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md`.
2. Locate and read the complete definition, scope, acceptance criteria, dependencies, and constraints for **T-006 (FE)**.
3. Inspect the existing implementation produced by T-001 through T-005 and follow the established architecture, naming conventions, UI patterns, API integration patterns, and coding style.
4. Treat the checklist as the source of truth. Do not expand the scope beyond T-006.
5. Preserve this prompt verbatim in the project's prompt-audit location according to the rules defined in `docs/IMPLEMENTATION_CHECKLIST.md`.

## Implementation

Implement **T-006 (FE)** completely according to `docs/IMPLEMENTATION_CHECKLIST.md`.

For sale/error/expiry handling, ensure the implementation correctly covers all T-006 requirements defined by the checklist, including applicable cases such as:

- sale cancellation flow
- cancelled / expired sale states
- integration with the backend cancel-sale API contract
- expected handling of relevant HTTP/API errors such as `400`, `404`, `409`, and `500`
- user-friendly Thai error/status messages where required
- loading state while requests are in progress
- prevention of duplicate submissions/actions
- safe handling of API failures
- correct UI state after success or failure
- navigation behavior after cancellation or expiry, if required by the checklist

Do not invent API contracts. Inspect the existing frontend API models/services and the backend contract documented or already integrated in the repository.

## Angular v14 Engineering Standard

Implement this as production-quality Angular v14 code expected from a Senior Developer.

Maintain proper separation of responsibilities where applicable:

- Component → presentation and UI orchestration
- Service → API/business interaction
- Models/interfaces → typed request/response/domain data
- Guards/interceptors/pipes/helpers → only when their responsibility genuinely belongs there

Requirements:

- Strong TypeScript typing; avoid `any` unless technically unavoidable and justified.
- Keep components focused and reasonably small.
- Do not duplicate logic already available in services/helpers.
- Do not hardcode backend URLs inside components.
- Keep API calls in the appropriate service layer.
- Handle Observable subscriptions safely and avoid memory leaks.
- Avoid unnecessary nested subscriptions.
- Keep error handling predictable and centralized where appropriate.
- Follow the repository's existing Angular v14 patterns instead of introducing a new architecture solely for this task.
- Do not perform unrelated refactoring.

## Compatibility

T-006 must remain compatible with the completed work from:

- T-001
- T-002
- T-003
- T-004
- T-005

Do not break the existing create-sale, cash-payment, or QR-payment workflows.

## Verification

After implementation:

1. Review the complete diff for T-006.
2. Run the relevant frontend tests.
3. Run the project's lint command if available.
4. Run a production/build-equivalent Angular build.
5. Fix failures caused by T-006.
6. Check for TypeScript compilation errors.
7. Check for obvious regressions in existing T-001–T-005 flows.
8. Confirm that error/loading/cancel/expiry paths do not leave the UI in an inconsistent state.

If an implementation or test problem occurs and the repository contains the `debug-mantra` skill, use it to systematically diagnose the problem rather than applying speculative fixes.

## Scope Control

Do NOT:

- modify backend code
- change backend contracts
- introduce unrelated dependencies
- redesign unrelated UI
- refactor unrelated existing code
- modify completed tasks unless strictly necessary for T-006 compatibility

If a dependency or existing defect prevents T-006 from being completed safely, stop and clearly report the blocker instead of silently expanding the task scope.

## Final Report

When finished, report:

1. What was implemented.
2. Files created/modified.
3. API endpoint(s) integrated.
4. Error/status cases handled.
5. Tests/checks executed and their results.
6. Any assumptions or limitations.
7. Whether T-006 implementation is ready for Senior Review / Final Gate.

Do **not** mark T-006 as closed yet. Closure happens only after the separate Senior Review + Final Gate prompt passes.

---

## Implementation summary

- Verified the cancellation and expiry contract directly against the backend `feature/implement` implementation and `docs/API.md`.
- Added a typed, bodyless cancel-sale operation with a client-generated `Idempotency-Key` and exact `{ sale_id, status: 'CANCELLED' }` response typing.
- Changed active-sale reset into an explicit backend cancellation flow. A successful cancellation remains visible as a terminal state until the operator starts a new transaction.
- Added expiry tracking from the backend `expires_at` value. Expiry invokes the backend cancel endpoint; the frontend does not fabricate a successful cancellation.
- Added explicit cancellation states for idle, submitting, cancelled, and error outcomes, with duplicate-action prevention and safe retry of outcome-ambiguous requests using the same idempotency key.
- Prevented local reset while create/payment outcomes are ambiguous, preserving the original operation fingerprint until it is resolved.
- Synchronized authoritative `SALE_ALREADY_PAID`, `SALE_CANCELLED`, and `SALE_NOT_FOUND` responses into safe terminal/unavailable UI states.
- Added centralized, typed Thai user-facing mappings for create-sale, payment, and cancellation failures. Unknown or malformed errors use safe generic messages and do not expose technical details.
- Preserved the existing cash and QR workflows and added handling for terminal statuses returned by create-sale idempotent replay.

## Files created

- `docs/prompts/T-006-implementation.md`
- `src/app/features/pos/pos-error-messages.ts`

## Files modified

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `src/app/core/models/sale.models.ts`
- `src/app/core/services/sale-api.service.ts`
- `src/app/core/services/sale-api.service.spec.ts`
- `src/app/features/pos/pos.component.ts`
- `src/app/features/pos/pos.component.html`
- `src/app/features/pos/pos.component.spec.ts`

## Backend contract used

- Endpoint: `POST /api/v1/sales/:sale_id/cancel` using the active backend sale identifier.
- Header: client-generated `Idempotency-Key`; the same key is reused only for an outcome-ambiguous retry of the same logical cancellation.
- Request: no body and no `Content-Type: application/json` header.
- Success/replay/already-cancelled/expired response: `200 OK` with `{ "sale_id": "...", "status": "CANCELLED" }`.
- Error envelope: typed `400`, `404`, `409`, and sanitized `500` responses using `{ "error": { "code": "...", "message": "..." } }`.

## Tests and validation

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm test -- --browsers=ChromeHeadless` (restricted execution) | Environment failure before Karma connected; Chrome GPU/persistent-cache initialization failed and no tests ran. |
| `npm test -- --browsers=ChromeHeadless` (normal host access, diagnostic run) | Ran 41 tests and identified four deterministic stale-expectation/`OnPush` test-flow issues. |
| `npm test -- --browsers=ChromeHeadless` (normal host access, final run) | PASS; 43/43 tests succeeded in Chrome Headless 152. |
| `npm run build` | PASS; production build completed without warnings. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |
| `rg -n "\\bany\\b" src/app` | PASS; no matches. |

No lint script is defined in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered when the first unit-test run failed before browser connection.

- **Reproduce:** Two unchanged restricted runs consistently completed Angular bundling and then failed while Chrome initialized its GPU/persistent cache; Karma executed zero tests.
- **Fail path:** Running the unchanged command with normal host access allowed Chrome to connect and execute the suite, proving the first failure was outside application/Karma test code. That run exposed four deterministic test failures: an old English-message assertion, an obsolete retry expectation after `SALE_ALREADY_PAID`, an old local-reset flow, and an `OnPush` refresh gap on programmatic clear.
- **Hypotheses/falsification:** The successful normal-host browser connection disproved a repository launcher/configuration defect. The backend lifecycle contract disproved retrying a backend-confirmed paid sale. Component state assertions and the event-driven production path isolated the remaining stale tests and the missing programmatic `markForCheck()` call.
- **Fix proof:** Tests were aligned with the authoritative terminal-state and backend-cancel behavior, and the clear path now marks the `OnPush` view for checking. The focused rerun passed 41/41; after extracting the typed error mapper and adding final negative cases, the final suite passed 43/43.
- **Breadcrumb cross-check:** Reproducible restricted startup logs, successful host launch, deterministic assertion failures, focused corrections, two clean strict compilers, the final 43/43 suite, and the warning-free production build all agree. No browser, Karma, backend, or environment workaround was committed.

## Implementation phase status

**IMPLEMENTATION COMPLETE — AWAITING SEPARATE SENIOR REVIEW + FINAL GATE**

T-006 remains `TODO` and is not closed.
