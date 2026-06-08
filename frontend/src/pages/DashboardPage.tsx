import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import type { JiraSprint } from '../types/jira';
import {
  LayoutDashboard,
  Star,
  StarOff,
  Layers,
  Users,
  Zap,
  ChevronRight,
  Calendar,
  Target,
  Search,
  Loader2,
  AlertCircle,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  'Analist':       'bg-purple-100 text-purple-700',
  'Developer':     'bg-blue-100 text-blue-700',
  'Tester':        'bg-orange-100 text-orange-700',
  'DevOps':        'bg-cyan-100 text-cyan-700',
  'Scrum Master':  'bg-green-100 text-green-700',
  'Product Owner': 'bg-yellow-100 text-yellow-700',
  'Diğer':         'bg-gray-100 text-gray-600',
};

const LS_KEY = 'dashboard_favorite_board';

// ── Board seçim picker ────────────────────────────────────────────────────────
const BoardPicker: React.FC<{ onSelect: (id: number, name: string) => void }> = ({ onSelect }) => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['boards-picker', debouncedQ],
    queryFn: () => jiraApi.getBoards({ query: debouncedQ, maxResults: 20 }).then((r) => r.data),
    staleTime: 30_000,
  });

  const boards = data?.values || [];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Star className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Favori Board Seç</h2>
        <p className="text-sm text-gray-500">Dashboard'unda takip etmek istediğin board'u belirle</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Board ara..."
          className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          autoFocus
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : boards.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Board bulunamadı</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {boards.map((b: { id: number; name: string; type?: string }) => (
            <button
              key={b.id}
              onClick={() => onSelect(b.id, b.name)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">{b.name}</p>
                {b.type && <p className="text-xs text-gray-400 capitalize">{b.type}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Sprint özet kartı ─────────────────────────────────────────────────────────
const SprintCard: React.FC<{ sprint: JiraSprint; boardId: number }> = ({ sprint, boardId }) => {
  const navigate = useNavigate();
  const isActive = sprint.state === 'active';

  return (
    <button
      onClick={() => navigate(`/boards/${boardId}/sprints/${sprint.id}`, { state: { sprint } })}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md group ${
        isActive
          ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
          : 'border-gray-100 bg-white hover:border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isActive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3" /> Aktif
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
            {sprint.name}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
      </div>

      {(sprint.startDate || sprint.endDate) && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
          <Calendar className="w-3 h-3" />
          {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('tr-TR') : '?'}
          {' → '}
          {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('tr-TR') : '?'}
        </div>
      )}
      {sprint.goal && (
        <p className="text-xs text-gray-400 flex items-start gap-1">
          <Target className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{sprint.goal}</span>
        </p>
      )}
    </button>
  );
};

// ── Ana Dashboard ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Favori board localStorage'dan oku
  const [favBoard, setFavBoard] = useState<{ id: number; name: string } | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const saveFav = (id: number, name: string) => {
    const val = { id, name };
    localStorage.setItem(LS_KEY, JSON.stringify(val));
    setFavBoard(val);
  };

  const clearFav = () => {
    localStorage.removeItem(LS_KEY);
    setFavBoard(null);
  };

  // Board detayı
  const { data: boardData } = useQuery({
    queryKey: ['board', favBoard?.id],
    queryFn: () => jiraApi.getBoard(favBoard!.id).then((r) => r.data),
    enabled: !!favBoard,
  });

  // Sprint'ler — aktif olanı öne çıkar
  const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', favBoard?.id, 0],
    queryFn: () => jiraApi.getSprints(favBoard!.id, { maxResults: 8 }).then((r) => r.data),
    enabled: !!favBoard,
    staleTime: 60_000,
  });

  // Kullanıcılar + aktif sprint issue'ları — allData
  const { data: allData, isLoading: usersLoading } = useQuery({
    queryKey: ['board-allData-users', favBoard?.id],
    queryFn: () => jiraApi.getBoardAllData(favBoard!.id).then((r) => r.data),
    enabled: !!favBoard,
    staleTime: 120_000,
  });

  // Kullanıcı rolleri
  const { data: allRoles } = useQuery<Record<string, { role: string }>>({
    queryKey: ['userRoles'],
    queryFn: () => jiraApi.getAllUserRoles().then((r) => r.data),
    staleTime: 30_000,
    enabled: !!favBoard,
  });

  const sprints: JiraSprint[] = sprintsData?.values || [];
  const activeSprints = sprints.filter((s) => s.state === 'active');
  const recentSprints = sprints.filter((s) => s.state !== 'active').slice(0, 3);

  const boardUsers = useMemo(() => {
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

  // Aktif sprint issue istatistikleri
  const issueStats = useMemo(() => {
    const issues: Array<{ statusId?: string }> = allData?.issuesData?.issues || [];
    const statuses = allData?.entityData?.statuses || {};
    let done = 0, inProgress = 0, todo = 0;
    for (const issue of issues) {
      const cat = (statuses as Record<string, { statusCategory?: string }>)[issue.statusId || '']?.statusCategory;
      if (cat === 'done' || cat === 'Done') done++;
      else if (cat === 'inprogress' || cat === 'In Progress') inProgress++;
      else todo++;
    }
    return { total: issues.length, done, inProgress, todo };
  }, [allData]);

  // Favori seçilmemişse picker göster
  if (!favBoard) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <BoardPicker onSelect={saveFav} />
      </div>
    );
  }

  const isLoading = sprintsLoading || usersLoading;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400">Favori board özeti</p>
          </div>
        </div>
        <button
          onClick={clearFav}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <StarOff className="w-3.5 h-3.5" />
          Favoriyi Değiştir
        </button>
      </div>

      {/* Board Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-2xl p-6 mb-5 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 rounded-2xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-xs font-medium mb-0.5 uppercase tracking-wide">Favori Board</p>
              <h2 className="text-xl font-bold text-white">{boardData?.name || favBoard.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {boardData?.type && (
                  <span className="text-blue-200 text-xs capitalize">{boardData.type}</span>
                )}
                {boardData?.location?.projectName && (
                  <span className="text-blue-200 text-xs">• {boardData.location.projectName}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to={`/boards/${favBoard.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition backdrop-blur-sm"
            >
              <Layers className="w-4 h-4" /> Board Detayı
            </Link>
            <Link
              to={`/boards/${favBoard.id}/skills`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yellow-400/80 hover:bg-yellow-400 text-white text-sm font-medium rounded-xl transition"
            >
              <Star className="w-4 h-4" /> Skill Kartları
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-5">

          {/* ── Sol: Sprint'ler ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Sprint'ler
              </h3>
              <Link
                to={`/boards/${favBoard.id}`}
                className="text-xs text-blue-500 hover:underline"
              >
                Tümü →
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {activeSprints.length === 0 && recentSprints.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sprint bulunamadı</p>
                </div>
              ) : (
                <>
                  {activeSprints.map((s) => (
                    <SprintCard key={s.id} sprint={s} boardId={favBoard.id} />
                  ))}
                  {recentSprints.length > 0 && (
                    <>
                      {activeSprints.length > 0 && (
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide pt-1">Diğer</p>
                      )}
                      {recentSprints.map((s) => (
                        <SprintCard key={s.id} sprint={s} boardId={favBoard.id} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Orta: Issue İstatistikleri ── */}
          <div className="space-y-5">
            {/* Issue stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-purple-500" /> Aktif Sprint Durumu
              </h3>
              {issueStats.total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aktif sprint issue'su yok</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{issueStats.total}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Toplam</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{issueStats.done}</p>
                      <p className="text-xs text-green-500 mt-0.5">Tamamlandı</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{issueStats.inProgress}</p>
                      <p className="text-xs text-blue-500 mt-0.5">Devam Ediyor</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-orange-700">{issueStats.todo}</p>
                      <p className="text-xs text-orange-500 mt-0.5">Bekliyor</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>İlerleme</span>
                      <span>{Math.round((issueStats.done / issueStats.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${(issueStats.done / issueStats.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex mt-1 h-1.5 gap-0.5 overflow-hidden rounded-full">
                      <div
                        className="bg-blue-400 rounded-full"
                        style={{ width: `${(issueStats.inProgress / issueStats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Hızlı aksiyonlar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Hızlı Erişim</h3>
              <div className="space-y-2">
                {activeSprints[0] && (
                  <button
                    onClick={() => navigate(`/boards/${favBoard.id}/sprints/${activeSprints[0].id}`, { state: { sprint: activeSprints[0] } })}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-xl transition text-left group"
                  >
                    <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">Aktif Sprint Detayı</p>
                      <p className="text-xs text-green-600 truncate">{activeSprints[0].name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-green-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                <Link
                  to={`/boards/${favBoard.id}/skills`}
                  className="flex items-center gap-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition group"
                >
                  <Star className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Skill Kartları</p>
                    <p className="text-xs text-yellow-600">Ekip analizi</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-yellow-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to={`/boards/${favBoard.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition group"
                >
                  <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800">Board Detayı</p>
                    <p className="text-xs text-purple-600">Tüm sprint'ler</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/boards"
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition group"
                >
                  <CheckCircle2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Board'lara Göz At</p>
                    <p className="text-xs text-gray-400">Diğer board'lar</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Sağ: Kullanıcılar ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden self-start">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Ekip
                {boardUsers.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">({boardUsers.length})</span>
                )}
              </h3>
              <Link
                to={`/boards/${favBoard.id}/skills`}
                className="text-xs text-blue-500 hover:underline"
              >
                Analiz →
              </Link>
            </div>

            {boardUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Kullanıcı bulunamadı</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                {boardUsers.map((user) => {
                  const roleEntry = allRoles?.[user.key];
                  const role = roleEntry?.role;
                  return (
                    <div key={user.key} className="px-4 py-3 flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                        {role ? (
                          <span className={`inline-block text-xs px-1.5 py-0 rounded-full font-medium mt-0.5 ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                            {role}
                          </span>
                        ) : (
                          <p className="text-xs text-gray-400 truncate font-mono">{user.key}</p>
                        )}
                      </div>
                      <Clock className="w-3.5 h-3.5 text-gray-200 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
