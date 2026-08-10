import { Link } from "@tanstack/react-router";

export const NotFoundPage = () => {
  return (
    <div className="text-foreground flex flex-col items-center pt-40 gap-y-4">
      <h1 className="text-4xl">Oops!</h1>
      <p>Not found!</p>
      <Link
        to="/"
        aria-label="Home"
        className="p-4 rounded bg-shark-800 hover:bg-shark-600 text-white"
      >
        Go home
      </Link>
    </div>
  );
};
