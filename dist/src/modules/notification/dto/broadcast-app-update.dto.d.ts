export declare class BroadcastAppUpdateDto {
    title: string;
    body: string;
    url?: string;
    route?: string;
    data?: Record<string, any>;
    companyId?: string;
    platforms?: Array<'ios' | 'android'>;
    minAppVersion?: string;
    durable?: boolean;
}
