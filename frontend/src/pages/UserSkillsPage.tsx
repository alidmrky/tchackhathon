import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Layers,
  Star,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Trash2,
  X,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface UserNote {
  id: string;
  text: string;
  createdAt: string;
}

// ── Not Paneli ────────────────────────────────────────────────────────────────
const UserNotesPanel: React.FC<{ userKey: string; onClose: () => void }> = ({ userKey, onClose }) => {
  const qc = useQueryClient();
  const [text, setText] = useState('');

  const { data: notes = [], isLoading } = useQuery<UserNote[]>({
    queryKey: ['user-notes', userKey],
    queryFn: () => jiraApi.getUserNotes(userKey).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () => jiraApi.addUserNote(userKey, text),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['user-notes', userKey] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => jiraApi.deleteUserNote(userKey, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-notes', userKey] }),
  });

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" /> Yorumlar
          {notes.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-600 px-1.5 rounded-full text-xs font-medium">
              {notes.length}
            </span>
          )}
        </p>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mevcut notlar */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl p-3 border border-gray-100 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{note.text}</p>
                <button
                  onClick={() => deleteMutation.mutate(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {new Date(note.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3 text-center py-2">Henüz yorum yok</p>
      )}

      {/* Yeni not */}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey && text.trim()) addMutation.mutate();
          }}
          placeholder="Yorum ekle... (Ctrl+Enter)"
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!text.trim() || addMutation.isPending}
          className="self-end p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition flex-shrink-0"
        >
          {addMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ── Issue tipi → Türkçe + renk + ikon emoji eşlemesi ─────────────────────────
const TYPE_META: Record<string, { label: string; color: string; bar: string; emoji: string }> = {
  'Development Task':  { label: 'Geliştirme',   color: 'text-blue-700',   bar: 'bg-blue-500',   emoji: '💻' },
  'Analysis Task':     { label: 'Analiz',        color: 'text-purple-700', bar: 'bg-purple-500', emoji: '🔍' },
  'Bug':               { label: 'Bug Düzeltme',  color: 'text-red-700',    bar: 'bg-red-500',    emoji: '🐛' },
  'Story':             { label: 'Story',          color: 'text-green-700',  bar: 'bg-green-500',  emoji: '📖' },
  'Task':              { label: 'Görev',          color: 'text-gray-700',   bar: 'bg-gray-500',   emoji: '✅' },
  'Sub-task':          { label: 'Alt Görev',      color: 'text-orange-700', bar: 'bg-orange-400', emoji: '🔧' },
  'Epic':              { label: 'Epic',           color: 'text-pink-700',   bar: 'bg-pink-500',   emoji: '⚡' },
  'Test':              { label: 'Test',           color: 'text-teal-700',   bar: 'bg-teal-500',   emoji: '🧪' },
  'Improvement':       { label: 'İyileştirme',   color: 'text-indigo-700', bar: 'bg-indigo-500', emoji: '📈' },
};

const getTypeMeta = (name: string) =>
  TYPE_META[name] || { label: name, color: 'text-gray-600', bar: 'bg-gray-400', emoji: '📋' };

// Kullanıcının en güçlü skili (en çok yaptığı iş tipi)
const getPrimarySkill = (issueTypes: Record<string, number>) => {
  const entries = Object.entries(issueTypes);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
};

const ROLE_COLORS: Record<string, string> = {
  'Analist':       'bg-purple-100 text-purple-700 border-purple-200',
  'Developer':     'bg-blue-100 text-blue-700 border-blue-200',
  'Tester':        'bg-orange-100 text-orange-700 border-orange-200',
  'DevOps':        'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Scrum Master':  'bg-green-100 text-green-700 border-green-200',
  'Product Owner': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Diğer':         'bg-gray-100 text-gray-600 border-gray-200',
};

interface UserSkill {
  key: string;
  displayName: string;
  avatarUrl?: string;
  role?: string | null;
  totalIssues: number;
  completedIssues: number;
  multiSprintIssues: number;
  issueTypes: Record<string, number>;
  recentTitles: string[];
  aiInsight: string;
}

// ── Skill Kartı ───────────────────────────────────────────────────────────────
const SkillCard: React.FC<{ user: UserSkill }> = ({ user }) => {
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // Not sayısını başlıkta göstermek için önceden çek
  const { data: notes = [] } = useQuery<UserNote[]>({
    queryKey: ['user-notes', user.key],
    queryFn: () => jiraApi.getUserNotes(user.key).then((r) => r.data),
    staleTime: 30_000,
  });

  const completionRate = user.totalIssues > 0
    ? Math.round((user.completedIssues / user.totalIssues) * 100)
    : 0;

  const typeEntries = Object.entries(user.issueTypes).sort((a, b) => b[1] - a[1]);
  const maxCount = typeEntries[0]?.[1] || 1;
  const primarySkill = getPrimarySkill(user.issueTypes);
  const primaryMeta = primarySkill ? getTypeMeta(primarySkill) : null;

  // Skill level: Uzman / Deneyimli / Yeni
  const level =
    user.totalIssues >= 50 ? { label: 'Uzman', color: 'bg-yellow-100 text-yellow-700', star: 3 }
    : user.totalIssues >= 20 ? { label: 'Deneyimli', color: 'bg-blue-100 text-blue-700', star: 2 }
    : { label: 'Yeni', color: 'bg-gray-100 text-gray-600', star: 1 };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Üst kısım: Avatar + bilgi */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-14 h-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Primary skill emoji badge */}
            {primaryMeta && (
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center text-sm">
                {primaryMeta.emoji}
              </span>
            )}
          </div>

          {/* Bilgi */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-xs text-gray-400 font-mono truncate">{user.key}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${level.color}`}>
                {'★'.repeat(level.star)}{'☆'.repeat(3 - level.star)} {level.label}
              </span>
            </div>

            {/* Rol + Ana skill etiketleri */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.role && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {user.role}
                </span>
              )}
              {primaryMeta && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                  <span>{primaryMeta.emoji}</span>
                  <span className={primaryMeta.color}>{primaryMeta.label}</span>
                  <span className="text-gray-400">odaklı</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat satırı */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <StatMini label="Toplam" value={user.totalIssues} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
          <StatMini label="Bitti" value={user.completedIssues} icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />} />
          <StatMini label="%" value={`${completionRate}%`} icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />} />
          <StatMini
            label="Çok-Sprint"
            value={user.multiSprintIssues}
            icon={<GitBranch className="w-3.5 h-3.5 text-orange-400" />}
            highlight={user.multiSprintIssues > 0}
          />
        </div>

        {/* Tamamlanma progress barı */}
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {user.aiInsight && (
        <div className="mx-5 mb-4 p-3.5 rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100">
          <p className="text-xs font-semibold text-violet-600 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Değerlendirmesi
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">{user.aiInsight}</p>
        </div>
      )}

      {/* Çok-sprint uyarısı */}
      {user.multiSprintIssues > 0 && (
        <div className="mx-5 mb-4 p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-2">
          <GitBranch className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            <span className="font-semibold">{user.multiSprintIssues} iş</span> birden fazla sprint boyunca devam etmiş
            {user.totalIssues > 0 && (
              <span className="text-orange-500"> ({Math.round((user.multiSprintIssues / user.totalIssues) * 100)}%)</span>
            )}
          </p>
        </div>
      )}

      {/* Skill barları */}
      <div className="px-5 pb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
          <Star className="w-3 h-3" /> Skill Dağılımı
        </p>
        <div className="space-y-2">
          {typeEntries.slice(0, expanded ? undefined : 4).map(([typeName, count]) => {
            const meta = getTypeMeta(typeName);
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={typeName}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <span>{meta.emoji}</span>
                    <span className={meta.color}>{meta.label}</span>
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${meta.bar} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {typeEntries.length > 4 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Daha az göster</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> {typeEntries.length - 4} tane daha</>
            )}
          </button>
        )}
      </div>

      {/* Son işler */}
      {user.recentTitles.length > 0 && (
        <div className="px-5 pb-4 pt-2 border-t border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Örnek İşler
          </p>
          <ul className="space-y-1">
            {user.recentTitles.map((title, i) => (
              <li key={i} className="text-xs text-gray-500 truncate flex items-start gap-1.5">
                <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                {title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yorum aç/kapat butonu */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setNotesOpen((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl border transition-all ${
            notesOpen
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {notes.length > 0 ? `${notes.length} Yorum` : 'Yorum Ekle'}
          {notesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Not paneli */}
      {notesOpen && (
        <UserNotesPanel userKey={user.key} onClose={() => setNotesOpen(false)} />
      )}
    </div>
  );
};

const StatMini: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, icon, highlight }) => (
  <div className={`rounded-xl py-2 px-1 ${highlight ? 'bg-orange-50' : 'bg-gray-50'}`}>
    <div className="flex items-center justify-center gap-0.5 mb-0.5">{icon}</div>
    <p className={`text-base font-bold text-center ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
    <p className="text-xs text-gray-400 text-center leading-tight">{label}</p>
  </div>
);

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
const UserSkillsPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [search, setSearch] = useState('');

  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => jiraApi.getBoard(Number(boardId)).then((r) => r.data),
    enabled: !!boardId,
  });

  const { data: skills, isLoading, error } = useQuery<UserSkill[]>({
    queryKey: ['board-user-skills', boardId],
    queryFn: () => jiraApi.getBoardUserSkills(Number(boardId)).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 5 * 60_000,
  });

  const filtered = (skills || []).filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/boards" className="hover:text-blue-600 transition">Board'lar</Link>
        <span>›</span>
        <Link to={`/boards/${boardId}`} className="hover:text-blue-600 transition">
          {boardData?.name || `Board #${boardId}`}
        </Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">Skill Kartları</span>
      </div>

      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Kullanıcı Skill Kartları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Board'daki tüm sprint geçmişi analiz edilerek oluşturulmuştur
          </p>
        </div>
        <Link
          to={`/boards/${boardId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Board'a Dön
        </Link>
      </div>

      {/* Arama */}
      {!isLoading && (skills?.length ?? 0) > 0 && (
        <div className="mb-5">
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      )}

      {/* İçerik */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm">Sprint geçmişi analiz ediliyor...</p>
          <p className="text-xs text-gray-300">Bu işlem birkaç saniye sürebilir</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>Skill verileri yüklenirken hata oluştu.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {search ? `"${search}" ile eşleşen kullanıcı yok` : 'Veri bulunamadı'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {filtered.length} kullanıcı · tüm sprint geçmişi
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((user) => (
              <SkillCard key={user.key} user={user} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UserSkillsPage;
