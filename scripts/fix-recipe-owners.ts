import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS policies
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    console.error('Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixRecipeOwners(targetEmail: string) {
    if (!targetEmail) {
        console.error('Error: Please provide a target email address.');
        console.log('Usage: npx tsx scripts/fix-recipe-owners.ts <email>');
        process.exit(1);
    }

    console.log(`\n🔍 Looking up user with email: ${targetEmail}`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError.message);
        process.exit(1);
    }

    const user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!user) {
        console.error(`❌ User not found for email: ${targetEmail}`);
        console.log('Available users:', users.map(u => u.email).join(', '));
        process.exit(1);
    }

    const userId = user.id;
    console.log(`✅ Found user: ${userId}`);

    // 2. Count recipes to update
    const { count, error: countError } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);

    if (countError) {
        console.error('Error checking recipes:', countError.message);
        process.exit(1);
    }

    if (count === 0) {
        console.log('🎉 No recipes found with missing owners. All good!');
        return;
    }

    console.log(`\n📝 Found ${count} recipes with NO owner (user_id is NULL).`);
    console.log(`   Assigning them to ${targetEmail}...`);

    // 3. Update recipes
    const { data, error: updateError } = await supabase
        .from('recipes')
        .update({ user_id: userId })
        .is('user_id', null)
        .select();

    if (updateError) {
        console.error('❌ Error updating recipes:', updateError.message);
        process.exit(1);
    }

    console.log(`\n✅ Successfully updated ${data.length} recipes!`);
    console.log('   You should now be able to edit these recipes in the app.');
}

// Get email from command line arg
const emailArg = process.argv[2];
fixRecipeOwners(emailArg);
