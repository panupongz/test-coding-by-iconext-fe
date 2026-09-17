# T-004 — Cash Payment — Senior Review + Final Gate Audit

## Verbatim Senior Review + Fix + Re-test + Final Gate prompt

Perform the **Senior Review + Fix + Re-test + Final Gate** for **T-004 (FE) — Cash Payment**.

T-004 implementation has already been completed. Do not reimplement the feature from scratch.

Before reviewing:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md` completely.
2. Read the stored T-004 implementation prompt:\
   `docs/prompts/T-004-implementation.md`
3. Inspect the complete current diff for T-004.
4. Inspect the existing architecture and relevant implementation from T-001, T-002, and T-003.
5. Follow all repository-level `AGENTS.md`, project instructions, and applicable skills.

## Senior Review

Review T-004 as a Senior Angular v14 Developer.

Focus on:

- correctness against the T-004 acceptance criteria;
- correctness against the actual Backend cash-payment contract;
- Angular v14 architecture and separation of concerns;
- component/service/model responsibilities;
- strict TypeScript typing;
- unnecessary use of `any`;
- duplicated code;
- Observable/subscription lifecycle and memory-leak risks;
- state management;
- loading state;
- duplicate-submit protection;
- input validation;
- cash received/change calculation;
- payment idempotency handling;
- Backend business-error handling;
- network/error handling;
- expired/cancelled sale handling;
- successful-payment state;
- preservation of `sale_id` and `payment_id`;
- regression risk to T-001–T-003;
- unnecessary complexity or over-engineering;
- test quality and meaningful coverage.

Specifically verify the implementation of:

`POST /api/v1/sales/:sale_id/payment`

with:

`Idempotency-Key: <client key>`

and request body:

{\
"payment\_method": "CASH",\
"amount\_received":\
}

Verify handling of the actual supported Backend responses, including creation, idempotent replay, and sale-expiry/cancellation behavior.

Do not invent or modify the Backend contract.

## Fix

If review identifies defects or maintainability issues that are within T-004 scope:

- fix them;
- keep changes minimal and focused;
- update/add tests where necessary;
- do not perform unrelated refactoring.

If no issue is found, explicitly state that no corrective code change was required.

## Re-test

After review/fixes, run all applicable validation commands configured by the repository.

At minimum verify:

- TypeScript application compilation;
- TypeScript test compilation;
- unit tests;
- production build;
- repository diff checks;
- no unintended `any` usage in the T-004 implementation.

Do not claim PASS for commands that were not actually executed successfully.

If a test failure is environmental rather than caused by the implementation, provide evidence and distinguish it clearly from a code failure.

## Final Gate

T-004 may pass the Final Gate only if:

- acceptance criteria are satisfied;
- Backend contract matches;
- no unresolved functional defect remains;
- no significant Angular architecture issue remains;
- tests pass;
- production build passes;
- no regression attributable to T-004 is found;
- no unresolved blocker remains.

At the end, output exactly one Final Gate result:

`FINAL GATE: PASS`

or

`FINAL GATE: FAIL`

If FAIL, list the blocking issues and do not mark T-004 complete.

If PASS, state that **T-004 is ready to be closed**, but do not modify its checklist status unless explicitly instructed to do so.

## Prompt Audit

Store this Prompt #2 **verbatim** according to the Prompt Audit convention defined in `docs/IMPLEMENTATION_CHECKLIST.md`.

Do not rewrite, summarize, or normalize the stored prompt.

## Final Report

Report:

1. Senior-review findings.
2. Fixes made, if any.
3. Files changed during review/fix.
4. Backend contract verification.
5. Tests/commands actually executed.
6. Results.
7. Remaining risks or blockers.
8. `git diff --check`.
9. `git status --short`.
10. Final Gate result.

## Senior-review findings

- Independently verified the backend `feature/implement` branch from the `/api/v1` router mount, payment route/controller, payment service, payment domain response mapper, idempotency-key validator, shared error catalog/middleware, API documentation, and payment integration tests.
- Confirmed the frontend calls exactly `POST /api/v1/sales/:sale_id/payment` through `SaleApiService`, with the environment-derived `/api/v1` base URL, the active backend `sale_id`, a non-blank UUID `Idempotency-Key`, and the strict body `{ "payment_method": "CASH", "amount_received": <positive integer> }`.
- Confirmed first payment success is `201 Created`, same-key/same-request replay is `200 OK` with the original cash payment, and an expired pending sale is atomically cancelled and returned as `200 { sale_id, status: "CANCELLED" }` without a payment.
- Confirmed the typed cash response exactly retains `payment_id`, `payment_method`, `amount_received`, `paid_at`, and `change`; the expired response is a separate typed union member.
- Confirmed recognized backend `400`, `404`, `409`, and sanitized `500` envelopes are mapped to safe UI errors, while unknown/network failures use a non-technical local fallback.
- Confirmed repeatable denominations, deterministic accumulation, below-total confirmation guard, positive-change display, submitting state, duplicate-submit prevention, `PAID`/`CANCELLED` transitions, and preservation of both `sale_id` and `payment_id`.
- Confirmed the component remains UI/orchestration-focused, HTTP remains in the service, models are explicit, subscriptions are terminated with `takeUntil`, no `any` was introduced, and QR/cancel/Thank You automation remain outside T-004.
- Confirmed all T-001–T-003 tests remain in the passing suite and no unrelated source files or dependencies changed.
- Found one idempotency defect: after an outcome-ambiguous failure, the implementation retained the original key but still allowed denomination changes. Changing `amount_received` changed the backend request fingerprint and caused the retry to use a new key instead of resolving the original operation safely.
- Found a test-quality gap: the denomination test called component methods directly rather than proving the three rendered buttons were wired and repeatable, and the service replay test did not flush/assert the actual backend `200 OK` replay shape.
- After the focused fixes below, no unresolved functional, contract, architecture, typing, lifecycle, regression, or test-coverage finding remains.

## Fixes made during review

- Split cash eligibility into a shared payable-cash predicate plus separate denomination and confirmation rules.
- Disabled denomination changes while an outcome-ambiguous payment attempt is retained, freezing the original request fingerprint.
- Kept confirmation enabled for the unchanged amount so the exact request can replay with the retained idempotency key.
- Extended the network-failure regression test to prove denominations are frozen, the amount remains unchanged, and retry uses the original key.
- Updated the accumulation test to click the rendered `+100`, `+500`, and `+1,000` buttons, including a repeated `+100` click.
- Updated the API service retry test to flush a real `200 OK` cash replay and assert the unchanged typed response.

## Files changed during review/fix

- Created `docs/prompts/T-004-senior-review-final-gate.md`.
- Modified `src/app/features/pos/pos.component.ts`.
- Modified `src/app/features/pos/pos.component.spec.ts`.
- Modified `src/app/core/services/sale-api.service.spec.ts`.
- `docs/IMPLEMENTATION_CHECKLIST.md` was intentionally not modified because this prompt explicitly says not to modify T-004 checklist status without an explicit instruction.

## Validation and results

| Command | Result |
|---|---|
| `npm test` with the new pre-fix regression assertion | Expected diagnostic failure: 1 failed, 24 passed; proved the amount could change from 100 to 200 and the original key was not reused. |
| `npm test` immediately after the scoped fix | PASS; 25/25 tests in Chrome Headless 152. |
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `rg -n "\\bany\\b" src/app` | No matches; `rg` returned its normal no-match status. |
| `npm run build` | PASS; production build completed without warnings. An earlier tool call exceeded its output-yield window and was not counted; the clean rerun exited `0`. |
| Final `npm test` after the rendered-button test update | PASS; 25/25 tests in Chrome Headless 152. |
| `git diff --check` | PASS; no whitespace errors. Git emitted only informational LF-to-CRLF working-copy notices. |

No lint script is configured in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was invoked for the idempotency defect.

- **Reproduce:** A deterministic component test simulated a status-0 payment failure, asserted that additional cash must be blocked, attempted another `+100`, and then retried.
- **Fail path:** The test showed `canAddCash === true`, `amount_received` changed from 100 to 200, and the second service call omitted the retained key because its amount no longer matched the stored retry fingerprint.
- **Hypotheses/falsification:** Lost retry state and asynchronous timing were ruled out because the pre-existing unchanged-amount path reused the retained key. The remaining cause was the denomination predicate ignoring the retained ambiguous attempt.
- **Fix proof:** The shared payable-cash predicate keeps exact confirmation available, while the denomination predicate additionally requires no retained ambiguous attempt. The focused rerun and final suite both passed 25/25.
- **Breadcrumb cross-check:** Backend fingerprint semantics, the failing spy arguments, the one scoped predicate split, unchanged amount, retained key reuse, clean strict compilers, final tests, and final build all agree. No backend, Karma, browser, or environment workaround was introduced.

## Final-gate assessment

All T-004 acceptance criteria are satisfied and independently verified. The backend contract matches, the scoped review defect is fixed and covered, all configured validation passes, T-001–T-003 remain green, and no blocker remains. T-004 is ready to be closed. Its checklist remains `TODO` solely because this prompt explicitly prohibited changing the checklist status without a separate instruction.

Final gate result: PASS.
