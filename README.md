# RoomSync Mobile

[![CI](https://github.com/enesilbay/RoomSync/actions/workflows/ci.yml/badge.svg)](https://github.com/enesilbay/RoomSync/actions/workflows/ci.yml)

Telefonu masaya bırak, odak sürenin başladığını telefon anlasın. RoomSync Mobile, telefonun **ivmeölçerini** kullanarak telefonun masada düz durup durmadığını algılar; masadayken odak süren işler, telefonu eline aldığında mola başlar. **Kamera ve mikrofon hiç kullanılmaz.**

> Bu proje, StudyLounge'ın mobil istemcisinden ayrılarak bağımsız olarak geliştirilmektedir. Şimdilik StudyLounge backend'ine bağlanır (`EXPO_PUBLIC_BACKEND_URL`); kendi backend'ine geçiş planlanıyor.

## Teknoloji

- Expo SDK 54 · React Native · TypeScript · Expo Router
- `expo-sensors` (ivmeölçer), Socket.IO istemcisi
- Jest (`jest-expo`) + React Native Testing Library, GitHub Actions

## Proje yapısı

```text
app/                    Yalnızca Expo Router rotaları ve layout'lar
  (tabs)/               Sekmeli ekranlar (giriş, odalar, ben, odak)
src/
  features/focus/       Odak odası: hook'lar, bileşenler, tipler, sabitler
  components/           Paylaşılan UI bileşenleri (+ ErrorBoundary)
  lib/                  API, logger, rütbe, rota parametresi ve yükleme yardımcıları
  theme/                Renk, boşluk, köşe ve tipografi token'ları
  hooks/                Paylaşılan hook'lar
scripts/typegen.js      Typed routes tiplerini dev server açmadan üretir
```

Kurallar: `app/` altına rota olmayan dosya konmaz; renkler yalnızca `src/theme` token'larından okunur (ESLint ham hex değerlerini engeller); log için `console` yerine `src/lib/logger` kullanılır.

## Başlangıç

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:3000
npx expo start
```

Telefon ve bilgisayar aynı ağda olmalı; `192.168.x.x` yerine bilgisayarının yerel IP adresini yaz.

## Komutlar

| Komut | Açıklama |
| :--- | :--- |
| `npm run typecheck` | Typed routes tiplerini üretir (`typegen`) ve TypeScript tip kontrolü yapar |
| `npm run typegen` | `.expo/types/router.d.ts` dosyasını dev server açmadan üretir |
| `npm run lint` | ESLint |
| `npm run lint:strict` | ESLint, uyarılara da izin vermez (`--max-warnings 0`) |
| `npm test` | Jest testleri |
| `npm run test:ci` | Jest, CI modunda ve coverage raporuyla |

CI her push'ta ve `main`'e açılan PR'larda typecheck, `lint:strict`, `test:ci` ve `expo-doctor` çalıştırır.

## Yol haritası

Fazlara bölünmüş, yapılış sırasına göre dizilmiş plan: [ROADMAP.md](ROADMAP.md)

## Yeni proje olarak ilk yapılacaklar

- [ ] `eas init` ile yeni Expo/EAS projesi oluştur (`app.json` içindeki `extra.eas.projectId` bilerek kaldırıldı)
- [ ] `eas.json` içindeki `EXPO_PUBLIC_BACKEND_URL` değerlerini kendi backend adresinle değiştir
- [ ] Uygulama simgesi, splash ve renkleri RoomSync kimliğine göre güncelle
- [ ] Backend kararı: StudyLounge API'sini paylaşmak mı, ayrı backend mi
