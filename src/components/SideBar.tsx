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
import { motion, AnimatePresence } from "motion/react"
import { Link, LinkComponent, createLink } from '@tanstack/react-router';
import React from 'react';


interface ItemLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    icon: IconDefinition, text: string, selected: string, setSelected: CallableFunction, isCollapsed: boolean
}
  

const ItemLinkComponent = React.forwardRef<HTMLAnchorElement, ItemLinkProps>((props, ref) => {
    const { selected, setSelected, isCollapsed, text, ...restProps } = props;
    const text_color = (selected === props.href ? "text-sky-300" : "text-white");
    
    return <Link ref={ref} {...restProps}
        data-iscollapsed = {isCollapsed}
        className="m-2 p-2 px-4 data-[iscollapsed=true]:w-fit group hover:bg-shark-600 rounded flex item-center font-light group-hover:text-white"
        onClick={() => setSelected(props.href)}
    >
        <FontAwesomeIcon icon={props.icon} className="h-6 w-6 text-shark-200" />
        <AnimatePresence mode='sync'>
            {isCollapsed ? <></> : 
            <motion.span className={"ms-2 overflow-hidden whitespace-nowrap " + text_color}
                    key={text}
                    initial={{ width: 0 }}
                    animate={{ width: 'auto' }}
                    exit={{ width: 0 }}
            >{text}</motion.span>}
        </AnimatePresence>
    </Link>;
})

const CreatedLinkComponent = createLink(ItemLinkComponent)
  
const ItemLink: LinkComponent<typeof CreatedLinkComponent> = (props) => {
    return <CreatedLinkComponent preload={'render'} {...props} />
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
                <ItemLink to='/home' icon={faWallet} text='Portada' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <ItemLink to='/metadata' icon={faBook} text='Metadatos' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <ItemLink to='/summary' icon={faChartPie} text='Resumen' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <ItemLink to='/expenses' icon={faChartPie} text='Gastos' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <ItemLink to='/investments' icon={faPiggyBank} text='Inversiones' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
            <li>
                <ItemLink to='/analysis' icon={faPiggyBank} text='Analisis' selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
            </li>
        </motion.ul>
    </nav>;
}