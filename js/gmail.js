/* Raylos'Clo: Gmail (read-only) sale emails */
'use strict';
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
function gmOpenDialog(inner){var d=$('#gmailDlg');d.innerHTML='<div class="dlg">'+inner+'</div>';if(!d.open)d.showModal()}
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
