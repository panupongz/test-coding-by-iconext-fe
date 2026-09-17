You are implementing **T-005 (FE)** in the current Angular v14 frontend repository.

## Source of truth

Before making any changes:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md`.
2. Locate and read the complete requirements and acceptance criteria for **T-005 (FE)**.
3. Inspect the existing implementation from **T-001 through T-004**.
4. Inspect the current backend API contract used by the frontend.
5. Follow the repository's existing architecture, naming conventions, coding standards, and folder structure.
6. Do not modify unrelated features.

The checklist is the source of truth. If anything in this prompt conflicts with `docs/IMPLEMENTATION_CHECKLIST.md`, follow the checklist and report the conflict.

---

# Objective

Implement **T-005 (FE)** completely according to `docs/IMPLEMENTATION_CHECKLIST.md`.

T-005 is the **QR Payment Workflow** that continues from the existing sale/payment flow.

The implementation must integrate cleanly with the work already completed in T-001 through T-004 and must not break the existing Cash Payment workflow.

---

# Backend integration

Use the existing backend API contract.

Expected payment endpoint:

`POST /api/v1/sales/:sale_id/payment`

For this workflow, use the QR payment method defined by the backend contract, expected as:

`payment_method = QR_PAYMENT`

Do NOT:

* invent a new endpoint;
* duplicate an existing payment API;
* hardcode fake successful payment results into production code;
* change the backend contract just to simplify the frontend;
* break the existing CASH payment flow.

Before implementation, verify the actual request/response contract from the repository and use the real contract if it differs from the expectation above.

---

# Angular v14 implementation standard

Implement this as production-quality code expected from a **Senior Angular Developer**.

Maintain clear separation of responsibilities.

Use appropriate:

* Components
* Services
* Models / Interfaces
* Routing
* Reactive Forms where forms are involved
* RxJS
* Pipes / utilities only when justified

Components should primarily handle presentation and UI interaction.

API communication and business/data-access logic should be placed in services rather than duplicated inside components.

Use strongly typed TypeScript.

Avoid:

* `any` unless technically unavoidable and documented;
* duplicated API calls;
* duplicated business logic;
* unnecessary subscriptions;
* nested subscriptions when RxJS operators provide a cleaner solution;
* memory leaks;
* large monolithic components;
* magic strings/numbers where a meaningful constant or type should be used;
* dead code;
* debug `console.log`;
* unnecessary abstraction or over-engineering.

Follow Angular v14-compatible patterns. Do not introduce APIs or patterns requiring a newer Angular version.

---

# QR Payment workflow

Implement the complete QR Payment workflow required by T-005.

At minimum, verify that the UI correctly handles the expected states defined by the checklist/backend contract, including where applicable:

* QR payment selection;
* payment submission;
* loading state;
* successful payment;
* failed payment;
* API/business validation errors;
* unexpected server/network errors;
* prevention of accidental duplicate submission;
* navigation or UI state after successful payment.

Use the actual backend response as the source of truth for payment status.

Do not treat a QR payment as successful merely because the user selected QR payment or clicked the payment button.

If the backend provides QR-related data such as QR content, QR image data, payment reference, transaction reference, or payment status, map and display it according to the existing contract and checklist.

Do not invent QR data that the backend does not provide.

---

# Regression safety

T-005 must integrate with the existing workflow without breaking completed tasks.

Specifically verify:

* T-003 Create Sale still works with the new QR workflow.
* T-004 Cash Payment Workflow still works.
* Existing routes continue to work.
* Existing API service behavior is not unintentionally changed.
* Shared models/components are changed only when necessary and remain backward compatible with existing frontend usage.

Prefer extending existing reusable payment infrastructure over duplicating it, provided doing so does not create unnecessary abstraction.

---

# Testing

Add or update tests appropriate to the implementation.

Test meaningful behavior rather than implementation details.

At minimum cover applicable scenarios for:

1. QR payment happy path.
2. Correct request payload.
3. Correct `sale_id`.
4. Loading state.
5. Successful backend response.
6. Backend payment failure.
7. Validation/business error.
8. Network/server error.
9. Duplicate-submit protection.
10. Existing Cash Payment behavior remains valid where shared code was modified.

Run the repository's existing relevant checks, such as:

* unit tests;
* Angular build;
* lint/type checks if configured.

Do not introduce a new testing framework unless required by the repository.

---

# Prompt traceability

This task follows the project's prompt-traceability rule.

Store the **verbatim implementation prompt used for T-005** in the prompt/documentation location defined by the repository/checklist.

Do not summarize or rewrite the prompt when storing it.

Follow the same naming and directory convention already used by completed FE tasks.

---

# Documentation / checklist

After implementation and testing:

* update T-005 progress only as permitted by `docs/IMPLEMENTATION_CHECKLIST.md`;
* record relevant implementation/test evidence using the existing project convention;
* do NOT mark T-005 fully completed/closed yet.

T-005 can only be closed after **Prompt #2 — Senior Review + Fix + Re-test + Final Gate** has been completed successfully.

---

# Required final response

When finished, report:

1. Summary of what was implemented.
2. Files created.
3. Files modified.
4. Backend endpoint/contract actually used.
5. Tests added/updated.
6. Commands executed.
7. Test/build/lint results.
8. Any assumptions made.
9. Any remaining risks or findings.
10. Confirmation that the T-005 prompt was stored verbatim.
11. `git status --short`.

Do NOT commit or push unless explicitly instructed.

Do NOT close T-005.

Stop after implementation + testing and wait for the Senior Review / Final Gate prompt.

---

## Implementation summary

- Verified the QR payment contract directly from the backend implementation and API documentation: QR uses the existing payment endpoint, requires `QR_PAYMENT`, sends the exact sale total, and returns payment metadata without QR image/content or a cash `change` field.
- Added explicit QR request, response, API-response union, UI-state, and `QR_AMOUNT_MISMATCH` error typing.
- Extended `SaleApiService` with a typed QR operation that retains the existing idempotency-key behavior and shared sale-payment endpoint.
- Enabled QR selection for pending sales and added QR amount, submitting, success, business-error, network/server-error, and expired-sale states.
- A QR payment is marked successful only after the backend returns a payment resource; an expired response marks the sale `CANCELLED` without creating a local success.
- Prevented duplicate in-flight confirmation and preserved the same key for outcome-ambiguous retries. Payment-method switching is locked until an ambiguous attempt is resolved or the transaction is reset.
- Preserved the existing cash workflow and reset behavior.
- Updated only the implementation-phase T-005 acceptance checks. T-005 remains `TODO`; the Senior Review / Final Gate and final prompt audit remain open.

## Files changed

- Created `docs/prompts/T-005-implementation.md`.
- Modified `docs/IMPLEMENTATION_CHECKLIST.md`.
- Modified `src/app/core/models/sale.models.ts`.
- Modified `src/app/core/services/sale-api.service.ts`.
- Modified `src/app/core/services/sale-api.service.spec.ts`.
- Modified `src/app/features/pos/pos.component.ts`.
- Modified `src/app/features/pos/pos.component.html`.
- Modified `src/app/features/pos/pos.component.spec.ts`.

## Backend contract used

- Endpoint: `POST /api/v1/sales/:sale_id/payment` using the active sale identifier.
- Headers: a client-generated `Idempotency-Key`, reused for an outcome-ambiguous retry.
- QR body: `{ "payment_method": "QR_PAYMENT", "amount_received": <sale total> }`.
- First success: `201 Created`; successful replay: `200 OK`.
- Success fields: `payment_id`, `payment_method`, `amount_received`, and `paid_at`; the QR response has no `change` or QR image/content field.
- Expired pending sale: `200 OK` with `{ "sale_id": "...", "status": "CANCELLED" }` and no payment.

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm test -- --browsers=ChromeHeadless` (restricted run) | Environment failure before browser connection; zero tests ran because Chrome's GPU/persistent cache could not start. |
| `npm test -- --browsers=ChromeHeadless` (normal host access, first run) | Ran 32 tests and exposed one test-only `OnPush` fixture issue. |
| `npm test -- --browsers=ChromeHeadless` (normal host access, corrected run) | PASS; 32/32 tests succeeded in Chrome Headless 152. |
| `npm run build` | PASS; production build completed without warnings after keeping component styles within the configured budget. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |
| `rg -n "\\bany\\b" src/app` | PASS; no `any` usage found. |

No lint script is defined in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered by the restricted Chrome launcher failure and continued through the test-only failure found by the host run.

- **Reproduce:** The restricted Karma run consistently completed bundling but failed before browser connection with GPU process exits and persistent-cache access failures. With host access, the suite reliably produced one failing QR UI visibility assertion.
- **Fail path:** The launcher failure occurred in `karma-chrome-launcher → Chrome startup`, before application tests. The subsequent assertion failed because the test invoked an `OnPush` component method directly after a completed change-detection cycle, so the view was not dirtied as it is by a template event.
- **Hypotheses/falsification:** Running the unchanged suite with normal host access disproved a repository Karma/configuration problem. Inspecting the rendered template disproved a missing-section/selector hypothesis. Triggering the real QR button event would disprove the `OnPush` test-setup hypothesis if the assertion still failed; the full suite then passed.
- **Breadcrumb cross-check:** The clean strict compilers, deterministic restricted launcher logs, host execution, focused event-based test correction, 32/32 passing suite, and warning-free final build are mutually consistent. No Karma flags or environment-specific repository workaround was introduced.

## Implementation phase status

**IMPLEMENTATION COMPLETE — AWAITING SEPARATE SENIOR REVIEW + FINAL GATE**
