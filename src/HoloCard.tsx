import { useEffect, useRef } from "react";
import "./holo.css";
import { useTheme } from "./theme";
import type { Lang } from "./i18n";
import type { Project } from "./projects";

// A project as a hologram card, in pure CSS 3D (no WebGL, so it costs a phone
// almost nothing and the text stays crisp and selectable).
//
//  - Volume: a front face, a back face and three glass plates between them, so
//    the card has thickness when it tilts.
//  - Bloom: layered box-/text-shadow halos (theme ink), plus a drop-shadow on
//    the dithered thumbnail.
//  - Motion: it does NOT spin. It tilts toward the pointer (hover on desktop,
//    finger position while touching) with a moving glare, drifts gently when
//    idle, and flickers. Tap / click / Enter flips it to the back (description
//    + link). Vertical swipes still scroll the page (touch-action: pan-y).
//  - Only on-screen cards animate; prefers-reduced-motion = no drift/flicker.

const MAX_TILT_Y = 18; // deg, left/right
const MAX_TILT_X = 12; // deg, up/down
const FOLLOW = 9; // damping: higher = snappier
const DRIFT_Y = 3;
const DRIFT_X = 2;
const TAP_PX = 6;

// ---- 1-bit dithered thumbnail ---------------------------------------------

const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function hexToRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d")!;
  c.fillStyle = color;
  const v = c.fillStyle; // normalised to #rrggbb
  const n = parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Draws `img` cover-fitted onto the canvas as 1-bit ordered dither: lit pixels
 * are `ink`, the rest transparent. Levels are stretched first so dark screenshots
 * (ArtStation, the 3D lab) don't come out empty; light pages are inverted so the
 * ink always marks the content rather than the background.
 */
function dither(canvas: HTMLCanvasElement, img: HTMLImageElement, ink: string) {
  const W = canvas.width;
  const H = canvas.height;
  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = H;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  pctx.drawImage(img, (W - dw) / 2, 0, dw, dh); // anchor to the top: heroes live there
  const src = pctx.getImageData(0, 0, W, H).data;

  const luma = new Float32Array(W * H);
  const hist = new Uint32Array(256);
  let sum = 0;
  for (let i = 0; i < W * H; i++) {
    const l = 0.2126 * src[i * 4] + 0.7152 * src[i * 4 + 1] + 0.0722 * src[i * 4 + 2];
    luma[i] = l;
    hist[Math.min(255, l | 0)]++;
    sum += l;
  }
  const pct = (p: number) => {
    let acc = 0;
    const target = p * W * H;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; }
    return 255;
  };
  const lo = pct(0.03);
  const hi = Math.max(lo + 1, pct(0.97));
  const invert = sum / (W * H) > 140;

  const [r, g, b] = hexToRgb(ink);
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let v = Math.min(1, Math.max(0, (luma[i] - lo) / (hi - lo)));
      if (invert) v = 1 - v;
      const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (v > threshold) {
        out.data[i * 4] = r;
        out.data[i * 4 + 1] = g;
        out.data[i * 4 + 2] = b;
        out.data[i * 4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

function DitherArt({ src, ink }: { src: string; ink: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const draw = () => imgRef.current && dither(canvas, imgRef.current, ink);
    if (imgRef.current) { draw(); return; }
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
  }, [src, ink]);

  // 3:2-ish art box at low resolution; CSS scales it up with hard pixels.
  return <canvas ref={ref} width={150} height={112} aria-hidden />;
}

// ---- the card ---------------------------------------------------------------

export interface HoloUi {
  open: string;
  hint: string;
}

export default function HoloCard({
  project, lang, ui, index,
}: { project: Project; lang: Lang; ui: HoloUi; index: number }) {
  const theme = useTheme();
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Animation state lives in a ref: it changes every frame and must not re-render.
  const s = useRef({
    flip: 0, // 0 = front, 180 = back; eased toward `flipTarget`
    flipTarget: 0,
    tx: 0, ty: 0, // current tilt (deg)
    gx: 50, gy: 50, // current glare position (%)
    px: 0.5, py: 0.5, // pointer, 0..1 across the card
    active: false, // pointer is steering the tilt
    down: false,
    downX: 0,
    downY: 0,
    moved: 0,
    visible: false,
  });

  useEffect(() => {
    const scene = sceneRef.current!;
    const card = cardRef.current!;
    const st = s.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(scene);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!st.visible) return;
      const k = Math.min(1, dt * FOLLOW);

      // Where the tilt wants to be: toward the pointer, else a slow drift.
      let wantY: number;
      let wantX: number;
      let wantGx: number;
      let wantGy: number;
      if (st.active) {
        wantY = (st.px - 0.5) * 2 * MAX_TILT_Y;
        wantX = -(st.py - 0.5) * 2 * MAX_TILT_X;
        wantGx = st.px * 100;
        wantGy = st.py * 100;
      } else if (reduce) {
        wantY = wantX = 0;
        wantGx = wantGy = 50;
      } else {
        const t = now / 1000 + index * 1.7;
        wantY = Math.sin(t * 0.8) * DRIFT_Y;
        wantX = Math.cos(t * 0.6) * DRIFT_X;
        wantGx = 50 + Math.sin(t * 0.8) * 30;
        wantGy = 40 + Math.cos(t * 0.6) * 25;
      }
      st.ty += (wantY - st.ty) * k;
      st.tx += (wantX - st.tx) * k;
      st.gx += (wantGx - st.gx) * k;
      st.gy += (wantGy - st.gy) * k;
      st.flip += (st.flipTarget - st.flip) * Math.min(1, dt * 7);

      card.style.transform = `rotateX(${st.tx.toFixed(2)}deg) rotateY(${(st.ty + st.flip).toFixed(2)}deg)`;
      scene.style.setProperty("--gx", `${st.gx.toFixed(1)}%`);
      scene.style.setProperty("--gy", `${st.gy.toFixed(1)}%`);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [index]);

  const flip = () => {
    const st = s.current;
    st.flipTarget = st.flipTarget === 0 ? 180 : 0;
  };

  const track = (e: React.PointerEvent) => {
    const st = s.current;
    const r = sceneRef.current!.getBoundingClientRect();
    st.px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    st.py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  };

  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") { s.current.active = true; track(e); }
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") s.current.active = false;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a")) return; // let the link work
    const st = s.current;
    st.down = true;
    st.active = true; // a touching finger steers too
    st.downX = e.clientX;
    st.downY = e.clientY;
    st.moved = 0;
    track(e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    if (e.pointerType === "mouse" || st.down) track(e);
    if (st.down) st.moved = Math.max(st.moved, Math.hypot(e.clientX - st.downX, e.clientY - st.downY));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.down) return;
    st.down = false;
    if (e.pointerType !== "mouse") st.active = false; // finger lifted: ease back
    if (st.moved < TAP_PX && e.type === "pointerup") flip();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
  };

  const host = new URL(project.url).host.replace(/^www\./, "");

  return (
    <article
      className="holo"
      tabIndex={0}
      aria-label={`${project.title} — ${project.kind[lang]}`}
      onKeyDown={onKeyDown}
    >
      <div
        ref={sceneRef}
        className="holo__scene"
        style={{ "--flicker-delay": `${-(index * 1.37).toFixed(2)}s` } as React.CSSProperties}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={cardRef} className="holo__card">
          <i className="holo__plate" style={{ "--z": "-6px" } as React.CSSProperties} />
          <i className="holo__plate" style={{ "--z": "0px" } as React.CSSProperties} />
          <i className="holo__plate" style={{ "--z": "6px" } as React.CSSProperties} />

          <div className="holo__face holo__front">
            <div className="holo__art"><DitherArt src={project.img} ink={theme.ink} /></div>
            <div className="holo__meta">
              <div className="holo__title">{project.title}</div>
              <div className="holo__kind">{project.kind[lang]}</div>
            </div>
          </div>

          <div className="holo__face holo__back">
            <div className="holo__title">{project.title}</div>
            <div className="holo__desc">{project.desc[lang]}</div>
            <div className="holo__tags">
              {project.tags.map((t) => <span key={t} className="holo__tag">{t}</span>)}
            </div>
            <div className="holo__host">{host}</div>
            <a className="ui-btn" href={project.url} target="_blank" rel="noopener noreferrer">
              {ui.open}
            </a>
          </div>
        </div>
      </div>
      <div className="holo__base" aria-hidden />
      <div className="holo__hint">{ui.hint}</div>
    </article>
  );
}
