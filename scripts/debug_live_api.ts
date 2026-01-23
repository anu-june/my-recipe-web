
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testLiveApi() {
    const url = 'https://www.youtube.com/watch?v=usZvYCHmMD4';
    const apiUrl = 'http://localhost:3000/api/parse-recipe';

    const output: any = {
        input: url,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: url })
        });

        output.status = response.status;
        output.data = await response.json();

    } catch (error: any) {
        output.error = error.message;
    }

    fs.writeFileSync('api_response.json', JSON.stringify(output, null, 2));
    console.log('Output written to api_response.json');
}

testLiveApi();
