import { AnimatePresence, motion } from "motion/react"
import { ReactNode, useState } from "react"

interface TreeListItem {
    key: string,
    node: ReactNode,
    children: TreeListItem[]
}

export const TreeList = ({data, className}: {data: TreeListItem[], className?: string})=>{
    return <motion.ul className={className}
        initial="collapsed"
        animate="open"
        exit="collapsed"
        variants={{
            open: { opacity: 1, height: "auto" },
            collapsed: { opacity: 0, height: 0 }
        }}
        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
    >
        {data.map((item) => <TreeNode key={item.key} item={item} />)}
    </motion.ul>
}

const TreeNode = ({ item }: {item: TreeListItem}) => {
    const [collapse, isCollapsed] = useState(false);

    if (!item.children || item.children.length == 0) return <li className="px-4 hover:bg-shark-700 rounded-sm" key={item.key}>{item.node}</li>
    return <li className="w-full" key={item.key}>
        <button className="flex flex-row w-full px-4 hover:bg-shark-700 rounded-sm" onClick={() => isCollapsed((prev) => !prev)}>
            <div className="pr-2 flex items-center justify-center">
                <motion.span className="" style={{originX: 0.3}} animate={{ rotate: collapse ? 0 : 90, translateY: -2 }}>&gt;</motion.span>
            </div>
            {item.node}
        </button>
        <AnimatePresence mode='sync'>
            {collapse && <TreeList data={item.children} className="ml-2 md:ml-10" />}
        </AnimatePresence>
    </li>
}