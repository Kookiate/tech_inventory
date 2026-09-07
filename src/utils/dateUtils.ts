// Utility functions for dates and Thai months

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Extracts YYYY-MM from various date string formats
 * e.g., "2026-08-05", "05/08/2026", "2026/08/05"
 */
export function extractMonthKey(dateStr: string): string {
  if (!dateStr) return '';

  // Match YYYY-MM or YYYY/MM
  const yyyyMm = dateStr.match(/(\d{4})[-/](\d{1,2})/);
  if (yyyyMm) {
    let year = parseInt(yyyyMm[1], 10);
    if (year > 2400) year -= 543;
    const month = yyyyMm[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const ddMmYyyy = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyy) {
    let year = parseInt(ddMmYyyy[3], 10);
    if (year > 2400) year -= 543;
    const month = ddMmYyyy[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  return dateStr.slice(0, 7);
}

/**
 * Formats YYYY-MM to Thai month name, e.g. "2026-08" -> "สิงหาคม 2569 (08/2026)"
 */
export function formatThaiMonth(yearMonth: string): string {
  if (!yearMonth || yearMonth === 'ALL') return 'ทุกช่วงเวลา (All Time)';
  const parts = yearMonth.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      const thaiYear = year < 2400 ? year + 543 : year;
      return `${THAI_MONTHS[monthIdx]} ${thaiYear} (${parts[1]}/${year})`;
    }
  }
  return yearMonth;
}

/**
 * Format date string to neat Thai format
 */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const monthKey = extractMonthKey(dateStr);
    const parts = dateStr.split(/[-T\s/]/);
    if (parts.length >= 3) {
      // Check if first is year or day
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
      const mIdx = parseInt(month, 10) - 1;
      const yNum = parseInt(year, 10);
      const thaiYear = yNum < 2400 ? yNum + 543 : yNum;
      if (mIdx >= 0 && mIdx < 12) {
        return `${parseInt(day, 10)} ${THAI_MONTHS[mIdx]} ${thaiYear}`;
      }
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

/**
 * แปลงสตริงวันที่และเวลา (รวมถึงปี พ.ศ. เช่น 5/8/2569 17:39:16 หรือ ค.ศ.) ให้เป็นตัวเลข Timestamp (มิลลิวินาที)
 * เพื่อใช้ในการจัดเรียงลำดับวันเวลาล่าสุดขึ้นก่อนได้อย่างแม่นยำ 100%
 */
export function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr || dateStr === '-' || typeof dateStr !== 'string') return 0;

  const trimmed = dateStr.trim();
  if (!trimmed) return 0;

  // 1. รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY พร้อมเวลา HH:mm:ss หรือ HH:mm (เช่น 5/8/2569 17:39:16, 24/07/2569 15:32:16)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  // 2. รูปแบบ YYYY-MM-DD หรือ YYYY/MM/DD พร้อมเวลา (เช่น 2026-08-05 17:39:16, 2569-08-05T17:39:16)
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  // 3. Fallback ใช้ Date.parse
  const fallback = Date.parse(trimmed);
  return isNaN(fallback) ? 0 : fallback;
}
