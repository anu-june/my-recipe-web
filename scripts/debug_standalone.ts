
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function extractYoutubeData(url: string) {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) return null;

    console.log(`Extracting for Video ID: ${videoId}`);

    try {
        const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(30000)
        });
        const html = await ytResponse.text();
        console.log('YouTube HTML length:', html.length);

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : 'Unknown Title';

        // Simplified description extraction for debug
        let description = '';
        const metaDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        if (metaDescMatch) description = metaDescMatch[1];

        console.log('Title:', title);
        console.log('Description found:', !!description);

        let transcriptText = '';
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            console.log('Transcript chunks found:', transcript.length);
            if (transcript && transcript.length > 0) {
                transcriptText = transcript.map(t => t.text).join(' ');
            }
        } catch (e: any) {
            console.warn('Transcript failed:', e.message);
        }

        return `Video Title: ${title}\n\nDescription:\n${description}\n\nTranscript:\n${transcriptText}`;
    } catch (e: any) {
        console.error('Extraction error:', e);
        return null;
    }
}

async function parseWithGemini(text: string, apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `
You are a recipe extraction expert. Extract structured recipe data from the following text.
INPUT:
${text.substring(0, 10000)} ... [truncated]

RESPOND ONLY WITH VALID JSON:
{
  "title": "Recipe name",
  "ingredients": "List of ingredients...",
  "steps": "List of steps...",
  "notes": "..."
}
`;
    console.log('Sending to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function run() {
    const url = 'https://www.youtube.com/watch?v=usZvYCHmMD4';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('No API Key');
        return;
    }

    const text = await extractYoutubeData(url);
    if (!text) {
        console.error('No text extracted');
        return;
    }

    console.log('--- Extracted Text Preview ---');
    console.log(text.substring(0, 500));
    console.log('------------------------------');

    try {
        const json = await parseWithGemini(text, apiKey);
        console.log('--- Gemini Response ---');
        console.log(json);
    } catch (e) {
        console.error('Gemini Error:', e);
    }
}

run();
