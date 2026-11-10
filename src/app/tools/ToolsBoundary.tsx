import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../errors'
import { resetGestures, registerToolState } from '../gestureReset'
import { inputMachine } from '../inputMachine'

/**
 * An error boundary for the page's tools (the ink surface, the selection bar,
 * the pill). A tool that fails to draw leaves the rest of the app standing
 * (owner item 17: a pinned selection bar crashed and the whole app went
 * blank). The failure is logged, every half gesture is dropped, the tool
 * goes away for a moment and then tries again (at most `MAX_RETRIES` times in
 * a row, so a tool that always fails cannot loop).
 */

const RETRY_MS = 800
const MAX_RETRIES = 3

let caught = 0
let lastCaught = ''
registerToolState('toolsBoundary', () => ({ caught, lastCaught }))

interface Props {
  /** Names the tool in the log. */
  name: string
  children?: ReactNode
}

export class ToolsBoundary extends Component<
  Props,
  { failed: boolean; retries: number }
> {
  state = { failed: false, retries: 0 }
  private timer = 0

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    caught++
    lastCaught = this.props.name
    reportError(
      error,
      `Tool failed: ${this.props.name}${info.componentStack ?? ''}`,
    )
    // Nothing half way may stay behind: the Lasso, grips, locks.
    try {
      inputMachine.abort('health')
      resetGestures('health')
    } catch (e) {
      reportError(e, 'Tool reset failed')
    }
    if (this.state.retries >= MAX_RETRIES) return
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(
      () => this.setState((s) => ({ failed: false, retries: s.retries + 1 })),
      RETRY_MS,
    )
  }

  componentDidUpdate(_: Props, prev: { failed: boolean }) {
    // A tool that has been fine for a while forgets its failures.
    if (prev.failed && !this.state.failed) {
      window.setTimeout(() => {
        if (!this.state.failed && this.state.retries > 0) {
          this.setState({ retries: 0 })
        }
      }, 30_000)
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
