const PREF_KEY = 'bookleaf.desktop-alerts'

export type DesktopAlertState = 'unsupported' | 'blocked' | 'off' | 'on'

export function desktopAlertState(): DesktopAlertState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'granted' && localStorage.getItem(PREF_KEY) !== 'off') return 'on'
  return 'off'
}

export async function enableDesktopAlerts(): Promise<DesktopAlertState> {
  if (desktopAlertState() === 'unsupported') return 'unsupported'
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission === 'granted') localStorage.setItem(PREF_KEY, 'on')
  return desktopAlertState()
}

export function disableDesktopAlerts() {
  localStorage.setItem(PREF_KEY, 'off')
}

/** System notification, only while the tab is in the background (in-app toasts cover the foreground). */
export function showDesktopAlert(title: string, body: string, tag: string, onClick: () => void) {
  if (!document.hidden || desktopAlertState() !== 'on') return
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    /* Some browsers only allow notifications from a service worker. */
  }
}
