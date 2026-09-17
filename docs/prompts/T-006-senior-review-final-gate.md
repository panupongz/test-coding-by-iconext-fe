# T-006 (FE) — Senior Review + Final Gate Audit

## Verbatim Senior Review + Fix + Re-test + Final Gate prompt

Perform the **Senior Review + Fix + Re-test + Final Gate** for **T-006 (FE)** on the current `feature/implement` branch.

Do not assume the implementation is correct merely because the existing tests pass.

## 1. Establish Scope

Before reviewing:

- Read `docs/IMPLEMENTATION_CHECKLIST.md`.
- Read the preserved T-006 implementation prompt/audit evidence.
- Identify the exact scope, acceptance criteria, dependencies, and constraints of T-006.
- Inspect the complete T-006 diff.
- Review the existing T-001 through T-005 implementation where necessary to detect regressions or architectural inconsistencies.

Do not expand the scope beyond T-006 except where a change is strictly necessary to fix a T-006 regression.

## 2. Senior Engineering Review

Review the implementation as a Senior Angular v14 Developer.

Pay particular attention to:

- Angular v14 best practices
- separation of component/service/model responsibilities
- strong TypeScript typing
- Observable/subscription lifecycle safety
- duplicated or unnecessary logic
- API error handling
- state consistency
- race conditions
- double-submit protection
- loading-state correctness
- retry behavior
- idempotency-key handling
- cancellation behavior
- automatic expiry handling
- terminal sale states
- navigation/state transitions
- compatibility with cash and QR payment workflows
- user-facing Thai error/status messages

Explicitly review the integration of:

`POST /api/v1/sales/:sale_id/cancel`

Verify that the implementation matches the actual backend/frontend contract and does not invent request or response behavior.

Review handling of applicable HTTP/domain cases including:

- 400
- 404
- 409
- 500
- network failure
- SALE\_ALREADY\_PAID
- SALE\_CANCELLED
- SALE\_NOT\_FOUND
- expired sale
- already cancelled sale
- already paid sale

## 3. Edge Cases

Actively look for edge cases that existing tests may have missed.

At minimum examine:

- user clicks cancel multiple times
- create/payment/cancel actions overlap
- cancellation request fails
- cancellation response arrives after another state transition
- sale expires while the user is on the payment screen
- sale expires while another request is running
- backend reports a terminal state different from the current frontend state
- retry after an outcome-ambiguous network failure
- idempotency key is accidentally regenerated during a retry
- stale timers/subscriptions continue after sale reset
- previous sale state leaks into a new transaction

Do not add speculative complexity if the existing implementation already handles an edge case correctly.

## 4. Fix Findings

If you find defects:

- fix them directly
- keep changes minimal and scoped
- add/update tests for each meaningful defect
- preserve existing architecture unless a change is required for correctness

If an implementation/test problem occurs and the repository contains the `debug-mantra` skill, use it for systematic diagnosis rather than speculative fixes.

## 5. Re-test

After the review/fixes, run the relevant verification suite.

At minimum:

- T-006 related unit tests
- existing affected regression tests
- application TypeScript compilation
- test TypeScript compilation
- production Angular build
- `git diff --check`
- lint if the project provides a lint command

Also verify that completed T-001 through T-005 workflows remain compatible, especially:

- create sale
- cash payment
- QR payment

Do not treat an unavailable lint command as a test failure; report it accurately.

## 6. Final Gate

T-006 may pass the Final Gate only if:

- all T-006 acceptance criteria are satisfied
- no unresolved correctness defect remains
- relevant tests pass
- production build passes
- no TypeScript compilation error remains
- no material regression to T-001–T-005 is identified
- API contract handling is correct
- cancellation/expiry/error state transitions are safe
- retry/idempotency behavior is safe
- no unjustified `any` was introduced
- no unrelated scope changes were introduced

Update the T-006 audit/review evidence according to the repository's prompt-audit rules.

Do **not** mark T-006 closed automatically unless the checklist explicitly requires the Final Gate process itself to update its status.

## Final Report

Report:

1. Review findings.
2. Defects found and fixes made.
3. Edge cases verified.
4. Files changed during review.
5. Tests/checks executed and exact results.
6. Any remaining risks or limitations.
7. Final Gate result: **PASS** or **FAIL**.
8. Whether T-006 is safe to close.

If Final Gate is FAIL, clearly identify the remaining blocker(s).

---

## Senior-review findings

- Independently verified the backend `feature/implement` cancel controller and authoritative `docs/API.md` contract. The frontend calls exactly `POST /api/v1/sales/:sale_id/cancel`, uses the active backend sale identifier, sends a client-generated `Idempotency-Key`, and sends neither a request body nor a JSON `Content-Type` header.
- Confirmed the typed cancellation response is exactly `{ sale_id, status: 'CANCELLED' }` and that pending, expired, already-cancelled, and successful replay outcomes are treated as `200` cancellation success without fabricating local backend success.
- Confirmed `400`, `404`, `409`, sanitized `500`, network failure, `SALE_NOT_FOUND`, `SALE_ALREADY_PAID`, and `SALE_CANCELLED` paths map to safe Thai messages and deterministic terminal/recoverable UI states.
- Confirmed outcome-ambiguous create, payment, and cancellation attempts retain the same idempotency key and freeze state changes that would alter the request fingerprint. Definite failures start a new operation/key when retried.
- Confirmed create, payment, and cancellation cannot overlap through the UI guards. In-flight cancellation disables reset/payment; in-flight or outcome-ambiguous payment disables cancellation/reset; create loading and outcome ambiguity prevent a new transaction.
- Confirmed the expiry subscription is cancelled by `switchMap` on terminal/reset transitions and by `takeUntil` on component destruction. Expiry during payment does not start a competing cancellation; the payment endpoint remains the backend source of truth for the resulting `PAID` or `CANCELLED` state.
- Confirmed backend terminal states override local assumptions: create replay supports `PAID`/`CANCELLED`, payment errors synchronize paid/cancelled/not-found states, and cancel `SALE_ALREADY_PAID` preserves the paid state rather than faking cancellation.
- Confirmed HTTP remains in `SaleApiService`, API/domain/view-state models are explicitly typed, presentation error mapping is isolated in a pure helper, subscriptions have lifecycle termination, and no `any`, debug logging, new dependency, backend change, or unrelated refactor was introduced.
- Found two UI-state defects not covered by the implementation suite:
  1. A definite method-specific payment error, such as `QR_AMOUNT_MISMATCH`, remained visible after the user switched to Cash.
  2. After authoritative `SALE_NOT_FOUND`, the transaction action was labeled as a cancellation retry even though the safe click behavior correctly cleared the unavailable transaction.
- After the focused fixes below, no unresolved functional, contract, architecture, typing, lifecycle, idempotency, race, regression, or test-coverage finding remains within T-006 scope.

## Fixes made during review

- Clear the completed/definite payment error state only when an allowed payment-method change actually occurs. Ambiguous attempts remain locked to the original method and request fingerprint.
- Prioritize the authoritative unavailable-sale state when deriving the transaction action label, so the UI now says `เริ่มรายการใหม่` and matches the safe local-reset behavior.
- Added regression coverage for both defects.
- Added edge-case coverage for create-sale replay returning `PAID`, expiry while QR payment is in flight, and stale/duplicate expiry behavior while user cancellation is in flight and after reset.

## Edge cases verified

- Repeated cancel clicks issue only one in-flight request.
- Create, payment, and cancel loading states block conflicting actions.
- Cancellation `400`, `404`, `409`, `500`, and network/ambiguous failure paths remain recoverable without local false success.
- Outcome-ambiguous cancellation retries the identical request with the retained key; a definite failure retries with a new operation/key.
- Cancellation cannot complete against a replaced transaction because reset/new-sale controls remain locked until it resolves; destruction unsubscribes the callback.
- Expiry on the payment screen calls the backend cancel flow when idle.
- Expiry during an in-flight payment does not race a cancel request; the backend payment response resolves the terminal state.
- Expiry during an in-flight user cancellation does not issue a duplicate cancel request.
- Reset cancels stale expiry timers, and the previous sale state does not leak into the next transaction.
- Backend-reported `PAID`, `CANCELLED`, and unavailable states disable further payment and expose an appropriate recovery action.
- Cash accumulation, confirmation eligibility, change, QR exact-total submission, and shared payment endpoint behavior remain covered by the full passing suite.

## Files changed during review/fix

- Created `docs/prompts/T-006-senior-review-final-gate.md`.
- Modified `docs/IMPLEMENTATION_CHECKLIST.md` to record the passed Senior Review / Final Gate criterion while retaining T-006 status as `TODO`.
- Modified `src/app/features/pos/pos.component.ts` for the two focused UI-state corrections.
- Modified `src/app/features/pos/pos.component.spec.ts` for defect reproductions and edge-case regressions.

## Validation and results

| Command | Result |
|---|---|
| `npm test -- --browsers=ChromeHeadless --include='src/app/features/pos/pos.component.spec.ts'` before fixes | Expected diagnostic failure: 2 failed, 30 passed; reproduced stale QR error and misleading unavailable-sale action label. |
| Same focused command after fixes and edge-case additions | PASS; 35/35 POS component tests. |
| `npm test -- --browsers=ChromeHeadless` | PASS; 47/47 tests in Chrome Headless 152, including T-001–T-005 regressions and T-006 negative/race paths. |
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm run build` | PASS; production Angular build completed without warnings. |
| `git diff --check` | PASS; no whitespace errors; Git emitted informational LF-to-CRLF working-copy notices only. |
| `rg -n "\\bany\\b|console\\.log" src/app` | PASS; no matches. |

No lint script is defined in `package.json`, so no lint command was available.

## Debugging evidence

`debug-mantra` was invoked for the two review findings.

- **Reproduce:** Two focused component assertions deterministically proved that a QR-specific error survived switching to Cash and that a `SALE_NOT_FOUND` state displayed a cancellation-retry label.
- **Fail path:** Method selectors only changed `selectedPaymentMethod`, leaving the shared error state untouched. The action-label getter evaluated local `PENDING` before the authoritative unavailable flag, while reset correctly evaluated unavailability first.
- **Hypotheses/falsification:** A selector-lock explanation was disproved because definite payment errors permit switching; ambiguous errors remain locked and therefore cannot be cleared by the fix. A reset-behavior explanation was disproved because the unavailable path already cleared safely—the defect was label derivation only. Terminal paid/cancelled states also cannot switch methods, ruling out loss of terminal evidence.
- **Fix proof:** The focused suite passed 35/35 after resetting payment state only on an allowed method change and prioritizing unavailability in the label. The full suite then passed 47/47, both strict compilers passed, and the production build remained warning-free.
- **Breadcrumb cross-check:** The failing assertions, source predicates, minimal changes, focused passing run, added timer/overlap regressions, complete suite, compilers, build, and contract inspection all agree. No guard, request body, endpoint, retry fingerprint, or backend behavior was weakened.

## Remaining risks / limitations

- Automatic UI expiry scheduling necessarily uses the backend-provided ISO `expires_at` against the browser clock because the contract exposes no server-current-time field. Every terminal transition still goes through the backend, so the frontend never fabricates cancellation success.
- End-to-end verification against a running backend is reserved for T-008; T-006 verifies the exact service contract and component integration with Angular HTTP and component tests.

## Final Gate

All T-006 acceptance criteria are satisfied. The reviewed backend contract matches, the two scoped findings are fixed and covered, all configured validation passes, T-001–T-005 workflows remain compatible, and no blocker remains.

**FINAL GATE: PASS**

T-006 is safe to close. Its checklist status remains `TODO` pending an explicit closure update.
