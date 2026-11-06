"""Генерация фоновой эмбиент-музыки и звуков переходов (без авторских прав)."""
import json, sys, wave
import numpy as np

OUT = sys.argv[1]
tl = json.load(open(f"{OUT}/timeline.json"))
SR = 44100
DUR = tl["duration"] + 1
N = int(DUR * SR)
t = np.arange(N, dtype=np.float64) / SR
rng = np.random.default_rng(1)

def hz(m):
    return 440 * 2 ** ((m - 69) / 12)

# Am - F - C - G / Am - F - G - Em, по 16 секунд
prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67],
        [57, 60, 64, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]]
CH = 16.0
pad = np.zeros((N, 2))
nch = int(DUR / CH) + 2
for i in range(nch):
    chord = prog[i % len(prog)]
    s0 = i * CH - 4
    a, b = max(0, int(s0 * SR)), min(N, int((s0 + CH + 8) * SR))
    if a >= b:
        continue
    tt = t[a:b] - s0
    env = np.sin(np.clip(tt / (CH + 8), 0, 1) * np.pi) ** 1.5
    for j, m in enumerate(chord):
        for det, pan in ((-0.07, 0.25), (0.07, 0.75)):
            f = hz(m) * (1 + det / 100 * 3)
            ph = rng.uniform(0, 6.28)
            v = np.sin(2 * np.pi * f * tt + ph) + 0.18 * np.sin(4 * np.pi * f * tt + ph)
            v *= 0.08 / (1 + j * 0.25) * env
            pad[a:b, 0] += v * (1 - pan); pad[a:b, 1] += v * pan
    # бас
    f = hz(chord[0] - 12)
    v = np.sin(2 * np.pi * f * tt) * 0.07 * env
    pad[a:b] += v[:, None]

# медленное «дыхание»
pad *= (0.8 + 0.2 * np.sin(2 * np.pi * t / 23))[:, None]

# редкие «звёздные» колокольчики (пентатоника A-минор)
pent = [69, 72, 74, 76, 79, 81, 84]
for s in np.arange(6, DUR - 5, 3.7):
    if rng.random() < 0.55:
        m = pent[rng.integers(len(pent))]
        a = int((s + rng.uniform(0, 1.5)) * SR); L = int(4 * SR)
        b = min(N, a + L); tt = t[a:b] - t[a]
        v = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 1.3) * 0.045
        v += np.sin(2 * np.pi * hz(m) * 2.01 * tt) * np.exp(-tt * 2.5) * 0.015
        p = rng.uniform(0.2, 0.8)
        pad[a:b, 0] += v * (1 - p); pad[a:b, 1] += v * p

# переходы между разделами: мягкий «вжух» (фильтрованный шум)
for sec in tl["sections"][1:]:
    c = sec["start"]
    a, b = int((c - 1.4) * SR), int((c + 1.6) * SR)
    n = rng.normal(0, 1, (b - a, 2))
    # простой сглаживающий фильтр, частота растёт к центру
    tt = (np.arange(b - a) / SR) / 3.0
    env = np.sin(np.pi * tt) ** 3
    k = np.clip(0.02 + 0.25 * env, 0.01, 0.5)
    y = np.zeros_like(n); acc = np.zeros(2)
    for i in range(len(n)):
        acc += k[i] * (n[i] - acc); y[i] = acc
    pad[a:b] += y * env[:, None] * 0.5

pad /= np.abs(pad).max() + 1e-9
pad *= 0.9
with wave.open(f"{OUT}/music_dry.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((pad * 32767).astype(np.int16).tobytes())
print("music", DUR)
