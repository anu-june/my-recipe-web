
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env.local');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log('Fetching available models...');
        // Note: listModels is on the genAI instance or model manager depending on SDK version
        // For 0.24.1 it might be different, let's try the standard way
        // Actually, the SDK doesn't expose listModels directly on the main class in all versions.
        // We might need to use the API directly if the SDK doesn't support it easily.

        // Let's try a direct fetch to the API to be sure, avoiding SDK quirks
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            const models = data.models
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: any) => ({
                    name: m.name.replace('models/', ''),
                    displayName: m.displayName
                }));

            const fs = require('fs');
            fs.writeFileSync('available_models.json', JSON.stringify(models, null, 2));
            console.log('Models written to available_models.json');
        } else {
            console.error('No models found or error:', data);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
