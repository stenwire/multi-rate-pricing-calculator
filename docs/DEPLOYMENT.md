# Deployment

Client to Firebase Hosting, API to Google Cloud Run, database on MongoDB Atlas.

These files sit outside the spec §3 tree for the same reason the trackers do — they are
build-process artifacts, not part of the delivered application.

---

## What "free tier" actually means here

| Piece             | Plan             | Billing account required? | Limits that matter                             |
| ----------------- | ---------------- | ------------------------- | ---------------------------------------------- |
| Firebase Hosting  | Spark            | No                        | 10 GB stored, 360 MB/day transfer              |
| Cloud Run         | Always-free tier | **Yes**                   | 2M requests, 180k vCPU-s, 360k GiB-s per month |
| Cloud Build       | Free tier        | Yes (same account)        | 2,500 build-minutes/month                      |
| Artifact Registry | Free tier        | Yes (same account)        | 0.5 GB storage, then $0.10/GB/month            |
| MongoDB Atlas     | M0               | No                        | 512 MB, shared CPU                             |

Cloud Run has no billing-free mode: you must attach a billing account to the project even
though the usage below stays inside the always-free allowance. Set a budget alert (step 7)
so an accident cannot run silently.

---

## Prerequisites

```powershell
# Google Cloud CLI — https://cloud.google.com/sdk/docs/install
gcloud --version

# Firebase CLI
npm install -g firebase-tools
firebase --version
```

Docker is **not** required — Cloud Build builds the image remotely from
`server/Dockerfile`.

---

## 1. MongoDB Atlas

1. Create a free account at [https://cloud.mongodb.com](https://cloud.mongodb.com), then a new project.
2. **Build a Database → M0 (Free)**. Pick a region near your Cloud Run region
   (`us-central1` pairs with Iowa / `us-east-1`).
3. **Database Access → Add New Database User**. Username + a generated password. Role:
   _Read and write to any database_. Save the password.
4. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)**.

   Cloud Run's outbound IPs are dynamic, so there is no narrower range to allow. The
   database credentials become the only gate. The alternative — a static egress IP via a
   VPC connector and Cloud NAT — is not free.

5. **Connect → Drivers** and copy the connection string. Insert the password and add the
   database name before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/pricing-calculator?retryWrites=true&w=majority
   ```

---

## 2. Google Cloud project

Pick a globally unique project ID. It also determines your Firebase Hosting URL
(`https://PROJECT_ID.web.app`), and on the Spark plan that site cannot be renamed and no
second site can be added — multi-site hosting requires Blaze. So the ID you choose here is
the public URL you are stuck with. Do not reuse an auto-generated project (a
`gen-lang-client-…` from Google AI Studio, say) for anything a reviewer will see.

```powershell
gcloud auth login
gcloud projects create crossval-pricing --name="CrossVal Pricing Calculator"
gcloud config set project crossval-pricing
```

### Billing

The `gcloud services enable` below fails with `UREQ_PROJECT_BILLING_NOT_OPEN` until an open
billing account is linked. Newly created projects, and the auto-generated AI Studio
projects, have none.

```powershell
gcloud billing accounts list
gcloud billing projects link crossval-pricing --billing-account=XXXXXX-XXXXXX-XXXXXX
```

If `accounts list` is empty, create one at [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing). It
requires a card. A new billing account starts on the Free Trial — $300 of credit over 90
days, with no charge to the card during it; when the credit or the time runs out, resources
are paused rather than billed. The always-free Cloud Run allowance applies either way.

Confirm before continuing:

```powershell
gcloud billing projects describe crossval-pricing
# billingEnabled: true
```

Then enable the APIs:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

---

## 3. Secrets

The Mongo URI carries the database password, so both it and the JWT secret go into Secret
Manager rather than plain environment variables.

```powershell
# Generate a 64-character JWT secret (the schema requires at least 32)
$jwt = -join ((1..64) | ForEach-Object { '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[(Get-Random -Maximum 62)] })
$jwt | Out-File -FilePath jwt.txt -Encoding ascii -NoNewline
gcloud secrets create jwt-secret --data-file=jwt.txt
Remove-Item jwt.txt

# Mongo URI — paste your real connection string
'mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/pricing-calculator?retryWrites=true&w=majority' | Out-File -FilePath mongo.txt -Encoding ascii -NoNewline
gcloud secrets create mongodb-uri --data-file=mongo.txt
Remove-Item mongo.txt
```

Grant the Cloud Run runtime service account read access:

```powershell
$num = gcloud projects describe crossval-pricing --format="value(projectNumber)"
gcloud secrets add-iam-policy-binding jwt-secret --member="serviceAccount:$num-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mongodb-uri --member="serviceAccount:$num-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

---

## 4. Deploy the API to Cloud Run

`CLIENT_ORIGIN` is known in advance — Firebase Hosting serves the default site at
`https://PROJECT_ID.web.app`, so there is no circular dependency between the two deploys.
Confirm the Firebase site ID first though (`firebase projects:list`): when the project name
you asked for is already taken, Firebase appends a suffix, and the site follows the ID it
actually assigned rather than the one you typed.

Both `.web.app` and `.firebaseapp.com` are listed, because they are separate origins to the
browser and a reviewer may open either. `^|^` at the front of the flag tells gcloud to split
on `|` instead of `,`, so the comma inside the value stays part of it.

```powershell
gcloud run deploy crossval-api --source server --region us-central1 --allow-unauthenticated --min-instances=0 --max-instances=3 --memory=512Mi --cpu=1 --set-env-vars="^|^CLIENT_ORIGIN=https://crossval-pricing.web.app,https://crossval-pricing.firebaseapp.com" --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest"
```

The first run offers to create an Artifact Registry repository — accept. It takes 3–5
minutes. It prints a service URL like
`https://crossval-api-abc123-uc.a.run.app`. **Copy it.**

Cloud Run injects `PORT=8080`; `config/env.ts` already reads `PORT` from the environment,
so nothing needs changing. Verify:

```powershell
curl https://crossval-api-abc123-uc.a.run.app/api/v1/documents
# {"status":"error","message":"Authentication required.","error_code":"UNAUTHORIZED"}
```

Swagger UI is live at `https://crossval-api-abc123-uc.a.run.app/api-docs/` and is publicly
reachable. That is usually what you want for a take-home; if not, delete the
`setupSwagger(app)` call before deploying.

### Seeding the deployed database

The seed script reads the root `.env`, so run it locally against Atlas:

```powershell
# temporarily point the root .env MONGODB_URI at the Atlas string, then:
cd server; npm run seed
```

`npm run seed -- --force` wipes and reseeds. Put the local URI back afterwards.

---

## 5. Build the client against the deployed API

Edit [client/.env.production](../client/.env.production) and replace the placeholder with the
Cloud Run URL from step 4 — keeping the `/api/v1` suffix:

```
VITE_API_URL=https://crossval-api-abc123-uc.a.run.app/api/v1
```

Vite bakes this into the bundle at build time, so it must be set **before** the build, and
any change to it requires a rebuild.

```powershell
cd client; npm run build
```

---

## 6. Deploy the client to Firebase Hosting

```powershell
firebase login
firebase use --add          # select crossval-pricing, alias it "default"
firebase deploy --only hosting
```

[firebase.json](../firebase.json) is already configured: it serves `client/dist`, rewrites all
paths to `/index.html` so React Router's deep links survive a page refresh, and sets
long-lived caching on hashed assets while keeping `index.html` uncached.

`firebase use --add` writes `.firebaserc`; if the project does not appear in the list, add
Firebase to it first at [https://console.firebase.google.com](https://console.firebase.google.com) → _Add project_ → select the
existing Google Cloud project.

Open `https://crossval-pricing.web.app`, log in as the seeded user, and confirm a document
loads. A CORS error in the browser console means `CLIENT_ORIGIN` on Cloud Run does not
exactly match the origin you are browsing (no trailing slash, and `.web.app` and
`.firebaseapp.com` are different origins — see below).

---

## 7. Cost guardrails

```powershell
# Cap concurrent instances (already set above, but confirm)
gcloud run services describe crossval-api --region us-central1 --format="value(spec.template.metadata.annotations)"
```

- **Budget alert.** Console → _Billing → Budgets & alerts → Create budget_, $1/month with
  alerts at 50/90/100%. This notifies; it does not cap.
- **Old images.** Every deploy pushes a new image. Past 0.5 GB, Artifact Registry bills.
  Console → _Artifact Registry → cloud-run-source-deploy → Cleanup policies_, keep the 3
  most recent versions.
- **`--min-instances=0`** means the container scales to zero and you pay nothing while
  idle. The cost is a cold start of roughly 2–5 seconds on the first request after a quiet
  period, because `index.ts` connects to MongoDB before it listens.

---

## Redeploying

```powershell
# API only
gcloud run deploy crossval-api --source server --region us-central1

# Client only
cd client; npm run build; cd ..; firebase deploy --only hosting
```

Existing environment variables and secret bindings persist across `gcloud run deploy`; you
only repeat the flags when a value changes.

---

## Troubleshooting

**CORS errors after deploy.** `CLIENT_ORIGIN` must match the browser's origin exactly — no
trailing slash, and the scheme counts. It accepts a comma-separated list, which matters
because Firebase serves one site at two distinct origins, and because your Firebase project
ID may not be the one you picked (Firebase appends a suffix when the name is taken, so
`crossval-pricing` can land as `crossval-93f0b`). Confirm what the API actually allows with
a preflight rather than guessing:

```powershell
curl.exe -s -i -X OPTIONS "https://SERVICE-URL/api/v1/auth/login" -H "Origin: https://YOUR-SITE.web.app" -H "Access-Control-Request-Method: POST"
```

An `access-control-allow-origin` that differs from the `Origin` you sent — or is missing
entirely — is the bug. Fix it without a rebuild:

```powershell
gcloud run services update crossval-api --region us-central1 --update-env-vars="^|^CLIENT_ORIGIN=https://YOUR-SITE.web.app,https://YOUR-SITE.firebaseapp.com"
```

The `^|^` prefix changes the delimiter gcloud uses to split the flag, so the comma inside
the value is not read as a separator between two variables.

**Container failed to start.** Check `gcloud run services logs read crossval-api --region us-central1`.
Almost always either a secret the service account cannot read (step 3's IAM bindings) or an
Atlas connection refused (step 1's `0.0.0.0/0` rule).

**`Invalid environment configuration` in the logs.** The zod schema in
[server/src/config/env.ts](../server/src/config/env.ts) names the offending variable. Note
that `JWT_SECRET` must be at least 32 characters and `MONGODB_URI` must parse as a URL.

**`--allow-unauthenticated` rejected.** An organization policy
(`constraints/iam.allowedPolicyMemberDomains`) is blocking public access. Personal accounts
are unaffected; a work account may need an administrator.

**Deep links 404 on Firebase.** The SPA rewrite in `firebase.json` is missing or the deploy
picked up a stale `client/dist`. Rebuild, then redeploy.
