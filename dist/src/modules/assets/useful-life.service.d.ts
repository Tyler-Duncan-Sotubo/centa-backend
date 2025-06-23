export declare class UsefulLifeService {
    private openai;
    private cache;
    constructor();
    getUsefulLifeYears(category: string, name: string): Promise<number>;
    private clamp;
}
