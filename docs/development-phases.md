# Jira Hub — Geliştirme Fazları

Bu belgede Jira Hub projesinin Hackathon sürecindeki geliştirme yolculuğu, faz faz özetlenmiştir.

---

## Faz 1 — Temel Altyapı & Jira Bağlantısı

**Hedef:** Jira Data Center'a bağlanabilen çalışan bir prototip.

### Geliştirilenler
- Express.js backend proxy kurulumu
- Jira REST API v2 entegrasyonu (Bearer Token auth)
- React + Vite + TypeScript frontend scaffolding
- Tailwind CSS v4 + Lucide React kurulumu
- `SetupPage` — Jira URL + token formu, `localStorage` persist
- `JiraContext` — uygulama geneli config state
- `BoardsPage` — Greenhopper API ile board listesi, isim arama (debounce), tip filtresi

### Teknik Kararlar
- Jira'nın CORS kısıtlaması nedeniyle **backend proxy zorunlulugu** belirlendi
- Jira Data Center'da **Basic Auth yerine Bearer Token (PAT)** kullanımı tespit edildi
- Greenhopper API'nin (`/rest/greenhopper/1.0`) daha zengin board verisi sunduğu keşfedildi

---

## Faz 2 — Board & Sprint Görüntüleme

**Hedef:** Board içeriğini ve sprint'leri görüntülemek.

### Geliştirilenler
- `BoardDetailPage` — Sprint accordion, issue listesi
- `SprintDetailPage` — Sprint başına issue tablosu, durum/tip/öncelik gösterimi
- Kullanıcı bazlı filtreleme (Greenhopper `activeQuickFilters`)
- Sol panel: sprint listesi | Sağ panel: kullanıcılar (allData'dan distinct çıkarım)
- `allData.entityData` yapısının object (dict) olduğu tespit edildi, frontend tipler güncellendi

### Performans
- Issue detayları için tekil API çağrısı yavaşlığı tespit edildi
- Greenhopper `allData` tek endpoint ile tüm sprint verisini getirdiği için tercih edildi
- `getBoardAllData` fonksiyonu yeniden kullanılabilir servis olarak çıkartıldı

---

## Faz 3 — Skill Kartları & AI Değerlendirme

**Hedef:** Kullanıcıların Jira geçmişine göre yetenek profili oluşturma.

### Geliştirilenler
- `UserSkillsPage` — Kullanıcı başına skill kart görünümü
- `getBoardUserSkills` servisi — Tüm sprint issue'larını toplayıp kullanıcı bazında gruplar
- **Çok-sprintli issue tespiti** — Aynı issue key birden fazla sprintte görünüyorsa işaretlenir
- **Deduplication** — Issue key'e göre benzersizleştirme, aynı başlıkların tekrarlanması önlendi
- `generateAIInsight()` — Kural tabanlı Türkçe değerlendirme metni:
  - İş tipi dağılımı analizi
  - Tamamlama oranı yorumu
  - Çok-sprintli iş uyarısı
  - Kullanıcıya özel not alanı
- Yorum ekleme (manuel notlar) — `userNotes` koleksiyonu

---

## Faz 4 — JSON Veritabanı & Kullanıcı Rolleri

**Hedef:** Kalıcı veri deposu ve kullanıcı rolü yönetimi.

### Geliştirilenler
- `backend/db.js` — JSON dosya tabanlı veritabanı modülü (`data.json`)
- `userRoles` koleksiyonu — Analist / Developer rol ataması
- Board Detail'e kullanıcı bazlı rol atama UI'ı (dropdown)
- Skill Kartları'na rol bilgisi eklendi
- `generateAIInsight()` rol-uyum analizi eklendi:
  - Rol ile iş tipi uyuşuyor mu?
  - Uyuşmuyorsa çapraz yetenek uyarısı

---

## Faz 5 — Dashboard & Sayfa Yeniden Yapılandırma

**Hedef:** Daha kullanışlı bir uygulama navigasyonu.

### Geliştirilenler
- `/projects` sayfası kaldırıldı → **`DashboardPage`** olarak köke (`/`) taşındı
- Dashboard özellikleri:
  - `localStorage`'da favori board saklama
  - Favori board bilgileri, aktif sprint özeti
  - Takım üyeleri listesi (rol badge'leri ile)
  - Sprint'e hızlı erişim linkleri
- `/search` sayfası kaldırıldı → **`SkillsManagementPage`** (`/skills`) eklendi:
  - Yetenek kataloğu: isim, kategori, renk, açıklama
  - `skills` koleksiyonu db.js'de
  - Kategori bazlı gruplama ve renk badge'leri

---

## Faz 6 — İzin Takvimi

**Hedef:** Tatil günlerini kayıt altına almak, sprint kapasitesini doğru hesaplamak.

### Geliştirilenler
- `LeaveCalendarPage` — 12 aylık görsel takvim
- Tatil tipleri: Resmi Tatil, Şirket Tatili, İzin Günü, Yarım Gün
- Hafta sonu günleri otomatik devre dışı (seçilemiyor)
- **Bulk Import** butonu — 2026 Türkiye resmi tatilleri + şirket özel günleri toplu yükleme
- `holidays` koleksiyonu db.js'de

---

## Faz 7 — Otomatik Yetenek Atama

**Hedef:** Manuel yerine AI destekli yetenek tespiti.

### Geliştirilenler
- `UserSkillAssignmentPage` — Kullanıcı-yetenek eşleştirme paneli
- **`POST /boards/:boardId/auto-assign-skills`** endpoint:
  - Tüm board issue title'larında tanımlı yetenek isimlerini arar (case-insensitive)
  - Eşleşme sayısına göre puan (1–5 yıldız): 1 eşleşme=1, 5=2, 10=3, 15=4, 20+=5
  - `db.assignSkill()` ile upsert
- `UserSkillsPage`'e "Yetenekleri Otomatik Tara" butonu eklendi
- `assignedSkills` alanı skill kartlarında gösterildi (kategori + yıldız puanı)

---

## Faz 8 — Akıllı Sprint Planlayıcı

**Hedef:** Excel'den görev listesi alıp akıllıca analist+developer atayan bir planlama botu.

### Geliştirilenler
- `SprintPlannerPage` — Sprint adı, tarihler, multiline görev alanı
- **`POST /sprint-plan`** endpoint:
  1. Sprint tarih aralığında çalışma günlerini hesapla (Pzt-Cum, tatil hariç, yarım gün=4s)
  2. Board kullanıcılarını Jira'dan çek
  3. Her kullanıcı için `analystScore` + `devScore` hesapla (yetenek puanları + rol bonusu)
  4. Görev başına en uygun analist ve developer seç (skor + yük dengeleme)
  5. Kişi başı ve **iş başı saat** hesapla
- Çıktı ekranı:
  - Sprint özet kartları (toplam saat, tatil sayısı, takım büyüklüğü)
  - Sprint dönemindeki tatil listesi
  - Kapasite dağılımı (kişi başı saat + iş başı süre)
  - Görev tablosu: analist + developer + her biri için saat badge'i

---

## Özet Zaman Çizelgesi

| Faz | Süre (tahmini) | Kapsam |
|-----|---------------|--------|
| 1 | 2 saat | Altyapı, bağlantı, board listesi |
| 2 | 3 saat | Board & sprint detay görünümleri |
| 3 | 4 saat | Skill kartları, AI değerlendirme, notlar |
| 4 | 2 saat | JSON DB, kullanıcı rolleri |
| 5 | 3 saat | Dashboard, sayfa yeniden yapılandırma, Yetenek Yönetimi |
| 6 | 2 saat | İzin takvimi |
| 7 | 3 saat | Otomatik yetenek atama |
| 8 | 4 saat | Akıllı sprint planlayıcı |
| **Toplam** | **~23 saat** | **8 faz, 10+ sayfa** |
