// version.js — phiên bản + nhật ký cập nhật (changelog) RIÊNG cho TỪNG game.
// File CHỈ khai báo (không có lệnh chạy top-level) — an toàn với thứ tự load classic-script.
//
// Mỗi game là 1 khối trong GAME_CHANGELOGS:
//   { name:'Tên game', version:'X.Y.Z', log:[ {version,date,tag,title,items:[{ic,t}]}, ... ] }
//
// QUY TRÌNH RA BẢN MỚI cho MỘT game:
//   1. Thêm 1 mục MỚI vào ĐẦU mảng `log` của game đó (log[0] luôn là bản hiện tại).
//   2. Đặt `version` của game đó = version của log[0] (semantic MAJOR.MINOR.PATCH).
//        MAJOR: thay đổi lớn/định hình lại lối chơi · MINOR: thêm tính năng · PATCH: sửa lỗi.
//   3. Bump CACHE trong sw.js (và thêm file mới vào ASSETS nếu có).
//   4. Deploy — người chơi mở đúng game đó sẽ thấy bảng "Có gì mới" của game đó 1 lần.
//
// date: 'DD/MM/YYYY' — hiển thị cho người chơi.
// tag : nhãn ngắn (nền màu) ở góc mỗi bản, vd 'Bản lớn', 'Tính năng', 'Sửa lỗi', 'Mới'.
// items: mỗi dòng { ic:'emoji', t:'mô tả' }.

const GAME_CHANGELOGS = {
  daorong: {
    name: 'Đảo Rồng',
    version: '2.2.0',
    log: [
      {
        version: '2.2.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Đại chiến Boss',
        items: [
          { ic: '⚔️', t: 'Boss chiến sống động — cả đàn lao lên bắn chiêu, boss rung nảy, hiện số sát thương; đổi boss mỗi tuần (Hải Xà, Dung Nham, Titan Băng, Ác Long).' },
          { ic: '🎇', t: 'Đấu trường & Phiêu lưu có hiệu ứng chiến đấu — tung chiêu rung sân, đạn phép bay, khắc hệ bùng sáng.' },
          { ic: '🏞️', t: 'Mỗi trận một bối cảnh riêng — bãi biển, rừng rậm, núi lửa, vũ trụ, tháp…' },
          { ic: '🔔', t: 'Bảng "Có gì mới" giờ hiện riêng cho từng game, ngay trong màn hình game đó.' },
        ],
      },
      {
        version: '2.1.0',
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
    ],
  },

  tienlen: {
    name: 'Tiến Lên Miền Nam',
    version: '1.0.0',
    log: [
      {
        version: '1.0.0',
        date: '12/07/2026',
        tag: 'Bản lớn',
        title: 'Tiến Lên Miền Nam',
        items: [
          { ic: '🃏', t: 'Chơi Tiến Lên với 3 máy, hoặc đấu online 2 người (2 máy chơi phụ).' },
          { ic: '🪙', t: 'Ví xu đám mây — cược "đếm lá", thắng ăn xu người thua.' },
          { ic: '💬', t: 'Chat & ném đồ trêu đối thủ khi chơi online.' },
        ],
      },
    ],
  },

  maubinh: {
    name: 'Mậu Binh',
    version: '1.0.0',
    log: [
      {
        version: '1.0.0',
        date: '12/07/2026',
        tag: 'Mới',
        title: 'Mậu Binh ra mắt',
        items: [
          { ic: '🀄', t: 'Binh Xập Xám 13 lá — xếp 3 chi, so từng chi ăn xu.' },
          { ic: '✨', t: 'Binh nhanh — máy xếp sẵn, chạm 2 lá để đổi chỗ, gợi ý chi còn trống.' },
          { ic: '🤖', t: 'Chơi với 3 máy, dùng chung ví xu với Tiến Lên.' },
        ],
      },
    ],
  },
};

// ---------- Helper dùng chung ----------
function gameMeta(game){ return GAME_CHANGELOGS[game] || null; }
function gameLog(game){ const g = gameMeta(game); return g && Array.isArray(g.log) ? g.log : []; }
function gameVersion(game){ const g = gameMeta(game); return g ? g.version : '0'; }
function gameName(game){ const g = gameMeta(game); return g ? g.name : String(game || ''); }

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

// Tương thích ngược: vài chỗ cũ có thể còn tham chiếu (mặc định = game nền Tiến Lên).
const APP_VERSION = GAME_CHANGELOGS.tienlen.version;
