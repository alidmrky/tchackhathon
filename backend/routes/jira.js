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

// POST /api/jira/boards/:boardId/auto-assign-skills
// Issue başlıklarını tanımlı yetenek isimleriyle eşleştirir, otomatik atar
router.post('/boards/:boardId/auto-assign-skills', asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { userKey } = req.body; // isteğe bağlı: sadece bir kullanıcı için

  // 1. Tanımlı yetenekler
  const definedSkills = db.getSkills();
  if (!definedSkills.length) {
    return res.status(400).json({ error: 'Önce Yetenek Yönetimi\'nden yetenek tanımla.' });
  }

  // 2. Board'daki tüm issue'lar (jiraService'ten paginated)
  const agileClient = jiraService._getAgileClient();
  const PAGE = 100;
  let allIssues = [];
  let startAt = 0;
  while (true) {
    const r = await agileClient.get(`/board/${boardId}/issue`, {
      params: { startAt, maxResults: PAGE, fields: 'assignee,summary,issuetype' },
    });
    const { issues = [], total = 0 } = r.data;
    allIssues = allIssues.concat(issues);
    if (allIssues.length >= total || issues.length < PAGE) break;
    startAt += PAGE;
  }

  // Deduplicate
  const seen = new Set();
  const uniqueIssues = allIssues.filter((i) => { if (seen.has(i.key)) return false; seen.add(i.key); return true; });

  // 3. Kullanıcı bazında issue grupla
  const userIssueMap = {};
  for (const issue of uniqueIssues) {
    const assignee = issue.fields?.assignee;
    if (!assignee) continue;
    const key = assignee.name || assignee.accountId || assignee.displayName;
    if (userKey && key !== userKey) continue; // filtrele
    if (!userIssueMap[key]) {
      userIssueMap[key] = { key, displayName: assignee.displayName, summaries: [] };
    }
    userIssueMap[key].summaries.push((issue.fields.summary || '').toLowerCase());
  }

  // 4. Rating hesaplama: eşleşme sayısına göre
  const ratingFromCount = (n) => {
    if (n >= 15) return 5;
    if (n >= 8)  return 4;
    if (n >= 4)  return 3;
    if (n >= 2)  return 2;
    return 1;
  };

  // 5. Her kullanıcı için eşleşen yetenekleri bul ve ata
  const results = [];
  for (const userData of Object.values(userIssueMap)) {
    const matched = [];
    for (const skill of definedSkills) {
      const keyword = skill.name.toLowerCase();
      const matchCount = userData.summaries.filter((s) => s.includes(keyword)).length;
      if (matchCount > 0) {
        const rating = ratingFromCount(matchCount);
        db.assignSkill(userData.key, {
          skillId:       skill.id,
          skillName:     skill.name,
          skillCategory: skill.category,
          rating,
          note:          `Otomatik atandı (${matchCount} issue eşleşmesi)`,
        });
        matched.push({ skillName: skill.name, matchCount, rating });
      }
    }
    results.push({ userKey: userData.key, displayName: userData.displayName, matched });
  }

  res.json({ ok: true, processed: results.length, results });
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

// ── Kullanıcı Yetenek Atamaları ───────────────────────────────────────────────

// GET /api/jira/user-skills — tüm atamalar
router.get('/user-skills', (req, res) => {
  res.json(db.getAllUserSkills());
});

// GET /api/jira/user-skills/:userKey
router.get('/user-skills/:userKey', (req, res) => {
  res.json(db.getUserSkills(req.params.userKey));
});

// POST /api/jira/user-skills/:userKey  { skillId, skillName, skillCategory, rating, note }
router.post('/user-skills/:userKey', (req, res) => {
  const { skillId, skillName, skillCategory, rating, note } = req.body;
  if (!skillId) return res.status(400).json({ error: 'skillId is required' });
  const result = db.assignSkill(req.params.userKey, { skillId, skillName, skillCategory, rating, note });
  res.status(201).json(result);
});

// PUT /api/jira/user-skills/:userKey/:skillId  { rating, note }
router.put('/user-skills/:userKey/:skillId', (req, res) => {
  const { rating, note } = req.body;
  const result = db.updateSkillRating(req.params.userKey, req.params.skillId, { rating, note });
  if (!result) return res.status(404).json({ error: 'Assignment not found' });
  res.json(result);
});

// DELETE /api/jira/user-skills/:userKey/:skillId
router.delete('/user-skills/:userKey/:skillId', (req, res) => {
  db.removeUserSkill(req.params.userKey, req.params.skillId);
  res.json({ ok: true });
});

// ── Akıllı Sprint Planlama ────────────────────────────────────────────────────
router.post('/sprint-plan', asyncHandler(async (req, res) => {
  const { boardId, items, startDate, endDate } = req.body;

  if (!items?.length)    return res.status(400).json({ error: 'items gerekli' });
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate ve endDate gerekli' });

  // 1. Tatil listesi (o aralıktaki)
  const holidays = db.getHolidays();
  const holidaySet = new Set(
    holidays
      .filter(h => !h.isHalfDay && h.date >= startDate && h.date <= endDate)
      .map(h => h.date)
  );
  const halfDayHolidays = new Set(
    holidays
      .filter(h => h.isHalfDay && h.date >= startDate && h.date <= endDate)
      .map(h => h.date)
  );

  // 2. Çalışma günleri hesapla (Pzt-Cuma, tatil hariç)
  const workingDays = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    const dow = cur.getDay();
    const ds  = cur.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(ds)) {
      workingDays.push({ date: ds, halfDay: halfDayHolidays.has(ds) });
    }
    cur.setDate(cur.getDate() + 1);
  }
  const totalWorkingHours = workingDays.reduce((s, d) => s + (d.halfDay ? 4 : 8), 0);

  // 3. Kullanıcı rolleri + yetenek atamaları
  const allRoles        = db.getAllRoles();  // { userKey: { role } }
  const allSkillAssign  = db.getAllUserSkills(); // { userKey: [{ skillName, skillCategory, rating }] }

  // 4. Board kullanıcılarını Jira'dan çek (allData → assignees)
  let boardUsers = [];
  try {
    const agile  = jiraService._getAgileClient();
    const PAGE   = 100;
    let si       = 0;
    const seen   = new Set();
    while (true) {
      const r = await agile.get(`/board/${boardId}/issue`, {
        params: { startAt: si, maxResults: PAGE, fields: 'assignee' },
      });
      const { issues = [], total = 0 } = r.data;
      for (const iss of issues) {
        const a = iss.fields?.assignee;
        if (!a) continue;
        const key = a.name || a.accountId;
        if (!seen.has(key)) {
          seen.add(key);
          boardUsers.push({ key, displayName: a.displayName, avatarUrl: a.avatarUrls?.['48x48'] });
        }
      }
      si += PAGE;
      if (boardUsers.length >= total || issues.length < PAGE) break;
    }
  } catch (e) {
    // board erişimi yoksa devam et
  }

  // 5. Kullanıcı profilleri oluştur
  const buildProfile = (user) => {
    const role   = allRoles[user.key]?.role || null;
    const skills = allSkillAssign[user.key] || [];
    const analystScore = skills
      .filter(s => ['Analiz', 'Analysis', 'Analist', 'BA'].some(k => s.skillCategory?.toLowerCase().includes(k.toLowerCase()) || s.skillName?.toLowerCase().includes(k.toLowerCase())))
      .reduce((s, sk) => s + sk.rating, 0);
    const devScore = skills
      .filter(s => ['Frontend', 'Backend', 'Geliştirme', 'Development', 'DevOps'].some(k => s.skillCategory?.toLowerCase().includes(k.toLowerCase()) || s.skillName?.toLowerCase().includes(k.toLowerCase())))
      .reduce((s, sk) => s + sk.rating, 0);
    const avgSkill = skills.length ? skills.reduce((s, sk) => s + sk.rating, 0) / skills.length : 2;

    return {
      ...user,
      role,
      skills,
      analystScore: analystScore + (role === 'Analist' ? 10 : 0),
      devScore:     devScore     + (role === 'Developer' ? 10 : 0),
      avgSkill,
      load: 0, // atanan iş sayısı
    };
  };

  const profiles = boardUsers.map(buildProfile);

  // Rol bazında grupla (hem "sadece Analist" hem de rol atanmamış herkes)
  const analysts  = profiles.filter(p => p.analystScore > 0 || p.role === 'Analist');
  const devs      = profiles.filter(p => p.devScore > 0 || p.role === 'Developer');
  // Fallback: eğer hiç kategorize yoksa herkesi kullan
  const analystPool = analysts.length > 0 ? analysts : profiles;
  const devPool     = devs.length > 0     ? devs      : profiles;

  // Puana göre sırala (düşük load + yüksek skor)
  const pickBest = (pool, scoreKey) => {
    return pool.slice().sort((a, b) => {
      const scoreDiff = b[scoreKey] - a[scoreKey];
      if (scoreDiff !== 0) return scoreDiff;
      return a.load - b.load; // eşit skorsa az yükü olan önce
    })[0];
  };

  // 6. Her işe analist + developer ata
  const profileMap = Object.fromEntries(profiles.map(p => [p.key, p]));

  // Önce tüm atamaları yap (load sayısını bulmak için)
  const rawAssignments = items.map((item, idx) => {
    const analyst   = pickBest(analystPool, 'analystScore');
    const developer = pickBest(devPool, 'devScore');
    if (analyst)                                         profileMap[analyst.key].load++;
    if (developer && developer.key !== analyst?.key)     profileMap[developer.key].load++;
    else if (developer && developer.key === analyst?.key) profileMap[developer.key].load++; // aynı kişiyse de say
    return {
      index: idx + 1,
      title: typeof item === 'string' ? item : item.title || item,
      analystKey:   analyst?.key   || null,
      developerKey: developer?.key || null,
      analyst:   analyst   ? { key: analyst.key,   displayName: analyst.displayName,   avatarUrl: analyst.avatarUrl }   : null,
      developer: developer ? { key: developer.key, displayName: developer.displayName, avatarUrl: developer.avatarUrl } : null,
    };
  });

  // 7. Kapasite özeti
  const perPersonHours = profiles.length > 0 ? Math.round(totalWorkingHours / profiles.length) : totalWorkingHours;

  // Kişi başı iş saat: kişinin toplam saati ÷ üstlendiği iş sayısı
  const hoursPerTask = (userKey) => {
    const p = profileMap[userKey];
    if (!p || p.load === 0) return 0;
    return Math.round((perPersonHours / p.load) * 10) / 10; // 1 ondalık
  };

  const assignments = rawAssignments.map(a => ({
    index:     a.index,
    title:     a.title,
    analyst:   a.analyst,
    developer: a.developer,
    analystHours:   a.analystKey   ? hoursPerTask(a.analystKey)   : null,
    developerHours: a.developerKey ? hoursPerTask(a.developerKey) : null,
  }));

  const capacity = profiles.map(p => ({
    key:           p.key,
    displayName:   p.displayName,
    avatarUrl:     p.avatarUrl,
    role:          p.role,
    assignedCount: p.load,
    hoursPerPerson: perPersonHours,
    hoursPerTask:  p.load > 0 ? Math.round((perPersonHours / p.load) * 10) / 10 : 0,
  }));

  const holidayList = holidays.filter(h => h.date >= startDate && h.date <= endDate);

  res.json({
    summary: {
      startDate,
      endDate,
      totalWorkingDays: workingDays.length,
      totalWorkingHours,
      holidayCount: holidayList.length,
      userCount: profiles.length,
      hoursPerPerson: perPersonHours,
      itemCount: items.length,
    },
    holidays: holidayList,
    capacity,
    assignments,
  });
}));

module.exports = router;
