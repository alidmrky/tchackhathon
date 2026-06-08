# Jira Hub — Backend API Referansı

**Base URL:** `http://localhost:5000/api/jira`

Tüm isteklerde Jira kimlik bilgilerinin header olarak iletilmesi beklenir:
```
X-Jira-Base-Url: https://jira.your-company.com
Authorization: Bearer <jira-pat>
```

---

## Config

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/config/status` | Token yapılandırılmış mı? |
| POST | `/config` | `{ baseUrl, token }` ile config güncelle |

---

## Kullanıcılar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/me` | Aktif Jira kullanıcısı bilgisi |
| GET | `/users/search?query=` | Kullanıcı arama |
| GET | `/users/assignable?project=` | Projeye atanabilir kullanıcılar |
| GET | `/users/roles` | Tüm kullanıcı rolleri (JSON DB) |
| GET | `/users/:userKey/role` | Belirli kullanıcının rolü |
| PUT | `/users/:userKey/role` | Rol ata `{ role: "Analist" \| "Developer" }` |

---

## Board'lar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/boards` | Board listesi (Greenhopper). `?query=`, `?type=`, `?startAt=`, `?maxResults=` |
| GET | `/boards?all=true` | Tüm board'lar (pagination loop) |
| GET | `/boards/:id` | Tek board detayı (Agile API) |
| GET | `/boards/:id/sprints` | Sprint listesi. `?startAt=&maxResults=` |
| GET | `/boards/:id/issues` | Board issue'ları |
| GET | `/boards/:id/allData` | Greenhopper allData (issue+kullanıcı+statü) |
| GET | `/boards/:id/skills` | Board kullanıcı skill kartları |
| POST | `/boards/:id/auto-assign-skills` | Otomatik yetenek tara & ata. Body: `{ userKey? }` |

---

## Sprint'ler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/sprints/:sprintId/issues` | Sprint issue'ları |
| GET | `/boards/:id/allData?activeQuickFilters=` | Kullanıcı bazlı sprint filtresi |

---

## Issue'lar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/issues/:key` | Issue detayı |
| GET | `/issues/:key/comments` | Yorumlar |
| POST | `/issues/:key/comments` | Yorum ekle `{ body }` |
| GET | `/issues/:key/transitions` | Durum geçiş seçenekleri |
| POST | `/issues/:key/transitions` | Durum değiştir `{ transitionId }` |

---

## Projeler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/projects` | Tüm projeler |
| GET | `/projects/:key` | Proje detayı |
| GET | `/projects/:key/statuses` | Proje statüleri |
| GET | `/projects/:key/issues` | Issue listesi (pagination + filtre) |
| GET | `/projects/:key/stats` | To Do / In Progress / Done sayıları |

---

## Arama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/search?jql=` | JQL ile issue arama |

---

## Notlar (JSON DB)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/users/:userKey/notes` | Kullanıcı notları |
| POST | `/users/:userKey/notes` | Not ekle `{ text }` |
| DELETE | `/users/:userKey/notes/:noteId` | Not sil |

---

## Yetenekler (JSON DB)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/skills` | Tüm tanımlı yetenekler |
| POST | `/skills` | Yeni yetenek `{ name, category, description, color }` |
| PUT | `/skills/:id` | Yetenek güncelle |
| DELETE | `/skills/:id` | Yetenek sil |

---

## Tatil Takvimi (JSON DB)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/holidays` | Tüm tatil günleri |
| POST | `/holidays` | Tatil ekle/güncelle `{ date, type, name }` |
| DELETE | `/holidays/:date` | Tatil sil (`date`: YYYY-MM-DD) |
| POST | `/holidays/bulk` | Toplu tatil yükle `{ holidays: [] }` |

**Tatil tipleri:** `resmi` · `sirket` · `izin` · `yarimgun`

---

## Kullanıcı Yetenek Atamaları (JSON DB)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/user-skills` | Tüm kullanıcıların yetenek atamaları |
| GET | `/user-skills/:userKey` | Belirli kullanıcının atamaları |
| POST | `/user-skills/:userKey` | Yetenek ata `{ skillId, skillName, skillCategory, rating, note? }` |
| PUT | `/user-skills/:userKey/:skillId` | Puan/not güncelle `{ rating, note? }` |
| DELETE | `/user-skills/:userKey/:skillId` | Atamayı kaldır |

**Rating:** 1 (Başlangıç) · 2 (Gelişiyor) · 3 (Yetkin) · 4 (İleri Düzey) · 5 (Uzman)

---

## Sprint Planlayıcı

### `POST /sprint-plan`

**Body:**
```json
{
  "boardId": 24446,
  "items": ["Kullanıcı login ekranı tasarımı", "API entegrasyonu", "..."],
  "startDate": "2026-06-10",
  "endDate": "2026-06-24"
}
```

**Response:**
```json
{
  "summary": {
    "startDate": "2026-06-10",
    "endDate": "2026-06-24",
    "totalWorkingDays": 11,
    "totalWorkingHours": 88,
    "holidayCount": 0,
    "userCount": 5,
    "hoursPerPerson": 17,
    "itemCount": 8
  },
  "holidays": [],
  "capacity": [
    {
      "key": "jdoe",
      "displayName": "John Doe",
      "role": "Developer",
      "assignedCount": 3,
      "hoursPerPerson": 17,
      "hoursPerTask": 5.7
    }
  ],
  "assignments": [
    {
      "index": 1,
      "title": "Kullanıcı login ekranı tasarımı",
      "analyst": { "key": "asmith", "displayName": "Alice Smith", "avatarUrl": "..." },
      "developer": { "key": "jdoe", "displayName": "John Doe", "avatarUrl": "..." },
      "analystHours": 8.5,
      "developerHours": 5.7
    }
  ]
}
```

---

## Hata Yanıtları

| HTTP Kodu | Durum |
|-----------|-------|
| 400 | Eksik veya geçersiz parametre |
| 401 | Jira kimlik doğrulama hatası |
| 404 | Kaynak bulunamadı |
| 500 | Sunucu hatası veya Jira erişim sorunu |

```json
{ "error": "Hata açıklaması" }
```
