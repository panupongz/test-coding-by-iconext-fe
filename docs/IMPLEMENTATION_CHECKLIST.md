# FE Implementation Checklist

## Project

- Repository: `panupongz/test-coding-by-iconext-fe`
- Implementation branch: `feature/implement`
- Base branch: `main`
- Frontend: Angular v14
- Backend is the Source of Truth.
- FE must follow the existing BE contract and must not require BE changes.
- Business rule: **1 Sale = 1 Product = quantity 1**.

## UI Flow / Source of Truth

1. User enters a product code on the POS screen and presses `Enter`.
2. FE creates a sale through the existing BE API.
3. FE displays the selected product and price returned by BE.
4. User chooses a payment method.
   - **Cash**
     - Support `+100`, `+500`, `+1,000` actions.
     - Each action is repeatable and accumulates the received amount.
     - Payment can be confirmed only when `amount_received >= total`.
     - Display change when the received amount is greater than the total.
   - **QR**
     - Display the QR payment UI.
     - On confirmation, send `amount_received = total` according to the existing BE contract.
5. When the sale reaches `PAID`, show a **Thank You** popup.
6. Keep the Thank You state for approximately 5 seconds, then clear the transaction and reset the POS for the next sale.
7. FE must handle product-not-found, API/business errors, invalid states, and expired sale/session scenarios cleanly.

## FE ↔ BE API Integration Contract

The Backend implementation on `panupongz/test-coding-by-iconext-be` branch `feature/implement` is the API Source of Truth. The BE mounts its API router under `/api/v1` and currently exposes **3 FE-facing sale endpoints**. FE must integrate these exact routes and must not invent, rename, split, or require additional BE endpoints unless the BE contract is explicitly changed later.

| # | Method | Endpoint | Purpose | Primary FE Task(s) |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/sales` | Create a sale from the entered product code | T-003, verified again in T-008 |
| 2 | `POST` | `/api/v1/sales/:sale_id/payment` | Submit payment; Cash and QR use the same payment endpoint | T-004, T-005, verified again in T-008 |
| 3 | `POST` | `/api/v1/sales/:sale_id/cancel` | Cancel the active sale when cancellation/expiry recovery requires the BE cancel flow | T-006, verified again in T-008 |

### API Integration Rules

- The API base URL must come from Angular environment/configuration; do not hard-code host/port in components.
- Keep `/api/v1` and endpoint paths centralized in the FE API/service layer where practical.
- Components must not call `HttpClient` directly when the call belongs to the reusable sale/payment API service.
- Define explicit TypeScript request/response/error types from the actual BE contract. Do not guess fields that BE does not return.
- `:sale_id` must use the sale identifier returned/maintained from the active BE sale flow.
- Cash and QR are **payment methods on the same payment endpoint**, not separate BE endpoints.
- For QR confirmation, FE sends `amount_received = total` according to the agreed UI flow and actual BE payment contract.
- FE must preserve BE status codes, validation/business-error semantics, and sale-state rules when mapping them to user-facing states.
- Cancellation/expiry handling must use `POST /api/v1/sales/:sale_id/cancel` when the BE flow requires an explicit cancellation; FE must not simulate a successful BE cancellation locally.
- T-008 must integration-test all 3 endpoints used by the completed FE flow, including relevant success and negative paths.
- If implementation discovers that the current BE contract differs from this section, stop and verify the BE Source of Truth before changing FE behavior; do not silently compensate with an invented FE contract.

## Engineering Standard — Angular v14 / Senior Developer Level

These rules apply to **every task**, not only T-001.

- Use Angular v14-compatible APIs and patterns only.
- Keep TypeScript strictly typed; avoid `any` unless there is a documented, unavoidable reason.
- Keep components focused on presentation/orchestration; move API and reusable business logic into appropriate services.
- Define explicit interfaces/types for API request, response, view-model, state, and error structures where applicable.
- Use RxJS deliberately and prevent unmanaged subscriptions/memory leaks.
- Keep state transitions deterministic and avoid duplicated sources of truth.
- Do not hard-code backend URLs or environment-specific configuration in components.
- Reuse existing project conventions before introducing new abstractions or dependencies.
- Do not change BE contracts or invent FE-side business rules that conflict with BE.
- Handle loading, success, empty, error, disabled, and expiry states explicitly where applicable.
- Keep templates readable; avoid complex business logic in HTML templates.
- Preserve separation of concerns, maintainability, readability, and testability expected from production code reviewed by a Senior Angular developer.
- Do not perform unrelated refactors while implementing a scoped task.
- Tests must cover important behavior introduced or changed by the task.
- Build/tests relevant to the changed scope must pass before a task can be closed.

## Angular v14 Architecture & File Responsibility

These architecture rules are part of the Senior Developer standard and apply to **T-001 through T-008**. Separate code by responsibility when the separation improves clarity, reuse, testability, or maintenance. **Do not create extra layers/files only for the sake of having them.** Follow the repository's existing conventions unless they conflict with the requirements below.

- **Components** — own presentation, template interaction, UI events, and lightweight orchestration. Components must not become API/data-access layers or contain large reusable business logic.
- **Services** — own HTTP/API access, reusable application/business logic, shared state where appropriate, and coordination that does not belong to a single view. API calls must not be scattered directly across presentation components.
- **Models / Interfaces / Types** — explicitly define API request/response DTO shapes, domain/view models, state, payment types, and error structures where useful. Avoid duplicating the same data shape across files.
- **Pipes** — use for reusable, presentation-oriented transformations. Prefer pure pipes by default. Do not hide side effects, API calls, or business workflows inside pipes.
- **Directives** — use for reusable DOM/UI behavior that does not warrant a standalone component. Keep directives focused and avoid embedding unrelated business logic.
- **HTTP Interceptors** — use for genuinely cross-cutting HTTP concerns such as shared headers, authentication when applicable, correlation/request handling, or normalized transport-level behavior. Do not put feature-specific business decisions in an interceptor.
- **Route Guards** — use only when route access/navigation rules are required. Guards should coordinate access decisions, not become general-purpose business services.
- **Modules / Routing** — organize features and routes consistently with Angular v14 and the existing project structure. Preserve clear feature boundaries and avoid unnecessary module fragmentation.
- **Shared Components** — extract reusable UI only when it has a clear reusable contract. Keep feature-specific UI inside the feature when reuse is not justified.
- **Utilities / Helpers** — use for small reusable pure functions that do not require Angular dependency injection. Do not turn helpers into hidden state containers.
- **Constants / Configuration** — keep reusable constants and configuration centralized where appropriate. Environment-dependent values belong in Angular environment/configuration rather than components.
- **Forms** — use Angular forms consistently with the existing project. Validation rules and error states must be explicit, typed where practical, and not duplicated unnecessarily between template and component logic.
- **RxJS / Lifecycle** — prefer declarative Observable flows where practical; avoid nested subscriptions and unmanaged subscriptions. Any manual subscription must have a clear lifecycle/unsubscribe strategy compatible with Angular v14.
- **State** — maintain a clear source of truth for the active sale/payment flow. Do not duplicate mutable state across multiple components/services without a deliberate synchronization design.
- **Templates** — keep templates declarative and readable. Complex calculations, data mapping, API logic, and non-trivial business rules belong in TypeScript rather than template expressions.
- **Controller terminology** — Angular does not require a separate MVC-style `Controller` layer for this project. Do not introduce controller files merely to mimic Spring/Express/MVC; UI orchestration belongs in components and reusable/application logic belongs in services or other appropriate Angular constructs.

### Architecture Decision Rule

Before creating a new Component, Service, Pipe, Directive, Guard, Interceptor, Module, model/type file, or helper, ask:

1. Does it have a distinct responsibility?
2. Will the separation improve readability, reuse, testing, or maintenance?
3. Is this consistent with the existing Angular v14 project conventions?
4. Can the same result be achieved more simply without mixing responsibilities?

If separation adds complexity without a clear benefit, keep the implementation simpler. Senior-level architecture means **appropriate separation**, not the maximum number of files.

## Conditional Debugging — `debug-mantra`

The project-local skill is located at `.agents/skills/debug-mantra/SKILL.md`. It is a **conditional debugging gate** for every implementation task T-001 through T-008; it is not an extra mandatory prompt when implementation and tests pass normally.

Invoke/apply `debug-mantra` whenever implementation, build, test, runtime, or integration work enters an actual debugging session, including when:

- a build or automated test fails unexpectedly;
- the application throws a runtime error or displays broken behavior;
- an API/integration flow fails or returns an unexpected result;
- the observed behavior does not match the task acceptance criteria and the root cause is not already proven;
- a first attempted fix fails or the same defect reappears;
- investigation requires diagnosis rather than a straightforward implementation change.

When triggered, follow `.agents/skills/debug-mantra/SKILL.md` as the Source of Truth for the debugging procedure. In particular, do not guess-and-patch: establish reproducibility, trace the fail path, falsify hypotheses, and cross-reference debugging breadcrumbs before declaring the root cause/fix proven.

A debug session must not bypass the task's normal quality gates. After the issue is fixed, re-run the relevant test/build/reproduction before continuing to Senior Review / Final Gate.

Normal flow:

`Implement → Test → Senior Review / Final Gate → Prompt Audit → Checklist → DONE`

Failure/debug flow:

`Implement → Test/Run fails → debug-mantra → Reproduce → Diagnose → Fix → Re-test → Senior Review / Final Gate → Prompt Audit → Checklist → DONE`

If debugging requires additional prompts, preserve those prompts verbatim under the task's prompt audit. These debugging prompts are conditional and therefore do **not** change the default target of two prompts for a task that passes without debugging.

## Standard Task Workflow

Each task uses a minimum of **2 prompts**:

1. **Implementation Prompt** — implement the scoped task and run relevant validation/tests.
2. **Senior Review + Final Gate Prompt** — independently review the implementation against the task acceptance criteria, Angular v14 senior standards, architecture/file-responsibility rules, BE contract, tests, and regression risk.

If implementation/test/review exposes a defect requiring diagnosis, invoke the `debug-mantra` conditional workflow before proposing speculative fixes. After fixing, re-run the relevant tests/final gate. Extra prompts are allowed only when needed for fixes or investigation; the default target remains two prompts per task.

For every task:

`Implement → Test → [if debugging is required: debug-mantra → Fix → Re-test] → Senior Review / Final Gate → Prompt Audit → Checklist → DONE`

A task must not be marked `DONE` until its acceptance criteria, tests, review/final gate, prompt audit, and checklist update are complete.

## Prompt Audit Rule

- Preserve the prompts used for each task verbatim under `docs/prompts/`.
- Recommended naming: `docs/prompts/T-###-*.md`.
- Record the implementation prompt and the Senior Review / Final Gate prompt.
- If follow-up/fix/debugging prompts are required, preserve those verbatim as well.
- Record implementation summary, changed files, tests/commands executed, review findings, debugging evidence when applicable, fixes, and final status.
- Do not silently rewrite a prompt after it has been used.

---

# Task Checklist

## T-001 — Angular 14 Foundation

**Status:** `DONE`

### Goal
Establish and verify the Angular v14 frontend foundation required for the POS implementation.

### Scope
- Inspect the existing Angular project structure and dependencies.
- Verify Angular v14 compatibility.
- Establish/verify environment-based API configuration.
- Establish core typing/model/service conventions needed by later tasks.
- Verify routing/module/component organization without unnecessary restructuring.
- Ensure the project can install/build/test with the intended toolchain.

### Acceptance Criteria
- [x] Project is confirmed to be Angular v14-compatible.
- [x] API base configuration is environment-driven.
- [x] Core FE structure follows the Senior Developer standards above.
- [x] Architecture/file responsibilities follow the Angular v14 Architecture & File Responsibility rules above.
- [x] API configuration is ready for the `/api/v1` BE contract without hard-coded host/port in components.
- [x] No unnecessary dependency or architecture rewrite is introduced.
- [x] Relevant build/tests pass.
- [x] Implementation prompt is preserved verbatim.
- [x] Senior Review / Final Gate passes.
- [x] Prompt audit and checklist are updated.

---

## T-002 — POS UI

**Status:** `DONE`

### Goal
Build the main POS UI and interaction shell used by the sale flow.

### Scope
- Product-code input.
- Enter-key interaction.
- Product/sale summary area.
- Payment-method area.
- Loading/disabled/reset-ready UI states.
- UI structure suitable for later cash, QR, error, and expiry tasks.

### Acceptance Criteria
- [x] Product code can be entered and submitted using `Enter`.
- [x] UI has clear product/sale/payment sections.
- [x] Loading and disabled states prevent duplicate unintended actions.
- [x] UI can reset cleanly for a new transaction.
- [x] No BE contract is invented or changed.
- [x] Relevant tests pass.
- [x] Implementation prompt is preserved verbatim.
- [x] Senior Review / Final Gate passes.
- [x] Prompt audit and checklist are updated.

---

## T-003 — Create Sale

**Status:** `TODO`

### Goal
Connect product-code submission to the existing BE create-sale flow.

### Scope
- Integrate `POST /api/v1/sales` according to the actual BE contract.
- Enforce the FE assumption from the Source of Truth: `1 Sale = 1 Product = quantity 1`.
- Map typed API responses into FE state/view models.
- Display product and total/price returned by BE.
- Prevent duplicate create-sale submissions while a request is active.

### Acceptance Criteria
- [ ] Valid product-code submission calls `POST /api/v1/sales` and creates exactly one sale through BE.
- [ ] FE does not implement multi-product or quantity-changing behavior.
- [ ] Product and price/total come from the BE response/source of truth.
- [ ] Duplicate submission is guarded appropriately.
- [ ] Request/response/error types are explicit and match the actual BE contract.
- [ ] Relevant tests pass.
- [ ] Implementation prompt is preserved verbatim.
- [ ] Senior Review / Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

## T-004 — Cash Payment

**Status:** `TODO`

### Goal
Implement the cash-payment interaction and submit it through the existing BE payment contract.

### Scope
- `+100`, `+500`, `+1,000` repeatable cash actions.
- Accumulated `amount_received`.
- Confirm-payment eligibility.
- Change calculation/display.
- Integrate `POST /api/v1/sales/:sale_id/payment` for cash payment.
- Payment submission and duplicate-action protection.

### Acceptance Criteria
- [ ] `+100`, `+500`, and `+1,000` can each be pressed repeatedly.
- [ ] Received amount accumulates deterministically.
- [ ] Confirm is unavailable while `amount_received < total`.
- [ ] Change is displayed correctly when `amount_received > total`.
- [ ] Cash payment uses `POST /api/v1/sales/:sale_id/payment` and the existing BE contract without changing BE.
- [ ] Duplicate payment submission is guarded.
- [ ] Relevant unit/integration tests pass.
- [ ] Implementation prompt is preserved verbatim.
- [ ] Senior Review / Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

## T-005 — QR Payment

**Status:** `TODO`

### Goal
Implement QR payment using the existing BE payment contract.

### Scope
- QR payment selection/state.
- QR presentation based on available contract/data.
- Confirmation behavior.
- Integrate the same `POST /api/v1/sales/:sale_id/payment` endpoint used by Cash.
- Submit `amount_received = total` when confirming QR payment.
- Loading/duplicate-action protection.

### Acceptance Criteria
- [ ] QR payment UI is shown when QR is selected.
- [ ] QR confirmation calls `POST /api/v1/sales/:sale_id/payment` according to the existing BE contract.
- [ ] `amount_received` equals the sale `total` for QR confirmation.
- [ ] FE does not invent a separate QR payment endpoint.
- [ ] Duplicate payment submission is guarded.
- [ ] FE does not fabricate unsupported BE behavior/data.
- [ ] Relevant tests pass.
- [ ] Implementation prompt is preserved verbatim.
- [ ] Senior Review / Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

## T-006 — Sale / Error / Expiry Handling

**Status:** `TODO`

### Goal
Make the POS flow resilient to expected API, business, invalid-state, not-found, cancellation, and expiry scenarios.

### Scope
- Product not found.
- Create-sale/payment API errors.
- Invalid or unexpected sale/payment state.
- Integrate `POST /api/v1/sales/:sale_id/cancel` where the BE cancellation/expiry flow requires explicit cancellation.
- Expired sale/session handling according to BE behavior.
- Recoverable UI/reset behavior.
- Safe user-facing error messages.

### Acceptance Criteria
- [ ] Product-not-found has a clear recoverable UI state.
- [ ] API/business errors do not leave the POS stuck in an inconsistent state.
- [ ] Explicit cancellation uses `POST /api/v1/sales/:sale_id/cancel` according to the BE contract.
- [ ] Expiry is handled according to the BE contract/state and does not fake a successful cancellation locally.
- [ ] Retry/reset behavior cannot accidentally duplicate a transaction.
- [ ] Technical details are not unnecessarily exposed to the user.
- [ ] Relevant negative-path tests pass.
- [ ] Implementation prompt is preserved verbatim.
- [ ] Senior Review / Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

## T-007 — Responsive & UX

**Status:** `TODO`

### Goal
Finalize responsive behavior and transaction UX without changing business rules.

### Scope
- Responsive POS layout.
- Clear focus/keyboard behavior for product-code entry.
- Button/input disabled and loading feedback.
- Payment-state clarity.
- Accessibility basics appropriate to the existing project.
- Consistent reset/ready state.

### Acceptance Criteria
- [ ] Core POS flow remains usable across the target viewport sizes supported by the project.
- [ ] Keyboard/product-code flow is clear and predictable.
- [ ] Loading/disabled states are visually clear.
- [ ] UX changes do not alter BE/business rules.
- [ ] No unrelated visual/architecture rewrite is introduced.
- [ ] Relevant tests/build pass.
- [ ] Implementation prompt is preserved verbatim.
- [ ] Senior Review / Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

## T-008 — Testing + Final Integration

**Status:** `TODO`

### Goal
Validate the complete FE flow against the existing BE contract and close integration/regression gaps.

### Scope
- End-to-end integration of T-001 through T-007.
- Verify all 3 FE-facing BE endpoints: create sale, payment, and cancel.
- Create-sale → payment → PAID flow.
- Cash and QR paths through the shared payment endpoint.
- Error/cancel/expiry/reset paths.
- Thank You popup and automatic reset.
- Regression/build/test verification.

### Acceptance Criteria
- [ ] `POST /api/v1/sales` is integrated and verified.
- [ ] `POST /api/v1/sales/:sale_id/payment` is integrated and verified for both Cash and QR.
- [ ] `POST /api/v1/sales/:sale_id/cancel` is integrated and verified for the applicable cancellation/expiry flow.
- [ ] Product code → Create Sale → product/price → payment works as designed.
- [ ] Cash path works, including repeated denomination buttons, eligibility, and change.
- [ ] QR path works with `amount_received = total`.
- [ ] `PAID` displays the Thank You popup.
- [ ] Thank You state remains for approximately 5 seconds and then resets the POS.
- [ ] Product-not-found/error/cancel/expiry paths are covered.
- [ ] No FE behavior requires a BE contract change.
- [ ] Relevant automated tests pass.
- [ ] Production/release build passes where supported by the repository.
- [ ] No unresolved Senior Review findings remain.
- [ ] Implementation/integration prompt is preserved verbatim.
- [ ] Final Gate passes.
- [ ] Prompt audit and checklist are updated.

---

# Overall Progress

| Task | Description | Status |
|---|---|---|
| T-001 | Angular 14 Foundation | DONE |
| T-002 | POS UI | DONE |
| T-003 | Create Sale | TODO |
| T-004 | Cash Payment | TODO |
| T-005 | QR Payment | TODO |
| T-006 | Sale / Error / Expiry Handling | TODO |
| T-007 | Responsive & UX | TODO |
| T-008 | Testing + Final Integration | TODO |

## Completion Rule

The FE implementation is complete only when T-001 through T-008 are `DONE`, all required prompt audits are preserved, relevant tests/builds pass, all 3 FE-facing BE endpoints required by the flow are integrated and verified, the final integration flow matches the BE Source of Truth, and no unresolved Final Gate findings remain.
