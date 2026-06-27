# FairHive

A roommate management web app for splitting expenses, tracking chores, managing bills, and settling payments — all in one place.

## Tech Stack

- **Backend:** Node.js + Express, MongoDB (Mongoose)
- **Frontend:** Plain HTML / CSS / JavaScript (no framework)
- **Auth:** JWT (Bearer tokens), role-based (member / admin)
- **File uploads:** Multer

## Project Structure

```
Fairhive/
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point — connects MongoDB, starts server
│   │   ├── app.js                # Express app, middleware, route mounts
│   │   ├── db/
│   │   │   └── mongoose.js       # MongoDB connection helper
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Room.js
│   │   │   ├── RoomMember.js
│   │   │   ├── Expense.js
│   │   │   ├── ExpenseSplit.js
│   │   │   ├── Chore.js
│   │   │   ├── ChoreAssignment.js
│   │   │   ├── Bill.js
│   │   │   ├── Payment.js
│   │   │   ├── Invite.js
│   │   │   └── Notification.js
│   │   ├── store/
│   │   │   └── jsonStore.js      # Data access layer (wraps Mongoose models)
│   │   ├── controllers/          # Route handlers
│   │   ├── routes/               # Express routers
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification middleware
│   │   │   └── errorHandler.js
│   │   └── scripts/
│   │       └── seed.js           # Optional seed script
│   ├── uploads/                  # Uploaded bill images
│   ├── .env                      # Environment variables (see below)
│   └── package.json
└── frontend/
    ├── index.html                # Login / register page
    ├── dashboard.html
    ├── expenses.html
    ├── chores.html
    ├── bills.html
    ├── payments.html
    ├── settings.html
    ├── admin.html
    ├── css/
    └── js/
```

## Setup

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or [MongoDB Atlas free tier](https://www.mongodb.com/cloud/atlas))

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Edit `backend/.env`:

```env
PORT=3000
JWT_SECRET=change-this-to-a-long-random-string
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 3. Run locally

```bash
cd backend
npm start
```

Open `http://localhost:3000` in your browser.

For auto-restart on file changes:

```bash
npm run dev
```

## Features

| Feature       | Details                                            |
| ------------- | -------------------------------------------------- |
| Auth          | Register, login, JWT sessions                      |
| Profile       | Edit display name / avatar, change password        |
| Rooms         | Create, join (via code), rename, leave, delete     |
| Members       | Role-based (member / admin), invite by email       |
| Expenses      | Add, edit, delete; equal or custom splits          |
| Balances      | Who owes whom, updated with payments               |
| Chores        | Add, edit, delete; auto-assign by rotation         |
| Bills         | Track recurring bills, mark as paid, attach images |
| Payments      | Record debt-settlement payments between members    |
| Notifications | In-app alerts for invites, payments, assignments   |
| Analytics     | Room summary — spending by category, balances      |
| Admin panel   | View all rooms and users (admin role only)         |
| File uploads  | Attach images to bills and expenses                |

## API Overview

All endpoints are prefixed with `/api`.

| Prefix               | Purpose                              |
| -------------------- | ------------------------------------ |
| `/api/auth`          | Register, login, profile, password   |
| `/api/rooms`         | CRUD rooms, members, balances, leave |
| `/api/expenses`      | CRUD expenses + splits               |
| `/api/chores`        | CRUD chores + assignments            |
| `/api/bills`         | CRUD bills, mark paid                |
| `/api/payments`      | Record and list payments             |
| `/api/notifications` | List, mark read, delete              |
| `/api/invites`       | Send and accept invites              |
| `/api/admin`         | Admin-only: list all rooms/users     |
| `/api/upload`        | Upload bill/expense images           |
| `/api/health`        | Health check                         |

Protected routes require `Authorization: Bearer <token>` header.

## Admin Access

Admin role must be set directly in MongoDB. In MongoDB Atlas:

1. Browse Collections → `users` collection
2. Find your user document
3. Edit → set `"role": "admin"`
4. Log out and log back in (new JWT picks up the role)

## Deployment (AWS EC2 Free Tier)

1. Launch **Ubuntu 22.04 t2.micro** EC2 instance
2. Open inbound port **3000** in the security group
3. SSH in and install Node.js 20 + PM2
4. Upload project files (MobaXterm drag-and-drop or `scp`)
5. Set `BASE_URL` and `FRONTEND_URL` in `.env` to your EC2 public IP
6. Allow your EC2 IP in MongoDB Atlas → Network Access
7. Run:

```bash
cd Fairhive/backend
npm install
pm2 start src/index.js --name fairhive
pm2 save && pm2 startup
```

Access at `http://<EC2-PUBLIC-IP>:3000`

## Environment Variables

| Variable       | Description                                 |
| -------------- | ------------------------------------------- |
| `PORT`         | Server port (default: 3000)                 |
| `JWT_SECRET`   | Secret for signing JWTs — keep this private |
| `MONGODB_URI`  | MongoDB connection string                   |
| `BASE_URL`     | Backend base URL (used in invite links)     |
| `FRONTEND_URL` | Frontend origin (used for CORS)             |
| `SMTP_HOST`    | (Optional) SMTP host for invite emails      |
| `SMTP_PORT`    | (Optional) SMTP port                        |
| `SMTP_USER`    | (Optional) SMTP username                    |
| `SMTP_PASS`    | (Optional) SMTP password                    |
