# Invoice Platform - Employee Dashboard

A modern employee time submission and invoicing platform built with Next.js, TypeScript, and Tailwind CSS.

## Features

### Dashboard
- **Welcome Section**: Displays employee name and last login information
- **Action Buttons**:
  - **Profile**: Navigate to employee profile page
  - **Submit Hours**: Open modal to submit new hours
- **Recent Submissions Table**: Shows all time submissions with:
  - Month/Date
  - Hours Submitted
  - Overtime Hours
  - Status (Submitted, Approved, Payment done)
  - Invoice (PDF link when available)
  - Actions (Delete button - only visible for "Submitted" status)

### Status Management
- **Submitted**: Newly submitted hours (can be deleted)
- **Approved**: Hours have been approved by admin
- **Payment done**: Payment has been processed and invoice is available

### Employee Profile
- View and edit employee information
- Update personal details (name, email, phone, address, department)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account and project
- Google OAuth credentials (for authentication)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. **Set up environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Then update `.env.local` with your actual credentials:
   - **Supabase keys**: Get from [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API
   - **Better Auth secret**: Generate with `openssl rand -base64 32`
   - **Google OAuth**: Set up in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   
   📖 **See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for detailed setup instructions and security guidelines.**

3. **Set up the database:**
   
   Run the Supabase migrations:
   ```bash
   npm run migrate
   ```
   
   Or manually run the SQL files in `/supabase/migrations/` in your Supabase SQL Editor.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Submitting Hours

1. Click the "Submit Hours" button on the dashboard
2. Select the month
3. Enter total hours submitted
4. Optionally enter overtime hours
5. Click "Submit"

### Managing Submissions

- **View Status**: Check the status badge in the table
- **View Invoice**: Click the paperclip icon to view PDF invoice (when available)
- **Delete Submission**: Only submissions with "Submitted" status can be deleted using the trash icon

### Profile Management

1. Click "Profile" button on the dashboard
2. Click "Edit Profile" to modify information
3. Make changes and click "Save Changes"

## Data Storage

The application uses Supabase (PostgreSQL) for data persistence:
- Employee profiles and authentication
- Time submissions and approvals
- Invoices and payment records
- Notifications and activity logs
- Holiday calendar

All database access is protected by Row Level Security (RLS) policies.

## Security & Environment Variables

🔐 **Important:** Never commit `.env.local` to version control. This file contains sensitive credentials.

For detailed information about:
- Environment variable setup
- Security classification of keys
- How to obtain credentials
- Key rotation procedures

👉 **See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)**

### Quick Security Reference:

**🔴 NEVER SHARE PUBLICLY:**
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

**🟢 SAFE TO EXPOSE (by design):**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_APP_URL`

## Technologies Used

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **TanStack Query**: Data fetching and caching
- **date-fns**: Date formatting utilities

### Backend & Database
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Better Auth**: Modern authentication library
- **Row Level Security (RLS)**: Database-level authorization

### Authentication
- **Google OAuth 2.0**: Single sign-on
- **Domain-restricted access**: Email domain verification
- **JWT tokens**: Secure session management

## Project Structure

```
Invoice_Platform/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication pages
│   ├── admin/               # Admin dashboard & management
│   ├── manager/             # Manager dashboard & team views
│   ├── api/                 # API routes
│   └── profile/             # User profile pages
├── components/              # React components
│   ├── admin/               # Admin-specific components
│   ├── employee/            # Employee-specific components
│   ├── ui/                  # Reusable UI components
│   └── notifications/       # Notification system
├── lib/                     # Utility libraries
│   ├── auth/                # Authentication utilities
│   ├── supabase/            # Supabase client & queries
│   ├── data/                # Data fetching functions
│   └── realtime/            # Real-time subscriptions
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
├── supabase/               # Database migrations & SQL
│   └── migrations/          # Version-controlled schema changes
├── .env.example            # Environment variables template
└── ENVIRONMENT_VARIABLES.md # Environment setup guide
```

## Features Implemented

✅ **Authentication**
- Google OAuth sign-in
- Domain-restricted access
- Role-based authorization (Admin, Manager, Employee)

✅ **Time Submission System**
- Employee time submission
- Manager approval workflow
- Admin oversight and control

✅ **Invoice Generation**
- Automated PDF invoice creation
- Invoice tracking and management

✅ **Notifications**
- Real-time notification system
- Status updates and alerts

✅ **Calendar Management**
- Holiday tracking
- Date-based submissions

✅ **Team Management**
- Manager-employee relationships
- Team hierarchy

## Future Enhancements

- Email notifications for status changes
- Bulk submission operations
- Advanced reporting and analytics
- Export functionality (CSV, Excel)
- Mobile app
- Integration with payment processors

## License

MIT

# Invoicing-Platform
# Invoicing-Platform
