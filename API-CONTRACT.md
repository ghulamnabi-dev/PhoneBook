# PhoneBook API contract (v2)

Base URL (dev): `http://localhost:5180/api`. All endpoints except `/auth/*` and `/health` require `Authorization: Bearer <jwt>`.
Contacts and groups are scoped to the signed-in user — you only ever see your own.
Errors: 400 `ValidationProblemDetails` `{ title, errors: { Field: ["msg"] } }` (PascalCase field names), 401, 403, 404 `ProblemDetails`, 409 `ProblemDetails` (duplicate e-mail on register / duplicate group name).

## Auth
- `POST /auth/register` `{ name, email, password }` → 200 `AuthResponse`  (password ≥ 8 chars)
- `POST /auth/login` `{ email, password }` → 200 `AuthResponse` | 401
- `GET  /auth/me` → `{ id, name, email }`
- `AuthResponse = { token, name, email, expiresAt }`  (token lifetime 8h; claims: sub, name, email)

## Contacts
- `GET /contacts?q=&groupId=&favourites=true|false&page=1&pageSize=50&sort=name|recent` → `Paged<ContactSummary>`
  - `q` matches first/last name, company, e-mail, any phone number (digits-insensitive: "0300 123" matches "0300-123…")
  - `Paged<T> = { items: T[], total, page, pageSize, totalPages }`
- `GET /contacts/{id}` → `ContactDetail`
- `POST /contacts` `ContactInput` → 201 `ContactDetail`
- `PUT /contacts/{id}` `ContactInput` → 200 `ContactDetail`
- `DELETE /contacts/{id}` → 204
- `PUT /contacts/{id}/favourite` `{ isFavourite: boolean }` → 200 `ContactDetail`
- `GET /contacts/export` (optional `?groupId=&ids=1,2,3`) → `text/vcard` file `contacts.vcf` (vCard 3.0, one VCARD per contact)
- `GET /contacts/{id}/vcard` → `text/vcard` single card `firstname-lastname.vcf`
- `POST /contacts/import` multipart/form-data field `file` (.vcf) → 200 `{ imported, skipped, errors: string[] }` — all-or-nothing on failure (transaction), `skipped` counts cards with no name and no phone.

```
ContactSummary = { id, firstName, lastName, displayName, company, isFavourite, primaryPhone: string|null, email: string|null, groups: [{id,name}], updatedAt }
ContactDetail  = ContactSummary + { notes, phones: [{ id, label, number }], createdAt }
ContactInput   = { firstName (required, ≤80), lastName (≤80), company (≤120), email (valid, ≤200), notes (≤2000), isFavourite, phones: [{ label: "Mobile"|"Home"|"Work"|"Other", number (required, 5–25 chars) }] (≥1 phone), groupIds: number[] }
```

## Groups
- `GET /groups` → `[{ id, name, contactCount }]`
- `POST /groups` `{ name }` → 201 `{ id, name, contactCount }`  (409 if the name exists)
- `PUT /groups/{id}` `{ name }` → 200
- `DELETE /groups/{id}` → 204 (contacts stay, just leave the group)

## Health
- `GET /health` → 200 "Healthy"
