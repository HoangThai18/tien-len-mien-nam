const CACHE = 'tienlen-v56-sakura-art';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './js/config.js', './js/engine.js', './js/state.js', './js/game.js', './js/ui.js', './js/daorong.js', './js/social.js',
  './assets/characters/captain.webp', './assets/characters/mage.webp',
  './assets/characters/guardian.webp', './assets/characters/trickster.webp',
  './assets/items/luck.webp', './assets/items/hint.webp', './assets/items/bomb.webp', './assets/items/pass.webp',
  './assets/dragons/fire.png', './assets/dragons/water.png', './assets/dragons/plant.png',
  './assets/dragons/earth.png', './assets/dragons/electric.png', './assets/dragons/ice.png',
  './assets/dragons/lava.png', './assets/dragons/steam.png', './assets/dragons/swamp.png',
  './assets/dragons/storm.png', './assets/dragons/dark.png', './assets/dragons/light.png',
  './assets/dragons/peach.png', './assets/dragons/candy.png', './assets/dragons/sakura.png',
  './assets/dragons/evolution/fire.png', './assets/dragons/evolution/water.png',
  './assets/dragons/evolution/plant.png', './assets/dragons/evolution/earth.png',
  './assets/dragons/evolution/electric.png', './assets/dragons/evolution/ice.png',
  './assets/dragons/evolution/lava.png', './assets/dragons/evolution/steam.png',
  './assets/dragons/evolution/swamp.png', './assets/dragons/evolution/storm.png',
  './assets/dragons/evolution/dark.png', './assets/dragons/evolution/light.png',
  './assets/dragons/evolution/peach.png', './assets/dragons/evolution/candy.png', './assets/dragons/evolution/sakura.png',
  './assets/dragon-island/island.webp',
  './assets/dragon-island/items/shop.webp', './assets/dragon-island/items/quest.webp',
  './assets/dragon-island/items/breed.webp', './assets/dragon-island/items/food.webp',
  './assets/dragon-island/items/arena.webp', './assets/dragon-island/items/codex.webp',
  './assets/dragon-island/items/egg.webp', './assets/dragon-island/items/gem.webp',
  './assets/dragon-island/items/gold.webp', './assets/dragon-island/items/rock.webp',
  './assets/dragon-island/items/star.webp', './assets/dragon-island/items/gift.webp',
  './assets/dragon-island/ui/habitat.webp', './assets/dragon-island/ui/farm.webp',
  './assets/dragon-island/ui/adventure.webp', './assets/dragon-island/ui/tower.webp',
  './assets/dragon-island/ui/boss.webp', './assets/dragon-island/ui/daily.webp',
  './assets/dragon-island/ui/achievement.webp', './assets/dragon-island/ui/leaderboard.webp',
  './assets/dragon-island/ui/friends.webp', './assets/dragon-island/ui/event.webp',
  './assets/dragon-island/ui/runes.webp', './assets/dragon-island/ui/ranked.webp',
  './assets/dragon-island/ui/decor.webp', './assets/dragon-island/ui/shop.webp',
  './assets/dragon-island/ui/quest.webp', './assets/dragon-island/ui/wheel.webp',
  './assets/dragon-island/ui/forge.webp', './assets/dragon-island/ui/breed.webp',
  './assets/dragon-island/ui/feed.webp', './assets/dragon-island/ui/arena.webp',
  './assets/dragon-island/ui/codex.webp', './assets/dragon-island/ui/mail.webp',
  './assets/dragon-island/ui/incubator.webp', './assets/dragon-island/ui/back.webp',
  './assets/dragon-island/ui/close.webp', './assets/dragon-island/ui/rebirth.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-app-compat.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-auth-compat.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.23.0/firebase-database-compat.min.js',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// File của game ưu tiên mạng để app cài trên điện thoại luôn nhận bản mới;
// khi mất mạng mới dùng cache. CDN ít đổi nên vẫn ưu tiên cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const cacheable = u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com'
    || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request).then(hit =>
        hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)
      ))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
