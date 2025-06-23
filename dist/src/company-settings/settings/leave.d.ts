export declare const leave: ({
    key: string;
    value: string;
} | {
    key: string;
    value: boolean;
} | {
    key: string;
    value: string[];
} | {
    key: string;
    value: number;
} | {
    key: string;
    value: {
        notifyApprover: boolean;
        notifyHr: boolean;
        notifyLineManager: boolean;
        notifyEmployeeOnDecision: boolean;
        notificationCcRoles: never[];
        notificationChannels: string[];
    };
})[];
