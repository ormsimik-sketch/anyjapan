#!/usr/bin/env bash
# Финальная сборка: склейка сцен + субтитры + голос + музыка, громкость под YouTube (-14 LUFS).
set -euo pipefail
B="$1"; OUTFILE="${2:-$B/final.mp4}"
cd "$B"
ls sec_*.mp4 | sort | sed "s/.*/file '&'/" > concat.txt
ffmpeg -y -loglevel error -stats \
  -f concat -safe 0 -i concat.txt -i voice.wav -i music.wav \
  -filter_complex "\
[0:v]ass=subtitles.ass[v];\
[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0,asplit=2[vo][sc];\
[2:a]aresample=48000,volume=0.22[mu];\
[mu][sc]sidechaincompress=threshold=0.04:ratio=6:attack=40:release=600[duck];\
[vo][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUTFILE"
echo "готово: $OUTFILE"
