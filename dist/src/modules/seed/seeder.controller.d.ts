import { SeedService } from './seeder.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class SeedController extends BaseController {
    private readonly seedService;
    constructor(seedService: SeedService);
    seedDatabase(): Promise<void>;
}
