import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'urql'
import { client } from './graphql/client'
import { AuthProvider } from './auth'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Provider value={client}>
        <App />
      </Provider>
    </AuthProvider>
  </StrictMode>,
)
