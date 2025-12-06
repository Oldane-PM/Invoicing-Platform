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

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

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

All data is stored in browser localStorage, including:
- Employee submissions
- Employee profile information
- Last login timestamp

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **date-fns**: Date formatting utilities
- **uuid**: Unique ID generation

## Project Structure

```
Invoice_Platform/
├── app/
│   ├── page.tsx          # Main dashboard
│   ├── profile/          # Employee profile page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Future Enhancements

- Backend API integration
- User authentication
- PDF invoice generation
- Email notifications
- Admin approval workflow
- Payment tracking
- Export functionality

## License

MIT

# Invoicing-Platform
# Invoicing-Platform
