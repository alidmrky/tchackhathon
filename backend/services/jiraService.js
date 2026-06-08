const axios = require('axios');

const getJiraClient = () => {
  const { JIRA_BASE_URL, JIRA_API_TOKEN } = process.env;

  if (!JIRA_BASE_URL || !JIRA_API_TOKEN) {
    throw new Error('Jira environment variables are not configured');
  }

  const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');

  return axios.create({
    baseURL: `${baseUrl}/rest/api/2`,
    headers: {
      'Authorization': `Bearer ${JIRA_API_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
};

const getAgileClient = () => {
  const { JIRA_BASE_URL, JIRA_API_TOKEN } = process.env;
  const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');
  return axios.create({
    baseURL: `${baseUrl}/rest/agile/1.0`,
    headers: {
      'Authorization': `Bearer ${JIRA_API_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
};

const getGreenhopperClient = () => {
  const { JIRA_BASE_URL, JIRA_API_TOKEN } = process.env;
  const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');
  return axios.create({
    baseURL: `${baseUrl}/rest/greenhopper/1.0`,
    headers: {
      'Authorization': `Bearer ${JIRA_API_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
};

// Greenhopper view → Agile board formatına normalize et
const normalizeGreenhopperView = (view) => ({
  id: view.id,
  name: view.name,
  type: view.sprintSupportEnabled ? 'scrum' : 'kanban',
  location: view.projectName ? { projectName: view.projectName } : undefined,
});

const ISSUE_FIELDS =
  'id,key,summary,description,status,issuetype,priority,assignee,reporter,created,updated,project,labels,components,fixVersions,subtasks,parent';

const getProjects = async () => {
  const client = getJiraClient();
  const response = await client.get('/project/search', {
    params: { maxResults: 50, expand: 'description,lead' },
  });
  return response.data;
};

const getProject = async (projectKey) => {
  const client = getJiraClient();
  const response = await client.get(`/project/${projectKey}`);
  return response.data;
};

const getProjectStatuses = async (projectKey) => {
  const client = getJiraClient();
  const response = await client.get(`/project/${projectKey}/statuses`);
  return response.data;
};

const getIssues = async (
  projectKey,
  { startAt = 0, maxResults = 50, status, type, assignee } = {}
) => {
  const client = getJiraClient();
  let jql = `project = "${projectKey}"`;
  if (status) jql += ` AND status = "${status}"`;
  if (type) jql += ` AND issuetype = "${type}"`;
  if (assignee) jql += ` AND assignee = "${assignee}"`;
  jql += ' ORDER BY created DESC';

  const response = await client.get('/search', {
    params: { jql, startAt, maxResults, fields: ISSUE_FIELDS },
  });
  return response.data;
};

const getIssue = async (issueKey) => {
  const client = getJiraClient();
  const response = await client.get(`/issue/${issueKey}`, {
    params: {
      fields: `${ISSUE_FIELDS},comment,attachment`,
    },
  });
  return response.data;
};

const getIssueComments = async (issueKey) => {
  const client = getJiraClient();
  const response = await client.get(`/issue/${issueKey}/comment`);
  return response.data;
};

const addIssueComment = async (issueKey, body) => {
  const client = getJiraClient();
  const response = await client.post(`/issue/${issueKey}/comment`, { body });
  return response.data;
};

const getIssueTransitions = async (issueKey) => {
  const client = getJiraClient();
  const response = await client.get(`/issue/${issueKey}/transitions`);
  return response.data;
};

const transitionIssue = async (issueKey, transitionId) => {
  const client = getJiraClient();
  const response = await client.post(`/issue/${issueKey}/transitions`, {
    transition: { id: transitionId },
  });
  return response.data;
};

const getBoards = async ({ startAt = 0, maxResults = 50, query, type } = {}) => {
  const client = getGreenhopperClient();
  const params = { startAt, maxResults };
  if (query) params.query = query;

  const response = await client.get('/rapidviews/viewsData', { params });
  const { views = [], total = 0 } = response.data;

  let filtered = views.map(normalizeGreenhopperView);
  if (type) {
    filtered = filtered.filter((b) => b.type === type.toLowerCase());
  }

  return {
    values: filtered,
    total: type ? filtered.length : total,
    startAt,
    maxResults,
    isLast: startAt + views.length >= total,
  };
};

const getAllBoards = async () => {
  const client = getGreenhopperClient();
  const PAGE = 50;
  let startAt = 0;
  let allBoards = [];

  console.log('[getAllBoards] Fetching all boards via Greenhopper...');

  while (true) {
    const res = await client.get('/rapidviews/viewsData', {
      params: { startAt, maxResults: PAGE },
    });
    const { views = [], total = 0 } = res.data;

    console.log(`[getAllBoards] startAt=${startAt}, got=${views.length}, total=${total}`);

    allBoards = allBoards.concat(views.map(normalizeGreenhopperView));

    if (views.length === 0 || allBoards.length >= total || views.length < PAGE) break;
    startAt += PAGE;
  }

  console.log(`[getAllBoards] Done. Total fetched: ${allBoards.length}`);
  return { values: allBoards, total: allBoards.length };
};

const getBoard = async (boardId) => {
  const client = getAgileClient();
  const response = await client.get(`/board/${boardId}`);
  return response.data;
};

const getBoardIssues = async (boardId, params = {}) => {
  const client = getAgileClient();
  const response = await client.get(`/board/${boardId}/issue`, { params });
  return response.data;
};

// Greenhopper allData: aktif sprint issueları + quick filter (kullanıcı bazlı) desteği
// Params: selectedProjectKey, activeQuickFilters (virgülle ayrılmış ID'ler), etag
// ── AI insight üreteci ────────────────────────────────────────────────────────
const generateAIInsight = (user) => {
  const { displayName, totalIssues, completedIssues, issueTypes, multiSprintIssues, role } = user;

  if (totalIssues === 0) return `${displayName} için henüz sprint verisi bulunmuyor.`;

  const completionRate = Math.round((completedIssues / totalIssues) * 100);
  const multiSprintRate = Math.round((multiSprintIssues / totalIssues) * 100);
  const firstName = displayName.split(' ')[0];

  const typeEntries = Object.entries(issueTypes).sort((a, b) => b[1] - a[1]);
  const primaryType  = typeEntries[0]?.[0] || 'Görev';
  const primaryCount = typeEntries[0]?.[1] || 0;
  const primaryPct   = Math.round((primaryCount / totalIssues) * 100);

  const secondaryType  = typeEntries[1]?.[0];
  const secondaryCount = typeEntries[1]?.[1] || 0;
  const secondaryPct   = Math.round((secondaryCount / totalIssues) * 100);

  const typeCount  = typeEntries.length;
  const isSpecialist = primaryPct >= 70;       // tek tipe yoğunlaşmış
  const isGeneralist = typeCount >= 4 && primaryPct < 50;  // çok alana yayılmış
  const isMixedTwo   = typeCount === 2 || (typeCount >= 2 && primaryPct < 70 && primaryPct >= 45);

  const parts = [];

  // ── 1. Açılış: kişiye özgü profil tespiti ────────────────────────────────
  if (isSpecialist) {
    parts.push(
      `${firstName}'in toplam ${totalIssues} işin %${primaryPct}'ini oluşturan ${primaryCount} "${primaryType}" ile belirgin biçimde uzmanlaşmış bir profili var.`
    );
  } else if (isGeneralist) {
    const topTwo = typeEntries.slice(0, 2)
      .map(([t, c]) => `"${t}" (${c} iş)`)
      .join(' ve ');
    parts.push(
      `${firstName}, ${typeCount} farklı iş türünde görev almış; en yoğun olduğu alanlar ${topTwo} olmakla birlikte dağılım oldukça geniş.`
    );
  } else if (isMixedTwo && secondaryType) {
    parts.push(
      `${firstName}'in iş profili iki ana eksene oturuyor: ${primaryCount} adet "${primaryType}" (%${primaryPct}) ve ${secondaryCount} adet "${secondaryType}" (%${secondaryPct}).`
    );
  } else {
    parts.push(
      `${firstName}'in ${totalIssues} işlik geçmişinde "${primaryType}" dominant (%${primaryPct}, ${primaryCount} iş), geri kalan %${100 - primaryPct} ise diğer kategorilere dağılıyor.`
    );
  }

  // ── 1b. Rol uyum analizi ──────────────────────────────────────────────────
  if (role) {
    const roleNorm = role.toLowerCase();
    // Analiz rolü için beklenen tip anahtarları
    const analysisKeys = ['analysis task', 'analiz', 'analysis', 'requirement'];
    const devKeys = ['development task', 'development', 'bug', 'story', 'improvement', 'geliştirme'];
    const testKeys = ['test', 'testing'];

    const primaryLow = primaryType.toLowerCase();

    if (roleNorm === 'analist') {
      const alignedAnalysis = analysisKeys.some((k) => primaryLow.includes(k));
      if (alignedAnalysis) {
        parts.push(`Analist rolüyle örtüşen bu profil, iş tipi dağılımının atanan sorumluluğa uygun ilerlediğini gösteriyor.`);
      } else if (devKeys.some((k) => primaryLow.includes(k))) {
        parts.push(`Tanımlanan "Analist" rolüne karşın iş yükünün büyük bölümü geliştirme/teknik konulardan oluşuyor — bu durum rol netleştirmesi veya ekip içi iş dağılımı açısından değerlendirilebilir.`);
      }
    } else if (roleNorm === 'developer') {
      const alignedDev = devKeys.some((k) => primaryLow.includes(k));
      if (alignedDev) {
        parts.push(`Developer rolüyle tutarlı bir iş profili: teknik konular ağırlığını koruyarak beklenen katkı alanında yoğunlaşılmış.`);
      } else if (analysisKeys.some((k) => primaryLow.includes(k))) {
        parts.push(`Developer olarak etiketlenmiş olmakla birlikte iş yükü analiz ağırlıklı görünüyor; bu, beklenmedik bir rol kayması ya da ekip içi destek katkısı olarak yorumlanabilir.`);
      }
    } else if (roleNorm === 'tester') {
      const alignedTest = testKeys.some((k) => primaryLow.includes(k));
      if (alignedTest) {
        parts.push(`Tester rolüyle örtüşen test odaklı iş dağılımı, kalite süreçlerine yapılan katkının tutarlılığını ortaya koyuyor.`);
      } else {
        parts.push(`Tester rolü için test ağırlıklı bir dağılım beklenmekle birlikte iş yükü farklı kategorilere yayılmış — çapraz katkı sağlayan esnek bir profil olduğu düşünülebilir.`);
      }
    } else if (roleNorm === 'scrum master') {
      parts.push(`Scrum Master rolünde genellikle süreç kolaylaştırma ön planda olduğundan bu metrikler doğrudan çıktı ölçümünden ziyade ekip verimliliğinin bir yansıması olarak değerlendirilmeli.`);
    } else if (roleNorm === 'product owner') {
      parts.push(`Product Owner rolünde iş kalemi hacminden çok önceliklendirme ve kabul kriterlerinin doğruluğu belirleyici olmakla birlikte bu metrikler katılım derinliğini göstermesi bakımından değerli.`);
    }
  }

  // ── 2. Tamamlanma oranı — kesin sayılarla ────────────────────────────────
  if (completionRate === 100) {
    parts.push(`Üstlendiği ${totalIssues} işin tamamını bitirmiş olması, yüksek bir teslimat disiplinine işaret ediyor.`);
  } else if (completionRate >= 85) {
    parts.push(`${completedIssues}/${totalIssues} tamamlanma (%${completionRate}) ile üstlendiği işleri büyük oranda sonuca ulaştırıyor; yalnızca ${totalIssues - completedIssues} iş hâlâ açık.`);
  } else if (completionRate >= 60) {
    parts.push(`${completedIssues} iş tamamlanmış, ${totalIssues - completedIssues} iş devam ediyor (%${completionRate} tamamlanma); bu oran paralel yük altında çalıştığının göstergesi olabilir.`);
  } else {
    parts.push(`%${completionRate} tamamlanma (${completedIssues}/${totalIssues}) dikkat çekici; açık kalan ${totalIssues - completedIssues} işin büyük bölümü büyük ihtimalle uzun vadeli konular veya başka bağımlılıklar içeriyor.`);
  }

  // ── 3. Multi-sprint örüntüsü ─────────────────────────────────────────────
  if (multiSprintIssues === 0 && totalIssues >= 5) {
    parts.push(`Sprint sınırını aşan tek iş yok; üstlendiği görevleri tanımlanan zaman kutusuna sığdırma konusunda tutarlı.`);
  } else if (multiSprintRate >= 40) {
    parts.push(`${multiSprintIssues} iş (%${multiSprintRate}) birden fazla sprinte taştı — bu oran, ya büyük kapsamlı konularla uğraştığını ya da engel ve bağımlılıklarla sık karşılaştığını gösteriyor; backlog refinement süreçlerine dahil edilmesi faydalı olabilir.`);
  } else if (multiSprintRate >= 15) {
    parts.push(`${multiSprintIssues} işin (%${multiSprintRate}) sprint sınırını aştığı görülüyor; zaman zaman kapsamı başlangıçta değerlendirilenden büyük konulara denk geliyor.`);
  }

  // ── 4. Skill kesişim gözlemi ─────────────────────────────────────────────
  if (isSpecialist && secondaryType) {
    parts.push(`Uzmanlık alanı net olmakla birlikte "${secondaryType}" kategorisinden ${secondaryCount} iş (${secondaryPct}%) alması, teknik sınırların dışına çıkabileceğini gösteriyor.`);
  } else if (isGeneralist) {
    parts.push(`Bu çok yönlü dağılım, farklı ekip ihtiyaçlarını karşılayabilen esnek bir kapasite sunuyor; ancak odak alanı netleştirildiğinde etki daha da artabilir.`);
  }

  // ── 5. Veri tabanlı öneri ─────────────────────────────────────────────────
  if (completionRate >= 85 && totalIssues >= 30 && isSpecialist) {
    parts.push(`Hacim, tamamlanma oranı ve uzmanlaşma birleştiğinde "${primaryType}" konusunda ekibin referans noktası olma potansiyeli taşıyor.`);
  } else if (completionRate >= 85 && isGeneralist) {
    parts.push(`Yüksek tamamlanma oranıyla birleşen çok yönlü deneyim, sprint içi tıkanıklıklarda kapasiteyi dengelemek için değerli bir kaynak.`);
  } else if (multiSprintRate >= 30 && completionRate < 60) {
    parts.push(`İş boyutu kalibrasyonu ve daha ince granülarite ile sprint hedeflerine ulaşma oranının artması beklenebilir.`);
  } else if (totalIssues < 10) {
    parts.push(`Veri seti henüz sınırlı; birkaç sprint daha sonra örüntüler daha net ortaya çıkacak.`);
  }

  return parts.join(' ');
};

// Tüm sprintlerdeki issue'ları çekip kullanıcı başına skill aggregate eder
const getBoardUserSkills = async (boardId) => {
  const client = getAgileClient();
  const PAGE = 100;
  let allIssues = [];
  let startAt = 0;

  console.log(`[getBoardUserSkills] boardId=${boardId}`);

  while (true) {
    const res = await client.get(`/board/${boardId}/issue`, {
      params: {
        startAt,
        maxResults: PAGE,
        // closedSprints: issue daha önce hangi sprintlerdeydi
        fields: 'assignee,issuetype,summary,status,resolutiondate,closedSprints,sprint',
      },
    });

    const { issues = [], total = 0 } = res.data;
    allIssues = allIssues.concat(issues);

    console.log(`[getBoardUserSkills] startAt=${startAt}, got=${issues.length}, total=${total}`);

    if (allIssues.length >= total || issues.length < PAGE) break;
    startAt += PAGE;
  }

  // Aynı issue birden fazla sprintte görünebilir → key bazında deduplicate
  const seenKeys = new Set();
  const uniqueIssues = [];
  for (const issue of allIssues) {
    if (!seenKeys.has(issue.key)) {
      seenKeys.add(issue.key);
      uniqueIssues.push(issue);
    }
  }

  console.log(`[getBoardUserSkills] raw=${allIssues.length}, unique=${uniqueIssues.length}`);

  // Kullanıcı bazında aggregate
  const userMap = {};

  for (const issue of uniqueIssues) {
    const assignee = issue.fields?.assignee;
    if (!assignee) continue;

    const key = assignee.name || assignee.accountId || assignee.displayName;
    if (!userMap[key]) {
      userMap[key] = {
        key,
        displayName: assignee.displayName,
        avatarUrl: assignee.avatarUrls?.['48x48'],
        totalIssues: 0,
        completedIssues: 0,
        multiSprintIssues: 0,   // birden fazla sprinte yayılan işler
        issueTypes: {},
        recentTitles: [],
      };
    }

    const u = userMap[key];
    u.totalIssues++;

    if (issue.fields.status?.statusCategory?.key === 'done') u.completedIssues++;

    // Multi-sprint tespiti: kapalı sprintten taşınmış issue'lar
    const closedSprints = issue.fields?.closedSprints;
    if (Array.isArray(closedSprints) && closedSprints.length > 0) {
      u.multiSprintIssues++;
    }

    const typeName = issue.fields.issuetype?.name || 'Diğer';
    u.issueTypes[typeName] = (u.issueTypes[typeName] || 0) + 1;

    const summary = issue.fields.summary;
    if (u.recentTitles.length < 5 && summary && !u.recentTitles.includes(summary)) {
      u.recentTitles.push(summary);
    }
  }

  // DB'den rol ve yetenek atamalarını çek
  const db = require('../db');
  const allRoles = db.getAllRoles();
  const allSkillAssignments = db.getAllUserSkills();

  // AI insight ekle
  const result = Object.values(userMap).sort((a, b) => b.totalIssues - a.totalIssues);
  result.forEach((u) => {
    const roleEntry = allRoles[u.key];
    u.role = roleEntry?.role || null;
    u.assignedSkills = allSkillAssignments[u.key] || [];
    u.aiInsight = generateAIInsight(u);
  });

  return result;
};

const getBoardAllData = async (rapidViewId, { selectedProjectKey, activeQuickFilters, etag } = {}) => {
  const client = getGreenhopperClient();
  const params = { rapidViewId };
  if (selectedProjectKey) params.selectedProjectKey = selectedProjectKey;
  if (activeQuickFilters) params.activeQuickFilters = activeQuickFilters;
  if (etag) params.etag = etag;

  const response = await client.get('/xboard/work/allData.json', { params });
  return response.data;
};

const getSprints = async (boardId, { startAt = 0, maxResults = 50 } = {}) => {
  const client = getAgileClient();
  const response = await client.get(`/board/${boardId}/sprint`, {
    params: { startAt, maxResults },
  });
  return response.data;
};

const getCurrentUser = async () => {
  const client = getJiraClient();
  const response = await client.get('/myself');
  return response.data;
};

const searchUsers = async (query) => {
  const client = getJiraClient();
  const response = await client.get('/user/search', { params: { query, maxResults: 20 } });
  return response.data;
};

const getAssignableUsers = async (projectKey) => {
  const client = getJiraClient();
  const response = await client.get('/user/assignable/search', {
    params: { project: projectKey, maxResults: 50 },
  });
  return response.data;
};

const searchIssues = async (jql, { startAt = 0, maxResults = 50 } = {}) => {
  const client = getJiraClient();
  const response = await client.get('/search', {
    params: { jql, startAt, maxResults, fields: ISSUE_FIELDS },
  });
  return response.data;
};

const getDashboardStats = async (projectKey) => {
  const client = getJiraClient();
  const statuses = ['To Do', 'In Progress', 'Done'];

  const [statusResults, totalRes] = await Promise.all([
    Promise.all(
      statuses.map((status) =>
        client
          .get('/search', {
            params: { jql: `project = "${projectKey}" AND status = "${status}"`, maxResults: 0 },
          })
          .then((r) => ({ status, total: r.data.total }))
      )
    ),
    client.get('/search', {
      params: { jql: `project = "${projectKey}"`, maxResults: 0 },
    }),
  ]);

  const statusCounts = {};
  statusResults.forEach(({ status, total }) => {
    statusCounts[status] = total;
  });

  return { total: totalRes.data.total, statusCounts };
};

module.exports = {
  _getAgileClient: getAgileClient,
  getBoardUserSkills,
  getProjects,
  getProject,
  getProjectStatuses,
  getIssues,
  getIssue,
  getIssueComments,
  addIssueComment,
  getIssueTransitions,
  transitionIssue,
  getBoards,
  getAllBoards,
  getBoard,
  getBoardIssues,
  getBoardAllData,
  getSprints,
  getCurrentUser,
  searchUsers,
  getAssignableUsers,
  searchIssues,
  getDashboardStats,
};
