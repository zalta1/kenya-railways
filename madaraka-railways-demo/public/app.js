/* Madaraka Railways demo front end – vanilla JS SPA */
const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const S = { get(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { sessionStorage.setItem(k, JSON.stringify(v)); } };
let lang = localStorage.getItem('lang') || 'en';
const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ksh = (n) => 'KSh ' + Number(n || 0).toLocaleString('en-KE');
const app = $('#app');
const premiumSeatStyles = document.createElement('link'); premiumSeatStyles.rel = 'stylesheet'; premiumSeatStyles.href = '/premium-seat-layout.css'; document.head.append(premiumSeatStyles);
let STATIONS = [];
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }; const tok = opts.token || (opts.auth && localStorage.getItem('access_token'));
  if (tok) headers.Authorization = 'Bearer ' + tok;
  const r = await fetch('/console/api' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || 'Request failed'); e.errors = j.errors || {}; e.status = r.status; throw e; }
  return j.data;
}
function toast(m) { const el = $('#toast'); el.textContent = m; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (el.style.display = 'none'), 3500); }
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="card">${html}</div>`; m.classList.remove('hidden'); return m; }
function closeModal() { $('#modal').classList.add('hidden'); }
const stName = (id) => (STATIONS.find((s) => s.id === Number(id)) || {}).name || id;
const todayStr = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
function applyI18n() { $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n))); $('#langBtn').textContent = lang === 'en' ? 'SW' : 'EN'; document.documentElement.lang = lang; }
function applyTheme() { const theme = localStorage.getItem('theme') || 'light'; document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); $('.portal-app').dataset.theme = theme; $('#themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙'; }
$('#langBtn').onclick = () => { lang = lang === 'en' ? 'sw' : 'en'; localStorage.setItem('lang', lang); applyI18n(); route(); };
$('#themeBtn').onclick = () => { localStorage.setItem('theme', localStorage.getItem('theme') === 'dark' ? 'light' : 'dark'); applyTheme(); };
function go(p) { history.pushState({}, '', p); route(); window.scrollTo(0, 0); }
const portalClick = (e) => { const a = e.target.closest('a[data-link]'); if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute('href')); } };
const portalPopstate = () => route();
document.addEventListener('click', portalClick);
window.addEventListener('popstate', portalPopstate);
window.portalDispose = () => { document.removeEventListener('click', portalClick); window.removeEventListener('popstate', portalPopstate); };
function showErrors(form, err) {
  $$('.err', form).forEach((x) => x.remove());
  let shown = false;
  for (const [k, msgs] of Object.entries(err.errors || {})) { const el = form.querySelector(`[name="${k}"]`); if (el) { el.insertAdjacentHTML('afterend', `<div class="err">${esc(msgs[0])}</div>`); shown = true; } }
  if (!shown) form.insertAdjacentHTML('beforeend', `<div class="err">${esc(err.message)}</div>`);
}

// ---------------- Home ----------------
function stationOptions(sel, filterIds) { return `<option value="">${lang === 'sw' ? 'Chagua...' : 'Select...'}</option>` + STATIONS.filter((s) => !filterIds || filterIds.includes(s.id)).map((s) => `<option value="${s.id}" ${Number(sel) === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join(''); }
function home() {
  const s = S.get('search', { trip: 'oneway', service: '', from: '', to: '', date: addDays(todayStr(), 1), return_date: '', klass: '', adult: 1, teenager: 0, child: 0, infant: 0 });
  app.innerHTML = `<section class="hero"><h1>${t('hero_t')}</h1><p><b>${t('hero_s')}</b></p><p>${t('hero_x')}</p></section>
  <section class="booker"><div class="tabs" role="tablist"><button class="${s.klass !== 'premium' ? 'on' : ''}" data-tab="std">🚆 ${t('economy')} / ${t('first')}</button><button class="${s.klass === 'premium' ? 'on' : ''}" data-tab="premium">★ ${t('premium')}</button></div>
  <form class="card" id="searchForm" style="margin-top:0;border-top-left-radius:0" novalidate>
   <div class="radio"><label><input type="radio" name="trip" value="oneway" ${s.trip !== 'round' ? 'checked' : ''}> ${t('oneway')}</label><label><input type="radio" name="trip" value="round" ${s.trip === 'round' ? 'checked' : ''}> ${t('round')}</label></div>
   <div class="grid"><div><label for="service">${t('service')}</label><select id="service" name="service"><option value="">${t('any')}</option>${['express', 'intercounty', 'suswa'].map((v) => `<option value="${v}" ${s.service === v ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></div>
    <div><label for="from">${t('from')}</label><select id="from" name="from"></select></div>
    <div class="rel"><button type="button" class="btn ghost swap" id="swap" title="Swap" aria-label="Swap from and to">⇄</button><label for="to">${t('to')}</label><select id="to" name="to"></select></div>
    <div><label for="date">${t('date')}</label><input type="date" id="date" name="date" min="${todayStr()}" max="${addDays(todayStr(), 60)}" value="${s.date}"></div>
    <div id="retWrap" ${s.trip === 'round' ? '' : 'hidden'}><label for="return_date">${t('ret')}</label><input type="date" id="return_date" name="return_date" min="${todayStr()}" max="${addDays(todayStr(), 60)}" value="${s.return_date}"></div></div>
   <div class="grid" style="margin-top:12px">${['adult', 'teenager', 'child', 'infant'].map((p, i) => `<div><label for="p_${p}">${t(['adults', 'teens', 'children', 'infants'][i])}</label><input type="number" min="0" max="9" id="p_${p}" name="${p}" value="${s[p]}"></div>`).join('')}
    <div><button class="btn alt wide" type="submit">${t('search')}</button></div></div><input type="hidden" name="klass" value="${s.klass === 'premium' ? 'premium' : ''}"></form></section>
  <section class="tiles" style="margin-top:20px">
   <div class="tile"><h3>🕒 ${t('nav_fares')}</h3><p class="muted">${lang === 'sw' ? 'Ratiba na nauli za kila njia.' : 'Timetables and prices for every line.'}</p><a href="/fares" data-link>→</a></div>
   <div class="tile"><h3>📍 ${t('nav_stations')}</h3><p class="muted">${lang === 'sw' ? 'Vituo 13 kutoka Nairobi hadi Mombasa na Suswa.' : '13 stops from Nairobi to the coast and out to Suswa.'}</p><a href="/stations" data-link>→</a></div>
   <div class="tile"><h3>🔁 ${t('nav_manage')}</h3><p class="muted">${lang === 'sw' ? 'Ghairi au badilisha tarehe kwa msimbo wa simu.' : 'Cancel or move your trip with a code sent to your phone.'}</p><a href="/booking/manage" data-link>→</a></div>
   <div class="tile"><h3>🧳 ${lang === 'sw' ? 'Kabla ya kusafiri' : 'Before you travel'}</h3><p class="muted">${lang === 'sw' ? 'Fika saa moja mapema ukiwa na kitambulisho.' : 'Arrive an hour early with your ID. Up to 30 kg luggage.'}</p><a href="/faq" data-link>→</a></div></section>`;
  const f = $('#searchForm');
  const fill = () => {
    const svc = f.service.value; const fromSel = f.from.value || s.from;
    const ids = (sv) => STATIONS.filter((x) => !sv || x.services.includes(sv)).map((x) => x.id);
    f.from.innerHTML = stationOptions(fromSel, ids(f.klass.value === 'premium' ? 'express' : svc));
    const reach = REACH[f.from.value] || [];
    f.to.innerHTML = stationOptions(f.to.value || s.to, reach.filter((id) => ids(f.klass.value === 'premium' ? 'express' : svc).includes(id)));
  };
  fill(); f.service.onchange = fill; f.from.onchange = () => { f.to.value = ''; fill(); };
  $('#swap').onclick = () => { const a = f.from.value, b = f.to.value; s.from = b; s.to = a; f.from.value = ''; f.to.value = ''; f.from.innerHTML = stationOptions(b); f.from.value = b; fill(); f.to.value = a; };
  $$('[name=trip]', f).forEach((r) => (r.onchange = () => ($('#retWrap').hidden = f.trip.value !== 'round')));
  $$('.tabs button').forEach((b) => (b.onclick = () => { $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); f.klass.value = b.dataset.tab === 'premium' ? 'premium' : ''; f.service.disabled = !!f.klass.value; if (f.klass.value) f.service.value = 'express'; fill(); }));
  if (f.klass.value) f.service.disabled = true;
  f.onsubmit = (e) => {
    e.preventDefault(); $$('.err', f).forEach((x) => x.remove());
    const v = { trip: f.trip.value, service: f.service.value, from: f.from.value, to: f.to.value, date: f.date.value, return_date: f.return_date.value, klass: f.klass.value };
    for (const p of ['adult', 'teenager', 'child', 'infant']) v[p] = Math.max(0, Math.min(9, parseInt(f[p].value, 10) || 0));
    const errs = {};
    if (!v.from) errs.from = ['Choose where you start.']; if (!v.to) errs.to = ['Choose your destination.'];
    if (!v.date) errs.date = ['Pick a date.']; else if (v.date < todayStr() || v.date > addDays(todayStr(), 60)) errs.date = ['Dates must be within the next 60 days.'];
    if (v.trip === 'round') { if (!v.return_date) errs.return_date = ['Pick a return date.']; else if (v.return_date < v.date) errs.return_date = ['Return cannot be before departure.']; else if (v.return_date > addDays(todayStr(), 60)) errs.return_date = ['Dates must be within the next 60 days.']; }
    const n = v.adult + v.teenager + v.child + v.infant;
    if (v.adult < 1) errs.adult = ['At least one adult must travel.']; else if (n > 9) errs.adult = ['Up to 9 passengers per booking.']; else if (v.infant > v.adult) errs.infant = ['One infant per adult.'];
    if (Object.keys(errs).length) return showErrors(f, { errors: errs });
    S.set('search', v); S.set('sel', {}); go('/booking');
  };
}
let REACH = {};

function premiumSelectHeading(search) {
  const from = search.trip === 'multi' ? stName(search.segments[0].from) : stName(search.from);
  const to = search.trip === 'multi' ? stName(search.segments[search.segments.length - 1].to) : stName(search.to);
  const date = search.trip === 'multi' ? search.segments[0].date : search.date;
  const dateText = new Date(`${date}T12:00:00`).toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `<header class="premium-select-heading"><div><h1>Select Train</h1><p>${esc(from)} → ${esc(to)} <span>${dateText}</span></p></div><span class="premium-trip-selected">✓　Trip selected</span></header>`;
}

function premiumTrainLegHtml(list, leg, search, selected, routeInfo) {
  const from = routeInfo?.from ?? (leg === 'outbound' ? search.from : search.to);
  const to = routeInfo?.to ?? (leg === 'outbound' ? search.to : search.from);
  const passengerCount = search.adult + search.teenager + search.child;
  const showCity = (stationId) => stName(stationId).replace(/ Terminus$/i, '');
  const displayTime = (time) => time.length === 5 ? `${time}:00` : time;
  const duration = (departure, arrival) => {
    const [dh, dm] = departure.split(':').map(Number), [ah, am] = arrival.split(':').map(Number);
    let minutes = ah * 60 + am - (dh * 60 + dm); if (minutes < 0) minutes += 1440;
    return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
  };
  const heading = routeInfo?.label ? `${routeInfo.label} · ` : search.trip === 'round' ? `${leg === 'outbound' ? 'Outbound' : 'Return'} · ` : '';
  return `<section class="premium-result-leg"><h2>${heading ? `${heading}${esc(showCity(from))} → ${esc(showCity(to))}` : ''}</h2>${list.length ? list.map((train) => {
    const premiumClass = train.classes.find((item) => item.class === 'premium') || train.classes[0];
    if (!premiumClass) return '';
    const unavailable = !train.bookable || premiumClass.seats_available < passengerCount;
    const isSelected = selected[leg]?.trip_id === train.trip_id && selected[leg]?.class === premiumClass.class;
    const trip = { trip_id: train.trip_id, train_no: train.train_no, class: premiumClass.class, fares: premiumClass.fares, departure: train.departure, arrival: train.arrival, date: train.date, from: train.from, to: train.to, service: train.service };
    const seatLabel = unavailable ? 'Sold out' : `${premiumClass.class === 'premium' ? 'Premium' : t(premiumClass.class)} · ${premiumClass.seats_available}`;
    return `<article class="premium-train-card ${isSelected ? 'selected' : ''}" data-leg="${leg}"><h3><span class="premium-train-icon">▤</span> ${esc(train.train_no)} ${esc(train.route_name)}</h3><div class="premium-train-times"><div><strong>${displayTime(train.departure)}</strong><small>${esc(showCity(train.from))}</small></div><div class="premium-train-line"><small>${duration(train.departure, train.arrival)}</small><span></span><i>▤</i><em>On Time</em></div><div><strong>${displayTime(train.arrival)}</strong><small>${esc(showCity(train.to))}</small></div><div class="premium-train-action">${!unavailable && premiumClass.seats_available <= 6 ? `<small class="premium-low-seats">ϟ Only ${premiumClass.seats_available} seats left</small>` : unavailable ? `<small class="premium-sold-out">Sold out</small>` : ''}<button class="kbox premium-train-select ${isSelected ? 'on' : ''}" ${unavailable ? 'disabled' : ''} data-trip='${esc(JSON.stringify(trip))}'>${unavailable ? 'Sold out' : isSelected ? '✓ Selected ✓' : 'Select'}</button></div></div><div class="premium-train-seats"><span>Seats:</span><b class="${unavailable ? 'sold' : ''}">${esc(seatLabel)}</b></div>${isSelected ? '<p class="premium-card-selected">✓　Trip selected · Select a train to continue</p>' : ''}</article>`;
  }).join('') : `<div class="card">${t('no_trains')}</div>`}</section>`;
}

async function premiumResultsPage(search) {
  const selected = S.get('sel', {});
  const routes = [{ key: 'outbound', label: search.trip === 'round' ? 'Outbound' : '', from: search.from, to: search.to, date: search.date }];
  if (search.trip === 'round') routes.push({ key: 'return', label: 'Return', from: search.to, to: search.from, date: search.return_date });
  app.innerHTML = `${premiumSteps(1)}<main class="premium-results-main">${premiumSelectHeading(search)}<details class="modify-search"><summary><span>Modify Search</span><span class="modify-search-icon" aria-hidden="true"></span></summary><form class="modify-search-fields" id="premiumModifyForm" novalidate><div><label for="premiumModifyService">Train type</label><select id="premiumModifyService" name="service"><option value="">${t('any')}</option>${['express','intercounty','suswa'].map((service)=>`<option value="${service}" ${(search.service || 'express')===service?'selected':''}>${t(service)}</option>`).join('')}</select></div><div><label for="premiumModifyFrom">Leaving from</label><select id="premiumModifyFrom" name="from"></select></div><div><label for="premiumModifyTo">Going to</label><select id="premiumModifyTo" name="to"></select></div><div><label for="premiumModifyDate">Departure date</label><input id="premiumModifyDate" type="date" name="date" min="${todayStr()}" max="${addDays(todayStr(),60)}" value="${esc(search.date)}"></div><button class="btn alt modify-search-submit" type="submit">Search again</button></form></details><div id="premiumResults">Loading available trains…</div></main>`;
  const form = $('#premiumModifyForm');
  const routeIds = (service) => STATIONS.filter((station)=>!service||station.services.includes(service)).map((station)=>station.id);
  const fillStations=()=>{const valid=routeIds(form.service.value);const origin=form.from.value||search.from;form.from.innerHTML=stationOptions(origin,valid);const reachable=REACH[form.from.value]||[];form.to.innerHTML=stationOptions(form.to.value||search.to,reachable.filter((id)=>valid.includes(id)));};
  fillStations();form.service.onchange=fillStations;form.from.onchange=()=>{form.to.value='';fillStations();};
  form.onsubmit=(event)=>{event.preventDefault();if(!form.from.value||!form.to.value||!form.date.value)return;S.set('search',{...search,service:form.service.value,from:form.from.value,to:form.to.value,date:form.date.value});S.set('sel',{});go('/booking');};

  try {
    let lists;
    if(search.trip==='round') {const returned=await api('/rest/trips/search-return',{body:{from:search.from,to:search.to,date:search.date,return_date:search.return_date,class:'premium'}});lists=[returned.outbound,returned.return];}
    else lists=[await api('/rest/trips/search',{body:{from:search.from,to:search.to,date:search.date,class:'premium'}})];
    const timeMatches=(departure)=>{const hour=Number(departure.split(':')[0]);if(search.time==='morning')return hour>=5&&hour<12;if(search.time==='afternoon')return hour>=12&&hour<17;if(search.time==='evening')return hour>=17&&hour<21;if(search.time==='night')return hour>=21||hour<5;return true;};
    lists=lists.map((list)=>list.filter((train)=>(!search.service||train.service===search.service)&&(!search.time||timeMatches(train.departure))));
    const total=()=>routes.reduce((sum,route)=>sum+(selected[route.key]?['adult','teenager','child','infant'].reduce((amount,type)=>amount+search[type]*selected[route.key].fares[type],0):0),0);
    const render=()=>{
      $('#premiumResults').innerHTML=routes.map((route,index)=>premiumTrainLegHtml(lists[index],route.key,search,selected,route)).join('')+`<div class="premium-select-footer"><div><small>${routes.every((route)=>selected[route.key])?'Selected trip total':'Select a train to continue'}</small><strong>${ksh(total())}</strong></div><button class="btn alt" id="continuePremium" ${routes.every((route)=>selected[route.key])?'':'disabled'}>Continue →</button></div>`;
      $$('.premium-train-select').forEach((button)=>button.onclick=()=>{const leg=button.closest('.premium-train-card').dataset.leg;selected[leg]=JSON.parse(button.dataset.trip);S.set('sel',selected);render();});
      $('#continuePremium').onclick=()=>{if(!routes.every((route)=>selected[route.key]))return toast('Select an available train to continue.');go('/booking/passengers');};
    };
    render();
  } catch(error) { $('#premiumResults').innerHTML=`<div class="card err">${esc(error.message)}</div>`; }
}

// ---------------- Results ----------------
async function results() {
  const s = S.get('search'); if (!s) return go('/');
  if (s.klass === 'premium') return premiumResultsPage(s);
  app.innerHTML = `<details class="modify-search" open><summary><span>Modify Search</span><span class="modify-search-icon" aria-hidden="true"></span></summary>
   <form class="modify-search-fields" id="modifySearchForm" novalidate>
    <div><label for="modifyService">Train type</label><select id="modifyService" name="service"><option value="">${t('any')}</option>${['express', 'intercounty', 'suswa'].map((v) => `<option value="${v}" ${(s.service || (s.klass === 'premium' ? 'express' : '')) === v ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></div>
    <div><label for="modifyFrom">Leaving from</label><select id="modifyFrom" name="from"></select></div>
    <div><label for="modifyTo">Going to</label><select id="modifyTo" name="to"></select></div>
    <div><label for="modifyDate">Departure date</label><input id="modifyDate" type="date" name="date" min="${todayStr()}" max="${addDays(todayStr(), 60)}" value="${esc(s.date)}"></div>
    <div><label for="modifyTime">Departure time</label><select id="modifyTime" name="departure_time"><option value="">Select...</option><option value="morning" ${s.time === 'morning' ? 'selected' : ''}>Morning</option><option value="afternoon" ${s.time === 'afternoon' ? 'selected' : ''}>Afternoon</option><option value="evening" ${s.time === 'evening' ? 'selected' : ''}>Evening</option><option value="night" ${s.time === 'night' ? 'selected' : ''}>Night</option></select></div>
    <button class="btn alt modify-search-submit" type="submit">Search again</button>
   </form></details><div id="res">Loading…</div>`;
  const modifyForm = $('#modifySearchForm');
  const routeIds = (service) => STATIONS.filter((station) => !service || station.services.includes(service)).map((station) => station.id);
  const fillModifyStations = () => {
    const service = modifyForm.service.value;
    const valid = routeIds(service);
    const from = modifyForm.from.value || s.from;
    modifyForm.from.innerHTML = stationOptions(from, valid);
    const reach = REACH[modifyForm.from.value] || [];
    modifyForm.to.innerHTML = stationOptions(modifyForm.to.value || s.to, reach.filter((id) => valid.includes(id)));
  };
  fillModifyStations();
  modifyForm.service.onchange = fillModifyStations;
  modifyForm.from.onchange = () => { modifyForm.to.value = ''; fillModifyStations(); };
  modifyForm.onsubmit = (event) => {
    event.preventDefault();
    if (!modifyForm.from.value || !modifyForm.to.value || !modifyForm.date.value) return;
    S.set('search', { ...s, service: modifyForm.service.value, from: modifyForm.from.value, to: modifyForm.to.value, date: modifyForm.date.value, time: modifyForm.departure_time.value });
    S.set('sel', {});
    go('/booking');
  };
  try {
    const body = { from: s.from, to: s.to, date: s.date, class: s.klass || undefined, return_date: s.trip === 'round' ? s.return_date : undefined };
    let out, ret = null;
    if (s.trip === 'round') { const r = await api('/rest/trips/search-return', { body }); out = r.outbound; ret = r.return; } else out = await api('/rest/trips/search', { body });
    if (s.service) { out = out.filter((x) => x.service === s.service); if (ret) ret = ret.filter((x) => x.service === s.service); }
    const timeMatches = (departure) => {
      const hour = Number(departure.split(':')[0]);
      if (s.time === 'morning') return hour >= 5 && hour < 12;
      if (s.time === 'afternoon') return hour >= 12 && hour < 17;
      if (s.time === 'evening') return hour >= 17 && hour < 21;
      if (s.time === 'night') return hour >= 21 || hour < 5;
      return true;
    };
    if (s.time) { out = out.filter((x) => timeMatches(x.departure)); if (ret) ret = ret.filter((x) => timeMatches(x.departure)); }
    const sel = S.get('sel', {});
    const legHtml = (list, leg) => `<h2>${t(leg)} · ${esc(stName(leg === 'outbound' ? s.from : s.to))} → ${esc(stName(leg === 'outbound' ? s.to : s.from))}</h2>` + (list.length ? list.map((tr) => `
      <div class="card trip" data-leg="${leg}"><div><h3>Train ${esc(tr.train_no)} <span class="badge">${t(tr.service)}</span></h3><p style="font-size:22px;margin:8px 0"><b>${tr.departure}</b> → <b>${tr.arrival}</b>${tr.arrives_next_day ? ' <small>+1</small>' : ''}</p>
      <p class="muted">${esc(tr.route_name)} · ${tr.distance_km} km</p>${tr.bookable ? '' : '<p class="err">Booking closed for this departure</p>'}</div>
      <div class="klass">${tr.classes.map((c) => { const on = sel[leg] && sel[leg].trip_id === tr.trip_id && sel[leg].class === c.class; const dis = !tr.bookable || c.seats_available < s.adult + s.teenager + s.child;
        return `<button class="kbox ${on ? 'on' : ''}" ${dis ? 'disabled' : ''} data-trip='${esc(JSON.stringify({ trip_id: tr.trip_id, train_no: tr.train_no, class: c.class, fares: c.fares, departure: tr.departure, arrival: tr.arrival, date: tr.date, from: tr.from, to: tr.to, service: tr.service }))}'>
        <small>${t(c.class)}</small><b>${ksh(c.fares.adult)}</b><small class="muted">${t('per_adult')} · child ${ksh(c.fares.child)}</small><br><small>${c.seats_available} ${t('seats_left')}</small></button>`; }).join('')}</div></div>`).join('') : `<div class="card">${t('no_trains')}</div>`);
    const total = () => { let n = 0; for (const l of ['outbound', 'return']) if (sel[l]) for (const p of ['adult', 'teenager', 'child', 'infant']) n += s[p] * sel[l].fares[p]; return n; };
    $('#res').innerHTML = legHtml(out, 'outbound') + (ret ? legHtml(ret, 'return') : '') + `<div class="card row" style="justify-content:space-between;position:sticky;bottom:40px"><div>${t('total')}: <b id="tot">${ksh(total())}</b></div><button class="btn alt" id="next">${t('continue')}</button></div>`;
    $$('.kbox').forEach((b) => (b.onclick = () => { const leg = b.closest('[data-leg]').dataset.leg; sel[leg] = JSON.parse(b.dataset.trip); S.set('sel', sel);
      $$(`[data-leg="${leg}"] .kbox`).forEach((x) => x.classList.toggle('on', x === b)); $('#tot').textContent = ksh(total()); }));
    $('#next').onclick = () => { if (!sel.outbound || (s.trip === 'round' && !sel.return)) return toast(lang === 'sw' ? 'Chagua treni na daraja kwanza.' : 'Choose a train and class for each leg first.'); go('/booking/passengers'); };
  } catch (e) { $('#res').innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
}

// ---------------- Multi-booking results ----------------
async function multiResultsPage() {
  const s = S.get('search'), sel = S.get('sel', {});
  if (!s || s.trip !== 'multi' || !Array.isArray(s.segments) || s.segments.length < 2) return go('/');
  app.innerHTML = `${premiumSteps(1)}<main class="premium-results-main">${premiumSelectHeading(s)}<p class="multi-results-intro">Choose one available Premium train for every journey segment.</p><div id="multiResults">Loading available trains…</div></main>`;
  try {
    const routeData = s.segments.map((segment, index) => ({ ...segment, key: `segment${index}`, label: `Segment ${index + 1}` }));
    const lists = await Promise.all(routeData.map((segment) => api('/rest/trips/search', { body: { from: segment.from, to: segment.to, date: segment.date, class: s.klass || 'premium' } })));
    const total = () => routeData.reduce((sum, segment) => sum + (sel[segment.key] ? ['adult','teenager','child','infant'].reduce((n, type) => n + s[type] * sel[segment.key].fares[type], 0) : 0), 0);
    const render=()=>{
      $('#multiResults').innerHTML=routeData.map((segment,index)=>premiumTrainLegHtml(lists[index],segment.key,s,sel,segment)).join('')+`<div class="premium-select-footer"><div><small>${routeData.every((segment)=>sel[segment.key])?'Selected trip total':'Select a train for each segment to continue'}</small><strong>${ksh(total())}</strong></div><button class="btn alt" id="multiNext" ${routeData.every((segment)=>sel[segment.key])?'':'disabled'}>Continue →</button></div>`;
      $$('.premium-train-select').forEach((button)=>button.onclick=()=>{const key=button.closest('[data-leg]').dataset.leg;sel[key]=JSON.parse(button.dataset.trip);S.set('sel',sel);render();});
      $('#multiNext').onclick=()=>{if(!routeData.every((segment)=>sel[segment.key]))return toast('Choose an available train for every journey segment.');go('/booking/passengers');};
    };
    render();
  } catch (error) { $('#multiResults').innerHTML=`<div class="card err">${esc(error.message)}</div>`; }
}

// ---------------- Passengers (seats are auto-assigned by the server) ----------------
async function passengersPage() {
  const s = S.get('search'), sel = S.get('sel', {}); if (!s) return go('/');
  const legs = s.trip === 'multi' ? s.segments.map((_, index) => `segment${index}`) : ['outbound', ...(s.trip === 'round' ? ['return'] : [])];
  if (!legs.length || !legs.every((leg) => sel[leg])) return go('/');

  const ptypes = [...Array(s.adult).fill('adult'), ...Array(s.teenager).fill('teenager'), ...Array(s.child).fill('child'), ...Array(s.infant).fill('infant')];
  const saved = S.get('pax', []);
  const total = legs.reduce((a, l) => a + ptypes.reduce((b, p) => b + sel[l].fares[p], 0), 0);
  const paxCount = `${s.adult} adult${s.adult === 1 ? '' : 's'}${s.teenager ? `, ${s.teenager} teen${s.teenager === 1 ? '' : 's'}` : ''}${s.child ? `, ${s.child} ${s.child === 1 ? 'child' : 'children'}` : ''}${s.infant ? `, ${s.infant} infant${s.infant === 1 ? '' : 's'}` : ''}`;
  const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const premium = s.klass === 'premium';
  app.innerHTML = `${premium ? `<nav class="premium-steps" aria-label="Booking progress">${['Search','Select Train','Passengers','Seats','Review & Pay','Payment'].map((label,i)=>`<div class="${i<2?'complete':i===2?'active':''}"><span>${i<2?'✓':i+1}</span><small>${label}</small></div>`).join('')}</nav>` : ''}<h1 class="booking-page-heading">Your Booking details</h1><div class="booking-layout"><section class="booking-form">
   <h1 class="booking-section-title">Booking Information</h1>
   <p class="booking-instructions">Please enter your passenger details and ensure that the name on your booking matches the name on your passport or ID.</p>
   <p class="booking-instructions">Each adult of 18 years and above must provide a valid ID or passport number. No two adult passengers of 18 years and above can share the same ID/Passport number on the same train.</p>
   <p class="muted" id="autoNote">${premium ? 'Enter each passenger’s details, then choose seats in the next step.' : t('auto_seats')}</p>
   <form id="paxForm" novalidate>${ptypes.map((p, i) => `<fieldset class="booking-person"><legend>${p[0].toUpperCase() + p.slice(1)} Details - ${ptypes.slice(0, i + 1).filter((x) => x === p).length}</legend><div class="grid">
     ${premium ? `<div><label for="n${i}">First name <span class="required-mark">*</span></label><input id="n${i}" name="premium_first_${i}" value="${esc(saved[i]?.first_name || saved[i]?.full_name?.split(' ')[0] || '')}" autocomplete="given-name" placeholder="e.g. John"></div><div><label for="middle${i}">Middle name</label><input id="middle${i}" name="premium_middle_${i}" value="${esc(saved[i]?.middle_name || '')}" placeholder="Optional"></div><div><label for="surname${i}">Surname <span class="required-mark">*</span></label><input id="surname${i}" name="premium_surname_${i}" value="${esc(saved[i]?.surname || saved[i]?.full_name?.split(' ').slice(1).join(' ') || '')}" autocomplete="family-name" placeholder="e.g. Doe"></div>` : `<div><label for="n${i}">Full name - Passenger ${i + 1} <span class="required-mark">*</span></label><input id="n${i}" name="legs.0.passengers.${i}.full_name" value="${esc(saved[i]?.full_name || '')}" autocomplete="name" placeholder="Full name"></div>`}
     ${premium ? `<div><label for="g${i}">Gender <span class="required-mark">*</span></label><select id="g${i}" name="legs.0.passengers.${i}.gender"><option value="">Select gender...</option><option ${saved[i]?.gender === 'M' ? 'selected' : ''} value="M">Male</option><option ${saved[i]?.gender === 'F' ? 'selected' : ''} value="F">Female</option></select></div><div><label for="dob${i}">Date of birth <span class="required-mark">*</span></label><input type="date" id="dob${i}" name="premium_dob_${i}" value="${esc(saved[i]?.date_of_birth || '')}"></div>` : `<div><label for="g${i}">Gender <span class="required-mark">*</span></label><select id="g${i}" name="legs.0.passengers.${i}.gender"><option value="">--Select gender--</option><option ${saved[i]?.gender === 'M' ? 'selected' : ''} value="M">Male</option><option ${saved[i]?.gender === 'F' ? 'selected' : ''} value="F">Female</option></select></div>`}
     <div><label for="c${i}">Nationality <span class="required-mark">*</span></label><select id="c${i}" name="legs.0.passengers.${i}.nationality">${[['--Select country--',''],['Kenyan','Kenya'],['Ugandan','Uganda'],['Tanzanian','Tanzania'],['Rwandan','Rwanda'],['Burundian','Burundi'],['South Sudanese','South Sudan'],['Other','Other']].map(([label,value]) => `<option value="${value}" ${(saved[i]?.nationality === value || saved[i]?.nationality === label)?'selected':''}>${label}</option>`).join('')}</select></div>
     ${premium && p === 'adult' ? `<div><label for="doctype${i}">Document type <span class="required-mark">*</span></label><select id="doctype${i}" name="premium_doctype_${i}"><option value="">Select type...</option><option ${saved[i]?.document_type==='National ID'?'selected':''}>National ID</option><option ${saved[i]?.document_type==='Passport'?'selected':''}>Passport</option></select></div>` : ''}
     ${p === 'adult' ? `<div><label for="i${i}">${premium?'Document number':'ID-card no/Passport no'} <span class="required-mark">*</span></label><input id="i${i}" name="legs.0.passengers.${i}.id_no" value="${esc(saved[i]?.id_no || '')}" placeholder="${premium?'As shown on the document':'ID-card No'}"></div>` : '<div class="booking-no-id"></div>'}
     ${premium ? `${i===0?`<div><label for="phone">Phone number <span class="required-mark">*</span></label><input id="phone" name="phone" inputmode="tel" placeholder="7XX XXX XXX" value="${esc(S.get('phone', ''))}"></div>`:''}<div><label for="email${i}">Email address</label><input id="email${i}" name="premium_email_${i}" type="email" value="${esc(saved[i]?.email || '')}" placeholder="name@example.com"></div><label class="premium-disability"><input type="checkbox" name="premium_disability_${i}" ${saved[i]?.disability?'checked':''}> Person with a disability</label>` : ''}
     </div></fieldset>`).join('')}
     ${premium ? `<fieldset class="premium-emergency"><legend>Emergency Contact</legend><p>Someone not travelling with you, only contacted in an emergency.</p><div class="grid"><div><label for="emergencyName">Contact name *</label><input id="emergencyName" name="emergency_name" value="${esc(S.get('emergency_name',''))}"></div><div><label for="emergencyPhone">Contact phone *</label><input id="emergencyPhone" name="emergency_phone" value="${esc(S.get('emergency_phone',''))}" inputmode="tel"></div><div><label for="emergencyEmail">Contact email (optional)</label><input id="emergencyEmail" name="emergency_email" type="email" value="${esc(S.get('emergency_email',''))}"></div></div></fieldset>` : `<section class="booking-payment"><h2 class="booking-section-title">Payment Details</h2><label for="phone">M-Pesa mobile no <span class="required-mark">*</span></label><input id="phone" name="phone" inputmode="tel" placeholder="07XX XXX XXX" value="${esc(S.get('phone', ''))}"></section>`}
     <button class="btn booking-proceed" id="toPay" type="button">${premium ? 'Continue to seat selection →' : 'Proceed to payment'}</button>
   </form><p><a href="/booking" data-link>← ${t('back')}</a></p></section>
   <aside class="booking-summary"><div class="mpesa-wordmark" aria-label="M-Pesa">M<span class="mpesa-mark">↗</span>PESA</div>
   ${legs.map((l) => `<section class="booking-leg"><h2>${esc(stName(sel[l].from))} to ${esc(stName(sel[l].to))}</h2><p class="booking-train">Train: ${esc(sel[l].train_no)}</p>
     <dl><div><dt>Date</dt><dd>${dateLabel(sel[l].date)}</dd></div><div><dt>Time</dt><dd>${esc(sel[l].departure)}</dd></div><div><dt>Train</dt><dd>${esc(sel[l].train_no)}</dd></div><div><dt>Coach class</dt><dd>${t(sel[l].class)}</dd></div>
     <div><dt>Fare (adult, child)</dt><dd>${ksh(sel[l].fares.adult)}, ${ksh(sel[l].fares.child)}</dd></div><div><dt>Passengers</dt><dd>${esc(paxCount)}</dd></div></dl></section>`).join('')}
   <div class="booking-total"><span>Total fare</span><strong>${ksh(total)}</strong></div></aside></div>`;
  $('#toPay').onclick = async () => {
    const f = $('#paxForm'), btn = $('#toPay'); $$('.err', f).forEach((x) => x.remove());
    if (premium) {
      for (let i=0;i<ptypes.length;i++) {
        const first=f[`premium_first_${i}`].value.trim(), surname=f[`premium_surname_${i}`].value.trim();
        if(!first||!surname||!f[`premium_dob_${i}`].value||(ptypes[i]==='adult'&&!f[`premium_doctype_${i}`].value)||!f[`legs.0.passengers.${i}.gender`].value||!f[`legs.0.passengers.${i}.nationality`].value){toast('Complete the required passenger details.');return;}
        if(ptypes[i]==='adult'&&!/^[A-Z0-9]{7,14}$/i.test(f[`legs.0.passengers.${i}.id_no`].value.trim())){toast('Enter a valid ID or passport number.');return;}
      }
      if(!f.emergency_name.value.trim()||!f.emergency_phone.value.trim()||!f.phone.value.trim()){toast('Complete the phone and emergency contact details.');return;}
    }
    const pax = ptypes.map((p, i) => { const first=premium?f[`premium_first_${i}`].value.trim():''; const middle=premium?f[`premium_middle_${i}`].value.trim():''; const surname=premium?f[`premium_surname_${i}`].value.trim():''; return { ptype: p, full_name: premium?[first,middle,surname].filter(Boolean).join(' '):f[`legs.0.passengers.${i}.full_name`].value, first_name:first, middle_name:middle, surname, date_of_birth:premium?f[`premium_dob_${i}`].value:'', document_type:premium?(f[`premium_doctype_${i}`]?.value || ''):'', email:premium?f[`premium_email_${i}`].value:'', disability:premium?f[`premium_disability_${i}`].checked:false, id_no: f[`legs.0.passengers.${i}.id_no`]?.value, gender: f[`legs.0.passengers.${i}.gender`].value, nationality: f[`legs.0.passengers.${i}.nationality`].value }; });
    S.set('pax', pax); S.set('phone', f.phone.value);
    if(premium){S.set('emergency_name',f.emergency_name.value);S.set('emergency_phone',f.emergency_phone.value);S.set('emergency_email',f.emergency_email.value);}
    if (premium) { const oldToken=S.get('seatToken');if(oldToken)try{await api('/rest/seat-locks/release-all',{body:{token:oldToken}});}catch{}S.set('seatToken',null);S.set('seatSelections',{});S.set('order',null);btn.disabled=true;go('/booking/seats');return; }
    const body = { phone: f.phone.value, legs: legs.map((l) => ({ trip_id: sel[l].trip_id, date: sel[l].date, from: sel[l].from, to: sel[l].to, class: sel[l].class, passengers: pax })) };
    btn.disabled = true;
    try { const r = await api('/rest/booking-management/create', { body }); S.set('order', r); go('/booking/pay'); }
    catch (e) { const errs = {}; for (const [k, v] of Object.entries(e.errors)) errs[k.replace(/^legs\.\d+\./, 'legs.0.')] = v; showErrors(f, { ...e, errors: errs }); if (e.status === 409) { $('#autoNote').innerHTML = `<span class="err">${esc(e.message)}</span> <a href="/booking" data-link>${t('back')}</a>`; toast(e.message); } }
    finally { btn.disabled = false; }
  };
}

function premiumSteps(active){return `<nav class="premium-steps" aria-label="Booking progress">${['Search','Select Train','Passengers','Seats','Review & Pay','Payment'].map((label,i)=>`<div class="${i<active?'complete':i===active?'active':''}"><span>${i<active?'✓':i+1}</span><small>${label}</small></div>`).join('')}</nav>`;}
async function premiumSeatSelectionPage(){
  const s=S.get('search'),sel=S.get('sel',{}),pax=S.get('pax',[]),order=S.get('order');
  if(!s||s.klass!=='premium')return go('/');
  if(order){app.innerHTML=`${premiumSteps(3)}<section class="premium-stage"><h1>Your seats are selected</h1>${order.bookings.map((booking)=>`<article class="premium-seat-card"><h2>${esc(booking.from.name)} → ${esc(booking.to.name)}</h2>${booking.passengers.map((person,index)=>`<p>Passenger ${index+1}: ${esc(person.full_name)} · Seat ${esc(person.seat||'No seat required')}</p>`).join('')}</article>`).join('')}<div class="premium-actions"><a href="/booking/review" data-link>← Back to review</a><button class="btn alt" id="resumeReview">Continue to review</button></div></section>`;$('#resumeReview').onclick=()=>go('/booking/review');return;}
  if(!pax.length)return go('/booking/passengers');
  const routes=s.trip==='multi'?s.segments.map((segment,index)=>({key:`segment${index}`,trip:sel[`segment${index}`]})):[{key:'outbound',trip:sel.outbound},...(s.trip==='round'?[{key:'return',trip:sel.return}]:[])];
  if(!routes.length||routes.some((route)=>!route.trip))return go('/booking');
  let token=S.get('seatToken'),expires=S.get('seatTokenExpires',0),selections=S.get('seatSelections',{});
  if(!token||expires<Date.now()+15000){token=null;selections={};S.set('seatSelections',{});const issued=await api('/rest/seat-locks/token',{body:{}});token=issued.token;expires=Date.now()+issued.ttl_seconds*1000;S.set('seatToken',token);S.set('seatTokenExpires',expires);}
  const status={};const activePassenger=Object.fromEntries(routes.map((route)=>[route.key,0]));let activeLeg=routes[0].key;
  const readStatus=async(route)=>{const trip=route.trip;const query=new URLSearchParams({trip_id:String(trip.trip_id),date:trip.date,class:trip.class,token});status[route.key]=await api(`/rest/seat-locks/status?${query.toString()}`);};
  const refreshAll=async()=>Promise.all(routes.map(readStatus));
  try{await refreshAll();}catch(error){app.innerHTML=`${premiumSteps(3)}<section class="premium-stage"><div class="card err">${esc(error.message)}</div><a href="/booking/passengers" data-link>← Back to passengers</a></section>`;return;}
  const seatedPassengers=pax.map((person,index)=>({person,index})).filter(({person})=>person.ptype!=='infant');
  const ownerOf=(legKey,seat)=>Object.entries(selections[legKey]||{}).find(([,assigned])=>assigned===seat)?.[0];
  const allAssigned=()=>routes.every((route)=>seatedPassengers.every(({index})=>Boolean(selections[route.key]?.[index])));
  const render=()=>{
    app.innerHTML=`${premiumSteps(3)}<section class="premium-seat-stage"><header class="premium-seat-page-title"><div><h1>Select your seats</h1><p>Choose a seat for each passenger in every journey. Infants travel on an adult’s lap.</p></div><span class="premium-seat-hold-note">Seats held for 10 minutes</span></header><div class="premium-leg-tabs">${routes.map((route,index)=>`<button type="button" class="${route.key===activeLeg?'on':''}" data-leg-tab="${route.key}">${routes.length>1?(s.trip==='multi'?`Segment ${index+1}`:index===0?'Outbound':'Return'):'Your journey'} · ${esc(stName(route.trip.from))} → ${esc(stName(route.trip.to))}</button>`).join('')}</div><div class="premium-seat-routes">${routes.map((route,index)=>{const layout=status[route.key].layout;const letters=(layout.letters||'ABC').split('');const coachPrefix=route.trip.class[0].toUpperCase();const assigned=selections[route.key]||{};return `<section class="premium-seat-route" data-seat-route="${route.key}" ${route.key===activeLeg?'':'hidden'}><div class="premium-seat-trip-summary"><div><b>${esc(stName(route.trip.from))} → ${esc(stName(route.trip.to))}</b><small>${esc(route.trip.date)} · Train ${esc(route.trip.train_no)}</small></div><span>${ksh(route.trip.fares.adult)} <small>per adult</small></span></div><div class="premium-passenger-pick"><p>Choose a passenger, then tap an available seat</p><div>${pax.map((person,passengerIndex)=>{const seat=assigned[passengerIndex];return `<button type="button" data-passenger-tab="${passengerIndex}" data-leg="${route.key}" class="${activePassenger[route.key]===passengerIndex?'on':''}" ${person.ptype==='infant'?'disabled':''}><span>${person.ptype==='infant'?'Infant':`Passenger ${passengerIndex+1}`}</span><b>${seat?`Seat ${esc(seat.split('-')[1])}`:person.ptype==='infant'?'No seat':'Choose seat'}</b></button>`;}).join('')}</div></div>${Array.from({length:layout.coaches},(_,coachIndex)=>{const coach=coachIndex+1;return `<article class="premium-coach"><header><span class="premium-coach-number">${coach}</span><span><b>Premium</b><small>Coach ${coach}</small></span><strong>${ksh(route.trip.fares.adult)}</strong></header><div class="premium-seat-legend"><span><i class="available"></i>Available</span><span><i class="special"></i>Special</span><span><i class="chosen"></i>Selected</span><span><i class="occupied"></i>Occupied</span><span><i class="unavailable"></i>Unavailable</span></div><div class="premium-coach-front">MADARAKA EXPRESS</div><div class="premium-seat-columns"><span></span><b>${letters[0]||'A'}</b><span></span><b>${letters.slice(1).join(' · ')}</b><span></span></div><div class="premium-seat-map">${Array.from({length:layout.rows},(_,rowIndex)=>`<div class="premium-seat-row"><span class="seat-row-number">${rowIndex+1}</span><button type="button" data-seat="${coachPrefix}${coach}-${rowIndex+1}${letters[0]}" data-leg="${route.key}" data-passenger="${activePassenger[route.key]}" class="premium-seat-button ${(()=>{const seat=`${coachPrefix}${coach}-${rowIndex+1}${letters[0]}`;const item=status[route.key].seats.find((entry)=>entry.seat===seat);const owner=ownerOf(route.key,seat);return owner!==undefined&&Number(owner)===activePassenger[route.key]?'seat-selected':item?.state==='booked'?'seat-occupied':item?.state==='locked'?'seat-unavailable':item?.state==='mine'?'seat-held':'seat-available';})()}" ${(()=>{const seat=`${coachPrefix}${coach}-${rowIndex+1}${letters[0]}`;const item=status[route.key].seats.find((entry)=>entry.seat===seat);const owner=ownerOf(route.key,seat);return item?.state==='booked'||item?.state==='locked'||(owner!==undefined&&Number(owner)!==activePassenger[route.key]);})()?'disabled':''}><span>▣</span><small>${rowIndex+1}${letters[0]}</small></button><span class="seat-aisle"></span>${letters.slice(1).map((letter)=>{const seat=`${coachPrefix}${coach}-${rowIndex+1}${letter}`;const item=status[route.key].seats.find((entry)=>entry.seat===seat);const owner=ownerOf(route.key,seat);const mine=owner!==undefined&&Number(owner)===activePassenger[route.key];const blocked=item?.state==='booked'||item?.state==='locked'||(owner!==undefined&&!mine);return `<button type="button" data-seat="${seat}" data-leg="${route.key}" data-passenger="${activePassenger[route.key]}" class="premium-seat-button ${mine?'seat-selected':item?.state==='booked'?'seat-occupied':item?.state==='locked'?'seat-unavailable':item?.state==='mine'?'seat-held':'seat-available'}" ${blocked?'disabled':''}><span>▣</span><small>${rowIndex+1}${letter}</small></button>`;}).join('')}<span class="seat-row-number">${rowIndex+1}</span></div>`).join('')}</div><p class="premium-coach-help">Blue seats are available · Grey seats are unavailable · Select one seat for each passenger</p></article>`;}).join('')}</section>`;}).join('')}</div><div class="premium-seat-footer"><a href="/booking/passengers" data-link>← Back</a><button type="button" class="btn ghost" id="autoAssign">▤　Auto Assign</button><button type="button" class="btn alt" id="seatContinue" ${allAssigned()?'':'disabled'}>Continue　›</button></div></section>`;
    const visibleSeatRows=$$('.premium-seat-route:not([hidden]) .premium-seat-row');let displaySeatNumber=1;visibleSeatRows.forEach((row,rowIndex)=>{const buttons=$$('button[data-seat]',row);if(rowIndex===0||rowIndex===visibleSeatRows.length-1){buttons.at(-1)?.remove();row.classList.add('premium-seat-row-single');}$$('button[data-seat]',row).forEach((seat)=>{const number=$('small',seat);if(number)number.textContent=String(displaySeatNumber++);});});
    $$('.premium-coach-number').forEach((node)=>node.textContent='2');$$('.premium-coach>header small').forEach((node)=>node.textContent='Coach 2');$$('.premium-coach>header strong').forEach((node)=>node.textContent=`KES ${Number(routes.find((route)=>route.key===activeLeg).trip.fares.adult).toLocaleString('en-KE')}`);
    $$('[data-leg-tab]').forEach((button)=>button.onclick=()=>{activeLeg=button.dataset.legTab;render();});
    $$('[data-passenger-tab]').forEach((button)=>button.onclick=()=>{activeLeg=button.dataset.leg;activePassenger[button.dataset.leg]=Number(button.dataset.passengerTab);render();$$(`[data-leg-tab="${button.dataset.leg}"]`).click();});
    $$('[data-seat]').forEach((button)=>button.onclick=()=>void assignSeat(button.dataset.leg,Number(button.dataset.passenger),button.dataset.seat).then(render).catch((error)=>toast(error.message)));
    $('#autoAssign').onclick=async()=>{const button=$('#autoAssign');button.disabled=true;try{for(const route of routes){for(const {index} of seatedPassengers){if(selections[route.key]?.[index])continue;const free=status[route.key].seats.find((item)=>['free','mine'].includes(item.state)&&ownerOf(route.key,item.seat)===undefined);if(!free)throw new Error('There are not enough available seats for all passengers.');await assignSeat(route.key,index,free.seat);}}render();}catch(error){toast(error.message);render();}};
    $('#seatContinue').onclick=async()=>{if(!allAssigned())return toast('Select a seat for each passenger to continue.');const button=$('#seatContinue');button.disabled=true;const body={phone:S.get('phone'),token,trip:s.trip,legs:routes.map((route)=>({trip_id:route.trip.trip_id,date:route.trip.date,from:route.trip.from,to:route.trip.to,class:route.trip.class,passengers:pax.map((person,index)=>({...person,seat:person.ptype==='infant'?null:selections[route.key]?.[index]}))}))};try{const created=await api('/rest/booking-management/create',{body});S.set('order',created);S.set('seatAssignments',selections);go('/booking/review');}catch(error){toast(error.message);for(const route of routes)await readStatus(route);button.disabled=false;render();}};
  };
  const assignSeat=async(legKey,passengerIndex,seat)=>{const assigned=selections[legKey]||{};const current=assigned[passengerIndex];if(current===seat){await api('/rest/seat-locks/release',{body:{token,trip_id:routes.find((route)=>route.key===legKey).trip.trip_id,date:routes.find((route)=>route.key===legKey).trip.date,seat}});delete assigned[passengerIndex];status[legKey].seats.find((item)=>item.seat===seat).state='free';selections[legKey]=assigned;S.set('seatSelections',selections);return;}const owner=ownerOf(legKey,seat);if(owner!==undefined&&Number(owner)!==passengerIndex)throw new Error('That seat is assigned to another passenger.');const route=routes.find((item)=>item.key===legKey);if(current)await api('/rest/seat-locks/release',{body:{token,trip_id:route.trip.trip_id,date:route.trip.date,seat:current}});await api('/rest/seat-locks/lock',{body:{token,trip_id:route.trip.trip_id,date:route.trip.date,class:route.trip.class,seat}});if(current){const previous=status[legKey].seats.find((item)=>item.seat===current);if(previous)previous.state='free';}assigned[passengerIndex]=seat;selections[legKey]=assigned;const item=status[legKey].seats.find((entry)=>entry.seat===seat);if(item)item.state='mine';S.set('seatSelections',selections);};
  render();
}
function premiumSeatsPage(){const s=S.get('search'),o=S.get('order');if(!s||!o)return go('/');app.innerHTML=`${premiumSteps(3)}<section class="premium-stage"><h1>Select your seat</h1><p>Your premium seats have been assigned and are being held for this booking.</p>${o.bookings.map((b)=>`<article class="premium-seat-card"><h2>${esc(b.from.name)} → ${esc(b.to.name)}</h2><p>Premium · Coach ${esc(b.passengers?.[0]?.coach||'2')}</p><div class="premium-seat-list">${b.passengers.map((p,i)=>`<div><span>Passenger ${i+1}: ${esc(p.full_name)}</span><strong>Seat ${esc(p.seat||'Assigned')}</strong></div>`).join('')}</div></article>`).join('')}<div class="premium-actions"><a href="/booking/passengers" data-link>← Back</a><button class="btn alt" id="seatContinue">Continue</button></div></section>`;$('#seatContinue').onclick=()=>go('/booking/review');}
function premiumReviewPage(){const s=S.get('search'),o=S.get('order'),pax=S.get('pax',[]);if(!s||!o)return go('/');app.innerHTML=`${premiumSteps(4)}<section class="premium-stage"><h1>Review & Pay</h1><div class="premium-hold">◷ <span><b>Your seats are held</b><small>Complete your booking before the timer runs out.</small></span><strong id="premiumTimer">30:00</strong></div><article class="premium-seat-card"><h2>Booking reference: ${esc(o.group_ref)}</h2>${o.bookings.map((b)=>`<p><b>${esc(b.from.name)} → ${esc(b.to.name)}</b><br>${esc(b.travel_date)} · Train ${esc(b.train_no)} · Premium<br>Seats: ${b.passengers.map(x=>esc(x.seat||'Assigned')).join(', ')}</p>`).join('')}<h3>Passengers</h3>${pax.map(p=>`<p>${esc(p.full_name)} <span class="muted">${esc(p.ptype)}</span></p>`).join('')}<div class="premium-total"><span>Total</span><b>${ksh(o.amount)}</b></div></article><article class="premium-seat-card"><h3>Useful information</h3><ul class="premium-info"><li>Arrive at least one hour before departure.</li><li>Carry your original identification document during travel.</li><li>Changes and cancellations are subject to Kenya Railways booking conditions.</li><li>Tickets are not transferable.</li></ul><span>Read the full Terms & Conditions.</span></article><label class="premium-agree"><input id="termsAgree" type="checkbox"> I agree to the Terms & Conditions and confirm the passenger details are correct.</label><div class="premium-actions"><a href="/booking/seats" data-link>← Back</a><button class="btn alt" id="reviewContinue">Continue →</button></div></section>`;let secs=1800;const timer=$('#premiumTimer');const tick=()=>{timer.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;if(secs>0)secs--;};tick();const interval=setInterval(tick,1000);window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});$('#reviewContinue').onclick=()=>{if(!$('#termsAgree').checked)return toast('Please agree to the terms to continue.');go('/booking/refreshments');};}
function premiumRefreshmentsPage(){const o=S.get('order'),pax=S.get('pax',[]),choices=['Grilled beef fillet','Beef goulash meal','Chicken thigh with rice meal','Steamed rice with mixed vegetables','Matter sabzi with steamed rice','Mashed potato or spaghetti with minced meat','Stir fried beef in oyster sauce','Stir fried chicken'];if(!o)return go('/');const selected=S.get('refreshments',{});app.innerHTML=`<section class="premium-stage"><div class="premium-hold"><span><small>BOOKING REFERENCE</small><b>${esc(o.group_ref)} · ${pax.length} passenger${pax.length===1?'':'s'}</b></span><strong>${ksh(o.amount)}</strong></div><div class="premium-substeps"><b>1　Refreshments</b><span>2　Payment</span></div><article class="premium-seat-card"><h2>♨ Complimentary refreshments</h2><p>Included with your class. Choose one option for each passenger, or skip.</p>${pax.map((p,i)=>`<section class="premium-meal-passenger"><h3>${esc(p.full_name)} <small>· ${esc(p.ptype)}</small></h3><div class="premium-meals">${choices.map((meal)=>`<label><input type="radio" name="meal${i}" value="${esc(meal)}" ${selected[i]===meal?'checked':''}><span><b>${esc(meal)}</b><small>Complimentary Premium service selection</small></span></label>`).join('')}</div></section>`).join('')}</article><div class="premium-actions"><button class="btn ghost" id="skipMeals">No refreshments, thanks</button><button class="btn alt" id="mealContinue">Continue to payment →</button></div></section>`;const finish=(skip)=>{const out={};if(!skip)pax.forEach((_,i)=>{const choice=$(`input[name="meal${i}"]:checked`);if(choice)out[i]=choice.value;});S.set('refreshments',out);go('/booking/pay');};$('#skipMeals').onclick=()=>finish(true);$('#mealContinue').onclick=()=>finish(false);}

// ---------------- Pay ----------------
function payPage() {
  const o = S.get('order'); if (!o) return go('/');
  app.innerHTML = `<div class="split"><div class="card"><h2>${t('pay')}</h2><p class="otp">🧪 ${lang === 'sw' ? 'Malipo ya majaribio tu – hakuna pesa halisi.' : 'Mock payments only – no real money moves and no card numbers or PINs are ever requested.'}</p>
   <div class="paym">${[['mpesa', 'M-Pesa'], ['card', 'Card'], ['equity', 'Equity Bank'], ['kcb', 'KCB Buni']].map(([k, n], i) => `<button class="kbox ${i ? '' : 'on'}" data-m="${k}"><b style="font-size:16px">${n}</b><small class="muted">mock</small></button>`).join('')}</div>
   <form id="payForm" style="margin-top:14px" novalidate><div id="payFields"></div><button class="btn alt wide" style="margin-top:12px">${t('pay_now')} ${ksh(o.amount)}</button></form>
   <p class="muted">${lang === 'sw' ? 'Muda wa kulipa: dakika 30.' : 'Seats are held for 30 minutes while you pay.'} Tip: a phone ending in 000 simulates a failed payment.</p></div>
   <aside class="card"><h3>${t('ref')}: ${esc(o.group_ref)}</h3>${o.bookings.map((b) => `<p><b>${t(b.leg)}</b> ${esc(b.from.name)} → ${esc(b.to.name)}<br>${b.travel_date} · Train ${esc(b.train_no)} · ${t(b.class)}<br>${t('seats_assigned')}: ${b.passengers.map((p) => p.seat || 'lap').join(', ')}</p>`).join('')}<p>${t('total')}: <b>${ksh(o.amount)}</b></p></aside></div>`;
  let method = 'mpesa';
  const fields = () => { $('#payFields').innerHTML = method === 'mpesa' || method === 'kcb' ? `<label for="payphone">${t('phone')}</label><input id="payphone" name="phone" value="${esc(S.get('phone', ''))}" inputmode="tel">` : `<p class="muted">${method === 'card' ? 'You will see a simulated hosted card page. This demo has no card-number fields at all.' : 'You will be shown a simulated Equity checkout.'}</p>`; };
  fields(); $$('[data-m]').forEach((b) => (b.onclick = () => { method = b.dataset.m; $$('[data-m]').forEach((x) => x.classList.toggle('on', x === b)); fields(); }));
  $('#payForm').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; $$('.err', f).forEach((x) => x.remove());
    const path = { mpesa: '/rest/booking-info/payment/stk-push', kcb: '/rest/booking-info/payment/buni/stk-push', card: '/rest/booking-info/payment/card/session', equity: '/rest/booking-info/payment/equity/session' }[method];
    const st = { mpesa: 'status', kcb: 'buni/status', card: 'card/status', equity: 'equity/status' }[method];
    try {
      const r = await api(path, { body: { group_ref: o.group_ref, phone: f.phone?.value } });
      modal(`<h3>${method === 'mpesa' || method === 'kcb' ? '📱 Check your phone (simulated)' : '💳 Simulated checkout'}</h3><p>${esc(r.prompt)}</p><p class="muted" id="pst">Waiting for confirmation…</p>`);
      for (let i = 0; i < 30; i++) { await new Promise((z) => setTimeout(z, 1000)); const p = await api(`/rest/booking-info/payment/${st}?checkout_id=${r.checkout_id}`);
        if (p.status === 'success') { closeModal(); S.set('done', { group_ref: o.group_ref, phone: S.get('phone') }); S.set('order', null); return go('/booking/done'); }
        if (p.status === 'failed') { $('#pst').innerHTML = '<span class="err">Payment failed (simulated). Close and try again.</span> <button class="btn ghost" onclick="closeModal()">Close</button>'; return; } }
    } catch (err) { showErrors(f, err); }
  };
}
async function donePage() {
  const d = S.get('done'); if (!d) return go('/');
  const list = await api(`/rest/booking-info/booking/${d.group_ref}?phone=${encodeURIComponent(d.phone)}`);
  const ph = encodeURIComponent(d.phone);
  app.innerHTML = `<div class="card"><h2 class="okc">✅ ${t('done')}</h2><p>${lang === 'sw' ? 'Onyesha msimbo huu kituoni pamoja na kitambulisho.' : 'Show this code at the station with your ID. A copy was “sent” to your phone (demo).'}</p>
   ${list.map((b) => `<div class="ticket"><img src="/tickets/${b.ref}/qr.png?phone=${ph}" alt="QR code for ${b.ref}"><div><b>${t('ref')}: ${esc(b.ref)}</b> <span class="badge ${b.status}">${b.status}</span><br>${esc(b.from.name)} → ${esc(b.to.name)}<br>${b.travel_date} · ${b.departure}–${b.arrival} · Train ${esc(b.train_no)} · ${t(b.class)}<br>${b.passengers.map((p) => `${esc(p.full_name)} (${p.seat || 'lap'})`).join(', ')}<br>${ksh(b.total)}</div></div>`).join('')}
   <a class="btn" href="/tickets/${d.group_ref}.pdf?phone=${ph}" target="_blank">${t('download_pdf')}</a> <a class="btn ghost" href="/" data-link>${t('nav_book')}</a></div>`;
}

// ---------------- Manage booking ----------------
function managePage() {
  app.innerHTML = `<div class="card" style="max-width:520px"><h2>${t('nav_manage')}</h2><form id="mf" novalidate><label for="mref">${t('ref')}</label><input id="mref" name="ref" placeholder="MRXXXXXX"><br><br><label for="mph">${t('phone')}</label><input id="mph" name="phone" inputmode="tel"><br><br><button class="btn">${t('send_code')}</button></form><div id="mout"></div></div>`;
  $('#mf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; $$('.err', f).forEach((x) => x.remove());
    try { const r = await api('/rest/booking-management/auth/request-otp', { body: { ref: f.ref.value, phone: f.phone.value } });
      $('#mout').innerHTML = `<form id="of" novalidate><p class="otp">Demo SMS code: <b>${r.demo_code}</b></p><label for="otp">Code</label><input id="otp" name="otp" inputmode="numeric" maxlength="6"><br><br><button class="btn">${t('verify')}</button></form>`;
      $('#of').onsubmit = async (ev) => { ev.preventDefault(); try { const v = await api('/rest/booking-management/auth/verify-otp', { body: { ref: f.ref.value, phone: f.phone.value, otp: ev.target.otp.value } }); S.set('mtok', v.token); S.set('mphone', f.phone.value); manageDetail(); } catch (err) { showErrors(ev.target, err); } };
    } catch (err) { showErrors(f, err); }
  };
}
async function manageDetail() {
  const tok = S.get('mtok'); let b;
  try { b = await api('/rest/booking-management/details', { token: tok }); } catch { return managePage(); }
  const p = b.policy; const ph = encodeURIComponent(S.get('mphone'));
  app.innerHTML = `<div class="card"><h2>${t('ref')}: ${esc(b.ref)} <span class="badge ${b.status}">${b.status}</span></h2><p>${esc(b.from.name)} → ${esc(b.to.name)} · ${b.travel_date} · ${b.departure} · Train ${esc(b.train_no)} · ${t(b.class)} · ${ksh(b.total)}</p>
   <table><tr><th>Name</th><th>Type</th><th>Seat</th><th>Status</th><th></th></tr>${b.passengers.map((x) => `<tr><td>${esc(x.full_name)}</td><td>${x.type}</td><td>${x.seat || 'lap'}</td><td>${x.status}</td><td>${x.status === 'active' && p.can_cancel ? `<button class="btn ghost" data-rm="${x.id}">Remove</button>` : ''}</td></tr>`).join('')}</table>
   <p class="muted">${p.hours_to_departure} h to departure. Cancel fee ${p.cancel_fee_pct}% · date-change fee ${p.reschedule_fee_pct}% (once, ≥48 h ahead).</p>
   <div class="row" style="flex-wrap:wrap"><button class="btn danger" id="cx" ${p.can_cancel ? '' : 'disabled'}>${t('cancel_booking')}</button>
   <input type="date" id="nd" style="max-width:180px" min="${todayStr()}" max="${addDays(todayStr(), 60)}"><button class="btn" id="rs" ${p.can_reschedule ? '' : 'disabled'}>${t('reschedule')}</button>
   ${b.status === 'confirmed' ? `<a class="btn ghost" target="_blank" href="/tickets/${b.ref}.pdf?phone=${ph}">${t('download_pdf')}</a>` : ''}</div><div id="mmsg"></div></div>`;
  $('#cx').onclick = async () => { if (!confirm('Cancel this booking? A 30% fee applies.')) return; try { const r = await api('/rest/booking-management/cancel', { token: tok, body: {} }); toast(`Cancelled. Refund of ${ksh(r.refund.amount)} requested.`); manageDetail(); } catch (e) { $('#mmsg').innerHTML = `<p class="err">${esc(e.message)}</p>`; } };
  $('#rs').onclick = async () => { const nd = $('#nd').value; try { const qt = await api('/rest/booking-management/change-date/quote', { token: tok, body: { new_date: nd } });
    if (!confirm(`Move to ${nd}? Fee ${ksh(qt.fee)} (mock payment).`)) return; await api('/rest/booking-management/change-date/request', { token: tok, body: { new_date: nd } }); toast('Date changed.'); manageDetail(); } catch (e) { $('#mmsg').innerHTML = `<p class="err">${esc(e.message)}</p>`; } };
  $$('[data-rm]').forEach((x) => (x.onclick = async () => { try { await api('/rest/booking-management/passengers/cancel', { token: tok, body: { passenger_id: x.dataset.rm } }); manageDetail(); } catch (e) { $('#mmsg').innerHTML = `<p class="err">${esc(e.message)}</p>`; } }));
}

// ---------------- Login / account ----------------
function loginPage() {
  app.innerHTML = `<div class="card" style="max-width:440px;margin:30px auto"><h2>${t('signin')}</h2><form id="lf" novalidate><label for="lph">${t('phone')}</label><input id="lph" name="phone" inputmode="tel" placeholder="07XX XXX XXX"><br><br><button class="btn wide">${t('send_code')}</button></form><div id="lo"></div></div>`;
  $('#lf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; $$('.err', f).forEach((x) => x.remove());
    try { const r = await api('/rest/auth/otp/request', { body: { phone: f.phone.value } });
      $('#lo').innerHTML = `<form id="lv" novalidate><p class="otp">Demo SMS code: <b>${r.demo_code}</b></p><label for="lotp">Code</label><input id="lotp" name="otp" inputmode="numeric" maxlength="6"><br><br><button class="btn alt wide">${t('verify')}</button></form>`;
      $('#lv').onsubmit = async (ev) => { ev.preventDefault(); try { const v = await api('/rest/auth/otp/verify', { body: { phone: f.phone.value, otp: ev.target.otp.value } });
        localStorage.setItem('access_token', v.access_token); localStorage.setItem('refresh_token', v.refresh_token); S.set('phone', f.phone.value); acct(); go('/account'); } catch (err) { showErrors(ev.target, err); } };
    } catch (err) { showErrors(f, err); } };
}
async function authed(path) {
  try { return await api(path, { auth: true }); } catch (e) {
    if (e.status !== 401) throw e; const rt = localStorage.getItem('refresh_token'); if (!rt) throw e;
    const r = await api('/rest/auth/refresh', { body: { refresh_token: rt } }); localStorage.setItem('access_token', r.access_token); return api(path, { auth: true });
  }
}
async function accountPage() {
  let prof, bks, tx; try { [prof, bks, tx] = await Promise.all([authed('/rest/profile'), authed('/rest/bookings'), authed('/rest/transactions')]); } catch { localStorage.removeItem('access_token'); acct(); return go('/login'); }
  app.innerHTML = `<div class="card"><h2>${t('account')}</h2><form id="pf" class="grid" novalidate><div><label>${t('phone')}</label><input value="${esc(prof.phone)}" disabled></div><div><label for="pn">Name</label><input id="pn" name="name" value="${esc(prof.name || '')}"></div><div><label for="pe">Email</label><input id="pe" name="email" value="${esc(prof.email || '')}"></div><div><button class="btn">Save</button> <button type="button" class="btn ghost" id="lgo">Sign out</button></div></form></div>
   <div class="card"><h3>My bookings</h3><table><tr><th>Ref</th><th>Trip</th><th>Date</th><th>Class</th><th>Total</th><th>Status</th><th></th></tr>${bks.map((b) => `<tr><td>${esc(b.ref)}</td><td>${esc(b.from.name)} → ${esc(b.to.name)}</td><td>${b.travel_date} ${b.departure}</td><td>${t(b.class)}</td><td>${ksh(b.total)}</td><td><span class="badge ${b.status}">${b.status}</span></td><td>${b.status === 'confirmed' ? `<a target="_blank" href="/tickets/${b.ref}.pdf?phone=${b.phone}">PDF</a>` : ''}</td></tr>`).join('') || '<tr><td colspan=7 class="muted">No bookings yet</td></tr>'}</table></div>
   <div class="card"><h3>Transactions</h3><table><tr><th>ID</th><th>Method</th><th>Amount</th><th>Status</th><th>When</th></tr>${tx.map((x) => `<tr><td>${esc(x.checkout_id)}</td><td>${x.method}</td><td>${ksh(x.amount)}</td><td>${x.status}</td><td>${new Date(x.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</td></tr>`).join('') || '<tr><td colspan=5 class="muted">None</td></tr>'}</table></div>`;
  $('#pf').onsubmit = async (e) => { e.preventDefault(); try { await api('/rest/profile', { method: 'PUT', auth: true, body: { name: e.target.name.value, email: e.target.email.value } }); toast('Saved'); } catch (err) { showErrors(e.target, err); } };
  $('#lgo').onclick = async () => { try { await api('/rest/logout', { auth: true, body: {} }); } catch {} localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); acct(); go('/'); };
}
function acct() { const a = $('#acctBtn'); if (!a) return; const on = !!localStorage.getItem('access_token'); a.setAttribute('href', on ? '/account' : '/login'); a.dataset.i18n = on ? 'account' : 'signin'; a.textContent = t(a.dataset.i18n); }

// ---------------- Info pages ----------------
async function stationsPage() {
  app.innerHTML = `<h1>${t('nav_stations')}</h1><div class="tiles">${STATIONS.map((s) => `<div class="tile"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.city)} County · ${s.code}</p><p>${s.services.map((x) => `<span class="badge">${t(x)}</span>`).join(' ')}</p><p><small>${s.facilities.map(esc).join(' · ')}</small></p></div>`).join('')}</div>`;
}
async function faresPage() {
  const fc = await api('/rest/booking-info/fare-charts'); const tt = await api('/rest/booking-info/next-trips?from=2&to=3').catch(() => []);
  app.innerHTML = `<h1>${t('nav_fares')}</h1><div class="card"><table><tr><th>Route</th><th>Stops</th><th>Distance / time</th><th>Fares (adult · child)</th></tr>${fc.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${r.stoppages.map(stName).map(esc).join(' → ')}</td><td>${r.distance} · ${r.time}</td><td>${r.fares.map((f) => `${t(f.class)}: ${ksh(f.adult)} · ${ksh(f.child)}${f.return_adult ? ` (return ${ksh(f.return_adult)})` : ''}`).join('<br>')}</td></tr>`).join('')}</table>
  <p class="muted">Please confirm current fares and service times through Kenya Railways before travel.</p></div>
  <div class="card"><h3>Timetable</h3><table><tr><th>Train</th><th>Service</th><th>Departs</th><th>Arrives</th><th>Days</th></tr>
  ${[['IC1 / IC2', 'intercounty', '08:00', '14:45', 'Daily'], ['E1 / E2', 'express', '15:00', '20:30', 'Daily'], ['E3 / E4', 'express', '22:00', '03:30 (+1)', 'Daily'], ['S1', 'suswa', '08:50 Nairobi', '11:10 Suswa', 'Fri–Sun'], ['S2', 'suswa', '16:05 Suswa', '18:25 Nairobi', 'Fri–Sun']].map((r) => `<tr><td>${r[0]}</td><td>${t(r[1])}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</table></div>`;
}
async function faqPage() { const f = await api('/rest/booking-info/faqs'); app.innerHTML = `<h1>FAQ</h1>${f.map((x) => `<details class="card"><summary><b>${esc(lang === 'sw' ? x.q_sw : x.q)}</b></summary><p>${esc(lang === 'sw' ? x.a_sw : x.a)}</p></details>`).join('')}`; }
function aboutPage() {
  app.innerHTML = `<h1>${t('nav_about')}</h1><div class="split"><div class="card"><p>${lang === 'sw' ? 'Madaraka Express ni huduma ya abiria ya Shirika la Reli la Kenya inayounganisha Nairobi na Mombasa kupitia Reli ya Kisasa (SGR).' : 'Madaraka Express is Kenya Railways’ passenger service connecting Nairobi and Mombasa along the Standard Gauge Railway.'}</p>
  <p>${lang === 'sw' ? 'Panga safari yako, angalia vituo na maelezo ya huduma, na udhibiti nafasi uliyoweka.' : 'Plan your journey, explore stations and service information, and manage your booking.'}</p></div><img src="/img/coach.svg" alt="Madaraka Express passenger coach" style="width:100%;border-radius:16px"></div>`;
}
function contactPage() {
  app.innerHTML = `<h1>Contact</h1><form class="card" id="cf" style="max-width:640px" novalidate><div class="grid"><div><label for="cn">Name</label><input id="cn" name="name"></div><div><label for="ce">Email</label><input id="ce" name="email"></div><div><label for="cm">Mobile</label><input id="cm" name="mobile"></div><div><label for="cc">Category</label><select id="cc" name="category">${['Cancellation', 'Refund', 'Enquiry', 'Suggestion', 'Complaint', 'Other'].map((c) => `<option>${c}</option>`).join('')}</select></div></div><br><label for="cb">Message</label><textarea id="cb" name="message" rows="5"></textarea><br><br><button class="btn">Send</button></form>`;
  $('#cf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; $$('.err', f).forEach((x) => x.remove()); try { await api('/rest/contact', { body: Object.fromEntries(new FormData(f)) }); f.reset(); toast('Thanks – message received (demo).'); } catch (err) { showErrors(f, err); } };
}

const ROUTES = { '/': home, '/booking': results, '/booking/oneway': results, '/booking/passengers': passengersPage, '/booking/seats': premiumSeatSelectionPage, '/booking/review': premiumReviewPage, '/booking/refreshments': premiumRefreshmentsPage, '/booking/pay': payPage, '/booking/done': donePage, '/booking/manage': managePage,
  '/stations': stationsPage, '/fares': faresPage, '/faq': faqPage, '/about': aboutPage, '/contact': contactPage, '/login': loginPage, '/otp': loginPage, '/account': accountPage, '/account/bookings': accountPage, '/account/profile': accountPage, '/account/transactions': accountPage, '/admin': () => window.adminPage(app) };
async function route() {
  const p = location.pathname.replace(/\/$/, '') || '/';
  $$('nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === p));
  const fn = p === '/booking' && S.get('search')?.trip === 'multi' ? multiResultsPage : ROUTES[p]; if (!fn) { app.innerHTML = '<div class="card"><h2>Page not found</h2><a href="/" data-link>Home</a></div>'; return; }
  try { await fn(); } catch (e) { app.innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
}
(async () => {
  applyTheme(); applyI18n(); acct();
  STATIONS = await api('/rest/booking-info/stations');
  const fc = await api('/rest/booking-info/fare-charts');
  for (const r of fc) r.stoppages.forEach((a, i) => { REACH[a] = REACH[a] || []; r.stoppages.slice(i + 1).forEach((b) => { if (!REACH[a].includes(b)) REACH[a].push(b); }); });
  const params = new URLSearchParams(location.search);
  if (location.pathname === '/booking' && params.get('trip') === 'multi' && params.has('segments')) {
    try {
      const requested = JSON.parse(params.get('segments'));
      const segments = requested.map((segment) => ({ from: STATIONS.find((station) => station.name === segment.from)?.id, to: STATIONS.find((station) => station.name === segment.to)?.id, date: segment.date }));
      if (segments.length >= 2 && segments.every((segment) => segment.from && segment.to && segment.date && segment.from !== segment.to)) {
        S.set('search', { trip: 'multi', service: 'express', from: String(segments[0].from), to: String(segments[0].to), date: segments[0].date, return_date: '', segments: segments.map((segment) => ({ ...segment, from: String(segment.from), to: String(segment.to) })), klass: 'premium', adult: Math.max(1, Number(params.get('adult')) || 1), teenager: Math.max(0, Number(params.get('teenager')) || 0), child: Math.max(0, Number(params.get('child')) || 0), infant: Math.max(0, Number(params.get('infant')) || 0) });
        S.set('sel', {});
      }
    } catch { toast('The multi-booking details could not be read. Please try again.'); }
  } else if (location.pathname === '/booking' && params.has('origin') && params.has('destination')) {
    const from = STATIONS.find((station) => station.name === params.get('origin'));
    const to = STATIONS.find((station) => station.name === params.get('destination'));
    if (from && to) {
      S.set('search', { trip: params.get('trip') === 'round' ? 'round' : 'oneway', service: params.get('service') || '', from: String(from.id), to: String(to.id), date: params.get('departure'), return_date: params.get('return_date') || '', klass: params.get('class') || '', adult: Math.max(1, Number(params.get('adult')) || 1), teenager: Math.max(0, Number(params.get('teenager')) || 0), child: Math.max(0, Number(params.get('child')) || 0), infant: Math.max(0, Number(params.get('infant')) || 0) });
      S.set('sel', {});
    }
  }
  route();
})();
