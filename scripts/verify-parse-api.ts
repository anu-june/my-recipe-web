
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyParseApi() {
    const baseUrl = 'http://localhost:3000/api/parse-recipe';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY is not set in environment.');
        // Note: This script assumes .env.local is readable or env vars are set.
        // In some environments, we might need to rely on the server having the key.
        // However, the client doesn't send the key, the server uses its own.
        // The script just calls the endpoint.
    }

    const testCases = [
        {
            name: 'Test Setup',
            input: 'Simple text recipe for testing connection',
            expectedStatus: 200,
        },
        // We can't easily test real YouTube/Web URLs without hitting external services and potentially quotas/blocks,
        // but we can try a known simple one or just rely on the text input first to verify the pipeline.
    ];

    console.log('Starting verification of /api/parse-recipe ...');

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: 'Title: Simple Toast\nIngredients:\nBread - 1 slice\nButter - 1 tsp\nSteps:\n1. Toast bread.\n2. Spread butter.' })
        });

        console.log(`Test: Raw Text Input -> Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Result:', JSON.stringify(data.recipe?.title, null, 2));
        } else {
            console.error('Error:', await response.text());
        }

    } catch (error) {
        console.error('Verification script failed:', error);
    }
}

verifyParseApi();
