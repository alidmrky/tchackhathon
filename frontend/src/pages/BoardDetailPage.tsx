import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import type { JiraSprint, JiraIssue } from '../types/jira';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Circle,
  ChevronLeft,
  ChevronRight,
  Layers,
  User,
} from 'lucide-react';

const sprintStateColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  future: 'bg-blue-100 text-blue-700 border-blue-200',
};

const statusColors: Record<string, string> = {
  done: 'bg-green-100 text-green-700',
  indeterminate: 'bg-blue-100 text-blue-700',
  new: 'bg-gray-100 text-gray-600',
};

const SPRINT_PAGE = 10;
const ISSUE_PAGE = 20;

const BoardDetailPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [sprintPage, setSprintPage] = useState(0);
  const [expandedSprint, setExpandedSprint] = useState<number | null>(null);
  const [issuePage, setIssuePage] = useState(0);

  // Board info
  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () =>
      jiraApi.getBoards({ startAt: 0, maxResults: 1 }).then((r) => {
        const found = r.data.values?.find((b: { id: number }) => String(b.id) === boardId);
        return found || null;
      }),
    enabled: !!boardId,
  });

  // Sprints with pagination
  const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', boardId, sprintPage],
    queryFn: () =>
      jiraApi
        .getSprints(Number(boardId), { startAt: sprintPage * SPRINT_PAGE, maxResults: SPRINT_PAGE })
        .then((r) => r.data),
    enabled: !!boardId,
    placeholderData: (prev) => prev,
  });

  // Issues of selected sprint
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['sprint-issues', boardId, expandedSprint, issuePage],
    queryFn: () =>
      jiraApi
        .getBoardIssues(Number(boardId), {
          startAt: issuePage * ISSUE_PAGE,
          maxResults: ISSUE_PAGE,
          ...(expandedSprint ? { sprint: expandedSprint } : {}),
        })
        .then((r) => r.data),
    enabled: !!expandedSprint,
    placeholderData: (prev) => prev,
  });

  const sprints: JiraSprint[] = sprintsData?.values || [];
  const sprintTotal: number = sprintsData?.total || 0;
  const sprintTotalPages = Math.ceil(sprintTotal / SPRINT_PAGE);

  const issues: JiraIssue[] = issuesData?.issues || [];
  const issueTotal: number = issuesData?.total || 0;
  const issueTotalPages = Math.ceil(issueTotal / ISSUE_PAGE);

  const handleToggleSprint = (sprintId: number) => {
    if (expandedSprint === sprintId) {
      setExpandedSprint(null);
    } else {
      setExpandedSprint(sprintId);
      setIssuePage(0);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/boards"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Board'lara Dön
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {boardData?.name || `Board #${boardId}`}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {boardData?.type && (
                <span className="text-xs text-gray-400 capitalize">{boardData.type}</span>
              )}
              {boardData?.location?.projectName && (
                <span className="text-xs text-gray-400">• {boardData.location.projectName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sprint list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Sprint'ler
            {sprintTotal > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({sprintTotal})</span>
            )}
          </h2>
          {sprintsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {sprintsLoading && sprints.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : sprints.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Sprint bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sprints.map((sprint) => (
              <div key={sprint.id}>
                <button
                  onClick={() => handleToggleSprint(sprint.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{sprint.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          sprintStateColors[sprint.state] || 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {sprint.state === 'active'
                          ? 'Aktif'
                          : sprint.state === 'closed'
                          ? 'Kapalı'
                          : 'Gelecek'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {(sprint.startDate || sprint.endDate) && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {sprint.startDate
                            ? new Date(sprint.startDate).toLocaleDateString('tr-TR')
                            : '?'}
                          {' → '}
                          {sprint.endDate
                            ? new Date(sprint.endDate).toLocaleDateString('tr-TR')
                            : '?'}
                        </span>
                      )}
                      {sprint.goal && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 truncate max-w-xs">
                          <Target className="w-3 h-3 flex-shrink-0" />
                          {sprint.goal}
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedSprint === sprint.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {expandedSprint === sprint.id && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {issuesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <span className="ml-2 text-sm text-gray-400">Issue'lar yükleniyor...</span>
                      </div>
                    ) : issues.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        Bu sprint'te issue bulunamadı.
                      </div>
                    ) : (
                      <>
                        <div className="px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                          {issueTotal} Issue
                        </div>
                        <div className="divide-y divide-gray-100">
                          {issues.map((issue) => (
                            <IssueRow key={issue.id} issue={issue} />
                          ))}
                        </div>

                        {issueTotalPages > 1 && (
                          <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              {issuePage * ISSUE_PAGE + 1}–
                              {Math.min((issuePage + 1) * ISSUE_PAGE, issueTotal)} / {issueTotal}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIssuePage((p) => Math.max(0, p - 1))}
                                disabled={issuePage === 0}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  setIssuePage((p) => Math.min(issueTotalPages - 1, p + 1))
                                }
                                disabled={issuePage >= issueTotalPages - 1}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sprintTotalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              {sprintPage * SPRINT_PAGE + 1}–{Math.min((sprintPage + 1) * SPRINT_PAGE, sprintTotal)}{' '}
              / {sprintTotal} sprint
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSprintPage((p) => Math.max(0, p - 1))}
                disabled={sprintPage === 0}
                className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                {sprintPage + 1} / {sprintTotalPages}
              </span>
              <button
                onClick={() => setSprintPage((p) => Math.min(sprintTotalPages - 1, p + 1))}
                disabled={sprintPage >= sprintTotalPages - 1}
                className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const IssueRow: React.FC<{ issue: JiraIssue }> = ({ issue }) => {
  const cat = issue.fields.status?.statusCategory?.key?.toLowerCase() || 'new';
  const colorClass = statusColors[cat] || 'bg-gray-100 text-gray-600';

  return (
    <div className="px-5 py-3 flex items-center gap-3 hover:bg-white transition-colors">
      {issue.fields.issuetype?.iconUrl && (
        <img
          src={issue.fields.issuetype.iconUrl}
          alt={issue.fields.issuetype.name}
          className="w-4 h-4 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{issue.key}</span>
          <span className="text-sm text-gray-800 truncate">{issue.fields.summary}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {cat === 'done' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : cat === 'indeterminate' ? (
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-gray-400" />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${colorClass}`}>
            {issue.fields.status?.name}
          </span>
          {issue.fields.assignee && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              {issue.fields.assignee.displayName}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">
        {issue.fields.priority?.name && (
          <span className="text-xs text-gray-400">{issue.fields.priority.name}</span>
        )}
      </span>
    </div>
  );
};

export default BoardDetailPage;
