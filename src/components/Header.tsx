import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/useAuthContext"
import { faBars, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link, useRouterState } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Dispatch, SetStateAction } from "react"

export const Header = ({ isCollapsed, setCollapse }: { isCollapsed: boolean, setCollapse: Dispatch<SetStateAction<boolean>> }) => {
    const selected = useRouterState({ select: (state) => state.location.pathname, })
    const redirect = useRouterState({ select: (state) => state.location.search.redirect, })
    const { user, isAuthenticated, signOut } = useAuth()
    const firstLetter = user?.toUpperCase().substring(0, 1);

    return <header className="">
        <motion.div
            className=' m-4 p-2
                        flex flex-row justify-between 
                        bg-shark-900'
            layout='position'
            transition={{ duration: 0.3, delay: 0, ease: "easeInOut" }}>
            <div className='flex flex-row items-center '>
                <Link to='/home'
                    className="rounded flex item-center font-bold group-hover:text-white text-2xl"
                    aria-label='Home'
                >
                    <FontAwesomeIcon icon={faMoneyBillWave} className="h-8 w-8 text-sky-400" />
                    <AnimatePresence mode='sync'>
                        {isCollapsed ? <></> :
                            <motion.p
                                className="ms-4 text-white overflow-hidden whitespace-nowrap"
                                key={'cash-modal'}
                                initial={{ width: 0 }}
                                animate={{ width: 'auto' }}
                                exit={{ width: 0 }}
                                transition={{ duration: 0.1, delay: 0, ease: "easeInOut" }}
                            >Cash</motion.p>}
                    </AnimatePresence>
                </Link>;
                <button onClick={() => setCollapse((current) => !current)}>
                    <FontAwesomeIcon icon={faBars} className="ml-6 h-8 w-8 text-shark-200 hover:text-gray-400" />
                </button>
            </div>
            <div className="cursor-pointer">
                {isAuthenticated() ?
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 rounded-full flex flex-col justify-center items-center bg-sky-300 text-black">
                                {firstLetter}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-shark-600 border-shark-600 text-white">
                            <DropdownMenuItem onSelect={() => signOut()}>
                                Log Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    :
                    <Link className="text-white" to='/login' search={{ redirect: redirect ?? selected }}>Log In</Link>
                }
            </div>
        </motion.div>
    </header>
}
