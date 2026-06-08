# Jira Hub 🚀

**Jira Hub**, şirket içi Jira Data Center kurulumuna bağlanan, ekip yönetimini ve sprint planlamasını akıllı hale getiren bir web uygulamasıdır. Geliştiricilerin yetenek haritalarını çıkarır, sprint kapasitelerini hesaplar ve iş atamalarını otomatikleştirir.

---

## ✨ Özellikler

| Modül | Açıklama |
|-------|----------|
| **Dashboard** | Favori board seçimi, aktif sprint özeti, takım üyeleri |
| **Board & Sprint Detayı** | Sprint bazlı issue görüntüleme, kullanıcı filtreleme |
| **Skill Kartları** | Issue geçmişine göre otomatik yetenek tespiti + AI değerlendirmesi |
| **Yetenek Yönetimi** | Kategori, renk ve açıklamalı yetenek tanımları |
| **Yetenek Atama** | Kullanıcılara otomatik/manuel yetenek atama ve puanlama (1-5 yıldız) |
| **İzin Takvimi** | Yıllık tatil takvimi, resmi/şirket/yarım gün tatil desteği |
| **Akıllı Sprint Planlayıcı** | Excel'den görev yapıştır → AI analist + developer ataması + kapasite hesabı |

---

## 🏗️ Mimari

```
hackhathon/
├── backend/                  # Express.js API Sunucusu (Port 5000)
│   ├── index.js              # Giriş noktası
│   ├── db.js                 # JSON tabanlı yerel veritabanı (data.json)
│   ├── data.json             # Kalıcı veri deposu (roles, skills, holidays, assignments)
│   ├── routes/
│   │   └── jira.js           # Tüm API rotaları (~600 satır)
│   └── services/
│       └── jiraService.js    # Jira API entegrasyonu + AI insight üretimi
│
└── frontend/                 # React + TypeScript (Port 5173)
    └── src/
        ├── api/jira.ts       # Backend API istemcisi
        ├── context/          # JiraContext (config state)
        ├── types/jira.ts     # TypeScript arayüzleri
        ├── components/
        │   └── Sidebar.tsx   # Navigasyon menüsü
        └── pages/
            ├── SetupPage.tsx
            ├── DashboardPage.tsx
            ├── BoardsPage.tsx
            ├── BoardDetailPage.tsx
            ├── SprintDetailPage.tsx
            ├── UserSkillsPage.tsx        # Skill kartları
            ├── SkillsManagementPage.tsx  # Yetenek yönetimi
            ├── UserSkillAssignmentPage.tsx
            ├── LeaveCalendarPage.tsx
            └── SprintPlannerPage.tsx     # Akıllı planlayıcı
```

---

## 🛠️ Teknoloji Stack

### Backend
- **Node.js** + **Express 5**
- **Axios** — Jira API çağrıları
- **dotenv** — Ortam değişkenleri
- **JSON dosyası** — Yerel veri deposu (`data.json`)

### Frontend
- **React 19** + **TypeScript**
- **Vite 8** — Build aracı
- **Tailwind CSS v4** — Stil
- **TanStack Query v5** — Sunucu state yönetimi & cache
- **React Router v7** — SPA yönlendirme
- **Lucide React** — İkon seti

---

## ⚙️ Kurulum

### Gereksinimler
- Node.js ≥ 18
- Jira Data Center erişimi + Personal Access Token (PAT)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle (aşağıya bakın)
npm run dev        # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### 3. İlk Kullanım

Tarayıcıda `http://localhost:5173` adresini aç → **Setup** ekranında Jira URL ve Bearer Token gir → Bağlan.

---

## 🔑 Ortam Değişkenleri

**`backend/.env`** dosyasını `.env.example` şablonundan oluşturun:

```env
JIRA_BASE_URL=https://jira.your-company.com
JIRA_API_TOKEN=<Jira Personal Access Token>
PORT=5000
```

| Değişken | Açıklama |
|----------|----------|
| `JIRA_BASE_URL` | Şirket içi Jira Data Center URL'i (trailing slash olmadan) |
| `JIRA_API_TOKEN` | Jira PAT — Jira → Profil → Personal Access Tokens |
| `PORT` | Backend port numarası (varsayılan: 5000) |

> ⚠️ `.env` dosyası `.gitignore`'da tanımlıdır, asla commit etmeyin.

---

## 🔗 Entegre Edilen API'ler

| API | Endpoint Prefix | Kullanım |
|-----|----------------|----------|
| Jira REST API v2 | `/rest/api/2` | Projeler, issue'lar, kullanıcılar, yorumlar |
| Jira Agile API | `/rest/agile/1.0` | Board'lar, sprint'ler, backlog |
| Jira Greenhopper API | `/rest/greenhopper/1.0` | Board filtre ve allData (issue + kullanıcı) |

---

## 🤖 Kullanılan AI Araçları

| Araç | Model | Kullanım |
|------|-------|----------|
| **Cursor IDE** | Claude Sonnet 4.6 | Tüm geliştirme süreci — kod yazımı, refactoring, hata düzeltme |
| **Cursor Agent** | claude-4.6-sonnet | Otonom multi-step görev çözümleme (500+ tur) |

### Cursor Konfigürasyonu
- **`.cursorrules`** — Proje geneli AI yönlendirme kuralları (kök dizinde)
- **`CLAUDE.md`** — Claude'a özel talimatlar ve proje bağlamı
- **`.cursor/skills/jira-hub-overview/SKILL.md`** — Agent skill: proje mimarisi ve API referansı

### AI ile Geliştirilen Özellikler
- Otomatik yetenek tespiti (issue title → skill eşleştirme algoritması)
- Kural tabanlı Türkçe AI değerlendirme metni üretimi (`generateAIInsight`)
- Akıllı sprint planlama algoritması (skor + yük dengeleme heuristiği)
- Tatil takvimi ile kapasite hesabı

---

## 📋 MCP (Model Context Protocol) Sunucuları

Cursor AI Agent, geliştirme sürecinde aşağıdaki MCP sunucularını kullanmıştır:

| MCP Sunucusu | Araçlar | Kullanım |
|-------------|---------|----------|
| **GitLens / GitKraken** (`user-eamodio.gitlens-extension-GitKraken`) | `git_status`, `git_add_or_commit`, `git_push`, `git_pull`, `git_branch`, `git_log_or_diff`, `git_blame`, `pull_request_create`, `issues_create` + 10 daha | Git operasyonları, PR yönetimi, commit geçmişi |
| **Boa Screen Explorer** (`user-boa-screen-explorer`) | `find_screen`, `get_screen_dll`, `list_tools` | Ekran/UI bileşeni arama ve referans alma |

> Tüm MCP araç detayları için → [`docs/mcp-servers.md`](docs/mcp-servers.md)

### Gemini AI (Sprint Planlama Motoru)

Gemini, MCP üzerinden değil doğrudan `@google/generative-ai` SDK ile entegre edilmiştir:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite
```

`POST /api/jira/sprint-plan` endpoint'inde görev atama kararlarını Gemini verir. API erişilemezse heuristik algoritma otomatik devreye girer.

---

## 📸 Ekran Görüntüleri

> Ekran görüntüleri `docs/screenshots/` klasöründe bulunmaktadır.

| Sayfa | Açıklama |
|-------|----------|
| Dashboard | Favori board özeti ve takım bilgileri |
| Skill Kartları | Kullanıcı yetenek profilleri ve AI değerlendirmesi |
| Sprint Planlayıcı | Akıllı görev atama ve kapasite hesabı |
| İzin Takvimi | Yıllık tatil yönetimi |

---

## 🚀 Deploy

> Bu proje şu anda **lokal geliştirme ortamında** çalışmaktadır. Şirket içi Jira Data Center'a doğrudan bağlantı gerektirdiğinden canlıya alınmamıştır.

Canlı ortam için önerilen seçenekler:
- **Backend:** Railway, Render, veya şirket içi sunucu
- **Frontend:** Vercel, Netlify, veya şirket içi CDN
- Canlıya alındığında `JIRA_BASE_URL` ve CORS ayarları güncellenmeli

---

## 📁 Proje Dokümantasyonu

| Dosya | İçerik |
|-------|--------|
| [`docs/architecture.md`](docs/architecture.md) | Detaylı mimari ve veri akışı |
| [`docs/development-phases.md`](docs/development-phases.md) | Geliştirme fazları ve özellik zaman çizelgesi |
| [`docs/api-reference.md`](docs/api-reference.md) | Tüm backend endpoint referansı |
| [`docs/mcp-servers.md`](docs/mcp-servers.md) | MCP sunucuları ve araç listesi |
| [`.cursorrules`](.cursorrules) | Cursor AI yönlendirme kuralları |
| [`CLAUDE.md`](CLAUDE.md) | Claude Agent talimatları |

---

## 👥 Katkıda Bulunanlar

Turkcell Hackathon 2026 — Team Jira Hub
