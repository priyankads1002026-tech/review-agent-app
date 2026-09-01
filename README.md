# Claim Billing Request System

A full-stack POC application for managing insurance claim billing requests, 
built with Node.js + Express (backend) and React + Vite (frontend).

## Use Case Summary

This repository has one main idea: **AI-assisted PR review automation**.
The app includes a small claims-management product so there is realistic code
for the reviewer to analyze, but the central workflow is the review agent that
inspects every pull request and posts a structured comment.

### Primary use case: automated PR reviews

- A developer opens or updates a PR in this repository.
- GitHub Actions triggers `scripts/review.js`.
- The script collects the PR title, description, changed files, and diff.
- Claude analyzes the change set and generates a review with:
    - PR summary
    - critical issues
    - warnings
    - suggestions
    - an approval verdict
    - a copy-paste fix prompt
- The result is posted as one sticky PR comment, so the latest review always
    stays attached to the pull request.

### Supporting use case: claims billing demo app

- The backend exposes CRUD-style claim endpoints plus a summary endpoint.
- The frontend lets a user submit claims, list claims, filter by status or
    policy number, update claim status, and delete claims.
- The dashboard shows aggregate counts and total claim amount.
- Data lives in memory, so the app is meant for demonstration rather than
    production persistence.

### Why this project exists

The claims app provides a realistic business domain, while the PR review agent
demonstrates how AI can be used to summarize changes, spot risks, and guide
developers during code review.

---

## Project Structure

```
review-agent-app/
├── .github/
│   └── workflows/
│       └── pr-review.yml        ← GitHub Actions: auto-triggers on every PR
├── scripts/
│   └── review.js                ← Agent: fetches diff, calls Claude, commits review
├── backend/                     ← Node.js + Express REST API (in-memory store)
│   ├── package.json
│   └── server.js
└── frontend/                    ← React frontend (Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── ClaimList.jsx
        │   └── ClaimForm.jsx
        └── services/
            └── claimService.js
```

---

## How the PR Review Agent Works

1. Developer opens (or pushes to) a PR on this repo
2. The GitHub Actions workflow (`.github/workflows/pr-review.yml`) triggers automatically
3. `scripts/review.js` fetches the PR title, description, and diff via the GitHub API
4. Anthropic Claude (`claude-opus-4-8`) analyzes the changes and produces:
   - **📋 PR Summary** — what changed, mapping each file to the use case it affects
   - **🔴 Critical / 🟡 Warnings / 🟢 Suggestions** — the review findings
   - **✅ Verdict** — APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED
   - **🛠️ Suggested Fix Prompt** — a copy-pasteable prompt to hand to an AI assistant to fix the findings
5. The agent posts this as a **single sticky comment** on the PR, updating it in place on every push (no branch pollution, no duplicate comments)

---

## Setup

### Add GitHub Secret
Go to repo Settings → Secrets and variables → Actions → New repository secret:
- Name: `ANTHROPIC_API_KEY`
- Value: your key from https://console.anthropic.com/settings/keys

The workflow uses the built-in `GITHUB_TOKEN` (granted `pull-requests: write` + `issues: write`) to post the comment — no extra token needed.

### Test the review agent locally (no GitHub needed)
Run the same review prompt against a sample diff on your machine to confirm your key works:
```
cd scripts
npm install
$env:ANTHROPIC_API_KEY = "sk-ant-..."     # PowerShell
npm run test:review                         # reviews scripts/sample.diff
```
Edit `scripts/sample.diff` to try your own changes, or pass another diff file: `npm run test:review -- ../path/to.diff`. The review prints to your terminal — nothing is posted anywhere.

### Uploading to GitHub without git installed
This machine has no `git`/`gh` CLI. Easiest options:
- **GitHub Desktop** (GUI, no command line) — "Add local repository" → publish. It respects `.gitignore`, so `node_modules/`, build output, and the junk `{.github` folder are excluded automatically.
- **Web upload** — create an empty repo on github.com → "uploading an existing file" → drag the project in. Manually skip `node_modules/` and the `{.github` folder (the web uploader ignores `.gitignore`).

After it's on GitHub: create a branch, change a file, open a PR — the review agent runs on the PR automatically.

### Run Backend (http://localhost:8008)
```
cd backend
npm install
npm start          # override the port with $env:PORT if 8008 is busy
```

### Run Frontend (http://localhost:3000)
```
cd frontend
npm install
npm start
```

> The frontend calls the backend at `http://localhost:8008/api/claims` by default.
> To point it elsewhere, copy `frontend/.env.example` to `frontend/.env` and set
> `VITE_API_BASE_URL`. The backend's CORS is locked to the frontend's origin
> (`http://localhost:3000`), configurable via the `CORS_ORIGIN` env var.

> Requires Node.js (tested on v22). No Java, Maven, or Python needed.
> The backend uses an in-memory store, so data resets on every restart.
