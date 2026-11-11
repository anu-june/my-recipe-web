import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, fetchPublicText } from '../lib/safe-fetch';
import { safeRedirect } from '../lib/safe-redirect';
import { readLimitedText } from '../lib/import-limits';
import { POST } from '../app/api/parse-recipe/route';
import { NextRequest } from 'next/server';

test('blocks private, special, mapped and alternate-format IP addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2002:7f00:1::', '2001:db8::1']) {
        assert.equal(isPublicAddress(address), false, address);
    }
    assert.equal(isPublicAddress('8.8.8.8'), true);
    assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('rejects unsafe URL forms before making a request', async () => {
    for (const url of ['http://127.1/', 'http://2130706433/', 'http://0x7f000001/', 'http://[::ffff:127.0.0.1]/', 'http://169.254.169.254/', 'file:///etc/passwd', 'https://user:pass@example.com', 'https://example.com:8443']) {
        await assert.rejects(fetchPublicText(url), /./, url);
    }
});

test('auth redirect stays on origin, including backslash and protocol-relative forms', () => {
    const origin = 'https://recipes.example';
    for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'https://recipes.example.evil.example']) {
        assert.equal(safeRedirect(next, origin).href, `${origin}/`);
    }
    assert.equal(safeRedirect('/add-recipe?ok=1', origin).href, `${origin}/add-recipe?ok=1`);
});

test('enforces byte limit across streamed chunks and cancels overflow', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(new Uint8Array(3)); controller.enqueue(new Uint8Array(3)); },
        cancel() { cancelled = true; },
    });
    await assert.rejects(readLimitedText(body, 5), /Request too large/);
    assert.equal(cancelled, true);
    const allowed = new Response('recipe').body;
    assert.equal(await readLimitedText(allowed, 6), 'recipe');
});

test('rejects unauthenticated imports without contacting AI or the database', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parse-recipe', { method: 'POST', body: '{"input":"test"}' }));
    assert.equal(response.status, 401);
});


test('server denies non-admins and fails closed when the shared limiter is unavailable', async () => {
    const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'GEMINI_API_KEY', 'ADMIN_EMAILS'] as const;
    const saved = names.map(name => process.env[name]);
    const originalFetch = globalThis.fetch;
    try {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
        process.env.GEMINI_API_KEY = 'test-not-a-real-key';
        process.env.ADMIN_EMAILS = 'admin@example.com';
        let email = 'visitor@example.com';
        let limiterWorks = false;
        const calls: string[] = [];
        globalThis.fetch = async (input) => {
            const url = String(input);
            calls.push(url);
            if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'test-user', email });
            if (url.endsWith('/rest/v1/rpc/consume_recipe_import')) {
                return limiterWorks ? Response.json(false) : Response.json({ message: 'missing function' }, { status: 404 });
            }
            throw new Error('Unexpected outbound call');
        };
        const request = () => new NextRequest('http://localhost/api/parse-recipe', {
            method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
            body: JSON.stringify({ input: 'Recipe text' }),
        });
        assert.equal((await POST(request())).status, 403);
        assert.equal(calls.length, 1);
        email = 'admin@example.com';
        assert.equal((await POST(request())).status, 503);
        limiterWorks = true;
        const limited = await POST(request());
        assert.equal(limited.status, 429);
        assert.equal(limited.headers.get('retry-after'), '600');
        assert.equal(calls.some(url => url.includes('googleapis')), false);
    } finally {
        globalThis.fetch = originalFetch;
        names.forEach((name, index) => {
            if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index];
        });
    }
});
