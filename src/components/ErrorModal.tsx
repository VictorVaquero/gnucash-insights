import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

export const ErrorModal = ({
  msg,
  isVisible,
  setVisible,
}: {
  msg: string;
  isVisible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <>
      {isVisible &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="absolute left-[70%] top-0 m-10 text-popover-foreground bg-popover border border-border rounded"
              key="login-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: [1, 1, 0, 1, 1] }}
              transition={{ duration: 0.4 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-6 pb-2">
                <h2 className="text-xl text-popover-foreground">Logging Failure</h2>
                <p className="pt-6 text-base text-muted-foreground">{msg}</p>
              </div>
              <div className="p-4 pt-2 flex flex-row justify-end">
                <button
                  className="p-4 text-muted-foreground hover:bg-accent rounded"
                  onClick={() => setVisible(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
