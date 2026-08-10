import { useEffect, useState } from "react";

export function usePersistentState<Type>(
  key: string,
  initialState?: Type | (() => Type),
): [Type, React.Dispatch<React.SetStateAction<Type>>] {
  const prefixedKey = "use-persistent-state-" + key;

  const [value, setValue] = useState<Type>(() => {
    const storedValue = localStorage.getItem(prefixedKey);
    if (storedValue == null) {
      if (typeof initialState === "function") {
        return (initialState as () => Type)();
      } else {
        return initialState;
      }
    } else {
      return JSON.parse(storedValue);
    }
  });

  useEffect(() => {
    if (value) localStorage.setItem(prefixedKey, JSON.stringify(value));
    else localStorage.removeItem(prefixedKey);
  }, [value, prefixedKey]);
  return [value, setValue];
}
