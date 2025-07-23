import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seeder.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('seed')
export class SeedController extends BaseController {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  @Post()
  async seedDatabase() {
    await this.seedService.seedDatabase();
  }
}
