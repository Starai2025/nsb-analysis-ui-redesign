# Universal Phase Gate Checklist

Run this checklist at the end of every phase before marking it complete.

---

## 🏗️ Build Quality
- [ ] `npm run lint` exits with code 0
- [ ] `npm run build` exits with code 0
- [ ] No TypeScript `@ts-ignore` comments added in this phase
- [ ] No `any` type used in new code (existing `any` is acceptable, not ideal)
- [ ] All new React components have proper prop types or are self-contained

## 🔐 Security
- [ ] No API keys, tokens, or secrets in committed code
- [ ] No new `console.log` of sensitive data (file contents, API responses with PII)
- [ ] Env vars follow `VITE_` prefix convention for client-side use
- [ ] `.env` and `.env.local` confirmed in `.gitignore`

## 🧭 Navigation
- [ ] All navigation uses `useNavigate()` from react-router-dom
- [ ] No `window.location.href` assignments
- [ ] No `window.location.reload()` unless explicitly required
- [ ] All new routes are registered in `App.tsx`

## 🎨 UI Standards
- [ ] All new UI uses Tailwind classes only (no inline `style={{}}` objects)
- [ ] New pages use `max-w-[1400px] mx-auto p-8` container pattern
- [ ] Design tokens used: `bg-surface`, `text-on-surface`, `text-primary`, etc.
- [ ] All buttons have disabled states where appropriate
- [ ] All async operations show a loading state

## 📦 Data Integrity
- [ ] No hardcoded analysis results, IDs, or project names in production code
  - Exception: demo/placeholder data is clearly marked with a comment
- [ ] All data flowing through the app conforms to types in `src/types.ts`
- [ ] New fields added to API responses are also added to `src/types.ts`
- [ ] `POST /api/save-analysis` and `GET /api/store` contracts are unchanged
  - (or updated atomically with all consumers)

## 🔁 Integration
- [ ] The full happy path works: upload → analyze → summary → report
- [ ] The error path works: shows a user-facing error (not a white screen)
- [ ] Previously passing routes still load without errors
- [ ] AskTheContract component renders without errors on all pages

## 📝 Documentation
- [ ] Phase doc (`docs/rebuild/phase-[N]-[name].md`) updated with actual outcome
- [ ] `CLAUDE.md` updated if any constraints changed
- [ ] New env vars documented in `.env.example`
- [ ] Complex logic has inline comments

---

## Scoring
Count the ❌ failures:
- **0 failures** → ✅ Phase COMPLETE
- **1–2 minor failures** → ⚠️ Document and decide: proceed with caveat or fix first
- **3+ failures or any security/data failure** → ❌ Phase BLOCKED — fix before proceeding
