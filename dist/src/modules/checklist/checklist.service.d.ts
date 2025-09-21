import { db } from 'src/drizzle/types/drizzle';
import { ExtraKeyParamDto } from './dto/extra-key.param';
export declare class ChecklistService {
    private db;
    constructor(db: db);
    markExtraDone(companyId: string, key: ExtraKeyParamDto['key'], userId: string): Promise<void>;
}
