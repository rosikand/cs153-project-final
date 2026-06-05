import { useRef, useState } from 'react'

// Draggable before/after swipe comparing two satellite frames.
export default function BeforeAfter({ frames }) {
  const [pos, setPos] = useState(50)
  const boxRef = useRef(null)
  if (!frames || frames.length < 2) return null
  const [before, after] = frames

  const onMove = (clientX) => {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div>
      <div
        ref={boxRef}
        className="relative aspect-square w-full cursor-ew-resize select-none overflow-hidden"
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onClick={(e) => onMove(e.clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        <img src={after.url} alt={`after ${after.date}`} draggable={false} className="absolute inset-0 size-full object-cover" />
        <img
          src={before.url}
          alt={`before ${before.date}`}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-md" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs text-black shadow">
            ⇆
          </span>
        </div>
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{before.date}</span>
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{after.date}</span>
      </div>
      <div className="py-2 text-center text-[11px] text-muted-foreground">
        Drag to compare · {before.date} → {after.date}
      </div>
    </div>
  )
}
