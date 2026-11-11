/* Raylos'Clo: background remover for item photos.
   Runs on this phone or computer with IMG.LY's free open-source remover
   (@imgly/background-removal, AGPL-3.0). The photo is never uploaded for this.
   The first use downloads the remover (about 90 MB); after that the browser keeps it.

   The remover gives a "maybe" score for every pixel. We then clean it up so the
   result looks like Depop's: every pixel is either fully kept or fully removed,
   loose bits of floor are dropped, and unsure patches inside the item are filled in. */
'use strict';
var BG_LIB='https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
var BG_MODELS=['isnet_fp16','isnet_quint8']; // better model first; smaller one if the phone runs out of memory
var BG_FILL={white:'#FFFFFF',bone:'#F8F4E7'};
var BG={lib:null,cut:null,before:null,choice:'white',busy:false,token:0,model:0};

function bgReset(){BG.cut=null;BG.before=null;BG.busy=false;BG.token++;bgUI()}

function bgLoad(){
  if(!BG.lib)BG.lib=import(BG_LIB).catch(function(e){BG.lib=null;throw e});
  return BG.lib;
}

function bgDecode(blob){
  return createImageBitmap(blob).then(function(bmp){
    var c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;
    var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);if(bmp.close)bmp.close();
    return {c:c,g:g,w:c.width,h:c.height};
  });
}

/* ---- the clean-up ----
   v: soft score per pixel (0 = background, 255 = item). Returns the final alpha (0-255). */
function bgCleanMask(v,w,h){
  var n=w*h,i,k,p,head,tail,q=new Int32Array(n);
  var HI=150,LO=60;
  // 1. Start from pixels the remover is sure about, then grow into "probably" pixels touching them.
  var M=new Uint8Array(n);tail=0;
  for(i=0;i<n;i++)if(v[i]>=HI){M[i]=1;q[tail++]=i}
  head=0;
  while(head<tail){p=q[head++];var x=p%w,y=(p-x)/w;
    if(x>0&&!M[p-1]&&v[p-1]>=LO){M[p-1]=1;q[tail++]=p-1}
    if(x<w-1&&!M[p+1]&&v[p+1]>=LO){M[p+1]=1;q[tail++]=p+1}
    if(y>0&&!M[p-w]&&v[p-w]>=LO){M[p-w]=1;q[tail++]=p-w}
    if(y<h-1&&!M[p+w]&&v[p+w]>=LO){M[p+w]=1;q[tail++]=p+w}}
  if(!tail)return null;
  // 1b. Bridge thin gaps (like white stripes next to a white floor), so stripes join into one piece.
  bgClose(M,w,h,Math.max(2,Math.round(Math.max(w,h)*0.012)));
  // 1c. Remove thin lines stuck to the item (tile grout, floorboard edges, a shadow line).
  bgOpen(M,w,h,Math.max(1,Math.round(Math.max(w,h)*0.003)));
  // 2. Keep the biggest piece (and other big pieces, like the second shoe of a pair). Drop small bits.
  var lab=new Int32Array(n),sizes=[0],cur=0,big=0;
  for(i=0;i<n;i++){if(!M[i]||lab[i])continue;cur++;lab[i]=cur;head=0;tail=0;q[tail++]=i;
    while(head<tail){p=q[head++];var x2=p%w,y2=(p-x2)/w;
      if(x2>0&&M[p-1]&&!lab[p-1]){lab[p-1]=cur;q[tail++]=p-1}
      if(x2<w-1&&M[p+1]&&!lab[p+1]){lab[p+1]=cur;q[tail++]=p+1}
      if(y2>0&&M[p-w]&&!lab[p-w]){lab[p-w]=cur;q[tail++]=p-w}
      if(y2<h-1&&M[p+w]&&!lab[p+w]){lab[p+w]=cur;q[tail++]=p+w}}
    sizes[cur]=tail;if(tail>big)big=tail}
  for(i=0;i<n;i++)if(M[i]&&sizes[lab[i]]<big*0.15)M[i]=0;
  // 3. Fill holes inside the item: gaps the remover wasn't sure about, and tiny specks.
  //    Real openings (like inside a bag handle) score close to 0, so they stay open.
  var out=new Uint8Array(n);head=0;tail=0;
  for(k=0;k<w;k++){if(!M[k]&&!out[k]){out[k]=1;q[tail++]=k}var b=(h-1)*w+k;if(!M[b]&&!out[b]){out[b]=1;q[tail++]=b}}
  for(k=0;k<h;k++){var l=k*w,r=l+w-1;if(!M[l]&&!out[l]){out[l]=1;q[tail++]=l}if(!M[r]&&!out[r]){out[r]=1;q[tail++]=r}}
  while(head<tail){p=q[head++];var x3=p%w,y3=(p-x3)/w;
    if(x3>0&&!M[p-1]&&!out[p-1]){out[p-1]=1;q[tail++]=p-1}
    if(x3<w-1&&!M[p+1]&&!out[p+1]){out[p+1]=1;q[tail++]=p+1}
    if(y3>0&&!M[p-w]&&!out[p-w]){out[p-w]=1;q[tail++]=p-w}
    if(y3<h-1&&!M[p+w]&&!out[p+w]){out[p+w]=1;q[tail++]=p+w}}
  var seen=new Uint8Array(n);
  for(i=0;i<n;i++){if(M[i]||out[i]||seen[i])continue;head=0;tail=0;q[tail++]=i;seen[i]=1;var sum=0;
    while(head<tail){p=q[head++];sum+=v[p];var x4=p%w,y4=(p-x4)/w;
      if(x4>0&&!M[p-1]&&!seen[p-1]){seen[p-1]=1;q[tail++]=p-1}
      if(x4<w-1&&!M[p+1]&&!seen[p+1]){seen[p+1]=1;q[tail++]=p+1}
      if(y4>0&&!M[p-w]&&!seen[p-w]){seen[p-w]=1;q[tail++]=p-w}
      if(y4<h-1&&!M[p+w]&&!seen[p+w]){seen[p+w]=1;q[tail++]=p+w}}
    if(sum/tail>=20||tail<n*0.015)for(k=0;k<tail;k++)M[q[k]]=1}
  // 4. Solid inside, with a 1-pixel soft edge so it doesn't look jagged.
  var A=new Uint8ClampedArray(n);
  for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){var s=0,c=0;
    for(var dy=-1;dy<=1;dy++){var ny=yy+dy;if(ny<0||ny>=h)continue;
      for(var dx=-1;dx<=1;dx++){var nx=xx+dx;if(nx<0||nx>=w)continue;s+=M[ny*w+nx];c++}}
    A[yy*w+xx]=Math.round(s/c*255)}
  return A;
}

/* Grow the mask by r pixels, then shrink it back by r ("closing"). Gaps narrower than 2r get filled. */
function bgMax1D(src,dst,w,h,r,horiz){
  var len=horiz?w:h,lines=horiz?h:w,step=horiz?1:w,i,j,base,cnt;
  for(var L=0;L<lines;L++){base=horiz?L*w:L;cnt=0;
    for(j=0;j<Math.min(r,len);j++)cnt+=src[base+j*step];
    for(i=0;i<len;i++){var add=i+r,rem=i-r-1;
      if(add<len)cnt+=src[base+add*step];
      if(rem>=0)cnt-=src[base+rem*step];
      dst[base+i*step]=cnt>0?1:0}}
}
function bgClose(M,w,h,r){
  var n=w*h,T=new Uint8Array(n),i;
  bgMax1D(M,T,w,h,r,true);bgMax1D(T,M,w,h,r,false);          // grow
  for(i=0;i<n;i++)M[i]=1-M[i];
  bgMax1D(M,T,w,h,r,true);bgMax1D(T,M,w,h,r,false);          // shrink (grow the background)
  for(i=0;i<n;i++)M[i]=1-M[i];
}

/* Shrink by r, then grow back ("opening"). Lines thinner than 2r disappear. */
function bgOpen(M,w,h,r){
  var n=w*h,i;
  for(i=0;i<n;i++)M[i]=1-M[i];
  bgClose(M,w,h,r);
  for(i=0;i<n;i++)M[i]=1-M[i];
}

/* original photo + cleaned mask -> see-through PNG cut-out */
function bgCutout(photo,maskBlob){
  return Promise.all([bgDecode(photo),bgDecode(maskBlob)]).then(function(r){
    var P=r[0],K=r[1],w=P.w,h=P.h;
    if(K.w!==w||K.h!==h){var c2=document.createElement('canvas');c2.width=w;c2.height=h;var g2=c2.getContext('2d',{willReadFrequently:true});g2.drawImage(K.c,0,0,w,h);K={c:c2,g:g2,w:w,h:h}}
    var md=K.g.getImageData(0,0,w,h).data,n=w*h,v=new Uint8Array(n),i,alphaVaries=false;
    for(i=0;i<n;i++)if(md[i*4+3]!==255){alphaVaries=true;break}
    for(i=0;i<n;i++)v[i]=alphaVaries?md[i*4+3]:md[i*4];
    var A=bgCleanMask(v,w,h);if(!A)throw new Error('nothing found');
    var img=P.g.getImageData(0,0,w,h),d=img.data;
    for(i=0;i<n;i++)d[i*4+3]=A[i];
    P.g.putImageData(img,0,0);
    return new Promise(function(res,rej){P.c.toBlob(function(b){b?res(b):rej(new Error('canvas'))},'image/png')});
  });
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
  if(pendingPhoto)URL.revokeObjectURL(pendingPhoto.url);
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

function bgSegment(lib,photo,my){
  var model=BG_MODELS[BG.model],started=false;
  var cfg={model:model,device:'cpu',output:{format:'image/png'},
    progress:function(key,cur,total){
      if(my!==BG.token)return;
      if(/^fetch/.test(key)&&total){bgSay('Downloading the background remover… '+Math.min(99,Math.round(cur/total*100))+'% (only the first time)')}
      else if(/compute/.test(key)&&!started){started=true;bgSay('Removing the background…')}
    }};
  var seg=lib.segmentForeground||lib.alphamask;
  return seg(photo,cfg).catch(function(e){
    // Not enough memory for the better model on this phone: use the smaller one from now on.
    if(BG.model<BG_MODELS.length-1&&my===BG.token){BG.model++;bgSay('Trying the smaller remover…');return bgSegment(lib,photo,my)}
    throw e;
  });
}

function bgRemove(){
  var src=currentPhotoSrc();if(!src||BG.busy)return;
  var my=++BG.token;BG.busy=true;bgUI();
  BG.before=pendingPhoto?{blob:pendingPhoto.blob}:null;
  bgSay('Getting the background remover ready…');
  Promise.all([bgLoad(),fetch(src).then(function(r){return r.blob()})]).then(function(r){
    if(my!==BG.token)return;
    var photo=r[1];
    return bgSegment(r[0],photo,my).then(function(mask){
      if(my!==BG.token)return;
      bgSay('Cleaning up the edges…');
      return bgCutout(photo,mask);
    }).then(function(cut){
      if(!cut||my!==BG.token)return;
      BG.cut=cut;return bgCompose(cut,BG.choice).then(function(out){
        if(my!==BG.token)return;
        bgSetPending(out);BG.busy=false;bgSay('');updatePhotoUI();
        toast('Background removed. Tap Undo to go back.');
      });
    });
  }).catch(function(e){
    if(my!==BG.token)return;
    BG.busy=false;BG.cut=null;bgUI();
    bgSay(navigator.onLine===false?'You’re offline. The background remover needs the internet the first time.':
      (e&&e.message==='nothing found'?'Couldn’t find the item in this photo. Try a photo where the item fills more of the picture.':'Couldn’t remove the background on this device. Try again, or try a smaller photo.'));
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
  if(pendingPhoto)URL.revokeObjectURL(pendingPhoto.url);
  pendingPhoto=BG.before?{blob:BG.before.blob,url:URL.createObjectURL(BG.before.blob)}:null;
  BG.cut=null;BG.before=null;BG.token++;bgSay('');updatePhotoUI();
}
