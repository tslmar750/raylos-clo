/* Raylos'Clo: Items tab */
'use strict';
/* ================= ITEMS ================= */
var STAGES=[{k:'unposted',n:'Not posted',c:'c1',e:'Everything has a listing link.'},{k:'listed',n:'Listed',c:'c2',e:'Nothing listed right now.'},{k:'toship',n:'To ship',c:'c3',e:'Nothing waiting to ship.'},{k:'shipped',n:'Shipped',c:'c4',e:'Nothing in transit.'},{k:'delist',n:'Delist now',c:'c5',e:'Nothing to take down.'}];
function stageOf(i){
  if(!i.sale)return posted(i).length?'listed':'unposted';
  if(i.sale.shipStatus==='to_ship')return 'toship';
  if(pendingDelist(i).length)return 'delist';
  if(i.sale.shipStatus==='shipped')return 'shipped';
  return 'done';
}
function renderItems(){
  var p=$('[data-panel="items"]');
  p.innerHTML='<div class="top"><h1>Items</h1><div class="btnrow2" style="margin:0"><button class="btn secondary" data-action="gm-check">Check Gmail</button><button class="btn secondary" data-action="paste-open">Paste a sale</button><button class="btn" data-action="new-item">New item</button></div></div>'+
    '<div class="toolbar"><label class="sr" for="itemQ">Search items</label><input type="search" id="itemQ" placeholder="Search by name, brand or category" value="'+esc(ui.itemQ)+'"><div class="subtabs" id="viewToggle"></div><div class="subtabs" id="itemFilters"></div></div>'+
    '<div id="itemsList"></div>';
  refreshItems();
}
function frameFor(i){
  var s=photoSrc(i);
  return '<div class="frame'+(s?'':' noph')+'" data-action="edit-item" data-id="'+esc(i.id)+'" role="button" tabindex="0" aria-label="Edit '+esc(i.title)+'">'+(s?'<img src="'+s+'" alt="" draggable="false">':'<img src="'+IMG[iconFor(i.category)]+'" alt="" draggable="false"><span>Add photo</span>')+'</div>';
}
function bcard(i,stage){
  var ps=posted(i), chips=ps.map(function(k){return '<span class="pl">'+platName(k)+'</span>'}).join('');
  var meta,price,btns,also='';
  if(stage==='unposted'||stage==='listed'){
    meta=stage==='listed'?chips:esc([i.category,i.size].filter(Boolean).join(' · '));
    price=(i.price!==''&&i.price!=null)?money(i.price):'—';
    btns='<button class="btn small secondary" data-action="open-kit" data-id="'+esc(i.id)+'">'+(stage==='listed'?'Cross-list':'List it')+'</button><button class="btn small" data-action="mark-sold" data-id="'+esc(i.id)+'">Mark sold</button>';
  }else{
    price=money(i.sale.price);
    if(stage==='toship'){
      meta='Sold on '+platName(i.sale.platform);
      var pd=pendingDelist(i); if(pd.length)also='<div class="also">Also delist: '+pd.map(platName).join(', ')+'</div>';
      btns='<button class="btn small" data-action="open-ship" data-id="'+esc(i.id)+'">Mark shipped</button>';
    }else if(stage==='shipped'){
      meta=platName(i.sale.platform)+' · '+esc((i.sale.tracking||'').slice(0,14))+((i.sale.tracking||'').length>14?'…':'');
      btns='<button class="btn small" data-action="deliver" data-id="'+esc(i.id)+'">Mark delivered</button>';
    }else{
      meta='Remove from '+pendingDelist(i).map(platName).join(', ');
      btns='<button class="btn small" data-action="go" data-view="sold-shipping" data-tab="delist">Delist →</button>';
    }
  }
  var drag=(stage==='unposted'||stage==='listed'||stage==='toship');
  return '<div class="bcard" data-id="'+esc(i.id)+'" data-stage="'+stage+'"'+(drag?' draggable="true"':'')+'><div class="bmain">'+frameFor(i)+'<div class="binfo"><div class="t">'+esc(i.title)+(i.sample?' <span class="chip">sample</span>':'')+'</div><div class="m1">'+meta+'</div><div class="price">'+price+'</div>'+also+'</div></div><div class="bact">'+btns+'</div></div>';
}
function refreshItems(){
  var all=state.items, q=ui.itemQ.trim().toLowerCase(), view=ui.itemView;
  $('#viewToggle').innerHTML=[['board','Board'],['list','List']].map(function(x){return '<button type="button" data-action="item-view" data-v="'+x[0]+'" aria-pressed="'+(view===x[0])+'">'+x[1]+'</button>'}).join('');
  var counts={all:all.length,unposted:0,listed:0,sold:0};
  all.forEach(function(i){var s=itemStatus(i);if(s==='Sold')counts.sold++;else if(s==='Listed')counts.listed++;else counts.unposted++});
  var fbox=$('#itemFilters');
  if(view==='list'){var f=[['all','All'],['unposted','Not posted'],['listed','Listed'],['sold','Sold']];fbox.hidden=false;fbox.innerHTML=f.map(function(x){return '<button type="button" data-action="item-filter" data-f="'+x[0]+'" aria-pressed="'+(ui.itemFilter===x[0])+'">'+x[1]+' ('+counts[x[0]]+')</button>'}).join('')}
  else{fbox.hidden=true;fbox.innerHTML=''}
  var list=all.filter(function(i){
    if(view==='list'){var s=itemStatus(i);
      if(ui.itemFilter==='unposted'&&s!=='Not posted')return false;
      if(ui.itemFilter==='listed'&&s!=='Listed')return false;
      if(ui.itemFilter==='sold'&&s!=='Sold')return false}
    if(q){var hay=(i.title+' '+(i.brand||'')+' '+(i.category||'')+' '+(i.notes||'')).toLowerCase();if(hay.indexOf(q)<0)return false}
    return true;
  }).sort(function(a,b){return (b.created||0)-(a.created||0)});
  var box=$('#itemsList');
  if(!all.length){box.innerHTML='<div class="tablecard"><div class="empty" style="padding:20px"><p>No items yet.</p><div class="btnrow"><button class="btn" data-action="new-item">Add your first item</button><button class="btn secondary" data-action="load-sample">Load sample data</button></div></div></div>';return}
  if(!list.length){box.innerHTML='<div class="tablecard"><p style="margin:6px 0">No items match.</p></div>';return}
  if(view==='board'){
    var by={unposted:[],listed:[],toship:[],shipped:[],delist:[]},done=0;
    list.forEach(function(i){var st=stageOf(i);if(st==='done')done++;else by[st].push(i)});
    by.toship.sort(function(a,b){return (a.sale.date||'').localeCompare(b.sale.date||'')});
    box.innerHTML='<div class="boardscroll"><div class="board" id="board">'+STAGES.map(function(st){
      return '<div class="bcol '+st.c+'" data-stage="'+st.k+'"><h3 class="k">'+st.n+'<span>'+by[st.k].length+'</span></h3><div class="bbody">'+(by[st.k].length?by[st.k].map(function(i){return bcard(i,st.k)}).join(''):'<p class="none">'+st.e+'</p>')+'</div></div>';
    }).join('')+'</div></div><p class="boardmsg" id="boardMsg" aria-live="polite"></p>'+
    '<p class="boardhint"><span class="hint-desk">Scroll inside a column to see more. Drag a card into To ship to mark it sold, or from To ship into Shipped. The buttons on each card do the same.</span><span class="hint-phone">Swipe left and right to see each stage. Use the buttons on a card to move it along.</span></p>'+
    (done?'<p class="boardfoot">'+plural(done,'finished sale')+' not shown here. <button class="linkbtn" data-action="go" data-view="sold-shipping" data-tab="history">See Sold History</button></p>':'');
    return;
  }
  box.innerHTML='<div class="tablecard"><div class="tablewrap"><table><thead><tr><th>Item</th><th>Posted on</th><th class="num">Cost</th><th class="num">Price</th><th>Status</th><th></th></tr></thead><tbody>'+
    list.map(function(i){
      var ps=posted(i), st=itemStatus(i);
      var chips=ps.length?ps.map(function(k){return '<span class="chip">'+platName(k)+'</span>'}).join(''):'<span class="sub">none yet</span>';
      var meta=[i.category,i.size?('Size '+i.size):'',i.brand].filter(Boolean).map(esc).join(' · ');
      var stLabel=st==='Sold'?statusCell(saleLabel(i)):statusCell(st);
      if(st==='Not posted')stLabel='<span class="status"><span class="dot"></span>Not posted</span>';
      if(st==='Listed')stLabel='<span class="status"><span class="dot" style="background:var(--sage)"></span>Listed</span>';
      return '<tr><td><div class="itemcell">'+thumb(i,'tb')+'<div><div><b>'+esc(i.title)+'</b>'+(i.sample?' <span class="chip">sample</span>':'')+'</div><div class="sub">'+meta+'</div></div></div></td>'+
        '<td>'+chips+'</td><td class="num">'+(i.cost!==''&&i.cost!=null?money(i.cost):'—')+'</td><td class="num">'+(i.price!==''&&i.price!=null?money(i.price):'—')+'</td><td>'+stLabel+'</td>'+
        '<td><div class="actions"><button class="btn small secondary" data-action="edit-item" data-id="'+esc(i.id)+'">Edit</button>'+(i.sale?'':'<button class="btn small" data-action="mark-sold" data-id="'+esc(i.id)+'">Mark sold</button>')+'</div></td></tr>';
    }).join('')+'</tbody></table></div></div>';
}
