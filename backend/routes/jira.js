const express = require('express');
const router = express.Router();
const jiraService = require('../services/jiraService');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Config ────────────────────────────────────────────────────────────────────

// GET /api/jira/config/status
router.get('/config/status', (req, res) => {
  const { JIRA_BASE_URL, JIRA_API_TOKEN } = process.env;
  res.json({
    configured: !!(JIRA_BASE_URL && JIRA_API_TOKEN),
    baseUrl: JIRA_BASE_URL || null,
    hasToken: !!JIRA_API_TOKEN,
  });
});

// POST /api/jira/config
router.post('/config', (req, res) => {
  const { baseUrl, token } = req.body;
  if (!baseUrl || !token) {
    return res.status(400).json({ error: 'baseUrl and token are required' });
  }
  process.env.JIRA_BASE_URL = baseUrl.replace(/\/$/, '');
  process.env.JIRA_API_TOKEN = token;
  res.json({ message: 'Jira configuration updated successfully' });
});

// ── Current user ──────────────────────────────────────────────────────────────

// GET /api/jira/me
router.get('/me', asyncHandler(async (req, res) => {
  const user = await jiraService.getCurrentUser();
  res.json(user);
}));

// ── Users ──────────────────────────────────────────────────────────────────────

// GET /api/jira/users/search?query=...
router.get('/users/search', asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query parameter is required' });
  const users = await jiraService.searchUsers(query);
  res.json(users);
}));

// GET /api/jira/users/assignable?project=...
router.get('/users/assignable', asyncHandler(async (req, res) => {
  const { project } = req.query;
  if (!project) return res.status(400).json({ error: 'project parameter is required' });
  const users = await jiraService.getAssignableUsers(project);
  res.json(users);
}));

// ── Projects ──────────────────────────────────────────────────────────────────

// GET /api/jira/projects
router.get('/projects', asyncHandler(async (req, res) => {
  const projects = await jiraService.getProjects();
  res.json(projects);
}));

// GET /api/jira/projects/:key
router.get('/projects/:key', asyncHandler(async (req, res) => {
  const project = await jiraService.getProject(req.params.key);
  res.json(project);
}));

// GET /api/jira/projects/:key/statuses
router.get('/projects/:key/statuses', asyncHandler(async (req, res) => {
  const statuses = await jiraService.getProjectStatuses(req.params.key);
  res.json(statuses);
}));

// GET /api/jira/projects/:key/issues
router.get('/projects/:key/issues', asyncHandler(async (req, res) => {
  const { startAt, maxResults, status, type, assignee } = req.query;
  const issues = await jiraService.getIssues(req.params.key, {
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
    status,
    type,
    assignee,
  });
  res.json(issues);
}));

// GET /api/jira/projects/:key/stats
router.get('/projects/:key/stats', asyncHandler(async (req, res) => {
  const stats = await jiraService.getDashboardStats(req.params.key);
  res.json(stats);
}));

// ── Issues ─────────────────────────────────────────────────────────────────────

// GET /api/jira/issues/:key
router.get('/issues/:key', asyncHandler(async (req, res) => {
  const issue = await jiraService.getIssue(req.params.key);
  res.json(issue);
}));

// GET /api/jira/issues/:key/comments
router.get('/issues/:key/comments', asyncHandler(async (req, res) => {
  const comments = await jiraService.getIssueComments(req.params.key);
  res.json(comments);
}));

// POST /api/jira/issues/:key/comments
router.post('/issues/:key/comments', asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });
  const comment = await jiraService.addIssueComment(req.params.key, body);
  res.status(201).json(comment);
}));

// GET /api/jira/issues/:key/transitions
router.get('/issues/:key/transitions', asyncHandler(async (req, res) => {
  const transitions = await jiraService.getIssueTransitions(req.params.key);
  res.json(transitions);
}));

// POST /api/jira/issues/:key/transitions
router.post('/issues/:key/transitions', asyncHandler(async (req, res) => {
  const { transitionId } = req.body;
  if (!transitionId) return res.status(400).json({ error: 'transitionId is required' });
  await jiraService.transitionIssue(req.params.key, transitionId);
  res.json({ message: 'Transition applied successfully' });
}));

// ── Boards & Sprints ───────────────────────────────────────────────────────────

// GET /api/jira/boards?all=true&projectKey=XX&startAt=0&maxResults=50
router.get('/boards', asyncHandler(async (req, res) => {
  const { all, projectKey, startAt, maxResults } = req.query;

  if (all === 'true') {
    const boards = await jiraService.getAllBoards({ projectKey });
    return res.json(boards);
  }

  const boards = await jiraService.getBoards({
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
    projectKey,
    name: req.query.name,
    type: req.query.type,
  });
  res.json(boards);
}));

// GET /api/jira/boards/:boardId/issues
router.get('/boards/:boardId/issues', asyncHandler(async (req, res) => {
  const { startAt, maxResults } = req.query;
  const issues = await jiraService.getBoardIssues(req.params.boardId, {
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
  });
  res.json(issues);
}));

// GET /api/jira/boards/:boardId/sprints?startAt=0&maxResults=10
router.get('/boards/:boardId/sprints', asyncHandler(async (req, res) => {
  const { startAt, maxResults } = req.query;
  const sprints = await jiraService.getSprints(req.params.boardId, {
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
  });
  res.json(sprints);
}));

// ── Search ─────────────────────────────────────────────────────────────────────

// GET /api/jira/search?jql=...&startAt=0&maxResults=50
router.get('/search', asyncHandler(async (req, res) => {
  const { jql, startAt, maxResults } = req.query;
  if (!jql) return res.status(400).json({ error: 'jql parameter is required' });
  const results = await jiraService.searchIssues(jql, {
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
  });
  res.json(results);
}));

module.exports = router;
