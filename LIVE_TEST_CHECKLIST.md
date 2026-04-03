# Item #8: Live Integration Testing Checklist

## Pre-Test Setup

- [ ] `.env.local` has `GITHUB_TOKEN` (confirm file shows token is set)
- [ ] Run `npm run dev` and verify no build errors
- [ ] Open http://localhost:3000 in browser

---

## 1. Dashboard Page

### Data Loading
- [ ] Page loads without errors
- [ ] "SDLC Friction Dashboard" header visible
- [ ] Studio cards display (6 canonical repos: Godot, O3DE, SS14, OpenXR, Cesium, Blender)
- [ ] Each card shows:
  - Studio name + DevEx score (0–100 range)
  - DORA metrics: dep/day, lead time, failure rate
  - Friction strip (colored bar showing low/medium/high/critical breakdown)

### Live Data Indicators
- [ ] Summary bar shows:
  - Avg DevEx score
  - Weekly builds count
  - Critical friction stages count (if any)
- [ ] "Live" badge in header top-right indicates live mode is active
- [ ] Rate limit widget in Settings shows:
  - Green progress bar (>20% remaining)
  - Remaining quota count
  - Reset time countdown

### Interactive Features
- [ ] Click on a studio card → Detail panel slides in
- [ ] Detail panel shows:
  - Studio name + DORA tier badge
  - Full DORA metrics breakdown (table)
  - Friction heatmap (7 stages × 1 row)
  - AI Friction Analysis section with "Regenerate" button
- [ ] Click "All Studios" back button → Returns to grid view
- [ ] "Add Repo" button is visible (do NOT click; it's for custom repos)

---

## 2. DORA Metrics Page

### Charts Load & Render
- [ ] Lead Time for Changes chart displays (multi-line, 90-day default)
- [ ] Period selector buttons: 7d / 14d / 30d / 90d
- [ ] Click each period button → Chart updates (smooth animation expected)
- [ ] Hover over chart lines → Tooltip shows: `Studio Name: XXh` (hours)
- [ ] Change Failure Rate chart (radar) displays with all 6 studios
- [ ] Deployment Frequency chart (bars) displays with color-coded studios
- [ ] Click period buttons in Deployment Frequency → Chart updates

### Full DORA Scorecard Table
- [ ] Table shows all 6 studios + their metrics:
  - Deployment Frequency (X.X per day)
  - Lead Time (X hours)
  - Change Failure Rate (X%)
  - MTTR (X hours)
  - DevEx Score (0–100)
- [ ] Each metric has a trend icon (↑ improving / ↓ degrading / – stable)
- [ ] Rows colored by DevEx tier (green for 80+, cyan for 60+, amber for <60)

### DevEx Scores & AI Adoption
- [ ] Developer Experience Scores section shows grid of studios
- [ ] AI-Augmented SDLC Adoption panel visible (illustrative data badge)

---

## 3. Friction Map Page

### Heatmap Grid
- [ ] 7 stages across (Commit, Build, Unit Test, Integration Test, Review, Staging, Prod)
- [ ] 6 studios down (rows)
- [ ] Each cell color-coded:
  - Light cyan: Low friction
  - Medium cyan: Medium
  - Amber: High
  - Red: Critical
- [ ] Cells with "high" or "critical" show icon (⏱️ clock or ⚠️ alert)

### Heatmap Interactions
- [ ] Click filter buttons (Low/Medium/High/Critical) → Heatmap filters rows
- [ ] Click active filter again → Removes filter, shows all rows
- [ ] Hover over cell → Tooltip shows:
  - Studio · Stage name
  - Avg duration (minutes) vs benchmark
  - Failure rate %
  - Top issue (if applicable)

### Summary Row
- [ ] Bottom row shows "Avg stage" with average duration per stage (color-coded)

---

## 4. Studios (Pipelines) Page

### Pipeline List
- [ ] Page displays all studios
- [ ] Each studio card shows:
  - Status badge (✓ Healthy / ⚠️ Warning / ✕ Critical)
  - Pipeline name + stage count
  - Last run status
  - Deployment metrics
- [ ] Click on studio → Expands to show stages and recent runs

---

## 5. AI Analysis Page

### Analysis Loading
- [ ] Page loads "AI Friction Analysis" section
- [ ] Displays analysis for each studio (if cached) or "Regenerate" buttons
- [ ] Report shows:
  - Friction summary (top 3 bottlenecks)
  - DORA tier assessment (Elite / High / Medium / Low)
  - Recommended actions

### Report Generation
- [ ] Click "Regenerate" on any studio → Loading spinner appears
- [ ] After ~5–10 seconds → Report displays
- [ ] Report includes Claude AI badge ("Powered by Claude")
- [ ] Refresh page → Same report displays (cached in localStorage)
- [ ] Clear browser cache → Clicking "Regenerate" fetches fresh analysis

---

## 6. Settings / Live Mode Page

### Token Status
- [ ] Green "Authenticated" badge if token is valid
- [ ] Shows token format: `ghp_...` (masked except first/last 3 chars)

### Rate Limit Widget
- [ ] Displays current rate limit status:
  - Used / Limit (e.g., 42 / 5000)
  - Remaining % bar
- [ ] Color coding:
  - Green: >20% remaining
  - Amber: 5–20% remaining
  - Red: <5% remaining
- [ ] Reset timer: "Resets in X minutes"
- [ ] Countdown updates every 60 seconds

### Live Mode Toggle (if applicable)
- [ ] Toggle enables/disables live data fetching
- [ ] When disabled, pages show mock data instead

---

## 7. Error Handling Tests

### Missing Token
- [ ] Temporarily remove `GITHUB_TOKEN` from `.env.local`
- [ ] Restart dev server
- [ ] Pages should show error card: "No data to display · Add one in Settings"
- [ ] Action button links to Settings

### Rate Limit Exhaustion (Manual Test)
- [ ] In `.env.local`, reduce GitHub token to one with minimal quota, OR
- [ ] Simulate by adding a high number to `totalAttempted` in code (not recommended)
- [ ] Pages should show "Rate Limit Exceeded" banner with reset time
- [ ] Button to "Go to Settings" to add new token

### Network Error (Simulate)
- [ ] Open DevTools → Network tab → Set throttle to "Offline"
- [ ] Reload page
- [ ] Should show fetch error with retry option

---

## 8. Performance Verification

### Chart Interactions
- [ ] Click period buttons (7d/14d/30d/90d) → Buttons highlight instantly, chart animates smoothly
- [ ] No jank or lag during period transitions
- [ ] Hover over chart elements → Tooltips appear instantly

### Page Navigation
- [ ] Navigate between Dashboard → Metrics → Friction → AI Analysis
- [ ] No console errors in DevTools
- [ ] Page transitions feel responsive

### Memory Profile (Optional)
- [ ] Open DevTools → Performance tab
- [ ] Record 10 seconds of activity
- [ ] Check that heap size doesn't spike unexpectedly during chart updates

---

## 9. Accessibility Verification (Item #6 Follow-up)

### Keyboard Navigation
- [ ] Press Tab repeatedly → Focus ring (cyan outline) appears on all interactive elements
- [ ] Skip link appears when you Tab first (yellow box top-left)
- [ ] Tab into period buttons → Active button highlighted with blue border

### Screen Reader (Optional, requires NVDA/JAWS/VoiceOver)
- [ ] Page announces "SDLC Friction Dashboard"
- [ ] Headings navigate: h1 (page title) → h2 (section titles: "Lead Time", "Heatmap", etc.)
- [ ] Studio cards announce: "View [Studio Name] — DevEx score [score]"
- [ ] Heatmap cells announce: "[Studio] · [Stage] — [Level] friction, [Xm] avg, [Y]% failure"

---

## 10. Final Sign-Off

- [ ] All pages load and display real data
- [ ] No console errors (DevTools → Console)
- [ ] No TypeScript errors
- [ ] Charts render correctly with real data (not mocks)
- [ ] Rate limit widget shows accurate counts
- [ ] AI reports cache and regenerate properly
- [ ] Performance is responsive (no visible lag)
- [ ] Error states display gracefully
- [ ] Accessibility features work (keyboard, focus rings)

---

## Notes for Recruiter Deployment

Once local testing passes:

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "feat: production-ready SDLC friction dashboard"
   git push origin main
   ```

2. **Add env vars to Vercel**:
   - Go to Vercel project settings → Environment Variables
   - Add `GITHUB_TOKEN` (same value from `.env.local`)
   - Redeploy

3. **Share link with recruiter team**:
   - Live URL will be provided by Vercel
   - All real data will be live from GitHub/GitLab

4. **Monitor**:
   - Check rate limits daily (Settings page shows countdown)
   - If quota exhausted, add a new token to `.env` or rotate with team token pool

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Charts show no data | Verify token has repo access (Settings shows green badge) |
| "No data to display" on all pages | Check `.env.local` has `GITHUB_TOKEN` and it's not expired |
| Rate limit bar stuck | Check that reset timestamp is updating (compare to system clock) |
| AI reports not caching | Check browser localStorage is enabled (DevTools → Application → Local Storage) |
| Heatmap cells not clickable | Verify accessibility update to FrictionHeatmap (TooltipTrigger should be focusable) |
| Charts laggy during period switch | Check DevTools Performance tab for long tasks; should complete in <100ms |

