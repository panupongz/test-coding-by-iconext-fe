Perform the **Senior Review + Fix + Re-test + Final Gate for T-005 (FE)**.

T-005 implementation has already been completed in the current working tree.

Do NOT reimplement the feature from scratch.

## Source of truth

Before reviewing:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md`.
2. Read the stored T-005 implementation prompt/evidence in:\
   `docs/prompts/T-005-implementation.md`
3. Inspect the complete current diff for T-005.
4. Inspect the existing implementation from T-001 through T-004 where relevant.
5. Verify the actual backend payment contract used by the frontend.

---

# Senior Review

Review T-005 as a **Senior Angular v14 Developer**.

Evaluate at minimum:

- correctness against T-005 acceptance criteria;
- Angular v14 compatibility;
- component/service/model separation;
- TypeScript typing;
- RxJS/subscription handling;
- API contract correctness;
- QR payment state management;
- loading/error/success handling;
- duplicate-submit protection;
- idempotency behavior;
- expired/cancelled sale handling;
- regression risk to CASH payment;
- regression risk to Create Sale;
- unnecessary duplication;
- maintainability/readability;
- over-engineering;
- dead/debug code;
- test quality and meaningful coverage.

Pay particular attention to the shared payment implementation because T-005 extends behavior already used by T-004.

Verify that introducing `QR_PAYMENT` has not changed CASH behavior unintentionally.

---

# Backend contract verification

Verify that the implementation actually uses the backend contract correctly.

Expected endpoint:

`POST /api/v1/sales/:sale_id/payment`

Expected QR payment method:

`QR_PAYMENT`

Verify:

- endpoint;
- HTTP method;
- `sale_id`;
- request payload;
- response mapping;
- error mapping;
- `Idempotency-Key`;
- payment success handling;
- expired/cancelled sale handling.

Do not assume the implementation is correct merely because tests pass.

Check the implementation against the actual contract available in the repository.

The frontend must not fabricate QR image/content/reference information when the backend does not provide it.

---

# Fix findings

If you find any issue:

1. Fix it directly.
2. Keep changes scoped to T-005 and necessary shared code.
3. Add/update tests where appropriate.
4. Do not perform unrelated refactoring.

If implementation/testing problems occur during this stage, follow the repository's **debug-mantra** skill/process.

---

# Re-test

After all review findings are resolved, run the relevant verification suite.

At minimum run the configured equivalents of:

`npx tsc -p tsconfig.app.json --noEmit`

`npx tsc -p tsconfig.spec.json --noEmit`

`npm test -- --browsers=ChromeHeadless`

`npm run build`

`git diff --check`

Also verify that production source does not introduce inappropriate `any` usage or debug code.

If the repository has no lint command, report that fact rather than introducing a new lint tool.

---

# Final Gate

T-005 may pass the Final Gate only when:

- T-005 acceptance criteria are satisfied;
- backend contract usage is correct;
- QR payment workflow behaves correctly;
- CASH payment regression remains protected;
- Create Sale regression remains protected;
- relevant tests pass;
- TypeScript checks pass;
- production build passes;
- no unresolved Senior Review findings remain;
- no blocker or critical regression remains.

If any Final Gate requirement fails:

**DO NOT close T-005.**

Clearly report the blocker and leave T-005 open.

If every requirement passes:

1. Update `docs/IMPLEMENTATION_CHECKLIST.md` according to the project's existing completion convention.
2. Mark **T-005 (FE)** completed only if the checklist permits it.
3. Preserve/update T-005 review/test evidence using the existing documentation convention.

Do NOT commit or push.

---

# Required final response

Report:

1. Senior Review findings.
2. Fixes made.
3. Files modified during review.
4. Tests/checks executed.
5. Final test/build results.
6. Regression verification for CASH and Create Sale.
7. Backend contract verification result.
8. Remaining risks, if any.
9. Final Gate result: `PASS` or `FAIL`.
10. Whether T-005 was marked completed in the checklist.
11. `git status --short`.

If Final Gate is PASS, explicitly state:

`T-005 (FE) is ready to close.`

If Final Gate is FAIL, explicitly state:

`T-005 (FE) must remain open.`

---

## Senior Review findings

1. **Resolved — duplicated shared payment state and orchestration.** The implementation kept separate Cash and QR state objects, retry fingerprints, API-post construction, and nearly identical success/error/expiry subscriptions even though the backend permits only one payment per sale. This duplicated mutable state and increased the risk that the two payment methods would drift.
2. **Resolved — explicit server-error coverage was missing.** Network ambiguity was covered with status `0`, but the T-005 review requirements also called for unexpected server-error behavior. A `503 INTERNAL_SERVER_ERROR` retry test was added.
3. **No contract defect found.** The endpoint, method, active `sale_id`, exact-total QR payload, response shapes, error enum, idempotency header/replay, and expired-sale response match the backend controller, domain mapper, payment service, API documentation, and request fingerprint rules.
4. **No unresolved Angular/RxJS issue found.** The implementation remains Angular 14 compatible, strongly typed, uses lifecycle-bound subscriptions, keeps HTTP access in the service, and contains no nested subscriptions, inappropriate `any`, debug statements, or dead QR data.

## Fixes made

- Introduced shared `PaymentMethod`, `PaymentRequest`, `PaymentResponse`, `PaymentApiResponse`, and `PaymentState` types while retaining method-specific request/response types.
- Consolidated the service's payment HTTP construction in one private typed method while preserving the public `payCash` and `payQr` entry points and their narrow response types.
- Consolidated the component to one payment state and one retry fingerprint containing `saleId`, method, amount, and idempotency key.
- Routed Cash and QR confirmation through one shared submission/result handler while keeping method-specific eligibility and UI presentation.
- Preserved method-specific completed-payment getters through the backend response discriminator.
- Added explicit QR `503` mapping and same-key retry coverage.

## Backend contract verified

- `POST /api/v1/sales/:sale_id/payment`, using the active backend-created sale ID and environment-derived `/api/v1` base path.
- QR request body is exactly `{ "payment_method": "QR_PAYMENT", "amount_received": <sale total> }` with a positive integer amount.
- A client-generated `Idempotency-Key` is sent for the first operation and retained for outcome-ambiguous status `0`, `408`, and `5xx` retries with the same request fingerprint.
- First payment success maps the backend `201` payment resource; replayed success maps `200` with the same resource.
- QR success preserves `payment_id`, `payment_method`, `amount_received`, and `paid_at` and does not invent `change`, QR image/content, or reference fields.
- Expired pending sales map the backend `200 { sale_id, status: "CANCELLED" }` response to an expired UI state without fabricating a payment.
- Contract business errors, including `QR_AMOUNT_MISMATCH`, are mapped only when they match the backend error envelope and fixed code set.

## Regression verification

- Cash retains repeatable denomination accumulation, insufficient-total guarding, change display, exact endpoint/payload behavior, duplicate prevention, success/error/expiry handling, and ambiguous same-key retry behavior.
- Create Sale retains trimmed product-code submission, active backend sale ID/total mapping, duplicate prevention, error recovery, and ambiguous same-key retry behavior.
- All existing Cash and Create Sale tests remained green after the shared payment refactor.

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm test -- --browsers=ChromeHeadless` | PASS with normal host browser access; 33/33 tests succeeded in Chrome Headless 152. |
| `npm run build` | PASS; production build completed without warnings. |
| `git diff --check` and `git diff --cached --check` | PASS; only informational Windows line-ending notices were emitted. |
| `rg -n "\\bany\\b\|console\\.(log\|debug)\|\\bdebugger\\b" src/app` | PASS; no inappropriate `any` or debug code was found. |

No lint script is defined in `package.json`, so no new lint tool was introduced.

The review phase itself did not trigger a new debugging session: the refactor compiled on the first strict checks and the full test suite passed on its first review run. The implementation-phase Chrome/test investigation remains documented in `T-005-implementation.md`.

## Final Gate

All T-005 acceptance criteria are satisfied, the shared backend payment contract is correctly implemented, Cash and Create Sale regressions remain protected, all required checks pass, and no blocker or critical finding remains.

**Final Gate: PASS**

**T-005 (FE) is ready to close.**
