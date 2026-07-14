import { lazy, Suspense, type ReactNode } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Footer from './components/Footer'
import InteractiveGrid from './components/InteractiveGrid'

const About = lazy(() => import('./components/About'))
const Experience = lazy(() => import('./components/Experience'))
const StatsOverview = lazy(() => import('./components/StatsOverview'))
const Projects = lazy(() => import('./components/Projects'))
const Writing = lazy(() => import('./components/Writing'))
const Music = lazy(() => import('./components/Music'))

function SectionFallback({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="section min-h-[22rem]" aria-label={`Loading ${id}`}>
      <p className="font-mono text-xs text-slate-700" aria-live="polite">
        {children}
      </p>
    </section>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <InteractiveGrid />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Suspense fallback={<SectionFallback id="about">loading about…</SectionFallback>}>
            <About />
          </Suspense>
          <Suspense fallback={<SectionFallback id="experience">loading experience…</SectionFallback>}>
            <Experience />
          </Suspense>
          <Suspense fallback={<SectionFallback id="stats">loading impact…</SectionFallback>}>
            <StatsOverview />
          </Suspense>
          <Suspense fallback={<SectionFallback id="projects">loading projects…</SectionFallback>}>
            <Projects />
          </Suspense>
          <Suspense fallback={<SectionFallback id="writing">loading writing…</SectionFallback>}>
            <Writing />
          </Suspense>
          <Suspense fallback={<SectionFallback id="music">loading music…</SectionFallback>}>
            <Music />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  )
}
