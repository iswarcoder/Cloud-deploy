# Cloud Deploy x

Cloud Deploy x is a premium vanilla frontend with a Node.js API boundary. The frontend starts with an empty workspace and clearly labels local/demo-only telemetry. The backend supports explicit in-memory development storage and an AWS DynamoDB/S3 integration boundary.

## Structure

```text
Deploy.x/
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── projects.html
│   ├── deployments.html
│   ├── logs.html
│   ├── infrastructure.html
│   ├── security.html
│   ├── cost-management.html
│   ├── settings.html
│   ├── login.html
│   ├── user.html
│   ├── css/style.css
│   ├── js/app.js
│   ├── js/api.js
│   ├── js/auth.js
│   └── assets/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   └── src/
├── infra/
├── .github/workflows/
└── README.md
```

The root `index.html` is a compatibility redirect to the public landing page at `frontend/index.html`.

## Run the frontend

From the project root, start both the backend and frontend together:

```powershell
npm install
npm run dev
```

This runs:

- Frontend: `http://127.0.0.1:5500/frontend/index.html`
- Backend: `http://127.0.0.1:3000`

The frontend API client uses `http://127.0.0.1:3000` by default. The backend allows the frontend origin by default for local development. You can override the API URL by defining `window.CLOUD_DEPLOY_API_URL` before loading `frontend/js/api.js`.

To stop both processes, press `Ctrl+C` in the terminal running `npm run dev`.

The frontend uses CDN-hosted Lucide and Chart.js assets. Demo preferences, projects, and deployment history use browser localStorage. No passwords, AWS credentials, GitHub tokens, or other secrets are stored.

The frontend API defaults to `http://127.0.0.1:3000`. The browser stores only short-lived access/session data in `sessionStorage`; it never stores passwords, AWS credentials, or client secrets.

## Backend and infrastructure

The `backend/` folder contains Express project, deployment, and protected private-file APIs, request validation, centralized error handling, automated Supertest coverage, and AWS SDK v3 adapters. Install dependencies and run the local empty in-memory API with:

```powershell
cd backend
npm install
npm test
npm start
```

The combined root command installs root orchestration dependencies and starts the existing backend without requiring a root `.env` file. For authenticated Cognito API requests, configure `backend/.env` with real values from `backend/.env.example`; do not commit that file.

`STORAGE_MODE=memory` is an explicit, empty local development store. To use the existing DynamoDB table, set `STORAGE_MODE=aws`, `DYNAMODB_REGION=ap-south-1`, and `DYNAMODB_TABLE=CloudDeployData`. The adapter uses the table's actual composite key: `StudentId` is the authenticated Cognito subject and `studentname` is a namespaced record key (`PROFILE`, `PROJECT#<id>`, or `DEPLOYMENT#<id>`). No AWS table or IAM permissions are created by this project. Use IAM roles or IAM Identity Center credentials rather than source credentials.

Verify the configured table without writing data by calling `GET http://127.0.0.1:3000/api/health/dynamodb` while the backend is running. A successful response reports the table status and key schema. The existing profile, project, and deployment services use the adapter only when `STORAGE_MODE=aws`; local tests remain isolated in memory.

## Private S3 file storage

Set `S3_REGION=ap-south-1` and `S3_BUCKET=cloud-deploy-files-72195591065` in `backend/.env`. The backend uses the AWS SDK credential provider chain and never sends AWS credentials to the browser. Files are private and stored under `users/<verified-cognito-sub>/`; the browser cannot choose the owner prefix.

Protected endpoints:

- `GET /api/files` lists the authenticated user's files.
- `POST /api/files` accepts one `multipart/form-data` field named `file`.
- `GET /api/files/download?key=<key>` streams an authenticated user's file.
- `DELETE /api/files?key=<key>` deletes an authenticated user's file.

Allowed uploads are PDF, GIF, JPEG, PNG, SVG, plain text, JSON, and ZIP files up to 10 MB. The current DynamoDB schema is unchanged and file metadata is kept in S3 object metadata/list results rather than forced into the existing `StudentId`/`studentname` table.

The IAM identity used by the backend needs `s3:ListBucket` on `arn:aws:s3:::cloud-deploy-files-72195591065` with a `s3:prefix` condition, plus `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::cloud-deploy-files-72195591065/users/*`. `HeadObject` is authorized by `s3:GetObject`; there is no separate `s3:HeadObject` IAM action. Keep the bucket's Block Public Access settings enabled and do not add public-read ACLs.

## CloudWatch Logs

The Logs & monitoring page reads real events through protected `/api/monitoring/*` endpoints. Configure `AWS_REGION=us-east-1`, `CLOUDWATCH_REGION=us-east-1`, and `CLOUDWATCH_LOG_GROUP=/cloud-deploy/backend` in `backend/.env`. CloudWatch defaults safely to `us-east-1` and never inherits the storage region. Keep `DYNAMODB_REGION=ap-south-1` and `S3_REGION=ap-south-1` for the existing resources; each AWS client uses its service-specific region variable and safe resource-region default. Set `DYNAMODB_TABLE=CloudDeployData` and `S3_BUCKET=cloud-deploy-files-72195591065`. Supported ranges are `1h`, `24h`, and `7d`; the backend caps queries at 500 events and never accepts arbitrary log-group names from the browser. The backend identity needs `logs:FilterLogEvents` on `arn:aws:logs:us-east-1:721955910650:log-group:/cloud-deploy/backend`. `logs:DescribeLogGroups` is used only by the optional `/api/logs/groups` metadata endpoint; grant it only if that endpoint is required, scoped to the group wherever supported (otherwise to `*` for that listing action). The backend reports missing startup configuration and AWS permission errors safely instead of showing demo data. Monitoring deployment records remain scoped to the authenticated Cognito subject through the existing DynamoDB/memory deployment services.

Run mocked backend/API tests with `npm --prefix backend test`. To test the real AWS SDK credential chain and perform a live read against the configured log group, run `npm --prefix backend run test:cloudwatch:live`; this separate check reports only region, group, event count, and safe error details. Verify the active CLI identity with `aws sts get-caller-identity`, then restart both local servers with `npm run dev`.

## Editing a profile

Open `http://127.0.0.1:5500/frontend/user.html` after signing in through Cognito. Select **Edit profile**, change the required full name and optional phone number or other fields, then select **Save changes**. The protected `GET /api/profile` and `PATCH /api/profile` endpoints use the verified Cognito subject as `StudentId` and the fixed `PROFILE` value as `studentname`; updates replace that one item rather than creating duplicates. Set `STORAGE_MODE=aws` to use the real `CloudDeployData` table. The backend identity needs `dynamodb:GetItem` and `dynamodb:PutItem` on that table (and `dynamodb:DescribeTable` only for the diagnostic health endpoint).

## Cognito local configuration

The application uses this confirmed public browser configuration:

- Hosted UI: `https://ap-south-1lebi4nhbh.auth.ap-south-1.amazoncognito.com`
- Callback URL: `http://127.0.0.1:5500/frontend/login.html`
- Logout URL: `http://127.0.0.1:5500/frontend/index.html`

In the Cognito User Pool app client, add the callback URL under **Allowed callback URLs** and the logout URL under **Allowed sign-out URLs**. Enable the authorization-code grant with PKCE, ensure the app client has no client secret, and allow scopes `openid` and `email`. The callback and logout URLs must match exactly, including host, port, path, and trailing slash behavior. Cognito managed login must be tested from the running app before treating authentication as operational.

Always open the login page through the HTTP server at `http://127.0.0.1:5500/frontend/login.html`; do not open the HTML file directly with a `file:///` URL. PKCE verifier and OAuth state are stored in `sessionStorage`, which is isolated by origin. Starting from `file://` and returning to `http://127.0.0.1:5500` causes the verifier/state to be unavailable and authentication is correctly rejected.

The `infra/` folder contains reviewed Terraform starting points. It does not provision resources or include state configuration. Never commit `.env` files, credentials, Terraform state, or token values.

Deployment creation through the backend records a `queued` request only. It does not execute shell commands, provision AWS resources, or claim deployment success. Live deployment workers, authentication, S3 artifact uploads, and GitHub integrations remain pending.

## CI with AWS CodeBuild

The root `buildspec.yml` is a CI-only build for AWS CodeBuild using Node.js 22. It installs the root and backend dependencies from their checked-in npm lockfiles, runs `npm run test:backend`, and checks JavaScript syntax under `frontend/js`, `backend/src`, `backend/scripts`, and `backend/tests`. A failed install, test, or syntax check fails the build.

This project has no frontend bundler or compiled `dist/` output. The CodeBuild artifact is therefore the real deployable source bundle: the static frontend, backend source and Docker context, lockfile, and safe `.env.example`. The spec does not build or push a container image, deploy the application, or provision AWS resources. To add an ECR image build later, configure a separate reviewed build/deploy stage and enable privileged mode on that CodeBuild project for Docker-in-Docker; use an ECR-scoped role and never add AWS keys to the repository.

The GitHub repository must contain a `main` branch with this buildspec before CodePipeline can use it as a source. Configure the CodePipeline GitHub source through an AWS CodeConnections connection in `ap-south-1`; complete its GitHub authorization flow in AWS, not by storing a token in this repository. The pipeline requires its own artifact bucket and service role. Create neither until the source branch exists and the required IAM roles and region have been reviewed.
