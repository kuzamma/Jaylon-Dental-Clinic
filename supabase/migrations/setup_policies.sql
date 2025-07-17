/*
  # Employee Management System - Row Level Security Policies
  
  This migration sets up comprehensive Row Level Security (RLS) policies for the employee management system.
  
  ## Security Model:
  - **Employees**: Can only access their own data
  - **Admins & Owners**: Have identical full administrative privileges
  - **All authenticated users**: Can read standard deduction types
  
  ## Policy Structure:
  1. Helper functions for role checking
  2. Employee self-access policies  
  3. Admin/Owner full access policies
  4. Debug and utility functions
*/

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================================================

-- Function to check if current user has admin or owner privileges
-- Both roles have identical permissions in this system
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  );
$$;

-- Alias function for clarity
CREATE OR REPLACE FUNCTION has_admin_privileges()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT is_admin_or_owner();
$$;

-- Function to get current user's record ID from users table
CREATE OR REPLACE FUNCTION get_current_user_record_id()
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT id 
  FROM public.users 
  WHERE user_id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$$;

-- Function to check if user is a specific role
CREATE OR REPLACE FUNCTION is_role(check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE user_id = auth.uid() 
    AND role = check_role
    AND is_active = true
  );
$$;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins and owners can read all users
CREATE POLICY "Admins and owners can read all users" ON users
  FOR SELECT TO authenticated
  USING (is_admin_or_owner());

-- Admins and owners can manage all users (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins and owners can manage all users" ON users
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================

-- Employees can read their own employee data
CREATE POLICY "Employees can read own data" ON employees
  FOR SELECT TO authenticated
  USING (user_id = get_current_user_record_id());

-- Admins and owners can manage all employees (full CRUD)
CREATE POLICY "Admins and owners can manage all employees" ON employees
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- OWNERS TABLE POLICIES
-- ============================================================================

-- Owners can read their own data
CREATE POLICY "Owners can read own data" ON owners
  FOR SELECT TO authenticated
  USING (user_id = get_current_user_record_id());

-- Admins and owners can manage all owner records
CREATE POLICY "Admins and owners can manage all owners" ON owners
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- SCHEDULES TABLE POLICIES
-- ============================================================================

-- Employees can read their own schedules
CREATE POLICY "Employees can read own schedules" ON schedules
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees 
      WHERE user_id = get_current_user_record_id()
    )
  );

-- Admins and owners can manage all schedules
CREATE POLICY "Admins and owners can manage all schedules" ON schedules
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- ATTENDANCE TABLE POLICIES
-- ============================================================================

-- Employees can read their own attendance records
CREATE POLICY "Employees can read own attendance" ON attendance
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees 
      WHERE user_id = get_current_user_record_id()
    )
  );

-- Employees can update their own attendance (for clock in/out)
CREATE POLICY "Employees can update own attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees 
      WHERE user_id = get_current_user_record_id()
    )
  );

-- Employees can insert their own attendance records (for clock in)
CREATE POLICY "Employees can create own attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM employees 
      WHERE user_id = get_current_user_record_id()
    )
  );

-- Admins and owners can manage all attendance records
CREATE POLICY "Admins and owners can manage all attendance" ON attendance
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- PAYROLL TABLE POLICIES
-- ============================================================================

-- Employees can read their own payroll records
CREATE POLICY "Employees can read own payroll" ON payroll
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees 
      WHERE user_id = get_current_user_record_id()
    )
  );

-- Admins and owners can manage all payroll records
CREATE POLICY "Admins and owners can manage all payroll" ON payroll
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- PAYROLL DEDUCTIONS TABLE POLICIES
-- ============================================================================

-- Employees can read their own payroll deductions
CREATE POLICY "Employees can read own payroll deductions" ON payroll_deductions
  FOR SELECT TO authenticated
  USING (
    payroll_id IN (
      SELECT p.payroll_id FROM payroll p
      JOIN employees e ON p.employee_id = e.employee_id
      WHERE e.user_id = get_current_user_record_id()
    )
  );

-- Admins and owners can manage all payroll deductions
CREATE POLICY "Admins and owners can manage all payroll deductions" ON payroll_deductions
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- DEDUCTIONS TABLE POLICIES
-- ============================================================================

-- All authenticated users can read deduction types (needed for payroll calculations)
CREATE POLICY "All users can read deductions" ON deductions
  FOR SELECT TO authenticated
  USING (true);

-- Only admins and owners can manage deduction types
CREATE POLICY "Admins and owners can manage all deductions" ON deductions
  FOR ALL TO authenticated
  USING (is_admin_or_owner());

-- ============================================================================
-- UTILITY AND DEBUG FUNCTIONS
-- ============================================================================

-- Function to create admin user records after auth user is created
CREATE OR REPLACE FUNCTION create_admin_user_record(auth_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_record_id uuid;
  result_message text;
BEGIN
  -- Insert into users table and get the generated ID
  INSERT INTO users (user_id, username, email, role, is_active) 
  VALUES (auth_user_id, 'admin', 'admin@jaylondental.com', 'admin', true)
  ON CONFLICT (email) DO UPDATE SET
    user_id = auth_user_id,
    role = 'admin',
    is_active = true
  RETURNING id INTO new_user_record_id;
  
  -- If no ID was returned (due to conflict), get the existing one
  IF new_user_record_id IS NULL THEN
    SELECT id INTO new_user_record_id FROM users WHERE email = 'admin@jaylondental.com';
  END IF;
  
  -- Verify we have a user record ID
  IF new_user_record_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or find user record';
  END IF;
  
  -- Insert into owners table using the users.id
  INSERT INTO owners (user_id, lname, fname, mname, contact_number, email) 
  VALUES (new_user_record_id, 'Admin', 'System', NULL, '9154558822', 'admin@jaylondental.com')
  ON CONFLICT (user_id) DO UPDATE SET
    lname = 'Admin',
    fname = 'System',
    email = 'admin@jaylondental.com';
    
  result_message := 'SUCCESS: Admin user records created. Auth ID: ' || auth_user_id || ', User Record ID: ' || new_user_record_id;
  RETURN result_message;
END;
$$;

-- Function to setup admin user if auth user exists
CREATE OR REPLACE FUNCTION setup_admin_if_exists()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_auth_id uuid;
  result_message text;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_auth_id 
  FROM auth.users 
  WHERE email = 'admin@jaylondental.com';
  
  IF admin_auth_id IS NOT NULL THEN
    -- Admin user exists, create the records
    SELECT create_admin_user_record(admin_auth_id) INTO result_message;
    RETURN result_message;
  ELSE
    result_message := 'ERROR: Admin auth user not found. Please create user with email admin@jaylondental.com in Supabase Auth first.';
    RETURN result_message;
  END IF;
END;
$$;

-- Debug function to check user permissions and setup
CREATE OR REPLACE FUNCTION debug_user_permissions()
RETURNS table(
  auth_user_id uuid,
  user_record_exists boolean,
  user_role text,
  is_active boolean,
  has_admin_privileges boolean,
  can_manage_employees boolean,
  can_manage_schedules boolean,
  can_manage_payroll boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  current_auth_id uuid := auth.uid();
  user_rec record;
  admin_privs boolean;
BEGIN
  -- Get user record
  SELECT role, is_active INTO user_rec
  FROM public.users 
  WHERE user_id = current_auth_id;
  
  -- Check admin privileges
  admin_privs := is_admin_or_owner();
  
  RETURN QUERY
  SELECT 
    current_auth_id,
    (user_rec IS NOT NULL),
    COALESCE(user_rec.role, 'none'),
    COALESCE(user_rec.is_active, false),
    admin_privs,
    admin_privs, -- can_manage_employees
    admin_privs, -- can_manage_schedules  
    admin_privs  -- can_manage_payroll
  ;
END;
$$;

-- Debug function to check admin setup status
CREATE OR REPLACE FUNCTION debug_admin_setup()
RETURNS table(
  table_name text,
  record_count bigint,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'auth.users'::text as table_name,
    count(*)::bigint as record_count,
    COALESCE(string_agg(id::text, ', '), 'None')::text as details
  FROM auth.users 
  WHERE email = 'admin@jaylondental.com'
  
  UNION ALL
  
  SELECT 
    'users'::text as table_name,
    count(*)::bigint as record_count,
    COALESCE(string_agg(id::text || ' (auth_id: ' || user_id::text || ')', ', '), 'None')::text as details
  FROM users 
  WHERE email = 'admin@jaylondental.com'
  
  UNION ALL
  
  SELECT 
    'owners'::text as table_name,
    count(*)::bigint as record_count,
    COALESCE(string_agg(user_id::text, ', '), 'None')::text as details
  FROM owners 
  WHERE email = 'admin@jaylondental.com';
END;
$$;

-- ============================================================================
-- HELPFUL COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION is_admin_or_owner() IS 'Returns true if the current user has either admin or owner role. Both roles have identical administrative privileges.';
COMMENT ON FUNCTION has_admin_privileges() IS 'Alias for is_admin_or_owner(). Both admin and owner roles have the same privileges.';
COMMENT ON FUNCTION get_current_user_record_id() IS 'Returns the users.id for the current authenticated user (not auth.users.id).';
COMMENT ON FUNCTION create_admin_user_record(uuid) IS 'Creates user and owner records for an existing auth user. Use after creating user in Supabase Auth.';
COMMENT ON FUNCTION setup_admin_if_exists() IS 'Automatically sets up admin user records if auth user exists.';
COMMENT ON FUNCTION debug_user_permissions() IS 'Debug function to check current user permissions and capabilities.';
COMMENT ON FUNCTION debug_admin_setup() IS 'Debug function to check admin user setup status across all tables.';

-- Try to setup admin user if auth user exists
SELECT setup_admin_if_exists() as setup_result;