const CACHE = 'tienlen-v151-whatsnew-dragons';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './js/config.js', './js/version.js', './js/engine.js', './js/state.js', './js/game.js', './js/ui.js', './js/daorong.js', './js/maubinh.js', './js/social.js',
  './assets/characters/captain.webp', './assets/characters/mage.webp',
  './assets/characters/guardian.webp', './assets/characters/trickster.webp',
  './assets/items/luck.webp', './assets/items/hint.webp', './assets/items/bomb.webp', './assets/items/pass.webp',
  './assets/dragons/fire.webp', './assets/dragons/water.webp', './assets/dragons/plant.webp',
  './assets/dragons/earth.webp', './assets/dragons/electric.webp', './assets/dragons/ice.webp',
  './assets/dragons/lava.webp', './assets/dragons/steam.webp', './assets/dragons/swamp.webp',
  './assets/dragons/storm.webp', './assets/dragons/dark.webp', './assets/dragons/light.webp',
  './assets/dragons/peach.webp', './assets/dragons/candy.webp', './assets/dragons/sakura.webp',
  './assets/dragons/rose.webp', './assets/dragons/lotus.webp', './assets/dragons/peony.webp',
  './assets/dragons/bubblegum.webp', './assets/dragons/starlight.webp', './assets/dragons/aurora.webp',
  './assets/dragons/carnival.webp', './assets/dragons/prism.webp', './assets/dragons/kaleidoscope.webp',
  './assets/dragons/rainbow.webp',
  './assets/dragons/mint.webp', './assets/dragons/lemon.webp', './assets/dragons/berry.webp',
  './assets/dragons/coral.webp', './assets/dragons/cloud.webp',
  './assets/dragons/evolution/mint.webp', './assets/dragons/evolution/lemon.webp', './assets/dragons/evolution/berry.webp',
  './assets/dragons/evolution/coral.webp', './assets/dragons/evolution/cloud.webp', './assets/dragons/evolution/rainbow.webp',
  './assets/dragons/evolution/fire.webp', './assets/dragons/evolution/water.webp',
  './assets/dragons/evolution/plant.webp', './assets/dragons/evolution/earth.webp',
  './assets/dragons/evolution/electric.webp', './assets/dragons/evolution/ice.webp',
  './assets/dragons/evolution/lava.webp', './assets/dragons/evolution/steam.webp',
  './assets/dragons/evolution/swamp.webp', './assets/dragons/evolution/storm.webp',
  './assets/dragons/evolution/dark.webp', './assets/dragons/evolution/light.webp',
  './assets/dragons/evolution/peach.webp', './assets/dragons/evolution/candy.webp', './assets/dragons/evolution/sakura.webp',
  './assets/dragons/evolution/rose.webp', './assets/dragons/evolution/lotus.webp', './assets/dragons/evolution/peony.webp',
  './assets/dragons/evolution/bubblegum.webp', './assets/dragons/evolution/starlight.webp', './assets/dragons/evolution/aurora.webp',
  './assets/dragons/evolution/carnival.webp', './assets/dragons/evolution/prism.webp', './assets/dragons/evolution/kaleidoscope.webp',
  './assets/dragons/cotton-candy.webp', './assets/dragons/strawberry-cream.webp', './assets/dragons/blossom-bubble.webp', './assets/dragons/cherry-soda.webp', './assets/dragons/pearl-lotus.webp', './assets/dragons/rose-quartz.webp', './assets/dragons/moon-ribbon.webp', './assets/dragons/rainbow-mochi.webp', './assets/dragons/starlight-bow.webp', './assets/dragons/cupid-heart.webp',
  './assets/dragons/evolution/cotton-candy.webp', './assets/dragons/evolution/strawberry-cream.webp', './assets/dragons/evolution/blossom-bubble.webp', './assets/dragons/evolution/cherry-soda.webp', './assets/dragons/evolution/pearl-lotus.webp', './assets/dragons/evolution/rose-quartz.webp', './assets/dragons/evolution/moon-ribbon.webp', './assets/dragons/evolution/rainbow-mochi.webp', './assets/dragons/evolution/starlight-bow.webp', './assets/dragons/evolution/cupid-heart.webp',
  './assets/dragon-island/effects/projectiles/fire.webp', './assets/dragon-island/effects/projectiles/water.webp',
  './assets/dragon-island/effects/projectiles/electric.webp', './assets/dragon-island/effects/projectiles/ice.webp',
  './assets/dragon-island/effects/projectiles/dark.webp', './assets/dragon-island/effects/projectiles/light.webp',
  './assets/dragon-island/effects/projectiles/plant.webp', './assets/dragon-island/effects/projectiles/earth.webp',
  './assets/dragon-island/effects/evolution/evolution-aura.webp', './assets/dragon-island/effects/stars/star-aura.webp',
  './assets/dragon-island/combat/roles/tank.webp', './assets/dragon-island/combat/roles/heal.webp', './assets/dragon-island/combat/roles/dps.webp',
  './assets/dragon-island/combat/status/burn.webp', './assets/dragon-island/combat/status/poison.webp', './assets/dragon-island/combat/status/freeze.webp',
  './assets/dragon-island/combat/status/shield.webp', './assets/dragon-island/combat/status/atkup.webp', './assets/dragon-island/combat/status/taunt.webp',
  './assets/dragon-island/events/moon.webp', './assets/dragon-island/events/flame.webp', './assets/dragon-island/events/ocean.webp', './assets/dragon-island/events/blossom.webp',
  './assets/dragon-island/ranks/bronze.webp', './assets/dragon-island/ranks/silver.webp', './assets/dragon-island/ranks/gold.webp', './assets/dragon-island/ranks/platinum.webp', './assets/dragon-island/ranks/diamond.webp', './assets/dragon-island/ranks/master.webp',
  './assets/dragon-island/runes/atk-t2.webp', './assets/dragon-island/runes/atk-t3.webp', './assets/dragon-island/runes/hp-t2.webp', './assets/dragon-island/runes/hp-t3.webp', './assets/dragon-island/runes/spd-t2.webp', './assets/dragon-island/runes/spd-t3.webp',
  './assets/dragon-island/island.webp',
  './assets/dragon-island/islands/island-01.webp',
  './assets/dragon-island/islands/island-02.webp',
  './assets/dragon-island/islands/island-03.webp',
  './assets/dragon-island/islands/island-04.webp',
  './assets/dragon-island/islands/island-05.webp',
  './assets/dragon-island/islands/island-06.webp',
  './assets/dragon-island/islands/island-07.webp',
  './assets/dragon-island/islands/island-08.webp',
  './assets/dragon-island/islands/island-09.webp',
  './assets/dragon-island/islands/island-10.webp',
  './assets/dragon-island/islands/island-11.webp',
  './assets/dragon-island/islands/island-12.webp',
  './assets/dragon-island/islands/island-13.webp',
  './assets/dragon-island/islands/island-14.webp',
  './assets/dragon-island/islands/island-15.webp',
  './assets/dragon-island/islands/island-16.webp',
  './assets/dragon-island/islands/island-17.webp',
  './assets/dragon-island/islands/island-18.webp',
  './assets/dragon-island/islands/island-19.webp',
  './assets/dragon-island/islands/island-20.webp',
  './assets/dragon-island/effects/islands/animated/tier-01.webp',
  './assets/dragon-island/effects/islands/animated/tier-02.webp',
  './assets/dragon-island/effects/islands/animated/tier-03.webp',
  './assets/dragon-island/effects/islands/animated/tier-04.webp',
  './assets/dragon-island/effects/islands/animated/tier-05.webp',
  './assets/dragon-island/bosses/sea-serpent.webp', './assets/dragon-island/bosses/lava-dragon.webp', './assets/dragon-island/bosses/ice-titan.webp', './assets/dragon-island/bosses/dark-dragon.webp',
  './assets/dragon-island/adventure/01-beach.webp', './assets/dragon-island/adventure/02-jungle.webp', './assets/dragon-island/adventure/03-ice-cave.webp',
  './assets/dragon-island/adventure/04-volcano.webp', './assets/dragon-island/adventure/05-swamp.webp', './assets/dragon-island/adventure/06-dark-abyss.webp',
  './assets/dragon-island/adventure/07-dragon-peak.webp', './assets/dragon-island/adventure/08-ancient-desert.webp', './assets/dragon-island/adventure/09-cloud-islands.webp',
  './assets/dragon-island/adventure/10-luminous-grove.webp', './assets/dragon-island/adventure/11-ruined-city.webp', './assets/dragon-island/adventure/12-crystal-garden.webp',
  './assets/dragon-island/decor/flowers.webp', './assets/dragon-island/decor/torch.webp', './assets/dragon-island/decor/tree.webp', './assets/dragon-island/decor/fountain.webp',
  './assets/dragon-island/decor/statue.webp', './assets/dragon-island/decor/lantern.webp', './assets/dragon-island/decor/crystal.webp', './assets/dragon-island/decor/rainbow.webp',
  './assets/dragon-island/obstacles/rock.webp', './assets/dragon-island/obstacles/cactus.webp', './assets/dragon-island/obstacles/log.webp', './assets/dragon-island/obstacles/boulder.webp',
  './assets/dragon-island/runes/atk.webp', './assets/dragon-island/runes/atk-t1.webp', './assets/dragon-island/runes/hp.webp', './assets/dragon-island/runes/hp-t1.webp', './assets/dragon-island/runes/spd.webp', './assets/dragon-island/runes/spd-t1.webp',
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
  './assets/dragon-island/ui/close.webp', './assets/dragon-island/ui/rebirth.webp', './assets/dragon-island/ui/bag.webp',
  './assets/dragon-island/effects/ui/animated/level-up.webp', './assets/dragon-island/effects/ui/animated/victory.webp',
  './assets/dragon-island/effects/ui/animated/egg-hatch.webp', './assets/dragon-island/effects/ui/animated/reward-burst.webp',
  './assets/dragon-island/effects/ui/animated/coin-collect.webp', './assets/dragon-island/effects/ui/animated/gem-collect.webp',
  './assets/dragon-island/effects/ui/animated/critical-hit.webp', './assets/dragon-island/effects/ui/animated/heal.webp',
  './assets/dragon-island/effects/ui/animated/shield.webp', './assets/dragon-island/effects/ui/animated/unlock.webp',
  './assets/dragon-island/bosses/sprites/sea-serpent.webp', './assets/dragon-island/bosses/sprites/lava-dragon.webp',
  './assets/dragon-island/bosses/sprites/ice-titan.webp', './assets/dragon-island/bosses/sprites/dark-dragon.webp',
  './assets/dragon-island/ui-kit/notifications/achievement.webp', './assets/dragon-island/ui-kit/notifications/reward.webp',
  './assets/dragon-island/ui-kit/notifications/mail.webp', './assets/dragon-island/ui-kit/notifications/unlocked.webp',
  './assets/dragon-island/ui-kit/notifications/success.webp', './assets/dragon-island/ui-kit/notifications/warning.webp',
  './assets/dragon-island/ui-kit/popups/crystal.webp', './assets/dragon-island/ui-kit/popups/legendary.webp', './assets/dragon-island/ui-kit/popups/common.webp',
  './assets/dragon-island/ui-kit/notifications/level-up.webp',
  './assets/dragon-island/ui-kit/buttons/primary.webp', './assets/dragon-island/ui-kit/buttons/success.webp',
  './assets/dragon-island/ui-kit/buttons/danger.webp', './assets/dragon-island/ui-kit/buttons/legendary.webp',
  './assets/maubinh/frames/animated/frame-silver.webp', './assets/maubinh/frames/animated/frame-neon.webp',
  './assets/maubinh/frames/animated/frame-gold.webp', './assets/maubinh/frames/animated/frame-fire.webp',
  './assets/maubinh/frames/animated/frame-rainbow.webp',
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
    // Chỉ file code (html/js/css) mới bỏ qua cache HTTP để luôn lấy bản mới;
    // ảnh vẫn dùng cache cho nhẹ data.
    const isCode = e.request.mode === 'navigate' || /\.(?:js|css|webmanifest)$/.test(u.pathname);
    e.respondWith(
      fetch(e.request, isCode ? { cache: 'reload' } : undefined).then(res => {
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
