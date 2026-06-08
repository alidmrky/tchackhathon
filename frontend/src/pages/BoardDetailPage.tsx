import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import type { JiraSprint } from '../types/jira';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  Star,
  ChevronDown,
  Check,
} from 'lucide-react';

const sprintStateColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  future: 'bg-blue-100 text-blue-700 border-blue-200',
};

const SPRINT_PAGE = 10;

const ROLES = [
  { label: 'Analist',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Developer',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Tester',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'DevOps',         color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Scrum Master',   color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Product Owner',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { label: 'Diğer',          color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

const roleColor = (role: string | null | undefined): string => {
  const found = ROLES.find((r) => r.label === role);
  return found ? found.color : 'bg-gray-100 text-gray-400 border-gray-200';
};

// ── Rol seçici dropdown bileşeni ─────────────────────────────────────────────
interface RoleSelectorProps {
  userKey: string;
  currentRole: string | null;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ userKey, currentRole }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: saveRole, isPending } = useMutation({
    mutationFn: (role: string) => jiraApi.setUserRole(userKey, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      setOpen(false);
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all hover:opacity-80 ${
          currentRole ? roleColor(currentRole) : 'bg-gray-50 text-gray-400 border-dashed border-gray-300'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            {currentRole || 'Rol ata'}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </>
        )}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-[160px] py-1 overflow-hidden">
            {ROLES.map((r) => (
              <button
                key={r.label}
                onClick={() => saveRole(r.label)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${r.color}`}>
                  {r.label}
                </span>
                {currentRole === r.label && <Check className="w-3 h-3 text-blue-500 ml-auto" />}
              </button>
            ))}
            {currentRole && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => saveRole('')}
                  className="w-full px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left"
                >
                  Rolü kaldır
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
const BoardDetailPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [sprintPage, setSprintPage] = useState(0);

  // Board bilgisi — Agile API'dan direkt
  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => jiraApi.getBoard(Number(boardId)).then((r) => r.data),
    enabled: !!boardId,
  });

  // Sprint listesi
  const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', boardId, sprintPage],
    queryFn: () =>
      jiraApi
        .getSprints(Number(boardId), { startAt: sprintPage * SPRINT_PAGE, maxResults: SPRINT_PAGE })
        .then((r) => r.data),
    enabled: !!boardId,
    placeholderData: (prev) => prev,
  });

  // Board kullanıcıları — allData'nın issuesData.issues içinden çek
  const { data: allData, isLoading: usersLoading } = useQuery({
    queryKey: ['board-allData-users', boardId],
    queryFn: () => jiraApi.getBoardAllData(Number(boardId)).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 120_000,
  });

  // Tüm kullanıcı rolleri (JSON DB'den)
  const { data: allRoles } = useQuery<Record<string, { role: string; updatedAt: string }>>({
    queryKey: ['userRoles'],
    queryFn: () => jiraApi.getAllUserRoles().then((r) => r.data),
    staleTime: 30_000,
  });

  const sprints: JiraSprint[] = sprintsData?.values || [];
  const sprintTotal: number = sprintsData?.total || 0;
  const sprintTotalPages = Math.ceil(sprintTotal / SPRINT_PAGE);

  // issuesData.issues içinden distinct kullanıcıları çıkar
  const boardUsers = React.useMemo(() => {
    const issues: Array<{ assignee?: string; assigneeName?: string; avatarUrl?: string }> =
      allData?.issuesData?.issues || [];
    const seen = new Set<string>();
    const users: Array<{ key: string; name: string; avatarUrl?: string }> = [];
    for (const issue of issues) {
      if (issue.assignee && !seen.has(issue.assignee)) {
        seen.add(issue.assignee);
        users.push({ key: issue.assignee, name: issue.assigneeName || issue.assignee, avatarUrl: issue.avatarUrl });
      }
    }
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [allData]);

  const goToSprint = (sprint: JiraSprint) => {
    navigate(`/boards/${boardId}/sprints/${sprint.id}`, { state: { sprint } });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/boards"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Board'lara Dön
        </Link>

        <div className="flex items-center justify-between gap-4 flex-wrap">
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

          <Link
            to={`/boards/${boardId}/skills`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-medium rounded-xl hover:from-yellow-500 hover:to-orange-500 transition shadow-sm"
          >
            <Star className="w-4 h-4" />
            Skill Kartları
          </Link>
        </div>
      </div>

      {/* İki sütunlu layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Sol: Sprint listesi */}
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
                <button
                  key={sprint.id}
                  onClick={() => goToSprint(sprint)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50/40 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                        {sprint.name}
                      </span>
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

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {sprintTotalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-sm text-gray-500">
                {sprintPage * SPRINT_PAGE + 1}–
                {Math.min((sprintPage + 1) * SPRINT_PAGE, sprintTotal)} / {sprintTotal} sprint
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

        {/* Sağ: Kullanıcılar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden self-start">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              Kullanıcılar
              {boardUsers.length > 0 && (
                <span className="text-sm font-normal text-gray-400">({boardUsers.length})</span>
              )}
            </h2>
            {usersLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>

          {usersLoading && boardUsers.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          ) : boardUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm px-4">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Kullanıcı bulunamadı
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {boardUsers.map((user) => {
                const roleEntry = allRoles?.[user.key];
                const currentRole = roleEntry?.role || null;
                return (
                  <div
                    key={user.key}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate font-mono">{user.key}</p>
                    </div>
                    <RoleSelector userKey={user.key} currentRole={currentRole} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardDetailPage;
