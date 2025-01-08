import { useNavigate } from "@tanstack/react-router";

export interface Query {
    [key: string]: string
}
export interface SearchQuery {
    name: string,
    query: Query 
}
export const SearchList = (props: { data: SearchQuery[] }) => {
    
    const navigate = useNavigate({})
    return <ul className="">
        {props.data.map((item) =>
            <li>
                <button
                    className="m-2 p-4 group hover:bg-shark-600 rounded flex item-center font-light text-white group-hover:text-white"
                    onClick={() => (navigate({ search: (prev)=> (item.query) }))}>
                    <span className="">{item.name}</span>
                </button>
            </li>

        )}
    </ul>
}