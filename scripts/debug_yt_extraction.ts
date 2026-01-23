
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function extractAndLog() {
    const videoId = 'usZvYCHmMD4';
    let result: any = { videoId };

    try {
        // Fetch YouTube page
        const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        const html = await ytResponse.text();

        // Extract title
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        result.title = titleMatch ? titleMatch[1] : null;

        // Extract description  
        const metaDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        result.metaDescription = metaDescMatch ? metaDescMatch[1] : null;

        // Try ytInitialData
        const ytDataMatch = html.match(/var ytInitialData = ({[\s\S]+?});/);
        if (ytDataMatch) {
            try {
                const ytData = JSON.parse(ytDataMatch[1]);
                const videoDetails = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
                if (videoDetails && Array.isArray(videoDetails)) {
                    for (const item of videoDetails) {
                        if (item?.videoSecondaryInfoRenderer?.attributedDescription) {
                            result.fullDescription = item.videoSecondaryInfoRenderer.attributedDescription.content;
                            break;
                        }
                    }
                }
            } catch (e) { }
        }

        // Transcript
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            result.transcriptLength = transcript.length;
            result.transcriptPreview = transcript.slice(0, 20).map(t => t.text).join(' ');
            result.transcriptFull = transcript.map(t => t.text).join(' ');
        } catch (e: any) {
            result.transcriptError = e.message;
        }

    } catch (e: any) {
        result.error = e.message;
    }

    fs.writeFileSync('youtube_extraction_debug.json', JSON.stringify(result, null, 2));
    console.log('Written to youtube_extraction_debug.json');
}

extractAndLog();
