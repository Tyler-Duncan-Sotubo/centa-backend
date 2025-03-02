import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../types/user.type';

const getCurrentUserByContext = (ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => getCurrentUserByContext(ctx),
);
