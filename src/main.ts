import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Retrieve CLIENT_URL and ADMIN_URL from environment or config service
  const clientUrl = process.env.CLIENT_URL;
  const adminUrl = process.env.CLIENT_DASHBOARD_URL;
  const employeeUrl = process.env.EMPLOYEE_PORTAL_URL;

  const allowedOrigins = [clientUrl, adminUrl, employeeUrl].filter(Boolean);

  // Enable CORS for specific origins
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS')); // Reject the request
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(cookieParser());
  app.useLogger(app.get(Logger));

  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  const logger = app.get(Logger);

  try {
    // Use the compression middleware
    app.use(compression());
    const port = process.env.PORT || 8000;
    await app.listen(port);
    logger.log('API Gateway is running on port 8000');
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`);
  }
}
bootstrap();
