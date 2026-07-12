<div align="center">

<img src="deploy/icon-512.png" alt="Tiến Lên Miền Nam" width="150" />

# 🃏 Tiến Lên Miền Nam — Online

**Game bài Việt Nam trên trình duyệt — chơi với máy hoặc online 2–4 người thật.**

Một PWA _không cần build_, cài được như app · đăng nhập Firebase · ví xu trên mây · chat & ném đồ trêu bạn.

[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)](#-cài-thành-app)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%2B%20RTDB-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![No build](https://img.shields.io/badge/build-none-brightgreen)](#-không-có-hệ-thống-build)
[![Version](https://img.shields.io/badge/version-2.1.0-0b6b46)](deploy/js/version.js)

### 🎮 [**Chơi ngay → tien-len-3143c.web.app**](https://tien-len-3143c.web.app)

</div>

---

## ✨ Ba trò chơi trong một app

<table>
<tr>
<td width="33%" align="center" valign="top">

<img src="deploy/assets/characters/captain.webp" alt="Tiến Lên" width="110" /><br>
### 🃏 Tiến Lên Miền Nam
Đánh bài kinh điển — solo với 3 bot hoặc **online 2 người thật** đồng bộ realtime. Chặt 2, đếm lá tính tiền, khui 3♠ mở ván.

</td>
<td width="33%" align="center" valign="top">

<img src="deploy/assets/dragon-island/items/egg.webp" alt="Đảo Rồng" width="96" /><br>
### 🐉 Đảo Rồng
Nuôi & lai rồng — 15+ loài (Hồng, Cầu Vồng, pastel), 4 hình thái tiến hoá, Sách Rồng, Lực chiến, cửa hàng 7 gian.

</td>
<td width="33%" align="center" valign="top">

<img src="deploy/assets/dragons/rose.webp" alt="Mậu Binh" width="110" /><br>
### ♠️ Mậu Binh
Xếp 13 lá thành 3 chi (Chinese Poker) — so từng chi ăn tiền.

</td>
</tr>
</table>

---

## 🏝️ Đảo Rồng của bạn

<div align="center">
<img src="deploy/assets/dragon-island/island.webp" alt="Đảo Rồng" width="720" />
</div>

> Ấp trứng, lai tạo, tiến hoá và ngắm đàn rồng thong dong dạo quanh hòn đảo riêng.

---

## 👥 Bốn tay chơi cho bàn Tiến Lên

Khi thiếu người thật, các bot dưới đây sẽ ngồi vào ghế trống:

<table>
<tr>
<td align="center"><img src="deploy/assets/characters/captain.webp" width="96" /><br><b>Thuyền Trưởng</b></td>
<td align="center"><img src="deploy/assets/characters/mage.webp" width="96" /><br><b>Mèo Phù Thuỷ</b></td>
<td align="center"><img src="deploy/assets/characters/guardian.webp" width="96" /><br><b>Cún Vệ Binh</b></td>
<td align="center"><img src="deploy/assets/characters/trickster.webp" width="96" /><br><b>Cáo Ranh Mãnh</b></td>
</tr>
</table>

---

## 💥 Ném đồ trêu đối thủ

Trong phòng online, phang cho đối thủ vài món cho vui (payload chỉ là số nguyên — an toàn XSS):

<table>
<tr>
<td align="center"><img src="deploy/assets/items/bomb.webp" width="72" /><br>Bom</td>
<td align="center"><img src="deploy/assets/items/pass.webp" width="72" /><br>Bỏ lượt</td>
<td align="center"><img src="deploy/assets/items/hint.webp" width="72" /><br>Gợi ý</td>
<td align="center"><img src="deploy/assets/items/luck.webp" width="72" /><br>May mắn</td>
</tr>
</table>

---

## 🌟 Tính năng chung

- 🔐 **Đăng nhập** Email/Password (Firebase Auth) — bắt buộc để chơi, kể cả solo
- 💰 **Ví xu trên mây** (`users/<uid>`), cược **"đếm lá"** — thua trả `số lá còn × mức cược`
- 💬 **Chat** online trong phòng + 🎉 **ném đồ** trêu đối thủ
- 📲 **Cài như app** (PWA, chạy offline sau lần đăng nhập đầu), tối ưu màn hình ngang
- 🔔 Bảng **"Có gì mới"** tự hiện 1 lần mỗi khi lên phiên bản mới

---

## 🚀 Chạy tại máy

Không có bundler — chỉ cần serve thư mục `deploy/` qua HTTP (Firebase Auth cần origin thật + mạng ở lần đăng nhập đầu, nên `file://` không dùng được):

```bash
python3 -m http.server -d deploy 8000
# → mở http://localhost:8000
```

> Sau lần đăng nhập online đầu tiên, persistence của Auth cho phép mở lại PWA **offline** để chơi solo (ghi ví là best-effort).

### Cấu hình Firebase

Điền config vào [deploy/js/config.js](deploy/js/config.js) (`FIREBASE_CONFIG`). Nếu `apiKey` còn chữ `DÁN`, app coi như chưa cấu hình và hiện overlay dán config. Project Firebase cần:

- Bật **Email/Password auth**
- Đặt **RTDB rules** (owner-only ghi `users/<uid>`, authed đọc/ghi `rooms`) — xem [deploy/HUONG-DAN.txt](deploy/HUONG-DAN.txt)

---

## 🧱 Không có hệ thống build

Không `package.json`, không bundler, không linter, không test. Quy trình phát triển: **sửa file trong `deploy/` → mở trình duyệt.** Phụ thuộc ngoài duy nhất là **Firebase 9.23.0 compat SDK** nạp từ cdnjs.

`index.html` chỉ là vỏ HTML (link CSS, 3 script Firebase compat, rồi các script app nạp **theo đúng thứ tự phụ thuộc**). Các script là **classic (non-module)** nên dùng chung một global scope — mọi lệnh chạy top-level chỉ nằm ở file cuối (`social.js`).

```
deploy/
├─ index.html            vỏ HTML + shell
├─ styles.css            toàn bộ CSS
├─ manifest.webmanifest  cấu hình PWA
├─ sw.js                 service worker (cache tienlen-v…)
├─ assets/               hình rồng, nhân vật, item, đảo
└─ js/
   ├─ config.js     FIREBASE_CONFIG
   ├─ version.js    APP_VERSION + CHANGELOG ("Có gì mới")
   ├─ engine.js     engine thuần: newDeck, classify, beats, legalMoves, botMove
   ├─ state.js      freshState / applyPlay / applyPass / settleGame (đếm lá)
   ├─ game.js       session + networking + auth + ví (host-authoritative)
   ├─ ui.js         input, render, FX, các màn hình show*
   ├─ daorong.js    🐉 Đảo Rồng
   ├─ maubinh.js    ♠️ Mậu Binh
   └─ social.js     chat, ném đồ, wiring sự kiện + boot()
```

**Kiến trúc mạng (Tiến Lên online):** host-authoritative — chỉ host/solo chạy reducer + `driveBots`, đẩy nguyên state (`JSON.stringify`) lên `rooms/<code>/state`; guest gửi nước đi vào `rooms/<code>/actions`; phòng tự xoá qua `onDisconnect().remove()`.

---

## 📦 Deploy

Static hosting kéo-thả: bỏ nguyên thư mục `deploy/` lên Firebase Hosting.

```bash
npx firebase-tools deploy --only hosting
```

> ⚠️ **Khi đổi file:** nhớ **bump `CACHE` trong [deploy/sw.js](deploy/sw.js)** và thêm file mới vào `ASSETS`, nếu không client giữ bản cũ.

---

## 🕹️ Luật & quy ước cốt lõi

- **Bậc bài:** 3..15, trong đó `15 = "2"` (cao nhất). Chất `♠ < ♣ < ♦ < ♥`. Định danh lá: `cid = rank*4 + suit`.
- **Ghế:** `0` = host/solo, `2` = guest, `1 & 3` = bot online (mọi ghế khác 0 là bot khi chơi solo).
- **Mở ván:** ván mới phải có 3♠ (`S.firstPlay`) — ai giữ 3♠ đi trước.
- **Kết ván:** dừng ở **người về nhất đầu tiên** — người thua trả `cardsLeft × bet`, người nhất ôm nồi (`settleGame`).
- **Ví settle 1 lần/ván/client**, chống double qua `lastSettled === gameId` + guard `settledGameId`. Ví là client-authoritative (rules chỉ ép owner-only) — muốn chống gian lận thật cần Cloud Functions.

---

## 🔖 Ra bản mới

Xem hướng dẫn trong [deploy/js/version.js](deploy/js/version.js):

1. Thêm mục **mới nhất** vào đầu mảng `CHANGELOG` (mục `[0]` = bản hiện tại).
2. Đặt `APP_VERSION` = version mục `[0]` (semantic `MAJOR.MINOR.PATCH`).
3. Bump `CACHE` trong `sw.js` (+ thêm file mới vào `ASSETS` nếu có).
4. Deploy — người chơi bản cũ sẽ tự thấy bảng **"Có gì mới"** một lần.

---

<div align="center">
<sub>Toàn bộ UI, comment và toast bằng tiếng Việt · Xây bằng vanilla JS + Firebase, không framework 💚</sub>
</div>
