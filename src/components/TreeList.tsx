import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useCallback, useMemo, useState } from "react";

interface TreeListItem {
  key: string;
  header: string;
  node: ReactNode;
  children: TreeListItem[];
  depth: number;
}

const treeListVariants = {
  open: { opacity: 1, height: "auto" },
  collapsed: { opacity: 0, height: 0 },
};
const treeListTransition = { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] as const };
const chevronStyle = { originX: 0.3 };

export const TreeList = ({ data, className }: { data: TreeListItem[]; className?: string }) => {
  return (
    <motion.ul
      className={className}
      initial="collapsed"
      animate="open"
      exit="collapsed"
      variants={treeListVariants}
      transition={treeListTransition}
    >
      {data.map((item) => (
        <TreeNode key={item.key} item={item} />
      ))}
    </motion.ul>
  );
};

const TreeNode = ({ item }: { item: TreeListItem }) => {
  const [collapse, isCollapsed] = useState(false);
  const toggleCollapse = useCallback(() => isCollapsed((prev) => !prev), []);
  const chevronAnimate = useMemo(() => ({ rotate: collapse ? 0 : 90, translateY: 0 }), [collapse]);
  const indentStyle = useMemo(() => ({ paddingLeft: item.depth * 20 }), [item.depth]);

  if (!item.children || item.children.length == 0)
    return (
      <li
        className="flex items-center justify-between gap-4 py-2 hover:bg-secondary rounded-sm"
        style={indentStyle}
        key={item.key}
      >
        <span className="text-left font-medium truncate">{item.header}</span>
        {item.node}
      </li>
    );
  return (
    <li key={item.key}>
      <button
        className="w-full flex items-center justify-between gap-4 py-2 hover:bg-secondary rounded-sm"
        style={indentStyle}
        onClick={toggleCollapse}
      >
        <span className="flex items-center min-w-0">
          <motion.span style={chevronStyle} animate={chevronAnimate}>
            &gt;
          </motion.span>
          <span className={cn("pl-2 text-left font-medium truncate")}>{item.header}</span>
        </span>
        {item.node}
      </button>
      <AnimatePresence mode="sync">{collapse && <TreeList data={item.children} />}</AnimatePresence>
    </li>
  );
};
