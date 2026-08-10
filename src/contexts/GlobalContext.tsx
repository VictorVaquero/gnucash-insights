import { DateRange } from "@/types/domain";
import { createContext } from "react";

export const DomainContext = createContext<{
  domain: DateRange | undefined;
}>({ domain: undefined });
