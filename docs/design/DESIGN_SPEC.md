# Frontend Design Specification — POS

## 1. Objective
Describe the implemented Angular v14 frontend design, responsibilities, state flow, API boundaries, and UI behavior for the POS feature.

## 2. Architectural Principles
- Angular components own presentation, UI events, and lightweight orchestration.
- Feature/application logic and transaction coordination are delegated to services/facades.
- API access is centralized rather than scattered through templates/components.
- API DTOs and frontend view/state models are explicitly typed.
- Backend contract is authoritative; frontend code must not invent backend behavior.
- Environment-dependent API configuration is externalized.

## 3. High-Level Structure
```text
src/app/
├── core/
│   └── models/                 # shared API/domain types
└── features/
    └── pos/
        ├── mappers/            # API → frontend model mapping
        ├── models/             # POS state/view models
        ├── services/           # POS API/application/facade logic
        ├── pos-error-messages.ts
        ├── pos.component.ts
        ├── pos.component.html
        ├── pos.component.scss
        ├── pos.component.spec.ts
        └── pos.integration.spec.ts
```

## 4. Component Design
`PosComponent` is the primary presentation/orchestration component. It exposes state from `PosFacadeService`, handles product-code form interaction, payment method selection, cash denomination actions, payment confirmation, reset, and UI focus behavior.

Key design characteristics:
- `ChangeDetectionStrategy.OnPush`.
- Reactive `FormControl` for product-code input.
- Product-code validation is explicit.
- Subscription lifecycle is bounded with `takeUntil` and component destruction.
- UI focus returns to product entry after recoverable clearing/error flows.
- Thank You dialog receives focus on successful payment.

## 5. State Design
The POS maintains distinct sale, payment, and cancellation state through the facade.

Typical happy-path state flow:
```text
READY
  ↓ product code + Enter
CREATE SALE LOADING
  ↓ success
ACTIVE SALE / PENDING
  ↓ choose CASH or QR
PAYMENT READY
  ↓ confirm
PAYMENT SUBMITTING
  ↓ backend PAID
THANK YOU
  ↓ ~5 seconds
RESET / READY
```

Recovery flow:
```text
API / BUSINESS / NOT-FOUND / EXPIRED ERROR
  ↓ map to safe UI state
RETRY, CANCEL, or RESET as permitted
  ↓
READY or ACTIVE SALE
```

## 6. UI Design
The POS screen contains these logical regions:
1. Product-code entry.
2. Product/sale summary.
3. Payment method controls.
4. Cash denomination/received/change controls when Cash is selected.
5. QR presentation/confirmation when QR is selected.
6. Transaction status and error/recovery messaging.
7. Thank You completion dialog/state.

Loading and submitting states disable conflicting actions to reduce duplicate requests.

## 7. Product Code Design
- Input is required.
- Current frontend format validation accepts a `P` followed by three digits, allowing surrounding whitespace.
- Submission occurs only when the control and transaction state permit it.
- On create-sale start/success the input is disabled while the transaction owns the current sale.

## 8. API Integration Design
| Operation | Endpoint | Design Responsibility |
|---|---|---|
| Create Sale | `POST /api/v1/sales` | Create one sale from product code |
| Payment | `POST /api/v1/sales/:sale_id/payment` | Shared Cash/QR payment operation |
| Cancel | `POST /api/v1/sales/:sale_id/cancel` | Backend-authoritative cancellation |

The `sale_id` used for payment/cancellation comes from the active sale state. Cash and QR are payment methods, not separate backend resources.

## 9. Cash Design
- Allowed quick-add values: 100, 500, 1,000.
- Values can be applied repeatedly.
- `amount_received` accumulates in frontend transaction state.
- Confirm becomes valid only when received amount covers total.
- `changeDue = max(0, amountReceived - total)`.
- Duplicate payment submissions are blocked while submitting.

## 10. QR Design
- QR selection switches the payment UI into QR mode.
- Confirmation uses the same payment endpoint as Cash.
- `amount_received` is the current sale total for QR confirmation.
- Frontend does not fabricate backend QR behavior/data that is not supported by contract.

## 11. Completion Design
When payment succeeds and the sale is `PAID`:
- Thank You state becomes visible.
- Focus is moved to the Thank You dialog for accessibility/clarity.
- Completion remains for approximately five seconds.
- Transaction state and product input are cleared.
- Product input is enabled and focused for the next sale.

## 12. Error and Cancellation Design
The frontend distinguishes recoverable transaction conditions rather than treating all failures identically. User-facing messages are separated from raw transport/technical details. Backend cancellation is invoked when required; local state must not pretend cancellation succeeded when backend cancellation did not succeed.

## 13. Responsive and Accessibility Design
- Layout is responsive within the project-supported viewports.
- Keyboard-first product-code flow is preserved.
- Disabled/loading states are visible and functional.
- Focus management supports recovery and successful completion.
- Templates remain declarative; non-trivial business/state decisions stay in TypeScript/services.

## 14. Test Design
Testing is split between component/unit behavior and POS integration coverage. Important coverage includes product submission, Cash, QR, duplicate-action guards, error/expiry/cancel recovery, successful `PAID` state, Thank You behavior, and reset.

## 15. Design Traceability
This design implements the scope established by T-001 through T-008 in `docs/IMPLEMENTATION_CHECKLIST.md` and must remain synchronized with the SRS and backend API source of truth.
