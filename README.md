# Tool đặt tên trên website (Nguyên Kim – Chính Nhân)

Tool chạy hoàn toàn trên trình duyệt (không server, không lưu dữ liệu: tải lại trang là sạch). Engine đặt tên lấy từ dự án `get-name-web12`.

- **Tạo tên**: nhập 1 tên hàng hóa → tên WEB 1 (≤ 70 ký tự) + WEB 2, kèm cảnh báo và nút sao chép.
- **Tạo tên theo danh sách**: upload Excel (cột `MãHH`, `TênHH`) → bảng MãHH / Tên Web 1 / Tên Web 2, sao chép cột hoặc xuất Excel.
- **Quy tắc & ví dụ**: tóm tắt rule và ví dụ chạy trực tiếp bằng engine.

## Chạy

```
npm install
npm run dev       # http://localhost:5173
npm run build     # ra thư mục dist/
npm run preview   # xem bản build
```

Sửa rule tại `rules/*.json` (hãng, nhóm hàng, chữ hoa/thường) rồi build lại. Engine ở `src/engine/`.
