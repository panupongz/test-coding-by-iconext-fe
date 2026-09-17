# Frontend Test Script + Result — POS

## 1. Purpose
Define the functional/integration regression script for the Angular v14 POS frontend and record the evidence already established by the implementation checklist.

## 2. Test Basis
- `docs/IMPLEMENTATION_CHECKLIST.md` T-001 through T-008.
- Backend API source of truth under `/api/v1`.
- Angular automated component/integration tests in the repository.

## 3. Result Convention
- **PASS (Checklist Evidence)**: the implementation checklist records the relevant test/final-gate criterion as completed.
- **Manual Pending**: requires an operator/browser observation not independently recorded in this document.
- This document does not fabricate timestamps, screenshots, browser versions, or command output that were not captured here.

## 4. Test Scripts and Recorded Results
| ID | Scenario | Steps | Expected Result | Recorded Result |
|---|---|---|---|---|
| FE-TC-001 | Product code submission | Enter a valid product code and press Enter | Create-sale request is issued once and active sale/product/total are displayed | PASS (Checklist Evidence) |
| FE-TC-002 | Duplicate create protection | Submit a valid code, then attempt another submission while loading | Conflicting duplicate create action is blocked | PASS (Checklist Evidence) |
| FE-TC-003 | Invalid/product-not-found recovery | Enter invalid/unknown product code | Safe recoverable validation/error state is shown; POS is not stuck | PASS (Checklist Evidence) |
| FE-TC-004 | Select Cash | Create a valid sale and select Cash | Cash controls become available for active sale | PASS (Checklist Evidence) |
| FE-TC-005 | Cash denomination accumulation | Press +100 repeatedly, then +500/+1,000 | Received amount accumulates deterministically | PASS (Checklist Evidence) |
| FE-TC-006 | Cash insufficient amount | Keep received amount below total | Confirm remains unavailable | PASS (Checklist Evidence) |
| FE-TC-007 | Cash exact payment | Make received amount equal total and confirm | Shared payment endpoint is called and payment can reach PAID | PASS (Checklist Evidence) |
| FE-TC-008 | Cash overpayment/change | Make received amount greater than total | Correct non-negative change is displayed | PASS (Checklist Evidence) |
| FE-TC-009 | Duplicate payment protection | Confirm payment and attempt another action while submitting | Duplicate payment is blocked | PASS (Checklist Evidence) |
| FE-TC-010 | Select QR | Create valid sale and select QR | QR payment UI/state is displayed | PASS (Checklist Evidence) |
| FE-TC-011 | Confirm QR | Confirm QR payment | Shared payment endpoint is used with `amount_received = total` | PASS (Checklist Evidence) |
| FE-TC-012 | Successful completion | Complete Cash or QR payment to PAID | Thank You state/dialog is displayed | PASS (Checklist Evidence) |
| FE-TC-013 | Automatic reset | Observe POS after successful PAID state | Thank You remains ~5 seconds, transaction clears, POS returns ready | PASS (Checklist Evidence) |
| FE-TC-014 | Explicit cancellation | Cancel an active PENDING sale | Backend cancel endpoint is used and UI reflects confirmed result | PASS (Checklist Evidence) |
| FE-TC-015 | Cancellation error | Force/reproduce cancel API failure | UI exposes safe retry/recovery and does not fake cancellation success | PASS (Checklist Evidence) |
| FE-TC-016 | Expired/unavailable sale | Reproduce expired/not-found active sale | UI indicates unavailable/expired state and allows safe new transaction | PASS (Checklist Evidence) |
| FE-TC-017 | Payment API/business error | Reproduce payment failure | POS remains consistent and recoverable; no duplicate transaction | PASS (Checklist Evidence) |
| FE-TC-018 | Reset transaction | Use reset/new transaction action where allowed | Current UI/state clears and product entry becomes ready | PASS (Checklist Evidence) |
| FE-TC-019 | Keyboard/focus flow | Complete/recover transaction using product entry flow | Product-code entry remains predictable and focus returns appropriately | PASS (Checklist Evidence) |
| FE-TC-020 | Responsive UI | Exercise project-supported viewport sizes | Core POS flow remains usable without changing business behavior | PASS (Checklist Evidence) |
| FE-TC-021 | Three-endpoint integration | Run complete flow covering create, payment, cancel | All three FE-facing backend endpoints integrate without invented contract | PASS (Checklist Evidence) |
| FE-TC-022 | Automated regression/build | Run relevant automated tests and production/release build | Relevant tests and build pass with no unresolved final-gate finding | PASS (Checklist Evidence) |

## 5. API Coverage Matrix
| Endpoint | Positive Path | Negative/Recovery Path | Status |
|---|---|---|---|
| `POST /api/v1/sales` | Create valid sale | validation/not-found/API error | Covered |
| `POST /api/v1/sales/:sale_id/payment` | Cash + QR payment | payment/business/invalid-state error | Covered |
| `POST /api/v1/sales/:sale_id/cancel` | Cancel active sale | cancel/expiry/unavailable recovery | Covered |

## 6. Requirement Traceability
| Requirement | Test Cases |
|---|---|
| Product/Create Sale | FE-TC-001–003 |
| Cash | FE-TC-004–009 |
| QR | FE-TC-010–011 |
| Completion/Reset | FE-TC-012–013, FE-TC-018 |
| Cancel/Error/Expiry | FE-TC-014–017 |
| UX/Responsive | FE-TC-019–020 |
| Integration/Regression | FE-TC-021–022 |

## 7. Release Evidence Note
The project checklist records T-001 through T-008 as DONE, including relevant tests/builds and Senior Review/Final Gate completion. For formal UAT or audited release evidence, attach the actual command output, environment/version details, screenshots where required, tester name, execution date, and defect references to a release-specific test run rather than inventing those values retrospectively.
