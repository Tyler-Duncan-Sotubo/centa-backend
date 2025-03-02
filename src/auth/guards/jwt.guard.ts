import { AuthGuard } from '@nestjs/passport';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any, info: { name: string }) {
    if (err) {
      throw new Error('An internal error occurred during authentication.');
    }

    if (!user) {
      // Check the info object for specific JWT issues
      if (info && info.name === 'TokenExpiredError') {
        throw new BadRequestException(
          'Token has expired. Please provide a new token.',
        );
      } else if (info && info.name === 'JsonWebTokenError') {
        throw new BadRequestException(
          'Invalid token. Please provide a valid token.',
        );
      } else if (info && info.name === 'NotBeforeError') {
        throw new BadRequestException(
          'Token is not yet active. Please provide a valid token.',
        );
      } else {
        // Generic error for any other JWT issues
        throw new NotFoundException('User not found.');
      }
    }

    // If no error and user is found, return the user
    return user;
  }
}
