"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileParseInterceptor = FileParseInterceptor;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const promises_2 = require("stream/promises");
const uuid_1 = require("uuid");
const file_parser_1 = require("../../utils/file-parser");
function FileParseInterceptor(opts) {
    const { field = 'file', maxRows = 600, tempDir = (0, path_1.join)(process.cwd(), 'src', 'temp'), allowedExts = ['csv', 'xls', 'xlsx'], } = opts;
    let MixinInterceptor = class MixinInterceptor {
        async intercept(context, next) {
            const req = context
                .switchToHttp()
                .getRequest();
            if (!req.isMultipart?.()) {
                throw new common_1.BadRequestException('Request must be multipart/form-data');
            }
            const data = await req.file();
            if (!data || data.fieldname !== field) {
                throw new common_1.BadRequestException(`Field "${field}" is required`);
            }
            const { file: stream, filename, mimetype } = data;
            const ext = (0, path_1.extname)(filename).slice(1).toLowerCase();
            if (!allowedExts.includes(ext) ||
                !mimetype.includes(ext === 'csv' ? 'csv' : 'sheet')) {
                throw new common_1.BadRequestException(`Only ${allowedExts.join('/').toUpperCase()} files are supported`);
            }
            const dateSeg = new Date().toISOString().slice(0, 10);
            const destDir = (0, path_1.join)(tempDir, dateSeg);
            await (0, promises_1.mkdir)(destDir, { recursive: true });
            const saveName = `${(0, uuid_1.v4)()}.${ext}`;
            const path = (0, path_1.join)(destDir, saveName);
            const ws = (0, fs_1.createWriteStream)(path);
            await (0, promises_2.pipeline)(stream, ws);
            let rows;
            try {
                rows = await (0, file_parser_1.parseFile)(path, filename, maxRows);
            }
            finally {
                (0, promises_1.unlink)(path).catch(() => { });
            }
            req.body = rows;
            return next.handle();
        }
    };
    MixinInterceptor = __decorate([
        (0, common_1.Injectable)()
    ], MixinInterceptor);
    return MixinInterceptor;
}
//# sourceMappingURL=file-parse.interceptor.js.map