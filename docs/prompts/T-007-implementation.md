# T-007 (FE) — Responsive & UX Implementation Audit

## Verbatim implementation prompt

Implement T-007 (FE) — Responsive & UX for this Angular v14 project.

Source of Truth:
- docs/IMPLEMENTATION_CHECKLIST.md
- Existing implementation from T-001 through T-006
- Existing BE API contract must remain unchanged.
- Follow the Angular v14 / Senior Developer engineering and architecture standards defined in the checklist.
- Do not perform unrelated refactors or redesign the application.

Before changing code:
1. Read docs/IMPLEMENTATION_CHECKLIST.md completely.
2. Inspect the current POS implementation and existing tests.
3. Preserve all working behavior implemented by T-001 through T-006.
4. Inspect the existing layout/styles before deciding what needs to change.
5. Reuse existing project conventions and components where practical.

Implement T-007 with the following scope:

1. Responsive POS layout
- Ensure the core POS flow remains usable across the viewport sizes supported by the existing project.
- Prevent important controls, product information, payment controls, dialogs, and transaction feedback from overflowing or becoming inaccessible.
- Preserve a clear visual hierarchy on both narrower and wider viewports.
- Prefer responsive CSS/layout techniques over TypeScript viewport-specific logic unless there is a justified requirement.

2. Product-code keyboard/focus UX
- Product-code entry must remain clear and predictable.
- Preserve Enter-key submission behavior.
- Prevent duplicate/unintended submissions while an operation is already in progress.
- Restore or maintain useful focus when the POS returns to a ready state where appropriate.
- Do not introduce focus behavior that interferes with payment actions, dialogs, or error recovery.

3. Loading and disabled feedback
- Make loading/disabled states visually clear for relevant actions.
- Users must be able to distinguish an available action from an action that is temporarily unavailable.
- Existing duplicate-action protection must remain intact.
- Do not introduce additional API calls or change API timing/business behavior solely for visual feedback.

4. Payment-state clarity
- Cash and QR states must be visually understandable.
- Preserve all existing cash/QR business behavior.
- Do not modify payment calculations, request payload semantics, sale state rules, or BE contracts.
- PAID/error/cancel/expiry behavior implemented by previous tasks must continue to work.

5. Accessibility basics
Apply reasonable accessibility improvements appropriate to the existing Angular project, including where applicable:
- semantic button/input usage;
- accessible labels or names for interactive controls;
- visible keyboard focus;
- sensible disabled states;
- dialog/popup semantics where already supported by the implementation;
- avoid relying exclusively on visual styling to communicate critical interaction state.

Do not introduce a large accessibility framework or unrelated dependency.

6. Reset / ready-state consistency
- After a transaction/reset/error recovery, the POS must return to a deterministic usable state.
- Product-code entry and payment UI must not retain stale transaction state.
- Do not change existing BE cancellation or transaction rules.

Architecture requirements:
- Angular v14 compatible only.
- Keep components focused on presentation and lightweight orchestration.
- Keep reusable logic in appropriate services/helpers when justified.
- Do not introduce files/layers merely for architectural appearance.
- Keep TypeScript strictly typed; avoid any unless genuinely unavoidable and documented.
- Keep templates readable and avoid complex business logic in HTML.
- Preserve RxJS lifecycle safety.
- Do not duplicate mutable transaction state.
- Do not hard-code BE URLs.
- Do not modify or invent BE endpoints/contracts.
- Do not introduce unrelated architecture or visual rewrites.

Testing:
- Add or update focused tests for T-007 behavior where appropriate.
- Verify existing T-001 through T-006 behavior is not regressed.
- Test relevant keyboard/focus, disabled/loading, reset, and responsive-related component behavior that can reasonably be automated.
- Run the relevant automated tests.
- Run the Angular build.

If any implementation, test, build, runtime, or integration failure requires diagnosis rather than a straightforward implementation change:
- invoke and follow .agents/skills/debug-mantra/SKILL.md;
- reproduce and diagnose before patching;
- re-run the failing validation after the fix;
- preserve any additional debugging prompt verbatim in the task prompt audit.

Prompt audit:
- Preserve this implementation prompt verbatim under docs/prompts/ using the existing T-### naming/convention.
- Record implementation summary, changed files, and validation commands/results according to the existing prompt-audit convention.
- Do not mark T-007 DONE yet. Final closure happens only after Senior Review / Final Gate.

Before finishing:
- Review the diff for scope creep.
- Confirm no BE/business rules changed.
- Confirm no unrelated visual/architecture rewrite was introduced.
- Confirm relevant tests pass.
- Confirm Angular build passes.

Return:
1. concise implementation summary;
2. changed files;
3. tests/build commands executed and results;
4. any assumptions or limitations;
5. any remaining issues that should block Senior Review / Final Gate.

---

## Implementation summary

- Refined the existing POS grid so product entry and sale summary use the wider viewport effectively while payment remains full width; at narrower viewports all sections, controls, state cards, and transaction actions stack without horizontal control overflow.
- Added resilient sizing and wrapping for panels and transaction feedback, full-width primary actions where useful, and a compact fallback for very narrow screens.
- Preserved Enter submission and every existing loading/idempotency guard. Product entry now receives initial browser focus and regains focus only after a definite create-sale recovery or a completed local reset to ready state.
- Added explicit visual and programmatic loading feedback with `aria-busy`, clearer disabled styling, visible keyboard focus, minimum control height, semantic control groups, accessible cash-action names, and selected-payment feedback using both text and `aria-pressed`.
- Kept all create-sale, cash, QR, cancellation, expiry, retry, calculation, request timing, and backend contract behavior unchanged.
- Added focused component coverage for loading/disabled feedback, payment selection semantics, focus recovery, and stale payment-state cleanup after reset.

## Changed files

- `src/app/features/pos/pos.component.ts`
- `src/app/features/pos/pos.component.html`
- `src/app/features/pos/pos.component.scss`
- `src/app/features/pos/pos.component.spec.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-007-implementation.md`

## Tests and validation

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npx tsc -p tsconfig.spec.json --noEmit` | PASS; strict test compilation completed without errors. |
| `npm test -- --browsers=ChromeHeadless --include='src/app/features/pos/pos.component.spec.ts'` (restricted execution) | Environment failure before Karma connected; Chrome GPU/persistent-cache initialization failed and zero tests ran. Reproduced on an unchanged retry. |
| Same focused command with normal host access, diagnostic run | Executed 36 tests; one newly added OnPush test-flow assertion failed because the test called the component method directly without marking the view dirty. |
| Same focused command with normal host access, corrected run | PASS; 36/36 POS component tests. |
| `npm test -- --browsers=ChromeHeadless` with normal host access | PASS; 48/48 tests in Chrome Headless 152. |
| `npm run build` | PASS; production build completed. The existing per-component style budget emitted a warning because the responsive/accessibility CSS brings the POS component stylesheet to 3.00 kB against the 2.00 kB warning threshold; it remains below the configured error threshold. |
| `git diff --check` | PASS; no whitespace errors; Git emitted informational LF-to-CRLF working-copy notices only. |
| `rg -n "\\bany\\b\|console\\.log" src/app` | PASS; no matches. |

No lint script is defined in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered when restricted Chrome could not launch and again when the host-access diagnostic run exposed a deterministic test failure.

- **Reproduce:** Two unchanged restricted focused-test runs completed Angular bundling but failed during Chrome GPU/persistent-cache initialization before Karma connected. The unchanged command with normal host access connected immediately and ran all 36 focused specs.
- **Fail path:** The host run isolated one new loading-feedback test. Component state was correctly `loading`, but the test invoked an `OnPush` component method directly, so a subsequent fixture check did not render the new bindings.
- **Hypotheses/falsification:** Successful host execution disproved a Karma, launcher, or repository configuration defect. The component-state assertion and the fact that all four stale values came from the same unchanged DOM disproved broken individual bindings. Triggering the real form event supplied Angular's normal dirty marking without changing production behavior.
- **Fix proof:** The corrected focused suite passed 36/36, the complete suite passed 48/48, both strict TypeScript compilers passed, and the production build completed.
- **Breadcrumb cross-check:** Restricted startup logs, successful host connection, the single deterministic OnPush test-flow failure, event-driven correction, clean focused/full suites, compilers, and build all agree. No browser workaround or application behavior change was committed for the environment failure.

## Assumptions and limitations

- The repository defines no explicit viewport matrix, so responsive behavior follows its existing `40rem` breakpoint and adds a conservative `24rem` compact fallback. Browser-level visual regression/screenshot tooling is not configured; layout coverage therefore combines responsive CSS review with browser-rendered component behavior tests.
- The existing POS has no dialog or popup in T-007 scope, so no new dialog abstraction or semantics were introduced.
- The production build passes but reports the non-blocking POS component style-budget warning described above.

## Implementation phase status

**IMPLEMENTATION COMPLETE — AWAITING SEPARATE SENIOR REVIEW + FINAL GATE**

T-007 remains `TODO` and is not closed.
