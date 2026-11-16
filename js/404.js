(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage=document.getElementById('stage'),cat=document.getElementById('cat'),headg=document.getElementById('headg'),
      pL=document.getElementById('patchL'),pR=document.getElementById('patchR');
  function clamp(v){return Math.max(-1,Math.min(1,v))}
  var cur={rot:0,x:0,y:0,nx:0};
  function pose(rot,x,y,nx){
    cur={rot:rot,x:x,y:y,nx:nx};
    headg.style.transform='translate('+x+'px,'+y+'px) rotate('+rot+'deg)';
    var s=nx*12; pL.style.transform='translateX('+s+'px)'; pR.style.transform='translateX('+s+'px)';
  }
  var lastMove=0;
  function onPoint(px,py){
    if(reduce)return;
    var r=cat.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*0.5;
    var nx=clamp((px-cx)/(r.width*0.9)),ny=clamp((py-cy)/(r.height*0.9));
    pose(nx*5,nx*14,ny*7,nx); lastMove=Date.now();
  }
  window.addEventListener('pointermove',function(e){onPoint(e.clientX,e.clientY)},{passive:true});
  window.addEventListener('pointerdown',function(e){onPoint(e.clientX,e.clientY)},{passive:true});
  function flash(cls,ms){stage.classList.add(cls);setTimeout(function(){stage.classList.remove(cls)},ms)}
  function blink(){flash('blink',260);setTimeout(blink,2300+Math.random()*3300)}
  var acts=[
    function(){pose(-5,-16,0,-1)},
    function(){pose(5,16,0,1)},
    function(){pose(8,6,-10,.4);flash('ask',2700)},
    function(){stage.classList.add('duck');setTimeout(function(){stage.classList.remove('duck')},1500)},
    function(){flash('twitch',1100)},
    function(){pose(-3,-8,-4,-.5)},
    function(){pose(0,0,0,0)}
  ],ai=0;
  function idle(){
    if(!reduce&&Date.now()-lastMove>2400&&!stage.classList.contains('hop')){acts[ai++%acts.length]()}
    setTimeout(idle,1700+Math.random()*1500);
  }
  var poking=false;
  function poke(){
    if(poking)return;poking=true;
    pose(0,0,0,0);stage.classList.remove('duck');
    stage.classList.add('show','pop','twitch');if(!reduce)stage.classList.add('hop');
    document.getElementById('live').textContent='meow?';
    setTimeout(function(){stage.classList.remove('hop','pop','twitch')},900);
    setTimeout(function(){stage.classList.remove('show');poking=false},1900);
  }
  cat.addEventListener('click',poke);
  // rise from behind the ledge
  if(reduce){stage.classList.add('up')}else{setTimeout(function(){stage.classList.add('up')},350)}
  if(!reduce){setTimeout(blink,2200);setTimeout(idle,2600);setTimeout(function(){flash('twitch',1100)},1500)}
  window.__cat={pose:pose,poke:poke,add:function(c){stage.classList.add(c)},rm:function(c){stage.classList.remove(c)}};
})();
