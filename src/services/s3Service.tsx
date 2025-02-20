import {
  GetObjectCommand,
  ListObjectsCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-providers";
import { queryOptions, skipToken } from "@tanstack/react-query";

import config from "../config.json";



export const fetchObjectList = async ({ prefix, delimiter, credentials }: { prefix: string, credentials: CognitoIdentityCredentialProvider, delimiter?: string }) => {
  console.debug("START - Feching s3 object list ", prefix, delimiter);
  //while (true) {
  try {
    const client = new S3Client({ region: config.region, credentials: credentials });
    const command = new ListObjectsCommand({ Bucket: config.bucketName, Prefix: prefix, Delimiter: delimiter });
    const data = await client.send(command)
    console.debug("END - Feching s3 object list ", prefix, delimiter, " with data: ", data.Contents || []);
    return data.Contents || [];
  }
  catch (error) {
    console.error('Coudnt fetch s3 data', error);
    throw error;
  }
  //}
}

export const fetchReadDb = async ({ object, credentials }: { object: string, credentials: CognitoIdentityCredentialProvider }) => {
  console.log("START - Feching s3 file: ", object);
  try {
    const client = new S3Client({ region: config.region, credentials: credentials });
    const command = new GetObjectCommand({ Bucket: config.bucketName, Key: object, ResponseCacheControl: 'no-cache' });
    const response = await client.send(command)
    if (typeof response.Body !== 'undefined') {
      return await response.Body.transformToByteArray()
    }
    throw Error('No body response')
  }
  catch (error) {
    console.error('Coudnt fetch s3 data', error);
    throw error;
  }
}

const retryPolicy = (failureCount: number, error: Error) => {
  if (error.name === 'NotAuthorizedException') {
    return false;
  }
  return failureCount <= 2;
}

export const awsReadDbOptions = ({ object, user, credentials, enabled }: { object: string, user: string|undefined, credentials?: CognitoIdentityCredentialProvider, enabled?: boolean }) => {
  const _enabled = enabled && !!user && !!credentials;
  const options = queryOptions({
    queryKey: ['fetchReadDb', user, object],
    queryFn: !_enabled ? skipToken : async () => fetchReadDb({ object, credentials }),
    enabled: _enabled,
    retry: retryPolicy
  });
  return options
}


export const awsObjectListOptions = ({ prefix, delimiter = '', user, credentials, enabled = true }: { prefix: string, delimiter?: string, user: string|undefined, credentials?: CognitoIdentityCredentialProvider, enabled?: boolean }) => {
  const _enabled = enabled && !!user && !!credentials;
  let queryKeys = ['fetchObjectList', user, prefix]
  if (delimiter && delimiter !== '') queryKeys = [...queryKeys, delimiter]

  return queryOptions({
    queryKey: queryKeys,
    queryFn: !_enabled ? skipToken : async () => fetchObjectList({ prefix, delimiter, credentials }),
    enabled: _enabled,
    retry: retryPolicy
  })
}

export const awsFolderOptions = ({ user, credentials, enabled }: { user: string | undefined, credentials?: CognitoIdentityCredentialProvider, enabled?: boolean }) => {
  const folderPath = user === 'guest' ? config.guestFolderPath : config.folderPath;
  const options = awsObjectListOptions({ prefix: folderPath, user, credentials: credentials, enabled})
  options.queryKey[0] = 'fetchFolders'
  return options
}
