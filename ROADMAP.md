# RoomSync Mobile — Yol Haritası

Kaynak: 2026-10-28 tarihli çok-agent kod incelemesi (hatalar, güvenlik/build, arayüz, ürün).

**Fazlar yapılış sırasına göredir.** Bir faz "Bitti tanımı" karşılanmadan sonrakine geçilmez; faz içindeki maddeler de öncelik sırasındadır.

**Hedefler**

- Arayüzün tüm kategorileri **≥ 9/10** (ölçütler: [Ek A](#ek-a--arayüz-hedefleri-9-10-ölçütleri))
- Tüm kritik, yüksek ve orta seviye hatalar kapalı
- App Store ve Google Play yönergelerine uyumlu **v1.0**
- Çalışan özellikler dahil her ekran ve akış yeniden ele alınmış ([Ek C](#ek-c--çalışan-özelliklerin-yeniden-ele-alınması))

**Etiketler**

| Etiket | Anlamı |
| :--- | :--- |
| 🔴 / 🟠 / 🟡 / ⚪ | Kritik / yüksek / orta / düşük önem |
| `[BE]` | Backend değişikliği gerekir |
| `[DC]` | Development build gerekir (Expo Go yetmez) |
| `[N]` | Native kod / Expo Module gerekir |

---

## Faz 0 — Zemin: temizlik ve altyapı

Neden önce: sonraki her iş bu yapının üzerine kurulacak. Dosya taşımaları sonraya kalırsa her fazda çakışma çıkar.

### Yapı

- [ ] 🟠 `app/components`, `app/config`, `app/utils` klasörlerini `src/components`, `src/lib`, `src/theme` altına taşı. `export default Dummy` geçici çözümlerini sil; `app/` altında yalnızca rota dosyaları kalsın.
- [ ] ⚪ Tema renk sabiti `C`'yi `app/(tabs)/sensor.tsx:27`'den çıkar. Tüm ekranlar renkleri `src/theme`'den alsın (şu an her ekran 1200 satırlık sensör modülünü yüklüyor).
- [ ] `sensor.tsx`'i (1207 satır) `src/features/focus/` altında parçalara böl: detector, timer, sounds, room socket, chat drawer, mixer, modallar.

### Temizlik

- [ ] Expo şablon kalıntılarını sil:
  - `components/` (8 dosya), `constants/theme.ts`, `hooks/use-theme-color.ts`
  - `scripts/reset-project.js` ve `reset-project` npm script'i
  - `app/modal.tsx` ve kök layout'taki `Stack.Screen name="modal"`
  - `react-logo*.png`, `partial-react-logo.png`, `android-icon-background.png`, `logo-dark.png`, `logo-light.png`
- [ ] Kullanılmayan paketleri kaldır: `expo-blur`, `expo-symbols`, `@react-navigation/material-top-tabs`, `react-native-pager-view`. `expo-image` kullanılacaksa kalsın, kullanılmayacaksa kaldır. `expo-haptics` kalsın (Faz 4'te kullanılacak).
- [ ] Ölü kodu temizle:
  - `pomAnim` (`sensor.tsx:161`)
  - `handleLogout` (`lobbies.tsx:274`)
  - `setCardNumber` (`premium.tsx:26`)
  - Kullanılmayan stiller
- [ ] `npx expo install expo expo-constants` (expo-doctor sürüm uyarıları).
- [ ] `package-lock.json` içindeki ad değişikliğini (`mobile` → `roomsync-mobile`) commit et.
- [ ] `app.json`'u 2 boşluk girintiyle yeniden biçimlendir. Sürümü `0.2.0` yap.

### Kalite araçları

- [ ] ESLint ayarları:
  - `react-hooks/exhaustive-deps` kuralını aç.
  - Kullanılmayan değişken istisnalarını kaldır.
  - `src/theme` dışında ham hex renk değerini yasakla.
- [ ] Typed routes: `.expo/types`'ı üret ve tüm `router.push(... as any)` cast'lerini kaldır.
- [ ] `jest-expo` ve `@testing-library/react-native` kur.
- [ ] GitHub Actions: typecheck, lint, test, `expo-doctor`, `npm audit`.
- [ ] `__DEV__` ile koşullanan bir logger yaz; production'da `console.log` çıkmasın.
- [ ] `app/_layout.tsx`'ten `ErrorBoundary` export et.

**Bitti tanımı:** `app/` altında yalnızca rotalar var, lint kuralları açık ve 0 uyarı veriyor, CI yeşil.

---

## Faz 1 — Çekirdek odak döngüsü

Neden ikinci: Ürünün varlık sebebi bu döngü ve şu an hatalı. Sonraki tasarım işleri de doğru çalışan bir durum makinesi üzerine kurulmalı.

### Algılama

- [ ] 🟠 `useDeskDetector` hook'u:
  - `Accelerometer.setUpdateInterval(200)` ve low-pass filtre
  - Giriş ve çıkış için ayrı eşikler (histerezis)
  - Masaya oturma için 2 sn kararlılık
  - Kaldırınca 5–10 sn "göz atma toleransı"
  - Sabitlik kontrolü: |a| varyans penceresi (elde düz tutulan telefon sayılmasın)
  - Başta `isAvailableAsync` kontrolü
  - Yalnızca odak istendiğinde dinlesin (pil)
- [ ] 🟡 Yüz yukarı / yüzüstü: z işaretini platforma göre normalize et, **iOS ve Android'de cihazda doğrula**. `DeviceMotion` gravity vektörünü alternatif olarak değerlendir.
- [ ] Detector durum makinesi için birim testleri (sahte örnek serileriyle).

### Zamanlayıcı ve durum makinesi

- [ ] 🟠 Tek bir reducer ile odak durum makinesi: `idle → waiting → focusing ⇄ break → completed`. Tek bir başlat kontrolü olsun; play butonu ve süre modalı da aynı akıştan geçsin.
  - Bu, sayaç donma hatasını giderir (`sensor.tsx:403-427`): `focusRequested` ayarlanmıyor.
- [ ] 🟡 Kalan süre bitiş zaman damgasından (`Date.now()`) hesaplansın. State updater içindeki yan etkiler (`sensor.tsx:393`) effect'e taşınsın.
- [ ] 🟡 Gerçek mola fazı ekle:
  - Telefon kaldırılınca mola sayacı yukarı saysın.
  - Mola uzayınca uyarı versin (süre ayarlanabilir).
- [ ] Bitiş anı:
  - Titreşim, ses ve yerel bildirim
  - Özet kartı: süre, kaldırma sayısı, odak kalitesi %
- [ ] 🟡 Parlaklık yarışı:
  - Her `await` sonrası iptal kontrolü yapılsın.
  - Android'de `restoreSystemBrightnessAsync` kullanılsın.
  - Ekran hiçbir durumda 0 parlaklıkta kalmasın.
- [ ] Odak modları (ayardan seçilsin):
  - Sıkı mod: telefon yüzüstü, ekran tam karartılır.
  - Esnek mod: telefon yüzü yukarı, OLED-siyah zemin üstünde minimal sayaç.

### Ses

- [ ] 🟡 `expo-av` → `expo-audio` (SDK 55'te `expo-av` kaldırılıyor).
- [ ] 🟡 Ses yükleme yarışı:
  - Her yükleme kendi haritasını kullansın.
  - Yükleme bitince oynatma senkronlansın.
  - `setAudioModeAsync` ile iOS sessiz anahtar politikası ayarlansın.
- [ ] Telefon bırakılınca ses yumuşakça açılsın, kaldırılınca yumuşakça kısılsın.
- [ ] Ses dosyalarını mono AAC/Opus 64 kbps'e sıkıştır (~50 MB → ~5 MB). `deep_focus` için gerçek bir dosya bul ya da seçeneği kaldır. Ses lisanslarını ve kaynaklarını belgele.

### Solo ve çevrimdışı

- [ ] **Solo mod:** hesap ve oda gerektirmeyen varsayılan "Odak" sekmesi.
- [ ] **Yerel oturum geçmişi** (`expo-sqlite`):
  - Kayıt alanları: başlangıç, bitiş, odak sn, mola sn, kaldırma sayısı.
  - Çevrimdışı çalışsın.
  - "Bugün" kartı bu geçmişten beslensin.
- [ ] Pil: 1 saatten uzun oturumlarda şarj önerisi (`expo-battery`).

**Bitti tanımı:**

- Hesapsız ve internetsiz tam bir odak → mola → bitiş döngüsü çalışıyor.
- Detector testleri yeşil.
- iOS ve Android'de fiziksel cihaz testi yapıldı.

---

## Faz 2 — Veri, oturum ve ağ katmanı

### Oturum

- [ ] 🟠 `AuthProvider`: kullanıcı bilgisi rota parametresinden değil store'dan okunsun.
  - Tüm `Number(params.id)` kullanımlarını kaldır: `sensor.tsx:737`, `lobbies.tsx:121`, `profile.tsx:43,137,177`.
  - Parametrelerde yalnızca id taşınsın. E-posta dahil kullanıcı nesnesi URL'ye girmesin.
- [ ] 🟠 Token `expo-secure-store`'a taşınsın. Açılışta `/users/me` ile doğrulansın; `user_data`'ya körü körüne güvenilmesin (`index.tsx:107-115`).
- [ ] Tek bir `logout()` fonksiyonu:
  - Token ve `user_data` silinsin.
  - Push token backend'den silinsin `[BE]`.
  - Tüm soketler kapansın.

### API istemcisi

- [ ] 🟡 Tek bir fetch sarmalayıcısı:
  - `AbortController` ile 10–15 sn zaman aşımı
  - `res.ok` kontrolü ve JSON olmayan yanıtlara karşı koruma
  - Token yoksa `Bearer null` gönderilmesin
  - 401 gelirse oturum kapansın
- [ ] 🟡 Backend URL:
  - LAN yedeği yalnızca `__DEV__` modunda kullanılsın.
  - Release build'de adres https değilse açık bir hata versin.
  - Boş string de yedeği tetiklesin (`??` yerine `||`).
  - Sondaki `/` kırpılsın.
  - `.env` portu ile yedek port aynı olsun.

### Soket

- [ ] 🟠 Tek bir `SocketProvider` kur. Şu an üç ayrı soket açılıyor (global, oda, DM).
  - Girişte bağlansın, çıkışta kapansın. Global soketin yalnızca açılışta kurulma hatası böylece giderilir.
  - Oda ve DM aynı bağlantıyı kullansın.
  - `connect_error` gelince çevrimdışı bandı görünsün.
  - Yeniden bağlanınca mevcut presence tekrar gönderilsin.
  - Listener'lar `.off` ile kaldırılsın.
  - Güncel userId ref'ten okunsun.
  - Async kurulum, ekran kapandıktan sonra soket açmasın (sızıntı).
- [ ] 🟡 Dürtmenin iki kez gösterilmesi (Alert + toast) düzeltilsin.
- [ ] Push:
  - Kayıt girişten sonra yapılsın (Faz 3'teki projectId ile).
  - İzin onboarding'de doğru anda istensin.
  - Kullanıcı reddederse `alert` gösterilmesin.

### Veri hataları

- [ ] 🟡 "Bugün" kartı gerçekten bugünün dakikasını göstersin (`me.tsx:317`). Kaynak: yerel geçmiş ya da backend'de günlük alan `[BE]`.
- [ ] Seri değeri her yerde aynı yedekle gelsin (`?? 1` ile `?? 0` tutarsız, `me.tsx:295/318`).
- [ ] 🟡 Liderlik: ya gerçek haftalık veri gelsin `[BE]` ya da etiket "Tüm zamanlar" olsun. Sekme değişiminde eski yanıtın yenisinin üstüne yazılması engellensin.
- [ ] 🟡 Analitik:
  - Tarihler yerel saat diliminde hesaplansın (`analytics.tsx:64`).
  - Tüm metrikler aynı dönemi kapsasın.
- [ ] Girişte `score` doğru taşınsın; sensör ekranı skora 0'dan başlamasın.
- [ ] Sohbet:
  - Geçmiş yüklenirken `res.ok` kontrol edilsin.
  - Canlı mesaj ile geçmiş mesaj aynı biçime normalize edilsin.
  - Liste anahtarı index değil id olsun.
- [ ] Atmosfer paylaşımında gelen ses anahtarları doğrulansın.
- [ ] Profil kaydetme tek bir atomik istekle yapılsın `[BE]`. Ad değiştirmek için şifre istenmesin.
- [ ] Okunmamış DM'e dokununca doğrudan o konuşma açılsın (`me.tsx:534`).
- [ ] Mağazada satın alma sonrası `user_data` güncellensin.
- [ ] Mağaza ve Ben ekranında `/users/me` hata verirse sonsuz spinner ya da boş ekran yerine hata durumu gösterilsin.

**Bitti tanımı:**

- Hiçbir ekran kullanıcı bilgisini rota parametresinden okumuyor.
- Tek soket bağlantısı var.
- Backend kapalıyken her ekran anlamlı bir hata durumu gösteriyor.

---

## Faz 3 — Güvenlik ve mağaza uyumu

Backend kararı ilk madde, çünkü diğer maddelerin çoğu ona bağlı.

- [ ] 🔴 **Backend kararı.** İki seçenek var:
  - StudyLounge API'si resmi olarak paylaşılır: yazılı anlaşma ve ayrı veritabanı/tenant.
  - Yalın bir RoomSync API'si kurulur.

  Karara göre `eas.json` URL'leri güncellenir ve gizlilik politikasında gerçek veri işleyen taraf yazılır.
- [ ] 🔴 **İzinler:**
  - `android.permissions` kaldırılsın.
  - `blockedPermissions` listesine eklensin: `RECORD_AUDIO`, `CAMERA`, `ACTIVITY_RECOGNITION`, `WRITE_SETTINGS`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `MODIFY_AUDIO_SETTINGS`.
  - `expo-image-picker`: `cameraPermission:false`, `microphonePermission:false`, Türkçe `photosPermission` metni.
  - `expo-audio`: `microphonePermission:false`.
  - `expo-sensors`: Türkçe `motionPermission` metni (Pedometer kullanılmıyorsa `false`).
  - Sonuç `npx expo config --type introspect` ile doğrulansın.
- [ ] 🔴 **Premium:**
  - Sahte Stripe ekranı ve `/users/demo/upgrade` uç noktası kaldırılsın `[BE]`.
  - IAP için RevenueCat (`react-native-purchases`) kullanılsın `[DC]`.
  - Makbuz sunucuda doğrulansın ve webhook kurulsun `[BE]`.
  - Premium durumu yalnızca sunucuda tutulsun.
  - "Satın alımları geri yükle" eklensin.
  - Abonelik koşulları ve iptal bilgisi ekranda görünsün.
- [ ] 🟠 **Sunucu tarafında yetki kontrolü** `[BE]`:
  - Mağaza fiyatı sunucuda belirlensin (`shop.tsx:100`).
  - Sohbette isim ve premium durumu JWT'den alınsın.
  - `join_lobby` şifre, üyelik, kapasite ve Elite kontrolü yapsın. Şu an deep link ile şifre atlanabiliyor.
  - `maxUsers` istemciden kabul edilmesin.
  - `update_presence` için hız sınırı konsun.
- [ ] 🟠 Sohbetteki dosya URL'leri yalnızca kendi upload host'umuzdan kabul edilsin; kontrol hem istemcide hem sunucuda olsun (`sensor.tsx:1001`, `api.ts:33`).
- [ ] 🟠 iOS:
  - `bundleIdentifier: com.enesilbay.roomsync`
  - `eas init` (projectId)
  - `supportsTablet:false` ya da `requireFullScreen:true`
  - `ITSAppUsesNonExemptEncryption:false`
- [ ] `expo-notifications` plugin'i eklensin (Android ikon ve renk). Push uçtan uca test edilsin.
- [ ] `eas.json`'a `development` profili ve `submit` yapılandırması eklensin.
- [ ] Hassas log'lar kaldırılsın: push token log'a yazılmasın, ham sunucu hata gövdeleri kullanıcıya gösterilmesin.
- [ ] **Gizlilik:**
  - Gizlilik politikası URL'si
  - Uygulama içi hesap silme `[BE]`
  - Google Play için veri silme bağlantısı
  - iOS privacy manifest (AsyncStorage/UserDefaults "required reason")
  - App Privacy ve Data Safety formları
- [ ] Kayıt formunda e-posta formatı ve şifre kuralları hem istemcide hem sunucuda kontrol edilsin.

**Bitti tanımı:**

- İzin listesi yalnızca gerçekten kullanılan izinleri içeriyor.
- Ödeme IAP ile yapılıyor ve sunucuda doğrulanıyor.
- İstemciden gelen hiçbir fiyat, yetki ya da kimlik alanına güvenilmiyor.

---

## Faz 4 — Tasarım sistemi

Neden ekranlardan önce: Ekranlar bu token'lar ve bileşenlerle yeniden kurulacak. Aksi halde her ekran yine kendi stilini icat eder.

- [ ] **Marka:**
  - RoomSync logosu ve wordmark
  - Köşeleri görsele gömülü olmayan, tam kenarlı 1024 px ikon
  - Şeffaf adaptive foreground (safe zone içinde)
  - Gerçek bir monokrom glif (şu an Expo "A" logosu)
  - Splash glifi ve favicon (şu an StudyLounge'ın)
  - Tüm StudyLounge kalıntıları silinsin.
- [ ] **Renk token'ları:**
  - Açık ve koyu tema ayrı tanımlansın.
  - Amber yalnızca dolgu ve ikonda kullanılsın; metin için `accentText` (≥ 4.5:1).
  - Rütbe renklerinin okunaklı metin varyantları olsun.
  - Mağaza baloncuk renklerinin hepsi AA kontrastını geçsin.
- [ ] **Karanlık mod:**
  - `useColorScheme` ve token'larla gerçek bir koyu tema.
  - Navigasyon teması token'lardan türesin.
  - StatusBar temaya göre değişsin.
- [ ] **Tipografi:**
  - Tek font ailesi `expo-font` ile gerçekten yüklensin; olmazsa sistem fontu kalsın ve Montserrat referansları silinsin.
  - En fazla 6 boyut ve 3 kalınlık (600/700/800) kullanılsın.
  - `maxFontSizeMultiplier` ayarlansın; sabit yükseklik yerine `minHeight` kullanılsın.
- [ ] **Boşluk ve köşe yuvarlaklığı:** token'lar tanımlansın, ham değerler lint ile engellensin.
- [ ] **Bileşen kiti:**

  | Bileşen | Gereksinimler |
  | :--- | :--- |
  | `Button` | primary/secondary/ghost/destructive; pressed, disabled ve loading durumları |
  | `IconButton` | ≥ 44pt; erişilebilirlik etiketi zorunlu prop |
  | `TextField` | Etiket, hata metni, autofill, şifre göster |
  | `Sheet` | ScrollView + KeyboardAvoiding; arka plana dokununca kapanır |
  | `Toast` | Bilgi amaçlı `Alert.alert` kullanımlarının yerine |
  | Diğerleri | `Card`, `EmptyState`, `ErrorState` (retry ile), `Skeleton`, `Chip`, `SegmentedControl`, `Avatar` (`toLocaleUpperCase('tr-TR')`) |
- [ ] **İkonlar:**
  - Aktif/pasif çiftleri olan tek bir ikon seti kullanılsın.
  - Emoji'ler ikon olarak kullanılmasın (⚔️ 👋 🟢 ⚫ 📚 ✨ 🔥).
- [ ] **Haptics:** odak başlangıcı, duraklatma, bitiş ve sekme geçişinde titreşim.
- [ ] **Hareket:** "reduce motion" ayarına uyulsun.
- [ ] **Erişilebilirlik temeli:**
  - Tüm etkileşimli öğelerde label, role ve state tanımlı olsun.
  - Durum değişimleri `announceForAccessibility` ile duyurulsun.
  - Durum yalnızca renkle anlatılmasın.
- [ ] Görsel kontrol için yalnızca `__DEV__`'de açılan bir bileşen galerisi ekranı.

**Bitti tanımı:**

- Tüm renk, boşluk ve tipografi değerleri token'lardan geliyor.
- Bileşen kiti açık ve koyu temada galeride doğrulandı.

---

## Faz 5 — Ekranların yeniden tasarımı ve metin

Sıra: önce navigasyon ve çekirdek ekran, sonra diğerleri.

- [ ] 🟠 **Navigasyon ve bilgi mimarisi:**
  - Kök `Stack`'te `headerShown:false` olsun; çift başlık sorunu böylece çözülür (`app/_layout.tsx:17`).
  - Giriş ekranı sekmelerden çıkıp ayrı bir `(auth)` grubuna taşınsın.
  - Sekmeler: **Odak · Odalar · İstatistik · Ben**.
  - Odak oturumu tam ekran olsun: sekme çubuğu gizlensin, karartma katmanı en üstte kalsın.
  - Sekme çubuğu `insets.bottom` kullansın; elle verilen 100/110/115 padding'ler yerine `useBottomTabBarHeight`.
  - Ayarlara tek bir giriş noktası olsun.
- [ ] **Odak ekranı:**
  - Yaklaşık 240 px'lik büyük sayaç halkası.
  - Üç net durum: "Telefonu masaya bırak" / "Odaklanıyorsun" / "Mola".
  - Süre seçimi sayacın altında bir çip olsun.
  - Arkadaşlar ve odadakiler alt sayfaya taşınsın.
  - Toast ScrollView dışında gösterilsin.
  - Bitişte özet ekranı.
  - Metinler mantıkla uyumlu olsun ("ters çevirip" çelişkisi giderilsin).
- [ ] **Oda içi:**
  - "4/5 telefon masada" gösteren varlık halkası.
  - Düello butonu ≥ 44pt.
  - Sohbet çekmecesi güvenli alana uysun.
  - Odadakiler ve sohbet için boş durumlar.
- [ ] **Giriş / kayıt:**
  - Wordmark.
  - Etiketli alanlar, autofill (`email`, `password`, `oneTimeCode`), şifre göster.
  - Giriş/kayıt geçişi tek bir kontrolden yapılsın.
  - Şifre sıfırlama sırasında Giriş/Kayıt sekmeleri gizlensin.
  - "Şifremi unuttum" bağlantısı yeterli kontrastta olsun.
  - Öne çıkanlar ana mekaniği anlatsın.
- [ ] **Onboarding:** mekaniğin anlatımı → kalibrasyon → bildirim izni (doğru anda).
- [ ] **Odalar:**
  - İskelet yükleme ve retry'lı hata durumu.
  - Arama boş dönünce ayrı bir "Sonuç bulunamadı" durumu.
  - Ücretsiz kullanıcı temel oda kurabilsin; kilitli butondan açıklamasız paywall'a yönlendirme olmasın.
  - Oda kurma sayfası klavyeyle uyumlu olsun.
  - Switch düğmesi rengi düzeltilsin.
  - Başlık bloğu kısaltılsın.
- [ ] **Ben:**
  - Doğru veriler gösterilsin; tekrarlanan jeton ve seri kaldırılsın.
  - Başlık ikonları ≥ 44pt olsun.
  - Her sekme odağında tam ekran spinner yerine arka planda yenileme.
  - Hata durumu eklensin.
  - "Tümü →" doğru ekrana gitsin.
- [ ] **Profil:**
  - "Profil düzenle" ile "Güvenlik/şifre" ayrı bölümler olsun.
  - Çıkış kendi satırında dursun.
  - Sheet klavyeyle uyumlu olsun.
- [ ] **İstatistik:**
  - Temel görünüm ücretsiz olsun.
  - Metrikler: kaldırma sayısı, odak kalitesi, en uzun kesintisiz süre.
  - Veri yokken sahte grafik gösterilmesin.
  - Gün adları tutarlı olsun; grafik ekrana göre ölçeklensin.
- [ ] **Liderlik:**
  - Hata durumuna retry eklensin.
  - Kontrast düzeltilsin.
  - PRO rozeti bileşen olsun.
- [ ] **DM:**
  - `react-native-keyboard-controller` ile düzen.
  - Çok satırlı giriş, `returnKeyType="send"`, `blurOnSubmit={false}`.
  - Gönderiliyor/başarısız durumları.
  - Boş durum ve varlık göstergesi.
- [ ] **Mağaza:**
  - Tek bir para birimi adı; "Kullan / Kullanılıyor" ifadeleri.
  - Hata durumu.
  - Ses paketleri bölümü eklensin ya da paketler kaldırılsın.
  - Emoji yerine vektör ikonlar.
- [ ] **Premium** (IAP'den sonra):
  - Test arayüzü kaldırılsın.
  - Fiyatlar mağazadan gelen yerel biçimde gösterilsin (`399,99 ₺`).
  - Plan seçimi radyo butonuyla olsun.
  - Fayda listesi doğru olsun ("animasyonlu çerçeve" iddiası kaldırılsın).
  - Tek katman adı: "RoomSync PRO".
- [ ] **Metin geçişi:**
  - Tüm Türkçe karakterler düzeltilsin: `profile.tsx` (~39 metin), `analytics.tsx:148`, `lobbies.tsx:85`.
  - Her yerde "sen" diye hitap edilsin.
  - Sözlük: "Oda" (Lobi değil); "Odak Puanı" ile "Jeton" ayrı kavramlar; "RoomSync PRO".
  - İngilizce kalıntılar temizlensin: ONLINE, Shop, Lounge, Elite, Coin, Modal.
  - "Keşfet sekmesi" referansları kaldırılsın.
  - Örnek kullanıcı adları nötr olsun (`enes_123` değil).
- [ ] Başarı bildirimleri `Toast` ile verilsin; `Alert` yalnızca yıkıcı işlemleri onaylamak için kalsın.

**Bitti tanımı:** [Ek A](#ek-a--arayüz-hedefleri-9-10-ölçütleri)'daki tüm ölçütler her ekranda sağlanıyor.

---

## Faz 6 — Ürün özellikleri (v0.3)

- [ ] **Kalibrasyon:** Referans yerçekimi vektörü kaydedilsin ve telefonun duruşu bu vektörle arasındaki açıya göre değerlendirilsin. Eğik masa, telefon standı ve kılıf durumlarında doğru çalışsın.
- [ ] Pomodoro döngüleri (4×25 + uzun mola), özel süre, günlük hedef, seri ekranı.
- [ ] Rütbe ve seri sistemi yeni metriklerle (odak kalitesi) yeniden dengelensin.
- [ ] **Grup odası:**
  - Sunucuyla senkron ortak sayaç `[BE]`.
  - "Herkes masada" kuralı: biri telefonunu kaldırırsa oda serisi kırılır `[BE]`.
  - Düello bahsini kullanıcı seçsin (şu an sabit 50) `[BE]`.
- [ ] Odaktan uzaklaştıran sosyal özellikler feature flag arkasına alınsın: oda sohbeti, DM, kozmetik mağaza, Elite oda, atmosfer paylaşımı, PDF paylaşımı. Kullanım verisine göre geri açılsın.
- [ ] TR/EN dil desteği (`expo-localization` + `i18next`).
- [ ] Android'de ışık sensörüyle yüzüstü doğrulama (lux ≈ 0, hile önleme).
- [ ] Oturum geçmişini CSV olarak dışa aktarma (`expo-file-system` + `expo-sharing`).
- [ ] Çevrimdışı oturumların backend'e senkronu (append-only) `[BE]`.
- [ ] Gizlilik dostu, opt-in kullanım analitiği (Aptabase / TelemetryDeck).

---

## Faz 7 — Yayın (v1.0)

- [ ] Android foreground service ve kilit ekranında kronometreli bildirim `[DC]`. Notifee kullanılabilir; Android 14 için FGS tipi ve Play beyanı gerekir.
- [ ] iOS Live Activity / Dynamic Island `[N]`. Not: iOS'ta arka planda sensör algılama mümkün değil; bu kısıt belgelensin.
- [ ] Sentry `[DC]`; EAS Update kanalları ve `runtimeVersion`.
- [ ] Cihaz matrisi testi:
  - Küçük ekran
  - En büyük yazı boyutu
  - Karanlık mod
  - Android 3 tuşlu navigasyon
  - iOS ve Android
- [ ] Mağaza materyalleri: açık ve koyu tema ekran görüntüleri, TR/EN açıklama, gizlilik formları.
- [ ] README yeniden yazılsın ([Ek B](#ek-b--readme-taslağı)) ve README.en.md eklensin.
- [ ] LICENSE, CHANGELOG, CONTRIBUTING; ses dosyalarının lisans ve kaynak bilgileri.
- [ ] **Son arayüz puanlaması:** Ek A ölçütleriyle yeniden değerlendirme; her kategori ≥ 9 olmalı.

---

## Faz 8 — Sonrası

- [ ] Ana ekran widget'ları: bugünkü dakika, seri, başlat butonu `[DC]/[N]`
- [ ] Android'de Rahatsız Etmeyin entegrasyonu `[N]`. iOS'ta API olmadığı için Focus modu için bir Kısayollar otomasyon rehberi.
- [ ] Apple Health / Health Connect'e "mindful minutes" yazma `[DC]`
- [ ] NFC masa etiketi: masadaki çıkartmaya dokununca odak başlar `[DC]`
- [ ] Siri Shortcuts / App Intents ve Android Quick Settings kutucuğu `[N]`; geçici çözüm olarak `roomsync://` deep link
- [ ] Apple Watch / Wear OS desteği `[N]`

---

## Ek A — Arayüz hedefleri (≥ 9/10 ölçütleri)

| Kategori | Şu an | Hedef | Bitti tanımı |
| :--- | :---: | :---: | :--- |
| Genel görsel tasarım | 5.5 | 9 | Her ekranda tek bir odak noktası var. Odak ekranı uzaktan okunabiliyor. Gereksiz yoğunluk yok. |
| Tema ve renk | 5 | 9 | Tüm metinler WCAG AA'yı geçiyor (≥ 4.5:1, büyük metin ≥ 3:1). Tema dışında ham hex değer yok (lint ile engelli). |
| Tipografi | 4 | 9 | Font gerçekten yükleniyor. En fazla 6 boyut ve 3 kalınlık kullanılıyor. En büyük sistem yazı boyutunda hiçbir metin kesilmiyor. |
| Butonlar ve etkileşim | 4 | 9 | Tüm dokunma hedefleri ≥ 44pt. Basılı ve devre dışı durumlar görünür. Önemli eylemlerde titreşim var. Başarı bildirimi için `Alert` kullanılmıyor. |
| İkonlar ve görseller | 5 | 9 | Tek ikon seti ve tutarlı aktif/pasif çiftleri. Emoji ikon olarak kullanılmıyor. |
| Marka / logo / splash | 3.5 | 9 | Özgün RoomSync logosu ve wordmark var. İkonlar platform kurallarına uygun. StudyLounge veya Expo kalıntısı yok. |
| Türkçe metinler | 4 | 9 | Türkçe karakter hatası yok. Hitap her yerde "sen". Terimler sözlüğe uygun. İngilizce kalıntı yok. TR/EN dil dosyaları var. |
| Navigasyon ve bilgi mimarisi | 3.5 | 9 | Çift başlık yok. Sekme çubuğu yalnızca doğru ekranlarda. Ana özellik ilk sekmede. Ayarlara tek giriş noktası var. |
| Tasarım sistemi tutarlılığı | 4 | 9 | Tüm ekranlar bileşen kitiyle kurulmuş. Spacing, radius ve type token'ları her yerde kullanılıyor. |
| Erişilebilirlik | 2 | 9 | Tüm etkileşimli öğelerin etiketi var. VoiceOver/TalkBack ile tam akış tamamlanabiliyor. Durum değişimleri duyuruluyor. Reduce motion ayarına uyuluyor. |
| Boş / yükleme / hata durumları | 5 | 9 | Her veri ekranında iskelet yükleme, boş durum ve retry'lı hata durumu var. Sonsuz spinner ya da boş ekran yok. |
| Karanlık mod | 1.5 | 9 | Tam koyu tema var. Tüm ekranlar ve bileşenler iki temada da doğrulanmış. Geçişlerde renk flaşı yok. |

## Ek B — README taslağı

1. Kısa tanım, rozetler, GIF (telefon bırakılınca sayaç başlıyor, kaldırılınca mola)
2. Nasıl çalışır: 3 adımlık şema
3. Özellikler (deneysel olanlar işaretli)
4. Ekran görüntüleri (açık/koyu, iOS/Android)
5. Gizlilik: kamera, mikrofon ve konum yok; hangi verinin cihazda kalıp hangisinin sunucuya gittiği
6. Algılama algoritması: eksenler, eşikler, filtre, tolerans süresi, sabitlik kontrolü, kalibrasyon, platform farkları, neden yalnızca ön planda çalıştığı, pil notları
7. Teknoloji yığını
8. Mimari: klasör haritası, veri akışı, REST uç noktaları ve soket olayları tablosu
9. Başlangıç: ön koşullar, Expo Go ile dev client farkı, `.env`, LAN IP ipucu
10. Ortam değişkenleri tablosu (yedek sırası, EAS profillerine göre değerler)
11. Platform bazında izin tablosu ve gerekçeleri
12. Komutlar: typecheck, lint, test
13. EAS ile build ve yayın: `eas init`, preview APK, production, `eas submit`, `eas update`
14. Sorun giderme:
    - Telefon backend'e ulaşamıyor (güvenlik duvarı, LAN IP)
    - Android'de cleartext http engeli
    - Expo Go'da push çalışmıyor
    - Web veya simülatörde sensör yok
    - Ekran kilitlenince sayaç duruyor
15. Yol haritası (bu dosya)
16. Katkı rehberi: Conventional Commits, PR kontrol listesi
17. Lisans ve ses dosyalarının kaynakları

## Ek C — Çalışan özelliklerin yeniden ele alınması

Bugün çalışan özellikler de aşağıdaki fazlarda yeniden ele alınacak:

| Çalışan özellik | Yeniden ele alınacağı yer | Ne değişecek |
| :--- | :--- | :--- |
| Giriş, kayıt, doğrulama, şifre sıfırlama | Faz 2, 3, 5 | SecureStore, açılışta token doğrulama, autofill ve etiketler, `(auth)` grubu |
| Odalar: liste, arama, kategori, şifreli/Elite oda | Faz 3, 5, 6 | Sunucu tarafı yetki, yükleme/hata durumları, ücretsiz oda kurma, grup odası kuralları |
| İvmeölçer aboneliği ve ön plan kontrolü | Faz 1 | `useDeskDetector`: filtre, histerezis, sabitlik, kalibrasyon |
| Ekranı açık tutma (keep-awake) | Faz 1, 7 | Pil uyarısı; Android'de foreground service |
| Yüzüstü karartma | Faz 1 | Yarış hatası, sistem parlaklığına dönüş, sıkı/esnek mod |
| Pomodoro sayacı | Faz 1, 6 | Durum makinesi, zaman damgası, mola fazı, döngüler |
| Ortam sesleri ve mikser | Faz 1, 5 | `expo-audio`, sıkıştırma, yumuşak geçiş, ses paketlerinin akıbeti |
| Oda soketi (sohbet, düello, dürtme, atmosfer) | Faz 2, 3, 6 | Tek soket, URL beyaz listesi, sunucu doğrulaması, feature flag |
| Mağaza (satın al / kullan) | Faz 2, 3, 5 | Sunucuda fiyat, hata durumu, terimler, kontrast |
| Liderlik | Faz 2, 5 | Gerçek haftalık veri, retry, kontrast |
| Analitik | Faz 1, 2, 5 | Yerel geçmiş, saat dilimi, yeni metrikler, ücretsiz görünüm |
| Profil (avatar, ayarlar, çıkış) | Faz 2, 5 | Store'dan kimlik, atomik kaydetme, ayrı güvenlik bölümü |
| DM | Faz 2, 5, 6 | Tek soket, klavye düzeni, durumlar, feature flag |
| Rütbeler (`rank.ts`) | Faz 6 | Odak kalitesiyle yeniden dengeleme |
