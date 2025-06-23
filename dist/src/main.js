"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const nestjs_pino_1 = require("nestjs-pino");
const common_1 = require("@nestjs/common");
const compress_1 = require("@fastify/compress");
const cookie_1 = require("@fastify/cookie");
const multipart_1 = require("@fastify/multipart");
const etag_1 = require("@fastify/etag");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }), {
        bufferLogs: true,
        bodyParser: false,
    });
    app.setGlobalPrefix('api');
    const fastify = app.getHttpAdapter().getInstance();
    await app.register(multipart_1.default, {
        limits: { fileSize: 10 * 1024 * 1024 },
    });
    await app.register(etag_1.default);
    await fastify.register(compress_1.default);
    await fastify.register(cookie_1.default, {
        secret: process.env.COOKIE_SECRET,
    });
    app.enableCors({
        origin: [
            process.env.CLIENT_URL,
            process.env.CLIENT_DASHBOARD_URL,
            process.env.EMPLOYEE_PORTAL_URL,
        ].filter((url) => typeof url === 'string'),
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const port = process.env.PORT || 8000;
    await app.listen(port, '0.0.0.0');
    app.get(nestjs_pino_1.Logger).log(`🚀 Listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map