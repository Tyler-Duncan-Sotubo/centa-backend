export declare class RegisterDeviceDto {
    expoPushToken: string;
    platform?: 'ios' | 'android' | 'unknown';
    deviceId?: string;
    appVersion?: string;
}
