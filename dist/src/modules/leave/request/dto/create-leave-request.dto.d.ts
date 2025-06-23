export declare class CreateLeaveRequestDto {
    leaveTypeId: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    partialDay: 'AM' | 'PM';
}
