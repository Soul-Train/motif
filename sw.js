/* Motif offline support: keeps the app itself on the phone so it opens with no signal.
   Gemini calls are never cached; those need the internet. */
var CACHE = "motif-v1";
var SHELL = ["./", "index.html", "manifest.json", "icon-180.png", "icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.hostname === "generativelanguage.googleapis.com") return;
  // The app page: try the network first so updates arrive, fall back to the saved copy offline.
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put("index.html", copy); }); return res;
    }).catch(function(){ return caches.match("index.html"); }));
    return;
  }
  // Everything else (icons, fonts): use the saved copy, refresh it in the background.
  e.respondWith(caches.match(req).then(function(hit){
    var net = fetch(req).then(function(res){
      if (res && (res.ok || res.type === "opaque")) { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      return res;
    }).catch(function(){ return hit; });
    return hit || net;
  }));
});
