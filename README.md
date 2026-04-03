# SDLC Friction Mapping — Neural Command Center

A live engineering metrics dashboard designed for high-velocity teams. Visualizes DORA metrics, pipeline friction, and AI adoption patterns in real-time from GitHub Actions, GitLab CI, Azure DevOps, or AWS CodePipeline.

## Features

- **Live DORA Metrics** — Deployment frequency, lead time, MTTR, change failure rate — powered by your CI/CD system
- **Friction Heatmap** — Stage-by-stage bottleneck analysis across all pipelines
- **DevEx Scores** — Developer Experience composite metrics (reliability, throughput, speed)
- **AI Adoption Insights** — Velocity vs. capability, context guardian scoring, prompt governance
- **Claude AI Analysis** — Generates prioritized friction-reduction recommendations in natural language
- **Custom Repo Support** — Add any GitHub or GitLab repo beyond your canonical set
- **Kinetic Console Design** — Dark HUD aesthetic with electric cyan, neon mint, and amber color palette

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd SDLC_FrictionMapping
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then add your tokens:

**GitHub Token** (required for live data):
- Go to https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Scopes: `repo` (full control), `read:org`
- Copy and paste into `GITHUB_TOKEN=`

**Anthropic API Key** (required for AI analysis):
- Go to https://console.anthropic.com/account/keys
- Create a new API key
- Copy and paste into `ANTHROPIC_API_KEY=`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Page | Purpose |
|------|---------|
| `/` | Dashboard — MetricsCards, Friction Heatmap, DevEx scores, AI adoption summary |
| `/pipelines` | Studios Grid — Compact repo cards with zoom-in detail view |
| `/metrics` | DORA Scorecard — Lead time trends, CFR radar, deployment frequency, DevEx breakdown |
| `/friction` | Friction Map — Heatmap and stage performance summary |
| `/ai-analysis` | AI Friction Analysis — Generate recommendations across all repos or per-studio |
| `/settings` | Live Mode Config — GitHub, GitLab, Azure DevOps, AWS connector documentation |

## Data Sources

### GitHub Actions ✅
- Authenticated: 5,000 API calls/hour
- Unauthenticated: 60 calls/hour
- Fetches: workflow runs, open PRs, friction issues (labeled)
- Computes: deployment frequency, lead time, change failure rate

### GitLab CI ✅
- Uses REST API v4 with identical response shape to GitHub
- Fetches: pipelines, jobs, MRs, labeled issues
- Returns provider-agnostic `GitHubLiveResponse` format

### Azure DevOps ⚠️
- Requires Personal Access Token (PAT) auth
- Fetches via `_apis/pipelines` endpoints (v7.1)
- Requires your own org/project (no public projects)

### AWS CodePipeline ⚠️
- Requires IAM credentials
- Uses `@aws-sdk/client-codepipeline`
- Requires your own AWS account

## Known Limitations

### Lead Time Trends
The lead time chart's trend lines are currently illustrative (mock-derived from the last 7 days of DORA point metrics). To make trends fully real, we'd need to:
- Make historical GitHub API calls per weekly bucket using `created>=DATE` filters
- Persist snapshots over time to a database or localStorage
- This is not yet implemented but is feasible within the existing GitHub API quota

### AI Adoption Metrics
The AI Adoption Panel (metrics showing velocity vs. capability, context guardian score, etc.) uses representative mock data. To make it live:
- Integrate GitHub Copilot Metrics API (`GET /orgs/{org}/copilot/usage`)
- Parse git commit metadata for adoption signals
- Requires org-level Copilot setup and billing

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel dashboard
3. Add environment variables:
   - `GITHUB_TOKEN`
   - `ANTHROPIC_API_KEY`
4. Deploy

### Docker

```bash
docker build -t sdlc-friction-map .
docker run -e GITHUB_TOKEN=xxx -e ANTHROPIC_API_KEY=yyy -p 3000:3000 sdlc-friction-map
```

## Architecture

- **Next.js 16.2.1** — App Router, async server components
- **TypeScript** — Type-safe data pipelines
- **Recharts** — DORA metric visualization
- **Tailwind CSS + Custom CSS** — Kinetic Console design system
- **Anthropic Claude Haiku** — AI analysis
- **GitHub/GitLab APIs** — Live data fetching

## Customization

### Adding Repos

1. Edit `src/lib/repo-config.ts` to add to `CANONICAL_REPOS`
2. Or use the in-app "Add Repo" button to store custom repos in localStorage

### Styling

All design tokens are in `src/app/globals.css`:
- `--nc-void`: `#0c0e11` (background)
- `--nc-cyan`: `#69daff` (primary/action)
- `--nc-mint`: `#00ffa3` (success)
- `--nc-amber`: `#ffc965` (warning)
- `--nc-error`: `#ff716c` (critical — red reserved for critical errors only)

Update these to change the entire theme instantly.

## Contributing

This is a shared internal tool for engineering recruitment. When submitting changes:
- Maintain the Kinetic Console aesthetic
- Test with real GitHub/GitLab data before merging
- Add notes for any new environment variables
- Update this README with new pages or features

## Support

For issues:
1. Check `.env.local` has valid tokens
2. Verify GitHub token has `repo` and `read:org` scopes
3. Check rate limit status in `/settings` page
4. Review browser console for errors

---

**Design System:** The Kinetic Console — Engineered for high-velocity teams.  
**Built for:** Engineering leadership, recruiting, and SDLC optimization.
