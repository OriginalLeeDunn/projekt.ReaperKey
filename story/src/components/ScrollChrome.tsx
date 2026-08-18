import { useEffect, useState } from 'react'

interface Props {
  chapterIds: string[]
}

export default function ScrollChrome({ chapterIds }: Props) {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement
      const scrolled = doc.scrollTop
      const max = doc.scrollHeight - doc.clientHeight
      setProgress(max > 0 ? (scrolled / max) * 100 : 0)

      let current = 0
      chapterIds.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) {
          current = i
        }
      })
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [chapterIds])

  return (
    <>
      <div className="progress-rail" style={{ width: `${progress}%` }} />
      <nav className="chapter-nav" aria-label="Chapters">
        {chapterIds.map((id, i) => (
          <button
            key={id}
            className={i === active ? 'active' : ''}
            aria-label={`Jump to ${id}`}
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
          />
        ))}
      </nav>
    </>
  )
}
