/* Raylos'Clo: Supabase: accounts, saving, photo storage, log in */
'use strict';
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
