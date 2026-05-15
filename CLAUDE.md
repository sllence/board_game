# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack board game app built with Taro 4 (cross-platform: H5 + WeChat mini-program) + NestJS backend. Uses pnpm workspaces.

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start H5 frontend (port 5000) + backend (port 3000)
pnpm dev:web          # H5 frontend only
pnpm dev:weapp        # WeChat mini-program only
pnpm dev:server       # Backend only
pnpm build            # Build all targets
pnpm validate         # Run lint + TypeScript check in parallel
pnpm lint:fix         # Auto-fix ESLint issues
pnpm new              # Interactive page/component generator
```

Backend module generation (run from `server/`):
```bash
npx nest g resource modules/<name>   # Full CRUD scaffold
```

## Architecture

**Frontend** (`src/`): Taro + React + TypeScript. Pages in `src/pages/`, reusable UI components in `src/components/ui/` (51 pre-built components). State via Zustand. Path alias `@/*` → `src/*`.

**Backend** (`server/src/`): NestJS modules under `modules/` (auth, games, guides, sessions, storage). Database via Drizzle ORM + Supabase PostgreSQL. Validation via Zod.

**Build outputs**: `dist-web/` (H5), `dist/` (WeChat mini-program).

## 补充参考

请同时参考本项目根目录下的 AGENTS.md 文件获取完整的项目规范和指令。

## Critical Rules

**Network requests**: Never use `Taro.request`, `Taro.uploadFile`, or `Taro.downloadFile` directly. Always use `Network.request`, `Network.uploadFile`, `Network.downloadFile` from `@/network` — these auto-prefix the domain.

**Icons**: Use `lucide-react-taro`, not `lucide-react`. The Taro adapter is required for mini-program compatibility.

**Styles**: Use Tailwind CSS classes. Fall back to CSS only when necessary.

**TabBar icons**: WeChat mini-program TabBar requires local PNG files (no base64/SVG). Generate with `npx taro-lucide-tabbar`. `iconPath` must start with `./`.

**New pages**: Create `index.tsx` + `index.config.ts` in `src/pages/<name>/`, then register the path in `src/app.config.ts`.

**`src/presets/`**: Framework preset logic — do not modify unless necessary.

## Page Lifecycle Hooks

Use Taro hooks (`useLoad`, `useDidShow`, `useReachBottom`, etc.) from `@tarojs/taro`, not React equivalents, for mini-program lifecycle events.

## Backend Patterns

- Responses unified via `TransformInterceptor` (wraps data in `{ code, data, message }`)
- Errors handled via `HttpExceptionFilter`
- Env vars read via `ConfigService` from `@nestjs/config`
- WeChat auth: `code2session` flow in `server/src/modules/auth/`
