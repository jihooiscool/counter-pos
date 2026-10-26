// Single-series SVG bar chart: one hue, 4px rounded data-ends on the baseline,
// recessive grid, only the peak bar direct-labeled, per-bar hover/tap tooltip.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Axis max = 4 gridline steps, each a round number (1/2/2.5/5 × 10^n).
function niceMax(v) {
  if (v <= 0) return 4;
  const raw = v / 4, p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p * 4;
  return 40 * p;
}

function barPath(x, y, w, base, r) {
  const h = base - y;
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/**
 * @param {{labels:string[], values:number[], tips:string[], fmtAxis:(n:number)=>string,
 *          fmtValue:(n:number)=>string, highlight?:number, labelEvery?:number}} o
 */
export function barChart(o) {
  const W = 640, H = 240, padL = 52, padR = 8, padT = 26, padB = 30;
  const n = o.values.length;
  const max = niceMax(Math.max(...o.values, 0));
  const plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
  const slot = plotW / n;
  const gap = Math.max(2, slot * 0.25);
  const bw = Math.max(2, slot - gap);
  const every = o.labelEvery || 1;
  const peak = o.values.indexOf(Math.max(...o.values));

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, y = base - (v / max) * plotH;
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="${i ? 'grid' : 'axis'}"/>`
      + `<text x="${padL - 8}" y="${y + 4}" class="tick" text-anchor="end">${esc(o.fmtAxis(v))}</text>`;
  }

  let bars = '';
  o.values.forEach((v, i) => {
    const x = padL + i * slot + gap / 2;
    const y = base - (v / max) * plotH;
    const cls = i === o.highlight ? 'bar now' : 'bar';
    bars += `<g class="hit" data-tip="${esc(o.tips[i])}">`
      + `<rect x="${padL + i * slot}" y="${padT}" width="${slot}" height="${plotH + padB}" fill="transparent"/>`
      + (v > 0 ? `<path d="${barPath(x, y, bw, base, 4)}" class="${cls}"/>` : '')
      + `</g>`;
    if (i % every === 0 || i === n - 1) {
      bars += `<text x="${x + bw / 2}" y="${H - 8}" class="tick" text-anchor="middle">${esc(o.labels[i])}</text>`;
    }
    if (i === peak && v > 0) {
      bars += `<text x="${x + bw / 2}" y="${y - 8}" class="peak" text-anchor="middle">${esc(o.fmtValue(v))}</text>`;
    }
  });

  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${grid}${bars}</svg><div class="chart-tip" hidden></div></div>`;
}

export function bindChartTips(root) {
  root.querySelectorAll('.chart').forEach(chart => {
    const tip = chart.querySelector('.chart-tip');
    const show = e => {
      const g = e.target.closest('.hit');
      chart.querySelectorAll('.hit.on').forEach(el => el.classList.remove('on'));
      if (!g) { tip.hidden = true; return; }
      g.classList.add('on');
      tip.textContent = g.dataset.tip;
      tip.hidden = false;
      const r = chart.getBoundingClientRect();
      const gr = g.getBoundingClientRect();
      const x = Math.min(Math.max(gr.left + gr.width / 2 - r.left, 70), r.width - 70);
      tip.style.left = `${x}px`;
    };
    chart.addEventListener('pointermove', show);
    chart.addEventListener('pointerdown', show);
    chart.addEventListener('pointerleave', () => {
      tip.hidden = true;
      chart.querySelectorAll('.hit.on').forEach(el => el.classList.remove('on'));
    });
  });
}
