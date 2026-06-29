const DATA_URL = "data/repos.json";

const state = {
  repos: [],
  query: "",
  visibility: "all",
};

const elements = {
  totalCount: document.getElementById("totalCount"),
  publicCount: document.getElementById("publicCount"),
  privateCount: document.getElementById("privateCount"),
  pagesCount: document.getElementById("pagesCount"),
  updatedAt: document.getElementById("updatedAt"),
  searchInput: document.getElementById("searchInput"),
  clearFilters: document.getElementById("clearFilters"),
  status: document.getElementById("status"),
  repoList: document.getElementById("repoList"),
  visibilityButtons: document.querySelectorAll("[data-visibility]"),
};

const languageColors = {
  "C#": "#178600",
  "C++": "#f34b7d",
  CSS: "#563d7c",
  Go: "#00add8",
  HTML: "#e34c26",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  Kotlin: "#a97bff",
  Python: "#3572a5",
  Rust: "#dea584",
  Shell: "#89e051",
  TypeScript: "#3178c6",
  Vue: "#41b883",
};

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Not generated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not generated yet";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getVisibility(repo) {
  if (repo.visibility) return repo.visibility;
  return repo.private ? "private" : "public";
}

function matchesSearch(repo) {
  const query = state.query.trim().toLowerCase();
  if (!query) return true;

  const fields = [
    repo.name,
    repo.description,
    repo.language,
    getVisibility(repo),
    ...(repo.topics || []),
  ];

  return fields.some((field) => String(field || "").toLowerCase().includes(query));
}

function getFilteredRepos() {
  return state.repos
    .filter((repo) => state.visibility === "all" || getVisibility(repo) === state.visibility)
    .filter(matchesSearch)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("status-error", isError);
  elements.status.hidden = !message;
}

function renderCounts() {
  const publicRepos = state.repos.filter((repo) => getVisibility(repo) === "public");
  const privateRepos = state.repos.filter((repo) => getVisibility(repo) === "private");
  const pagesRepos = state.repos.filter((repo) => repo.hasPages);

  elements.totalCount.textContent = state.repos.length;
  elements.publicCount.textContent = publicRepos.length;
  elements.privateCount.textContent = privateRepos.length;
  elements.pagesCount.textContent = pagesRepos.length;
}

function createBadge(text, variant) {
  const badge = document.createElement("span");
  badge.className = `badge ${variant || ""}`.trim();
  badge.textContent = text;
  return badge;
}

function createLanguage(repo) {
  const language = repo.language || "Unknown";
  const wrapper = document.createElement("span");
  wrapper.className = "language";

  const swatch = document.createElement("span");
  swatch.className = "language-swatch";
  swatch.style.backgroundColor = languageColors[language] || "#737373";

  const label = document.createElement("span");
  label.textContent = language;

  wrapper.append(swatch, label);
  return wrapper;
}

function createRepoCard(repo) {
  const visibility = getVisibility(repo);
  const card = document.createElement("article");
  card.className = "repo-card";

  const header = document.createElement("div");
  header.className = "repo-card-header";

  const titleBlock = document.createElement("div");
  titleBlock.className = "repo-title-block";

  const title = document.createElement("a");
  title.className = "repo-title";
  title.href = repo.url;
  title.rel = "noreferrer";
  title.textContent = repo.name;

  const description = document.createElement("p");
  description.className = "repo-description";
  description.textContent = repo.description || "No description";

  titleBlock.append(title, description);

  const visibilityBadge = createBadge(visibility, visibility);
  header.append(titleBlock, visibilityBadge);

  const meta = document.createElement("div");
  meta.className = "repo-meta";
  meta.append(
    createLanguage(repo),
    createBadge(`${repo.stars || 0} stars`),
    createBadge(`${repo.forks || 0} forks`),
    createBadge(`Updated ${formatDate(repo.updatedAt)}`),
  );

  if (repo.archived) meta.append(createBadge("Archived", "muted"));
  if (repo.fork) meta.append(createBadge("Fork", "muted"));

  const links = document.createElement("div");
  links.className = "repo-links";

  const repoLink = document.createElement("a");
  repoLink.className = "repo-action";
  repoLink.href = repo.url;
  repoLink.rel = "noreferrer";
  repoLink.textContent = "Repo";
  links.append(repoLink);

  if (repo.pageUrl) {
    const pageLink = document.createElement("a");
    pageLink.className = "repo-action page-action";
    pageLink.href = repo.pageUrl;
    pageLink.rel = "noreferrer";
    pageLink.textContent = "Page";
    links.append(pageLink);
  }

  if (repo.homepage && repo.homepage !== repo.pageUrl) {
    const homeLink = document.createElement("a");
    homeLink.className = "repo-action";
    homeLink.href = repo.homepage;
    homeLink.rel = "noreferrer";
    homeLink.textContent = "Home";
    links.append(homeLink);
  }

  card.append(header, meta, links);
  return card;
}

function renderRepos() {
  const repos = getFilteredRepos();
  elements.repoList.replaceChildren();

  if (repos.length === 0) {
    setStatus("No repositories match the current filters.");
    return;
  }

  setStatus("");
  const fragment = document.createDocumentFragment();
  repos.forEach((repo) => fragment.append(createRepoCard(repo)));
  elements.repoList.append(fragment);
}

function renderMetadata(data) {
  const generatedAt = formatDateTime(data.generatedAt);
  elements.updatedAt.textContent = `Generated ${generatedAt}`;
}

function render(data) {
  renderMetadata(data);
  renderCounts();
  renderRepos();
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderRepos();
  });

  elements.visibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.visibility = button.dataset.visibility;
      elements.visibilityButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderRepos();
    });
  });

  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.visibility = "all";
    elements.searchInput.value = "";
    elements.visibilityButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.visibility === "all");
    });
    renderRepos();
  });
}

async function loadRepos() {
  bindControls();

  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json();
    state.repos = Array.isArray(data.repos) ? data.repos : [];
    render(data);
  } catch (error) {
    console.error(error);
    setStatus(
      "Repository data is not available yet. Add GH_REPOS_TOKEN, run the Pages workflow, then refresh this page.",
      true,
    );
  }
}

loadRepos();
