
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env.local');
        process.exit(1);
    }

    const modelName = 'gemini-3-flash-preview';
    console.log(`Testing generation with model: ${modelName}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        console.log('Success! Response:', response.text());
    } catch (error: any) {
        console.error(`Failed to generate with ${modelName}:`, error.message);
        process.exit(1);
    }
}

verifyModel();
