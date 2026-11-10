/* Raylos'Clo: Log-in screen buttons and tab buttons */
'use strict';
/* ---------- auth (demo only) ---------- */
function enter(email){
  store.set('rc_user',email);
  loginEl.hidden=true; appEl.hidden=false;
  show(currentView());
}
function leave(){
  if(CLOUD.on){cloudLogout(false);return}
  store.del('rc_user');
  appEl.hidden=true; loginEl.hidden=false;
  $('#password').value=''; $('#loginError').textContent='';
  document.title='Raylos’Clo';
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  $('#email').focus();
}
$('#loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  if(CLOUD.on){cloudAuthSubmit();return}
  var email=$('#email').value.trim(), pw=$('#password').value, err=$('#loginError');
  if(!email){err.textContent='Enter your email address.';$('#email').focus();return}
  if(email.indexOf('@')<1||email.indexOf('.',email.indexOf('@'))<0){err.textContent='That email doesn’t look right. Check for a missing @ or dot.';$('#email').focus();return}
  if(!pw){err.textContent='Enter your password.';$('#password').focus();return}
  err.textContent='';enter(email);
});
$('#demoBtn').addEventListener('click',function(){
  $('#email').value='demo@raylosclo.com';$('#password').value='demo-password';$('#loginError').textContent='';
  if($('#loginForm').requestSubmit)$('#loginForm').requestSubmit();else enter('demo@raylosclo.com');
});
$('#forgotBtn').addEventListener('click',function(){if(CLOUD.on){cloudForgot();return}$('#loginError').textContent='Password reset isn’t part of the demo yet.'});
$('#signupBtn').addEventListener('click',function(){if(CLOUD.on){setLoginMode(CLOUD.mode==='signup'?'login':'signup');return}$('#loginError').textContent='Creating accounts isn’t part of the demo yet.'});
$('#logoutBtn').addEventListener('click',leave);
$all('.nav button').forEach(function(b){b.addEventListener('click',function(){go(b.getAttribute('data-view'))})});
window.addEventListener('hashchange',function(){if(!appEl.hidden)show(currentView())});
