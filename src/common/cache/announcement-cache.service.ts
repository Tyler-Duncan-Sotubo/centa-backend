// src/common/cache/announcement-cache.service.ts
import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AnnouncementCacheService {
  constructor(private readonly cache: CacheService) {}

  listKey(companyId: string) {
    return `company:${companyId}:announcements:list:full`;
  }
  listTwoKey(companyId: string) {
    return `company:${companyId}:announcements:list:2`;
  }
  detailPrefix(announcementId: string) {
    // detail is per user; use prefix to nuke all user variants if supported
    return `announcement:${announcementId}:detail:user:`;
  }

  async invalidateLists(companyId: string) {
    await Promise.allSettled([
      this.cache.del(this.listKey(companyId)),
      this.cache.del(this.listTwoKey(companyId)),
    ]);
  }
}
