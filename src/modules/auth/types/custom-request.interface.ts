import { Request } from 'express';
import { User } from './user.type'; // Adjust the path as needed

export interface AuthenticatedRequest extends Request {
  user?: User;
}
