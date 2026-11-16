(function(){
  'use strict';
  var IMG={rack:'assets/img/rack.png',hanger:'assets/img/hanger.png',coat:'assets/img/coat.png',shirt:'assets/img/shirt.png'};

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
    {key:'ebay',name:'eBay',domain:'ebay.com',color:'var(--lilac)'},
    {key:'instagram',name:'Instagram',domain:'instagram.com',color:'var(--sage)'}
  ];
  var PLAT={}; PLATFORMS.forEach(function(p){PLAT[p.key]=p});
  var WALLET_KEYS=['depop','vinted','poshmark','ebay'];
  var CATEGORIES=['Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Hats','Jewelry','Accessories','Other'];
  var SOURCES=['My closet','3Fifteen','Wescott Thrift','Goodwill Outlet','Facebook Marketplace','Other'];
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
  function blank(){return {items:[],notes:[],tasks:[],templates:[],gmail:{clientId:'',query:'',done:[],auto:false},money:{wallet:{},pending:{},direct:0,adjust:{}},settings:{name:'',fees:{},hold:{}}}}
  function normalize(d){
    var b=blank(); d=d||{};
    b.items=Array.isArray(d.items)?d.items:[]; b.notes=Array.isArray(d.notes)?d.notes:[]; b.tasks=Array.isArray(d.tasks)?d.tasks:[];
    if(d.money){b.money.wallet=d.money.wallet||{};b.money.pending=d.money.pending||{};b.money.direct=num(d.money.direct);b.money.adjust=d.money.adjust||{}}
    if(d.settings){b.settings.name=d.settings.name||'';b.settings.fees=d.settings.fees||{};b.settings.hold=d.settings.hold||{}}
    if(d.gmail){b.gmail.clientId=d.gmail.clientId||'';b.gmail.query=d.gmail.query||'';b.gmail.done=Array.isArray(d.gmail.done)?d.gmail.done:[];b.gmail.auto=!!d.gmail.auto}
    b.templates=(Array.isArray(d.templates)&&d.templates.length)?d.templates:defaultTemplates();
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
  if(MOCK&&!store.get('rc_data')){state=mockData();save()}
  function save(){store.set(DATA_KEY,JSON.stringify(state));cloudDirty()}
  var ui={itemQ:'',itemFilter:'all',itemView:'board',soldTab:'toship',noteFilter:'all',moneyPeriod:'month'};


  /* ---------- photos (saved in this browser with IndexedDB) ---------- */
  var MOCKPHOTOS=/*__MOCKPHOTOS__*/{};
  var PH={}, idbRef=null, toastTimer=null;
  function celebrate(){
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    var box=document.createElement('div'),cols=['var(--plum)','var(--olive)','var(--fawn)','var(--lilac)','var(--sage)'];box.className='confetti';box.setAttribute('aria-hidden','true');
    for(var i=0;i<28;i++){var c=document.createElement('i');c.style.cssText='left:'+(20+Math.random()*60).toFixed(1)+'%;background:'+cols[i%cols.length]+';--x:'+(Math.random()*2-1).toFixed(2)+';--r:'+Math.round(Math.random()*720-360)+'deg;--d:'+(Math.random()*.3).toFixed(2)+'s';box.appendChild(c)}
    document.body.appendChild(box);setTimeout(function(){box.remove()},2400);
  }
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
  function photoPut(id,blob){return photoPutLocal(id,blob).then(function(r){if(CLOUD.on&&CLOUD.uid){var it=findItem(id);if(it)delete it.photoCloud;cloudPhotoUp(id,blob)}return r})}
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
  var lastView=null, enterTimer=null, pendingQ=null;
  function show(view){
    if(view==='items'&&lastView!=='items'){ui.itemQ='';ui.itemFilter='all'}
    if(view==='items'&&pendingQ!==null){ui.itemQ=pendingQ;pendingQ=null}
    lastView=view;
    $all('[data-panel]').forEach(function(s){s.hidden=(s.getAttribute('data-panel')!==view)});
    $all('.nav button').forEach(function(b){
      if(b.getAttribute('data-view')===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    document.title=TITLES[view]+' · Raylos’Clo';
    render(view);
    var ma=$('#mainArea');ma.classList.remove('entering');void ma.offsetWidth;ma.classList.add('entering');clearTimeout(enterTimer);enterTimer=setTimeout(function(){ma.classList.remove('entering')},1100);
    window.scrollTo(0,0);
  }
  function render(view){
    view=view||currentView();
    try{({'dashboard':renderDashboard,'items':renderItems,'sold-shipping':renderSold,'money':renderMoney,'notifications':renderNotes,'settings':renderSettings})[view]()}catch(err){try{console.error(err)}catch(x){}toast('Something went wrong drawing this page ('+(err&&err.message?err.message:'error')+'). Your items are saved. Reload the page and try again.')}
    try{updateBadges()}catch(e){}
    var who=state.settings.name||store.get('rc_user')||'';
    $('#who').textContent=who;
    $('#avatar').textContent=(who.charAt(0)||'?').toUpperCase();
  }
  function go(view,tab){if(tab)ui.soldTab=tab;if(location.hash==='#'+view)show(view);else location.hash=view}

  /* ---------- shared bits ---------- */
  function statusCell(label){return '<span class="status"><span class="dot" style="background:'+(DOT[label]||'var(--white)')+'"></span>'+esc(label)+'</span>'}
  function barRow(name,val,max,color,right){
    var w=max>0?Math.max(0,Math.min(100,Math.round(val/max*100))):0;
    return '<div class="bar-row"><div class="meta"><span>'+esc(name)+'</span><span>'+right+'</span></div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+color+'"></div></div></div>';
  }
  function dlgX(action){return '<button type="button" class="dlg-x" data-action="'+action+'" aria-label="Close">&times;</button>'}
  function emptyCard(msg,sub,btns){
    return '<div class="card empty" style="--accent:var(--lilac)"><img src="'+IMG.rack+'" alt=""><p>'+msg+'</p>'+(sub?'<p class="small">'+sub+'</p>':'')+(btns?'<div class="btnrow">'+btns+'</div>':'')+'</div>';
  }
  function hasSample(){return state.items.some(function(i){return i.sample})||state.notes.some(function(n){return n.sample})}

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
    var soldAll=items.filter(function(i){return i.sale}), shipNeed=soldAll.filter(function(i){return i.sale.shipStatus!=='na'}), shippedN=shipNeed.filter(function(i){return i.sale.shipStatus!=='to_ship'}).length;
    function ring(label,pct,hint,color){var has=pct!=null,v=has?Math.max(0,Math.min(100,pct)):0;return '<div class="ring" style="--rc:'+color+'"><span class="chip">'+label+'</span><div class="rwrap"><svg viewBox="0 0 100 100" role="img" aria-label="'+esc(label+': '+(has?Math.round(pct)+'%':'nothing yet'))+'"><circle class="rt" cx="50" cy="50" r="40"/><circle class="rv" cx="50" cy="50" r="40" pathLength="100" style="stroke-dasharray:'+v.toFixed(1)+' 100"/></svg><b aria-hidden="true">'+(has?Math.round(pct)+'%':'–')+'</b></div><p>'+hint+'</p></div>'}
    var ringsTile='<div class="tile rings">'+
      ring('Profit margin',rev>0?prof/rev*100:null,rev>0?'of this month’s sales is profit':'Shows up after your first sale this month','var(--olive)')+
      ring('Sell-through',items.length?soldAll.length/items.length*100:null,plural(soldAll.length,'item')+' sold out of '+items.length,'var(--plum)')+
      ring('Shipped',shipNeed.length?shippedN/shipNeed.length*100:null,shipNeed.length?shippedN+' of '+plural(shipNeed.length,'sale')+' sent':'Nothing sold to ship yet','var(--fawn)')+'</div>';
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
    html+=attnTileHtml()+'<div class="bento'+(anim?' anim':'')+'">'+shipTile+collectTile+soldTile+chartTile+ringsTile+todayTile+rackTile+platTile+arrivalsTile+earnersTile+'</div>';
    p.innerHTML=html;
    animateCounts(p,anim);
  }
  function stat(label,val,hint,accent,count){return '<div class="card stat" style="--accent:'+accent+'"><div class="label">'+esc(label)+'</div><div class="num"'+(count!=null?' data-count="'+count+'"':'')+'>'+esc(val)+'</div><div class="hint">'+esc(hint)+'</div></div>'}

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
      '<p class="boardhint">Scroll inside a column to see more. Drag a card into To ship to mark it sold, or from To ship into Shipped. The buttons on each card do the same.</p>'+
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


  /* ================= LISTING KIT ================= */
  var kitId=null, kitPlat='depop', kitStep=0;
  var KIT_PLATS=['depop','vinted','poshmark','ebay'];
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
    d.innerHTML='<div class="dlg">'+dlgX('close-kit')+'<div class="kit-head"><div class="frame'+(src?'':' noph')+'" style="width:64px">'+(src?'<img src="'+src+'" alt="">':'<img src="'+IMG[iconFor(it.category)]+'" alt="">')+'</div><div><h2>'+esc(it.title)+'</h2><p>Listing kit: copy each part, paste it into the platform.</p></div></div>'+
      '<div class="subtabs ktabs" role="tablist">'+KIT_PLATS.map(function(k){return '<button type="button" data-action="kit-plat" data-p="'+k+'" aria-pressed="'+(kitPlat===k)+'">'+PLAT[k].name+(posted(it).indexOf(k)>=0?' ✓':'')+'</button>'}).join('')+'</div>'+
      fs.map(function(f){return (f.group?'<p class="kgroup">'+f.group+'</p>':'')+'<div class="kfield" data-k="'+f.k+'"><div class="khead"><b>'+f.label+'</b><button type="button" class="btn small secondary" data-action="kit-copy" data-k="'+f.k+'">Copy</button></div><textarea id="kit_'+f.k+'" rows="'+f.rows+'" aria-label="'+f.label+'">'+esc(f.val)+'</textarea>'+(f.k==='title'&&kitPlat==='ebay'?'<div class="kcount" id="kit_count"></div>':'')+'</div>'}).join('')+
      '<div class="kprice"><div><b>Price</b><span>'+(fs.price?money(fs.price):'Not set yet')+'</span></div><small>'+(fs.price?'You type this in on the platform, so there is nothing to copy.':'Add a price to the item first. <button type="button" class="linkbtn" data-action="edit-item" data-id="'+esc(it.id)+'">Fill it in</button>')+'</small></div>'+
      '<p class="kempty">Category, condition, color and the other dropdowns: pick those on the platform.</p>'+
      '<div class="kfield kphoto"><span>'+(src?'Photo ready':'No photo yet. Add one with Edit.')+'</span>'+(src?'<button type="button" class="btn small secondary" data-action="kit-photo">Save or share photo</button>':'')+'</div>'+
      '<div class="kopen"><a class="btn" href="'+PLAT_URL[kitPlat]+'" target="_blank" rel="noopener noreferrer">Open '+PLAT[kitPlat].name+' ↗</a><p>'+SELL_HINT[kitPlat]+'</p></div>'+
      '<div class="kopen" style="margin:6px 0"><button type="button" class="btn" data-action="kit-posted">I posted it on '+PLAT[kitPlat].name+' ✓</button><p>Tap this after you post, with or without a link. It remembers where the item is listed, so you get a delist reminder later.</p></div>'+
      '<div class="klink"><label for="kit_link"><b style="font-size:14px">After you post: paste the listing link</b></label><div class="row"><input type="text" id="kit_link" placeholder="https://'+PLAT[kitPlat].domain+'/…" value="'+esc(link)+'" autocomplete="off"><button type="button" class="btn small" data-action="kit-save-link">Save link</button></div><div class="msg" id="kit_msg" aria-live="polite"></div></div>'+
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


  /* ================= PASTE A SALE ================= */
  var STOPW={the:1,and:1,for:1,with:1,this:1,that:1,your:1,you:1,has:1,was:1,sold:1,item:1,order:1,from:1,size:1,new:1,sale:1,have:1,been:1};
  function toks(str){return (str||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).map(function(w){return w.length>3?w.replace(/s$/,''):w}).filter(function(w){return w.length>2&&!STOPW[w]})}
  function matchItems(text,pool){
    var words=toks(text);
    return pool.map(function(i){var tw=toks(i.title),hit=tw.filter(function(w){return words.indexOf(w)>=0}).length;return {item:i,score:tw.length?hit/tw.length:0}}).filter(function(x){return x.score>0}).sort(function(a,b){return b.score-a.score});
  }
  var MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  function parseDate(t){
    var m,y,mo,d,now=new Date();
    if((m=/(\d{4})-(\d{2})-(\d{2})/.exec(t))){return m[1]+'-'+m[2]+'-'+m[3]}
    if((m=/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/.exec(t))){y=+m[3];if(y<100)y+=2000;return y+'-'+pad(+m[1])+'-'+pad(+m[2])}
    if((m=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i.exec(t))){
      mo=MONTHS.indexOf(m[1].toLowerCase());d=+m[2];y=m[3]?+m[3]:now.getFullYear();
      var dt=new Date(y,mo,d); if(!m[3]&&dt>now)dt=new Date(y-1,mo,d);
      return isoDate(dt);
    }
    return '';
  }
  function guessCategory(title){
    var t=(title||'').toLowerCase(),M=[['Outerwear',/jacket|coat|blazer|windbreaker|parka|vest|fleece|puffer/],['Dresses',/dress|gown|romper|jumpsuit/],['Shoes',/shoe|sneaker|boot|loafer|sandal|heel|clog/],['Bags',/bag|tote|purse|backpack|clutch/],['Hats',/hat|cap\b|beanie|beret/],['Jewelry',/necklace|earring|ring\b|bracelet|jewel/],['Bottoms',/pants|jeans|skirt|shorts|trouser|legging/],['Tops',/shirt|tee\b|top\b|sweater|cardigan|hoodie|blouse|tank|jersey|sweatshirt|polo/],['Accessories',/scarf|belt|glove|sunglass|tie\b|watch/]];
    for(var i=0;i<M.length;i++)if(M[i][1].test(t))return M[i][0];
    return 'Other';
  }
  function parseSale(text){
    var t=text||'', low=t.toLowerCase(), res={platform:'',prices:[],price:'',date:parseDate(t),buyer:'',title:''};
    var words={depop:['depop'],vinted:['vinted'],poshmark:['poshmark','posh '],ebay:['ebay']}, best=0;
    Object.keys(words).forEach(function(k){var n=0;words[k].forEach(function(w){n+=low.split(w).length-1});if(n>best){best=n;res.platform=k}});
    var re=/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g,m,seen={};
    while((m=re.exec(t))){var v=parseFloat(m[1].replace(/,/g,'')+(m[2]?'.'+m[2]:''));if(!seen[v]&&res.prices.length<6){seen[v]=1;res.prices.push(v)}}
    var kw=/(?:sold for|item price|sale price|you(?:'|’)?ll (?:earn|receive|get)|price|total)[^$0-9]{0,30}\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/i.exec(t);
    res.price=kw?parseFloat(kw[1].replace(/,/g,'')+(kw[2]?'.'+kw[2]:'')):(res.prices[0]!=null?res.prices[0]:'');
    var clean=t.replace(/<[^>]*>/g,' ').replace(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/g,' ');
    var bm=/([A-Za-z0-9_.]{3,30})\s+(?:(?:has|just)\s+)?(?:bought|purchased|sent you|made an offer|offered)/i.exec(clean)||/(?:bought by|purchased by|sold to|buyer|order from)[:\s]+@?([A-Za-z0-9_.]{3,30})/i.exec(clean)||/(?:^|[\s(])@([A-Za-z0-9_.]{3,30})/.exec(clean);
    if(bm){var bn=bm[1].replace(/[._]+$/,'');if(bn.length>=3&&!{depop:1,vinted:1,poshmark:1,ebay:1,your:1,the:1,you:1,someone:1,buyer:1,team:1}[bn.toLowerCase()])res.buyer=bn}
    // item name: the line just above the price line, or "sold the X on ..."
    var lines=t.split(/\r?\n/).map(function(x){return x.trim()}), pi=-1;
    for(var i=0;i<lines.length;i++){if(/^(?:US)?\$\s?\d[\d,.]*$/.test(lines[i])){pi=i;break}}
    if(pi>0){for(var j=pi-1;j>=0;j--){var L=lines[j];if(!L)continue;if(L.length<=120&&!/has bought|has purchased|^hello|^hi\b|^hey\b|:$/i.test(L))res.title=L;break}}
    if(!res.title){var sm=/\bsold\s+(?:the\s+|your\s+|a\s+|an\s+)?(.{3,80}?)(?:\s+(?:on|for|to|via)\s|[.!,\n]|$)/i.exec(t);if(sm)res.title=sm[1].trim()}
    res.title=res.title.replace(/^["“']+|["”']+$/g,'');
    if(/^(?:an?\s+|the\s+|your\s+)?(?:item|items|something|anything|it|this|that|order|one)$/i.test(res.title)||res.title.length<3)res.title='';
    return res;
  }
  function openPaste(){
    var d=$('#pasteDlg');
    d.innerHTML='<div class="dlg">'+dlgX('close-paste')+'<h2>Paste a sale</h2><p style="margin:0 0 10px">Copy the sale notification or order page text from the platform, paste it here, and I’ll fill in the sale for you. You can fix anything before saving.</p>'+
      '<div class="ff"><label for="p_text">What you copied</label><textarea id="p_text" rows="6" placeholder="e.g. You sold the black slip dress on Depop for $34.00 to @thriftfan on Nov 2"></textarea></div>'+
      '<div class="dlg-actions"><button type="button" class="btn secondary" data-action="close-paste">Cancel</button><button type="button" class="btn" data-action="paste-read">Read it</button></div><div id="p_result"></div></div>';
    d.showModal(); $('#p_text').focus();
  }
  function recordSale(o){
    var it=o.itemId?findItem(o.itemId):null;
    if(!it){it={id:uid(),created:Date.now(),title:o.title,category:o.category||guessCategory(o.title),size:'',brand:'',condition:'',color:'',source:'My closet',cost:(o.cost===''||o.cost==null)?'':num(o.cost),price:num(o.price),notes:'',links:{},untracked:true};state.items.push(it)}
    it.sale={platform:o.plat,price:num(o.price),date:o.date||today(),shipCost:num(o.ship),shipStatus:o.plat==='direct'?'na':'to_ship',tracking:'',shippedDate:'',packing:{},delisted:{},buyer:o.buyer||'',paid:false};
    if(o.gmailId)it.sale.gmailId=o.gmailId;
    return it;
  }
  function toggleNewItem(){var f=$('#p_new'),sel=$('#p_item');if(f&&sel)f.hidden=(sel.value!=='__new__')}
  function pasteRead(){
    var text=$('#p_text').value, box=$('#p_result');
    if(!text.trim()){box.innerHTML='<p class="msg bad" style="margin-top:10px">Paste the text first.</p>';return}
    var res=parseSale(text), pool=state.items.filter(function(i){return !i.sale});
    var ms=matchItems(text,pool), good=ms.length&&ms[0].score>=0.5, useNew=!good&&!!res.title;
    var options='<option value="">Choose an item</option>'+
      '<option value="__new__"'+(useNew?' selected':'')+'>New item'+(res.title?': '+esc(res.title):' (not in my list yet)')+'</option>'+
      (ms.length?'<optgroup label="Best guesses">'+ms.slice(0,4).map(function(x,ix){return '<option value="'+esc(x.item.id)+'"'+(ix===0&&good?' selected':'')+'>'+esc(x.item.title)+'</option>'}).join('')+'</optgroup>':'')+
      (pool.length?'<optgroup label="All unsold items">'+pool.map(function(i){return '<option value="'+esc(i.id)+'">'+esc(i.title)+'</option>'}).join('')+'</optgroup>':'');
    var platOpts=PLATFORMS.map(function(pl){return '<option value="'+pl.key+'"'+(res.platform===pl.key?' selected':'')+'>'+pl.name+'</option>'}).join('')+'<option value="direct">Direct (in person, Venmo, cash)</option>';
    var found=[]; found.push(res.platform?'platform: '+platName(res.platform):'no platform name found'); found.push(res.price!==''?'price: '+money(res.price):'no price found'); found.push(res.date?'date: '+fmtDate(res.date):'no date found (using today)'); found.push(res.buyer?'buyer: '+res.buyer:'no buyer found');
    found.push(good?'item: '+ms[0].item.title:(res.title?'item: “'+res.title+'” (not in your list yet, so I’ll add it)':'no clear item'));
    box.innerHTML='<form id="pasteForm" novalidate style="margin-top:14px;border-top:1.5px solid var(--line);padding-top:12px"><p style="margin:0 0 10px;font-size:15px"><b>Here’s what I found.</b> '+esc(found.join(' · '))+'. Check it and fix anything that’s wrong.</p><div class="form-grid">'+
      '<div class="ff full"><label for="p_item">Which item? *</label><select id="p_item">'+options+'</select><div class="msg bad" id="m_pitem" aria-live="polite"></div></div>'+
      '<div class="full" id="p_new" hidden><div class="form-grid" style="border:1.5px dashed var(--brindle);border-radius:14px;padding:10px;background:var(--bone)">'+
        '<div class="ff full"><label for="p_ntitle">New item’s name *</label><input type="text" id="p_ntitle" maxlength="120" value="'+esc(res.title)+'"><div class="msg bad" id="m_ptitle" aria-live="polite"></div></div>'+
        '<div class="ff"><label for="p_ncat">Category</label><select id="p_ncat">'+opt(CATEGORIES,guessCategory(res.title))+'</select></div>'+
        '<div class="ff"><label for="p_ncost">What I paid ($, optional)</label><input type="number" id="p_ncost" min="0" step="0.01"></div></div></div>'+
      '<div class="ff"><label for="p_plat">Sold on</label><select id="p_plat">'+platOpts+'</select></div>'+
      '<div class="ff"><label for="p_price">Sale price ($) *</label><input type="number" id="p_price" min="0" step="0.01" value="'+(res.price!==''?esc(res.price):'')+'"><div class="msg bad" id="m_pprice" aria-live="polite"></div>'+
        (res.prices.length>1?'<div style="margin-top:4px;font-size:13px">Other amounts I saw: '+res.prices.map(function(v){return '<button type="button" class="chip" data-action="paste-price" data-v="'+v+'">'+money(v)+'</button>'}).join('')+'</div>':'')+'</div>'+
      '<div class="ff"><label for="p_date">Date sold</label><input type="date" id="p_date" value="'+(res.date||today())+'"></div>'+
      '<div class="ff"><label for="p_buyer">Buyer (optional)</label><input type="text" id="p_buyer" maxlength="40" value="'+esc(res.buyer)+'"></div>'+
      '<div class="ff"><label for="p_ship">Shipping I paid ($, optional)</label><input type="number" id="p_ship" min="0" step="0.01"></div></div>'+
      '<div class="dlg-actions"><button type="submit" class="btn">Mark as sold</button></div></form>';
    toggleNewItem(); $('#p_item').focus();
  }
  function pasteSave(){
    var id=$('#p_item').value, pr=$('#p_price').value.trim(), ok=true, it=null, isNew=(id==='__new__');
    $('#m_pitem').textContent='';$('#m_pprice').textContent='';var mt=$('#m_ptitle');if(mt)mt.textContent='';
    if(isNew){ if(!$('#p_ntitle').value.trim()){mt.textContent='Give the new item a name.';ok=false} }
    else{ it=id?findItem(id):null; if(!it){$('#m_pitem').textContent='Choose which item sold, or add a new one.';ok=false} }
    if(pr===''||!isFinite(parseFloat(pr))||num(pr)<0){$('#m_pprice').textContent='Enter the price it sold for, like 35.';ok=false}
    if(!ok)return;
    var plat=$('#p_plat').value, cost=$('#p_ncost')?$('#p_ncost').value.trim():'';
    it=recordSale({itemId:isNew?'':id,title:isNew?$('#p_ntitle').value.trim():'',category:isNew?$('#p_ncat').value:'',cost:cost,plat:plat,price:pr,date:$('#p_date').value,ship:$('#p_ship').value,buyer:$('#p_buyer').value.trim()});
    save(); $('#pasteDlg').close(); render(); toast((isNew?'Added and marked ':'Marked ')+'“'+it.title+'” as sold on '+platName(plat)+' for '+money(pr)+'.'); delistAlert([it.id]);
  }


  /* ================= GMAIL ================= */
  var gm={token:'',exp:0,review:null};
  var GM_SCOPE='https://www.googleapis.com/auth/gmail.readonly';
  function gmQuery(){return (state.gmail.query||'').trim()||'newer_than:30d (from:vinted OR from:depop OR from:poshmark OR from:ebay)'}
  function gmIsDone(id){return state.gmail.done.indexOf(id)>=0}
  function gmLoadGIS(){
    return new Promise(function(res,rej){
      if(window.google&&google.accounts&&google.accounts.oauth2)return res();
      var sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;
      sc.onload=function(){(window.google&&google.accounts&&google.accounts.oauth2)?res():rej(new Error('Google’s sign-in didn’t load.'))};
      sc.onerror=function(){rej(new Error('Couldn’t reach Google. Check your internet and try again.'))};
      document.head.appendChild(sc);
    });
  }
  function gmToken(){
    if(gm.token&&Date.now()<gm.exp)return Promise.resolve(gm.token);
    return gmLoadGIS().then(function(){return new Promise(function(res,rej){
      var c=google.accounts.oauth2.initTokenClient({client_id:state.gmail.clientId,scope:GM_SCOPE,callback:function(r){
        if(r&&r.access_token){gm.token=r.access_token;gm.exp=Date.now()+Math.max(60,(r.expires_in||3600)-120)*1000;res(gm.token)}
        else rej(new Error(r&&r.error==='access_denied'?'Google said no. If you saw “Access blocked,” add your Gmail address as a Test user in Google Cloud (see the steps in Settings).':'Google didn’t give access ('+((r&&r.error)||'unknown')+').'))
      },error_callback:function(e){rej(new Error('The Google sign-in window didn’t finish ('+((e&&e.type)||'closed')+'). Tap Check Gmail to try again.'))}});
      c.requestAccessToken({prompt:''});
    })});
  }
  function gmApi(path){
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+gm.token}}).then(function(r){
      if(r.status===401){gm.token='';throw new Error('Google signed you out. Tap Check Gmail again.')}
      return r.json().then(function(j){if(!r.ok){var m=(j&&j.error&&j.error.message)||('error '+r.status);throw new Error(r.status===403&&/not been used|disabled/i.test(m)?'The Gmail API isn’t turned on in your Google Cloud project yet (step 2 in Settings).':'Gmail said: '+m)}return j});
    });
  }
  function b64d(d){try{var t=d.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return decodeURIComponent(escape(atob(t)))}catch(e){try{return atob(d)}catch(e2){return ''}}}
  function htmlToText(h){return h.replace(/<(style|script)[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n\n')}
  function gmBody(p){
    var plain='',html='';
    (function walk(x){if(!x)return;var mt=x.mimeType||'';if(x.body&&x.body.data){if(mt==='text/plain')plain+=b64d(x.body.data)+'\n';else if(mt==='text/html')html+=b64d(x.body.data)+'\n'}(x.parts||[]).forEach(walk)})(p);
    return plain.trim()?plain:htmlToText(html);
  }
  function gmHeader(p,n){var h=((p&&p.headers)||[]).filter(function(x){return x.name.toLowerCase()===n.toLowerCase()})[0];return h?h.value:''}
  function gmFromApi(m){return {id:m.id,subject:gmHeader(m.payload,'Subject'),from:gmHeader(m.payload,'From'),ts:+m.internalDate||Date.now(),body:gmBody(m.payload),snippet:m.snippet||''}}
  function gmFetch(){
    return gmApi('messages?maxResults=40&q='+encodeURIComponent(gmQuery())).then(function(j){
      var ids=(j.messages||[]).map(function(x){return x.id}).filter(function(id){return !gmIsDone(id)}).slice(0,25);
      return Promise.all(ids.map(function(id){return gmApi('messages/'+id+'?format=full').then(gmFromApi)}));
    });
  }
  function gmMockEmails(){
    var now=Date.now(),H=3600000;
    return [
      {id:'mk1',subject:'You sold an item on Vinted',from:'Team Vinted <no-reply@example.com>',ts:now-2*H,snippet:'',body:'Hello Ray,\n\njamie_thrifts has bought\n\nVintage suede jacket\nVintage suede jacket\n$48.00\nWe will transfer the buyer\'s payment to your Vinted Wallet once the order is completed.\n\nPlease send this order within 5 days.\n\nTeam Vinted'},
      {id:'mk2',subject:'You made a sale!',from:'Depop <no-reply@example.com>',ts:now-5*H,snippet:'',body:'Congrats! You sold the Black slip dress on Depop for $34.00 to @mia.wears.'},
      {id:'mk3',subject:'Sold! Corduroy pants',from:'Poshmark <no-reply@example.com>',ts:now-26*H,snippet:'',body:'You sold the Corduroy pants on Poshmark for $30.00. Buyer: sam_thrifts'},
      {id:'mk4',subject:'New message from mia.wears',from:'Depop <no-reply@example.com>',ts:now-1*H,snippet:'',body:'mia.wears sent you a message about the Camel wool coat: "Is this still available? Would you take $40?"'},
      {id:'mk6',subject:'Your shipping label is ready',from:'Depop <no-reply@example.com>',ts:now-4*H,snippet:'',body:'Your shipping label for the Denim jacket is ready. Tracking number: 9400 1118 9922 4455 6677 88. Drop the package off within 5 days.'},
      {id:'mk7',subject:'Good news: your item was delivered',from:'Vinted <no-reply@example.com>',ts:now-3*H,snippet:'',body:'The Striped button-up was delivered. The order is complete and the money is on its way to your wallet.'},
      {id:'mk5',subject:'Summer sale: 20% off shipping on Vinted',from:'Vinted <promo@example.com>',ts:now-30*H,snippet:'',body:'Limited time. Get 20% off shipping this weekend only.'}
    ];
  }
  function extractTracking(t){var m=/[Tt]racking(?:\s*(?:[Nn]umber|[Nn]o\.?|#|[Cc]ode))?[:\s#]*((?:[0-9A-Z]{8,}|[0-9]{3,})(?:\s?[0-9]{2,6}){0,7})/.exec(t);return m?m[1].trim():''}
  function normTrack(x){return (x||'').replace(/\s+/g,'').toUpperCase()}
  function gmClassify(e){
    var text=[e.from||'',e.subject,'',e.body||e.snippet].join('\n'), head=(e.subject+' '+(e.body||'').slice(0,900)), r=parseSale(text);
    r.date=isoDate(new Date(e.ts)); r.id=e.id; r.subject=e.subject; r.text=text; r.ts=e.ts; r.tracking=extractTracking(text);
    var strongSale=/has bought|has purchased|made a sale|bought your|purchased your|you sold|you(?:'|’)ve sold|item sold|sold!/i.test(head);
    var isDeliv=/\bdelivered\b|has been received|buyer (?:has )?received|received (?:your|the) (?:item|order|package)|order (?:is )?complete|transaction (?:is )?complete/i.test(head);
    var isShip=/shipping label|label (?:is |has been |was )?(?:ready|created|generated)|tracking number|has been shipped|is on its way|in transit|dropped off|handed over|picked up/i.test(head);
    if(strongSale&&r.price!==''){r.kind='sale';return r}
    if(isDeliv){r.kind='deliv';return r}
    if(isShip){r.kind='ship';return r}
    if(/\bsold\b/i.test(head)&&r.price!==''){r.kind='sale';return r}
    if(/message|offer|bundle|commented|asked about|sent you/i.test(head)&&!/\d+\s?%\s?off|sale ends|newsletter/i.test(head)){r.kind='msg';return r}
    r.kind='other';return r;
  }
  function gmOpenDialog(inner){var d=$('#gmailDlg');d.innerHTML='<div class="dlg">'+dlgX('close-gmail')+inner+'</div>';if(!d.open)d.showModal()}
  function gmShowError(msg,toSettings){gmOpenDialog('<h2>Check Gmail</h2><p style="margin:0 0 12px" class="msg bad">'+esc(msg)+'</p><div class="dlg-actions">'+(toSettings?'<button type="button" class="btn secondary" data-action="gm-settings">Open Settings</button>':'')+'<button type="button" class="btn" data-action="close-gmail">Close</button></div>')}
  function gmCheck(quiet){
    quiet=quiet===true;
    if(!MOCK){
      if(!state.gmail.clientId){if(quiet)return;gmShowError('To read your Gmail, the site needs a Google “Client ID” first. Settings has the step-by-step setup.',true);return}
      if(location.protocol!=='https:'&&location.hostname!=='localhost'){if(quiet)return;gmShowError('Gmail only works on your live https address (like your Netlify link), not on a file opened from your computer.',false);return}
    }
    if(quiet)toast('Checking your Gmail…');else gmOpenDialog('<h2>Check Gmail</h2><p style="margin:0">'+(MOCK?'Looking at sample emails…':'Asking Google for permission and reading your recent emails…')+'</p>');
    (MOCK?Promise.resolve(gmMockEmails().filter(function(e){return !gmIsDone(e.id)})):gmToken().then(gmFetch)).then(function(emails){if(quiet&&!emails.length){var t=$('#toast');if(t)t.hidden=true;return}gmReview(emails)}).catch(function(e){if(quiet){toast('Couldn’t check Gmail by itself this time. Tap Check Gmail.');return}gmShowError(e&&e.message?e.message:'Something went wrong talking to Gmail.',false)});
  }
  function gmReview(emails){
    var pool=state.items.filter(function(i){return !i.sale}), soldPool=state.items.filter(function(i){return i.sale&&!i.sale.paid&&i.sale.shipStatus!=='delivered'&&i.sale.platform!=='direct'});
    var R={sales:[],msgs:[],upds:[],other:0,ids:emails.map(function(e){return e.id}),keep:[]};
    function findSold(r){
      if(r.tracking){var nt=normTrack(r.tracking),t=soldPool.filter(function(i){return i.sale.tracking&&normTrack(i.sale.tracking)===nt})[0];if(t)return t}
      var ms=matchItems(r.text,soldPool); if(ms.length&&ms[0].score>=0.5)return ms[0].item;
      if(r.buyer){var bb=soldPool.filter(function(i){return i.sale.buyer&&i.sale.buyer.toLowerCase()===r.buyer.toLowerCase()});if(bb.length===1)return bb[0]}
      return null;
    }
    emails.forEach(function(e){
      var r=gmClassify(e);
      if(r.kind==='sale'){var ms=matchItems(r.text,pool),good=ms.length&&ms[0].score>=0.5;r.match=good?ms[0].item:null;r.ok=!!(r.platform&&r.price!==''&&(good||r.title));R.sales.push(r)}
      else if(r.kind==='ship'||r.kind==='deliv'){
        r.item=findSold(r); r.act=r.kind==='ship'?'ship':'deliver';
        if(r.item&&((r.act==='ship'&&r.item.sale.shipStatus!=='to_ship')))r.note='Already marked as shipped.';
        r.ok=!!(r.item&&!r.note); if(!r.item)R.keep.push(r.id); R.upds.push(r);
      }
      else if(r.kind==='msg'){var body=(e.body||e.snippet||'').replace(/\s+/g,' ').trim();r.snip=body.slice(0,220)||e.subject;R.msgs.push(r)}
      else R.other++;
    });
    gm.review=R; gmRender();
  }
  function gmRender(){
    var R=gm.review, n=R.ids.length;
    if(!n){gmOpenDialog('<h2>Check Gmail</h2><p style="margin:0 0 12px">Nothing new. I looked at emails matching “'+esc(gmQuery())+'” and you’ve already been through all of them.</p><div class="dlg-actions"><button type="button" class="btn" data-action="close-gmail">Done</button></div>');return}
    var h='<h2>Check Gmail</h2><p style="margin:0 0 10px">'+plural(n,'new email')+': <b>'+plural(R.sales.length,'sale')+'</b>, <b>'+plural(R.upds.length,'shipping update')+'</b>, <b>'+plural(R.msgs.length,'message')+'</b>'+(R.other?', '+R.other+' skipped (not sales, shipping, or messages)':'')+'. Tick what you want to add.</p>';
    if(R.sales.length){h+='<h3 style="margin:10px 0 6px">Sales</h3>'+R.sales.map(function(r,i){
      return '<label class="gmcard"><input type="checkbox" class="gmchk" data-kind="sale" data-i="'+i+'"'+(r.ok?' checked':'')+'><span><b>'+esc(r.match?r.match.title:(r.title||'Unknown item'))+'</b> · '+(r.platform?platName(r.platform):'Platform?')+' · '+(r.price!==''?money(r.price):'No price')+
        '<small>'+(r.buyer?'Buyer '+esc(r.buyer)+' · ':'')+fmtDate(r.date)+' · “'+esc(r.subject)+'”</small>'+
        (r.match?'<small>Matches your item “'+esc(r.match.title)+'”.</small>':(r.title?'<small class="gm-new">New item “'+esc(r.title)+'” will be added.</small>':'<small class="gm-new">Couldn’t tell which item. Use Paste a sale for this one.</small>'))+'</span></label>'}).join('')}
    if(R.upds.length){h+='<h3 style="margin:10px 0 6px">Shipping and delivery</h3>'+R.upds.map(function(r,i){
      var act=r.act==='ship'?'Mark shipped'+(r.tracking?' (tracking '+esc(r.tracking)+')':''):'Mark delivered';
      return '<label class="gmcard"><input type="checkbox" class="gmchk" data-kind="upd" data-i="'+i+'"'+(r.ok?' checked':'')+(r.item&&!r.note?'':' disabled')+'><span><b>'+(r.item?esc(r.item.title):'Not matched to a sold item')+'</b> · '+(r.platform?platName(r.platform):(r.item?platName(r.item.sale.platform):'Platform?'))+
        '<small>'+(r.item&&!r.note?act:(r.note||'I couldn’t tell which sold item this is. I’ll look at it again next time you check.'))+'</small><small>“'+esc(r.subject)+'” · '+fmtDate(r.date)+'</small></span></label>'}).join('')}
    if(R.msgs.length){h+='<h3 style="margin:10px 0 6px">Customer questions and offers</h3>'+R.msgs.map(function(r,i){
      return '<label class="gmcard"><input type="checkbox" class="gmchk" data-kind="msg" data-i="'+i+'" checked><span><b>'+(r.platform?platName(r.platform):'Platform?')+'</b>'+(r.buyer?' · '+esc(r.buyer):'')+'<small>'+esc(r.snip)+'</small><small>Goes to your Notifications feed so you can reply.</small></span></label>'}).join('')}
    h+='<div class="dlg-actions"><button type="button" class="btn secondary" data-action="close-gmail">Not now</button><button type="button" class="btn" data-action="gm-add">Add what’s ticked</button></div><p style="font-size:13px;margin:8px 0 0">Anything you don’t tick is marked as seen, so it won’t come back next time. Shipping emails I couldn’t match are kept for the next check.</p>';
    gmOpenDialog(h);
  }
  function gmNote(kind,plat,from,text,ts,answered){state.notes.push({id:uid(),kind:kind,platform:plat||'other',from:from||'',text:text,ts:ts,date:isoDate(new Date(ts)),starred:false,responded:!!answered})}
  function gmAdd(){
    var R=gm.review; if(!R)return; var sales=0,upds=0,msgs=0,added=[];
    $all('#gmailDlg .gmchk').forEach(function(c){
      if(!c.checked||c.disabled)return; var i=+c.getAttribute('data-i'), kind=c.getAttribute('data-kind');
      if(kind==='sale'){var r=R.sales[i];if(!r||!r.platform||r.price==='')return;var it=recordSale({itemId:r.match?r.match.id:'',title:r.title,plat:r.platform,price:r.price,date:r.date,buyer:r.buyer,gmailId:r.id});added.push(it.id);sales++;
        gmNote('sale',r.platform,r.buyer,'Sold “'+it.title+'” for '+money(r.price)+'.',r.ts,true)}
      else if(kind==='upd'){var u=R.upds[i];if(!u||!u.item)return;var x=u.item.sale;
        if(u.act==='ship'){x.shipStatus='shipped';if(u.tracking)x.tracking=u.tracking;x.shippedDate=u.date;x.packing={clean:true,boxed:true,label:true};gmNote('shipping',x.platform,x.buyer,'“'+u.item.title+'” was shipped'+(u.tracking?' (tracking '+u.tracking+')':'')+'.',u.ts,true)}
        else{x.shipStatus='delivered';x.deliveredDate=u.date;if(!x.shippedDate)x.shippedDate=u.date;gmNote('delivered',x.platform,x.buyer,'“'+u.item.title+'” was delivered. The money should be on its way to your wallet.',u.ts,true)}
        upds++}
      else{var m=R.msgs[i];if(!m)return;gmNote('question',m.platform,m.buyer,m.snip,m.ts,false);state.notes[state.notes.length-1].gmailId=m.id;msgs++}
    });
    state.gmail.done=state.gmail.done.concat(R.ids.filter(function(id){return R.keep.indexOf(id)<0})).slice(-600); gm.review=null; save(); $('#gmailDlg').close(); render();
    toast((sales||msgs||upds)?('Added '+plural(sales,'sale')+', '+plural(upds,'shipping update')+' and '+plural(msgs,'message')+'.'):'Marked those emails as seen.');
    if(added.length)delistAlert(added);
  }

  var autoGm=false;
  document.addEventListener('pointerdown',function(){
    if(autoGm)return; var ap=$('#app'); if(!ap||ap.hidden)return; autoGm=true;
    if(!MOCK&&state.gmail.auto&&state.gmail.clientId&&location.protocol==='https:')gmCheck(true);
  });

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
    function set(name,n,title){$all('[data-badge="'+name+'"]').forEach(function(el){el.hidden=!n;el.textContent=n||'';el.title=n?title:''})}
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
    var d=$('#delistDlg'); d.innerHTML='<div class="dlg">'+dlgX('close-delist')+h+'</div>'; if(!d.open)d.showModal();
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
    d.innerHTML='<div class="dlg">'+dlgX('close-reply')+'<h2>Reply to a buyer</h2>'+
      (note?'<p style="margin:0 0 10px;font-size:15px"><b>'+esc(note.from||'Someone')+'</b> wrote: “'+esc(note.text)+'”</p>':'')+
      '<div class="form-grid"><div class="ff"><label for="r_buyer">Buyer’s name</label><input type="text" id="r_buyer" maxlength="40" value="'+esc(buyer)+'"></div>'+
      '<div class="ff"><label for="r_tpl">Template</label><select id="r_tpl">'+tpls().map(function(t){return '<option value="'+esc(t.id)+'"'+(t.id===tid?' selected':'')+'>'+esc(t.name)+'</option>'}).join('')+'</select></div>'+
      '<div class="ff full"><label for="r_item">About which item?</label><select id="r_item"><option value="">No item</option>'+items.map(function(i){return '<option value="'+esc(i.id)+'"'+(it&&it.id===i.id?' selected':'')+'>'+esc(i.title)+(i.sale?' (sold)':'')+'</option>'}).join('')+'</select></div>'+
      '<div class="ff full"><label for="r_text">Your reply (you can edit it)</label><textarea id="r_text" rows="5"></textarea><div class="msg bad" id="r_warn" aria-live="polite"></div></div></div>'+
      '<div class="kopen" style="margin-top:6px"><button type="button" class="btn" data-action="reply-copy">Copy reply</button>'+(navigator.share?'<button type="button" class="btn secondary" data-action="reply-share">Share…</button>':'')+'<a class="btn secondary" id="r_open" href="#" target="_blank" rel="noopener noreferrer" hidden></a></div>'+
      '<div class="dlg-actions">'+(note?'<button type="button" class="btn secondary small" data-action="reply-resp">Mark as responded</button>':'')+'<span class="spacer"></span><button type="button" class="btn" data-action="close-reply">Done</button></div></div>';
    d.showModal(); replyText();
  }

  /* ---- ship dialog + drag and drop ---- */
  var shipId=null;
  function openShip(id){
    var it=findItem(id); if(!it||!it.sale)return; shipId=id;
    var d=$('#shipDlg');
    d.innerHTML='<form class="dlg" id="shipForm" novalidate>'+dlgX('close-ship')+'<h2>Mark as shipped</h2><p style="margin:0 0 14px"><b>'+esc(it.title)+'</b> · sold on '+platName(it.sale.platform)+'</p><div class="ff"><label for="sh_track">Tracking number *</label><input type="text" id="sh_track" maxlength="60" value="'+esc(it.sale.tracking||'')+'"><div class="msg bad" id="m_track" aria-live="polite"></div></div><div class="dlg-actions"><button type="button" class="btn secondary" data-action="close-ship">Cancel</button><button type="submit" class="btn">Mark shipped</button></div></form>';
    d.showModal(); $('#sh_track').focus();
  }
  function saveShip(){
    var it=findItem(shipId); if(!it)return; var v=$('#sh_track').value.trim();
    if(!v){$('#m_track').textContent='Add a tracking number first.';$('#sh_track').focus();return}
    it.sale.tracking=v;it.sale.shipStatus='shipped';it.sale.shippedDate=today();save();$('#shipDlg').close();render();
  }
  function canDrop(from,to){return (to==='toship'&&(from==='unposted'||from==='listed'))||(to==='shipped'&&from==='toship')}
  document.addEventListener('dragstart',function(e){
    var c=e.target.closest&&e.target.closest('.bcard[draggable="true"]'); if(!c)return;
    ui.dragId=c.getAttribute('data-id'); ui.dragStage=c.getAttribute('data-stage'); c.classList.add('dragging');
    try{e.dataTransfer.setData('text/plain',ui.dragId);e.dataTransfer.effectAllowed='move'}catch(x){}
  });
  document.addEventListener('dragend',function(){ui.dragId=null;$all('.bcard.dragging').forEach(function(x){x.classList.remove('dragging')});$all('.bcol.over').forEach(function(x){x.classList.remove('over')})});
  document.addEventListener('dragover',function(e){
    var col=e.target.closest&&e.target.closest('.bcol'); if(!col||!ui.dragId)return;
    if(canDrop(ui.dragStage,col.getAttribute('data-stage'))){e.preventDefault();col.classList.add('over')}
  });
  document.addEventListener('dragleave',function(e){var col=e.target.closest&&e.target.closest('.bcol');if(col&&!col.contains(e.relatedTarget))col.classList.remove('over')});
  document.addEventListener('drop',function(e){
    var col=e.target.closest&&e.target.closest('.bcol'); if(!col||!ui.dragId)return;
    e.preventDefault(); var to=col.getAttribute('data-stage'), id=ui.dragId, from=ui.dragStage; col.classList.remove('over'); ui.dragId=null;
    if(!canDrop(from,to))return;
    if(to==='toship')openSold(id);else openShip(id);
  });


  window.addEventListener('error',function(ev){try{if(ev&&ev.message&&!/ResizeObserver/.test(ev.message))toast('Something went wrong ('+ev.message+'). Your items are saved. Reload the page and try again.')}catch(x){}});
  window.addEventListener('unhandledrejection',function(ev){try{var m=ev&&ev.reason&&ev.reason.message;if(m&&m!=='net'&&m!=='lib')toast('Something went wrong ('+m+'). Your items are saved. Reload the page and try again.')}catch(x){}});

  /* ---- drop a photo from Finder / Photos, or paste one ---- */
  function hasFiles(e){var t=e.dataTransfer&&e.dataTransfer.types;return !!t&&Array.prototype.indexOf.call(t,'Files')>=0}
  function hasOutside(e){var t=e.dataTransfer&&e.dataTransfer.types;if(!t||hasFiles(e))return false;var l=Array.prototype.slice.call(t);return (l.indexOf('text/uri-list')>=0||l.indexOf('text/html')>=0)&&!(e.target.closest&&e.target.closest('input,textarea,[contenteditable]'))}
  function firstFile(dt){var f=dt&&dt.files;if(!f||!f.length)return null;for(var i=0;i<f.length;i++)if(isImageFile(f[i]))return f[i];return f[0]}
  function dropUrl(dt){try{var u=(dt.getData('text/uri-list')||'').split(/\r?\n/).filter(function(x){return x&&x.charAt(0)!=='#'})[0]||'';if(!u){var h=dt.getData('text/html')||'',m=/<img[^>]+src=["']([^"']+)["']/i.exec(h);u=m?m[1]:''}return /^(https?:|data:image\/)/i.test(u)?u:''}catch(x){return ''}}
  function fileFromUrl(u){return fetch(u).then(function(r){if(!r.ok)throw new Error('http');return r.blob()}).then(function(b){if(!/^image\//.test(b.type))throw new Error('type');return new File([b],'dropped-image',{type:b.type})})}
  function clearDropUI(){document.body.classList.remove('filedrag');$all('.dropping').forEach(function(x){x.classList.remove('dropping')})}
  function dropTarget(e){
    if(e.target.closest&&e.target.closest('#itemDlg')){var pb=e.target.closest('#itemDlg .photobox');return {kind:'dlg',el:pb||null}}
    if(document.querySelector('dialog[open]'))return {kind:'none'};
    var card=e.target.closest&&e.target.closest('[data-panel="items"] [data-id]');
    var ip=$('[data-panel="items"]');
    if(card&&ip&&!ip.hidden){var holder=card.closest('.bcard,tr,li')||card;return {kind:'card',id:card.getAttribute('data-id'),el:holder}}
    if(ip&&!ip.hidden&&ip.contains(e.target))return {kind:'new'};
    return {kind:'none'};
  }
  function useDroppedFile(t,file){
    if(t.kind==='dlg'){if($('#photoFile'))handlePhotoFile(file)}
    else if(t.kind==='card')setItemPhotoFromFile(t.id,file);
    else if(t.kind==='new'){openItem();setTimeout(function(){handlePhotoFile(file)},60)}
    else toast('Open the Items page, then drop the photo on an item or on empty space.');
  }
  document.addEventListener('dragover',function(e){
    if(!hasFiles(e)&&!hasOutside(e))return; e.preventDefault();
    try{e.dataTransfer.dropEffect='copy'}catch(x){}
    var t=dropTarget(e); $all('.dropping').forEach(function(x){x.classList.remove('dropping')});
    if(t.el)t.el.classList.add('dropping');
    var ip=$('[data-panel="items"]'); document.body.classList.toggle('filedrag',!!(ip&&!ip.hidden&&!document.querySelector('dialog[open]')));
  });
  document.addEventListener('dragleave',function(e){if(!e.relatedTarget)clearDropUI()});
  document.addEventListener('dragend',clearDropUI);
  document.addEventListener('drop',function(e){
    if(!hasFiles(e)&&!hasOutside(e))return; e.preventDefault();
    var t=dropTarget(e), dt=e.dataTransfer, file=hasFiles(e)?firstFile(dt):null, url=file?'':dropUrl(dt); clearDropUI();
    if(file){useDroppedFile(t,file);return}
    if(url){toast('Getting that picture…');fileFromUrl(url).then(function(f){useDroppedFile(t,f)},function(){toast('That website won’t let me copy its picture. Save the picture to your Mac first, then drag the saved file in.')});return}
    toast('I couldn’t read that drop. Click Add photo and choose the picture instead.');
  });
  document.addEventListener('paste',function(e){
    var d=$('#itemDlg'); if(!d||!d.open||!$('#photoFile'))return;
    var f=firstFile(e.clipboardData); if(f&&isImageFile(f)){e.preventDefault();handlePhotoFile(f)}
  });

  /* ---- item dialog ---- */
  var editingId=null, pendingPhoto=null, removePhotoFlag=false;
  function editingItem(){return editingId?findItem(editingId):null}
  function currentPhotoSrc(){if(pendingPhoto)return pendingPhoto.url;if(removePhotoFlag)return '';var it=editingItem();return it?photoSrc(it):''}
  function updatePhotoUI(){
    var pv=$('#photoPreview'); if(!pv)return; var src=currentPhotoSrc(), cat=$('#f_cat')?$('#f_cat').value:'Tops';
    pv.className='frame big'+(src?'':' noph');
    pv.innerHTML=src?'<img src="'+src+'" alt="Photo preview">':'<img src="'+IMG[iconFor(cat)]+'" alt=""><span>No photo yet</span>';
    $('#photoBtn').textContent=src?'Change photo':'Add photo'; $('#photoRm').hidden=!src;
  }
  function handlePhotoFile(file){
    var m=$('#m_photo'); if(!m)return; m.textContent=''; if(!file)return;
    (isImageFile(file)?Promise.resolve(true):sniffHeic(file)).then(function(isImg){
      if(!isImg){m.textContent='That file isn’t a picture. Photos from your Mac or iPhone (HEIC, JPG, PNG, WebP, GIF) all work.';return}
      if(file.size>40*1024*1024){m.textContent='That picture is very large. Choose one under 40 MB.';return}
      m.textContent='Preparing the picture…';
      return resizeImage(file,900,function(t){m.textContent=t}).then(function(blob){if(pendingPhoto)URL.revokeObjectURL(pendingPhoto.url);pendingPhoto={blob:blob,url:URL.createObjectURL(blob)};removePhotoFlag=false;m.textContent='';updatePhotoUI()});
    }).catch(function(err){m.textContent=photoErr(err,file)});
  }
  function setItemPhotoFromFile(id,file){
    var it=findItem(id); if(!it)return;
    (isImageFile(file)?Promise.resolve(true):sniffHeic(file)).then(function(isImg){
      if(!isImg){toast('That file isn’t a picture.');return}
      toast('Preparing the picture…');
      return resizeImage(file,900,function(t){toast(t)}).then(function(blob){
        setPhoto(it.id,blob); it.photoRef='';
        return photoPut(it.id,blob).catch(function(){toast('This browser couldn’t save the picture. It will disappear when you close the page.')}).then(function(){save();render();toast('Photo added to “'+it.title+'”.')});
      });
    }).catch(function(err){toast(photoErr(err,file))});
  }
  function applyPhoto(it){
    if(pendingPhoto){setPhoto(it.id,pendingPhoto.blob);it.photoRef='';photoPut(it.id,pendingPhoto.blob).catch(function(){toast('This browser couldn’t save the picture. It will disappear when you close the page.')});pendingPhoto=null}
    else if(removePhotoFlag){clearPhoto(it.id);it.photoRef='';photoDel(it.id).catch(function(){})}
    removePhotoFlag=false;
  }
  function opt(list,sel){return list.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')}
  function openItem(id){
    var it=id?findItem(id):null; editingId=id||null;
    if(pendingPhoto){URL.revokeObjectURL(pendingPhoto.url);pendingPhoto=null} removePhotoFlag=false;
    var d=$('#itemDlg');
    var links=PLATFORMS.map(function(pl){
      return '<div class="ff"><label for="link_'+pl.key+'">'+pl.name+' listing link</label><input type="text" id="link_'+pl.key+'" data-linkkey="'+pl.key+'" placeholder="https://'+pl.domain+'/…" value="'+esc(it&&it.links?(it.links[pl.key]||''):'')+'" autocomplete="off"><div class="msg" id="m_link_'+pl.key+'" aria-live="polite"></div></div>';
    }).join('');
    d.innerHTML='<form class="dlg" id="itemForm" novalidate>'+dlgX('close-dlg')+'<h2>'+(it?'Edit item':'New item')+'</h2>'+
      '<div class="form-grid">'+
      '<div class="full photobox"><div class="frame big noph" id="photoPreview"></div><div class="pb-text"><b>Photo</b><p>Add a clear picture of the item. <b>Drag one in, paste it, or choose one from your Photos.</b> HEIC, JPG, PNG, WebP and GIF all work. Pictures are saved in this browser.</p><div class="pb-btns"><button type="button" class="btn small" id="photoBtn" data-action="pick-photo">Add photo</button><button type="button" class="btn small secondary" id="photoRm" data-action="remove-photo" hidden>Remove photo</button></div><div class="msg bad" id="m_photo" aria-live="polite"></div></div><input type="file" id="photoFile" accept="image/*,.heic,.heif" hidden></div>'+
      '<div class="ff full"><label for="f_title">Name *</label><input type="text" id="f_title" maxlength="120" placeholder="e.g. Wool coat, camel" value="'+esc(it?it.title:'')+'"><div class="msg bad" id="m_title" aria-live="polite"></div></div>'+
      '<div class="ff"><label for="f_cat">Category</label><select id="f_cat">'+opt(CATEGORIES,it?it.category:'Tops')+'</select></div>'+
      '<div class="ff"><label for="f_size">Size</label><input type="text" id="f_size" maxlength="20" value="'+esc(it?it.size:'')+'"></div>'+
      '<div class="ff"><label for="f_brand">Brand</label><input type="text" id="f_brand" maxlength="60" value="'+esc(it?it.brand:'')+'"></div>'+
      '<div class="ff"><label for="f_color">Color</label><input type="text" id="f_color" maxlength="40" placeholder="e.g. black" value="'+esc(it?it.color:'')+'"></div>'+
      '<div class="ff"><label for="f_cond">Condition</label><select id="f_cond"><option value="">Not set</option>'+opt(['New with tags','Like new','Good','Fair'],it?it.condition:'')+'</select></div>'+
      '<div class="ff"><label for="f_source">Where I got it</label><select id="f_source">'+opt(SOURCES,it?it.source:'My closet')+'</select></div>'+
      '<div class="ff"><label for="f_cost">What I paid ($)</label><input type="number" id="f_cost" min="0" step="0.01" value="'+esc(it&&it.cost!==''&&it.cost!=null?it.cost:'')+'"><div class="msg bad" id="m_cost" aria-live="polite"></div></div>'+
      '<div class="ff"><label for="f_price">Asking price ($)</label><input type="number" id="f_price" min="0" step="0.01" value="'+esc(it&&it.price!==''&&it.price!=null?it.price:'')+'"><div class="msg bad" id="m_price" aria-live="polite"></div></div>'+
      '<div class="ff full"><label for="f_notes">Notes, flaws, measurements</label><textarea id="f_notes" maxlength="800">'+esc(it?it.notes:'')+'</textarea></div>'+
      '<details class="full more"'+((it&&(it.styleTags||it.age||it.pkg||it.dsource))?' open':'')+'><summary>More details (optional)</summary><div class="form-grid" style="margin-top:10px">'+
        '<div class="ff"><label for="f_style">Style tags</label><input type="text" id="f_style" maxlength="80" placeholder="e.g. y2k, vintage" value="'+esc(it?it.styleTags:'')+'"></div>'+
        '<div class="ff"><label for="f_age">Age</label><select id="f_age"><option value="">Not set</option>'+opt(['2020s','2010s','2000s','1990s','1980s','1970s','Before 1970'],it?it.age:'')+'</select></div>'+
        '<div class="ff"><label for="f_pkg">Package size</label><select id="f_pkg"><option value="">Not set</option>'+opt(['Extra small','Small','Medium','Large','Extra large'],it?it.pkg:'')+'</select></div>'+
        '<div class="ff"><label for="f_dsource">Source (Depop)</label><input type="text" id="f_dsource" maxlength="40" placeholder="e.g. Vintage, Preloved" value="'+esc(it?it.dsource:'')+'"></div>'+
      '</div></details>'+
      '<div class="full"><h3>Where it’s posted</h3><p style="margin:0 0 6px;font-size:15px">Paste the link from each platform. A platform only counts as posted once its link is here.</p></div>'+links+
      '</div>'+
      '<div class="dlg-actions">'+
        (it?'<button type="button" class="btn secondary" data-action="delete-item" data-id="'+esc(it.id)+'">Delete</button>':'')+
        (it&&it.sale?'<button type="button" class="btn secondary" data-action="undo-sale" data-id="'+esc(it.id)+'">Undo sale</button>':'')+
        (it?'<button type="button" class="btn secondary" data-action="open-kit" data-id="'+esc(it.id)+'">Listing kit</button>':'')+'<button type="button" class="btn secondary" data-action="copy-listing">Copy listing text</button><span class="msg" id="copyMsg" aria-live="polite"></span>'+
        '<span class="spacer"></span>'+
        '<button type="button" class="btn secondary" data-action="close-dlg">Cancel</button><button type="submit" class="btn">Save item</button>'+
      '</div></form>';
    if(!d.open)d.showModal();
    updatePhotoUI();
    $('#f_title').focus();
  }
  function checkLink(key,val){
    val=(val||'').trim(); if(!val)return {ok:true,warn:''};
    var u; try{u=new URL(val)}catch(e){return {ok:false,msg:'That doesn’t look like a web link. It should start with https://'}}
    if(u.protocol!=='http:'&&u.protocol!=='https:')return {ok:false,msg:'That doesn’t look like a web link. It should start with https://'};
    var host=u.hostname.toLowerCase(), dom=PLAT[key].domain;
    if(!(host===dom||host.slice(-(dom.length+1))==='.'+dom))return {ok:true,warn:'Heads up: this link isn’t on '+dom+'. It will still be saved.'};
    return {ok:true,warn:''};
  }
  function showLinkMsg(key){
    var r=checkLink(key,$('#link_'+key).value), m=$('#m_link_'+key);
    m.className='msg '+(r.ok?(r.warn?'warn':''):'bad'); m.textContent=r.ok?r.warn:r.msg; return r;
  }
  function saveItem(){
    var title=$('#f_title').value.trim(), ok=true;
    $('#m_title').textContent=''; $('#m_cost').textContent=''; $('#m_price').textContent='';
    if(!title){$('#m_title').textContent='Give the item a name.';ok=false}
    var cost=$('#f_cost').value.trim(), price=$('#f_price').value.trim();
    if(cost!==''&&!(num(cost)>=0&&isFinite(parseFloat(cost)))){$('#m_cost').textContent='Enter a number like 12.50.';ok=false}
    if(price!==''&&!(num(price)>=0&&isFinite(parseFloat(price)))){$('#m_price').textContent='Enter a number like 35.';ok=false}
    var links={};
    PLATFORMS.forEach(function(pl){var r=showLinkMsg(pl.key);if(!r.ok)ok=false;var v=$('#link_'+pl.key).value.trim();if(v)links[pl.key]=v});
    if(!ok){var bad=$('#itemDlg .msg.bad:not(:empty)');if(bad){var inp=bad.parentNode.querySelector('input');if(inp)inp.focus()}return}
    var data={title:title,category:$('#f_cat').value,size:$('#f_size').value.trim(),brand:$('#f_brand').value.trim(),condition:$('#f_cond').value,color:$('#f_color').value.trim(),styleTags:$('#f_style').value.trim(),age:$('#f_age').value,pkg:$('#f_pkg').value,dsource:$('#f_dsource').value.trim(),source:$('#f_source').value,cost:cost===''?'':num(cost),price:price===''?'':num(price),notes:$('#f_notes').value.trim(),links:links};
    var saved;
    if(editingId){var it=findItem(editingId);saved=it;Object.keys(data).forEach(function(k){it[k]=data[k]});
      // links removed after a sale no longer need delisting
    }
    else{data.id=uid();data.created=Date.now();state.items.push(data);saved=data}
    applyPhoto(saved);
    save(); $('#itemDlg').close(); render();
  }
  function copyText(s){
    if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(s)}
    return new Promise(function(res,rej){try{var t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();var ok=document.execCommand('copy');t.remove();ok?res():rej()}catch(e){rej(e)}});
  }
  function copyListing(){
    var parts=[ $('#f_title').value.trim() ];
    var line=[$('#f_cat').value,$('#f_size').value.trim()?('Size '+$('#f_size').value.trim()):'',$('#f_brand').value.trim()?('Brand: '+$('#f_brand').value.trim()):''].filter(Boolean).join(' · ');
    if(line)parts.push(line);
    if($('#f_price').value.trim())parts.push('Price: '+money($('#f_price').value));
    if($('#f_notes').value.trim())parts.push('',$('#f_notes').value.trim());
    var m=$('#copyMsg');
    copyText(parts.join('\n')).then(function(){m.textContent='Copied.'},function(){m.textContent='Couldn’t copy. Select the text and copy it yourself.'});
  }

  /* ---- sold dialog ---- */
  var soldId=null;
  function openSold(id){
    var it=findItem(id); if(!it)return; soldId=id;
    var ps=posted(it);
    var options=PLATFORMS.map(function(pl){return '<option value="'+pl.key+'"'+(ps[0]===pl.key?' selected':'')+'>'+pl.name+'</option>'}).join('')+'<option value="direct">Direct (in person, Venmo, cash)</option>';
    var d=$('#soldDlg');
    d.innerHTML='<form class="dlg" id="soldForm" novalidate>'+dlgX('close-sold')+'<h2>Mark as sold</h2><p style="margin:0 0 14px"><b>'+esc(it.title)+'</b></p>'+
      '<div class="form-grid">'+
      '<div class="ff"><label for="s_plat">Sold on</label><select id="s_plat">'+options+'</select></div>'+
      '<div class="ff"><label for="s_price">Sale price ($) *</label><input type="number" id="s_price" min="0" step="0.01" value="'+esc(it.price!==''&&it.price!=null?it.price:'')+'"><div class="msg bad" id="m_sprice" aria-live="polite"></div></div>'+
      '<div class="ff"><label for="s_date">Date sold</label><input type="date" id="s_date" value="'+today()+'"></div>'+
      '<div class="ff"><label for="s_ship">Shipping I paid ($, optional)</label><input type="number" id="s_ship" min="0" step="0.01"></div>'+
      '<div class="ff full"><label for="s_buyer">Buyer’s username (optional)</label><input type="text" id="s_buyer" maxlength="40" placeholder="so reply templates can use their name"></div>'+
      '</div><p style="font-size:15px;margin:12px 0 0">Direct sales skip the shipping steps. If this item is posted on other platforms, you’ll get a delist checklist.</p>'+
      '<div class="dlg-actions"><button type="button" class="btn secondary" data-action="close-sold">Cancel</button><button type="submit" class="btn">Save sale</button></div></form>';
    d.showModal(); $('#s_price').focus();
  }
  function saveSold(){
    var it=findItem(soldId); if(!it)return;
    var pr=$('#s_price').value.trim(), m=$('#m_sprice'); m.textContent='';
    if(pr===''||!isFinite(parseFloat(pr))||num(pr)<0){m.textContent='Enter the price it sold for, like 35.';$('#s_price').focus();return}
    var plat=$('#s_plat').value, date=$('#s_date').value||today();
    it.sale={platform:plat,price:num(pr),date:date,shipCost:num($('#s_ship').value),shipStatus:plat==='direct'?'na':'to_ship',tracking:'',shippedDate:'',packing:{},delisted:{},buyer:$('#s_buyer').value.trim(),paid:false};
    save(); $('#soldDlg').close(); render(); celebrate(); delistAlert([it.id]);
  }

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
          '<div class="shiprow"><label class="sr" for="track_'+esc(i.id)+'">Tracking number</label><input type="text" id="track_'+esc(i.id)+'" placeholder="Tracking number" value="'+esc(s.tracking||'')+'" data-change="tracking" data-id="'+esc(i.id)+'" maxlength="60"><button class="btn small" data-action="ship" data-id="'+esc(i.id)+'">Mark shipped</button><button class="btn small secondary" data-action="msg-buyer" data-id="'+esc(i.id)+'" data-t="soon">Message buyer</button></div>'+
          '<div class="msg bad" id="shipmsg_'+esc(i.id)+'" aria-live="polite"></div></div></div>';
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
    var bySource=groupProfit(sold,function(i){return i.source||'Other'},function(k){return k});
    var byPlat=groupProfit(sold,function(i){return i.sale.platform},function(k){return platName(k)});
    var platColor=function(r){return r.key==='direct'?'var(--bone)':(PLAT[r.key]?PLAT[r.key].color:'var(--sage)')};
    return '<div class="card" style="--accent:var(--sage)"><h2>Monthly sales and profit</h2><p class="chart-sub">Last 6 months, based on the date each item sold.</p>'+chartMonthly(anim)+'</div>'+
      '<div class="card" style="--accent:var(--fawn)"><h2>Where each dollar goes</h2><p class="chart-sub">'+label+'. Every dollar you sold, split into costs and profit.</p>'+chartDollar(sold,anim)+'</div>'+
      '<div class="card" style="--accent:var(--lilac)"><h2>What earns the most</h2><p class="chart-sub">'+label+'. Total profit, with the average per item underneath.</p>'+
      '<div class="grid2" style="margin-bottom:0"><div class="hgroup"><h3>Where I got it</h3>'+(sold.length?hbars(bySource,anim,function(){return 'var(--lilac)'}):chartEmpty('No sales in this period yet.'))+'</div>'+
      '<div class="hgroup"><h3>Where I sold it</h3>'+(sold.length?hbars(byPlat,anim,platColor):chartEmpty('No sales in this period yet.'))+'</div></div></div>';
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

  /* ================= SETTINGS ================= */
  function renderSettings(){
    var p=$('[data-panel="settings"]');
    p.innerHTML='<div class="top"><h1>Settings</h1></div>'+(MOCK?'<div class="card" style="--accent:var(--plum)"><h2>Mock version</h2><p style="margin:0 0 6px">Everything here is made up so you can see what the site looks like in real use. You can click around and change things. It’s saved separately from your real site.</p><div class="btnrow2"><button class="btn" data-action="mock-reset">Reset to the original fake data</button></div></div>':'')+
      '<div class="settings-grid"><div class="card" style="--accent:var(--sage)"><h2>About you</h2><div class="ff"><label for="set_name">Your name</label><input type="text" id="set_name" maxlength="40" data-change="name" value="'+esc(state.settings.name)+'"></div></div>'+
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
      tpls().map(function(t){return '<div class="tpl"><div class="ff"><label for="tn_'+esc(t.id)+'">Name</label><input type="text" id="tn_'+esc(t.id)+'" maxlength="40" data-change="tpl-name" data-id="'+esc(t.id)+'" value="'+esc(t.name)+'"></div><div class="ff"><label for="tt_'+esc(t.id)+'">Message</label><textarea id="tt_'+esc(t.id)+'" rows="3" data-change="tpl-text" data-id="'+esc(t.id)+'">'+esc(t.text)+'</textarea></div><button type="button" class="btn small secondary" data-action="tpl-del" data-id="'+esc(t.id)+'">Delete</button></div>'}).join('')+
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


  /* ================= MOCK DATA (only used in the mock version) ================= */
  function mockData(){
    var st=blank(), t=Date.now(), n=0;
    function L(k,slug){return 'https://www.'+PLAT[k].domain+'/'+(k==='depop'?'products/':k==='poshmark'?'listing/':k==='ebay'?'itm/':k==='vinted'?'items/':'p/')+slug+'/'}
    function slugOf(x){return x.toLowerCase().replace(/[^a-z0-9]+/g,'-')}
    function add(o){o.photoRef=slugOf(o.title);var tl=o.title.toLowerCase(),CM=[['black','black'],['white','white'],['camel','camel'],['denim','blue'],['jeans','blue'],['green','green'],['plaid','red'],['red','red'],['striped','blue and white'],['floral','pink'],['cardigan','olive'],['scarf','purple'],['leather','brown'],['loafers','brown'],['tweed','gray'],['corduroy','rust'],['beaded','red'],['gold','gold'],['band tee','black'],['canvas','cream'],['knit','cream'],['bucket','khaki'],['belt','brown'],['fleece','tan'],['cropped','pink'],['satin','champagne'],['windbreaker','teal'],['skirt','sage'],['hoodie','gray']];for(var ci=0;ci<CM.length;ci++){if(tl.indexOf(CM[ci][0])>=0){o.color=CM[ci][1];break}}o.condition=o.condition||'Good';o.styleTags=o.styleTags||'vintage, thrifted';o.dsource=o.dsource||'Preloved';o.pkg=o.pkg||({Outerwear:'Large',Shoes:'Medium',Bags:'Medium',Accessories:'Small',Jewelry:'Extra small',Hats:'Small'}[o.category]||'Medium');o.id='m'+(n++)+uid();o.created=t-n*60000;o.notes=o.notes||'';o.size=o.size||'M';o.brand=o.brand||'';o.links=o.links||{};st.items.push(o);return o}
    function sold(title,cat,src,cost,price,plat,ago,ship,status,extra,pendingOn){
      if(ago<=29)ago=Math.min(ago,new Date().getDate()-1);
      var links={}; if(plat!=='direct')links[plat]=L(plat,slugOf(title));
      (extra||[]).forEach(function(k){links[k]=L(k,slugOf(title))});
      var delisted={}; Object.keys(links).forEach(function(k){if(k!==plat&&(pendingOn||[]).indexOf(k)<0)delisted[k]=true});
      var packing=status==='to_ship'?{}:{clean:true,boxed:true,label:true};
      var made=add({title:title,category:cat,source:src,cost:cost,price:price,links:links,sale:{platform:plat,price:price,date:daysAgo(ago),shipCost:ship,shipStatus:plat==='direct'?'na':status,tracking:(status==='to_ship'||plat==='direct')?'':'9400 1118 9922 '+(1000+n)+' 0000 00',shippedDate:(status==='to_ship'||plat==='direct')?'':daysAgo(Math.max(0,ago-1)),packing:packing,delisted:delisted}});
      var BUY=['thriftfan22','vintage_vibes','mia.wears','closet_cleanout','retro_ray','sam_thrifts','lulu_b','jo.finds'];
      made.sale.buyer=BUY[n%BUY.length]; made.sale.paid=(status==='delivered'&&ago>14)||(plat==='direct'&&ago>30);
      if(status==='delivered')made.sale.deliveredDate=daysAgo(Math.max(0,ago-3));
    }
    function listed(title,cat,src,cost,price,plats,sz){var links={};plats.forEach(function(k){links[k]=L(k,slugOf(title))});add({title:title,category:cat,source:src,cost:cost,price:price,links:links,size:sz})}
    sold('Wool coat, camel','Outerwear','Wescott Thrift',12,48,'depop',1,0,'to_ship');
    sold('Denim jacket','Outerwear','3Fifteen',8,36,'depop',2,0,'to_ship',['vinted'],['vinted']);
    sold('Vintage band tee','Tops','Goodwill Outlet',3,28,'depop',2,0,'to_ship');
    sold('Striped button-up','Tops','3Fifteen',4,22,'vinted',5,4.5,'shipped');
    sold('Green cardigan','Tops','My closet',6,28.5,'vinted',7,4.5,'delivered',['poshmark'],['poshmark']);
    sold('Linen shirt, white','Tops','Goodwill Outlet',5,31,'poshmark',10,5,'delivered');
    sold('Plaid flannel','Tops','3Fifteen',5,24,'depop',16,4.5,'delivered');
    sold('Vintage windbreaker','Outerwear','Wescott Thrift',9,52,'ebay',21,7,'delivered');
    sold('Mom jeans','Bottoms','Goodwill Outlet',4,32,'depop',29,5,'delivered');
    sold('Silk scarf','Accessories','My closet',0,18,'vinted',36,3.5,'delivered');
    sold('Pleated skirt','Bottoms','3Fifteen',6,29,'poshmark',44,5,'delivered');
    sold('Canvas tote','Bags','Facebook Marketplace',3,22,'direct',52,0,'na');
    sold('Wool beanie','Hats','My closet',0,15,'direct',3,0,'na');
    sold('Knit sweater','Tops','Wescott Thrift',7,38,'depop',61,5,'delivered');
    sold('Leather belt','Accessories','Goodwill Outlet',2,16,'vinted',75,3.5,'delivered');
    sold('Corduroy jacket','Outerwear','3Fifteen',11,54,'depop',89,7,'delivered');
    sold('Floral midi dress','Dresses','Wescott Thrift',8,42,'poshmark',104,5,'delivered');
    sold('Chunky sneakers','Shoes','Facebook Marketplace',14,58,'ebay',120,9,'delivered');
    sold('Bucket hat','Hats','My closet',0,14,'depop',138,3.5,'delivered');
    sold('Beaded necklace','Jewelry','Goodwill Outlet',1,12,'vinted',155,3,'delivered');
    sold('Denim skirt','Bottoms','3Fifteen',5,26,'depop',176,5,'delivered');
    sold('Fleece pullover','Outerwear','Wescott Thrift',6,34,'depop',198,6,'delivered');
    sold('Cropped cardigan','Tops','My closet',0,20,'vinted',224,4,'delivered');
    sold('Leather loafers','Shoes','Goodwill Outlet',9,44,'ebay',250,8,'delivered');
    listed('Black slip dress','Dresses','Wescott Thrift',7,34,['depop','vinted'],'S');
    listed('White sneakers','Shoes','My closet',0,40,['depop'],'8');
    listed('Leather shoulder bag','Bags','3Fifteen',9,45,['ebay']);
    listed('Wool scarf','Accessories','Goodwill Outlet',3,18,['vinted']);
    listed('Graphic hoodie','Tops','3Fifteen',10,40,['depop','poshmark'],'L');
    listed('Satin blouse','Tops','Wescott Thrift',6,30,['poshmark']);
    listed('Vintage denim vest','Outerwear','Facebook Marketplace',7,32,['depop']);
    listed('Gold hoop earrings','Jewelry','Goodwill Outlet',2,14,['vinted']);
    add({title:'Corduroy pants',category:'Bottoms',source:'Facebook Marketplace',cost:6,price:30,size:'28'});
    add({title:'Tweed blazer',category:'Outerwear',source:'Wescott Thrift',cost:10,price:46,size:'M'});
    add({title:'Red wool beret',category:'Hats',source:'My closet',cost:0,price:16,size:'OS'});
    function note(plat,from,text,ago,starred,responded){st.notes.push({id:'n'+(n++)+uid(),platform:plat,from:from,text:text,date:daysAgo(ago),ts:t-ago*86400000-n*1000,starred:starred,responded:responded})}
    note('depop','vintage_vibes_22','Offered $30 for the black slip dress.',0,true,false);
    note('vinted','closetcleanout','Is the wool scarf still available?',0,false,false);
    note('poshmark','thriftqueen','Can you do $25 for the satin blouse?',1,false,false);
    note('depop','sam.wears','Would you ship the hoodie to Canada?',2,true,false);
    note('ebay','retro_finds_co','Question: are the sneakers true to size?',3,false,true);
    note('vinted','lulu_b','Thanks! Package arrived, love the cardigan.',6,false,true);
    note('depop','mia_thrifts','Bundle the denim vest and hoodie for $60?',7,true,true);
    note('poshmark','closet_by_jo','Offered $20 for the leather bag.',9,false,true);
    st.tasks=[{id:'t'+uid(),text:'Buy 50 poly mailers',done:false},{id:'t'+uid()+'b',text:'Photograph the new thrift haul',done:false},{id:'t'+uid()+'c',text:'Wash and fold the cardigans',done:true}];
    st.money={wallet:{},pending:{},direct:0,adjust:{}};
    st.settings={name:'Ray',fees:{depop:10,vinted:0,poshmark:20,ebay:13,instagram:0}};
    return normalize(st);
  }

  /* ================= EVENTS ================= */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-action]'); if(!b)return;
    var a=b.getAttribute('data-action'), id=b.getAttribute('data-id');
    switch(a){
      case 'go':if(b.getAttribute('data-notes'))ui.noteFilter=b.getAttribute('data-notes');go(b.getAttribute('data-view'),b.getAttribute('data-tab'));break;
      case 'new-item':openItem(null);break;
      case 'edit-item':if($('#kitDlg').open)$('#kitDlg').close();openItem(id);break;
      case 'mark-sold':openSold(id);break;
      case 'close-dlg':$('#itemDlg').close();break;
      case 'close-sold':$('#soldDlg').close();break;
      case 'copy-listing':copyListing();break;
      case 'gm-check':gmCheck();break;
      case 'cloud-sync':(CLOUD.dirty?cloudPush():cloudPull()).then(function(){renderSettings();toast('Synced.')});break;
      case 'cloud-conflict-dl':{var cc=store.get('rc_conflict_'+CLOUD.uid);if(cc){var bl=new Blob([cc],{type:'application/json'}),aa=document.createElement('a');aa.href=URL.createObjectURL(bl);aa.download='raylosclo-before-sync-clash-'+today()+'.json';document.body.appendChild(aa);aa.click();aa.remove();setTimeout(function(){URL.revokeObjectURL(aa.href)},1500)}break}
      case 'close-delist':closeDelist();break;
      case 'kit-posted':kitMarkPosted();break;
      case 'note-kind':ui.noteKind=b.getAttribute('data-k');renderNotes();break;
      case 'gm-add':gmAdd();break;
      case 'close-gmail':$('#gmailDlg').close();break;
      case 'gm-settings':$('#gmailDlg').close();var nb=$('.nav button[data-view=settings]');if(nb)nb.click();break;
      case 'gm-disconnect':{var tk=gm.token;gm.token='';gm.exp=0;if(tk&&window.google&&google.accounts&&google.accounts.oauth2&&google.accounts.oauth2.revoke)google.accounts.oauth2.revoke(tk,function(){});toast('Disconnected. The site no longer has access to your Gmail.');break}
      case 'paste-open':openPaste();break;
      case 'paste-read':pasteRead();break;
      case 'paste-price':{var pp=$('#p_price');if(pp)pp.value=b.getAttribute('data-v');break}
      case 'close-paste':$('#pasteDlg').close();break;
      case 'note-reply':openReply({noteId:id});break;
      case 'msg-buyer':openReply({itemId:id,tpl:b.getAttribute('data-t')==='shipped'?'tp4':'tp7'});break;
      case 'reply-copy':copyText($('#r_text').value).then(function(){flashBtn(b,'Copied ✓')},function(){toast('Couldn’t copy. Press and hold the text to copy it.')});break;
      case 'reply-share':if(navigator.share)navigator.share({text:$('#r_text').value}).catch(function(){});break;
      case 'reply-resp':{var rn=state.notes.filter(function(n){return n.id===reply.noteId})[0];if(rn){rn.responded=true;save();renderNotes();toast('Marked as responded.')}break}
      case 'close-reply':$('#replyDlg').close();break;
      case 'withdraw':{var wk=b.getAttribute('data-key'),cnt=0;state.items.forEach(function(it){if(it.sale&&it.sale.platform===wk&&!it.sale.paid){var ms=moneyState(it);if(ms==='wallet'||ms==='direct'){it.sale.paid=true;it.sale.paidDate=today();cnt++}}});if(wk!=='direct'){state.money.adjust=state.money.adjust||{};state.money.adjust[wk]=0}save();renderMoney(false);toast(cnt?('Marked '+plural(cnt,'sale')+' as paid out.'):'Cleared the fix-up amount.');break}
      case 'tpl-add':tpls().push({id:'tp'+uid(),name:'New template',text:'Hi {buyer}, '});save();renderSettings();break;
      case 'tpl-del':state.templates=tpls().filter(function(t){return t.id!==id});save();renderSettings();break;
      case 'tpl-reset':if(window.confirm('Replace your templates with the original ones?')){state.templates=defaultTemplates();save();renderSettings()}break;
      case 'open-kit':openKit(id);break;
      case 'kit-plat':openKit(kitId,b.getAttribute('data-p'));break;
      case 'kit-copy':{var ta=$('#kit_'+b.getAttribute('data-k'));if(ta)kitCopy(ta.value,b);break}
      case 'kit-copy-all':kitCopy(kitAll(),b);break;
      case 'kit-next':kitNext();break;
      case 'kit-photo':{var kit=findItem(kitId);if(kit)sharePhoto(kit);break}
      case 'kit-save-link':kitSaveLink();break;
      case 'close-kit':$('#kitDlg').close();break;
      case 'pick-photo':$('#photoFile').click();break;
      case 'remove-photo':if(pendingPhoto){URL.revokeObjectURL(pendingPhoto.url);pendingPhoto=null}removePhotoFlag=true;updatePhotoUI();break;
      case 'delete-item':if(window.confirm('Delete this item for good?')){state.items=state.items.filter(function(i){return i.id!==id});clearPhoto(id);photoDel(id).catch(function(){});save();$('#itemDlg').close();render()}break;
      case 'undo-sale':if(window.confirm('Undo this sale? The item goes back to unsold.')){var it=findItem(id);if(it){delete it.sale;save();$('#itemDlg').close();render()}}break;
      case 'item-filter':ui.itemFilter=b.getAttribute('data-f');refreshItems();break;
      case 'item-view':ui.itemView=b.getAttribute('data-v');refreshItems();break;
      case 'open-ship':openShip(id);break;
      case 'close-ship':$('#shipDlg').close();break;
      case 'sold-tab':ui.soldTab=b.getAttribute('data-tab');renderSold();break;
      case 'ship':{
        var item=findItem(id),inp=$('#track_'+id),msg=$('#shipmsg_'+id); if(!item||!inp)break;
        var v=inp.value.trim(); if(!v){msg.textContent='Add a tracking number before marking this shipped.';inp.focus();break}
        item.sale.tracking=v;item.sale.shipStatus='shipped';item.sale.shippedDate=today();save();render();break}
      case 'deliver':{var i2=findItem(id);if(i2){i2.sale.shipStatus='delivered';i2.sale.deliveredDate=today();save();render()}break}
      case 'money-period':ui.moneyPeriod=b.getAttribute('data-p');renderMoney();break;
      case 'note-filter':ui.noteFilter=b.getAttribute('data-f');renderNotes();break;
      case 'note-star':{var n=state.notes.filter(function(x){return x.id===id})[0];if(n){n.starred=!n.starred;save();renderNotes()}break}
      case 'note-del':if(window.confirm('Delete this message?')){state.notes=state.notes.filter(function(x){return x.id!==id});save();renderNotes()}break;
      case 'task-del':state.tasks=state.tasks.filter(function(x){return x.id!==id});save();renderDashboard(false);break;
      case 'mock-reset':if(window.confirm('Put the fake data back the way it started?')){photosClear();state=mockData();save();render()}break;
      case 'export':exportData();break;
      case 'import':$('#importFile').click();break;
      case 'load-sample':loadSample();break;
      case 'remove-sample':if(window.confirm('Remove all sample items and messages?'))removeSample();break;
      case 'clear-all':if(window.confirm('Delete ALL your data? This can’t be undone.')){cloudPhotosWipe();state=blank();photosClear();save();render()}break;
    }
  });
  document.addEventListener('change',function(e){
    if(e.target.id==='p_item'){toggleNewItem();return}
    if(e.target.id==='r_tpl'||e.target.id==='r_item'||e.target.id==='r_buyer'){replyText();return}
    if(e.target.id==='photoFile'){handlePhotoFile(e.target.files&&e.target.files[0]);e.target.value='';return}
    if(e.target.id==='f_cat'&&$('#photoPreview')){updatePhotoUI();return}
    var t=e.target.closest('[data-change]'); if(!t)return;
    var a=t.getAttribute('data-change'), id=t.getAttribute('data-id'), key=t.getAttribute('data-key');
    switch(a){
      case 'task-toggle':{var tk=state.tasks.filter(function(x){return x.id===id})[0];if(tk){tk.done=t.checked;save();renderDashboard(false)}break}
      case 'pack':{var it=findItem(id);if(it){it.sale.packing=it.sale.packing||{};it.sale.packing[key]=t.checked;save()}break}
      case 'tracking':{var i2=findItem(id);if(i2){i2.sale.tracking=t.value.trim();save()}break}
      case 'delist':{var i3=findItem(id);if(i3){i3.sale.delisted=i3.sale.delisted||{};i3.sale.delisted[key]=t.checked;save();renderSold()}break}
      case 'wallet':case 'pending':{var v=t.value.trim();state.money[a][key]=v===''?0:Math.max(0,num(v));save();renderMoney(false);break}
      case 'direct':{state.money.direct=Math.max(0,num(t.value));save();renderMoney(false);break}
      case 'gm-client':{state.gmail.clientId=t.value.trim();save();break}
      case 'gm-auto':{state.gmail.auto=!!t.checked;save();break}
      case 'gm-query':{state.gmail.query=t.value.trim();save();break}
      case 'adjust':{state.money.adjust=state.money.adjust||{};state.money.adjust[key]=num(t.value);save();renderMoney(false);break}
      case 'hold':{var hv=t.value.trim();state.settings.hold=state.settings.hold||{};state.settings.hold[key]=hv===''?0:Math.min(60,Math.max(0,Math.round(num(hv))));save();break}
      case 'paid':{var pi=findItem(id);if(pi&&pi.sale){pi.sale.paid=t.checked;pi.sale.paidDate=t.checked?today():'';save();renderMoney(false)}break}
      case 'tpl-name':{var tn=tpls().filter(function(x){return x.id===id})[0];if(tn){tn.name=t.value.trim()||'Template';save()}break}
      case 'tpl-text':{var tt=tpls().filter(function(x){return x.id===id})[0];if(tt){tt.text=t.value;save()}break}
      case 'fee':{var f=t.value.trim();state.settings.fees[key]=f===''?0:Math.min(100,Math.max(0,num(f)));save();break}
      case 'name':{state.settings.name=t.value.trim();save();var who=state.settings.name||store.get('rc_user')||'';$('#who').textContent=who;$('#avatar').textContent=(who.charAt(0)||'?').toUpperCase();break}
      case 'note-resp':{var n=state.notes.filter(function(x){return x.id===id})[0];if(n){n.responded=t.checked;save();renderNotes()}break}
    }
  });
  document.addEventListener('input',function(e){
    if(e.target.id==='itemQ'){ui.itemQ=e.target.value;refreshItems()}
    var lk=e.target.getAttribute&&e.target.getAttribute('data-linkkey'); if(lk)showLinkMsg(lk);
    if(e.target.id==='kit_title')updateKitCount();
  });
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(f.id==='itemForm'){e.preventDefault();saveItem()}
    else if(f.id==='soldForm'){e.preventDefault();saveSold()}
    else if(f.id==='shipForm'){e.preventDefault();saveShip()}
    else if(f.id==='pasteForm'){e.preventDefault();pasteSave()}
    else if(f.getAttribute('data-form')==='task-add'){
      e.preventDefault();var inp=$('#newTask'),v=inp.value.trim();if(!v){inp.focus();return}
      state.tasks.push({id:uid(),text:v,done:false});save();renderDashboard(false);$('#newTask').focus();
    }else if(f.getAttribute('data-form')==='note-add'){
      e.preventDefault();var txt=$('#n_text').value.trim();
      if(!txt){$('#m_ntext').textContent='Write down the message or offer.';$('#n_text').focus();return}
      state.notes.push({id:uid(),platform:$('#n_plat').value,from:$('#n_from').value.trim(),text:txt,date:today(),ts:Date.now(),starred:false,responded:false});
      save();renderNotes();
    }
  });
  $('#importFile').addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];if(f)importData(f);e.target.value=''});


  /* ================= CLOUD (Supabase): real accounts and saving ================= */
  var syncT=null;
  function setSync(kind,msg){var el=$('#syncStat');if(!el)return;el.className='syncstat'+(kind==='bad'?' bad':'');el.textContent=msg||'';el.setAttribute('data-k',kind)}
  function sessSave(){try{if(CLOUD.sess)window.localStorage.setItem('rc_session',JSON.stringify({sess:CLOUD.sess,uid:CLOUD.uid,email:CLOUD.email}));else window.localStorage.removeItem('rc_session')}catch(e){}}
  function sessRead(){try{return JSON.parse(window.localStorage.getItem('rc_session')||'null')}catch(e){return null}}
  function secretKey(k){
    if(/^sb_secret_/.test(k))return true;
    var p=k.split('.'); if(p.length===3){try{var j=JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/')));if(j.role==='service_role')return true}catch(e){}}
    return false;
  }
  function sb(method,path,o){
    o=o||{}; var h={apikey:CLOUD.key}, k;
    if(o.token)h.Authorization='Bearer '+o.token;
    if(o.json!==undefined)h['Content-Type']='application/json';
    if(o.headers)for(k in o.headers)h[k]=o.headers[k];
    return fetch(CLOUD.url+path,{method:method,headers:h,body:o.json!==undefined?JSON.stringify(o.json):o.body});
  }
  function expiredErr(){var e=new Error('expired');e.expired=true;return e}
  function setSession(j){
    CLOUD.sess={access_token:j.access_token,refresh_token:j.refresh_token||(CLOUD.sess&&CLOUD.sess.refresh_token)||'',expires_at:Date.now()+((+j.expires_in||3600)*1000)};
    if(j.user){CLOUD.uid=j.user.id;CLOUD.email=j.user.email||CLOUD.email}
    sessSave();
  }
  function cloudRefresh(){
    if(CLOUD.refreshing)return CLOUD.refreshing;
    var s=CLOUD.sess; if(!s||!s.refresh_token)return Promise.reject(expiredErr());
    CLOUD.refreshing=sb('POST','/auth/v1/token?grant_type=refresh_token',{json:{refresh_token:s.refresh_token}}).then(function(r){
      return r.json().catch(function(){return {}}).then(function(j){
        if(!r.ok||!j.access_token){if(r.status>=500)throw new Error('server');throw expiredErr()}
        setSession(j);return CLOUD.sess.access_token});
    }).then(function(t){CLOUD.refreshing=null;return t},function(e){CLOUD.refreshing=null;throw e});
    return CLOUD.refreshing;
  }
  function cloudToken(){var s=CLOUD.sess;if(!s)return Promise.reject(expiredErr());return (s.expires_at-Date.now()<60000)?cloudRefresh():Promise.resolve(s.access_token)}
  function sbAuthed(method,path,o){
    o=o||{};
    return cloudToken().then(function(t){o.token=t;return sb(method,path,o)}).then(function(r){
      if(r.status!==401)return r;
      return cloudRefresh().then(function(t){o.token=t;return sb(method,path,o)});
    });
  }
  function cloudFetchRemote(){
    return sbAuthed('GET','/rest/v1/rc_state?select=data,version,updated_at&user_id=eq.'+CLOUD.uid).then(function(r){
      if(!r.ok)return r.text().then(function(t){throw new Error('http '+r.status+(t?' '+t.slice(0,100):''))});
      return r.json().then(function(rows){return rows&&rows.length?rows[0]:null});
    });
  }
  function verSet(v){CLOUD.ver=v;store.set('rc_ver_'+CLOUD.uid,String(v))}
  function dirtySet(f){CLOUD.dirty=f;if(f)store.set('rc_dirty_'+CLOUD.uid,'1');else store.del('rc_dirty_'+CLOUD.uid)}
  function cloudDirty(){
    if(!CLOUD.on||!CLOUD.uid||CLOUD.applying)return;
    dirtySet(true); setSync('pending','Saving…'); clearTimeout(syncT); syncT=setTimeout(cloudPush,1500);
  }
  function cloudFail(e){
    if(e&&e.expired){cloudLogout(true,'Your session ended. Please log in again.');return}
    var off=(e instanceof TypeError)||!navigator.onLine;
    setSync('bad',off?'Offline. Will sync when you’re back.':'Couldn’t sync. Tap to retry.');
    clearTimeout(CLOUD.retry); CLOUD.retry=setTimeout(function(){if(CLOUD.dirty)cloudPush();else cloudPull()},30000);
  }
  function applyRemote(row){
    CLOUD.applying=true;
    try{state=normalize(row.data);store.set(DATA_KEY,JSON.stringify(state))}finally{CLOUD.applying=false}
    verSet(row.version); dirtySet(false); CLOUD.lastSync=Date.now(); render();
  }
  function cloudConflict(){
    return cloudFetchRemote().then(function(row){
      if(!row){verSet(0);CLOUD.again=true;return}
      if(CLOUD.dirty){try{store.set('rc_conflict_'+CLOUD.uid,JSON.stringify(state))}catch(e){}}
      applyRemote(row); setSync('ok','Saved ✓');
      toast('Your other device had newer changes, so I loaded those. A copy of what was on this device is in Settings.');
      return cloudPhotosSync();
    });
  }
  function cloudPush(){
    if(!CLOUD.on||!CLOUD.uid)return Promise.resolve();
    if(CLOUD.busy){CLOUD.again=true;return Promise.resolve()}
    CLOUD.busy=true; clearTimeout(syncT); setSync('pending','Saving…');
    var snap=JSON.stringify(state), ver=CLOUD.ver, first=(ver===0), body=JSON.parse(snap), req;
    if(first)req=sbAuthed('POST','/rest/v1/rc_state',{json:{user_id:CLOUD.uid,data:body,version:1},headers:{Prefer:'return=representation'}});
    else req=sbAuthed('PATCH','/rest/v1/rc_state?user_id=eq.'+CLOUD.uid+'&version=eq.'+ver,{json:{data:body,version:ver+1,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
    return req.then(function(r){
      if(r.status===409)return cloudConflict();
      if(!r.ok)return r.text().then(function(t){throw new Error('http '+r.status+(t?' '+t.slice(0,100):''))});
      return r.json().then(function(rows){
        if(!rows||!rows.length)return cloudConflict();
        verSet(rows[0].version);
        if(JSON.stringify(state)===snap)dirtySet(false);else CLOUD.again=true;
        CLOUD.lastSync=Date.now(); setSync('ok','Saved ✓'); return cloudPhotosSync();
      });
    }).catch(cloudFail).then(function(){CLOUD.busy=false;if(CLOUD.again){CLOUD.again=false;cloudDirty()}});
  }
  function cloudPull(){
    if(!CLOUD.on||!CLOUD.uid||CLOUD.busy)return Promise.resolve();
    return cloudFetchRemote().then(function(row){
      if(!row)return cloudNewAccount();
      if(row.version>CLOUD.ver){if(CLOUD.dirty)return cloudConflict();applyRemote(row);setSync('ok','Saved ✓');return cloudPhotosSync()}
      if(CLOUD.dirty)return cloudPush();
      CLOUD.lastSync=CLOUD.lastSync||Date.now(); setSync('ok','Saved ✓'); return cloudPhotosSync();
    }).catch(cloudFail);
  }
  function legacyPhotosIn(){
    return new Promise(function(res){
      if(!window.indexedDB)return res();
      var r=indexedDB.open('raylosclo',1);
      r.onupgradeneeded=function(){r.result.createObjectStore('photos')};
      r.onerror=function(){res()};
      r.onsuccess=function(){
        var d=r.result,out={},c;
        try{c=d.transaction('photos','readonly').objectStore('photos').openCursor()}catch(e){d.close();return res()}
        c.onsuccess=function(){var cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else{d.close();Promise.all(Object.keys(out).map(function(k){setPhoto(k,out[k]);return photoPutLocal(k,out[k]).catch(function(){})})).then(function(){res()},function(){res()})}};
        c.onerror=function(){d.close();res()};
      };
    });
  }
  function cloudNewAccount(){
    var legacy=null; try{legacy=JSON.parse(window.localStorage.getItem('rc_data')||'null')}catch(e){}
    var has=legacy&&Array.isArray(legacy.items)&&legacy.items.length>0&&!state.items.length;
    if(has&&!store.get('rc_legacy_no')){
      if(window.confirm('I found '+plural(legacy.items.length,'item')+' saved in this browser from before accounts. Move them into your new account?')){
        state=normalize(legacy); store.set(DATA_KEY,JSON.stringify(state));
        return legacyPhotosIn().then(function(){render();verSet(0);return cloudPush()});
      }
      store.set('rc_legacy_no','1');
    }
    store.set(DATA_KEY,JSON.stringify(state)); verSet(0); return cloudPush();
  }
  /* ---- photos in private cloud storage ---- */
  function cloudPhotoPath(id){return '/storage/v1/object/photos/'+CLOUD.uid+'/'+id+'.jpg'}
  function cloudPhotoUp(id,blob){
    if(!CLOUD.on||!CLOUD.uid)return Promise.resolve();
    CLOUD.upping[id]=1;
    return sbAuthed('POST',cloudPhotoPath(id),{body:blob,headers:{'Content-Type':'image/jpeg','x-upsert':'true'}}).then(function(r){
      if(!r.ok)throw new Error('photo '+r.status);
      var it=findItem(id); if(it&&it.photoCloud!==true){it.photoCloud=true;save()}
    }).catch(function(e){cloudFail(e)}).then(function(){delete CLOUD.upping[id]});
  }
  function cloudPhotoDel(id){
    if(!CLOUD.on||!CLOUD.uid)return Promise.resolve();
    var it=findItem(id); if(it&&it.photoCloud!==false){it.photoCloud=false;save()}
    return sbAuthed('DELETE',cloudPhotoPath(id)).catch(function(){});
  }
  function cloudPhotoDown(id){
    return sbAuthed('GET','/storage/v1/object/authenticated/photos/'+CLOUD.uid+'/'+id+'.jpg').then(function(r){
      if(r.status===404||r.status===400){var it=findItem(id);if(it&&it.photoCloud===true){it.photoCloud=false;save()}return false}
      if(!r.ok)throw new Error('photo '+r.status);
      return r.blob().then(function(b){setPhoto(id,b);return photoPutLocal(id,b).catch(function(){}).then(function(){return true})});
    });
  }
  function cloudPhotosSync(){
    if(!CLOUD.on||!CLOUD.uid)return Promise.resolve();
    var jobs=[];
    state.items.forEach(function(it){
      var local=!!PH[it.id];
      if(it.photoCloud===true&&!local)jobs.push(cloudPhotoDown(it.id));
      else if(it.photoCloud===undefined&&local&&!CLOUD.upping[it.id])jobs.push(photoGetLocal(it.id).then(function(b){return b?cloudPhotoUp(it.id,b):null}));
      else if(it.photoCloud===false&&local&&!CLOUD.upping[it.id]){clearPhoto(it.id);jobs.push(photoDelLocal(it.id).catch(function(){}))}
    });
    if(!jobs.length)return Promise.resolve();
    return Promise.all(jobs.map(function(p){return Promise.resolve(p).catch(function(){})})).then(function(){render()});
  }
  function cloudPhotosWipe(){
    if(!CLOUD.on||!CLOUD.uid)return;
    state.items.forEach(function(it){if(it.photoCloud===true)sbAuthed('DELETE',cloudPhotoPath(it.id)).catch(function(){})});
  }
  /* ---- log in / create account / forgot password ---- */
  function loginSay(t,good){var e=$('#loginError');if(!e)return;e.textContent=t||'';e.style.color=good?'var(--brindle)':''}
  function authMsg(j,fallback){
    var m=(j&&(j.error_description||j.msg||j.message||j.error))||'';
    if(/invalid login credentials/i.test(m))return 'That email and password don’t match. Check them, or tap Forgot password.';
    if(/email not confirmed/i.test(m))return 'Check your email and tap the confirmation link first. Then log in.';
    if(/already registered|already been registered/i.test(m))return 'That email already has an account. Tap Log in instead.';
    if(/password should|weak password|at least/i.test(m))return 'Choose a longer password (at least 8 characters).';
    if(/rate limit|too many|security purposes/i.test(m))return 'Too many tries. Wait a minute and try again.';
    if(/signups? (not allowed|disabled)|signup is disabled/i.test(m))return 'New accounts are switched off for this site.';
    return fallback+(m?' ('+m+')':'');
  }
  function netErr(e){loginSay((e instanceof TypeError)?'I couldn’t reach the server. Check your internet and try again.':'Something went wrong. Try again.')}
  function setLoginMode(m){
    CLOUD.mode=m;
    var sub=$('.login-panel .sub'), go=$('#loginForm .go'), foot=$('.login-foot'), su=$('#signupBtn'), pw=$('#password'), ef=$('#email').closest('.field'), fg=$('.row-links');
    ef.style.display=(m==='newpw')?'none':''; fg.style.display=(m==='login')?'':'none';
    $('label[for=password]').textContent=(m==='newpw')?'New password':'Password';
    pw.setAttribute('autocomplete',m==='login'?'current-password':'new-password');
    sub.textContent={login:'Log in to see your closet.',signup:'Create your account. It takes a minute.',newpw:'Choose a new password.'}[m];
    go.innerHTML={login:'Log in &rarr;',signup:'Create account &rarr;',newpw:'Save new password &rarr;'}[m];
    if(foot){foot.style.display=(m==='newpw')?'none':'';if(foot.firstChild)foot.firstChild.textContent=(m==='signup')?'Already have an account? ':'New here? ';su.textContent=(m==='signup')?'Log in':'Create an account'}
    loginSay('');
  }
  function cloudLoginUI(){
    var n=$('.login-panel .note'); if(n)n.textContent='Your closet is saved to your account, so it’s the same on your phone and your laptop.';
    setLoginMode('login');
  }
  function cloudAuthSubmit(){
    if(CLOUD.blocked){loginSay(CLOUD.blocked);return}
    var email=$('#email').value.trim(), pw=$('#password').value, btn=$('#loginForm .go'), m=CLOUD.mode;
    if(m!=='newpw'&&(!email||email.indexOf('@')<1||email.indexOf('.',email.indexOf('@'))<0)){loginSay('Enter the email address you use for this site.');$('#email').focus();return}
    if(!pw){loginSay('Enter your password.');$('#password').focus();return}
    if((m==='signup'||m==='newpw')&&pw.length<8){loginSay('Choose a password with at least 8 characters.');$('#password').focus();return}
    btn.disabled=true; loginSay('One moment…',true);
    var done=function(){btn.disabled=false};
    if(m==='newpw'){
      sb('PUT','/auth/v1/user',{token:CLOUD.sess.access_token,json:{password:pw}}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){
        if(!r.ok){loginSay(authMsg(j,'Couldn’t save the new password.'));return}
        setLoginMode('login'); cloudEnter();
      })}).catch(netErr).then(done); return;
    }
    if(m==='signup'){
      sb('POST','/auth/v1/signup',{json:{email:email,password:pw}}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){
        if(!r.ok){loginSay(authMsg(j,'Couldn’t create the account.'));return}
        if(j.access_token){setSession(j);if(!CLOUD.email)CLOUD.email=email;cloudEnter();return}
        setLoginMode('login'); $('#email').value=email; loginSay('Account created. Check your email for a confirmation link, tap it, then log in here.',true);
      })}).catch(netErr).then(done); return;
    }
    sb('POST','/auth/v1/token?grant_type=password',{json:{email:email,password:pw}}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){
      if(!r.ok||!j.access_token){loginSay(authMsg(j,'Couldn’t log in.'));return}
      setSession(j); if(!CLOUD.email)CLOUD.email=email; cloudEnter();
    })}).catch(netErr).then(done);
  }
  function cloudForgot(){
    if(CLOUD.blocked){loginSay(CLOUD.blocked);return}
    var email=$('#email').value.trim(); if(!email||email.indexOf('@')<1){loginSay('Type your email above first, then tap Forgot password.');$('#email').focus();return}
    loginSay('Sending…',true);
    sb('POST','/auth/v1/recover',{json:{email:email}}).then(function(r){
      if(r.ok)loginSay('If that email has an account, a reset link is on its way. Tap it, then choose a new password.',true);
      else r.json().catch(function(){return {}}).then(function(j){loginSay(authMsg(j,'Couldn’t send the reset email.'))});
    }).catch(netErr);
  }
  function cloudEnter(){
    var uid=CLOUD.uid;
    DATA_KEY='rc_cloud_'+uid; IDB_NAME='raylosclo_u_'+uid;
    if(idbRef){try{idbRef.close()}catch(e){}idbRef=null}
    Object.keys(PH).forEach(clearPhoto);
    state=load(); CLOUD.ver=+store.get('rc_ver_'+uid)||0; CLOUD.dirty=store.get('rc_dirty_'+uid)==='1';
    store.set('rc_user',CLOUD.email||'account');
    loginEl.hidden=true; appEl.hidden=false; $('#password').value='';
    setSync('pending','Syncing…'); show(currentView());
    photoAll().then(function(map){Object.keys(map).forEach(function(k){setPhoto(k,map[k])});render()}).catch(function(){}).then(function(){return cloudPull()});
  }
  function cloudLogout(forced,msg){
    function finish(){
      var tok=CLOUD.sess&&CLOUD.sess.access_token, uid=CLOUD.uid;
      if(tok&&!forced)sb('POST','/auth/v1/logout',{token:tok}).catch(function(){});
      clearTimeout(syncT);clearTimeout(CLOUD.retry);
      CLOUD.sess=null; sessSave();
      if(idbRef){try{idbRef.close()}catch(e){}idbRef=null}
      if(!forced){store.del('rc_cloud_'+uid);store.del('rc_ver_'+uid);store.del('rc_dirty_'+uid);try{indexedDB.deleteDatabase('raylosclo_u_'+uid)}catch(e){}}
      Object.keys(PH).forEach(clearPhoto);
      CLOUD.uid='';CLOUD.email='';CLOUD.ver=0;CLOUD.dirty=false;CLOUD.busy=false;
      DATA_KEY='rc_data'; IDB_NAME='raylosclo'; state=blank(); store.del('rc_user');
      appEl.hidden=true; loginEl.hidden=false; $('#password').value=''; setSync('',''); document.title='Raylos’Clo';
      if(location.hash)history.replaceState(null,'',location.pathname+location.search);
      setLoginMode('login'); if(msg)loginSay(msg,!forced); $('#email').focus();
    }
    if(!forced&&CLOUD.dirty){cloudPush().then(function(){if(CLOUD.dirty&&!window.confirm('Some changes haven’t been saved to your account yet. Log out anyway and lose them?'))return;finish()})}
    else finish();
  }
  function hashSession(){
    var h=location.hash||''; if(h.indexOf('access_token=')<0&&h.indexOf('error_description=')<0)return null;
    var p={}; h.replace(/^#/,'').split('&').forEach(function(x){var kv=x.split('=');if(kv[0])p[decodeURIComponent(kv[0])]=decodeURIComponent((kv.slice(1).join('=')||'').replace(/\+/g,' '))});
    history.replaceState(null,'',location.pathname+location.search);
    return p;
  }
  function accountCardHtml(){
    if(!CLOUD.on||!CLOUD.uid)return '';
    var conflict=!!store.get('rc_conflict_'+CLOUD.uid);
    var line=CLOUD.dirty?'Changes are waiting to be saved.':(CLOUD.lastSync?'Last saved '+new Date(CLOUD.lastSync).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+'.':'Up to date.');
    return '<div class="card" style="--accent:var(--sage)"><h2>Your account</h2><p style="margin:0 0 6px">Signed in as <b>'+esc(CLOUD.email)+'</b>. Your closet is saved to your account, so it’s the same on every device you log in on.</p><p style="margin:0 0 10px;font-size:15px">'+esc(line)+'</p><div class="btnrow2"><button type="button" class="btn" data-action="cloud-sync">Sync now</button>'+(conflict?'<button type="button" class="btn secondary" data-action="cloud-conflict-dl">Download my copy from before the last sync clash</button>':'')+'</div></div>';
  }
  function cloudBoot(){
    function localBoot(){var saved=store.get('rc_user');if(saved)enter(saved)}
    fetch('config.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(cfg){
      var url=cfg?String(cfg.supabaseUrl||'').trim().replace(/\/+$/,''):'', key=cfg?String(cfg.supabaseKey||'').trim():'';
      if(!url||!key||!/^https:\/\//.test(url)||/YOUR|example/i.test(url+key)){localBoot();return}
      CLOUD.on=true; CLOUD.url=url; CLOUD.key=key;
      cloudLoginUI();
      if(secretKey(key)){CLOUD.blocked='The site’s config.json has the SECRET key in it. Replace it with the publishable (or anon) key, then reload.';loginSay(CLOUD.blocked);return}
      var hs=hashSession();
      if(hs&&hs.access_token){
        CLOUD.sess={access_token:hs.access_token,refresh_token:hs.refresh_token||'',expires_at:Date.now()+((+hs.expires_in||3600)*1000)};
        sb('GET','/auth/v1/user',{token:hs.access_token}).then(function(r){if(!r.ok)throw new Error('bad');return r.json()}).then(function(u){
          CLOUD.uid=u.id;CLOUD.email=u.email||'';sessSave();
          if(hs.type==='recovery'){setLoginMode('newpw');loginSay('Choose a new password for '+CLOUD.email+'.',true)}else cloudEnter();
        }).catch(function(){CLOUD.sess=null;loginSay('That link didn’t work. It may have expired. Ask for a new one.')});
        return;
      }
      if(hs&&hs.error_description){loginSay(hs.error_description)}
      var sv=sessRead();
      if(sv&&sv.sess&&sv.uid){CLOUD.sess=sv.sess;CLOUD.uid=sv.uid;CLOUD.email=sv.email||'';cloudEnter()}
    });
  }
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&CLOUD.on&&CLOUD.uid&&!appEl.hidden&&!document.querySelector('dialog[open]'))cloudPull()});
  window.addEventListener('online',function(){if(CLOUD.on&&CLOUD.uid)(CLOUD.dirty?cloudPush():cloudPull())});
  setInterval(function(){if(!document.hidden&&CLOUD.on&&CLOUD.uid&&!appEl.hidden&&!CLOUD.busy&&!document.querySelector('dialog[open]'))cloudPull()},60000);
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='syncStat'&&e.target.getAttribute('data-k')==='bad'){CLOUD.dirty?cloudPush():cloudPull()}});

  /* ---------- auth (demo only) ---------- */
  function enter(email){
    store.set('rc_user',email);
    loginEl.hidden=true; appEl.hidden=false;
    show(currentView());
  }
  function leave(){
    if(CLOUD.on){cloudLogout(false);return}
    store.del('rc_user');
    appEl.hidden=true; loginEl.hidden=false;
    $('#password').value=''; $('#loginError').textContent='';
    document.title='Raylos’Clo';
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    $('#email').focus();
  }
  $('#loginForm').addEventListener('submit',function(e){
    e.preventDefault();
    if(CLOUD.on){cloudAuthSubmit();return}
    var email=$('#email').value.trim(), pw=$('#password').value, err=$('#loginError');
    if(!email){err.textContent='Enter your email address.';$('#email').focus();return}
    if(email.indexOf('@')<1||email.indexOf('.',email.indexOf('@'))<0){err.textContent='That email doesn’t look right. Check for a missing @ or dot.';$('#email').focus();return}
    if(!pw){err.textContent='Enter your password.';$('#password').focus();return}
    err.textContent='';enter(email);
  });
  $('#demoBtn').addEventListener('click',function(){
    $('#email').value='demo@raylosclo.com';$('#password').value='demo-password';$('#loginError').textContent='';
    if($('#loginForm').requestSubmit)$('#loginForm').requestSubmit();else enter('demo@raylosclo.com');
  });
  $('#forgotBtn').addEventListener('click',function(){if(CLOUD.on){cloudForgot();return}$('#loginError').textContent='Password reset isn’t part of the demo yet.'});
  $('#signupBtn').addEventListener('click',function(){if(CLOUD.on){setLoginMode(CLOUD.mode==='signup'?'login':'signup');return}$('#loginError').textContent='Creating accounts isn’t part of the demo yet.'});
  $('#logoutBtn').addEventListener('click',leave);
  $('#bellBtn').addEventListener('click',function(){go('notifications')});
  $('#gSearch').addEventListener('submit',function(e){e.preventDefault();var q=$('#gQ').value.trim();$('#gQ').value='';pendingQ=q;go('items')});
  $all('.nav button').forEach(function(b){b.addEventListener('click',function(){go(b.getAttribute('data-view'))})});
  window.addEventListener('hashchange',function(){if(!appEl.hidden)show(currentView())});

  /* ---------- start ---------- */
  if(MOCK){$all('.topbar,.ah-left').forEach(function(t){var b=document.createElement('span');b.className='mockbadge';b.textContent='Mock version · fake data';t.insertBefore(b,t.firstChild)});var n=$('.login-panel .note');if(n)n.textContent='Mock version: any email and password will work.'}
  photoAll().then(function(map){if(CLOUD.on)return;Object.keys(map).forEach(function(k){setPhoto(k,map[k])});if(!appEl.hidden)render()}).catch(function(){});
  if(MOCK)enter('ray@raylosclo.com');else cloudBoot();
})();
