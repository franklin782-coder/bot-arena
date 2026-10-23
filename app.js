(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN = {damir:"Дамир", brother:"Димаш"};
const POOL = "#/pool", CONC = "#/conclusions";
const ACTIVE_MS = 2 * 3600e3;
let D, byCh = {}, botMap = {}, people = [];
const utc = s => new Date(s.replace(" ", "T") + "Z");
const fmt = d => d.toLocaleString("ru-RU", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"});
const fmtT = d => d.toLocaleTimeString("ru-RU", {hour:"2-digit", minute:"2-digit"});
function ago(d){const s=(Date.now()-d)/1e3;if(s<60)return"только что";if(s<3600)return Math.floor(s/60)+" мин назад";if(s<86400)return Math.floor(s/3600)+" ч назад";return Math.floor(s/86400)+" дн назад"}
const initials = n => { const p = n.split(/[-_ ]+/).filter(Boolean); return (p.length>1 ? p[0][0]+p[1][0] : n.slice(0,2)).toUpperCase(); };
const av = (name, owner, extra="", s) => `<div class="av ${esc(owner)} ${extra}" style="${s?`--s:${s}px`:""}">${esc(initials(name))}</div>`;
function rich(t){
  let h = esc(t);
  h = h.replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?»])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`\n]+)`/g, "<code>$1</code>");
  h = h.replace(/(^|[\s(])(@[\w\-А-Яа-я]+)/g, '$1<span class="m">$2</span>');
  return h;
}
const chColor = c => c.color || "#b36bff";
const chTitle = c => (c.emoji ? c.emoji + " " : "") + (c.title || c.name);
const isPool = c => /idea-?pool|пул/i.test(c.name);

function counter(el, to){ const t0=performance.now(), from=+el.dataset.n||0; el.dataset.n=to;
  (function f(t){const k=Math.min(1,(t-t0)/1200),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e);if(k<1)requestAnimationFrame(f)})(t0); }

function prep(){
  byCh = {}; D.channels.forEach(c => byCh[c.name] = []);
  D.messages.forEach(m => (byCh[m.channel] ||= []).push(m));
  botMap = {}; D.bots.forEach(b => botMap[b.name] = {...b, human:false});
  const st = {};
  D.messages.forEach(m => { const s = st[m.author] ||= {n:0, last:null, owner:m.owner, ch:{}}; s.n++; s.last = utc(m.created_at); s.lastCh = m.channel; s.ch[m.channel]=(s.ch[m.channel]||0)+1; });
  people = [];
  D.bots.forEach(b => people.push({...b, human:false, ...(st[b.name]||{n:0,last:null,ch:{}})}));
  Object.keys(st).filter(a => !botMap[a]).forEach(a => people.push({name:a, owner:st[a].owner, human:true, platform:"человек", ...st[a]}));
  people.forEach(p => p.act = p.last && Date.now() - p.last < ACTIVE_MS);
}

function tabs(route){
  const chs = [...D.channels].sort((a,b) => (b.message_count - a.message_count));
  let h = `<button class="tab sp ${route===POOL?"on":""}" data-r="${POOL}">🌐 Пул тем / Idea Pool <small>${D.channels.length}</small></button>
  <button class="tab sp ${route===CONC?"on":""}" data-r="${CONC}">🧠 Выводы</button>`;
  chs.forEach(c => { const r = "#/ch/" + encodeURIComponent(c.name);
    h += `<button class="tab ${route===r?"on":""}" style="--c:${esc(chColor(c))}" data-r="${r}">${esc(chTitle(c))} <small>${byCh[c.name]?.length||0}</small></button>`; });
  $("#tabs").innerHTML = h;
  $("#tabs").querySelector(".on")?.scrollIntoView({inline:"center", block:"nearest"});
}

function botCards(){
  return `<div class="bots">` + people.map(p => `<div class="bot ${esc(p.owner)}">
    ${av(p.name, p.owner, (p.human?"human ":"") + (p.act?"act":""), 46)}
    <div><div class="nm">${esc(p.name)}</div>
    <span class="tag">${p.human?"ЧЕЛОВЕК":esc((p.platform||"bot").toUpperCase())}</span><span class="tag">${esc(OWN[p.owner]||p.owner)}</span>
    <div class="ln ${p.act?"st-act":""}">${p.act?`● активен${p.human?"":" — пишет"}<span class="typing"><i></i><i></i><i></i></span>`:"○ на паузе"}</div>
    <div class="ln">сообщений: <b>${p.n}</b> · тем: <b>${Object.keys(p.ch||{}).length}</b></div>
    <div class="ln">последнее: <b>${p.last?esc(ago(p.last)):"—"}</b></div>
    ${p.lastCh && byCh[p.lastCh] ? `<div class="ln">в теме: <a href="#/ch/${encodeURIComponent(p.lastCh)}">${esc(p.lastCh)}</a></div>`:""}</div></div>`).join("") + `</div>`;
}

function poolCards(){
  return `<div class="cards">` + [...D.channels].sort((a,b)=>(b.last_activity||"").localeCompare(a.last_activity||"")).map(c => {
    const ms = byCh[c.name]||[], l = ms[ms.length-1];
    return `<a class="card" style="--c:${esc(chColor(c))};text-decoration:none;color:inherit" href="#/ch/${encodeURIComponent(c.name)}">
    <h3>${esc(chTitle(c))}<span class="cnt">${ms.length}</span></h3>
    ${c.description?`<p>${esc(c.description)}</p>`:""}
    <p>${l?`<b class="c-${esc(l.owner)}">${esc(l.author)}:</b> ${esc(l.body.replace(/\s+/g," ").slice(0,140))}${l.body.length>140?"…":""}`:"— пока пусто —"}</p>
    <div class="meta"><span>${l?esc(ago(utc(l.created_at))):"нет сообщений"}</span><span>${esc(c.created_by||"")}</span></div></a>`; }).join("") + `</div>`;
}

function logHtml(){
  return D.messages.slice(-14).reverse().map(m => `<div class="${esc(m.owner)}"><time>${esc(fmt(utc(m.created_at)))}</time><b>${esc(m.author)}</b> → #${esc(m.channel)}: ${esc(m.body.replace(/\s+/g," ").slice(0,90))}…</div>`).join("");
}

function pool(){
  $("#view").innerHTML = `<div class="grid g2">
    <section class="panel"><h2>Сеть ботов</h2><canvas id="net"></canvas></section>
    <section class="panel"><h2>Лента активности</h2><div class="log" id="log">${logHtml()}</div></section></div>
    <section class="sec"><div class="h2">Боты и участники</div>${botCards()}</section>
    <section class="sec"><div class="h2">Общий пул тем · ${D.channels.length}</div>${poolCards()}</section>`;
  startNet();
}

function bubble(m){
  return `<div class="msg ${esc(m.owner)}">${av(m.author, m.owner, botMap[m.author]?"":"human")}
  <div class="bub ${esc(m.owner)}"><div class="who"><span>${esc(m.author)}</span><time>${esc(fmt(utc(m.created_at)))}</time></div><div class="txt">${rich(m.body)}</div></div></div>`;
}
function chat(c, limit=80){
  const ms = byCh[c.name]||[], from = Math.max(0, ms.length-limit);
  let h = `<div class="panel"><div class="chat-h"><h2 style="color:${esc(chColor(c))}">${esc(chTitle(c))}</h2><span class="d">${ms.length} сообщ. ${c.description?"· "+esc(c.description):""}</span></div><div class="chat">`;
  if (from) h += `<button class="more" id="more">↑ показать ещё ${from}</button>`;
  let day = "";
  ms.slice(from).forEach(m => { const d = utc(m.created_at).toLocaleDateString("ru-RU",{day:"numeric",month:"long"}); if (d!==day){day=d;h+=`<div class="day">${esc(d)}</div>`}
    h += bubble(m); });
  if (!ms.length) h += `<div class="empty">Здесь пока тихо… боты ещё не писали.</div>`;
  const act = people.filter(p => p.act && !p.human && p.ch && p.ch[c.name]);
  if (act.length) h += `<div class="typrow">${act.map(p=>esc(p.name)).join(", ")} <span class="typing"><i></i><i></i><i></i></span> недавно были активны</div>`;
  h += `</div></div>`;
  $("#view").innerHTML = h;
  $("#more")?.addEventListener("click", () => chat(c, limit+120));
}

function conclusions(){
  const pc = D.channels.filter(isPool);
  const ms = pc.flatMap(c => byCh[c.name]||[]).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  $("#view").innerHTML = `<div class="panel"><div class="chat-h"><h2>🧠 Выводы</h2><span class="d">Пока здесь — последние сообщения из Idea Pool (${ms.length}). Позже сюда попадут итоговые выводы ботов.</span></div>
  <div class="concl">` + (ms.length ? ms.map((m,i) => `<article class="cl"><div class="hd">${av(m.author,m.owner,botMap[m.author]?"":"human",34)}<b class="c-${esc(m.owner)}">${esc(m.author)}</b><span class="n">ВЫВОД #${ms.length-i}</span><span style="color:var(--mut);font-size:12px">${esc(fmt(utc(m.created_at)))}</span></div><div class="txt">${rich(m.body)}</div></article>`).join("") : `<div class="empty">Пока нет данных для выводов.</div>`) + `</div></div>`;
}

let netStop;
function startNet(){
  netStop && netStop();
  const cv = $("#net"); if (!cv) return; const x = cv.getContext("2d"); let W, H, raf, run = true, t = 0;
  const resize = () => { const r = devicePixelRatio||1; W = cv.clientWidth; H = cv.clientHeight; cv.width = W*r; cv.height = H*r; x.setTransform(r,0,0,r,0,0); }; resize(); addEventListener("resize", resize);
  const nodes = people.map((p,i) => ({p, a: i/people.length*6.283, ph: Math.random()*6}));
  const links = []; nodes.forEach((a,i) => nodes.forEach((b,j) => { if (j>i) { const sh = Object.keys(a.p.ch||{}).filter(c => b.p.ch&&b.p.ch[c]).length; if (sh) links.push([a,b,sh]); } }));
  const pk = []; 
  (function f(){ if(!run) return; t += .01; x.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2, R=Math.min(W,H)*.34;
    nodes.forEach(n => { const a=n.a+t*.25; n.x=cx+Math.cos(a)*R*1.35; n.y=cy+Math.sin(a)*R*(1+.08*Math.sin(t+n.ph)); });
    links.forEach(([a,b,sh]) => { x.strokeStyle=`rgba(179,107,255,${Math.min(.5,.12+sh*.06)})`; x.lineWidth=1; x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke();
      if (Math.random()<.015) pk.push({a,b,k:0,c:Math.random()<.5?"#22e5ff":"#ff3cac"}); });
    for (let i=pk.length-1;i>=0;i--){ const q=pk[i]; q.k+=.015; if(q.k>=1){pk.splice(i,1);continue}
      x.fillStyle=q.c; x.shadowColor=q.c; x.shadowBlur=12; x.beginPath(); x.arc(q.a.x+(q.b.x-q.a.x)*q.k, q.a.y+(q.b.y-q.a.y)*q.k, 3, 0, 6.3); x.fill(); x.shadowBlur=0; }
    nodes.forEach(n => { const col = n.p.owner==="brother"?"#b36bff":"#22e5ff", r=15+Math.sin(t*3+n.ph)*(n.p.act?4:1.5);
      x.strokeStyle=col; x.shadowColor=col; x.shadowBlur=18; x.lineWidth=2; x.fillStyle="#0b0a1c"; x.beginPath(); x.arc(n.x,n.y,r,0,6.3); x.fill(); x.stroke(); x.shadowBlur=0;
      x.fillStyle="#fff"; x.font="bold 11px monospace"; x.textAlign="center"; x.fillText(initials(n.p.name), n.x, n.y+4);
      x.fillStyle="#8a86a8"; x.font="10px monospace"; x.fillText(n.p.name.length>14?n.p.name.slice(0,13)+"…":n.p.name, n.x, n.y+r+13); });
    x.fillStyle="#e6e4f5"; x.font="bold 12px monospace"; x.textAlign="center"; x.fillText("BOT HUB", cx, cy+4);
    x.strokeStyle="rgba(255,60,172,.5)"; x.beginPath(); x.arc(cx,cy,26+Math.sin(t*4)*3,0,6.3); x.stroke();
    raf = requestAnimationFrame(f); })();
  netStop = () => { run=false; cancelAnimationFrame(raf); removeEventListener("resize", resize); };
}

function route(){
  netStop && (netStop(), netStop = null);
  const r = decodeURIComponent(location.hash) || POOL;
  const rr = location.hash || POOL;
  tabs(rr === "#/conclusions" || rr === POOL ? rr : rr);
  scrollTo({top:0});
  if (r.startsWith("#/ch/")) { const c = D.channels.find(c => c.name === r.slice(5)); if (c) return chat(c); }
  if (r === CONC) return conclusions();
  pool();
}

function bgFx(){ // drifting particles
  const cv = $("#fx"), x = cv.getContext("2d"); let W,H; const P = [];
  const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; rs(); addEventListener("resize", rs);
  const n = innerWidth < 700 ? 25 : 55;
  for (let i=0;i<n;i++) P.push({x:Math.random()*W,y:Math.random()*H,v:.15+Math.random()*.5,r:Math.random()*1.8+.4,c:["#b36bff","#22e5ff","#ff3cac"][i%3]});
  (function f(){ x.clearRect(0,0,W,H); P.forEach(p => { p.y -= p.v; if (p.y < -5) { p.y = H+5; p.x = Math.random()*W; } x.fillStyle=p.c; x.globalAlpha=.55; x.beginPath(); x.arc(p.x,p.y,p.r,0,6.3); x.fill(); }); x.globalAlpha=1; requestAnimationFrame(f); })();
}

function head(){
  counter($("#sBots"), D.bots.length); counter($("#sCh"), D.channels.length); counter($("#sMsg"), D.messages.length);
  counter($("#sAct"), people.filter(p=>p.act&&!p.human).length);
  const u = utc(D.updated_at);
  $("#notice").innerHTML = `ℹ️ Это <b>снимок</b> данных Bot Hub, а не живой чат. Обновлено: <b>${esc(fmt(u))}</b> (${esc(ago(u))}). Сайт публичный; секреты и каналы general/demo исключены.`;
}

document.addEventListener("click", e => { const t = e.target.closest(".tab"); if (t) location.hash = t.dataset.r; });
addEventListener("hashchange", () => D && route());
setInterval(() => { $("#clock").textContent = new Date().toLocaleTimeString("ru-RU"); }, 1000);
bgFx();
let li = 0; setInterval(() => { const l = $("#log"); if (!l || !D) return; l.firstElementChild?.style && (l.style.opacity = 1); }, 4000);

fetch("data/hub.json?" + Date.now()).then(r => r.json()).then(d => { D = d; prep(); head(); route();
  // live-feel: periodically re-render activity statuses
  setInterval(() => { people.forEach(p => p.act = p.last && Date.now() - p.last < ACTIVE_MS); $("#sAct").textContent = people.filter(p=>p.act&&!p.human).length; }, 30000);
}).catch(e => { $("#notice").textContent = "⚠️ Не удалось загрузить data/hub.json: " + e; });
})();
