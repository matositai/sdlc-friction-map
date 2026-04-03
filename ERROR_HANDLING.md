# Error Handling & Recovery

## Overview

Comprehensive error handling system for graceful degradation when APIs fail, tokens are missing, or rate limits are hit. The app shows helpful, actionable error messages to users without crashing.

## Components

### ErrorBoundary (`src/components/errors/ErrorBoundary.tsx`)

**Scope**: Catches unhandled React errors across the entire app

**Features**:
- Wraps the root layout
- Displays a clean error card with reload button
- Prevents white-screen crashes
- Logs errors to browser console

**Usage**:
```tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

### ErrorCard (`src/components/errors/ErrorCard.tsx`)

**Purpose**: Reusable error/warning/info card component

**Props**:
- `icon`: emoji to display (default: ⚠️)
- `title`: error heading
- `message`: error description
- `variant`: "error" | "warning" | "info" (affects border color)
- `action`: optional { label, onClick } button

**Example**:
```tsx
<ErrorCard
  icon="📭"
  title="No data to display"
  message="Add a GitHub token in Settings to enable live data."
  variant="info"
  action={{ label: "Go to Settings", onClick: () => ... }}
/>
```

### FetchErrorBanner (`src/components/errors/FetchErrorBanner.tsx`)

**Purpose**: Shows detailed fetch failure information across pages

**Features**:
- Shows success/failure counts: "Partial data (4/6 repos)"
- Detects auth vs. rate-limit vs. network errors
- Expandable details showing which repos failed
- Amber background for partial failures, red for total failures

**Example Output**:
```
⚠️ Partial data (4/6 repos)
Failed to fetch data from 2 repos. Showing available data from 4 successful requests.

[Show errors (2)]
  github-org/repo-a: API rate limit exceeded
  github-org/repo-b: 404 Not Found
```

### TokenStatus (`src/components/errors/TokenStatus.tsx`)

**Purpose**: Settings page indicator of token configuration

**Features**:
- Shows ✓ green if token is configured
- Shows ⚠ amber if token is missing
- Displays rate limit info (5k/hr authenticated, 60/hr unauthenticated)

## Error Detection Utilities

### `src/lib/error-handling.ts`

**Key Functions**:

#### `parseAPIError(error: any): APIError`
Categorizes errors into types:
- `auth`: Invalid/missing token (401, Bad credentials)
- `rate-limit`: API quota exhausted (429, rate limit exceeded)
- `not-found`: Repo doesn't exist (404)
- `network`: Connection failed (fetch, Network, timeout)
- `validation`: Invalid input (required fields)
- `unknown`: Unclassified error

**Example**:
```ts
const error = parseAPIError(e);
if (error.type === "rate-limit") {
  showRetryMessage("Try again in a few minutes");
}
```

#### `validateGitHubToken(token?: string): { valid: boolean; message: string }`
Checks token format (must start with `ghp_` or `github_pat_`)

#### `isMissingTokenError(message: string): boolean`
Detects if error is due to 401/auth failure

#### `isRateLimitError(message: string): boolean`
Detects if error is due to rate limiting

## Data Flow with Errors

### 1. Fetch Level (`src/lib/repo-fetcher.ts`)

**Old behavior**:
```ts
export async function fetchAllRepos(token?: string): Promise<RepoLiveData[]> {
  // Returns empty array on any error
}
```

**New behavior**:
```ts
export interface FetchResult {
  data: RepoLiveData[];
  errors: Array<{ repo: string; error: string }>;
  totalAttempted: number;
  successCount: number;
}

export async function fetchAllRepos(token?: string): Promise<FetchResult>
```

**Details**:
- Catches individual repo fetch failures (not fatal)
- Returns partial data + error list
- Supports authenticated parallel fetches + unauthenticated sequential fallback

### 2. Live Data Wrapper (`src/lib/live-data.ts`)

```ts
export interface LiveDataResult extends FetchResult {
  isLive: boolean; // true if any data was fetched
}

export async function getLiveRepoData(): Promise<LiveDataResult>
```

**Cache behavior**:
- Cached for 1 hour via `unstable_cache`
- Cache key includes token presence (adding token busts cache immediately)

### 3. Page Level

All pages now follow this pattern:

```tsx
const result = await getLiveRepoData().catch(() => ({ 
  data: [], 
  errors: [], 
  totalAttempted: 0, 
  successCount: 0, 
  isLive: false 
}));

return (
  <main>
    {/* Show error banner if any fetches failed */}
    {result.errors.length > 0 && (
      <FetchErrorBanner {...result} />
    )}

    {/* Show empty state if no data and no errors (missing token case) */}
    {!result.isLive && result.errors.length === 0 && (
      <ErrorCard 
        title="No data to display"
        message="Add GitHub token in Settings"
        action={{ label: "Go to Settings", ... }}
      />
    )}

    {/* Render content if data available */}
    {result.isLive && <Content />}
  </main>
);
```

## Pages with Error Handling

✅ **Dashboard** (`src/app/page.tsx`)
- Shows fetch errors + empty state
- KPI cards show undefined gracefully
- Charts render empty state

✅ **Metrics** (`src/app/metrics/page.tsx`)
- Shows fetch errors + empty state
- DORA table shows empty
- Trend charts show empty

✅ **Friction Map** (`src/app/friction/page.tsx`)
- Shows fetch errors + empty state
- Heatmap shows empty grid

✅ **Studios** (`src/app/pipelines/page.tsx`)
- Shows fetch errors + empty state
- Grid shows compact cards only from live data

✅ **AI Analysis** (`src/app/ai-analysis/page.tsx`)
- Shows fetch errors + empty state
- Analysis component disabled

✅ **Settings** (`src/app/settings/page.tsx`)
- TokenStatus component shows configuration
- Green if `GITHUB_TOKEN` env var present
- Amber if missing

✅ **Studio Detail** (`src/app/studio/[studioId]/page.tsx`)
- Shows informative message if no live data

## Design System Colors

Error states use Kinetic Console palette:

- **Error**: `#ff716c` — Critical issues only (red reserved)
- **Warning**: `#ffc965` — Non-fatal issues (amber)
- **Info**: `#69daff` — Helpful information (cyan)

Backgrounds use low-opacity semi-transparent colors:
- `rgba(255,113,108,0.08)` for errors
- `rgba(255,201,101,0.08)` for warnings
- `rgba(105,218,255,0.08)` for info

## User Actions

When a user sees an error:

1. **Missing Token**: "Go to Settings" button navigates to `/settings`
2. **Rate Limited**: Shows "try again in a few minutes" — auto-retry on next page visit (cache revalidates after 1 hour)
3. **Network Error**: "Reload page" via browser reload in ErrorBoundary
4. **Partial Failure**: Shows which repos failed, renders available data

## Testing Error Scenarios

### Test 1: Missing Token
1. Remove `GITHUB_TOKEN` from `.env.local`
2. Visit any page
3. **Expected**: See "No data to display" empty state with "Go to Settings" button

### Test 2: Invalid Token
1. Set `GITHUB_TOKEN=ghp_invalid`
2. Visit any page
3. **Expected**: See error banner "GitHub token is invalid or missing"

### Test 3: Rate Limit
1. Make ~60 requests to GitHub API with no token
2. Visit any page
3. **Expected**: See "Rate limit exceeded" message
4. Manually wait 1 hour or change token for cache bust

### Test 4: Network Error
1. Disconnect internet during data fetch
2. Visit any page
3. **Expected**: See "Network error" message with "Reload page" button

### Test 5: Partial Failure
1. Add invalid repo to `CANONICAL_REPOS` alongside valid repos
2. Visit dashboard
3. **Expected**: See error banner showing partial data (e.g., "5/6 repos"), with expandable error details

## Future Enhancements

- [ ] Retry queue for failed repos with exponential backoff
- [ ] Rate limit tracking (show remaining quota on /settings)
- [ ] Error logging/monitoring integration (Sentry, etc.)
- [ ] Offline mode with stale data
- [ ] Error analytics (which errors most common, user recovery patterns)
