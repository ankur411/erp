import boto3
from botocore.config import Config
from typing import Optional
from app.config import settings

def get_s3_client():
    """
    Initialize and return a boto3 client configured for Cloudflare R2.
    """
    endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4")
    )

def generate_presigned_upload_url(
    file_key: str,
    content_type: Optional[str] = None,
    expiration: int = 3600
) -> str:
    """
    Generate a presigned PUT URL to allow direct file upload to Cloudflare R2 from the client.
    """
    s3_client = get_s3_client()
    params = {
        "Bucket": settings.R2_BUCKET_NAME,
        "Key": file_key,
    }
    if content_type:
        params["ContentType"] = content_type

    return s3_client.generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=expiration
    )

def generate_presigned_download_url(
    file_key: str,
    expiration: int = 3600
) -> str:
    """
    Generate a presigned GET URL for downloading files securely from Cloudflare R2.
    """
    s3_client = get_s3_client()
    return s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": file_key
        },
        ExpiresIn=expiration
    )
