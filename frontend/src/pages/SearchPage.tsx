import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import { JiraIssue } from '../types/jira';
import { Search, Loader2, AlertCircle, User, Tag, CheckCircle2, Clock, Circle } from 'lucide-react';

const statusCategoryIcon: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  indeterminate: <Clock className="w-4 h-4 text-blue-500" />,
  new: <Circle className="w-4 h-4 text-gray-400" />,
};

const SearchPage: React.FC = () => {
  const [jql, setJql] = useState('');
  const [submittedJql, setSubmittedJql] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', submittedJql],
    queryFn: () => jiraApi.search(submittedJql).then((r) => r.data),
    enabled: !!submittedJql,
  });

  const issues: JiraIssue[] = data?.issues || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jql.trim()) setSubmittedJql(jql.trim());
  };

  const presets = [
    { label: 'Bana atanan görevler', jql: 'assignee = currentUser() ORDER BY updated DESC' },
    { label: 'Açık bug\'lar', jql: 'issuetype = Bug AND status != Done ORDER BY priority DESC' },
    { label: 'Son 7 günde güncellenenler', jql: 'updated >= -7d ORDER BY updated DESC' },
    { label: 'Aktif sprint\'ler', jql: 'sprint in openSprints() ORDER BY priority DESC' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">JQL Arama</h1>
        <p className="text-gray-500 mt-1">Jira Query Language ile gelişmiş arama yapın</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={jql}
              onChange={(e) => setJql(e.target.value)}
              placeholder="project = MYPROJECT AND status = 'In Progress'"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Ara
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.jql}
            onClick={() => { setJql(preset.jql); setSubmittedJql(preset.jql); }}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>Arama sırasında hata oluştu. JQL sözdizimini kontrol edin.</span>
        </div>
      )}

      {!isLoading && submittedJql && issues.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Sonuç bulunamadı.</p>
        </div>
      )}

      {issues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">{data?.total} sonuç bulundu</span>
          </div>
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => {
              const cat = issue.fields.status.statusCategory.key.toLowerCase();
              return (
                <div key={issue.id} className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3">
                  {issue.fields.issuetype.iconUrl && (
                    <img src={issue.fields.issuetype.iconUrl} alt={issue.fields.issuetype.name} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{issue.key}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{issue.fields.summary}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        {statusCategoryIcon[cat] || <Circle className="w-4 h-4 text-gray-400" />}
                        <span className="text-xs text-gray-500">{issue.fields.status.name}</span>
                      </div>
                      {issue.fields.assignee && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          {issue.fields.assignee.displayName}
                        </span>
                      )}
                      {issue.fields.labels?.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Tag className="w-3 h-3" />
                          {issue.fields.labels[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(issue.fields.updated).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
