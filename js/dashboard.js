/* Raylos'Clo: Dashboard tab */
'use strict';
/* ================= DASHBOARD ================= */
function monthRows(n){
  var rows=monthKeys(n).map(function(k){return {k:k,sales:0,profit:0,n:0}});
  state.items.forEach(function(i){if(!i.sale||!i.sale.date)return;var r=rows.filter(function(x){return x.k===i.sale.date.slice(0,7)})[0];if(r){r.sales+=num(i.sale.price);r.profit+=profitOf(i);r.n++}});
  return rows;
}
function renderDashboard(anim){
  anim=anim!==false;
  var p=$('[data-panel="dashboard"]'), items=state.items;
  var listed=items.filter(function(i){return !i.sale&&posted(i).length});
  var toShip=items.filter(function(i){return i.sale&&i.sale.shipStatus==='to_ship'}).sort(function(a,b){return (a.sale.date||'').localeCompare(b.sale.date||'')});
  var soldMonth=items.filter(function(i){return i.sale&&thisMonth(i.sale.date)});
  var rev=soldMonth.reduce(function(a,i){return a+num(i.sale.price)},0), prof=soldMonth.reduce(function(a,i){return a+profitOf(i)},0);
  var delist=items.filter(function(i){return pendingDelist(i).length});
  var unposted=items.filter(function(i){return !i.sale&&!posted(i).length});
  var name=state.settings.name, d=new Date();
  var parts=[];
  if(toShip.length)parts.push('<b>'+plural(toShip.length,'package')+'</b> to ship');
  if(delist.length)parts.push('<b>'+plural(delist.length,'listing')+'</b> to take down');
  var html='<div class="hero"><div><h1 class="hello-text">hello'+(name?', '+esc(name):'')+'</h1><p>'+esc(d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}))+'. '+(parts.length?'You have '+parts.join(' and ')+'.':'Nothing urgent today.')+'</p></div>'+(hasSample()?'<span class="pill">Sample data on</span>':'')+'</div>';
  if(!items.length){
    html+=emptyCard('Welcome. Your closet is empty.','Add your first item, or load a few sample items to see how everything works. You can remove the sample data any time in Settings.',
      '<button class="btn" data-action="new-item">Add your first item</button><button class="btn secondary" data-action="load-sample">Load sample data</button>')+'<div style="height:18px"></div>';
  }
  // tiles
  var shipTile='<div class="tile ship"><span class="chip">To ship</span><div class="big" data-count="'+toShip.length+'" data-fmt="int">'+toShip.length+'</div>'+
    (toShip.length?'<ul>'+toShip.slice(0,3).map(function(i){return '<li>'+thumb(i)+esc(i.title)+'<b>'+platName(i.sale.platform)+' · '+money(i.sale.price)+'</b></li>'}).join('')+'</ul>'+(toShip.length>3?'<p class="more">+ '+(toShip.length-3)+' more</p>':''):'<p class="nice">Nothing waiting. Nice.</p>')+
    '<button class="btn small secondary" data-action="go" data-view="sold-shipping" data-tab="toship">Open To Ship →</button></div>';
  var bd=collectBreakdown(), wallet=bd.wallet, pending=bd.pending;
  var collect=bd.total;
  var collectTile='<div class="tile collect"><span class="chip">$ to collect</span><div class="big" data-count="'+collect+'" data-fmt="d0">$'+Math.round(collect)+'</div><p>'+money(wallet)+' wallet · '+money(pending)+' pending · '+money(bd.direct)+' direct</p><p style="margin-top:8px"><button class="linkbtn" data-action="go" data-view="money">See details</button></p></div>';
  var soldTile='<div class="tile sold"><span class="chip">Sold this month</span><div class="big" data-count="'+soldMonth.length+'" data-fmt="int">'+soldMonth.length+'</div><p>'+money(rev)+' in sales<br>'+money(prof)+' profit</p></div>';
  var rows=monthRows(6), mx=Math.max.apply(null,rows.map(function(r){return Math.max(r.sales,r.profit,0)}).concat([1]));
  var anySales=rows.some(function(r){return r.n>0});
  var chartTile='<div class="tile chartt"><span class="chip">Sales and profit, last 6 months</span>'+(anySales?
    '<div class="mbars" role="img" aria-label="'+esc(rows.map(function(r){return monthLabel(r.k)+': sales '+money(r.sales)+', profit '+money(r.profit)}).join('. '))+'">'+rows.map(function(r,ix){return '<div><i style="height:'+Math.max(0,r.sales/mx*100)+'%;--d:'+(ix*0.08).toFixed(2)+'s" title="'+esc(monthLabel(r.k)+' sales '+money(r.sales))+'"></i><i class="p" style="height:'+Math.max(0,r.profit/mx*100)+'%;--d:'+(ix*0.08+0.04).toFixed(2)+'s" title="'+esc(monthLabel(r.k)+' profit '+money(r.profit))+'"></i></div>'}).join('')+'</div><div class="mmonths">'+rows.map(function(r){return '<span>'+monthLabel(r.k)+'</span>'}).join('')+'</div>':
    '<p style="margin-top:14px">No sales yet. When you mark an item as sold, this fills in.</p>')+
    '<p style="margin-top:8px"><button class="linkbtn" data-action="go" data-view="money">See all charts</button></p></div>';
  var todo=[];
  toShip.forEach(function(i){todo.push({text:'Pack and ship '+esc(i.title)+' ('+platName(i.sale.platform)+')',view:'sold-shipping',tab:'toship'})});
  delist.forEach(function(i){todo.push({text:'Delist '+esc(i.title)+' on '+pendingDelist(i).map(platName).join(', '),view:'sold-shipping',tab:'delist'})});
  if(unposted.length)todo.push({text:plural(unposted.length,'item')+' not posted yet',view:'items'});
  var open=state.tasks.filter(function(t){return !t.done}).length;
  var th='<span class="chip">Today</span> <span style="font-size:15px;margin-left:8px">'+(todo.length+open?plural(todo.length+open,'thing')+' to do':'Nothing to do right now.')+'</span><ul class="todo">';
  todo.forEach(function(t){th+='<li><span class="txt">'+t.text+'</span><button class="btn small secondary" data-action="go" data-view="'+t.view+'"'+(t.tab?' data-tab="'+t.tab+'"':'')+'>Go</button></li>'});
  state.tasks.forEach(function(t){th+='<li class="'+(t.done?'done':'')+'"><input type="checkbox" id="task_'+esc(t.id)+'" data-change="task-toggle" data-id="'+esc(t.id)+'"'+(t.done?' checked':'')+'><label class="txt" for="task_'+esc(t.id)+'">'+esc(t.text)+'</label><button class="x" data-action="task-del" data-id="'+esc(t.id)+'" aria-label="Remove task">&times;</button></li>'});
  th+='</ul><form class="addrow" data-form="task-add"><label class="sr" for="newTask">New to-do</label><input type="text" id="newTask" placeholder="Add your own to-do" maxlength="120"><button class="btn small" type="submit">Add</button></form>';
  var todayTile='<div class="tile today">'+th+'</div>';
  var rackTile='<div class="tile rack"><img src="'+IMG.rack+'" alt=""><p class="k">'+(unposted.length?plural(unposted.length,'item')+' not posted yet':'Everything is posted')+'</p><button class="btn small secondary" data-action="go" data-view="items">Open Items →</button></div>';
  var counts={},maxc=0; PLATFORMS.forEach(function(pl){counts[pl.key]=listed.filter(function(i){return posted(i).indexOf(pl.key)>=0}).length;if(counts[pl.key]>maxc)maxc=counts[pl.key]});
  var platTile='<div class="tile plat"><span class="chip">Listed by platform</span>'+(listed.length?'<div class="bars">'+PLATFORMS.map(function(pl){return barRow(pl.name,counts[pl.key],maxc,pl.color,counts[pl.key])}).join('')+'</div>':'<p style="margin-top:14px">Add a listing link to an item and it shows up here.</p>')+'</div>';
  function pframe(i,rank,sub){var s=photoSrc(i);return '<button type="button" class="pf" data-action="edit-item" data-id="'+esc(i.id)+'">'+(rank?'<span class="rk">'+rank+'</span>':'')+'<span class="frame'+(s?'':' noph')+'">'+(s?'<img src="'+s+'" alt="" draggable="false">':'<img src="'+IMG[iconFor(i.category)]+'" alt="" draggable="false"><span>Add photo</span>')+'</span><span class="pt">'+esc(i.title)+'</span><span class="pp">'+sub+'</span></button>'}
  var arr=items.filter(function(i){return !i.sale}).sort(function(a,b){return (b.created||0)-(a.created||0)}).slice(0,4);
  var arrivalsTile='<div class="tile arrivals"><span class="chip">New arrivals</span>'+(arr.length?'<div class="pfs">'+arr.map(function(i){return pframe(i,0,(i.price!==''&&i.price!=null)?money(i.price):'no price yet')}).join('')+'</div>':'<p style="margin-top:14px">Items you add show up here with their photos.</p>')+'</div>';
  var top3=items.filter(function(i){return i.sale}).sort(function(a,b){return profitOf(b)-profitOf(a)}).slice(0,3);
  var earnersTile='<div class="tile earners"><span class="chip">Top earners</span>'+(top3.length?'<div class="pfs">'+top3.map(function(i,ix){return pframe(i,ix+1,money(profitOf(i))+' profit')}).join('')+'</div>':'<p style="margin-top:14px">Your best sellers show up here once you mark items as sold.</p>')+'</div>';
  html+=attnTileHtml()+'<div class="bento'+(anim?' anim':'')+'">'+shipTile+collectTile+soldTile+chartTile+todayTile+rackTile+platTile+arrivalsTile+earnersTile+'</div>';
  p.innerHTML=html;
  animateCounts(p,anim);
}
function stat(label,val,hint,accent,count){return '<div class="card stat" style="--accent:'+accent+'"><div class="label">'+esc(label)+'</div><div class="num"'+(count!=null?' data-count="'+count+'"':'')+'>'+esc(val)+'</div><div class="hint">'+esc(hint)+'</div></div>'}
