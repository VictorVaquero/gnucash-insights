export default function ErrorPage({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  console.error(error);

  return (
    <div className="text-white flex flex-col items-center pt-40 gap-y-4">
      <h1 className="text-4xl">Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.message}</i>
      </p>
      <button className="p-4 rounded bg-shark-800 hover:bg-shark-600" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}
