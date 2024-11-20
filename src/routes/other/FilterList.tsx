import { useSearchParams } from "react-router-dom";

export interface Query {
    [key: string]: string
}
export interface SearchQuery {
    name: string,
    query: Query
}
export const SearchList = (props: { data: SearchQuery[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setSearchParams] = useSearchParams();
    return <ul className="">
        {props.data.map((item) =>
            <li>
                <button
                    className="m-2 p-4 p-2 group hover:bg-shark-600 rounded flex item-center font-light text-white group-hover:text-white"
                    onClick={() => (setSearchParams(item.query))}
                >
                    <span className="">{item.name}</span>
                </button>
            </li>

        )}
    </ul>
}