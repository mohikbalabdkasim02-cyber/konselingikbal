# Stage 6 PWA & UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize Bina Insan LifeMap into a cleaner, easier-to-navigate, installable PWA while preserving all Stage 1–5 student, assessment, career, counseling, and BK workflows.

**Architecture:** Keep the existing Next.js 15 + Supabase application and database untouched. Add an isolated visual/PWA layer: official Bina Insan branding assets, a lightweight PWA service worker that never caches sensitive Supabase/student data, an offline fallback, and a Stage 6 design system imported after existing styles. Redesign the main BK dashboard and key student-facing surfaces without changing data contracts or business logic.

**Tech Stack:** Next.js 15, React 19, Supabase JS 2, TypeScript, Lucide React, native Web App Manifest + Service Worker.

**Spec:** User-approved dashboard/Student 360 visual direction from 18 Sep 2026 plus the supplied official Bina Insan Palu High School logo.

## Global Constraints

- Preserve all Stage 1–5 business logic, RLS, PIN login, assessments, Career V2, Action Plan, Student 360, BK queue, Proposal Hidup, and follow-up flows.
- Use the official Bina Insan Palu High School logo; header asset must have transparent background and be HD.
- Design must be clean, modern, elegant, easy to understand, and not overloaded with tiny decorative icons.
- No sensitive assessment, counseling, student, or Supabase response data may be cached by the service worker.
- PWA must support installability, standalone display, offline fallback, and safe updates without adding a third-party PWA dependency.
- Production `main` remains untouched until CI/build verification succeeds on the feature branch.

---

### Task 1: Branding assets and Stage 6 design foundation

**Files:** `public/brand/bina-insan-logo.png`, PWA icons, `app/stage6.css`, `app/layout.tsx`, `lib/stage6-pwa.test.ts`.

- [ ] Write failing assertions for Stage 6 stylesheet import and official asset paths.
- [ ] Add exact transparent HD logo and icon assets derived from the supplied logo.
- [ ] Add Stage 6 design tokens, typography, spacing, shell, sidebar, cards, responsive rules, and minimal icon treatment.
- [ ] Import `stage6.css` after legacy CSS.
- [ ] Run tests and commit.

### Task 2: PWA foundation with privacy-safe caching

**Files:** `app/manifest.ts`, `components/pwa/PWARegister.tsx`, `public/sw.js`, `app/offline/page.tsx`, `app/layout.tsx`, `lib/stage6-pwa.test.ts`.

- [ ] Require manifest metadata, service-worker registration, offline fallback, and explicit sensitive-route exclusions.
- [ ] Implement manifest with standalone display and Bina Insan icons.
- [ ] Service worker precaches only offline shell/brand assets; authenticated navigation is network-only with offline fallback and never cached.
- [ ] Register service worker in root layout.
- [ ] Run tests and commit.

### Task 3: Main BK dashboard redesign

**Files:** `app/page.tsx`, `app/stage6.css`, `lib/stage6-ui.test.ts`.

- [ ] Require official logo, labelled navigation, Student Portal entry, BK Control Center, and real-data summary cards.
- [ ] Replace text-only `BI` branding with official transparent logo.
- [ ] Add restrained labelled sidebar with only essential icons.
- [ ] Reorganize dashboard around real students/proposals/LifeMap counts; do not fabricate metrics.
- [ ] Improve admin login branding and add a clear Student Portal link without changing auth logic.
- [ ] Verify mobile responsive layout and keyboard focus states.

### Task 4: Global Student 360 / student experience polish

**Files:** `app/stage6.css` and only small header/branding edits in existing pages when necessary.

- [ ] Preserve all routes and current data logic.
- [ ] Apply visual overrides to workspace cards, tabs, forms, result cards, assessment pages, and BK pages.
- [ ] Keep status colors semantic and muted; do not surface sensitive narratives in overview UI.

### Task 5: Final regression and deployment gate

- [ ] Run `npm test`, Supabase schema verification, and Next.js production build in CI.
- [ ] Review Vercel preview; if Hobby build-rate-limit blocks preview, classify it as quota, not code failure.
- [ ] Open draft PR to `main` with explicit PWA/privacy notes.
- [ ] Merge only after CI is green.
