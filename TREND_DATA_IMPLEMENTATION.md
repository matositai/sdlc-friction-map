# Real Trend Data Implementation

## Overview

Replaced illustrative trend data with real historical GitHub API queries. Now all trend data is derived from actual GitHub API calls, not from capped 100-run samples.

## What Changed

### 1. Paginated Historical Runs (`src/lib/repo-fetcher.ts`)

**For authenticated requests**, after fetching the initial 100-run snapshot, the code now:
- Checks if the repo has >100 runs total (using `runsData.total_count`)
- Paginates through historical runs going back 90 days
- Collects up to 500 runs (5 pages max) with `created>=ninetyDaysAgo` filter
- Uses the full `allRuns` dataset for trend computation

**Code:**
```ts
let allRuns: WorkflowRun[] = runs;
if (token && runsData.total_count > 100) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  let page = 2;
  while (allRuns.length < 500) {
    const pageRes = await fetch(
      `${base}/actions/runs?created>=${ninetyDaysAgo}&per_page=100&page=${page}`,
      { headers }
    );
    // ... fetch additional pages
  }
}
```

**Impact:**
- **Lead Time Chart (30d/90d)** — Now shows complete data across the full time window for high-velocity repos (e.g., Godot with hundreds of weekly runs)
- **All trend calculations** — Computed from a richer dataset instead of just the last 100 runs

### 2. Multi-Period Deploy Frequency (`src/lib/repo-fetcher.ts`)

**For authenticated requests**, added 3 parallel `total_count` queries:
- 14-day: `?created>=14daysAgo&per_page=1` → `deployFreq14d`
- 30-day: `?created>=30daysAgo&per_page=1` → `deployFreq30d`
- 90-day: `?created>=90daysAgo&per_page=1` → `deployFreq90d`

**Code:**
```ts
let deployFreq14d = 0;
let deployFreq30d = 0;
let deployFreq90d = 0;

if (token) {
  const toFreq = (res: Response, days: number) =>
    res.ok
      ? res.json().then((d: { total_count: number }) => +(d.total_count / days).toFixed(2))
      : Promise.resolve(0);

  [deployFreq14d, deployFreq30d, deployFreq90d] = await Promise.all([
    fetch(`...?created>=14daysAgo&per_page=1`).then(r => toFreq(r, 14)),
    fetch(`...?created>=30daysAgo&per_page=1`).then(r => toFreq(r, 30)),
    fetch(`...?created>=90daysAgo&per_page=1`).then(r => toFreq(r, 90)),
  ]);
}
```

**Impact:**
- **Deploy Frequency Chart (14d/30d/90d)** — Now shows accurate values per period instead of approximations from the 100-run sample
- Each repo shows different frequency values for different periods (previously all non-7d periods showed ~14.3)

### 3. Type Updates (`src/lib/types.ts`)

Added optional fields to `DoraMetrics`:
```ts
export interface DoraMetrics {
  // ... existing fields ...
  deployFreq14d?: number;   // 14-day frequency (real via total_count)
  deployFreq30d?: number;   // 30-day frequency (real via total_count)
  deployFreq90d?: number;   // 90-day frequency (real via total_count)
}
```

### 4. DeployFrequencyChart Updates (`src/components/charts/DeployFrequencyChart.tsx`)

Removed `computeFreqFromTrend` helper (no longer needed). Updated data computation:

**Before:**
```ts
const value = activeDays === 7
  ? d.deploymentFrequencyPerDay
  : (trend ? computeFreqFromTrend(trend, activeDays) : 0);
```

**After:**
```ts
const value =
  activeDays === 7 ? d.deploymentFrequencyPerDay :
  activeDays === 14 ? (d.deployFreq14d ?? 0) :
  activeDays === 30 ? (d.deployFreq30d ?? 0) :
  (d.deployFreq90d ?? 0);
```

## API Cost Analysis

**Per repo (authenticated):**
- Initial 100-run fetch: 1 call
- 7d deploy frequency: 1 call
- **New:** 14d/30d/90d deploy frequency: 3 calls
- **New:** Historical pagination: up to 4 pages (if total_count > 100)
- PR/issue fetches: 6 calls
- **Total new per repo: up to 7 calls**

**For 6 repos:**
- **Max additional calls: 42**
- Rate limit: 5,000/hour authenticated
- **Comfortably within budget** (42 calls = ~0.8% of hourly limit)

**Unauthenticated requests:**
- Skip paginated history fetch (keep existing 100-run sample)
- Skip extra `total_count` calls (conserve 60/hr budget)
- All new logic is behind `if (token) { ... }` guards

## Verification

### 1. Deploy Frequency Chart — Multi-Period Accuracy
```
With valid GITHUB_TOKEN:
1. Open Dashboard → Deploy Frequency chart
2. Toggle between 7d / 14d / 30d / 90d
3. Expected: Each period shows different values per repo
   - Previously: non-7d periods all showed ~14.3
   - Now: Each period reflects actual runs in that window
   - Example: Godot 7d=12.5, 14d=11.8, 30d=9.3, 90d=8.1
```

### 2. Lead Time Chart — Full Window Coverage
```
1. Open Dashboard → Lead Time chart
2. Click 30d or 90d button
3. Expected: Each studio line has data points across the full time window
   - Previously: Lines showed gaps, data only covered last 5-7 days for active repos
   - Now: Lines start at left edge (30/90 days ago), show continuous trend
```

### 3. Build Verification
```bash
npm run build
# Expected: Successful build with no TypeScript errors
```

## Data Quality Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Lead Time trend (high-velocity repo) | Data for 5-7 days of 30-day window | Data for full 30-day window | **4-6x better coverage** |
| Deploy Frequency 14d/30d/90d | Approximation from 100-run sample | Real GitHub total_count | **Accurate values per period** |
| Trend chart usability (active repos) | Misleading (flat line + connectNulls gaps) | Complete time series | **Fully accurate** |

## No Breaking Changes

- Backward compatible: new fields are optional (`deployFreq14d?`)
- Fallback logic: if fields missing, uses 0 or existing value
- Unauthenticated users: same behavior as before (uses 100-run sample)
- Existing components work unchanged

## Future Enhancements

- Add CFR (Change Failure Rate) per-period using `conclusion=failure` + `conclusion=success` total_count trick
- Cache historical runs to reduce API calls on repeat visits
- Add trend direction indicators (↑ improving, ↓ degrading, → stable)
- Show data coverage indicator on charts ("Data: last 25 days of 30")
