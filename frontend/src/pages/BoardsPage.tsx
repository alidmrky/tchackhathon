import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { jiraApi } from '../api/jira';
import type { JiraBoard } from '../types/jira';
import {
  Layout,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';

const PAGE_SIZE = 20;

const BOARD_TYPES = [
  { value: '', label: 'Tümü' },
  { value: 'scrum', label: 'Scrum' },
  { value: 'kanban', label: 'Kanban' },
  { value: 'simple', label: 'Simple' },
];

const typeBadge: Record<string, string> = {
  scrum: 'bg-blue-100 text-blue-700',
  kanban: 'bg-green-100 text-green-700',
  simple: 'bg-gray-100 text-gray-600',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const BoardsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['boards', page, debouncedSearch, typeFilter],
    queryFn: () =>
      jiraApi
        .getBoards({
          startAt: page * PAGE_SIZE,
          maxResults: PAGE_SIZE,
          name: debouncedSearch || undefined,
          type: typeFilter || undefined,
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const boards: JiraBoard[] = data?.values || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleClear = () => {
    setSearchInput('');
    inputRef.current?.focus();
  };

  const activeTypeLabel = BOARD_TYPES.find((t) => t.value === typeFilter)?.label || 'Tümü';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Board'lar</h1>
        <p className="text-gray-500 text-sm">
          {debouncedSearch || typeFilter
            ? `${total} sonuç bulundu`
            : `Toplam ${total} board`}
          {isLoading && (
            <Loader2 className="inline w-3 h-3 ml-2 animate-spin text-gray-400" />
          )}
        </p>
      </div>

      {/* Jira tarzı arama ve filtre çubuğu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-0 p-3">
          {/* Board Type dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium border border-gray-200 rounded-l-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
            >
              {BOARD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  Board Tipi: {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200" />

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Board adıyla ara..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 border-l-0 rounded-r-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
            />
            {searchInput && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active filters */}
        {(debouncedSearch || typeFilter) && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">Filtreler:</span>
            {typeFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                {activeTypeLabel}
                <button onClick={() => setTypeFilter('')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                "{debouncedSearch}"
                <button onClick={handleClear}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => { setSearchInput(''); setTypeFilter(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1 underline"
            >
              Tümünü temizle
            </button>
          </div>
        )}
      </div>

      {/* Tablo */}
      {error ? (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>Board'lar yüklenirken hata oluştu.</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tablo başlıkları */}
          <div className="grid grid-cols-[1fr_120px_80px] px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Board Adı</span>
            <span>Tip</span>
            <span className="text-right">Detay</span>
          </div>

          {isLoading && boards.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sonuç bulunamadı</p>
              <p className="text-sm mt-1">
                {debouncedSearch
                  ? `"${debouncedSearch}" ile eşleşen board yok.`
                  : 'Filtreye uyan board bulunamadı.'}
              </p>
              <button
                onClick={() => { setSearchInput(''); setTypeFilter(''); }}
                className="mt-3 text-blue-500 text-sm hover:underline"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/boards/${board.id}`}
                  className="grid grid-cols-[1fr_120px_80px] items-center px-5 py-3.5 hover:bg-blue-50/40 transition-colors group"
                >
                  {/* Board adı */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Layout className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        <HighlightText text={board.name} query={debouncedSearch} />
                      </p>
                      {board.location?.projectName && (
                        <p className="text-xs text-gray-400 truncate">{board.location.projectName}</p>
                      )}
                    </div>
                  </div>

                  {/* Board tipi */}
                  <div>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        typeBadge[board.type?.toLowerCase()] || 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {board.type}
                    </span>
                  </div>

                  {/* Detay */}
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                      Detay
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-sm text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total} board
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 bg-white hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default BoardsPage;
