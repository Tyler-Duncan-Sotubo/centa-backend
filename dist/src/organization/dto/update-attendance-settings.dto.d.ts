export declare class WorkHoursDTO {
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workDays: string[];
}
export declare class AttendanceRulesDTO {
    gracePeriodMins: number;
    applyToPayroll: boolean;
    penaltyAfterMins: number;
    penaltyAmount: number;
    earlyLeaveThresholdMins: number;
    absenceThresholdHours: number;
    countWeekends: boolean;
}
