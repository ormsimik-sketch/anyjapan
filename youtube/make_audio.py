"""Озвучка сценария (RHVoice), таймлайн, субтитры .srt и .ass."""
import json, os, re, subprocess, sys, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from script import SECTIONS

OUT = sys.argv[1]
VOICE = os.environ.get("VOICE", "aleksandr-hq")
SR = 24000
GAP_SENT = 0.45      # пауза между фразами
LEAD_IN = 1.6        # пауза в начале раздела (под титр)
TAIL = 1.4           # пауза в конце раздела
os.makedirs(f"{OUT}/tts", exist_ok=True)

MARK = re.compile(r"\[([^|\]]+)\|([^\]]+)\]")
show = lambda t: MARK.sub(r"\1", t)
say = lambda t: MARK.sub(r"\2", t)


def tts(job):
    key, text = job
    path = f"{OUT}/tts/{key}.wav"
    if not os.path.exists(path):
        raw = path + ".raw.wav"
        subprocess.run(["RHVoice-test", "-p", VOICE, "-r", "108", "-R", str(SR), "-o", raw],
                       input=text.encode(), check=True, capture_output=True)
        os.replace(raw, path)
    with wave.open(path) as w:
        assert w.getframerate() == SR
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def trim(a, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - 240): idx[-1] + 2400]


jobs = [(f"{si:02d}_{k:02d}", say(t)) for si, s in enumerate(SECTIONS) for k, t in enumerate(s["text"])]
with ThreadPoolExecutor(4) as ex:
    clips = dict(zip([j[0] for j in jobs], ex.map(tts, jobs)))

voice, timeline, subs, t = [], [], [], 0.0
for si, s in enumerate(SECTIONS):
    start = t
    lead = LEAD_IN + (1.4 if s["num"] else 0) if si else 3.0
    voice.append(np.zeros(int(lead * SR), np.float32)); t += lead
    for k, txt in enumerate(s["text"]):
        a = trim(clips[f"{si:02d}_{k:02d}"])
        subs.append((t, t + len(a) / SR, show(txt)))
        voice.append(a); t += len(a) / SR
        voice.append(np.zeros(int(GAP_SENT * SR), np.float32)); t += GAP_SENT
    tail = TAIL if si < len(SECTIONS) - 1 else 6.0
    voice.append(np.zeros(int(tail * SR), np.float32)); t += tail
    timeline.append(dict(id=s["id"], visual=s["visual"], num=s["num"], name=s["name"],
                         tag=s["tag"], start=round(start, 3), end=round(t, 3)))

v = np.concatenate(voice)
v = v / (np.abs(v).max() + 1e-9) * 0.9
with wave.open(f"{OUT}/voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((v * 32767).astype(np.int16).tobytes())
json.dump(dict(duration=t, sections=timeline), open(f"{OUT}/timeline.json", "w"), ensure_ascii=False, indent=1)


def ts(x, sep=","):
    h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", sep)


def chunks(text, maxlen=58):
    """Длинную фразу делим на куски по ~2 строки, чтобы субтитры не закрывали кадр."""
    words, out, cur = text.split(), [], ""
    for wd in words:
        if len(cur) + len(wd) + 1 > maxlen * 2 and cur:
            out.append(cur); cur = wd
        else:
            cur = (cur + " " + wd).strip()
    out.append(cur)
    return out


srt, ass_ev, n = [], [], 1
for a, b, text in subs:
    parts = chunks(text)
    total = sum(len(p) for p in parts)
    x = a
    for p in parts:
        y = x + (b - a) * len(p) / total
        srt.append(f"{n}\n{ts(x)} --> {ts(y)}\n{p}\n"); n += 1
        ass_ev.append(f"Dialogue: 0,{ts(x, '.')[1:-1]},{ts(y, '.')[1:-1]},Sub,,0,0,0,,{p}")
        x = y
open(f"{OUT}/subtitles.srt", "w").write("\n".join(srt))

# Титры разделов
for s in timeline:
    a = s["start"] + 0.3
    if s["id"] == "intro":
        ass_ev.append(f"Dialogue: 1,{ts(a,'.')[1:-1]},{ts(a+4.5,'.')[1:-1]},Big,,0,0,0,,{{\\fad(600,600)}}10 САМЫХ СТРАННЫХ МЕСТ\\N{{\\fs60\\c&HF0C060&}}ВО ВСЕЛЕННОЙ")
    elif s["num"]:
        b = a + 5.2
        ass_ev.append(f"Dialogue: 1,{ts(a,'.')[1:-1]},{ts(b,'.')[1:-1]},Num,,0,0,0,,{{\\fad(400,500)}}№{s['num']}")
        ass_ev.append(f"Dialogue: 1,{ts(a+0.3,'.')[1:-1]},{ts(b,'.')[1:-1]},Name,,0,0,0,,{{\\fad(400,500)}}{s['name'].upper()}\\N{{\\fs44\\c&HF0C060&}}{s['tag']}")
        # маленькая плашка в углу на весь раздел
        ass_ev.append(f"Dialogue: 0,{ts(b,'.')[1:-1]},{ts(s['end']-0.3,'.')[1:-1]},Corner,,0,0,0,,{{\\fad(500,300)}}№{s['num']}  {s['name']}")
    elif s["id"] == "outro":
        e = s["end"]
        ass_ev.append(f"Dialogue: 1,{ts(e-7,'.')[1:-1]},{ts(e-0.5,'.')[1:-1]},Big,,0,0,0,,{{\\fad(800,800)}}ПОДПИШИТЕСЬ\\N{{\\fs48\\c&HF0C060&}}до встречи среди звёзд")

ASS_HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,3,1.5,2,160,160,60,204
Style: Big,DejaVu Sans,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,3,0,1,5,4,5,100,100,100,204
Style: Num,DejaVu Sans,150,&H0060D0FF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,4,0,1,5,4,8,100,100,170,204
Style: Name,DejaVu Sans,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,2,0,1,5,4,8,100,100,350,204
Style: Corner,DejaVu Sans,30,&H40FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,1,0,1,2,1,7,50,50,40,204

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
open(f"{OUT}/subtitles.ass", "w").write(ASS_HEAD + "\n".join(ass_ev) + "\n")
print(f"duration {t/60:.2f} min, {len(subs)} phrases")
for s in timeline:
    m = int(s['start'] // 60); sec = int(s['start'] % 60)
    print(f"{m}:{sec:02d} {('№'+str(s['num'])+' ') if s['num'] else ''}{s['name'] or 'Финал'}")
