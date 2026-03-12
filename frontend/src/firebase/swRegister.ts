export async function registerFirebaseSw() {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    console.log('Firebase SW registered:', reg.scope)
  } catch (e) {
    console.warn('Failed to register Firebase SW:', e)
  }
}

export async function unregisterFirebaseSw() {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map(r => r.unregister()))
    console.log('Service workers unregistered')
  } catch (e) {
    console.warn('Failed to unregister SWs', e)
  }
}
