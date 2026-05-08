# ComplianceAI — Backend API Contract

> **For frontend team use.** Every `/api/*` endpoint, its exact request shape, response shape, and error codes.  
> Base URL (local): `http://localhost:3000` | Base URL (prod): `https://your-app.vercel.app`

---

## Authentication Note

All `/api/*` routes are **unauthenticated at the HTTP level** — the Supabase user session is managed client-side. The only route that requires a secret is `/api/cron-check` (called by Vercel Cron, not the frontend).

---

## POST `/api/ai/extract`

Extract structured license data from raw OCR text using Gemini AI.

### Request

```json
{
  "ocrText": "FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA\nLicense No: 10023456789\nName of FBO: Spice Garden Restaurant..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `ocrText` | string | ✅ | Min 10 chars. Pass raw Tesseract output. |

### Response — Success `200`

```json
{
  "data": {
    "license_type": "FSSAI",
    "license_number": "10023456789",
    "issuing_authority": "Food Safety and Standards Authority of India",
    "business_name": "Spice Garden Restaurant",
    "holder_name": "Rajesh Kumar",
    "issue_date": "2024-01-15",
    "expiry_date": "2025-01-14",
    "address": "12, Indiranagar 100 Feet Road, Bengaluru",
    "confidence": 92
  },
  "confidence": 92,
  "error": null
}
```

### Response — AI Parse Failure `200`

```json
{
  "data": null,
  "confidence": 0,
  "error": "AI returned invalid JSON — please fill fields manually",
  "raw": "..."
}
```

### Response — Server Error `500`

```json
{
  "data": null,
  "confidence": 0,
  "error": "AI service unavailable — please enter details manually"
}
```

### Frontend Usage Pattern

```js
// After Tesseract OCR completes:
const { data, confidence, error } = await extractLicenseFromText(ocrText)
if (error) showManualForm()
else prefillFormWith(data)
```

---

## POST `/api/ai/prefill`

Generate a pre-filled renewal form for any license type using Gemini AI.

### Request

```json
{
  "businessProfile": {
    "business_name": "Spice Garden Restaurant",
    "business_type": "Restaurant",
    "owner_name": "Rajesh Kumar",
    "phone": "+91 98765 43210",
    "email": "rajesh@spicegarden.in",
    "address": "12, Indiranagar 100 Feet Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "gstin": "29AABCS1429B1Z1"
  },
  "licenseType": "FSSAI"
}
```

| Field | Type | Required |
|---|---|---|
| `businessProfile` | object | ✅ |
| `licenseType` | string | ✅ — one of the 8 supported IDs |

### Response — Success `200`

```json
{
  "formFields": [
    { "fieldName": "Name of Food Business Operator", "fieldValue": "Spice Garden Restaurant", "editable": false },
    { "fieldName": "Proprietor Name", "fieldValue": "Rajesh Kumar", "editable": true },
    { "fieldName": "Business Category", "fieldValue": "Restaurant/Hotel", "editable": true },
    { "fieldName": "Premises Address", "fieldValue": "12, Indiranagar 100 Feet Road, Bengaluru", "editable": true }
  ],
  "documentChecklist": [
    "Previous FSSAI License copy",
    "ID proof of proprietor (Aadhaar/PAN)",
    "Latest electricity bill (< 3 months)"
  ],
  "renewalInstructions": [
    "Log in to https://foscos.fssai.gov.in using your registered email",
    "Click on 'Renewal of License' under My Licenses",
    "Verify pre-filled details and upload required documents",
    "Pay the renewal fee online (₹2,000 - ₹5,000 based on turnover)",
    "Submit application and save the acknowledgement number"
  ],
  "estimatedTime": "3-5 working days",
  "estimatedCost": "₹2,000 - ₹5,000"
}
```

### Response — Error `500`

```json
{ "error": "AI service unavailable — please fill form manually" }
```

---

## POST `/api/ai/chat`

Streaming compliance chatbot using Gemini + Server-Sent Events (SSE).

### Request

```json
{
  "message": "What happens if my FSSAI license expires?",
  "businessContext": {
    "business_name": "Spice Garden Restaurant",
    "business_type": "Restaurant",
    "city": "Bengaluru"
  },
  "chatHistory": [
    { "role": "user", "text": "Hello" },
    { "role": "model", "text": "Hi! How can I help with your compliance?" }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | ✅ | Current user message |
| `businessContext` | object | ❌ | Passed for context-aware responses |
| `chatHistory` | array | ❌ | Last 10 messages max |

### Response — SSE Stream `200`

```
Content-Type: text/event-stream

data: If your FSSAI\n

data:  license expires,\n

data:  you face a fine of ₹5,000\n

data: [DONE]
```

**Note:** Newlines within tokens are escaped as `\n` in the SSE data field. The frontend must unescape: `text.replace(/\\n/g, '\n')`.

### Frontend Reading Pattern

```js
// Using the geminiService.js wrapper:
await chatWithAI(message, businessContext, history, {
  onChunk: (text) => setResponse(prev => prev + text.replace(/\\n/g, '\n')),
  onDone:  ()     => setStreaming(false),
  onError: (err)  => toast.error(err),
})
```

---

## POST `/api/send-reminder`

Send a branded compliance reminder email via Resend.

### Request

```json
{
  "to": "rajesh@spicegarden.in",
  "ownerName": "Rajesh Kumar",
  "licenseName": "FSSAI Food License",
  "daysLeft": 7,
  "expiryDate": "15 Jan 2025",
  "penalty": 5000,
  "renewalUrl": "https://foscos.fssai.gov.in"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | string | ✅ | Recipient email |
| `ownerName` | string | ✅ | Used in email greeting |
| `licenseName` | string | ✅ | Shown prominently in email |
| `daysLeft` | number | ❌ | Negative = overdue |
| `expiryDate` | string | ❌ | Formatted date string |
| `penalty` | number | ❌ | INR amount, 0 if unknown |
| `renewalUrl` | string | ❌ | CTA button href |

### Response — Success `200`

```json
{
  "success": true,
  "messageId": "49a3999c-0ce1-4ea6-ab68-711a8b9a3b0e",
  "error": null
}
```

### Response — Failure `400/500`

```json
{
  "success": false,
  "messageId": null,
  "error": "to, ownerName, and licenseName are required"
}
```

---

## GET `/api/cron-check`

Daily cron job — scans all licenses and sends reminders. Called by Vercel Cron at 9 AM IST.

### Request Headers

```
x-cron-secret: your-cron-secret-value
```

Or via query: `GET /api/cron-check?secret=your-cron-secret-value`

### Response — Success `200`

```json
{
  "sent": 3,
  "skipped": 12,
  "errors": 0,
  "details": [
    { "license": "FSSAI", "to": "user@example.com", "stage": 7, "daysLeft": 6 },
    { "license": "FIRE_NOC", "to": "shop@example.com", "stage": 30, "daysLeft": 28 }
  ]
}
```

### Response — Unauthorized `401`

```json
{ "error": "Unauthorized" }
```

**Test manually:**
```bash
curl -X GET https://your-app.vercel.app/api/cron-check \
  -H "x-cron-secret: your-cron-secret-value"
```

---

## Error Codes Summary

| HTTP Code | Meaning | Frontend Action |
|---|---|---|
| `200` | Success (check `error` field too) | Use `data` |
| `400` | Bad request — missing fields | Show validation error |
| `401` | Unauthorized (cron only) | N/A for frontend |
| `405` | Wrong HTTP method | Fix the fetch call |
| `500` | Server/AI error | Show fallback UI + manual entry |

---

## Supabase Direct Calls (No `/api` proxy)

The frontend calls Supabase directly for all CRUD. Import from `src/services/supabase.js`:

```js
import { getLicenses, createLicense, updateLicense } from '@/services/supabase'

// Fetch all licenses for current business
const { data, error } = await getLicenses(businessId)

// Create a new license after scan
const { data, error } = await createLicense({
  business_id: businessId,
  license_type: 'FSSAI',
  license_number: '10023456789',
  expiry_date: '2026-01-15',
  status: 'active',
  confidence_score: 92,
  extracted_data: { ...geminiOutput },
})
```

All helpers return `{ data, error }` following the Supabase convention.

---

*Last updated: May 2025 — ComplianceAI Backend v1.0*
