"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookieParser = require("cookie-parser");
const nestjs_pino_1 = require("nestjs-pino");
const common_1 = require("@nestjs/common");
const bodyParser = require("body-parser");
const compression = require("compression");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    const clientUrl = process.env.CLIENT_URL;
    const adminUrl = process.env.CLIENT_DASHBOARD_URL;
    const allowedOrigins = [clientUrl, adminUrl].filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.use(cookieParser());
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
    }));
    const logger = app.get(nestjs_pino_1.Logger);
    try {
        app.use(compression());
        const port = process.env.PORT || 8000;
        await app.listen(port);
        logger.log('API Gateway is running on port 8000');
    }
    catch (error) {
        logger.error(`An error occurred: ${error.message}`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map