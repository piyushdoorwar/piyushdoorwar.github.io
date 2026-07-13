import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import StatsOverview from './components/StatsOverview'
import Projects from './components/Projects'
import Writing from './components/Writing'
import Music from './components/Music'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <About />
        <Experience />
        <StatsOverview />
        <Projects />
        <Writing />
        <Music />
      </main>
      <Footer />
    </div>
  )
}
