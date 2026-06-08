import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import type { AllDataIssue, AllDataResponse, QuickFilter, JiraSprint } from '../types/jira';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Target,
  Filter,
  X,
  User,
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
  MessageSquare,
  Tag,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// ── Yardımcı: entityData dictionary'den okuma ─────────────────────────────────
type EntityData = AllDataResponse['entityData'];

const getStatusStyle = (statusId: string, entityData?: EntityData) => {
  const status = entityData?.statuses?.[statusId];
  const color = status?.statusCategory?.colorName || 'medium-gray';
  const colorMap: Record<string, string> = {
    'blue-grey': 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    'medium-gray': 'bg-gray-100 text-gray-500',
  };
  return {
    label: status?.statusName || statusId,
    cls: colorMap[color] || 'bg-gray-100 text-gray-500',
    isDone: color === 'green',
    isInProgress: color === 'yellow',
  };
};

const getPriorityLabel = (priorityId: string, entityData?: EntityData) =>
  entityData?.priorities?.[priorityId]?.name || priorityId;

const getTypeInfo = (typeId: string, entityData?: EntityData) => ({
  name: entityData?.issueTypes?.[typeId]?.name || typeId,
  iconUrl: entityData?.issueTypes?.[typeId]?.iconUrl,
});

// ── Issue Detay Paneli ────────────────────────────────────────────────────────
const IssueDetailPanel: React.FC<{
  issueKey: string | null;
  onClose: () => void;
}> = ({ issueKey, onClose }) => {
  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: () => jiraApi.getIssue(issueKey!).then((r) => r.data),
    enabled: !!issueKey,
    staleTime: 60_000,
  });

  const { data: transitions } = useQuery({
    queryKey: ['issue-transitions', issueKey],
    queryFn: () => jiraApi.getIssueTransitions(issueKey!).then((r) => r.data),
    enabled: !!issueKey,
  });

  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);

  const handleAddComment = async () => {
    if (!comment.trim() || !issueKey) return;
    setSubmittingComment(true);
    try {
      await jiraApi.addIssueComment(issueKey, comment.trim());
      setComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTransition = async (transitionId: string) => {
    if (!issueKey) return;
    setTransitionLoading(true);
    try {
      await jiraApi.transitionIssue(issueKey, transitionId);
    } finally {
      setTransitionLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
          <a
            href={`${import.meta.env.VITE_JIRA_BASE_URL || 'https://jira.turkcell.com.tr'}/browse/${issueKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono font-medium text-blue-600 hover:underline"
          >
            {issueKey}
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-sm text-gray-500 truncate flex-1">
            {isLoading ? '...' : issue?.fields?.summary}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : !issue ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <AlertCircle className="w-5 h-5 mr-2" /> Yüklenemedi
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Summary */}
            <div className="px-6 pt-5 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                {issue.fields.summary}
              </h2>
            </div>

            {/* Meta bilgiler */}
            <div className="px-6 pb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-b border-gray-100">
              <MetaRow label="Durum">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  issue.fields.status.statusCategory.key === 'done'
                    ? 'bg-green-100 text-green-700'
                    : issue.fields.status.statusCategory.key === 'indeterminate'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {issue.fields.status.name}
                </span>
              </MetaRow>

              <MetaRow label="Tip">
                <span className="flex items-center gap-1.5">
                  {issue.fields.issuetype.iconUrl && (
                    <img src={issue.fields.issuetype.iconUrl} className="w-4 h-4" alt="" />
                  )}
                  {issue.fields.issuetype.name}
                </span>
              </MetaRow>

              <MetaRow label="Öncelik">
                <span className="flex items-center gap-1.5">
                  {issue.fields.priority?.iconUrl && (
                    <img src={issue.fields.priority.iconUrl} className="w-3.5 h-3.5" alt="" />
                  )}
                  {issue.fields.priority?.name || '—'}
                </span>
              </MetaRow>

              <MetaRow label="Atanan">
                {issue.fields.assignee ? (
                  <span className="flex items-center gap-1.5">
                    <img
                      src={issue.fields.assignee.avatarUrls['24x24']}
                      className="w-5 h-5 rounded-full"
                      alt=""
                    />
                    {issue.fields.assignee.displayName}
                  </span>
                ) : (
                  <span className="text-gray-400">Atanmamış</span>
                )}
              </MetaRow>

              <MetaRow label="Oluşturulma">
                {new Date(issue.fields.created).toLocaleDateString('tr-TR')}
              </MetaRow>

              <MetaRow label="Güncelleme">
                {new Date(issue.fields.updated).toLocaleDateString('tr-TR')}
              </MetaRow>

              {issue.fields.labels?.length > 0 && (
                <MetaRow label="Etiketler" fullWidth>
                  <div className="flex flex-wrap gap-1">
                    {issue.fields.labels.map((l) => (
                      <span key={l} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        <Tag className="w-3 h-3" />{l}
                      </span>
                    ))}
                  </div>
                </MetaRow>
              )}
            </div>

            {/* Durum değiştir */}
            {transitions?.transitions?.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Durum Değiştir
                </p>
                <div className="flex flex-wrap gap-2">
                  {transitions.transitions.map((t: { id: string; name: string }) => (
                    <button
                      key={t.id}
                      onClick={() => handleTransition(t.id)}
                      disabled={transitionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
                    >
                      {transitionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Açıklama */}
            {issue.fields.description && (
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Açıklama
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-10">
                  {typeof issue.fields.description === 'string'
                    ? issue.fields.description
                    : JSON.stringify(issue.fields.description)}
                </p>
              </div>
            )}

            {/* Yorumlar */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Yorumlar
                {issue.fields.comment?.comments?.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-500 px-1.5 rounded-full">
                    {issue.fields.comment.comments.length}
                  </span>
                )}
              </p>

              {issue.fields.comment?.comments?.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {issue.fields.comment.comments.slice(-5).map((c: {
                    id: string;
                    author: { displayName: string; avatarUrls: { '24x24': string } };
                    body: string;
                    created: string;
                  }) => (
                    <div key={c.id} className="flex gap-2.5">
                      <img
                        src={c.author.avatarUrls['24x24']}
                        className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                        alt=""
                      />
                      <div>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-700">{c.author.displayName}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.created).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">Henüz yorum yok.</p>
              )}

              {/* Yorum ekle */}
              <div className="space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Yorum ekle..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!comment.trim() || submittingComment}
                  className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const MetaRow: React.FC<{
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ label, children, fullWidth }) => (
  <div className={fullWidth ? 'col-span-2' : ''}>
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <div className="text-sm text-gray-800 flex items-center gap-1.5">{children}</div>
  </div>
);

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const SprintDetailPage: React.FC = () => {
  const { boardId, sprintId } = useParams<{ boardId: string; sprintId: string }>();
  const location = useLocation();
  const sprint = location.state?.sprint as JiraSprint | undefined;

  const [activeQuickFilters, setActiveQuickFilters] = useState<number[]>([]);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);

  // Board bilgisi
  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => jiraApi.getBoard(Number(boardId)).then((r) => r.data),
    enabled: !!boardId,
  });

  // allData: issue'lar + quick filter'lar + board meta
  const { data: allData, isLoading } = useQuery<AllDataResponse>({
    queryKey: ['sprint-allData', boardId, sprintId, activeQuickFilters],
    queryFn: () =>
      jiraApi
        .getBoardAllData(Number(boardId), {
          selectedProjectKey: boardData?.location?.projectKey,
          activeQuickFilters: activeQuickFilters.length ? activeQuickFilters.join(',') : undefined,
        })
        .then((r) => r.data),
    enabled: !!boardId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const quickFilters: QuickFilter[] = allData?.quickFilters || [];
  const issues: AllDataIssue[] = (allData?.issuesData?.issues || []).filter((i) => !i.hidden);
  const ed = allData?.entityData;

  const toggleFilter = (id: number) => {
    setActiveQuickFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const sprintInfo = allData?.sprint || sprint;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/boards" className="hover:text-blue-600 transition">Board'lar</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/boards/${boardId}`} className="hover:text-blue-600 transition">
          {boardData?.name || `Board #${boardId}`}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">{sprintInfo?.name || `Sprint #${sprintId}`}</span>
      </div>

      {/* Sprint başlığı */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {sprintInfo?.name || `Sprint #${sprintId}`}
              </h1>
              {sprintInfo?.state && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                  sprintInfo.state === 'active'
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : sprintInfo.state === 'closed'
                    ? 'bg-gray-100 text-gray-500 border-gray-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {sprintInfo.state === 'active' ? 'Aktif' : sprintInfo.state === 'closed' ? 'Kapalı' : 'Gelecek'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {(sprintInfo?.startDate || sprintInfo?.endDate) && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {sprintInfo.startDate
                    ? new Date(sprintInfo.startDate).toLocaleDateString('tr-TR')
                    : '?'}
                  {' → '}
                  {sprintInfo.endDate
                    ? new Date(sprintInfo.endDate).toLocaleDateString('tr-TR')
                    : '?'}
                </span>
              )}
              {sprintInfo?.goal && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-400 max-w-md truncate">
                  <Target className="w-3.5 h-3.5 flex-shrink-0" />
                  {sprintInfo.goal}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <StatPill
              label="Toplam"
              value={issues.length}
              icon={<BarChart3 className="w-3.5 h-3.5 text-blue-500" />}
            />
            <StatPill
              label="Bitti"
              value={issues.filter((i) => i.done).length}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            />
            <StatPill
              label="Devam"
              value={issues.filter((i) => !i.done).length}
              icon={<Clock className="w-3.5 h-3.5 text-yellow-500" />}
            />
          </div>
        </div>

        {/* Quick Filter'lar */}
        {quickFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
              <Filter className="w-3 h-3" /> Kullanıcı:
            </span>
            {quickFilters.map((qf) => {
              const active = activeQuickFilters.includes(qf.id);
              return (
                <button
                  key={qf.id}
                  onClick={() => toggleFilter(qf.id)}
                  title={qf.description || qf.query}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {qf.name}
                  {active && <X className="w-3 h-3" />}
                </button>
              );
            })}
            {activeQuickFilters.length > 0 && (
              <button
                onClick={() => setActiveQuickFilters([])}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Temizle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Issue Tablosu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tablo başlıkları */}
        <div className="grid grid-cols-[28px_110px_1fr_120px_160px_100px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <span />
          <span>Anahtar</span>
          <span>Başlık</span>
          <span>Tip</span>
          <span>Atanan</span>
          <span>Durum</span>
          <span>Öncelik</span>
        </div>

        {isLoading && issues.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">Issue bulunamadı</p>
            {activeQuickFilters.length > 0 && (
              <button
                onClick={() => setActiveQuickFilters([])}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => {
              const status = getStatusStyle(issue.statusId, ed);
              const { name: typeName, iconUrl: typeIconUrl } = getTypeInfo(issue.typeId, ed);
              const priorityName = getPriorityLabel(issue.priorityId, ed);

              return (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssueKey(issue.key)}
                  className="w-full grid grid-cols-[28px_110px_1fr_120px_160px_100px_80px] gap-3 items-center px-4 py-3 hover:bg-blue-50/40 transition-colors text-left group"
                >
                  {/* Durum ikonu (done/not done) */}
                  <div className="flex items-center justify-center">
                    {issue.done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300" />
                    )}
                  </div>

                  {/* Anahtar */}
                  <span className="text-xs font-mono text-blue-600 group-hover:underline truncate">
                    {issue.key}
                  </span>

                  {/* Başlık */}
                  <span className={`text-sm truncate ${issue.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {issue.summary}
                  </span>

                  {/* Tip */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {typeIconUrl && (
                      <img src={typeIconUrl} alt={typeName} className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-500 truncate">{typeName}</span>
                  </div>

                  {/* Atanan */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {issue.avatarUrl ? (
                      <img
                        src={issue.avatarUrl}
                        alt={issue.assigneeName}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-500 truncate">
                      {issue.assigneeName || '—'}
                    </span>
                  </div>

                  {/* Durum */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${status.cls}`}>
                    {status.label}
                  </span>

                  {/* Öncelik */}
                  <span className="text-xs text-gray-400 truncate">{priorityName}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Yükleniyor göstergesi (placeholder data varken) */}
        {isLoading && issues.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 bg-gray-50">
            <Loader2 className="w-3 h-3 animate-spin" /> Güncelleniyor...
          </div>
        )}
      </div>

      {/* Issue Detay Paneli */}
      {selectedIssueKey && (
        <IssueDetailPanel
          issueKey={selectedIssueKey}
          onClose={() => setSelectedIssueKey(null)}
        />
      )}
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
    {icon}
    <span className="font-semibold text-gray-800">{value}</span>
    <span className="text-gray-400 text-xs">{label}</span>
  </div>
);

export default SprintDetailPage;
