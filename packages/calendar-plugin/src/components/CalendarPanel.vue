<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import {
  getDayInfo,
  getSpecialType,
  formatLunarDate,
  type DayInfo,
} from '../holidays';

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth());
const selectedDate = ref<Date | null>(null);

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dayInfo: DayInfo;
}

const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = [];
  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0);
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value - 1, prevMonthLastDay.getDate() - i);
    days.push(createCalendarDay(date, false));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(currentYear.value, currentMonth.value, d);
    days.push(createCalendarDay(date, true));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i);
    days.push(createCalendarDay(date, false));
  }

  return days;
});

function createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isSelected =
    selectedDate.value !== null &&
    date.getDate() === selectedDate.value.getDate() &&
    date.getMonth() === selectedDate.value.getMonth() &&
    date.getFullYear() === selectedDate.value.getFullYear();

  return {
    date,
    day: date.getDate(),
    isCurrentMonth,
    isToday,
    isSelected,
    dayInfo: getDayInfo(date),
  };
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
}

function goToToday() {
  currentYear.value = today.getFullYear();
  currentMonth.value = today.getMonth();
  selectedDate.value = new Date(today);
}

function selectDate(day: CalendarDay) {
  selectedDate.value = day.date;
  if (!day.isCurrentMonth) {
    currentYear.value = day.date.getFullYear();
    currentMonth.value = day.date.getMonth();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

const selectedDateInfo = computed(() => {
  if (!selectedDate.value) return null;
  const date = selectedDate.value;
  const dayInfo = getDayInfo(date);
  const specialType = getSpecialType(date);
  const lunar = formatLunarDate(dayInfo.lunar);

  return {
    date,
    dayInfo,
    specialType,
    lunar,
    formattedDate: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
  };
});

onMounted(() => {
  selectedDate.value = new Date(today);
});
</script>

<template>
  <div class="calendar-panel" @keydown="handleKeydown" tabindex="0">
    <div class="calendar-header">
      <button class="nav-button" @click="prevMonth" title="上个月">
        <ChevronLeft :size="20" />
      </button>
      <div class="header-center">
        <span class="year-month">{{ currentYear }}年 {{ monthNames[currentMonth] }}</span>
        <button class="today-button" @click="goToToday">今天</button>
      </div>
      <button class="nav-button" @click="nextMonth" title="下个月">
        <ChevronRight :size="20" />
      </button>
    </div>

    <div class="calendar-weekdays">
      <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
    </div>

    <div class="calendar-grid">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="calendar-day"
        :class="{
          'other-month': !day.isCurrentMonth,
          'is-today': day.isToday,
          'is-selected': day.isSelected,
          'is-holiday': day.dayInfo.isHoliday,
          'is-workday': day.dayInfo.isInLieu,
        }"
        @click="selectDate(day)"
      >
        <span class="day-number">{{ day.day }}</span>
        <span v-if="day.dayInfo.holidayName" class="holiday-name">{{ day.dayInfo.holidayName }}</span>
        <span v-else class="lunar-day">{{ day.dayInfo.lunar.lunarDayCN }}</span>
      </div>
    </div>

    <div v-if="selectedDateInfo" class="date-detail">
      <div class="detail-header">
        <span class="detail-date">{{ selectedDateInfo.formattedDate }}</span>
        <span class="detail-lunar">
          {{ selectedDateInfo.lunar.yearGanZhi }}年 {{ selectedDateInfo.lunar.monthDay }}
        </span>
      </div>
      <div v-if="selectedDateInfo.dayInfo.holidayName" class="holiday-badge">
        {{ selectedDateInfo.dayInfo.holidayName }}
      </div>
      <div v-if="selectedDateInfo.specialType" class="special-badge" :class="selectedDateInfo.specialType">
        {{ selectedDateInfo.specialType === 'holiday' ? '休息日' : '补班日' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
  user-select: none;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.year-month {
  font-size: 16px;
  font-weight: 600;
  color: var(--spotlight-text);
}

.today-button {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 4px;
  background: transparent;
  color: var(--spotlight-text);
  cursor: pointer;
  transition: all 0.15s;
}

.today-button:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--spotlight-text);
  cursor: pointer;
  transition: background-color 0.15s;
}

.nav-button:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--spotlight-placeholder);
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.calendar-day:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.calendar-day.other-month {
  opacity: 0.4;
}

.calendar-day.is-today .day-number {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-day.is-selected {
  background-color: var(--spotlight-item-active, rgba(0, 0, 0, 0.08));
}

.calendar-day.is-holiday .day-number {
  color: #e74c3c;
}

.calendar-day.is-workday .day-number {
  color: var(--spotlight-text);
}

.calendar-day.is-workday::after {
  content: '班';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--spotlight-placeholder);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.holiday-name {
  font-size: 10px;
  color: #e74c3c;
  margin-top: 2px;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lunar-day {
  font-size: 10px;
  color: var(--spotlight-placeholder);
  margin-top: 2px;
  line-height: 1;
}

.date-detail {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.03));
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--spotlight-text);
}

.detail-lunar {
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.holiday-badge {
  display: inline-block;
  padding: 4px 8px;
  margin-right: 8px;
  font-size: 12px;
  color: #e74c3c;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 4px;
}

.special-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.special-badge.holiday {
  color: #27ae60;
  background-color: rgba(39, 174, 96, 0.1);
}

.special-badge.workday {
  color: #f39c12;
  background-color: rgba(243, 156, 18, 0.1);
}
</style>
