const YEAR = new Date().getFullYear();

export const Footer = () => (
  <footer className="h-8 w-full flex items-center justify-center gap-1.5 px-6 text-xs text-foreground font-light">
    <span>Made by Victor</span>
    <span className="text-foreground">·</span>
    <span>&copy; {YEAR}</span>
    <span className="text-foreground">·</span>
    <a
      href="https://victorvaquero.com"
      target="_blank"
      rel="noreferrer"
      className="text-foreground hover:text-brand transition-colors"
    >
      victorvaquero.com
    </a>
  </footer>
);
