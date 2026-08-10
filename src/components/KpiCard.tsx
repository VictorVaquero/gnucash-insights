export const KpiCard = (props: {
  name: string;
  value: string | number;
  title?: string;
  color?: string;
}) => {
  return (
    <div className="p-6 pt-2.5 bg-shark-800 rounded" title={props.title}>
      <span className="block text-gray-400">{props.name}</span>
      <div className="mt-2 flex flex-col items-center">
        <span className={"text-xl " + (props.color ? props.color : "text-white")}>
          {props.value}
        </span>
      </div>
    </div>
  );
};
