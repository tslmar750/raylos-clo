/* Raylos'Clo: Settings tab */
'use strict';
/* ================= SETTINGS ================= */
function isStandalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}
function homeScreenCard(){
  if(isStandalone())return '';
  return '<div class="card hs-card" style="--accent:var(--olive)"><h2>Put it on your home screen</h2><p style="margin:0 0 8px;font-size:16px">Open Raylos’Clo like an app, full screen, with the cat icon.</p>'+
    '<ol class="hs-steps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow pointing up).</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open it from your home screen and log in once.</li></ol>'+
    '<p style="margin:6px 0 0;font-size:14px">On Android: Chrome menu (⋮), then <b>Add to Home screen</b>.</p></div>';
}
function renderSettings(){
  var p=$('[data-panel="settings"]');
  p.innerHTML='<div class="top"><h1>Settings</h1></div>'+(MOCK?'<div class="card" style="--accent:var(--plum)"><h2>Mock version</h2><p style="margin:0 0 6px">Everything here is made up so you can see what the site looks like in real use. You can click around and change things. It’s saved separately from your real site.</p><div class="btnrow2"><button class="btn" data-action="mock-reset">Reset to the original fake data</button></div></div>':'')+
    '<div class="settings-grid">'+homeScreenCard()+'<div class="card" style="--accent:var(--sage)"><h2>About you</h2><div class="ff"><label for="set_name">Your name</label><input type="text" id="set_name" maxlength="40" data-change="name" value="'+esc(state.settings.name)+'"></div></div>'+
    '<div class="card" style="--accent:var(--fawn)"><h2>Platform fees</h2><p style="margin:0 0 12px;font-size:16px">Enter each platform’s current fee as a percent of the sale price. Check each platform’s own fee page, since rates change. Leave at 0 if you don’t pay one.</p><div class="fees">'+
    PLATFORMS.map(function(pl){return '<div class="ff"><label for="fee_'+pl.key+'">'+pl.name+' (%)</label><input type="number" id="fee_'+pl.key+'" min="0" max="100" step="0.1" data-change="fee" data-key="'+pl.key+'" value="'+(state.settings.fees[pl.key]!=null?esc(state.settings.fees[pl.key]):'')+'"></div>'}).join('')+'</div></div></div>'+
    settingsExtraCards()+
    '<div class="card" style="--accent:var(--lilac)"><h2>Your data</h2><p style="margin:0 0 6px"><b>Everything, including your item photos, is saved in this browser on this device only.</b> It isn’t synced to other devices, and clearing your browser data will erase it. Download a backup now and then.</p>'+
    '<div class="btnrow2"><button class="btn" data-action="export">Download backup</button><button class="btn secondary" data-action="import">Restore from backup</button></div><div class="msg" id="dataMsg" aria-live="polite"></div></div>'+
    '<div class="card" style="--accent:var(--olive)"><h2>Sample data</h2><p style="margin:0 0 6px">Sample items and messages let you see how everything works. They’re marked “sample,” and removing them won’t touch your own items.</p><div class="btnrow2"><button class="btn secondary" data-action="load-sample">Load sample data</button><button class="btn secondary" data-action="remove-sample">Remove sample data</button></div></div>'+
    '<div class="card" style="--accent:var(--fawn)"><h2>Start over</h2><p style="margin:0 0 6px">Deletes every item, message, to-do and money amount.</p><div class="btnrow2"><button class="btn secondary" data-action="clear-all">Delete all my data</button></div></div>';
}
function gmailCardHtml(){
  var g=state.gmail, steps='<ol class="gmsteps" style="margin:8px 0 0;padding-left:20px;font-size:15px">'+
    '<li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a> and sign in with the Gmail that gets your sale emails. Create a new project (any name, like “Raylos Clo”).</li>'+
    '<li>In the menu, open <b>APIs &amp; Services</b>, then <b>Library</b>. Search for <b>Gmail API</b> and tap <b>Enable</b>.</li>'+
    '<li>Open the <b>OAuth consent screen</b> (it may be called <b>Google Auth Platform</b>). Choose <b>External</b>, fill in an app name and your email, and under <b>Test users</b> add your own Gmail address.</li>'+
    '<li>Open <b>Credentials</b>, then <b>Create credentials</b>, then <b>OAuth client ID</b>. Choose <b>Web application</b>. Under <b>Authorized JavaScript origins</b>, add your live site address exactly (like <i>https://your-site.netlify.app</i>, no slash at the end).</li>'+
    '<li>Copy the <b>Client ID</b> it gives you (a long code ending in googleusercontent.com) and paste it below.</li>'+
    '<li>Tap <b>Check Gmail</b>. Google will warn that the app isn’t verified. That’s normal for your own app: tap <b>Advanced</b>, then <b>Go to … (unsafe)</b>, and allow read-only access.</li></ol>';
  return '<div class="card" style="--accent:var(--plum)"><h2>Gmail</h2>'+
    (MOCK?'<p style="margin:0 0 10px">This is the demo. Tap <b>Check Gmail</b> to see how it works with made-up sample emails (a Vinted sale, a Depop sale, a Poshmark sale, a message, and a promo that gets skipped).</p><div class="btnrow2"><button type="button" class="btn" data-action="gm-check">Check Gmail</button></div>'
    :'<p style="margin:0 0 10px;font-size:16px">Let the site read your sale and message emails so you don’t paste them. It only <b>reads</b> (it can’t send, delete, or change anything). You tap <b>Check Gmail</b> when you open the site, and Google asks again each visit.</p>'+
      '<div class="ff"><label for="gm_client">Google Client ID</label><input type="text" id="gm_client" data-change="gm-client" placeholder="123456-abc….apps.googleusercontent.com" autocomplete="off" value="'+esc(g.clientId)+'"></div>'+
      '<div class="ff" style="margin-top:8px"><label for="gm_query">Which emails to look at (Gmail search)</label><input type="text" id="gm_query" data-change="gm-query" autocomplete="off" placeholder="newer_than:30d (from:vinted OR from:depop OR from:poshmark OR from:ebay)" value="'+esc(g.query)+'"></div>'+
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:15px"><input type="checkbox" data-change="gm-auto" id="gm_auto"'+(g.auto?' checked':'')+' style="margin-top:4px"><span>Check Gmail by itself the first time I tap anything after opening the site. (Google may flash a small sign-in window. If it doesn’t work for you, turn this off and tap Check Gmail yourself.)</span></label>'+
      '<div class="btnrow2"><button type="button" class="btn" data-action="gm-check">Check Gmail</button><button type="button" class="btn secondary" data-action="gm-disconnect">Disconnect</button></div>'+
      '<details class="more" style="margin-top:12px"'+(g.clientId?'':' open')+'><summary>How to set this up (one time)</summary>'+steps+'</details>'+
      '<p style="font-size:13px;margin:10px 0 0"><b>Privacy:</b> Google only offers “read all my mail,” not one label, so the site can see your whole inbox while connected. Everything is read inside your browser. Nothing goes to me or anyone else, and only the sales and messages you tick are saved. A separate Gmail used just for reselling is the safest choice.</p>')+
    '</div>';
}
function settingsExtraCards(){
  return accountCardHtml()+gmailCardHtml()+'<div class="card" style="--accent:var(--olive)"><h2>When money becomes available</h2><p style="margin:0 0 12px;font-size:16px">After an item is delivered, how many days until the platform lets you withdraw it? Check each platform’s own rule. Leave at 0 if it’s available right away.</p><div class="fees">'+
    WALLET_KEYS.map(function(k){return '<div class="ff"><label for="hold_'+k+'">'+platName(k)+' (days)</label><input type="number" id="hold_'+k+'" min="0" max="60" step="1" data-change="hold" data-key="'+k+'" value="'+((state.settings.hold||{})[k]!=null?esc(state.settings.hold[k]):'')+'"></div>'}).join('')+'</div></div>'+
    '<div class="card" style="--accent:var(--plum)"><h2>Reply templates</h2><p style="margin:0 0 10px;font-size:16px">Messages you use again and again. These words get filled in for you: <b>{buyer}</b> <b>{item}</b> <b>{price}</b> <b>{tracking}</b> <b>{platform}</b> <b>{name}</b>.</p>'+
    tpls().map(function(t){return '<div class="tpl"><div class="ff"><label for="tn_'+esc(t.id)+'">Name</label><input type="text" id="tn_'+esc(t.id)+'" maxlength="40" data-change="tpl-name" data-id="'+esc(t.id)+'" value="'+esc(t.name)+'"></div><div class="ff"><label for="tt_'+esc(t.id)+'">Message</label><textarea id="tt_'+esc(t.id)+'" rows="3" spellcheck="true" autocorrect="on" autocapitalize="sentences" data-change="tpl-text" data-id="'+esc(t.id)+'">'+esc(t.text)+'</textarea></div><button type="button" class="btn small secondary" data-action="tpl-del" data-id="'+esc(t.id)+'">Delete</button></div>'}).join('')+
    '<div class="btnrow2"><button type="button" class="btn secondary" data-action="tpl-add">Add a template</button><button type="button" class="btn secondary" data-action="tpl-reset">Put back the originals</button></div></div>';
}
function exportData(){
  var m=$('#dataMsg'); if(m)m.textContent='Preparing your backup…';
  photoAll().catch(function(){return {}}).then(function(map){
    var out={},keys=Object.keys(map);
    return Promise.all(keys.map(function(k){return blobToDataUrl(map[k]).then(function(u){out[k]=u})})).then(function(){return out});
  }).then(function(photos){
    var data=JSON.parse(JSON.stringify(state));data.photos=photos;
    var blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='raylosclo-backup-'+today()+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500);
    var mm=$('#dataMsg');if(mm)mm.textContent='Backup downloaded ('+plural(Object.keys(photos).length,'photo')+' included).';
  });
}
function importData(file){
  var m=$('#dataMsg'); var r=new FileReader();
  r.onload=function(){
    var d; try{d=JSON.parse(r.result); if(!d||!Array.isArray(d.items))throw new Error('bad')}catch(e){if(m)m.textContent='That file doesn’t look like a Raylos’Clo backup.';return}
    if(!window.confirm('Replace everything currently in the site with this backup?'))return;
    state=normalize(d); save();
    var photos=d.photos||{}, ids=Object.keys(photos);
    photosClear().then(function(){return Promise.all(ids.map(function(k){return fetch(photos[k]).then(function(x){return x.blob()}).then(function(b){setPhoto(k,b);return photoPut(k,b).catch(function(){})})}))}).catch(function(){}).then(function(){render();var mm=$('#dataMsg');if(mm)mm.textContent='Backup restored.'});
  };
  r.readAsText(file);
}
function loadSample(){
  if(state.items.some(function(i){return i.sample}))return;
  function L(k,slug){return 'https://www.'+PLAT[k].domain+'/'+(k==='depop'?'products/':k==='poshmark'?'listing/':k==='ebay'?'itm/':k==='vinted'?'items/':'p/')+slug+'/'}
  var t=Date.now();
  var S=[
    {title:'Wool coat, camel',category:'Outerwear',size:'M',brand:'J.Crew',source:'Wescott Thrift',cost:12,price:48,links:{depop:L('depop','sample-wool-coat')},sale:{platform:'depop',price:48,date:daysAgo(1),shipCost:0,shipStatus:'to_ship',tracking:'',shippedDate:'',packing:{clean:true},delisted:{}}},
    {title:'Denim jacket',category:'Outerwear',size:'S',brand:'Levi’s',source:'3Fifteen',cost:8,price:36,links:{depop:L('depop','sample-denim-jacket'),vinted:L('vinted','sample-denim-jacket')},sale:{platform:'depop',price:36,date:daysAgo(2),shipCost:0,shipStatus:'to_ship',tracking:'',shippedDate:'',packing:{},delisted:{}}},
    {title:'Striped button-up',category:'Tops',size:'M',brand:'',source:'3Fifteen',cost:4,price:22,links:{vinted:L('vinted','sample-striped-shirt')},sale:{platform:'vinted',price:22,date:daysAgo(5),shipCost:4.5,shipStatus:'shipped',tracking:'9400 1000 0000 0000 0000 00',shippedDate:daysAgo(4),packing:{clean:true,boxed:true,label:true},delisted:{}}},
    {title:'Green cardigan',category:'Tops',size:'L',brand:'',source:'My closet',cost:6,price:28.5,links:{vinted:L('vinted','sample-green-cardigan'),poshmark:L('poshmark','sample-green-cardigan')},sale:{platform:'vinted',price:28.5,date:daysAgo(7),shipCost:4.5,shipStatus:'delivered',tracking:'9400 2000 0000 0000 0000 00',shippedDate:daysAgo(6),packing:{clean:true,boxed:true,label:true},delisted:{}}},
    {title:'Linen shirt, white',category:'Tops',size:'M',brand:'',source:'Goodwill Outlet',cost:5,price:31,links:{poshmark:L('poshmark','sample-linen-shirt')},sale:{platform:'poshmark',price:31,date:daysAgo(12),shipCost:5,shipStatus:'delivered',tracking:'9400 3000 0000 0000 0000 00',shippedDate:daysAgo(11),packing:{clean:true,boxed:true,label:true},delisted:{}}},
    {title:'Black slip dress',category:'Dresses',size:'S',brand:'',source:'Wescott Thrift',cost:7,price:34,links:{depop:L('depop','sample-slip-dress'),vinted:L('vinted','sample-slip-dress')}},
    {title:'White sneakers',category:'Shoes',size:'8',brand:'',source:'My closet',cost:0,price:40,links:{depop:L('depop','sample-sneakers')}},
    {title:'Leather shoulder bag',category:'Bags',size:'',brand:'',source:'3Fifteen',cost:9,price:45,links:{ebay:L('ebay','sample-leather-bag')}},
    {title:'Corduroy pants',category:'Bottoms',size:'28',brand:'',source:'Facebook Marketplace',cost:6,price:30,links:{}}
  ];
  function done(title,cat,src,cost,price,plat,ago,ship,links){
    var lk=links||{};lk[plat]=lk[plat]||(plat==='direct'?undefined:L(plat,'sample-'+title.toLowerCase().replace(/[^a-z]+/g,'-')));if(!lk[plat])delete lk[plat];
    return {title:title,category:cat,size:'M',brand:'',source:src,cost:cost,price:price,links:lk,sale:{platform:plat,price:price,date:daysAgo(ago),shipCost:ship,shipStatus:plat==='direct'?'na':'delivered',tracking:plat==='direct'?'':'9400 0000 0000 0000 0000 00',shippedDate:daysAgo(ago-1),packing:{clean:true,boxed:true,label:true},delisted:{}}};
  }
  [done('Plaid flannel','Tops','3Fifteen',5,24,'depop',34,4.5),done('Vintage windbreaker','Outerwear','Wescott Thrift',9,52,'ebay',47,7),done('Mom jeans','Bottoms','Goodwill Outlet',4,32,'depop',63,5),
   done('Silk scarf','Accessories','My closet',0,18,'vinted',78,3.5),done('Pleated skirt','Bottoms','3Fifteen',6,29,'poshmark',97,5),done('Canvas tote','Bags','Facebook Marketplace',3,22,'direct',128,0),
   done('Knit sweater','Tops','Wescott Thrift',7,38,'depop',140,5)].forEach(function(x){S.push(x)});
  S.forEach(function(s,i){s.id=uid()+i;s.created=t-i*1000;s.sample=true;s.notes='Sample item';state.items.push(s)});
  state.notes.push({id:uid()+'a',platform:'depop',from:'sample_buyer',text:'Offered $30 for the black slip dress.',date:today(),ts:t,starred:true,responded:false,sample:true},
    {id:uid()+'b',platform:'vinted',from:'sample_user22',text:'Is the cardigan still available?',date:daysAgo(1),ts:t-1000,starred:false,responded:true,sample:true},
    {id:uid()+'c',platform:'poshmark',from:'sample_closet',text:'Can you do $25 for the leather bag?',date:daysAgo(2),ts:t-2000,starred:false,responded:false,sample:true});
  var m=state.money; if(!WALLET_KEYS.some(function(k){return num(m.wallet[k])||num(m.pending[k])})&&!num(m.direct)){m.wallet.depop=64;m.pending.vinted=38.5;m.pending.depop=84;m.direct=20}
  save(); render();
}
function removeSample(){state.items=state.items.filter(function(i){return !i.sample});state.notes=state.notes.filter(function(n){return !n.sample});save();render()}
