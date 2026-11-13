import { useEffect, useState } from 'react'
import { PillStack } from '../../app/overlay/pillStack'
import { usePill } from '../../app/overlay/pillHooks'
import { setPillEnv } from '../../app/overlay/pillEnv'
import type { PillSpec } from '../../app/overlay/pillStore'
import { Card } from '../parts/Card'
import '../parts/Dialogs.css'
import { Cells, Demo, Section } from './Bits'
import './Step3.css'

const T = {
  title: 'Status pill stack',
  help: 'Small pills in the bottom corner: recording, now playing, timer, sync, update, zoom. One tidy stack.',
  recording: 'Recording',
  playing: 'Playing: Lecture 4',
  timer: 'Timer 12:00',
  sync: 'Syncing',
  syncProblem: 'Sync problem',
  update: 'Update ready',
  zoom: 'Zoom 120%',
  custom: 'Exported',
  stop: 'Stop recording',
  recOn: 'Recording',
  playOn: 'Now playing',
  timerOn: 'Timer',
  syncOn: 'Sync',
  syncBad: 'Sync problem',
  updateOn: 'Update ready',
  zoomOn: 'Zoom %',
  customOn: 'Custom',
  all: 'Show all six',
  none: 'Clear',
  tabBar: 'Phone tab bar',
  keyboard: 'Keyboard',
  toast: 'Toast',
  reset: 'Reset room',
  tapped: 'Opened beside the stack',
  nothing: 'Nothing opened',
  one: '1 pill',
  four: '4 pills',
  overflow: 'More than 4 (+n)',
  problem: 'Problem',
  progress: 'Progress ring',
  rec: 'Recording with Stop',
  phone: 'Phone: icons only',
  lifted: 'Lifted above a toast',
} as const

const pad = (n: number) => String(n).padStart(2, '0')

function Live() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const [bad, setBad] = useState(false)
  const [secs, setSecs] = useState(0)
  const [zoom, setZoom] = useState(120)
  const [tap, setTap] = useState<{ title: string; anchor: HTMLElement } | null>(
    null,
  )
  const [env, setEnv] = useState({
    tabBar: false,
    keyboard: false,
    toast: false,
  })
  const flip = (k: string) => setOn((o) => ({ ...o, [k]: !o[k] }))
  useEffect(() => {
    if (!on.rec && !on.timer) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [on.rec, on.timer])
  useEffect(() => {
    setPillEnv({
      tabBar: env.tabBar ? 56 : 0,
      keyboard: env.keyboard ? 300 : 0,
      toast: env.toast ? 60 : 0,
    })
    return () => setPillEnv({ tabBar: 0, keyboard: 0, toast: 0 })
  }, [env])
  const open = (title: string) => (anchor: HTMLElement) =>
    setTap({ title, anchor })

  usePill(
    on.rec
      ? {
          id: 'rec',
          kind: 'recording',
          icon: 'mic',
          label: `${T.recording} ${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`,
          tone: 'active',
          onTap: open(T.recording),
          action: { icon: 'square', label: T.stop, run: () => flip('rec') },
        }
      : null,
  )
  usePill(
    on.play
      ? {
          id: 'play',
          kind: 'playing',
          icon: 'play',
          label: T.playing,
          onTap: open(T.playing),
        }
      : null,
  )
  usePill(
    on.timer
      ? {
          id: 'timer',
          kind: 'timer',
          icon: 'clock',
          label: `Timer ${pad(Math.max(0, 12 - Math.floor(secs / 60)))}:00`,
          onTap: open(T.timer),
        }
      : null,
  )
  usePill(
    on.sync
      ? bad
        ? {
            id: 'sync',
            kind: 'sync',
            icon: 'network',
            label: T.syncProblem,
            tone: 'problem',
            onTap: open(T.syncProblem),
          }
        : {
            id: 'sync',
            kind: 'sync',
            icon: 'network',
            label: T.sync,
            progress: 0.4,
            onTap: open(T.sync),
          }
      : null,
  )
  usePill(
    on.update
      ? {
          id: 'update',
          kind: 'update',
          icon: 'sparkles',
          label: T.update,
          dismissable: true,
          onDismiss: () => setOn((o) => ({ ...o, update: false })),
          onTap: open(T.update),
        }
      : null,
  )
  usePill(
    on.zoom
      ? {
          id: 'zoom',
          kind: 'zoom',
          icon: 'zoom',
          label: `${zoom}%`,
          ttl: 2000,
        }
      : null,
  )
  usePill(
    on.custom
      ? { id: 'custom', kind: 'custom', icon: 'check', label: T.custom }
      : null,
  )

  const toggle = (k: string, label: string) => (
    <button
      key={k}
      type="button"
      className="fb-btn"
      data-testid={`pill-toggle-${k}`}
      aria-pressed={!!on[k]}
      onClick={() => flip(k)}
    >
      {label}
    </button>
  )
  return (
    <div className="step3-live">
      <div className="step3-row">
        {toggle('rec', T.recOn)}
        {toggle('play', T.playOn)}
        {toggle('timer', T.timerOn)}
        {toggle('sync', T.syncOn)}
        {toggle('update', T.updateOn)}
        {toggle('custom', T.customOn)}
        <button
          type="button"
          className="fb-btn"
          data-testid="pill-toggle-zoom"
          onClick={() => {
            setZoom((z) => z + 10)
            setOn((o) => ({ ...o, zoom: true }))
          }}
        >
          {T.zoomOn}
        </button>
        <button
          type="button"
          className="fb-btn"
          data-testid="pill-problem"
          onClick={() => setBad((b) => !b)}
        >
          {T.syncBad}
        </button>
        <button
          type="button"
          className="fb-btn"
          data-testid="pill-all"
          onClick={() =>
            setOn({
              rec: true,
              play: true,
              timer: true,
              sync: true,
              update: true,
              custom: true,
              zoom: true,
            })
          }
        >
          {T.all}
        </button>
        <button
          type="button"
          className="fb-btn"
          data-testid="pill-none"
          onClick={() => setOn({})}
        >
          {T.none}
        </button>
      </div>
      <div className="step3-row">
        {(['tabBar', 'keyboard', 'toast'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="fb-btn"
            data-testid={`pill-env-${k}`}
            aria-pressed={env[k]}
            onClick={() => setEnv((e) => ({ ...e, [k]: !e[k] }))}
          >
            {T[k]}
          </button>
        ))}
      </div>
      <p className="step3-said" data-testid="pill-tapped" aria-live="polite">
        {tap ? `${T.tapped}: ${tap.title}` : T.nothing}
      </p>
      {tap ? (
        <Card
          anchor={tap.anchor}
          size="pick"
          title={tap.title}
          onClose={() => setTap(null)}
          testId="pill-popup"
        >
          <p className="step3-said">{tap.title}</p>
        </Card>
      ) : null}
      <PillStack mode="fixed" />
    </div>
  )
}

const mk = (
  id: string,
  kind: PillSpec['kind'],
  icon: PillSpec['icon'],
  label: string,
  more: Partial<PillSpec> = {},
): PillSpec => ({ id, kind, icon, label, ...more })

const SIX: PillSpec[] = [
  mk('a', 'recording', 'mic', 'Recording 02:14', {
    tone: 'active',
    action: { icon: 'square', label: 'Stop recording', run: () => {} },
  }),
  mk('b', 'playing', 'play', 'Playing: Lecture 4'),
  mk('c', 'timer', 'clock', 'Timer 12:00'),
  mk('d', 'sync', 'network', 'Syncing', { progress: 0.4 }),
  mk('e', 'update', 'sparkles', 'Update ready', { dismissable: true }),
  mk('f', 'zoom', 'zoom', '120%'),
]

export default function PillsSection() {
  return (
    <Section id="pills" title={T.title} help={T.help}>
      <Live />
      <Cells>
        <Demo state="pills-one" label={T.one}>
          <PillStack mode="inline" pills={SIX.slice(4, 5)} />
        </Demo>
        <Demo state="pills-four" label={T.four}>
          <PillStack mode="inline" pills={SIX.slice(0, 4)} />
        </Demo>
        <Demo state="pills-overflow" label={T.overflow}>
          <PillStack mode="inline" pills={SIX} data-testid="pillstack-six" />
        </Demo>
        <Demo state="pills-problem" label={T.problem}>
          <PillStack
            mode="inline"
            pills={[
              mk('p', 'sync', 'network', 'Sync problem', { tone: 'problem' }),
            ]}
          />
        </Demo>
        <Demo state="pills-progress" label={T.progress}>
          <PillStack mode="inline" pills={SIX.slice(3, 4)} />
        </Demo>
        <Demo state="pills-recording" label={T.rec}>
          <PillStack mode="inline" pills={SIX.slice(0, 1)} />
        </Demo>
        <Demo state="pills-phone" label={T.phone}>
          <PillStack mode="inline" phone pills={SIX.slice(0, 4)} />
        </Demo>
        <Demo state="pills-lifted" label={T.lifted}>
          <PillStack
            mode="inline"
            pills={SIX.slice(4, 5)}
            env={{ toast: 60 }}
          />
        </Demo>
      </Cells>
    </Section>
  )
}
