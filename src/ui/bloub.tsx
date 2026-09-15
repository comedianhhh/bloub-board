import { BloubBot, type StateId } from 'bloub-react'
import { useEffect, useState } from 'react'

/**
 * Every listing gets a face: shape, ink and rest expression come from a hash of
 * its identity, so a row keeps the same face across visits and locales. The
 * expression is then overridden by what the row is doing on the board.
 */
const SHAPES = ['cercle', 'galet', 'squircle', 'capsule', 'triangle', 'hexagone', 'nuage', 'goutte'] as const
const INKS = ['#3ec5a8', '#5aa0e8', '#e8a25a', '#c97ad6', '#d6706b', '#7fb069', '#e3b341', '#5fbfd6', '#e07aa4'] as const
const REST = ['neutre', 'attentif', 'heureux', 'curieux', 'timide', 'confus'] as const

export const PAPER = '#1b1a19'
export const INK_BRIGHT = '#f4f1eb'
export const INK_MUTED = '#8c8983'

function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Face {
  shape: string
  ink: string
  expression: string
}

export function faceFor(identity: string): Face {
  const h = hash(identity)
  return {
    shape: SHAPES[h % SHAPES.length]!,
    ink: INKS[(h >>> 3) % INKS.length]!,
    expression: REST[(h >>> 7) % REST.length]!,
  }
}

/** What a row is doing on the board, in order of precedence. */
export function listingMood(input: { rank: number; settledAgoMs: number; daysLeft: number; fading: boolean }): {
  expression: string | null
  ink: string | null
  state: StateId
} {
  if (input.fading || input.daysLeft <= 7) return { expression: 'somnolent', ink: INK_MUTED, state: 'idle' }
  if (input.rank === 1) return { expression: 'fier', ink: null, state: 'idle' }
  if (input.settledAgoMs < 60 * 60 * 1000) return { expression: 'excite', ink: null, state: 'idle' }
  return { expression: null, ink: null, state: 'idle' }
}

/**
 * A listing's face. Frozen by default: a board of twenty rows should not run
 * twenty animation loops. `live` turns the loop on (hover, focus).
 */
export function ListingFace(props: {
  identity: string
  size: number
  rank: number
  settledAgoMs: number
  daysLeft: number
  fading: boolean
  live?: boolean
}) {
  const face = faceFor(props.identity)
  const mood = listingMood(props)
  return (
    <span className="listing-face" style={{ width: props.size, height: props.size }}>
      <BloubBot
        state={mood.state}
        shape={face.shape}
        color={mood.ink ?? face.ink}
        expression={mood.expression ?? face.expression}
        paper={PAPER}
        size={Math.round(props.size * 1.58)}
        frozenAt={props.live ? undefined : 0.9}
        label=""
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
      />
    </span>
  )
}

/** The page mascot. It has one job: show what the board is doing. */
export type MascotMood = 'idle' | 'raising' | 'thinking' | 'waiting' | 'done' | 'error' | 'takeover' | 'sleeping'

const MASCOT_STATE: Record<MascotMood, StateId> = {
  idle: 'idle',
  raising: 'wide',
  thinking: 'thinking',
  waiting: 'notify',
  done: 'wink',
  error: 'alert',
  takeover: 'comet',
  sleeping: 'sleep',
}

export function Mascot(props: { mood: MascotMood; size?: number; follow?: boolean; frozenAt?: number }) {
  // Only run the animation loop on the client; the server renders one still frame.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const size = props.size ?? 190
  return (
    <span className="mascot" style={{ width: size, height: size }} data-mood={props.mood}>
      <BloubBot
        state={MASCOT_STATE[props.mood]}
        color={INK_BRIGHT}
        paper={PAPER}
        size={Math.round(size * 1.58)}
        follow={mounted && (props.follow ?? true)}
        frozenAt={mounted ? props.frozenAt : 0.6}
        label=""
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
      />
    </span>
  )
}

/** Fires `raising` for a beat after each step, then settles. */
export function useRaisePulse(): [boolean, () => void] {
  const [raising, setRaising] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!tick) return
    setRaising(true)
    const timer = window.setTimeout(() => setRaising(false), 1100)
    return () => window.clearTimeout(timer)
  }, [tick])
  return [raising, () => setTick((n) => n + 1)]
}
