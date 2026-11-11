import { fetchPublicText } from '@/lib/safe-fetch';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

type JsonObject = {
    [key: string]: JsonValue;
};

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function extractWebData(url: string): Promise<string> {
    try {
        const html = await fetchPublicText(url);
        let contentToParse = '';

        // Try to extract JSON-LD first (most reliable for recipes)
        const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);

        if (jsonLdMatch && jsonLdMatch[1]) {
            try {
                const jsonLd = JSON.parse(jsonLdMatch[1]) as JsonValue;

                const findRecipe = (obj: JsonValue): JsonObject | null => {
                    if (!obj) return null;
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const found = findRecipe(item);
                            if (found) return found;
                        }
                    } else if (isJsonObject(obj)) {
                        const typeValue = obj['@type'];
                        if (typeValue === 'Recipe' || (Array.isArray(typeValue) && typeValue.includes('Recipe'))) {
                            return obj;
                        }
                        // Check @graph if present
                        if (obj['@graph']) {
                            return findRecipe(obj['@graph']);
                        }
                    }
                    return null;
                };

                const recipeObject = findRecipe(jsonLd);

                if (recipeObject) {
                    contentToParse = JSON.stringify(recipeObject);
                } else {
                    // Fallback cleanup
                    contentToParse = cleanHtml(html);
                }
            } catch (e) {
                console.warn('Failed to parse JSON-LD, falling back to HTML text', e);
                contentToParse = cleanHtml(html);
            }
        } else {
            // No JSON-LD, standard cleanup
            contentToParse = cleanHtml(html);
        }

        // Check if content is empty or too short
        if (!contentToParse || contentToParse.length < 50) {
            throw new Error('Could not extract meaningful content from the URL');
        }

        return contentToParse;

    } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
    }
}

function cleanHtml(html: string): string {
    return html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40000);
}
