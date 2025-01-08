import { Link } from "@tanstack/react-router";

export default function NotFoundPage() {
    return (
        <div className='text-white flex flex-col items-center pt-40 gap-y-4'>
            <h1 className='text-4xl'>Oops!</h1>
            <p>Not found!</p>
            <Link to="/">Go home</Link>
        </div>
    );
}