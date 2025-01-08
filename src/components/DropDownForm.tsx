export interface DropDownItem {
    key: string,
    value: string
}
export const DropDownForm = (
    props: {id: string, label: string, list: DropDownItem[], value: string|undefined, setValue: CallableFunction}) => {
    return <form className='p-4 pt-2.5 bg-shark-700 w-max rounded'>
        <label htmlFor={props.id} className='block text-shark-200 mb-1'>{props.label}</label>
        <select id={props.id} name={props.id}
                className='w-full p-4 bg-shark-700 text-white border-0 border-b-2 border-shark-600'
                value={props.value} onChange={e => props.setValue(e.target.value)}
        >
            {props.list.map((item) => <option key={item.key} value={item.key}>{item.value}</option>)}
        </select>
    </form>
}