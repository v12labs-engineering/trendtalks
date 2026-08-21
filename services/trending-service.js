const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const { demoRepositories } = require("../data/demo-repositories");

const cache = new NodeCache({ stdTTL: 900, useClones: false });

function isDemoMode() {
  return process.env.TREND_TALKS_DEMO === "true";
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function normalizeRepository(repo, rank) {
  const totalStars = Number(repo.totalStars) || 0;
  const forks = Number(repo.forks) || 0;
  return {
    ...repo,
    id: repo.id || `${repo.username}-${repo.repositoryName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    rank: rank + 1,
    totalStars,
    forks,
    velocity: Number(repo.velocity) || 0,
    conversations: Number(repo.conversations) || 0,
    brief: repo.brief || `Explore source-backed conversations about ${repo.username}/${repo.repositoryName}.`,
    themes: Array.isArray(repo.themes) ? repo.themes : [],
    daily: Array.isArray(repo.daily) ? repo.daily : [],
    updatedAt: repo.updatedAt || new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date()),
  };
}

async function scrapeTrendingRepositories() {
  const response = await axios.get("https://github.com/trending", {
    timeout: 8000,
    headers: { "User-Agent": "TrendTalks/1.0" },
  });
  const $ = cheerio.load(response.data);
  const repositories = [];

  $("article.Box-row").each((index, element) => {
    const item = $(element);
    const title = item.find("h2 a").text().trim().replace(/\s+/g, " ");
    const [username, repositoryName] = title.split("/").map((part) => part.trim());
    if (!username || !repositoryName) return;
    const parseCount = (value) => Number.parseInt(String(value || "0").replace(/,/g, ""), 10) || 0;
    repositories.push(normalizeRepository({
      username,
      repositoryName,
      url: `https://github.com${item.find("h2 a").attr("href")}`,
      description: item.find("p.col-9").text().trim() || "No repository description provided.",
      language: item.find('[itemprop="programmingLanguage"]').text().trim() || "Other",
      languageColor: item.find(".repo-language-color").css("background-color") || "#64748b",
      totalStars: parseCount(item.find(`a[href$="/${username}/${repositoryName}/stargazers"]`).text().trim()),
      forks: parseCount(item.find(`a[href$="/${username}/${repositoryName}/forks"]`).text().trim()),
      builtBy: item.find('span:contains("Built by") a').map((_, link) => ({
        username: $(link).attr("href")?.slice(1),
        url: `https://github.com${$(link).attr("href")}`,
        avatar: $(link).find("img").attr("src"),
      })).get(),
    }, index));
  });

  if (!repositories.length) throw new Error("GitHub Trending returned no repositories");
  return repositories;
}

async function getTrendingRepositories() {
  if (isDemoMode()) return demoRepositories.map(normalizeRepository);
  const cached = cache.get("trending");
  if (cached) return cached;
  const repositories = await scrapeTrendingRepositories();
  cache.set("trending", repositories);
  return repositories;
}

module.exports = { getTrendingRepositories, isDemoMode, normalizeRepository, safeJson };
