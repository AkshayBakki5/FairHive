# FairHive – Smart Room Expense & Chore Management System

A full-stack web application for shared room expense splitting, bill tracking, and rotation-based chore management.

## Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js, Express
- **Storage:** JSON file storage (`backend/data/*.json`), no database required
- **Auth:** JWT, bcrypt
- **Uploads:** Local files in `backend/uploads/`, served at `/uploads`

## Prerequisites

- Node.js 18+

## Setup

### 1. Clone and install

```bash
cd FairHive
cd backend && npm install
```

### 2. Environment

Copy `backend/.env.example` to `backend/.env` and set:

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Run backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:3000`. Health: `GET http://localhost:3000/api/health`.

### 4. Run frontend

Serve the `frontend` folder over HTTP (required for API calls):

- **Option A:** VS Code Live Server – open `frontend` and “Open with Live Server”.
- **Option B:** From project root: `npx serve frontend -p 5000` then open `http://localhost:5000`.
- **Option C:** Any static server pointing at `frontend`.

If the frontend is not on the same origin as the API, set the API base URL before loading pages:

```html
<script>
  window.FAIRHIVE_API_URL = "http://localhost:3000/api";
</script>
<script src="js/api.js"></script>
```

### 5. Seed data (optional)

From `backend`:

```bash
node scripts/seed.js
```

Creates users (e.g. `admin@fairhive.demo` / `admin123`) and one room “Sunset Apartment” with sample expenses, chores, and bills. Data is written to `backend/data/*.json`.

## Project structure

```
FairHive/
├── backend/
│   ├── src/
│   │   ├── config/      # (optional, no Firebase)
│   │   ├── store/       # JSON file storage (jsonStore.js)
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── utils/
│   ├── data/            # JSON collections (created by app/seed)
│   ├── uploads/         # Uploaded bill/expense images
│   ├── scripts/
│   │   └── seed.js
│   └── package.json
├── frontend/
│   ├── css/
│   ├── js/
│   ├── *.html
│   └── assets/
├── docs/
│   ├── API.md
│   └── SCHEMA.md       # JSON storage schema
└── README.md
```

## Features

- **Auth:** Register, login, JWT, role (admin/member)
- **Rooms:** Create room, join by 6-char code
- **Expenses:** Add shared expenses, equal or custom split, optional bill image
- **Balances:** Per-user paid/unpaid from expense splits
- **Chores:** Rotation-based assignment, mark complete
- **Bills:** Room bills, due date, optional image, mark paid
- **Analytics:** Expenses over time (Chart.js)
- **Admin:** List rooms/users, change member role (app admin only)
- **Upload:** `POST /api/upload` for bill/expense images (stored in `backend/uploads/`, served at `/uploads`)

## API docs

See [docs/API.md](docs/API.md).

## Database schema

See [docs/SCHEMA.md](docs/SCHEMA.md). All data is stored in JSON files under `backend/data/`.

## License

📜 License
This project is licensed under the MIT License.

👨‍💻 Author
Developed by B Akshay ✨ If you like this bot, consider giving it a ⭐ on GitHub!
