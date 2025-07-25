"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const drizzle_kit_1 = require("drizzle-kit");
exports.default = (0, drizzle_kit_1.defineConfig)({
    schema: [
        './src/modules/**/schema/*.schema.ts',
        './src/**/schema/*.schema.ts',
    ],
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    out: './src/drizzle/generated',
});
//# sourceMappingURL=drizzle.config.js.map