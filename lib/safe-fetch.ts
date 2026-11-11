import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const blocked = new BlockList();
for (const [address, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const) blocked.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
blocked.addSubnet('3fff::', 20, 'ipv6');

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return !blocked.check(address, 'ipv4');
    return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

// Resolve once and pin the socket to the checked address. Redirects are checked
// separately, preventing private-network redirects and DNS rebinding.
export async function fetchPublicText(input: string, redirects = 0): Promise<string> {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) {
        throw new Error('Unsupported URL');
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('Non-public address');
    const selected = addresses[0];
    const result = await new Promise<string | URL>((resolve, reject) => {
        const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
            method: 'GET',
            family: selected.family,
            headers: { 'User-Agent': 'RecipeImporter/1.0', Accept: 'text/html,application/xhtml+xml,text/plain,application/ld+json', 'Accept-Encoding': 'identity' },
            signal: AbortSignal.timeout(10_000),
            lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
        }, response => {
            response.on('error', reject);
            const status = response.statusCode ?? 0;
            if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
                response.destroy();
                if (redirects >= 3) return reject(new Error('Too many redirects'));
                try { resolve(new URL(response.headers.location, url)); } catch (error) { reject(error); }
                return;
            }
            if (status < 200 || status >= 300) {
                response.destroy();
                return reject(new Error('Unable to fetch page'));
            }
            if (!/^(text\/(html|plain)|application\/(xhtml\+xml|ld\+json|json))(;|$)/i.test(response.headers['content-type'] ?? '') ||
                !['identity', undefined].includes(response.headers['content-encoding'])) {
                response.destroy();
                return reject(new Error('Unsupported response type'));
            }
            const chunks: Buffer[] = [];
            let bytes = 0;
            response.on('data', (chunk: Buffer) => {
                bytes += chunk.length;
                if (bytes > 2_000_000) {
                    response.destroy(new Error('Page too large'));
                    return;
                }
                chunks.push(chunk);
            });
            response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        request.on('error', reject);
        request.end();
    });
    return result instanceof URL ? fetchPublicText(result.href, redirects + 1) : result;
}

