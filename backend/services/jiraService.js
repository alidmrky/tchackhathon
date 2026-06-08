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

const getBoards = async ({ startAt = 0, maxResults = 50, projectKey, name, type } = {}) => {
  const client = getAgileClient();
  const params = { startAt, maxResults };
  if (projectKey) params.projectKeyOrId = projectKey;
  if (name) params.name = name;
  if (type) params.type = type;
  const response = await client.get('/board', { params });
  return response.data;
};

const getAllBoards = async ({ projectKey } = {}) => {
  const client = getAgileClient();
  const PAGE = 50;
  let startAt = 0;
  let allBoards = [];

  console.log('[getAllBoards] Fetching all boards...');

  while (true) {
    const params = { startAt, maxResults: PAGE };
    if (projectKey) params.projectKeyOrId = projectKey;

    const res = await client.get('/board', { params });
    const { values = [], isLast, total } = res.data;

    console.log(`[getAllBoards] startAt=${startAt}, got=${values.length}, total=${total}, isLast=${isLast}`);

    allBoards = allBoards.concat(values);

    const shouldStop =
      isLast === true ||
      values.length === 0 ||
      values.length < PAGE ||
      allBoards.length >= total;

    if (shouldStop) break;
    startAt += PAGE;
  }

  console.log(`[getAllBoards] Done. Total fetched: ${allBoards.length}`);
  return { values: allBoards, total: allBoards.length };
};

const getBoardIssues = async (boardId, params = {}) => {
  const client = getAgileClient();
  const response = await client.get(`/board/${boardId}/issue`, { params });
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
  getBoardIssues,
  getSprints,
  getCurrentUser,
  searchUsers,
  getAssignableUsers,
  searchIssues,
  getDashboardStats,
};
