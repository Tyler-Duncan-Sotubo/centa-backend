"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const drizzle_kit_1 = require("drizzle-kit");
exports.default = (0, drizzle_kit_1.defineConfig)({
    schema: './src/drizzle/schema/**.schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://neondb_owner:lyH0RBIP3LMD@ep-red-mud-a5ltdhlx.us-east-2.aws.neon.tech/neondb?sslmode=require ',
    },
    out: './src/drizzle/generated',
});
//# sourceMappingURL=drizzle.config.js.map