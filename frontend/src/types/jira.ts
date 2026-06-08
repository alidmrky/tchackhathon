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

// Greenhopper allData endpoint'inden gelen düz issue formatı
export interface AllDataIssue {
  id: number;
  key: string;
  summary: string;
  typeId: string;
  priorityId: string;
  statusId: string;
  done: boolean;
  hidden: boolean;
  assignee?: string;
  assigneeName?: string;
  avatarUrl?: string;
  hasCustomUserAvatar?: boolean;
  estimateStatistic?: { statFieldId: string; statFieldValue: Record<string, unknown> };
  trackingStatistic?: { statFieldId: string; statFieldValue: Record<string, unknown> };
  timeInColumn?: { enteredStatus: number; durationPreviously: number };
}

export interface QuickFilter {
  id: number;
  name: string;
  query: string;
  description?: string;
  iconUrl?: string;
  shared?: boolean;
}

// entityData içindeki dictionary yapıları (key = id string)
export interface EntityStatus {
  statusName: string;
  statusUrl?: string;
  statusCategory?: { colorName: string; key: string };
}

export interface EntityIssueType {
  name: string;
  iconUrl?: string;
  description?: string;
}

export interface EntityPriority {
  name: string;
  iconUrl?: string;
  statusColor?: string;
}

export interface AllDataResponse {
  issuesData?: { issues: AllDataIssue[] };
  quickFilters?: QuickFilter[];
  sprint?: {
    id: number;
    name: string;
    state: string;
    startDate?: string;
    endDate?: string;
    goal?: string;
  };
  // Greenhopper gerçek yapısı: dictionary (key = id string)
  entityData?: {
    statuses?: Record<string, EntityStatus>;
    issueTypes?: Record<string, EntityIssueType>;
    priorities?: Record<string, EntityPriority>;
  };
}
