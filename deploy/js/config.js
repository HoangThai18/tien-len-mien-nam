/* =========================================================================
   ⚙️ CẤU HÌNH FIREBASE — DÁN CONFIG CỦA BẠN VÀO ĐÂY (1 lần duy nhất)
   Lấy từ: Firebase Console → Project settings → Your apps → SDK setup (Config)
   Lưu ý: cần bật Realtime Database (Build → Realtime Database → Create)
   và databaseURL phải có trong config.
   ========================================================================= */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjm3qwoV3bK7pdqFrBjuPASGnkt28KrfI",
  authDomain: "tien-len-3143c.firebaseapp.com",
  databaseURL: "https://tien-len-3143c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tien-len-3143c",
  storageBucket: "tien-len-3143c.firebasestorage.app",
  messagingSenderId: "17483974934",
  appId: "1:17483974934:web:40cc509da95309b3a06837"
};

/* Email được quyền ADMIN — thấy bảng "Quản lý", cộng/đặt xu cho mọi tài khoản.
   ⚠ Chỉ hiện nút là chưa đủ: phải khai đúng email này trong RTDB Rules
   (xem HUONG-DAN.txt) thì server mới cho ghi ví người khác.
   Đổi thành email tài khoản admin bạn sẽ đăng nhập trong game. */
const ADMIN_EMAILS = ["Phanthai18072001@gmail.com"];

