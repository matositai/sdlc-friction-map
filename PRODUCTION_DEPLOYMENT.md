# Production Deployment Guide

## Pre-Deployment Checklist

- [x] Accessibility fixes (WCAG 2.4.1, 2.4.7, 1.3.1)
- [x] Performance optimizations (chart memoization, data caching)
- [x] Error handling & rate limit detection
- [x] Real DORA trend data from GitHub API
- [x] Custom repos with drill-down detail view
- [x] Server-side AI report caching (Vercel KV)
- [x] Build passes cleanly

---

## Step 1 — Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `sdlc-friction-map` (or your preferred name)
3. **Description:** "SDLC Friction Mapping Dashboard for Recruiters — Real-time DORA metrics, AI friction analysis, GitHub Actions/GitLab CI integration"
4. **Visibility:** Public (or Private if you prefer)
5. **Initialize with:** Nothing (we'll push existing code)
6. Click **Create repository**

---

## Step 2 — Push Local Code to GitHub

After creating the repo, you'll see a push guide. Run these commands in your terminal:

```bash
cd /Users/itaimatos/Documents/VibeProjects/SDLC_FrictionMapping

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/sdlc-friction-map.git

# Verify it's correct
git remote -v

# Push to main
git branch -M main
git push -u origin main
```

---

## Step 3 — Set Up Vercel Project

### 3a — Import from GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select the `sdlc-friction-map` repo you just created
4. Click **Import**

### 3b — Configure Environment Variables (Part 1)

In the Vercel dashboard, go to **Settings → Environment Variables** and add these two manually:

| Variable | Source |
|----------|--------|
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) — Create new token (classic) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) — Copy your API key |

(Upstash credentials will be added automatically in step 3c)

**GitHub Token Setup:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Name: `SDLC Friction Map — Vercel`
4. Select scopes:
   - `repo` (full access to repositories)
   - `read:org` (read organization data)
5. Generate and copy token
6. Add to Vercel as `GITHUB_TOKEN`

**Anthropic API Key Setup:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create or copy your existing API key
3. Add to Vercel as `ANTHROPIC_API_KEY`

### 3c — Set Up Upstash Redis (for report caching)

1. In Vercel dashboard, go to **Storage → Upstash** (under "Marketplace Database Providers")
2. Click **Create Database**
3. Select:
   - **Type:** Redis
   - **Region:** Pick closest to your users (or leave default)
   - Click **Create**
4. Click **Connect** → Select your project → **Confirm**
5. Vercel automatically adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your environment

Verify: In **Settings → Environment Variables**, you should see two new Upstash vars.

---

## Step 4 — Deploy

After configuring environment variables:

1. Click **Deploy** (Vercel auto-deploys on push)
2. Wait for build to complete (~3-5 minutes)
3. You'll get a live URL like `https://sdlc-friction-map.vercel.app`

---

## Step 5 — Verify Deployment

Once live, test these on the production URL:

- [ ] Dashboard loads with 6 canonical studios
- [ ] Rate limit widget shows your quota (Settings page)
- [ ] Click on a studio → detail view opens with heatmap + AI analysis
- [ ] Navigate to DORA Metrics → charts display real data
- [ ] Click period buttons (7d/14d/30d/90d) → charts animate
- [ ] Go to Friction Map → heatmap filters work
- [ ] Add a custom repo (Add Repo button) → appears in grid
- [ ] Click custom repo → detail view opens
- [ ] Generate an AI report → "Generated on [date]" label shows
- [ ] Refresh page → report displays from cache (no "Analyze" click needed)
- [ ] Open in different browser/incognito → same reports visible (shared via KV)

---

## Sharing with Recruiters

Your live URL is: `https://sdlc-friction-map.vercel.app`

**What recruiters see:**
- Real-time DORA metrics (updated every 1 hour via Next.js cache)
- Friction heatmap showing bottlenecks
- AI friction analysis (cached server-side, shared across all viewers)
- Studio-specific drill-down views
- Custom repo support (add their own projects to analyze)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No data to display" on dashboard | Check `GITHUB_TOKEN` in Vercel env vars is set correctly |
| Rate limit errors | You've hit GitHub API quota (5,000/hour). Wait for reset or use multiple tokens in rotation |
| AI analysis not caching | Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set in Vercel env |
| Charts show mock data | Real data fetch might have failed. Check Vercel logs for API errors |
| Build fails | Check Vercel build logs. Common issue: missing env var at build time |

---

## Post-Deployment

1. **Monitor rate limits** — Watch the Settings page countdown daily
2. **Share the URL** — Send `https://your-vercel-url.vercel.app` to recruiters
3. **Collect feedback** — Note any friction points they report
4. **Iterate** — Add more studios or features based on feedback

---

## Rollback / Updates

To push updates:

```bash
# Make local changes, commit
git add .
git commit -m "..."

# Push to GitHub
git push origin main

# Vercel auto-deploys (watch at vercel.com dashboard)
```

---

## Next Steps (Optional Enhancements)

- [ ] Add custom domain (`your-domain.com` instead of `vercel.app`)
- [ ] Set up GitHub webhooks to auto-refresh on new commits
- [ ] Add Slack bot to alert on critical friction points
- [ ] Integrate GitLab projects (code already supports `@gitlab` provider)
- [ ] Add team-wide friction trending (track metrics over weeks)
