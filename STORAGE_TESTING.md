# Storage Connectivity Testing (B2 + R2)

This doc shows how to run the included Python scripts to verify upload, download, list, and delete for Backblaze B2 and Cloudflare R2.

## 1) Provide credentials via environment

In Docker the app reads environment variables; for local runs you can export them in PowerShell before executing tests.

Replace placeholders with your values.

```powershell
# Backblaze B2
$env:BACKBLAZE_B2_ACCESS_KEY = "<b2_key_id>"
$env:BACKBLAZE_B2_SECRET_KEY = "<b2_app_key>"
$env:BACKBLAZE_B2_BUCKET    = "securesyntax"

# Cloudflare R2 (from R2 API Token page)
$env:CLOUDFLARE_R2_ACCESS_KEY = "<access_key_id>"      # 32 hex chars
$env:CLOUDFLARE_R2_SECRET_KEY = "<secret_access_key>"  # 64 hex chars (SHA-256 of token)
$env:CLOUDFLARE_R2_BUCKET     = "securesyntax"         # your bucket
$env:CLOUDFLARE_R2_ENDPOINT   = "https://<account_id>.r2.cloudflarestorage.com"  # from dashboard
```

Tip: From your screenshots, the S3 API endpoint format is like:

- Endpoint: `https://b7900eeee7c415345d86ea859c9dad47.r2.cloudflarestorage.com`
- Bucket: `securesyntax`
- Access Key ID and Secret Access Key: from the created API token (not the UI token value).

## 2) Run tests

From the `backend` folder inside the container or host Python environment:

```powershell
python run_storage_connectivity_tests.py
```

Or individual tests:

```powershell
python test_b2_connection.py
python test_r2_connectivity.py
```

These will:
- Create a small temp file
- Upload to the right structured path
- List bucket contents
- Download and validate content
- Delete the uploaded object

## 3) Troubleshooting R2

- Use `backend/verify_r2_credentials.py` to validate formats quickly:

```powershell
python verify_r2_credentials.py
```

- Use `backend/debug_r2.py` to try different endpoint/region permutations and print detailed errors.

## Notes

- We use `boto3` S3 client with R2 and B2. For R2 we set `signature_version=s3v4` and path-style addressing.
- If you see a 403/SignatureDoesNotMatch on R2, double‑check: endpoint account_id, access key id, and that secret key is the 64‑char hex from the API token screen (not the copy-to-clipboard token value).
