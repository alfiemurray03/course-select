# Aptenvo learner file storage

Aptenvo supports manual learner entry without any additional Cloudflare binding.

Private CSV, XLS, XLSX and PDF uploads require a private Cloudflare R2 bucket.

## Cloudflare configuration

1. Create an R2 bucket named `aptenvo-learner-uploads`.
2. Do not enable a public development URL or custom public domain for the bucket.
3. In the Aptenvo Pages project, add an R2 bucket binding:
   - Variable name: `LEARNER_UPLOADS`
   - R2 bucket: `aptenvo-learner-uploads`
4. Redeploy the latest Aptenvo production deployment.

## Data flow

- The browser sends the selected file to the protected checkout Function together with the order details.
- The Function validates the extension, size and basic file signature.
- The file is written to the private R2 bucket under the Aptenvo order ID.
- D1 stores only the private object key, filename, content type, size, SHA-256 checksum and processing status.
- The Stripe webhook moves a paid upload to `awaiting_review`.
- Files attached to failed or expired checkout sessions are deleted from R2 where possible.

## Supported files

- CSV
- Microsoft Excel XLS
- Microsoft Excel XLSX
- PDF

Maximum file size: 10 MB.

Uploaded files must show the course title, legal first name, legal last name and enrolment email for every learner.
