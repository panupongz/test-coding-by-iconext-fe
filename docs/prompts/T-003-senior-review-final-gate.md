# T-003 — Create Sale — Senior Review + Final Gate Audit

## Verbatim Senior Review + Final Gate prompt

Perform the Senior Review + Final Gate for T-003 — Create Sale in repository `panupongz/test-coding-by-iconext-fe`, branch `feature/implement`.

This is a review/final-gate task.

Do not assume the T-003 implementation is correct merely because the implementation phase reported passing tests.

Before reviewing:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md`.

Treat the following as mandatory:
- T-003 Goal / Scope / Acceptance Criteria
- FE ↔ BE API Integration Contract
- API Integration Rules
- Engineering Standard — Angular v14 / Senior Developer Level
- Angular v14 Architecture & File Responsibility
- Conditional Debugging — debug-mantra
- Standard Task Workflow
- Prompt Audit Rule

2. Read the preserved T-003 implementation prompt and implementation evidence under `docs/prompts/`.

3. Inspect the complete T-003 git diff, including both tracked and untracked files.

Do not rely only on `git diff --stat`, because newly created/untracked files may not appear there.

4. Independently verify the actual Backend Source of Truth from:

repository:
`panupongz/test-coding-by-iconext-be`

branch:
`feature/implement`

endpoint:
POST /api/v1/sales

Verify at minimum:
- endpoint path;
- request body;
- required headers;
- Idempotency-Key rules;
- product-code validation;
- success status codes;
- response shape;
- error envelope;
- sale-state semantics relevant to T-003.

Do not trust the implementation-phase contract summary without independently checking BE.

Review the T-003 implementation for correctness.

Specifically inspect:

A. API integration

Verify that:
- FE calls exactly POST /api/v1/sales.
- API base URL is environment/configuration driven.
- HttpClient usage belongs in the appropriate service layer.
- endpoint construction is maintainable and not scattered unnecessarily.
- request body exactly matches BE.
- Idempotency-Key is correctly generated and supplied.
- idempotency behavior does not accidentally reuse keys across distinct intended sale attempts.
- retries/repeated UI actions cannot unintentionally create duplicate sales.

B. Type safety

Verify:
- request type matches BE exactly;
- response type matches BE exactly;
- error type matches the actual BE error envelope;
- sale state/view models are explicit;
- no unjustified `any`;
- nullable/optional fields match actual contract semantics.

C. Active-sale state

Verify that:
- `sale_id` returned by BE is preserved.
- product information comes from BE.
- unit price comes from BE.
- total comes from BE.
- FE does not become an authoritative pricing source.
- quantity remains fixed according to:
  1 Sale = 1 Product = quantity 1
- no hidden multi-product/cart behavior was introduced.
- active-sale state has one clear source of truth.
- reset behavior does not leave stale sale information.

D. Request lifecycle

Verify deterministic transitions such as:

ready → loading → active

and on failure:

ready → loading → recoverable error state

Verify:
- duplicate Enter/create actions are blocked while loading;
- reset cannot corrupt an in-flight request;
- loading state is always cleared correctly;
- failed requests do not create fake/local sale data;
- retry is possible;
- stale async responses cannot overwrite a newer transaction/state if such a race is possible.

E. Angular v14 Senior Developer standards

Review:
- component responsibility;
- service responsibility;
- model/type placement;
- RxJS usage;
- subscription lifecycle;
- template complexity;
- separation of concerns;
- maintainability;
- testability;
- unnecessary abstractions;
- unnecessary files;
- unrelated refactors.

Do not introduce a Controller layer.

F. Regression review

Verify T-003 did not regress T-001/T-002 behavior, especially:
- product-code input;
- Enter submission;
- loading/disabled state;
- reset;
- POS sections;
- payment placeholders intended for later tasks.

Do not prematurely implement T-004 through T-008.

G. Tests

Review whether tests actually prove the behavior rather than merely increasing coverage.

At minimum verify coverage for:
1. exact POST endpoint;
2. exact request payload;
3. Idempotency-Key presence;
4. idempotency key generation/reuse semantics;
5. successful response mapping;
6. sale_id preservation;
7. BE-sourced product/name/unit_price/total;
8. duplicate submission prevention;
9. failed request recovery;
10. reset behavior;
11. existing POS behavior.

Add or correct tests only if required to close a real T-003 gap.

Run:
- relevant TypeScript compilation;
- relevant automated tests;
- Angular production build;
- `git diff --check`.

If a test/build/runtime/integration failure requires diagnosis, invoke:

`.agents/skills/debug-mantra/SKILL.md`

Follow it before applying speculative fixes.

Review the earlier debug-mantra evidence from the implementation phase.

Confirm that the Restricted ChromeHeadless failure was environmental rather than silently hiding a product-code defect, and that the successful test execution is sufficient evidence for this task.

If you discover any implementation defect:

1. clearly identify the root cause;
2. fix only the T-003-scoped defect;
3. add/update tests proving the fix;
4. re-run the relevant validation;
5. document the finding and fix.

Prompt Audit:

Preserve this Senior Review + Final Gate prompt verbatim under `docs/prompts/` using the established repository convention.

Ensure the T-003 prompt audit contains:
- implementation prompt;
- this Senior Review / Final Gate prompt;
- implementation summary;
- changed files;
- commands/tests and results;
- debug-mantra evidence;
- review findings;
- fixes, if any;
- final gate result.

Final Gate:

Only if ALL T-003 acceptance criteria are genuinely satisfied and validation passes:

- update `docs/IMPLEMENTATION_CHECKLIST.md`;
- change T-003 Status from TODO to DONE;
- mark every satisfied T-003 acceptance criterion `[x]`;
- ensure prompt-audit/checklist requirements are complete.

If any acceptance criterion remains unproven or failing:

- keep T-003 as TODO;
- clearly report the blocker;
- do not mark incomplete criteria as complete.

At completion report:

1. Senior Review findings
2. BE contract verification result
3. defects found and fixes made, if any
4. architecture/type-safety assessment
5. test/validation commands and results
6. debug-mantra status/evidence
7. T-001/T-002 regression assessment
8. final T-003 acceptance-criteria result
9. final gate PASS or FAIL
10. T-003 final status (DONE or TODO)
11. files changed during Final Gate
12. `git diff --stat`
13. `git status --short`

Do not begin T-004.
Stop after T-003 Final Gate.

## Review findings

- Independently verified the backend `feature/implement` branch from `src/app.ts`, `src/http/routes/api-routes.ts`, `src/http/controllers/create-sale-controller.ts`, `src/http/validation/idempotency-key.ts`, `src/domain/sale.ts`, `src/application/services/create-sale-service.ts`, the shared error middleware, and the create-sale HTTP tests.
- Confirmed `POST /api/v1/sales`, strict body `{ "product_code": "P001" }`, required non-blank `Idempotency-Key` up to 255 characters, `^P\d{3}$` product-code validation, `201` first success, `200` successful replay, the exact nine-field sale response, and the common `{ error: { code, message } }` envelope.
- Confirmed the backend creates one quantity-one `PENDING` Sale with a five-minute expiry, snapshots the product price, returns `PRODUCT_NOT_FOUND` for unavailable products, and uses idempotency fingerprints to replay a successful request or reject conflicting/terminal-failed keys.
- Verified the FE endpoint is constructed once in `SaleApiService` from the environment-backed `API_BASE_URL`; no presentation component uses `HttpClient` or hard-codes a host.
- Verified request/response/error/state/view-model types, absence of `any`, preservation of `sale_id`, and direct mapping of BE product name, unit price, total, quantity, status, and timestamps without FE price calculation.
- Verified the discriminated POS state is the single active-sale source of truth, transitions deterministically through ready/loading/active/error, blocks duplicate submission and reset while loading, clears stale state on reset, and tears down the HTTP subscription on component destruction.
- Verified no cart, quantity-changing behavior, payment implementation, cancellation, expiry workflow, or unrelated refactor was introduced.
- The initial suite did not prove safe idempotency behavior for outcome-ambiguous network/server failures. A user retry would call the service again and receive a new key, potentially creating a second Sale if the first request committed but its response was lost.
- The initial API error code was typed as unrestricted `string` despite the backend's fixed create-sale error enum.
- The status pill reported `Ready for a new sale` in active and error states, which did not accurately represent the state machine.
- After the scoped fixes below, no unresolved Senior Review findings remain.

## Fixes made during Final Gate

- Changed `SaleApiService.createSale` to return a typed operation containing its idempotency key and response Observable, while accepting an existing key for replay.
- Added component orchestration that retains the key only for outcome-ambiguous failures (`status 0`, `408`, or `5xx`) and reuses it when retrying the same product code. Definite backend failures and distinct intended attempts receive new keys; reset abandons any retained retry context.
- Added tests proving distinct operations generate distinct UUID keys, an explicitly retried operation reuses its key, ambiguous UI retries reuse the original key, and retries after definite backend failures start a new operation.
- Added the exact create-sale API error-code union and runtime code guard so only the backend's documented create-sale error envelope is accepted as a BE error; unknown shapes use the local fallback view error.
- Added deterministic status text for ready, loading, active, and recoverable-error states, with focused regression coverage.

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm test` | PASS with normal host browser access; 17/17 tests succeeded in Chrome Headless 152. |
| `npm run build` | PASS; production build completed without warnings. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |
| `rg -n "\\bany\\b" src/app` | No matches; `rg` returned its normal no-match status. |

The implementation-phase `debug-mantra` evidence was reviewed. Restricted runs consistently failed before browser connection or test execution in Chrome's GPU/persistent-cache startup. The unchanged suite connected and passed under normal host access during implementation, and the expanded Final Gate suite passed 17/17 the same way. This establishes an environmental launcher failure rather than a hidden product-code defect. No new Final Gate debugging session was triggered because compilation, tests, and build passed on their first reviewed run.

## Final Gate result

**PASS — T-003 is DONE.**

All T-003 acceptance criteria are satisfied. The implementation and Senior Review prompts are preserved, review defects were fixed and covered by tests, the prompt audit is complete, and `docs/IMPLEMENTATION_CHECKLIST.md` now marks T-003 and all its acceptance criteria `DONE`/`[x]`. T-004 through T-008 remain unchanged and were not started.
