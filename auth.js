// ══════════════════════════════════════════════════════════════════════
//  AUTH · La Quinta — Google Sign-In
//  Edita las dos secciones marcadas con ★ para configurar acceso.
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ★ 1 — REEMPLAZA con tu Client ID de Google Cloud Console
  var CLIENT_ID = 'PENDIENTE.apps.googleusercontent.com';

  // ★ 2 — AGREGA los correos de las personas con acceso a la app
  var EMAILS_EQUIPO = [
    'jpdelped@gmail.com',               // JP (admin)
    'luis.gonzalezc40@gmail.com',       // Luis González
    'bernarditahermanp@gmail.com',      // Bernardita Herman
    // 'otro@gmail.com',               // Agrega más correos aquí
  ];

  // Panel de revisión: solo JP
  var EMAILS_ADMIN = [
    'jpdelped@gmail.com',
  ];

  // ══════════════════════════════════════════════════════════════════════
  //  NO EDITAR A PARTIR DE AQUÍ
  // ══════════════════════════════════════════════════════════════════════

  var MODE    = window.LQ_AUTH_MODE || 'equipo';
  var ALLOWED = (MODE === 'admin' ? EMAILS_ADMIN : EMAILS_EQUIPO)
                  .map(function(e){ return e.toLowerCase(); });
  var KEY = 'lq_auth_v1';
  var TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

  // ── Utilidades de sesión ───────────────────────────────────────────────
  function loadSession() {
    try { return JSON.parse(localStorage.getItem(KEY)); }
    catch (_) { return null; }
  }
  function saveSession(email, name, picture) {
    localStorage.setItem(KEY, JSON.stringify({
      email: email, name: name, picture: picture,
      exp: Date.now() + TTL,
    }));
  }
  function clearSession() {
    localStorage.removeItem(KEY);
  }
  function isAllowed(email) {
    return ALLOWED.indexOf(email.toLowerCase()) !== -1;
  }

  // ── Decode JWT (sin verificar firma — suficiente para cliente) ──────────
  function decodeJWT(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      // Padding
      while (b64.length % 4) b64 += '=';
      return JSON.parse(atob(b64));
    } catch (_) { return {}; }
  }

  // ── CSS ────────────────────────────────────────────────────────────────
  var CSS = [
    '#lq-auth-screen{',
      'position:fixed;inset:0;z-index:9999;',
      'background:#0f1117;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'gap:24px;padding:32px;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    '}',
    '.lq-logo{text-align:center;}',
    '.lq-eyebrow{font-size:10px;color:#555e70;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;}',
    '.lq-appname{font-size:34px;font-weight:700;color:#f0f2f5;letter-spacing:-1px;line-height:1.1;}',
    '.lq-appname span{color:#3b82f6;}',
    '.lq-appsub{font-size:12px;color:#555e70;margin-top:4px;}',
    '.lq-card{',
      'background:#161b24;border:1px solid rgba(255,255,255,.08);',
      'border-radius:14px;padding:28px 24px;',
      'width:100%;max-width:340px;',
      'text-align:center;display:flex;flex-direction:column;gap:14px;',
    '}',
    '.lq-card-title{font-size:16px;font-weight:600;color:#f0f2f5;}',
    '.lq-card-sub{font-size:13px;color:#8b93a5;line-height:1.5;}',
    '#lq-google-btn{display:flex;justify-content:center;min-height:44px;align-items:center;}',
    '.lq-spinner{',
      'width:22px;height:22px;',
      'border:2px solid rgba(255,255,255,.15);border-top-color:#3b82f6;',
      'border-radius:50%;animation:lq-spin .7s linear infinite;',
    '}',
    '@keyframes lq-spin{to{transform:rotate(360deg)}}',
    '.lq-denied-icon{font-size:52px;}',
    '.lq-denied-email{',
      'font-size:12px;color:#8b93a5;',
      'background:#1e2534;border-radius:8px;',
      'padding:8px 12px;word-break:break-all;',
    '}',
    '.lq-btn{',
      'font-size:13px;padding:11px;',
      'background:#1e2534;border:1px solid rgba(255,255,255,.08);',
      'border-radius:8px;color:#8b93a5;cursor:pointer;width:100%;',
      'transition:all .12s;',
    '}',
    '.lq-btn:hover{border-color:rgba(255,255,255,.2);color:#f0f2f5;}',
    '.lq-user-bar{',
      'position:fixed;bottom:0;left:0;right:0;',
      'background:#161b24;border-top:1px solid rgba(255,255,255,.08);',
      'padding:8px 16px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));',
      'display:flex;align-items:center;gap:10px;z-index:200;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    '}',
    '.lq-user-avatar{',
      'width:28px;height:28px;border-radius:50%;',
      'background:#1e2534;border:1px solid rgba(255,255,255,.1);',
      'object-fit:cover;flex-shrink:0;',
    '}',
    '.lq-user-name{font-size:12px;color:#8b93a5;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.lq-signout-btn{',
      'font-size:11px;padding:4px 10px;',
      'background:transparent;border:1px solid rgba(255,255,255,.08);',
      'border-radius:6px;color:#555e70;cursor:pointer;',
      'transition:all .12s;flex-shrink:0;',
    '}',
    '.lq-signout-btn:hover{border-color:rgba(239,68,68,.4);color:#ef4444;}',
  ].join('');

  // ── Inyectar pantalla de login ─────────────────────────────────────────
  function showLoginScreen() {
    injectCSS();
    var div = document.createElement('div');
    div.id = 'lq-auth-screen';
    div.innerHTML = [
      '<div class="lq-logo">',
        '<div class="lq-eyebrow">Agrícola del Pedregal</div>',
        '<div class="lq-appname">La <span>Quinta</span></div>',
        '<div class="lq-appsub">Temporada 2025–2026 · Santina</div>',
      '</div>',
      '<div class="lq-card">',
        '<div class="lq-card-title">Inicia sesión para continuar</div>',
        '<div class="lq-card-sub">Usa tu cuenta de Google para acceder a la aplicación.</div>',
        '<div id="lq-google-btn"><div class="lq-spinner"></div></div>',
      '</div>',
    ].join('');
    document.body.appendChild(div);
    document.body.style.overflow = 'hidden';
  }

  // ── Inyectar pantalla de acceso denegado ───────────────────────────────
  function showDeniedScreen(name, email) {
    var screen = document.getElementById('lq-auth-screen');
    if (!screen) { injectCSS(); screen = document.createElement('div'); screen.id = 'lq-auth-screen'; document.body.appendChild(screen); }
    document.body.style.overflow = 'hidden';
    screen.innerHTML = [
      '<div class="lq-denied-icon">🔒</div>',
      '<div class="lq-card">',
        '<div class="lq-card-title">Sin acceso</div>',
        '<div class="lq-card-sub">Hola' + (name ? ' ' + name : '') + '. Tu cuenta no tiene permiso para esta app.</div>',
        '<div class="lq-denied-email">' + escHtml(email) + '</div>',
        '<div class="lq-card-sub">Contacta a JP para solicitar acceso.</div>',
        '<button class="lq-btn" onclick="lqSignOut()">← Usar otra cuenta</button>',
      '</div>',
    ].join('');
  }

  // ── Mostrar barra de usuario ───────────────────────────────────────────
  function showUserBar(session) {
    var bar = document.createElement('div');
    bar.id  = 'lq-user-bar';
    bar.className = 'lq-user-bar';
    var avatarHtml = session.picture
      ? '<img class="lq-user-avatar" src="' + escHtml(session.picture) + '" alt="">'
      : '<div class="lq-user-avatar"></div>';
    bar.innerHTML = avatarHtml
      + '<span class="lq-user-name">' + escHtml(session.name || session.email) + '</span>'
      + '<button class="lq-signout-btn" onclick="lqSignOut()">Salir</button>';
    document.body.appendChild(bar);
  }

  // ── Remover pantalla de auth ───────────────────────────────────────────
  function removeScreen() {
    var s = document.getElementById('lq-auth-screen');
    if (s) s.remove();
    document.body.style.overflow = '';
  }

  // ── CSS helper ────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('lq-auth-css')) return;
    var style = document.createElement('style');
    style.id = 'lq-auth-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Callback de Google Sign-In ─────────────────────────────────────────
  function onCredential(response) {
    var payload = decodeJWT(response.credential);
    var email   = payload.email || '';
    if (isAllowed(email)) {
      saveSession(email, payload.name || email, payload.picture || '');
      removeScreen();
      showUserBar({ email: email, name: payload.name || email, picture: payload.picture || '' });
    } else {
      showDeniedScreen(payload.name || '', email);
    }
  }

  // ── Cargar Google Identity Services dinámicamente ─────────────────────
  function loadGoogleGSI() {
    var script  = document.createElement('script');
    script.src  = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = function () {
      google.accounts.id.initialize({
        client_id:   CLIENT_ID,
        callback:    onCredential,
        auto_select: true,
        cancel_on_tap_outside: false,
      });
      google.accounts.id.renderButton(
        document.getElementById('lq-google-btn'),
        { theme: 'outline', size: 'large', locale: 'es', width: 280, text: 'signin_with' }
      );
      google.accounts.id.prompt();
    };
    script.onerror = function () {
      var btn = document.getElementById('lq-google-btn');
      if (btn) btn.innerHTML = '<p style="color:#f59e0b;font-size:12px">Sin conexión — necesitas internet para iniciar sesión.</p>';
    };
    document.head.appendChild(script);
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    // Si el Client ID aún no está configurado, dejar pasar (modo desarrollo)
    if (!CLIENT_ID || CLIENT_ID === 'PENDIENTE.apps.googleusercontent.com') {
      console.warn('[LQ Auth] CLIENT_ID no configurado — modo sin restricción activado');
      return;
    }

    var session = loadSession();
    if (session && session.exp > Date.now() && isAllowed(session.email)) {
      // Sesión válida — mostrar barra solo en index (no interfiere con bottombar)
      if (window.LQ_AUTH_SHOW_BAR !== false) showUserBar(session);
      return;
    }

    // Necesita autenticarse
    clearSession();
    showLoginScreen();
    loadGoogleGSI();
  }

  // ── API pública ────────────────────────────────────────────────────────
  window.lqSignOut = function () {
    clearSession();
    // También cerrar sesión de Google para evitar auto-select
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    location.reload();
  };
  window.lqGetUser = function () {
    var s = loadSession();
    return (s && s.exp > Date.now() && isAllowed(s.email)) ? s : null;
  };

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
