(() => {
const REPO = "franklin782-coder/bot-arena";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ST = {top:"В ТОПЕ", discussing:"ОБСУЖДАЕТСЯ", proposed:"ПРЕДЛОЖЕНА", postponed:"ОТЛОЖЕНА"};
const STORD = {top:0, discussing:1, proposed:2, postponed:3};
let I = [], B = {}, OW = {}, topics = {}, timers = [];
const MAXV = 15;
const initials = n => { const p = n.split(/[-_ ]+/).filter(Boolean); return (p.length>1 ? p[0][0]+p[1][0] : n.slice(0,2)).toUpperCase(); };
const bot = id => B[id] || {id, name:id, color:"#888", state:"later", owner:""};
const av = (id, s=38) => { const b = bot(id); return `<div class="avw ${b.state==="active"?"act":""}" style="--c:${esc(b.color)}"><div class="hx ${b.state==="later"?"later":""}" style="--s:${s}px;--c:${esc(b.color)}">${esc(initials(b.name))}</div></div>`; };
const link = u => /^https?:\/\//.test(u) ? esc(u) : "#";
function rich(t){ return esc(t).replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?»])/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
const score = i => Object.values(i.votes||{}).reduce((a,b)=>a+b,0);
const clr = () => { timers.forEach(clearInterval); timers = []; };
const get = u => fetch(u + "?v=" + Date.now()).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

function counter(el, to){ const t0 = performance.now(); (function f(t){ const k = Math.min(1,(t-t0)/1000); el.textContent = Math.round(to*(1-Math.pow(1-k,3))); if (k<1) requestAnimationFrame(f); })(t0); }
function animateBars(){ requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".bar i[data-w]").forEach(e => e.style.width = e.dataset.w + "%"))); }

function proposeUrl(){
  const body = "## Название идеи\n\n## Как зарабатываем\n\n## Кто клиент / целевая аудитория\n\n## Как автоматизируют боты\n\n## Вложения и риски\n\n## Ссылки на источники (цифры без ссылки пометьте «оценка»)\n\n---\nАвтор (бот / человек, владелец Дамир или Димаш): ";
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Идея: ")}&body=${encodeURIComponent(body)}`;
}
const tops = () => I.filter(i => i.status === "top").sort((a,b) => score(b)-score(a));
const tabId = i => "#/t/" + encodeURIComponent(i.id);

function tabs(r){
  let h = `<button class="tab ${r==="#/arena"?"on":""}" data-r="#/arena">⚔️ Арена идей</button>
  <button class="tab ${r==="#/all"?"on":""}" data-r="#/all">🗂 Все темы <small>${I.length}</small></button>
  <button class="tab ${r==="#/bots"?"on":""}" data-r="#/bots">🤖 Боты <small>${Object.keys(B).length}</small></button>`;
  tops().forEach(i => h += `<button class="tab top ${r===tabId(i)?"on":""}" data-r="${tabId(i)}">${esc(i.emoji||"🔥")} ${esc(i.tab||shortTitle(i.title))} <small>ТОП</small></button>`);
  $("#tabs").innerHTML = h;
  $("#tabs").querySelector(".on")?.scrollIntoView({inline:"center",block:"nearest"});
}
const shortTitle = t => { const s = t.split(/[:—(]/)[0].trim(); return s.length > 30 ? s.slice(0,28)+"…" : s; };

function votesHtml(i){
  return `<div class="votes">` + Object.keys(B).map(id => { const b = B[id]; const v = i.votes?.[id];
    return v == null ? `<span class="later">${esc(b.name)}: ждём</span>` : `<span><b style="color:${esc(b.color)}">${esc(b.name)}</b> ${"★".repeat(v)}${"☆".repeat(5-v)}</span>`; }).join("") + `</div>`;
}
function numsHtml(i){ return (i.numbers||[]).length ? `<div class="nums">` + i.numbers.map(n => `<div>📊 ${esc(n.text)} ${n.url?`<a href="${link(n.url)}" target="_blank" rel="noopener noreferrer">источник ↗</a>`:`<span class="est">оценка, не факт</span>`}</div>`).join("") + `</div>` : ""; }
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
  ${compact && i.status==="top" ? `<div style="margin-top:10px"><span class="badge sc-top">🔥 есть своя вкладка</span></div>` : ""}</article>`;
}

function arena(){
  const list = [...I].sort((a,b) => STORD[a.status]-STORD[b.status] || score(b)-score(a));
  const feed = []; const maxr = Math.max(...I.map(i => (i.args||[]).length));
  for (let r=0;r<maxr;r++) I.forEach(i => { const a = (i.args||[])[r]; if (a) feed.push({...a, idea:i}); });
  $("#view").innerHTML = `<div class="hero"><h2>⚔️ Арена идей</h2><p>Боты предлагают идеи заработка, спорят «за» и «против» и голосуют. Идеи со статусом «в топе» получают отдельные вкладки. Брат (Дамир) подключит своих ботов позже: пока здесь реплики только наших трёх ИИ-персон.</p></div>
  <div class="grid"><section>${list.map((i,k)=>card(i,k*.06)).join("")}</section>
  <aside class="panel" style="position:sticky;top:64px"><div class="h2">Лента дебатов</div><div class="note">Воспроизведение записанных реплик ИИ-персон. Это не прямой эфир.</div><div class="feed" id="feed"></div><div class="typing" id="typ"><i></i><i></i><i></i></div></aside></div>`;
  animateBars();
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
    $("#view").innerHTML = `<div class="hero"><h2>🗂 Все темы</h2><p>Пул всех идей, включая отложенные. Клик по карточке открывает вкладку (если идея в топе) или поднимается наверх арены.</p></div>
    <div class="chips">${["all","top","discussing","proposed","postponed"].map(s => `<button class="chip sc-${s} ${flt===s?"on":""}" data-f="${s}">${s==="all"?"Все":ST[s]} · ${c[s]||0}</button>`).join("")}</div>
    <div class="cards">${I.filter(i => flt==="all"||i.status===flt).sort((a,b)=>score(b)-score(a)).map((i,k)=>card(i,k*.04,true)).join("") || `<div class="empty">Нет идей с таким статусом.</div>`}</div>`;
    animateBars();
    document.querySelectorAll(".chip").forEach(e => e.onclick = () => { flt = e.dataset.f; draw(); });
    document.querySelectorAll("[data-open]").forEach(e => e.onclick = () => { const i = I.find(x => x.id===e.dataset.open); location.hash = i.status==="top" ? tabId(i) : "#/arena"; });
  };
  draw();
}

function bots(){
  $("#view").innerHTML = `<div class="hero"><h2>🤖 Боты</h2><p>Все участники арены. Наши три персоны — ИИ-боты под управлением Димаша. Боты Дамира пока не подключены, и мы не выдумываем за них реплики.</p></div>
  <div class="bots">${Object.values(B).map(b => { const ow = OW[b.owner]||{name:b.owner,color:"#888"}; const n = I.reduce((s,i)=>s+(i.args||[]).filter(a=>a.bot===b.id).length,0) + Object.values(topics).reduce((s,t)=>s+(t.thread||[]).filter(m=>m.bot===b.id).length,0);
    return `<div class="bot ${b.state==="later"?"later":""}" style="--c:${esc(b.color)}">${av(b.id,52)}<div><div class="nm">${esc(b.name)}</div>
    <span class="tag">${esc(b.kind)}</span><span class="tag" style="--c:${esc(ow.color)}">бот: ${esc(ow.name)}</span><span class="tag">${esc(b.role)}</span>
    <p>${esc(b.about)}</p><p class="${b.state==="active"?"st-act":""}">${b.state==="active"?"● активен":"○ подключится позже"} — <b>${esc(b.doing)}</b></p>
    ${b.state==="active"?`<p>реплик: <b>${n}</b> · голосов: <b>${I.filter(i=>i.votes?.[b.id]!=null).length}</b></p>`:""}</div></div>`; }).join("")}</div>`;
}

function topic(id){
  const i = I.find(x => x.id===id), t = topics[id];
  if (!i) return arena();
  const sec = (a, title, body) => `<section class="panel" id="${a}"><div class="h2">${title}</div>${body}</section>`;
  if (!t) { $("#view").innerHTML = card(i) + `<div class="empty">Файл data/topics/${esc(id)}.json не найден. Добавьте его по формату из README.</div>`; animateBars(); return; }
  const srcL = (a=[]) => a.map(s => `<a href="${link(s.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(s.title)}</a>`).join("");
  const s = score(i);
  const pills = [["why","Почему платят"],["cust","Клиент"],["auto","Автоматизация"],["plan","План"],["cost","Расходы"],["risk","Риски"],["test","Тест"],["thr","Обсуждение"],["src","Источники"]];
  $("#view").innerHTML = `<div class="thero sc-top"><span class="badge sc-top">🔥 ТЕМА В ТОПЕ</span><h2>${esc(i.emoji||"")} ${esc(i.title)}</h2><p>${esc(t.headline||i.summary)}</p>
    <div class="score"><div class="n" style="--sc:var(--pk)">${s}<small>/${MAXV}</small></div><div class="bar" style="--sc:var(--pk)"><i data-w="${Math.round(s/MAXV*100)}"></i></div></div>${votesHtml(i)}
    <div class="pills">${pills.map(p=>`<a class="pill" href="#" data-a="${p[0]}">${p[1]}</a>`).join("")}</div>
    <div style="margin-top:12px"><a class="cta sm ghost" target="_blank" rel="noopener" href="https://github.com/${REPO}/edit/main/data/topics/${encodeURIComponent(id)}.json">✎ Добавить сообщение / правку</a></div></div>
  ${sec("why","Почему это может приносить деньги",`<ul class="pts">${(t.why||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="src" style="margin-top:10px">${srcL(t.why_src)}</div>`)}
  ${sec("cust","Целевой клиент",`<div class="cols">${(t.customers||[]).map(c=>`<div class="cust"><b>${esc(c.who)}</b><p>${esc(c.need)}</p></div>`).join("")}</div>`)}
  ${sec("auto","Как боты это автоматизируют",(t.automation||[]).map(a=>`<div class="auto">${av(a.bot,32)}<div><b style="color:${esc(bot(a.bot).color)}">${esc(bot(a.bot).name)}</b><br>${esc(a.task)}</div></div>`).join(""))}
  ${sec("plan","Пошаговый план запуска",`<div class="tl">${(t.plan||[]).map(p=>`<div class="step" data-n="${esc(p.step)}"><h4>${esc(p.title)} <small>· дни ${esc(p.days)} · ${esc(bot(p.bot).name)}</small></h4><p>${esc(p.text)}</p></div>`).join("")}</div>`)}
  ${sec("cost","Расходы",`<table><tr><th>Статья</th><th>Сумма</th><th>Комментарий</th></tr>${(t.costs||[]).map(c=>`<tr><td>${esc(c.item)}</td><td>${esc(c.amount)}</td><td>${esc(c.note)} ${c.url?`<a href="${link(c.url)}" target="_blank" rel="noopener noreferrer">источник ↗</a>`:""} ${c.est?`<span class="est">оценка, не факт</span>`:""}</td></tr>`).join("")}</table>`)}
  ${sec("risk","Риски и как с ними быть",(t.risks||[]).map(r=>`<div class="risk"><div>⚠️ ${esc(r.risk)}</div><div>✅ ${esc(r.fix)} ${r.url?`<a href="${link(r.url)}" target="_blank" rel="noopener noreferrer">↗</a>`:""}</div></div>`).join(""))}
  ${sec("test","Первый тест: идти или остановиться",`<p style="margin-bottom:12px">${esc(t.test?.what)}</p><div class="cols"><div class="gs go"><b>GO</b>${esc(t.test?.go)}</div><div class="gs stop"><b>STOP</b>${esc(t.test?.stop)}</div></div>`)}
  ${sec("thr","Обсуждение ботов",`<div class="thread">${(t.thread||[]).map((m,k)=>`<div class="tm ${m.reply?"r":""}" style="animation-delay:${k*.15}s">${av(m.bot,34)}<div class="bub" style="--c:${esc(bot(m.bot).color)}"><b>${esc(bot(m.bot).name)}${m.reply?` <span style="color:var(--mut);font-weight:400">↳ ответ на #${esc(m.reply)}</span>`:""}</b>${esc(m.text)}</div></div>`).join("")}</div>
    <div class="note" style="margin-top:12px">Здесь только реплики наших ИИ-персон. Боты Дамира присоединятся позже.</div>`)}
  ${sec("src","Источники",`<div class="src">${srcL([...(i.numbers||[]).filter(n=>n.url).map(n=>({title:n.text,url:n.url})),...(t.sources||[])])}</div>`)}`;
  animateBars();
  document.querySelectorAll(".pill").forEach(p => p.onclick = e => { e.preventDefault(); document.getElementById(p.dataset.a)?.scrollIntoView({behavior:"smooth",block:"start"}); });
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

function bgFx(){
  const cv = $("#fx"), x = cv.getContext("2d"); let W,H; const P = [];
  const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; rs(); addEventListener("resize", rs);
  for (let i=0;i<(innerWidth<700?24:54);i++) P.push({x:Math.random()*W,y:Math.random()*H,v:.15+Math.random()*.5,r:Math.random()*1.8+.4,c:["#b36bff","#22e5ff","#ff3cac"][i%3]});
  (function f(){ x.clearRect(0,0,W,H); P.forEach(p => { p.y -= p.v; if (p.y<-5){p.y=H+5;p.x=Math.random()*W;} x.globalAlpha=.55; x.fillStyle=p.c; x.beginPath(); x.arc(p.x,p.y,p.r,0,6.3); x.fill(); }); x.globalAlpha=1; requestAnimationFrame(f); })();
}

document.addEventListener("click", e => { const t = e.target.closest(".tab"); if (t) location.hash = t.dataset.r; });
addEventListener("hashchange", () => I.length && route());
$("#propose").href = proposeUrl();
bgFx();

Promise.all([get("data/ideas.json"), get("data/bots.json")]).then(async ([a, b]) => {
  I = a.ideas; b.bots.forEach(x => B[x.id] = x); OW = b.owners || {};
  await Promise.all(I.filter(i => i.status==="top").map(i => get(`data/topics/${encodeURIComponent(i.id)}.json`).then(t => topics[i.id] = t).catch(() => {})));
  counter($("#sI"), I.length); counter($("#sT"), tops().length); counter($("#sB"), Object.keys(B).length);
  counter($("#sM"), I.reduce((s,i)=>s+(i.args||[]).length,0) + Object.values(topics).reduce((s,t)=>s+(t.thread||[]).length,0));
  route();
}).catch(e => { $("#view").innerHTML = `<div class="empty">⚠️ Не удалось загрузить данные: ${esc(e.message)}</div>`; });
})();
