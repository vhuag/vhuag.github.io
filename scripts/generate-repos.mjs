#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const owner = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER || "vhuag";
const token = process.env.GH_REPOS_TOKEN || process.env.GITHUB_TOKEN;
const outputPath = process.argv[2] || "data/repos.json";
const apiBase = "https://api.github.com";

if (!token) {
  console.error("Missing GH_REPOS_TOKEN. Add a token that can read your private repositories.");
  process.exit(1);
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "vhuag-repo-index",
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
  }

  return body ? JSON.parse(body) : null;
}

function defaultPagesUrl(repoName) {
  const login = owner.toLowerCase();
  if (repoName.toLowerCase() === `${login}.github.io`) {
    return `https://${login}.github.io/`;
  }
  return `https://${login}.github.io/${encodeURIComponent(repoName)}/`;
}

async function getPagesUrl(repo) {
  if (!repo.has_pages) return null;

  try {
    const pages = await requestJson(`${apiBase}/repos/${repo.full_name}/pages`);
    return pages?.html_url || defaultPagesUrl(repo.name);
  } catch (error) {
    console.warn(`Could not read Pages metadata for ${repo.full_name}: ${error.message}`);
    return defaultPagesUrl(repo.name);
  }
}

async function getOwnedRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const url = new URL(`${apiBase}/user/repos`);
    url.searchParams.set("visibility", "all");
    url.searchParams.set("affiliation", "owner");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const batch = await requestJson(url);
    if (!Array.isArray(batch)) {
      throw new Error("GitHub returned an unexpected repositories response.");
    }

    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos.filter((repo) => repo.owner?.login?.toLowerCase() === owner.toLowerCase());
}

function countByVisibility(repos, visibility) {
  return repos.filter((repo) => repo.visibility === visibility).length;
}

async function main() {
  const rawRepos = await getOwnedRepos();
  const repos = [];

  for (const repo of rawRepos) {
    const visibility = repo.visibility || (repo.private ? "private" : "public");
    const pageUrl = await getPagesUrl(repo);

    repos.push({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      visibility,
      private: repo.private,
      url: repo.html_url,
      homepage: repo.homepage || null,
      language: repo.language,
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      archived: repo.archived,
      fork: repo.fork,
      hasPages: repo.has_pages,
      pageUrl,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      license: repo.license?.spdx_id || null,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    owner,
    source: "GitHub REST API /user/repos",
    counts: {
      total: repos.length,
      public: countByVisibility(repos, "public"),
      private: countByVisibility(repos, "private"),
      pages: repos.filter((repo) => repo.hasPages).length,
    },
    repos,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${repos.length} repositories to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
