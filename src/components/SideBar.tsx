import {
    IconDefinition,
    faBook,
    faChartPie,
    faCoins,
    faMagnifyingGlass,
    faPiggyBank,
    faPlane,
    faWallet
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LinkComponent, createLink, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from "motion/react";
import React from 'react';


interface ItemLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    icon: IconDefinition, text: string, selected: string, isCollapsed: boolean
}


const ItemLinkComponent = React.forwardRef<HTMLAnchorElement, ItemLinkProps>((props, ref) => {
    const { selected, isCollapsed, text, ...restProps } = props;
    const color = (selected === props.href ? "text-sky-300" : "text-white");

    return <a
        ref={ref}
        {...restProps}
        data-iscollapsed={isCollapsed}
        className="m-2 p-2 px-4 
                w-auto data-[iscollapsed=true]:w-fit 
                group hover:bg-shark-600 rounded flex item-center font-light group-hover:text-white"
    >
        <FontAwesomeIcon icon={props.icon} className={"h-6 w-6 " + (selected === props.href ? "text-sky-300" : "text-shark-200")} />
        <AnimatePresence mode='sync'>
            {isCollapsed ? <></> :
                <motion.span className={"ms-2 overflow-hidden whitespace-nowrap " + color}
                    key={text}
                    initial={{ width: 0 }}
                    animate={{ width: 'auto' }}
                    exit={{ width: 0 }}
                >{text}</motion.span>}
        </AnimatePresence>
    </a>;
})

const CreatedLinkComponent = createLink(ItemLinkComponent)

const ItemLink: LinkComponent<typeof CreatedLinkComponent> = (props) => { return <CreatedLinkComponent preload={'render'} {...props} /> }

export const SideBar = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const selected = useRouterState({ select: (state) => state.location.href, })

    return <aside data-iscollapsed={isCollapsed} className='fixed md:static h-full w-auto md:w-auto data-[iscollapsed=false]:z-10'>
        <nav data-iscollapsed={isCollapsed} className='h-full data-[iscollapsed=true]:h-auto w-full md:w-auto'>
            <motion.ul
                data-iscollapsed={isCollapsed}
                className='flex flex-col  
                           w-max pr-10
                           h-full
                           data-[iscollapsed=true]:relative  data-[iscollapsed=true]:-left-36 data-[iscollapsed=true]:h-0
                           data-[iscollapsed=true]:md:static data-[iscollapsed=true]:md:h-auto
                           bg-shark-900
                           '
                layout='position'
                transition={{ duration: 0.3, delay: 0, ease: "easeInOut" }}>
                <li>
                    <ItemLink to='/home' icon={faWallet} text='Home' aria-label='Home' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/metadata' icon={faBook} text='Metadata' aria-label='Metadata' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/summary' icon={faChartPie} text='Summary' aria-label='Summary' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/expenses' icon={faCoins} text='Expenses' aria-label='Expenses' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/travels' icon={faPlane} text='Trips' aria-label='Travels' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/investments' icon={faPiggyBank} aria-label='Investments' text='Investments' selected={selected} isCollapsed={isCollapsed} />
                </li>
                <li>
                    <ItemLink to='/analysis' search={{ query: {} }} icon={faMagnifyingGlass} aria-label='Analysis' text='Analysis' selected={selected} isCollapsed={isCollapsed} />
                </li>
            </motion.ul>
        </nav>
    </aside>
}