import { lazy, Suspense } from 'react'
import App from './App'
import Footer from './components/Footer'
import InteractiveGrid from './components/InteractiveGrid'
import Nav from './components/Nav'
import { registerPreload, useRoute } from './router'

const loadMcpPage = () => import('./mcp/McpPage')
const McpPage = lazy(loadMcpPage)
registerPreload('mcp', loadMcpPage)

/**
 * The shell both pages share. The top bar, footer and grid live here, so a page switch
 * only swaps the content between them and the grid keeps running.
 */
export default function Root() {
  const route = useRoute()
  return (
    <div className="min-h-screen overflow-x-clip">
      <InteractiveGrid />
      <div className="relative z-10">
        <Nav />
        {route === 'mcp' ? (
          <Suspense fallback={<div className="min-h-screen" />}>
            <McpPage />
          </Suspense>
        ) : (
          <App />
        )}
        <Footer hideMcpLink={route === 'mcp'} />
      </div>
    </div>
  )
}
