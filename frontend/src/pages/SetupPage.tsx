import React, { useState } from 'react';
import { useJira } from '../context/JiraContext';
import { Lock, Globe, Key, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

const SetupPage: React.FC = () => {
  const { saveConfig } = useJira();
  const [form, setForm] = useState({ baseUrl: '', token: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanUrl = form.baseUrl.replace(/\/$/, '');
      await saveConfig({ baseUrl: cleanUrl, token: form.token });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ||
          'Bağlantı kurulamadı. URL ve token bilgilerinizi kontrol edin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Jira Bağlantısı</h1>
          <p className="text-blue-300 mt-2">Jira URL ve Bearer Token bilgilerinizi girin</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white">Bağlantı Başarılı!</h2>
              <p className="text-blue-300 mt-2">Yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  <Globe className="inline w-4 h-4 mr-1" /> Jira URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-domain.atlassian.net"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <p className="text-xs text-blue-400 mt-1">
                  Örnek: https://mycompany.atlassian.net
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  <Key className="inline w-4 h-4 mr-1" /> Bearer Token
                </label>
                <textarea
                  rows={3}
                  placeholder="Jira API tokenınızı buraya yapıştırın"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none font-mono text-sm"
                />
                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-blue-200"
                  >
                    Atlassian hesabınızdan token oluşturabilirsiniz
                  </a>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed"
              >
                {loading ? 'Bağlanıyor...' : 'Bağlan'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-300 font-semibold mb-2">Nasıl token alınır?</p>
          <ol className="text-xs text-blue-400 space-y-1 list-decimal list-inside">
            <li>Atlassian hesabınıza giriş yapın</li>
            <li>Profile → Security → API Tokens sayfasına gidin</li>
            <li>"Create API token" butonuna tıklayın</li>
            <li>Oluşturulan token'ı kopyalayıp buraya yapıştırın</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
