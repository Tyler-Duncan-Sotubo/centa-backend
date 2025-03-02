import { Request } from 'express';
import { User } from '../types/user.type';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
