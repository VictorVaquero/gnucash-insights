import {Status} from "@/services/entities";
import {BarLoader} from "react-spinners";
import {PropsWithChildren} from "react";

export const StateHandler = (props : PropsWithChildren<{dependencies: {status: Status, error: unknown}[]}>) => {
    if (props.dependencies.some((s) => (s.status === 'loading'))) {
        return <div className='w-full h-full flex flex-row items-center justify-center'>
            <BarLoader color='#36d7b7'/>
        </div>
    } if (props.dependencies.some((s) => s.status === 'error')) {
        return <div className='w-full h-full text-white flex flex-col items-center justify-center gap-y-4'>
            <h1 className='text-4xl'>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            <p>
                <i>{props.dependencies.filter((d)=>Boolean(d.error)).map((d)=>d.error).join(', ')}</i>
            </p>
        </div>
    }
    // if (showEmpty) {
    //     // return <div class={style.exceptionContainer}>
    //     {/* <Empty message='No data available' /> */ }
    //     return <div></div>
    //     // </div>;
    // }
    return props.children;
}
