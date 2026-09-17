# T-002 — POS UI — Implementation Audit

## Verbatim implementation prompt

Implement T-002 (FE) according to the requirements defined in:

docs/IMPLEMENTATION\_CHECKLIST.md

Repository:
panupongz/test-coding-by-iconext-fe

Branch:
feature/implement

Before making any code changes:

1. Read AGENTS.md and follow all repository/project instructions.
2. Read docs/IMPLEMENTATION\_CHECKLIST.md and locate T-002 (FE).
3. Review the existing Angular v14 project structure and the implementation completed in T-001.
4. Inspect existing components, services, models/interfaces, routing, pipes, shared utilities, and styles that are relevant to T-002.
5. Do not modify files unrelated to T-002.

Implementation requirements:

- Implement ONLY the scope defined for T-002 (FE).
- Use Angular v14 compatible APIs and patterns.
- Write production-quality code at Senior Angular Developer standard.
- Follow separation of concerns.
- Keep components focused on presentation and UI orchestration.
- Move reusable/business/data-access logic into appropriate services.
- Use strongly typed TypeScript models/interfaces.
- Avoid `any` unless absolutely necessary and justified.
- Reuse existing components/services/utilities where appropriate instead of duplicating logic.
- Keep methods small, readable, and clearly named.
- Handle loading, success, empty, and error states where applicable.
- Manage RxJS subscriptions correctly and avoid memory leaks.
- Do not introduce unnecessary dependencies.
- Preserve existing functionality from T-001.
- Do not perform unrelated refactoring.
- Keep the implementation simple and maintainable; avoid over-engineering.

Backend/API integration:

- Follow the existing backend contract defined for this project.
- Do not invent endpoint paths, request fields, response fields, or business rules.
- Keep API calls inside the appropriate Angular service layer.
- Map API responses to strongly typed models/interfaces where appropriate.
- Handle API errors gracefully in the UI.

Quality checks after implementation:

1. Run the relevant build/type-check/lint commands available in the repository.
2. Fix errors caused by the T-002 implementation.
3. Verify that existing functionality still works.
4. Review the final git diff and confirm that only T-002-related changes were made.
5. Do NOT commit or push.

If implementation or testing encounters an unexpected problem that cannot be resolved confidently, use the project's `debug-mantra` skill and diagnose the root cause before applying a fix.

At the end, report:

- What was implemented for T-002.
- Files created.
- Files modified.
- API/service integration added or changed.
- Tests/checks executed and their results.
- Any assumptions or remaining issues.
- Confirmation that no unrelated changes were made.

## Implementation summary

- Added a routed POS feature component containing distinct product-code, sale-summary, and payment-method sections.
- Added a non-nullable reactive product-code control with required/non-whitespace validation and explicit Enter-key submission.
- Added deterministic `ready` and `loading` UI states. A valid submission is trimmed, emitted once, disables further submission, and exposes loading feedback; reset clears all transaction-shell state and re-enables input.
- Added disabled Cash and QR placeholders that make the future payment area clear without implementing T-004/T-005 behavior.
- Added responsive presentation styles and accessible labels, live status, validation messaging, busy state, and disabled controls.
- Routed the application root to the POS component and retained the T-001 application shell/API configuration.
- Added focused unit coverage for section rendering, Enter submission, trimming, duplicate prevention, validation, disabled payment controls, and reset behavior.
- No API endpoint, request/response DTO, service, or backend behavior was added because those belong to T-003 and later tasks.

## Files created

- `src/app/features/pos/pos.component.ts`
- `src/app/features/pos/pos.component.html`
- `src/app/features/pos/pos.component.scss`
- `src/app/features/pos/pos.component.spec.ts`
- `docs/prompts/T-002-implementation.md`
- `docs/prompts/T-002-senior-review-final-gate.md`

## Files modified

- `src/app/app.module.ts`
- `src/app/app-routing.module.ts`
- `src/app/app.component.html`
- `src/app/app.component.scss`
- `src/app/app.component.spec.ts`
- `src/styles.scss`
- `docs/IMPLEMENTATION_CHECKLIST.md`

## Validation and results

| Command | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS; strict application compilation completed without errors. |
| `npm run build` | PASS; production build completed without warnings after component styles were tightened below the configured budget. |
| `npm test` | PASS with normal host browser access; 10/10 tests succeeded in Chrome Headless 152. |
| `git diff --check` | PASS; only informational Windows line-ending notices were emitted. |

No lint script is defined in `package.json`, so no separate lint command was available.

## Debugging evidence

`debug-mantra` was triggered after the first sandboxed Karma run failed before executing tests.

- **Reproduce:** Two unchanged restricted runs consistently failed while launching Chrome Headless. Chrome reported repeated GPU-process exits and a persistent-cache access error before any test executed.
- **Fail path:** Angular test bundling completed; the failure occurred in `karma-chrome-launcher → ChromeHeadless → GPU/persistent-cache startup`, isolating it from application compilation and test execution.
- **Falsification:** The unchanged `npm test` command was run with normal host browser access. Chrome connected immediately, disproving a repository launcher/configuration defect. The suite then exposed one test-only `OnPush` fixture issue.
- **Test correction:** The whitespace-validation test had called the component method directly, so its `OnPush` view was not marked dirty as it would be by a real UI event. The test was changed to dispatch the actual Enter-key handler. This both exercised the acceptance path and made the validation message assertion representative of production behavior.
- **Cross-check:** With unchanged Karma configuration, the final host-access run passed all 10 tests. No unsafe Chrome flags or environment-specific repository workaround was introduced.

## Implementation phase status

**IMPLEMENTATION COMPLETE — READY FOR SENIOR REVIEW + FINAL GATE**
