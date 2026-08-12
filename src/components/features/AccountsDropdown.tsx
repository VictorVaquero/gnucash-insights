import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSummaryPageContext } from "@/routes/summary/-summaryPageContext";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface Option {
  id: string;
  name: string;
  parent?: string | null;
}

type OptionExtended = Option & { children: OptionExtended[] };

interface MultiSelectTreeProps {
  options: Option[];
}

interface TreeNodeProps {
  node: OptionExtended;
  level: number;
  selected: string[];
  onToggle: (id: string) => void;
}

const TreeNode = ({ node, level, selected, onToggle }: TreeNodeProps) => {
  const isSelected = selected.includes(node.id);
  const style = useMemo(() => ({ paddingLeft: `${level * 16 + 8}px` }), [level]);
  const handleClick = useCallback(() => onToggle(node.id), [onToggle, node.id]);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 cursor-pointer"
        style={style}
        onClick={handleClick}
      >
        <Checkbox checked={isSelected} />
        <span>{node.name}</span>
      </div>

      {node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          level={level + 1}
          selected={selected}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

export function MultiSelectTree({ options }: MultiSelectTreeProps) {
  const { hideAccounts: selected, toggleHideAccount: onToggle } = useSummaryPageContext();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [],
  );

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-56 justify-between dark:bg-shark-800 dark:text-gray-400"
        >
          {selected.length > 0
            ? t("accountsDropdown.selectedCount", { count: selected.length })
            : t("accountsDropdown.placeholder")}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-72 overflow-y-auto w-56">
        {/* Search input */}
        <div className="p-2">
          <input
            type="text"
            placeholder={t("accountsDropdown.searchPlaceholder")}
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-md border px-2 py-1 text-sm"
          />
        </div>
        {tree.map((node) => (
          <TreeNode key={node.id} node={node} level={0} selected={selected} onToggle={onToggle} />
        ))}
        {/* Render filtered tree */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
