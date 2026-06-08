import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JiraProvider, useJira } from './context/JiraContext';
import Sidebar from './components/Sidebar';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import BoardsPage from './pages/BoardsPage';
import BoardDetailPage from './pages/BoardDetailPage';
import SprintDetailPage from './pages/SprintDetailPage';
import UserSkillsPage from './pages/UserSkillsPage';
import SkillsManagementPage from './pages/SkillsManagementPage';
import LeaveCalendarPage from './pages/LeaveCalendarPage';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const AppLayout: React.FC = () => {
  const { isConfigured, isLoading } = useJira();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardDetailPage />} />
          <Route path="/boards/:boardId/sprints/:sprintId" element={<SprintDetailPage />} />
          <Route path="/boards/:boardId/skills" element={<UserSkillsPage />} />
          <Route path="/skills" element={<SkillsManagementPage />} />
          <Route path="/calendar" element={<LeaveCalendarPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <JiraProvider>
        <AppLayout />
      </JiraProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
