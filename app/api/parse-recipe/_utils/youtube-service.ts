import { YoutubeTranscript } from 'youtube-transcript';

export async function extractYoutubeData(url: string): Promise<string | null> {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (!youtubeMatch || !youtubeMatch[1]) {
        return null;
    }

    const videoId = youtubeMatch[1];

    try {
        // Fetch YouTube page to extract description from meta tags
        const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!ytResponse.ok) {
            throw new Error('Failed to fetch YouTube page');
        }

        const html = await ytResponse.text();

        // Extract title from Open Graph meta tag (more reliable)
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : '';

        // Extract full description from ytInitialData (YouTube's embedded JSON)
        let fullDescription = '';

        // YouTube embeds data in: var ytInitialData = {...};
        const ytDataMatch = html.match(/var ytInitialData = ({[\s\S]+?});/);

        if (ytDataMatch) {
            try {
                const ytData = JSON.parse(ytDataMatch[1]);

                // Navigate through YouTube's data structure to find description
                const videoDetails = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;

                if (videoDetails && Array.isArray(videoDetails)) {
                    // Find the videoSecondaryInfoRenderer which contains the description
                    for (const item of videoDetails) {
                        if (item?.videoSecondaryInfoRenderer?.attributedDescription) {
                            fullDescription = item.videoSecondaryInfoRenderer.attributedDescription.content;
                            break;
                        }
                    }
                }

            } catch (parseError) {
                // Silent failure for optional data
            }
        }

        // Fallback to meta description if ytInitialData extraction failed
        if (!fullDescription) {
            const metaDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
            fullDescription = metaDescMatch ? metaDescMatch[1] : '';
        }

        // Try to fetch transcript
        let transcriptText = '';
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            if (transcript && transcript.length > 0) {
                transcriptText = transcript.map(t => t.text).join(' ');
            }
        } catch (transcriptError) {
            console.warn('Failed to fetch transcript:', transcriptError);
            // Continue without transcript
        }

        if (fullDescription || transcriptText) {
            return `Video Title: ${title}\n\nDescription:\n${fullDescription}\n\nTranscript:\n${transcriptText}`;
        } else {
            throw new Error('No description or transcript found');
        }

    } catch (error) {
        console.error('YouTube extraction error:', error);
        throw error;
    }
}
