import { GoogleGenerativeAI } from '@google/generative-ai';

export async function parseRecipeWithGemini(contentToParse: string, apiKey: string): Promise<any> {
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
You are a recipe extraction expert. Extract structured recipe data from the following text (which may be unstructured or HTML content).

INPUT:
${contentToParse}

INSTRUCTIONS:
1. If it's a URL, imagine you're reading the recipe content from that page.
2. Extract and structure the recipe information into a consistent template.
3. STRICTLY use only the information provided in the input. DO NOT hallucinate or invent ingredients or steps. If the input does not contain a recipe, return a JSON with an "error" field explaining why.

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
        const models = ['gemini-2.0-flash', 'gemini-flash-latest'];
        let lastError;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;

                if (error.message.includes('429') || error.message.includes('503')) {
                    continue;
                }
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
