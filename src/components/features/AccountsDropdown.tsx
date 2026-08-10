import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSummaryPageContext } from "@/routes/summary/-summaryPageContext";
import React, { useMemo, useState } from "react";

interface Option {
  id: string;
  name: string;
  parent?: string | null;
}

type OptionExtended = Option & { children: OptionExtended[] };

interface MultiSelectTreeProps {
  options: Option[];
}

export function MultiSelectTree({ options }: MultiSelectTreeProps) {
  const { hideAccounts: selected, toggleHideAccount: onToggle } = useSummaryPageContext();
  const [search, setSearch] = useState("");

  // Build a tree structure using parentId
  const tree = useMemo(() => {
    const lookup: Record<string, OptionExtended> = {};
    const roots: OptionExtended[] = [];

    options
      .filter((node) => search === "" || node.name.toLowerCase().includes(search.toLowerCase()))
      .forEach((opt) => {
        lookup[opt.id] = { ...opt, children: [] };
      });

    options
      .filter((node) => search === "" || node.name.toLowerCase().includes(search.toLowerCase()))

      .forEach((opt) => {
        if (opt.parent && lookup[opt.parent]) {
          lookup[opt.parent].children.push(lookup[opt.id]);
        } else {
          roots.push(lookup[opt.id]);
        }
      });

    return roots;
  }, [options, search]);

  const renderNode = (node: OptionExtended, level = 0): React.ReactNode => {
    const isSelected = selected.includes(node.id);

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1 cursor-pointer"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onToggle(node.id)}
        >
          <Checkbox checked={isSelected} />
          <span>{node.name}</span>
        </div>

        {node.children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-56 justify-between dark:bg-shark-800 dark:text-gray-400"
        >
          {selected.length > 0 ? `${selected.length} selected` : "Select accounts to hide"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-72 overflow-y-auto w-56">
        {/* Search input */}
        <div className="p-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border px-2 py-1 text-sm"
          />
        </div>
        {tree.map((node) => renderNode(node))}
        {/* Render filtered tree */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
