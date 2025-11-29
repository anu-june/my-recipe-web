const videoId = process.argv[2] || 'usZvYCHmMD4';

async function testYouTube() {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        const html = await response.text();

        // Try different extraction methods
        console.log('=== Testing Meta Tag Extraction ===');

        // Method 1: meta name="title"
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
        console.log('Title (meta name):', titleMatch ? titleMatch[1] : 'NOT FOUND');

        // Method 2: meta property="og:title"
        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        console.log('Title (og:title):', ogTitleMatch ? ogTitleMatch[1] : 'NOT FOUND');

        // Method 3: meta name="description"
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
        console.log('Description (meta name):', descMatch ? descMatch[1].substring(0, 200) : 'NOT FOUND');

        // Method 4: meta property="og:description"
        const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        console.log('Description (og:description):', ogDescMatch ? ogDescMatch[1].substring(0, 200) : 'NOT FOUND');

        // Method 5: Look for ytInitialData
        const ytDataMatch = html.match(/var ytInitialData = ({.+?});/);
        if (ytDataMatch) {
            console.log('Found ytInitialData!');
            const data = JSON.parse(ytDataMatch[1]);
            // Navigate to description
            try {
                const description = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.attributedDescription?.content;
                console.log('Description (ytInitialData):', description ? description.substring(0, 200) : 'NOT FOUND IN PATH');
            } catch (e: any) {
                console.log('Error navigating ytInitialData:', e.message);
            }
        } else {
            console.log('ytInitialData NOT FOUND');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testYouTube();
