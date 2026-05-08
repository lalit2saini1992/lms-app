# 🚀 Deployment Guide — Shared Hosting + Render.com

## Architecture
```
Frontend  → Shared Hosting subdomain (lms.yoursite.com)
Backend   → Render.com free tier
Database  → MongoDB Atlas (already connected)
```

---

## STEP 1 — Backend on Render.com

### 1.1 GitHub pe code upload karo
1. GitHub.com pe new repository banao: `lms-app`
2. Local se push karo:
```bash
cd lms-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lms-app.git
git push -u origin main
```

### 1.2 Render.com pe deploy
1. [render.com](https://render.com) → Sign up with GitHub
2. **New +** → **Web Service**
3. GitHub repo select karo
4. Settings:
   - **Name**: lms-backend
   - **Root Directory**: `lms-app/backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Plan**: Free

5. **Environment Variables** add karo:
```
MONGODB_URI    = mongodb://lms:ItmH4mTDT9T4k0XX@ac-egd8czv-shard-00-00...
JWT_SECRET     = lms_super_secret_jwt_key_2024
JWT_EXPIRES_IN = 7d
NODE_ENV       = production
CLIENT_URL     = https://lms.yoursite.com
```

6. **Create Web Service** → Wait for deploy
7. URL note karo: `https://lms-backend-xxxx.onrender.com`

---

## STEP 2 — Frontend Build

### 2.1 .env.production update karo
File: `lms-app/frontend/.env.production`
```
VITE_API_URL=https://lms-backend-xxxx.onrender.com/api
```
(Render se mili URL daalo)

### 2.2 Build karo
```bash
cd lms-app/frontend
npm run build
```
`dist/` folder ban jayega

---

## STEP 3 — Shared Hosting pe Frontend Upload

### 3.1 cPanel mein Subdomain banao
1. cPanel → **Subdomains**
2. Subdomain: `lms` → Domain: `yoursite.com`
3. Document Root: `public_html/lms` (auto set hoga)
4. **Create**

### 3.2 Files upload karo
1. cPanel → **File Manager** → `public_html/lms/`
2. `dist/` folder ke andar ki **saari files** upload karo
   (index.html, assets/, sw.js, etc.)
3. Ya FTP use karo (FileZilla)

### 3.3 .htaccess file banao (React Router ke liye)
`public_html/lms/.htaccess` mein yeh daalo:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

---

## STEP 4 — Test

1. `https://lms.yoursite.com` open karo
2. Login: `admin@lms.com` / `Admin@123`
3. Sab kuch kaam karna chahiye ✅

---

## Troubleshooting

**Login nahi ho raha?**
- Browser Console mein error dekho (F12)
- CORS error hai to Render pe `CLIENT_URL` check karo

**Page refresh pe 404?**
- `.htaccess` file check karo

**Render backend slow hai?**
- Free tier pe first request slow hoti hai (cold start ~30 sec)
- Upgrade to paid for always-on

---

## Quick Build Command
```bash
cd lms-app/frontend
npm run build
# dist/ folder ready to upload
```
