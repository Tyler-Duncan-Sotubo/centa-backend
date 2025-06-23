export declare enum WeekDay {
    Monday = "monday",
    Tuesday = "tuesday",
    Wednesday = "wednesday",
    Thursday = "thursday",
    Friday = "friday",
    Saturday = "saturday",
    Sunday = "sunday"
}
export declare class CreateShiftDto {
    name: string;
    startTime: string;
    endTime: string;
    workingDays: WeekDay[];
    lateToleranceMinutes?: number;
    allowEarlyClockIn?: boolean;
    earlyClockInMinutes?: number;
    allowLateClockOut?: boolean;
    lateClockOutMinutes?: number;
    notes?: string;
    locationId?: string;
}
