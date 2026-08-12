import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const initial = { opacity: 0 };
const animate = { opacity: [1, 1, 0, 1, 1] };
const transition = { duration: 0.4 };
const exit = { opacity: 0 };

export const ErrorModal = ({
  msg,
  isVisible,
  setVisible,
}: {
  msg: string;
  isVisible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();
  const close = useCallback(() => setVisible(false), [setVisible]);
  return (
    <>
      {isVisible &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="absolute left-[70%] top-0 m-10 text-popover-foreground bg-popover border border-border rounded"
              key="login-modal"
              initial={initial}
              animate={animate}
              transition={transition}
              exit={exit}
            >
              <div className="p-6 pb-2">
                <h2 className="text-xl text-popover-foreground">{t("errorModal.title")}</h2>
                <p className="pt-6 text-base text-muted-foreground">{msg}</p>
              </div>
              <div className="p-4 pt-2 flex flex-row justify-end">
                <button
                  className="p-4 text-muted-foreground hover:bg-accent rounded"
                  onClick={close}
                >
                  {t("errorModal.close")}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
