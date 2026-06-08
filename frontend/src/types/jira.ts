export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  lead?: {
    displayName: string;
    avatarUrls: { '24x24': string };
  };
  style?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    key: string;
    name: string;
    colorName: string;
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: { '24x24': string; '48x48': string };
  active: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: JiraStatus;
    issuetype: JiraIssueType;
    assignee?: JiraUser;
    priority?: { name: string; iconUrl: string };
    created: string;
    updated: string;
    description?: unknown;
    labels: string[];
  };
}

export interface JiraIssueList {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraStats {
  total: number;
  statusCounts: Record<string, number>;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: { projectName: string; projectKey: string };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  goal?: string;
}
