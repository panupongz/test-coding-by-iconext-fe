You are implementing **T-004 (FE) — Cash Payment** in the Angular v14 frontend repository.

Before making any changes:

1. Read `docs/IMPLEMENTATION_CHECKLIST.md` completely.
2. Locate and read the exact requirements, acceptance criteria, dependencies, and Prompt Audit rules for **T-004 (FE)**.
3. Inspect the implementation completed in **T-001, T-002, and T-003** and reuse the established architecture, coding conventions, UI patterns, routing patterns, service patterns, models, shared components, and error-handling approach where appropriate.
4. Inspect the existing Backend API contract related to sale/payment/cash payment that is available in the repository documentation or existing frontend integration. Do not invent an API contract.
5. Read and follow any repository-level `AGENTS.md`, project instructions, or applicable skills before implementation.

## Objective

Implement **T-004 (FE) — Cash Payment** end-to-end according to the existing checklist and Backend contract.

The implementation must integrate correctly with the sale flow produced by T-003 and must preserve the current behavior of already completed tasks.

## Angular v14 Engineering Standards

Implement this as production-quality Angular v14 code written to a Senior Developer standard.

Follow separation of concerns:

* Component: UI state and user interaction only.
* Service: API communication and reusable business operations.
* Models/interfaces: typed request/response/domain structures.
* Pipes/directives/helpers: use only when transformation or reusable behavior genuinely belongs there.
* Shared components: reuse existing components where appropriate instead of duplicating code.

Requirements:

* Use strict TypeScript typing.
* Avoid `any` unless technically unavoidable and explicitly justified.
* Do not place HTTP calls directly inside components.
* Do not duplicate existing models, services, constants, or utilities.
* Keep methods focused and reasonably small.
* Use meaningful names.
* Avoid unnecessary abstractions or over-engineering.
* Follow the architecture and folder structure already established by T-001–T-003.
* Properly handle Observable subscriptions and component lifecycle where applicable.
* Do not introduce memory leaks.
* Do not introduce unrelated refactors.

## Cash Payment Flow

Implement the Cash Payment flow required by T-004.

At minimum, verify the implementation covers the behavior defined in `docs/IMPLEMENTATION_CHECKLIST.md`, including:

* receiving/using the sale information created from T-003;
* displaying the correct payment/sale information required by the UI;
* accepting the required cash-payment input;
* validating user input before submission;
* calling the correct Backend cash-payment endpoint/service;
* sending a request matching the Backend contract exactly;
* handling the successful payment response;
* handling Backend validation/business errors;
* handling HTTP/network errors;
* preventing accidental duplicate submissions where appropriate;
* providing appropriate loading/submitting state;
* navigating or updating UI state correctly after successful payment;
* preserving the sale/payment identifiers needed by subsequent flow.

Do not guess missing business rules.

If the checklist or Backend contract differs from the assumptions above, the repository documentation and actual Backend contract are the source of truth.

## API Contract

Before implementing the API call:

1. Identify the actual cash-payment endpoint.
2. Identify its HTTP method.
3. Identify required request fields.
4. Identify response structure.
5. Identify known error responses/status codes.

Create or reuse typed Angular models/interfaces that reflect the real API contract.

Do not fabricate fields just to make the UI work.

If there is a contract mismatch between FE requirements and BE implementation, stop that specific integration work and clearly report the mismatch instead of silently working around it.

## Validation & Error Handling

Implement validation according to the checklist and actual business rules.

The UI must clearly distinguish where appropriate between:

* invalid/missing user input;
* Backend business/validation rejection;
* HTTP/network failure;
* successful payment.

Do not expose raw technical errors or stack traces to end users.

## Testing

After implementation:

1. Run the existing relevant tests.
2. Add or update tests required for T-004.
3. Test the Cash Payment happy path.
4. Test invalid input.
5. Test Backend/API failure handling.
6. Test duplicate-submit prevention if applicable.
7. Verify navigation/state after successful payment.
8. Verify existing T-001–T-003 behavior is not broken.

Run the repository's applicable validation commands, including build/test/lint/type checking where configured.

Do not claim a command passed unless you actually ran it successfully.

## Scope Control

Do NOT:

* implement T-005 or later tasks;
* perform unrelated refactoring;
* modify Backend code;
* change the Backend API contract;
* redesign unrelated screens;
* replace existing architecture without a T-004 requirement;
* mark T-004 as DONE yet.

## Prompt Audit

Store this implementation prompt **verbatim** according to the Prompt Audit convention defined in `docs/IMPLEMENTATION_CHECKLIST.md`.

Do not rewrite, summarize, or normalize the stored prompt.

## Completion Report

When implementation and testing are finished, report:

1. Files created.
2. Files modified.
3. Cash Payment flow implemented.
4. Backend endpoint/contract used.
5. Validation/error handling implemented.
6. Tests added/updated.
7. Commands actually executed.
8. Test/build/lint results.
9. Any assumptions, blockers, or contract mismatches.
10. `git status --short`.
11. Whether T-004 is ready for **Prompt #2 — Senior Review + Fix + Re-test + Final Gate**.

Do **not** mark T-004 as DONE.

---

## Implementation summary

- Verified the payment contract directly from the local backend repository on branch `feature/implement`, including the payment route/controller, service, domain response mapper, idempotency validation, error catalog, API documentation, and payment tests.
- Added typed cash-payment request, success, expired-sale, API-error, view-error, and discriminated UI-state models without introducing `any`.
- Extended the existing `SaleApiService` with `payCash`, using the environment-derived sales URL, the active backend `sale_id`, the exact cash request body, and a per-operation `Idempotency-Key`.
- Enabled Cash only for an active `PENDING` sale while leaving QR disabled for T-005.
- Added repeatable `+100`, `+500`, and `+1,000` controls, deterministic accumulation, confirm eligibility at `amount_received >= total`, and positive-change display.
- Added submitting-state and duplicate-submit guards for payment controls and transaction reset.
- Mapped a successful cash response into retained payment state, preserved `payment_id`, changed the active sale status to `PAID`, and displayed the backend-returned change.
- Mapped the backend's successful expired-sale response into a recoverable `CANCELLED`/expired state without fabricating a payment.
- Displayed recognized backend business/validation messages, used a safe local message for unknown/network failures, and retained the idempotency key only for outcome-ambiguous payment retries.
- Preserved all T-001–T-003 behavior and did not implement QR payment, cancellation, automatic Thank You/reset, or later-task behavior.
- T-004 remains `TODO`; the separate Senior Review + Final Gate has not been performed.

## Backend contract used

- Method/path: `POST /api/v1/sales/:sale_id/payment`.
- Required header: non-blank `Idempotency-Key`, maximum 255 characters.
- Cash request: `{ "payment_method": "CASH", "amount_received": <positive integer> }`; cash must be at least the sale total.
- First payment success: `201 Created`; replay: `200 OK`; response fields are `payment_id`, `payment_method`, `amount_received`, `paid_at`, and `change`.
- Expired pending sale: `200 OK` with `{ sale_id, status: "CANCELLED" }` and no payment.
- Errors use `{ error: { code, message } }`; payment-relevant statuses are `400`, `404`, `409`, and sanitized `500`.

## Files changed

- Created `docs/prompts/T-004-implementation.md`.
- Modified `src/app/core/models/sale.models.ts`.
- Modified `src/app/core/services/sale-api.service.ts`.
- Modified `src/app/core/services/sale-api.service.spec.ts`.
- Modified `src/app/features/pos/pos.component.ts`.
- Modified `src/app/features/pos/pos.component.html`.
- Modified `src/app/features/pos/pos.component.spec.ts`.

## Tests added or updated

- Exact payment endpoint, method, body, generated idempotency key, and supplied retry-key reuse.
- Cash activation with QR remaining disabled.
- Repeated denomination accumulation and change display.
- Below-total confirmation validation.
- Happy-path payment, duplicate-submit prevention, loading/reset guards, payment identifier preservation, and `PAID` transition.
- Backend business-error display and safe retry behavior.
- Network-error fallback and outcome-ambiguous idempotency-key reuse.
- Expired-sale `CANCELLED` response handling.
- Existing create-sale, reset, validation, idempotency, and POS rendering tests remain in the passing suite.

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS after the nullability fix; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS after the nullability fix; strict test compilation completed without errors. |
| `npm test` (restricted first run) | Environment failure before browser connection; zero tests ran because Chrome's GPU/persistent cache could not start. |
| `npm test` (normal host access) | PASS twice; final run completed 25/25 tests in Chrome Headless 152. |
| `npm run build` | PASS; final production build completed without warnings. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |
| `rg -n "\\bany\\b" src/app` | No matches; `rg` returned its normal no-match status. |
| Prompt line comparison | PASS; the preserved prompt's 147 source lines matched the attachment before this evidence section was appended. |

No lint script is configured in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered by the first strict TypeScript compilation failure and was then extended when the restricted Chrome launcher failed.

- **Reproduce:** Both application and spec TypeScript compilers deterministically reported `TS2531` at `pos.component.ts:188`. The restricted Karma run compiled its browser bundle but consistently failed before browser connection and executed zero tests.
- **Fail path:** The TypeScript error occurred in `selectCashPayment`: `saleState.status` was narrowed, but the subsequent nullable `activeSale` getter lost that discriminant. Chrome exited in its GPU process after persistent-cache access failures under the Karma temporary profile.
- **Hypotheses/falsification:** Directly reading `saleState.activeSale` after the discriminant guard would disprove the getter-narrowing hypothesis if compilation still failed; both strict compilers passed, confirming it. Running the unchanged test suite with normal host access would disprove the environment hypothesis if tests still failed; Chrome connected and all 25 tests passed twice.
- **Breadcrumb cross-check:** The original compiler failures, the focused one-line narrowing change, both clean strict compilers, the sandbox launcher log, two unchanged 25/25 host test runs, and the clean final build are mutually consistent. No cast, non-null assertion, Karma change, Chrome flags, or environment-specific repository workaround was introduced.

## Implementation phase status

**IMPLEMENTATION COMPLETE — READY FOR SEPARATE SENIOR REVIEW + FIX + RE-TEST + FINAL GATE**
