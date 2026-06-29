# vhuag.github.io

Static GitHub Pages index for `vhuag` repositories.

The site reads `data/repos.json`. In production, GitHub Actions generates that
file during deployment so private repository metadata can be included without
putting a token in browser JavaScript.

## Setup

1. Create a GitHub token that can read the private repositories you want to list.
   The simplest option is a classic PAT with `repo` scope.
2. Add it to this repository as an Actions secret named `GH_REPOS_TOKEN`.
3. In repository settings, set Pages source to **GitHub Actions**.
4. Run **Deploy repository index** manually from the Actions tab, or wait for the
   daily scheduled run.

The workflow runs on:

- manual trigger: `workflow_dispatch`
- daily schedule: `0 16 * * *` UTC, which is 00:00 in Taiwan
- pushes to `main`

Anything written to `data/repos.json` in the deployed artifact is public on
GitHub Pages. Do not include private repository fields that should stay private.

## Local data generation

```bash
GH_REPOS_TOKEN=your_token node scripts/generate-repos.mjs data/repos.json
```

Then serve the folder with any static server and open `index.html`.
