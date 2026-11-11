/* Raylos'Clo: Listing kit (copy title/description one box at a time) */
'use strict';
/* ================= LISTING KIT ================= */
var kitId=null, kitPlat='depop', kitStep=0;
var KIT_PLATS=WALLET_KEYS; /* same list as everywhere else, including apps the user adds */
var PLAT_URL={depop:'https://www.depop.com',vinted:'https://www.vinted.com',poshmark:'https://poshmark.com',ebay:'https://www.ebay.com'};
var SELL_HINT={depop:'In the Depop app or site, tap the Sell button.',vinted:'In Vinted, tap Sell an item.',poshmark:'In Poshmark, tap the Sell button.',ebay:'In eBay, tap Sell.'};
function tagList(it){
  var stop={the:1,and:1,for:1,with:1,size:1,mens:0},seen={},out=[];
  (it.title+' '+(it.brand||'')+' '+(it.category||'')).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).forEach(function(w){if(w.length>2&&!stop[w]&&!seen[w]){seen[w]=1;out.push(w)}});
  return out.slice(0,6);
}
function kitFields(it,plat){
  var size=it.size?('Size: '+it.size):'';
  var tags=(it.styleTags||'').split(/[,#\n]+/).map(function(t){return t.trim().replace(/\s+/g,'')}).filter(Boolean);
  if(!tags.length)tags=tagList(it);
  var hash=tags.map(function(t){return '#'+t.toLowerCase()}).join(' ');
  var price=(it.price!==''&&it.price!=null)?String(it.price):'';
  var descDepop=[it.title,size,it.notes||'',hash].filter(Boolean).join('\n\n');
  var descOther=[size,it.notes||''].filter(Boolean).join('\n\n')||it.title;
  var V={
    title:{label:'Title',val:it.title,rows:1},
    desc:{label:'Description',val:plat==='depop'?descDepop:descOther,rows:6},
    category:{label:'Category',val:it.category||'',rows:1},
    brand:{label:'Brand',val:it.brand||'',rows:1},
    condition:{label:'Condition',val:it.condition||'',rows:1},
    color:{label:'Color',val:it.color||'',rows:1},
    size:{label:'Size',val:it.size||'',rows:1},
    source:{label:'Source',val:it.dsource||'',rows:1},
    age:{label:'Age',val:it.age||'',rows:1},
    style:{label:plat==='poshmark'?'Style tags':'Style',val:it.styleTags||'',rows:1},
    price:{label:plat==='depop'?'Item price':'Price',val:price,rows:1},
    pkg:{label:'Package size',val:it.pkg||'',rows:1},
    qty:{label:'Quantity',val:'1',rows:1},
    avail:{label:'Availability',val:'For sale',rows:1}
  };
  /* For now the kit only copies the parts you type on every platform (title and description).
     The dropdown parts are still built below; add their keys back to a platform's list to show them again. */
  var ORDER={
    depop:['desc'],
    vinted:['title','desc'],
    poshmark:['title','desc'],
    ebay:['title','desc']
  }[plat]||[];
  var out=[],empty=[],group=null;
  ORDER.forEach(function(k){
    if(k==='|'){group='Often asked too. Check your Vinted form for these.';return}
    var f=V[k]; if(!f.val){empty.push(f.label);return}
    out.push({k:k,label:f.label,val:f.val,rows:f.rows,group:group});group=null;
  });
  out.empty=empty; out.price=price; return out;
}
function openKit(id,plat,keep){
  var it=findItem(id); if(!it)return; if(!keep)kitStep=0; kitId=id; if(plat)kitPlat=plat; else if(KIT_PLATS.indexOf(kitPlat)<0)kitPlat='depop';
  if($('#itemDlg').open)$('#itemDlg').close();
  var d=$('#kitDlg'), fs=kitFields(it,kitPlat), src=photoSrc(it), link=(it.links&&it.links[kitPlat])||'';
  d.innerHTML='<div class="dlg"><div class="kit-head"><div class="frame'+(src?'':' noph')+'" style="width:64px">'+(src?'<img src="'+src+'" alt="">':'<img src="'+IMG[iconFor(it.category)]+'" alt="">')+'</div><div><h2>'+esc(it.title)+'</h2><p>Listing kit: copy each part, paste it into the platform.</p></div></div>'+
    '<div class="subtabs ktabs" role="tablist">'+KIT_PLATS.map(function(k){return '<button type="button" data-action="kit-plat" data-p="'+k+'" aria-pressed="'+(kitPlat===k)+'">'+PLAT[k].name+(posted(it).indexOf(k)>=0?' ✓':'')+'</button>'}).join('')+'</div>'+
    fs.map(function(f){return (f.group?'<p class="kgroup">'+f.group+'</p>':'')+'<div class="kfield" data-k="'+f.k+'"><div class="khead"><b>'+f.label+'</b><button type="button" class="btn small secondary" data-action="kit-copy" data-k="'+f.k+'">Copy</button></div><textarea id="kit_'+f.k+'" spellcheck="true" autocorrect="on" autocapitalize="sentences" rows="'+f.rows+'" aria-label="'+f.label+'">'+esc(f.val)+'</textarea>'+(f.k==='title'&&kitPlat==='ebay'?'<div class="kcount" id="kit_count"></div>':'')+'</div>'}).join('')+
    '<div class="kprice"><div><b>Price</b><span>'+(fs.price?money(fs.price):'Not set yet')+'</span></div><small>'+(fs.price?'You type this in on the platform, so there is nothing to copy.':'Add a price to the item first. <button type="button" class="linkbtn" data-action="edit-item" data-id="'+esc(it.id)+'">Fill it in</button>')+'</small></div>'+
    '<p class="kempty">Category, condition, color and the other dropdowns: pick those on the platform.</p>'+
    '<div class="kfield kphoto"><span>'+(src?'Photo ready':'No photo yet. Add one with Edit.')+'</span>'+(src?'<button type="button" class="btn small secondary" data-action="kit-photo">Save or share photo</button>':'')+'</div>'+
    '<div class="kopen">'+(PLAT_URL[kitPlat]?'<a class="btn" href="'+PLAT_URL[kitPlat]+'" target="_blank" rel="noopener noreferrer">Open '+PLAT[kitPlat].name+' ↗</a>':'')+'<p>'+(SELL_HINT[kitPlat]||'Open '+esc(PLAT[kitPlat].name)+' and start a new listing.')+'</p></div>'+
    '<div class="kopen" style="margin:6px 0"><button type="button" class="btn" data-action="kit-posted">I posted it on '+PLAT[kitPlat].name+' ✓</button><p>Tap this after you post, with or without a link. It remembers where the item is listed, so you get a delist reminder later.</p></div>'+
    '<div class="klink"><label for="kit_link"><b style="font-size:14px">After you post: paste the listing link</b></label><div class="row"><input type="text" id="kit_link" placeholder="'+(PLAT[kitPlat].domain?'https://'+PLAT[kitPlat].domain+'/…':'Paste the link')+'" value="'+esc(link)+'" autocomplete="off"><button type="button" class="btn small" data-action="kit-save-link">Save link</button></div><div class="msg" id="kit_msg" aria-live="polite"></div></div>'+
    '<div class="kstep"><button type="button" class="btn" id="kit_next" data-action="kit-next"></button><p id="kit_stepmsg"></p></div>'+
    '<div class="dlg-actions"><button type="button" class="btn secondary small" data-action="kit-copy-all">Copy all in one block</button><span class="spacer"></span><button type="button" class="btn" data-action="close-kit">Done</button></div></div>';
  if(!d.open)d.showModal();
  updateKitCount(); kitStepLabel(false);
}

function kitKeys(){return $all('#kitDlg .kfield[data-k]').map(function(e){return e.getAttribute('data-k')}).filter(function(k){var t=$('#kit_'+k);return t&&t.value.trim()})}
function kitLabelFor(k){var b=$('#kitDlg .kfield[data-k="'+k+'"] .khead b');return b?b.textContent.toLowerCase():k}
function kitStepLabel(justCopied){
  var keys=kitKeys(), b=$('#kit_next'), m=$('#kit_stepmsg'); if(!b)return;
  if(!keys.length){b.textContent='Nothing to copy yet';b.disabled=true;m.textContent='Add details to the item first.';return}
  b.disabled=false;
  if(kitStep>=keys.length){b.textContent='All copied ✓  Start over';m.textContent='Every part is copied. Tap to go through them again.';return}
  b.textContent=(kitStep===0?'Copy ':'Next: copy ')+kitLabelFor(keys[kitStep])+' →';
  if(!justCopied)m.textContent='Tap it, paste into the platform, then come back and tap again for the next part.';
}
function kitNext(){
  var keys=kitKeys(); if(!keys.length)return;
  if(kitStep>=keys.length)kitStep=0;
  var k=keys[kitStep], ta=$('#kit_'+k), m=$('#kit_stepmsg');
  copyText(ta.value).then(function(){
    $all('.kfield.cur').forEach(function(x){x.classList.remove('cur')});
    var f=$('.kfield[data-k="'+k+'"]'); if(f){f.classList.add('cur');try{f.scrollIntoView({block:'nearest',behavior:'smooth'})}catch(e){}}
    kitStep++; kitStepLabel(true); m.textContent='Copied '+kitLabelFor(k)+' ✓  Paste it, then come back.';
  },function(){m.textContent='Couldn’t copy. Press and hold the text in the box to copy it.'});
}

function updateKitCount(){var c=$('#kit_count'),t=$('#kit_title');if(!c||!t)return;var n=t.value.length;c.textContent=n+' of 80 characters (eBay titles stop at 80)';c.className='kcount'+(n>80?' bad':'');if(n>80)c.style.fontWeight='700';else c.style.fontWeight=''}
function kitAll(){var out=[],short=[];$all('#kitDlg .kfield[data-k]').forEach(function(e){var k=e.getAttribute('data-k'),v=($('#kit_'+k)||{}).value||'';if(!v.trim())return;if(k==='title'||k==='desc')out.push(v);else short.push(kitLabelFor(k).replace(/^./,function(c){return c.toUpperCase()})+': '+v)});if(short.length)out.push(short.join('\n'));return out.join('\n\n')}
function flashBtn(b,txt){var o=b.textContent;b.textContent=txt;setTimeout(function(){b.textContent=o},1400)}
function kitCopy(text,btn){copyText(text).then(function(){flashBtn(btn,'Copied ✓')},function(){toast('Couldn’t copy. Press and hold the text to copy it.')})}
function sharePhoto(it){
  var src=photoSrc(it); if(!src)return;
  fetch(src).then(function(r){return r.blob()}).then(function(b){
    var file=new File([b],(it.title||'photo').replace(/[^a-z0-9]+/gi,'-')+'.jpg',{type:b.type||'image/jpeg'});
    if(navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],title:it.title}).catch(function(){});
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500);toast('Photo saved to your downloads.');
  }).catch(function(){toast('Couldn’t get that photo.')});
}
function kitAdvance(it,extra){
  var prev=kitPlat, nx='';
  for(var i=1;i<=KIT_PLATS.length;i++){var k=KIT_PLATS[(KIT_PLATS.indexOf(prev)+i)%KIT_PLATS.length];if(k!==prev&&posted(it).indexOf(k)<0){nx=k;break}}
  if(nx){openKit(kitId,nx);toast('Posted on '+platName(prev)+' ✓. Next: '+platName(nx)+'.'+(extra?' '+extra:''))}
  else{openKit(kitId,prev);var m=$('#kit_msg');if(m){m.className='msg';m.textContent='Posted on every platform ✓'}toast('Posted on every platform ✓')}
}
function kitMarkPosted(){var it=findItem(kitId);if(!it)return;it.postedOn=it.postedOn||{};it.postedOn[kitPlat]=true;save();render();kitAdvance(it)}
function kitSaveLink(){
  var it=findItem(kitId); if(!it)return; var v=$('#kit_link').value.trim(), m=$('#kit_msg');
  if(!v){m.className='msg bad';m.textContent='Paste the listing link first.';return}
  var r=checkLink(kitPlat,v);
  if(!r.ok){m.className='msg bad';m.textContent=r.msg;return}
  it.links=it.links||{}; it.links[kitPlat]=v; save(); render(); kitAdvance(it,r.warn);
}
