import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

type Query = Record<string, string>;
export interface SearchQuery {
  nameKey: string;
  query: Query;
}
export const SearchList = (props: { data: SearchQuery[] }) => {
  const { t } = useTranslation();
  return (
    <ul className="">
      {props.data.map((item) => (
        <li key={item.nameKey}>
          <Link
            aria-label={t(item.nameKey)}
            to="."
            className="m-2 p-4 group hover:bg-shark-600 rounded flex item-center font-light text-foreground group-hover:text-white"
            search={(prev) => ({ ...prev, query: item.query })}
          >
            <span className="">{t(item.nameKey)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
