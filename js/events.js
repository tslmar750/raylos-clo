/* Raylos'Clo: Click / change / input / submit handlers */
'use strict';
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
    case 'src-add':srcAdd();break;
    case 'app-show':$('#appForm').hidden=false;b.hidden=true;$('#f_newapp').focus();break;
    case 'app-add':appAdd();break;
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
  if(e.target.id==='f_source'){var add=e.target.value==='__add';$('#srcAdd').hidden=!add;$('#m_source').textContent='';if(add)$('#f_src_new').focus();return}
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
    case 'name':{state.settings.name=t.value.trim();save();$('#who').textContent=state.settings.name||store.get('rc_user')||'';break}
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
/* Enter in the little "add" boxes adds the entry instead of saving the whole item */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'||!e.target)return;
  if(e.target.id==='f_src_new'){e.preventDefault();srcAdd()}
  else if(e.target.id==='f_newapp'){e.preventDefault();appAdd()}
});
