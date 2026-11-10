/* Raylos'Clo: Needs attention + reply templates */
'use strict';
/* ================= NEEDS ATTENTION ================= */
function isQuestion(n){return !n.kind||n.kind==='question'}
function attention(){
  var items=state.items, bd=collectBreakdown();
  return {
    delist:items.filter(function(i){return pendingDelist(i).length}),
    toShip:items.filter(function(i){return i.sale&&i.sale.shipStatus==='to_ship'}).sort(function(a,b){return (a.sale.date||'').localeCompare(b.sale.date||'')}),
    q:state.notes.filter(function(n){return !n.responded&&isQuestion(n)}).length,
    wallet:bd.wallet
  };
}
function updateBadges(){
  var a=attention();
  function set(name,n,title){var el=$('[data-badge="'+name+'"]');if(!el)return;el.hidden=!n;el.textContent=n||'';el.title=n?title:''}
  set('ship',a.toShip.length,plural(a.toShip.length,'package')+' to ship');
  var dn=a.delist.reduce(function(t,i){return t+pendingDelist(i).length},0);
  set('delist',dn,plural(dn,'listing')+' to take down NOW');
  set('notes',a.q,plural(a.q,'question')+' waiting for a reply');
}
function attnTileHtml(){
  var a=attention(), rows=[];
  a.delist.forEach(function(i){rows.push({hot:1,text:'<b>Take down now:</b> '+esc(i.title)+' is still listed on '+pendingDelist(i).map(platName).join(', '),btn:'Delist',view:'sold-shipping',tab:'delist'})});
  a.toShip.slice(0,3).forEach(function(i){var d=daysBetween(i.sale.date||today());rows.push({text:'<b>Ship:</b> '+esc(i.title)+' ('+platName(i.sale.platform)+', sold '+(d?d+(d===1?' day':' days')+' ago':'today')+')',btn:'Ship',view:'sold-shipping',tab:'toship'})});
  if(a.toShip.length>3)rows.push({text:'+ '+(a.toShip.length-3)+' more to ship',btn:'See all',view:'sold-shipping',tab:'toship'});
  if(a.q)rows.push({text:'<b>'+plural(a.q,'customer question')+'</b> waiting for a reply',btn:'Reply',view:'notifications',notes:'open'});
  if(a.wallet>0.005)rows.push({text:'<b>'+money(a.wallet)+'</b> is ready to withdraw',btn:'Money',view:'money'});
  if(!rows.length)return '';
  return '<div class="tile attn"><span class="chip">Needs attention</span><ul>'+rows.map(function(r){return '<li class="'+(r.hot?'hot':'')+'"><span class="txt">'+r.text+'</span><button class="btn small'+(r.hot?'':' secondary')+'" data-action="go" data-view="'+r.view+'"'+(r.tab?' data-tab="'+r.tab+'"':'')+(r.notes?' data-notes="'+r.notes+'"':'')+'>'+r.btn+'</button></li>'}).join('')+'</ul></div>';
}
var delistIds=[];
function delistAlert(ids){
  var its=(ids||[]).map(findItem).filter(function(it){return it&&it.sale&&(pendingDelist(it).length||it.untracked)});
  if(!its.length)return; delistIds=its.map(function(i){return i.id});
  var h='<h2>Take these down now</h2><p style="margin:0 0 10px">These sold, but they may still be listed on other apps. Remove them so nobody buys something you no longer have.</p>';
  its.forEach(function(it){
    var pend=pendingDelist(it);
    h+='<div class="kfield"><div class="khead"><b>'+esc(it.title)+'</b><span class="chip">sold on '+platName(it.sale.platform)+'</span></div>';
    if(pend.length){h+=pend.map(function(k){return '<div class="dl-row"><label><input type="checkbox" data-change="delist" data-id="'+esc(it.id)+'" data-key="'+k+'"> Removed from '+platName(k)+'</label><a class="btn small secondary" href="'+esc((it.links&&it.links[k])||PLAT_URL[k]||'#')+'" target="_blank" rel="noopener noreferrer">'+((it.links&&it.links[k])?'Open the listing ↗':'Open '+platName(k)+' ↗')+'</a></div>'}).join('')}
    else{h+='<p style="margin:4px 0;font-size:14px">I don’t know where else this was listed. Check the other apps:</p>'+PLATFORMS.filter(function(p){return p.key!==it.sale.platform}).map(function(p){return '<div class="dl-row"><label><input type="checkbox" data-change="delist" data-id="'+esc(it.id)+'" data-key="'+p.key+'"> Not listed on '+p.name+' (or removed)</label><a class="btn small secondary" href="'+esc(PLAT_URL[p.key]||'#')+'" target="_blank" rel="noopener noreferrer">Open '+p.name+' ↗</a></div>'}).join('')}
    h+='</div>';
  });
  h+='<div class="dlg-actions"><button type="button" class="btn" data-action="close-delist">Done</button></div>';
  var d=$('#delistDlg'); d.innerHTML='<div class="dlg">'+h+'</div>'; if(!d.open)d.showModal();
}
function closeDelist(){delistIds.forEach(function(id){var it=findItem(id);if(it)it.untracked=false});delistIds=[];save();$('#delistDlg').close();render()}

/* ================= REPLY TEMPLATES ================= */
var reply={noteId:'',plat:''};
function fillTpl(text,ctx){
  return text.replace(/\{buyer\}/g,ctx.buyer||'there').replace(/\{item\}/g,ctx.item||'item').replace(/\{price\}/g,ctx.price||'').replace(/\{tracking\}/g,ctx.tracking||'[add tracking number]').replace(/\{platform\}/g,ctx.platform||'').replace(/\{name\}/g,ctx.name||'').replace(/[ ]{2,}/g,' ');
}
function replyText(){
  var it=findItem($('#r_item').value), t=tpls().filter(function(x){return x.id===$('#r_tpl').value})[0], x=it&&it.sale?it.sale:null;
  var ctx={buyer:$('#r_buyer').value.trim(),item:it?it.title:'',price:it?(x?money(x.price):((it.price!==''&&it.price!=null)?money(it.price):'')):'',tracking:x?x.tracking:'',platform:reply.plat?platName(reply.plat):(x?platName(x.platform):''),name:state.settings.name};
  var out=t?fillTpl(t.text,ctx):''; $('#r_text').value=out;
  var w=$('#r_warn'); w.textContent=(t&&/\{tracking\}/.test(t.text)&&!ctx.tracking)?'This item has no tracking number yet. Add it when you mark the item shipped, then the message fills in automatically.':'';
  var plat=reply.plat||(x?x.platform:''); var a=$('#r_open'); if(plat&&PLAT_URL[plat]){a.href=PLAT_URL[plat];a.textContent='Open '+platName(plat)+' ↗';a.hidden=false}else a.hidden=true;
}
function openReply(o){
  var note=o.noteId?state.notes.filter(function(n){return n.id===o.noteId})[0]:null, it=o.itemId?findItem(o.itemId):null, tid=o.tpl||'tp1';
  reply.noteId=note?note.id:''; reply.plat=note?note.platform:(it&&it.sale?it.sale.platform:'');
  var buyer=note?(note.from||''):(it&&it.sale?(it.sale.buyer||''):'');
  if(note&&!it){var g=matchItems(note.text,state.items);if(g.length&&g[0].score>=0.5)it=g[0].item;
    if(/offer|\$\s?\d/i.test(note.text))tid='tp3';}
  var items=state.items.slice().sort(function(a,b){return (a.sale?1:0)-(b.sale?1:0)});
  var d=$('#replyDlg');
  d.innerHTML='<div class="dlg"><h2>Reply to a buyer</h2>'+
    (note?'<p style="margin:0 0 10px;font-size:15px"><b>'+esc(note.from||'Someone')+'</b> wrote: “'+esc(note.text)+'”</p>':'')+
    '<div class="form-grid"><div class="ff"><label for="r_buyer">Buyer’s name</label><input type="text" id="r_buyer" maxlength="40" value="'+esc(buyer)+'"></div>'+
    '<div class="ff"><label for="r_tpl">Template</label><select id="r_tpl">'+tpls().map(function(t){return '<option value="'+esc(t.id)+'"'+(t.id===tid?' selected':'')+'>'+esc(t.name)+'</option>'}).join('')+'</select></div>'+
    '<div class="ff full"><label for="r_item">About which item?</label><select id="r_item"><option value="">No item</option>'+items.map(function(i){return '<option value="'+esc(i.id)+'"'+(it&&it.id===i.id?' selected':'')+'>'+esc(i.title)+(i.sale?' (sold)':'')+'</option>'}).join('')+'</select></div>'+
    '<div class="ff full"><label for="r_text">Your reply (you can edit it)</label><textarea id="r_text" rows="5"></textarea><div class="msg bad" id="r_warn" aria-live="polite"></div></div></div>'+
    '<div class="kopen" style="margin-top:6px"><button type="button" class="btn" data-action="reply-copy">Copy reply</button>'+(navigator.share?'<button type="button" class="btn secondary" data-action="reply-share">Share…</button>':'')+'<a class="btn secondary" id="r_open" href="#" target="_blank" rel="noopener noreferrer" hidden></a></div>'+
    '<div class="dlg-actions">'+(note?'<button type="button" class="btn secondary small" data-action="reply-resp">Mark as responded</button>':'')+'<span class="spacer"></span><button type="button" class="btn" data-action="close-reply">Done</button></div></div>';
  d.showModal(); replyText();
}
