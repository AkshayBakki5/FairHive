# FairHive API Documentation

Base URL: `http://localhost:3000/api` (or set `window.FAIRHIVE_API_URL` in frontend).

## Authentication

All endpoints except `/auth/register` and `/auth/login` require a JWT in the header:

```
Authorization: Bearer <token>
```

Responses use JSON. Errors return `{ "error": "message" }` with appropriate HTTP status (4xx/5xx).

---

## Auth

### POST /api/auth/register

Create a new user.

**Body:**

| Field       | Type   | Required | Description        |
|------------|--------|----------|--------------------|
| email      | string | yes      | Valid email        |
| password   | string | yes      | Min 6 characters   |
| displayName| string | no       | Display name       |

**Response:** `201` – `{ token, user: { id, email, displayName, role } }`

**Errors:** `400` validation/duplicate email, `500` server error.

---

### POST /api/auth/login

Sign in.

**Body:**

| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | yes      |
| password | string | yes      |

**Response:** `200` – `{ token, user: { id, email, displayName, role } }`

**Errors:** `401` invalid credentials.

---

## Rooms

All room endpoints require authentication.

### GET /api/rooms

List rooms the current user is a member of.

**Response:** `200` – `[{ id, name, code, createdBy, createdAt }, ...]`

---

### POST /api/rooms

Create a room. Caller becomes room admin.

**Body:** `{ name?: string }` (default "My Room")

**Response:** `201` – `{ id, name, code }`

---

### POST /api/rooms/join

Join a room by 6-character code.

**Body:** `{ code: string }`

**Response:** `200` – `{ id, name, code }`

**Errors:** `400` already member / invalid code, `404` room not found.

---

### GET /api/rooms/:id

Get a room by ID. User must be a member.

**Response:** `200` – `{ id, name, code, createdBy, createdAt }`

**Errors:** `403` not a member, `404` not found.

---

### GET /api/rooms/:id/members

List room members (includes displayName from Users).

**Response:** `200` – `[{ id, roomId, userId, role, joinedAt, displayName }, ...]`

**Errors:** `403` not a member.

---

### GET /api/rooms/:id/balances

Get per-user net balance from expense splits (positive = owed to user, negative = user owes).

**Response:** `200` – `{ [userId]: number, ... }`

**Errors:** `403` not a member.

---

### GET /api/rooms/:id/analytics/expenses-over-time

Expenses aggregated by date.

**Response:** `200` – `[{ date: "YYYY-MM-DD", total: number }, ...]`

**Errors:** `403` not a member.

---

### GET /api/rooms/:roomId/expenses

List expenses for a room (with splits).

**Response:** `200` – `[{ id, roomId, addedBy, amount, description, splitType, billImageUrl?, createdAt, splits: [{ id?, expenseId, userId, amount, paid, paidAt? }] }, ...]`

**Errors:** `403` not a member.

---

### POST /api/rooms/:roomId/expenses

Add an expense and create splits (equal or custom).

**Body:**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| amount        | number | yes      | Total amount                         |
| description   | string | no       | Default "Expense"                    |
| splitType     | string | no       | `equal` (default) or `custom`         |
| billImageUrl  | string | no       | Optional proof image URL             |
| customSplits  | object | if custom| `{ [userId]: amount }` must sum to amount |

**Response:** `201` – created expense with splits.

**Errors:** `400` invalid amount / custom split sum mismatch, `403` not a member.

---

### PATCH /api/expenses/:id/splits/:userId/paid

Mark a specific user’s split as paid.

**Response:** `200` – `{ ok: true }`

**Errors:** `403` not a member, `404` expense/split not found.

---

### GET /api/rooms/:roomId/chores

List chores with current assignment and history.

**Response:** `200` – 
`[{ id, roomId, title, description, rotationOrder, frequency, priority, createdAt, currentAssignment?: { id, userId, dueDate, completed, completedAt?, completedBy? }, assignments?: [{ id, userId, dueDate, completed, completedAt?, completedBy? }, ...] }, ...]`

**Errors:** `403` not a member.

---

### POST /api/rooms/:roomId/chores

Create a chore and first assignment.

**Body:**

| Field         | Type   | Required | Description                                        |
|---------------|--------|----------|----------------------------------------------------|
| title         | string | yes      | Chore title                                        |
| description   | string | no       |                                                    |
| frequency     | string | no       | `once` \| `daily` \| `weekly` \| `monthly` (default `weekly`) |
| priority      | string | no       | `low` \| `medium` \| `high` (default `medium`)     |
| rotationOrder | array  | no       | [userId, ...]; default all room members            |
| assignedTo    | string | no       | Initial assignee; defaults to first in rotation    |
| dueDate       | string | no       | ISO date for first assignment; otherwise inferred  |

**Response:** `201` – created chore and first assignment.

**Errors:** `403` not a member.

---

### PATCH /api/chores/:id/assignments

Complete current assignment and assign next (rotation).

**Body:** `{ action: "complete" }`

**Response:** `200` – `{ ok: true, nextUserId, dueDate }`

**Errors:** `400` action required, `403` not a member, `404` chore/assignment not found.

---

### GET /api/rooms/:roomId/bills

List bills for a room.

**Response:** `200` – `[{ id, roomId, name, amount, dueDate, billImageUrl?, paid, paidBy?, paidAt?, createdAt }, ...]`

**Errors:** `403` not a member.

---

### POST /api/rooms/:roomId/bills

Add a bill.

**Body:**

| Field        | Type   | Required | Description     |
|--------------|--------|----------|-----------------|
| name         | string | yes      | Bill name       |
| amount       | number | yes      |                 |
| dueDate      | string | no       | ISO date        |
| billImageUrl | string | no       | Optional proof  |

**Response:** `201` – created bill.

**Errors:** `400` invalid amount, `403` not a member.

---

### PATCH /api/bills/:id

Update a bill (mark paid or change fields).

**Body:** `{ paid?: boolean, paidBy?: userId, name?, amount?, dueDate?, billImageUrl? }`

**Response:** `200` – updated bill object.

**Errors:** `403` not a member, `404` not found.

---

## Upload

### POST /api/upload

Upload a file (e.g. bill image). Requires authentication.

**Content-Type:** `multipart/form-data`

**Field:** `file` (image or PDF, max 5MB)

**Response:** `200` – `{ url: string }` (public URL of uploaded file)

**Errors:** `400` no file / invalid type, `401` not authenticated.

---

## Admin (app-level admin only)

All admin endpoints require `req.user.role === 'admin'`.

### GET /api/admin/rooms

List all rooms.

**Response:** `200` – `[{ id, name, code, createdBy, createdAt }, ...]`

---

### GET /api/admin/users

List all users (no password hash).

**Response:** `200` – `[{ id, email, displayName, role, createdAt }, ...]`

---

### PATCH /api/admin/rooms/:id/members/:userId/role

Set a member’s role in a room.

**Body:** `{ role: "admin" | "member" }`

**Response:** `200` – `{ ok: true, role }`

**Errors:** `400` invalid role, `403` not app admin, `404` member not found.
