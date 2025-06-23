export const attendance = [
  { key: 'attendance.use_shifts', value: false },
  { key: 'attendance.default_start_time', value: '09:00' },
  { key: 'attendance.default_end_time', value: '17:00' },
  { key: 'attendance.default_working_days', value: 5 }, // 5 days a week
  { key: 'attendance.late_tolerance_minutes', value: 10 },
  { key: 'attendance.early_clock_in_window_minutes', value: 15 },
  { key: 'attendance.block_on_holiday', value: true },
  { key: 'attendance.allow_overtime', value: false },
  { key: 'attendance.overtime_rate', value: 1.5 }, // 1.5x for overtime
  { key: 'attendance.allow_half_day', value: true },
  { key: 'attendance.half_day_duration', value: 4 }, // in hours
];
