import { IsIn } from 'class-validator';
import { REACTION_TYPES, ReactionType } from '../types/reaction-types';

export class ReactDto {
  @IsIn(REACTION_TYPES, { message: 'Invalid reaction type' })
  reactionType!: ReactionType;
}
