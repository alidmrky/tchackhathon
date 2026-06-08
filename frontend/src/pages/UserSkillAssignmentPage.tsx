import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import {
  Users,
  Sparkles,
  Star,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  Check,
  AlertCircle,
  Trophy,
  BarChart3,
  Search,
  Zap,
  RefreshCw,
} from 'lucide-react';

// ── Tipler ────────────────────────────────────────────────────────────────────
interface Skill {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface SkillAssignment {
  id: string;
  skillId: string;
  skillName: string;
  skillCategory: string;
  rating: number;
  note: string;
  assignedAt: string;
}

interface BoardUser {
  key: string;
  name: string;
  avatarUrl?: string;
}

// ── Sabitler ──────────────────────────────────────────────────────────────────
const LS_KEY = 'dashboard_favorite_board';

const SKILL_COLORS: Record<string, { pill: string; dot: string }> = {
  blue:   { pill: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  purple: { pill: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  green:  { pill: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500' },
  orange: { pill: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  red:    { pill: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500' },
  cyan:   { pill: 'bg-cyan-100 text-cyan-700 border-cyan-200',      dot: 'bg-cyan-500' },
  pink:   { pill: 'bg-pink-100 text-pink-700 border-pink-200',      dot: 'bg-pink-500' },
  yellow: { pill: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  gray:   { pill: 'bg-gray-100 text-gray-600 border-gray-200',      dot: 'bg-gray-400' },
};
const getSkillColor = (color: string) => SKILL_COLORS[color] || SKILL_COLORS.blue;

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Başlangıç',   color: 'text-gray-400' },
  2: { label: 'Gelişiyor',   color: 'text-blue-500' },
  3: { label: 'Yetkin',      color: 'text-green-500' },
  4: { label: 'İleri Düzey', color: 'text-purple-500' },
  5: { label: 'Uzman',       color: 'text-amber-500' },
};

// ── Yıldız Derecelendirme ─────────────────────────────────────────────────────
const StarRating: React.FC<{
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ value, onChange, readonly = false, size = 'md' }) => {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const active = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`${sz} transition-colors ${
              n <= active
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-100 text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// ── Yetenek atama satırı (mevcut atama) ──────────────────────────────────────
const AssignmentRow: React.FC<{
  assignment: SkillAssignment;
  skill?: Skill;
  userKey: string;
  onRemove: () => void;
  onRatingChange: (rating: number) => void;
  isPending: boolean;
}> = ({ assignment, skill, onRemove, onRatingChange, isPending }) => {
  const [editNote, setEditNote] = useState(false);
  const [noteVal, setNoteVal] = useState(assignment.note || '');
  const qc = useQueryClient();

  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      jiraApi.updateUserSkillRating(assignment.id.split('-')[0] || '', assignment.skillId, {
        rating: assignment.rating,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-skill-assignments'] });
      setEditNote(false);
    },
  });

  const color = getSkillColor(skill?.color || 'blue');
  const ratingInfo = RATING_LABELS[assignment.rating] || RATING_LABELS[3];

  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      {/* Yetenek rozeti */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
            {assignment.skillName}
          </span>
          <span className="text-xs text-gray-400">{assignment.skillCategory}</span>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={assignment.rating} onChange={onRatingChange} size="sm" />
          <span className={`text-xs font-medium ${ratingInfo.color}`}>{ratingInfo.label}</span>
          {isPending && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        </div>
        {assignment.note && !editNote && (
          <p className="text-xs text-gray-400 mt-1 italic">"{assignment.note}"</p>
        )}
        {editNote && (
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Not ekle..."
              autoFocus
            />
            <button
              onClick={() => noteMutation.mutate(noteVal)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Aksiyonlar */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setEditNote((v) => !v)}
          className="p-1 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="Not ekle"
        >
          ✏️
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Yetenek ekleme dropdown ───────────────────────────────────────────────────
const AddSkillDropdown: React.FC<{
  skills: Skill[];
  assignedIds: Set<string>;
  onAdd: (skill: Skill, rating: number) => void;
  isPending: boolean;
}> = ({ skills, assignedIds, onAdd, isPending }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Skill | null>(null);
  const [rating, setRating] = useState(3);

  const filtered = skills.filter(
    (s) => !assignedIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-xl hover:bg-blue-100 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Yetenek Ekle
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSelected(null); setSearch(''); }} />
          <div className="absolute left-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 w-72">
            {!selected ? (
              <>
                <div className="p-3 border-b border-gray-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Yetenek ara..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {skills.length === 0 ? 'Önce Yetenek Yönetimi\'nden yetenek ekle' : 'Bulunamadı'}
                    </p>
                  ) : (
                    filtered.map((s) => {
                      const c = getSkillColor(s.color);
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.pill}`}>
                            {s.name}
                          </span>
                          <span className="text-xs text-gray-400">{s.category}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSkillColor(selected.color).pill}`}>
                    {selected.name}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 ml-auto">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Yetkinlik Seviyesi</p>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                  <p className={`text-xs mt-1 font-medium ${RATING_LABELS[rating]?.color}`}>
                    {RATING_LABELS[rating]?.label}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setSelected(null)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-xl transition"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => { onAdd(selected, rating); setOpen(false); setSelected(null); setSearch(''); setRating(3); }}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Ata
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Kullanıcı paneli ──────────────────────────────────────────────────────────
const UserPanel: React.FC<{
  user: BoardUser;
  skills: Skill[];
  assignments: SkillAssignment[];
  onAssign: (skill: Skill, rating: number) => void;
  onRemove: (skillId: string) => void;
  onRatingChange: (skillId: string, rating: number) => void;
  isPending: boolean;
}> = ({ user, skills, assignments, onAssign, onRemove, onRatingChange, isPending }) => {
  const assignedIds = new Set(assignments.map((a) => a.skillId));
  const avgRating = assignments.length
    ? (assignments.reduce((s, a) => s + a.rating, 0) / assignments.length).toFixed(1)
    : null;

  // Kategori bazında dağılım
  const catMap = assignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.skillCategory] = (acc[a.skillCategory] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Kullanıcı özeti */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3 mb-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-2xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400 font-mono">{user.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-gray-900">{assignments.length}</span>
            <span className="text-gray-400 text-xs">yetenek</span>
          </div>
          {avgRating && (
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-gray-900">{avgRating}</span>
              <span className="text-gray-400 text-xs">ort. puan</span>
            </div>
          )}
        </div>
        {Object.keys(catMap).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(catMap).map(([cat, cnt]) => (
              <span key={cat} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                {cat} ({cnt})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Atanan yetenekler */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atanan Yetenekler</p>
          <AddSkillDropdown
            skills={skills}
            assignedIds={assignedIds}
            onAdd={onAssign}
            isPending={isPending}
          />
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Henüz yetenek atanmadı</p>
            <p className="text-xs text-gray-300 mt-0.5">Yukarıdaki butona tıkla</p>
          </div>
        ) : (
          <div className="space-y-1">
            {assignments
              .slice()
              .sort((a, b) => b.rating - a.rating)
              .map((a) => {
                const skill = skills.find((s) => s.id === a.skillId);
                return (
                  <AssignmentRow
                    key={a.skillId}
                    assignment={a}
                    skill={skill}
                    userKey={user.key}
                    onRemove={() => onRemove(a.skillId)}
                    onRatingChange={(rating) => onRatingChange(a.skillId, rating)}
                    isPending={isPending}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const UserSkillAssignmentPage: React.FC = () => {
  const qc = useQueryClient();
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Favori board'dan kullanıcıları çek
  const favBoard = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }, []);

  const { data: allData, isLoading: usersLoading } = useQuery({
    queryKey: ['board-allData-users', favBoard?.id],
    queryFn: () => jiraApi.getBoardAllData(favBoard!.id).then((r) => r.data),
    enabled: !!favBoard,
    staleTime: 120_000,
  });

  const boardUsers = useMemo<BoardUser[]>(() => {
    const issues: Array<{ assignee?: string; assigneeName?: string; avatarUrl?: string }> =
      allData?.issuesData?.issues || [];
    const seen = new Set<string>();
    const users: BoardUser[] = [];
    for (const issue of issues) {
      if (issue.assignee && !seen.has(issue.assignee)) {
        seen.add(issue.assignee);
        users.push({ key: issue.assignee, name: issue.assigneeName || issue.assignee, avatarUrl: issue.avatarUrl });
      }
    }
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [allData]);

  // Tüm tanımlı yetenekler
  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: () => jiraApi.getSkills().then((r) => r.data),
    staleTime: 30_000,
  });

  // Tüm kullanıcı-yetenek atamaları
  const { data: allAssignments = {} } = useQuery<Record<string, SkillAssignment[]>>({
    queryKey: ['user-skill-assignments'],
    queryFn: () => jiraApi.getAllUserSkillAssignments().then((r) => r.data),
    staleTime: 15_000,
  });

  const selectedUser = boardUsers.find((u) => u.key === selectedUserKey) || null;
  const selectedAssignments = selectedUserKey ? (allAssignments[selectedUserKey] || []) : [];

  // Tüm board için otomatik atama
  const autoAllMutation = useMutation({
    mutationFn: () => jiraApi.autoAssignSkills(favBoard!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skill-assignments'] }),
  });

  // Seçili kullanıcı için otomatik atama
  const autoUserMutation = useMutation({
    mutationFn: () => jiraApi.autoAssignSkills(favBoard!.id, selectedUserKey!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skill-assignments'] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ skill, rating }: { skill: Skill; rating: number }) =>
      jiraApi.assignSkillToUser(selectedUserKey!, {
        skillId: skill.id,
        skillName: skill.name,
        skillCategory: skill.category,
        rating,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skill-assignments'] }),
  });

  const ratingMutation = useMutation({
    mutationFn: ({ skillId, rating }: { skillId: string; rating: number }) =>
      jiraApi.updateUserSkillRating(selectedUserKey!, skillId, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skill-assignments'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (skillId: string) => jiraApi.removeUserSkill(selectedUserKey!, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skill-assignments'] }),
  });

  const filteredUsers = boardUsers.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const autoAllResult = autoAllMutation.data?.data;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yetenek Ataması</h1>
            <p className="text-sm text-gray-400">
              {favBoard ? `"${favBoard.name}" — issue başlıklarından otomatik yetenek tespiti` : 'Dashboard\'dan bir favori board seçmelisin'}
            </p>
          </div>
        </div>

        {/* Tüm board için otomatik tara */}
        {favBoard && skills.length > 0 && (
          <button
            onClick={() => autoAllMutation.mutate()}
            disabled={autoAllMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            {autoAllMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Taranıyor...</>
              : <><Zap className="w-4 h-4" /> Tüm Kullanıcıları Otomatik Tara</>}
          </button>
        )}
      </div>

      {/* Otomatik tarama sonucu */}
      {autoAllResult && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <p className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Otomatik Tarama Tamamlandı
          </p>
          <div className="space-y-1">
            {autoAllResult.results?.map((r: { userKey: string; displayName: string; matched: Array<{ skillName: string; matchCount: number; rating: number }> }) => (
              <div key={r.userKey} className="text-xs text-indigo-600">
                <span className="font-medium">{r.displayName}</span>
                {r.matched.length > 0
                  ? ` → ${r.matched.map((m) => `${m.skillName} (${m.matchCount} eşleşme, ${'★'.repeat(m.rating)})`).join(', ')}`
                  : ' → Eşleşme bulunamadı'}
              </div>
            ))}
          </div>
        </div>
      )}

      {!favBoard ? (
        <div className="flex items-center gap-3 p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Önce Dashboard'dan bir favori board seçmelisin.</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex items-center gap-3 p-5 bg-blue-50 rounded-2xl border border-blue-200 text-blue-700">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Önce <strong>Yetenek Yönetimi</strong> sayfasından yetenekler tanımlamalısın.</p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[500px]">

          {/* ── Sol: Kullanıcı listesi ── */}
          <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Kullanıcılar
                {boardUsers.length > 0 && <span className="text-gray-300">({boardUsers.length})</span>}
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Ara..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">Kullanıcı yok</p>
              ) : (
                filteredUsers.map((user) => {
                  const userAssignments = allAssignments[user.key] || [];
                  const avgRating = userAssignments.length
                    ? userAssignments.reduce((s, a) => s + a.rating, 0) / userAssignments.length
                    : 0;
                  const isSelected = selectedUserKey === user.key;

                  return (
                    <button
                      key={user.key}
                      onClick={() => setSelectedUserKey(user.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {user.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {userAssignments.length > 0 ? (
                            <>
                              <StarRating value={Math.round(avgRating)} readonly size="sm" />
                              <span className="text-xs text-gray-400">{userAssignments.length} yetenek</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300">Yetenek atanmadı</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Sağ: Yetenek paneli ── */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
                <Users className="w-12 h-12 opacity-30" />
                <p className="text-sm">Soldan bir kullanıcı seç</p>
              </div>
            ) : (
              <>
                {/* Kullanıcıya özel otomatik tara butonu */}
                <div className="px-5 pt-4 pb-0 flex justify-end">
                  <button
                    onClick={() => autoUserMutation.mutate()}
                    disabled={autoUserMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition disabled:opacity-50"
                  >
                    {autoUserMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Taranıyor...</>
                      : <><RefreshCw className="w-3.5 h-3.5" /> Issue'lardan Otomatik Tara</>}
                  </button>
                </div>
                <UserPanel
                  user={selectedUser}
                  skills={skills}
                  assignments={selectedAssignments}
                  onAssign={(skill, rating) => assignMutation.mutate({ skill, rating })}
                  onRemove={(skillId) => removeMutation.mutate(skillId)}
                  onRatingChange={(skillId, rating) => ratingMutation.mutate({ skillId, rating })}
                  isPending={assignMutation.isPending || ratingMutation.isPending || removeMutation.isPending || autoUserMutation.isPending}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSkillAssignmentPage;
