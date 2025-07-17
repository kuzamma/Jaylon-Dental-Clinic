# Jaylon Dental Clinic - Employee Management System

A comprehensive employee management system built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### 🏥 **Core Functionality**
- **Employee Management**: Complete CRUD operations for employee records
- **Smart Scheduling**: Automated scheduling with workload balancing
- **Time Tracking**: Clock in/out with QR code support and attendance rules
- **Payroll Processing**: Automated payroll calculation with deductions
- **Comprehensive Reports**: Detailed analytics and reporting

### 🤖 **Intelligent Features**
- **Auto-Scheduling**: AI-powered schedule generation with workload balancing
- **Attendance Rules**: Configurable time rules with grace periods and overtime
- **Conflict Detection**: Automatic scheduling conflict identification
- **Workload Analytics**: Real-time employee workload balance scoring

### 🔐 **Security & Access Control**
- **Role-Based Access**: Admin, Employee, and Owner roles
- **Row Level Security**: Database-level security policies
- **Secure Authentication**: Supabase Auth integration

## Database Schema

The system implements a comprehensive database schema based on the provided Entity Relationship Diagram:

### **Core Tables**
- `users` - System authentication and user roles
- `employees` - Employee personal and employment information
- `owners` - System administrators/owners
- `schedules` - Work schedules and shift management
- `attendance` - Time tracking and attendance records
- `payroll` - Payroll processing and calculations
- `payroll_deductions` - Individual payroll deduction records
- `deductions` - Standard deduction types and rates

### **Key Relationships**
- Employees linked to users for authentication
- Schedules and attendance tied to specific employees
- Payroll records with detailed deduction breakdowns
- Proper foreign key constraints and cascading deletes

## Setup Instructions

### 1. **Supabase Setup**
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Run the migration files in the Supabase SQL editor:
   - `supabase/migrations/create_employee_management_schema.sql`
   - `supabase/migrations/insert_sample_data.sql`

### 2. **Environment Configuration**
1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. **Installation & Development**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### **Admin Features**
- Complete employee management (CRUD operations)
- Automated schedule generation with workload balancing
- Attendance monitoring and reporting
- Payroll processing and management
- Comprehensive analytics and reports

### **Employee Features**
- Personal dashboard with real-time information
- Clock in/out functionality with QR code support
- Schedule viewing and attendance history
- Pay stub access and download
- Profile management

## Database Features

### **Advanced Functionality**
- **Automated Calculations**: Payroll, overtime, and deductions
- **Audit Trails**: Automatic timestamp tracking
- **Data Integrity**: Comprehensive constraints and validations
- **Performance Optimization**: Strategic indexing for fast queries

### **Security Implementation**
- **Row Level Security (RLS)**: Enabled on all tables
- **Role-Based Policies**: Granular access control
- **Data Protection**: Employees can only access their own data
- **Admin Override**: Administrators have full system access

## API Services

The system includes comprehensive service layers:

- **EmployeeService**: Employee CRUD, scheduling, attendance, payroll
- **AuthService**: Authentication, user management, role assignment
- **ReportService**: Analytics, reporting, dashboard statistics

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

## Sample Data

The system includes comprehensive sample data:
- 3 sample employees with different roles
- Weekly schedules and attendance records
- Payroll records with detailed deductions
- Standard deduction types (Federal Tax, Social Security, Medicare, etc.)

## Production Considerations

- All database constraints and validations implemented
- Comprehensive error handling
- Optimized queries with proper indexing
- Scalable architecture for growth
- Security best practices implemented

This system provides a complete, production-ready employee management solution with advanced features for modern dental clinic operations.