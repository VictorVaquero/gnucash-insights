import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { DropDownForm } from "@/components/DropDownForm.tsx";
import { KpiCard } from "@/components/KpiCard.tsx";
import { booksOptions, domainOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";

const Metadata = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { t } = useTranslation();

  const { data: books = [] } = useQuery(booksOptions(db));
  const { data: domainDates } = useQuery(domainOptions(db));

  let bookOptions: { key: string; value: string }[] = [];
  let book = {
    id: "",
    version: "",
    countAccount: 0,
    countCommodity: 0,
    countPrice: 0,
    countSchedxaction: 0,
    countTransaction: 0,
  };
  let domain = { min: "-", max: "-" };

  if (db) {
    bookOptions = books.map((b) => ({ key: b.id, value: b.id }));
    book = books.filter((b) => b.id === bookId)[0] ?? book;

    domain = {
      min: domainDates?.min?.toISODate() ?? domain.min,
      max: domainDates?.max?.toISODate() ?? domain.max,
    };
  }

  return (
    <div className="p-4 md:p-10 flex flex-col gap-y-4">
      <DropDownForm
        id="books"
        label={t("metadata.bookId")}
        list={bookOptions}
        value={bookId}
        //setValue={setBookId}
        setValue={() => undefined}
      />
      <div className="mt-6 flex flex-row flex-wrap gap-x-6 gap-y-4">
        <KpiCard name={t("metadata.accounts")} value={book.countAccount} />
        <KpiCard name={t("metadata.transactions")} value={book.countTransaction} />
        <KpiCard name={t("metadata.currencies")} value={book.countPrice} />
        <KpiCard name={t("metadata.initialDate")} value={domain.min} />
        <KpiCard name={t("metadata.finalDate")} value={domain.max} />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/metadata")({
  component: Metadata,
  beforeLoad: async () => {
    return { title: "routes.metadata.title" };
  },
  loader: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      console.debug("Redirect to login");
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
});
