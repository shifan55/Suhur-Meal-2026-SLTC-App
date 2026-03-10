# 🌙 SLTC Sahar Meal Registration System

> A custom-built daily meal registration web app for Muslim students at SLTC Research University during Ramadan 2026.

Built to replace Google Forms — with time-gated registration, student ID validation, duplicate prevention, a live admin dashboard, and a full role-based access system.

---

## 📸 Screenshots

https://drive.google.com/drive/folders/1kDIrLGJv74xX74MKsSb6Lzs2CvnaPGsj?usp=drive_link

---

## ✨ Features

### Student-Facing
- 🔴🟢 **Live form status** — clearly shows open / closed with countdown info
- ⏰ **Time-gated** — form opens and closes automatically on admin-set schedule
- 🎓 **Real Student ID validation** — only pre-approved SLTC students can register. Wrong ID? Rejected instantly, with a clear reason why.
- 🚫 **Duplicate prevention** — one submission per student per day, enforced server-side
- ✉️ **SLTC email detection** — warns if student is not signed in with their university Google account
- 📧 **Confirmation email** — student receives an email confirmation instantly after successful registration
- 📊 **Progress bar** — real-time field completion indicator
- 🌙 **Islamic-themed UI** — gold accents, Amiri Arabic font, crescent moon, animated star particles
- ☀️ **Light / Dark mode** — toggle with localStorage persistence
- 📱 **Fully responsive** — mobile-first, works on all screen sizes

### Admin-Facing
- 🔐 **Secure admin login** — email + password with token-based session
- 👥 **Role system** — Main Admin vs Co-Admin with different permission levels
- 📊 **Live dashboard** — registration count, form status, recent submissions at a glance
- 📅 **Schedule panel** — create new daily sheets, set open/close times, view Hijri date
- 📋 **Responses panel** — searchable submissions table, manual record entry, inline record editing
- 🛡️ **Co-Admin management** — main admin can create and remove co-admin accounts
- 🗂️ **Session manager** — spin up each day's registration in seconds, adjust open/close times on the fly, and browse the full history of past sessions

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript (single file) |
| **Backend** | Google Apps Script (GAS) |
| **Database** | Google Sheets (per-day response spreadsheets) |
| **Fonts** | Amiri (Arabic serif) + Plus Jakarta Sans via Google Fonts |
| **Hosting** | Google Apps Script Web App (deployed as standalone) |

---

## 📁 Project Structure

```
sahar-registration/
├── Code.gs          # Full backend — all 15+ GAS server functions
└── index.html       # Complete frontend — all CSS, HTML, JS inline
```

That's it. Two files. Entirely self-contained.

---

## ⚙️ Setup & Deployment

### 1. Create a new Google Apps Script project

Go to [script.google.com](https://script.google.com) → **New project**

### 2. Add the files

- Paste the contents of `Code.gs` into the default `Code.gs` file
- Create a new HTML file named `index` and paste the contents of `index.html`

### 3. Configure constants in `Code.gs`

At the top of `Code.gs`, fill in your values:

```javascript
var APPROVED_SS_ID  = "YOUR_APPROVED_STUDENTS_SPREADSHEET_ID";
var APPROVED_SHEET  = "Approved";          // sheet tab name
var REJECTED_SS_ID  = "YOUR_REJECTED_LOG_SPREADSHEET_ID";
var SESSIONS_SS_ID  = "YOUR_SESSIONS_LOG_SPREADSHEET_ID";
var ADMIN_EMAIL     = "admin@sltc.ac.lk";
var ADMIN_PASSWORD  = "your_admin_password";
var ADMIN_SS_ID     = "YOUR_ADMINS_SPREADSHEET_ID";
```

### 4. Prepare your Google Sheets

You need four spreadsheets in your Google Drive:

| Spreadsheet | Purpose |
|---|---|
| **Approved Students** | Column A: pre-approved Student IDs |
| **Rejected Log** | Auto-populated when invalid IDs submit |
| **Sessions Log** | Tracks all daily response sheet IDs |
| **Admins** | Co-admin accounts (email, password, role) |

### 5. Deploy as Web App

In Apps Script editor:
- Click **Deploy** → **New deployment**
- Type: **Web app**
- Execute as: **Me**
- Who has access: **Anyone** (or Anyone with Google account)
- Click **Deploy** → copy the web app URL

### 6. Share the URL

Give the deployed URL to your students. That's it — the app is live.

---

## 🔑 Admin Access

1. Open the web app URL
2. Scroll to the bottom and click **⚙ Admin**
3. Log in with your admin email and password
4. You'll land on the admin dashboard

**Main Admin can:**
- Create and schedule new daily sessions
- Update open/close times
- View, search, edit, and manually add responses
- Create and remove co-admin accounts

**Co-Admin can:**
- View dashboard and responses
- Update schedule times
- Cannot add/edit records or manage co-admins

---

## 📋 Student ID Formats Accepted

| Format | Example |
|---|---|
| Standard UG | `22UG1-0123`, `23UG2-0456` |
| CIT format | `CIT-23-01-0123`, `CIT-24-02-0089` |

Both formats are validated client-side and server-side.

---

## 🚧 Known Limitations (Current Version)

- Built on Google Apps Script — cold starts can cause ~2–3 second delays on first load
- Google Sheets is not a real database — performance degrades slightly with 500+ rows
- No push notifications — students must open the app to check status
- `google.script.host.setHeight()` is the only iframe resize method available (setWidth doesn't work for standalone apps)
- Runs inside a GAS iframe when embedded — `position: fixed` elements require special handling

---

## 🔮 Roadmap

- [ ] Migrate backend to **Firebase Cloud Functions + Firestore**
- [ ] Rebuild frontend as a **Flutter** cross-platform mobile app
- [ ] Push notifications when form opens each day
- [ ] Export responses as PDF / Excel from admin dashboard
- [ ] WhatsApp / SMS confirmation on successful registration

---

## 🌙 Why This Exists

During Ramadan, Muslim students at SLTC need to register daily for Sahar meals before 4:00 PM — so organizers know exactly how many meals to prepare and where to deliver them.

Google Forms couldn't handle:
- A form that opens and closes on a schedule
- Preventing the same student from submitting twice
- Meaningful student ID validation — Apps Script can validate on the backend, but Google Forms will still show "Success" regardless. The student walks away thinking they're registered. They're not.
- Giving organizers a clean live dashboard instead of a raw spreadsheet

Did it take longer **to build** than dropping a Google Form link? Absolutely.
Did it solve real problems that Google Forms couldn't? Without a doubt.

The form ran daily through Ramadan with zero duplicate submissions, zero confusion about whether it was open, and only verified SLTC students got through. Wrong ID? Rejected instantly. No spreadsheet-digging for organizers — just live counts, right there on the dashboard.

> ✅ **Deployed and used across multiple days during Ramadan 2026 — worked exactly as intended.**

So this was built from scratch.

---

## 👤 Author

**@Shiabs**
SLTC Research University · Ramadan 2026

---

## 📄 License

MIT License — free to use, modify, and adapt for your own university or community event.

---

> *Ramadan Mubarak 🌙 — Built with intention, for the community.*
