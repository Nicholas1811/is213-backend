import { useEffect, useState } from 'react'
import { requestPermission, getFcmToken, clearFcmToken } from '../messaging'
import { registerFirebaseSw } from '../swRegister'
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
    <section style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <h2>Notifications</h2>
      <p>Permission: <strong>{permission}</strong></p>
      {permission !== 'granted' ? (
        <button onClick={handleRequest} disabled={busy}>Request permission</button>
      ) : (
        <>
          <p>FCM Token: <code style={{wordBreak:'break-all'}}>{token ?? '—'}</code></p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => { const t = await getFcmToken(undefined); setToken(t)
              console.log(t)
              await axios.post("https://personal-fsn5aajc.outsystemscloud.com/NotificationTokenService/rest/NotificationTokens/notificationtokens\n",{
                "device_token": t,
                "userId": "abc"
              })
            }} disabled={busy}>Refresh token</button>
            <button onClick={handleDeleteToken} disabled={busy}>Delete token</button>
            <button onClick={() => { if (token) navigator.clipboard.writeText(token) }}>Copy token</button>
          </div>
        </>
      )}
    </section>
  )
}

