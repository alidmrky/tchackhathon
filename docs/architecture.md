# Jira Hub — Mimari Belgesi

## Genel Bakış

Jira Hub, klasik **istemci-sunucu** mimarisini benimser. Frontend, şirket içi Jira'ya doğrudan erişemez (CORS); bu nedenle tüm Jira API çağrıları Express.js tabanlı bir **Backend Proxy** üzerinden gerçekleştirilir. Ek olarak uygulama, kullanıcı rollerini, yetenek tanımlarını, tatil takvimini ve yetenek atamalarını saklamak için **JSON tabanlı yerel bir veritabanı** kullanır.

---

## Katmanlar ve Sorumluluklar

```
┌────────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                           │
│  React 19 + TypeScript + Vite 8 + Tailwind CSS v4             │
│  TanStack Query v5  ←→  React Router v7                       │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTP (localhost:5000)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND PROXY (Express 5)                   │
│  routes/jira.js   services/jiraService.js   db.js             │
│  ┌─────────────┐  ┌──────────────────────┐  ┌─────────────┐  │
│  │ API Rotaları │  │  Jira Service Layer  │  │   db.js     │  │
│  │ /api/jira/* │  │  - REST API v2       │  │ data.json   │  │
│  │             │  │  - Agile API         │  │ (roles,     │  │
│  │             │  │  - Greenhopper API   │  │  skills,    │  │
│  └─────────────┘  └──────────────────────┘  │  holidays,  │  │
│                                              │  userSkills)│  │
│                                              └─────────────┘  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTPS + Bearer Token
                               ▼
┌────────────────────────────────────────────────────────────────┐
│               JIRA DATA CENTER                                 │
│  /rest/api/2        — Projeler, issue'lar, kullanıcılar       │
│  /rest/agile/1.0    — Board, sprint, backlog                  │
│  /rest/greenhopper  — allData (issue+kullanıcı karmaşık)      │
└────────────────────────────────────────────────────────────────┘
```

---

## Veri Akışı

### 1. Kimlik Doğrulama
```
Kullanıcı → SetupPage → JiraContext (localStorage)
                                    ↓
                        { baseUrl, token } → her API isteğinde header olarak gönderilir
```

### 2. Tipik Sayfa Yükü
```
React Page → useQuery(jiraApi.fn) → axios POST/GET /api/jira/* 
           → Backend routes/jira.js → jiraService.fn() 
           → Jira REST/Agile API → response → normalize → frontend
```

### 3. Yerel Veri (JSON DB)
```
Kullanıcı eylemi (rol atama, yetenek ekleme vb.)
       ↓
Frontend → PUT/POST /api/jira/users/:key/role
       ↓
routes/jira.js → db.setRole(userKey, role)
       ↓
db.js → data.json dosyasına yazar (fs.writeFileSync)
       ↓
Sonraki GET isteğinde → db.getRole(userKey) → data.json okur
```

---

## Modül Detayları

### Backend: `db.js`

JSON tabanlı basit bir kalıcı veri deposu. Beş koleksiyonu yönetir:

| Koleksiyon | Tip | Açıklama |
|-----------|-----|----------|
| `userRoles` | `{ [userKey]: { role } }` | Kullanıcı rolleri (Analist/Developer) |
| `userNotes` | `{ [userKey]: Note[] }` | Kullanıcıya özel notlar |
| `skills` | `Skill[]` | Tanımlı yetenek kataloğu |
| `holidays` | `Holiday[]` | Tatil günleri (tip + tarih) |
| `userSkillAssignments` | `{ [userKey]: Assignment[] }` | Kullanıcı-yetenek eşleştirmeleri |

Her koleksiyon için CRUD fonksiyonları `module.exports` ile dışa aktarılır.

### Backend: `services/jiraService.js`

Jira API ile konuşan servis katmanı. Ana sorumluluklar:

- **`getAgileClient()`** — Axios instance (Bearer Token + baseUrl)
- **`getBoardAllData(boardId)`** — Greenhopper allData endpoint'i
- **`getBoardUserSkills(boardId)`** — Tüm sprint issue'larını toplar, kullanıcı başına:
  - Issue sayısı, tamamlanan, çok-sprintli
  - `db.js`'den rol ve yetenek atamaları
  - `generateAIInsight()` ile AI değerlendirmesi
- **`generateAIInsight(user)`** — Kural tabanlı Türkçe metin üretir. İş tipi dağılımı, tamamlama oranı, çok-sprintli iş varlığı ve rol uyumunu değerlendirir.

### Backend: `routes/jira.js`

Tüm HTTP endpoint'lerini tanımlar. Öne çıkan endpoint'ler:

- **`POST /boards/:boardId/auto-assign-skills`** — Issue title'larında tanımlı yetenek isimlerini arar, eşleşme sayısına göre 1-5 yıldız puan atar, `db.assignSkill()` ile kaydeder.
- **`POST /sprint-plan`** — Akıllı sprint planlama:
  1. Tatil takviminden çalışma günlerini hesaplar
  2. Kullanıcı profillerini (rol + yetenek puanı) oluşturur
  3. Her görev için en uygun analist + developer seçer (skor + yük dengesi)
  4. Kişi başı ve iş başı saat hesaplar

### Frontend: `api/jira.ts`

Backend için tek tip Axios istemcisi. Tüm API fonksiyonları burada tanımlanır. Kimlik bilgileri `JiraContext`'ten headers olarak eklenir.

### Frontend: `pages/`

| Sayfa | Veri Kaynağı | Temel Bileşenler |
|-------|-------------|-----------------|
| DashboardPage | boards, allData, sprints | FavoriBoard seçici, sprint özeti, takım listesi |
| BoardDetailPage | board, allData, sprints, userRoles | Sprint accordion, kullanıcı paneli |
| SprintDetailPage | allData (greenhopper) | Issue tablosu, durum/tip filtre |
| UserSkillsPage | getBoardUserSkills | Skill kartı, AI insight, yetenek puanları |
| SkillsManagementPage | skills CRUD | Form, kategori grid |
| UserSkillAssignmentPage | board users, skills, userSkillAssignments | İki panel, oto-tara |
| LeaveCalendarPage | holidays CRUD | 12 aylık takvim, bulk import |
| SprintPlannerPage | sprint-plan endpoint | Input form, görev tablosu, kapasite kartları |

---

## Güvenlik Notları

- Jira PAT yalnızca backend `.env` dosyasında saklanır; frontend'e asla açılmaz.
- Frontend `localStorage`'a yalnızca kullanıcının kendi girdiği Jira URL ve token kaydedilir (Setup ekranı üzerinden).
- `data.json` versiyona alınmamalıdır — içinde kullanıcı verisi olabilir.

---

## Ölçeklendirme Önerileri

| Mevcut Çözüm | Üretim için Öneri |
|-------------|-------------------|
| `data.json` JSON dosyası | PostgreSQL / MongoDB |
| Express 5 tek süreç | PM2 cluster modu veya container |
| In-memory Axios cache yok | Redis önbellek katmanı |
| Hardcoded CORS `localhost:*` | Ortama göre yapılandırılmış CORS listesi |
