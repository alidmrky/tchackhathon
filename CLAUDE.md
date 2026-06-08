# CLAUDE.md — Jira Hub Proje Talimatları

Bu dosya, Claude AI agent'ının Jira Hub projesi üzerinde çalışırken kullanacağı bağlam ve talimatları içerir.

---

## Proje Özeti

**Jira Hub** — Turkcell Hackathon 2026 projesi.

Şirket içi Jira Data Center kurulumuna bağlanan, aşağıdaki akıllı özellikleri sunan bir web uygulaması:
- Kullanıcı yetenek haritası çıkarma (issue geçmişi analizi)
- Otomatik yetenek atama (keyword eşleştirme)
- Akıllı sprint planlama (rol + yetenek + tatil takvimi ile)
- AI değerlendirme metni üretimi (Türkçe, kural tabanlı)

---

## Teknik Stack

```
backend/   → Node.js, Express 5, Axios, dotenv, JSON DB (data.json)
frontend/  → React 19, TypeScript, Vite 8, Tailwind CSS v4, TanStack Query v5, React Router v7
```

---

## Kritik Notlar

### Jira API Quirks
- **Auth:** `Authorization: Bearer <PAT>` — Basic Auth çalışmaz (Data Center PAT)
- **Greenhopper allData** tek çağrıda hem issue hem kullanıcı (assignee) verisini getirir — tercih edilmeli
- `entityData.statuses`, `entityData.issueTypes` → **obje (dict)**, dizi değil — `Record<string, T>` olarak tiplendir
- `boardData.location.projectKey` sıklıkla `null` gelir — board kullanıcılarını `allData.issuesData.issues[].fields.assignee`'dan çek
- Jira Agile API pagination: `isLast`, `total`, `values` döner; `startAt` ile ilerle

### JSON DB (db.js)
- `data.json` tek dosyada 5 koleksiyon tutar: `userRoles`, `userNotes`, `skills`, `holidays`, `userSkillAssignments`
- Tüm okuma/yazma `db.js` fonksiyonları üzerinden yapılır
- `db.js` fonksiyonları senkron çalışır (`fs.readFileSync` / `fs.writeFileSync`)

### Frontend Dikkat Noktaları
- **Vite 8:** arayüz importları `import type { }` ile yapılmalı (değilse build hatası)
- TanStack Query `queryKey` güncel tutulmalı; invalidation için `queryClient.invalidateQueries()` kullan
- Favori board ID `localStorage`'da `'favoriteBoard'` key'inde saklanır

---

## Otomatik Yetenek Atama Algoritması

`POST /api/jira/boards/:boardId/auto-assign-skills`

```
1. db.getSkills() → tanımlı yetenek kataloğu
2. Jira /board/:boardId/issue → tüm issue'lar (pagination ile)
3. Assignee bazında grupla
4. Her skill için: issue summary'lerde skill.name ara (case-insensitive)
5. Eşleşme sayısına göre rating:
   - 1 eşleşme → 1 yıldız
   - 1-4 → 1, 5-9 → 2, 10-14 → 3, 15-19 → 4, 20+ → 5
6. db.assignSkill() ile upsert
```

---

## Sprint Planlama Algoritması

`POST /api/jira/sprint-plan`

```
Input: boardId, items[], startDate, endDate

1. Çalışma günleri = Pzt-Cum, hafta sonu hariç, tatil hariç
   Yarım gün tatil = 4 saat (tam gün = 8 saat)

2. Kullanıcı profili:
   analystScore = Analiz/BA kategorili skill puanları toplamı + (rol=Analist → +10 bonus)
   devScore = Frontend/Backend/DevOps kategorili skill puanları toplamı + (rol=Developer → +10 bonus)

3. Her görev için:
   - analystPool'dan en yüksek analystScore + en düşük load → analist seç
   - devPool'dan en yüksek devScore + en düşük load → developer seç
   - Seçilen kullanıcıların load++ 

4. Saat hesabı:
   perPersonHours = totalWorkingHours / userCount (yuvarlak)
   analystHours = perPersonHours / analystLoad (o analistin toplam iş sayısı)
   developerHours = perPersonHours / developerLoad
```

---

## generateAIInsight() Yapısı

`backend/services/jiraService.js` → `generateAIInsight(user)`

Türkçe kural tabanlı değerlendirme. Değerlendirilen metrikler:
1. Toplam / tamamlanan issue oranı → performans yorumu
2. `issueTypes` dağılımı → birincil uzmanlık tespiti
3. `multiSprintIssues` varlığı → karmaşık/büyük iş uyarısı
4. `role` uyumu → birincil iş tipi ile rol örtüşüyor mu?

**Kural:** Her kullanıcı için farklı paragraflar seçilir; kalıp tekrarından kaçınılır.

---

## Dosya Değişikliği İş Akışı

Yeni özellik eklerken sıra:
1. `backend/db.js` → koleksiyon + CRUD
2. `backend/routes/jira.js` → endpoint
3. `backend/services/jiraService.js` → servis fonksiyonu (Jira çağrısı varsa)
4. `frontend/src/api/jira.ts` → API metodu
5. `frontend/src/types/jira.ts` → TypeScript arayüzü
6. `frontend/src/pages/YeniSayfa.tsx` → UI
7. `frontend/src/App.tsx` → route
8. `frontend/src/components/Sidebar.tsx` → navItem

---

## Sık Yapılan Hatalar ve Çözümleri

| Hata | Çözüm |
|------|-------|
| Port 5000 meşgul | `Get-NetTCPConnection -LocalPort 5000 \| Stop-Process` |
| `boardData.location.projectKey` null | allData issuesData'dan assignee çek |
| entityData.statuses.find is not a function | Dict olarak kullan: `entityData.statuses[id]` |
| Vite build hatası (interface import) | `import type { }` kullan |
| data.json bozuldu | `DEFAULT` objesiyle sıfırla ve db.js'i yeniden çalıştır |
