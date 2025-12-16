import { NextRequest, NextResponse } from 'next/server';
import { extractYoutubeData } from './_utils/youtube-service';
import { extractWebData } from './_utils/web-service';
import { parseRecipeWithGemini } from './_utils/gemini-service';

export async function POST(request: NextRequest) {
    try {
        const { input } = await request.json();

        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'Invalid input. Please provide a URL or recipe text.' },
                { status: 400 }
            );
        }

        // Validate API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is missing in environment variables');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        // Check if input is a URL
        let contentToParse = input;
        const urlRegex = /^(https?:\/\/[^\s]+)/;
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

        if (urlRegex.test(input)) {
            try {
                if (youtubeRegex.test(input)) {
                    // Handle YouTube URL
                    const extractedData = await extractYoutubeData(input);
                    if (extractedData) {
                        contentToParse = extractedData;
                    } else {
                        // Should be caught by extractYoutubeData throwing, but just in case
                        throw new Error('Failed to extract YouTube data');
                    }
                } else {
                    // Handle regular URL
                    contentToParse = await extractWebData(input);
                }
            } catch (extractionError: any) {
                console.warn('Extraction failed:', extractionError);
                // Return specific error messages based on the service failure
                return NextResponse.json(
                    { error: extractionError.message || 'Failed to extract content from URL. Please paste the recipe manually.' },
                    { status: 422 }
                );
            }
        }

        // Parse with Gemini
        try {
            const recipeData = await parseRecipeWithGemini(contentToParse, apiKey);
            return NextResponse.json({ recipe: recipeData });
        } catch (geminiError: any) {
            return NextResponse.json(
                { error: 'Failed to parse recipe with AI. Please try again.' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Error parsing recipe:', error);
        return NextResponse.json(
            { error: `Failed to parse recipe: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}

