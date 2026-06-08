import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import {
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  Tag,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';

// ── Tipler ────────────────────────────────────────────────────────────────────
interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Sabitler ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Frontend', 'Backend', 'DevOps', 'Analiz', 'Test',
  'Tasarım', 'Veri / BI', 'Proje Yönetimi', 'Güvenlik', 'Genel',
];

const COLORS: { key: string; label: string; pill: string; dot: string }[] = [
  { key: 'blue',   label: 'Mavi',     pill: 'bg-blue-100 text-blue-800 border-blue-200',    dot: 'bg-blue-500' },
  { key: 'purple', label: 'Mor',      pill: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  { key: 'green',  label: 'Yeşil',    pill: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500' },
  { key: 'orange', label: 'Turuncu',  pill: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  { key: 'red',    label: 'Kırmızı',  pill: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500' },
  { key: 'cyan',   label: 'Cyan',     pill: 'bg-cyan-100 text-cyan-800 border-cyan-200',      dot: 'bg-cyan-500' },
  { key: 'pink',   label: 'Pembe',    pill: 'bg-pink-100 text-pink-800 border-pink-200',      dot: 'bg-pink-500' },
  { key: 'yellow', label: 'Sarı',     pill: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  { key: 'gray',   label: 'Gri',      pill: 'bg-gray-100 text-gray-700 border-gray-200',      dot: 'bg-gray-500' },
];

const getColor = (key: string) =>
  COLORS.find((c) => c.key === key) || COLORS[0];

// ── Skill Formu (Ekle / Düzenle) ─────────────────────────────────────────────
interface SkillFormData {
  name: string;
  category: string;
  description: string;
  color: string;
}

const EMPTY_FORM: SkillFormData = { name: '', category: 'Genel', description: '', color: 'blue' };

const SkillForm: React.FC<{
  initial?: SkillFormData;
  onSave: (data: SkillFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
}> = ({ initial = EMPTY_FORM, onSave, onCancel, isPending, title }) => {
  const [form, setForm] = useState<SkillFormData>(initial);
  const [catOpen, setCatOpen] = useState(false);

  const set = (k: keyof SkillFormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <p className="font-semibold text-gray-900">{title}</p>

      {/* İsim */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Yetenek Adı *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="ör. React, SQL, Analiz Raporu..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Kategori */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none hover:border-gray-300"
            >
              <span className="text-gray-800">{form.category}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {catOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCatOpen(false)} />
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 w-full max-h-52 overflow-y-auto py-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { set('category', cat); setCatOpen(false); }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      {cat}
                      {form.category === cat && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Renk */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Renk</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {COLORS.map((c) => (
              <button
                key={c.key}
                title={c.label}
                onClick={() => set('color', c.key)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${c.dot} ${
                  form.color === c.key ? 'border-gray-800 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Açıklama */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Açıklama</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Bu yeteneği kısaca açıkla..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      {/* Önizleme */}
      {form.name && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Önizleme:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getColor(form.color).pill}`}>
            <Tag className="w-3 h-3" />
            {form.name}
          </span>
          <span className="text-xs text-gray-400">{form.category}</span>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
        >
          İptal
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Kaydet
        </button>
      </div>
    </div>
  );
};

// ── Skill Kartı ───────────────────────────────────────────────────────────────
const SkillCard: React.FC<{
  skill: Skill;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ skill, onDelete, onEdit }) => {
  const color = getColor(skill.color);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow group">
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${color.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color.pill}`}>
            <Tag className="w-2.5 h-2.5" />
            {skill.name}
          </span>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {skill.category}
          </span>
        </div>
        {skill.description && (
          <p className="text-xs text-gray-500 leading-relaxed">{skill.description}</p>
        )}
        <p className="text-xs text-gray-300 mt-1.5">
          {new Date(skill.createdAt).toLocaleDateString('tr-TR')}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const SkillsManagementPage: React.FC = () => {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('Tümü');

  const { data: skills = [], isLoading, isError } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: () => jiraApi.getSkills().then((r) => r.data),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (data: SkillFormData) => jiraApi.addSkill(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillFormData }) =>
      jiraApi.updateSkill(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jiraApi.deleteSkill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  });

  // Kategoriye göre grupla
  const categories = ['Tümü', ...Array.from(new Set(skills.map((s) => s.category))).sort()];
  const filtered = filterCat === 'Tümü' ? skills : skills.filter((s) => s.category === filterCat);

  // Kategori grupları (filtre yoksa)
  const grouped = filtered.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yetenek Yönetimi</h1>
            <p className="text-sm text-gray-400">
              {skills.length > 0 ? `${skills.length} yetenek tanımlı` : 'Henüz yetenek eklenmedi'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yetenek Ekle
        </button>
      </div>

      {/* Ekleme Formu */}
      {showAddForm && (
        <div className="mb-6">
          <SkillForm
            title="Yeni Yetenek"
            onSave={(data) => addMutation.mutate(data)}
            onCancel={() => setShowAddForm(false)}
            isPending={addMutation.isPending}
          />
        </div>
      )}

      {/* Kategori Filtresi */}
      {skills.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filterCat === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {cat}
              {cat !== 'Tümü' && (
                <span className={`ml-1.5 ${filterCat === cat ? 'opacity-80' : 'text-gray-400'}`}>
                  {skills.filter((s) => s.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* İçerik */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 rounded-2xl text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Yetenekler yüklenirken hata oluştu.</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Henüz yetenek eklenmedi</p>
          <p className="text-gray-400 text-sm mb-4">
            Ekibinizdeki yetenekleri tanımlamak için yukarıdaki butona tıklayın
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> İlk Yeteneği Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b, 'tr'))
            .map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-600">{cat}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((skill) =>
                    editingId === skill.id ? (
                      <div key={skill.id} className="sm:col-span-2 lg:col-span-3">
                        <SkillForm
                          title="Yeteneği Düzenle"
                          initial={{ name: skill.name, category: skill.category, description: skill.description, color: skill.color }}
                          onSave={(data) => updateMutation.mutate({ id: skill.id, data })}
                          onCancel={() => setEditingId(null)}
                          isPending={updateMutation.isPending}
                        />
                      </div>
                    ) : (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        onEdit={() => { setEditingId(skill.id); setShowAddForm(false); }}
                        onDelete={() => deleteMutation.mutate(skill.id)}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* İstatistik özeti — alt kısım */}
      {skills.length > 0 && (
        <div className="mt-8 p-4 bg-gradient-to-r from-violet-50 to-blue-50 rounded-2xl border border-violet-100">
          <p className="text-xs font-semibold text-violet-600 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Özet
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-700">
              <span className="font-bold text-gray-900">{skills.length}</span> yetenek
            </span>
            <span className="text-gray-700">
              <span className="font-bold text-gray-900">{categories.length - 1}</span> kategori
            </span>
            {Object.entries(
              skills.reduce<Record<string, number>>((acc, s) => {
                acc[s.category] = (acc[s.category] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([cat, count]) => (
                <span key={cat} className="text-gray-500 text-xs">
                  {cat}: <span className="font-medium text-gray-700">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsManagementPage;
