NGUỒN ẢNH RỒNG (raw frames từ ChatGPT) — dùng để GHÉP thành sprite-sheet.
Cấu trúc: _frames/<tên-rồng>/  chứa các khung của MỘT con rồng.

Quy ước tên khung (thứ tự flap):
  1-wings-closed.png   cánh cụp (mắt mở)   — khung nghỉ
  2-wings-half-a.png   1 cánh xoè
  3-wings-open.png     2 cánh xoè rộng     — đỉnh vỗ cánh
  4-wings-half-b.png   cánh xoè giữa
  5-blink.png          cánh cụp + mắt nhắm — chớp mắt

Sau khi ghép + căn khung -> xuất ra ../<species-id>.png (sprite-sheet game dùng).
Ví dụ species-id: fire, water, plant, earth, electric, ice, lava, steam,
                  swamp, storm, dark, light.
Sheet game-ready nằm ở assets/dragons/<id>.png (KHÔNG để trong _frames).
