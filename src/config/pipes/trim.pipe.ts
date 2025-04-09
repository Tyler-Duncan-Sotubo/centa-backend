import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    for (const key in value) {
      if (typeof value[key] === 'string') {
        value[key] = value[key].trim();
      }
    }

    return value;
  }
}
