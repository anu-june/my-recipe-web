export async function extractWebData(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
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

        if (!response.ok) {
            throw new Error(`Failed to access URL (${response.status})`);
        }

        const html = await response.text();
        let contentToParse = '';

        // Try to extract JSON-LD first (most reliable for recipes)
        const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);

        if (jsonLdMatch && jsonLdMatch[1]) {
            try {
                const jsonLd = JSON.parse(jsonLdMatch[1]);
                // Find the Recipe object in the JSON-LD
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
                    }
                    return null;
                };

                recipeObject = findRecipe(jsonLd);

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
