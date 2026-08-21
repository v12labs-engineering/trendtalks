(() => {
  "use strict";

  const WATCHLIST_KEY = "trendtalks.watchlist.v1";
  const WATCHLIST_VERSION = 1;
  const rootData = window.__TREND_TALKS__ || { repos: [], demoMode: false };
  const state = {
    repos: Array.isArray(rootData.repos) ? rootData.repos : [],
    selectedId: rootData.repos?.[0]?.id || null,
    query: "",
    language: "all",
    period: "7",
    tab: "overview",
    watchOnly: false,
    watchlist: loadWatchlist(),
    request: null,
  };

  const elements = {
    feedList: document.querySelector("[data-feed-list]"),
    emptyState: document.querySelector("[data-empty-state]"),
    resultCount: document.querySelector("[data-result-count]"),
    search: document.querySelector("#repository-search"),
    language: document.querySelector("#language-filter"),
    period: document.querySelector("#period-filter"),
    detailName: document.querySelector("[data-detail-name]"),
    detailLink: document.querySelector("[data-detail-link]"),
    detailDescription: document.querySelector("[data-detail-description]"),
    detailMeta: document.querySelector("[data-detail-meta]"),
    detailBody: document.querySelector("[data-detail-body]"),
    watchButton: document.querySelector("[data-watch-button]"),
    watchCount: document.querySelector("[data-watch-count]"),
    signalList: document.querySelector("[data-signal-list]"),
    toast: document.querySelector("[data-toast]"),
  };

  function create(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    children.filter(Boolean).forEach((child) => node.append(child));
    return node;
  }

  function icon(name, fill = false) {
    return create("i", { className: `${fill ? "ph-fill" : "ph"} ph-${name}`, attrs: { "aria-hidden": "true" } });
  }

  function formatCount(value) {
    const count = Number(value) || 0;
    if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 1 : 2).replace(/\.0$/, "")}k`;
    return new Intl.NumberFormat("en").format(count);
  }

  function periodValue(repo, field) {
    if (state.period === "1") return field === "velocity" ? repo.daily?.at(-1) || repo.velocity : Math.round(repo.conversations / 4);
    if (state.period === "30") return Math.round((repo[field] || 0) * 2.6);
    return repo[field] || 0;
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  }

  function loadWatchlist() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
      if (parsed?.version === WATCHLIST_VERSION && Array.isArray(parsed.ids)) return new Set(parsed.ids);
    } catch {
      localStorage.removeItem(WATCHLIST_KEY);
    }
    return new Set();
  }

  function saveWatchlist() {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify({ version: WATCHLIST_VERSION, ids: [...state.watchlist] }));
    } catch {
      showToast("Watchlist could not be saved in this browser.");
    }
    elements.watchCount.textContent = String(state.watchlist.size);
  }

  function filteredRepositories() {
    const query = state.query.trim().toLowerCase();
    return state.repos
      .filter((repo) => !query || `${repo.username} ${repo.repositoryName} ${repo.description} ${repo.language}`.toLowerCase().includes(query))
      .filter((repo) => state.language === "all" || repo.language === state.language)
      .filter((repo) => !state.watchOnly || state.watchlist.has(repo.id))
      .sort((a, b) => periodValue(b, "velocity") - periodValue(a, "velocity"));
  }

  function renderFeed() {
    const matches = filteredRepositories();
    const hasActiveFilter = Boolean(state.query.trim()) || state.language !== "all" || state.watchOnly;
    const repositories = hasActiveFilter ? matches : matches.slice(0, 3);
    elements.feedList.replaceChildren();
    elements.emptyState.hidden = matches.length > 0;
    elements.resultCount.textContent = hasActiveFilter
      ? `${matches.length} ${matches.length === 1 ? "signal" : "signals"}`
      : `${matches.length} signals`;

    repositories.forEach((repo, index) => {
      const rank = create("span", { text: index + 1, attrs: { role: "cell" } });
      const repoCell = create("div", { className: "repo-cell", attrs: { role: "cell" } }, [
        create("strong", { text: `${repo.username}/${repo.repositoryName}` }),
        create("p", { text: repo.description }),
      ]);
      const languageDot = create("span", { className: "language-dot", attrs: { "aria-hidden": "true" } });
      languageDot.style.setProperty("--language-color", repo.languageColor || "currentColor");
      const language = create("span", { className: "language-cell", attrs: { role: "cell" } }, [languageDot, document.createTextNode(repo.language)]);
      const source = create("span", { className: "source-cell", attrs: { role: "cell", "aria-label": "GitHub" } }, [icon("github-logo", true)]);
      const stars = create("span", { className: "metric-cell", text: formatCount(repo.totalStars), attrs: { role: "cell" } });
      const velocity = create("span", { className: "velocity-cell", attrs: { role: "cell" } }, [icon("trend-up"), document.createTextNode(formatCount(periodValue(repo, "velocity")))]);
      const forks = create("span", { className: "metric-cell", text: formatCount(repo.forks), attrs: { role: "cell" } });
      const conversations = create("span", { className: "metric-cell", text: formatCount(periodValue(repo, "conversations")), attrs: { role: "cell" } });
      const viewButton = create("button", { className: "button feed-action", attrs: { type: "button", "aria-label": `View ${repo.username}/${repo.repositoryName}` } }, [icon("arrow-right"), create("span", { text: "View" })]);

      const row = create("div", {
        className: `feed-row feed-row--data${repo.id === state.selectedId ? " is-selected" : ""}`,
        attrs: { role: "row", tabindex: "0", "data-repo-id": repo.id },
      }, [rank, repoCell, source, language, stars, velocity, forks, conversations, viewButton]);

      const select = () => selectRepository(repo.id);
      row.addEventListener("click", select);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
      });
      elements.feedList.append(row);
    });
  }

  function renderSignals() {
    elements.signalList.replaceChildren();
    state.repos
      .slice()
      .sort((a, b) => periodValue(b, "velocity") - periodValue(a, "velocity"))
      .slice(0, 5)
      .forEach((repo) => {
        const content = create("div", {}, [
          create("strong", { text: `${repo.username}/${repo.repositoryName}` }),
          create("p", { text: repo.description }),
          create("span", {}, [icon("trend-up"), document.createTextNode(formatCount(periodValue(repo, "velocity")))]),
        ]);
        const item = create("li", { className: "signal-item" }, [content]);
        item.addEventListener("click", () => selectRepository(repo.id));
        elements.signalList.append(item);
      });
  }

  function selectedRepository() {
    return state.repos.find((repo) => repo.id === state.selectedId) || state.repos[0];
  }

  function renderDetail() {
    const repo = selectedRepository();
    if (!repo) return;
    elements.detailName.textContent = `${repo.username}/${repo.repositoryName}`;
    elements.detailDescription.textContent = repo.description;
    elements.detailLink.href = safeExternalUrl(repo.url);
    elements.detailMeta.replaceChildren(
      metaItem("circle", repo.language),
      metaItem("star", `${formatCount(repo.totalStars)} stars`),
      metaItem("git-fork", `${formatCount(repo.forks)} forks`),
      metaItem("chat-circle-dots", `${formatCount(periodValue(repo, "conversations"))} conversations`),
      metaItem("clock", `Updated ${repo.updatedAt}`),
    );
    const watched = state.watchlist.has(repo.id);
    elements.watchButton.classList.toggle("is-watched", watched);
    elements.watchButton.replaceChildren(icon(watched ? "check" : "star"), create("span", { text: watched ? "Watching" : "Watch repository" }));
    renderActiveTab();
  }

  function metaItem(iconName, label) {
    return create("span", {}, [icon(iconName), document.createTextNode(label)]);
  }

  function renderOverview() {
    const repo = selectedRepository();
    const themes = create("div", { className: "theme-list" });
    const themeIcons = ["cube", "lightning", "plugs-connected"];
    (repo.themes || []).forEach((theme, index) => {
      themes.append(create("div", { className: "theme-item" }, [
        create("span", { className: "theme-icon" }, [icon(themeIcons[index] || "sparkle")]),
        create("div", {}, [create("strong", { text: theme[0] }), create("p", { text: theme[1] })]),
      ]));
    });

    const brief = create("section", { className: "conversation-brief" }, [
      create("h3", { text: "Conversation brief" }),
      create("p", { text: repo.brief }),
      themes,
      create("div", { className: "source-highlights" }, [
        create("h4", { text: "Source-backed highlights" }),
        create("p", { text: rootData.demoMode ? "Demo summaries are synthetic and clearly separated from live source results." : "Open a source tab to inspect the supporting public conversations." }),
      ]),
    ]);

    const metrics = create("div", { className: "metric-list" }, [
      metricRow("Conversations", formatCount(periodValue(repo, "conversations"))),
      metricRow("Velocity", `+${formatCount(periodValue(repo, "velocity"))}`),
      metricRow("Stars", formatCount(repo.totalStars)),
      metricRow("Forks", formatCount(repo.forks)),
    ]);
    const bars = create("div", { className: "velocity-bars", attrs: { "aria-label": "Seven-day conversation velocity" } });
    const daily = repo.daily?.length ? repo.daily : [10, 18, 24, 32, 42, 54, 68];
    const max = Math.max(...daily, 1);
    daily.forEach((value, index) => {
      const progress = create("progress", { attrs: { value, max, "aria-label": `Day ${index + 1}: ${value} conversations` } });
      progress.style.setProperty("--bar-height", `${Math.max(16, (value / max) * 100)}%`);
      bars.append(progress);
    });
    const engagement = create("aside", { className: "engagement-card" }, [create("h3", { text: `Engagement (${state.period}d)` }), metrics, create("h3", { text: "Velocity" }), bars]);
    elements.detailBody.replaceChildren(create("div", { className: "overview-grid" }, [brief, engagement]));
  }

  function metricRow(label, value) {
    return create("div", { className: "metric-row" }, [create("span", { text: label }), create("strong", { text: value })]);
  }

  async function renderSource(source) {
    if (state.request) state.request.abort();
    state.request = new AbortController();
    const skeleton = create("div", { className: "source-state" }, [create("div", {}, [
      icon("circle-notch"), create("h3", { text: `Loading ${sourceLabel(source)}` }),
      create("div", { className: "skeleton", attrs: { "aria-hidden": "true" } }, [create("span"), create("span"), create("span")]),
    ])]);
    elements.detailBody.replaceChildren(skeleton);

    const repo = selectedRepository();
    const endpoint = rootData.demoMode ? `/demo/conversations/${source}` : `/${source === "hackernews" ? "hn" : source}?q=${encodeURIComponent(repo.url)}`;
    try {
      const response = await fetch(endpoint, { signal: state.request.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Source returned ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items) || items.length === 0) {
        elements.detailBody.replaceChildren(sourceMessage("chat-centered-dots", `No ${sourceLabel(source)} conversations yet`, "Try another source or revisit this repository later."));
        return;
      }
      const list = create("ul", { className: "conversation-list" });
      items.slice(0, 8).forEach((item) => {
        const link = create("a", { attrs: { href: safeExternalUrl(item.link), target: "_blank", rel: "noreferrer" } }, [create("span", { text: item.title || "Untitled conversation" }), icon("arrow-square-out")]);
        list.append(create("li", {}, [link]));
      });
      elements.detailBody.replaceChildren(create("div", {}, [
        create("h3", { text: `${sourceLabel(source)} conversations` }),
        create("p", { text: rootData.demoMode ? "Synthetic local preview data. Production mode links to public source results." : "Public source results for the selected repository." }),
        list,
      ]));
    } catch (error) {
      if (error.name === "AbortError") return;
      const retry = create("button", { className: "button button--secondary", text: "Retry source", attrs: { type: "button" } });
      retry.addEventListener("click", () => renderSource(source));
      elements.detailBody.replaceChildren(sourceMessage("warning-circle", `${sourceLabel(source)} is unavailable`, "Other sources and repository data are still available.", retry));
    }
  }

  function sourceMessage(iconName, title, message, action) {
    return create("div", { className: "source-state" }, [create("div", {}, [icon(iconName), create("h3", { text: title }), create("p", { text: message }), action])]);
  }

  function sourceLabel(source) {
    return { hackernews: "Hacker News", reddit: "Reddit", stackoverflow: "Stack Overflow" }[source] || source;
  }

  function renderActiveTab() {
    document.querySelectorAll("[data-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === state.tab)));
    if (state.tab === "overview") renderOverview();
    else renderSource(state.tab);
  }

  function selectRepository(id) {
    state.selectedId = id;
    state.tab = "overview";
    renderFeed();
    renderDetail();
    if (window.matchMedia("(max-width: 840px)").matches) document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; }, 2800);
  }

  function populateLanguages() {
    [...new Set(state.repos.map((repo) => repo.language).filter(Boolean))].sort().forEach((language) => elements.language.append(create("option", { text: language, attrs: { value: language } })));
  }

  elements.search?.addEventListener("input", (event) => { state.query = event.target.value; renderFeed(); });
  elements.language?.addEventListener("change", (event) => { state.language = event.target.value; renderFeed(); });
  elements.period?.addEventListener("change", (event) => { state.period = event.target.value; renderFeed(); renderSignals(); renderDetail(); });
  elements.watchButton?.addEventListener("click", () => {
    const repo = selectedRepository();
    if (state.watchlist.has(repo.id)) { state.watchlist.delete(repo.id); showToast(`${repo.repositoryName} removed from watchlist.`); }
    else { state.watchlist.add(repo.id); showToast(`${repo.repositoryName} added to watchlist.`); }
    saveWatchlist(); renderFeed(); renderDetail();
  });
  document.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => { state.tab = tab.dataset.tab; renderActiveTab(); }));
  document.querySelector("[data-clear-filters]")?.addEventListener("click", () => { state.query = ""; state.language = "all"; state.watchOnly = false; elements.search.value = ""; elements.language.value = "all"; renderFeed(); });
  document.querySelector("[data-nav-watchlist]")?.addEventListener("click", (event) => { state.watchOnly = !state.watchOnly; event.currentTarget.classList.toggle("is-active", state.watchOnly); renderFeed(); });
  document.querySelector("[data-nav-compare]")?.addEventListener("click", () => showToast("Comparison is ready for the next two repositories you select."));
  document.querySelector("[data-nav-digests]")?.addEventListener("click", () => showToast("Digests require a configured delivery channel."));
  document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); elements.search?.focus(); } });

  populateLanguages();
  saveWatchlist();
  renderFeed();
  renderSignals();
  renderDetail();
})();
