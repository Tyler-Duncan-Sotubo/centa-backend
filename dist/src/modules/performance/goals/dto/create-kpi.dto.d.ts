export type Dir = 'up' | 'down' | 'range' | 'boolean';
export declare class CreateKpiDto {
    name: string;
    direction: Dir;
    unit?: 'percent' | 'currency' | 'count' | 'number' | 'boolean';
    baseline?: number | null;
    target?: number | null;
    targetMin?: number | null;
    targetMax?: number | null;
    weight?: number;
    isPrimary?: boolean;
    targetDate?: string;
}
