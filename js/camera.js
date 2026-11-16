/* Raylos'Clo: Camera that stays open, so you can take several item photos in a row.
   Each shot goes straight into the item form. If the browser can't open the camera
   (no permission, or the page isn't on https), it falls back to the phone's own camera app. */
'use strict';
var cam={stream:null,facing:'environment',taken:0};
function camSupported(){return !!(window.isSecureContext&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)}
function camSay(t){var m=$('#camMsg');if(m)m.textContent=t||''}
function camStop(){if(cam.stream){cam.stream.getTracks().forEach(function(t){t.stop()});cam.stream=null}var v=$('#camVideo');if(v)v.srcObject=null}
function camStart(){
  camStop(); camSay('Opening the camera…'); $('#camShutter').disabled=true;
  return navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cam.facing},width:{ideal:1920},height:{ideal:1920}}}).then(function(s){
    if(!$('#camDlg').open){s.getTracks().forEach(function(t){t.stop()});return}
    cam.stream=s; var v=$('#camVideo'); v.srcObject=s; v.classList.toggle('mirror',cam.facing==='user');
    return v.play().catch(function(){}).then(function(){camSay('');camUpdate()});
  }).catch(function(err){
    var denied=err&&(err.name==='NotAllowedError'||err.name==='SecurityError');
    camSay(denied?'The camera is blocked for this site. Allow camera access in your browser settings, or use your phone’s camera app instead.':'Couldn’t open the camera. Use your phone’s camera app instead.');
    $('#camFallback').hidden=false;
  });
}
function camUpdate(){
  var left=MAXPHOTOS-gal.length, sh=$('#camShutter');
  sh.disabled=!cam.stream||left<=0;
  $('#camCount').textContent=cam.taken?(cam.taken===1?'1 photo taken':cam.taken+' photos taken'):'Tap the circle to take a photo';
  if(left<=0)camSay('That’s the most photos one item can have ('+MAXPHOTOS+').');
  var last=gal[gal.length-1];
  $('#camLast').innerHTML=cam.taken&&last?'<img src="'+last.url+'" alt="Last photo taken">':'';
}
function openCamera(){
  if(!camSupported()){$('#photoCam').click();return}
  if(gal.length>=MAXPHOTOS){var m=$('#m_photo');if(m)m.textContent='That’s the most photos one item can have ('+MAXPHOTOS+'). Remove one to add another.';return}
  var d=$('#camDlg'); cam.taken=0;
  d.innerHTML='<div class="cam">'+
    '<div class="cam-view"><video id="camVideo" playsinline muted autoplay></video><div class="cam-flash" id="camFlash"></div></div>'+
    '<p class="cam-msg" id="camMsg" aria-live="polite"></p>'+
    '<button type="button" class="btn small secondary" id="camFallback" data-action="cam-fallback" hidden>Use the camera app</button>'+
    '<div class="cam-bar">'+
      '<div class="cam-last" id="camLast"></div>'+
      '<button type="button" class="cam-shutter" id="camShutter" data-action="cam-shot" aria-label="Take photo" disabled></button>'+
      '<button type="button" class="btn small secondary" data-action="cam-flip" aria-label="Switch between front and back camera">Flip</button>'+
    '</div>'+
    '<div class="cam-foot"><span id="camCount" aria-live="polite"></span><button type="button" class="btn" data-action="cam-done">Done</button></div>'+
  '</div>';
  d.showModal(); camStart();
}
function camShot(){
  var v=$('#camVideo'); if(!cam.stream||!v.videoWidth||gal.length>=MAXPHOTOS)return;
  var w=v.videoWidth,h=v.videoHeight,k=Math.min(1,900/Math.max(w,h)),c=document.createElement('canvas');
  c.width=Math.round(w*k);c.height=Math.round(h*k);
  var g=c.getContext('2d'); if(cam.facing==='user'){g.translate(c.width,0);g.scale(-1,1)} g.drawImage(v,0,0,c.width,c.height);
  var f=$('#camFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  c.toBlob(function(bl){
    if(!bl){camSay('Couldn’t take that photo. Try again.');return}
    addGalBlob(bl); cam.taken++; camUpdate();
  },'image/jpeg',0.82);
}
function camDone(){$('#camDlg').close()}
document.addEventListener('close',function(e){if(e.target&&e.target.id==='camDlg'){camStop();e.target.innerHTML=''}},true);
document.addEventListener('visibilitychange',function(){var d=$('#camDlg');if(!d||!d.open)return;if(document.hidden)camStop();else camStart()});
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('#camDlg [data-action]'); if(!b)return;
  var a=b.getAttribute('data-action');
  if(a==='cam-shot')camShot();
  else if(a==='cam-flip'){cam.facing=cam.facing==='user'?'environment':'user';camStart()}
  else if(a==='cam-done')camDone();
  else if(a==='cam-fallback'){camDone();$('#photoCam').click()}
});
