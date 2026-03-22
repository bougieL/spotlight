import {
  isHoliday,
  isWorkday,
  isInLieu,
  getDayDetail,
  getLunarDate,
} from 'chinese-days';

type LunarDateDetail = ReturnType<typeof getLunarDate>;

export interface HolidayInfo {
  date: string;
  name: string;
  isHoliday: boolean;
  isWorkday: boolean;
  isInLieu: boolean;
}

export interface DayInfo {
  date: string;
  holidayName: string | null;
  isHoliday: boolean;
  isWorkday: boolean;
  isInLieu: boolean;
  isWeekend: boolean;
  lunar: LunarDateDetail;
}

export function getHolidayInfo(date: Date): HolidayInfo {
  const dateStr = formatDate(date);
  const detail = getDayDetail(date);

  return {
    date: dateStr,
    name: detail.name || '',
    isHoliday: isHoliday(date),
    isWorkday: isWorkday(date),
    isInLieu: isInLieu(date),
  };
}

export function getDayInfo(date: Date): DayInfo {
  const dateStr = formatDate(date);
  const dayOfWeek = date.getDay();
  const detail = getDayDetail(date);
  const lunar = getLunarDate(date);

  return {
    date: dateStr,
    holidayName: detail.name || null,
    isHoliday: isHoliday(date),
    isWorkday: isWorkday(date),
    isInLieu: isInLieu(date),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    lunar,
  };
}

export function getSpecialType(date: Date): 'holiday' | 'workday' | null {
  if (isHoliday(date)) return 'holiday';
  if (isInLieu(date)) return 'workday';
  return null;
}

export function formatLunarDate(lunar: LunarDateDetail): {
  monthDay: string;
  yearGanZhi: string;
} {
  return {
    monthDay: `${lunar.lunarMonCN}${lunar.lunarDayCN}`,
    yearGanZhi: lunar.yearCyl,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export { getLunarDate };
