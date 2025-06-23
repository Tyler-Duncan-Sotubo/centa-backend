import { Request } from 'express';
import { User } from './user.type';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
