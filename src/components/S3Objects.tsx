import { useObjectList } from "@/services/s3Service";

function S3Objects() {
  
  const {data: objects, status} = useObjectList('gnucash/processed/')

  return (
    status !== "success" ? <></> :
    <div>
      {objects!.map((o) => (
        <div key={o.ETag}>{o.Key}</div>
      ))}
    </div>
  );
}

export default S3Objects;