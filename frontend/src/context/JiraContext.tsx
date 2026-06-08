import React, { createContext, useContext, useState, useEffect } from 'react';
import { jiraApi } from '../api/jira';

interface JiraConfig {
  baseUrl: string;
  token: string;
}

interface JiraContextType {
  isConfigured: boolean;
  isLoading: boolean;
  config: JiraConfig | null;
  saveConfig: (config: JiraConfig) => Promise<void>;
  clearConfig: () => void;
}

const JiraContext = createContext<JiraContextType | null>(null);

export const JiraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<JiraConfig | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      const savedConfig = localStorage.getItem('jira_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig) as JiraConfig;
        await jiraApi.updateConfig(parsed);
        setConfig(parsed);
        setIsConfigured(true);
      } else {
        const res = await jiraApi.getConfigStatus();
        setIsConfigured(res.data.configured);
      }
    } catch {
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (cfg: JiraConfig) => {
    await jiraApi.updateConfig(cfg);
    localStorage.setItem('jira_config', JSON.stringify(cfg));
    setConfig(cfg);
    setIsConfigured(true);
  };

  const clearConfig = () => {
    localStorage.removeItem('jira_config');
    setConfig(null);
    setIsConfigured(false);
  };

  return (
    <JiraContext.Provider value={{ isConfigured, isLoading, config, saveConfig, clearConfig }}>
      {children}
    </JiraContext.Provider>
  );
};

export const useJira = () => {
  const ctx = useContext(JiraContext);
  if (!ctx) throw new Error('useJira must be used inside JiraProvider');
  return ctx;
};
