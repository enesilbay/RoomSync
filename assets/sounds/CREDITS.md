# Ortam sesleri: kaynaklar ve işleme notları

Uygulamadaki tüm ortam sesleri `src/features/focus/constants.ts` içinden `require()` ile yüklenir ve `expo-audio` ile döngüde (`loop = true`) çalınır.

## Dosyalar

| Dosya | Süre | Biçim | Boyut | Kaynak / lisans |
| --- | --- | --- | --- | --- |
| `rain.m4a` | 3:30,00 | AAC-LC mono, 64 kbps, 44,1 kHz (.m4a) | 1,74 MB | ⚠️ Kaynak/lisans doğrulanmalı — mağaza yayını öncesi zorunlu |
| `nature.m4a` | 4:00,00 | AAC-LC mono, 64 kbps, 44,1 kHz (.m4a) | 1,98 MB | ⚠️ Kaynak/lisans doğrulanmalı — mağaza yayını öncesi zorunlu |
| `library.m4a` | 3:57,01 | AAC-LC mono, 64 kbps, 44,1 kHz (.m4a) | 1,97 MB | ⚠️ Kaynak/lisans doğrulanmalı — mağaza yayını öncesi zorunlu |
| `fire.m4a` | 1:11,01 | AAC-LC mono, 64 kbps, 44,1 kHz (.m4a) | 0,60 MB | ⚠️ Kaynak/lisans doğrulanmalı — mağaza yayını öncesi zorunlu |
| `deep-focus.m4a` | 1:30,00 | AAC-LC mono, 64 kbps, 44,1 kHz (.m4a) | 0,74 MB | Proje içinde ffmpeg ile üretildi; lisans kısıtı yok |

**Toplam:** 7,02 MB. Önceki MP3'ler toplam 50,86 MB idi.

## Orijinal kayıtlar

İlk dört kaydın nereden geldiği bilinmiyor. Mağaza yayınından önce her biri için kaynak ve lisans bulunmalı. Bulunamazsa ses, lisansı belli bir kayıtla (ör. CC0) değiştirilmeli.

| Dosya | Orijinal | Kullanılan bölüm |
| --- | --- | --- |
| `rain` | `rain.mp3`: 12:45, MP3 stereo 48 kHz 256 kbps, 24,48 MB | 395–609. sn |
| `nature` | `nature.mp3`: 9:53, MP3 stereo 44,1 kHz 256 kbps, 18,98 MB | 10–254. sn (sondaki yüksek ses olayı dışarıda) |
| `library` | `library.mp3`: 4:03, MP3 stereo 24 kHz 160 kbps, 4,86 MB | 0,5–241,5. sn (kaynak 24 kHz: içerik ~12 kHz'de biter) |
| `fire` | `fire.mp3`: 1:20, MP3 stereo 48 kHz 256 kbps, 2,55 MB | 0,5–74,5. sn |

## İşleme

Kullanılan araç: ffmpeg 6.1.1 (`ffmpeg-static`). Projeye kurulmadı, geçici bir klasörden çalıştırıldı. Ses seviyeleri değiştirilmedi.

Tüm dosyalar `scripts/audio/encode-sounds.sh` ile tekrar üretilebilir (çıktı byte düzeyinde aynıdır). Orijinal MP3'ler depodan silindi; script'in başındaki açıklamada git geçmişinden nasıl alınacağı yazıyor.

Her ses için şu adımlar uygulandı:

1. **Mono ve 44,1 kHz'e çevirme.** Stereo kanallar ortalanarak mono yapıldı, örnekleme hızı 44,1 kHz'e çevrildi.
2. **Bölüm seçme.** Seviyesi dengeli, `L + X` uzunlukta bir bölüm `A` örnek hassasiyetinde kesildi. `L` döngü süresidir; `1024`'ün katına yuvarlandı, yani tam sayıda AAC çerçevesidir. `X` çapraz geçiş süresidir (`fire` için 3 sn, diğerleri için 4 sn).
3. **Dikişsiz döngü.** `acrossfade` (`c1=qsin:c2=qsin`, eşit güç) kullanıldı:
   - Gövde `A[X, X+L]` aralığıdır, baş `A[0, X]` aralığıdır.
   - Çıkış `A[X..L]` ile `xfade(A[L..L+X] → A[0..X])` birleşimidir.
   - Dosya `A[X-1]` örneğiyle biter ve `A[X]` örneğiyle başlar. Dalga biçimi kesintisizdir, dikişte tık yoktur.
4. **Kodlama.** `-c:a aac -b:a 64k -ar 44100 -ac 1 -movflags +faststart` ayarlarıyla kodlandı ve metaveriler silindi (`-map_metadata -1`).

**Doğrulama:** Kodlanmış dosya çözüldü ve son örnekten ilk örneğe geçişteki sıçrama ölçüldü. Her dosyada bu sıçrama, dosyanın kendi içindeki örnekten örneğe farkların %99'luk diliminin altında kaldı.

### Neden AAC (.m4a)?

- **AAC'nin baş ve son dolgusu dikişi bozmuyor.** ffmpeg, AAC'nin baştaki 1024 örneklik ön dolgusunu MP4 düzenleme listesine (`elst`) yazar. AVFoundation (iOS) ve ExoPlayer (Android) bu listeye uyar. Döngü uzunluğu tam sayıda AAC çerçevesi olduğundan sonda da dolgu kalmaz.
- **MP3 dikişte boşluk bırakabilir.** MP3'te kodlayıcı gecikmesi ve son dolgu ancak LAME/Xing başlığıyla atlanabilir. Bu başlığa platformlar tutarlı biçimde uymuyor, bu yüzden döngüde kısa bir boşluk kalabilir.
- **Aynı bit hızında AAC daha temiz.** 64 kbps'te AAC mono, MP3 mono'dan daha temiz sonuç verir.

## Derin Odak (`deep-focus.m4a`)

Proje içinde üretilmiş kahverengi gürültüdür. Telif ve lisans kısıtı yoktur. Üretimde kullanılan ayarlar:

- **Kaynak:** `anoisesrc=color=brown:sample_rate=44100:amplitude=1:seed=42`. Sabit tohum kullanıldığı için tekrar üretilebilir.
- **Filtreler:** `highpass=f=40` ses dışı uğultuyu, `lowpass=f=1500` sert tizleri keser. Ardından `volume=0.05` uygulandı. Sonuç yaklaşık −43 LUFS'tur ve diğer seslerle (−37…−50 LUFS) aynı aralıktadır.
- **Döngü:** Yukarıdaki dikişsiz döngü yöntemi kullanıldı (90 sn döngü, 4 sn çapraz geçiş).
