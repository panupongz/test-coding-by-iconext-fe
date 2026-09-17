# FE Senior Refactor Checklist

## Purpose

This checklist covers the focused architecture refactor to prepare the Angular v14 technical assignment for Senior Developer review.

## Non-Negotiable Rule

**Zero Behavioral Change.**

The completed T-001 through T-008 behavior must remain unchanged. This refactor must not change:

- Backend endpoints or API contracts.
- Request/response field semantics.
- UI/UX and user-visible business flow.
- Validation rules or user-facing error semantics.
- Idempotency/retry behavior.
- Create Sale, Cash Payment, QR Payment, Cancel, Retry/Error, Expiry, Thank You, or Reset behavior.

If a behavioral difference is introduced unintentionally, treat it as a regression and fix it before closing the refactor task.

## Workflow

Execute tasks sequentially:

`R-001 -> test/build -> R-002 -> test/build -> R-003 -> test/build -> Final Regression Gate`

Do not combine all three refactors into one uncontrolled rewrite. Preserve existing tests where possible and update tests only where code ownership/location changes require it.

---

## R-001 — Separate API and POS Models

**Status:** `DONE`

### Goal

Remove mixed responsibilities from `core/models/sale.models.ts` while preserving every existing type shape and runtime behavior.

### Scope

- Separate API request/response/error contract types from POS UI/view-model/state types.
- Keep type names and field shapes unchanged unless a rename is strictly required to resolve a collision.
- Update imports throughout application and tests.
- Do not change mapping logic, API behavior, or component behavior in this task.
- Prefer a small number of cohesive model files; do not create one file per interface unnecessarily.

### Suggested Structure

```text
src/app/core/models/
  sale-api.models.ts
  payment-api.models.ts

src/app/features/pos/models/
  pos.models.ts
```

The exact split may be adjusted if inspection shows a simpler cohesive structure, but API contracts and presentation/application state must not remain mixed in one god-model file.

### Acceptance Criteria

- [x] API DTO/error types are clearly separated from POS UI/view-model/state types.
- [x] Existing type shapes and BE contract remain unchanged.
- [x] All imports compile cleanly.
- [x] No business logic or user-visible behavior is changed.
- [x] Existing relevant tests pass.
- [x] Angular production build passes.
- [x] Senior review confirms no unnecessary abstraction was introduced.

---

## R-002 — Extract Sale Mapper

**Status:** `DONE`

### Goal

Remove raw API-response-to-view-model mapping responsibility from `PosComponent`.

### Scope

- Move the existing `toActiveSale()` mapping out of `PosComponent` into a focused mapper/helper.
- Mapper must be a pure transformation with no HTTP calls, mutable shared state, or UI side effects.
- Preserve the exact mapping semantics currently used by the completed sale flow.
- Add focused unit tests for the mapping.
- Do not move unrelated POS workflow/state logic in this task.

### Suggested Structure

```text
src/app/features/pos/mappers/
  sale.mapper.ts
  sale.mapper.spec.ts
```

A pure function is preferred over an injectable service unless dependency injection is genuinely required.

### Acceptance Criteria

- [x] `PosComponent` no longer owns API DTO -> active-sale view-model mapping.
- [x] Mapper is pure and independently testable.
- [x] Existing mapping output remains identical.
- [x] Mapper unit tests cover relevant fields.
- [x] Existing relevant tests pass (56/56).
- [x] Angular production build passes.
- [x] No API/UI/business behavior changes.

### Final Gate Evidence

- Senior Review / Final Gate: `PASS`.
- Full test suite: `56/56 PASS`.
- Production build: `PASS`.
- `git diff --check`: `PASS`.
- No R-002 defect or behavioral regression found.
- Existing `pos.component.scss` budget warning remains unchanged and non-blocking.

---

## R-003 — Extract POS Facade / Application State

**Status:** `DONE`

### Goal

Reduce `PosComponent` responsibility by moving sale workflow/state orchestration into a focused facade/application service while keeping the component responsible for presentation and UI interaction.

### Scope

Review current `PosComponent` responsibilities and move cohesive application logic where appropriate, including:

- Create-sale orchestration.
- Payment orchestration.
- Cancellation orchestration.
- Retry/idempotency attempt state.
- Sale expiry coordination.
- POS transaction/application state transitions.

Keep presentation-specific responsibilities in the component, including template event handling, view references, DOM focus/accessibility behavior, and simple derived display concerns where appropriate.

Do not introduce NgRx or another state-management dependency for this assignment unless the existing implementation genuinely requires it.

### Suggested Structure

```text
src/app/features/pos/services/
  pos-facade.service.ts
  pos-facade.service.spec.ts
```

### Acceptance Criteria

- [x] `PosComponent` is materially smaller and focused on presentation/UI orchestration.
- [x] Reusable/application workflow logic is owned by the facade rather than the component.
- [x] API access remains in `SaleApiService`; facade coordinates it rather than duplicating HTTP logic.
- [x] Retry/idempotency semantics remain unchanged.
- [x] Expiry/cancel/payment/create-sale behavior remains unchanged.
- [x] Existing relevant tests pass and facade tests cover extracted behavior (64/64 full suite PASS; 8 facade tests added).
- [x] Angular production build passes.
- [x] No unnecessary framework/dependency/architecture is introduced.

### Final Gate Evidence

- Senior Review / Final Gate: `PASS`.
- Full regression suite: `64/64 PASS`.
- Production build: `PASS`.
- `git diff --check`: `PASS`.
- Facade is component-scoped and is the single mutable POS application-state owner.
- Create Sale, Cash, QR, Cancellation, retry/idempotency, expiry/timer, Thank You/reset and RxJS lifecycle behavior were reviewed as equivalent.
- `SaleMapper` remains the mapping boundary and `SaleApiService` remains the sole HTTP/API owner.
- No R-003 defect or behavioral regression was found.
- Existing `pos.component.scss` budget warning remains unchanged and non-blocking.

---

## Final Regression Gate

**Status:** `DONE`

R-001, R-002, and R-003 were closed after verifying that the completed T-001 through T-008 behavior and existing BE contract remain preserved.

### Automated Validation

- [x] Full regression suite: `64/64 PASS` using `ChromeHeadlessNoSandbox`.
- [x] Production build: `PASS`.
- [x] `git diff --check`: `PASS`.
- [x] No regression or BE contract difference found.

### Smoke-Flow Evidence

No actual interactive browser/manual smoke session was performed during the Final Regression Gate. The following flows were verified by the current automated unit and HTTP integration suites:

- [x] Product code submission / Create Sale — `VERIFIED_BY_AUTOMATION`.
- [x] Product and total display — `VERIFIED_BY_AUTOMATION`.
- [x] Cash +100 / +500 / +1,000 accumulation — `VERIFIED_BY_AUTOMATION`.
- [x] Cash confirm and change calculation — `VERIFIED_BY_AUTOMATION`.
- [x] QR selection and confirmation — `VERIFIED_BY_AUTOMATION`.
- [x] Successful PAID -> Thank You -> reset flow — `VERIFIED_BY_AUTOMATION`.
- [x] Cancel active sale — `VERIFIED_BY_AUTOMATION`.
- [x] Retry/error paths preserve idempotency behavior — `VERIFIED_BY_AUTOMATION`.
- [x] Expired sale/session recovery — `VERIFIED_BY_AUTOMATION`.
- [x] Duplicate submissions/payments remain guarded — `VERIFIED_BY_AUTOMATION`.

A live browser smoke test against a real backend remains optional additional confidence before presentation and is not represented as having been performed by this gate.

### Final Senior Review

- [x] No BE contract changes.
- [x] No unintended UI/UX behavior changes were identified by the regression evidence.
- [x] No regression in T-001 through T-008 was identified.
- [x] Separation of concerns is visibly improved.
- [x] No over-engineering for a technical assignment.
- [x] Code remains Angular v14 compatible.

### Final Gate Evidence

- Overall Final Regression Gate: `PASS`.
- R-001: `DONE / PASS`.
- R-002: `DONE / PASS`.
- R-003: `DONE / PASS`.
- `SaleApiService` remains the sole HTTP/API owner.
- `SaleMapper` remains a pure API DTO -> ViewModel transformation.
- `PosFacadeService` is component-scoped and owns cohesive mutable POS application state/workflow.
- `PosComponent` retains presentation, form, DOM/focus/accessibility and UI delegation responsibilities.
- Existing `pos.component.scss` size-budget warning remains unchanged and non-blocking.

## Completion Rule

**COMPLETE.** R-001, R-002, R-003, and the Final Regression Gate have passed.

Final architecture:

```text
PosComponent
    |
    v
PosFacadeService
    |
    +--> SaleMapper
    |
    v
SaleApiService
```

with API DTOs separated from POS presentation/application state.
