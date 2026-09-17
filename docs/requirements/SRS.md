# Software Requirements Specification (SRS) — Frontend POS

## 1. Purpose
This document defines the frontend software requirements for the Angular v14 POS application. The Backend API contract is the source of truth for transaction behavior.

## 2. Scope
The frontend supports a single-product POS transaction flow: product-code entry, sale creation, cash or QR payment, cancellation/error/expiry recovery, payment completion, and reset for the next transaction.

## 3. System Context
- Frontend: Angular v14.
- Backend integration prefix: `/api/v1`.
- Business rule: 1 Sale = 1 Product = quantity 1.
- API host/base URL must be environment/configuration driven.

## 4. Functional Requirements

### FR-001 Product Code Entry
- The user shall be able to enter a product code and submit it with Enter.
- The frontend shall validate the supported product-code format before submission.
- Duplicate create-sale submissions shall be prevented while a request is active.

### FR-002 Create Sale
- The frontend shall call `POST /api/v1/sales` using the entered product code.
- Product information and price/total displayed by the frontend shall come from the backend response.
- The frontend shall maintain exactly one active sale at a time.

### FR-003 Payment Method Selection
- After a valid sale is created, the user shall be able to select Cash or QR payment.
- Payment controls shall not be enabled when there is no valid active sale.

### FR-004 Cash Payment
- The user shall be able to add `100`, `500`, and `1,000` repeatedly.
- The frontend shall accumulate `amount_received` deterministically.
- Cash confirmation shall be unavailable while `amount_received < total`.
- The frontend shall display change when `amount_received > total`.
- Payment shall use `POST /api/v1/sales/:sale_id/payment`.

### FR-005 QR Payment
- Selecting QR shall display the QR payment state/UI.
- QR confirmation shall use `POST /api/v1/sales/:sale_id/payment`.
- QR confirmation shall submit `amount_received = total` according to the agreed backend contract.

### FR-006 Successful Payment
- When the sale reaches `PAID`, the frontend shall display a Thank You state/dialog.
- The completed state shall remain visible for approximately five seconds.
- The frontend shall then clear the transaction and return to a ready state.

### FR-007 Cancellation
- Where backend cancellation is required, the frontend shall call `POST /api/v1/sales/:sale_id/cancel`.
- The frontend shall not represent a backend cancellation as successful unless the backend flow confirms it.

### FR-008 Error and Expiry Handling
- Product-not-found, validation, API/business, invalid-state, cancellation, and expiry scenarios shall have recoverable user-facing states.
- Technical implementation details shall not be unnecessarily exposed to users.
- Retry/reset behavior shall not duplicate transactions.

### FR-009 Reset
- The user shall be able to clear/reset the POS when allowed by transaction state.
- After reset, product entry shall be ready for the next transaction.

## 5. API Requirements
| Method | Endpoint | FE Purpose |
|---|---|---|
| POST | `/api/v1/sales` | Create sale |
| POST | `/api/v1/sales/:sale_id/payment` | Cash/QR payment |
| POST | `/api/v1/sales/:sale_id/cancel` | Cancel active sale |

The frontend shall not invent additional endpoints or silently change backend contract semantics.

## 6. Non-Functional Requirements
- Angular v14-compatible implementation.
- Strict, explicit TypeScript types for API/state structures where applicable.
- Components focus on presentation/orchestration; reusable API/business behavior belongs in services/facades.
- Environment-specific backend values must not be hard-coded in components.
- Observable subscriptions must have an appropriate lifecycle strategy.
- UI shall explicitly represent loading, disabled, success, error, cancellation, expiry, and reset-ready states.
- Core POS flow shall remain usable across the viewport sizes supported by the project.
- Basic keyboard focus and accessibility behavior shall be preserved.
- Relevant automated tests and production/release build shall pass before release.

## 7. Traceability
| Requirement Area | Implementation Task |
|---|---|
| Foundation/configuration | T-001 |
| POS UI | T-002 |
| Create Sale | T-003 |
| Cash Payment | T-004 |
| QR Payment | T-005 |
| Error/Cancel/Expiry | T-006 |
| Responsive/UX | T-007 |
| Integration/Regression | T-008 |

## 8. Acceptance Baseline
The frontend is accepted when T-001 through T-008 are complete, the three required backend endpoints are integrated, automated tests/builds pass, and the implemented flow remains consistent with the backend source of truth.
