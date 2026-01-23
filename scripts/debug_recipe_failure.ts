
import { extractYoutubeData } from '../app/api/parse-recipe/_utils/youtube-service';
import { parseRecipeWithGemini } from '../app/api/parse-recipe/_utils/gemini-service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    const url = 'https://www.youtube.com/watch?v=usZvYCHmMD4';
    const apiKey = process.env.GEMINI_API_KEY!;

    console.log('--- Step 1: Extracting Youtube Data ---');
    try {
        const text = await extractYoutubeData(url);
        console.log('Extraction Result Length:', text ? text.length : 0);
        console.log('Extraction Preview:', text ? text.substring(0, 500) : 'NULL');

        if (!text) {
            console.error('FAILED: No text extracted from YouTube.');
            return;
        }

        console.log('\n--- Step 2: Parsing with Gemini ---');
        const recipe = await parseRecipeWithGemini(text, apiKey);
        console.log('AI Response:', JSON.stringify(recipe, null, 2));

    } catch (error) {
        console.error('Debug Error:', error);
    }
}

debug();
