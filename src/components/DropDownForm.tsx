export interface DropDownItem {
  key: string;
  value: string;
}
export const DropDownForm = (props: {
  id: string;
  label: string;
  list: DropDownItem[];
  value: string | undefined;
  setValue: CallableFunction;
}) => {
  return (
    <form className="p-4 pt-2.5 bg-secondary max-w-80 rounded">
      <label htmlFor={props.id} className="block text-secondary-foreground mb-1">
        {props.label}
      </label>
      <select
        id={props.id}
        name={props.id}
        className="w-full max-w-full p-4 bg-secondary text-secondary-foreground border-0 border-b-2 border-border"
        value={props.value}
        onChange={(e) => props.setValue(e.target.value)}
      >
        {props.list.map((item) => (
          <option key={item.key} value={item.key}>
            {item.value}
          </option>
        ))}
      </select>
    </form>
  );
};
