# T-008 (FE) — Testing + Final Integration Implementation Audit

## Verbatim implementation prompt

You are implementing **T-008 — Testing + Final Integration** for the frontend repository.

Repository:
`panupongz/test-coding-by-iconext-fe`

Branch:
`feature/implement`

Frontend:
Angular v14

Before making any changes, read and follow:

* `docs/IMPLEMENTATION_CHECKLIST.md`
* `.agents/skills/debug-mantra/SKILL.md` when the conditional debugging gate is triggered
* the existing implementation and tests from T-001 through T-007

Treat `docs/IMPLEMENTATION_CHECKLIST.md` as the Source of Truth for T-008 scope, acceptance criteria, Angular v14 Senior Developer engineering standards, architecture/file-responsibility rules, BE integration contract, prompt-audit requirements, and task workflow.

## Objective

Complete **T-008 — Testing + Final Integration** by validating the entire POS frontend flow implemented by T-001 through T-007 against the existing backend contract.

This task is primarily an integration, regression, and verification task.

Do not introduce new business requirements, redesign the application, or change the BE contract merely to make tests pass.

## Backend Contract

The frontend must continue using exactly these existing FE-facing endpoints:

1. `POST /api/v1/sales`
2. `POST /api/v1/sales/:sale_id/payment`
3. `POST /api/v1/sales/:sale_id/cancel`

Cash and QR must use the same payment endpoint.

For QR confirmation:

`amount_received = total`

The backend remains the Source of Truth.

Do not invent endpoints, fields, statuses, or business behavior.

## Required Integration Verification

Verify the complete flow across the implementation produced by T-001 through T-007.

At minimum cover:

### Create Sale

Verify:

`Product Code → POST /api/v1/sales → Active Sale → Product/Price displayed`

Confirm:

* product code submission works;
* duplicate submission protection works;
* returned product/price/total come from the BE response;
* FE maintains the correct active `sale_id`;
* product-not-found and relevant API/business errors are handled safely.

### Cash Payment

Verify:

`Active Sale → Cash → denominations → Confirm → POST payment → PAID`

Cover:

* `+100`
* `+500`
* `+1,000`
* repeated presses;
* deterministic accumulation;
* payment confirmation disabled while `amount_received < total`;
* correct change when `amount_received > total`;
* duplicate payment protection;
* correct payment request according to the actual BE contract.

### QR Payment

Verify:

`Active Sale → QR → Confirm → POST payment → PAID`

Confirm:

* QR uses the same payment endpoint as Cash;
* no separate QR endpoint exists;
* `amount_received = total`;
* duplicate confirmation is prevented;
* FE does not fabricate unsupported BE QR behavior/data.

### PAID / Thank You / Reset

Verify:

`PAID → Thank You → approximately 5 seconds → Reset`

Confirm:

* successful payment produces the PAID state;
* Thank You UI is displayed;
* Thank You remains visible for approximately 5 seconds;
* transaction state is then cleared;
* product-code input returns to the ready state;
* the next transaction can start cleanly;
* previous sale/payment state cannot leak into the next transaction.

Use deterministic timer testing where practical rather than making automated tests actually wait five real seconds.

### Cancel / Expiry / Error Recovery

Verify applicable paths for:

* explicit cancellation;
* `POST /api/v1/sales/:sale_id/cancel`;
* expired sale/session;
* invalid sale/payment state;
* product not found;
* API/business error;
* retry/reset behavior.

Ensure recovery cannot accidentally duplicate a transaction or fake successful backend cancellation.

## Automated Tests

Inspect the existing test suite before adding tests.

Prefer extending existing tests when appropriate instead of creating unnecessary duplicate test structures.

Add or adjust tests only where necessary to close T-008 integration/regression coverage.

Tests should verify behavior rather than implementation details wherever practical.

Mock HTTP boundaries appropriately for Angular unit/integration tests while validating:

* HTTP method;
* endpoint;
* request payload;
* relevant response mapping;
* state transitions;
* UI behavior.

Do not over-mock the internal application flow to the point that integration behavior is no longer tested.

## Senior Angular v14 Constraints

Continue following the architecture already established by T-001 through T-007.

In particular:

* components remain presentation/orchestration focused;
* HTTP access stays in the appropriate service layer;
* explicit TypeScript types are preserved;
* avoid `any`;
* do not introduce unmanaged RxJS subscriptions;
* preserve a clear source of truth for the active transaction;
* keep templates declarative;
* do not hard-code backend host/port;
* do not perform unrelated refactoring;
* do not introduce unnecessary abstractions or dependencies.

If you find a genuine defect while integrating T-001 through T-007, make the smallest safe correction required for T-008 and add/regress the appropriate test.

## Conditional Debugging Gate

If a build, test, runtime, or integration flow fails unexpectedly and diagnosis is required, stop speculative patching and apply:

`.agents/skills/debug-mantra/SKILL.md`

Follow its debugging procedure before changing code.

After the root cause is proven and fixed, rerun the relevant reproduction/test/build.

Preserve any additional debugging/fix prompts verbatim as required by the Prompt Audit Rule.

## Validation

Run the repository's relevant validation commands based on its actual package scripts/tooling.

At minimum, where supported, run:

* automated tests;
* Angular build;
* production/release build or equivalent supported build.

Do not claim a command passed unless it was actually executed successfully.

If a command cannot run because of an environmental/tooling limitation, report the exact limitation separately from an application failure.

## Scope Discipline

Do not:

* modify the backend;
* change the BE API contract;
* introduce new endpoints;
* redesign working UI from T-001 through T-007;
* perform broad refactoring;
* upgrade Angular or unrelated dependencies;
* add unnecessary libraries;
* weaken/remove valid tests merely to obtain a green test suite.

## Prompt Audit

Preserve this implementation prompt **verbatim** under `docs/prompts/` according to the repository's existing naming/conventions and `docs/IMPLEMENTATION_CHECKLIST.md`.

Do not silently rewrite this prompt after use.

Do not mark T-008 `DONE` yet.

The checklist should remain open until the separate **Senior Review + Final Gate** has passed.

## Required Final Report

When implementation and validation are complete, report:

1. T-008 implementation/integration summary.
2. Files changed.
3. Tests added or modified.
4. Exact commands executed.
5. Test results.
6. Build/production-build results.
7. Verification status of all three BE endpoints.
8. Cash flow result.
9. QR flow result.
10. PAID → Thank You → ~5-second reset result.
11. Error/cancel/expiry recovery result.
12. Any defects discovered from T-001 through T-007 and how they were fixed.
13. Whether `debug-mantra` was triggered; if yes, provide the proven root cause and verification evidence.
14. Any remaining risks or limitations.
15. Confirmation that this prompt was preserved verbatim.

Finish with:

`T-008 implementation/integration phase: READY FOR SENIOR REVIEW / FINAL GATE`

Do **not** mark T-008 `DONE`.

---

## Implementation and integration summary

- Added the missing PAID lifecycle: a modal Thank You state appears only after a successful payment response, remains for 5,000 ms, and then clears the transaction back to focused, enabled product-code entry.
- The automatic reset cancels safely on component destruction or transaction clearing, and it clears the active sale, payment, cancellation, selected method, received cash, retry metadata, and form value so state cannot leak into the next sale.
- Kept create, cash, QR, and cancellation HTTP behavior in `SaleApiService`; no backend endpoint, request field, response field, status, or business rule changed.
- Added component/HTTP integration coverage using the real service plus `HttpTestingController`, alongside a focused UI lifecycle regression test.
- Added an opt-in `ChromeHeadlessNoSandbox` Karma launcher for this Windows host. The repository's normal `ChromeHeadless` launcher remains the default.

## Files changed

- `karma.conf.js`
- `src/app/features/pos/pos.component.ts`
- `src/app/features/pos/pos.component.html`
- `src/app/features/pos/pos.component.scss`
- `src/app/features/pos/pos.component.spec.ts`
- `src/app/features/pos/pos.integration.spec.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-008-implementation.md`

## Tests added or modified

- Added a deterministic component test that verifies PAID, accessible Thank You dialog visibility through 4,999 ms, reset at 5,000 ms, complete state clearing, and a clean subsequent sale.
- Added five HTTP integration specs covering create-sale response mapping, repeated cash accumulation and change, duplicate payment protection, QR payment through the shared endpoint with `amount_received = total`, explicit backend cancellation, expiry-driven backend cancellation, product-not-found recovery, and retrying a new create operation.
- Existing endpoint-level service tests and prior component regression tests remain intact.

## Commands and results

| Command | Result |
|---|---|
| `npm test -- --browsers=ChromeHeadless` | Environment failure before any spec executed: Chrome's sandboxed GPU process repeatedly exited with `-1073741790`. |
| Direct Chrome diagnostics with `--headless --disable-gpu` and with `--headless --no-sandbox` | `--disable-gpu` alone did not prevent the GPU-process failure; `--no-sandbox` produced the expected DOM and isolated the host launcher constraint. |
| `npm test -- --browsers=ChromeHeadlessNoSandbox` before implementation | PASS, 48/48 existing specs. |
| `npm test -- --browsers=ChromeHeadlessNoSandbox --include='src/app/features/pos/pos.component.spec.ts' --include='src/app/features/pos/pos.integration.spec.ts'` | First run: 41/42 passed; one fakeAsync test retained the intentional next-sale expiry timer. Corrected run: PASS, 42/42. |
| `npx tsc -p tsconfig.app.json --noEmit` | PASS. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS. |
| `npm test -- --browsers=ChromeHeadlessNoSandbox` after implementation | PASS, 54/54 specs. |
| `npm run build -- --configuration development` | PASS. |
| `npm run build -- --configuration production` | PASS; non-blocking existing component-style budget warning remains, now reporting 3.60 kB against the 2.00 kB warning threshold and below the 4.00 kB error threshold. |
| `git diff --check` | PASS; informational LF-to-CRLF working-copy notices only. |

## Backend endpoint verification

- `POST /api/v1/sales`: verified exact method, URL, `{ product_code }` payload, backend product/name/price/total mapping, active `sale_id`, duplicate guard, not-found recovery, and a clean subsequent request.
- `POST /api/v1/sales/:sale_id/payment`: verified exact method and URL for both Cash and QR. Cash sends accumulated `amount_received`; QR sends the backend sale total. Duplicate confirmation is blocked while the request is active.
- `POST /api/v1/sales/:sale_id/cancel`: verified exact method, URL, bodyless request, explicit cancellation, and expiry cancellation. The UI does not clear or claim cancellation before the backend response.

## Flow results

- Cash: PASS for `+100`, `+500`, `+1,000`, repeated additions, deterministic accumulation, underpayment disablement, overpayment change, duplicate-submit protection, PAID mapping, and exact request payload.
- QR: PASS through the same payment endpoint, exact-total payload, duplicate-submit protection, and no fabricated QR backend data.
- PAID → Thank You → reset: PASS with fakeAsync checks at 4,999 ms and 5,000 ms; the next transaction starts with no stale sale, method, payment, received amount, retry, or cancellation state.
- Error/cancel/expiry: PASS for product-not-found recovery, typed API/business errors, ambiguous-request idempotent retry behavior, invalid terminal states, explicit cancellation, expiry cancellation, unavailable sales, and safe reset behavior.

## Defects found and fixed

- T-001 through T-007 left the T-008-required Thank You popup and automatic five-second reset unimplemented. Added the smallest scoped component/template/style lifecycle and regression coverage.
- The first new lifecycle test left a valid next-sale expiry timer pending inside fakeAsync. The production teardown path was already correct; the test now destroys its fixture after proving the next transaction, exercising the unsubscribe behavior and eliminating the harness-only leak.

## Debugging evidence

`debug-mantra` was triggered.

- Reliable reproduction: the default ChromeHeadless command failed three launcher attempts before running zero tests.
- Fail path: direct Chrome launch showed the sandboxed GPU process failing; disabling GPU alone did not change the outcome.
- Falsification: launching the same installed Chrome with `--no-sandbox` succeeded, and the full unchanged baseline suite then passed 48/48 through the named launcher. This rules out an application/Karma test failure for the initial incident.
- Cross-check: after implementation, focused tests passed 42/42 and the complete suite passed 54/54 with the same launcher.
- The focused fakeAsync failure was independently reproduced as a pending timer only after starting a second sale; fixture destruction canceled it and all focused/full validations passed without a production behavior workaround.

## Remaining risks and limitations

- Node.js 24.21.0 is newer than Angular 14's supported engine range; Angular reports this compatibility warning even though TypeScript, tests, and both builds pass. CI should use a supported Node version from `package.json` where possible.
- Production build retains the non-blocking POS component style-budget warning described above.
- HTTP integration is verified against mocked boundaries using the documented backend contract; no live backend environment was provided or required for this frontend task.
- T-008 remains `TODO`; Senior Review + Final Gate and its separate prompt audit are intentionally still open.

## Implementation phase status

**READY FOR SENIOR REVIEW / FINAL GATE — T-008 NOT MARKED DONE**
