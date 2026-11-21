// Vice City Cover Studio — editor wiring.
//
// Loads the sample photos (or the user's own uploads), keeps one state object
// for the whole cover, redraws the live preview on every change, lets the
// user drag each panel's photo into place, and exports a full-size PNG in
// 1080 × 1080, 1080 × 1350 or 1920 × 1080. A `?shot=` query sets up a fixed
// scene for a screenshot instead (see shots.js).
import { drawCoverArt, layoutPanels, freshPanel, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const thumbsEl = $('thumbs');

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'One last ride down Ocean Drive',
  titleStyle: 'block',
  titleColor: '#ffffff',
  panels: [freshPanel(0), freshPanel(1), freshPanel(0)],
  photos: [],
};
let selected = 0;
let drag = null;

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push(freshPanel(0));
  state.panels.length = n;
  if (selected >= n) selected = 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function resizePreview() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.aspectRatio = `${size.w} / ${size.h}`;
}

function redraw() {
  ensurePanels();
  resizePreview();
  // No selection outline on the finished cover shown by ?shot=cover.
  const showSelection = !document.body.classList.contains('shot-cover');
  drawCoverArt(canvas, state, { selected: showSelection ? selected : undefined });
  renderThumbs();
  renderPanelControls();
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `Use photo ${i + 1} in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.currentSrc;
    img.alt = photo.label;
    button.appendChild(img);
    const label = document.createElement('span');
    label.textContent = photo.label;
    button.appendChild(label);
    if (photo.isDemo) {
      const badge = document.createElement('span');
      badge.className = 'demo-badge';
      badge.textContent = 'Demo';
      button.appendChild(badge);
      button.title = `Demo photo ${i + 1} — replace with your own images`;
    }
    button.addEventListener('click', () => {
      state.panels[selected].photo = i;
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      redraw();
      setStatus(`Photo ${i + 1} placed in panel ${selected + 1}.`);
    });
    thumbsEl.appendChild(button);
  });
}

function renderPanelControls() {
  $('panelLabel').textContent = `Panel ${selected + 1} of ${panelCount()}`;
  const p = state.panels[selected];
  $('zoom').value = String(p.zoom);
  $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panelPhoto').textContent = state.photos[p.photo] ? state.photos[p.photo].label : '—';
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.classList.remove('toast', 'toast-error');
  if (kind === 'error') statusEl.classList.add('toast-error');
  else if (kind === 'toast') statusEl.classList.add('toast');
}

const EXPORT_FAILED = 'Export failed — please try again. Your photos and settings are unchanged, and nothing was uploaded.';

/** Exports the current cover at full size and downloads it as a PNG. */
export function exportCover(sizeKey) {
  const size = SIZES[sizeKey];
  if (!size) {
    setStatus(EXPORT_FAILED, 'error');
    return Promise.resolve(null);
  }
  try {
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCoverArt(off, state);
    return new Promise((resolve) => {
      try {
        off.toBlob((blob) => {
          if (!blob) {
            setStatus(EXPORT_FAILED, 'error');
            resolve(null);
            return;
          }
          try {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
            setStatus(`PNG exported · ${size.w} × ${size.h}`, 'toast');
            resolve(a.download);
          } catch {
            setStatus(EXPORT_FAILED, 'error');
            resolve(null);
          }
        }, 'image/png');
      } catch {
        setStatus(EXPORT_FAILED, 'error');
        resolve(null);
      }
    });
  } catch {
    setStatus(EXPORT_FAILED, 'error');
    return Promise.resolve(null);
  }
}

// ---- Controls ----
document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => { state.layout = radio.value; redraw(); });
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => { state.grade = radio.value; redraw(); });
});
$('size').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleStyle').addEventListener('change', (e) => { state.titleStyle = e.target.value; redraw(); });
$('titleColor').addEventListener('input', (e) => { state.titleColor = e.target.value; redraw(); });
$('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redraw();
});
$('fillAll').addEventListener('click', () => {
  const p = state.panels[selected];
  state.panels.forEach((panel) => {
    panel.photo = p.photo;
    panel.zoom = p.zoom;
    panel.ox = 0;
    panel.oy = 0;
  });
  redraw();
  setStatus('The selected photo now fills every panel.');
});
$('resetPanel').addEventListener('click', () => {
  state.panels[selected] = freshPanel(state.panels[selected].photo);
  redraw();
});
$('addPhotos').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      state.photos.push(Object.assign(img, { label: file.name }));
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  redraw();
  setStatus(`${files.length} photo(s) added. Click a thumbnail to place it.`);
});
document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', () => {
    Promise.resolve(exportCover(button.dataset.export)).catch(() => {
      setStatus(EXPORT_FAILED, 'error');
    });
  });
});

// ---- Drag to position: pointer down on a panel selects it, dragging pans it. ----
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = panels.findIndex((p) => point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h);
  if (hit === -1) return;
  selected = hit;
  const panel = state.panels[hit];
  drag = { x: point.x, y: point.y, ox: panel.ox, oy: panel.oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const point = canvasPoint(e);
  const panel = state.panels[selected];
  panel.ox = drag.ox + (point.x - drag.x);
  panel.oy = drag.oy + (point.y - drag.y);
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  setStatus(`Panel ${selected + 1} positioned. Drag again to move it, or use the zoom slider.`);
});

// ---- Boot: sample photos first so the app works with a photo out of the box. ----
async function boot() {
  const shot = new URLSearchParams(location.search).get('shot');
  const samples = [
    { url: 'samples/pier.jpg', name: 'Pier sunset' },
    { url: 'samples/boulevard.jpg', name: 'Boulevard' },
  ];
  for (const sample of samples) {
    try {
      const img = await loadImage(sample.url);
      state.photos.push(Object.assign(img, { label: sample.name, isDemo: true }));
    } catch {
      // A missing sample still leaves the editor usable with uploads.
    }
  }
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, redraw);
  }
  redraw();
}

boot();
