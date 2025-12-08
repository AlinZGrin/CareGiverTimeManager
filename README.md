# Caregiver Time Manager

A responsive web application to track time, manage hourly rates, calculate payroll, and schedule shifts for home health aides.

## Features

### Authentication & User Management
- **Simple Caregiver Login**: Caregivers log in using Phone Number + 4-digit PIN
- **Admin Role Management**: Admins access via email/password with full system permissions
- **Manage Caregiver Profiles**: Create, edit, and deactivate caregiver profiles with hourly rates
- **Update Caregiver Rates**: Edit hourly rates inline with save/cancel functionality
- **Toggle Caregiver Status**: Activate or deactivate caregivers with one click
- **Delete Caregivers**: Remove caregiver profiles (with confirmation)
- **Credential Management (Admin)**: Update email/password for admins and phone/PIN for caregivers
- **Self-Service Credentials (Caregiver)**: Caregivers can update their own phone number and PIN

### Time & Attendance (Caregiver View)
- **One-Tap Clock In/Out**: Large, mobile-friendly buttons to start and end shifts
- **Active Shift Indicator**: Real-time timer showing elapsed shift time
- **Shift Summary**: Automatic calculation of hours worked and estimated pay after clock-out

### Shift Scheduling
- **FR-14: Publish Open Shifts**: Admins can create and publish shift slots for specific dates/times
- **Edit Scheduled Shifts**: Update shift date, time, and name before assignment
- **Delete Scheduled Shifts**: Remove scheduled shifts with confirmation
- **FR-15: View Available Shifts**: Caregivers can see open shifts and their assigned shifts in a calendar view
- **FR-16: Self-Assignment (Claim Button)**: Caregivers can claim open shifts with one tap
- **FR-17: Shift Drop/Cancellation**: Caregivers can drop shifts if >24 hours before start time
- **FR-18: Conflict Prevention**: System prevents caregivers from claiming overlapping shifts

### Financial Management (Admin View)
- **Variable Rate Management**: Set unique hourly pay rates for each caregiver
- **Manual Shift Entry/Edit**: Add or modify shifts when needed
- **Total Owed Dashboard**: Real-time display of total unpaid liability

### Payroll & Reporting
- **Date Range Filtering**: View hours and costs for specific time periods
- **Mark as Paid**: Archive paid shifts and update liability calculations
- **Payroll Export**: Clean table view for screenshots or printing

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Default Login Credentials

### Admin
- Email: `admin@example.com`
- Password: `password123`

### Caregivers
- **Jane Doe**: Phone `5551234`, PIN `1234` (Rate: $25/hr)
- **John Smith**: Phone `5555678`, PIN `5678` (Rate: $28/hr)

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin dashboard with scheduling
│   ├── caregiver/      # Caregiver time clock and shift view
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Login page
├── context/
│   └── AuthContext.tsx # Authentication context
├── services/
│   └── mockData.ts     # Local storage service with shift scheduling
├── types/
│   └── index.ts        # TypeScript type definitions
└── utils/
    └── shiftUtils.ts   # Shift formatting and validation utilities
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Browser LocalStorage (mock database)
- **State Management**: React Context API

## Key Features Implementation

### Shift Scheduling Flow

1. **Admin creates open shift** (Schedule tab)
   - Selects date, start time, end time, and optional shift name
   - Shift appears as "Open" in the schedule

2. **Caregiver views available shifts** (Schedule tab)
   - Sees only open shifts and their own assigned shifts
   - Green cards for open shifts, blue cards for assigned shifts

3. **Caregiver claims shift** (Claim button)
   - System checks for conflicts with existing shifts
   - If no conflict, shift is assigned instantly
   - Shift becomes unavailable to other caregivers

4. **Caregiver can drop shift** (Drop button)
   - Only available if >24 hours before shift start
   - If <24 hours, message directs to contact admin
   - Dropped shifts revert to "Open" status

### Conflict Prevention

The system automatically prevents caregivers from:
- Claiming shifts that overlap with their existing shifts
- Double-booking themselves
- Creating scheduling conflicts

## Development Notes

- Data persists in browser LocalStorage
- All timestamps stored in ISO format (UTC)
- Mobile-first responsive design
- Real-time updates without page refresh

## Learn More

To learn more about Next.js:
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
