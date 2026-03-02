import { messaging } from './firebase'
import { getToken, deleteToken } from 'firebase/messaging'

async function ensureServiceWorkerRegistered() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready
    } catch (e) {
      console.warn('Service worker registration failed:', e)
    }
  }
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'denied'
  const perm = await Notification.requestPermission()
  return perm
}

export async function getFcmToken(vapidKey?: string): Promise<string | null> {
  if (Notification.permission !== 'granted') return null
  await ensureServiceWorkerRegistered()
  try {
    const currentToken = await getToken(messaging, { vapidKey })

    return currentToken || null
  } catch (err) {
    console.error('Error getting FCM token', err)
    return null
  }
}

export async function clearFcmToken() {
  try {
    await deleteToken(messaging)
    return true
  } catch (e) {
    console.warn('Failed to delete token', e)
    return false
  }
}

