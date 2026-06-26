import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    ENV: str = "development"
    PROJECT_NAME: str = "SupplierERP API"
    ROOT_DOMAIN: str = "localhost"
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: str = ""
    
    # TiDB Connection Settings (MySQL Dialect)
    # E.g. mysql+aiomysql://user:password@host:port/dbname?ssl_ca=/path/to/ca.pem
    DATABASE_URL: str = "mysql+aiomysql://root@localhost:4000/supplier_erp"
    DATABASE_SYNC_URL: str = "mysql+pymysql://root@localhost:4000/supplier_erp"
    
    # Clerk Authentication
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_JWKS_URL: str = "https://api.clerk.com/v1/jwks"
    CLERK_AUDIENCE: str = "" # Set if verifying specific aud
    
    # Pusher Realtime
    PUSHER_APP_ID: str = ""
    PUSHER_KEY: str = ""
    PUSHER_SECRET: str = ""
    PUSHER_CLUSTER: str = "us2"
    
    # Resend Email
    RESEND_API_KEY: str = ""
    
    # Cloudflare R2 Storage (S3 compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "supplier-erp-documents"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Sentry & PostHog
    SENTRY_DSN: Optional[str] = None
    POSTHOG_API_KEY: Optional[str] = None
    POSTHOG_HOST: str = "https://us.i.posthog.com"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
