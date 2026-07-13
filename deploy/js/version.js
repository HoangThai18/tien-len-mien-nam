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
//   → Nếu bản cập nhật THÊM RỒNG MỚI: kèm dragons:['key1','key2',...] (key loài trong DR_SPECIES)
//     để bảng "Có gì mới" KHOE LUÔN hình các con rồng đó cho người chơi thấy.

const GAME_CHANGELOGS = {
  daorong: {
    name: 'Đảo Rồng',
    version: '2.8.0',
    log: [
      {
        version: '2.8.0',
        date: '13/07/2026',
        tag: 'Tính năng',
        title: 'Rồng cưng, lai & nông trại',
        items: [
          { ic: '🐣', t: 'Thêm 10 rồng dễ thương mới — ngắm thử bên dưới!', dragons: ['cotton-candy','strawberry-cream','blossom-bubble','cherry-soda','pearl-lotus','rose-quartz','moon-ribbon','rainbow-mochi','starlight-bow','cupid-heart'] },
          { ic: '🩷', t: 'Trứng RỒNG CƯNG mới ở Shop — mua bằng vàng (dễ kiếm), ai cũng dễ dàng sở hữu rồng dễ thương.' },
          { ic: '💞', t: 'Lai rồng nay ra được MỌI loài — thêm "đột biến" ~10% cho ra bất kỳ rồng nào (hiếm thì tỉ lệ thấp); vài rồng lai xịn (Dung Nham, Hơi Nước, Cầu Vồng, Lăng Kính…) chỉ LAI mới có, không bán ở trứng.' },
          { ic: '🌾', t: 'Nông trại thành game trồng trọt thật — 6 luống (mở rộng tới 9), 5 loại hạt lớn dần theo thời gian, gieo/thu tất cả 1 chạm.' },
          { ic: '🌟', t: 'Nông trại đáng cày — bội thu ×2 ngẫu nhiên, cây cao cấp rớt thêm 🪙/💎 & cho XP, bón phân bằng 💎 cho chín ngay.' },
        ],
      },
      {
        version: '2.7.0',
        date: '13/07/2026',
        tag: 'Tính năng',
        title: 'Thế giới đảo sống động',
        items: [
          { ic: '🏝️', t: '20 hòn đảo, mỗi đảo một khung cảnh riêng cực kỳ lộng lẫy — đổi đảo là đổi cả thế giới.' },
          { ic: '👹', t: 'Boss động vẫy cánh, thở phì phò — sống động hơn hẳn ảnh tĩnh.' },
          { ic: '✨', t: 'Rộn ràng hiệu ứng khắp nơi: lên cấp, tiến hoá, nở trứng, chí mạng, hồi máu, lên khiên, thu vàng/ngọc, thắng trận.' },
          { ic: '🎴', t: 'Nở rồng hiện thẻ khoe theo độ hiếm — rồng Hiếm & Huyền Thoại có khung riêng lộng lẫy.' },
          { ic: '🐉', t: 'Nuôi rồng tới cấp 60 — trần cấp mở dần theo số sao; muốn lên cao hơn thì nâng sao trước.' },
          { ic: '⚡', t: 'Chơi mượt hơn trên điện thoại + băng thông báo mới cho thành tựu, thưởng hạng, loài rồng mới.' },
        ],
      },
      {
        version: '2.6.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Lễ hội & hào quang',
        items: [
          { ic: '🎉', t: 'Thêm Sự kiện lễ hội luân phiên — Trăng Rằm, Lửa Thiêng, Đại Dương, Mùa Hoa Nở; chơi để tích điểm, đạt mốc nhận quà & rồng sự kiện.' },
          { ic: '✨', t: 'Rồng toả hào quang dưới chân theo bậc tiến hoá & bậc sao — càng lên cấp càng lộng lẫy.' },
          { ic: '🛡️', t: 'Chiến đấu hiển thị vai trò & hiệu ứng bằng icon riêng — đỡ đòn / hồi máu / sát thương, bỏng, độc, đóng băng, khiên…' },
          { ic: '🏅', t: 'Huy hiệu hạng đấu & đá cường hoá bậc cao có hình ảnh mới.' },
        ],
      },
      {
        version: '2.5.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Hoá rồng rực rỡ',
        items: [
          { ic: '🦋', t: 'Thêm hình thái tiến hoá cho loạt rồng hồng & rực rỡ (Hoa Hồng, Hoa Sen, Mẫu Đơn, Kẹo Bông, Ánh Sao, Cực Quang, Lễ Hội, Lăng Kính, Vạn Hoa) — mỗi con đổi hẳn tạo hình khi lên cấp.' },
          { ic: '✨', t: 'Đạn phép có hình riêng theo hệ (Lửa, Nước, Điện, Băng, Cây, Đất, Ánh Sáng, Bóng Tối) bay vào kẻ địch khi giao chiến.' },
          { ic: '🏆', t: 'Thành tựu tiến hoá mới — nuôi rồng lên Thiếu Niên & Trưởng Thành để nhận thưởng.' },
        ],
      },
      {
        version: '2.4.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Chiến đấu chiến thuật',
        items: [
          { ic: '⚔️', t: 'Chiến đấu theo lượt có chiến thuật — rồng chia vai trò (đỡ đòn / sát thương), tung kỹ năng riêng theo hệ.' },
          { ic: '🛡️', t: 'Khắc hệ & hiệu ứng — đánh khắc chế gây thêm sát thương, có khiên/buff và thứ tự ra đòn rõ ràng.' },
          { ic: '🎯', t: 'Tự dàn trận & nhắm mục tiêu — theo dõi diễn biến từng đòn ngay trên sân.' },
        ],
      },
      {
        version: '2.3.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Đảo Rồng lung linh',
        items: [
          { ic: '🖼️', t: 'Thay hình ảnh thật cho cả đảo — boss oai vệ, 12 cảnh phiêu lưu, trang trí & chướng ngại sống động.' },
          { ic: '🎒', t: 'Thêm Túi đồ — gom bộ sưu tập rồng, tài nguyên & đá cường hoá về một chỗ.' },
          { ic: '💎', t: 'Đá cường hoá có hình riêng — gắn đá tăng lực cho rồng trực quan hơn.' },
        ],
      },
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
    version: '1.1.0',
    log: [
      {
        version: '1.1.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Lên hạng, tranh mùa',
        items: [
          { ic: '🏆', t: 'Hạng đấu theo trình độ — leo từ Tân Thủ đến Cao Thủ, mỗi hạng một huy hiệu.' },
          { ic: '📅', t: 'Mùa giải hàng tháng — cuối mùa nhận thưởng theo hạng, điểm reset mềm sang mùa mới.' },
          { ic: '🔥', t: 'Chuỗi thắng — thắng liên tiếp càng dài, thưởng xu càng lớn.' },
        ],
      },
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
    version: '1.4.0',
    log: [
      {
        version: '1.4.0',
        date: '13/07/2026',
        tag: 'Tính năng',
        title: 'Bàn online & cược lớn',
        items: [
          { ic: '🌐', t: 'Bàn ONLINE nhiều người — tạo phòng, chọn số người thật (1–4), ghế trống MÁY ngồi thay. Chia sẻ mã 5 ký tự để bạn bè vào.' },
          { ic: '🎴', t: 'Mọi người binh cùng lúc, chủ phòng gom bài chấm điểm — thắng thua ăn xu như thường.' },
          { ic: '💰', t: 'Mức cược lớn hơn: 10 · 50 · 200 · 1.000 · 5.000 · 20.000 🪙/điểm (hoặc gõ số tuỳ ý) — hợp ví bạc triệu.' },
          { ic: '🖼️', t: 'Nền bàn giờ là ẢNH thật (Cổ Điển, Nửa Đêm, Anh Đào, Ngọc Lục, Hoàng Gia) và hiệu ứng lật bài kết quả chậm rãi, đã mắt hơn.' },
        ],
      },
      {
        version: '1.3.0',
        date: '13/07/2026',
        tag: 'Tính năng',
        title: 'Khung avatar sống động',
        items: [
          { ic: '🖼️', t: 'Khung avatar giờ là ẢNH ĐỘNG thật — Bạc, Neon, Vàng, Lửa, Cầu Vồng lấp lánh, uốn lượn quanh mặt cười.' },
          { ic: '🛍️', t: 'Cửa hàng xem trước khung ngay trên hình — thấy tận mắt trước khi mua/đeo.' },
          { ic: '🏆', t: 'Đeo khung ở cả bảng kết quả lẫn hồ sơ để khoe đẳng cấp mỗi ván.' },
        ],
      },
      {
        version: '1.2.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Danh hiệu & phong cách',
        items: [
          { ic: '🏅', t: 'Hồ sơ người chơi + Danh hiệu — khoe thành tích, thống kê thắng/thua.' },
          { ic: '🖼️', t: 'Khung avatar cosmetic — Bạc, Vàng, Neon, Lửa (khung Lửa nhấp nháy).' },
          { ic: '📊', t: 'Bảng thống kê — theo dõi phong độ qua từng ván.' },
        ],
      },
      {
        version: '1.1.0',
        date: '12/07/2026',
        tag: 'Tính năng',
        title: 'Kéo thả binh bài',
        items: [
          { ic: '✋', t: 'Kéo-thả lá bài để binh — nhanh gọn trên cả điện thoại & máy tính.' },
          { ic: '🏆', t: 'Chung hệ Hạng đấu & Mùa giải với Tiến Lên — mỗi ván ăn xu còn tính điểm leo hạng.' },
        ],
      },
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
