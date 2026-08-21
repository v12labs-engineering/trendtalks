const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const { demoConversations } = require("../data/demo-repositories");
const { isDemoMode } = require("../services/trending-service");

const indexRouter = require("../routes/github");
const hnRoute = require("../routes/hackernews");
const redditRoute = require("../routes/reddit");
const stackoverflowRoute = require('../routes/stackoverflow');
const devtoRoute = require('../routes/devto');

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use("/vendor/phosphor", express.static(path.join(__dirname, "..", "node_modules", "@phosphor-icons", "web", "src")));

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

app.use("/", indexRouter);
app.use("/hn", hnRoute);
app.use("/reddit", redditRoute);
app.use('/stackoverflow', stackoverflowRoute);
app.use('/devto', devtoRoute);

app.get("/demo/conversations/:source", (req, res, next) => {
  if (!isDemoMode()) return next(createError(404));
  const conversations = demoConversations[req.params.source];
  if (!conversations) return next(createError(404));
  res.json(conversations);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  if (req.accepts("html")) {
    return res.render("error", {
      status: err.status || 500,
      message: err.status === 404 ? "That signal could not be found." : "TrendTalks could not load this signal.",
    });
  }
  res.json({ error: err.message || "Unexpected error" });
});

module.exports = app;
