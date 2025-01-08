import { fetchObject, fetchObjectList } from "@/services/s3Service";
import { UseQueryResult, useQuery } from "react-query";
import { _Object } from "@aws-sdk/client-s3";

export function useObjectList(prefix: string, delimiter?: string, enabled: boolean = true): UseQueryResult<_Object[]> {
    const queryKeys = delimiter && delimiter !== '' ? [prefix, delimiter] : [prefix];
    const response = useQuery<_Object[], Error>(
        queryKeys,
        () => fetchObjectList(prefix, delimiter),
        {
            enabled: enabled, staleTime: Infinity,
            retry: (failureCount, error) => {
                if (error.name === 'NotAuthorizedException') {
                    return false;
                }
                return failureCount <= 2;
            }
        });

    return response
}


export function useObject(object: string, enabled: boolean = true): UseQueryResult<boolean> {
    const response = useQuery<boolean, Error>(
        [object],
        () => fetchObject(object),
        {
            enabled: enabled, staleTime: Infinity,
            retry: (failureCount, error) => {
                if (error.name === 'NotAuthorizedException') {
                    return false;
                }
                return failureCount <= 2;
            }
        });
    return response
}


export const useFolders = () => { return useObjectList('gnucash/processed/') }