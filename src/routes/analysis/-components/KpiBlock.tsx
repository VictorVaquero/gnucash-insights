import * as d3 from "d3";

import { parseNum } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useDomain } from "@/hooks/useDB";
import { FullTransaction } from "..";

export const KpiBlock = (props: { data: FullTransaction[] }) => {
  const { numMonths, latestMonth } = useDomain();

  if (!latestMonth) return <></>;

  const xf = (d: FullTransaction) => d.datePosted;
  const groupedData = d3
    .groups(props.data, (d) => xf(d).toFormat("yyyy-LL"))
    .map(([, data]) => ({
      date: xf(data[0]),
      value: d3.sum(data, (d) => d.value),
    }));
  const sortedData = [...groupedData].sort((a, b) =>
    a.date > b.date ? 1 : -1
  );

  const total_value_all_time = props.data.reduce((v, d) => v + d.value, 0);
  const meanAllTime =
    props.data.reduce((v, d) => v + d.value, 0) / (numMonths ?? 1);
  const meanLastMonth = sortedData
    .filter((d) => d.date === latestMonth)
    .reduce((v, d) => v + d.value, 0);
  const meanLast3Months =
    sortedData
      .filter(
        (d) => d.date < latestMonth && d.date >= latestMonth.minus({ month: 3 })
      )
      .reduce((v, d) => v + d.value, 0) / 3;
  const meanLast6Months =
    sortedData
      .filter(
        (d) => d.date < latestMonth && d.date >= latestMonth.minus({ month: 6 })
      )
      .reduce((v, d) => v + d.value, 0) / 6;
  const meanLastYear =
    sortedData
      .filter(
        (d) =>
          d.date < latestMonth && d.date >= latestMonth.minus({ month: 12 })
      )
      .reduce((v, d) => v + d.value, 0) / 12;

  return (
    <section
      className={
        "grid grid-cols-2 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2"
      }
    >
      <KpiCard
        name="Mean"
        value={parseNum(meanAllTime)}
        title={parseNum(meanAllTime)}
      />
      <KpiCard
        name="Last month"
        value={parseNum(meanLastMonth)}
        title={parseNum(meanLastMonth)}
      />
      <KpiCard
        name="Last 3"
        value={parseNum(meanLast3Months)}
        title={parseNum(meanLast3Months)}
      />
      <KpiCard
        name="Last 6"
        value={parseNum(meanLast6Months)}
        title={parseNum(meanLast6Months)}
      />
      <KpiCard
        name="Last year"
        value={parseNum(meanLastYear)}
        title={parseNum(meanLastYear)}
      />
      <KpiCard
        name="Total"
        value={parseNum(total_value_all_time)}
        title={parseNum(total_value_all_time)}
      />
    </section>
  );
};
