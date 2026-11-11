/* Raylos'Clo: Start the app */
'use strict';
if(MOCK&&!store.get('rc_data')){state=mockData();save()}
/* ---------- start ---------- */
if(MOCK){$all('.topbar,.ah-left').forEach(function(t){var b=document.createElement('span');b.className='mockbadge';b.textContent='Mock version · fake data';t.insertBefore(b,t.firstChild)});var n=$('.login-panel .note');if(n)n.textContent='Mock version: any email and password will work.'}
photoAll().then(function(map){if(CLOUD.on)return;Object.keys(map).forEach(function(k){setPhoto(k,map[k])});if(!appEl.hidden)render()}).catch(function(){});
if(MOCK)enter('ray@raylosclo.com');else cloudBoot();
/* ---------- home screen app: keep the app's own files for when there's no signal ---------- */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
}
