# Lead Management System (LMS) — Full Spec

## Overview
A full-stack Lead Management System with multi-role access, lead tracking, communication tools, follow-up management, and PWA support. Built with React, Node.js, Express, and MongoDB.

---

## Roles & Permissions

| Role        | Permissions |
|-------------|-------------|
| Super Admin | Full access — manage roles, users, leads, follow-up types, reports |
| Admin       | Add/edit/delete leads, assign leads, view all follow-ups, manage employees |
| Manager     | View assigned team leads, assign to telecallers, view reports |
| Employee / Telecaller | View assigned leads, update follow-up, communicate |

---

## Modules

### 1. Authentication
- JWT-based login
- Role-based route protection
- Refresh token support

### 2. User Management (Admin+)
- Add/Edit/Delete employees
- Assign roles
- Set permissions per role

### 3. Lead Management
- Add lead manually (form)
- Bulk import via Excel (.xls / .xlsx)
- Lead fields: Name, Phone, Email, Source, Status, Assigned To, Created At, Notes
- Lead listing with filters: status, assigned, date range, source
- Assign lead to employee/telecaller from listing

### 4. Communication (from Lead Detail)
- **Call** — tel: link / click-to-call
- **WhatsApp** — wa.me link with pre-filled message
- **Email** — mailto: link
- Log each communication attempt with timestamp

### 5. Follow-up System
- Admin can define follow-up types: Not Pick, Switch Off, Busy, Interested, Not Interested, Call Back, Deal Done, etc.
- Telecaller selects follow-up type after each interaction
- Add remark/note with each follow-up
- Follow-up history per lead (timeline view)
- Next follow-up date/time scheduling

### 6. Dashboard & Reports
- Admin/Manager: Total leads, assigned, pending, converted
- Follow-up summary per employee
- Lead status distribution (chart)
- Daily/weekly activity log
- Filter by date, employee, status

### 7. PWA Support
- manifest.json with app icons
- Service worker for offline caching
- Installable on Android/iOS (like DPA)
- Responsive design — mobile first

---

## Database Schema (MongoDB)

### Users
```
_id, name, email, password (hashed), role, permissions[], isActive, createdAt
```

### Leads
```
_id, name, phone, email, source, status, assignedTo (ref: User), 
createdBy (ref: User), notes, importedFrom (manual/excel), createdAt, updatedAt
```

### FollowUpTypes
```
_id, label, color, createdBy, isActive
```

### FollowUps
```
_id, lead (ref: Lead), doneBy (ref: User), type (ref: FollowUpType), 
remark, nextFollowUpDate, communicationMethod (call/whatsapp/email/message), 
createdAt
```

### CommunicationLogs
```
_id, lead (ref: Lead), user (ref: User), method, timestamp, notes
```

---

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Users
- GET /api/users
- POST /api/users
- PUT /api/users/:id
- DELETE /api/users/:id

### Leads
- GET /api/leads (with filters)
- POST /api/leads
- POST /api/leads/import (Excel upload)
- PUT /api/leads/:id
- DELETE /api/leads/:id
- PUT /api/leads/:id/assign

### Follow-up Types
- GET /api/followup-types
- POST /api/followup-types
- PUT /api/followup-types/:id
- DELETE /api/followup-types/:id

### Follow-ups
- GET /api/followups?leadId=xxx
- POST /api/followups
- GET /api/followups/summary (admin report)

### Dashboard
- GET /api/dashboard/stats
- GET /api/dashboard/activity

---

## Frontend Pages

1. `/login` — Login page
2. `/dashboard` — Stats overview
3. `/leads` — Lead listing with filters + assign
4. `/leads/add` — Add lead form
5. `/leads/import` — Excel import
6. `/leads/:id` — Lead detail + communication + follow-up history
7. `/followup-types` — Manage follow-up types (admin)
8. `/users` — User management (admin)
9. `/reports` — Reports & charts

---

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **State**: React Query (TanStack) + Zustand
- **Charts**: Recharts
- **Excel**: xlsx (SheetJS)
- **Backend**: Node.js + Express
- **DB**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt
- **PWA**: Vite PWA plugin
- **File Upload**: Multer
