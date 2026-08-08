import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { getErrorMessage } from '@/common/utils'
import { ErrorModal } from '@/components/ErrorModal'
import { useAuth } from '@/contexts/useAuthContext'

interface LoginSearch {
  redirect: string
}

export const LoginPage = () => {
  const { isAuthenticated, signIn, signInGuest } = useAuth();
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [isVisible, setVisible] = useState(false)
  const [msg, setMsg] = useState('')

  const router = useRouter();
  const search = Route.useSearch({});

  const handleSignIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    try {
      await signIn(user, password)
      router.history.push(search.redirect)
    } catch (error) {
      setMsg(getErrorMessage(error))
      setVisible(true)
    }
  }
  const handleGuestSignIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    signInGuest()
    router.history.push(search.redirect)
  }

  useEffect(() => {
    if (isAuthenticated()) router.history.push(search.redirect)
  }, [isAuthenticated])

  return (
    <div className="h-full min-h-fit flex justify-center items-center overflow-y-auto py-6">
      <div className="text-white p-10 py-6 bg-shark-800 rounded">
        <form className="pt-4" onSubmit={handleSignIn}>
          <div>
            <input
              className="p-4 bg-shark-600 text-white focus-visible:outline focus-visible:outline-shark-50 focus-visible:outline-1"
              name='user'
              id="user"
              type="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Email"
              autoComplete="off"
              required
            />
          </div>
          <div className="mt-2">
            <input
              className="inputText p-4 bg-shark-600 text-white focus-visible:outline focus-visible:outline-shark-50 focus-visible:outline-1"
              name='password'
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="off"
              required
            />
          </div>
          <div className="pt-4 flex flex-row justify-between">
            <button className="p-3 px-4 bg-shark-800 hover:bg-shark-600" type='button' onClick={handleGuestSignIn}>
              {'Guest'}
            </button>
            <button className="p-3 px-4 bg-shark-800 hover:bg-shark-600" type="submit">
              {'Sign In'}
            </button>
          </div>
        </form>
        <ErrorModal msg={msg} isVisible={isVisible} setVisible={setVisible} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/login/')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return { redirect: (search.redirect as string) || '/summary', }
  },
  beforeLoad: async () => {
    return { title: 'Login' }
  }
})
