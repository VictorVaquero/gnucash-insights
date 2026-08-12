import { Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

type Query = Record<string, string>;
export interface SearchQuery {
  nameKey: string;
  query: Query;
}

const SearchListItem = ({ item }: { item: SearchQuery }) => {
  const { t } = useTranslation();
  const buildSearch = useCallback(
    (prev: Record<string, unknown>) => ({ ...prev, query: item.query }),
    [item.query],
  );
  return (
    <li>
      <Link
        aria-label={t(item.nameKey)}
        to="."
        className="m-2 p-4 group hover:bg-shark-600 rounded flex item-center font-light text-foreground group-hover:text-white"
        search={buildSearch}
      >
        <span className="">{t(item.nameKey)}</span>
      </Link>
    </li>
  );
};

export const SearchList = (props: { data: SearchQuery[] }) => {
  return (
    <ul className="">
      {props.data.map((item) => (
        <SearchListItem key={item.nameKey} item={item} />
      ))}
    </ul>
  );
};
