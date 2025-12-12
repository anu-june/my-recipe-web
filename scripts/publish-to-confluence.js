#!/usr/bin/env node

/**
 * Publish README to Confluence
 * 
 * Usage: node scripts/publish-to-confluence.js
 * 
 * Requires these environment variables (from .env.local):
 * - CONFLUENCE_URL
 * - CONFLUENCE_EMAIL
 * - CONFLUENCE_API_TOKEN
 * - CONFLUENCE_SPACE_KEY
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const {
    CONFLUENCE_URL,
    CONFLUENCE_EMAIL,
    CONFLUENCE_API_TOKEN,
    CONFLUENCE_SPACE_KEY
} = process.env;

// Validate environment variables
if (!CONFLUENCE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN || !CONFLUENCE_SPACE_KEY) {
    console.error('❌ Missing required environment variables. Check your .env.local file.');
    console.error('Required: CONFLUENCE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_SPACE_KEY');
    process.exit(1);
}

// Base64 encode credentials for Basic Auth
const authHeader = 'Basic ' + Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');
const API_BASE = `${CONFLUENCE_URL}/wiki/api/v2`;

/**
 * Simple Markdown to HTML converter (basic implementation)
 */
function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Tables (basic)
    html = html.replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table>)/g, '$1');
    html = html.replace(/(<\/table>)<\/p>/g, '$1');

    return html;
}

/**
 * Make authenticated request to Confluence API
 */
async function confluenceRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Confluence API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

/**
 * Get space ID from space key
 */
async function getSpaceId(spaceKey) {
    const result = await confluenceRequest(`/spaces?keys=${spaceKey}`);
    if (result.results && result.results.length > 0) {
        return result.results[0].id;
    }
    throw new Error(`Space with key "${spaceKey}" not found`);
}

/**
 * Search for a page by title
 */
async function findPageByTitle(spaceId, title) {
    const result = await confluenceRequest(`/spaces/${spaceId}/pages?title=${encodeURIComponent(title)}`);
    if (result.results && result.results.length > 0) {
        return result.results[0];
    }
    return null;
}

/**
 * Create a new page
 */
async function createPage(spaceId, title, htmlContent) {
    const body = {
        spaceId: spaceId,
        status: 'current',
        title: title,
        body: {
            representation: 'storage',
            value: htmlContent,
        },
    };

    return confluenceRequest('/pages', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Update an existing page
 */
async function updatePage(pageId, title, htmlContent, currentVersion) {
    const body = {
        id: pageId,
        status: 'current',
        title: title,
        body: {
            representation: 'storage',
            value: htmlContent,
        },
        version: {
            number: currentVersion + 1,
        },
    };

    return confluenceRequest(`/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('📖 Reading README.md...');
        const readmePath = path.join(__dirname, '..', 'README.md');
        const markdown = fs.readFileSync(readmePath, 'utf-8');

        console.log('🔄 Converting Markdown to HTML...');
        const htmlContent = markdownToHtml(markdown);

        console.log('🔍 Looking up Confluence space...');
        const spaceId = await getSpaceId(CONFLUENCE_SPACE_KEY);
        console.log(`   Found space ID: ${spaceId}`);

        const pageTitle = 'Recipe Collection Web App - Documentation';

        console.log(`🔍 Checking if page "${pageTitle}" exists...`);
        const existingPage = await findPageByTitle(spaceId, pageTitle);

        let result;
        if (existingPage) {
            console.log(`📝 Updating existing page (version ${existingPage.version.number})...`);
            result = await updatePage(existingPage.id, pageTitle, htmlContent, existingPage.version.number);
            console.log(`✅ Page updated successfully!`);
        } else {
            console.log('📝 Creating new page...');
            result = await createPage(spaceId, pageTitle, htmlContent);
            console.log(`✅ Page created successfully!`);
        }

        const pageUrl = `${CONFLUENCE_URL}/wiki${result._links?.webui || '/spaces/' + CONFLUENCE_SPACE_KEY + '/pages/' + result.id}`;
        console.log(`\n🔗 View your page: ${pageUrl}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
