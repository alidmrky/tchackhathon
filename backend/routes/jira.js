const express = require('express');
const router = express.Router();
const jiraService = require('../services/jiraService');
const db = require('../db');

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

// GET /api/jira/boards?all=true&query=XX&startAt=0&maxResults=50&type=scrum|kanban
router.get('/boards', asyncHandler(async (req, res) => {
  const { all, startAt, maxResults } = req.query;

  if (all === 'true') {
    const boards = await jiraService.getAllBoards();
    return res.json(boards);
  }

  const boards = await jiraService.getBoards({
    startAt: startAt ? parseInt(startAt) : 0,
    maxResults: maxResults ? parseInt(maxResults) : 50,
    query: req.query.query || req.query.name,
    type: req.query.type,
  });
  res.json(boards);
}));

// GET /api/jira/boards/:boardId/userSkills — tüm sprintleri tarayıp kullanıcı skill'lerini döner
router.get('/boards/:boardId/userSkills', asyncHandler(async (req, res) => {
  const skills = await jiraService.getBoardUserSkills(req.params.boardId);
  res.json(skills);
}));

// GET /api/jira/boards/:boardId — tek board bilgisi (Agile API)
router.get('/boards/:boardId', asyncHandler(async (req, res) => {
  const board = await jiraService.getBoard(req.params.boardId);
  res.json(board);
}));

// GET /api/jira/boards/:boardId/allData?selectedProjectKey=&activeQuickFilters=49179,49183&etag=
router.get('/boards/:boardId/allData', asyncHandler(async (req, res) => {
  const { selectedProjectKey, activeQuickFilters, etag } = req.query;
  const data = await jiraService.getBoardAllData(req.params.boardId, {
    selectedProjectKey,
    activeQuickFilters,
    etag,
  });
  res.json(data);
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

// ── Kullanıcı Notları (JSON DB) ───────────────────────────────────────────────

// GET /api/jira/users/:userKey/notes
router.get('/users/:userKey/notes', (req, res) => {
  res.json(db.getNotes(req.params.userKey));
});

// POST /api/jira/users/:userKey/notes  { text }
router.post('/users/:userKey/notes', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  const note = db.addNote(req.params.userKey, text.trim());
  res.status(201).json(note);
});

// DELETE /api/jira/users/:userKey/notes/:noteId
router.delete('/users/:userKey/notes/:noteId', (req, res) => {
  db.deleteNote(req.params.userKey, req.params.noteId);
  res.json({ ok: true });
});

// ── Kullanıcı Rolleri (JSON DB) ───────────────────────────────────────────────

// GET /api/jira/users/roles — tüm roller (BoardDetailPage için toplu çekim)
router.get('/users/roles', (req, res) => {
  res.json(db.getAllRoles());
});

// GET /api/jira/users/:userKey/role
router.get('/users/:userKey/role', (req, res) => {
  const role = db.getRole(req.params.userKey);
  res.json(role || { role: null });
});

// PUT /api/jira/users/:userKey/role  { role }
router.put('/users/:userKey/role', (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role is required' });
  const saved = db.setRole(req.params.userKey, role);
  res.json(saved);
});

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

// ── Yetenek Yönetimi (Skills) ─────────────────────────────────────────────────

// GET /api/jira/skills
router.get('/skills', (req, res) => {
  res.json(db.getSkills());
});

// POST /api/jira/skills  { name, category, description, color }
router.post('/skills', (req, res) => {
  const { name, category, description, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const skill = db.addSkill({ name: name.trim(), category, description, color });
  res.status(201).json(skill);
});

// PUT /api/jira/skills/:id  { name, category, description, color }
router.put('/skills/:id', (req, res) => {
  const updated = db.updateSkill(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Skill not found' });
  res.json(updated);
});

// DELETE /api/jira/skills/:id
router.delete('/skills/:id', (req, res) => {
  db.deleteSkill(req.params.id);
  res.json({ ok: true });
});

// ── İzin Takvimi (Holidays) ───────────────────────────────────────────────────

// GET /api/jira/holidays?year=2026
router.get('/holidays', (req, res) => {
  const { year } = req.query;
  res.json(db.getHolidays(year ? parseInt(year) : null));
});

// POST /api/jira/holidays  { date, name, type, isHalfDay }
router.post('/holidays', (req, res) => {
  const { date, name, type, isHalfDay } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  const holiday = db.upsertHoliday({ date, name, type, isHalfDay });
  res.status(201).json(holiday);
});

// DELETE /api/jira/holidays/:date  (YYYY-MM-DD)
router.delete('/holidays/:date', (req, res) => {
  db.deleteHoliday(req.params.date);
  res.json({ ok: true });
});

// POST /api/jira/holidays/bulk  [{ date, name, type, isHalfDay }]
router.post('/holidays/bulk', (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'array expected' });
  const result = db.bulkUpsertHolidays(list);
  res.json(result);
});

module.exports = router;
