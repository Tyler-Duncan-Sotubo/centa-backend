interface WorkingDayChecker {
  (date: Date): boolean;
}

const isWorkingDay: WorkingDayChecker = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
};

interface DateRange {
  start: Date;
  end: Date;
}

export function countWorkingDays(
  start: DateRange['start'],
  end: DateRange['end'],
): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (isWorkingDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
