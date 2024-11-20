import {useQuery} from "react-query";
import {
  ListObjectsCommand,
  S3Client,
  _Object,
} from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

import config from "../config.json";
import { getIdToken, refreshToken } from "@/services/authService";
import { Status } from "./entities";

async function fetchObjectList(prefix: string): Promise<_Object[]> {
    console.log("START - Feching s3 ", prefix);
    const client = new S3Client({
      region: config.region,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: config.region},
        identityPoolId: config.identityPoolId,
        logins: {
          [config.cognitoUrl]: getIdToken() 
        },
      }),
    });
    const command = new ListObjectsCommand({ Bucket: config.bucketName, Prefix: prefix });
    let retry = 0;
    let data; 
    while(!data && retry <= 3) {
      data = await client.send(command).then(({ Contents }) => (Contents || [])).catch(()=>{
        refreshToken();
        retry++
      });
    }
    if(!data) throw new Error('Error with the s3 fetching')
    return data;
}

export function useObjectList(prefix: string, enabled: boolean = true): {status: Status, data: void|_Object[] | undefined, error: Error | unknown} {
    const { status, data, error } = useQuery([prefix], () => fetchObjectList(prefix), {enabled: enabled});
    return { status: status, data: data, error: error }
}