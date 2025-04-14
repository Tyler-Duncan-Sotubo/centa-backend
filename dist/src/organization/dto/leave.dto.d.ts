export declare class CreateLeaveDto {
    leave_type: string;
    leave_entitlement: number;
}
export declare class CreateLeaveRequestDto {
    leave_type: string;
    start_date: string;
    end_date: string;
    notes: string;
    total_days_off: number;
}
declare const UpdateLeaveDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateLeaveDto>>;
export declare class UpdateLeaveDto extends UpdateLeaveDto_base {
}
declare const UpdateLeaveRequestDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateLeaveRequestDto>>;
export declare class UpdateLeaveRequestDto extends UpdateLeaveRequestDto_base {
}
export {};
