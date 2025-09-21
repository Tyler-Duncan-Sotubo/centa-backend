import { IsIn } from 'class-validator';
import { EXTRA_KEYS, ExtraKey } from '../constants/constants';

export class ExtraKeyParamDto {
  @IsIn(EXTRA_KEYS, { message: `key must be one of: ${EXTRA_KEYS.join(', ')}` })
  key!: ExtraKey;
}
