import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface Option {
  id: string;
  name: string;
  parent?: string | null;
}

interface MultiSelectTreeProps {
  options: Option[];
  selected: string[];          // selected IDs
  onToggle: (id: string) => void;
}

export function MultiSelectTree({ options, selected, onToggle }: MultiSelectTreeProps) {
  // Build a tree structure using parentId
  const tree = useMemo(() => {
    const lookup: Record<string, Option & { children: Option[] }> = {};
    const roots: (Option & { children: Option[] })[] = [];

    options.forEach((opt) => {
      lookup[opt.id] = { ...opt, children: [] };
    });

    options.forEach((opt) => {
      if (opt.parent && lookup[opt.parent]) {
        lookup[opt.parent].children.push(lookup[opt.id]);
      } else {
        roots.push(lookup[opt.id]);
      }
    });

    return roots;
  }, [options]);

  const renderNode = (
    node: Option & { children: Option[] },
    level = 0
  ): React.ReactNode => {
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
          className="w-56 justify-between"
        >
          {selected.length > 0
            ? `${selected.length} selected`
            : "Select items"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-72 overflow-y-auto w-56">
        {tree.map((node) => renderNode(node))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}