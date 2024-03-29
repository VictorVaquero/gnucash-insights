
import {
    faBook,
    faChartPie,
    faMoneyBillWave,
    faPiggyBank,
    faWallet,
    IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {useState} from "react";
import {Link} from "react-router-dom";

function Item(props: {href: string, icon: IconDefinition, text: string, selected: string, setSelected: CallableFunction}) {
    const text_color = (props.selected === props.href ? "text-sky-300" : "text-white");
    return <Link to={props.href}
                 className="m-2 p-2 ps-4 group hover:bg-shark-600 rounded flex item-center font-light group-hover:text-white"
                 onClick={() => props.setSelected(props.href)}
    >
        <FontAwesomeIcon icon={props.icon} className="h-6 w-6 text-shark-200"/>
        <span className={"ms-2 "+text_color}>{props.text}</span>
    </Link>;
}

export const SideBar = () => {
    const [selected, setSelected] = useState('/');
    return <nav className='h-full w-40 bg-shark-900'>
        <ul className='flex flex-col'>
            <li>
                <Link to='/'
                      className="m-2 mt-4 p-2 ps-4 rounded flex item-center font-bold group-hover:text-white text-2xl"
                      onClick={() => setSelected('/')}>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="h-8 w-8 text-teal-400"/>
                    <span className="ms-4 text-white">Cash</span>
                </Link>;

            </li>
            <li>
                <Item href='/home' icon={faWallet} text='Portada' selected={selected} setSelected={setSelected}/>
            </li>
            <li>
                <Item href='/metadata' icon={faBook} text='Metadatos' selected={selected} setSelected={setSelected}/>
            </li>
            <li>
                <Item href='/graphs' icon={faChartPie} text='Gráficos' selected={selected} setSelected={setSelected}/>
            </li>
            <li>
                <Item href='/other' icon={faPiggyBank} text='Otros' selected={selected} setSelected={setSelected}/>
            </li>
        </ul>
    </nav>;
}