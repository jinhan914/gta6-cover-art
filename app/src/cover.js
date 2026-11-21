// Vice City Cover Studio — cover renderer.
//
// Draws a multi-panel GTA-style poster onto any 2D canvas: a sunset / neon
// sky with a low sun and a skyline silhouette, photo panels with thick white
// gutters, a colour grade per panel, and big bold caption lettering across a
// diagonal title band. Everything is drawn with canvas primitives — no
// Rockstar artwork, logo or font is used anywhere.
//
// Panels are described in pixels for the canvas being drawn, so the same
// function renders the small live preview and the full-size PNG export.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#ff9a3d', '#ff5e62', '#c33d7a', '#4a1e6e'],
    sun: '#ffd76a',
    tintTop: 'rgba(255, 110, 60, 0.10)',
    tintBottom: 'rgba(190, 30, 110, 0.38)',
    band: '#1c0b2e',
    accent: '#ffcf4d',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#0affef', '#0a7cff', '#a100ff', '#ff00a8'],
    sun: '#ff4dd2',
    tintTop: 'rgba(0, 255, 239, 0.10)',
    tintBottom: 'rgba(255, 0, 168, 0.34)',
    band: '#0a0618',
    accent: '#00ffe7',
  },
  noir: {
    label: 'Noir',
    sky: ['#8fa3b8', '#4a5a75', '#232c3d', '#0b0e14'],
    sun: '#e8ecf2',
    tintTop: 'rgba(140, 160, 190, 0.08)',
    tintBottom: 'rgba(5, 8, 14, 0.55)',
    band: '#0b0e14',
    accent: '#d8dee9',
  },
  palm: {
    label: 'Palm Gold',
    sky: ['#ffe29a', '#ffb347', '#ff7e5f', '#0f766e'],
    sun: '#fff3c4',
    tintTop: 'rgba(255, 200, 90, 0.12)',
    tintBottom: 'rgba(15, 118, 110, 0.35)',
    band: '#123332',
    accent: '#ffe29a',
  },
};

export const LAYOUTS = {
  trio: { label: 'Vice Trio — hero + two stacked', panels: 3 },
  grid: { label: 'Sunset Grid — four panels', panels: 4 },
  strip: { label: 'Widescreen Strip — hero in the middle', panels: 3 },
  solo: { label: 'Solo Poster — one big photo', panels: 1 },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
};

/** Panel rectangles (in pixels) for a layout at a given canvas size. */
export function layoutPanels(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.012); // gutter
  const band = Math.round(h * 0.20); // title band at the bottom
  const top = h - band;
  const full = (x, y, pw, ph) => ({ x, y, w: pw, h: ph });
  if (layout === 'solo') {
    return [full(g, g, w - 2 * g, top - 2 * g)];
  }
  if (layout === 'grid') {
    const halfW = (w - 3 * g) / 2;
    const halfH = (top - 3 * g) / 2;
    return [
      full(g, g, halfW, halfH),
      full(2 * g + halfW, g, halfW, halfH),
      full(g, 2 * g + halfH, halfW, halfH),
      full(2 * g + halfW, 2 * g + halfH, halfW, halfH),
    ];
  }
  if (layout === 'strip') {
    if (w >= h) {
      const side = (w - 4 * g) * 0.21;
      const mid = w - 2 * side - 4 * g;
      return [
        full(g, g, side, top - 2 * g),
        full(2 * g + side, g, mid, top - 2 * g),
        full(3 * g + side + mid, g, side, top - 2 * g),
      ];
    }
    const heroH = (top - 3 * g) * 0.58;
    const lowH = top - 3 * g - heroH;
    const halfW = (w - 3 * g) / 2;
    return [
      full(g, g, w - 2 * g, heroH),
      full(g, 2 * g + heroH, halfW, lowH),
      full(2 * g + halfW, 2 * g + heroH, halfW, lowH),
    ];
  }
  // trio (default)
  if (w >= h) {
    const heroW = (w - 3 * g) * 0.60;
    const sideW = w - 3 * g - heroW;
    const halfH = (top - 3 * g) / 2;
    return [
      full(g, g, heroW, top - 2 * g),
      full(2 * g + heroW, g, sideW, halfH),
      full(2 * g + heroW, 2 * g + halfH, sideW, halfH),
    ];
  }
  const heroH = (top - 3 * g) * 0.58;
  const lowH = top - 3 * g - heroH;
  const halfW = (w - 3 * g) / 2;
  return [
    full(g, g, w - 2 * g, heroH),
    full(g, 2 * g + heroH, halfW, lowH),
    full(2 * g + halfW, 2 * g + heroH, halfW, lowH),
  ];
}

/** A fresh per-panel photo state: which photo, zoom and drag offset. */
export function freshPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

function drawSkyline(ctx, w, h, grade, bandTop) {
  const sky = ctx.createLinearGradient(0, 0, 0, bandTop);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, bandTop);
  // Low sun with a soft glow, sitting just above the title band.
  const sunR = Math.min(w, h) * 0.11;
  const sunX = w * 0.72;
  const sunY = bandTop - sunR * 0.55;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2.6, sunY - sunR * 2.6, sunR * 5.2, sunR * 5.2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sun slats, the retro sunset look.
  ctx.fillStyle = grade.sky[grade.sky.length - 1];
  for (let i = 0; i < 3; i += 1) {
    const y = sunY + sunR * (0.15 + i * 0.28);
    ctx.fillRect(sunX - sunR, y, sunR * 2, sunR * 0.07);
  }
  // Blocky skyline silhouette along the band line.
  ctx.fillStyle = 'rgba(20, 8, 32, 0.85)';
  let x = 0;
  let seed = 7;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (x < w) {
    const bw = w * (0.04 + next() * 0.06);
    const bh = bandTop * (0.04 + next() * 0.12);
    ctx.fillRect(x, bandTop - bh, bw, bh);
    x += bw + w * 0.008;
  }
  // Two palm silhouettes leaning in from the corners.
  drawPalm(ctx, w * 0.06, bandTop, Math.min(w, h) * 0.16, -0.25);
  drawPalm(ctx, w * 0.94, bandTop, Math.min(w, h) * 0.14, 0.25);
}

function drawPalm(ctx, x, y, size, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = 'rgba(20, 8, 32, 0.9)';
  ctx.fillStyle = 'rgba(20, 8, 32, 0.9)';
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.08, -size * 0.55, size * 0.02, -size);
  ctx.stroke();
  for (let i = 0; i < 6; i += 1) {
    const a = (-Math.PI / 2) + (i - 2.5) * 0.5;
    ctx.beginPath();
    ctx.moveTo(size * 0.02, -size);
    ctx.quadraticCurveTo(
      size * 0.02 + Math.cos(a) * size * 0.45,
      -size + Math.sin(a) * size * 0.45,
      size * 0.02 + Math.cos(a) * size * 0.62,
      -size + Math.sin(a) * size * 0.62 + size * 0.18,
    );
    ctx.lineWidth = size * 0.045;
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws one photo into a clipped panel rect, honouring zoom and drag offset. */
function drawPanelPhoto(ctx, panel, photo, grade) {
  if (!photo) {
    const g = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
    g.addColorStop(0, '#3a2150');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    return;
  }
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(panel.w / iw, panel.h / ih);
  const scale = base * (panel.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const dx = panel.x + (panel.w - pw) / 2 + (panel.ox || 0);
  const dy = panel.y + (panel.h - ph) / 2 + (panel.oy || 0);
  ctx.drawImage(photo, dx, dy, pw, ph);
  // Colour grade: warm wash from the top, deeper wash at the foot, vignette.
  const wash = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  const vg = ctx.createRadialGradient(
    panel.x + panel.w / 2, panel.y + panel.h / 2, Math.min(panel.w, panel.h) * 0.35,
    panel.x + panel.w / 2, panel.y + panel.h / 2, Math.max(panel.w, panel.h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
}

/** Fits text to a width by shrinking the font, then returns the fitted size. */
function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * @param {HTMLCanvasElement} canvas
 * @param {object} state { layout, grade, title, subtitle, titleStyle, titleColor, panels, photos }
 * @param {object} [opts] { selected } — selected panel index, drawn only in the preview.
 */
export function drawCoverArt(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const bandH = Math.round(h * 0.20);
  const bandTop = h - bandH;

  drawSkyline(ctx, w, h, grade, bandTop);

  const panels = layoutPanels(state.layout, w, h);
  const gutter = Math.round(Math.min(w, h) * 0.012);
  panels.forEach((panel, i) => {
    const p = state.panels[i] || freshPanel(0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
    ctx.clip();
    drawPanelPhoto(ctx, panel, state.photos[p.photo] || null, grade);
    ctx.restore();
    // Thick white comic-panel frame.
    ctx.lineWidth = gutter;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    ctx.lineWidth = Math.max(2, gutter * 0.25);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    if (opts.selected === i) {
      ctx.lineWidth = Math.max(3, gutter * 0.5);
      ctx.strokeStyle = grade.accent;
      ctx.setLineDash([Math.round(w * 0.02), Math.round(w * 0.012)]);
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
      ctx.setLineDash([]);
    }
  });

  // Diagonal title band.
  ctx.fillStyle = grade.band;
  ctx.beginPath();
  ctx.moveTo(0, bandTop + bandH * 0.18);
  ctx.lineTo(w, bandTop);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // Accent slash above the band.
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(0, bandTop + bandH * 0.18);
  ctx.lineTo(w, bandTop);
  ctx.lineTo(w, bandTop + Math.max(4, h * 0.008));
  ctx.lineTo(0, bandTop + bandH * 0.18 + Math.max(4, h * 0.008));
  ctx.closePath();
  ctx.fill();

  // Caption lettering.
  const title = (state.title || 'SUNSET HEIST').trim().toUpperCase();
  const family = "'Arial Black', 'Archivo Black', Impact, 'Helvetica Neue', sans-serif";
  const padX = w * 0.045;
  const maxW = w - padX * 2;
  ctx.save();
  ctx.translate(w / 2, bandTop + bandH * 0.50);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const style = state.titleStyle || 'block';
  const size = fitFont(ctx, title, maxW, bandH * 0.44, family, 900);
  if (style === 'outline') {
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = state.titleColor || '#ffffff';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText(title, size * 0.03, size * 0.04);
  } else if (style === 'neon') {
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, 0, 0);
    ctx.shadowBlur = size * 0.12;
    ctx.fillText(title, 0, 0);
    ctx.shadowBlur = 0;
  } else {
    const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, state.titleColor || '#ffffff');
    grad.addColorStop(1, grade.accent);
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.restore();

  // Subtitle and the fictional-city badge.
  const sub = (state.subtitle || '').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (sub) {
    const subSize = fitFont(ctx, sub.toUpperCase(), maxW, bandH * 0.15, "'Helvetica Neue', Arial, sans-serif", 700);
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub.toUpperCase(), w / 2, h - bandH * 0.18);
  }
  ctx.font = `700 ${Math.max(11, bandH * 0.11)}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('NEON COAST', padX, h - bandH * 0.04);
  ctx.textAlign = 'right';
  ctx.fillText('EST. 2026', w - padX, h - bandH * 0.04);

  // Fine grain over the whole cover, for a printed-poster feel.
  ctx.save();
  ctx.globalAlpha = 0.05;
  let seed = 1234567;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = '#ffffff';
  const dots = Math.round((w * h) / 9000);
  for (let i = 0; i < dots; i += 1) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
}
