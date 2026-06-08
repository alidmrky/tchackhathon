import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

export const jiraApi = {
  getConfigStatus: () => api.get('/jira/config/status'),
  updateConfig: (data: { baseUrl: string; token: string }) =>
    api.post('/jira/config', data),

  getMe: () => api.get('/jira/me'),

  getProjects: () => api.get('/jira/projects'),
  getProject: (key: string) => api.get(`/jira/projects/${key}`),
  getProjectStatuses: (key: string) => api.get(`/jira/projects/${key}/statuses`),
  getIssues: (
    key: string,
    params?: { startAt?: number; maxResults?: number; status?: string; type?: string; assignee?: string }
  ) => api.get(`/jira/projects/${key}/issues`, { params }),
  getProjectStats: (key: string) => api.get(`/jira/projects/${key}/stats`),

  getIssue: (key: string) => api.get(`/jira/issues/${key}`),
  getIssueComments: (key: string) => api.get(`/jira/issues/${key}/comments`),
  addIssueComment: (key: string, body: string) =>
    api.post(`/jira/issues/${key}/comments`, { body }),
  getIssueTransitions: (key: string) => api.get(`/jira/issues/${key}/transitions`),
  transitionIssue: (key: string, transitionId: string) =>
    api.post(`/jira/issues/${key}/transitions`, { transitionId }),

  getBoards: (params?: { all?: boolean; projectKey?: string; startAt?: number; maxResults?: number; name?: string; type?: string }) =>
    api.get('/jira/boards', { params }),
  getBoardIssues: (boardId: number, params?: { startAt?: number; maxResults?: number }) =>
    api.get(`/jira/boards/${boardId}/issues`, { params }),
  getSprints: (boardId: number, params?: { startAt?: number; maxResults?: number }) =>
    api.get(`/jira/boards/${boardId}/sprints`, { params }),

  search: (jql: string, params?: { startAt?: number; maxResults?: number }) =>
    api.get('/jira/search', { params: { jql, ...params } }),

  searchUsers: (query: string) => api.get('/jira/users/search', { params: { query } }),
  getAssignableUsers: (project: string) =>
    api.get('/jira/users/assignable', { params: { project } }),
};

export default api;
