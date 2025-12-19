import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

export async function parseRecipeWithGemini(contentToParse: string, apiKey: string): Promise<any> {
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
You are a recipe extraction expert. Extract structured recipe data from the following text (which may be unstructured or HTML content).

INPUT:
${contentToParse}

INSTRUCTIONS:
1. If it's a URL, imagine you're reading the recipe content from that page.
2. Extract and structure the recipe information into a consistent template.
3. STRICTLY use only the information provided in the input. DO NOT hallucinate or invent ingredients or steps. 
4. If the input contains ONLY ingredients but no steps/instructions, still return the recipe with the ingredients list, set steps to "Steps not available - please watch the video or add manually", and add a note explaining this.
5. If the input does not contain ANY recipe information at all (no title, no ingredients), return a JSON with an "error" field explaining why.

FORMATTING RULES:

- Units: PRESERVE DUAL UNITS if provided (e.g. "1 cup (120g)"). Do not remove the metric/gram equivalent if the cup measurement exists.
- In STEPS: ALWAYS prefer volume units (cups, tbsp) for readability.
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
  "source_url": "Original URL OR source name (e.g. 'Mom's Kitchen') if known, otherwise null",
  "notes": "Use room temperature eggs."
}
`;

    const generateWithFallback = async (prompt: string) => {
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let lastError;

        for (const [index, modelName] of models.entries()) {
            const startTime = Date.now();
            let isSuccess = false;
            let errorMsg = null;

            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                isSuccess = true;
                return text;
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                errorMsg = error.message;

                if (error.message.includes('429') || error.message.includes('503')) {
                    // Continue to next model on recoverable errors
                } else {
                    // Rethrow if it's not a rate limit error? 
                    // Actually original logic continued for 429/503 but threw for others?
                    // Original logic: if 429/503 continue, else loop finishes and throws lastError.
                    // Wait, original logic ONLY continued if 429/503. It didn't break for others, it just retried loop? 
                    // No, "if (error...includes...) continue;" implied it moves to next iteration.
                    // If NOT 429/503, it falls through to end of loop block? No, it's inside the loop.
                    // If it doesn't continue, it proceeds to end of loop body?
                    // Ah, the original code had:
                    // if (error...429/503) { continue; }
                    // It had no "else break" so it would effectively continue for ALL errors unless it rethrew.
                    // Let's re-read original.
                    // It CAUGHT all errors, logged, assigned lastError.
                    // Then `if (429/503) continue`. 
                    // Then loop ends naturally? Yes. So it actually tried ALL models for ANY error.
                    // My logging logic shouldn't change that behavior.
                }
            } finally {
                // Log event to Supabase
                const duration = Date.now() - startTime;
                // Fire and forget logging
                supabase.from('model_events').insert({
                    model_name: modelName,
                    status: isSuccess ? 'success' : 'failure',
                    duration_ms: duration,
                    error_message: errorMsg,
                    fallback_occurred: index > 0, // 0 is primary, >0 is fallback
                    recipe_source: contentToParse.substring(0, 100) // Log first 100 chars of source/URL
                }).then(({ error }) => {
                    if (error) console.error('Failed to log model event:', error);
                });
            }
        }
        throw lastError;
    };

    try {
        const text = await generateWithFallback(prompt);
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const recipeData = JSON.parse(cleanedText);

        if (recipeData.prep_time_minutes && recipeData.cook_time_minutes) {
            recipeData.total_time_minutes = recipeData.prep_time_minutes + recipeData.cook_time_minutes;
        }

        return recipeData;

    } catch (error) {
        console.error('Gemini parsing error:', error);
        throw error;
    }
}
