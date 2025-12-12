# Confluence MCP Server

A Model Context Protocol (MCP) server for integrating with Confluence Cloud.

## Features

- **Create pages** - Create new pages with Markdown content
- **Update pages** - Modify existing pages
- **Read pages** - Retrieve page content
- **Search pages** - Find pages by title
- **List pages** - List all pages in a space

## Setup

### 1. Install Dependencies

```bash
cd confluence-mcp-server
npm install
```

### 2. Configure Environment Variables

Add to your `.env.local` file:

```
CONFLUENCE_URL=https://yourname.atlassian.net
CONFLUENCE_EMAIL=your@email.com
CONFLUENCE_API_TOKEN=your_api_token
CONFLUENCE_SPACE_KEY=RECIPE
```

### 3. Configure MCP in Antigravity

Add to your MCP settings (location varies by IDE):

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["d:/recipe-web/confluence-mcp-server/index.js"],
      "env": {
        "CONFLUENCE_URL": "https://anuthekkel.atlassian.net",
        "CONFLUENCE_EMAIL": "your@email.com",
        "CONFLUENCE_API_TOKEN": "your_api_token",
        "CONFLUENCE_SPACE_KEY": "RECIPE"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_confluence_page` | Create a new page with Markdown content |
| `update_confluence_page` | Update an existing page |
| `get_confluence_page` | Get page content by ID |
| `search_confluence_pages` | Search pages by title |
| `list_confluence_pages` | List all pages in the space |
