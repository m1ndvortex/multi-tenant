#!/usr/bin/env python3
"""
Upload a persistent test file to R2 and print its key and a short-lived presigned GET URL.
Requires env vars: CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, CLOUDFLARE_R2_BUCKET
"""
import os
from datetime import datetime
import boto3
from botocore.config import Config


def main():
    endpoint = os.environ["CLOUDFLARE_R2_ENDPOINT"]
    bucket = os.environ["CLOUDFLARE_R2_BUCKET"]
    ak = os.environ["CLOUDFLARE_R2_ACCESS_KEY"]
    sk = os.environ["CLOUDFLARE_R2_SECRET_KEY"]

    # Use a fixed-ish path so you can find it later; include timestamp to avoid clashes
    key = f"manual-check/uploads/test-file-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.txt"
    body = (
        f"Hello from automated test at {datetime.utcnow().isoformat()}\n"
        "This object was created to verify R2 connectivity.\n"
    ).encode()

    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
        region_name="auto",
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )

    # Put object
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="text/plain")

    # Generate presigned GET URL (10 minutes)
    url = client.generate_presigned_url(
        "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=600
    )

    print("BUCKET:", bucket)
    print("KEY:", key)
    print("S3 URL:", f"s3://{bucket}/{key}")
    print("PRESIGNED_GET:", url)


if __name__ == "__main__":
    main()
