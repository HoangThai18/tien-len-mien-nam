// version.js — phiên bản ứng dụng + nhật ký cập nhật (changelog).
// File CHỈ khai báo (không có lệnh chạy top-level) — an toàn với thứ tự load classic-script.
//
// QUY TRÌNH RA BẢN MỚI (đàng hoàng):
//   1. Thêm 1 mục MỚI vào ĐẦU mảng CHANGELOG (mục [0] luôn là bản hiện tại).
//   2. Đặt APP_VERSION = version của mục [0]  (dùng semantic MAJOR.MINOR.PATCH).
//        MAJOR: thay đổi lớn/định hình lại lối chơi · MINOR: thêm tính năng · PATCH: sửa lỗi.
//   3. Bump CACHE trong sw.js và thêm file mới vào ASSETS nếu có.
//   4. Deploy — người chơi đang ở bản cũ sẽ tự thấy bảng "Có gì mới" 1 lần.
//
// date: 'DD/MM/YYYY' — hiển thị cho người chơi.
// tag : nhãn ngắn (nền màu) ở góc mỗi bản, vd 'Bản lớn', 'Tính năng', 'Sửa lỗi'.
// items: mỗi dòng { ic:'emoji', t:'mô tả' }.

const APP_VERSION = '2.0.0';

const CHANGELOG = [
  {
    version: '2.0.0',
    date: '12/07/2026',
    tag: 'Bản lớn',
    title: 'Đảo Rồng bùng nổ',
    items: [
      { ic: '🐉', t: 'Ra mắt loạt rồng mới — 5 hệ Hồng, 5 hệ Cầu Vồng & 5 rồng pastel dễ thương (Bạc Hà, Chanh, Việt Quất, San Hô, Mây), đủ sprite, tiến hoá & công thức lai.' },
      { ic: '⚔️', t: 'Thêm "Lực chiến" — xem tổng sức mạnh cả đàn ngay trên thanh HUD, chạm để xếp hạng từng rồng.' },
      { ic: '📖', t: 'Làm mới Sách Rồng — gom theo độ hiếm & ngắm đủ 4 hình thái tiến hoá của mỗi loài.' },
      { ic: '🐾', t: 'Rồng giờ thong dong đi dạo quanh sân riêng, không dồn cục che ổ trứng.' },
      { ic: '🛒', t: 'Cửa hàng mở rộng từ 3 lên 7 gian hàng, mở đảo mượt hơn (hết chớp bàn bài khi tải).' },
      { ic: '🔔', t: 'Thêm bảng "Có gì mới" + tối ưu màn hình ngang cho điện thoại.' },
    ],
  },
  {
    version: '1.9.0',
    date: '11/07/2026',
    tag: 'Tính năng',
    title: 'Hẹn giờ lai & giao diện',
    items: [
      { ic: '⏳', t: 'Cập nhật đồng hồ đếm ngược khi lai rồng.' },
      { ic: '🎨', t: 'Tinh chỉnh bố cục dock & khu rồng trên mobile ngang.' },
    ],
  },
];

// Mục changelog mới nhất (bản hiện tại).
function latestRelease(){ return CHANGELOG[0] || null; }

// So sánh 2 chuỗi semantic 'a.b.c' — trả về true nếu `a` mới hơn (lớn hơn) `b`.
function isNewerVersion(a, b){
  const pa = String(a||'0').split('.').map(n=>parseInt(n,10)||0);
  const pb = String(b||'0').split('.').map(n=>parseInt(n,10)||0);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){
    const x=pa[i]||0, y=pb[i]||0;
    if(x!==y) return x>y;
  }
  return false;
}
