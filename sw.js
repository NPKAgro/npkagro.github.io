// ── Service Worker · La Quinta · Opus v3 ────────────────────────────
// Estrategia: Network-first para GAS, Cache-first con revalidación para assets.
// Versión: bump cuando cambies archivos estáticos para forzar actualización.

const CACHE_NAME = 'laquinta-opus-v17';

// Permitir al cliente pedir skipWaiting si detecta SW nuevo waiting
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
const ASSETS = [
  './',
  './index.html',
  './app.html',
  './campo.html',
  './cuaderno.html',
  './revision.html',
  './cuaderno_revision.html',
  './aforado.html',
  './aforado_dashboard.html',
  './inventario.html',
  './inventario_admin.html',
  './inventario_historial.html',
  './compra.html',
  './petroleo.html',
  './auth.js',
  './mapa-laquinta.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Instalar: pre-cachear todos los assets ────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // addAll falla si algún recurso no existe; usar add individual para resiliencia
      return Promise.allSettled(ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.warn('[SW] No se pudo cachear: ' + url, err);
        });
      }));
    })
  );
  // Tomar control inmediatamente sin esperar al cierre de otras pestañas
  self.skipWaiting();
});

// ── Activar: limpiar caches viejos ───────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) {
            console.log('[SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      );
    })
  );
  // Tomar control de todos los clientes abiertos
  self.clients.claim();
});

// ── Fetch: enrutamiento de peticiones ────────────────────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Peticiones a GAS y Google Drive: siempre red, sin cachear
  if (
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com') ||
    url.includes('drive.google.com')
  ) {
    e.respondWith(
      fetch(e.request).catch(function() {
        // Respuesta de error legible cuando no hay red
        return new Response(
          JSON.stringify({ error: 'Sin conexión — reintenta cuando tengas internet' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Assets estáticos: cache-first con actualización en background (stale-while-revalidate)
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var fetchPromise = fetch(e.request).then(function(networkRes) {
          // Actualizar cache en segundo plano (solo respuestas OK)
          if (networkRes && networkRes.status === 200 && e.request.method === 'GET') {
            cache.put(e.request, networkRes.clone());
          }
          return networkRes;
        }).catch(function() {
          // Sin red: devolver lo que hay en cache aunque esté desactualizado
          return null;
        });

        // Devolver cache inmediatamente si existe; la red actualiza en background
        return cached || fetchPromise;
      });
    })
  );
});
