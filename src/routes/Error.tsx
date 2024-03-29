import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
    const error = useRouteError() as {statusText: string, message: string};
    console.error(error);

    return (
        <div className='text-white flex flex-col items-center pt-40 gap-y-4'>
            <h1 className='text-4xl'>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            <p>
                <i>{error.statusText || error.message}</i>
            </p>
        </div>
    );
}