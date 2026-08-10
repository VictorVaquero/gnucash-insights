import { Link } from "@tanstack/react-router";

type Query = Record<string, string>;
export interface SearchQuery {
  name: string;
  query: Query;
}
export const SearchList = (props: { data: SearchQuery[] }) => {
  return (
    <ul className="">
      {props.data.map((item) => (
        <li key={item.name}>
          <Link
            aria-label={item.name}
            to="."
            className="m-2 p-4 group hover:bg-shark-600 rounded flex item-center font-light text-foreground group-hover:text-white"
            search={(prev) => ({ ...prev, query: item.query })}
          >
            <span className="">{item.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
