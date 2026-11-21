// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the finished cover alone at export size.
// Query params pick the scene: layout, grade, size, photo (0 or 1), title,
// subtitle, titleStyle. window.__shotReady is set once the scene is painted.
import { SIZES } from './cover.js';

export async function runShot(shot, query, state, redraw) {
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('titleStyle')) state.titleStyle = query.get('titleStyle');
  if (query.get('photo')) {
    const i = Number(query.get('photo'));
    if (state.photos[i]) state.panels.forEach((p) => { p.photo = i; });
  }
  if (query.get('panelPhoto')) {
    const parts = query.get('panelPhoto').split(',').map(Number);
    parts.forEach((photo, i) => {
      if (state.panels[i] && state.photos[photo]) state.panels[i].photo = photo;
    });
  }
  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;
  document.querySelectorAll('input[name="layout"]').forEach((r) => { r.checked = r.value === state.layout; });
  document.querySelectorAll('input[name="grade"]').forEach((r) => { r.checked = r.value === state.grade; });
  const sizeSelect = document.getElementById('size');
  if (sizeSelect) sizeSelect.value = state.size;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
