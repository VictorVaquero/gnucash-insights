import {
    faBook,
    faChartPie,
    faMoneyBillWave,
    faPiggyBank,
    faWallet,
    faBars,
    IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react"

function Item(props: { href: string, icon: IconDefinition, text: string, selected: string, setSelected: CallableFunction, isCollapsed: boolean }) {
    const text_color = (props.selected === props.href ? "text-sky-300" : "text-white");
    return <Link to={props.href}
        className="m-2 p-2 ps-4 group hover:bg-shark-600 rounded flex item-center font-light group-hover:text-white"
        onClick={() => props.setSelected(props.href)}
    >
        <FontAwesomeIcon icon={props.icon} className="h-6 w-6 text-shark-200" />
        <AnimatePresence mode='sync'>
            {props.isCollapsed ? <></> : 
            <motion.span className={"ms-2 overflow-hidden whitespace-nowrap " + text_color}
                    key={props.text}
                    initial={{ width: 0 }}
                    animate={{ width: 'auto' }}
                    exit={{ width: 0 }}
            >{props.text}</motion.span>}
        </AnimatePresence>
    </Link>;
}

export const SideBar = () => {
    const [selected, setSelected] = useState('/');
    const [isCollapsed, setCollapse] = useState(true);

    return <nav className='h-full bg-shark-900'>
        <motion.ul className='flex flex-col'
            layout='position' transition={{ duration: 0.3, delay: 0, ease: "linear" }}>
            <li>
                <div className='flex flex-row items-center m-2 mt-4 p-2 ps-4'>
                    <Link to='/'
                        className="rounded flex item-center font-bold group-hover:text-white text-2xl"
                        onClick={() => setSelected('/')}>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="h-8 w-8 text-teal-400" />
                        <AnimatePresence mode='sync'>
                            {isCollapsed ? <></> :
                                <motion.p
                                    className="ms-4 text-white overflow-hidden whitespace-nowrap"
                                    key={'cash-modal'}
                                    initial={{ width: 0 }}
                                    animate={{ width: 'auto' }}
                                    exit={{ width: 0 }}
                                >Cash</motion.p>}
                        </AnimatePresence>
                    </Link>;
                    <button onClick={() => setCollapse((current) => !current)}>
                        <FontAwesomeIcon icon={faBars} className="ml-6 h-8 w-8 text-shark-200 hover:text-gray-400" />
                    </button>
                </div>
            </li>
            <li>
                <Item href='/home' icon={faWallet} text='Portada' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <Item href='/metadata' icon={faBook} text='Metadatos' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <Item href='/graphs' icon={faChartPie} text='Gráficos' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <Item href='/investments' icon={faPiggyBank} text='Inversiones' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <Item href='/other' icon={faPiggyBank} text='Analisis' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
        </motion.ul>
    </nav>;
}