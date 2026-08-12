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

  if (!item.children || item.children.length == 0)
    return (
      <li
        className="grid grid-cols-subgrid col-span-full hover:bg-shark-700 hover:text-white rounded-sm"
        key={item.key}
      >
        <span
          className={cn(
            "col-start-" + (item.depth + 1),
            "flex items-center text-left font-medium sticky left-0 bg-shark-900 text-white",
          )}
        >
          {item.header}
        </span>
        {item.node}
      </li>
    );
  return (
    <li className="grid grid-cols-subgrid col-span-full" key={item.key}>
      <button
        className="grid grid-cols-subgrid col-span-full  hover:bg-shark-700 hover:text-white rounded-sm"
        onClick={toggleCollapse}
      >
        <div
          className={cn(
            "col-start-" + (item.depth + 1),
            "col-span-2 flex items-center sticky left-0 bg-shark-900 text-white",
          )}
        >
          <motion.span className="" style={chevronStyle} animate={chevronAnimate}>
            &gt;
          </motion.span>
          <span className={cn("pl-2 text-left font-medium")}>{item.header}</span>
        </div>
        {item.node}
      </button>
      <AnimatePresence mode="sync">
        {collapse && (
          <TreeList data={item.children} className={cn("grid grid-cols-subgrid col-span-full")} />
        )}
      </AnimatePresence>
    </li>
  );
};
