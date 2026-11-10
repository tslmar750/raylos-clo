/* Raylos'Clo: Paste a sale */
'use strict';
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
  d.innerHTML='<div class="dlg"><h2>Paste a sale</h2><p style="margin:0 0 10px">Copy the sale notification or order page text from the platform, paste it here, and I’ll fill in the sale for you. You can fix anything before saving.</p>'+
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
