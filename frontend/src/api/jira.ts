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

  getBoards: (params?: { all?: boolean; startAt?: number; maxResults?: number; query?: string; type?: string }) =>
    api.get('/jira/boards', { params }),
  getBoard: (boardId: number) =>
    api.get(`/jira/boards/${boardId}`),
  getBoardUserSkills: (boardId: number) =>
    api.get(`/jira/boards/${boardId}/userSkills`),
  getBoardAllData: (boardId: number, params?: { selectedProjectKey?: string; activeQuickFilters?: string; etag?: string }) =>
    api.get(`/jira/boards/${boardId}/allData`, { params }),
  getBoardIssues: (boardId: number, params?: { startAt?: number; maxResults?: number }) =>
    api.get(`/jira/boards/${boardId}/issues`, { params }),
  getSprints: (boardId: number, params?: { startAt?: number; maxResults?: number }) =>
    api.get(`/jira/boards/${boardId}/sprints`, { params }),

  search: (jql: string, params?: { startAt?: number; maxResults?: number }) =>
    api.get('/jira/search', { params: { jql, ...params } }),

  searchUsers: (query: string) => api.get('/jira/users/search', { params: { query } }),
  getAssignableUsers: (project: string) =>
    api.get('/jira/users/assignable', { params: { project } }),

  getUserNotes: (userKey: string) => api.get(`/jira/users/${userKey}/notes`),
  addUserNote: (userKey: string, text: string) =>
    api.post(`/jira/users/${userKey}/notes`, { text }),
  deleteUserNote: (userKey: string, noteId: string) =>
    api.delete(`/jira/users/${userKey}/notes/${noteId}`),

  getAllUserRoles: () => api.get('/jira/users/roles'),
  getUserRole: (userKey: string) => api.get(`/jira/users/${userKey}/role`),
  setUserRole: (userKey: string, role: string) =>
    api.put(`/jira/users/${userKey}/role`, { role }),

  getSkills: () => api.get('/jira/skills'),
  addSkill: (data: { name: string; category?: string; description?: string; color?: string }) =>
    api.post('/jira/skills', data),
  updateSkill: (id: string, data: { name?: string; category?: string; description?: string; color?: string }) =>
    api.put(`/jira/skills/${id}`, data),
  deleteSkill: (id: string) => api.delete(`/jira/skills/${id}`),

  getAllUserSkillAssignments: () => api.get('/jira/user-skills'),
  getUserSkillAssignments: (userKey: string) => api.get(`/jira/user-skills/${userKey}`),
  assignSkillToUser: (userKey: string, data: { skillId: string; skillName: string; skillCategory?: string; rating: number; note?: string }) =>
    api.post(`/jira/user-skills/${userKey}`, data),
  updateUserSkillRating: (userKey: string, skillId: string, data: { rating: number; note?: string }) =>
    api.put(`/jira/user-skills/${userKey}/${skillId}`, data),
  removeUserSkill: (userKey: string, skillId: string) =>
    api.delete(`/jira/user-skills/${userKey}/${skillId}`),
  autoAssignSkills: (boardId: number, userKey?: string) =>
    api.post(`/jira/boards/${boardId}/auto-assign-skills`, userKey ? { userKey } : {}),

  generateSprintPlan: (data: {
    boardId: number;
    items: string[];
    startDate: string;
    endDate: string;
  }) => api.post('/jira/sprint-plan', data),

  getHolidays: (year?: number) => api.get('/jira/holidays', { params: year ? { year } : {} }),
  upsertHoliday: (data: { date: string; name: string; type: string; isHalfDay?: boolean }) =>
    api.post('/jira/holidays', data),
  deleteHoliday: (date: string) => api.delete(`/jira/holidays/${date}`),
  bulkUpsertHolidays: (list: Array<{ date: string; name: string; type: string; isHalfDay?: boolean }>) =>
    api.post('/jira/holidays/bulk', list),
};

export default api;
