import { Dir } from './create-kpi.dto';
export declare class UpdateKpiDto {
    name?: string;
    direction?: Dir;
    unit?: 'percent' | 'currency' | 'count' | 'number' | 'boolean';
    baseline?: number | null;
    target?: number | null;
    targetMin?: number | null;
    targetMax?: number | null;
    weight?: number;
    isPrimary?: boolean;
    targetDate?: string;
    current?: number | null;
}
