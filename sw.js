/* Raylos'Clo service worker: keeps the app's own files (the "shell") so it opens with no signal.
   It only ever stores files from this website. Your data, photos and log-in (Supabase),
   Gmail and the other tools from other websites always go straight to the internet. */
'use strict';
var VERSION='rc-shell-v1';
var SHELL=[
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/cat.png',
  'assets/icon-coat.png',
  'assets/icon-hanger.png',
  'assets/icon-shirt.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/rack.png',
  'assets/wordmark.png',
  'css/app.css',
  'css/mobile.css',
  'fonts/karumbi.woff',
  'js/attention.js',
  'js/auth.js',
  'js/cloud.js',
  'js/core.js',
  'js/dashboard.js',
  'js/dialogs.js',
  'js/events.js',
  'js/fields.js',
  'js/gmail.js',
  'js/items.js',
  'js/kit.js',
  'js/mock.js',
  'js/money.js',
  'js/notifications.js',
  'js/paste.js',
  'js/receipt.js',
  'js/settings.js',
  'js/sheet.js',
  'js/sold.js',
  'js/start.js',
];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k.indexOf('rc-shell-')===0&&k!==VERSION}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
/* Network first, so you always get the newest version when you're online.
   If there's no signal, use the saved copy. */
self.addEventListener('fetch',function(e){
  var req=e.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/sw.js'))return;
  /* config.json (the public Supabase address) is saved after the first visit, so the app
     still knows it's your cloud account when you open it offline */
  e.respondWith(
    fetch(req).then(function(res){
      if(res.ok&&res.type==='basic'){var copy=res.clone();caches.open(VERSION).then(function(c){c.put(req,copy)})}
      return res;
    }).catch(function(){
      return caches.match(req,{ignoreSearch:true}).then(function(hit){
        if(hit)return hit;
        if(req.mode==='navigate')return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
