/* Raylos'Clo: background remover for item photos.
   Runs on this phone or computer with IMG.LY's free open-source remover
   (@imgly/background-removal, AGPL-3.0). The photo is never uploaded for this.
   The first use downloads the remover (about 40 MB); after that the browser keeps it. */
'use strict';
var BG_LIB='https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
var BG_FILL={white:'#FFFFFF',bone:'#F8F4E7'};
var BG={lib:null,cut:null,before:null,choice:'white',busy:false,token:0};

function bgReset(){BG.cut=null;BG.before=null;BG.busy=false;BG.token++;bgUI()}

function bgLoad(){
  if(!BG.lib)BG.lib=import(BG_LIB).then(function(m){return m.removeBackground||m.default}).catch(function(e){BG.lib=null;throw e});
  return BG.lib;
}

/* Put the cut-out on a plain colour (JPEG), or keep it see-through (PNG) */
function bgCompose(cut,choice){
  if(choice==='clear')return Promise.resolve(cut);
  return createImageBitmap(cut).then(function(bmp){
    var c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;
    var g=c.getContext('2d');g.fillStyle=BG_FILL[choice]||'#FFFFFF';g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0);
    if(bmp.close)bmp.close();
    return new Promise(function(res,rej){c.toBlob(function(b){b?res(b):rej(new Error('canvas'))},'image/jpeg',0.92)});
  });
}

function bgSetPending(blob){
  if(pendingPhoto&&pendingPhoto!==BG.before)URL.revokeObjectURL(pendingPhoto.url);
  pendingPhoto={blob:blob,url:URL.createObjectURL(blob)};removePhotoFlag=false;
}

function bgSay(t){var m=$('#m_bg');if(m)m.textContent=t||''}

function bgUI(){
  var b=$('#photoBg'),o=$('#bgOpts');if(!b||!o)return;
  var has=!!currentPhotoSrc();
  b.hidden=!has||!!BG.cut;b.disabled=BG.busy;b.textContent=BG.busy?'Removing background…':'Remove background';
  o.hidden=!BG.cut;
  $all('#bgOpts [data-bg]').forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-bg')===BG.choice))});
  var pv=$('#photoPreview');if(pv)pv.classList.toggle('see-through',!!BG.cut&&BG.choice==='clear');
}

function bgRemove(){
  var src=currentPhotoSrc();if(!src||BG.busy)return;
  var my=++BG.token;BG.busy=true;bgUI();
  BG.before=pendingPhoto?{blob:pendingPhoto.blob,url:pendingPhoto.url}:null;
  var firstTime=true;
  bgSay('Getting the background remover ready… The first time takes a minute (about 40 MB, Wi-Fi is best).');
  var cfg={model:'isnet_quint8',device:'cpu',output:{format:'image/png',quality:0.9},
    progress:function(key,cur,total){
      if(my!==BG.token)return;
      if(/^fetch/.test(key)&&total){bgSay('Downloading the background remover… '+Math.min(99,Math.round(cur/total*100))+'%')}
      else if(/compute/.test(key)&&firstTime){firstTime=false;bgSay('Removing the background…')}
    }};
  Promise.all([bgLoad(),fetch(src).then(function(r){return r.blob()})]).then(function(r){
    if(my!==BG.token)return;
    return r[0](r[1],cfg).then(function(cut){
      if(my!==BG.token)return;
      BG.cut=cut;return bgCompose(cut,BG.choice).then(function(out){
        if(my!==BG.token)return;
        bgSetPending(out);BG.busy=false;bgSay('');updatePhotoUI();
        toast('Background removed. Tap Undo to go back.');
      });
    });
  }).catch(function(e){
    if(my!==BG.token)return;
    BG.busy=false;BG.cut=null;bgUI();
    bgSay(navigator.onLine===false?'You’re offline. The background remover needs the internet the first time.':'Couldn’t remove the background on this device. Try again, or try a smaller photo.');
    if(window.console)console.warn('background removal failed',e);
  });
}

function bgPick(choice){
  if(!BG.cut||BG.busy||!BG_FILL[choice]&&choice!=='clear')return;
  BG.choice=choice;var my=BG.token;
  bgCompose(BG.cut,choice).then(function(out){if(my!==BG.token)return;bgSetPending(out);updatePhotoUI()});
}

function bgUndo(){
  if(!BG.cut)return;
  if(pendingPhoto&&pendingPhoto!==BG.before)URL.revokeObjectURL(pendingPhoto.url);
  pendingPhoto=BG.before?{blob:BG.before.blob,url:URL.createObjectURL(BG.before.blob)}:null;
  BG.cut=null;BG.before=null;BG.token++;bgSay('');updatePhotoUI();
}
