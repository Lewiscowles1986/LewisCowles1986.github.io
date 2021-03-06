const MAX_WAIT = 500;
const CACHEVERSION = 'v2';
const CACHEDSTATICASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/blog/index.html',
  '/css/style.css'
];
const OFFLINE_PAGE = '/offline.html';

const THIS_SITE = `${self.location.protocol}//${self.location.host}`;
console.log(THIS_SITE);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    if (registrations.length) { // returns installed service workers
      for(let registration of registrations) {
        registration.unregister();
      }
    }
  });
}
self.addEventListener('install', function(event) {
  caches.open(CACHEVERSION).then(function(cache) {
    cache.addAll(CACHEDSTATICASSETS)
    cache.add(OFFLINE_PAGE);
  }).then(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  const currentCaches = [CACHEDSTATICASSETS];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return cacheNames.filter(function(cacheName) {
        !currentCaches.includes(cacheName)
      });
    }).then(function(cachesToDelete) {
      return Promise.all(cachesToDelete.map(
        function(cacheToDelete) {
          return caches.delete(cacheToDelete);
        }
      ));
    }).then(function() {
      self.clients.claim()
    })
  );
});

self.addEventListener('fetch', function(event) {
  if(
    (event.request.url.startsWith(THIS_SITE)) &&
    (event.request.method == "GET")
  ) { // Not X-domain
    // Try network and if it fails, go for the cached copy.
    event.respondWith(
      fromNetwork(event.request, MAX_WAIT)
        .catch(function () {
          return fromCache(event.request);
        })
    );
  }
});

// Time limited network request. If the network fails or the response is not
// served before timeout, the promise is rejected.
function fromNetwork(request, timeout) {
  return new Promise(function (fulfill, reject) {
    // Reject in case of timeout.
    var timeoutId = setTimeout(reject, timeout);
    fetch(request).then(function (response) {
      clearTimeout(timeoutId);

      if (response.ok) {
        // update stored in cache
        caches.open(CACHEVERSION).then(function(cache) {
          cache.put(request, response);
        });

        fulfill(response.clone()); // Fulfill in case of success.
      }
      if(response.status) {
        // Respect 4XX errors and remove from cache
        if(`${response.status}`[0] === '4') { caches.open(CACHEVERSION).then(function (cache) { cache.delete(request); }) }
        // Resiliency against 5XX errors
        if(`${response.status}`[0] === '5') { reject(); }
        fulfill(response.clone()); // Fulfill using server response
      }
    }).catch(reject); // Reject also if network fetch rejects.
  });
}

// Open the cache where the assets were stored and search for the requested
// resource. In case of no matching, if 'text/html' is requested (headers),
// then the the offline fallback page is rendered. Otherwise the promise 
// still resolves, but it does with `undefined` as value, which shows as a
// Network error.
function fromCache(request) {
  return caches.open(CACHEVERSION).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    }).catch(function(err) {
      if (request.headers.get('Accept').includes('text/html')) {
        return caches.match(OFFLINE_PAGE);
      }
    });
  });
}
