/* Raylos'Clo: Notifications tab */
'use strict';
/* ================= NOTIFICATIONS ================= */
function renderNotes(){
  var p=$('[data-panel="notifications"]'), f=ui.noteFilter;
  var all=state.notes.slice().sort(function(a,b){return (b.ts||0)-(a.ts||0)});
  var kd=ui.noteKind||'all', kindOk=function(n){return kd==='all'||(kd==='question'&&isQuestion(n))||(kd==='sale'&&n.kind==='sale')||(kd==='shipping'&&(n.kind==='shipping'||n.kind==='delivered'))};
  var list=all.filter(function(n){return kindOk(n)&&(f==='starred'?n.starred:(f==='open'?!n.responded:true))});
  var html='<div class="top"><h1>Notifications</h1><div class="subtabs">'+[['all','All ('+all.length+')'],['open','Not responded ('+all.filter(function(n){return !n.responded}).length+')'],['starred','Starred ('+all.filter(function(n){return n.starred}).length+')']].map(function(x){return '<button type="button" data-action="note-filter" data-f="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+x[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="subtabs" style="margin:0 0 12px">'+[['all','Everything'],['sale','Sales'],['question','Customer questions'],['shipping','Shipping and delivery']].map(function(x){return '<button type="button" data-action="note-kind" data-k="'+x[0]+'" aria-pressed="'+(kd===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>'+
    '<p class="lead">Sales, customer questions, and shipping and delivery updates from your Gmail land here when you tap Check Gmail. You can also log a message by hand. Star the important ones and tick Responded when you’ve replied.</p>'+
    '<div class="card" style="--accent:var(--lilac)"><h2>Log a message</h2><form data-form="note-add"><div class="form-grid">'+
    '<div class="ff"><label for="n_plat">Platform</label><select id="n_plat">'+PLATFORMS.map(function(pl){return '<option value="'+pl.key+'">'+pl.name+'</option>'}).join('')+'<option value="other">Other</option></select></div>'+
    '<div class="ff"><label for="n_from">From</label><input type="text" id="n_from" maxlength="60" placeholder="Buyer’s username"></div>'+
    '<div class="ff full"><label for="n_text">Message or offer *</label><textarea id="n_text" maxlength="500" placeholder="e.g. Offered $30 for the denim jacket"></textarea><div class="msg bad" id="m_ntext" aria-live="polite"></div></div></div>'+
    '<div class="btnrow2"><button class="btn" type="submit">Add to feed</button></div></form></div>'+
    '<div class="card" style="--accent:var(--sage)"><h2>Feed</h2>';
  if(!list.length)html+='<p>'+(all.length?'Nothing here for this filter.':'No messages logged yet.')+'</p>';
  else html+='<ul class="notes">'+list.map(function(n){
    return '<li><button class="star" data-action="note-star" data-id="'+esc(n.id)+'" aria-label="'+(n.starred?'Unstar':'Star')+' this message" aria-pressed="'+(!!n.starred)+'">'+(n.starred?'&#9733;':'&#9734;')+'</button><div class="body"><div><span class="from">'+esc(n.from||'Someone')+'</span> on '+platName(n.platform)+({sale:' <span class="chip">Sale</span>',shipping:' <span class="chip">Shipping</span>',delivered:' <span class="chip">Delivered</span>',question:' <span class="chip">Question</span>'}[n.kind]||'')+(n.sample?' <span class="chip">sample</span>':'')+'</div><div>'+esc(n.text)+'</div><div class="when">'+esc(fmtDate(n.date))+'</div></div>'+
      '<div class="actions"><label class="resp"><input type="checkbox" data-change="note-resp" data-id="'+esc(n.id)+'"'+(n.responded?' checked':'')+'> Responded</label>'+(isQuestion(n)?'<button class="btn small" data-action="note-reply" data-id="'+esc(n.id)+'">Reply</button>':'')+'<button class="btn small secondary" data-action="note-del" data-id="'+esc(n.id)+'">Delete</button></div></li>';
  }).join('')+'</ul>';
  html+='</div>';
  p.innerHTML=html;
}
