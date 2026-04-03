# Rate Limit Status Display & Backoff Handling

## Overview

Added live GitHub API rate limit monitoring to the Settings page and enhanced error messages with rate limit reset times. Users can now see their remaining quota and when they'll regain access if rate-limited.

## Features Implemented

### 1. Live Rate Limit Widget (`src/components/dashboard/RateLimitWidget.tsx`)

**Client component** that fetches from `/api/rate-limit` on mount.

**Displays:**
- **Quota progress bar** — `remaining / limit` with color coding:
  - 🟢 Green (`#00ffa3`) if >20% remaining
  - 🟡 Amber (`#ffc965`) if 5–20% remaining
  - 🔴 Red (`#ff716c`) if <5% remaining
- **Reset countdown** — "Resets in 14m" (updates every minute), or "Resets at 14:32" if no countdown needed
- **Usage display** — "128 / 5,000 used"
- **Authentication badge** — Shows "Authenticated" (green) or "Unauthenticated" (amber)

**Behavior:**
- Fetches on component mount
- Updates countdown every 60 seconds
- Shows loading state while fetching
- Shows error message if fetch fails

### 2. Rate Limit API Endpoint (`src/app/api/rate-limit/route.ts`)

**GET /api/rate-limit** — lightweight endpoint that calls GitHub's `GET /rate_limit` endpoint.

**Response:**
```json
{
  "limit": 5000,
  "remaining": 4872,
  "used": 128,
  "resetAt": "2026-04-03T15:32:00.000Z",
  "resetInMinutes": 14,
  "authenticated": true
}
```

**Note:** Calling `/rate_limit` is free — doesn't count against your quota.

### 3. Enhanced Error Messages with Reset Times (`src/lib/repo-fetcher.ts`)

When a 429 (rate limit) error occurs, the code now extracts `X-RateLimit-Reset` header from the response and includes it in the error message:

```
"API rate limit exceeded · Resets at 14:32"
```

This message is then parsed by `FetchErrorBanner` to display contextual guidance.

### 4. Better Error Banner Messages (`src/components/errors/FetchErrorBanner.tsx`)

**Rate limit case:**
- **Full failure:** "GitHub API rate limit exceeded. Resets at 14:32."
- **Partial failure:** "Rate limit hit on some repos. Resets at 14:32. Showing available data."

Extracts the reset time from error messages and displays it, so users know exactly when they can retry.

## Settings Page Integration

The Settings page (`/settings`) now shows:

1. **TokenStatus banner** (top) — Shows if token is configured
2. **RateLimitWidget** (below token) — Live quota bar + reset countdown
3. **Cloud Connectors tabs** — Unchanged

Example:

```
✓ GitHub Token Configured
  Rate limit: 5,000 requests/hour

GitHub API Rate Limit
[████████████████░░░░░░░░░░░░░░░░░░░░] 128 / 5,000 used
Resets in 14m                          4872 remaining
```

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/rate-limit/route.ts` | **Create** — GET endpoint calling GitHub `/rate_limit` |
| `src/components/dashboard/RateLimitWidget.tsx` | **Create** — Client component with quota bar + countdown |
| `src/app/settings/page.tsx` | **Edit** — Import and render `RateLimitWidget` |
| `src/lib/repo-fetcher.ts` | **Edit** — Capture `X-RateLimit-Reset` header in error messages |
| `src/components/errors/FetchErrorBanner.tsx` | **Edit** — Extract and display reset time from error messages |

## User Experience Improvements

### Before
- Generic error: "GitHub API error 429"
- Settings page shows static "Rate limit: 5,000 req/hr"
- No visibility into current quota
- No guidance on when retry will work

### After
- Detailed error: "GitHub API rate limit exceeded · Resets at 14:32"
- Live quota widget showing remaining requests with progress bar
- Countdown timer ("Resets in 14m")
- Clear guidance: users know exactly when to retry

## API Cost

- **New endpoint**: `/api/rate-limit` calls `GET /rate_limit` (free, doesn't count against limit)
- **Rate**: Called once per page load + once per minute (client-side countdown update is local)
- **Impact**: Negligible — free endpoint, minimal traffic

## Testing

### 1. Visit Settings Page
```
1. Navigate to /settings
2. Should see "GitHub API Rate Limit" widget below token status
3. Widget shows quota bar, used/remaining count, reset time
4. If authenticated: bar shows green/amber/red based on usage %
```

### 2. Trigger Rate Limit Error (Optional)
```
1. Make many requests to exhaust GitHub quota, OR
2. Edit repo-fetcher to simulate 429 response
3. Visit any dashboard page
4. Error banner should show: "Resets at HH:MM"
5. FrictionAnalysis or other features show partial data + reset time
```

### 3. Build Verification
```bash
npm run build
# Expected: Clean build, /api/rate-limit route present
```

## Design System Alignment

- **Colors**: Kinetic Console palette (cyan, mint, amber, red)
- **Typography**: Tracking-widest, uppercase labels
- **Spacing**: Consistent 4-unit grid
- **Borders**: Subtle ghost borders with surface backgrounds

## Future Enhancements

- [ ] Persist rate limit history (track quota over time)
- [ ] Set threshold alerts ("⚠️ Approaching rate limit")
- [ ] Auto-pause fetches when <5% remaining
- [ ] Show estimated time to reset based on current request velocity
- [ ] Rate limit status in analytics dashboard
