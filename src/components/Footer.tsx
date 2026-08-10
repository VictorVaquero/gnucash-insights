const YEAR = new Date().getFullYear();

export const Footer = () => (
  <footer className="h-8 w-full flex items-center justify-center gap-1.5 px-6 text-xs text-shark-50 font-light">
    <span>Made by Victor</span>
    <span className="text-shark-50">·</span>
    <span>&copy; {YEAR}</span>
    <span className="text-shark-50">·</span>
    <a
      href="https://victorvaquero.com"
      target="_blank"
      rel="noreferrer"
      className="text-shark-300 hover:text-sky-400 transition-colors"
    >
      victorvaquero.com
    </a>
  </footer>
);
