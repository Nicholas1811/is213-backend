import { initializeApp } from 'firebase/app'
import { getMessaging } from 'firebase/messaging'

const env = (import.meta as any).env || {}

const firebaseConfig = {
  apiKey: env.VITE_apiKey,
  authDomain: env.VITE_authDomain,
  projectId: env.VITE_projectId,
  messagingSenderId: env.VITE_messagingSenderId ,
  appId: env.VITE_appId
};

export const firebaseApp = initializeApp(firebaseConfig)
export const messaging = getMessaging(firebaseApp)
