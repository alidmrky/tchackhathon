import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { jiraApi } from '../api/jira';
import { JiraProject } from '../types/jira';
import { Folder, Users, Tag, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

const typeColors: Record<string, string> = {
  software: 'bg-blue-100 text-blue-700',
  business: 'bg-purple-100 text-purple-700',
  service_desk: 'bg-green-100 text-green-700',
};

const ProjectsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => jiraApi.getProjects().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Projeler yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>Projeler yüklenirken bir hata oluştu.</span>
      </div>
    );
  }

  const projects: JiraProject[] = data?.values || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projeler</h1>
        <p className="text-gray-500 mt-1">{projects.length} proje bulundu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.key}`}
            className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {project.avatarUrls?.['48x48'] ? (
                  <img
                    src={project.avatarUrls['48x48']}
                    alt={project.name}
                    className="w-10 h-10 rounded-lg"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Folder className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">{project.key}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>

            {project.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  typeColors[project.projectTypeKey] || 'bg-gray-100 text-gray-600'
                }`}
              >
                <Tag className="w-3 h-3" />
                {project.projectTypeKey}
              </span>

              {project.lead && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  <Users className="w-3 h-3" />
                  {project.lead.displayName}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Henüz proje bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
