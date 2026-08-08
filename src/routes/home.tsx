import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import {
  faBolt,
  faChartPie,
  faLock,
  faWallet,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { motion } from "motion/react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { useAuth } from "@/contexts/useAuthContext"

const PREVIEW_STATS = [
  { name: "Net", value: "4,231 €", color: "text-white" },
  { name: "Income", value: "2,845 €", color: "text-green-500" },
  { name: "Expenses", value: "1,120 €", color: "text-red-500" },
  { name: "Assets", value: "18,940 €", color: "text-white" },
]

const PREVIEW_TREND = [
  { month: "Feb", value: 12400 },
  { month: "Mar", value: 13100 },
  { month: "Apr", value: 12800 },
  { month: "May", value: 14600 },
  { month: "Jun", value: 15900 },
  { month: "Jul", value: 15200 },
  { month: "Aug", value: 17400 },
]

const FEATURES = [
  { icon: faBolt, text: "Live sync from your own AWS data" },
  { icon: faLock, text: "Ingestion stays local, nothing leaves your machine" },
  { icon: faChartPie, text: "Rich charts across accounts, trips & investments" },
]

const PreviewPanel = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
    className="w-full max-w-md rounded-xl border border-shark-700 bg-shark-900/60 p-5 shadow-xl"
  >
    <div className="flex items-center justify-between px-1">
      <span className="text-sm text-shark-200 font-light">Live preview</span>
      <span className="flex items-center gap-2 text-xs text-shark-300">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        sample data
      </span>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2">
      {PREVIEW_STATS.map((stat) => (
        <div key={stat.name} className="rounded-md bg-shark-800 p-3">
          <span className="block text-xs text-shark-300">{stat.name}</span>
          <span className={"text-lg " + stat.color}>{stat.value}</span>
        </div>
      ))}
    </div>

    <div className="mt-4 h-28 rounded-md bg-shark-800 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={PREVIEW_TREND} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="previewTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" hide />
          <Tooltip
            contentStyle={{ background: "#202427", border: "none", borderRadius: 6 }}
            labelStyle={{ color: "#778490" }}
            itemStyle={{ color: "#fff" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#previewTrendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
)

const Home = () => {
  const { signInGuest } = useAuth()
  const router = useRouter()

  const handleGuestSignIn = async () => {
    await signInGuest()
    router.history.push("/summary")
  }

  return (
    <div className="w-full min-h-full flex items-center justify-center px-6 sm:px-10 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-6 items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2 text-sky-400">
            <FontAwesomeIcon icon={faWallet} className="h-5 w-5" />
            <span className="text-sm font-medium tracking-wide">CashPy</span>
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Your money,
            <br />
            fully visible.
          </h1>

          <p className="mt-5 text-lg text-shark-100 font-light max-w-md">
            Track spending, savings and investments in one live dashboard,
            synced straight from your own AWS data.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleGuestSignIn}
              className="px-5 py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-shark-950 font-medium transition-colors"
            >
              Try as Guest
            </button>
            <Link
              to="/login"
              search={{ redirect: "/summary" }}
              className="px-5 py-3 rounded-md border border-shark-600 text-white hover:bg-shark-800 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-center gap-3 text-shark-100 font-light">
                <FontAwesomeIcon icon={feature.icon} className="h-4 w-4 text-sky-400 shrink-0" />
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="flex justify-center md:justify-end">
          <PreviewPanel />
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/home')({
  component: Home,
  beforeLoad: async () => {
    return { title: 'Home' }
  },
})
