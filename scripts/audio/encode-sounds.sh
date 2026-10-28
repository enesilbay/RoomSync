#!/usr/bin/env bash
# Ortam seslerini dikişsiz dönen mono AAC (.m4a) dosyalarına çevirir.
# Ayrıntılar: assets/sounds/CREDITS.md
#
# Kullanım:
#   FFMPEG=/yol/ffmpeg scripts/audio/encode-sounds.sh <orijinal-mp3-klasörü> <çıkış-klasörü>
#
# Orijinal MP3'ler depodan silindi; git geçmişinden alınabilir:
#   git show acbf595:assets/sounds/rain.mp3 > rain.mp3   (nature, library, fire için de aynı)
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Kullanım: FFMPEG=/yol/ffmpeg $0 <orijinal-mp3-klasörü> <çıkış-klasörü>" >&2
  exit 1
fi

FF="${FFMPEG:-ffmpeg}"
SRC="$1"
OUT="$2"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

SR=44100
ENC=(-c:a aac -b:a 64k -ar "$SR" -ac 1 -map_metadata -1 -movflags +faststart)

calc() { awk "BEGIN { printf \"%d\", $1 }"; }

# loop <ad> <kaynak> <başlangıç sn> <döngü sn> <çapraz geçiş sn> [ek filtre]
# Döngü uzunluğu 1024 örneğin (AAC çerçevesi) katına yuvarlanır; böylece son
# çerçevede dolgu kalmaz ve dikişte tık oluşmaz.
loop() {
  local name=$1 src=$2 s=$3 l=$4 x=$5 extra=${6:-anull}
  local S L X
  S=$(calc "$s * $SR + 0.5")
  L=$(calc "int($l * $SR / 1024 + 0.5) * 1024")
  X=$(calc "$x * $SR + 0.5")
  # 1) Mono, 44.1 kHz, örnek hassasiyetinde parça: A = kaynak[S, S+L+X]
  "$FF" -hide_banner -loglevel error -y -i "$src" \
    -af "aresample=$SR,aformat=sample_fmts=fltp:channel_layouts=mono,$extra,atrim=start_sample=$S:end_sample=$((S + L + X)),asetpts=PTS-STARTPTS" \
    -c:a pcm_f32le "$TMP/$name-seg.wav"
  # 2) Gövde = A[X, X+L], baş = A[0, X]; gövdenin kuyruğu başa (eşit güç) çapraz geçer.
  #    Çıkış = A[X..L] + xfade(A[L..L+X], A[0..X]) -> sonu A[X-1], başı A[X]: kesintisiz.
  "$FF" -hide_banner -loglevel error -y -i "$TMP/$name-seg.wav" -i "$TMP/$name-seg.wav" \
    -filter_complex "[0:a]atrim=start_sample=$X,asetpts=PTS-STARTPTS[body];[1:a]atrim=end_sample=$X,asetpts=PTS-STARTPTS[head];[body][head]acrossfade=ns=$X:c1=qsin:c2=qsin[out]" \
    -map "[out]" -c:a pcm_f32le "$TMP/$name-loop.wav"
  "$FF" -hide_banner -loglevel error -y -i "$TMP/$name-loop.wav" "${ENC[@]}" "$OUT/$name.m4a"
}

loop rain    "$SRC/rain.mp3"    395 210 4
loop nature  "$SRC/nature.mp3"  10  240 4
loop library "$SRC/library.mp3" 0.5 237 4
loop fire    "$SRC/fire.mp3"    0.5 71  3

# Derin odak: kahverengi gürültü (sabit seed), 40 Hz HP + 1.5 kHz LP, yumuşak seviye
"$FF" -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=brown:sample_rate=$SR:amplitude=1:seed=42:duration=100" \
  -af "highpass=f=40,lowpass=f=1500,volume=${DEEP_GAIN:-0.05}" -c:a pcm_f32le "$TMP/deep-raw.wav"
loop deep-focus "$TMP/deep-raw.wav" 2 90 4

# Bitiş zili (döngü yok): üç sinüs kısmi (E5, B5, E6), her biri üstel sönümlü;
# 6 ms yumuşak atak, son 0,25 sn fade-out, toplam 1,5 sn. Kaynak dosya gerekmez.
CHIME='0.4*min(1\,t/0.006)*(0.55*sin(2*PI*659.25*t)*exp(-2.6*t)+0.30*sin(2*PI*987.77*t)*exp(-3.6*t)+0.15*sin(2*PI*1318.51*t)*exp(-5.2*t))'
"$FF" -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=$CHIME:s=$SR:d=1.5" \
  -af "afade=t=out:st=1.25:d=0.25" "${ENC[@]}" "$OUT/chime.m4a"

ls -la "$OUT"
