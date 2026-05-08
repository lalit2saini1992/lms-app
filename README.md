# LMS — Lead Management System

Full-stack Lead Management System with follow-up tracking, multi-role access, Excel import, and PWA support.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + PWA
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Auth**: JWT

## Quick Start

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 2. Seed First Admin
After starting the backend, run once:
```
POST http://localhost:5000/api/auth/seed
```
This creates: `admin@lms.com` / `Admin@123`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Features

### Roles
| Role | Access |
|------|--------|
| Super Admin | Full access |
| Admin | Leads, users, reports, follow-up types |
| Manager | Leads, assign, reports |
| Employee | View assigned leads, add follow-ups |

### Lead Management
- Add leads manually or bulk import via Excel
- Excel columns: Name*, Phone*, Email, City, Product, Budget, Notes
- Assign leads to employees from listing
- Filter by status, employee, date

### Communication (from Lead Detail)
- 📞 Call — direct tel: link
- 💬 WhatsApp — wa.me with pre-filled message
- 📧 Email — mailto link

### Follow-up System
- Admin defines types: Not Pick, Switch Off, Busy, etc.
- Telecaller selects type + method + remark after each contact
- Schedule next follow-up date
- Full timeline history per lead

### PWA
- Installable on Android/iOS
- Works offline (cached data)
- Mobile-first responsive design

---

## Project Structure
```
lms-app/
├── backend/
│   └── src/
│       ├── config/       # DB connection
│       ├── controllers/  # Business logic
│       ├── middleware/   # Auth, permissions
│       ├── models/       # Mongoose schemas
│       └── routes/       # Express routes
└── frontend/
    └── src/
        ├── api/          # Axios API calls
        ├── components/   # Layout, UI components
        ├── pages/        # Route pages
        ├── store/        # Zustand auth store
        └── utils/        # Helpers, formatters
```
