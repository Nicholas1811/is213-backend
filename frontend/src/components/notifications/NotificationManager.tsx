import { useEffect, useState } from 'react'
import { requestPermission, getFcmToken, clearFcmToken } from '../../firebase/messaging'
import { registerFirebaseSw } from '../../firebase/swRegister'
import axios from 'axios';

export default function NotificationManager() {
  const [permission, setPermission] = useState(Notification.permission)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Ensure SW is registered early
    if ('serviceWorker' in navigator) registerFirebaseSw()
  }, [])

  async function handleRequest() {

    setBusy(true)
    const perm = await requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      console.log("ho")
      const t = await getFcmToken(undefined)

      setToken(t)
    }
    setBusy(false)
  }

  async function handleDeleteToken() {
    setBusy(true)
    await clearFcmToken()
    setToken(null)
    setBusy(false)
  }

  return (
    <section className="border border-border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-2">Notifications</h2>
      <p className="text-sm text-muted-foreground mb-2">Permission: <strong>{permission}</strong></p>
      {permission !== 'granted' ? (
        <button className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md" onClick={handleRequest} disabled={busy}>Request permission</button>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2 break-all">FCM Token: <code>{token ?? '—'}</code></p>
          <div className="flex gap-2">
            <button className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded" onClick={async () => { const t = await getFcmToken(undefined); setToken(t)
              console.log(t)
              await axios.post("https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens\n",{
                "device_token": t,
                "userId": "abc"
              })
            }} disabled={busy}>Refresh token</button>
            <button className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded" onClick={handleDeleteToken} disabled={busy}>Delete token</button>
            <button className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded" onClick={() => { if (token) navigator.clipboard.writeText(token) }}>Copy token</button>
          </div>
        </>
      )}
    </section>
  )
}
