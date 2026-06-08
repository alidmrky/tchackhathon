# Jira Hub — MCP (Model Context Protocol) Sunucuları

Bu belgede geliştirme sürecinde Cursor AI Agent'ının kullandığı MCP sunucuları ve araçları listelenmektedir.

MCP, AI agent'larının harici araçlara, veritabanlarına ve servislere standart bir protokol üzerinden erişmesini sağlar. Cursor bu sunucuları geliştirme sırasında otomatik olarak kullanır.

---

## Aktif MCP Sunucuları

| Sunucu Adı | Kimlik | Amaç |
|-----------|--------|------|
| GitLens / GitKraken | `user-eamodio.gitlens-extension-GitKraken` | Git operasyonları, PR yönetimi, branch görselleştirme |
| Boa Screen Explorer | `user-boa-screen-explorer` | Ekran/UI içeriği arama ve analiz |

---

## 1. GitLens / GitKraken MCP

**Kimlik:** `user-eamodio.gitlens-extension-GitKraken`

Git iş akışlarını ve pull request yönetimini AI agent üzerinden otomatikleştirir.

### Araçlar

#### Git Operasyonları

| Araç | Açıklama |
|------|----------|
| `git_status` | Çalışma ağacı durumunu göster (`git status`) |
| `git_add_or_commit` | Dosyaları stage'e al veya commit oluştur |
| `git_push` | Değişiklikleri uzak repoya gönder |
| `git_pull` | Uzak repodan değişiklikleri çek |
| `git_fetch` | Uzak repodaki bilgileri güncelle |
| `git_checkout` | Branch değiştir veya dosya geri yükle |
| `git_branch` | Branch listele, oluştur veya sil |
| `git_log_or_diff` | Commit geçmişini veya diff'i görüntüle |
| `git_blame` | Satır bazında kimin yazdığını göster |
| `git_stash` | Değişiklikleri stash'e al veya geri yükle |
| `git_worktree` | Worktree yönetimi |
| `git_graph` | Görsel commit grafiği |

#### Pull Request Yönetimi

| Araç | Açıklama |
|------|----------|
| `pull_request_create` | Yeni PR oluştur |
| `pull_request_get_detail` | PR detaylarını getir |
| `pull_request_get_comments` | PR yorumlarını listele |
| `pull_request_create_review` | PR incelemesi oluştur |
| `pull_request_assigned_to_me` | Bana atanan PR'ları listele |

#### Issue Yönetimi

| Araç | Açıklama |
|------|----------|
| `issues_create` | Yeni issue oluştur |
| `issues_get_detail` | Issue detaylarını getir |
| `issues_assigned_to_me` | Bana atanan issue'ları listele |
| `issues_add_comment` | Issue'ya yorum ekle |

#### GitLens & GitKraken Özel Araçlar

| Araç | Açıklama |
|------|----------|
| `gitlens_launchpad` | GitLens launchpad panelini aç |
| `gitlens_start_work` | Yeni iş akışı başlat (branch oluştur + checkout) |
| `gitlens_start_review` | Kod incelemesi başlat |
| `gitlens_commit_composer` | Commit mesajı oluşturucu |
| `gitkraken_workspace_list` | GitKraken workspace listesini getir |
| `repository_get_file_content` | Repodaki bir dosyanın içeriğini oku |

#### Kaynaklar (Resources)

| Kaynak | Açıklama |
|--------|----------|
| `Git_Status` | Anlık git durumu |
| `Git_Graph` | Commit grafiği görünümü |

---

## 2. Boa Screen Explorer MCP

**Kimlik:** `user-boa-screen-explorer`

Ekran ve UI bileşenlerini veritabanında arayıp analiz eder. Geliştirme sırasında mevcut ekran tasarımlarını bulmak ve referans almak için kullanılmıştır.

### Araçlar

| Araç | Açıklama |
|------|----------|
| `find_screen` | Ekran adına göre DB'de arama yapar, eşleşen ekranları listeler. Parametre: `screenName` (ör. "ADK Müşteri") |
| `get_screen_dll` | Belirli bir ekranın DLL/bileşen bilgisini getirir |
| `list_tools` | Mevcut tüm araçları listeler |
| `ping` | Sunucu bağlantı testi |

---

## Geliştirme Sürecindeki Kullanım

### GitLens MCP Kullanım Senaryoları
- Geliştirme boyunca commit geçmişinin takibi
- Branch oluşturma ve yönetimi
- Kod değişikliklerinin diff görünümü ile incelenmesi

### Screen Explorer MCP Kullanım Senaryoları  
- Yeni sayfaların tasarımında mevcut UI referanslarının bulunması
- Ekran bileşenlerinin tutarlılığının kontrol edilmesi

---

## MCP Yapılandırması

MCP sunucuları Cursor IDE tarafından otomatik olarak yönetilir. Proje düzeyinde yapılandırma `.cursor/` klasöründe saklanır.

Kendi MCP sunucunuzu eklemek için [Cursor MCP dokümantasyonuna](https://docs.cursor.com/context/model-context-protocol) başvurun.

---

## Gemini AI (Harici API — MCP Değil)

Sprint planlama motoru olarak kullanılan Gemini, MCP protokolü üzerinden değil, doğrudan REST API çağrısıyla (`@google/generative-ai` SDK) entegre edilmiştir.

| Parametre | Değer |
|-----------|-------|
| Model | `gemini-2.5-flash-lite` |
| SDK | `@google/generative-ai` (npm) |
| Kullanım | `POST /api/jira/sprint-plan` endpoint'inde görev atama |
| Env değişkeni | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Fallback | Gemini başarısız olursa heuristik algoritma devreye girer |
