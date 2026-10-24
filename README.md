# RoomSync Mobile

Telefonu masaya bırak, odak sürenin başladığını telefon anlasın. RoomSync Mobile, telefonun **ivmeölçerini** kullanarak telefonun masada düz durup durmadığını algılar; masadayken odak süren işler, telefonu eline aldığında mola başlar. **Kamera ve mikrofon hiç kullanılmaz.**

> Bu proje, StudyLounge'ın mobil istemcisinden ayrılarak bağımsız olarak geliştirilmektedir. Şimdilik StudyLounge backend'ine bağlanır (`EXPO_PUBLIC_BACKEND_URL`); kendi backend'ine geçiş planlanıyor.

## Teknoloji

- Expo SDK 54 · React Native · TypeScript · Expo Router
- `expo-sensors` (ivmeölçer), Socket.IO istemcisi

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
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run lint` | ESLint |

## Yeni proje olarak ilk yapılacaklar

- [ ] `eas init` ile yeni Expo/EAS projesi oluştur (`app.json` içindeki `extra.eas.projectId` bilerek kaldırıldı)
- [ ] `eas.json` içindeki `EXPO_PUBLIC_BACKEND_URL` değerlerini kendi backend adresinle değiştir
- [ ] Uygulama simgesi, splash ve renkleri RoomSync kimliğine göre güncelle
- [ ] Backend kararı: StudyLounge API'sini paylaşmak mı, ayrı backend mi
