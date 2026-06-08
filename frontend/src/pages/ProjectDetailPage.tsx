import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import { JiraIssue, JiraStats } from '../types/jira';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Circle,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
  BarChart3,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  done: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  indeterminate: 'bg-yellow-100 text-yellow-700',
  'to do': 'bg-gray-100 text-gray-600',
  new: 'bg-gray-100 text-gray-600',
};

const StatusIcon: React.FC<{ category: string }> = ({ category }) => {
  if (category === 'done') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (category === 'indeterminate') return <Clock className="w-4 h-4 text-blue-500" />;
  return <Circle className="w-4 h-4 text-gray-400" />;
};

const PAGE_SIZE = 20;

const ProjectDetailPage: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', key],
    queryFn: () => jiraApi.getProject(key!).then((r) => r.data),
    enabled: !!key,
  });

  const { data: stats } = useQuery<JiraStats>({
    queryKey: ['project-stats', key],
    queryFn: () => jiraApi.getProjectStats(key!).then((r) => r.data),
    enabled: !!key,
  });

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', key, page, statusFilter, typeFilter],
    queryFn: () =>
      jiraApi
        .getIssues(key!, {
          startAt: page * PAGE_SIZE,
          maxResults: PAGE_SIZE,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        })
        .then((r) => r.data),
    enabled: !!key,
  });

  const issues: JiraIssue[] = issuesData?.issues || [];
  const total: number = issuesData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Projelere Dön
        </Link>

        <div className="flex items-center gap-4">
          {project?.avatarUrls?.['48x48'] && (
            <img src={project.avatarUrls['48x48']} alt={project.name} className="w-12 h-12 rounded-xl" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
            <p className="text-gray-500 font-mono text-sm">{project?.key}</p>
          </div>
        </div>

        {project?.description && (
          <p className="text-gray-600 mt-3 max-w-2xl">{project.description}</p>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Toplam Issue" value={stats.total} icon={<BarChart3 className="w-5 h-5 text-blue-500" />} color="bg-blue-50" />
          <StatCard label="To Do" value={stats.statusCounts['To Do'] || 0} icon={<Circle className="w-5 h-5 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="In Progress" value={stats.statusCounts['In Progress'] || 0} icon={<Clock className="w-5 h-5 text-yellow-500" />} color="bg-yellow-50" />
          <StatCard label="Done" value={stats.statusCounts['Done'] || 0} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} color="bg-green-50" />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-gray-900 flex-1">Issues ({total})</h2>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Tüm Durumlar</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Tüm Tipler</option>
            <option value="Bug">Bug</option>
            <option value="Story">Story</option>
            <option value="Task">Task</option>
            <option value="Epic">Epic</option>
          </select>
        </div>

        {issuesLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Issue bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} projectKey={key!} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
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

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({
  label, value, icon, color,
}) => (
  <div className={`${color} rounded-2xl p-4 border border-white shadow-sm`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {icon}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const IssueRow: React.FC<{ issue: JiraIssue; projectKey: string }> = ({ issue }) => {
  const cat = issue.fields.status.statusCategory.key.toLowerCase();
  const colorClass = statusColors[cat] || statusColors[issue.fields.status.name.toLowerCase()] || 'bg-gray-100 text-gray-600';

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
      {issue.fields.issuetype.iconUrl && (
        <img src={issue.fields.issuetype.iconUrl} alt={issue.fields.issuetype.name} className="w-4 h-4 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-gray-400">{issue.key}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{issue.fields.summary}</span>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusIcon category={cat} />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
            {issue.fields.status.name}
          </span>

          {issue.fields.assignee && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              {issue.fields.assignee.displayName}
            </span>
          )}

          {issue.fields.labels?.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Tag className="w-3 h-3" />
              {issue.fields.labels.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs text-gray-400 flex-shrink-0">
        {new Date(issue.fields.updated).toLocaleDateString('tr-TR')}
      </span>
    </div>
  );
};

export default ProjectDetailPage;
