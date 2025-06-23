import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class UsefulLifeService {
  private openai: OpenAI;

  // Simple in-memory cache
  private cache = new Map<string, number>();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getUsefulLifeYears(category: string, name: string): Promise<number> {
    const cacheKey = `${category.toLowerCase()}::${name.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
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

      const usefulLife = isNaN(years) ? 3 : this.clamp(years, 1, 30); // Safe default and bounds

      this.cache.set(cacheKey, usefulLife); // Save to cache
      return usefulLife;
    } catch (err) {
      console.error('OpenAI error:', err);
      return 3; // Fallback default
    }
  }

  private clamp(num: number, min: number, max: number): number {
    return Math.max(min, Math.min(num, max));
  }
}
