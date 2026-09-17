# test-coding-by-iconext-fe

Angular 14 frontend foundation for the Iconext POS implementation.

## Prerequisites

- Node.js 14.15.x or 16.10+ on the Node.js 16 release line
- npm 6.11+, npm 7.5.6+, or npm 8+

## Commands

```bash
npm ci
npm start
npm run build
npm test
```

The application uses the environment-driven API base path `/api/v1`. The
deployment environment should route that path to the existing backend; no
backend host or port is embedded in presentation components.
