/* Raylos'Clo: Sold & Shipping tab */
'use strict';
/* ================= SOLD & SHIPPING ================= */
function renderSold(){
  var p=$('[data-panel="sold-shipping"]'), items=state.items.filter(function(i){return i.sale});
  var toShip=items.filter(function(i){return i.sale.shipStatus==='to_ship'});
  var shipped=items.filter(function(i){return i.sale.shipStatus==='shipped'||i.sale.shipStatus==='delivered'});
  var delist=items.filter(function(i){return pendingDelist(i).length});
  var tabs=[['toship','To Ship',toShip.length],['shipped','Shipped',shipped.length],['delist','Delisting',delist.length],['history','Sold History',items.length]];
  var html='<div class="top"><h1>Sold <span style="font-family:var(--body);letter-spacing:.023em;font-size:.6em">&amp;</span> Shipping</h1><button class="btn secondary" data-action="gm-check">Check Gmail</button><button class="btn secondary" data-action="paste-open">Paste a sale</button></div><div class="subtabs" style="margin-bottom:18px">'+
    tabs.map(function(t){return '<button type="button" data-action="sold-tab" data-tab="'+t[0]+'" aria-pressed="'+(ui.soldTab===t[0])+'">'+t[1]+' ('+t[2]+')</button>'}).join('')+'</div>';
  var tab=ui.soldTab;
  if(tab==='toship'){
    if(!toShip.length)html+=emptyCard('Nothing to ship right now.','When you mark an item as sold on a platform, it lands here.');
    else html+=toShip.sort(function(a,b){return (a.sale.date||'').localeCompare(b.sale.date||'')}).map(function(i){
      var s=i.sale, pk=s.packing||{};
      return '<div class="pcard">'+thumb(i,'lg')+'<div class="pc-body"><div class="head"><span class="ttl">'+esc(i.title)+'</span><span class="meta">Sold on '+platName(s.platform)+' for '+money(s.price)+' · '+fmtDate(s.date)+'</span></div>'+
        '<div class="checks"><label><input type="checkbox" data-change="pack" data-id="'+esc(i.id)+'" data-key="clean"'+(pk.clean?' checked':'')+'>Cleaned and folded</label><label><input type="checkbox" data-change="pack" data-id="'+esc(i.id)+'" data-key="boxed"'+(pk.boxed?' checked':'')+'>Packaged</label><label><input type="checkbox" data-change="pack" data-id="'+esc(i.id)+'" data-key="label"'+(pk.label?' checked':'')+'>Label ready</label></div>'+
        '<div class="shiprow"><label class="sr" for="track_'+esc(i.id)+'">Tracking number</label><input type="text" id="track_'+esc(i.id)+'" placeholder="Tracking number" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" value="'+esc(s.tracking||'')+'" data-change="tracking" data-id="'+esc(i.id)+'" maxlength="60"><button class="btn small" data-action="ship" data-id="'+esc(i.id)+'">Mark shipped</button><button class="btn small secondary" data-action="msg-buyer" data-id="'+esc(i.id)+'" data-t="soon">Message buyer</button></div>'+
        '<div class="msg bad" id="shipmsg_'+esc(i.id)+'" aria-live="polite"></div>'+scanButtons('track_'+esc(i.id),'shipmsg_'+esc(i.id))+'</div></div>';
    }).join('');
  }else if(tab==='shipped'){
    if(!shipped.length)html+=emptyCard('Nothing shipped yet.','Packages you mark as shipped show up here until they’re delivered.');
    else html+='<div class="card" style="--accent:var(--sage)"><div class="tablewrap"><table><thead><tr><th>Item</th><th>Sold on</th><th>Tracking</th><th>Shipped</th><th>Status</th><th></th></tr></thead><tbody>'+
      shipped.sort(function(a,b){return (b.sale.shippedDate||'').localeCompare(a.sale.shippedDate||'')}).map(function(i){
        var s=i.sale;
        return '<tr><td><div class="itemcell">'+thumb(i,'tb')+'<b>'+esc(i.title)+'</b></div></td><td>'+platName(s.platform)+'</td><td>'+esc(s.tracking||'—')+'</td><td>'+esc(fmtDate(s.shippedDate)||'—')+'</td><td>'+statusCell(s.shipStatus==='delivered'?'Delivered':'Shipped')+'</td><td>'+'<div class="actions">'+(s.shipStatus==='shipped'?'<button class="btn small" data-action="deliver" data-id="'+esc(i.id)+'">Mark delivered</button>':'')+'<button class="btn small secondary" data-action="msg-buyer" data-id="'+esc(i.id)+'" data-t="shipped">Message buyer</button></div></td></tr>';
      }).join('')+'</tbody></table></div></div>';
  }else if(tab==='delist'){
    if(!delist.length)html+=emptyCard('Nothing to delist.','If an item sells on one platform but is posted on others, remove the other listings here so you don’t sell it twice.');
    else html+=delist.map(function(i){
      return '<div class="pcard">'+thumb(i,'lg')+'<div class="pc-body"><div class="head"><span class="ttl">'+esc(i.title)+'</span><span class="meta">Sold on '+platName(i.sale.platform)+'</span></div><div class="checks">'+
        pendingDelist(i).map(function(k){return '<label><input type="checkbox" data-change="delist" data-id="'+esc(i.id)+'" data-key="'+k+'">Removed from '+platName(k)+'</label><a href="'+esc((i.links&&i.links[k])||PLAT_URL[k]||'#')+'" target="_blank" rel="noopener noreferrer" class="linkbtn">'+((i.links&&i.links[k])?'Open the listing':'Open '+platName(k))+'</a>'}).join('')+'</div></div></div>';
    }).join('');
  }else{
    if(!items.length)html+=emptyCard('No sales yet.','Every item you mark as sold is kept here.');
    else html+='<div class="card" style="--accent:var(--fawn)"><div class="tablewrap"><table><thead><tr><th>Item</th><th>Sold on</th><th>Date</th><th class="num">Price</th><th class="num">Profit</th><th>Status</th></tr></thead><tbody>'+
      items.sort(function(a,b){return (b.sale.date||'').localeCompare(a.sale.date||'')}).map(function(i){
        return '<tr><td><div class="itemcell">'+thumb(i,'tb')+'<b>'+esc(i.title)+'</b></div></td><td>'+platName(i.sale.platform)+'</td><td>'+esc(fmtDate(i.sale.date))+'</td><td class="num">'+money(i.sale.price)+'</td><td class="num">'+money(profitOf(i))+'</td><td>'+statusCell(saleLabel(i))+'</td></tr>';
      }).join('')+'</tbody></table></div></div>';
  }
  p.innerHTML=html;
}
