import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render and lazy-import failures.
 *
 * Without this, a chunk that fails to load — the classic case is an open tab
 * whose HTML points at asset hashes a newer deploy has replaced — throws inside
 * Suspense and leaves a blank white page with nothing to act on. A reload fixes
 * that particular failure, so the boundary says so and offers the button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the real stack in the console; the UI stays calm.
    console.error('sumptus crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const isChunkFailure = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
      error.message,
    )

    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6">
        <div className="w-full max-w-[34ch] text-center">
          <p className="display text-2xl">
            {isChunkFailure ? 'A newer version is ready.' : 'Something broke.'}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {isChunkFailure
              ? 'Your app is a bit outdated. For the newest cool stuff, tap reload.'
              : 'Your expenses are safe on this device. Reloading usually clears it.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 h-11 rounded-md bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Reload
          </button>
          {!isChunkFailure && (
            <p className="mt-6 break-words text-2xs text-muted/70">{error.message}</p>
          )}
        </div>
      </div>
    )
  }
}
