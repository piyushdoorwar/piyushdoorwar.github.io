// Kept apart from agentData.ts so the eagerly loaded hero and footer can link to the
// MCP page without pulling every data module into the main chunk.
export const SITE_URL = 'https://piyushdoorwar.com'
export const MCP_ENDPOINT = 'https://mcp.piyushdoorwar.com/mcp'
export const MCP_PAGE_PATH = '/mcp/'
/** Published path of the snapshot the MCP server reads. */
export const AGENT_DATA_PATH = '/agent/data.json'
