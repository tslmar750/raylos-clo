/* Raylos'Clo: Ship dialog, drag and drop, item dialog, sold dialog */
'use strict';
/* ---- ship dialog + drag and drop ---- */
var shipId=null;
function openShip(id){
  var it=findItem(id); if(!it||!it.sale)return; shipId=id;
  var d=$('#shipDlg');
  d.innerHTML='<form class="dlg" id="shipForm" novalidate><h2>Mark as shipped</h2><p style="margin:0 0 14px"><b>'+esc(it.title)+'</b> · sold on '+platName(it.sale.platform)+'</p><div class="ff"><label for="sh_track">Tracking number *</label><input type="text" id="sh_track" maxlength="60" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" value="'+esc(it.sale.tracking||'')+'"><div class="msg bad" id="m_track" aria-live="polite"></div>'+scanButtons('sh_track','m_scan')+'<div class="msg" id="m_scan" aria-live="polite"></div></div><div class="dlg-actions"><button type="button" class="btn secondary" data-action="close-ship">Cancel</button><button type="submit" class="btn">Mark shipped</button></div></form>';
  d.showModal(); if(!window.matchMedia('(max-width:900px)').matches)$('#sh_track').focus();
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
  if(file&&t.kind==='dlg'&&$('#photoFile')){handlePhotoFiles(Array.prototype.filter.call(dt.files,isImageFile).length?Array.prototype.filter.call(dt.files,isImageFile):[file]);return}
  if(file){useDroppedFile(t,file);return}
  if(url){toast('Getting that picture…');fileFromUrl(url).then(function(f){useDroppedFile(t,f)},function(){toast('That website won’t let me copy its picture. Save the picture to your Mac first, then drag the saved file in.')});return}
  toast('I couldn’t read that drop. Click Add photo and choose the picture instead.');
});
document.addEventListener('paste',function(e){
  var d=$('#itemDlg'); if(!d||!d.open||!$('#photoFile'))return;
  var fs=e.clipboardData&&e.clipboardData.files?Array.prototype.filter.call(e.clipboardData.files,isImageFile):[]; if(fs.length){e.preventDefault();handlePhotoFiles(fs)}
});

/* ---- item dialog ---- */
var editingId=null, gal=[], galGen=0, MAXPHOTOS=12;
/* gal = the photos shown in the open item form, cover first: {key:'saved key' or '', url, blob (new ones only)} */
function editingItem(){return editingId?findItem(editingId):null}
function galFrom(it){
  var g=[]; if(!it)return g; var s=photoSrc(it);
  if(s)g.push({key:it.id,url:s});
  extraKeys(it).forEach(function(k){if(PH[k])g.push({key:k,url:PH[k]})});
  return g;
}
function galClear(){gal.forEach(function(p){if(p.blob)URL.revokeObjectURL(p.url)});gal=[]}
function updatePhotoUI(){
  var pv=$('#photoPreview'); if(!pv)return; var src=gal.length?gal[0].url:'', cat=$('#f_cat')?$('#f_cat').value:'Tops';
  pv.className='frame big'+(src?'':' noph');
  pv.innerHTML=src?'<img src="'+src+'" alt="Cover photo">':'<img src="'+IMG[iconFor(cat)]+'" alt=""><span>Tap to add photos</span>'; pv.disabled=gal.length>=MAXPHOTOS; pv.setAttribute('aria-label',src?'Add more photos':'Add photos');
  var full=gal.length>=MAXPHOTOS;
  $('#photoBtn').innerHTML=src?'<span class="hint-desk">Add more photos</span><span class="hint-phone">Choose more</span>':'<span class="hint-desk">Add photos</span><span class="hint-phone">Choose photos</span>';
  $('#photoBtn').disabled=full; if($('#camBtn')){$('#camBtn').textContent=src?'Take more':'Take photos';$('#camBtn').disabled=full}
  var st=$('#photoStrip');
  st.hidden=!gal.length;
  st.innerHTML=gal.map(function(p,i){
    return '<li class="pthumb'+(i?'':' cover')+'"><button type="button" class="pt-img" data-action="cover-photo" data-i="'+i+'" aria-label="'+(i?'Make photo '+(i+1)+' the cover':'Photo 1 is the cover')+'"><img src="'+p.url+'" alt="" draggable="false">'+(i?'':'<span class="pt-tag">Cover</span>')+'</button>'+
      '<button type="button" class="pt-x" data-action="remove-photo" data-i="'+i+'" aria-label="Remove photo '+(i+1)+'">×</button></li>';
  }).join('');
  $('#photoCount').textContent=gal.length>1?gal.length+' photos. Tap one to make it the cover.':'';
}
function handlePhotoFiles(files){
  var m=$('#m_photo'); if(!m)return; m.textContent='';
  files=Array.prototype.slice.call(files||[]).filter(Boolean); if(!files.length)return;
  var room=MAXPHOTOS-gal.length;
  if(room<=0){m.textContent='That’s the most photos one item can have ('+MAXPHOTOS+'). Remove one to add another.';return}
  var skipped=files.length>room; files=files.slice(0,room);
  var errs=[], gen=galGen;
  m.textContent=files.length>1?'Preparing '+files.length+' pictures…':'Preparing the picture…';
  files.reduce(function(chain,file){return chain.then(function(){
    return (isImageFile(file)?Promise.resolve(true):sniffHeic(file)).then(function(isImg){
      if(!isImg){errs.push('That file isn’t a picture. Photos from your Mac or iPhone (HEIC, JPG, PNG, WebP, GIF) all work.');return}
      if(file.size>40*1024*1024){errs.push('That picture is very large. Choose one under 40 MB.');return}
      return resizeImage(file,900,function(t){m.textContent=t}).then(function(blob){
        if(gen!==galGen||!$('#photoStrip'))return; addGalBlob(blob);
      });
    }).catch(function(err){errs.push(photoErr(err,file))});
  })},Promise.resolve()).then(function(){
    if(gen!==galGen||!$('#m_photo'))return;
    m.textContent=errs.length?errs[0]+(errs.length>1?' ('+errs.length+' pictures didn’t work.)':''):(skipped?'Only the first '+files.length+' were added. One item can have '+MAXPHOTOS+' photos.':'');
  });
}
function addGalBlob(blob){if(gal.length>=MAXPHOTOS)return false;gal.push({key:'',blob:blob,url:URL.createObjectURL(blob)});updatePhotoUI();return true}
var PHONE=window.matchMedia('(pointer:coarse)').matches;
function handlePhotoFile(file){handlePhotoFiles(file?[file]:[])}
function removeGalPhoto(i){var p=gal[i];if(!p)return;if(p.blob)URL.revokeObjectURL(p.url);gal.splice(i,1);updatePhotoUI()}
function coverGalPhoto(i){if(i>0&&gal[i]){gal.unshift(gal.splice(i,1)[0]);updatePhotoUI()}}
function setItemPhotoFromFile(id,file){
  var it=findItem(id); if(!it)return;
  (isImageFile(file)?Promise.resolve(true):sniffHeic(file)).then(function(isImg){
    if(!isImg){toast('That file isn’t a picture.');return}
    toast('Preparing the picture…');
    return resizeImage(file,900,function(t){toast(t)}).then(function(blob){
      var key=it.id, extra=!!photoSrc(it);
      if(extra){
        if(photoSrcs(it).length>=MAXPHOTOS){toast('“'+it.title+'” already has '+MAXPHOTOS+' photos.');return}
        key=it.id+'_'+uid(); it.photos=(it.photos||[]).concat([{k:key}]);
      } else it.photoRef='';
      setPhoto(key,blob);
      return photoPut(key,blob).catch(function(){toast('This browser couldn’t save the picture. It will disappear when you close the page.')}).then(function(){save();render();toast((extra?'Another photo added to “':'Photo added to “')+it.title+'”.')});
    });
  }).catch(function(err){toast(photoErr(err,file))});
}
/* Save the form's photos: gal[0] goes under the item id, the rest become extra photos. */
function applyPhoto(it){
  var g=gal.slice(); gal=[]; galGen++;
  var oldKeys=(photoSrc(it)?[it.id]:[]).concat(extraKeys(it)), oldPhotos=it.photos||[];
  var plan=g.map(function(p,i){
    var target=i===0?it.id:(p.key&&p.key!==it.id?p.key:it.id+'_'+uid());
    return {p:p,target:target,same:p.key===target};
  });
  var unchanged=plan.length===oldKeys.length&&plan.every(function(x,i){return x.same&&x.target===oldKeys[i]});
  if(unchanged)return;
  if(!plan.length||!plan[0].same)it.photoRef='';
  it.photos=plan.slice(1).map(function(x){var was=oldPhotos.filter(function(o){return o.k===x.target})[0];return x.same&&was?was:{k:x.target}});
  var used={}; plan.forEach(function(x){used[x.target]=1});
  // read every photo that moves before anything is overwritten
  photoMoving++;
  Promise.all(plan.map(function(x){
    if(x.same)return null;
    return x.p.blob?Promise.resolve(x.p.blob):fetch(x.p.url).then(function(r){return r.blob()});
  })).then(function(blobs){
    oldKeys.forEach(function(k){if(!used[k]){clearPhoto(k);photoDel(k).catch(function(){})}});
    var puts=[];
    plan.forEach(function(x,i){
      if(x.same)return;
      setPhoto(x.target,blobs[i]);
      puts.push(photoPut(x.target,blobs[i]));
      if(x.p.blob)URL.revokeObjectURL(x.p.url);
    });
    render();
    return Promise.all(puts).catch(function(){toast('This browser couldn’t save the pictures. They will disappear when you close the page.')});
  }).catch(function(){toast('Couldn’t save the photo changes. Try again.')}).then(function(){photoMoving--;save()});
}
function opt(list,sel){return list.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')}
function linkField(pl,it){
    return '<div class="ff"><label for="link_'+pl.key+'">'+pl.name+' listing link</label><input type="text" id="link_'+pl.key+'" data-linkkey="'+pl.key+'" placeholder="'+(pl.domain?'https://'+pl.domain+'/…':'Paste the link')+'" value="'+esc(it&&it.links?(it.links[pl.key]||''):'')+'" autocomplete="off"><div class="msg" id="m_link_'+pl.key+'" aria-live="polite"></div></div>';
}
function sourceOptions(cur){
  cur=String(cur||'');var list=sourceList();if(cur&&list.indexOf(cur)<0)list.push(cur);
  return '<option value="">Not set</option>'+list.map(function(x){return '<option value="'+esc(x)+'"'+(x===cur?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'<option value="__add">Add more…</option>';
}
function srcAdd(){
  var inp=$('#f_src_new'),m=$('#m_source'),v=(inp.value||'').trim().replace(/\s+/g,' ');m.textContent='';
  if(!v){m.textContent='Type where you got it first.';inp.focus();return ''}
  var have=sourceList().filter(function(x){return x.toLowerCase()===v.toLowerCase()})[0];
  if(!have){state.settings.sources=(state.settings.sources||[]).concat([v]);save();have=v}
  $('#f_source').innerHTML=sourceOptions(have);$('#f_source').value=have;inp.value='';$('#srcAdd').hidden=true;
  return have;
}
function pickedSource(){
  var v=$('#f_source').value;
  if(v==='__add')return ($('#f_src_new').value||'').trim()?srcAdd():'';
  return v;
}
function appAdd(){
  var inp=$('#f_newapp'),m=$('#m_newapp'),v=cleanAppName(inp.value);m.textContent='';
  if(!v){m.textContent='Type the app’s name first.';inp.focus();return}
  if(PLATFORMS.some(function(p){return p.name.toLowerCase()===v.toLowerCase()})){m.textContent=v+' is already on the list.';return}
  var key=appKey(v);state.settings.apps=(state.settings.apps||[]).concat([{key:key,name:v}]);syncApps(state.settings);save();
  $('#addAppRow').insertAdjacentHTML('beforebegin',linkField(PLAT[key],editingItem()));
  inp.value='';$('#appForm').hidden=true;$('#appShow').hidden=false;
  var f=$('#link_'+key);if(f)f.focus();
  toast(v+' added. It now shows up for sales, fees and money too.');
}
function openItem(id){
  var it=id?findItem(id):null; editingId=id||null;
  galClear(); gal=galFrom(it); galGen++;
  var d=$('#itemDlg');
  var links=PLATFORMS.map(function(pl){return linkField(pl,it)}).join('');
  d.innerHTML='<form class="dlg" id="itemForm" novalidate><div class="dlg-head"><h2>'+(it?'Edit item':'New item')+'</h2><button type="button" class="btn secondary small" data-action="close-dlg">Cancel</button></div>'+
    '<div class="form-grid">'+
    '<div class="full photobox"><button type="button" class="frame big noph" id="photoPreview" data-action="pick-photo" aria-label="Add photos"></button><div class="pb-text"><b>Photos</b><p>Add clear pictures of the item, up to '+MAXPHOTOS+'. The first one is the cover. <b class="hint-desk">Drag them in, paste them, or choose them. To pick more than one, hold ⌘ (Ctrl on Windows) and click each photo.</b><b class="hint-phone">Take several in a row, or choose several at once: tap each photo so it gets a checkmark, then tap Add.</b> HEIC, JPG, PNG, WebP and GIF all work.</p><ul class="pstrip" id="photoStrip" hidden></ul><p class="pcount" id="photoCount" aria-live="polite"></p><div class="pb-btns"><button type="button" class="btn small only-phone" id="camBtn" data-action="take-photo">Take photos</button><button type="button" class="btn small" id="photoBtn" data-action="pick-photo"><span class="hint-desk">Add photos</span><span class="hint-phone">Choose photos</span></button></div><div class="msg bad" id="m_photo" aria-live="polite"></div></div><input type="file" id="photoFile" accept="'+(PHONE?'image/*':'image/*,.heic,.heif')+'" multiple hidden><input type="file" id="photoCam" accept="image/*" capture="environment" hidden></div>'+
    '<div class="ff full"><label for="f_title">Name *</label><input type="text" id="f_title" maxlength="120" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="e.g. Wool coat, camel" value="'+esc(it?it.title:'')+'"><div class="msg bad" id="m_title" aria-live="polite"></div></div>'+
    '<div class="ff"><label for="f_cat">Category</label><select id="f_cat">'+opt(CATEGORIES,it?it.category:'Tops')+'</select></div>'+
    '<div class="ff"><label for="f_size">Size</label><select id="f_size">'+sizeOptions(it?it.category:'Tops',it?it.size:'')+'</select>'+
      '<div class="addrow2" id="sizeAdd" hidden><input type="text" id="f_size_new" maxlength="20" placeholder="Type the size, e.g. EU 38" aria-label="Type the size" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></div></div>'+
    '<div class="ff"><label for="f_brand">Brand</label><div class="ac"><input type="text" id="f_brand" maxlength="60" value="'+esc(it?it.brand:'')+'" placeholder="Start typing, e.g. Lev" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="brandList" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false"><ul class="aclist" id="brandList" role="listbox" aria-label="Brand suggestions" hidden></ul></div></div>'+
    '<div class="ff"><label for="f_color">Color</label><input type="text" id="f_color" maxlength="40" spellcheck="true" autocorrect="on" autocapitalize="none" placeholder="e.g. black" value="'+esc(it?it.color:'')+'"></div>'+
    '<div class="ff"><label for="f_source">Where I got it</label><select id="f_source">'+sourceOptions(it?it.source:'')+'</select>'+
      '<div class="addrow2" id="srcAdd" hidden><input type="text" id="f_src_new" maxlength="40" spellcheck="true" autocapitalize="words" placeholder="Type where you got it" autocomplete="off" enterkeyhint="done"><button type="button" class="btn small" data-action="src-add">Add</button></div><div class="msg bad" id="m_source" aria-live="polite"></div></div>'+
    '<div class="ff"><label for="f_cond">Condition</label><select id="f_cond"><option value="">Not set</option>'+opt(['New with tags','Like new','Good','Fair'],it?it.condition:'')+'</select></div>'+
    '<div class="ff"><label for="f_cost">What I paid ($)</label><input type="number" id="f_cost" min="0" step="0.01" value="'+esc(it&&it.cost!==''&&it.cost!=null?it.cost:'')+'"><div class="msg bad" id="m_cost" aria-live="polite"></div></div>'+
    '<div class="ff"><label for="f_price">Asking price ($)</label><input type="number" id="f_price" min="0" step="0.01" value="'+esc(it&&it.price!==''&&it.price!=null?it.price:'')+'"><div class="msg bad" id="m_price" aria-live="polite"></div></div>'+
    '<div class="ff full"><label for="f_notes">Notes, flaws, measurements</label><textarea id="f_notes" maxlength="800" spellcheck="true" autocorrect="on" autocapitalize="sentences">'+esc(it?it.notes:'')+'</textarea></div>'+
    '<details class="full more"'+((it&&(it.styleTags||it.age||it.pkg||it.dsource))?' open':'')+'><summary>More details (optional)</summary><div class="form-grid" style="margin-top:10px">'+
      '<div class="ff"><label for="f_style">Style tags</label><input type="text" id="f_style" maxlength="80" autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="e.g. y2k, vintage" value="'+esc(it?it.styleTags:'')+'"></div>'+
      '<div class="ff"><label for="f_age">Age</label><select id="f_age"><option value="">Not set</option>'+opt(['2020s','2010s','2000s','1990s','1980s','1970s','Before 1970'],it?it.age:'')+'</select></div>'+
      '<div class="ff"><label for="f_pkg">Package size</label><select id="f_pkg"><option value="">Not set</option>'+opt(['Extra small','Small','Medium','Large','Extra large'],it?it.pkg:'')+'</select></div>'+
      '<div class="ff"><label for="f_dsource">Source (Depop)</label><input type="text" id="f_dsource" maxlength="40" placeholder="e.g. Vintage, Preloved" value="'+esc(it?it.dsource:'')+'"></div>'+
    '</div></details>'+
    '<div class="full"><h3>Where it’s posted</h3><p style="margin:0 0 6px;font-size:15px">Paste the link from each app. An app only counts as posted once its link is here.</p></div>'+links+
    '<div class="full addapp" id="addAppRow"><button type="button" class="btn small secondary" data-action="app-show" id="appShow">+ Add another app</button>'+
      '<div id="appForm" hidden><label for="f_newapp">App name</label><div class="addrow2"><input type="text" id="f_newapp" maxlength="30" placeholder="e.g. Mercari, Grailed, ThredUp" autocomplete="off" enterkeyhint="done"><button type="button" class="btn small" data-action="app-add">Add</button></div><div class="msg bad" id="m_newapp" aria-live="polite"></div></div></div>'+
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
  if(!dom)return {ok:true,warn:''};
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
  var data={title:title,category:$('#f_cat').value,size:pickedSize(),brand:$('#f_brand').value.trim(),condition:$('#f_cond').value,color:$('#f_color').value.trim(),styleTags:$('#f_style').value.trim(),age:$('#f_age').value,pkg:$('#f_pkg').value,dsource:$('#f_dsource').value.trim(),source:pickedSource(),cost:cost===''?'':num(cost),price:price===''?'':num(price),notes:$('#f_notes').value.trim(),links:links};
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
  var line=[$('#f_cat').value,pickedSize()?('Size '+pickedSize()):'',$('#f_brand').value.trim()?('Brand: '+$('#f_brand').value.trim()):''].filter(Boolean).join(' · ');
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
  d.innerHTML='<form class="dlg" id="soldForm" novalidate><h2>Mark as sold</h2><p style="margin:0 0 14px"><b>'+esc(it.title)+'</b></p>'+
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
  save(); $('#soldDlg').close(); render(); delistAlert([it.id]);
}
