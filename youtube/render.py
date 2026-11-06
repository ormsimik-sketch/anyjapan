"""Процедурный рендер видеоряда. Запуск: python render.py BUILD_DIR SECTION_INDEX"""
import json, math, subprocess, sys, zlib
import numpy as np
from PIL import Image, ImageFilter

W, H, FPS = 1920, 1080, 30
F32 = np.float32


# ---------------------------------------------------------------- утилиты
def fbm(h, w, beta=2.2, seed=0):
    """Бесшовный фрактальный шум ~N(0,1)."""
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    spec = (rng.normal(size=f.shape) + 1j * rng.normal(size=f.shape)) / f ** (beta / 2)
    spec[0, 0] = 0
    n = np.fft.irfft2(spec, s=(h, w)).astype(F32)
    return (n - n.mean()) / n.std()


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ease(u):
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)


def keyframes(keys, u):
    """keys: [(u, a, b, c...)] -> плавная интерполяция."""
    if u <= keys[0][0]:
        return keys[0][1:]
    for k0, k1 in zip(keys, keys[1:]):
        if u <= k1[0]:
            e = ease((u - k0[0]) / (k1[0] - k0[0]))
            return tuple(a + (b - a) * e for a, b in zip(k0[1:], k1[1:]))
    return keys[-1][1:]


def gradient(stops, x):
    """stops: [(pos, (r,g,b))], x: массив -> RGB."""
    pos = np.array([s[0] for s in stops], F32)
    cols = np.array([s[1] for s in stops], F32)
    out = np.empty(x.shape + (3,), F32)
    for c in range(3):
        out[..., c] = np.interp(x, pos, cols[:, c])
    return out


def radial(h, w, cx, cy, r0, power=2.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(F32)
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (r0 * r0)
    return 1 / (1 + d2) ** power


def splat(img, xs, ys, vals, color):
    """Добавить точки (с билинейным размазыванием) в float-кадр."""
    h, w = img.shape[:2]
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    fx = xs - x0; fy = ys - y0
    for dx, dy, wt in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)),
                       (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi, yi = x0 + dx, y0 + dy
        m = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
        v = (vals * wt)[m]
        for c in range(3):
            np.add.at(img[..., c], (yi[m], xi[m]), v * color[c])


def segments(x0, y0, x1, y1, b, n=12):
    t = np.linspace(0, 1, n, dtype=F32)[None, :]
    xs = (x0[:, None] + (x1 - x0)[:, None] * t).ravel()
    ys = (y0[:, None] + (y1 - y0)[:, None] * t).ravel()
    vs = np.repeat(b / n * 3, n) * np.tile(t.ravel() ** 0.7, len(b))
    return xs, ys, vs


# ---------------------------------------------------------------- фон
def nebula(h, w, seed, colors, strength=1.0, cover=0.3):
    base = np.zeros((h, w, 3), F32)
    mask = np.clip((fbm(h, w, 3.1, seed) + cover) / 2.2, 0, 1) ** 1.6
    for i, c in enumerate(colors):
        n = np.clip(fbm(h, w, 2.75 + 0.2 * i, seed + 11 + i) * 0.5 + 0.35, 0, 1) ** 2.2
        base += n[..., None] * np.array(c, F32) * mask[..., None]
    dust = fbm(h, w, 2.9, seed + 97)
    base *= (1 - 0.75 * sstep(0.2, 1.6, dust))[..., None]
    return base * strength


def starfield(h, w, n, seed, bright=1.0):
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), F32)
    xs = rng.uniform(0, w - 1, n); ys = rng.uniform(0, h - 1, n)
    b = np.clip(rng.pareto(2.2, n) * 0.25 + 0.05, 0, 3) * bright
    tint = rng.uniform(0, 1, n)
    for lo, hi, col in ((0, .25, (.75, .85, 1.0)), (.25, .8, (1, 1, 1)), (.8, 1.01, (1, .88, .7))):
        m = (tint >= lo) & (tint < hi)
        splat(img, xs[m], ys[m], b[m], col)
    big = np.where(img.max(-1, keepdims=True) > 0.6, img, 0)
    glow = np.asarray(Image.fromarray((np.clip(big, 0, 1) * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(4))).astype(F32) / 255
    return img + glow * 1.5


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


class Camera:
    """Плавное движение по большому полотну (субпиксельно, без дрожания)."""
    def __init__(self, canvas, keys):
        self.img, self.keys = canvas, keys
        self.cw, self.ch = canvas.size

    def frame(self, u):
        z, px, py = keyframes(self.keys, u)
        s = min(self.cw / W, self.ch / H) / z
        cx = self.cw / 2 + px * (self.cw - W * s) / 2
        cy = self.ch / 2 + py * (self.ch - H * s) / 2
        im = self.img.transform((W, H), Image.AFFINE, (s, 0, cx - s * W / 2, 0, s, cy - s * H / 2),
                                resample=Image.BILINEAR)
        return np.asarray(im).astype(F32) / 255


def make_bg(seed, colors, strength, stars=9000, cover=0.3, scale=1.25):
    ch, cw = int(H * scale), int(W * scale)
    a = nebula(ch // 2, cw // 2, seed, colors, strength, cover)
    a = np.asarray(to_img(a).resize((cw, ch), Image.BICUBIC)).astype(F32) / 255
    a = a + starfield(ch, cw, stars, seed + 5)
    return to_img(a)


# ---------------------------------------------------------------- планеты
def render_planet(fr, cx, cy, R, tex, rot, light, emis=None, atmo=None, clouds=None, crot=0.0,
                  tilt=0.2, night_tex=None):
    pad = 1.35 if atmo else 1.05
    x0, x1 = max(0, int(cx - R * pad)), min(W, int(cx + R * pad) + 2)
    y0, y1 = max(0, int(cy - R * pad)), min(H, int(cy + R * pad) + 2)
    if x1 <= x0 or y1 <= y0:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(F32)
    nx = (xx - cx) / R; ny = (yy - cy) / R
    rr = nx * nx + ny * ny
    d = np.sqrt(rr)
    nz = np.sqrt(np.clip(1 - rr, 0, 1))
    lx, ly, lz = light
    dot = nx * lx + ny * ly + nz * lz
    # наклон оси
    ct, st = math.cos(tilt), math.sin(tilt)
    ny2 = ny * ct - nz * st; nz2 = ny * st + nz * ct
    lat = np.arcsin(np.clip(-ny2, -1, 1))
    lon = np.arctan2(nx, nz2)
    th, tw = tex.shape[:2]
    v = np.clip(((0.5 - lat / math.pi) * (th - 1)).astype(int), 0, th - 1)

    def sample(t, r):
        u = (((lon + r) / (2 * math.pi)) % 1.0 * (t.shape[1] - 1)).astype(int)
        return t[v, u]

    col = sample(tex, rot)
    day = sstep(-0.08, 0.35, dot)
    shade = (0.015 + 1.05 * np.clip(dot, 0, 1) ** 0.85 * day)[..., None]
    c = col * shade * (0.75 + 0.25 * nz)[..., None]
    if clouds is not None:
        ca = sample(clouds, crot)[..., None]
        c = c * (1 - ca) + ca * shade * 1.05
    if night_tex is not None:
        c += sample(night_tex, rot) * (1 - day)[..., None] * (1 - (sample(clouds, crot)[..., None] if clouds is not None else 0))
    if emis is not None:
        c += sample(emis, rot) if emis.ndim == 3 else emis
    alpha = np.clip((1 - d) * R + 0.5, 0, 1)[..., None]
    reg = fr[y0:y1, x0:x1]
    reg[:] = reg * (1 - alpha) + c * alpha
    if atmo:
        acol, thick, power = atmo
        side = np.clip(0.2 + 0.8 * (nx * lx + ny * ly) / (d + 1e-6) * 0.9 + 0.3 * lz, 0, 1.2)
        g = np.where(d < 1, np.exp(-((1 - d) * R / (thick * 0.6)) ** 2) * 0.8,
                     np.exp(-((d - 1) * R / thick) ** 2))
        reg += (g * side * power)[..., None] * np.array(acol, F32)
    return (x0, y0, x1, y1, rr)


def polar_fix(t):
    """Сглаживаем текстуру у полюсов, чтобы не было «стяжки» в точку."""
    th = t.shape[0]
    lat = np.abs(np.linspace(-1, 1, th, dtype=F32))
    w = sstep(0.7, 0.97, lat).reshape((th,) + (1,) * (t.ndim - 1))
    return t * (1 - w) + t.mean(axis=1, keepdims=True) * w


def tex_bands(seed, stops, warp=0.06, th=1024, tw=2048, bands=7.0):
    n = fbm(th, tw, 3.0, seed)
    y = np.linspace(0, 1, th, dtype=F32)[:, None]
    f = (np.sin((y + n * warp) * bands * math.pi * 2 + n * 0.6) * 0.5 + 0.5)
    f = f * 0.8 + 0.2 * (fbm(th, tw, 2.6, seed + 1) * 0.25 + 0.5)
    return gradient(stops, np.clip(f, 0, 1))


def tex_noise(seed, stops, beta=2.7, th=1024, tw=2048, k=0.25):
    n = fbm(th, tw, beta, seed) * k + 0.5
    return gradient(stops, np.clip(n, 0, 1))


def star_glow(sx, sy, r0, col, power=1.3, inten=1.0):
    g = radial(H, W, sx, sy, r0, power)
    return g[..., None] * np.array(col, F32) * inten


# ---------------------------------------------------------------- сцены
class Scene:
    def __init__(self, sec, dur):
        self.sec, self.dur = sec, dur
        self.rng = np.random.default_rng(zlib.crc32(sec["id"].encode()))
        self.setup()

    def setup(self):
        pass


class PlanetScene(Scene):
    cfg = {}

    def setup(self):
        c = self.cfg
        self.cam = Camera(make_bg(c["seed"], c["neb"], c.get("neb_k", 0.5)), c.get("cam", [(0, 1.0, -0.5, -0.3), (1, 1.12, 0.5, 0.3)]))
        self.tex = polar_fix(c["tex"](c["seed"]))
        self.emis = polar_fix(c["emis"](c["seed"], self.tex)) if c.get("emis") else None
        self.clouds = polar_fix(c["clouds"](c["seed"])) if c.get("clouds") else None
        self.night = polar_fix(c["night"](c["seed"], self.tex)) if c.get("night") else None
        sx, sy = c.get("star", (-200, 250))
        self.star = star_glow(sx, sy, 70, c.get("star_col", (1, .95, .85)), 1.15, 1.4) if c.get("star", 1) else None
        L = np.array([sx - 960, sy - 540, 500.0]); self.light = L / np.linalg.norm(L)
        self.keys = c.get("pkeys", [(0, 1150, 560, 340), (0.5, 1050, 600, 470), (1, 900, 520, 380)])
        n = c.get("rain_n", 0)
        if n:
            self.rx = self.rng.uniform(-1.2, 1.2, n).astype(F32)
            self.ry = self.rng.uniform(-1.2, 1.2, n).astype(F32)
            self.rs = self.rng.uniform(0.6, 1.4, n).astype(F32)

    def draw(self, t, u):
        c = self.cfg
        fr = self.cam.frame(u)
        if self.star is not None:
            fr += self.star
        cx, cy, R = keyframes(self.keys, u)
        if c.get("tail"):
            self.draw_tail(fr, cx, cy, R, t)
        info = render_planet(fr, cx, cy, R, self.tex, c.get("rot0", 0) + t * c.get("spin", 0.05), self.light, self.emis,
                             c.get("atmo"), self.clouds, c.get("rot0", 0) + t * c.get("cspin", 0.07), night_tex=self.night)
        if c.get("rain_n") and info:
            self.draw_rain(fr, cx, cy, R, t, info)
        return fr

    def draw_rain(self, fr, cx, cy, R, t, info):
        c = self.cfg
        vx, vy = c["rain_v"]
        ph = (t * c["rain_speed"] * self.rs)
        px = (self.rx + vx * ph + 1.2) % 2.4 - 1.2
        py = (self.ry + vy * ph + 1.2) % 2.4 - 1.2
        inside = px * px + py * py < 0.96
        if c.get("rain_side") == "night":
            inside &= (px * self.light[0] + py * self.light[1]) < -0.05
        px, py, rs = px[inside], py[inside], self.rs[inside]
        L = c["rain_len"]
        x1 = cx + px * R; y1 = cy + py * R
        x0 = x1 - vx * L * R * rs; y0 = y1 - vy * L * R * rs
        xs, ys, vs = segments(x0, y0, x1, y1, np.full(len(x1), c["rain_b"], F32), 14)
        splat(fr, xs, ys, vs, c["rain_col"])

    def draw_tail(self, fr, cx, cy, R, t):
        # хвост из водорода, направлен от звезды
        lx, ly = -self.light[0], -self.light[1]
        n = math.hypot(lx, ly); lx, ly = lx / n, ly / n
        if not hasattr(self, "tail_noise"):
            self.tail_noise = fbm(270, 480, 3.0, 7) * 0.6
        yy, xx = np.mgrid[0:H:4, 0:W:4].astype(F32)
        dx, dy = xx - cx, yy - cy
        along = (dx * lx + dy * ly) / R
        perp = (-dx * ly + dy * lx) / R
        width = 0.9 + along * 0.35
        g = np.exp(-(perp / width) ** 2) * np.exp(-np.clip(along, 0, None) / 4.5) * sstep(-0.3, 0.6, along)
        nn = np.roll(self.tail_noise, int(t * 6), axis=1)
        g *= 0.65 + 0.35 * nn[: g.shape[0], : g.shape[1]]
        img = to_img(g[..., None] * np.array([.35, .7, 1.0], F32) * 1.1).resize((W, H), Image.BILINEAR)
        fr += np.asarray(img).astype(F32) / 255


def make_planet_scene(cfg):
    return type("P", (PlanetScene,), {"cfg": cfg})


BLUE = [(0, (.02, .07, .25)), (.4, (.07, .2, .6)), (.6, (.15, .35, .85)), (.8, (.05, .15, .5)), (1, (.3, .5, .95))]
GLASS = make_planet_scene(dict(
    seed=11, neb=[(.1, .2, .6), (.3, .1, .5)], neb_k=0.45,
    tex=lambda s: tex_bands(s, BLUE, 0.05, bands=6),
    atmo=((.35, .6, 1.0), 26, 0.9), star=(-150, 200), star_col=(1, .85, .6), spin=0.06,
    rain_n=1400, rain_v=(1.0, 0.12), rain_speed=0.55, rain_len=0.09, rain_b=1.6, rain_col=(.75, .9, 1.0),
    pkeys=[(0, 1180, 560, 360), (0.45, 1100, 640, 560), (1, 980, 540, 400)]))

DARK = make_planet_scene(dict(
    seed=23, neb=[(.25, .08, .05), (.1, .05, .1)], neb_k=0.35,
    tex=lambda s: tex_bands(s, [(0, (.012, .010, .010)), (1, (.03, .025, .025))], 0.05, bands=5),
    emis=lambda s, t: tex_bands(s + 3, [(0, (.05, .0, .0)), (.6, (.12, .02, .0)), (1, (.2, .04, .01))], 0.08, bands=4) * 0.9,
    atmo=((.6, .12, .05), 22, 0.35), star=(2100, 150), star_col=(1, .95, .8), spin=0.04,
    pkeys=[(0, 900, 540, 380), (0.6, 980, 560, 470), (1, 1050, 540, 420)],
    cam=[(0, 1.05, 0.4, -0.2), (1, 1.15, -0.4, 0.3)]))

IRON_STOPS = [(0, (.35, .05, .0)), (.35, (.8, .25, .02)), (.6, (1, .55, .12)), (.85, (1, .8, .4)), (1, (1, .95, .7))]
IRON = make_planet_scene(dict(
    seed=31, neb=[(.4, .15, .05), (.2, .05, .1)], neb_k=0.35,
    tex=lambda s: tex_noise(s, IRON_STOPS, 2.6, k=0.35),
    night=lambda s, t: t * np.array([.18, .05, .02], F32),
    atmo=((1, .55, .2), 30, 0.8), star=(-120, 380), star_col=(1, .9, .7), spin=0.0,
    rain_n=1600, rain_v=(-0.15, 1.0), rain_speed=0.7, rain_len=0.07, rain_b=1.8, rain_col=(1, .55, .15),
    rain_side="night",
    pkeys=[(0, 1250, 540, 420), (0.5, 1350, 560, 620), (1, 1150, 540, 440)]))

ICE = make_planet_scene(dict(
    seed=41, neb=[(.1, .3, .5), (.05, .1, .3)], neb_k=0.4,
    tex=lambda s: tex_bands(s, [(0, (.55, .7, .85)), (.5, (.75, .88, .95)), (1, (.4, .6, .8))], 0.07, bands=4),
    atmo=((.5, .8, 1.0), 30, 0.8), star=(-250, 700), star_col=(1, .7, .5), spin=0.05, tail=True,
    pkeys=[(0, 760, 520, 230), (0.5, 820, 540, 290), (1, 700, 500, 250)],
    cam=[(0, 1.0, -0.3, 0.3), (1, 1.12, 0.3, -0.3)]))


def lava_tex(s):
    n = fbm(1024, 2048, 2.7, s)
    return gradient([(0, (.03, .02, .02)), (.5, (.09, .06, .05)), (1, (.18, .12, .1))], np.clip(n * .2 + .5, 0, 1))


def lava_emis(s, t):
    n = fbm(1024, 2048, 2.6, s + 5)
    cr = np.exp(-(n / 0.09) ** 2)
    big = sstep(0.8, 1.8, fbm(1024, 2048, 2.6, s + 9))
    e = np.clip(cr * 0.9 + big, 0, 1.5)
    return gradient([(0, (0, 0, 0)), (.3, (.5, .05, 0)), (.7, (1, .4, .05)), (1.5, (1, .9, .5))], e)


LAVA = make_planet_scene(dict(
    seed=55, neb=[(.3, .1, .2), (.1, .1, .3)], neb_k=0.4,
    tex=lava_tex, emis=lava_emis,
    atmo=((1, .5, .25), 28, 0.6), star=(2050, 950), star_col=(1, .9, .75), spin=0.035,
    pkeys=[(0, 820, 520, 380), (0.5, 900, 560, 520), (1, 800, 520, 420)]))


def earth_tex(s):
    n = fbm(1024, 2048, 3.0, s)
    lat = np.abs(np.linspace(-1, 1, 1024, dtype=F32))[:, None]
    land = sstep(0.42, 0.5, n * 0.5 + 0.5)
    green = gradient([(0, (.08, .25, .06)), (.5, (.25, .35, .12)), (1, (.55, .45, .28))],
                     np.clip(fbm(1024, 2048, 2.0, s + 1) * .25 + .45 + lat * 0.3, 0, 1))
    ocean = gradient([(0, (.01, .05, .2)), (1, (.03, .15, .4))], np.clip(n * .3 + .7, 0, 1))
    t = ocean * (1 - land[..., None]) + green * land[..., None]
    ice = sstep(0.82, 0.9, lat + n * 0.03)[..., None]
    return t * (1 - ice) + ice * 0.95


def earth_clouds(s):
    n = fbm(1024, 2048, 2.7, s + 2)
    return np.clip(sstep(0.5, 1.6, n) * 0.9, 0, 0.9).astype(F32)


def earth_night(s, t):
    n = fbm(1024, 2048, 3.0, s)
    land = sstep(0.45, 0.55, n * 0.5 + 0.5)
    rng = np.random.default_rng(s)
    dots = (rng.random((1024, 2048)) > 0.985) * land
    dots = np.asarray(Image.fromarray((dots * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))).astype(F32) / 255
    return dots[..., None] * np.array([1, .75, .35], F32) * 1.6


EARTH = make_planet_scene(dict(
    seed=3, neb=[(.1, .15, .35), (.05, .05, .15)], neb_k=0.25,
    tex=earth_tex, clouds=earth_clouds, night=earth_night,
    atmo=((.35, .6, 1.0), 24, 1.0), star=(-300, 300), star_col=(1, .97, .9), spin=0.03, cspin=0.04, rot0=2.2,
    pkeys=[(0, 1100, 560, 400), (0.35, 1000, 580, 520), (0.62, 960, 540, 430), (0.8, 960, 540, 8),
           (1, 960, 540, 4)],
    cam=[(0, 1.05, 0.2, 0.1), (0.62, 1.12, -0.2, 0.0), (1, 1.0, 0.0, 0.0)]))


class MagnetarScene(Scene):
    def setup(self):
        self.cam = Camera(make_bg(71, [(.35, .1, .5), (.1, .1, .4)], 0.45), [(0, 1.0, -0.3, 0), (1, 1.15, 0.3, 0.1)])
        self.core = radial(H, W, 960, 540, 14, 1.4)[..., None] * np.array([.75, .85, 1.0], F32)
        self.flare_t = self.dur * 0.62
        th = np.linspace(0.12, math.pi - 0.12, 220)
        self.lines = []
        for Lr in (1.6, 2.4, 3.4, 4.6, 6.0):
            for a in np.linspace(0, 2 * math.pi, 8, endpoint=False):
                r = Lr * np.sin(th) ** 2
                self.lines.append((r * np.sin(th) * np.cos(a), r * np.cos(th), r * np.sin(th) * np.sin(a), Lr))

    def draw(self, t, u):
        fr = self.cam.frame(u)
        spin = t * 0.9
        tilt = 0.5 + 0.25 * math.sin(t * 0.2)
        pulse = 0.75 + 0.25 * math.sin(t * 2 * math.pi / 3.5) ** 8
        lay = np.zeros((H // 2, W // 2, 3), F32)
        scale = 42 * (1 + 0.1 * u)
        for x, y, z, Lr in self.lines:
            xr = x * math.cos(spin) + z * math.sin(spin); zr = -x * math.sin(spin) + z * math.cos(spin)
            yr = y * math.cos(tilt) - zr * math.sin(tilt)
            xr2 = xr * math.cos(0.4) - yr * math.sin(0.4); yr2 = xr * math.sin(0.4) + yr * math.cos(0.4)
            b = np.full(len(x), 0.22 / Lr ** 0.4, F32)
            splat(lay, 480 + xr2 * scale, 270 + yr2 * scale, b, (.55, .7, 1.0))
        blur = np.asarray(to_img(lay).filter(ImageFilter.GaussianBlur(2.5))).astype(F32) / 255
        lay = np.clip(lay + blur * 2.2, 0, 1)
        fr += np.asarray(to_img(lay).resize((W, H), Image.BILINEAR)).astype(F32) / 255
        fr += self.core * pulse * 2.2
        dt = t - self.flare_t
        if 0 < dt < 6:
            fr += np.exp(-dt * 1.3) * 0.9 * np.array([.8, .85, 1.0], F32)
            if not hasattr(self, "rr"):
                yy, xx = np.mgrid[0:H, 0:W].astype(F32)
                self.rr = np.sqrt((xx - 960) ** 2 + (yy - 540) ** 2)
            ring = np.exp(-((self.rr - dt * 520) / 60) ** 2) * math.exp(-dt * 0.5)
            fr += ring[..., None] * np.array([.5, .6, 1.0], F32) * 0.8
        return fr


class QuasarScene(Scene):
    def setup(self):
        self.cam = Camera(make_bg(83, [(.05, .25, .5), (.1, .15, .45), (.2, .1, .4)], 0.65, cover=0.6),
                          [(0, 1.0, 0.3, -0.2), (1, 1.18, -0.2, 0.1)])
        cx, cy = 960, 520
        self.box = (cx - 700, cy - 260, cx + 700, cy + 260)
        x0, y0, x1, y1 = self.box
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(F32)
        dx, dy = (xx - cx) / 620, (yy - cy) / (620 * 0.26)
        self.r = np.sqrt(dx * dx + dy * dy); self.th = np.arctan2(dy, dx)
        self.front = yy > cy
        pt = fbm(64, 1024, 1.8, 5)
        self.ptex = pt
        self.prof = np.clip(sstep(0.08, 0.13, self.r) * (1 - sstep(0.7, 1.0, self.r)) * (0.11 / np.maximum(self.r, 0.05)) ** 1.2, 0, 2)
        self.col = gradient([(0, (1, 1, 1)), (.15, (.8, .9, 1)), (.35, (1, .75, .4)), (1, (.7, .2, .05))], np.clip(self.r, 0, 1))
        self.shadow = np.clip((np.sqrt(((xx - cx) / 70) ** 2 + ((yy - cy) / 70) ** 2) - 1) * 70, 0, 1)
        yy2, xx2 = np.mgrid[0:H, 0:W].astype(F32)
        jx = (xx2 - cx); jy = np.abs(yy2 - cy)
        self.jet = (np.exp(-(jx / (6 + jy * 0.05)) ** 2) * np.exp(-jy / 900) * sstep(20, 80, jy))[..., None] * np.array([.55, .7, 1.0], F32)
        self.glow = radial(H, W, cx, cy, 120, 1.0)[..., None] * np.array([.6, .7, 1.0], F32) * 0.5

    def draw(self, t, u):
        fr = self.cam.frame(u)
        fr += self.glow + self.jet * (0.8 + 0.2 * math.sin(t * 3.1) * math.sin(t * 1.7))
        om = 0.6 / np.maximum(self.r, 0.1) ** 1.5
        uu = (((self.th + om * t * 0.25) / (2 * math.pi)) % 1 * 1023).astype(int)
        vv = np.clip((self.r * 63).astype(int), 0, 63)
        streak = 0.6 + 0.4 * np.clip(self.ptex[vv, uu] * 0.5 + 0.5, 0, 1.4)
        disk = (self.col * (self.prof * streak)[..., None])
        x0, y0, x1, y1 = self.box
        reg = fr[y0:y1, x0:x1]
        back = disk * (~self.front)[..., None]
        reg[:] = (reg + back) * self.shadow[..., None]
        reg += disk * self.front[..., None]
        return fr


class VoidScene(Scene):
    def setup(self):
        sc = 2.0
        ch, cw = int(H * sc), int(W * sc)
        rng = self.rng
        img = starfield(ch, cw, 4000, 91, 0.7)
        web = 1 - np.abs(fbm(ch // 4, cw // 4, 2.6, 92))
        web = np.asarray(to_img(web / 1.0).resize((cw, ch), Image.BILINEAR)).astype(F32) / 255
        yy, xx = np.mgrid[0:ch, 0:cw].astype(F32)
        d = np.sqrt(((xx - cw / 2) / (ch * 0.42)) ** 2 + ((yy - ch / 2) / (ch * 0.42)) ** 2)
        dens = (web ** 4) * sstep(0.85, 1.1, d)
        n = 260000
        xs = rng.uniform(0, cw - 1, n); ys = rng.uniform(0, ch - 1, n)
        keep = rng.random(n) < dens[ys.astype(int), xs.astype(int)]
        xs, ys = xs[keep], ys[keep]
        b = rng.uniform(0.15, 0.8, len(xs))
        splat(img, xs, ys, b * 2.2, (1, .85, .7))
        # редкие галактики внутри пустоты
        inside = rng.uniform(-0.6, 0.6, (60, 2)) * np.array([ch * 0.42, ch * 0.42]) + np.array([cw / 2, ch / 2])
        gal = np.zeros_like(img)
        splat(gal, inside[:, 0], inside[:, 1], rng.uniform(1.0, 2.0, 60), (1, .9, .75))
        g = np.asarray(to_img(gal).filter(ImageFilter.GaussianBlur(2))).astype(F32) / 255
        img += g * 6 + gal
        haze = np.asarray(to_img(dens[..., None] * np.array([.12, .08, .06], F32)).filter(ImageFilter.GaussianBlur(25))).astype(F32) / 255
        img += haze
        self.cam = Camera(to_img(img), [(0, 1.9, 0, 0), (0.3, 1.6, 0, 0), (0.85, 1.0, 0, 0), (1, 0.98, 0, 0)])

    def draw(self, t, u):
        return self.cam.frame(u)


class CloudScene(Scene):
    def setup(self):
        self.cam = Camera(make_bg(61, [(.8, .25, .3), (.6, .3, .1), (.4, .1, .45)], 1.05, cover=0.9, stars=12000),
                          [(0, 1.0, -0.6, 0.4), (1, 1.3, 0.5, -0.3)])
        n = 260
        self.p = self.rng.uniform(0, 1, (n, 2)).astype(F32) * np.array([W, H], F32)
        self.v = self.rng.normal(0, 1, (n, 2)).astype(F32) * 9
        self.b = self.rng.uniform(0.3, 1.0, n).astype(F32)

    def draw(self, t, u):
        fr = self.cam.frame(u)
        p = (self.p + self.v * t) % np.array([W, H], F32)
        lay = np.zeros((H // 2, W // 2, 3), F32)
        tw = 0.6 + 0.4 * np.sin(t * 2 + self.b * 20)
        splat(lay, p[:, 0] / 2, p[:, 1] / 2, self.b * tw, (1, .8, .6))
        g = np.asarray(to_img(lay).filter(ImageFilter.GaussianBlur(2))).astype(F32) / 255
        fr += np.asarray(to_img(lay * 0.6 + g * 3).resize((W, H), Image.BILINEAR)).astype(F32) / 255
        return fr


class WarpScene(Scene):
    """Полёт сквозь звёзды (интро и финал)."""
    speed = 0.12

    def setup(self):
        self.cam = Camera(make_bg(5 if self.sec["id"] == "intro" else 8,
                                  [(.15, .25, .6), (.4, .15, .5), (.1, .4, .5)], 0.7),
                          [(0, 1.0, -0.4, -0.2), (1, 1.25, 0.4, 0.2)])
        n = 2200
        self.x = self.rng.uniform(-1.6, 1.6, n).astype(F32)
        self.y = self.rng.uniform(-0.9, 0.9, n).astype(F32)
        self.z0 = self.rng.uniform(0.05, 1.0, n).astype(F32)

    def draw(self, t, u):
        fr = self.cam.frame(u)
        sp = self.speed * (1.6 - 0.6 * ease(u)) if self.sec["id"] == "intro" else self.speed * 0.6
        def proj(tt):
            z = (self.z0 - tt * sp) % 1.0 + 0.02
            return 960 + self.x / z * 600, 540 + self.y / z * 600, z
        x1, y1, z1 = proj(t); x0, y0, z0 = proj(t - 1 / FPS * 2.5)
        ok = (z0 > z1) & (np.abs(x1 - x0) < 400)
        b = np.clip((1 - z1) ** 2 * 1.2, 0, 1.2)[ok]
        xs, ys, vs = segments(x0[ok], y0[ok], x1[ok], y1[ok], b, 10)
        splat(fr, xs, ys, vs, (.85, .9, 1.0))
        return fr


SCENES = dict(intro=WarpScene, outro=WarpScene, glass=GLASS, dark=DARK, iron=IRON, ice=ICE, lava=LAVA,
              cloud=CloudScene, magnetar=MagnetarScene, quasar=QuasarScene, void=VoidScene, earth=EARTH)


def main():
    build, idx = sys.argv[1], int(sys.argv[2])
    limit = float(sys.argv[3]) if len(sys.argv) > 3 else None   # для тестов: секунды
    tl = json.load(open(f"{build}/timeline.json"))
    sec = tl["sections"][idx]
    f0, f1 = round(sec["start"] * FPS), round(sec["end"] * FPS)
    nfr = f1 - f0
    dur = nfr / FPS
    scene = SCENES[sec["visual"]](sec, dur)
    out = f"{build}/sec_{idx:02d}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
                           "-crf", "16", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    grain = np.random.default_rng(0).uniform(-1.2, 1.2, (H + 8, W + 8, 1)).astype(F32) / 255
    fade = 0.7
    count = nfr if limit is None else min(nfr, int(limit * FPS))
    for i in range(count):
        t = i / FPS
        fr = scene.draw(t, t / dur)
        k = min(1.0, t / fade, (dur - t) / fade)
        if idx == 0:
            k = min(1.0, t / 2.0, (dur - t) / fade)
        if k < 1:
            fr *= max(k, 0)
        o = (i * 3) % 8
        fr += grain[o:o + H, o:o + W]
        ff.stdin.write((np.clip(fr, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print("done", idx, sec["id"], count)


if __name__ == "__main__":
    main()
