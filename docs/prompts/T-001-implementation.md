# T-001 — Angular 14 Foundation — Implementation Audit

## Verbatim implementation prompt

You are implementing **T-001 — Angular 14 Foundation** for repository:

`panupongz/test-coding-by-iconext-fe`

Branch:

`feature/implement`

Before making changes, read and follow:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `.agents/skills/debug-mantra/SKILL.md` only if an actual debugging condition is triggered

## Objective

Establish and verify the Angular v14 frontend foundation required for the POS implementation.

Do not implement later business features such as Create Sale, Cash Payment, QR Payment, cancellation/expiry flow, or final POS integration in this task.

## Requirements

1. Inspect the existing Angular project structure, dependencies, configuration, routing, modules, components, services, models/types, and tests.
2. Verify that the project and all changes made in this task are compatible with **Angular v14**.
3. Establish or verify environment-based backend API configuration.
   - Backend host/port must not be hard-coded inside components.
   - The frontend must be ready to consume the existing `/api/v1` backend contract.
   - Do not change or invent backend endpoints.
4. Establish or verify the core Angular structure required by later tasks.

   Follow the **Engineering Standard — Angular v14 / Senior Developer Level** and **Angular v14 Architecture & File Responsibility** rules in `docs/IMPLEMENTATION_CHECKLIST.md`.

   In particular:
   - Components own presentation, UI interaction, and lightweight orchestration.
   - Services own reusable API/data-access and appropriate application logic.
   - Use explicit TypeScript interfaces/types where applicable.
   - Avoid `any` unless unavoidable and documented.
   - Keep templates declarative and free from complex business logic.
   - Use RxJS safely and avoid unmanaged subscriptions.
   - Keep environment/configuration separate from presentation components.
   - Do not introduce MVC-style Controller files.
   - Do not create unnecessary Components, Services, Pipes, Directives, Guards, Interceptors, Modules, helpers, or abstraction layers unless they have a clear responsibility.
   - Follow existing repository conventions where they are compatible with the checklist.
5. Inspect routing/module/component organization and make only changes necessary to provide a maintainable Angular v14 foundation.
6. Do not perform unrelated refactors.
7. Do not modify the backend or require backend contract changes.

## Validation

Run the relevant available validation for the repository, including where supported:

- dependency installation/check
- Angular build
- automated tests
- TypeScript/compiler validation

If any implementation, build, test, runtime, or integration problem requires diagnosis rather than a straightforward implementation change, invoke and follow:

`.agents/skills/debug-mantra/SKILL.md`

Do not guess-and-patch.

After fixing an issue, rerun the relevant failing validation.

## Acceptance Criteria

Before considering T-001 implementation complete, verify:

- Project is Angular v14-compatible.
- API base configuration is environment-driven.
- Core FE structure follows the Senior Developer standards in the checklist.
- Architecture/file responsibilities follow the Angular v14 rules in the checklist.
- API configuration is ready for `/api/v1` without hard-coded backend host/port in components.
- No unnecessary dependency or architecture rewrite was introduced.
- Relevant build/tests pass.

## Prompt Audit

Preserve this implementation prompt **verbatim** under `docs/prompts/` using an appropriate T-001 filename.

Also record:

- implementation summary
- files changed
- commands/tests executed
- results
- debugging evidence/fixes if `debug-mantra` was triggered
- current T-001 status

Do **not** mark T-001 as `DONE` yet.

T-001 can be closed only after the separate **Senior Review + Final Gate** prompt has been executed successfully and the checklist/prompt audit has been updated.

At the end, report:

1. What you inspected
2. What you changed and why
3. Files changed
4. Validation/tests executed and their results
5. Whether `debug-mantra` was triggered
6. Any remaining risks or findings
7. Whether the implementation phase is ready for Senior Review + Final Gate

## Implementation summary

- Confirmed that the starting branch contained documentation only and no Angular workspace.
- Added a minimal Angular 14.2 NgModule-based application with strict TypeScript and Angular template compiler settings.
- Added an application shell, root routing module, `HttpClientModule`, and focused unit tests without implementing any POS business feature.
- Added typed development and production environment configuration. Both expose the relative `/api/v1` base path through the `API_BASE_URL` injection token, keeping deployment host/port details out of components.
- Pinned the Angular 14-compatible toolchain and generated a reproducible npm lockfile.

## Files changed

- `.editorconfig`
- `.gitignore`
- `README.md`
- `angular.json`
- `karma.conf.js`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.spec.json`
- `src/index.html`
- `src/main.ts`
- `src/polyfills.ts`
- `src/styles.scss`
- `src/test.ts`
- `src/assets/.gitkeep`
- `src/environments/environment.model.ts`
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `src/app/app.module.ts`
- `src/app/app-routing.module.ts`
- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/app/app.component.scss`
- `src/app/app.component.spec.ts`
- `src/app/core/config/api-config.token.ts`
- `src/app/core/config/api-config.token.spec.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-001-implementation.md`

## Commands and results

| Command | Result |
|---|---|
| `node --version` / `npm --version` | Node 24.21.0 and npm 11.19.0 detected; Node is newer than Angular 14's supported runtime range. |
| `npm install` | Passed after host cache access was granted; 942 packages installed and lockfile generated. |
| `npx ng version` | Angular CLI 14.2.13, Angular 14.2.12, RxJS 7.5.7, TypeScript 4.7.4 confirmed. |
| `npm ls --depth=0` | Passed; direct dependency tree is valid and Angular 14-compatible versions are installed. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed after the debugged Node typings compatibility fix. |
| `npm run build` | Passed; production bundle generated successfully. |
| `npm test` | Passed with host browser access; 4 of 4 tests succeeded in Chrome Headless 152. |

Dependency installation reported 43 audit findings in the legacy Angular 14 dependency tree (3 low, 20 moderate, 19 high, 1 critical). No forced dependency upgrades were applied because they would move outside Angular 14 compatibility and the scope of T-001.

## Debugging evidence and fixes

`debug-mantra` was triggered after the first compiler/build/test validation failed unexpectedly.

### Reproduction

- `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`, and the test compilation deterministically failed with TS2502 errors in `@types/node` stream declarations.
- The sandboxed Chrome test launch also failed independently in the GPU/update-key path.

### Fail-path trace and hypotheses

- `npx tsc --explainFiles` traced Node types into the application program through `rxjs/dist/types/internal/scheduler/timerHandle.d.ts`.
- `npm explain @types/node` showed unconstrained transitive requirements resolving to `@types/node` 22.20.3.
- Angular 14 uses TypeScript 4.7.4, while the resolved modern Node declarations produced the reported recursive type errors.
- Application code, Angular templates, and the Node executable by itself were ruled out because the same errors originated solely in declaration files across all compiler entry points.

### Falsification and fix

- A temporary `@types/node` 16.11.7 install was used as the disproof: if the same repro still failed, the type-version hypothesis would be false.
- The exact compiler repro passed, confirming the diagnosis.
- `@types/node` 16.11.7 was then pinned as a development dependency and the lockfile updated.
- Strict compilation and production build both passed after the permanent change.

### Browser breadcrumb

- The unchanged Karma/Chrome test suite passed immediately with normal host access (4/4).
- This isolated the prior Chrome crash to the execution sandbox rather than repository configuration, so no unsafe or environment-specific Chrome launcher flags were added.

## Current T-001 status

**IMPLEMENTATION COMPLETE — AWAITING SENIOR REVIEW + FINAL GATE**

T-001 is intentionally not marked `DONE`. The separate Senior Review + Final Gate prompt must run successfully before final closure.
