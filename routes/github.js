const express = require("express");
const { getTrendingRepositories, isDemoMode, safeJson } = require("../services/trending-service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const repos = await getTrendingRepositories();
    res.render("index", {
      repos,
      serializedRepos: safeJson(repos),
      demoMode: isDemoMode(),
      captureMode: isDemoMode() && req.query.capture === "1",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
