import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractYoutubeData } from './_utils/youtube-service';
import { extractWebData } from './_utils/web-service';
import { parseRecipeWithGemini } from './_utils/gemini-service';
import { MAX_INPUT_LENGTH, MAX_REQUEST_BYTES, readLimitedText } from '@/lib/import-limits';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.GEMINI_API_KEY;
    const admins = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
        .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    if (!url || !key || !apiKey || !admins.length) {
        return NextResponse.json({ error: 'Importer is not configured.' }, { status: 503 });
    }
    const client = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    try {
        const { data: { user }, error } = await client.auth.getUser(token);
        if (error || !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        if (!user.email || !admins.includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            return NextResponse.json({ error: 'JSON input required.' }, { status: 415 });
        }
        let payload: unknown;
        try {
            payload = JSON.parse(await readLimitedText(request.body, MAX_REQUEST_BYTES));
        } catch (error) {
            const tooLarge = error instanceof Error && error.message === 'Request too large';
            return NextResponse.json({ error: tooLarge ? 'Input too large.' : 'Invalid JSON.' }, { status: tooLarge ? 413 : 400 });
        }
        const input = payload && typeof payload === 'object' && 'input' in payload ? payload.input : undefined;
        if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT_LENGTH) {
            return NextResponse.json({ error: `Provide recipe text or a URL, up to ${MAX_INPUT_LENGTH} characters.` }, { status: 400 });
        }
        // The database enforces the same admin policy and an atomic, shared limit.
        const { data: allowed, error: limitError } = await client.rpc('consume_recipe_import');
        if (limitError) return NextResponse.json({ error: 'Importer temporarily unavailable.' }, { status: 503 });
        if (allowed !== true) return NextResponse.json({ error: 'Import limit reached. Try again later.' }, { status: 429, headers: { 'Retry-After': '600' } });
        let content = input.trim();
        if (/^https?:\/\//i.test(content)) {
            try {
                const source = new URL(content);
                const youtube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(source.hostname);
                content = youtube ? (await extractYoutubeData(content) ?? '') : await extractWebData(content);
            } catch {
                return NextResponse.json({ error: 'Unable to import this URL. Use a public recipe page or paste its text.' }, { status: 422 });
            }
        }
        return NextResponse.json({ recipe: await parseRecipeWithGemini(content.slice(0, MAX_INPUT_LENGTH), apiKey) });
    } catch {
        return NextResponse.json({ error: 'Unable to parse recipe. Please try again.' }, { status: 500 });
    }
}
