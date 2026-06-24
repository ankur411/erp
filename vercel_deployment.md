# Supplier ERP - Production Vercel & Backend Deployment Guide

This document provides step-by-step instructions for deploying the decoupled **Supplier ERP** application. The system consists of two primary services:
1. **Frontend**: Next.js App Router (to be deployed on Vercel).
2. **Backend**: FastAPI Python API (to be deployed on a container or serverless host like Railway, Render, or Fly.io).
3. **Database**: Managed MySQL/TiDB serverless (e.g. TiDB Cloud).

---

## 1. Prerequisites & API Credentials

Make sure you have active accounts and credentials ready for the following services:
- **GitHub**: To host the repository and trigger CD pipelines.
- **Clerk**: Authentication system.
- **TiDB Cloud / PlanetScale / AWS RDS**: Serverless MySQL-compatible database.
- **Pusher**: Real-time websocket broadcasting.
- **Resend**: Transactional email service.
- **Cloudflare R2 / AWS S3**: Object storage for document uploads.
- **Sentry / PostHog**: (Optional) Application monitoring and analytics.

---

## 2. Frontend Deployment on Vercel

Vercel is optimal for Next.js App Router deployments. It offers automatic build optimization, edge routing, and seamless integration with Clerk.

### Step-by-Step Setup
1. Log in to [Vercel](https://vercel.com/) and click **Add New** > **Project**.
2. Import your GitHub repository containing the **Supplier ERP** codebase.
3. In the project setup panel, configure the following settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend` (Click **Edit** and choose the `frontend` subdirectory).
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. Expand the **Environment Variables** section and add the required variables listed below.
5. Click **Deploy**. Vercel will build the frontend and provide a production domain (e.g., `https://supplier-erp.vercel.app`).

### Frontend Environment Variables
Set the following keys in your Vercel Dashboard:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk publishable key from your Clerk production dashboard. |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk private API key (never exposed to client). |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Path for authentication redirect. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Path for authentication redirect. |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | The URL of your deployed FastAPI backend. |
| `NEXT_PUBLIC_PUSHER_KEY` | `pusher_key_...` | Pusher instance publishable client key. |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `ap2` | Pusher cluster zone location. |
| `ENABLE_CLERK` | `true` | Enables active Clerk middleware checks. |

---

## 3. Backend Deployment (Railway or Render)

Since FastAPI is a persistent Python web application, it is best suited for hosting platforms like Railway, Render, or Fly.io that support Docker container runtimes.

### Step-by-Step Setup (Railway Example)
1. Log in to [Railway](https://railway.app/) and create a new project.
2. Select **Deploy from GitHub repository** and import the project.
3. In settings, change the **Root Directory** to `backend`.
4. Railway will automatically detect the `Dockerfile` in the root of the backend directory.
5. Set the required **Environment Variables** (see table below).
6. Deploy the service. Railway will build the Docker container and expose a public port mapping (e.g., `https://supplier-erp-production.up.railway.app`).

### Backend Environment Variables
Configure these variables in your backend service panel:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `mysql+pymysql://user:pass@tidb-host:4000/erp?ssl_verify_cert=true` | Production database connection string (use SSL). |
| `DATABASE_SYNC_URL` | `mysql+pymysql://user:pass@tidb-host:4000/erp?ssl_verify_cert=true` | Synchronization database pointer. |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk API secret for validating JWT authentication tokens. |
| `CLERK_JWKS_URL` | `https://api.clerk.com/v1/jwks` | JWKS endpoint for token validation caching. |
| `PUSHER_APP_ID` | `1827364` | Pusher App ID. |
| `PUSHER_KEY` | `pusher_key_...` | Pusher API Client Key. |
| `PUSHER_SECRET` | `pusher_secret_...` | Pusher secret token (keep private). |
| `PUSHER_CLUSTER` | `ap2` | Pusher cluster zone. |
| `RESEND_API_KEY` | `re_...` | Resend API key for outbound transaction notifications. |
| `R2_ACCESS_KEY_ID` | `cf_access_key_...` | Cloudflare R2 bucket access key. |
| `R2_SECRET_ACCESS_KEY` | `cf_secret_...` | Cloudflare R2 secret access token. |
| `R2_BUCKET_NAME` | `supplier-erp-documents` | Name of the bucket. |
| `REDIS_URL` | `redis://default:pass@redis-host:6379/0` | Deployed Redis instance for background jobs. |
| `ENVIRONMENT` | `production` | Enables production security configs (disables fallback mock credentials). |

---

## 4. Database Setup & Migrations

To bootstrap your database schema on the production database instance:
1. Ensure your local environment can connect to the remote TiDB/MySQL database.
2. Run database migrations from the `backend` directory using your configured command:
   ```bash
   cd backend
   # To migrate database schema using SQLAlchemy / Alembic
   python -m app.database.init_db
   ```
3. Verify that all tables (`tenants`, `suppliers`, `products`, `orders`, `invoices`, etc.) are successfully provisioned in the cloud database.

---

## 5. Domain & CORS Configuration

To ensure seamless frontend-backend communication:
1. **Custom Domain**: In Vercel, assign a custom domain (e.g., `yourdomain.com`).
2. **Backend API Subdomain**: In Railway or Render, map a subdomain (e.g., `api.yourdomain.com`).
3. **CORS Allowlist**: Ensure the backend allows requests from the frontend domain. Update `backend/app/main.py` middleware settings to accept your production URL.
4. **Clerk Webhooks**: If sync profiles are enabled, update the Clerk webhook endpoint URL to `https://api.yourdomain.com/api/v1/system/webhooks/clerk`.
