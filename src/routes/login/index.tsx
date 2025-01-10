import { useState } from 'react'
import { createFileRoute, useRouter} from '@tanstack/react-router'

import { signIn } from '@/services/authService'
import { getErrorMessage } from '@/common/utils'
import { ErrorModal } from '@/components/ErrorModal'

type LoginSearch = {
  redirect: string
}

export const LoginPage = () => {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [isVisible, setVisible] = useState(false)
  const [msg, setMsg] = useState('')
  //const [isSignUp, ] = useState(false);

  const router = useRouter();
  const search = Route.useSearch({});

  const handleSignIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    try {
      const session = await signIn(user, password)
      console.log('Sign in successful', session)
      router.history.push(search.redirect)
    } catch (error) {
      setMsg(getErrorMessage(error))
      setVisible(true)
    }
  }

  return (
    <div className="h-full flex justify-center items-center">
      <div className="text-white p-6 py-2.5 bg-shark-800 rounded">
        <form className="pt-4" onSubmit={handleSignIn}>
          <div>
            <input
              className="p-4 bg-shark-600 text-white focus-visible:outline focus-visible:outline-shark-50 focus-visible:outline-1"
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
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="off"
              required
            />
          </div>
          <div className="pt-2 flex flex-row justify-end">
            <button className="p-3 px-4 hover:bg-shark-600" type="submit">
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
    return { redirect: (search.redirect as string) || '/', }
  },
  beforeLoad: ()=>({title: 'Login'})
})
