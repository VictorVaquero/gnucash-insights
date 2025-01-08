import {
  GetObjectCommand,
  ListObjectsCommand,
  S3Client,
  _Object,
} from "@aws-sdk/client-s3";

import config from "../config.json";
import { getCredentials } from "@/services/authService";


export async function fetchObjectList(prefix: string, delimiter?: string): Promise<_Object[]> {
  console.debug("START - Feching s3 object list ", prefix, delimiter);
  //while (true) {
    try {
      const client = new S3Client({ region: config.region, credentials: getCredentials() });
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



export async function fetchObject(object: string): Promise<boolean> {
  console.log("START - Feching s3 file: ", object);
    try {
      const client = new S3Client({ region: config.region, credentials: getCredentials() });
      const command = new GetObjectCommand({ Bucket: config.bucketName, Key: object, ResponseCacheControl: 'no-cache'});
      const response = await client.send(command)
      if(typeof response.Body !== 'undefined'){
        const db = await response.Body!.transformToByteArray()
        const opfsRoot = await navigator.storage.getDirectory();
        const fileHandle = await opfsRoot.getFileHandle('cash.db', {create: true});
        const writable = await fileHandle.createWritable();
        await writable.write(db);
        await writable.close();
        console.debug('S3 db wrote to cash.db')
        return true 
      }
      return false
    }
    catch (error) {
      console.error('Coudnt fetch s3 data', error);
      throw error;
    }
}