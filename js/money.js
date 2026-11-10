/* Raylos'Clo: Money tab and charts */
'use strict';
/* ================= MONEY ================= */
function renderMoney(anim){
  anim=anim!==false;
  var p=$('[data-panel="money"]'), per=ui.moneyPeriod;
  var sold=state.items.filter(function(i){return i.sale&&(per==='all'||thisMonth(i.sale.date))});
  var rev=0,cost=0,fees=0,ship=0;
  sold.forEach(function(i){rev+=num(i.sale.price);cost+=num(i.cost);fees+=feeFor(i.sale.platform,i.sale.price);ship+=num(i.sale.shipCost)});
  var profit=rev-cost-fees-ship;
  var unsold=state.items.filter(function(i){return !i.sale}), inv=unsold.reduce(function(a,i){return a+num(i.cost)},0);
  var anyFee=Object.keys(state.settings.fees).some(function(k){return num(state.settings.fees[k])>0});
  var html='<div class="top"><h1>Money</h1><div class="subtabs"><button type="button" data-action="money-period" data-p="month" aria-pressed="'+(per==='month')+'">This month</button><button type="button" data-action="money-period" data-p="all" aria-pressed="'+(per==='all')+'">All time</button></div></div>';
  if(!anyFee)html+='<div class="card" style="--accent:var(--fawn)"><p style="margin:0">Platform fees are set to 0%, so profit is overstated. <button class="linkbtn" data-action="go" data-view="settings">Enter your fee rates in Settings</button> for accurate numbers.</p></div>';
  html+='<div class="stats">'+stat('Sales',money(rev),plural(sold.length,'item')+' sold','var(--sage)',rev)+stat('What I paid',money(cost),'cost of items sold','var(--lilac)',cost)+stat('Fees + shipping',money(fees+ship),'fees '+money(fees)+' · shipping '+money(ship),'var(--fawn)',fees+ship)+stat('Profit',money(profit),sold.length?('about '+money(profit/sold.length)+' per item'):'no sales in this period','var(--olive)',profit)+'</div>';
  html+=chartCards(sold,per,anim);

  html+='<div class="grid2">'+collectCardHtml()+
    '<div class="card" style="--accent:var(--lilac)"><h2>Inventory</h2><p style="margin:0 0 6px;font-size:20px"><b>'+plural(unsold.length,'item')+'</b> not sold yet</p><p style="margin:0">You paid '+money(inv)+' for them. Asking prices add up to '+money(unsold.reduce(function(a,i){return a+num(i.price)},0))+'.</p></div></div>';

  html+='<div class="card" style="--accent:var(--fawn)"><h2>Profit per item</h2>';
  if(!sold.length)html+='<p>No sales in this period yet.</p>';
  else html+='<div class="tablewrap"><table><thead><tr><th>Item</th><th>Sold on</th><th class="num">Sale</th><th class="num">Paid</th><th class="num">Fees</th><th class="num">Shipping</th><th class="num">Profit</th></tr></thead><tbody>'+
    sold.sort(function(a,b){return (b.sale.date||'').localeCompare(a.sale.date||'')}).map(function(i){return '<tr><td><b>'+esc(i.title)+'</b></td><td>'+platName(i.sale.platform)+'</td><td class="num">'+money(i.sale.price)+'</td><td class="num">'+money(i.cost)+'</td><td class="num">'+money(feeFor(i.sale.platform,i.sale.price))+'</td><td class="num">'+money(i.sale.shipCost)+'</td><td class="num"><b>'+money(profitOf(i))+'</b></td></tr>'}).join('')+
    '</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">'+money(rev)+'</td><td class="num">'+money(cost)+'</td><td class="num">'+money(fees)+'</td><td class="num">'+money(ship)+'</td><td class="num">'+money(profit)+'</td></tr></tfoot></table></div>';
  html+='</div>';
  p.innerHTML=html;
  animateCounts(p,anim);
}


function collectCardHtml(){
  var bd=collectBreakdown(), adj=state.money.adjust||{};
  var rows=WALLET_KEYS.map(function(k){
    var o=bd.by[k]||{wallet:0,pending:0};
    return '<tr><td><b>'+platName(k)+'</b>'+(o.wallet>0?'<div style="margin-top:4px"><button type="button" class="btn small" data-action="withdraw" data-key="'+k+'">I withdrew it</button></div>':'')+'</td><td class="num">'+money(o.wallet)+'</td><td class="num">'+money(o.pending)+'</td></tr>';
  }).join('');
  var direct='<tr><td><b>Direct</b> (Venmo / cash)'+(bd.direct>0?'<div style="margin-top:4px"><button type="button" class="btn small" data-action="withdraw" data-key="direct">Got it all</button></div>':'')+'</td><td class="num" colspan="2">'+money(bd.direct)+' owed to you</td></tr>';
  var wait=bd.rows.slice().sort(function(a,b){return (b.item.sale.date||'').localeCompare(a.item.sale.date||'')});
  var label={wallet:'Ready to withdraw',pending:'Waiting on delivery',direct:'Owed to you directly'};
  var hasAdj=WALLET_KEYS.some(function(k){return num(adj[k])});
  return '<div class="card" style="--accent:var(--olive)"><h2>$ to collect</h2><p style="margin:0 0 10px;font-size:16px">Worked out from your sales: the sale price, minus your fee % and shipping. A sale counts as <b>pending</b> until it’s delivered, then as <b>wallet</b>. Tap <b>I withdrew it</b> when you cash out.</p>'+
    '<div class="tablewrap"><table><thead><tr><th>Platform</th><th class="num">Wallet</th><th class="num">Pending</th></tr></thead><tbody>'+rows+direct+'</tbody><tfoot><tr><td>Total</td><td class="num" colspan="2">'+money(bd.total)+'</td></tr></tfoot></table></div>'+
    '<details class="more" style="margin-top:12px"'+(hasAdj?' open':'')+'><summary>Fix a difference (refunds, holds)</summary><p style="font-size:14px;margin:6px 0 8px">If a number is off from what the platform really shows, type the difference here. Use a minus sign to take money off.</p><div class="fees">'+
      WALLET_KEYS.map(function(k){return '<div class="ff"><label for="adj_'+k+'">'+platName(k)+' ($)</label><input type="number" id="adj_'+k+'" step="0.01" placeholder="0" data-change="adjust" data-key="'+k+'" value="'+(num(adj[k])?esc(adj[k]):'')+'"></div>'}).join('')+'</div></details>'+
    '<h3 style="margin-top:14px">Sales waiting for money</h3>'+
    (wait.length?'<ul class="todo waitlist">'+wait.slice(0,12).map(function(r){return '<li><input type="checkbox" id="paid_'+esc(r.item.id)+'" data-change="paid" data-id="'+esc(r.item.id)+'"><label class="txt" for="paid_'+esc(r.item.id)+'"><b>'+esc(r.item.title)+'</b> · '+platName(r.item.sale.platform)+' · '+money(r.net)+'<br><small>'+label[r.state]+'. Tick when you have it.</small></label></li>'}).join('')+'</ul>'+(wait.length>12?'<p style="font-size:14px">+ '+(wait.length-12)+' more</p>':''):'<p style="margin:6px 0 0">Nothing waiting. Every sale is paid out.</p>')+
    '<p style="font-size:13px;margin:10px 0 0">This is an estimate. Refunds, holds, and fee changes can make it differ from the real balance.</p></div>';
}
/* ================= MONEY CHARTS ================= */
function niceCeil(v){if(!(v>0))return 10;var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)),n=v/p,m=n<=1?1:(n<=2?2:(n<=2.5?2.5:(n<=5?5:10)));return m*p}
function monthKeys(n){var out=[],now=new Date();for(var i=n-1;i>=0;i--){var x=new Date(now.getFullYear(),now.getMonth()-i,1);out.push(x.getFullYear()+'-'+pad(x.getMonth()+1))}return out}
function monthLabel(key){var p=key.split('-'),d=new Date(+p[0],+p[1]-1,1),m=d.toLocaleDateString('en-US',{month:'short'});return p[1]==='01'?m+' ’'+p[0].slice(2):m}
function short$(n){var a=Math.abs(n),s=a>=1000?'$'+(a/1000).toFixed(a>=10000?0:1).replace(/\.0$/,'')+'k':'$'+Math.round(a);return (n<0?'-':'')+s}
function chartEmpty(msg){return '<p class="chart-empty">'+msg+'</p>'}

function chartMonthly(anim){
  var keys=monthKeys(6),rows=keys.map(function(k){return {k:k,sales:0,profit:0,n:0}});
  state.items.forEach(function(i){
    if(!i.sale||!i.sale.date)return;
    var row=rows.filter(function(r){return r.k===i.sale.date.slice(0,7)})[0];
    if(row){row.sales+=num(i.sale.price);row.profit+=profitOf(i);row.n++}
  });
  if(!rows.some(function(r){return r.n>0}))return chartEmpty('No sales in the last 6 months yet. Mark an item as sold and this chart fills in.');
  var maxV=Math.max.apply(null,rows.map(function(r){return Math.max(r.sales,r.profit,0)}));
  var minV=Math.min.apply(null,rows.map(function(r){return Math.min(r.profit,0)}));
  var top=niceCeil(maxV),bottom=minV<0?-niceCeil(-minV):0,range=top-bottom;
  function pct(v){return (v-bottom)/range*100}
  var zero=pct(0),ticks=[];
  for(var t=0;t<=4;t++)ticks.push(top*t/4);
  if(bottom<0)ticks.unshift(bottom);
  var aria='Monthly sales and profit, last 6 months. '+rows.map(function(r){return monthLabel(r.k)+': sales '+money(r.sales)+', profit '+money(r.profit)}).join('. ');
  var h='<div class="chartscroll"><div class="c1-wrap'+(anim?' anim':'')+'" role="img" aria-label="'+esc(aria)+'"><div class="c1-y">'+
    ticks.map(function(v){return '<span style="bottom:'+pct(v)+'%">'+short$(v)+'</span>'}).join('')+'</div><div class="c1-plot">'+
    ticks.map(function(v){return v===0?'':'<div class="gl" style="bottom:'+pct(v)+'%"></div>'}).join('')+'<div class="zl" style="bottom:'+zero+'%"></div>';
  rows.forEach(function(r,idx){
    h+='<div class="c1-col">'+bar(r.sales,'sales',idx*0.09,r)+bar(r.profit,'profit',idx*0.09+0.05,r)+'</div>';
  });
  function bar(v,kind,delay,r){
    if(v===0)return '';
    var y=pct(v),hgt=Math.abs(y-zero),neg=v<0,left=kind==='sales'?30:70;
    var out='<div class="c1-bar '+kind+' '+(neg?'neg':'pos')+'" style="'+(neg?'top':'bottom')+':'+(neg?(100-zero):zero)+'%;height:'+hgt+'%;--d:'+delay.toFixed(2)+'s" title="'+esc(monthLabel(r.k)+' '+(kind==='sales'?'sales ':'profit ')+money(v))+'"></div>';
    if(v!==0)out+='<div class="c1-val" style="left:'+left+'%;'+(neg?'top:calc('+(100-y)+'% + 4px)':'bottom:calc('+y+'% + 4px)')+';--d:'+delay.toFixed(2)+'s">'+short$(v)+'</div>';
    return out;
  }
  h+='</div><div class="c1-months">'+rows.map(function(r){return '<span>'+monthLabel(r.k)+'</span>'}).join('')+'</div></div></div>';
  return '<div class="legend"><span><i class="sw" style="background:var(--sage)"></i>Sales</span><span><i class="sw" style="background:var(--olive)"></i>Profit</span></div>'+h;
}

function chartDollar(sold,anim){
  var rev=0,cost=0,fees=0,ship=0;
  sold.forEach(function(i){rev+=num(i.sale.price);cost+=num(i.cost);fees+=feeFor(i.sale.platform,i.sale.price);ship+=num(i.sale.shipCost)});
  var profit=rev-cost-fees-ship;
  if(!sold.length||(rev<=0&&cost+fees+ship<=0))return chartEmpty('No sales in this period yet. Mark an item as sold and this bar fills in.');
  var segs=[{n:'What I paid',v:cost,c:'var(--lilac)'},{n:'Fees',v:fees,c:'var(--fawn)'},{n:'Shipping',v:ship,c:'var(--plum)'}];
  var loss=profit<0;
  if(!loss)segs.push({n:'Profit',v:profit,c:'var(--olive)'});
  var total=segs.reduce(function(a,s){return a+s.v},0)||1, base=rev>0?rev:total;
  var note=loss?'You spent '+money(-profit)+' more than you earned in this period.':(rev>0?'You keep about '+Math.round(profit/rev*100)+'¢ of every $1 you sell.':'');
  var aria='Where each dollar goes. '+segs.map(function(s){return s.n+' '+money(s.v)}).join(', ');
  var h=(note?'<p class="c2-note">'+esc(note)+'</p>':'')+'<div class="'+(anim?'anim':'')+'" role="img" aria-label="'+esc(aria)+'"><div class="c2-pct">'+
    segs.map(function(s){var w=s.v/total*100;return '<span style="flex:0 0 '+w+'%">'+(w>=9?Math.round(s.v/base*100)+'%':'')+'</span>'}).join('')+'</div><div class="c2-bar">'+
    segs.map(function(s){return '<div class="c2-seg" style="flex:0 0 '+(s.v/total*100)+'%;background:'+s.c+'" title="'+esc(s.n+' '+money(s.v))+'"></div>'}).join('')+'</div></div>'+
    '<div class="c2-legend">'+segs.map(function(s){return '<div><i class="sw" style="background:'+s.c+'"></i>'+esc(s.n)+'<b>'+money(s.v)+' · '+Math.round(s.v/base*100)+'%</b></div>'}).join('')+'</div>';
  return h;
}

function hbars(rows,anim,colorFor){
  if(!rows.length)return chartEmpty('Nothing to show yet.');
  var maxAbs=Math.max.apply(null,rows.map(function(r){return Math.abs(r.profit)}))||1;
  return '<div class="'+(anim?'anim':'')+'">'+rows.map(function(r,idx){
    var w=Math.max(2,Math.abs(r.profit)/maxAbs*100);
    return '<div class="hrow"><div class="hname">'+esc(r.name)+'<small>'+plural(r.n,'item')+' sold</small></div><div class="htrack"><div class="hbar'+(r.profit<0?' loss':'')+'" style="width:'+w+'%;background-color:'+colorFor(r)+';--d:'+(idx*0.1).toFixed(2)+'s" title="'+esc(r.name+': '+money(r.profit))+'"></div></div><div class="hval"><b>'+money(r.profit)+'</b><small>'+money(r.profit/r.n)+' per item</small></div></div>';
  }).join('')+'</div>';
}
function groupProfit(sold,keyFn,nameFn){
  var map={};
  sold.forEach(function(i){var k=keyFn(i);if(!map[k])map[k]={key:k,name:nameFn(k),profit:0,n:0};map[k].profit+=profitOf(i);map[k].n++});
  return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.profit-a.profit});
}
function chartCards(sold,per,anim){
  var label=per==='all'?'All time':'This month';
  var byPlat=groupProfit(sold,function(i){return i.sale.platform},function(k){return platName(k)});
  var platColor=function(r){return r.key==='direct'?'var(--bone)':(PLAT[r.key]?PLAT[r.key].color:'var(--sage)')};
  return '<div class="card" style="--accent:var(--sage)"><h2>Monthly sales and profit</h2><p class="chart-sub">Last 6 months, based on the date each item sold.</p>'+chartMonthly(anim)+'</div>'+
    '<div class="card" style="--accent:var(--fawn)"><h2>Where each dollar goes</h2><p class="chart-sub">'+label+'. Every dollar you sold, split into costs and profit.</p>'+chartDollar(sold,anim)+'</div>'+
    '<div class="card" style="--accent:var(--lilac)"><h2>What earns the most</h2><p class="chart-sub">'+label+'. Total profit, with the average per item underneath.</p>'+
    '<div class="hgroup"><h3>Where I sold it</h3>'+(sold.length?hbars(byPlat,anim,platColor):chartEmpty('No sales in this period yet.'))+'</div></div>';
}
function animateCounts(root,anim){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $all('[data-count]',root).forEach(function(el){
    var target=num(el.getAttribute('data-count')),fmt=el.getAttribute('data-fmt'),f=function(v){return fmt==='int'?String(Math.round(v)):(fmt==='d0'?'$'+Math.round(v):money(v))},final=f(target);
    if(!anim||reduce||!window.requestAnimationFrame){el.textContent=final;return}
    var start=null,dur=800;el.textContent=f(0);
    function step(ts){if(start===null)start=ts;var k=Math.min(1,(ts-start)/dur),e=1-Math.pow(1-k,3);el.textContent=f(target*e);if(k<1)requestAnimationFrame(step);else el.textContent=final}
    requestAnimationFrame(step);
  });
}
