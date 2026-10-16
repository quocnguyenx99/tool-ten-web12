export type Status = 'PASS' | 'REVIEW' | 'REJECT';
export type WarningLevel = 'info' | 'review' | 'reject';

/** Mã QA theo mục 13 của guide 00 (Q01–Q12) + vài mã phụ của engine. */
export interface QaWarning {
  code: string;
  level: WarningLevel;
  message: string;
}

export interface InputRow {
  stt: number;
  mhh: string;
  web1Old: string;
  web2Old?: string | null;
  /** Danh mục cấp 1 trong file nguồn (chỉ là gợi ý, thường không chính xác). */
  category?: string | null;
}

export interface Extracted {
  brand?: string;
  brandSource?: 'name' | 'hieu' | 'mhh';
  model?: string;
  pn?: string;
  pnCandidates: string[];
  modelField?: string;
  cpu?: string;
  ram?: string;
  storage: string[];
  vga?: string;
  screenSize?: string;
  resolution?: string;
  panel?: string;
  hz?: string;
  responseMs?: string;
  brightness?: string;
  os?: string;
  osConflict?: string[];
  warrantyMonths?: number;
  watt?: string;
  wh?: string;
  capacity?: string;
  color?: string;
  features: string[];
}

export interface CategoryMatch {
  id: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'keyword' | 'category-column' | 'mhh-prefix' | 'unknown';
}

export interface NamingResult {
  stt: number;
  mhh: string;
  web1Old: string;
  web2Old: string;
  web1New: string;
  web2New: string;
  category: CategoryMatch;
  categoryColumn: string;
  status: Status;
  warnings: QaWarning[];
  extracted: Extracted;
  cleaned: string;
}
