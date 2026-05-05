// ══════════════════════════════════════════════════════════════════════
//  AUTH · NPK Agro — Supabase Auth (Google + Magic Link + Email/Password)
//  Whitelist: tabla `usuarios_app` en Supabase (gestionada desde dashboard)
//  Versión: 2.0 (mayo 2026)
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Config Supabase ─────────────────────────────────────────────────
  var SUPABASE_URL  = 'https://eunuqwzrbqqpykyywjbu.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bnVxd3pyYnFxcHlreXl3amJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzYyOTMsImV4cCI6MjA5MTM1MjI5M30.iiCd-6pa8mQgXR6DzMtZjGsJnn-8OD_-ayrRtXj-YkM';

  // Modo de la página (admin pages vs equipo) — opcional, usa rol de usuarios_app
  var MODE = window.LQ_AUTH_MODE || 'equipo';

  // ── Estado interno ──────────────────────────────────────────────────
  var supa = null;
  var currentSession = null;
  var currentProfile = null;

  // Promise que se resuelve cuando termina el init (haya o no sesión).
  // Páginas que llamen lqGasCall apenas cargar deben esperar este promise.
  var _authReadyResolve;
  window.lqAuthReady = new Promise(function (r) { _authReadyResolve = r; });

  // ── CSS ────────────────────────────────────────────────────────────
  var CSS = [
    '#lq-auth-screen{position:fixed;inset:0;z-index:9999;background:#0f1117;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
    '.lq-logo{text-align:center;}',
    '.lq-eyebrow{font-size:10px;color:#555e70;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;}',
    '.lq-appname{font-size:34px;font-weight:700;color:#f0f2f5;letter-spacing:-1px;line-height:1.1;}',
    '.lq-appname span{color:#3b82f6;}',
    '.lq-appsub{font-size:12px;color:#555e70;margin-top:4px;}',
    '.lq-card{background:#161b24;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px 22px;width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px;}',
    '.lq-card-title{font-size:16px;font-weight:600;color:#f0f2f5;text-align:center;}',
    '.lq-card-sub{font-size:12px;color:#8b93a5;line-height:1.5;text-align:center;}',
    '.lq-input{padding:11px 13px;background:#1e2534;border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#f0f2f5;font-size:14px;outline:none;transition:border-color .15s;}',
    '.lq-input:focus{border-color:#3b82f6;}',
    '.lq-btn{font-size:13px;padding:11px;font-weight:500;background:#1e2534;border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#f0f2f5;cursor:pointer;width:100%;transition:all .12s;display:flex;align-items:center;justify-content:center;gap:8px;}',
    '.lq-btn:hover:not(:disabled){border-color:rgba(255,255,255,.2);background:#252e42;}',
    '.lq-btn:disabled{opacity:.5;cursor:not-allowed;}',
    '.lq-btn-primary{background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600;}',
    '.lq-btn-primary:hover:not(:disabled){background:#2563eb;border-color:#2563eb;}',
    '.lq-btn-google{background:#fff;color:#1f2937;font-weight:600;}',
    '.lq-btn-google:hover:not(:disabled){background:#f3f4f6;}',
    '.lq-divider{display:flex;align-items:center;gap:10px;color:#555e70;font-size:11px;margin:4px 0;}',
    '.lq-divider::before,.lq-divider::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.08);}',
    '.lq-msg{font-size:12px;padding:8px 10px;border-radius:6px;text-align:center;}',
    '.lq-msg-ok{background:rgba(16,185,129,.15);color:#10b981;}',
    '.lq-msg-err{background:rgba(239,68,68,.15);color:#ef4444;}',
    '.lq-denied-icon{font-size:52px;text-align:center;}',
    '.lq-denied-email{font-size:12px;color:#8b93a5;background:#1e2534;border-radius:8px;padding:8px 12px;word-break:break-all;text-align:center;}',
    '.lq-user-bar{position:fixed;bottom:0;left:0;right:0;background:#161b24;border-top:1px solid rgba(255,255,255,.08);padding:8px 16px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;z-index:200;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
    '.lq-user-avatar{width:28px;height:28px;border-radius:50%;background:#1e2534;border:1px solid rgba(255,255,255,.1);object-fit:cover;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#10b981;}',
    '.lq-user-name{font-size:12px;color:#8b93a5;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.lq-signout-btn{font-size:11px;padding:4px 10px;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#555e70;cursor:pointer;transition:all .12s;flex-shrink:0;}',
    '.lq-signout-btn:hover{border-color:rgba(239,68,68,.4);color:#ef4444;}',
  ].join('');

  // ── Helpers ────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('lq-auth-css')) return;
    var style = document.createElement('style');
    style.id = 'lq-auth-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function $(sel) { return document.querySelector(sel); }
  function removeScreen() {
    var s = document.getElementById('lq-auth-screen');
    if (s) s.remove();
    document.body.style.overflow = '';
  }

  // ── Cargar Supabase JS desde CDN ──────────────────────────────────
  function loadSupabaseLib() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/dist/umd/supabase.min.js';
      script.onload  = function () { resolve(); };
      script.onerror = function () { reject(new Error('No se pudo cargar Supabase JS')); };
      document.head.appendChild(script);
    });
  }

  // ── Pantalla de login ──────────────────────────────────────────────
  function showLoginScreen() {
    injectCSS();
    var div = document.createElement('div');
    div.id = 'lq-auth-screen';
    div.innerHTML = [
      '<div class="lq-logo">',
        '<div class="lq-eyebrow">NPK Agro · Plataforma agricola</div>',
        '<div class="lq-appname">NPK <span>Agro</span></div>',
        '<div class="lq-appsub">Inicia sesion para continuar</div>',
      '</div>',
      '<div class="lq-card">',
        '<button class="lq-btn lq-btn-google" id="lq-btn-google">',
          '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285f4" d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.7v2.3h3.1c1.8-1.7 2.7-4.1 2.5-6.8z"/><path fill="#34a853" d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.5-5-3.7H.9v2.3C2.4 15.8 5.5 18 9 18z"/><path fill="#fbbc04" d="M4 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.1.3-1.7V5h-3C.4 6.3 0 7.6 0 9s.4 2.7 1 4l3-2.3z"/><path fill="#ea4335" d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3C13.5.9 11.4 0 9 0 5.5 0 2.4 2.2 1 5l3 2.3C4.7 5.1 6.7 3.6 9 3.6z"/></svg>',
          'Continuar con Google',
        '</button>',
        '<div class="lq-divider">o con email</div>',
        '<input class="lq-input" id="lq-email" type="email" placeholder="tu@email.com" autocomplete="email" inputmode="email">',
        '<input class="lq-input" id="lq-pass" type="password" placeholder="Contrasena (opcional)" autocomplete="current-password">',
        '<button class="lq-btn lq-btn-primary" id="lq-btn-magic">Recibir link magico por email</button>',
        '<button class="lq-btn" id="lq-btn-pass">Iniciar con contrasena</button>',
        '<div id="lq-msg" style="display:none;"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(div);
    document.body.style.overflow = 'hidden';

    $('#lq-btn-google').addEventListener('click', signInGoogle);
    $('#lq-btn-magic').addEventListener('click', signInMagicLink);
    $('#lq-btn-pass').addEventListener('click', signInPassword);
    $('#lq-pass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signInPassword();
    });
  }

  function setMsg(text, ok) {
    var el = $('#lq-msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'lq-msg ' + (ok ? 'lq-msg-ok' : 'lq-msg-err');
    el.style.display = 'block';
  }
  function setBtnsDisabled(d) {
    ['#lq-btn-google','#lq-btn-magic','#lq-btn-pass'].forEach(function(s){
      var b = $(s); if (b) b.disabled = d;
    });
  }

  // ── Métodos de login ──────────────────────────────────────────────
  async function signInGoogle() {
    setBtnsDisabled(true);
    setMsg('Redirigiendo a Google...', true);
    var res = await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (res.error) { setMsg('Error: ' + res.error.message, false); setBtnsDisabled(false); }
  }

  async function signInMagicLink() {
    var email = ($('#lq-email').value || '').trim().toLowerCase();
    if (!email || !email.includes('@')) { setMsg('Ingresa un email valido', false); return; }
    setBtnsDisabled(true);
    setMsg('Enviando link...', true);
    var res = await supa.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (res.error) { setMsg('Error: ' + res.error.message, false); setBtnsDisabled(false); return; }
    setMsg('Listo. Te enviamos un link a ' + email + '. Revisa tu correo.', true);
  }

  async function signInPassword() {
    var email = ($('#lq-email').value || '').trim().toLowerCase();
    var pass  = $('#lq-pass').value || '';
    if (!email || !pass) { setMsg('Email y contrasena requeridos', false); return; }
    setBtnsDisabled(true);
    setMsg('Validando...', true);
    var res = await supa.auth.signInWithPassword({ email: email, password: pass });
    if (res.error) { setMsg('Error: ' + res.error.message, false); setBtnsDisabled(false); return; }
  }

  // ── Pantalla "Acceso denegado" ─────────────────────────────────────
  function showDeniedScreen(email) {
    injectCSS();
    var div = $('#lq-auth-screen');
    if (!div) { div = document.createElement('div'); div.id='lq-auth-screen'; document.body.appendChild(div); }
    document.body.style.overflow = 'hidden';
    div.innerHTML = [
      '<div class="lq-denied-icon">[BLOQUEADO]</div>',
      '<div class="lq-card">',
        '<div class="lq-card-title">Sin acceso</div>',
        '<div class="lq-card-sub">Tu cuenta no tiene permiso para esta app.</div>',
        '<div class="lq-denied-email">' + escHtml(email) + '</div>',
        '<div class="lq-card-sub">Contacta al administrador para solicitar acceso.</div>',
        '<button class="lq-btn" id="lq-btn-out">Cerrar sesion</button>',
      '</div>',
    ].join('');
    $('#lq-btn-out').addEventListener('click', lqSignOut);
  }

  // ── User bar ───────────────────────────────────────────────────────
  function showUserBar(profile) {
    injectCSS();
    var prev = document.getElementById('lq-user-bar');
    if (prev) prev.remove();
    var bar = document.createElement('div');
    bar.id = 'lq-user-bar';
    bar.className = 'lq-user-bar';
    var initial = (profile.nombre || profile.email || '?').charAt(0).toUpperCase();
    bar.innerHTML =
      '<div class="lq-user-avatar">' + escHtml(initial) + '</div>' +
      '<span class="lq-user-name">' + escHtml(profile.nombre || profile.email) + '</span>' +
      '<button class="lq-signout-btn" id="lq-signout">Salir</button>';
    document.body.appendChild(bar);
    $('#lq-signout').addEventListener('click', lqSignOut);
  }

  // ── Whitelist en usuarios_app ──────────────────────────────────────
  async function checkWhitelist(email) {
    var r = await supa.from('usuarios_app')
      .select('email,nombre,rol,empresa_id,campo_id,permisos,activo')
      .eq('email', email.toLowerCase())
      .eq('activo', true)
      .maybeSingle();
    return r.data || null;
  }

  // ── Flujo principal ───────────────────────────────────────────────
  async function init() {
    try { await loadSupabaseLib(); }
    catch (e) { alert('No se pudo cargar Supabase. Sin conexion?'); return; }

    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
    window._supa = supa;

    supa.auth.onAuthStateChange(function (event, session) {
      currentSession = session;
      if (session && session.user) {
        validateAndShow(session.user.email);
      } else {
        currentProfile = null;
        var bar = document.getElementById('lq-user-bar'); if (bar) bar.remove();
      }
    });

    var s = await supa.auth.getSession();
    currentSession = s.data.session;
    if (currentSession && currentSession.user) {
      await validateAndShow(currentSession.user.email);
    } else {
      showLoginScreen();
    }
    // Marcar auth como listo (con o sin sesión)
    if (_authReadyResolve) { _authReadyResolve(); _authReadyResolve = null; }
  }

  async function validateAndShow(email) {
    var profile = await checkWhitelist(email);
    currentProfile = profile;
    if (!profile) { showDeniedScreen(email); return; }
    if (MODE === 'admin' && profile.rol !== 'admin') { showDeniedScreen(email); return; }
    removeScreen();
    if (window.LQ_AUTH_SHOW_BAR !== false) showUserBar(profile);
  }

  // ── API publica ───────────────────────────────────────────────────
  window.lqSignOut = async function () {
    if (supa) await supa.auth.signOut();
    location.reload();
  };

  window.lqGetIdToken = function () {
    return currentSession && currentSession.access_token ? currentSession.access_token : null;
  };

  window.lqGetUser = function () {
    if (!currentProfile) return null;
    return {
      email      : currentProfile.email,
      nombre     : currentProfile.nombre,
      rol        : currentProfile.rol,
      empresa_id : currentProfile.empresa_id,
      campo_id   : currentProfile.campo_id,
      permisos   : currentProfile.permisos || null,
    };
  };

  window.lqPuedeModulo = function (modulo) {
    var u = window.lqGetUser();
    if (!u) return false;
    if (u.rol === 'admin') return true;
    if (u.rol === 'gerente') return true;
    if (u.rol === 'readonly') {
      if (!u.permisos || !u.permisos.modulos) return true;
      return u.permisos.modulos.indexOf(modulo) !== -1;
    }
    if (u.rol === 'operador' || u.rol === 'revisor') {
      if (!u.permisos || !u.permisos.modulos) return true;
      return u.permisos.modulos.indexOf(modulo) !== -1;
    }
    return false;
  };

  window.lqPuedeEditar = function () {
    var u = window.lqGetUser();
    if (!u) return false;
    return u.rol === 'admin' || u.rol === 'operador';
  };

  window.lqPuedeBorrar = function () {
    var u = window.lqGetUser();
    if (!u) return false;
    if (u.rol !== 'admin' && u.rol !== 'operador') return false;
    if (u.permisos && u.permisos.puede_borrar === false) return false;
    return true;
  };

  // URL del GAS Web App de NPK Agro (fallback si la página no define window.GAS_URL)
  var DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw1aPxY7QV-nAUYicKW9qLA_vVudNMcoAzWWG_XAbtCNzuSf_divWhPzNMlfW_623uz/exec';

  window.lqGasCall = async function (params) {
    // Esperar a que auth termine de inicializarse (evita race con cargas tempranas)
    if (window.lqAuthReady) {
      try { await window.lqAuthReady; } catch (_) {}
    }
    var token = window.lqGetIdToken();
    if (!token) throw new Error('No autenticado');
    var url = window.GAS_URL || DEFAULT_GAS_URL;
    var body = Object.assign({ idToken: token }, params || {});
    // OJO: Apps Script Web Apps no soporta CORS preflight.
    // Usamos 'text/plain' para que sea "simple request" (sin preflight OPTIONS).
    // El GAS Código.js parsea e.postData.contents como JSON igual.
    var resp = await fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body   : JSON.stringify(body),
    });
    return await resp.json();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
