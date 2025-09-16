#!/usr/bin/env python3
"""
Direct Cloudflare R2 S3 API smoke test using boto3.
Tries both addressing styles (path and virtual) to avoid signature issues.
"""

import os
import sys
from datetime import datetime

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def make_client(addressing_style: str, region: str = "auto"):
    return boto3.client(
        "s3",
        endpoint_url=os.environ["CLOUDFLARE_R2_ENDPOINT"],
        aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY"],
        aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_KEY"],
        region_name=region,
        config=Config(signature_version="s3v4", s3={"addressing_style": addressing_style}),
    )


def run_flow(addressing_style: str, region: str) -> bool:
    print(f"\n=== Addressing style: {addressing_style} | region: {region} ===")
    client = make_client(addressing_style, region)
    bucket = os.environ["CLOUDFLARE_R2_BUCKET"]
    key = f"r2-smoke/test-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.txt"
    body = b"hello-r2"

    # List (non-fatal if empty)
    try:
        resp = client.list_objects_v2(Bucket=bucket, Prefix="r2-smoke/", MaxKeys=1)
        print("ListObjectsV2 OK:", {k: resp.get(k) for k in ("KeyCount", "IsTruncated")})
    except Exception as e:
        print("ListObjectsV2 error:", e)

    # Put
    try:
        client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="text/plain")
        print("PutObject OK:", key)
    except Exception as e:
        print("PutObject error:", e)
        return False

    # Get
    try:
        obj = client.get_object(Bucket=bucket, Key=key)
        data = obj["Body"].read()
        print("GetObject OK, len:", len(data))
        if data != body:
            print("Content mismatch!")
            return False
    except Exception as e:
        print("GetObject error:", e)
        return False

    # Delete
    try:
        client.delete_object(Bucket=bucket, Key=key)
        print("DeleteObject OK")
        return True
    except Exception as e:
        print("DeleteObject error:", e)
        return False


def main():
    required = [
        "CLOUDFLARE_R2_ENDPOINT",
        "CLOUDFLARE_R2_ACCESS_KEY",
        "CLOUDFLARE_R2_SECRET_KEY",
        "CLOUDFLARE_R2_BUCKET",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print("Missing env:", missing)
        sys.exit(2)

    overall = False
    for region in ("auto", "us-east-1"):
        for style in ("virtual", "path"):
            try:
                ok = run_flow(style, region)
            except ClientError as e:
                print(f"Flow error [{style}|{region}]", e)
                ok = False
            except Exception as e:
                print(f"Unhandled error [{style}|{region}]", e)
                ok = False
            overall = overall or ok

    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
