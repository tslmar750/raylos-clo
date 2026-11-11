/* Raylos'Clo: smarter boxes in the item form.
   - Size: a dropdown that changes with the category, plus "Type a different size…"
   - Brand: suggestions as you type (your own brands first, then a built-in list)
   - Spell check: red squiggly lines and autocorrect on the boxes where you write sentences */
'use strict';

/* ---------------- Size ---------------- */
var SIZE_GROUPS={
  letter:{label:'Letter sizes',list:['XXS','XS','S','M','L','XL','XXL','3XL','4XL']},
  women:{label:'Number sizes (US)',list:['00','0','2','4','6','8','10','12','14','16','18','20','22']},
  waist:{label:'Waist (inches)',list:['W24','W25','W26','W27','W28','W29','W30','W31','W32','W33','W34','W36','W38','W40','W42','W44']},
  shoe:{label:'Shoe sizes (US)',list:(function(){var o=[];for(var s=4;s<=13;s+=0.5)o.push('US '+s);o.push('US 14','US 15');return o})()},
  one:{label:'',list:['One size']}
};
var SIZE_BY_CAT={
  Tops:['letter','women','one'], Dresses:['letter','women','one'], Outerwear:['letter','women','one'],
  Bottoms:['letter','waist','women'], Shoes:['shoe'],
  Bags:['one'], Hats:['one','letter'], Jewelry:['one'], Accessories:['one','letter'],
  Other:['one','letter','women','waist','shoe']
};
function allSizes(){var o=[];Object.keys(SIZE_GROUPS).forEach(function(k){o=o.concat(SIZE_GROUPS[k].list)});return o}
/* sizes typed in on other items, so they show up next time too */
function yourSizes(){
  var known={},seen={},out=[];allSizes().forEach(function(s){known[s.toLowerCase()]=1});
  (state.items||[]).forEach(function(i){var s=String(i.size||'').trim(),k=s.toLowerCase();if(s&&!known[k]&&!seen[k]){seen[k]=1;out.push(s)}});
  return out.sort();
}
function sizeOptions(cat,cur){
  cur=String(cur||'').trim();
  var groups=SIZE_BY_CAT[cat]||SIZE_BY_CAT.Other, found=false, mine=yourSizes(), html='<option value="">Not set</option>';
  function o(s){var sel=(s===cur);if(sel)found=true;return '<option value="'+esc(s)+'"'+(sel?' selected':'')+'>'+esc(s)+'</option>'}
  groups.forEach(function(g){var G=SIZE_GROUPS[g];html+=G.label?'<optgroup label="'+G.label+'">'+G.list.map(o).join('')+'</optgroup>':G.list.map(o).join('')});
  /* keep a size that isn't in this category's list (e.g. switched Tops to Shoes) */
  if(cur&&!found&&mine.indexOf(cur)<0)mine.unshift(cur);
  if(mine.length)html+='<optgroup label="Sizes you typed before">'+mine.map(o).join('')+'</optgroup>';
  html+='<optgroup label="Not listed?"><option value="__other">Type a different size…</option></optgroup>';
  return html;
}
function refreshSizes(){
  var s=$('#f_size'),c=$('#f_cat'); if(!s||!c)return;
  var cur=s.value==='__other'?'':s.value; s.innerHTML=sizeOptions(c.value,cur); s.value=cur;
  if(s.value!==cur)s.value=''; $('#sizeAdd').hidden=true;
}
function pickedSize(){
  var s=$('#f_size'); if(!s)return '';
  return s.value==='__other'?($('#f_size_new').value||'').trim().replace(/\s+/g,' ').slice(0,20):s.value;
}

/* ---------------- Brand suggestions ---------------- */
var BRANDS=['Abercrombie & Fitch','Acne Studios','Adidas','Aerie','Aeropostale','Alexander McQueen','Alexander Wang','All Saints','Alo Yoga','American Apparel','American Eagle','Ann Taylor','Anthropologie','APC','Arc\'teryx','Aritzia','Armani','ASOS','Athleta','Babaton','Balenciaga','Banana Republic','Barbour','Bershka','Birkenstock','Bottega Veneta','Brandy Melville','Brooks Brothers','Burberry','Calvin Klein','Carhartt','Carhartt WIP','Celine','Champion','Chanel','Chloé','Christian Dior','Christian Louboutin','Chrome Hearts','Coach','Columbia','Comme des Garçons','Converse','COS','Cotton On','Crocs','Dickies','Diesel','DKNY','Dolce & Gabbana','Dr. Martens','Ed Hardy','Eileen Fisher','Ellesse','Essentials','Everlane','Express','Fendi','Fila','Fear of God','Forever 21','Free People','Gap','Givenchy','Golden Goose','Gucci','Guess','H&M','Hanes','Harley-Davidson','Hermès','Hollister','Hoka','Hugo Boss','Isabel Marant','J.Crew','Jacquemus','JNCO','Jordan','Juicy Couture','Kate Spade','Lacoste','Lands\' End','Levi\'s','LL Bean','Loewe','Loft','Louis Vuitton','Lululemon','Madewell','Maison Margiela','Mango','Marc Jacobs','Michael Kors','Miu Miu','Moncler','Mossimo','Nautica','New Balance','Nike','Off-White','Old Navy','On Running','Oscar de la Renta','Palace','Patagonia','Pendleton','Polo Ralph Lauren','Prada','Princess Polly','PrettyLittleThing','Pull&Bear','Puma','Ralph Lauren','Ray-Ban','Realisation Par','Reebok','Reformation','Rick Owens','Saint Laurent','Salomon','Sandro','Sézane','Shein','Skims','Skechers','Spanx','Stone Island','Stussy','Supreme','Ted Baker','The Kooples','The North Face','Theory','Tommy Bahama','Tommy Hilfiger','Topshop','Tory Burch','Trapstar','True Religion','UGG','Uniqlo','Urban Outfitters','Valentino','Vans','Vera Bradley','Versace','Victoria\'s Secret','Vince','Vivienne Westwood','Von Dutch','White Fox','Wilfred','Wrangler','Y-3','Yeezy','Zara','Zimmermann'];
function brandKey(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9& ]/g,'')}
function brandMatches(q){
  q=brandKey(q).trim(); if(!q)return [];
  var mine={},list=[],seen={};
  (state.items||[]).forEach(function(i){var b=String(i.brand||'').trim();if(b)mine[b]=(mine[b]||0)+1});
  var own=Object.keys(mine).sort(function(a,b){return mine[b]-mine[a]});
  own.concat(BRANDS).forEach(function(b){var k=brandKey(b);if(seen[k])return;seen[k]=1;
    var score=k.indexOf(q)===0?0:(k.split(' ').some(function(w){return w.indexOf(q)===0})?1:(q.length>2&&k.indexOf(q)>=0?2:-1));
    if(score>=0)list.push({b:b,s:score+(mine[b]?0:0.5)})});
  list.sort(function(a,b){return a.s-b.s});
  /* nothing to suggest if the box already says exactly that brand */
  if(list.length===1&&brandKey(list[0].b)===q)return [];
  return list.slice(0,6).map(function(x){return x.b});
}
var acIndex=-1;
function brandList(){return $('#brandList')}
function closeBrand(){var l=brandList(),i=$('#f_brand');if(l){l.hidden=true;l.innerHTML=''}if(i){i.setAttribute('aria-expanded','false');i.removeAttribute('aria-activedescendant')}acIndex=-1}
function showBrand(){
  var i=$('#f_brand'),l=brandList(); if(!i||!l)return;
  var m=brandMatches(i.value); if(!m.length){closeBrand();return}
  acIndex=-1;
  l.innerHTML=m.map(function(b,n){return '<li role="option" id="bopt'+n+'" data-brand="'+esc(b)+'">'+esc(b)+'</li>'}).join('');
  l.hidden=false; i.setAttribute('aria-expanded','true');
}
function moveBrand(step){
  var opts=$all('#brandList li'); if(!opts.length)return;
  acIndex=(acIndex+step+opts.length)%opts.length;
  opts.forEach(function(o,n){o.setAttribute('aria-selected',n===acIndex?'true':'false')});
  $('#f_brand').setAttribute('aria-activedescendant','bopt'+acIndex);
  try{opts[acIndex].scrollIntoView({block:'nearest'})}catch(e){}
}
function pickBrand(b){var i=$('#f_brand');i.value=b;closeBrand();i.focus()}

document.addEventListener('input',function(e){if(e.target.id==='f_brand')showBrand()});
document.addEventListener('focusin',function(e){if(e.target.id==='f_brand'&&e.target.value)showBrand()});
document.addEventListener('focusout',function(e){if(e.target.id==='f_brand')setTimeout(function(){var a=document.activeElement;if(!a||a.id!=='f_brand')closeBrand()},150)});
/* pointerdown (not click) so the box doesn't lose focus and close the list first */
document.addEventListener('pointerdown',function(e){var li=e.target.closest&&e.target.closest('#brandList li');if(li){e.preventDefault();pickBrand(li.getAttribute('data-brand'))}});
document.addEventListener('keydown',function(e){
  if(e.target.id!=='f_brand'||brandList().hidden)return;
  if(e.key==='ArrowDown'){e.preventDefault();moveBrand(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();moveBrand(-1)}
  else if(e.key==='Enter'&&acIndex>=0){e.preventDefault();e.stopPropagation();pickBrand($all('#brandList li')[acIndex].getAttribute('data-brand'))}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeBrand()}
},true);

/* ---------------- Size dropdown events ---------------- */
document.addEventListener('change',function(e){
  if(e.target.id==='f_cat')refreshSizes();
  if(e.target.id==='f_size'){var o=e.target.value==='__other';$('#sizeAdd').hidden=!o;if(o)$('#f_size_new').focus()}
});
