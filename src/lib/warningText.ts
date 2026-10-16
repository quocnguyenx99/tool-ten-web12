import type { QaWarning } from '../engine';

export interface FriendlyWarning {
  title: string;
  detail: string;
  tip: string;
  level: QaWarning['level'];
}

const TITLE: Record<string, [string, string]> = {
  Q01: ['Thiếu mã hàng hóa', 'Nhập mã hàng hóa (MãHH) cho dòng này.'],
  Q03: ['Trùng mã hoặc trùng tên', 'Kiểm tra lại: có thể nhập trùng, hoặc cần thêm P/N để phân biệt.'],
  Q04: ['Tên WEB 2 cũ không hợp lệ', 'Không ảnh hưởng, tool đã tạo lại WEB 2.'],
  Q05: ['Thiếu thông tin quan trọng', 'Bổ sung hãng / model / part number vào tên gốc rồi tạo lại.'],
  Q06: ['Thông tin bị xung đột', 'Tên gốc có nhiều P/N hoặc hệ điều hành khác nhau, hãy chọn đúng cái cần dùng.'],
  Q07: ['WEB 1 dài quá 70 ký tự', 'Rút gọn tay phần ít quan trọng (thông số phụ) trước khi sử dụng.'],
  Q08: ['Tên gốc viết hoa toàn bộ', 'Đã tự chuẩn hóa chữ hoa/thường, chỉ cần xem lại.'],
  Q09: ['Tên gốc có ghi chú thừa', 'Đã bỏ ghi chú, nên xem lại kết quả.'],
  Q10: ['Có số liệu không có trong tên gốc', 'Đối chiếu lại các số này với tên gốc, tránh ghi sai thông số.'],
  Q12: ['Chưa chắc chắn nhóm hàng', 'Nhóm hàng đoán chưa chắc hoặc chưa có công thức, hãy kiểm tra kỹ.'],
  S10: ['Đã bỏ bớt thông tin cho đủ 70 ký tự', 'Thông tin bỏ đi là phần phụ, có thể bổ sung ở WEB 2.'],
  CAT: ['Danh mục nguồn khác với tên', 'Chỉ để tham khảo.'],
};

export function friendly(w: QaWarning): FriendlyWarning {
  const [title, tip] = TITLE[w.code] ?? ['Cần xem lại', 'Kiểm tra thủ công trước khi dùng.'];
  return { title, detail: w.message, tip, level: w.level };
}

export const STATUS_TEXT = {
  PASS: { label: 'Đạt', hint: 'Đủ thông tin, có thể sử dụng.' },
  REVIEW: { label: 'Cần xem lại', hint: 'Có điểm cần kiểm tra trước khi dùng.' },
  REJECT: { label: 'Có vấn đề', hint: 'Có lỗi nghiêm trọng, nên sửa tên gốc rồi tạo lại.' },
} as const;
