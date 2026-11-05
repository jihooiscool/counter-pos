import { db } from './db.js';
import { t, setLang, getLang, locale, LANGS, detectLang } from './i18n.js';
import { barChart, bindChartTips } from './chart.js';
import { wake } from './wake.js';

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = n => Math.round(n * 100) / 100;
const DAY = 86400000;

const EMOJIS = ['🍙', '🍜', '🍲', '🍛', '🍚', '🍱', '🥟', '🍢', '🍤', '🍗', '🍖', '🥩', '🌭', '🍔', '🍟', '🍕',
  '🥪', '🌮', '🥗', '🍳', '🥞', '🧇', '🍞', '🥐', '🍩', '🍰', '🧁', '🍦', '🍧', '🍡', '☕', '🍵', '🧋', '🥤',
  '🍺', '🍶', '🧃', '🥛', '🍊', '🍽️'];
const COLORS = ['#FFF1CC', '#FFE0DB', '#DDF2E0', '#DCE9FF', '#EEE2FF', '#FFFFFF'];
const CURRENCIES = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'CAD', 'AUD', 'VND', 'THB', 'PHP'];
const BILLS = {
  KRW: [1000, 5000, 10000, 50000], JPY: [100, 500, 1000, 5000, 10000],
  VND: [10000, 50000, 100000, 500000], default: [1, 5, 10, 20, 50, 100],
};
const NAV = [['register', '🧮'], ['prep', '🍳'], ['menu', '📋'], ['sales', '📊'], ['settings', '⚙️']];
const LATE_MIN = 15; // a preparing order waiting longer than this is highlighted

const S = {
  profiles: [], profile: null, menu: [], cart: [],
  prep: [], // [{ orderId, ticket, createdAt, items: [{ name, qty, done }] }], oldest first
  ticket: { day: '', n: 0 }, // daily order number, restarts at #1 each day
  view: 'register', cartOpen: false,
  report: { mode: 'day', anchor: Date.now(), showAll: false },
  persisted: false,
};
const pid = () => S.profile.id;
const cfg = () => S.profile.settings;
const prepOn = () => cfg().prepList !== false; // profiles saved before this setting existed default to on

function money(n, cur = cfg().currency) {
  if (cur === 'KRW' && getLang() === 'ko') return `${Math.round(n).toLocaleString('ko-KR')}원`;
  return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur }).format(n);
}
const compact = n => new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtDate = (d, o) => new Intl.DateTimeFormat(locale(), o).format(d);
const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

function art(m) {
  return m.image ? `<img src="${m.image}" alt="">` : `<span class="emoji">${m.emoji || '🍽️'}</span>`;
}

// ---------- persistence ----------
const saveProfile = () => db.put('profiles', S.profile);
const saveProfileSoon = debounce(saveProfile, 400);
const cartKey = (id = pid()) => `cart:${id}`;
const saveCart = () => db.put('kv', S.cart, cartKey());
const prepKey = (id = pid()) => `prep:${id}`;
const ticketKey = (id = pid()) => `ticket:${id}`;
const savePrep = () => db.put('kv', S.prep, prepKey());

function sortMenu() {
  S.menu.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.name.localeCompare(b.name));
}

function makeProfile(name, settings) {
  return {
    id: uid(), name, createdAt: Date.now(),
    settings: { lang: 'ko', currency: 'KRW', fontScale: 1.2, tileSize: 'md', keepAwake: true, prepList: true, ...settings },
  };
}

const SAMPLE = [
  [1, '김밥', 'Gimbap', 3500, '🍙', 0, '', ''], [2, '참치김밥', 'Tuna gimbap', 4500, '🍙', 0, '', ''],
  [3, '라면', 'Ramyeon', 4500, '🍜', 1, '', ''], [4, '떡볶이', 'Tteokbokki', 5000, '🍢', 1, '매콤달콤', 'sweet & spicy'],
  [5, '순대', 'Sundae', 5000, '🍖', 4, '', ''], [6, '튀김', 'Fritters', 3000, '🍤', 0, '모둠 3개', 'mixed, 3 pcs'],
  [7, '어묵', 'Fish cake', 1500, '🍢', 3, '', ''], [8, '콜라', 'Cola', 2000, '🥤', 2, '', ''],
];
function sampleMenu(profile) {
  const ko = profile.settings.lang === 'ko';
  return SAMPLE.map(([number, nk, ne, price, emoji, c, dk, de]) => ({
    id: uid(), profileId: profile.id, number, name: ko ? nk : ne, desc: ko ? dk : de,
    price: profile.settings.currency === 'KRW' ? price : price / 1000,
    emoji, image: null, color: COLORS[c], active: true, createdAt: Date.now(),
  }));
}

async function loadProfile(p) {
  S.profile = p;
  setLang(p.settings.lang);
  applyScale();
  S.menu = await db.byIndex('menu', 'profileId', p.id);
  sortMenu();
  const cart = (await db.get('kv', cartKey(p.id))) || [];
  S.cart = cart.filter(l => S.menu.some(m => m.id === l.menuId));
  S.cartOpen = false;
  S.prep = (await db.get('kv', prepKey(p.id))) || [];
  S.ticket = (await db.get('kv', ticketKey(p.id))) || { day: '', n: 0 };
  await db.put('kv', p.id, 'activeProfile');
  wake.set(p.settings.keepAwake);
}

function applyScale() {
  document.documentElement.style.setProperty('--scale', cfg().fontScale);
}

// ---------- shell ----------
function render() {
  const big = getLang() === 'ko' ? '가' : 'A';
  if (S.view === 'prep' && !prepOn()) S.view = 'register';
  const nav = NAV.filter(([v]) => v !== 'prep' || prepOn());
  $('#app').innerHTML = `
    <header class="topbar">
      <button class="store-btn" data-action="profiles"><span>🏪</span><span class="store-name">${esc(S.profile.name)}</span><span class="caret">▾</span></button>
      <span class="wake-ind" title="${t('wake.on')}" ${wake.active ? '' : 'hidden'}>☀︎</span>
      <div class="font-ctl" role="group">
        <button data-action="font" data-d="-1" aria-label="${t('font.smaller')}">${big}<small>−</small></button>
        <button data-action="font" data-d="1" aria-label="${t('font.bigger')}">${big}<small>+</small></button>
      </div>
    </header>
    <nav class="tabs">${nav.map(([v, ico]) => `
      <button data-action="nav" data-view="${v}" class="${S.view === v ? 'on' : ''}"><span class="ico">${ico}</span><span>${t(`nav.${v}`)}</span>${v === 'prep' ? '<span class="tab-badge" data-prep-badge hidden></span>' : ''}</button>`).join('')}
    </nav>
    <main id="view" class="view-${S.view}"></main>`;
  document.title = t('appName');
  updatePrepBadge();
  renderView();
}

function renderView() {
  const el = $('#view');
  ({ register: renderRegister, prep: renderPrep, menu: renderMenu, sales: renderSales, settings: renderSettings })[S.view](el);
}

function updatePrepBadge() {
  const b = $('[data-prep-badge]');
  if (!b) return;
  b.hidden = !S.prep.length;
  b.textContent = S.prep.length;
}

function go(view) {
  S.view = view;
  db.put('kv', view, 'lastView');
  render();
}

// ---------- register ----------
const cartLines = () => S.cart.map(l => ({ ...l, item: S.menu.find(m => m.id === l.menuId) })).filter(l => l.item);
const cartTotal = () => round2(cartLines().reduce((s, l) => s + l.item.price * l.qty, 0));
const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);

function renderRegister(el) {
  const items = S.menu.filter(m => m.active !== false);
  el.innerHTML = `
    <section class="reg-main">
      ${items.length ? `
        <div class="reg-toolbar"><button class="btn ghost" data-action="numpad">🔢 ${t('reg.byNumber')}</button></div>
        <div class="tiles tiles-${cfg().tileSize}">${items.map(m => `
          <button class="tile" data-action="add" data-id="${m.id}" style="--tile:${m.color || '#fff'}">
            ${m.number != null ? `<span class="tile-no">${m.number}</span>` : ''}
            <span class="tile-qty" data-qty="${m.id}" hidden></span>
            <span class="tile-art">${art(m)}</span>
            <span class="tile-name">${esc(m.name)}</span>
            ${m.desc ? `<span class="tile-desc">${esc(m.desc)}</span>` : ''}
            <span class="tile-price">${money(m.price)}</span>
          </button>`).join('')}
        </div>` : `
        <div class="empty">${t('reg.empty')}<br><button class="btn primary" data-action="nav" data-view="menu">${t('reg.addMenu')}</button></div>`}
    </section>
    <aside class="cart" id="cart"></aside>`;
  renderCart();
}

function renderCart() {
  const el = $('#cart');
  if (!el) return;
  const lines = cartLines(), count = cartCount();
  el.className = `cart${S.cartOpen ? ' open' : ''}`;
  el.innerHTML = `
    <div class="cart-head">
      <h2>${t('cart.title')} <span class="count">${t('cart.items', { n: count })}</span></h2>
      ${lines.length ? `<button class="btn ghost danger small" data-action="clear-cart">${t('cart.clear')}</button>` : ''}
      <button class="btn ghost small cart-toggle" data-action="toggle-cart" ${lines.length ? '' : 'hidden'}>${S.cartOpen ? `${t('cart.hide')} ▾` : `${t('cart.show')} ▴`}</button>
    </div>
    <ul class="cart-lines">${lines.length ? lines.map(l => `
      <li>
        <div class="cl-name">${esc(l.item.name)}<small>${money(l.item.price)}</small></div>
        <div class="stepper">
          <button data-action="dec" data-id="${l.menuId}" aria-label="${t('cart.remove')}">−</button>
          <span class="qty">${l.qty}</span>
          <button data-action="inc" data-id="${l.menuId}" aria-label="${t('cart.add')}">+</button>
        </div>
        <div class="cl-sum">${money(l.item.price * l.qty)}</div>
      </li>`).join('') : `<li class="cart-empty">👆 ${t('cart.empty')}</li>`}
    </ul>
    <div class="cart-foot">
      <div class="total-row"><span>${t('cart.total')}</span><strong class="total">${money(cartTotal())}</strong></div>
      <button class="btn pay" data-action="pay" ${lines.length ? '' : 'disabled'}>${t('cart.pay')}</button>
    </div>`;
  document.querySelectorAll('[data-qty]').forEach(b => {
    const l = S.cart.find(c => c.menuId === b.dataset.qty);
    b.hidden = !l;
    if (l) b.textContent = `×${l.qty}`;
  });
}

async function changeQty(id, d) {
  const line = S.cart.find(c => c.menuId === id);
  if (line) {
    line.qty += d;
    if (line.qty <= 0) S.cart = S.cart.filter(c => c !== line);
  } else if (d > 0) {
    S.cart.push({ menuId: id, qty: d });
  }
  if (!S.cart.length) S.cartOpen = false;
  renderCart();
  await saveCart();
}

function openNumpad() {
  let buf = '';
  const m = openModal(`
    <h2>${t('np.title')}</h2>
    <div class="np-display"><span class="np-num"></span><span class="np-match">${t('np.hint')}</span></div>
    <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join('')}
      <button data-k="C" class="alt">C</button><button data-k="0">0</button><button data-k="B" class="alt">⌫</button></div>
    <div class="modal-actions"><button class="btn ghost" data-close>${t('common.close')}</button><button class="btn primary np-ok" disabled>${t('np.add')}</button></div>`,
    { cls: 'np-modal', onKey: e => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('B');
      else if (e.key === 'Enter') ok();
    } });
  const found = () => S.menu.find(x => x.active !== false && String(x.number) === buf);
  const show = (msg) => {
    const f = found();
    $('.np-num', m).textContent = buf;
    $('.np-match', m).textContent = msg ?? (buf ? (f ? `${f.name} · ${money(f.price)}` : t('np.notFound')) : t('np.hint'));
    $('.np-match', m).classList.toggle('bad', !!buf && !f && !msg);
    $('.np-ok', m).disabled = !f;
  };
  const press = k => {
    if (k === 'C') buf = '';
    else if (k === 'B') buf = buf.slice(0, -1);
    else if (buf.length < 4) buf += k;
    show();
  };
  const ok = () => {
    const f = found();
    if (!f) return;
    changeQty(f.id, 1);
    buf = '';
    show(`✓ ${f.name} +1`);
  };
  m.addEventListener('click', e => {
    const k = e.target.closest('[data-k]');
    if (k) press(k.dataset.k);
    if (e.target.closest('.np-ok')) ok();
  });
}

function openPay() {
  const total = cartTotal();
  const bills = BILLS[cfg().currency] || BILLS.default;
  let received = 0;
  const m = openModal(`
    <h2>${t('pay.title')}</h2>
    <div class="pay-total"><span>${t('pay.total')}</span><strong>${money(total)}</strong></div>
    <div class="pay-step1">
      <div class="pay-methods">
        <button class="btn method" data-m="card"><span class="big-ico">💳</span>${t('pay.card')}</button>
        <button class="btn method" data-m="cash"><span class="big-ico">💵</span>${t('pay.cash')}</button>
      </div>
      <div class="modal-actions"><button class="btn ghost" data-close>${t('common.cancel')}</button></div>
    </div>
    <div class="pay-cash" hidden>
      <div class="cash-rows">
        <div><span>${t('pay.received')}</span><strong class="recv"></strong></div>
        <div class="change-row"><span class="change-label"></span><strong class="change"></strong></div>
      </div>
      <div class="bills">${bills.map(b => `<button class="btn bill" data-b="${b}">+${money(b)}</button>`).join('')}
        <button class="btn bill" data-exact>${t('pay.exact')}</button><button class="btn bill ghost" data-reset>${t('pay.reset')}</button></div>
      <div class="modal-actions"><button class="btn ghost" data-back>${t('pay.back')}</button><button class="btn pay cash-done">${t('pay.done')}</button></div>
    </div>`, { cls: 'pay-modal' });
  const update = () => {
    const diff = round2(received - total);
    $('.recv', m).textContent = money(received);
    const short = received > 0 && diff < 0;
    $('.change-label', m).textContent = short ? '' : t('pay.change');
    $('.change', m).textContent = received === 0 ? '—' : short ? t('pay.short', { amount: money(-diff) }) : money(diff);
    $('.change-row', m).classList.toggle('bad', short);
    $('.cash-done', m).disabled = short;
  };
  m.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.m === 'card') completeSale('card', null);
    else if (b.dataset.m === 'cash') { $('.pay-step1', m).hidden = true; $('.pay-cash', m).hidden = false; update(); }
    else if (b.dataset.b) { received = round2(received + +b.dataset.b); update(); }
    else if ('exact' in b.dataset) { received = total; update(); }
    else if ('reset' in b.dataset) { received = 0; update(); }
    else if ('back' in b.dataset) { $('.pay-step1', m).hidden = false; $('.pay-cash', m).hidden = true; }
    else if (b.classList.contains('cash-done')) completeSale('cash', received || null);
  });
}

async function completeSale(method, received) {
  const lines = cartLines();
  if (!lines.length) return;
  const today = new Date().toLocaleDateString('sv');
  const ticket = { day: today, n: S.ticket.day === today ? S.ticket.n + 1 : 1 };
  const order = {
    id: uid(), profileId: pid(), createdAt: Date.now(), method, received, voided: false, ticket: ticket.n,
    items: lines.map(l => ({ menuId: l.menuId, number: l.item.number ?? null, name: l.item.name, price: l.item.price, qty: l.qty })),
    total: cartTotal(),
  };
  const prevCart = S.cart;
  const key = cartKey(), pKey = prepKey();
  const prep = prepOn()
    ? [...S.prep, { orderId: order.id, ticket: ticket.n, createdAt: order.createdAt, items: order.items.map(i => ({ name: i.name, qty: i.qty, done: false })) }]
    : S.prep;
  // Order, emptied cart, preparing list and order number commit together,
  // so a crash can never double-count, lose a sale, or drop it from the kitchen list.
  await db.batch([
    { store: 'orders', value: order },
    { store: 'kv', key, value: [] },
    { store: 'kv', key: pKey, value: prep },
    { store: 'kv', key: ticketKey(), value: ticket },
  ]);
  S.cart = [];
  S.cartOpen = false;
  S.prep = prep;
  S.ticket = ticket;
  closeModal();
  renderCart();
  updatePrepBadge();
  navigator.vibrate?.(30);
  toast(t('sale.done', { ticket: ticket.n, amount: money(order.total) }), {
    label: t('sale.undo'),
    fn: async () => {
      const restPrep = ((await db.get('kv', pKey)) || []).filter(p => p.orderId !== order.id);
      await db.batch([{ store: 'orders', del: order.id }, { store: 'kv', key, value: prevCart }, { store: 'kv', key: pKey, value: restPrep }]);
      if (S.profile.id === order.profileId) {
        S.cart = prevCart;
        S.prep = restPrep;
        renderCart();
        updatePrepBadge();
        if (S.view === 'prep' || S.view === 'sales') renderView();
      }
      toast(t('sale.undone'));
    },
  }, 8000);
}

// ---------- preparing list ----------
function minutesAgo(ts) {
  const n = Math.floor((Date.now() - ts) / 60000);
  return n < 1 ? t('prep.justNow') : t('prep.ago', { n });
}

function renderPrep(el) {
  el.innerHTML = `
    <div class="page prep-page">
      <div class="page-head"><h1>${t('prep.title')}</h1></div>
      ${S.prep.length ? `<div class="prep-grid">${S.prep.map(p => {
        const done = p.items.filter(i => i.done).length;
        const ready = done === p.items.length;
        const late = !ready && Date.now() - p.createdAt > LATE_MIN * 60000;
        return `
          <article class="prep-card${ready ? ' ready' : ''}${late ? ' late' : ''}">
            <header>
              <strong class="ticket">#${p.ticket}</strong>
              <span class="prep-time">${fmtDate(new Date(p.createdAt), { hour: '2-digit', minute: '2-digit' })} · ${minutesAgo(p.createdAt)}</span>
              <span class="prep-count">${done}/${p.items.length}</span>
            </header>
            <ul>${p.items.map((i, idx) => `
              <li><button class="check${i.done ? ' on' : ''}" data-action="prep-check" data-id="${p.orderId}" data-i="${idx}" aria-pressed="${i.done}">
                <span class="box">${i.done ? '✓' : ''}</span><span class="pi-name">${esc(i.name)}</span><span class="pi-qty">×${i.qty}</span>
              </button></li>`).join('')}
            </ul>
            <footer>${ready
              ? `<button class="btn pay" data-action="prep-finish" data-id="${p.orderId}">✓ ${t('prep.done')}</button>`
              : `<button class="btn ghost danger small" data-action="prep-remove" data-id="${p.orderId}">${t('prep.remove')}</button>`}
            </footer>
          </article>`;
      }).join('')}</div>` : `<p class="empty">✅ ${t('prep.empty')}</p>`}
    </div>`;
}

async function togglePrepItem(id, idx) {
  const p = S.prep.find(x => x.orderId === id);
  if (!p) return;
  p.items[idx].done = !p.items[idx].done;
  renderView();
  await savePrep();
}

async function removePrep(id, ask) {
  const at = S.prep.findIndex(x => x.orderId === id);
  if (at < 0) return;
  const p = S.prep[at];
  if (ask && !(await dialog({ message: t('prep.removeConfirm', { ticket: p.ticket }), ok: t('prep.remove'), danger: true }))) return;
  S.prep = S.prep.filter(x => x !== p);
  const profileId = pid();
  await savePrep();
  updatePrepBadge();
  if (S.view === 'prep') renderView();
  toast(t('prep.removed', { ticket: p.ticket }), {
    label: t('sale.undo'),
    fn: async () => {
      if (pid() !== profileId) return;
      S.prep = [...S.prep];
      S.prep.splice(Math.min(at, S.prep.length), 0, p);
      await savePrep();
      updatePrepBadge();
      if (S.view === 'prep') renderView();
    },
  }, 6000);
}

// ---------- menu ----------
function renderMenu(el) {
  el.innerHTML = `
    <div class="page">
      <div class="page-head"><h1>${t('menu.title')}</h1><button class="btn primary" data-action="menu-new">＋ ${t('menu.add')}</button></div>
      ${S.menu.length ? `<ul class="menu-list">${S.menu.map(m => `
        <li class="${m.active === false ? 'off' : ''}" data-action="menu-edit" data-id="${m.id}">
          <span class="ml-no">${m.number ?? ''}</span>
          <span class="ml-art" style="--tile:${m.color || '#fff'}">${art(m)}</span>
          <span class="ml-main"><strong>${esc(m.name)}</strong>${m.desc ? `<small>${esc(m.desc)}</small>` : ''}
            ${m.active === false ? `<em class="badge">${t('menu.soldOut')}</em>` : ''}</span>
          <span class="ml-price">${money(m.price)}</span>
          <span class="btn ghost small">✏️ ${t('menu.edit')}</span>
        </li>`).join('')}</ul>` : `<p class="empty">${t('menu.empty')}</p>`}
    </div>`;
}

function openEditor(src) {
  const isNew = !S.menu.some(m => m.id === src.id);
  const nextNo = Math.max(0, ...S.menu.map(m => +m.number || 0)) + 1;
  const d = { id: uid(), number: nextNo, name: '', price: '', desc: '', emoji: '🍙', image: null, color: COLORS[0], active: true, ...src };
  const draftKey = `draft:${pid()}`;
  const m = openModal(`
    <h2>${isNew ? t('menu.add') : t('menu.edit')}</h2>
    <form class="form" novalidate>
      <div class="row2">
        <label class="f-no">${t('menu.number')}<input name="number" type="number" inputmode="numeric" min="0" value="${d.number ?? ''}"></label>
        <label class="f-grow">${t('menu.name')}<input name="name" value="${esc(d.name)}" autocomplete="off"></label>
      </div>
      <label>${t('menu.price')}<input name="price" type="number" inputmode="decimal" min="0" step="any" value="${d.price}"></label>
      <label>${t('menu.desc')}<input name="desc" maxlength="40" placeholder="${t('menu.descPh')}" value="${esc(d.desc)}" autocomplete="off"></label>
      <fieldset><legend>${t('menu.icon')}</legend>
        <div class="art-row">
          <div class="art-preview"></div>
          <div class="art-btns">
            <label class="btn ghost">📷 ${t('menu.choosePhoto')}<input type="file" accept="image/*" name="photo" hidden></label>
            <button type="button" class="btn ghost danger rm-photo">${t('menu.removePhoto')}</button>
          </div>
        </div>
        <div class="emoji-grid">${EMOJIS.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
      </fieldset>
      <fieldset><legend>${t('menu.color')}</legend>
        <div class="color-row">${COLORS.map(c => `<button type="button" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
      </fieldset>
      <label class="switch"><input type="checkbox" name="active" ${d.active !== false ? 'checked' : ''}><span class="knob"></span><span>${t('menu.onSale')}</span></label>
      <p class="form-err" hidden></p>
      <div class="modal-actions">
        ${isNew ? '' : `<button type="button" class="btn ghost danger del">🗑 ${t('menu.delete')}</button>`}
        <span class="sp"></span>
        <button type="button" class="btn ghost" data-close>${t('menu.cancel')}</button>
        <button type="submit" class="btn primary">${t('menu.save')}</button>
      </div>
    </form>`, { cls: 'editor', sticky: true, onClose: () => db.del('kv', draftKey) });
  const form = $('form', m);

  const paint = () => {
    $('.art-preview', m).innerHTML = art(d);
    $('.art-preview', m).style.setProperty('--tile', d.color);
    $('.rm-photo', m).hidden = !d.image;
    m.querySelectorAll('[data-emoji]').forEach(b => b.classList.toggle('on', !d.image && b.dataset.emoji === d.emoji));
    m.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('on', b.dataset.color === d.color));
  };
  const read = () => {
    const f = new FormData(form);
    d.number = f.get('number') === '' ? null : +f.get('number');
    d.name = f.get('name').trim();
    d.price = f.get('price');
    d.desc = f.get('desc').trim();
    d.active = form.active.checked;
  };
  // Skip if the editor already closed, so a pending save can't resurrect a finished draft.
  const saveDraft = debounce(() => { if (m.isConnected) { read(); db.put('kv', d, draftKey); } }, 300);
  paint();
  db.put('kv', d, draftKey);

  form.addEventListener('input', saveDraft);
  form.addEventListener('click', e => {
    const em = e.target.closest('[data-emoji]'), co = e.target.closest('[data-color]');
    if (em) { d.emoji = em.dataset.emoji; d.image = null; }
    else if (co) d.color = co.dataset.color;
    else if (e.target.closest('.rm-photo')) d.image = null;
    else if (e.target.closest('.del')) return deleteItem(d);
    else return;
    paint();
    saveDraft();
  });
  form.photo.addEventListener('change', async () => {
    const file = form.photo.files[0];
    if (!file) return;
    d.image = await resizeImage(file, 360);
    form.photo.value = '';
    paint();
    saveDraft();
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    read();
    const err = $('.form-err', m);
    const price = Number(d.price);
    const dup = d.number != null && S.menu.find(x => x.id !== d.id && x.number === d.number);
    const msg = !d.name ? t('menu.nameRequired')
      : (d.price === '' || !Number.isFinite(price) || price < 0) ? t('menu.priceInvalid')
      : dup ? t('menu.numberDup', { n: d.number, name: dup.name }) : '';
    err.textContent = msg;
    err.hidden = !msg;
    if (msg) return;
    const item = { ...d, price: round2(price), profileId: pid(), createdAt: d.createdAt || Date.now() };
    await db.put('menu', item);
    S.menu = S.menu.filter(x => x.id !== item.id).concat(item);
    sortMenu();
    closeModal();
    renderView();
  });
}

async function deleteItem(d) {
  if (!(await dialog({ message: t('menu.deleteConfirm', { name: d.name }), ok: t('menu.delete'), danger: true }))) return;
  await db.del('menu', d.id);
  S.menu = S.menu.filter(x => x.id !== d.id);
  S.cart = S.cart.filter(c => c.menuId !== d.id);
  await saveCart();
  closeModal();
  renderView();
}

async function resizeImage(file, max) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

// ---------- sales ----------
function periodRange(mode, anchor) {
  const d = new Date(anchor);
  let start, end;
  if (mode === 'month') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (mode === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // weeks start Monday
    end = new Date(start);
    end.setDate(end.getDate() + (mode === 'week' ? 7 : 1));
  }
  return { start, end };
}

function shiftAnchor(dir) {
  const { mode } = S.report;
  const d = new Date(S.report.anchor);
  if (mode === 'day') d.setDate(d.getDate() + dir);
  else if (mode === 'week') d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir, 1);
  S.report.anchor = +d;
  S.report.showAll = false;
}

function periodLabel(mode, start, end) {
  if (mode === 'day') return fmtDate(start, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  if (mode === 'month') return fmtDate(start, { year: 'numeric', month: 'long' });
  return `${fmtDate(start, { month: 'short', day: 'numeric' })} – ${fmtDate(new Date(+end - DAY), { month: 'short', day: 'numeric' })}`;
}

async function loadOrders(start, end) {
  const range = IDBKeyRange.bound([pid(), +start], [pid(), +end], false, true);
  return (await db.byIndex('orders', 'profileTime', range)).sort((a, b) => b.createdAt - a.createdAt);
}

function buckets(mode, start, orders) {
  const now = Date.now();
  let n, keyOf, label, tipLabel, highlight = -1;
  if (mode === 'day') {
    n = 24; keyOf = o => new Date(o.createdAt).getHours();
    label = i => String(i); tipLabel = i => t('sales.hour', { h: i });
    if (now >= +start && now < +start + DAY) highlight = new Date(now).getHours();
  } else if (mode === 'week') {
    n = 7; keyOf = o => Math.floor((o.createdAt - start) / DAY);
    label = i => fmtDate(new Date(+start + i * DAY + 3600000), { weekday: 'short' });
    tipLabel = i => fmtDate(new Date(+start + i * DAY + 3600000), { month: 'short', day: 'numeric', weekday: 'short' });
  } else {
    n = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    keyOf = o => new Date(o.createdAt).getDate() - 1;
    label = i => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '');
    tipLabel = i => fmtDate(new Date(start.getFullYear(), start.getMonth(), i + 1), { month: 'short', day: 'numeric', weekday: 'short' });
  }
  if (mode !== 'day') {
    for (let i = 0; i < n; i++) {
      const s = mode === 'week' ? new Date(+start + i * DAY + 3600000) : new Date(start.getFullYear(), start.getMonth(), i + 1);
      if (s.toDateString() === new Date(now).toDateString()) highlight = i;
    }
  }
  const sums = Array(n).fill(0), counts = Array(n).fill(0);
  for (const o of orders) {
    const k = Math.min(n - 1, Math.max(0, keyOf(o)));
    sums[k] = round2(sums[k] + o.total);
    counts[k]++;
  }
  let from = 0, to = n - 1;
  if (mode === 'day') { // trim the hour axis to roughly business hours plus wherever sales happened
    const used = sums.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
    from = Math.min(8, ...used); to = Math.max(20, ...used);
  }
  const idx = Array.from({ length: to - from + 1 }, (_, i) => i + from);
  return {
    labels: idx.map(label), values: idx.map(i => sums[i]),
    tips: idx.map(i => `${tipLabel(i)} · ${money(sums[i])} · ${counts[i]}`),
    highlight: highlight - from,
  };
}

async function renderSales(el) {
  const { mode, anchor, showAll } = S.report;
  const { start, end } = periodRange(mode, anchor);
  const all = await loadOrders(start, end);
  if (S.view !== 'sales' || !el.isConnected) return;
  const orders = all.filter(o => !o.voided);
  const revenue = round2(orders.reduce((s, o) => s + o.total, 0));
  const byMethod = { card: 0, cash: 0 };
  orders.forEach(o => { byMethod[o.method] = round2((byMethod[o.method] || 0) + o.total); });

  const per = new Map();
  for (const o of orders) for (const it of o.items) {
    const k = it.menuId || it.name;
    const r = per.get(k) || { number: it.number, name: it.name, qty: 0, revenue: 0 };
    r.qty += it.qty;
    r.revenue = round2(r.revenue + it.price * it.qty);
    per.set(k, r);
  }
  const rows = [...per.values()].sort((a, b) => b.revenue - a.revenue);
  const topRev = rows[0]?.revenue || 1;
  const b = buckets(mode, start, orders);
  const chartTitle = t({ day: 'sales.chartDay', week: 'sales.chartWeek', month: 'sales.chartMonth' }[mode]);
  const canNext = +end <= Date.now();
  const listed = showAll ? all : all.slice(0, 20);
  const timeOpts = mode === 'day' ? { hour: '2-digit', minute: '2-digit' } : { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };

  el.innerHTML = `
    <div class="page">
      <div class="seg" role="tablist">${['day', 'week', 'month'].map(x => `
        <button data-action="report-mode" data-mode="${x}" class="${mode === x ? 'on' : ''}">${t(`sales.${x}`)}</button>`).join('')}</div>
      <div class="period">
        <button class="btn ghost icon" data-action="report-shift" data-dir="-1" aria-label="${t('sales.prev')}">‹</button>
        <strong>${periodLabel(mode, start, end)}</strong>
        <button class="btn ghost icon" data-action="report-shift" data-dir="1" aria-label="${t('sales.next')}" ${canNext ? '' : 'disabled'}>›</button>
        <button class="btn ghost small" data-action="report-today">${t('sales.today')}</button>
      </div>
      <div class="stats">
        <div class="stat hero"><span>${t('sales.revenue')}</span><strong>${money(revenue)}</strong></div>
        <div class="stat"><span>${t('sales.orders')}</span><strong>${orders.length.toLocaleString(locale())}</strong></div>
        <div class="stat"><span>${t('sales.avg')}</span><strong>${money(orders.length ? round2(revenue / orders.length) : 0)}</strong></div>
        <div class="stat"><span>${t('sales.byMethod')}</span><div class="methods"><span>💳 ${money(byMethod.card)}</span><span>💵 ${money(byMethod.cash)}</span></div></div>
      </div>
      ${orders.length ? `
      <section class="card">
        <h2>${chartTitle}</h2>
        ${barChart({ ...b, fmtAxis: compact, fmtValue: money })}
      </section>
      <section class="card">
        <h2>${t('sales.byMenu')}</h2>
        <table class="tbl">
          <thead><tr><th>${t('sales.col.menu')}</th><th class="num">${t('sales.col.qty')}</th><th class="num">${t('sales.col.revenue')}</th><th class="share-col">${t('sales.col.share')}</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td>${r.number != null ? `<span class="no">${r.number}</span>` : ''}${esc(r.name)}</td>
            <td class="num">${r.qty.toLocaleString(locale())}</td>
            <td class="num">${money(r.revenue)}</td>
            <td class="share-col"><div class="share-cell"><span class="share"><span style="width:${(r.revenue / topRev) * 100}%"></span></span><em>${revenue ? Math.round((r.revenue / revenue) * 100) : 0}%</em></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>` : `<p class="empty">${t('sales.noData')}</p>`}
      ${all.length ? `
      <section class="card">
        <div class="card-head"><h2>${t('sales.orderList')}</h2><button class="btn ghost small" data-action="export-csv">⬇ ${t('sales.export')}</button></div>
        <ul class="orders">${listed.map(o => `
          <li class="${o.voided ? 'voided' : ''}">
            <span class="o-time">${o.ticket ? `<b>#${o.ticket}</b> ` : ''}${fmtDate(new Date(o.createdAt), timeOpts)}</span>
            <span class="o-items">${o.items.map(i => `${esc(i.name)}×${i.qty}`).join(', ')}</span>
            <span class="o-method">${o.method === 'cash' ? '💵' : '💳'}</span>
            <strong class="o-total">${money(o.total)}</strong>
            ${o.voided ? `<em class="badge">${t('sales.voided')}</em>` : `<button class="btn ghost danger small" data-action="void-order" data-id="${o.id}">${t('sales.void')}</button>`}
          </li>`).join('')}</ul>
        ${!showAll && all.length > listed.length ? `<button class="btn ghost wide" data-action="report-all">${t('sales.showAll', { n: all.length })}</button>` : ''}
      </section>` : ''}
    </div>`;
  bindChartTips(el);
}

async function voidOrder(id) {
  if (!(await dialog({ message: t('sales.voidConfirm'), ok: t('sales.void'), danger: true }))) return;
  const o = await db.get('orders', id);
  if (!o) return;
  o.voided = true;
  o.voidedAt = Date.now();
  const prep = S.prep.filter(p => p.orderId !== id);
  await db.batch([{ store: 'orders', value: o }, { store: 'kv', key: prepKey(), value: prep }]);
  S.prep = prep;
  updatePrepBadge();
  renderView();
}

async function exportCsv() {
  const { start, end } = periodRange(S.report.mode, S.report.anchor);
  const orders = (await loadOrders(start, end)).reverse();
  const head = [t('sales.day'), 'time', 'order', t('menu.number'), t('menu.name'), t('sales.col.qty'), t('menu.price'), t('sales.col.revenue'), t('sales.byMethod'), t('sales.voided')];
  const rows = [head];
  for (const o of orders) for (const i of o.items) {
    const d = new Date(o.createdAt);
    rows.push([d.toLocaleDateString('sv'), d.toTimeString().slice(0, 8), o.id, i.number ?? '', i.name, i.qty, i.price, round2(i.price * i.qty), o.method, o.voided ? 'Y' : '']);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  download(`sales-${S.report.mode}-${start.toLocaleDateString('sv')}.csv`, `﻿${csv}`, 'text/csv');
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- settings ----------
function renderSettings(el) {
  const c = cfg();
  el.innerHTML = `
    <div class="page settings">
      <section class="card">
        <h2>🏪 ${t('set.store')}</h2>
        <label>${t('set.storeName')}<input data-set="name" value="${esc(S.profile.name)}" autocomplete="off"></label>
        <label>${t('set.currency')}<select data-set="currency">${CURRENCIES.map(x => `<option ${x === c.currency ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <p class="note">${t('set.currencyNote')}</p>
      </section>

      <section class="card">
        <h2>👀 ${t('set.display')}</h2>
        <div class="field"><span>${t('set.lang')}</span>
          <div class="seg">${LANGS.map(l => `<button data-action="set-lang" data-lang="${l.code}" class="${l.code === c.lang ? 'on' : ''}">${l.label}</button>`).join('')}</div></div>
        <div class="field"><span>${t('set.fontSize')} <b class="scale-val">${Math.round(c.fontScale * 100)}%</b></span>
          <div class="range-row">
            <button class="btn ghost icon" data-action="font" data-d="-1">−</button>
            <input type="range" min="0.8" max="2" step="0.1" value="${c.fontScale}" data-set="fontScale">
            <button class="btn ghost icon" data-action="font" data-d="1">+</button>
          </div>
          <p class="preview">${t('set.fontPreview')}</p></div>
        <div class="field"><span>${t('set.tileSize')}</span>
          <div class="seg">${['sm', 'md', 'lg'].map(s => `<button data-action="set-tile" data-size="${s}" class="${c.tileSize === s ? 'on' : ''}">${t(`set.tile.${s}`)}</button>`).join('')}</div></div>
        <label class="switch"><input type="checkbox" data-set="keepAwake" ${c.keepAwake ? 'checked' : ''} ${wake.supported ? '' : 'disabled'}><span class="knob"></span><span>☀︎ ${t('set.keepAwake')}</span></label>
        <p class="note">${wake.supported ? t('set.keepAwakeNote') : t('set.keepAwakeUnsupported')}</p>
        <label class="switch"><input type="checkbox" data-set="prepList" ${prepOn() ? 'checked' : ''}><span class="knob"></span><span>🍳 ${t('set.prepList')}</span></label>
        <p class="note">${t('set.prepListNote')}</p>
        ${document.fullscreenEnabled ? `<button class="btn ghost" data-action="fullscreen">⛶ ${t('set.fullscreen')}</button>` : ''}
      </section>

      <section class="card">
        <h2>🗂 ${t('set.profiles')}</h2>
        <p class="note">${t('set.profilesNote')}</p>
        <ul class="profiles">${S.profiles.map(p => `
          <li class="${p.id === pid() ? 'cur' : ''}">
            <strong>${esc(p.name)}</strong>
            ${p.id === pid() ? `<em class="badge ok">${t('set.current')}</em>` : `<button class="btn primary small" data-action="profile-use" data-id="${p.id}">${t('set.use')}</button>`}
            <button class="btn ghost small" data-action="profile-rename" data-id="${p.id}">${t('set.rename')}</button>
            <button class="btn ghost danger small" data-action="profile-delete" data-id="${p.id}">${t('set.delete')}</button>
          </li>`).join('')}</ul>
        <button class="btn ghost wide" data-action="profile-add">＋ ${t('set.addProfile')}</button>
      </section>

      <section class="card">
        <h2>💾 ${t('set.data')}</h2>
        <p class="note">✅ ${t('set.autosave')}<br>${S.persisted ? t('set.persisted') : t('set.notPersisted')}</p>
        <div class="btn-row">
          <button class="btn ghost" data-action="backup-export">⬇ ${t('set.export')}</button>
          <label class="btn ghost">⬆ ${t('set.import')}<input type="file" accept="application/json,.json" data-set="import" hidden></label>
        </div>
        <div class="field soon"><span>☁️ ${t('set.cloud')}</span><em class="badge">${t('set.cloudSoon')}</em></div>
      </section>
    </div>`;
}

function setScale(v) {
  cfg().fontScale = Math.min(2, Math.max(0.8, Math.round(v * 10) / 10));
  applyScale();
  saveProfileSoon();
  const val = $('.scale-val');
  if (val) {
    val.textContent = `${Math.round(cfg().fontScale * 100)}%`;
    $('[data-set="fontScale"]').value = cfg().fontScale;
  }
}

async function switchProfile(id) {
  const p = S.profiles.find(x => x.id === id);
  if (!p) return;
  closeModal();
  await loadProfile(p);
  render();
}

async function addProfile() {
  const name = await dialog({ message: t('set.newProfileName'), input: '', ok: t('common.ok') });
  if (!name || !name.trim()) return;
  const copy = S.menu.length && await dialog({ message: t('set.copyMenu'), ok: t('common.ok'), cancel: t('common.cancel') });
  const p = makeProfile(name.trim(), { ...cfg() });
  await db.put('profiles', p);
  if (copy) await db.putMany('menu', S.menu.map(m => ({ ...m, id: uid(), profileId: p.id })));
  S.profiles.push(p);
  await switchProfile(p.id);
}

async function renameProfile(id) {
  const p = S.profiles.find(x => x.id === id);
  const name = await dialog({ message: t('set.rename'), input: p.name, ok: t('common.ok') });
  if (!name || !name.trim()) return;
  p.name = name.trim();
  await db.put('profiles', p);
  render();
}

async function deleteProfile(id) {
  if (S.profiles.length === 1) return dialog({ message: t('set.cantDeleteLast'), ok: t('common.ok'), cancel: false });
  const p = S.profiles.find(x => x.id === id);
  if (!(await dialog({ message: t('set.deleteProfileConfirm', { name: p.name }), ok: t('set.delete'), danger: true }))) return;
  const menu = await db.byIndex('menu', 'profileId', id);
  const orders = await db.byIndex('orders', 'profileTime', IDBKeyRange.bound([id, 0], [id, Infinity]));
  await db.delMany('menu', menu.map(m => m.id));
  await db.delMany('orders', orders.map(o => o.id));
  await db.batch([
    { store: 'profiles', del: id }, { store: 'kv', del: cartKey(id) }, { store: 'kv', del: `draft:${id}` },
    { store: 'kv', del: prepKey(id) }, { store: 'kv', del: ticketKey(id) },
  ]);
  S.profiles = S.profiles.filter(x => x.id !== id);
  if (id === pid()) await loadProfile(S.profiles[0]);
  render();
}

function openProfilePicker() {
  const m = openModal(`
    <h2>${t('profile.title')}</h2>
    <div class="picker">${S.profiles.map(p => `
      <button class="btn ${p.id === pid() ? 'primary' : 'ghost'} wide" data-id="${p.id}">🏪 ${esc(p.name)}</button>`).join('')}</div>
    <div class="modal-actions"><button class="btn ghost add">＋ ${t('set.addProfile')}</button><span class="sp"></span><button class="btn ghost" data-close>${t('common.close')}</button></div>`);
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (b) switchProfile(b.dataset.id);
    if (e.target.closest('.add')) { closeModal(); addProfile(); }
  });
}

async function exportBackup() {
  const data = {
    app: 'counter-pos', version: 1, exportedAt: new Date().toISOString(),
    profiles: await db.all('profiles'), menu: await db.all('menu'), orders: await db.all('orders'),
  };
  download(`counter-pos-backup-${new Date().toLocaleDateString('sv')}.json`, JSON.stringify(data), 'application/json');
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
    if (data.app !== 'counter-pos' || !Array.isArray(data.profiles)) throw new Error('bad file');
  } catch {
    return toast(t('set.importFail'));
  }
  if (!(await dialog({ message: t('set.importConfirm'), ok: t('common.ok') }))) return;
  await db.putMany('profiles', data.profiles);
  await db.putMany('menu', data.menu || []);
  await db.putMany('orders', data.orders || []);
  S.profiles = await db.all('profiles');
  await loadProfile(S.profiles.find(p => p.id === pid()) || S.profiles[0]);
  render();
  toast(t('set.importDone'));
}

// ---------- modal / dialog / toast ----------
let modalState = null;

function openModal(html, { cls = '', sticky = false, onClose, onKey } = {}) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  $('#modal-root').append(back);
  const keyHandler = e => {
    if ($('#dialog-root').children.length) return;
    if (e.key === 'Escape' && !sticky) closeModal();
    else onKey?.(e);
  };
  document.addEventListener('keydown', keyHandler);
  back.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || (e.target === back && !sticky)) closeModal();
  });
  modalState = { back, onClose, keyHandler };
  return back.firstElementChild;
}

function closeModal() {
  if (!modalState) return;
  const { back, onClose, keyHandler } = modalState;
  modalState = null;
  document.removeEventListener('keydown', keyHandler);
  back.remove();
  onClose?.();
}

// Resolves to true/false, or the typed string when `input` is given (null on cancel).
function dialog({ message, input, ok, cancel, danger }) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-back dialog-back';
    back.innerHTML = `<div class="modal dialog" role="alertdialog">
      <p class="msg">${esc(message).replace(/\n/g, '<br>')}</p>
      ${input !== undefined ? `<input class="dlg-input" value="${esc(input)}">` : ''}
      <div class="modal-actions"><span class="sp"></span>
        ${cancel === false ? '' : `<button class="btn ghost" data-r="0">${cancel || t('common.cancel')}</button>`}
        <button class="btn ${danger ? 'danger-solid' : 'primary'}" data-r="1">${ok}</button></div></div>`;
    $('#dialog-root').append(back);
    const field = $('.dlg-input', back);
    if (field) { field.focus(); field.select(); } else $('[data-r="1"]', back).focus();
    const done = r => {
      back.remove();
      resolve(input !== undefined ? (r ? field.value : null) : r);
    };
    back.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
    });
    back.addEventListener('keydown', e => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
  });
}

let toastTimer;
function toast(msg, action, ms = 3500) {
  const root = $('#toast-root');
  clearTimeout(toastTimer);
  root.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${action ? `<button class="btn small">${esc(action.label)}</button>` : ''}</div>`;
  if (action) $('button', root).addEventListener('click', () => { root.innerHTML = ''; action.fn(); }, { once: true });
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, ms);
}

// ---------- events ----------
const actions = {
  nav: el => go(el.dataset.view),
  profiles: openProfilePicker,
  font: el => setScale(cfg().fontScale + 0.1 * +el.dataset.d),
  add: async el => {
    el.classList.remove('bump');
    void el.offsetWidth; // restart the tap animation
    el.classList.add('bump');
    navigator.vibrate?.(12);
    await changeQty(el.dataset.id, 1);
  },
  inc: el => changeQty(el.dataset.id, 1),
  dec: el => changeQty(el.dataset.id, -1),
  'toggle-cart': () => { S.cartOpen = !S.cartOpen; renderCart(); },
  'clear-cart': async () => {
    if (!(await dialog({ message: t('cart.clearConfirm'), ok: t('cart.clear'), danger: true }))) return;
    S.cart = [];
    S.cartOpen = false;
    renderCart();
    await saveCart();
  },
  pay: openPay,
  numpad: openNumpad,
  'prep-check': el => togglePrepItem(el.dataset.id, +el.dataset.i),
  'prep-finish': el => removePrep(el.dataset.id, false),
  'prep-remove': el => removePrep(el.dataset.id, true),
  'menu-new': () => openEditor({}),
  'menu-edit': el => openEditor(S.menu.find(m => m.id === el.dataset.id)),
  'report-mode': el => { S.report.mode = el.dataset.mode; S.report.showAll = false; renderView(); },
  'report-shift': el => { shiftAnchor(+el.dataset.dir); renderView(); },
  'report-today': () => { S.report.anchor = Date.now(); renderView(); },
  'report-all': () => { S.report.showAll = true; renderView(); },
  'void-order': el => voidOrder(el.dataset.id),
  'export-csv': exportCsv,
  'set-lang': async el => { cfg().lang = el.dataset.lang; setLang(cfg().lang); await saveProfile(); render(); },
  'set-tile': async el => { cfg().tileSize = el.dataset.size; await saveProfile(); renderView(); },
  fullscreen: () => document.documentElement.requestFullscreen?.().catch(() => {}),
  'profile-use': el => switchProfile(el.dataset.id),
  'profile-add': addProfile,
  'profile-rename': el => renameProfile(el.dataset.id),
  'profile-delete': el => deleteProfile(el.dataset.id),
  'backup-export': exportBackup,
};

function bindEvents() {
  const app = $('#app');
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (el && !el.disabled) actions[el.dataset.action]?.(el, e);
  });
  app.addEventListener('input', e => {
    const k = e.target.dataset.set;
    if (k === 'fontScale') setScale(+e.target.value);
    if (k === 'name') {
      S.profile.name = e.target.value.trim() || t('default.store');
      $('.store-name').textContent = S.profile.name;
      saveProfileSoon();
    }
  });
  app.addEventListener('change', async e => {
    const k = e.target.dataset.set;
    if (k === 'currency') { cfg().currency = e.target.value; await saveProfile(); }
    if (k === 'keepAwake') { cfg().keepAwake = e.target.checked; await saveProfile(); await wake.set(cfg().keepAwake); }
    if (k === 'prepList') { cfg().prepList = e.target.checked; await saveProfile(); render(); }
    if (k === 'import' && e.target.files[0]) { await importBackup(e.target.files[0]); e.target.value = ''; }
  });
  wake.onChange(() => { const w = $('.wake-ind'); if (w) w.hidden = !wake.active; });
  // Keep the "n min ago" labels and late highlighting current, without disturbing open dialogs.
  setInterval(() => {
    if (S.view === 'prep' && !modalState && !$('#dialog-root').children.length) renderView();
  }, 30000);
  window.addEventListener('error', e => { console.error(e.error || e); toast(t('error.generic')); });
  window.addEventListener('unhandledrejection', e => { console.error(e.reason); toast(t('error.generic')); });
}

// ---------- boot ----------
async function boot() {
  bindEvents();
  S.persisted = (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.().catch(() => false)) || false;
  S.profiles = await db.all('profiles');
  if (!S.profiles.length) {
    const lang = detectLang();
    setLang(lang);
    const p = makeProfile(t('default.store'), { lang, currency: lang === 'ko' ? 'KRW' : 'USD' });
    await db.put('profiles', p);
    await db.putMany('menu', sampleMenu(p));
    S.profiles = [p];
  }
  S.profiles.sort((a, b) => a.createdAt - b.createdAt);
  const activeId = await db.get('kv', 'activeProfile');
  await loadProfile(S.profiles.find(p => p.id === activeId) || S.profiles[0]);
  S.view = (await db.get('kv', 'lastView')) || 'register';

  // Re-open a menu edit that was interrupted by a crash or the app being closed.
  const draft = await db.get('kv', `draft:${pid()}`);
  if (draft) S.view = 'menu';
  render();
  if (draft) { openEditor(draft); toast(t('menu.draftRestored')); }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
