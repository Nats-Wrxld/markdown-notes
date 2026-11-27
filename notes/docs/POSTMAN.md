# UrSpace — API Testing with Postman

**Status:** implemented 2026-11-27. The collection targets the routes that
exist. Public and unauthenticated requests were verified locally; authenticated
CRUD and role cases are **not yet verified** because no test account exists and
`SUPABASE_SERVICE_ROLE_KEY` is absent.

Importable collection:
[`postman/urspace-api.postman_collection.json`](postman/urspace-api.postman_collection.json)

Contract: [API_DESIGN.md](API_DESIGN.md). Results matrix:
[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) §12.

---

## 1. Authentication model

There is **no API login endpoint**. The login system was intentionally left
unchanged:

- Signup, password login, logout, forgot/reset: `app/auth/actions.ts`.
- Google/GitHub and other providers: `components/social-auth-buttons.tsx`.
- Callback paths: `/auth/callback` and `/auth/confirm`.

The API only *reads* the resulting session. Two ways to authenticate Postman:

### A. Browser session cookie (preferred)

1. Sign in at `{{baseUrl}}/login` in a browser.
2. Copy the Supabase session cookies for that origin into Postman's cookie jar
   (or use the Postman Interceptor).
3. Send requests with **no** `Authorization` header.

Cookie-authenticated mutations must include a same-origin `Origin`. Postman
usually omits it; the API allows a missing `Origin` but rejects a foreign one.

### B. Transitional Supabase bearer token

For scripts and disposable test accounts only:

```http
POST {{supabaseUrl}}/auth/v1/token?grant_type=password
apikey: {{supabasePublishableKey}}
Content-Type: application/json

{ "email": "{{email}}", "password": "{{password}}" }
```

The `Auth → Get Supabase token` request stores `access_token` as
`{{accessToken}}`; every other request inherits
`Authorization: Bearer {{accessToken}}`. This is not used by the browser and is
reviewed before any future removal.

**Never** send `SUPABASE_SERVICE_ROLE_KEY`. The API never accepts it.

---

## 2. Variables

| Variable | Value | Notes |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:3000` | Production: `https://urspace-seven.vercel.app` (read-only/disposable data) |
| `supabaseUrl` | `https://<project-ref>.supabase.co` | Token exchange only |
| `supabasePublishableKey` | `sb_publishable_…` | Publishable key only |
| `email` / `password` | dedicated test account | Never a real tutor |
| `accessToken` | set by the token request | Transitional |
| `noteId` | set by Create note | |
| `tutorId` | set by List tutors | |
| `unknownId` | `00000000-0000-4000-8000-000000000000` | 404 case |

---

## 3. Collection folders

```
UrSpace API (v1)
├── Health & Public
│   ├── Health                         GET  /api/v1/health            no auth
│   └── Public settings                GET  /api/v1/public/settings   no auth
├── Auth
│   ├── Get Supabase token             POST {{supabaseUrl}}/auth/v1/token
│   └── Session                        GET  /api/v1/auth/session
├── Notes
│   ├── List notes                     GET  /api/v1/notes?page=1&pageSize=20
│   ├── Create note                    POST /api/v1/notes
│   ├── Get note                       GET  /api/v1/notes/{{noteId}}
│   ├── Update note                    PATCH /api/v1/notes/{{noteId}}
│   ├── Delete note                    DELETE /api/v1/notes/{{noteId}}
│   └── Import notes                   POST /api/v1/notes/import
├── Me
│   ├── Get me                         GET  /api/v1/me
│   ├── Update display name            PATCH /api/v1/me
│   ├── Change password                PUT  /api/v1/me/password
│   └── Remove avatar                  DELETE /api/v1/me/avatar
├── Admin
│   ├── Overview                       GET  /api/v1/admin/overview
│   ├── List tutors                    GET  /api/v1/admin/tutors
│   ├── Create tutor                   POST /api/v1/admin/tutors
│   ├── Tutor detail                   GET  /api/v1/admin/tutors/{{tutorId}}
│   ├── Update tutor                   PATCH /api/v1/admin/tutors/{{tutorId}}
│   ├── Tutor notes                    GET  /api/v1/admin/tutors/{{tutorId}}/notes
│   ├── List admins (owner)            GET  /api/v1/admin/accounts
│   ├── Change role (owner)            PATCH /api/v1/admin/accounts/{{tutorId}}/role
│   ├── Send reset link                POST /api/v1/admin/accounts/{{tutorId}}/reset
│   ├── List notes                     GET  /api/v1/admin/notes
│   ├── Note detail                    GET  /api/v1/admin/notes/{{noteId}}
│   ├── Update note                    PATCH /api/v1/admin/notes/{{noteId}}
│   ├── Delete note                    DELETE /api/v1/admin/notes/{{noteId}}
│   ├── Activity                       GET  /api/v1/admin/activity
│   ├── Get settings (owner)           GET  /api/v1/admin/settings
│   └── Update settings (owner)        PUT  /api/v1/admin/settings
└── Negative
    ├── Notes without auth             401
    ├── Admin without auth             401
    ├── Invalid bearer                 401
    ├── Create with invalid body       400
    ├── Create with unknown field      400
    ├── Malformed id                   400
    ├── Unknown note                   404
    └── Wrong content type             415
```

Run order for notes: **Create → Get → List → Update → Delete**. Create stores
`noteId`. List tutors stores `tutorId`.

---

## 4. Response contract

### Success

```json
{ "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 1, "pageCount": 1 } }
```

`meta` appears on collections. `201` includes `Location`; `204` has no body.

### Error

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request body is invalid.",
    "details": { "fieldErrors": { "title": ["Add a title before saving."] } },
    "requestId": "…"
  }
}
```

All responses: `Cache-Control: private, no-store`, `Vary: Cookie,
Authorization`, `X-Request-Id`.

### Status codes

| Status | Code | When |
| --- | --- | --- |
| 400 | `validation_error` | Bad JSON, unknown field, bad UUID |
| 401 | `unauthenticated` | No/invalid session or token |
| 403 | `forbidden` | Wrong role, owner/self target, foreign origin |
| 403 | `account_suspended` | Valid identity, suspended account |
| 404 | `not_found` | Missing or outside the caller's scope |
| 409 | `conflict` | Duplicate email/record |
| 413 | `payload_too_large` | Notes 256 KB; import/avatar 2 MB |
| 415 | `unsupported_media_type` | Wrong JSON/multipart content type |
| 503 | `unavailable` | Account provisioning without a service-role key |
| 500 | `internal_error` | Generic message + `requestId` |

---

## 5. Notes examples

Create (tags are normalised by the client before sending):

```http
POST {{baseUrl}}/api/v1/notes
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Fractions — Tuesday group",
  "body": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Start with halves and quarters." }]
      }
    ]
  },
  "tags": ["maths", "year 4"]
}
```

List:

```http
GET {{baseUrl}}/api/v1/notes?page=1&pageSize=20&q=fractions&tag=maths
```

`pageSize` is capped at **100**; `page` defaults to 1.

---

## 6. What is verified, what is not

| Area | Result |
| --- | --- |
| Health, public settings | Verified locally: `200`, correct envelope and headers |
| Signed-out notes/admin/me | Verified: `401 unauthenticated` |
| Invalid bearer | Verified: `401` |
| Session probe signed out | Verified: `data.user/profile = null` |
| Google OAuth initiation | Verified in browser: reached Google with `redirect_to=/auth/callback` |
| GitHub OAuth initiation | Verified in browser: reached GitHub with the same callback |
| Notes CRUD / import | **Unverified** — requires a session |
| Me/profile/avatar/password | **Unverified** — requires a session |
| Admin role boundaries | **Unverified** — requires tutor + admin + owner accounts |
| Two-account isolation | **Unverified** — requires two accounts |
| Account provisioning | Expected `503` until the service-role key is set |

Do not mark an authenticated request as passing until it has actually been run.
Record the result here and in `TESTING_CHECKLIST.md` §12.
