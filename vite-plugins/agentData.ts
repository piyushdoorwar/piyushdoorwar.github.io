import { runnerImport, type Plugin } from 'vite'

/** The parts of src/agent/agentData.ts used here (importing its types would pull the app into this tsconfig). */
interface AgentModule {
  buildAgentData(): unknown
  renderLlmsFull(data: never): string
}

const MODULE = 'src/agent/agentData.ts'

function render(agent: AgentModule): Record<string, string> {
  const data = agent.buildAgentData()
  return {
    'agent/data.json': `${JSON.stringify(data, null, 2)}\n`,
    'llms-full.txt': agent.renderLlmsFull(data as never),
  }
}

/**
 * Emits the agent snapshot (`/agent/data.json`) and `/llms-full.txt` from the same
 * `src/data` modules the page renders. The MCP server reads the JSON over HTTPS, so
 * every deploy refreshes the tools with no separate server release.
 */
export default function agentData(): Plugin {
  let root = ''
  return {
    name: 'agent-data',

    configResolved(config) {
      root = config.root
    },

    // Dev: render on each request so edits to src/data show up without a restart.
    configureServer(server) {
      for (const path of ['agent/data.json', 'llms-full.txt']) {
        server.middlewares.use(`/${path}`, async (_req, res, next) => {
          try {
            const files = render((await server.ssrLoadModule(`/${MODULE}`)) as AgentModule)
            res.setHeader(
              'Content-Type',
              path.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8',
            )
            res.end(files[path])
          } catch (error) {
            next(error)
          }
        })
      }
    },

    async generateBundle() {
      // The data modules import react-icons and JSON, so they load through Vite's own
      // module runner rather than plain Node. `configFile: false` keeps this plugin out.
      const { module } = await runnerImport<AgentModule>(`${root}/${MODULE}`, {
        configFile: false,
        root,
      })
      for (const [fileName, source] of Object.entries(render(module))) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
