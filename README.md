# Time Tracking App

A comprehensive time tracking and leave management system for businesses.

## Features

### User Features
- **Clock In/Out**: Manual clock in/out with automatic time entry creation
- **Time Entry Management**: Add, edit, and delete time entries with 15-minute increments
- **Weekly Dashboard**: View time entries organized by week
- **Common Works**: Create quick-add templates for frequent tasks
- **Leave Management**: Request time off and view leave balances
- **Time Zone Selection**: Set your local time zone (default: Nepal UTC+5:45)

### Admin Features
- **Dashboard**: Overview of pending approvals and employee statistics
- **Time Entry Approval**: Review and approve/reject employee time submissions
- **Leave Request Management**: Approve/reject employee leave requests
- **Leave Type Management**: Create and configure custom leave types
- **Leave Balance Allocation**: Allocate leave balances to employees
- **Client & Project Management**: Manage clients and projects for time tracking
- **User Management**: Create and manage employee accounts
- **Reports**: Generate detailed reports with CSV export

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Update `.env` with your database URL and JWT secret:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/time_tracking?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Create Admin User

```bash
npx prisma studio
```

Create a new user with role `ADMIN` in the database.

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Docker Deployment (Coolify)

### Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Next.js application

### Environment Variables for Production

Set these in Coolify:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/time_tracking?schema=public
JWT_SECRET=your-production-jwt-secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Time Entries
- `GET /api/time-entries` - Get user's time entries
- `POST /api/time-entries` - Create time entry
- `GET /api/time-entries/[id]` - Get time entry
- `PUT /api/time-entries/[id]` - Update time entry
- `DELETE /api/time-entries/[id]` - Delete time entry
- `POST /api/time-entries/submit` - Submit time entries for approval

### Clock Sessions
- `GET /api/clock-sessions` - Get clock sessions
- `POST /api/clock-sessions` - Clock in/out
- `PATCH /api/clock-sessions/[id]` - Cancel clock session

### Admin Routes
- `GET /api/admin/time-entries` - Get all time entries
- `POST /api/admin/time-entries` - Approve/reject time entries
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user

### Leave Management
- `GET /api/leave-types` - Get leave types
- `POST /api/leave-types` - Create leave type
- `GET /api/leave-balances` - Get leave balances
- `POST /api/leave-balances` - Allocate leave balance
- `GET /api/leave-requests` - Get leave requests
- `POST /api/leave-requests` - Create leave request
- `PATCH /api/leave-requests` - Approve/reject leave requests

### Common Works
- `GET /api/common-works` - Get common works
- `POST /api/common-works` - Create common work
- `PUT /api/common-works/[id]` - Update common work
- `DELETE /api/common-works/[id]` - Delete common work

## Default Time Zone

The application defaults to **Nepal Time (UTC+5:45)**. Users can change their time zone in Settings.

## License

MIT
