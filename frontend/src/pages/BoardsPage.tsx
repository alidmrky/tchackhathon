import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jiraApi } from '../api/jira';
import { JiraBoard, JiraSprint } from '../types/jira';
import { Layout, Loader2, AlertCircle, ChevronDown, ChevronUp, Calendar, Target } from 'lucide-react';

const sprintStateColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  future: 'bg-blue-100 text-blue-700',
};

const BoardsPage: React.FC = () => {
  const [expandedBoard, setExpandedBoard] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: () => jiraApi.getBoards().then((r) => r.data),
  });

  const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', expandedBoard],
    queryFn: () => jiraApi.getSprints(expandedBoard!).then((r) => r.data),
    enabled: !!expandedBoard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Board'lar yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
        <AlertCircle className="w-5 h-5" />
        <span>Board'lar yüklenirken hata oluştu. Agile board'larınız olmayabilir.</span>
      </div>
    );
  }

  const boards: JiraBoard[] = data?.values || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Board'lar</h1>
        <p className="text-gray-500 mt-1">{boards.length} board bulundu</p>
      </div>

      <div className="space-y-3">
        {boards.map((board) => (
          <div key={board.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedBoard(expandedBoard === board.id ? null : board.id)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layout className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{board.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 capitalize">{board.type}</span>
                  {board.location?.projectName && (
                    <span className="text-xs text-gray-400">• {board.location.projectName}</span>
                  )}
                </div>
              </div>
              {expandedBoard === board.id ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedBoard === board.id && (
              <div className="border-t border-gray-100 px-5 py-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Sprint'ler</h4>
                {sprintsLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sprint'ler yükleniyor...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(sprintsData?.values as JiraSprint[] || []).map((sprint) => (
                      <SprintCard key={sprint.id} sprint={sprint} />
                    ))}
                    {(!sprintsData?.values || sprintsData.values.length === 0) && (
                      <p className="text-gray-400 text-sm col-span-2">Sprint bulunamadı.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {boards.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Layout className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Board bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

const SprintCard: React.FC<{ sprint: JiraSprint }> = ({ sprint }) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <div className="flex items-start justify-between mb-2">
      <h5 className="font-medium text-gray-800 text-sm">{sprint.name}</h5>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sprintStateColors[sprint.state] || 'bg-gray-100 text-gray-600'}`}>
        {sprint.state}
      </span>
    </div>

    {sprint.goal && (
      <div className="flex items-start gap-1 text-xs text-gray-500 mb-2">
        <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2">{sprint.goal}</span>
      </div>
    )}

    {(sprint.startDate || sprint.endDate) && (
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Calendar className="w-3 h-3" />
        <span>
          {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('tr-TR') : '?'}
          {' → '}
          {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('tr-TR') : '?'}
        </span>
      </div>
    )}
  </div>
);

export default BoardsPage;
