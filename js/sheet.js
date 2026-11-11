/* Raylos'Clo: on phones, the listing kit and other .kit boxes slide up from the bottom.
   Drag the sheet down from the top to close it, like the sheets in iPhone apps. */
'use strict';
(function(){
  var PHONE=window.matchMedia('(max-width:900px)');
  var d=null, y0=0, x0=0, dy=0, live=false;
  function closeSheet(dl){
    var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(reduce){dl.style.transform='';dl.close();return}
    dl.style.transform='';dl.classList.add('closing');
    setTimeout(function(){dl.classList.remove('closing');if(dl.open)dl.close()},200);
  }
  document.addEventListener('touchstart',function(e){
    if(!PHONE.matches||e.touches.length!==1)return;
    var dl=e.target.closest&&e.target.closest('dialog.kit[open]'); if(!dl)return;
    if(e.target.closest('textarea,input,select'))return;   /* let people select and scroll text */
    if(dl.scrollTop>0)return;                               /* only when the sheet is scrolled to the top */
    d=dl; y0=e.touches[0].clientY; x0=e.touches[0].clientX; dy=0; live=false;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!d)return;
    var t=e.touches[0], ny=t.clientY-y0, nx=t.clientX-x0;
    if(!live){
      if(Math.abs(nx)>Math.abs(ny)||ny<=0){if(Math.abs(nx)>8||ny<-4)d=null;return} /* sideways swipe or scrolling up: not a close */
      if(ny<8)return;
      live=true;
    }
    dy=Math.max(0,ny); d.style.transition='none'; d.style.transform='translateY('+dy+'px)';
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  function end(){
    if(!d)return; var dl=d; d=null; dl.style.transition='';
    if(!live)return; live=false;
    if(dy>Math.min(140,dl.offsetHeight*.25))closeSheet(dl);
    else{dl.style.transition='transform .2s ease-out';dl.style.transform='';setTimeout(function(){dl.style.transition=''},220)}
  }
  document.addEventListener('touchend',end); document.addEventListener('touchcancel',end);
  /* tap the dimmed area above the sheet to close it */
  document.addEventListener('click',function(e){
    var dl=e.target; if(!PHONE.matches||!dl.matches||!dl.matches('dialog.kit[open]'))return;
    var r=dl.getBoundingClientRect(); if(e.clientY<r.top)closeSheet(dl);
  });
  /* a closed sheet comes back in its normal place next time */
  document.addEventListener('close',function(e){if(e.target.matches&&e.target.matches('dialog.kit'))e.target.style.transform=''},true);
})();
