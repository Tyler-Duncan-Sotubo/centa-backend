export declare function diffRecords<T extends Record<string, any>>(before: Partial<T>, after: Partial<T>, fields: (keyof T)[]): Record<string, {
    before: any;
    after: any;
}>;
