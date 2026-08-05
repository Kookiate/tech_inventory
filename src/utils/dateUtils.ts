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
    const year = yyyyMm[1];
    const month = yyyyMm[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const ddMmYyyy = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyy) {
    const year = ddMmYyyy[3];
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
