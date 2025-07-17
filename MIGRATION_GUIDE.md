# 🚀 Supabase Database Migration Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or create an account
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: `jaylon-dental-clinic`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
7. Click "Create new project"

## Step 2: Get Your Project Credentials

1. Once your project is created, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the content from `supabase/migrations/20250628080521_royal_grove.sql`
4. Click "Run" to execute the schema creation
5. Create another new query
6. Copy and paste the content from `supabase/migrations/20250628080601_icy_cell.sql`
7. Click "Run" to insert sample data

## Step 5: Verify Database Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see all the following tables:
   - ✅ `users`
   - ✅ `employees`
   - ✅ `owners`
   - ✅ `schedules`
   - ✅ `attendance`
   - ✅ `payroll`
   - ✅ `payroll_deductions`
   - ✅ `deductions`

## Step 6: Test the Connection

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. The application should now connect to your Supabase database!

## 🔐 Security Features Enabled

- ✅ Row Level Security (RLS) on all tables
- ✅ Role-based access policies
- ✅ Employee data isolation
- ✅ Admin override capabilities

## 📊 Sample Data Included

- ✅ 3 sample employees with different roles
- ✅ Standard deduction types (Federal Tax, Social Security, etc.)
- ✅ Sample schedules and attendance records
- ✅ Payroll data with deductions

## 🚨 Important Notes

1. **Keep your credentials secure** - Never commit the actual `.env` file to version control
2. **Database Password** - Save your database password securely, you'll need it for direct database access
3. **API Keys** - The anon key is safe for client-side use, but keep your service role key private
4. **RLS Policies** - All tables have Row Level Security enabled for data protection

## 🔧 Troubleshooting

### Connection Issues
- Verify your project URL and anon key are correct
- Check that your project is not paused (free tier projects pause after inactivity)
- Ensure you're using the correct environment variable names

### Migration Issues
- Make sure to run migrations in order
- Check the SQL Editor for any error messages
- Verify all foreign key relationships are properly created

### Authentication Issues
- Confirm RLS policies are properly set up
- Check user roles and permissions
- Verify the auth.users table integration

## 📞 Support

If you encounter any issues:
1. Check the Supabase dashboard logs
2. Review the browser console for errors
3. Verify all environment variables are set correctly
4. Ensure the database migrations completed successfully

Your Jaylon Dental Clinic Employee Management System is now ready to use with a fully configured Supabase backend! 🎉