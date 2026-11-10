/* Raylos'Clo: Mock data (only used in the mock version) */
'use strict';
/* ================= MOCK DATA (only used in the mock version) ================= */
function mockData(){
  var st=blank(), t=Date.now(), n=0;
  function L(k,slug){return 'https://www.'+PLAT[k].domain+'/'+(k==='depop'?'products/':k==='poshmark'?'listing/':k==='ebay'?'itm/':k==='vinted'?'items/':'p/')+slug+'/'}
  function slugOf(x){return x.toLowerCase().replace(/[^a-z0-9]+/g,'-')}
  function add(o){o.photoRef=slugOf(o.title);var tl=o.title.toLowerCase(),CM=[['black','black'],['white','white'],['camel','camel'],['denim','blue'],['jeans','blue'],['green','green'],['plaid','red'],['red','red'],['striped','blue and white'],['floral','pink'],['cardigan','olive'],['scarf','purple'],['leather','brown'],['loafers','brown'],['tweed','gray'],['corduroy','rust'],['beaded','red'],['gold','gold'],['band tee','black'],['canvas','cream'],['knit','cream'],['bucket','khaki'],['belt','brown'],['fleece','tan'],['cropped','pink'],['satin','champagne'],['windbreaker','teal'],['skirt','sage'],['hoodie','gray']];for(var ci=0;ci<CM.length;ci++){if(tl.indexOf(CM[ci][0])>=0){o.color=CM[ci][1];break}}o.condition=o.condition||'Good';o.styleTags=o.styleTags||'vintage, thrifted';o.dsource=o.dsource||'Preloved';o.pkg=o.pkg||({Outerwear:'Large',Shoes:'Medium',Bags:'Medium',Accessories:'Small',Jewelry:'Extra small',Hats:'Small'}[o.category]||'Medium');o.id='m'+(n++)+uid();o.created=t-n*60000;o.notes=o.notes||'';o.size=o.size||'M';o.brand=o.brand||'';o.links=o.links||{};st.items.push(o);return o}
  function sold(title,cat,src,cost,price,plat,ago,ship,status,extra,pendingOn){
    if(ago<=29)ago=Math.min(ago,new Date().getDate()-1);
    var links={}; if(plat!=='direct')links[plat]=L(plat,slugOf(title));
    (extra||[]).forEach(function(k){links[k]=L(k,slugOf(title))});
    var delisted={}; Object.keys(links).forEach(function(k){if(k!==plat&&(pendingOn||[]).indexOf(k)<0)delisted[k]=true});
    var packing=status==='to_ship'?{}:{clean:true,boxed:true,label:true};
    var made=add({title:title,category:cat,source:src,cost:cost,price:price,links:links,sale:{platform:plat,price:price,date:daysAgo(ago),shipCost:ship,shipStatus:plat==='direct'?'na':status,tracking:(status==='to_ship'||plat==='direct')?'':'9400 1118 9922 '+(1000+n)+' 0000 00',shippedDate:(status==='to_ship'||plat==='direct')?'':daysAgo(Math.max(0,ago-1)),packing:packing,delisted:delisted}});
    var BUY=['thriftfan22','vintage_vibes','mia.wears','closet_cleanout','retro_ray','sam_thrifts','lulu_b','jo.finds'];
    made.sale.buyer=BUY[n%BUY.length]; made.sale.paid=(status==='delivered'&&ago>14)||(plat==='direct'&&ago>30);
    if(status==='delivered')made.sale.deliveredDate=daysAgo(Math.max(0,ago-3));
  }
  function listed(title,cat,src,cost,price,plats,sz){var links={};plats.forEach(function(k){links[k]=L(k,slugOf(title))});add({title:title,category:cat,source:src,cost:cost,price:price,links:links,size:sz})}
  sold('Wool coat, camel','Outerwear','Wescott Thrift',12,48,'depop',1,0,'to_ship');
  sold('Denim jacket','Outerwear','3Fifteen',8,36,'depop',2,0,'to_ship',['vinted'],['vinted']);
  sold('Vintage band tee','Tops','Goodwill Outlet',3,28,'depop',2,0,'to_ship');
  sold('Striped button-up','Tops','3Fifteen',4,22,'vinted',5,4.5,'shipped');
  sold('Green cardigan','Tops','My closet',6,28.5,'vinted',7,4.5,'delivered',['poshmark'],['poshmark']);
  sold('Linen shirt, white','Tops','Goodwill Outlet',5,31,'poshmark',10,5,'delivered');
  sold('Plaid flannel','Tops','3Fifteen',5,24,'depop',16,4.5,'delivered');
  sold('Vintage windbreaker','Outerwear','Wescott Thrift',9,52,'ebay',21,7,'delivered');
  sold('Mom jeans','Bottoms','Goodwill Outlet',4,32,'depop',29,5,'delivered');
  sold('Silk scarf','Accessories','My closet',0,18,'vinted',36,3.5,'delivered');
  sold('Pleated skirt','Bottoms','3Fifteen',6,29,'poshmark',44,5,'delivered');
  sold('Canvas tote','Bags','Facebook Marketplace',3,22,'direct',52,0,'na');
  sold('Wool beanie','Hats','My closet',0,15,'direct',3,0,'na');
  sold('Knit sweater','Tops','Wescott Thrift',7,38,'depop',61,5,'delivered');
  sold('Leather belt','Accessories','Goodwill Outlet',2,16,'vinted',75,3.5,'delivered');
  sold('Corduroy jacket','Outerwear','3Fifteen',11,54,'depop',89,7,'delivered');
  sold('Floral midi dress','Dresses','Wescott Thrift',8,42,'poshmark',104,5,'delivered');
  sold('Chunky sneakers','Shoes','Facebook Marketplace',14,58,'ebay',120,9,'delivered');
  sold('Bucket hat','Hats','My closet',0,14,'depop',138,3.5,'delivered');
  sold('Beaded necklace','Jewelry','Goodwill Outlet',1,12,'vinted',155,3,'delivered');
  sold('Denim skirt','Bottoms','3Fifteen',5,26,'depop',176,5,'delivered');
  sold('Fleece pullover','Outerwear','Wescott Thrift',6,34,'depop',198,6,'delivered');
  sold('Cropped cardigan','Tops','My closet',0,20,'vinted',224,4,'delivered');
  sold('Leather loafers','Shoes','Goodwill Outlet',9,44,'ebay',250,8,'delivered');
  listed('Black slip dress','Dresses','Wescott Thrift',7,34,['depop','vinted'],'S');
  listed('White sneakers','Shoes','My closet',0,40,['depop'],'8');
  listed('Leather shoulder bag','Bags','3Fifteen',9,45,['ebay']);
  listed('Wool scarf','Accessories','Goodwill Outlet',3,18,['vinted']);
  listed('Graphic hoodie','Tops','3Fifteen',10,40,['depop','poshmark'],'L');
  listed('Satin blouse','Tops','Wescott Thrift',6,30,['poshmark']);
  listed('Vintage denim vest','Outerwear','Facebook Marketplace',7,32,['depop']);
  listed('Gold hoop earrings','Jewelry','Goodwill Outlet',2,14,['vinted']);
  add({title:'Corduroy pants',category:'Bottoms',source:'Facebook Marketplace',cost:6,price:30,size:'28'});
  add({title:'Tweed blazer',category:'Outerwear',source:'Wescott Thrift',cost:10,price:46,size:'M'});
  add({title:'Red wool beret',category:'Hats',source:'My closet',cost:0,price:16,size:'OS'});
  function note(plat,from,text,ago,starred,responded){st.notes.push({id:'n'+(n++)+uid(),platform:plat,from:from,text:text,date:daysAgo(ago),ts:t-ago*86400000-n*1000,starred:starred,responded:responded})}
  note('depop','vintage_vibes_22','Offered $30 for the black slip dress.',0,true,false);
  note('vinted','closetcleanout','Is the wool scarf still available?',0,false,false);
  note('poshmark','thriftqueen','Can you do $25 for the satin blouse?',1,false,false);
  note('depop','sam.wears','Would you ship the hoodie to Canada?',2,true,false);
  note('ebay','retro_finds_co','Question: are the sneakers true to size?',3,false,true);
  note('vinted','lulu_b','Thanks! Package arrived, love the cardigan.',6,false,true);
  note('depop','mia_thrifts','Bundle the denim vest and hoodie for $60?',7,true,true);
  note('poshmark','closet_by_jo','Offered $20 for the leather bag.',9,false,true);
  st.tasks=[{id:'t'+uid(),text:'Buy 50 poly mailers',done:false},{id:'t'+uid()+'b',text:'Photograph the new thrift haul',done:false},{id:'t'+uid()+'c',text:'Wash and fold the cardigans',done:true}];
  st.money={wallet:{},pending:{},direct:0,adjust:{}};
  st.settings={name:'Ray',fees:{depop:10,vinted:0,poshmark:20,ebay:13,instagram:0}};
  return normalize(st);
}
