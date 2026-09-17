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

**Status:** `TODO`

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

- [ ] API DTO/error types are clearly separated from POS UI/view-model/state types.
- [ ] Existing type shapes and BE contract remain unchanged.
- [ ] All imports compile cleanly.
- [ ] No business logic or user-visible behavior is changed.
- [ ] Existing relevant tests pass.
- [ ] Angular production build passes.
- [ ] Senior review confirms no unnecessary abstraction was introduced.

---

## R-002 — Extract Sale Mapper

**Status:** `BLOCKED_BY_R-001`

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

- [ ] `PosComponent` no longer owns API DTO -> active-sale view-model mapping.
- [ ] Mapper is pure and independently testable.
- [ ] Existing mapping output remains identical.
- [ ] Mapper unit tests cover relevant fields.
- [ ] Existing relevant tests pass.
- [ ] Angular production build passes.
- [ ] No API/UI/business behavior changes.

---

## R-003 — Extract POS Facade / Application State

**Status:** `BLOCKED_BY_R-002`

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

- [ ] `PosComponent` is materially smaller and focused on presentation/UI orchestration.
- [ ] Reusable/application workflow logic is owned by the facade rather than the component.
- [ ] API access remains in `SaleApiService`; facade coordinates it rather than duplicating HTTP logic.
- [ ] Retry/idempotency semantics remain unchanged.
- [ ] Expiry/cancel/payment/create-sale behavior remains unchanged.
- [ ] Existing relevant tests pass and facade tests cover extracted behavior.
- [ ] Angular production build passes.
- [ ] No unnecessary framework/dependency/architecture is introduced.

---

## Final Regression Gate

R-001, R-002, and R-003 may be closed only after the completed T-001 through T-008 flow remains valid.

### Automated Validation

```bash
npm test -- --watch=false
ng build
```

Use the repository's actual build/test commands if package scripts differ.

### Manual Smoke Flow

- [ ] Product code submission / Create Sale.
- [ ] Product and total display.
- [ ] Cash +100 / +500 / +1,000 accumulation.
- [ ] Cash confirm and change calculation.
- [ ] QR selection and confirmation.
- [ ] Successful PAID -> Thank You -> reset flow.
- [ ] Cancel active sale.
- [ ] Retry/error paths preserve idempotency behavior.
- [ ] Expired sale/session recovery.
- [ ] Duplicate submissions remain guarded.

### Final Senior Review

- [ ] No BE contract changes.
- [ ] No UI/UX behavior changes.
- [ ] No regression in T-001 through T-008.
- [ ] Separation of concerns is visibly improved.
- [ ] No over-engineering for a technical assignment.
- [ ] Code remains Angular v14 compatible.

## Completion Rule

The refactor is complete only when all three tasks and the Final Regression Gate pass. The desired presentation outcome is a clear architecture:

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