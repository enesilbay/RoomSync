# RoomSync Mobile

[![CI](https://github.com/enesilbay/RoomSync/actions/workflows/ci.yml/badge.svg)](https://github.com/enesilbay/RoomSync/actions/workflows/ci.yml)

Telefonu masaya bırak, odak sürenin başladığını telefon anlasın. RoomSync Mobile, telefonun **ivmeölçerini** kullanarak telefonun masada düz durup durmadığını algılar; masadayken odak süren işler, telefonu eline aldığında mola başlar. **Kamera ve mikrofon hiç kullanılmaz.**

> Bu proje, StudyLounge'ın mobil istemcisinden ayrılarak bağımsız olarak geliştirilmektedir. Şimdilik StudyLounge backend'ine bağlanır (`EXPO_PUBLIC_BACKEND_URL`); kendi backend'ine geçiş planlanıyor.

## Nasıl çalışır

1. **Odak** sekmesinde süreni seç ve **Başlat**'a bas (hesap gerekmez).
2. Telefonu masaya bırak: birkaç saniye düz ve sabit kalınca sayaç başlar.
   - **Esnek mod:** ekran yukarı ya da aşağı bakabilir; yukarı bakarsa siyah zeminde sade bir sayaç görünür.
   - **Sıkı mod:** yalnızca ekranı aşağı bakan telefon sayılır; ekran kararır.
3. Telefonu kaldırınca sayaç durur. 8 saniyeden kısa bakışlar mola sayılmaz; daha uzunsa mola başlar, 5 dakikayı geçince uyarılırsın.
4. Süre dolunca titreşim ve zil çalar; özet kartında odak süresi, kaldırma sayısı ve **odak kalitesi** görünür. Oturum cihazına kaydedilir.

Algılama yalnızca uygulama açıkken çalışır (iOS arka planda sensör okumaya izin vermez); bu yüzden oturum boyunca ekran açık tutulur.

## Teknoloji

- Expo SDK 58 · React Native 0.88 (yalnızca New Architecture) · React 19.3 · TypeScript 6 · Expo Router 58 (react-navigation'a bağlı değil)
- `expo-sensors` (ivmeölçer), `expo-audio`, `expo-sqlite`, `expo-haptics`, Socket.IO istemcisi
- Jest (`jest-expo`) + React Native Testing Library, GitHub Actions

## Proje yapısı

```text
app/                    Yalnızca Expo Router rotaları ve layout'lar
  (tabs)/               Sekmeli ekranlar (giriş, odalar, ben, odak)
src/
  features/focus/       Odak: solo ve oda ekranları, ortak akış (useFocusFlow), bileşenler
    engine/             Masa algılayıcı ve oturum durum makinesi (saf, testli)
  features/sessions/    Cihazdaki oturum geçmişi (expo-sqlite; web'de AsyncStorage)
  components/           Paylaşılan UI bileşenleri (+ ErrorBoundary)
  lib/                  API, logger, rütbe, rota parametresi ve yükleme yardımcıları
  theme/                Renk, boşluk, köşe ve tipografi token'ları
  hooks/                Paylaşılan hook'lar
scripts/typegen.js      Typed routes tiplerini dev server açmadan üretir
scripts/audio/          Ortam seslerini ve bitiş zilini yeniden üreten ffmpeg script'i
```

Kurallar: `app/` altına rota olmayan dosya konmaz; renkler yalnızca `src/theme` token'larından okunur (ESLint ham hex değerlerini engeller); log için `console` yerine `src/lib/logger` kullanılır.

## Başlangıç

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:3000
npx expo start
```

Telefon ve bilgisayar aynı ağda olmalı; `192.168.x.x` yerine bilgisayarının yerel IP adresini yaz.

`.env` içinde `EXPO_PUBLIC_USE_RN_FETCH=1` de bulunmalı (`.env.example`'da var; EAS profillerinde `eas.json` ayarlıyor): SDK 56+ varsayılan `expo/fetch`, dosya yüklemelerindeki `{ uri }` FormData parçalarını desteklemiyor.

> **SDK 58 yükseltmesi sonrası:** native modüllerin tamamı değişti; SDK 54 ile kurulmuş development build (dev client) bu sürümle çalışmaz. Yeni bir dev client build et (`npx expo run:android` / `npx expo run:ios` veya EAS) ve cihaza yeniden kur. Expo Go yalnızca güncel SDK'yı destekler; push bildirimleri için zaten dev client gerekir.

## Komutlar

| Komut | Açıklama |
| :--- | :--- |
| `npm run typecheck` | Typed routes tiplerini üretir (`typegen`) ve TypeScript tip kontrolü yapar |
| `npm run typegen` | `.expo/types/router.d.ts` dosyasını dev server açmadan üretir |
| `npm run lint` | ESLint |
| `npm run lint:strict` | ESLint, uyarılara da izin vermez (`--max-warnings 0`) |
| `npm test` | Jest testleri |
| `npm run test:ci` | Jest, CI modunda ve coverage raporuyla |
| `npm run deps:check` | Paketlerin Expo SDK sürümüyle uyumunu denetler |
| `npm run deps:fix` | Uyumsuz paketleri SDK'nın beklediği sürüme çeker |

CI her push'ta ve `main`'e açılan PR'larda typecheck, `lint:strict`, `test:ci` ve `expo-doctor` çalıştırır.

### Bağımlılık güncellemeleri

Expo SDK'ya bağlı paketler (`expo`, `expo-*`, `react`, `react-native` ve native modüller, `jest-expo`, `@react-native/jest-preset`, `eslint-config-expo`, `typescript` vb.) birbirine kilitli sürümlerle gelir; tek tek yükseltilmez. Yalnızca SDK yükseltmesiyle birlikte güncellenir:

```bash
npx expo install expo@^<SDK>   # örn. expo@^58
npm run deps:fix
```

Dependabot bu paketleri yok sayar; yalnızca SDK'dan bağımsız paketlerin minor/patch güncellemelerini tek bir PR'da önerir.

## Yol haritası

Fazlara bölünmüş, yapılış sırasına göre dizilmiş plan: [ROADMAP.md](ROADMAP.md)

## Yeni proje olarak ilk yapılacaklar

- [ ] `eas init` ile yeni Expo/EAS projesi oluştur (`app.json` içindeki `extra.eas.projectId` bilerek kaldırıldı)
- [ ] `eas.json` içindeki `EXPO_PUBLIC_BACKEND_URL` değerlerini kendi backend adresinle değiştir
- [ ] Uygulama simgesi, splash ve renkleri RoomSync kimliğine göre güncelle
- [ ] Backend kararı: StudyLounge API'sini paylaşmak mı, ayrı backend mi
