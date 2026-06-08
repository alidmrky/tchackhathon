import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import {
  CalendarDays,
  Loader2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Info,
} from 'lucide-react';

// ── Tipler ────────────────────────────────────────────────────────────────────
interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'resmi' | 'sirket' | 'izin' | 'yari';
  isHalfDay: boolean;
}

type HolidayType = Holiday['type'];

// ── Sabitler ──────────────────────────────────────────────────────────────────
const TYPES: Record<HolidayType, { label: string; color: string; bg: string; dot: string; border: string }> = {
  resmi:  { label: 'Resmi Tatil',    color: 'text-amber-700',  bg: 'bg-amber-50',   dot: 'bg-amber-400',   border: 'border-amber-300' },
  sirket: { label: 'Şirket Tatili',  color: 'text-blue-700',   bg: 'bg-blue-50',    dot: 'bg-blue-400',    border: 'border-blue-300' },
  izin:   { label: 'İzin Günü',      color: 'text-green-700',  bg: 'bg-green-50',   dot: 'bg-green-400',   border: 'border-green-300' },
  yari:   { label: 'Yarım Gün',      color: 'text-purple-700', bg: 'bg-purple-50',  dot: 'bg-purple-400',  border: 'border-purple-300' },
};

const TR_MONTHS = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
];
const TR_DAYS_SHORT = ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];

// 2026 Turkcell takviminden — Resmi Tatiller + Şirket Tatilleri + Yarım Günler
const OFFICIAL_2026: Array<{ date: string; name: string; type: HolidayType; isHalfDay: boolean }> = [
  // ── Resmi Tatiller ────────────────────────────────────────────────────────
  { date: '2026-01-01', name: 'Yılbaşı',                              type: 'resmi',  isHalfDay: false },
  { date: '2026-03-19', name: 'Ramazan Bayramı Arifesi',              type: 'yari',   isHalfDay: true  },
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün',               type: 'resmi',  isHalfDay: false },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün',               type: 'resmi',  isHalfDay: false },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün',               type: 'resmi',  isHalfDay: false },
  { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı',    type: 'resmi',  isHalfDay: false },
  { date: '2026-05-01', name: 'Emek ve Dayanışma Günü',               type: 'resmi',  isHalfDay: false },
  { date: '2026-05-19', name: 'Gençlik ve Spor Bayramı',              type: 'resmi',  isHalfDay: false },
  { date: '2026-05-26', name: 'Kurban Bayramı Arifesi',               type: 'yari',   isHalfDay: true  },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün',                type: 'resmi',  isHalfDay: false },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün',                type: 'resmi',  isHalfDay: false },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün',                type: 'resmi',  isHalfDay: false },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün',                type: 'resmi',  isHalfDay: false },
  { date: '2026-07-15', name: 'Demokrasi ve Milli Birlik Günü',       type: 'resmi',  isHalfDay: false },
  { date: '2026-08-30', name: 'Zafer Bayramı',                        type: 'resmi',  isHalfDay: false },
  { date: '2026-10-28', name: 'Cumhuriyet Bayramı Öncesi',            type: 'yari',   isHalfDay: true  },
  { date: '2026-10-29', name: 'Cumhuriyet Bayramı',                   type: 'resmi',  isHalfDay: false },

  // ── Şirket Tatilleri (Turkcell 2026 takvimindeki mavi günler) ─────────────
  // Temmuz — 15 Temmuz (Çar) resmi tatil; 13-14 Temmuz köprü tatil
  { date: '2026-07-13', name: 'Şirket Tatili (Köprü)',                type: 'sirket', isHalfDay: false },
  { date: '2026-07-14', name: 'Şirket Tatili (Köprü)',                type: 'sirket', isHalfDay: false },
  // Ağustos — 30 Ağustos (Paz) Zafer Bayramı; 24-28 Ağustos önceki hafta
  { date: '2026-08-24', name: 'Şirket Tatili',                        type: 'sirket', isHalfDay: false },
  { date: '2026-08-25', name: 'Şirket Tatili',                        type: 'sirket', isHalfDay: false },
  { date: '2026-08-26', name: 'Şirket Tatili',                        type: 'sirket', isHalfDay: false },
  { date: '2026-08-27', name: 'Şirket Tatili',                        type: 'sirket', isHalfDay: false },
  { date: '2026-08-28', name: 'Şirket Tatili',                        type: 'sirket', isHalfDay: false },
];

// ── Yardımcılar ───────────────────────────────────────────────────────────────
const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

// Haftanın hangi günü başlıyor (0=Pazar → Türkçe: Pazartesi=0 için kaydır)
const getFirstDayOfWeek = (year: number, month: number) => {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return (d + 6) % 7; // 0=Mon, 6=Sun
};

const isWeekend = (year: number, month: number, day: number) => {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
};

// ── Gün hücresi ───────────────────────────────────────────────────────────────
const DayCell: React.FC<{
  day: number;
  dateStr: string;
  holiday: Holiday | undefined;
  isWeekend: boolean;
  onClick: () => void;
}> = ({ day, dateStr, holiday, isWeekend: weekend, onClick }) => {
  const type = holiday ? TYPES[holiday.type] : null;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = dateStr === today;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium
        transition-all hover:scale-105 active:scale-95 select-none
        ${weekend
          ? 'bg-gray-50 text-gray-300 cursor-default hover:scale-100'
          : holiday
            ? `${type!.bg} ${type!.color} ${type!.border} border cursor-pointer hover:brightness-95`
            : 'bg-white text-gray-700 border border-transparent hover:border-blue-200 hover:bg-blue-50 cursor-pointer'
        }
        ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
      `}
      disabled={weekend}
      title={holiday?.name || ''}
    >
      <span className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}>{day}</span>
      {holiday?.isHalfDay && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400" title="Yarım gün" />
      )}
      {holiday && !holiday.isHalfDay && (
        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${type!.dot}`} />
      )}
    </button>
  );
};

// ── Aylık takvim ──────────────────────────────────────────────────────────────
const MonthGrid: React.FC<{
  year: number;
  month: number;
  holidayMap: Record<string, Holiday>;
  onDayClick: (dateStr: string, holiday?: Holiday) => void;
}> = ({ year, month, holidayMap, onDayClick }) => {
  const days = getDaysInMonth(year, month);
  const startDow = getFirstDayOfWeek(year, month);
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`e-${i}`} />);
  }
  for (let d = 1; d <= days; d++) {
    const dateStr = toDateStr(year, month, d);
    const holiday = holidayMap[dateStr];
    const weekend = isWeekend(year, month, d);
    cells.push(
      <DayCell
        key={dateStr}
        day={d}
        dateStr={dateStr}
        holiday={holiday}
        isWeekend={weekend}
        onClick={() => !weekend && onDayClick(dateStr, holiday)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-center">
        <p className="text-sm font-semibold text-gray-800">{TR_MONTHS[month]}</p>
      </div>
      <div className="p-3">
        {/* Gün başlıkları */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {TR_DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-0.5">{d}</div>
          ))}
        </div>
        {/* Gün hücreleri */}
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>
      </div>
    </div>
  );
};

// ── Gün düzenleme paneli ──────────────────────────────────────────────────────
const DayEditor: React.FC<{
  dateStr: string;
  holiday?: Holiday;
  onSave: (data: { date: string; name: string; type: HolidayType; isHalfDay: boolean }) => void;
  onDelete: (date: string) => void;
  onClose: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}> = ({ dateStr, holiday, onSave, onDelete, onClose, isSaving, isDeleting }) => {
  const [name, setName] = useState(holiday?.name || '');
  const [type, setType] = useState<HolidayType>(holiday?.type || 'resmi');
  const [isHalfDay, setIsHalfDay] = useState(holiday?.isHalfDay || false);

  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-gray-900">{holiday ? 'Tatil Düzenle' : 'Tatil / İzin Ekle'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tür */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Tür</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPES) as HolidayType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  type === t
                    ? `${TYPES[t].bg} ${TYPES[t].color} ${TYPES[t].border} shadow-sm`
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${TYPES[t].dot}`} />
                {TYPES[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Ad */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Açıklama / Ad</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ör. Ramazan Bayramı 1. Gün"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
          />
        </div>

        {/* Yarım gün */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsHalfDay((v) => !v)}
            className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isHalfDay ? 'bg-purple-500' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isHalfDay ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-gray-700">Yarım gün</span>
        </label>

        {/* Butonlar */}
        <div className="flex gap-2 pt-1">
          {holiday && (
            <button
              onClick={() => onDelete(dateStr)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm transition"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Kaldır
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition">
            İptal
          </button>
          <button
            onClick={() => onSave({ date: dateStr, name, type, isHalfDay })}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const LeaveCalendarPage: React.FC = () => {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | undefined>();
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays', year],
    queryFn: () => jiraApi.getHolidays(year).then((r) => r.data),
    staleTime: 30_000,
  });

  // Hızlı lookup için map
  const holidayMap = useMemo(() =>
    holidays.reduce<Record<string, Holiday>>((acc, h) => { acc[h.date] = h; return acc; }, {}),
    [holidays]
  );

  const upsertMutation = useMutation({
    mutationFn: (data: { date: string; name: string; type: string; isHalfDay: boolean }) =>
      jiraApi.upsertHoliday(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', year] });
      setSelectedDate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (date: string) => jiraApi.deleteHoliday(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', year] });
      setSelectedDate(null);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () => jiraApi.bulkUpsertHolidays(OFFICIAL_2026),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', year] });
      setShowBulkConfirm(false);
    },
  });

  const handleDayClick = (dateStr: string, holiday?: Holiday) => {
    setSelectedDate(dateStr);
    setSelectedHoliday(holiday);
  };

  // İstatistikler
  const stats = useMemo(() => {
    const counts: Record<HolidayType, number> = { resmi: 0, sirket: 0, izin: 0, yari: 0 };
    for (const h of holidays) counts[h.type] = (counts[h.type] || 0) + 1;
    return counts;
  }, [holidays]);

  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">İzin Takvimi</h1>
            <p className="text-sm text-gray-400">Tatil ve izin günleri yönetimi</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Yıl seçici */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-gray-800 min-w-[3.5rem] text-center">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2026 tatilleri yükle */}
          {year === 2026 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-100 transition"
            >
              <Download className="w-4 h-4" />
              2026 Tatillerini Yükle
            </button>
          )}
        </div>
      </div>

      {/* İstatistik çubuğu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.keys(TYPES) as HolidayType[]).map((t) => (
          <div key={t} className={`${TYPES[t].bg} border ${TYPES[t].border} rounded-xl px-4 py-3 flex items-center gap-3`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${TYPES[t].dot}`} />
            <div>
              <p className={`text-lg font-bold ${TYPES[t].color}`}>{stats[t]}</p>
              <p className="text-xs text-gray-500">{TYPES[t].label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legent / İpucu */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 flex-wrap">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Standart çalışma saatleri Pazartesi–Cuma. Hafta sonları (gri) seçilemez. Bir güne tıklayarak tatil ekleyebilirsin.</span>
      </div>

      {/* Takvim grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {months.map((m) => (
            <MonthGrid
              key={m}
              year={year}
              month={m}
              holidayMap={holidayMap}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      )}

      {/* Tatil listesi */}
      {holidays.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900">
              {year} Tatil Listesi
              <span className="ml-2 text-sm font-normal text-gray-400">({holidays.length} gün)</span>
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {holidays.map((h) => {
              const t = TYPES[h.type];
              const d = new Date(h.date + 'T00:00:00');
              return (
                <div
                  key={h.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 group cursor-pointer"
                  onClick={() => handleDayClick(h.date, h)}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.dot}`} />
                  <span className="text-sm text-gray-500 w-28 flex-shrink-0">
                    {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{h.name || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.bg} ${t.color}`}>
                    {h.isHalfDay ? 'Yarım Gün' : t.label}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(h.date); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gün düzenleme modali */}
      {selectedDate && (
        <DayEditor
          dateStr={selectedDate}
          holiday={selectedHoliday}
          onSave={(data) => upsertMutation.mutate(data)}
          onDelete={(date) => deleteMutation.mutate(date)}
          onClose={() => setSelectedDate(null)}
          isSaving={upsertMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* 2026 resmi tatil yükleme onay modali */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowBulkConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" /> 2026 Tatil Takvimi
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Turkcell 2026 takvimindeki tüm tatiller yüklenecek:
            </p>
            <ul className="text-xs text-gray-400 mb-4 space-y-0.5 pl-3">
              <li>• {OFFICIAL_2026.filter(h => h.type === 'resmi').length} Resmi Tatil</li>
              <li>• {OFFICIAL_2026.filter(h => h.type === 'sirket').length} Şirket Tatili</li>
              <li>• {OFFICIAL_2026.filter(h => h.type === 'yari').length} Yarım Gün</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition"
              >
                İptal
              </button>
              <button
                onClick={() => bulkMutation.mutate()}
                disabled={bulkMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition"
              >
                {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendarPage;
