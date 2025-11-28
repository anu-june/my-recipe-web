import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { input } = await request.json();

        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'Invalid input. Please provide a URL or recipe text.' },
                { status: 400 }
            );
        }

        // Get Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Check if input is a URL
        let contentToParse = input;
        const urlRegex = /^(https?:\/\/[^\s]+)/;

        if (urlRegex.test(input)) {
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
                } else {
                    console.warn(`Failed to fetch URL: ${response.status} ${response.statusText}`);
                    // If 403/406, it's likely bot protection. 
                    // We'll still try to pass the URL to Gemini as a fallback, 
                    // but we might want to inform the user or try a different strategy.
                }
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                // Continue with raw URL
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

FORMATTING RULES:

INGREDIENTS:
- Format each line as: "Ingredient – quantity" (Use an en-dash '–' separator).
- Standardize units (cups, tbsp, tsp, grams, ml).
- List ALL ingredients in a single flat list.
- EXCEPTION: If there are marination ingredients, list "Marination" as a header line, then list marination ingredients below it. Otherwise, NO headers like "For the sauce" or "A/B/C".
- Example: "All-purpose flour – 2 cups"
- Example: "Vanilla extract – 1 tsp"
- DO NOT output "null" or "undefined" for quantity. If quantity is missing, just output "Ingredient – ".

STEPS:
- Number all steps (1., 2., 3., etc.).
- Repeat ingredient quantities inside the steps (e.g., "Add 1 cup flour and 2 tbsp sugar to the bowl").
- Break complex actions into multiple steps.
- Clean up messy narrative wording to be concise and clear.
- NO bold text anywhere.

NOTES:
- Add only useful tips or variations from the original recipe.
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

        // Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let recipeData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            recipeData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            return NextResponse.json(
                { error: 'Failed to parse recipe. Please try again or enter recipe manually.' },
                { status: 500 }
            );
        }

        // Calculate total time if both prep and cook times are available
        if (recipeData.prep_time_minutes && recipeData.cook_time_minutes) {
            recipeData.total_time_minutes = recipeData.prep_time_minutes + recipeData.cook_time_minutes;
        }

        return NextResponse.json({ recipe: recipeData });

    } catch (error) {
        console.error('Error parsing recipe:', error);
        return NextResponse.json(
            { error: 'Failed to parse recipe. Please try again.' },
            { status: 500 }
        );
    }
}
