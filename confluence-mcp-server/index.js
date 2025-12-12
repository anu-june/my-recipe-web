#!/usr/bin/env node

/**
 * Confluence MCP Server
 * 
 * This server provides tools to interact with Confluence Cloud via MCP.
 * It supports creating, updating, and reading pages in Confluence.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { marked } from 'marked';

// Configuration from environment variables
const CONFLUENCE_URL = process.env.CONFLUENCE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY;

// Validate required environment variables
if (!CONFLUENCE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN || !CONFLUENCE_SPACE_KEY) {
    console.error('Missing required environment variables:');
    console.error('- CONFLUENCE_URL: Your Confluence instance URL (e.g., https://yourname.atlassian.net)');
    console.error('- CONFLUENCE_EMAIL: Your Atlassian account email');
    console.error('- CONFLUENCE_API_TOKEN: Your Confluence API token');
    console.error('- CONFLUENCE_SPACE_KEY: The space key (e.g., RECIPE)');
    process.exit(1);
}

// Base64 encode credentials for Basic Auth
const authHeader = 'Basic ' + Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

// API base URL
const API_BASE = `${CONFLUENCE_URL}/wiki/api/v2`;

/**
 * Convert Markdown to Confluence Storage Format (XHTML)
 */
function markdownToConfluence(markdown) {
    // Parse markdown to HTML
    const html = marked.parse(markdown, { async: false });

    // Confluence uses XHTML storage format, wrap in proper structure
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
 * Create a new page in Confluence
 */
async function createPage(title, content, parentId = null) {
    const spaceId = await getSpaceId(CONFLUENCE_SPACE_KEY);

    const body = {
        spaceId: spaceId,
        status: 'current',
        title: title,
        body: {
            representation: 'storage',
            value: markdownToConfluence(content),
        },
    };

    if (parentId) {
        body.parentId = parentId;
    }

    return confluenceRequest('/pages', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Update an existing page
 */
async function updatePage(pageId, title, content) {
    // First get the current page to get the version number
    const currentPage = await confluenceRequest(`/pages/${pageId}`);
    const currentVersion = currentPage.version.number;

    const body = {
        id: pageId,
        status: 'current',
        title: title,
        body: {
            representation: 'storage',
            value: markdownToConfluence(content),
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
 * Get page content by ID
 */
async function getPage(pageId) {
    return confluenceRequest(`/pages/${pageId}?body-format=storage`);
}

/**
 * Search for pages in the space
 */
async function searchPages(query) {
    const spaceId = await getSpaceId(CONFLUENCE_SPACE_KEY);
    return confluenceRequest(`/spaces/${spaceId}/pages?title=${encodeURIComponent(query)}`);
}

/**
 * List all pages in the space
 */
async function listPages() {
    const spaceId = await getSpaceId(CONFLUENCE_SPACE_KEY);
    return confluenceRequest(`/spaces/${spaceId}/pages`);
}

// Create MCP Server
const server = new Server(
    {
        name: 'confluence-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'create_confluence_page',
                description: 'Create a new page in Confluence. Supports Markdown content which will be converted to Confluence format.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'The title of the page',
                        },
                        content: {
                            type: 'string',
                            description: 'The page content in Markdown format',
                        },
                        parentId: {
                            type: 'string',
                            description: 'Optional parent page ID to create this page under',
                        },
                    },
                    required: ['title', 'content'],
                },
            },
            {
                name: 'update_confluence_page',
                description: 'Update an existing page in Confluence',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'The ID of the page to update',
                        },
                        title: {
                            type: 'string',
                            description: 'The new title of the page',
                        },
                        content: {
                            type: 'string',
                            description: 'The new page content in Markdown format',
                        },
                    },
                    required: ['pageId', 'title', 'content'],
                },
            },
            {
                name: 'get_confluence_page',
                description: 'Get the content of a Confluence page by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'The ID of the page to retrieve',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'search_confluence_pages',
                description: 'Search for pages in the Confluence space by title',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query (matches page titles)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'list_confluence_pages',
                description: 'List all pages in the configured Confluence space',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'create_confluence_page': {
                const result = await createPage(args.title, args.content, args.parentId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                pageId: result.id,
                                title: result.title,
                                url: `${CONFLUENCE_URL}/wiki${result._links?.webui || ''}`,
                            }, null, 2),
                        },
                    ],
                };
            }

            case 'update_confluence_page': {
                const result = await updatePage(args.pageId, args.title, args.content);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                pageId: result.id,
                                title: result.title,
                                version: result.version.number,
                            }, null, 2),
                        },
                    ],
                };
            }

            case 'get_confluence_page': {
                const result = await getPage(args.pageId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                id: result.id,
                                title: result.title,
                                content: result.body?.storage?.value || '',
                                version: result.version?.number,
                            }, null, 2),
                        },
                    ],
                };
            }

            case 'search_confluence_pages': {
                const result = await searchPages(args.query);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                results: result.results?.map(p => ({
                                    id: p.id,
                                    title: p.title,
                                })) || [],
                            }, null, 2),
                        },
                    ],
                };
            }

            case 'list_confluence_pages': {
                const result = await listPages();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                pages: result.results?.map(p => ({
                                    id: p.id,
                                    title: p.title,
                                })) || [],
                            }, null, 2),
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Confluence MCP Server running on stdio');
}

main().catch(console.error);
