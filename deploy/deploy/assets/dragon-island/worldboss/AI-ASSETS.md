# [AI-ASSET] Boss Thế Giới — ảnh cần AI tạo

Tính năng Boss Thế Giới (daorong.js → `drShowWorldBoss`) đã chạy được ngay với FALLBACK
(nền = gradient theo hệ, boss = ảnh boss tuần cũ trong `../bosses/*.webp`).
Thả các file dưới đây vào ĐÚNG đường dẫn để lên hình xịn. Không cần đổi code.

## 1) Nền chiến trường — `worldboss/arena/<theme>.webp`
Ảnh phong cảnh chiến trường HOÀNH TRÁNG, tối, nhiều chiều sâu. Bố cục dọc (mobile):
boss ngự ~1/3 TRÊN, khoảng đất trống ~1/3 DƯỚI cho 10 rồng đứng. Tỉ lệ ~9:16, ~1080×1920.
- `arena/water.webp`  — biển sâu / vực nước, ánh lân tinh (boss: Hải Hoàng Leviathan)
- `arena/lava.webp`   — miệng núi lửa, dung nham đỏ rực (boss: Viêm Long Đế)
- `arena/aurora.webp` — hang băng / cực quang lạnh (boss: Băng Đế Titan)
- `arena/dark.webp`   — hư không tím đen, sấm ám (boss: Hắc Long Mạt Thế)

## 2) Boss KHỔNG LỒ — `worldboss/bosses/<img>.webp`
Nền TRONG SUỐT (alpha). Tư thế gầm/đe doạ, cực lớn, chi tiết cao. ~1024×1024+.
- `bosses/sea-serpent.webp`  — mãng xà biển khổng lồ
- `bosses/lava-dragon.webp`  — rồng dung nham
- `bosses/ice-titan.webp`    — titan băng giá
- `bosses/dark-dragon.webp`  — ác long bóng tối

> Đổi/ thêm boss theo tuần: sửa `DR_WB_NAME/DR_WB_IMG/DR_WB_THEME` trong `js/daorong.js`.
