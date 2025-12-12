import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';



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

        // Get Gemini model
        const genAI = new GoogleGenerativeAI(apiKey);
        // Model selection is handled in generateWithFallback


        // Check if input is a URL
        let contentToParse = input;
        const urlRegex = /^(https?:\/\/[^\s]+)/;

        if (urlRegex.test(input)) {
            // Check if it's a YouTube URL
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
            const youtubeMatch = input.match(youtubeRegex);

            if (youtubeMatch && youtubeMatch[1]) {
                const videoId = youtubeMatch[1];
                console.log('Detected YouTube video:', videoId);

                try {
                    // Fetch YouTube page to extract description from meta tags
                    const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                        },
                        signal: AbortSignal.timeout(10000)
                    });

                    if (ytResponse.ok) {
                        const html = await ytResponse.text();

                        // Extract title from Open Graph meta tag (more reliable)
                        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
                        const title = titleMatch ? titleMatch[1] : '';

                        // Extract full description from ytInitialData (YouTube's embedded JSON)
                        let fullDescription = '';

                        // YouTube embeds data in: var ytInitialData = {...};
                        const ytDataMatch = html.match(/var ytInitialData = ({[\s\S]+?});/);

                        if (ytDataMatch) {
                            try {
                                const ytData = JSON.parse(ytDataMatch[1]);

                                // Navigate through YouTube's data structure to find description
                                const videoDetails = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;

                                if (videoDetails && Array.isArray(videoDetails)) {
                                    // Find the videoSecondaryInfoRenderer which contains the description
                                    for (const item of videoDetails) {
                                        if (item?.videoSecondaryInfoRenderer?.attributedDescription) {
                                            fullDescription = item.videoSecondaryInfoRenderer.attributedDescription.content;
                                            break;
                                        }
                                    }
                                }

                                console.log('Extracted YouTube description from ytInitialData, length:', fullDescription.length);
                            } catch (parseError) {
                                console.warn('Failed to parse ytInitialData:', parseError);
                            }
                        }

                        // Fallback to meta description if ytInitialData extraction failed
                        if (!fullDescription) {
                            const metaDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
                            fullDescription = metaDescMatch ? metaDescMatch[1] : '';
                            console.log('Using meta description as fallback, length:', fullDescription.length);
                        }

                        // Try to fetch transcript
                        let transcriptText = '';
                        try {
                            console.log('Fetching transcript for video:', videoId);
                            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                            if (transcript && transcript.length > 0) {
                                transcriptText = transcript.map(t => t.text).join(' ');
                                console.log('Fetched transcript, length:', transcriptText.length);
                            }
                        } catch (transcriptError) {
                            console.warn('Failed to fetch transcript:', transcriptError);
                            // Continue without transcript
                        }

                        if (fullDescription || transcriptText) {
                            console.log('Extracted YouTube content. Description length:', fullDescription.length, 'Transcript length:', transcriptText.length);
                            contentToParse = `Video Title: ${title}\n\nDescription:\n${fullDescription}\n\nTranscript:\n${transcriptText}`;
                        } else {
                            console.warn('No description or transcript found in YouTube video');
                            return NextResponse.json(
                                { error: 'Could not retrieve video description or transcript. Please paste the recipe manually.' },
                                { status: 422 }
                            );
                        }
                    } else {
                        console.warn('Failed to fetch YouTube page');
                        return NextResponse.json(
                            { error: 'Failed to access YouTube video. Please paste the recipe manually.' },
                            { status: 422 }
                        );
                    }
                } catch (ytError) {
                    console.error('YouTube extraction error:', ytError);
                    return NextResponse.json(
                        { error: 'Error processing YouTube video. Please paste the recipe manually.' },
                        { status: 500 }
                    );
                }
            } else {
                // Regular URL (not YouTube)
                try {
                    console.log('Fetching URL:', input);
                    const response = await fetch(input, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                            'Sec-Ch-Ua-Mobile': '?0',
                            'Sec-Ch-Ua-Platform': '"Windows"',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Sec-Fetch-User': '?1',
                            'Upgrade-Insecure-Requests': '1'
                        },
                        signal: AbortSignal.timeout(10000) // 10 second timeout
                    });

                    if (response.ok) {
                        const html = await response.text();
                        console.log('Successfully fetched URL, length:', html.length);

                        // Try to extract JSON-LD first (most reliable for recipes)
                        const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);

                        if (jsonLdMatch && jsonLdMatch[1]) {
                            try {
                                const jsonLd = JSON.parse(jsonLdMatch[1]);
                                // Find the Recipe object in the JSON-LD
                                // It could be the object itself, or inside an array, or in a @graph
                                let recipeObject = null;

                                const findRecipe = (obj: any): any => {
                                    if (!obj) return null;
                                    if (Array.isArray(obj)) {
                                        for (const item of obj) {
                                            const found = findRecipe(item);
                                            if (found) return found;
                                        }
                                    } else if (typeof obj === 'object') {
                                        if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
                                            return obj;
                                        }
                                        // Check @graph if present
                                        if (obj['@graph']) {
                                            return findRecipe(obj['@graph']);
                                        }
                                        // Check other properties recursively if needed, but usually it's top level or in graph
                                    }
                                    return null;
                                };

                                recipeObject = findRecipe(jsonLd);

                                if (recipeObject) {
                                    console.log('Found JSON-LD Recipe object!');
                                    // Use the structured data as the input for Gemini to normalize
                                    contentToParse = JSON.stringify(recipeObject);
                                } else {
                                    console.log('JSON-LD found but no Recipe object detected, falling back to HTML text');
                                    // Fallback to HTML text cleaning
                                    contentToParse = html
                                        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                                        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                                        .replace(/<[^>]+>/g, ' ')
                                        .replace(/\s+/g, ' ')
                                        .trim()
                                        .slice(0, 40000);
                                }
                            } catch (e) {
                                console.warn('Failed to parse JSON-LD, falling back to HTML text', e);
                                contentToParse = html
                                    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                                    .replace(/<[^>]+>/g, ' ')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .slice(0, 40000);
                            }
                        } else {
                            // No JSON-LD, standard cleanup
                            contentToParse = html
                                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .slice(0, 40000); // Increased limit
                        }

                        // Check if content is empty or too short
                        if (!contentToParse || contentToParse.length < 50) {
                            return NextResponse.json(
                                { error: 'Could not extract meaningful content from the URL. Please paste the recipe manually.' },
                                { status: 422 }
                            );
                        }

                    } else {
                        console.warn(`Failed to fetch URL: ${response.status} ${response.statusText}`);
                        return NextResponse.json(
                            { error: `Failed to access URL (${response.status}). The site might be blocking bots. Please paste the recipe manually.` },
                            { status: 422 }
                        );
                    }
                } catch (fetchError) {
                    console.error('Fetch error:', fetchError);
                    return NextResponse.json(
                        { error: 'Error fetching URL. Please ensure the URL is correct or paste the recipe manually.' },
                        { status: 500 }
                    );
                }
            }
        }

        // Create prompt for recipe extraction
        const prompt = `
You are a recipe extraction expert. Extract structured recipe data from the following text (which may be unstructured or HTML content).

INPUT:
${contentToParse}

INSTRUCTIONS:
1. If it's a URL, imagine you're reading the recipe content from that page.
2. Extract and structure the recipe information into a consistent template.
3. STRICTLY use only the information provided in the input. DO NOT hallucinate or invent ingredients or steps. If the input does not contain a recipe, return a JSON with an "error" field explaining why.

FORMATTING RULES:

- Standardize units: PREFER cups, tbsp, tsp for liquids. Use grams for solids when metric.
- Convert mL to cups (240 mL = 1 cup, 120 mL = 1/2 cup, 60 mL = 1/4 cup, etc.).
- List ALL ingredients in a single flat list.
- EXCEPTION: If there are marination ingredients, list "Marination" as a header line, then list marination ingredients below it. Otherwise, NO headers like "For the sauce" or "A/B/C".
- Example: "All-purpose flour – 2 cups"
- Example: "Vanilla extract – 1 tsp"
- Example: "Water – 1 cup" (NOT "Water – 240 mL")
- DO NOT output "null" or "undefined" for quantity. If quantity is missing, just output "Ingredient – ".

STEPS:
- Number all steps (1., 2., 3., etc.).
- Repeat ingredient quantities inside the steps (e.g., "Add 1 cup flour and 2 tbsp sugar to the bowl").
- Break complex actions into multiple steps.
- Clean up messy narrative wording to be concise and clear.
- NO bold text anywhere.

NOTES:
- Add useful tips, variations, or optional upgrades from the original recipe.
- If there are "optional additions", "variations", or "upgrades" mentioned, include them here.
- If the input was a URL, include "Source: [URL]" at the end of the notes.
- Remove duplicate or conflicting information.

GENERAL:
- No bold text anywhere.
- Always produce clean, copy-ready output.
- Scale recipes if the user explicitly asks in the input (e.g. "convert to 1 kg"), otherwise keep original quantities.
- Categorize the recipe (Breakfast, Lunch, Dinner, Dessert, Snack, Appetizer, Main, Side, Cake, Curry, Pudding, or Other).
- Estimate times in minutes if not explicitly stated.
- If cuisine type is apparent, include it.

RESPOND ONLY WITH VALID JSON in this exact format (no markdown, no extra text):
{
  "title": "Recipe name",
  "category": "Category name",
  "cuisine": "Cuisine type or null",
  "servings": "Number of servings as text (e.g., '4 servings')",
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "ingredients": "Flour – 1 cup\\nSugar – 2 tbsp\\n...",
  "steps": "1. Preheat oven to 350°F\\n2. Mix 1 cup flour and 2 tbsp sugar...\\n...",
  "notes": "Use room temperature eggs.\\nSource: [URL if available]"
}
`;

        // Helper function to generate content with fallback
        const generateWithFallback = async (prompt: string) => {
            const models = ['gemini-2.0-flash', 'gemini-flash-latest'];
            let lastError;

            for (const modelName of models) {
                try {
                    console.log(`Attempting to generate with model: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    return response.text();
                } catch (error: any) {
                    console.warn(`Model ${modelName} failed:`, error.message);
                    lastError = error;

                    // If it's a quota error (429) or service unavailable (503), try next model
                    // Otherwise, if it's a bad request (400), it might be the prompt, but we'll try next anyway just in case
                    if (error.message.includes('429') || error.message.includes('503')) {
                        continue;
                    }
                    // For other errors, we might want to break, but for robustness let's try the fallback
                }
            }
            throw lastError;
        };

        // Call Gemini API with fallback
        const text = await generateWithFallback(prompt);

        // Parse the JSON response
        let recipeData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            recipeData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            return NextResponse.json(
                { error: 'Failed to parse recipe JSON from AI response. Please try again.' },
                { status: 500 }
            );
        }

        // Calculate total time if both prep and cook times are available
        if (recipeData.prep_time_minutes && recipeData.cook_time_minutes) {
            recipeData.total_time_minutes = recipeData.prep_time_minutes + recipeData.cook_time_minutes;
        }

        return NextResponse.json({ recipe: recipeData });

    } catch (error: any) {
        console.error('Error parsing recipe:', error);
        return NextResponse.json(
            { error: `Failed to parse recipe: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
