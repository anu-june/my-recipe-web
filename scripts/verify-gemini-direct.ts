
import { parseRecipeWithGemini } from '../app/api/parse-recipe/_utils/gemini-service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found');
        process.exit(1);
    }

    console.log('Testing parseRecipeWithGemini with new model priority...');

    try {
        const result = await parseRecipeWithGemini(
            "Title: Test Recipe\nIngredients: 1 cup test\nSteps: 1. Do test.",
            apiKey
        );
        console.log('Success! Result:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Failed:', e);
    }
}

verify();
