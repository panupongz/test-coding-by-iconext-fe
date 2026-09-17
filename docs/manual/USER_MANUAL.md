# User Manual — POS Frontend

## 1. Overview
This guide explains how an operator uses the POS frontend to create a one-product sale and accept Cash or QR payment.

## 2. Before You Start
- Open the POS application in a supported browser/device.
- Confirm the frontend can reach the backend service.
- Keep the product code available for the item being sold.
- Each transaction supports one product with quantity 1.

## 3. Create a Sale
1. Place the cursor in the product-code field.
2. Enter the product code.
3. Press **Enter**.
4. Wait while the system creates the sale.
5. Confirm that the product information and total are displayed before accepting payment.

Do not repeatedly submit the same product while the system is loading. The interface disables conflicting actions during processing.

## 4. Accept Cash Payment
1. Select **Cash** as the payment method.
2. Add the amount received using the `+100`, `+500`, and/or `+1,000` buttons.
3. The buttons can be pressed repeatedly until the received amount is correct.
4. If the received amount is below the sale total, payment confirmation remains unavailable.
5. If the received amount is greater than the total, check the displayed change.
6. Confirm the payment when the amount is sufficient.
7. Wait for the successful-payment/Thank You state.

## 5. Accept QR Payment
1. Select **QR** as the payment method.
2. The QR payment area will be displayed.
3. Follow the on-screen QR payment process.
4. Confirm the QR payment when appropriate.
5. Wait for the successful-payment/Thank You state.

The frontend uses the sale total as the received amount when confirming the QR payment according to the system contract.

## 6. Successful Payment
After a successful payment:
1. The POS shows a **Thank You** state/dialog.
2. The completed state remains visible for approximately five seconds.
3. The transaction is cleared automatically.
4. The product-code field becomes ready for the next sale.

Avoid trying to submit the same completed sale again.

## 7. Cancel a Sale
When an active sale can be cancelled:
1. Use the transaction cancellation action shown by the POS.
2. Wait for the system to finish the cancellation request.
3. When cancellation is confirmed, start a new transaction as needed.

If cancellation fails, use the retry/recovery action shown by the interface rather than assuming the sale was cancelled.

## 8. Product Not Found / Invalid Product Code
If the product code is invalid or the product cannot be found:
1. Read the message shown by the POS.
2. Check the product code.
3. Correct/re-enter the code when the input becomes available.
4. Press Enter to try again.

## 9. Payment or API Error
If an error occurs during payment:
- Do not immediately create another sale for the same transaction.
- Read the status/error message displayed by the POS.
- Use the available retry, cancel, reset, or new-transaction action according to the screen state.
- If the application reports that the sale is already paid, do not attempt to pay it again.

## 10. Expired or Unavailable Sale
If the sale has expired, was cancelled, or is no longer available:
1. The POS displays the corresponding unavailable/expired state.
2. Use **Start New Transaction** (or the equivalent action shown by the screen).
3. Re-enter the product code for the new transaction if required.

## 11. Reset / Start a New Transaction
When reset is permitted, use the reset/new-transaction action to clear the current POS state. After clearing, the product-code input is enabled and focused so the next transaction can begin.

## 12. Operator Checklist
Before moving to the next customer/transaction, verify that:
- The previous transaction reached the intended final state.
- A successful payment displayed the Thank You state.
- The POS returned to the ready state.
- The product-code field is ready for a new product.

## 13. Troubleshooting
| Situation | Recommended Action |
|---|---|
| Product cannot be submitted | Check product-code format and wait for any current request to finish |
| Product not found | Verify/re-enter the product code |
| Cash confirm disabled | Ensure received amount is at least the total |
| Payment fails | Follow the on-screen recovery/retry state; avoid duplicate payment |
| Sale already paid | Do not pay again; start a new transaction when allowed |
| Sale expired/cancelled/unavailable | Start a new transaction |
| Cancel fails | Retry cancellation/recovery using the displayed action |
| POS does not return ready after normal flow | Use the available reset/new-transaction action; if still blocked, report the issue with the displayed status/error |

## 14. Screenshot Placeholders for Formal Delivery
For a customer-facing release package, screenshots can be added for these key states without changing the operating instructions:
- Ready/product-code screen.
- Active sale/product summary.
- Cash payment screen.
- QR payment screen.
- Thank You screen.
- Error/expired/cancelled state.

Screenshots should be captured from the final approved build so the manual does not drift from the delivered UI.
