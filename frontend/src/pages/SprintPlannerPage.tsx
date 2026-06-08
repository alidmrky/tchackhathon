import React, { useState, useMemo, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import {
  CalendarDays,
  Loader2,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  ClipboardList,
  UserCheck,
  Code2,
  Sparkles,
  Sun,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ── Tipler ────────────────────────────────────────────────────────────────────
interface AssignedUser { key: string; displayName: string; avatarUrl?: string }
interface Assignment {
  index: number;
  title: string;
  analyst: AssignedUser | null;
  developer: AssignedUser | null;
  analystHours: number | null;
  developerHours: number | null;
}
interface CapacityUser {
  key: string;
  displayName: string;
  avatarUrl?: string;
  role: string | null;
  assignedCount: number;
  hoursPerPerson: number;
  hoursPerTask: number;
}
interface Holiday { date: string; name: string; type: string; isHalfDay: boolean }
interface PlanSummary {
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  totalWorkingHours: number;
  holidayCount: number;
  userCount: number;
  hoursPerPerson: number;
  itemCount: number;
}
interface SprintPlan {
  summary: PlanSummary;
  holidays: Holiday[];
  capacity: CapacityUser[];
  assignments: Assignment[];
}

// ── Sabitler ──────────────────────────────────────────────────────────────────
const LS_KEY = 'dashboard_favorite_board';

const ROLE_COLORS: Record<string, string> = {
  'Analist':       'bg-purple-100 text-purple-700',
  'Developer':     'bg-blue-100 text-blue-700',
  'Tester':        'bg-orange-100 text-orange-700',
  'DevOps':        'bg-cyan-100 text-cyan-700',
  'Scrum Master':  'bg-green-100 text-green-700',
  'Product Owner': 'bg-yellow-100 text-yellow-700',
};

const HOLIDAY_COLORS: Record<string, string> = {
  resmi:  'bg-amber-50 text-amber-700 border-amber-200',
  sirket: 'bg-blue-50 text-blue-700 border-blue-200',
  yari:   'bg-purple-50 text-purple-700 border-purple-200',
  izin:   'bg-green-50 text-green-700 border-green-200',
};

// ── Küçük bileşenler ──────────────────────────────────────────────────────────
const Avatar: React.FC<{ user: AssignedUser | CapacityUser; size?: 'sm' | 'md' }> = ({ user, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.displayName} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-white">{user.displayName.charAt(0).toUpperCase()}</span>
    </div>
  );
};

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }> = ({ icon, label, value, sub, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

// ── Sonuç ekranı ──────────────────────────────────────────────────────────────
const PlanResult: React.FC<{ plan: SprintPlan; sprintName: string }> = ({ plan, sprintName }) => {
  const { summary, holidays, capacity, assignments } = plan;
  const [showHolidays, setShowHolidays] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const analystMap = new Map<string, number>();
  const devMap = new Map<string, number>();
  assignments.forEach(a => {
    if (a.analyst)   analystMap.set(a.analyst.key,   (analystMap.get(a.analyst.key)   || 0) + 1);
    if (a.developer) devMap.set(a.developer.key, (devMap.get(a.developer.key) || 0) + 1);
  });

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div ref={printRef} className="space-y-6">
      {/* Sprint başlığı */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 rounded-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide font-medium mb-1">Sprint Planı</p>
              <h2 className="text-2xl font-bold">{sprintName || 'Yeni Sprint'}</h2>
              <p className="text-blue-200 text-sm mt-1">{fmt(summary.startDate)} — {fmt(summary.endDate)}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" /> Yazdır / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<CalendarDays className="w-5 h-5 text-blue-500" />} label="Çalışma Günü" value={summary.totalWorkingDays} sub={`${summary.totalWorkingHours} saat toplam`} />
        <SummaryCard icon={<Users className="w-5 h-5 text-purple-500" />} label="Ekip" value={`${summary.userCount} kişi`} sub={`${summary.hoursPerPerson} saat/kişi`} />
        <SummaryCard icon={<ClipboardList className="w-5 h-5 text-green-500" />} label="İş Kalemi" value={summary.itemCount} sub="Planlandı" />
        <SummaryCard icon={<Sun className="w-5 h-5 text-amber-500" />} label="Tatil / İzin" value={summary.holidayCount} sub="Bu dönemde" color={summary.holidayCount > 0 ? 'text-amber-600' : 'text-gray-900'} />
      </div>

      {/* Tatiller (açılır) */}
      {holidays.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHolidays(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Sun className="w-4 h-4 text-amber-500" />
              Bu Dönemdeki Tatiller
              <span className="text-xs text-gray-400 font-normal">({holidays.length} gün)</span>
            </p>
            {showHolidays ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showHolidays && (
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {holidays.map(h => (
                <span key={h.date} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${HOLIDAY_COLORS[h.type] || HOLIDAY_COLORS.resmi}`}>
                  {new Date(h.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  {' — '}{h.name}
                  {h.isHalfDay && ' (½ gün)'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kapasite dağılımı */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Ekip Kapasite Dağılımı
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Toplam {summary.totalWorkingHours} saat ÷ {summary.userCount} kişi = {summary.hoursPerPerson} saat/kişi</p>
        </div>
        <div className="divide-y divide-gray-50">
          {capacity.map(u => {
            const analystCount = analystMap.get(u.key) || 0;
            const devCount     = devMap.get(u.key)     || 0;
            const total        = analystCount + devCount;
            return (
              <div key={u.key} className="px-5 py-3 flex items-center gap-3">
                <Avatar user={u} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{u.displayName}</p>
                    {u.role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {analystCount > 0 && <span className="text-purple-600">✦ {analystCount} Analiz</span>}
                    {devCount > 0     && <span className="text-blue-600">⌨ {devCount} Dev</span>}
                    {total === 0      && <span>Atama yok</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">{u.hoursPerPerson}s</p>
                  <p className="text-xs text-gray-400">{total} iş</p>
                  {u.hoursPerTask > 0 && (
                    <p className="text-xs text-indigo-500 font-medium">~{u.hoursPerTask}s/iş</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Atama tablosu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <ClipboardList className="w-4 h-4 text-green-500" /> İş Atamaları
            <span className="text-xs font-normal text-gray-400">({assignments.length} iş)</span>
          </p>
        </div>
        {/* Tablo başlığı */}
        <div className="grid grid-cols-[40px_1fr_200px_80px_200px_80px] gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <span>#</span>
          <span>İş Başlığı</span>
          <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-purple-400" /> Analist</span>
          <span className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3 text-purple-300" /> Süre</span>
          <span className="flex items-center gap-1"><Code2 className="w-3 h-3 text-blue-400" /> Developer</span>
          <span className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3 text-blue-300" /> Süre</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
          {assignments.map((a) => (
            <div key={a.index} className="grid grid-cols-[40px_1fr_200px_80px_200px_80px] gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
              <span className="text-xs text-gray-400 font-mono">{a.index}</span>
              <p className="text-sm text-gray-800 font-medium leading-snug pr-2">{a.title}</p>
              {/* Analist */}
              <div>
                {a.analyst ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar user={a.analyst} />
                    <span className="text-xs text-gray-700 truncate">{a.analyst.displayName}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300 italic">Atanmadı</span>
                )}
              </div>
              {/* Analist saat */}
              <div className="text-right">
                {a.analystHours != null ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                    {a.analystHours}s
                  </span>
                ) : <span className="text-gray-200">—</span>}
              </div>
              {/* Developer */}
              <div>
                {a.developer ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar user={a.developer} />
                    <span className="text-xs text-gray-700 truncate">{a.developer.displayName}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300 italic">Atanmadı</span>
                )}
              </div>
              {/* Developer saat */}
              <div className="text-right">
                {a.developerHours != null ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                    {a.developerHours}s
                  </span>
                ) : <span className="text-gray-200">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const SprintPlannerPage: React.FC = () => {
  const favBoard = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate]   = useState(today);
  const [endDate,   setEndDate]     = useState(twoWeeks);
  const [rawItems,  setRawItems]    = useState('');

  const parsedItems = useMemo(() =>
    rawItems.split('\n').map(l => l.trim()).filter(Boolean),
    [rawItems]
  );

  const planMutation = useMutation({
    mutationFn: () => jiraApi.generateSprintPlan({
      boardId: favBoard!.id,
      items:   parsedItems,
      startDate,
      endDate,
    }),
  });

  const plan: SprintPlan | null = planMutation.data?.data || null;

  if (!favBoard) {
    return (
      <div className="flex items-center gap-3 p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700 mt-8 max-w-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">Önce Dashboard'dan bir favori board seçmelisin.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Akıllı Sprint Planlayıcı</h1>
          <p className="text-sm text-gray-400">
            Yeteneklere göre otomatik analist + developer ataması
            {favBoard && <span className="ml-1 text-blue-500">· {favBoard.name}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">

        {/* ── Sol: Konfigürasyon paneli ── */}
        <div className="space-y-4">

          {/* Sprint Adı */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Sprint Adı
            </label>
            <input
              type="text"
              value={sprintName}
              onChange={e => setSprintName(e.target.value)}
              placeholder="ör. Sprint 42 — Haziran 2026"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Tarih seçimi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Sprint Tarihleri
            </label>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Başlangıç</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Bitiş</p>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Tatil günleri otomatik çıkarılır · 1 gün = 8 saat
            </p>
          </div>

          {/* İş Kalemleri */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> İş Kalemleri
            </label>
            <p className="text-xs text-gray-400 mb-2">Excel'den kopyala — her satır bir iş kalemi</p>
            <textarea
              value={rawItems}
              onChange={e => setRawItems(e.target.value)}
              placeholder={"Kullanıcı girişi analiz edilecek\nÖdeme modülü geliştirilecek\nRapor ekranı tasarlanacak\nMobil uyum sağlanacak\n..."}
              rows={10}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y font-mono"
            />
            {parsedItems.length > 0 && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {parsedItems.length} iş kalemi hazır
              </p>
            )}
          </div>

          {/* Oluştur Butonu */}
          <button
            onClick={() => planMutation.mutate()}
            disabled={parsedItems.length === 0 || !startDate || !endDate || planMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:opacity-50 text-white font-semibold rounded-2xl transition shadow-sm text-sm"
          >
            {planMutation.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Planlanıyor...</>
              : <><Zap className="w-5 h-5" /> Sprint Planını Oluştur</>}
          </button>

          {planMutation.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">Hata oluştu. Lütfen yeteneklerin ve rollerin tanımlı olduğundan emin ol.</p>
            </div>
          )}
        </div>

        {/* ── Sağ: Sonuç ekranı ── */}
        <div>
          {!plan && !planMutation.isPending ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-300 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
              <Sparkles className="w-14 h-14 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Sprint planı henüz oluşturulmadı</p>
                <p className="text-xs mt-1">Sola iş kalemlerini gir ve "Oluştur"a tıkla</p>
              </div>
            </div>
          ) : planMutation.isPending ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-sm text-gray-400">Yetenekler analiz ediliyor, atamalar yapılıyor...</p>
            </div>
          ) : plan ? (
            <PlanResult plan={plan} sprintName={sprintName} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SprintPlannerPage;
