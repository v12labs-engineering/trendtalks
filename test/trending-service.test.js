const test = require("node:test");
const assert = require("node:assert/strict");
const { demoRepositories } = require("../data/demo-repositories");
const { normalizeRepository, safeJson } = require("../services/trending-service");

test("safeJson neutralizes closing script tags", () => {
  const output = safeJson({ title: "</script><script>alert(1)</script>" });
  assert.equal(output.includes("</script>"), false);
  assert.equal(output.includes("\\u003c/script>"), true);
});

test("normalizeRepository creates a stable identifier and numeric metrics", () => {
  const repo = normalizeRepository({ username: "V12 Labs", repositoryName: "Signal Canvas", totalStars: "42", forks: "8" }, 0);
  assert.equal(repo.id, "v12-labs-signal-canvas");
  assert.equal(repo.rank, 1);
  assert.equal(repo.totalStars, 42);
  assert.equal(repo.forks, 8);
});

test("demo repositories contain unique IDs and required product fields", () => {
  assert.equal(new Set(demoRepositories.map((repo) => repo.id)).size, demoRepositories.length);
  for (const repo of demoRepositories) {
    assert.ok(repo.username);
    assert.ok(repo.repositoryName);
    assert.ok(repo.description);
    assert.ok(repo.language);
    assert.ok(Array.isArray(repo.daily));
  }
});
