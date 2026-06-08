---
name: jira-hub-overview
description: >-
  Jira Hub projesinin özeti, mimarisi, API endpoint'leri, frontend sayfaları ve
  kurulum bilgilerini içerir. Proje hakkında soru sorulduğunda, yeni özellik
  eklenirken veya mevcut yapıya uyum sağlarken kullan.
---

# Jira Hub — Proje Skill Dosyası

## Proje Özeti

Jira Hub, şirket içi Jira Data Center kurulumuna bağlanan bir web uygulamasıdır.
Kullanıcılar Jira URL ve Bearer Token ile kimlik doğrular; projeler, board'lar,
sprint'ler ve issue'ları modern bir arayüzden görüntüleyebilir.

**Hedef Jira:** `https://jira.turkcell.com.tr` (Data Center, REST API v2)

---

## Teknoloji Stack

### Backend
| Katman | Teknoloji |
|--------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| HTTP Client | Axios |
| Auth | Bearer Token (`Authorization: Bearer <token>`) |
| Config | dotenv (`.env`) |

### Frontend
| Katman | Teknoloji |
|--------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 8 |
| Stil | Tailwind CSS v4 (`@tailwindcss/vite`) |
| State/Cache | TanStack Query v5 |
| Routing | React Router v6 |
| İkonlar | Lucide React |

---

## Mimari

```
hackhathon/
├── backend/               # Express API sunucusu
│   ├── index.js           # Sunucu giriş noktası (port 5000)
│   ├── routes/
│   │   └── jira.js        # /api/jira/* route tanımları
│   ├── services/
│   │   └── jiraService.js # Jira REST API çağrıları
│   └── .env               # JIRA_BASE_URL, JIRA_API_TOKEN, PORT
│
└── frontend/              # React + Vite uygulaması
    └── src/
        ├── api/jira.ts        # Axios client + endpoint fonksiyonları
        ├── context/JiraContext.tsx  # Config state (localStorage)
        ├── types/jira.ts      # TypeScript interface tanımları
        ├── pages/
        │   ├── SetupPage.tsx       # Bağlantı kurulum formu
        │   ├── ProjectsPage.tsx    # Proje listesi
        │   ├── ProjectDetailPage.tsx # Proje detayı + issue listesi
        │   ├── BoardsPage.tsx      # Board listesi + arama
        │   ├── BoardDetailPage.tsx # Sprint listesi + issue'lar
        │   └── SearchPage.tsx      # JQL arama
        └── components/
            └── Sidebar.tsx         # Navigasyon menüsü
```

---

## Ortam Değişkenleri

**`backend/.env`**
```
JIRA_BASE_URL=https://jira.turkcell.com.tr
JIRA_API_TOKEN=<bearer-token>
PORT=5000
```

> ⚠️ `.env` `.gitignore`'da. Sadece `.env.example` commit edilir.

---

## Backend API Endpoint'leri

Base URL: `http://localhost:5000/api/jira`

### Config
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/config/status` | Token yapılandırılmış mı? |
| POST | `/config` | `{ baseUrl, token }` ile config güncelle |

### Kullanıcı
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/me` | Aktif kullanıcı bilgisi |
| GET | `/users/search?query=` | Kullanıcı arama |
| GET | `/users/assignable?project=` | Projeye atanabilir kullanıcılar |

### Projeler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/projects` | Tüm projeler (max 50) |
| GET | `/projects/:key` | Proje detayı |
| GET | `/projects/:key/statuses` | Proje statüleri |
| GET | `/projects/:key/issues` | Issue listesi (pagination + filtre) |
| GET | `/projects/:key/stats` | To Do / In Progress / Done sayıları |

### Issue'lar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/issues/:key` | Issue detayı |
| GET | `/issues/:key/comments` | Yorumlar |
| POST | `/issues/:key/comments` | Yorum ekle `{ body }` |
| GET | `/issues/:key/transitions` | Geçiş seçenekleri |
| POST | `/issues/:key/transitions` | Durum değiştir `{ transitionId }` |

### Board'lar & Sprint'ler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/boards` | Board listesi — `?name=`, `?type=scrum\|kanban`, `?startAt=`, `?maxResults=` |
| GET | `/boards?all=true` | Tüm board'ları tek seferde çek (pagination loop) |
| GET | `/boards/:id/sprints` | Sprint listesi `?startAt=&maxResults=` |
| GET | `/boards/:id/issues` | Board issue'ları |

### Arama
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/search?jql=` | JQL ile issue arama |

---

## Frontend Sayfaları

| Sayfa | Route | Açıklama |
|-------|-------|----------|
| SetupPage | `/setup` | Jira URL + token formu; config localStorage'a kaydedilir |
| ProjectsPage | `/projects` | Kart grid, proje tipi badge, lider bilgisi |
| ProjectDetailPage | `/projects/:key` | İstatistik kartları, issue tablosu, durum/tip filtresi, pagination |
| BoardsPage | `/boards` | Tablo görünüm, isim araması (debounce 400ms), tip filtresi (Scrum/Kanban), pagination |
| BoardDetailPage | `/boards/:boardId` | Sprint accordion — açılınca issue'lar yüklenir, her ikisi de paginated |
| SearchPage | `/search` | JQL input + preset sorgular, sonuç tablosu |

---

## Önemli Kurallar

- **Auth:** Basic Auth değil, **Bearer Token** — Jira Data Center PAT
- **API versiyonu:** `/rest/api/2` (Data Center). Cloud için `/rest/api/3`
- **CORS:** Tüm `localhost:*` portlarına dinamik olarak izin verilir
- **Type import:** Vite 8'de `interface` importları `import type { }` ile yapılmalı
- **Trailing slash:** `JIRA_BASE_URL` her zaman `.replace(/\/$/, '')` ile temizlenir
- **Pagination:** Jira Agile API `isLast`, `total`, `values` döner; `startAt` ile ilerle

---

## Kurulum ve Çalıştırma

```bash
# Backend
cd backend
npm install
# .env dosyasını doldur
node index.js          # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev -- --port 5173   # http://localhost:5173
```

Tarayıcıda `http://localhost:5173` aç → Setup ekranında Jira URL ve token gir → Bağlan.
