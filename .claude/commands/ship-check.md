# /ship-check — Pre-Deployment Checklist

Final gate before deploying to production. Must pass completely.

## Instructions

Work through every item. All must be ✅ before deploying.

---

### 🔐 Security
- [ ] No API keys in source code (grep for `AIza`, `sk-`, `GEMINI_API_KEY =`)
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] No hardcoded email addresses or PII in source
- [ ] No `console.log` statements that might leak sensitive data
- [ ] API key is read from environment variable, not hardcoded
- [ ] Server does not log request bodies containing file data

---

### 🏗️ Build
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — production build succeeds
- [ ] Build output (`dist/`) is under 5MB
- [ ] No missing chunk warnings in build output

---

### 🧪 Full Regression
- [ ] `/regression-check` passed with zero failures

---

### 🎨 UI / UX
- [ ] App is usable on 1280px wide viewport
- [ ] App is usable on 1920px wide viewport
- [ ] No text overflows or layout breaks on either width
- [ ] All buttons have hover/active states
- [ ] Loading states are visible and accurate
- [ ] Error states are clear and actionable
- [ ] No hardcoded placeholder text visible to users (e.g., "Project Alpha", "NSB-2024-082")

---

### 📄 Content
- [ ] App name is "Never Sign Blind" (not "react-example" from package.json)
- [ ] No "Page under construction" routes exposed in production
- [ ] README.md is up to date
- [ ] `.env.example` has all required variables documented

---

### 🚀 Deployment
- [ ] `VITE_GEMINI_API_KEY` is set in the deployment environment
- [ ] Server's `PORT` env var is configured
- [ ] `npm run build && node dist/server` starts cleanly (or equivalent)
- [ ] Production URL is accessible and loads the app

---

### 📊 Monitoring
- [ ] Error boundary is in place for the React app
- [ ] Failed analyses show a user-friendly error (not a raw exception)

---

## Output Format

```
## Ship Check — [DATE]
Target: [Environment/URL]

### Security: ✅ ALL CLEAR
### Build: ✅ ALL CLEAR
### Regression: ✅ ALL CLEAR
### UI/UX: ⚠️ 1 issue — "Project Alpha" hardcoded in DraftResponsePage line 12
### Content: ✅ ALL CLEAR
### Deployment: ✅ ALL CLEAR
### Monitoring: ❌ No error boundary found

### VERDICT: ❌ NOT READY — 2 issues must be resolved before deploying
```
