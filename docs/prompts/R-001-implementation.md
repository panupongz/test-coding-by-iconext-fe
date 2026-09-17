# R-001 — Implementation Prompt

Use this prompt verbatim for the R-001 implementation.

---

You are implementing **R-001 — Separate API and POS Models** in the Angular v14 frontend repository.

Repository: `panupongz/test-coding-by-iconext-fe`
Branch: `feature/implement`

Read and follow these sources of truth before changing code:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/REFACTOR_CHECKLIST.md`
- Existing implementation and tests on `feature/implement`

## Goal

Refactor the current mixed model definitions so API contracts are clearly separated from POS presentation/application state, while preserving **Zero Behavioral Change** for all completed T-001 through T-008 behavior.

## Required work

1. Inspect `src/app/core/models/sale.models.ts` and every production/test import that depends on it.
2. Separate the existing types into a small number of cohesive files. Prefer this structure unless inspection proves a simpler split is clearer:

```text
src/app/core/models/
  sale-api.models.ts
  payment-api.models.ts

src/app/features/pos/models/
  pos.models.ts
```

3. API request/response/error DTOs belong in the core API model files. POS view models, UI/application state, cancellation state and payment state belong in the POS feature model file.
4. Preserve existing exported type/interface/constant names and every field shape/union/value exactly unless a change is strictly necessary to resolve a compile-time collision.
5. Update all application and test imports to the new ownership locations.
6. Remove `sale.models.ts` only if all definitions/imports have been safely migrated and it is no longer needed. Do not leave duplicate sources of truth.
7. Do **not** change `SaleApiService` behavior, `PosComponent` workflow, `toActiveSale()` mapping, API URLs, HTTP payloads, error semantics, UI behavior, validation, retry/idempotency semantics, timers, or business rules in R-001.
8. Do not introduce new dependencies, NgRx, unnecessary barrel files, or one-file-per-interface fragmentation.

## Non-negotiable regression rule

This is an internal architecture refactor only. The following completed behavior must remain unchanged:

- Create Sale
- Cash Payment
- QR Payment
- Cancel Sale
- Retry/error handling and idempotency
- Expiry handling
- Thank You/reset flow
- Duplicate-submission protection
- Existing BE API contract

If an existing test exposes a behavioral difference, treat it as a regression. Do not change the test merely to accept new behavior.

## Validation

Run the repository's relevant automated tests and production build. At minimum, if supported by the current package scripts/toolchain, run:

```bash
npm test -- --watch=false
ng build
```

If implementation/build/tests fail unexpectedly or diagnosis is required, invoke and follow `.agents/skills/debug-mantra/SKILL.md` before speculative fixes.

## Deliverable

At the end, report:

- Exact files created/changed/deleted.
- Final model ownership/split.
- Confirmation that API/type shapes were preserved.
- Tests/build commands executed and their results.
- Any regression found and how it was resolved.
- Any remaining risk or blocker.

Do not start R-002. Stop after R-001 is implemented and validated.