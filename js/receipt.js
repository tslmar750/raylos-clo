/* Raylos'Clo: scan a post office receipt and pull out the tracking number.
   The text is read on your own phone or computer with Tesseract.js. The photo is never uploaded.
   The first scan downloads the reading tool (a few MB); after that it's faster. */
'use strict';
var OCR_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
var ocrLib=null, ocrWorker=null, ocrLog=function(){};
function loadOcr(){
  if(ocrLib)return ocrLib;
  ocrLib=new Promise(function(res,rej){
    if(window.Tesseract)return res(window.Tesseract);
    var sc=document.createElement('script');sc.src=OCR_URL;sc.async=true;
    sc.onload=function(){window.Tesseract?res(window.Tesseract):rej(new Error('net'))};
    sc.onerror=function(){ocrLib=null;rej(new Error('net'))};document.head.appendChild(sc);
  });
  return ocrLib;
}
function getWorker(){
  if(ocrWorker)return ocrWorker;
  ocrWorker=loadOcr().then(function(T){return T.createWorker('eng',1,{logger:function(m){ocrLog(m)}})});
  ocrWorker.catch(function(){ocrWorker=null});
  return ocrWorker;
}

/* ---- finding the tracking number in the text ---- */
function uspsCheckOk(d){ /* USPS check digit: weights 3,1,3,1… from the right, last digit is the check */
  if(!/^\d{20,22}$/.test(d))return false;
  var body=d.slice(0,-1),sum=0;
  for(var i=body.length-1,w=3;i>=0;i--,w=(w===3?1:3))sum+=(+body[i])*w;
  return (10-sum%10)%10===+d.slice(-1);
}
function fixDigits(text){
  /* receipts often get O for 0, l for 1, S for 5. Only fix words that are mostly numbers. */
  return text.split('\n').map(function(line){
    return line.split(/(\s+)/).map(function(w){
      var digits=(w.match(/\d/g)||[]).length;
      var allLook=/^[0-9OoQDIl|i!SsB]+$/.test(w)&&digits>0;
      if(/^1Z/i.test(w)||!(allLook||(w.length>=3&&digits/w.length>=0.6)))return w;
      return w.replace(/[OoQD]/g,'0').replace(/[Il|i!]/g,'1').replace(/[Ss]/g,'5').replace(/B/g,'8');
    }).join('');
  }).join('\n');
}
function findTracking(raw){
  var text=fixDigits(String(raw||'')), found={}, out=[];
  function add(code,score,carrier){code=code.toUpperCase();if(!found[code]||found[code].score<score){found[code]={code:code,score:score,carrier:carrier}}}
  text.split('\n').forEach(function(line,n,all){
    var labeled=/track|trk|tracking|usps\s*#|label\s*#/i.test(line)||(n>0&&/track/i.test(all[n-1]));
    var joined=line.replace(/(\d)[ \t.\-]+(?=\d)/g,'$1'); /* "9400 1118 ..." -> "94001118..." */
    (joined.match(/\d{20,34}/g)||[]).forEach(function(run){
      var hit=false;
      [22,20].forEach(function(len){
        for(var i=0;i+len<=run.length;i++){var c=run.substr(i,len);
          if(/^9[1-5]/.test(c)&&uspsCheckOk(c)){add(c,10+(labeled?3:0)+(len===22?1:0),'USPS');hit=true}}
      });
      if(!hit&&/^9[1-5]\d{18}(\d{2})?$/.test(run))add(run,labeled?5:3,'USPS');
    });
    (line.replace(/\s+/g,'').match(/1Z[0-9A-Z]{16}/gi)||[]).forEach(function(c){add(c,9,'UPS')});
    (line.match(/\b[A-Z]{2}\s?\d{3}\s?\d{3}\s?\d{3}\s?US\b/g)||[]).forEach(function(c){add(c.replace(/\s/g,''),labeled?9:7,'USPS')});
    if(labeled&&!out.length){ /* any long number right after the word "tracking" */
      (joined.match(/\d{12,30}/g)||[]).forEach(function(c){add(c,4,'')});
    }
  });
  Object.keys(found).forEach(function(k){out.push(found[k])});
  return out.sort(function(a,b){return b.score-a.score}).slice(0,4);
}
function prettyTrack(c){return /^\d+$/.test(c)?c.replace(/(\d{4})(?=\d)/g,'$1 '):c}

/* ---- the scan itself ---- */
var scanTarget=null, scanMsg=null;
function scanSay(t,cls){var m=$('#'+scanMsg);if(m){m.className='msg'+(cls?' '+cls:'');m.innerHTML=t}}
function startScan(btn,useCamera){
  scanTarget=btn.getAttribute('data-target'); scanMsg=btn.getAttribute('data-msg');
  $(useCamera?'#receiptCam':'#receiptPick').click();
}
function scanFile(file){
  if(!file||!scanTarget)return;
  var target=scanTarget, started=Date.now();
  scanSay('Getting the photo ready…');
  ocrLog=function(m){
    if(m.status==='recognizing text')scanSay('Reading the receipt… '+Math.round((m.progress||0)*100)+'%');
    else if(/load|initializ/i.test(m.status||''))scanSay('Getting the reader ready (only slow the first time)…');
  };
  resizeImage(file,2000,function(t){scanSay(esc(t))})
    .then(function(blob){return getWorker().then(function(w){return w.recognize(blob)})})
    .then(function(r){
      var list=findTracking(r&&r.data&&r.data.text), inp=$('#'+target);
      if(!inp)return;
      if(!list.length){scanSay('Couldn’t find a tracking number. Try again with the receipt flat, in good light and filling the photo, or type it in.','bad');return}
      useTracking(target,list[0].code);
      var more=list.slice(1).map(function(x){return '<button type="button" class="chip" data-action="scan-use" data-target="'+esc(target)+'" data-code="'+esc(x.code)+'">'+esc(prettyTrack(x.code))+'</button>'}).join(' ');
      scanSay('Found it: <b>'+esc(prettyTrack(list[0].code))+'</b>'+(list[0].carrier?' ('+list[0].carrier+')':'')+'. Check it matches your receipt.'+(more?'<br>Not right? Tap another one: '+more:''),'ok');
    })
    .catch(function(err){
      var net=err&&(err.message==='net'||/fetch|network|load/i.test(String(err.message||err)));
      scanSay(net?'Couldn’t load the receipt reader. It needs the internet the first time. Check your connection and try again.':photoErr(err,file),'bad');
    });
}
function useTracking(target,code){
  var inp=$('#'+target); if(!inp)return;
  inp.value=code;
  inp.dispatchEvent(new Event('change',{bubbles:true})); /* the Sold & Shipping cards save on change */
}
function scanButtons(target,msg){
  return '<div class="scanrow"><button type="button" class="btn small secondary only-phone" data-action="scan-receipt" data-target="'+target+'" data-msg="'+msg+'">Scan receipt</button>'+
    '<button type="button" class="linkbtn" data-action="scan-receipt-photo" data-target="'+target+'" data-msg="'+msg+'"><span class="hint-desk">Read tracking # from a receipt photo</span><span class="hint-phone">or pick a receipt photo</span></button></div>';
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-action^="scan-"]'); if(!b)return;
  var a=b.getAttribute('data-action');
  if(a==='scan-receipt')startScan(b,true);
  else if(a==='scan-receipt-photo')startScan(b,false);
  else if(a==='scan-use'){useTracking(b.getAttribute('data-target'),b.getAttribute('data-code'));scanSay('Using <b>'+esc(prettyTrack(b.getAttribute('data-code')))+'</b>.','ok')}
});
document.addEventListener('change',function(e){
  if(e.target.id==='receiptCam'||e.target.id==='receiptPick'){var f=e.target.files&&e.target.files[0];e.target.value='';scanFile(f)}
});
