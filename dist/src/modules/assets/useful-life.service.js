"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsefulLifeService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
let UsefulLifeService = class UsefulLifeService {
    constructor() {
        this.cache = new Map();
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async getUsefulLifeYears(category, name) {
        const cacheKey = `${category.toLowerCase()}::${name.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const prompt = `
Given the following asset:

- Category: ${category}
- Name: ${name}

What is the typical useful life in years for this asset in a corporate environment?
Respond with a single number only, like "5".
`;
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
            });
            const response = completion.choices[0].message.content?.trim();
            const years = Number(response);
            const usefulLife = isNaN(years) ? 3 : this.clamp(years, 1, 30);
            this.cache.set(cacheKey, usefulLife);
            return usefulLife;
        }
        catch (err) {
            console.error('OpenAI error:', err);
            return 3;
        }
    }
    clamp(num, min, max) {
        return Math.max(min, Math.min(num, max));
    }
};
exports.UsefulLifeService = UsefulLifeService;
exports.UsefulLifeService = UsefulLifeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UsefulLifeService);
//# sourceMappingURL=useful-life.service.js.map