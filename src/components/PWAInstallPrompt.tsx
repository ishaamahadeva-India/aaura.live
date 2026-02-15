'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type BeforeInstallPromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: BeforeInstallPromptOutcome
    platform: string
  }>
}

const STORAGE_KEY = 'aaura-pwa-install-dismissed'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasDismissed = window.localStorage.getItem(STORAGE_KEY)
    if (hasDismissed === 'true') {
      setVisible(false)
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent default browser install prompt - we'll show our custom one
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      if (hasDismissed !== 'true') {
        setVisible(true)
      }
      // Suppress the browser warning - we handle the prompt ourselves
      // The warning appears because we preventDefault() to show a custom prompt
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener
    )

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener
      )
    }
  }, [])

  const hidePrompt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
    setVisible(false)
    setDeferredPrompt(null)
  }, [])

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        hidePrompt()
      } else {
        setVisible(true)
      }
    } catch (error) {
      console.error('PWA install prompt failed', error)
    } finally {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt, hidePrompt])

  const shouldRender = useMemo(() => {
    if (typeof window === 'undefined') return false
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS specific
      window.navigator.standalone
    return visible && !isStandalone
  }, [visible])

  if (!shouldRender) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:px-6 md:bottom-6">
      <div
        className={cn(
          'pointer-events-auto w-full max-w-2xl rounded-2xl border bg-card/95 p-4 shadow-2xl backdrop-blur',
          'md:flex md:items-center md:gap-4'
        )}
      >
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Install Aaura</p>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Faster access • Offline meditations • Full-screen darshans
              </p>
            </div>
            <button
              type="button"
              className="rounded-full bg-muted/60 p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss install prompt"
              onClick={hidePrompt}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add Aaura to your home screen for a smoother, app-like experience on
            desktop and mobile.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row md:mt-0 md:items-center md:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="order-2 sm:order-1"
            onClick={hidePrompt}
          >
            Maybe later
          </Button>
          <Button
            type="button"
            size="sm"
            className="order-1 sm:order-2"
            onClick={installApp}
          >
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
        </div>
      </div>
    </div>
  )
}

