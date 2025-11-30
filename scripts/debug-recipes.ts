import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or service role key if RLS is blocking

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRecipes() {
    console.log('Fetching all recipes (ignoring is_published filter)...');

    const { data, error } = await supabase
        .from('recipes')
        .select('id, title, category, is_published, created_at');

    if (error) {
        console.error('Error fetching recipes:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No recipes found in the database.');
    } else {
        console.log(`Found ${data.length} recipes:`);
        console.table(data);
    }
}

debugRecipes();
