'use strict';
const $=s=>document.querySelector(s),M=$('#main');
const T=['ft1','ft0','p2','p20','p3','p30','reb','oreb','dreb','ast','stl','blk','tov','pf'];
const LBL={ft1:'Freiwurf',p2:'Zweier',p3:'Dreier',ft0:'Freiwurf',p20:'Zweier',p30:'Dreier',reb:'Rebound',oreb:'Off-Reb',dreb:'Def-Reb',ast:'Assist',stl:'Steal',blk:'Block',tov:'Turnover',pf:'Foul'};
const SUB={ft1:'+1',p2:'+2',p3:'+3',ft0:'daneben',p20:'daneben',p30:'daneben'};
let db,S={players:[],games:[]},V={n:'home'},F={mode:'all',n:5,from:'',to:'',picks:[],pl:[]},R={k:'ppg',dir:-1},CMP=[],EDIT=null,PIC=null,NEW={};
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const fd=d=>d.split('-').reverse().join('.');
const fmt=s=>{s=Math.max(0,Math.round(s));return String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const pc=(m,n)=>n?m/n*100:null,fp=v=>v==null?'–':v.toFixed(1)+'%';
/* ---------- IndexedDB ---------- */
const open=()=>new Promise((r,j)=>{const q=indexedDB.open('hoopsstats',1);q.onupgradeneeded=()=>{q.result.createObjectStore('players',{keyPath:'id'});q.result.createObjectStore('games',{keyPath:'id'})};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
const tx=(st,m,f)=>new Promise((r,j)=>{const t=db.transaction(st,m),q=f(t.objectStore(st));t.oncomplete=()=>r(q&&q.result);t.onerror=()=>j(t.error)});
const put=(st,o)=>tx(st,'readwrite',s=>s.put(o)),del=(st,id)=>tx(st,'readwrite',s=>s.delete(id)),all=st=>tx(st,'readonly',s=>s.getAll());
const saveG=g=>put('games',g);
const load=async()=>{S.players=(await all('players')).sort((a,b)=>a.name.localeCompare(b.name));S.games=await all('games');for(const g of S.games)if(mig(g))await saveG(g)};
/* ---------- Statistik ---------- */
function fin(s,sec){s.pts=s.ft1+2*s.p2+3*s.p3;s.rb=s.reb+s.oreb+s.dreb;s.ftA=s.ft1+s.ft0;s.p2A=s.p2+s.p20;s.p3A=s.p3+s.p30;s.fgM=s.p2+s.p3;s.fgA=s.p2A+s.p3A;s.sec=sec;return s}
/* Spielzeit aus Ein-/Auswechslungen (verbleibende Spieluhr-Zeit, nicht Realzeit) */
function seg(b,g,s,q,t){if(s.q===q)b[s.q]+=Math.max(0,s.t-t);else{b[s.q]+=s.t;b[q]+=Math.max(0,g.qlen-t)}}
function tm(g,pid){const b=[0,0,0,0,0];let st={on:false,q:0,t:0},n=0;
 for(const e of g.subs||[]){if(e.pid!==pid)continue;if(e.k==='in'){if(!st.on){st={on:true,q:e.q,t:e.t};n++}}else if(st.on){seg(b,g,st,e.q,e.t);st.on=false}}
 if(st.on)seg(b,g,st,g.q,g.clock);return{b,on:st.on,n}}
const secOf=(g,id)=>(g.sec0&&g.sec0[id]||0)+tm(g,id).b.reduce((a,x)=>a+x,0);
const onc=g=>g.roster.filter(id=>tm(g,id).on);
const gids=g=>[...g.roster,...(g.events.some(e=>e.pid==='other')?['other']:[])];
function mig(g){if(g.subs)return false;g.subs=[];g.sec0=g.sec||{};if(g.status!=='final')(g.on||[]).forEach(id=>g.subs.push({id:uid(),pid:id,k:'in',q:g.q||1,t:Math.round(g.clock||0)}));delete g.on;delete g.sec;return true}
function stat(g,pid){const s={};T.forEach(k=>s[k]=0);for(const e of g.events)if(e.pid===pid)s[e.type]++;const m=tm(g,pid);fin(s,secOf(g,pid));s.qb=m.b;s.nsub=m.n;return s}
const played=s=>s.sec>0||T.some(k=>s[k]>0);
const tpts=g=>g.events.reduce((a,e)=>a+(e.type==='ft1'?1:e.type==='p2'?2:e.type==='p3'?3:0),0);
const pname=id=>{if(id==='other')return'Nicht zugeordnet';const p=S.players.find(x=>x.id===id);return p?p.name:'(gelöscht)'};
function row(p,gs){const a={};T.forEach(k=>a[k]=0);let sec=0,gp=0;
 gs.forEach(g=>{const s=stat(g,p.id);if(played(s)){gp++;T.forEach(k=>a[k]+=s[k]);sec+=s.sec}});fin(a,sec);const d=x=>gp?x/gp:0;
 return{p,gp,pts:a.pts,ppg:d(a.pts),rb:a.rb,rpg:d(a.rb),ast:a.ast,apg:d(a.ast),stl:a.stl,spg:d(a.stl),blk:a.blk,bpg:d(a.blk),tov:a.tov,tpg:d(a.tov),pf:a.pf,fpg:d(a.pf),min:sec/60,mpg:d(sec/60),ftp:pc(a.ft1,a.ftA),p2p:pc(a.p2,a.p2A),p3p:pc(a.p3,a.p3A),fgp:pc(a.fgM,a.fgA),a}}
const COLS=[['Spiele','gp'],['PTS','pts'],['PPG','ppg'],['REB','rb'],['RPG','rpg'],['AST','ast'],['APG','apg'],['STL','stl'],['SPG','spg'],['BLK','blk'],['BPG','bpg'],['TO','tov'],['TO/G','tpg'],['PF','pf'],['PF/G','fpg'],['MIN','min'],['MPG','mpg'],['FT%','ftp'],['2P%','p2p'],['3P%','p3p'],['FG%','fgp']];
const LOW=['tov','tpg','pf','fpg'];
const cell=(k,v)=>v==null?'–':/p$/.test(k)&&k!=='ppg'&&k!=='spg'&&k!=='bpg'&&k!=='tpg'&&k!=='apg'&&k!=='rpg'&&k!=='mpg'&&k!=='fpg'?fp(v):Number.isInteger(v)?v:v.toFixed(1);
function fgames(){let g=S.games.filter(x=>x.status==='final').sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
 if(F.mode==='last')g=g.slice(-F.n);if(F.mode==='range')g=g.filter(x=>(!F.from||x.date>=F.from)&&(!F.to||x.date<=F.to));if(F.mode==='pick')g=g.filter(x=>F.picks.includes(x.id));return g}
/* ---------- Spiel / Uhr ---------- */
const cur=()=>S.games.find(g=>g.id===V.id);
function tick(g){if(!g.run)return;const n=Date.now(),dt=Math.min((n-g.last)/1000,5);g.last=n;g.clock-=Math.min(dt,g.clock);if(g.clock<=0){g.clock=0;g.run=false;saveG(g)}}
let ctr=0;setInterval(()=>{const g=V.id&&cur();if(!g||!g.run)return;tick(g);const c=$('#clk');if(c)c.textContent=fmt(g.clock);
 document.querySelectorAll('[data-m]').forEach(e=>e.textContent=fmt(secOf(g,e.dataset.m)));if(!g.run)render();if(++ctr%20===0)saveG(g)},250);
/* ---------- Ansichten ---------- */
function title(t){$('#title').textContent=t}
function render(){window.scrollTo(0,V.keep?scrollY:0);V.keep=0;const f={home:vHome,new:vNew,players:vPlayers,game:vGame,pstat:vPstat,season:vSeason,profile:vProfile,cmp:vCmp,backup:vBackup}[V.n];M.innerHTML=f();$('#hr').textContent=''}
function vHome(){title('Spiele');
 const gs=[...S.games].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created),dr=gs.filter(g=>g.status!=='final'),fi=gs.filter(g=>g.status==='final');
 const item=g=>{const a=tpts(g),b=g.oppScore,n=g.roster.filter(id=>played(stat(g,id))).length,st=g.status!=='final'?'<span class="badge D">Entwurf</span>':a>b?'<span class="badge W">Sieg</span>':a<b?'<span class="badge L">Niederlage</span>':'<span class="badge D">Remis</span>';
  return `<div class="gi"><div class="main" data-a="open" data-id="${g.id}"><b>${esc(g.team)} ${a} : ${b} ${esc(g.opp)}</b><br><small>${fd(g.date)} · ${n} Spieler eingesetzt</small></div>${st}<button class="btn s" data-a="exg" data-id="${g.id}">CSV</button><button class="btn s" data-a="exj" data-id="${g.id}">JSON</button><button class="btn s d" data-a="delg" data-id="${g.id}">Löschen</button></div>`};
 return `<div class="row"><button class="btn p sp" data-a="new">+ Neues Spiel</button><button class="btn" data-a="go" data-v="players">Spieler</button><button class="btn" data-a="go" data-v="season">Saison</button></div>
 ${dr.length?'<h2>Entwürfe – nicht abgeschlossen</h2>'+dr.map(item).join(''):''}<h2>Spielarchiv</h2>${fi.length?fi.map(item).join(''):'<p class="mut">Noch keine abgeschlossenen Spiele. Starte mit „Neues Spiel“.</p>'}`}
function vNew(){title('Neues Spiel');if(!S.players.length)return`<div class="card"><p>Lege zuerst Spieler an.</p><button class="btn p" data-a="go" data-v="players">Spieler anlegen</button></div>`;
 const last=[...S.games].sort((a,b)=>b.created-a.created)[0];NEW.team??=last?last.team:'';NEW.sel??=S.players.map(p=>p.id);
 return `<div class="card"><label>Mannschaft</label><input id="nt" value="${esc(NEW.team)}" placeholder="Eigenes Team"><label>Gegner</label><input id="no" value="${esc(NEW.opp||'')}" placeholder="Gegner"><label>Datum</label><input id="nd" type="date" value="${NEW.date||today()}"><label>Viertellänge (Minuten)</label><input id="nq" type="number" min="1" max="20" value="${NEW.q||10}">
 <h2>Spieler</h2><div class="chips">${S.players.map(p=>`<button class="chip ${NEW.sel.includes(p.id)?'on':''}" data-a="nsel" data-id="${p.id}">#${esc(p.num)} ${esc(p.name)}</button>`).join('')}</div><br><div class="row"><button class="btn p sp" data-a="create">Spiel starten</button><button class="btn" data-a="go" data-v="home">Abbrechen</button></div></div>`}
function vPlayers(){title('Spieler');const e=S.players.find(p=>p.id===EDIT);
 return `<div class="card"><b>${e?'Spieler bearbeiten':'Neuer Spieler'}</b><label>Name</label><input id="pn" value="${esc(e?.name||'')}"><label>Rückennummer</label><input id="pr" inputmode="numeric" value="${esc(e?.num||'')}"><label>Profilbild (optional)</label><div class="row"><div class="av">${(PIC??e?.pic)?`<img src="${PIC??e.pic}">`:'?'}</div><button class="btn" data-a="pickpic">Bild wählen</button>${(PIC??e?.pic)?'<button class="btn" data-a="nopic">Entfernen</button>':''}</div><br><div class="row"><button class="btn p" data-a="savep">${e?'Speichern':'Hinzufügen'}</button>${e?'<button class="btn" data-a="cancelp">Abbrechen</button>':''}</div></div>
 ${S.players.map(p=>`<div class="gi"><div class="av">${p.pic?`<img src="${p.pic}">`:esc(p.num)}</div><div class="main"><b>${esc(p.name)}</b><br><small>#${esc(p.num)}</small></div><button class="btn s" data-a="editp" data-id="${p.id}">Bearbeiten</button><button class="btn s d" data-a="delp" data-id="${p.id}">Löschen</button></div>`).join('')||'<p class="mut">Noch keine Spieler.</p>'}`}
function scoreBar(g){return `<div class="score"><div><small>${esc(g.team)}</small><b>${tpts(g)}</b></div><div><div class="q">${[1,2,3,4].map(q=>`<button class="${g.q==q?'on':''}" data-a="q" data-q="${q}">Q${q}</button>`).join('')}</div><button id="clk" class="time" data-a="setclk">${fmt(g.clock)}</button><button class="go ${g.run?'pause':''}" data-a="run">${g.run?'Pause':'Start'}</button></div><div><small>${esc(g.opp)}</small><b>${g.oppScore}</b><div class="op">${[1,2,3,-1].map(d=>`<button data-a="opp" data-d="${d}">${d>0?'+':'−'}${Math.abs(d)}</button>`).join('')}</div></div></div>`}
function vGame(){const g=cur();title(g.team+' – '+g.opp);const tab=V.tab||'b',oc=onc(g),ben=g.roster.filter(id=>!oc.includes(id));
 const tabs=`<div class="tabs">${[['b','Board'],['p','Spieler'],['w','Wechsel'],['x','Box Score']].map(([k,t])=>`<button class="btn ${tab==k?'p':''}" data-a="tab" data-t="${k}">${t}</button>`).join('')}</div>`;
 const bb=(k,c)=>`<button class="sb ${c}" data-a="pickp" data-t="${k}">${LBL[k]}<em>${SUB[k]||''}</em></button>`;
 const row=id=>{const m=tm(g,id);return `<div class="gi"><div class="main"><b>${esc(pname(id))}</b> <small data-m="${id}">${fmt(secOf(g,id))}</small><br><small>${m.n}× eingewechselt</small></div><button class="btn s ${m.on?'d':'p'}" data-a="court" data-id="${id}">${m.on?'Auswechseln':'Einwechseln'}</button></div>`};
 let body;
 if(tab==='b')body=`<div class="card"><small>Auf dem Feld (${oc.length})</small><div class="chips" style="margin-top:6px">${oc.map(id=>`<button class="chip on" data-a="pl" data-id="${id}">${esc(pname(id))}</button>`).join('')||'<span class="mut">Niemand – unter „Wechsel“ einwechseln</span>'}</div></div>
 <div class="sg g3">${bb('ft1','h')}${bb('p2','h')}${bb('p3','h')}${bb('ft0','x')}${bb('p20','x')}${bb('p30','x')}</div>
 <div class="sg g4">${['reb','oreb','dreb','ast','stl','blk','tov','pf'].map(k=>bb(k,'')).join('')}</div>
 <button class="btn p" data-a="undoall" style="width:100%;min-height:54px">↶ Letzte Aktion rückgängig</button>
 <div class="card log" style="margin-top:12px"><small>Letzte Aktionen – Namen antippen = Spieler ändern</small>${g.events.map((e,i)=>[e,i]).slice(-6).reverse().map(([e,i])=>`<div><span>Q${e.q} ${fmt(e.t)} · <b data-a="reas" data-i="${i}" style="color:var(--o)">${esc(pname(e.pid))}</b> · ${LBL[e.type]} ${SUB[e.type]||''}</span><button class="btn s d" data-a="delev" data-i="${i}">✕</button></div>`).join('')||'<div class="mut">Noch keine Aktionen</div>'}</div>`;
 else if(tab==='p')body=`<div class="pg">${g.roster.map(id=>{const p=S.players.find(x=>x.id===id)||{name:'(gelöscht)',num:'?'},s=stat(g,id),on=oc.includes(id);
  return `<div class="pc ${on?'on':''}" data-a="pl" data-id="${id}"><div class="top"><div class="av">${p.pic?`<img src="${p.pic}">`:esc(p.num)}</div><div><b>${esc(p.name)}</b><br><small>#${esc(p.num)}</small></div><div class="pt">${s.pts}</div></div><div class="mini"><span>REB ${s.rb}</span><span>AST ${s.ast}</span><span>STL ${s.stl}</span><span>BLK ${s.blk}</span><span>PF ${s.pf}</span></div><div class="row"><button class="btn s ${on?'p':''} sp" data-a="court" data-id="${id}">${on?'Auf dem Feld':'Bank'}</button><small data-m="${id}">${fmt(secOf(g,id))}</small></div></div>`}).join('')}</div>`;
 else if(tab==='w')body=`<h2>Auf dem Feld</h2>${oc.map(row).join('')||'<p class="mut">Niemand. Tippe unten bei der Bank auf „Einwechseln“ (Startaufstellung vor Spielbeginn).</p>'}<h2>Bank</h2>${ben.map(row).join('')||'<p class="mut">Niemand</p>'}
 <h2>Wechsel-Protokoll</h2><div class="card log"><small>Zeit antippen = korrigieren</small>${g.subs.map((e,i)=>[e,i]).reverse().slice(0,30).map(([e,i])=>`<div><span>Q${e.q} <b data-a="subt" data-i="${i}" style="color:var(--o)">${fmt(e.t)}</b> · ${esc(pname(e.pid))} · ${e.k==='in'?'ein':'aus'}</span><button class="btn s d" data-a="delsub" data-i="${i}">✕</button></div>`).join('')||'<div class="mut">Noch keine Wechsel</div>'}</div><button class="btn" data-a="undosub">↶ Letzten Wechsel rückgängig</button>`;
 else body=box(g);
 const pk=V.pick?`<div class="ov"><div class="card"><b>${V.pick.re!=null?'Richtigen Spieler wählen':LBL[V.pick.t]+' '+(SUB[V.pick.t]||'')+' – wer?'}</b><div class="pgp">${[...oc,...ben].map(id=>`<button class="sb ${oc.includes(id)?'h':''}" data-a="assign" data-id="${id}">${esc(pname(id))}</button>`).join('')}<button class="sb" data-a="assign" data-id="other">Anderer Spieler</button></div><button class="btn" data-a="cancelpick" style="width:100%">Abbrechen</button></div></div>`:'';
 return `${scoreBar(g)}${tabs}${body}<div class="row" style="margin-top:14px">${g.status!=='final'?'<button class="btn p" data-a="finish">Spiel abschließen</button>':'<span class="badge W">Abgeschlossen</span>'}<button class="btn" data-a="exg" data-id="${g.id}">CSV</button><button class="btn" data-a="go" data-v="home">Zurück</button></div>${pk}`}
function box(g){const rows=gids(g).map(id=>[pname(id),stat(g,id)]),tot=T.reduce((o,k)=>(o[k]=rows.reduce((a,r)=>a+r[1][k],0),o),{});fin(tot,rows.reduce((a,r)=>a+r[1].sec,0));
 const l=(n,s)=>`<tr><td>${esc(n)}</td><td>${fmt(s.sec)}</td><td>${s.pts}</td><td>${s.fgM}/${s.fgA}</td><td>${s.p3}/${s.p3A}</td><td>${s.ft1}/${s.ftA}</td><td>${s.rb}</td><td>${s.ast}</td><td>${s.stl}</td><td>${s.blk}</td><td>${s.tov}</td><td>${s.pf}</td></tr>`;
 return `<div class="tw"><table><thead><tr>${['Spieler','MIN','PTS','FG','3P','FT','REB','AST','STL','BLK','TO','PF'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>l(...r)).join('')}</tbody><tfoot>${l('Team',tot)}</tfoot></table></div>
 <h2>Spielzeit</h2><div class="tw"><table><thead><tr>${['Spieler','Q1','Q2','Q3','Q4','Gesamt','Einw.'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${g.roster.map(id=>{const s=stat(g,id);return `<tr><td>${esc(pname(id))}</td>${[1,2,3,4].map(q=>`<td>${fmt(s.qb[q])}</td>`).join('')}<td>${fmt(s.sec)}</td><td>${s.nsub}</td></tr>`}).join('')}</tbody></table></div>`}
function vPstat(){const g=cur(),id=V.pid,p=S.players.find(x=>x.id===id)||{name:'(gelöscht)',num:'?'},s=stat(g,id),i=g.roster.indexOf(id),on=tm(g,id).on;title('#'+p.num+' '+p.name);
 const b=(k,c)=>`<button class="sb ${c}" data-a="ev" data-t="${k}">${LBL[k]}<em>${SUB[k]||s[k]}</em>${SUB[k]?`<em>${s[k]}×</em>`:''}</button>`;
 const mine=g.events.map((e,ix)=>[e,ix]).filter(x=>x[0].pid===id).reverse().slice(0,6);
 return `${scoreBar(g)}<div class="row"><button class="btn" data-a="back">‹ Übersicht</button><button class="btn" data-a="nav" data-d="-1">‹</button><button class="btn" data-a="nav" data-d="1">›</button><b class="sp" style="font-size:26px;text-align:center">${s.pts} Pkt</b><button class="btn ${on?'p':''}" data-a="court" data-id="${id}">${on?'Auf dem Feld':'Bank'} <small data-m="${id}">${fmt(secOf(g,id))}</small></button></div><br>
 <div class="sg g3">${b('ft1','h')}${b('p2','h')}${b('p3','h')}${b('ft0','x')}${b('p20','x')}${b('p30','x')}</div>
 <div class="sg g4">${['reb','oreb','dreb','ast','stl','blk','tov','pf'].map(k=>b(k,'')).join('')}</div>
 <div class="row"><button class="btn p sp" data-a="undo" style="min-height:58px">↶ Letzte Aktion rückgängig</button></div>
 <div class="card log" style="margin-top:12px"><small>FT ${s.ft1}/${s.ftA} ${fp(pc(s.ft1,s.ftA))} · 2P ${s.p2}/${s.p2A} ${fp(pc(s.p2,s.p2A))} · 3P ${s.p3}/${s.p3A} ${fp(pc(s.p3,s.p3A))} · FG ${s.fgM}/${s.fgA} ${fp(pc(s.fgM,s.fgA))}</small>${mine.map(([e,ix])=>`<div><span>Q${e.q} ${fmt(e.t)} · ${LBL[e.type]} ${SUB[e.type]||''}</span><button class="btn s d" data-a="delev" data-i="${ix}">✕</button></div>`).join('')||'<div class="mut">Noch keine Aktionen</div>'}</div>`}
function vSeason(){title('Saisonstatistiken');const gs=fgames(),all=S.games.filter(g=>g.status==='final').sort((a,b)=>a.date.localeCompare(b.date));
 const ps=S.players.filter(p=>!F.pl.length||F.pl.includes(p.id));let rows=ps.map(p=>row(p,gs)).filter(r=>r.gp>0);
 rows.sort((a,b)=>((b[R.k]??-1)-(a[R.k]??-1))*-R.dir*-1||0);rows.sort((a,b)=>R.dir*((a[R.k]??-1)-(b[R.k]??-1)));
 const mx=Math.max(1,...rows.map(r=>r[R.k]||0)),nm=COLS.find(c=>c[1]===R.k)[0];
 return `<div class="card"><div class="row"><select data-a="fm">${[['all','Gesamte Saison'],['last','Letzte X Spiele'],['range','Zeitraum'],['pick','Bestimmte Spiele']].map(([v,t])=>`<option value="${v}" ${F.mode===v?'selected':''}>${t}</option>`).join('')}</select>
 ${F.mode==='last'?`<input id="fn" type="number" min="1" value="${F.n}" style="width:80px">`:''}${F.mode==='range'?`<input id="ff" type="date" value="${F.from}"><input id="ft" type="date" value="${F.to}">`:''}<span class="mut">${gs.length} Spiele</span></div>
 ${F.mode==='pick'?`<div class="chips" style="margin-top:8px">${all.map(g=>`<button class="chip ${F.picks.includes(g.id)?'on':''}" data-a="fpick" data-id="${g.id}">${fd(g.date)} ${esc(g.opp)}</button>`).join('')}</div>`:''}
 <div class="chips" style="margin-top:8px">${S.players.map(p=>`<button class="chip ${F.pl.includes(p.id)?'on':''}" data-a="fpl" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
 ${rows.length?`<h2>Rangliste: ${nm}</h2><div class="card">${rows.map(r=>`<div class="bar"><span>${esc(r.p.name)}</span><i style="width:${(r[R.k]||0)/mx*55}%"></i><b>${cell(R.k,r[R.k])}</b></div>`).join('')}</div>
 <div class="row"><b class="sp">Tabelle (Spaltenkopf antippen = sortieren)</b><button class="btn s p" data-a="cmp">Vergleichen (${CMP.length})</button><button class="btn s" data-a="exs">CSV</button></div><br>
 <div class="tw"><table><thead><tr><th>Spieler</th>${COLS.map(c=>`<th class="${R.k===c[1]?'s':''}" data-a="sort" data-k="${c[1]}">${c[0]}${R.k===c[1]?(R.dir<0?' ▼':' ▲'):''}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td><input type="checkbox" data-a="cmpt" data-id="${r.p.id}" ${CMP.includes(r.p.id)?'checked':''}> <span data-a="prof" data-id="${r.p.id}" style="color:var(--o)">${esc(r.p.name)}</span></td>${COLS.map(c=>`<td>${cell(c[1],r[c[1]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="mut">Keine Daten. Schließe ein Spiel ab, damit es in die Saisonstatistik einfließt.</p>'}`}
function chart(vals,labels,t){const w=300,h=110,mx=Math.max(1,...vals),bw=w/Math.max(vals.length,1);
 return `<div class="card"><b>${t}</b><svg viewBox="0 0 ${w} ${h+16}" width="100%">${vals.map((v,i)=>{const bh=v/mx*h;return `<rect x="${i*bw+3}" y="${h-bh}" width="${Math.max(bw-6,2)}" height="${bh}" rx="3" fill="#ff7a1a"/><text x="${i*bw+bw/2}" y="${h-bh-2}" text-anchor="middle">${Number.isInteger(v)?v:v.toFixed(1)}</text><text x="${i*bw+bw/2}" y="${h+11}" text-anchor="middle">${labels[i]}</text>`}).join('')}</svg></div>`}
function vProfile(){const p=S.players.find(x=>x.id===V.pid),gs=fgames();title(p.name);const r=row(p,gs),pg=gs.map(g=>[g,stat(g,p.id)]).filter(x=>played(x[1])),lb=pg.map(x=>x[0].date.slice(8)+'.'+x[0].date.slice(5,7));
 const cd=(l,k)=>`<div><small>${l}</small><b>${cell(k,r[k])}</b></div>`;
 return `<button class="btn" data-a="go" data-v="season">‹ Saison</button><h2>#${esc(p.num)} ${esc(p.name)}</h2><div class="cards">${COLS.map(c=>cd(c[0],c[1])).join('')}</div>
 ${chart(pg.map(x=>x[1].pts),lb,'Punkte pro Spiel')}${chart(pg.map(x=>x[1].rb),lb,'Rebounds pro Spiel')}${chart(pg.map(x=>x[1].ast),lb,'Assists pro Spiel')}${chart(pg.map(x=>+(x[1].sec/60).toFixed(1)),lb,'Spielminuten pro Spiel')}
 <h2>Spiele</h2><div class="tw"><table><thead><tr>${['Datum','Gegner','MIN','PTS','REB','AST','STL','BLK','FG','3P','FT'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${pg.map(([g,s])=>`<tr><td>${fd(g.date)}</td><td>${esc(g.opp)}</td><td>${fmt(s.sec)}</td><td>${s.pts}</td><td>${s.rb}</td><td>${s.ast}</td><td>${s.stl}</td><td>${s.blk}</td><td>${s.fgM}/${s.fgA}</td><td>${s.p3}/${s.p3A}</td><td>${s.ft1}/${s.ftA}</td></tr>`).join('')}</tbody></table></div>`}
function vCmp(){title('Vergleich');const gs=fgames(),rs=CMP.map(id=>S.players.find(p=>p.id===id)).filter(Boolean).map(p=>row(p,gs));
 return `<button class="btn" data-a="go" data-v="season">‹ Saison</button><br><br><div class="tw"><table><thead><tr><th></th>${rs.map(r=>`<th>${esc(r.p.name)}</th>`).join('')}</tr></thead><tbody>${COLS.map(([l,k])=>{const v=rs.map(r=>r[k]).filter(x=>x!=null),b=v.length?(LOW.includes(k)?Math.min(...v):Math.max(...v)):null;return `<tr><td>${l}</td>${rs.map(r=>`<td class="${r[k]!=null&&r[k]===b&&rs.length>1?'best':''}">${cell(k,r[k])}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`}
function vBackup(){title('Datensicherung');return `<div class="card"><p>Alle Daten liegen lokal auf diesem Gerät (IndexedDB) und werden nach jeder Aktion automatisch gespeichert.</p><div class="row"><button class="btn p" data-a="exall">Alles als JSON exportieren</button><button class="btn" data-a="imp">JSON importieren</button><button class="btn" data-a="exs">Saison als CSV</button></div><p class="mut">Import fügt Spieler und Spiele per ID hinzu bzw. ersetzt gleiche IDs – nichts wird doppelt gezählt.</p></div>`}
/* ---------- Export ---------- */
function dl(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},500)}
const csv=rows=>'\ufeff'+rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(';')).join('\n');
const SH=['Spieler','Nr','MIN','PTS','FT','FTA','2P','2PA','3P','3PA','REB','OREB','DREB','AST','STL','BLK','TO','PF'];
function gameCsv(g){return csv([['Datum',g.date,'Team',g.team,'Gegner',g.opp,'Ergebnis',tpts(g)+':'+g.oppScore],SH,...gids(g).map(id=>{const s=stat(g,id),p=S.players.find(x=>x.id===id)||{num:''};return[pname(id),p.num,(s.sec/60).toFixed(1),s.pts,s.ft1,s.ftA,s.p2,s.p2A,s.p3,s.p3A,s.reb+s.oreb+s.dreb,s.oreb,s.dreb,s.ast,s.stl,s.blk,s.tov,s.pf]})])}
/* ---------- Aktionen ---------- */
const go=(n,x={})=>{$('#drawer').hidden=true;V={n,...x};render()};
const act={
 menu(){const d=$('#drawer');d.hidden=!d.hidden},go:(d)=>go(d.v),
 new(){NEW={};go('new')},nsel(d){NEW.team=$('#nt').value;NEW.opp=$('#no').value;NEW.date=$('#nd').value;NEW.q=$('#nq').value;NEW.sel=NEW.sel.includes(d.id)?NEW.sel.filter(x=>x!==d.id):[...NEW.sel,d.id];render()},
 async create(){if(!NEW.sel.length)return alert('Bitte mindestens einen Spieler wählen.');const q=Math.max(1,+$('#nq').value||10)*60;
  const g={id:uid(),created:Date.now(),status:'draft',team:$('#nt').value.trim()||'Heim',opp:$('#no').value.trim()||'Gegner',date:$('#nd').value||today(),roster:NEW.sel,events:[],subs:[],oppScore:0,q:1,qlen:q,clock:q,run:false,last:0};
  await saveG(g);S.games.push(g);go('game',{id:g.id,tab:'b'})},
 open(d){go('game',{id:d.id,tab:'b'})},
 async delg(d){const g=S.games.find(x=>x.id===d.id);if(!confirm(`Spiel gegen ${g.opp} wirklich löschen? Die Saisonstatistik wird angepasst.`))return;await del('games',d.id);S.games=S.games.filter(x=>x.id!==d.id);render()},
 tab(d){V.tab=d.t;render()},pl(d){go('pstat',{id:V.id,pid:d.id})},back(){go('game',{id:V.id,tab:'p'})},
 nav(d){const g=cur(),i=(g.roster.indexOf(V.pid)+ +d.d+g.roster.length)%g.roster.length;V.pid=g.roster[i];render()},
 court(d){const g=cur();tick(g);g.subs.push({id:uid(),pid:d.id,k:tm(g,d.id).on?'out':'in',q:g.q,t:Math.round(g.clock)});saveG(g);V.keep=1;render()},
 pickp(d){V.pick={t:d.t};V.keep=1;render()},reas(d){V.pick={re:+d.i};V.keep=1;render()},cancelpick(){V.pick=null;V.keep=1;render()},
 async assign(d){const g=cur(),p=V.pick;if(!p)return;if(p.re!=null)g.events[p.re].pid=d.id;else{tick(g);g.events.push({id:uid(),pid:d.id,type:p.t,q:g.q,t:Math.round(g.clock)})}V.pick=null;await saveG(g);V.keep=1;render()},
 async undoall(){const g=cur();g.events.pop();await saveG(g);V.keep=1;render()},
 async undosub(){const g=cur();g.subs.pop();await saveG(g);V.keep=1;render()},
 async delsub(d){const g=cur();g.subs.splice(+d.i,1);await saveG(g);V.keep=1;render()},
 subt(d){const g=cur(),e=g.subs[+d.i],v=prompt('Zeit korrigieren (verbleibend, mm:ss)',fmt(e.t)),m=v&&v.match(/^(\d+)(?::(\d{1,2}))?$/);if(m){e.t=(+m[1])*60+(+m[2]||0);saveG(g);V.keep=1;render()}},
 async ev(d){const g=cur();g.events.push({id:uid(),pid:V.pid,type:d.t,q:g.q,t:Math.round(g.clock)});await saveG(g);V.keep=1;render()},
 async undo(){const g=cur();for(let i=g.events.length-1;i>=0;i--)if(g.events[i].pid===V.pid){g.events.splice(i,1);await saveG(g);V.keep=1;return render()}},
 async delev(d){const g=cur();g.events.splice(+d.i,1);await saveG(g);V.keep=1;render()},
 run(){const g=cur();if(g.run){tick(g);g.run=false}else{g.run=true;g.last=Date.now()}saveG(g);V.keep=1;render()},
 q(d){const g=cur();if(g.q==d.q)return;if(g.run){tick(g);g.run=false}const t=Math.round(g.clock),on=onc(g);on.forEach(id=>g.subs.push({id:uid(),pid:id,k:'out',q:g.q,t}));g.q=+d.q;g.clock=g.qlen;on.forEach(id=>g.subs.push({id:uid(),pid:id,k:'in',q:g.q,t:g.qlen}));saveG(g);V.keep=1;render()},
 setclk(){const g=cur();if(g.run){tick(g);g.run=false}const v=prompt('Spielzeit einstellen (mm:ss)',fmt(g.clock));if(v){const m=v.match(/^(\d+)(?::(\d{1,2}))?$/);if(m){g.clock=(+m[1])*60+(+m[2]||0)}}saveG(g);V.keep=1;render()},
 opp(d){const g=cur();g.oppScore=Math.max(0,g.oppScore+ +d.d);saveG(g);V.keep=1;render()},
 async finish(){const g=cur();if(g.run){tick(g);g.run=false}const t=Math.round(g.clock);onc(g).forEach(id=>g.subs.push({id:uid(),pid:id,k:'out',q:g.q,t}));g.status='final';await saveG(g);go('home')},
 /* Spieler */
 pickpic(){$('#pic').click()},nopic(){PIC='';render()},editp(d){EDIT=d.id;PIC=null;render()},cancelp(){EDIT=null;PIC=null;render()},
 async savep(){const n=$('#pn').value.trim();if(!n)return alert('Bitte einen Namen eingeben.');const e=S.players.find(p=>p.id===EDIT),o=e||{id:uid()};o.name=n;o.num=$('#pr').value.trim();if(PIC!==null)o.pic=PIC;await put('players',o);EDIT=null;PIC=null;await load();render()},
 async delp(d){const used=S.games.some(g=>g.roster.includes(d.id));if(!confirm(used?'Dieser Spieler ist in gespeicherten Spielen eingetragen. Trotzdem löschen? Seine Statistik verschwindet aus der Saisonübersicht.':'Spieler löschen?'))return;await del('players',d.id);await load();render()},
 /* Saison */
 fm(d,el){F.mode=el.value;render()},fpick(d){F.picks=F.picks.includes(d.id)?F.picks.filter(x=>x!==d.id):[...F.picks,d.id];render()},fpl(d){F.pl=F.pl.includes(d.id)?F.pl.filter(x=>x!==d.id):[...F.pl,d.id];render()},
 sort(d){R=R.k===d.k?{k:d.k,dir:-R.dir}:{k:d.k,dir:LOW.includes(d.k)?1:-1};V.keep=1;render()},
 cmpt(d){CMP=CMP.includes(d.id)?CMP.filter(x=>x!==d.id):[...CMP,d.id];V.keep=1;render()},cmp(){if(CMP.length<2)return alert('Bitte mindestens zwei Spieler ankreuzen.');go('cmp')},prof(d){go('profile',{pid:d.id})},
 exs(){const gs=fgames();dl('saison.csv',csv([['Spieler',...COLS.map(c=>c[0])],...S.players.map(p=>row(p,gs)).filter(r=>r.gp).map(r=>[r.p.name,...COLS.map(c=>r[c[1]]==null?'':(+r[c[1]].toFixed(2)))])]),'text/csv')},
 exg(d){const g=S.games.find(x=>x.id===d.id);dl(`spiel-${g.date}-${g.opp}.csv`,gameCsv(g),'text/csv')},
 exj(d){const g=S.games.find(x=>x.id===d.id);dl(`spiel-${g.date}-${g.opp}.json`,JSON.stringify({players:S.players.filter(p=>g.roster.includes(p.id)),games:[g]}),'application/json')},
 exall(){dl(`hoops-backup-${today()}.json`,JSON.stringify({v:1,players:S.players,games:S.games}),'application/json')},imp(){$('#imp').click()}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el){if(!e.target.closest('#drawer'))$('#drawer').hidden=true;return}if(el.tagName==='INPUT'&&el.type==='checkbox'){return}if(el.tagName==='SELECT')return;const f=act[el.dataset.a];if(f){if(el.dataset.a==='court')e.stopPropagation();f(el.dataset,el,e)}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.a==='fm')act.fm({},el);else if(el.dataset.a==='cmpt')act.cmpt(el.dataset);else if(el.id==='fn'){F.n=Math.max(1,+el.value||1);render()}else if(el.id==='ff'){F.from=el.value;render()}else if(el.id==='ft'){F.to=el.value;render()}});
$('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.players)||!Array.isArray(d.games))throw 0;for(const p of d.players)await put('players',p);for(const g of d.games){g.run=false;await saveG(g)}await load();alert('Import abgeschlossen.');go('home')}catch{alert('Die Datei ist keine gültige Sicherung.')}e.target.value=''};
$('#pic').onchange=async e=>{const f=e.target.files[0];if(!f)return;const n=$('#pn')?.value,r=$('#pr')?.value;const bm=await createImageBitmap(f),c=document.createElement('canvas');c.width=c.height=128;const s=Math.min(bm.width,bm.height);c.getContext('2d').drawImage(bm,(bm.width-s)/2,(bm.height-s)/2,s,s,0,0,128,128);PIC=c.toDataURL('image/jpeg',.8);render();$('#pn').value=n;$('#pr').value=r;e.target.value=''};
document.addEventListener('visibilitychange',()=>{const g=V.id&&cur();if(g&&document.hidden){if(g.run){tick(g);g.run=false}saveG(g)}});
(async()=>{db=await open();await load();S.games.forEach(g=>{g.run=false});if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js')})();
