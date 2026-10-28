# Bus pass Aplication & Transport management system

A beginner-friendly full-stack B.Tech project that lets students register, log in, submit bus pass requests, and track their status. An authorized administrator can review requests and approve or reject pending applications.

> **Project limitation:** This is an educational application, not an official transport-authority portal. Approval in this project does not issue a real bus pass.

## 1. Problem statement

Paper-based bus pass applications can be inconvenient to submit and track. This project provides one online place for applications and status updates.

## 2. Objectives and users

- **Student:** create an account, apply for a pass, view only their own applications, and track status.
- **Administrator:** view applications from all users and approve or reject pending applications.
- Keep records in Supabase PostgreSQL so they persist between visits.

## 3. Features

- Responsive home page and student signup/login.
- Password hashing with bcrypt.
- JWT-protected backend routes and admin-only status changes.
- Apply with applicant name, phone, pass type, route, requested start date, and address.
- Filter/search applications by status, route, name, and pass type.
- Admin summary counts and review controls.
- Server-side validation, rate limiting for authentication, Helmet security headers, and database constraints.

Not included in this MVP: online payment, live bus tracking, official pass PDF generation, SMS/email notifications, route timetable lookup, or integration with a transport authority.

## 4. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js and Express.js
- Supabase PostgreSQL
- Git and GitHub
- npm packages: `@supabase/supabase-js`, `bcryptjs`, `cors`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`, `express-validator`

## 5. Folder structure

```text
bus-pass-application-transport-management-system/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── applications.js
│   ├── middleware/
│   │   └── auth.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

`backend/.env` is created locally by you and is intentionally not included in the project archive.

## 6. Prerequisites

Install:
- Visual Studio Code: https://code.visualstudio.com/
- Node.js LTS (npm is included): https://nodejs.org/
- Git: https://git-scm.com/
- A Supabase account: https://supabase.com/

Verify in a new VS Code terminal:

```bash
node --version
npm --version
git --version
```

## 7. Set up Supabase

1. Sign in to Supabase and create a new project.
2. Choose a project name and a strong database password. Keep that database password private.
3. Open **SQL Editor** in the project dashboard, choose **New query**, and paste all of `database/schema.sql`.
4. Click **Run**. In Table Editor, verify that `profiles` and `bus_pass_applications` exist.
5. In the project API/settings area, copy the Project URL and the server-side secret/service-role key appropriate to your project. Keep this privileged key only in the backend `.env`; never put it in `frontend/app.js`, HTML, GitHub, or screenshots.

## 8. Configure environment variables

In VS Code, create `backend/.env` by copying `backend/.env.example`, then replace the example values:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_REAL_SERVER_SIDE_SECRET_KEY
JWT_SECRET=PASTE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=8h
```

Generate a random JWT secret in the VS Code terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`. `SUPABASE_URL` identifies your project; `SUPABASE_SERVICE_ROLE_KEY` permits server-side database operations; `JWT_SECRET` signs login tokens; `JWT_EXPIRES_IN` controls token lifetime. Do not use the example values as real credentials.

## 9. Install and run

Open the project folder in VS Code. In the terminal, move into the backend directory:

```bash
cd backend
npm install
npm run check
npm start
```

Expected terminal message: `BusPass is running at http://localhost:3000`

Keep that terminal running and open http://localhost:3000 in your browser. The Express server serves the `frontend/` directory and handles `/api` requests. You do not need a separate frontend server.

If you change server code while it is running, stop with `Ctrl+C` and run `npm start` again. For development, `npm run dev` uses Node's watch mode.

## 10. Create an administrator

Public signup always creates a `student` account. First create your own account from the website. Then, in Supabase SQL Editor, run the following query after replacing the email with the exact email you registered:

```sql
update public.profiles
set role = 'admin'
where email = lower('your-admin-email@example.com');
```

Verify the row's `role` is `admin`. Log out and log back in so the app loads the updated role. Never expose a way for ordinary users to set their own role. Do not make every account an admin.

## 11. API endpoints

All request and response bodies are JSON. Protected endpoints require `Authorization: Bearer YOUR_LOGIN_TOKEN`.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Check server health | Public |
| POST | `/api/auth/signup` | Create a student account | Public, rate-limited |
| POST | `/api/auth/login` | Log in | Public, rate-limited |
| GET | `/api/auth/me` | Get current account | Logged-in user |
| GET | `/api/applications` | List own applications, or all applications for admins | Logged-in user |
| POST | `/api/applications` | Submit a bus pass application | Logged-in user |
| PATCH | `/api/applications/:id/status` | Approve/reject a pending application | Admin only |

Signup request: `{ "name": "Example Student", "email": "student@example.com", "password": "StrongPass1!" }`

Login request: `{ "email": "student@example.com", "password": "StrongPass1!" }`

Application request example:

```json
{
  "applicant_name": "Example Student",
  "phone": "9876543210",
  "pass_type": "Student",
  "route_start": "Kukatpally",
  "route_end": "College",
  "requested_start_date": "2030-01-15",
  "address": "Example residential address"
}
```

Status update body: `{ "status": "Approved" }` or `{ "status": "Rejected" }`.

Successful signup/login returns a token and public user details. Validation errors return HTTP 400, duplicate signup returns 409, invalid login/session returns 401, forbidden admin action returns 403, and missing/already-reviewed applications return 404. Internal server errors return a generic message; details are logged in the backend terminal.

## 12. Architecture

Browser HTML/CSS/JavaScript → `fetch()` → Express API → Supabase PostgreSQL. The browser never receives the Supabase privileged key. Express verifies the JWT and reads the current role from the database before returning private records or changing statuses.

The app stores the short-lived JWT in `localStorage` for this beginner demonstration. This is convenient but less secure than an appropriately configured HttpOnly cookie for a production application. Do not reuse passwords from important accounts, and log out on shared computers.

Row Level Security is enabled on both tables with no direct browser policies. The application intentionally uses the server-side service key only in Node.js; therefore the backend must continue to enforce ownership and role checks. Never create public database policies that expose all profiles or applications.

## 13. Manual testing checklist

1. Open `/api/health`; expect JSON with `"status":"ok"`.
2. Sign up with a valid name, email, and strong password; expect account creation and dashboard.
3. Try the same email again; expect a duplicate-account message.
4. Log out and log back in; expect the same account to work.
5. Apply using different start and end points and a future date; expect a Pending application.
6. Submit an empty/invalid form or same start and end; expect validation feedback.
7. Open the dashboard as a student; only that student's applications should appear.
8. Use search and status filters; expect the list to update.
9. Attempt to call the status endpoint as a student; expect HTTP 403.
10. Promote a test account to admin using the SQL in section 10, log out/in, and review a pending application; expect Approved or Rejected status.
11. As admin, confirm the dashboard shows applications from multiple users.
12. Resize the browser to mobile width; check navigation, forms, and table scrolling.
13. Stop Supabase connectivity or use an invalid credential only in a safe test setup; confirm the UI shows an error rather than pretending a save succeeded.

## 14. Troubleshooting

- **Server exits because configuration is missing:** check that `backend/.env` exists and variable names match `.env.example`.
- **Supabase URL/key error:** copy the project URL and server-side key from the correct Supabase project; do not include quotes or extra spaces.
- **Tables not found:** rerun `database/schema.sql` and verify table names in Table Editor.
- **Port already in use:** set another free port in `.env`, then open the matching localhost port.
- **Login says incorrect password:** confirm you are using the same email and password used at signup.
- **Admin buttons missing:** update the user's role in Supabase, then log out and back in.
- **Expired/invalid session:** log in again.
- **Changes do not appear:** check the terminal for the generic request failure log and verify Supabase credentials/network access.
- **`npm run check` fails because a package is missing:** run `npm install` from `backend/`.

## 15. GitHub upload

From the root project folder:

```bash
git init
git status
git add .
git status
git commit -m "Build BusPass transport management project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Create an empty repository on https://github.com/ and replace `YOUR_GITHUB_REPOSITORY_URL` with its actual URL. Before committing, check that `backend/.env`, `node_modules/`, real credentials, private user information, and database exports are not staged. `.env.example` should be committed.

**Important:** `.gitignore` does not remove a secret that was already committed. If a credential is exposed, rotate/revoke it immediately and remove it from repository history before sharing the repository.

## 16. Security and limitations

- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- JWTs expire and protected routes verify the current account and role from the database.
- Authentication endpoints are rate-limited and inputs are validated on the server.
- Service-role credentials must remain private and server-side.
- For production, use secure HttpOnly cookie sessions or another reviewed auth design, add monitoring and backups, and obtain a security review.
- This educational MVP does not integrate with official transport services or issue legally valid passes.
