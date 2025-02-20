import { createFileRoute } from "@tanstack/react-router"

const Home = () => {
  return <div className="p-20 px-20">
    <h1 className="text-6xl lg:text-8xl text-white">Welcome!</h1>
    <span className="inline-block pt-20 text-lg text-white font-light">This is a unique financial dashboard, connected directly to a database stored in Aws</span>
    <span className="block pt-1 text-lg text-white font-light">You can log in as a guest and take a look around!</span>
    <span className="block pt-1 text-lg text-white font-light">It has been implemented in React & Tailwind</span>
  </div>
}
export const Route = createFileRoute('/home')({
  component: Home,
  beforeLoad: async () => {
    return { title: 'Home' }
  },
})
