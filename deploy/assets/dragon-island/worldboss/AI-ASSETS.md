# [AI-ASSET] Boss Thế Giới — ảnh cần AI tạo

Tính năng Boss Thế Giới (deploy/js/daorong.js → `drShowWorldBoss`, `drWbBossArt`) đã chạy được ngay
với FALLBACK. Thả file vào ĐÚNG path là lên hình — KHÔNG cần sửa code.

Thứ tự ưu tiên khi hiển thị boss (code tự dò):
  1) sprites/<img>.webp   → SPRITE-SHEET ĐỘNG (khuyên dùng — boss có animation)
  2) <img>.webp           → ảnh tĩnh (world boss)
  3) ../bosses/<img>.webp → ảnh boss tuần cũ
  4) emoji 👹             → khi không có ảnh nào

---

## 1) NỀN CHIẾN TRƯỜNG — `arena/<theme>.webp`
Ảnh phong cảnh chiến trường HOÀNH TRÁNG, tối, nhiều chiều sâu. Bố cục dọc 9:16 (~1080×1920):
1/3 TRÊN để trống cho boss ngự, 1/3 DƯỚI là mặt đất trống cho 10 rồng đứng — để nhìn rõ 2 bên giao chiến.
- `arena/water.webp`  — biển sâu / vực nước, ánh lân tinh   (boss: Hải Hoàng Leviathan)
- `arena/lava.webp`   — miệng núi lửa, dung nham đỏ rực     (boss: Viêm Long Đế)
- `arena/aurora.webp` — hang băng / cực quang lạnh          (boss: Băng Đế Titan)
- `arena/dark.webp`   — hư không tím đen, sấm ám            (boss: Hắc Long Mạt Thế)

## 2) BOSS ĐỘNG (khuyên dùng) — `bosses/sprites/<img>.webp`  ← SPRITE-SHEET
SPRITE-SHEET NGANG: 8 khung ghép ngang thành 1 file (vd 2048×256 = 8 khung 256×256).
- Nền TRONG SUỐT (alpha). MỌI khung cùng kích thước, canh giữa, giãn cách đều.
- Vòng lặp mượt (khung cuối nối liền khung đầu): boss thở / vẫy cánh / đuôi phe phẩy.
- Code tự nhận số khung theo tỉ lệ ảnh (rộng/cao). Ảnh rộng ≥ ~2× cao mới coi là sheet.
- Files: `bosses/sprites/sea-serpent.webp`, `lava-dragon.webp`, `ice-titan.webp`, `dark-dragon.webp`

## 3) BOSS TĨNH (tuỳ chọn, fallback) — `bosses/<img>.webp`
Nếu chưa làm được sprite: 1 ảnh tĩnh boss KHỔNG LỒ, nền trong suốt, ~1024×1024+, tư thế gầm/đe doạ.
- Files: `bosses/sea-serpent.webp`, `lava-dragon.webp`, `ice-titan.webp`, `dark-dragon.webp`

> Đổi/thêm boss theo tuần: sửa `DR_WB_NAME / DR_WB_IMG / DR_WB_THEME` trong `deploy/js/daorong.js`.
> Quy ước sprite giống rồng: xem `DR_SPECIES[...].sheet` (8 khung) và `.dr-boss-sprite` trong styles.css.
