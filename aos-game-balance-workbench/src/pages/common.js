export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const fmt = (v, d = 1) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: d }) : '—';
export const pct = (v, d = 1) => Number.isFinite(Number(v)) ? `${fmt(v, d)}%` : '—';
export const status = (kind, label = kind) => `<span class="state ${kind.toLowerCase().replaceAll(' ', '-')}">${esc(label)}</span>`;
export const card = (label, value, sub = '', className = '') => `<article class="metric-card"><div class="metric-label">${esc(label)}</div><div class="metric-value ${className}">${value}</div><div class="metric-sub">${sub}</div></article>`;
export const heading = (title, desc, actions = '') => `<div class="section-heading"><div><div class="eyebrow">AOS / BALANCE WORKSPACE</div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><div class="toolbar">${actions}</div></div>`;
export function panel(title, body, extra = '') { return `<section class="panel"><div class="panel-header"><h3>${esc(title)}</h3>${extra}</div>${body}</section>`; }
export function control(label, key, value, type = 'number', opts = {}) {
  if (type === 'select') return `<label class="field">${esc(label)}<select class="control" data-config="${esc(key)}">${opts.options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  if (type === 'checkbox') return `<label class="field"><span>${esc(label)}</span><input type="checkbox" data-config="${esc(key)}" ${value ? 'checked' : ''}></label>`;
  return `<label class="field">${esc(label)}<input class="control" data-config="${esc(key)}" type="${type}" value="${esc(value)}" min="${opts.min ?? ''}" max="${opts.max ?? ''}" step="${opts.step ?? 'any'}"></label>`;
}
export function table(headers, rows, opts = {}) {
  if (!rows.length) return '<div class="empty">No rows match the current filters.</div>';
  return `<div class="table-wrap" ${opts.maxHeight ? `style="max-height:${opts.maxHeight}"` : ''}><table class="data-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
export function canvas(id, label = '') { return `<canvas class="chart" id="${esc(id)}" role="img" aria-label="${esc(label)}"></canvas>`; }
export function chartPanel(title, id, label, note = '') { return panel(title, `${canvas(id, label)}<div class="chart-desc">${esc(note)}</div>`); }
export function barChart(canvasId, values, labels, color = '#d8b979') {
  const canvasEl = document.getElementById(canvasId); if (!canvasEl) return;
  const dpr = window.devicePixelRatio || 1, rect = canvasEl.getBoundingClientRect();
  const w = Math.max(320, rect.width), h = Math.max(150, rect.height);
  canvasEl.width = w * dpr; canvasEl.height = h * dpr;
  const ctx = canvasEl.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  const max = Math.max(1, ...values.map(v => Number.isFinite(v) ? v : 0)), pad = { l: 42, r: 8, t: 12, b: 27 }, innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  ctx.strokeStyle = '#394347'; ctx.fillStyle = '#98a3a2'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const y = pad.t + innerH * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(fmt(max * (4 - i) / 4, 0), pad.l - 5, y + 3); }
  const bw = Math.max(2, innerW / values.length * .72), gap = innerW / values.length;
  values.forEach((v, i) => { const bh = innerH * Math.max(0, v) / max, x = pad.l + gap * i + (gap - bw) / 2, y = pad.t + innerH - bh; ctx.fillStyle = color; ctx.fillRect(x, y, bw, bh); if (values.length < 15 || i % Math.ceil(values.length / 10) === 0) { ctx.fillStyle = '#aab3af'; ctx.textAlign = 'center'; ctx.fillText(labels[i] || '', x + bw / 2, h - 8); } });
}
export function lineChart(canvasId, series, labels = []) {
  const el = document.getElementById(canvasId); if (!el) return;
  const dpr = window.devicePixelRatio || 1, rect = el.getBoundingClientRect(), w = Math.max(320, rect.width), h = Math.max(150, rect.height); el.width = w * dpr; el.height = h * dpr;
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  const max = Math.max(1, ...series.flatMap(s => s.values).filter(Number.isFinite)), pad = { l: 42, r: 9, t: 13, b: 24 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  ctx.strokeStyle = '#374247'; ctx.fillStyle = '#9aa5a4'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const y = pad.t + ih * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(fmt(max * (4 - i) / 4, 0), pad.l - 4, y + 3); }
  const colors = ['#d8b979', '#78bea1', '#89b9cf', '#dd8e7e', '#ae9bd1'];
  series.forEach((s, si) => { ctx.beginPath(); s.values.forEach((v, i) => { const x = pad.l + iw * i / Math.max(1, s.values.length - 1), y = pad.t + ih - ih * (Number(v) || 0) / max; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = colors[si % colors.length]; ctx.lineWidth = 2; ctx.stroke(); });
  ctx.textAlign = 'left'; ctx.fillStyle = '#9aa5a4'; if (labels.length) { ctx.fillText(labels[0], pad.l, h - 7); ctx.textAlign = 'right'; ctx.fillText(labels.at(-1), w - pad.r, h - 7); }
}
export function csv(rows) { if (!rows.length) return ''; const keys = Object.keys(rows[0]); const q = v => `"${String(v ?? '').replaceAll('"', '""')}"`; return '\ufeff' + [keys.map(q).join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\r\n'); }
export function download(name, content, mime = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1200); }
