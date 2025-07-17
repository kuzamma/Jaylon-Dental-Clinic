# 🚀 Jaylon Dental Clinic Setup Instructions

## Step 1: Supabase Project Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Configure Environment Variables**
   - Update your `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Step 2: Database Setup

1. **Run Existing Migrations**
   - Go to Supabase Dashboard → SQL Editor
   - Run the existing migration files in order:
     - `20250628080521_royal_grove.sql` (Schema)
     - `20250628080601_icy_cell.sql` (Sample Data)
     - `20250628092000_fix_admin_setup.sql` (Fixed Admin Setup)

## Step 3: Create Admin User

### ✅ **CORRECT METHOD - Follow This Order:**

1. **First: Create Auth User in Supabase**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add User"
   - Email: `admin@jaylondental.com`
   - Password: `admin123`
   - ✅ **Make sure "Email Confirm" is checked**
   - Click "Create User"
   - **Copy the generated UUID** (you'll need this)

2. **Second: Create User Records**
   - Go to SQL Editor
   - Run this command:
   ```sql
   SELECT create_admin_user_record('PASTE_THE_UUID_HERE');
   ```
   - Replace `PASTE_THE_UUID_HERE` with the actual UUID from step 1

### Alternative: Automatic Setup (if auth user already exists)

If you've already created the auth user, just run:
```sql
SELECT setup_admin_if_exists();
```

## Step 4: Verify Setup

1. **Check the Setup**
   ```sql
   -- Verify admin user exists in all tables
   SELECT 'auth.users' as table_name, count(*) as count 
   FROM auth.users WHERE email = 'admin@jaylondental.com'
   UNION ALL
   SELECT 'users' as table_name, count(*) as count 
   FROM users WHERE email = 'admin@jaylondental.com'
   UNION ALL
   SELECT 'owners' as table_name, count(*) as count 
   FROM owners WHERE email = 'admin@jaylondental.com';
   ```

2. **Test Login**
   - Start your application: `npm run dev`
   - Try logging in with:
     - Email: `admin@jaylondental.com`
     - Password: `admin123`

## Step 5: Additional Users (Optional)

To create employee users:

1. **Create Auth User**
   - Go to Supabase Dashboard → Authentication → Users
   - Create user with email/password

2. **Create Employee Record**
   ```sql
   -- Replace with actual auth user ID and employee details
   INSERT INTO users (user_id, username, email, role, is_active) 
   VALUES ('AUTH_USER_ID', 'username', 'email@example.com', 'employee', true);
   
   INSERT INTO employees (user_id, lname, fname, email_address, role, position, department, hourly_rate, hire_date, status)
   VALUES ((SELECT id FROM users WHERE email = 'email@example.com'), 'LastName', 'FirstName', 'email@example.com', 'Employee', 'Position', 'Department', 20.00, CURRENT_DATE, 'Active');
   ```

## 🔧 Troubleshooting

### ❌ **Common Errors and Solutions:**

1. **"Key (user_id)=(...) is not present in table users"**
   - **Cause:** Trying to create owner before user record
   - **Solution:** Always create auth user first, then use the new migration

2. **"User not found in system"**
   - **Cause:** User exists in auth but not in users table
   - **Solution:** Run `SELECT create_admin_user_record('AUTH_USER_ID');`

3. **"Access denied: Admin privileges required"**
   - **Cause:** User role is not 'admin' or 'owner'
   - **Solution:** Update user role: `UPDATE users SET role = 'admin' WHERE email = 'admin@jaylondental.com';`

### 🔄 **Reset Database (if needed):**

```sql
-- Clear all data and start fresh
TRUNCATE users, employees, owners, schedules, attendance, payroll, payroll_deductions CASCADE;
-- Then re-run the setup process
```

### 🔍 **Debug Commands:**

```sql
-- Check auth users
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@jaylondental.com';

-- Check our users table
SELECT * FROM users WHERE email = 'admin@jaylondental.com';

-- Check owners table
SELECT * FROM owners WHERE email = 'admin@jaylondental.com';
```

## 📞 Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify all environment variables
3. Ensure migrations ran successfully
4. Check browser console for errors
5. Use the debug commands above

## ✅ **Success Checklist:**

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] All migrations run successfully
- [ ] Auth user created in Supabase Dashboard
- [ ] User records created with `create_admin_user_record()`
- [ ] Login test successful

Your Jaylon Dental Clinic system should now be ready! 🎉