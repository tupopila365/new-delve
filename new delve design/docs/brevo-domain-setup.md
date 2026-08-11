# Brevo domain authentication for Delve

Brevo is Delve’s **transactional email delivery** service only. It is not an authentication provider.

This guide explains how to authenticate the Delve sending domain so verification emails pass SPF, DKIM, and (recommended) DMARC checks. **All DNS and Brevo dashboard steps are manual.** Do not invent SPF or DKIM values — copy only what Brevo generates for your domain.

## Before you start

- You need access to the **Brevo** account that holds `BREVO_API_KEY`.
- You need access to the **DNS provider** for the Delve sending domain (for example the registrar or DNS host that serves `delveworldwide.me`). This document does **not** assume which provider you use.
- Decide the sending address (for example `noreply@your-domain`). Set `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME` in Backend V2 only — never in `VITE_*` variables.

## Steps (manual)

### 1. Add the Delve sending domain in Brevo

1. Sign in to the Brevo dashboard.
2. Open **Senders, domains & dedicated IPs** (or equivalent **Domains** settings).
3. Add the domain you will send from (the part after `@` in `BREVO_SENDER_EMAIL`).

### 2. Open Brevo’s domain-authentication instructions

1. Select the domain you just added.
2. Open Brevo’s **Authenticate this domain** / DNS setup panel.
3. Leave that panel open — the next steps use Brevo’s generated records only.

### 3. Copy the exact SPF and DKIM records Brevo shows

1. Copy each **TXT** (and any CNAME) record Brevo lists for **SPF** and **DKIM**.
2. Copy host/name and value **exactly** as shown (including trailing dots if Brevo includes them).
3. Do **not** invent or guess record values from this document or from memory.

### 4. Add those exact records in your DNS provider

1. Sign in to whatever DNS dashboard controls the sending domain.
2. Create each record Brevo listed (type, host/name, value/TTL as shown).
3. Save changes.

#### Avoid conflicting duplicate SPF records

- A domain should typically have **one** SPF TXT record on the apex (or the host Brevo specifies).
- If an SPF TXT already exists, **merge** Brevo’s `include:` mechanism into that existing policy instead of adding a second SPF TXT.
- Multiple SPF TXT records on the same host often cause authentication failures.
- Do not remove third-party includes you still need (for example Google Workspace) unless you intend to stop using them.

### 5. Wait for DNS propagation

1. Wait until the new records resolve publicly (often minutes, sometimes up to 24–48 hours).
2. You can check with your DNS provider’s tools or a public DNS lookup for the hostnames Brevo gave you.
3. Do not mark the domain verified in Brevo until lookups show the expected records.

### 6. Return to Brevo and verify the domain

1. In Brevo’s domain panel, run **Verify** / **Authenticate**.
2. Confirm Brevo reports SPF and DKIM as authenticated for the Delve sending domain.
3. Fix any failed checks by correcting DNS to match Brevo’s instructions, then re-verify.

### 7. Send a test verification email

1. Ensure Backend V2 has `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` set (staging/production).
2. Register a test traveler account (or call resend-verification) so Delve sends a branded verification email through Brevo.
3. Confirm the message arrives and the **Verify my email** link works once.

### 8. Check SPF, DKIM, and DMARC results

1. Open the received message’s raw headers (or use Brevo’s delivery / authentication reports).
2. Confirm **SPF** and **DKIM** pass for the Delve sending domain.
3. Review **DMARC** results if a DMARC policy already exists for the domain.

## DMARC recommendation (do not invent a final policy here)

Adding a DMARC TXT record (usually at `_dmarc.your-domain`) is recommended once SPF and DKIM pass. The correct policy (`none` / `quarantine` / `reject`), rua/ruf addresses, and alignment mode depend on **your current domain mail setup** (other senders, Google Workspace, etc.).

- Inspect any existing `_dmarc` record before changing it.
- Prefer starting with a monitoring policy (`p=none`) if you are unsure, then tighten after reviewing reports.
- Do **not** apply a strict `reject` policy until you know all legitimate senders are aligned.

## Delve application checklist

| Variable | Where | Notes |
|----------|--------|--------|
| `BREVO_API_KEY` | Backend V2 only | Never commit; never put in `VITE_*` |
| `BREVO_SENDER_EMAIL` | Backend V2 only | Must use the authenticated domain |
| `BREVO_SENDER_NAME` | Backend V2 only | e.g. `Delve Worldwide` |
| `TRAVELER_WEB_URL` | Backend V2 | HTTPS required in staging/production |

DNS records are **not** managed by the Delve monorepo. Complete steps 1–8 in Brevo and your DNS dashboard before treating production verification email as complete.
