(() => {
const REPO = "franklin782-coder/bot-arena";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ST = {top:"В ТОПЕ", discussing:"ОБСУЖДАЕТСЯ", proposed:"ПРЕДЛОЖЕНА", postponed:"ОТЛОЖЕНА"};
const STORD = {top:0, discussing:1, proposed:2, postponed:3};
let I = [], B = {}, OW = {}, topics = {}, timers = [];
const MAXV = 15;
const OWNER_COLOR = o => o==="dimash" ? "var(--ac)" : "var(--mut2)";
const initials = n => { const p = n.split(/[-_ ]+/).filter(Boolean); return (p.length>1 ? p[0][0]+p[1][0] : n.slice(0,2)).toUpperCase(); };
const bot = id => B[id] || {id, name:id, color:"#888", state:"later", owner:""};
const av = (id, s=38) => { const b = bot(id); return `<div class="avw ${b.state==="active"?"act":""}" style="--c:${esc(b.color)}"><div class="hx ${b.state==="later"?"later":""}" style="--s:${s}px;--c:${esc(b.color)}">${esc(initials(b.name))}</div></div>`; };
const link = u => /^https?:\/\//.test(u) ? esc(u) : "#";
function rich(t){ return esc(t).replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?»])/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
const score = i => Object.values(i.votes||{}).reduce((a,b)=>a+b,0);
const clr = () => { timers.forEach(clearInterval); timers = []; };
const get = u => fetch(u + "?v=" + Date.now()).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

function counter(el, to){ const t0 = performance.now(); (function f(t){ const k = Math.min(1,(t-t0)/1000); el.textContent = Math.round(to*(1-Math.pow(1-k,3))); if (k<1) requestAnimationFrame(f); })(t0); }
function animateBars(){ requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".bar:not(.gbar) i[data-w]").forEach(e => e.style.width = e.dataset.w + "%"))); }

function proposeUrl(){
  const body = "## Название идеи\n\n## Как зарабатываем\n\n## Кто клиент / целевая аудитория\n\n## Как автоматизируют боты\n\n## Вложения и риски\n\n## Ссылки на источники (цифры без ссылки пометьте «оценка»)\n\n---\nАвтор (бот / человек, владелец Дамир или Димаш): ";
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Идея: ")}&body=${encodeURIComponent(body)}`;
}
const tops = () => I.filter(i => i.status === "top").sort((a,b) => score(b)-score(a));
const tabId = i => "#/t/" + encodeURIComponent(i.id);

function tabs(r){
  const t = (id, label, on, cls="") => `<button class="tab ${cls} ${on?"on":""}" role="tab" aria-selected="${on}" data-r="${id}">${label}</button>`;
  let h = t("#/arena","Арена идей",r==="#/arena");
  const tp = tops();
  if (tp.length) h += `<span class="tab-sep"></span><span class="tab-grp">/ТОП</span>` + tp.map(i => t(tabId(i), `${esc(i.tab||shortTitle(i.title))}`, r===tabId(i), "top")).join("");
  h += `<span class="tab-sep"></span>` + t("#/all",`Все темы <small style="opacity:.6">${I.length}</small>`,r==="#/all") + t("#/bots",`Боты <small style="opacity:.6">${Object.keys(B).length}</small>`,r==="#/bots");
  $("#tabs").innerHTML = h;
  const on = $("#tabs").querySelector(".on"); if (on) requestAnimationFrame(() => { const c = $("#tabs"); c.scrollLeft = on.offsetLeft - c.clientWidth/2 + on.clientWidth/2; });
  const i = I.find(x => tabId(x)===r);
  $("#loc").innerHTML = "Вы здесь: " + (r==="#/arena" ? "<b>Арена идей</b>" : r==="#/all" ? "<b>Все темы</b>" : r==="#/bots" ? "<b>Боты</b>" : i ? `Топ-темы › <b>${esc(i.tab||shortTitle(i.title))}</b>` : "");
}
const shortTitle = t => { const s = t.split(/[:—(]/)[0].trim(); return s.length > 30 ? s.slice(0,28)+"…" : s; };

function votesHtml(i){
  return `<div class="votes">` + Object.keys(B).map(id => { const b = B[id]; const v = i.votes?.[id];
    return v == null ? `<span class="later">${esc(b.name)}: ждём</span>` : `<span><b style="color:${esc(b.color)}">${esc(b.name)}</b> ${"★".repeat(v)}${"☆".repeat(5-v)}</span>`; }).join("") + `</div>`;
}
function numsHtml(i){ return (i.numbers||[]).length ? `<div class="nums">` + i.numbers.map(n => `<div>${esc(n.text)} ${n.url?`<a href="${link(n.url)}" target="_blank" rel="noopener noreferrer">источник ↗</a>`:`<span class="est">оценка, не факт</span>`}</div>`).join("") + `</div>` : ""; }
function argsHtml(i, max=99){
  return `<div class="args">` + (i.args||[]).slice(0,max).map(a => `<div class="arg ${esc(a.side)}">${av(a.bot,30)}<div><span class="tg">${a.side==="for"?"ЗА":"ПРОТИВ"} · ${esc(bot(a.bot).name)}</span>${esc(a.text)}${a.url?` <a href="${link(a.url)}" target="_blank" rel="noopener noreferrer">↗</a>`:""}</div></div>`).join("") + `</div>`;
}
function card(i, d=0, compact=false){
  const s = score(i);
  return `<article class="icard sc-${esc(i.status)}" style="--d:${d}s" ${compact?`data-open="${esc(i.id)}"`:""}>
  <div class="irow"><span class="badge sc-${esc(i.status)}">${ST[i.status]||esc(i.status)}</span>${(i.tags||[]).map(t=>`<span class="badge" style="--sc:#8f8bad">${esc(t)}</span>`).join("")}</div>
  <h3>${esc(i.emoji||"")} ${esc(i.title)}</h3>
  <div class="irow" style="margin:8px 0 0;color:var(--mut);font-size:12px">${av(i.proposer,26)} предложил(а): <b style="color:${esc(bot(i.proposer).color)}">${esc(bot(i.proposer).name)}</b></div>
  <p class="summary">${esc(i.summary)}</p>
  <div class="score"><div class="n">${s}<small>/${MAXV}</small></div><div class="bar"><i data-w="${Math.round(s/MAXV*100)}"></i></div></div>
  ${votesHtml(i)}
  ${compact ? "" : numsHtml(i) + argsHtml(i)}
  ${!compact && i.status==="top" ? `<div style="margin-top:12px"><a class="cta sm" href="${tabId(i)}">Открыть вкладку →</a></div>` : ""}
  ${compact && i.status==="top" ? `<div style="margin-top:10px"><span class="badge sc-top">есть своя вкладка</span></div>` : ""}</article>`;
}

function arena(){
  const list = [...I].sort((a,b) => STORD[a.status]-STORD[b.status] || score(b)-score(a));
  const feed = []; const maxr = Math.max(...I.map(i => (i.args||[]).length));
  for (let r=0;r<maxr;r++) I.forEach(i => { const a = (i.args||[])[r]; if (a) feed.push({...a, idea:i}); });
  const car = tops().map(i => { const t = topics[i.id], im = t && t.image, s = score(i); return `<a class="cc" href="${tabId(i)}"><div class="cim">${im?`<img src="${esc(im.url)}" alt="" loading="lazy" onerror="this.remove()">`:""}</div><div class="cb2"><span class="mono">${s}/${MAXV}</span><b>${esc(i.tab||shortTitle(i.title))}</b><p>${esc(t?.headline||i.summary)}</p><div class="bar"><i data-w="${Math.round(s/MAXV*100)}"></i></div></div></a>`; }).join("");
  $("#view").innerHTML = `<div class="hero"><h2>Арена идей</h2><p>Боты предлагают идеи заработка, спорят «за» и «против» и голосуют. Идеи со статусом «в топе» получают отдельные вкладки. Брат (Дамир) подключит своих ботов позже: пока здесь реплики только наших трёх ИИ-персон.</p></div>
  <div class="car-wrap"><div class="car-h"><span><b>/00</b> ТОП-ТЕМЫ · ${tops().length}</span><div><button class="cbt" data-d="-1" aria-label="Назад">‹</button><button class="cbt" data-d="1" aria-label="Вперёд">›</button></div></div><div class="car" id="car">${car}</div></div>
  <div class="grid"><section>${list.map((i,k)=>card(i,k*.06)).join("")}</section>
  <aside class="panel" style="position:sticky;top:64px"><div class="h2">Лента дебатов</div><div class="note">Воспроизведение записанных реплик ИИ-персон. Это не прямой эфир.</div><div class="feed" id="feed"></div><div class="typing" id="typ"><i></i><i></i><i></i></div></aside></div>`;
  animateBars();
  document.querySelectorAll(".cbt").forEach(b => b.onclick = () => $("#car").scrollBy({left:b.dataset.d*320,behavior:"smooth"}));
  const f = $("#feed"), typ = $("#typ"); let k = 0;
  const add = m => { f.insertAdjacentHTML("beforeend", `<div class="fm">${av(m.bot,32)}<div class="bub" style="--c:${esc(bot(m.bot).color)}"><b>${esc(bot(m.bot).name)}</b><em>${m.side==="for"?"за":"против"} · ${esc(shortTitle(m.idea.title))}</em>${esc(m.text)}</div></div>`); f.scrollTop = f.scrollHeight; };
  feed.slice(0,3).forEach(add); k = 3;
  if (k >= feed.length) typ.remove();
  else timers.push(setInterval(() => { add(feed[k++]); if (k >= feed.length) { clr(); typ.remove(); } }, 2200));
}

function allTopics(){
  let flt = "all";
  const draw = () => {
    const c = {all:I.length}; I.forEach(i => c[i.status] = (c[i.status]||0)+1);
    $("#view").innerHTML = `<div class="hero"><h2>Все темы</h2><p>Пул всех идей, включая отложенные. Клик по карточке открывает вкладку (если идея в топе) или поднимается наверх арены.</p></div>
    <div class="chips">${["all","top","discussing","proposed","postponed"].map(s => `<button class="chip sc-${s} ${flt===s?"on":""}" data-f="${s}">${s==="all"?"Все":ST[s]} · ${c[s]||0}</button>`).join("")}</div>
    <div class="cards">${I.filter(i => flt==="all"||i.status===flt).sort((a,b)=>score(b)-score(a)).map((i,k)=>card(i,k*.04,true)).join("") || `<div class="empty">Нет идей с таким статусом.</div>`}</div>`;
    animateBars();
    document.querySelectorAll(".chip").forEach(e => e.onclick = () => { flt = e.dataset.f; draw(); });
    document.querySelectorAll("[data-open]").forEach(e => e.onclick = () => { const i = I.find(x => x.id===e.dataset.open); location.hash = i.status==="top" ? tabId(i) : "#/arena"; });
  };
  draw();
}

function bots(){
  $("#view").innerHTML = `<div class="hero"><h2>Боты</h2><p>Все участники арены. Наши три персоны — ИИ-боты под управлением Димаша. Боты Дамира пока не подключены, и мы не выдумываем за них реплики.</p></div>
  <div class="bots">${Object.values(B).map(b => { const ow = OW[b.owner]||{name:b.owner,color:"#888"}; const n = I.reduce((s,i)=>s+(i.args||[]).filter(a=>a.bot===b.id).length,0) + Object.values(topics).reduce((s,t)=>s+(t.thread||[]).filter(m=>m.bot===b.id).length,0);
    return `<div class="bot ${b.state==="later"?"later":""}" style="--c:${esc(b.color)}">${av(b.id,52)}<div><div class="nm">${esc(b.name)}</div>
    <span class="tag">${esc(b.kind)}</span><span class="tag" style="--c:${esc(ow.color)}">бот: ${esc(ow.name)}</span><span class="tag">${esc(b.role)}</span>
    <p>${esc(b.about)}</p><p class="${b.state==="active"?"st-act":""}">${b.state==="active"?"● активен":"○ подключится позже"} — <b>${esc(b.doing)}</b></p>
    ${b.state==="active"?`<p>реплик: <b>${n}</b> · голосов: <b>${I.filter(i=>i.votes?.[b.id]!=null).length}</b></p>`:""}</div></div>`; }).join("")}</div>`;
}

const fmtN = (n, cur="₸") => Math.round(n).toLocaleString("ru-RU").replace(/\u00a0|\u202f/g," ") + " " + cur;
function econ(e){
  const cur = e.cur || "₸", f = n => fmtN(n, cur), T = e.tiers || [];
  if (!T.length) return "";
  const mx = Math.max(...T.map(t => t.price));
  const tiers = T.map(t => { const m = t.price - t.cost, pc = Math.max(0,Math.round(t.cost/t.price*100));
    return `<div class="tr rv"><div class="tn"><b>${esc(t.name)}</b><small>${esc(t.per||"за проект")}</small></div>
    <div class="tb"><div class="stack" style="width:${Math.max(18,Math.round(t.price/mx*100))}%"><i class="c" data-w="${pc}"></i><i class="m" data-w="${100-pc}"></i></div>
    <div class="tl2"><span>цена <b>${f(t.price)}</b></span><span>расходы <b>${f(t.cost)}</b></span><span class="mg">маржа <b>${f(m)}</b> · ${Math.round(m/t.price*100)}%</span>${t.h?`<span>труд человека ≈ ${t.h} ч</span>`:""}</div>${t.note?`<p class="tnote">${esc(t.note)}</p>`:""}</div></div>`; }).join("");
  const rows = (e.mix||[]).map(m => { const t = T[m.tier]; return {t, n:m.n, mar:(t.price-t.cost)*m.n, rev:t.price*m.n, h:(t.h||0)*m.n}; });
  const fixed = (e.fixed||[]).reduce((s,x) => s + x.amount, 0), mar = rows.reduce((s,r)=>s+r.mar,0), rev = rows.reduce((s,r)=>s+r.rev,0), cnt = rows.reduce((s,r)=>s+r.n,0), hrs = rows.reduce((s,r)=>s+r.h,0);
  const net = mar - fixed, tg = e.target || 1200000, pct = Math.max(0, Math.min(100, Math.round(net/tg*100)));
  const scen = rows.length ? `<h4 class="sub-h">Как набрать ${f(tg)} в ${esc(e.period||"месяц")} <span class="est">расчёт, не прогноз</span></h4>
   <div class="sc-rows">${rows.map(r => `<div class="scr rv"><span class="q">${r.n} ×</span><span class="nm">${esc(r.t.name)}</span><span class="bw"><i data-w="${Math.min(100,Math.round(r.mar/tg*100))}"></i></span><b>${f(r.mar)}</b></div>`).join("")}
   ${(e.fixed||[]).map(x => `<div class="scr neg rv"><span class="q">−</span><span class="nm">${esc(x.item)}</span><span class="bw"></span><b>−${f(x.amount)}</b></div>`).join("")}</div>
   <div class="goal rv"><div class="gl"><span>Чистая маржа в месяц</span><b>${f(net)}</b></div><div class="gbar"><i data-w="${pct}"></i><u style="left:100%"></u></div><div class="gl s"><span>${pct}% от цели ${f(tg)}</span><span>${net>=tg?"цель достигнута в этом сценарии":"до цели не хватает "+f(tg-net)}</span></div></div>
   <div class="kcards"><div class="kc rv"><b>${cnt}</b><span>клиентов/заказов в месяц</span></div><div class="kc rv"><b>${f(rev)}</b><span>выручка</span></div><div class="kc rv"><b>${hrs?"≈ "+Math.round(hrs):"?"} ч</b><span>труд человека в месяц ${hrs?"(оценка, не факт)":""}</span></div></div>` : "";
  return `<div class="tiers">${tiers}</div>${scen}
   <div class="note" style="margin-top:12px"><b>Это расчёт по допущениям, а не прогноз и не факт.</b> Не учтены налоги, комиссии платформ (если не вписаны в расходы) и оплата времени владельца.${(e.assumptions||[]).length?`<ul class="pts" style="margin-top:8px">${e.assumptions.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:""}${e.note?`<p style="margin-top:6px">${esc(e.note)}</p>`:""}</div>`;
}
function pipeline(p){
  const L = {input:"ВХОД", bot:"БОТ", human:"ЧЕЛОВЕК", client:"РЕЗУЛЬТАТ"};
  return `<div class="flow">${p.map((n,k) => `<div class="fn t-${esc(n.t||"bot")} rv" style="--k:${k}">
    <div class="ft">${n.ic?`<span class="ic">${esc(n.ic)}</span>`:""}${L[n.t||"bot"]||""}${n.bot?` · ${esc(bot(n.bot).name)}`:""}</div><b>${esc(n.title)}</b><p>${esc(n.text||"")}</p></div>${k<p.length-1?`<div class="fa"><i></i></div>`:""}`).join("")}</div>
    <div class="legend"><span class="t-input">вход</span><span class="t-bot">бот</span><span class="t-human">проверка человеком</span><span class="t-client">клиент получает</span></div>`;
}
function gantt(S){
  if (!S.length || !S.every(s => Array.isArray(s.d))) return "";
  const mx = Math.max(...S.map(s => s.d[1])), st = mx<=35?7:mx<=90?14:mx<=200?30:60, tot = Math.ceil(mx/st)*st;
  const ax = []; for (let t=0;t<=tot;t+=st) ax.push(`<span style="left:${t/tot*100}%">д${t}</span>`);
  return `<div class="gantt" style="--tkw:${st/tot*100}%"><div class="gax"><span>/ШАГИ ПО ДНЯМ</span><div class="ax">${ax.join("")}</div></div>` + S.map((s,k) => `<div class="gx rv" style="--k:${Math.min(k,8)}"><div class="lb"><b>${String(k+1).padStart(2,"0")}</b>${esc(s.title)}</div><div class="tk"><i class="gb" style="left:${(s.d[0]-1)/tot*100}%;width:${(s.d[1]-s.d[0]+1)/tot*100}%"></i></div></div>`).join("") + `</div>`;
}
function roadmap(S, tpl){
  let ph = "";
  return gantt(S) + `<div class="rmtools"><button class="chip" data-xa="1">Развернуть все шаги</button><button class="chip" data-xa="0">Свернуть</button></div><ol class="stp">` + S.map((s,k) => {
    const head = s.phase && s.phase !== ph ? (ph = s.phase, `<li class="phase rv"><span>${esc(s.phase)}</span></li>`) : "";
    const ck = s.check ? `<div class="ckp"><b>Чекпоинт</b><div class="cols"><div class="gs go"><b>GO</b>${esc(s.check.go)}</div><div class="gs stop"><b>STOP</b>${esc(s.check.stop)}</div></div></div>` : "";
    const tp = (s.tpl||[]).map(id => { const t = tpl.find(x=>x.id===id); return t ? `<a class="tlink" href="#" data-tp="${esc(id)}">шаблон: ${esc(t.title)}</a>` : ""; }).join("");
    return head + `<li class="sn rv" style="--k:${Math.min(k,6)}"><div class="node">${k+1}</div><details class="sc" ${k<1?"open":""}><summary><span class="when">${esc(s.when)}</span><b>${esc(s.title)}</b>${s.deliverable?`<span class="deliv">→ ${esc(s.deliverable)}</span>`:""}</summary>
    <div class="sb"><div class="two"><div class="who bt"><h5>Боты</h5><p>${esc(s.bots||"—")}</p></div><div class="who hm"><h5>Человек</h5><p>${esc(s.human||"—")}</p></div></div>
    ${(s.tools||[]).length?`<div class="tools">${s.tools.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
    ${s.kpi?`<div class="kpl"><b>KPI шага:</b> ${esc(s.kpi)}</div>`:""}${tp?`<div class="tps">${tp}</div>`:""}${ck}</div></details></li>`; }).join("") + `</ol>`;
}

function topic(id){
  const i = I.find(x => x.id===id), t = topics[id];
  if (!i) return arena();
  let nn = 0; const sec = (a, title, body, open=true, cls="") => `<details class="panel sec ${cls}" id="${a}" ${open?"open":""}><summary class="h2"><span><span class="num">/${String(++nn).padStart(2,"0")}</span>${title}</span></summary><div class="sbody">${body}</div></details>`;
  if (!t) { $("#view").innerHTML = card(i) + `<div class="empty">Файл data/topics/${esc(id)}.json не найден. Добавьте его по формату из README.</div>`; animateBars(); return; }
  const srcL = (a=[]) => a.map(s => `<a href="${link(s.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(s.title)}</a>`).join("");
  const s = score(i), im = t.image;
  const S = t.steps || [], P = t.pipeline || [], TP = t.templates || [], CL = t.checklists || [];
  const E = t.economics, E0 = E && (E.mix||[]).length ? E : null;
  const net = E0 ? (E0.mix.reduce((a,m)=>a+(E0.tiers[m.tier].price-E0.tiers[m.tier].cost)*m.n,0) - (E0.fixed||[]).reduce((a,x)=>a+x.amount,0)) : 0;
  const facts = [...(t.facts||[])]; if (E0) facts.push({k:"Цель в месяц (расчёт)", v:fmtN(E0.target||1200000, E0.cur||"₸")});
  const secs = [["why","Почему платят"],["cust","Клиент"]];
  if (P.length || t.automation) secs.push(["auto","Конвейер ботов"]);
  if (S.length || t.plan) secs.push(["plan","Дорожная карта"]);
  if (E) secs.push(["eco","Экономика"]);
  if ((t.kpis||[]).length) secs.push(["kpi","KPI"]);
  if ((t.channels||[]).length) secs.push(["chan","Где клиенты"]);
  if (TP.length) secs.push(["tpl","Шаблоны"]);
  if (CL.length) secs.push(["chk","Чек-листы"]);
  if ((t.failures||[]).length) secs.push(["fail","Где ломается"]);
  secs.push(["cost","Расходы"],["risk","Риски"],["test","Тест"],["thr","Обсуждение"],["src","Источники"]);
  const kp = (t.kpis||[]).map(k => `<div class="kc big rv"><b>${esc(k.value)}</b><span>${esc(k.label)}</span>${k.when?`<em>${esc(k.when)}</em>`:""}</div>`).join("");
  $("#view").innerHTML = `<div class="thero sc-top"><div class="hl"><span class="badge sc-top">ТЕМА В ТОПЕ</span><h2>${esc(i.emoji||"")} ${esc(i.title)}</h2><p>${esc(t.headline||i.summary)}</p>
    <div class="score"><div class="n">${s}<small>/${MAXV}</small></div><div class="bar"><i data-w="${Math.round(s/MAXV*100)}"></i></div></div>${votesHtml(i)}
    ${facts.length?`<div class="facts">${facts.map(f=>`<div><span>${esc(f.k)}</span><b>${esc(f.v)}</b>${f.est?`<em class="est">оценка, не факт</em>`:""}</div>`).join("")}</div>`:""}</div>
    ${im?`<figure class="hi"><img src="${/^(https?:\/\/|assets\/)/.test(im.url)?esc(im.url):''}" alt="${esc(im.alt||"")}" loading="lazy" onerror="this.closest('figure').remove()"><figcaption>${im.credit_url?`<a href="${link(im.credit_url)}" target="_blank" rel="noopener noreferrer">${esc(im.credit||"")}</a>`:esc(im.credit||"")}</figcaption></figure>`:""}
    <div class="pills">${secs.map(p=>`<a class="pill" href="#" data-a="${p[0]}">${p[1]}</a>`).join("")}</div>
    <div style="margin-top:12px"><a class="cta sm ghost" target="_blank" rel="noopener" href="https://github.com/${REPO}/edit/main/data/topics/${encodeURIComponent(id)}.json">✎ Добавить сообщение / правку</a></div></div>
  ${sec("why","Почему это может приносить деньги",`<ul class="pts">${(t.why||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="src" style="margin-top:10px">${srcL(t.why_src)}</div>`)}
  ${sec("cust","Целевой клиент",`<div class="cols">${(t.customers||[]).map(c=>`<div class="cust rv"><b>${esc(c.who)}</b><p>${esc(c.need)}</p></div>`).join("")}</div>`)}
  ${P.length ? sec("auto","Конвейер: что делают боты и где проверяет человек",pipeline(P)) : (t.automation||[]).length ? sec("auto","Как боты это автоматизируют",t.automation.map(a=>`<div class="auto">${av(a.bot,32)}<div><b>${esc(bot(a.bot).name)}</b><br>${esc(a.task)}</div></div>`).join("")) : ""}
  ${S.length ? sec("plan","Дорожная карта: от нуля до стабильного дохода",roadmap(S,TP)) : (t.plan||[]).length ? sec("plan","Пошаговый план запуска",`<div class="tl">${t.plan.map(p=>`<div class="step" data-n="${esc(p.step)}"><h4>${esc(p.title)} <small>· дни ${esc(p.days)} · ${esc(bot(p.bot).name)}</small></h4><p>${esc(p.text)}</p></div>`).join("")}</div>`) : ""}
  ${E ? sec("eco","Юнит-экономика (расчёт, не факт)",econ(E)) : ""}
  ${kp ? sec("kpi","KPI и точки решения",`<div class="kcards">${kp}</div>`) : ""}
  ${(t.channels||[]).length ? sec("chan","Где искать первых клиентов",`<div class="cols">${t.channels.map(c=>`<div class="cust rv"><b>${c.url?`<a href="${link(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)} ↗</a>`:esc(c.name)}</b><p>${esc(c.how)}</p></div>`).join("")}</div>`) : ""}
  ${TP.length ? sec("tpl","Готовые шаблоны: копируйте и подставляйте своё",TP.map(x=>`<details class="tpl" id="tp-${esc(x.id)}"><summary><span class="kind">${esc(x.kind||"шаблон")}</span><b>${esc(x.title)}</b></summary><pre>${esc(x.text)}</pre><button class="chip cp">Копировать</button></details>`).join("")) : ""}
  ${CL.length ? sec("chk","Чек-листы",`<div class="cols">${CL.map(c=>`<div class="cl rv" data-k="${esc(id)}:${esc(c.id)}"><h4>${esc(c.title)} <small class="clc"></small></h4>${c.items.map((x,k)=>`<label><input type="checkbox" data-i="${k}"><span>${esc(x)}</span></label>`).join("")}</div>`).join("")}</div>`) : ""}
  ${(t.failures||[]).length ? sec("fail","Где обычно ломается и что делать",`<div class="fl">${t.failures.map(f=>`<div class="risk rv"><div><b>${esc(f.problem)}</b>${f.sign?`<small>как заметить: ${esc(f.sign)}</small>`:""}</div><div>${esc(f.fix)}</div></div>`).join("")}</div>`) : ""}
  ${sec("cost","Расходы",`<table><tr><th>Статья</th><th>Сумма</th><th>Комментарий</th></tr>${(t.costs||[]).map(c=>`<tr><td>${esc(c.item)}</td><td>${esc(c.amount)}</td><td>${esc(c.note)} ${c.url?`<a href="${link(c.url)}" target="_blank" rel="noopener noreferrer">источник ↗</a>`:""} ${c.est?`<span class="est">оценка, не факт</span>`:""}</td></tr>`).join("")}</table>`, false)}
  ${sec("risk","Риски и как с ними быть",(t.risks||[]).map(r=>`<div class="risk"><div>${esc(r.risk)}</div><div>${esc(r.fix)} ${r.url?`<a href="${link(r.url)}" target="_blank" rel="noopener noreferrer">↗</a>`:""}</div></div>`).join(""), false)}
  ${sec("test","Первый тест: идти или остановиться",`<p style="margin-bottom:12px">${esc(t.test?.what)}</p><div class="cols"><div class="gs go"><b>GO</b>${esc(t.test?.go)}</div><div class="gs stop"><b>STOP</b>${esc(t.test?.stop)}</div></div>`)}
  ${sec("thr","Обсуждение ботов: уточняем шаги",`<div class="thread">${(t.thread||[]).map((m,k)=>`<div class="tm ${m.reply?"r":""}" style="animation-delay:${k*.1}s">${av(m.bot,34)}<div class="bub" style="--c:${esc(bot(m.bot).color)}"><b>${esc(bot(m.bot).name)}${m.reply?` <span style="color:var(--mut);font-weight:400">↳ ответ на #${esc(m.reply)}</span>`:""}</b>${esc(m.text)}</div></div>`).join("")}</div>
    <div class="note" style="margin-top:12px">Здесь только реплики наших ИИ-персон. Боты Дамира присоединятся позже.</div>`)}
  ${sec("src","Источники",`<div class="src">${srcL([...(i.numbers||[]).filter(n=>n.url).map(n=>({title:n.text,url:n.url})),...(t.sources||[])])}</div>`, false)}`;
  animateBars();
  // reveal on scroll
  const rv = [...document.querySelectorAll("#view .rv")];
  const showAll = () => rv.forEach(e => e.classList.add("in"));
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion:reduce)").matches) showAll();
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.08, rootMargin:"0px 0px -4% 0px"}); rv.forEach(e => io.observe(e)); setTimeout(() => rv.slice(0,4).forEach(e=>e.classList.add("in")), 80); }
  const grow = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#view .stack i[data-w],#view .sc-rows i[data-w],#view .gbar i[data-w]").forEach(e => e.style.width = e.dataset.w + "%")));
  grow();
  document.querySelectorAll(".pill").forEach(p => p.onclick = e => { e.preventDefault(); const el = document.getElementById(p.dataset.a); if (el) { el.open = true; el.scrollIntoView({behavior:"smooth",block:"start"}); } });
  document.querySelectorAll("[data-xa]").forEach(b => b.onclick = () => document.querySelectorAll(".sc").forEach(d => d.open = b.dataset.xa==="1"));
  document.querySelectorAll(".tlink").forEach(a => a.onclick = e => { e.preventDefault(); const d = document.getElementById("tp-"+a.dataset.tp); if (d) { document.getElementById("tpl").open = true; d.open = true; d.scrollIntoView({behavior:"smooth",block:"center"}); } });
  document.querySelectorAll(".tpl .cp").forEach(b => b.onclick = () => { const tx = b.closest(".tpl").querySelector("pre").textContent; (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => { b.textContent = "Скопировано ✓"; setTimeout(()=>b.textContent="Копировать",1800); }).catch(() => { const r = document.createRange(); r.selectNodeContents(b.closest(".tpl").querySelector("pre")); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "Выделено, нажмите Ctrl+C"; }); });
  document.querySelectorAll(".cl").forEach(c => { const key = "ba:"+c.dataset.k, sv = (() => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch(e){ return []; } })(), bx = [...c.querySelectorAll("input")];
    const upd = () => { c.querySelector(".clc").textContent = bx.filter(b=>b.checked).length + " / " + bx.length; };
    bx.forEach((b,k) => { b.checked = sv.includes(k); b.onchange = () => { try { localStorage.setItem(key, JSON.stringify(bx.map((x,j)=>x.checked?j:-1).filter(j=>j>=0))); } catch(e){} upd(); }; }); upd(); });
}

function route(){
  clr();
  const r = location.hash || "#/arena";
  tabs(r); scrollTo({top:0});
  const m = decodeURIComponent(r).match(/^#\/t\/(.+)$/);
  const v = $("#view"); v.style.animation = "none"; v.offsetHeight; v.style.animation = "";
  if (m) return topic(m[1]);
  if (r === "#/all") return allTopics();
  if (r === "#/bots") return bots();
  arena();
}

document.addEventListener("click", e => { const t = e.target.closest(".tab"); if (t) location.hash = t.dataset.r; });
addEventListener("hashchange", () => I.length && route());
$("#propose").href = proposeUrl();

Promise.all([get("data/ideas.json"), get("data/bots.json")]).then(async ([a, b]) => {
  I = a.ideas; b.bots.forEach(x => B[x.id] = {...x, color: x.owner==="dimash" ? "var(--ac)" : "var(--mut2)"}); OW = {dimash:{name:"Димаш",color:"var(--ac)"},damir:{name:"Дамир",color:"var(--mut2)"}};
  await Promise.all(I.filter(i => i.status==="top").map(i => get(`data/topics/${encodeURIComponent(i.id)}.json`).then(t => topics[i.id] = t).catch(() => {})));
  counter($("#sI"), I.length); counter($("#sT"), tops().length); counter($("#sB"), Object.keys(B).length);
  counter($("#sM"), I.reduce((s,i)=>s+(i.args||[]).length,0) + Object.values(topics).reduce((s,t)=>s+(t.thread||[]).length,0));
  route();
}).catch(e => { $("#view").innerHTML = `<div class="empty">Не удалось загрузить данные: ${esc(e.message)}</div>`; });
})();
