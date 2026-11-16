/* Raylos'Clo: Storage, constants, helpers, state, photos, item logic, routing */
'use strict';
var IMG={rack:'assets/rack.png',hanger:'assets/icon-hanger.png',coat:'assets/icon-coat.png',shirt:'assets/icon-shirt.png'};

var MOCK=/*__MOCK__*/false;
/* ---------- storage ---------- */
var PFX=MOCK?'mock_':'';
var DATA_KEY='rc_data', IDB_NAME=MOCK?'raylosclo_mock':'raylosclo';
var CLOUD={on:false,url:'',key:'',sess:null,uid:'',email:'',ver:0,dirty:false,busy:false,again:false,applying:false,retry:null,refreshing:null,mode:'login',blocked:'',lastSync:0,upping:{}};
var store={
  get:function(k){try{return window.localStorage.getItem(PFX+k)}catch(e){return null}},
  set:function(k,v){try{window.localStorage.setItem(PFX+k,v)}catch(e){}},
  del:function(k){try{window.localStorage.removeItem(PFX+k)}catch(e){}}
};

/* ---------- constants ---------- */
var PLATFORMS=[
  {key:'depop',name:'Depop',domain:'depop.com',color:'var(--plum)'},
  {key:'vinted',name:'Vinted',domain:'vinted.com',color:'var(--olive)'},
  {key:'poshmark',name:'Poshmark',domain:'poshmark.com',color:'var(--fawn)'},
  {key:'ebay',name:'eBay',domain:'ebay.com',color:'var(--lilac)'}
];
/* Built-in apps. Apps the user adds (Settings → state.settings.apps) are added after these by syncApps(). */
var BASE_PLATFORMS=PLATFORMS.slice();
var APP_COLORS=['var(--sage)','var(--fawn)','var(--plum)','var(--olive)','var(--lilac)'];
/* Older items may still mention Instagram; keep its name for those, but it's no longer offered. */
var OLD_PLAT={instagram:{key:'instagram',name:'Instagram',domain:'instagram.com',color:'var(--sage)',old:true}};
var PLAT={}; PLATFORMS.forEach(function(p){PLAT[p.key]=p});
var WALLET_KEYS=['depop','vinted','poshmark','ebay'];
/* Rebuild the app lists in place, so every tab sees the user's own apps too. */
function syncApps(settings){
  var apps=(settings&&Array.isArray(settings.apps))?settings.apps:[];
  PLATFORMS.length=0; BASE_PLATFORMS.forEach(function(p){PLATFORMS.push(p)});
  apps.forEach(function(a,i){if(a&&a.key&&a.name)PLATFORMS.push({key:String(a.key),name:cleanAppName(a.name),domain:'',color:APP_COLORS[i%APP_COLORS.length],custom:true})});
  Object.keys(PLAT).forEach(function(k){delete PLAT[k]});
  Object.keys(OLD_PLAT).forEach(function(k){PLAT[k]=OLD_PLAT[k]});
  PLATFORMS.forEach(function(p){PLAT[p.key]=p});
  WALLET_KEYS.length=0; PLATFORMS.forEach(function(p){WALLET_KEYS.push(p.key)});
}
/* App names show up all over the page, so keep them to plain text */
function cleanAppName(s){return String(s||'').replace(/[<>"&`]/g,'').replace(/\s+/g,' ').trim().slice(0,30)}
function appKey(name){
  var base='app_'+(String(name).toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24)||'x'), k=base, n=2;
  while(PLAT[k]&&!PLAT[k].old)k=base+(n++);
  return k;
}
/* "Where I got it": the user's own list, plus any place already saved on an item. */
function sourceList(){
  var seen={},out=[];
  function add(s){s=String(s||'').trim();var k=s.toLowerCase();if(s&&!seen[k]){seen[k]=1;out.push(s)}}
  (state.settings.sources||[]).forEach(add);
  state.items.forEach(function(i){add(i.source)});
  return out;
}
var CATEGORIES=['Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Hats','Jewelry','Accessories','Other'];
var SOURCES=['My closet','3Fifteen','Wescott Thrift','Goodwill Outlet','Facebook Marketplace','Other']; /* only used by the mock/sample data now */
var VIEWS=['dashboard','items','sold-shipping','money','notifications','settings'];
var TITLES={'dashboard':'Dashboard','items':'Items','sold-shipping':'Sold & Shipping','money':'Money','notifications':'Notifications','settings':'Settings'};

/* ---------- helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $all(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0}
function money(n){n=num(n);return (n<0?'-':'')+'$'+Math.abs(n).toFixed(2)}
function pad(n){return (n<10?'0':'')+n}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function isoDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function today(){return isoDate(new Date())}
function daysAgo(n){var d=new Date();d.setDate(d.getDate()-n);return isoDate(d)}
function fmtDate(iso){if(!iso)return '';var p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function thisMonth(iso){return !!iso&&iso.slice(0,7)===today().slice(0,7)}
function daysBetween(iso){var p=iso.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]);return Math.max(0,Math.round((new Date()-d)/86400000))}
function platName(k){return k==='direct'?'Direct':(PLAT[k]?PLAT[k].name:esc(k))}
function plural(n,w){return n+' '+w+(n===1?'':'s')}

/* ---------- state ---------- */
function blank(){var b={items:[],notes:[],tasks:[],templates:[],gmail:{clientId:'',query:'',done:[],auto:false},money:{wallet:{},pending:{},direct:0,adjust:{}},settings:{name:'',fees:{},hold:{},sources:[],apps:[]}};syncApps(b.settings);return b}
function normalize(d){
  var b=blank(); d=d||{};
  b.items=Array.isArray(d.items)?d.items:[]; b.notes=Array.isArray(d.notes)?d.notes:[]; b.tasks=Array.isArray(d.tasks)?d.tasks:[];
  if(d.money){b.money.wallet=d.money.wallet||{};b.money.pending=d.money.pending||{};b.money.direct=num(d.money.direct);b.money.adjust=d.money.adjust||{}}
  if(d.settings){b.settings.name=d.settings.name||'';b.settings.fees=d.settings.fees||{};b.settings.hold=d.settings.hold||{};b.settings.sources=Array.isArray(d.settings.sources)?d.settings.sources:[];b.settings.apps=Array.isArray(d.settings.apps)?d.settings.apps:[]}
  if(d.gmail){b.gmail.clientId=d.gmail.clientId||'';b.gmail.query=d.gmail.query||'';b.gmail.done=Array.isArray(d.gmail.done)?d.gmail.done:[];b.gmail.auto=!!d.gmail.auto}
  b.templates=(Array.isArray(d.templates)&&d.templates.length)?d.templates:defaultTemplates();
  syncApps(b.settings);
  return b;
}
function defaultTemplates(){return [
  {id:'tp1',name:'Still available',text:'Hi {buyer}! Yes, the {item} is still available.'},
  {id:'tp2',name:'Offer accepted',text:'Hi {buyer}, I accept your offer on the {item}. You can check out whenever you’re ready. Thank you!'},
  {id:'tp3',name:'Counter offer',text:'Hi {buyer}, thanks for the offer on the {item}. The lowest I can do is $___. Let me know!'},
  {id:'tp4',name:'Shipped with tracking',text:'Hi {buyer}, your {item} is on its way! Tracking number: {tracking}. Thank you so much!'},
  {id:'tp5',name:'Thanks + review',text:'Hi {buyer}, thanks for buying the {item}! If you love it, a review would mean a lot to me. — {name}'},
  {id:'tp6',name:'Bundle',text:'Hi {buyer}, I can bundle the {item} with other things from my shop for a discount. Tell me which ones you like!'},
  {id:'tp7',name:'Shipping soon',text:'Hi {buyer}, thank you for buying the {item}! I’ll ship it soon and send the tracking number as soon as it’s on the way.'}
]}
function tpls(){if(!state.templates||!state.templates.length)state.templates=defaultTemplates();return state.templates}
function load(){var raw=store.get(DATA_KEY);if(raw){try{return normalize(JSON.parse(raw))}catch(e){}}return blank()}
var state=load();
/* mock seed moved to js/start.js (it needs mockData from js/mock.js) */
function save(){store.set(DATA_KEY,JSON.stringify(state));cloudDirty()}
var ui={itemQ:'',itemFilter:'all',itemView:'board',soldTab:'toship',noteFilter:'all',moneyPeriod:'month'};


/* ---------- photos (saved in this browser with IndexedDB) ---------- */
var MOCKPHOTOS=/*__MOCKPHOTOS__*/{};
var PH={}, idbRef=null, toastTimer=null;
function toast(msg){var t=$('#toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true},4500)}
function idb(){return new Promise(function(res,rej){
  if(idbRef)return res(idbRef); if(!window.indexedDB)return rej(new Error('no idb'));
  var r=indexedDB.open(IDB_NAME,1);
  r.onupgradeneeded=function(){r.result.createObjectStore('photos')};
  r.onsuccess=function(){idbRef=r.result;res(idbRef)}; r.onerror=function(){rej(r.error)};
})}
function tx(mode,fn){return idb().then(function(d){return new Promise(function(res,rej){var t=d.transaction('photos',mode),out=fn(t.objectStore('photos'));t.oncomplete=function(){res(out&&out.result)};t.onerror=function(){rej(t.error)};t.onabort=function(){rej(t.error)}})})}
function photoPutLocal(id,blob){return tx('readwrite',function(s){return s.put(blob,id)})}
function photoDelLocal(id){return tx('readwrite',function(s){return s.delete(id)})}
function photoGetLocal(id){return tx('readonly',function(s){return s.get(id)})}
/* An item's cover photo is saved under the item's id. Extra photos are saved under "<item id>_<random>" and listed in it.photos=[{k:key,c:cloudFlag}]. */
var photoMoving=0; // >0 while the item form is moving photos between keys
function photoOwner(k){var it=findItem(k);if(it)return {it:it,e:null};for(var i=0;i<state.items.length;i++){var x=state.items[i],l=x.photos||[];for(var j=0;j<l.length;j++)if(l[j].k===k)return {it:x,e:l[j]}}return null}
function cloudFlag(k){var o=photoOwner(k);return o?(o.e?o.e.c:o.it.photoCloud):undefined}
function setCloudFlag(k,v){var o=photoOwner(k);if(!o)return;var t=o.e||o.it,f=o.e?'c':'photoCloud';if(v===undefined)delete t[f];else t[f]=v}
function extraKeys(it){return (it.photos||[]).map(function(p){return p.k})}
function photoSrcs(it){var a=[],s=photoSrc(it);if(s)a.push(s);extraKeys(it).forEach(function(k){if(PH[k])a.push(PH[k])});return a}
function photoPut(id,blob){return photoPutLocal(id,blob).then(function(r){if(CLOUD.on&&CLOUD.uid){setCloudFlag(id,undefined);cloudPhotoUp(id,blob)}return r})}
function photoDel(id){return photoDelLocal(id).then(function(r){cloudPhotoDel(id);return r})}
function photosClear(){Object.keys(PH).forEach(clearPhoto);return tx('readwrite',function(s){return s.clear()}).catch(function(){})}
function photoAll(){return idb().then(function(d){return new Promise(function(res,rej){var out={},c=d.transaction('photos','readonly').objectStore('photos').openCursor();c.onsuccess=function(){var cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else res(out)};c.onerror=function(){rej(c.error)}})})}
function setPhoto(id,blob){clearPhoto(id);PH[id]=URL.createObjectURL(blob)}
function clearPhoto(id){if(PH[id]){try{URL.revokeObjectURL(PH[id])}catch(e){}delete PH[id]}}
function photoSrc(it){return PH[it.id]||(it.photoRef&&MOCKPHOTOS[it.photoRef])||''}
function thumb(i,cls){var s=photoSrc(i);return s?'<img class="th '+(cls||'')+'" src="'+s+'" alt="" draggable="false">':'<img class="th sk '+(cls||'')+'" src="'+IMG[i.category==='Tops'?'shirt':(i.category==='Outerwear'?'coat':'hanger')]+'" alt="" draggable="false">'}
var IMG_EXT=/\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|tiff?)$/i;
function isImageFile(f){return !!f&&(/^image\//.test(f.type||'')||IMG_EXT.test(f.name||''))}
function looksHeic(f){return /^image\/hei[cf]/i.test(f.type||'')||/\.hei[cf]$/i.test(f.name||'')}
function sniffHeic(f){
  try{return f.slice(0,32).arrayBuffer().then(function(buf){var a=new Uint8Array(buf),t='';for(var i=4;i<12&&i<a.length;i++)t+=String.fromCharCode(a[i]);return t.slice(0,4)==='ftyp'&&/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(t.slice(4,8))}).catch(function(){return false})}catch(e){return Promise.resolve(false)}
}
var heicLib=null;
function loadHeicLib(){
  if(window.heic2any)return Promise.resolve(window.heic2any);
  if(heicLib)return heicLib;
  heicLib=new Promise(function(res,rej){var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';sc.async=true;
    sc.onload=function(){window.heic2any?res(window.heic2any):rej(new Error('lib'))};sc.onerror=function(){heicLib=null;rej(new Error('net'))};document.head.appendChild(sc)});
  return heicLib;
}
function heicToJpeg(file){return loadHeicLib().then(function(h){return h({blob:file,toType:'image/jpeg',quality:0.9})}).then(function(r){return Array.isArray(r)?r[0]:r})}
function decodeViaImg(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),img=new Image();
    function fail(e){URL.revokeObjectURL(url);rej(e)}
    img.onload=function(){
      var go=function(){var w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)return fail(new Error('size'));res({src:img,w:w,h:h,done:function(){URL.revokeObjectURL(url)}})};
      if(img.decode){img.decode().then(go,go)}else go();
    };
    img.onerror=function(){fail(new Error('load'))};
    img.src=url;
  });
}
function decodeViaBitmap(file){
  if(!window.createImageBitmap)return Promise.reject(new Error('skip'));
  return createImageBitmap(file,{imageOrientation:'from-image'}).catch(function(){return createImageBitmap(file)}).then(function(bm){return {src:bm,w:bm.width,h:bm.height,done:function(){try{bm.close()}catch(e){}}}});
}
function withTimeout(p,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error('timeout'))},ms);p.then(function(v){clearTimeout(t);res(v)},function(e){clearTimeout(t);rej(e)})})}
function drawSmall(d,max){
  var k=Math.min(1,max/Math.max(d.w,d.h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(d.w*k));c.height=Math.max(1,Math.round(d.h*k));
  var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(d.src,0,0,c.width,c.height);
  var blank=false;
  try{var t=document.createElement('canvas');t.width=24;t.height=24;var tg=t.getContext('2d');tg.drawImage(c,0,0,24,24);var px=tg.getImageData(0,0,24,24).data,lit=0;for(var i=0;i<px.length;i+=4){if(px[i]<248||px[i+1]<248||px[i+2]<248){lit++;break}}blank=!lit}catch(e){}
  return {canvas:c,blank:blank};
}
function resizeImage(file,max,status){
  status=status||function(){};
  var lastErr=null, sawBlank=false;
  var tries=[
    function(){return decodeViaImg(file)},
    function(){return decodeViaBitmap(file)},
    function(){return (looksHeic(file)?Promise.resolve(true):sniffHeic(file)).then(function(isH){
      if(!isH)throw new Error('skip'); status('Converting your iPhone photo…');
      return withTimeout(heicToJpeg(file),90000).then(function(j){return decodeViaImg(j).catch(function(){return decodeViaBitmap(j)})});
    })}
  ];
  function attempt(i){
    if(i>=tries.length)return Promise.reject(lastErr||new Error(sawBlank?'blank':'load'));
    return withTimeout(tries[i](),i===2?95000:30000).then(function(d){
      var r=drawSmall(d,max); d.done();
      if(r.blank){sawBlank=true;lastErr=new Error('blank');return attempt(i+1)}
      return new Promise(function(res,rej){r.canvas.toBlob(function(bl){bl?res(bl):rej(new Error('blob'))},'image/jpeg',0.82)});
    },function(err){if(!err||err.message!=='skip')lastErr=err;return attempt(i+1)});
  }
  return attempt(0);
}
function describeFile(f){if(!f)return '';var mb=f.size?(f.size/1048576).toFixed(1)+' MB':'';var ty=(f.type||(f.name&&/\.([a-z0-9]+)$/i.exec(f.name)||[])[1]||'unknown type').replace(/^image\//,'').toUpperCase();return ty+(mb?', '+mb:'')}
function photoErr(err,file){
  var d=file?' ('+describeFile(file)+')':'';
  if(err&&err.message==='timeout')return 'That picture'+d+' took too long to read. Try a smaller one, or export it as a JPEG first.';
  if(err&&err.message==='net')return 'Couldn’t convert that HEIC photo'+d+'. It needs the internet the first time. Check your connection and try again.';
  if(err&&err.message==='blank')return 'That picture'+d+' came out blank in this browser. In Photos, choose File, then Export, then Export 1 Photo, pick JPEG, and add that file instead.';
  return 'Couldn’t read that picture'+d+'. In Photos, choose File, then Export, then Export 1 Photo, pick JPEG, and add that file instead.';
}
function blobToDataUrl(b){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(r.error)};r.readAsDataURL(b)})}

/* ---------- item logic ---------- */
function posted(it){return PLATFORMS.filter(function(p){return (it.links&&it.links[p.key])||(it.postedOn&&it.postedOn[p.key])}).map(function(p){return p.key})}
function pendingDelist(it){
  if(!it.sale)return [];
  return posted(it).filter(function(k){return k!==it.sale.platform&&!(it.sale.delisted&&it.sale.delisted[k])});
}
function feeFor(k,price){return num(price)*num(state.settings.fees[k])/100}
function profitOf(it){var s=it.sale;if(!s)return 0;return num(s.price)-num(it.cost)-feeFor(s.platform,s.price)-num(s.shipCost)}
function iconFor(cat){return cat==='Tops'?'shirt':(cat==='Outerwear'?'coat':'hanger')}
function itemStatus(it){return it.sale?'Sold':(posted(it).length?'Listed':'Not posted')}
function saleLabel(it){
  var s=it.sale; if(!s)return '';
  if(s.shipStatus==='to_ship')return 'To ship';
  if(pendingDelist(it).length)return 'Delist now';
  if(s.shipStatus==='shipped')return 'Shipped';
  if(s.shipStatus==='delivered')return 'Delivered';
  return 'Handed off';
}
var DOT={'To ship':'var(--lilac)','Shipped':'var(--sage)','Delist now':'var(--fawn)','Delivered':'var(--olive)','Handed off':'var(--olive)'};
function netOf(it){var x=it.sale;return num(x.price)-feeFor(x.platform,x.price)-num(x.shipCost)}
function moneyState(it){
  var x=it.sale; if(!x)return null; if(x.paid)return 'paid';
  if(x.platform==='direct')return 'direct';
  if(x.shipStatus==='delivered'||x.shipStatus==='na'){
    var d=x.deliveredDate||x.shippedDate||x.date, hold=num((state.settings.hold||{})[x.platform]);
    return (!d||daysBetween(d)>=hold)?'wallet':'pending';
  }
  return 'pending';
}
function collectBreakdown(){
  var r={wallet:0,pending:0,direct:0,by:{},rows:[],total:0};
  state.items.forEach(function(it){
    if(!it.sale)return; var st=moneyState(it); if(st==='paid')return;
    var n=netOf(it); r[st]+=n; var k=it.sale.platform;
    var o=r.by[k]=r.by[k]||{wallet:0,pending:0,direct:0}; o[st]+=n; r.rows.push({item:it,state:st,net:n});
  });
  var adj=state.money.adjust||{};
  Object.keys(adj).forEach(function(k){var v=num(adj[k]);if(!v)return;var o=r.by[k]=r.by[k]||{wallet:0,pending:0,direct:0};o.wallet+=v;r.wallet+=v});
  r.total=r.wallet+r.pending+r.direct; return r;
}
function collectTotal(){return collectBreakdown().total}
function findItem(id){return state.items.filter(function(i){return i.id===id})[0]}

/* ---------- views / routing ---------- */
var loginEl=$('#login'), appEl=$('#app');
function currentView(){var v=(location.hash||'').replace('#','');return VIEWS.indexOf(v)>=0?v:'dashboard'}
var lastView=null;
function show(view){
  if(view==='items'&&lastView!=='items'){ui.itemQ='';ui.itemFilter='all'}
  lastView=view;
  $all('[data-panel]').forEach(function(s){s.hidden=(s.getAttribute('data-panel')!==view)});
  $all('.nav button').forEach(function(b){
    if(b.getAttribute('data-view')===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  document.title=TITLES[view]+' · Raylos’Clo';
  render(view);
  window.scrollTo(0,0);
}
function render(view){
  view=view||currentView();
  try{({'dashboard':renderDashboard,'items':renderItems,'sold-shipping':renderSold,'money':renderMoney,'notifications':renderNotes,'settings':renderSettings})[view]()}catch(err){try{console.error(err)}catch(x){}toast('Something went wrong drawing this page ('+(err&&err.message?err.message:'error')+'). Your items are saved. Reload the page and try again.')}
  try{updateBadges()}catch(e){}
  var who=state.settings.name||store.get('rc_user')||'';
  $('#who').textContent=who;
}
function go(view,tab){if(tab)ui.soldTab=tab;if(location.hash==='#'+view)show(view);else location.hash=view}

/* ---------- shared bits ---------- */
function statusCell(label){return '<span class="status"><span class="dot" style="background:'+(DOT[label]||'var(--white)')+'"></span>'+esc(label)+'</span>'}
function barRow(name,val,max,color,right){
  var w=max>0?Math.max(0,Math.min(100,Math.round(val/max*100))):0;
  return '<div class="bar-row"><div class="meta"><span>'+esc(name)+'</span><span>'+right+'</span></div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+color+'"></div></div></div>';
}
function emptyCard(msg,sub,btns){
  return '<div class="card empty" style="--accent:var(--lilac)"><img src="'+IMG.rack+'" alt=""><p>'+msg+'</p>'+(sub?'<p class="small">'+sub+'</p>':'')+(btns?'<div class="btnrow">'+btns+'</div>':'')+'</div>';
}
function hasSample(){return state.items.some(function(i){return i.sample})||state.notes.some(function(n){return n.sample})}
