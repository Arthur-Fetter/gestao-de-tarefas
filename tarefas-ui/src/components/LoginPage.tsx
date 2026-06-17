import { useState } from 'react'
import { useMutation } from 'urql'
import { useAuth } from '../auth'
import { LOGIN_MUTATION, REGISTER_MUTATION } from '../graphql/operations'
import './LoginPage.css'

interface AuthPayload {
  token: string
  user: { id: string; email: string; name: string; role: string }
}
interface LoginData { login: AuthPayload }
interface RegisterData { register: AuthPayload }

const ROLES = [
  { value: 'ADMIN', label: 'Administrador', description: 'Gerencia tudo' },
  { value: 'USER', label: 'Usuário', description: 'Cria e edita suas tarefas' },
  { value: 'GUEST', label: 'Convidado', description: 'Somente leitura' },
]

export function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [, loginMutation] = useMutation<LoginData>(LOGIN_MUTATION)
  const [, registerMutation] = useMutation<RegisterData>(REGISTER_MUTATION)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = mode === 'login'
      ? await loginMutation({ email, password })
      : await registerMutation({ name, email, password, role })

    setLoading(false)

    if (result.error) {
      const msg = result.error.graphQLErrors[0]?.message ?? result.error.message
      setError(msg)
      return
    }

    const payload = mode === 'login'
      ? (result.data as LoginData)?.login
      : (result.data as RegisterData)?.register

    if (payload) login(payload.token, payload.user)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Gestao de Tarefas</h1>
        <p className="login-card__subtitle">
          {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
        </p>

        {error && <p className="login-card__error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-card__form">
          {mode === 'register' && (
            <>
              <input
                className="login-card__input"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={loading}
              />
              <div className="login-card__roles">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    className={`login-card__role-btn ${role === r.value ? 'login-card__role-btn--active' : ''}`}
                    onClick={() => setRole(r.value)}
                    disabled={loading}
                    title={r.description}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <input
            className="login-card__input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            className="login-card__input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
          />
          <button className="login-card__submit" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          className="login-card__toggle"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          disabled={loading}
        >
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
        </button>
      </div>
    </div>
  )
}
