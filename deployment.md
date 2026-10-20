# TechPhone Store deployment guide

Render is the canonical production target for this repository. The frontend is a
Render Static Site, the backend is a Render Web Service with a persistent disk,
and MongoDB Atlas provides the database. Serverless backend deployments are not
supported because the current upload API writes files to local storage.

The domains below are placeholders. Replace them everywhere with the actual
Render custom domains (or the assigned `*.onrender.com` URLs):

- storefront: `https://shop.techphone.example`
- API origin: `https://api.techphone.example`
- API base: `https://api.techphone.example/api`

## Local Docker deployment

Create a root `.env` containing strong, local-only JWT secrets, then run:

```bash
docker compose up -d
```

Services are available at:

- frontend: `http://localhost:3000`
- backend API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api/docs`
- MongoDB: `mongodb://localhost:27017/techphone_store?replicaSet=rs0`

Docker Compose initializes a single-node replica set because checkout requires
MongoDB transactions. It stores uploads in the `backend_uploads` named volume at
`/app/uploads` inside the backend container.

## Render frontend Static Site

Create a Static Site with:

- root directory: `frontend`
- build command: `npm ci && npm run build`
- publish directory: `dist`

Set these build variables:

```env
VITE_USE_MOCK=false
VITE_API_URL=https://api.techphone.example/api
VITE_SITE_URL=https://shop.techphone.example
VITE_DEPLOYMENT_TARGET=render
```

Configure the SPA rewrite `/* -> /index.html` and attach the storefront custom
domain before the final build. `VITE_SITE_URL` is compiled into canonical tags,
`robots.txt`, and `sitemap.xml` during the Vite build; production builds fail if
it is missing, is not an HTTP(S) origin, or points to loopback on Render. The
allowlisted frontend targets are `local` (development server only),
`local-preview` (explicit localhost preview build), `docker` (local container
build), and `render`. These checks apply to every `vite build` command, including
custom modes such as `--mode staging`; the mode selects the matching `.env` file
but does not weaken build validation or metadata generation.

## Render backend Web Service

Create a Web Service with:

- root directory: `backend`
- build command: `npm ci`
- start command: `npm start`
- health check path: `/api/health`

Provision a persistent disk and mount it at `/app/uploads`. Set:

```env
NODE_ENV=production
DEPLOYMENT_TARGET=render
PORT=5000
MONGO_URI=mongodb+srv://<atlas-user>:<atlas-password>@<cluster>/techphone_store
JWT_ACCESS_SECRET=<unique-random-value-at-least-32-characters>
JWT_REFRESH_SECRET=<different-random-value-at-least-32-characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://shop.techphone.example
PUBLIC_SITE_URL=https://shop.techphone.example
API_PUBLIC_URL=https://api.techphone.example
UPLOAD_DIR=/app/uploads
```

All three public URL variables are required absolute HTTP(S) URLs in production.
They must be origins without credentials, paths, queries, or fragments, and
Render rejects loopback hosts. Trailing slashes are normalized. Swagger advertises
`https://api.techphone.example/api`, sitemap entries use the storefront origin,
and uploaded file URLs use the API origin.

Backend `DEPLOYMENT_TARGET` values are `local`, `docker`, `render`, `vercel`,
`netlify`, `serverless`, and `aws-lambda`. Production supports `render` and the
local `docker` stack. Serverless values are recognized but fail startup because
the current upload routes require durable local storage; unknown values also fail.
Actual `VERCEL`, `NETLIFY`, and `AWS_LAMBDA_FUNCTION_NAME` platform markers take
precedence over `DEPLOYMENT_TARGET`, so an explicit Render/Docker value cannot
hide a serverless runtime.

VNPay remains disabled when either merchant credential is empty. To enable it,
set the provider values and an absolute callback URL:

```env
VNPAY_TMN_CODE=<sandbox-merchant-code>
VNPAY_HASH_SECRET=<sandbox-hash-secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://api.techphone.example/api/payments/vnpay/return
VNPAY_VERSION=2.1.0
```

Configure the VNPay IPN URL as
`https://api.techphone.example/api/payments/vnpay/ipn`. Do not commit merchant,
JWT, database, SMTP, or SMS credentials.

## Database and release checks

Use an Atlas replica set/sharded cluster; transactions are required for checkout.
If demo data is needed, set a temporary `SEED_DEMO_PASSWORD` of at least 12
characters in the Render shell, run `npm run seed`, and remove it afterward.

Before release:

```bash
cd backend && npm test
cd ../frontend && npm run lint && npm run test:run && npm run build
```

Then verify `/api/health`, `/api/docs`, checkout, auth, and uploads. Confirm an
uploaded image still exists after a backend redeploy and that `robots.txt`,
`sitemap.xml`, `index.html`, Swagger servers, and browser network requests contain
no `localhost` production URL.
