/*
  # 🏥 Jaylon Dental Clinic - Complete Database Setup Script
  
  This is the final, comprehensive setup script that creates everything needed
  for the Employee Management System with QR code attendance and payroll.
  
  ## 🚀 Features Included:
  - Complete database schema with all tables
  - Simple password-based authentication (no Supabase Auth dependency)
  - QR code attendance system
  - Payroll management with deductions
  - Employee profile management
  - Comprehensive sample data
  - Admin and employee accounts
  - All necessary functions and procedures
  
  ## 📋 Tables Created:
  1. users - System authentication and user roles
  2. employees - Employee details and employment information
  3. owners - System administrators/owners
  4. schedules - Employee work schedules and shifts
  5. attendance - QR code attendance tracking with time calculations
  6. payroll - Employee payroll records with calculations
  7. payroll_deductions - Individual payroll deduction records
  8. deductions - Standard deduction types and rates
  
  ## 🔐 Default Accounts:
  - Admin: admin@jaylondental.com / admin123
  - Employee: sarah.johnson@jaylondental.com / employee123
  - Employee: mike.chen@jaylondental.com / employee123
  - Employee: lisa.garcia@jaylondental.com / employee123
*/

-- ============================================================================
-- 🧹 CLEANUP: Remove existing data and tables
-- ============================================================================

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS payroll_deductions CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS deductions CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS authenticate_user(text, text);
DROP FUNCTION IF EXISTS create_user_with_password(text, text, text, text);
DROP FUNCTION IF EXISTS update_user_password(uuid, text);
DROP FUNCTION IF EXISTS create_employee_with_user(text, text, text, text, text, text, decimal, date, text);
DROP FUNCTION IF EXISTS delete_user_completely(uuid);
DROP FUNCTION IF EXISTS deactivate_user_safely(uuid);
DROP FUNCTION IF EXISTS preview_user_deletion(uuid);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- 📊 CREATE CORE TABLES
-- ============================================================================

-- Users table (system authentication without Supabase Auth dependency)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(50) UNIQUE NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  role varchar(20) DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'owner')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employees table
CREATE TABLE employees (
  employee_id serial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  lname varchar(50) NOT NULL,
  fname varchar(50) NOT NULL,
  mname varchar(20),
  date_of_birth date,
  role varchar(50) NOT NULL,
  email_address varchar(100) UNIQUE NOT NULL,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  phone_number varchar(20),
  status varchar(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Terminated')),
  base_salary decimal(10,2) DEFAULT 0,
  payment_type varchar(20) DEFAULT 'hourly' CHECK (payment_type IN ('hourly', 'salary', 'contract')),
  hourly_rate decimal(8,2) DEFAULT 0,
  department varchar(50),
  position varchar(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Owners table
CREATE TABLE owners (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lname varchar(50) NOT NULL,
  fname varchar(50) NOT NULL,
  mname varchar(50),
  contact_number varchar(15),
  email varchar(50) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Schedules table
CREATE TABLE schedules (
  schedule_id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(employee_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_time varchar(20),
  click_location varchar(100),
  status varchar(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attendance table (QR code compatible)
CREATE TABLE attendance (
  attendance_id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(employee_id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  check_in_am_pm time,
  check_out_am_pm time,
  total_worked_hours decimal(5,2),
  overtime_hours decimal(5,2) DEFAULT 0,
  regular_hours decimal(5,2) DEFAULT 0,
  late_minutes integer DEFAULT 0,
  status varchar(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  qr_scan_data jsonb, -- Store QR code scan information
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deductions table (standard deduction types)
CREATE TABLE deductions (
  id_deduct serial PRIMARY KEY,
  deduction_name varchar(50) UNIQUE NOT NULL,
  ded_amount decimal(10,2) DEFAULT 0.00,
  sss decimal(10,2) DEFAULT 0.00,
  pag_ibig decimal(10,2) DEFAULT 0.00,
  philhealth decimal(10,2) DEFAULT 0.00,
  is_percentage boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Payroll table
CREATE TABLE payroll (
  payroll_id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(employee_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  base_salary decimal(10,2) NOT NULL,
  regular_hours decimal(5,2) DEFAULT 0,
  overtime_hours decimal(5,2) DEFAULT 0,
  regular_pay decimal(10,2) DEFAULT 0,
  overtime_pay decimal(10,2) DEFAULT 0,
  gross_pay decimal(10,2) DEFAULT 0,
  total_deductions decimal(10,2) DEFAULT 0,
  net_pay decimal(10,2) DEFAULT 0,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll deductions table (links payroll to specific deductions)
CREATE TABLE payroll_deductions (
  id_deduct serial PRIMARY KEY,
  payroll_id integer REFERENCES payroll(payroll_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  deduction_id integer REFERENCES deductions(id_deduct),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 🚀 CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_email ON employees(email_address);
CREATE INDEX idx_schedules_employee_date ON schedules(employee_id, work_date);
CREATE INDEX idx_schedules_date ON schedules(work_date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_payroll_employee_period ON payroll(employee_id, pay_period_start, pay_period_end);
CREATE INDEX idx_payroll_deductions_payroll ON payroll_deductions(payroll_id);
CREATE INDEX idx_owners_email ON owners(email);

-- ============================================================================
-- ⚡ CREATE AUTOMATIC TIMESTAMP UPDATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 🔐 AUTHENTICATION FUNCTIONS
-- ============================================================================

-- Simple authentication function (no Supabase Auth dependency)
CREATE OR REPLACE FUNCTION authenticate_user(user_email text, user_password text)
RETURNS table(
  user_id uuid,
  username text,
  email text,
  role text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    u.is_active
  FROM users u
  WHERE u.email = user_email 
    AND u.password = user_password 
    AND u.is_active = true;
END;
$$;

-- Function to create user with password
CREATE OR REPLACE FUNCTION create_user_with_password(
  p_username text,
  p_email text,
  p_password text,
  p_role text DEFAULT 'employee'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO users (username, email, password, role, is_active)
  VALUES (p_username, p_email, p_password, p_role, true)
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Function to update user password
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET password = p_new_password
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- 👥 EMPLOYEE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to create complete employee with user account
CREATE OR REPLACE FUNCTION create_employee_with_user(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_position text DEFAULT 'Employee',
  p_department text DEFAULT 'General',
  p_hourly_rate decimal(8,2) DEFAULT 15.00,
  p_hire_date date DEFAULT CURRENT_DATE,
  p_password text DEFAULT 'employee123'
)
RETURNS table(
  user_id uuid,
  employee_id integer,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  new_employee_id integer;
  username_val text;
BEGIN
  -- Generate username from name
  username_val := lower(p_first_name) || '.' || lower(p_last_name);
  
  -- Generate new UUID for user
  new_user_id := gen_random_uuid();
  
  -- Create user record first
  INSERT INTO users (id, username, email, password, role, is_active)
  VALUES (new_user_id, username_val, p_email, p_password, 'employee', true);
  
  -- Create employee record with the user_id pointing to users.id
  INSERT INTO employees (
    user_id, lname, fname, role, email_address, hire_date, 
    phone_number, status, base_salary, payment_type, hourly_rate, 
    department, position
  ) VALUES (
    new_user_id, p_last_name, p_first_name, p_position, p_email, p_hire_date,
    p_phone, 'Active', 0, 'hourly', p_hourly_rate,
    p_department, p_position
  ) RETURNING employee_id INTO new_employee_id;
  
  RETURN QUERY
  SELECT 
    new_user_id,
    new_employee_id,
    true as success,
    'Employee and user account created successfully' as message;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT 
      NULL::uuid,
      NULL::integer,
      false as success,
      SQLERRM as message;
END;
$$;

-- ============================================================================
-- 🗑️ USER DELETION FUNCTIONS
-- ============================================================================

-- Function to preview what would be deleted
CREATE OR REPLACE FUNCTION preview_user_deletion(target_user_id uuid)
RETURNS table(
  table_name text,
  record_count integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_record record;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
    RETURN QUERY
    SELECT 
      'ERROR'::text as table_name,
      0 as record_count,
      'User not found'::text as details;
    RETURN;
  END IF;

  -- Get employee record if exists
  SELECT * INTO employee_record FROM employees WHERE user_id = target_user_id;

  -- Return preview of what would be deleted
  RETURN QUERY
  SELECT 'users'::text, 1::integer, 'Main user account'::text
  
  UNION ALL
  
  SELECT 
    'employees'::text,
    (SELECT COUNT(*)::integer FROM employees WHERE user_id = target_user_id),
    'Employee profile and employment data'::text
  
  UNION ALL
  
  SELECT 
    'owners'::text,
    (SELECT COUNT(*)::integer FROM owners WHERE user_id = target_user_id),
    'Owner/admin privileges'::text
  
  UNION ALL
  
  SELECT 
    'schedules'::text,
    CASE 
      WHEN employee_record IS NOT NULL THEN 
        (SELECT COUNT(*)::integer FROM schedules WHERE employee_id = employee_record.employee_id)
      ELSE 0
    END,
    'Work schedules and shifts'::text
  
  UNION ALL
  
  SELECT 
    'attendance'::text,
    CASE 
      WHEN employee_record IS NOT NULL THEN 
        (SELECT COUNT(*)::integer FROM attendance WHERE employee_id = employee_record.employee_id)
      ELSE 0
    END,
    'Attendance records and time tracking'::text
  
  UNION ALL
  
  SELECT 
    'payroll'::text,
    CASE 
      WHEN employee_record IS NOT NULL THEN 
        (SELECT COUNT(*)::integer FROM payroll WHERE employee_id = employee_record.employee_id)
      ELSE 0
    END,
    'Payroll records and payments'::text
  
  UNION ALL
  
  SELECT 
    'payroll_deductions'::text,
    CASE 
      WHEN employee_record IS NOT NULL THEN 
        (SELECT COUNT(*)::integer FROM payroll_deductions pd 
         JOIN payroll p ON pd.payroll_id = p.payroll_id 
         WHERE p.employee_id = employee_record.employee_id)
      ELSE 0
    END,
    'Individual payroll deduction records'::text;
END;
$$;

-- Function to completely delete user and all related data
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id uuid)
RETURNS table(
  success boolean,
  message text,
  deleted_records jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_record record;
  deleted_counts jsonb := '{}';
  payroll_deductions_count integer := 0;
  payroll_count integer := 0;
  attendance_count integer := 0;
  schedules_count integer := 0;
  employees_count integer := 0;
  owners_count integer := 0;
  users_count integer := 0;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
    RETURN QUERY
    SELECT 
      false as success,
      'User not found' as message,
      '{}'::jsonb as deleted_records;
    RETURN;
  END IF;

  -- Get employee record if exists (for counting related records)
  SELECT * INTO employee_record FROM employees WHERE user_id = target_user_id;

  -- Count and delete related records
  IF employee_record IS NOT NULL THEN
    -- Count payroll deductions
    SELECT COUNT(*) INTO payroll_deductions_count
    FROM payroll_deductions pd
    JOIN payroll p ON pd.payroll_id = p.payroll_id
    WHERE p.employee_id = employee_record.employee_id;

    -- Count payroll records
    SELECT COUNT(*) INTO payroll_count
    FROM payroll
    WHERE employee_id = employee_record.employee_id;

    -- Count attendance records
    SELECT COUNT(*) INTO attendance_count
    FROM attendance
    WHERE employee_id = employee_record.employee_id;

    -- Count schedule records
    SELECT COUNT(*) INTO schedules_count
    FROM schedules
    WHERE employee_id = employee_record.employee_id;
  END IF;

  -- Count owner records
  SELECT COUNT(*) INTO owners_count
  FROM owners
  WHERE user_id = target_user_id;

  -- Count employee records
  SELECT COUNT(*) INTO employees_count
  FROM employees
  WHERE user_id = target_user_id;

  -- Delete the user (this will cascade to all related tables due to foreign keys)
  DELETE FROM users WHERE id = target_user_id;
  GET DIAGNOSTICS users_count = ROW_COUNT;

  -- Build the deleted records summary
  deleted_counts := jsonb_build_object(
    'users', users_count,
    'employees', employees_count,
    'owners', owners_count,
    'schedules', schedules_count,
    'attendance', attendance_count,
    'payroll', payroll_count,
    'payroll_deductions', payroll_deductions_count
  );

  RETURN QUERY
  SELECT 
    true as success,
    'User and all related data deleted successfully' as message,
    deleted_counts as deleted_records;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT 
      false as success,
      SQLERRM as message,
      '{}'::jsonb as deleted_records;
END;
$$;

-- Function to soft delete users (deactivate instead of delete)
CREATE OR REPLACE FUNCTION deactivate_user_safely(target_user_id uuid)
RETURNS table(
  success boolean,
  message text,
  affected_records jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_counts jsonb := '{}';
  users_count integer := 0;
  employees_count integer := 0;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
    RETURN QUERY
    SELECT 
      false as success,
      'User not found' as message,
      '{}'::jsonb as affected_records;
    RETURN;
  END IF;

  -- Deactivate user
  UPDATE users 
  SET is_active = false, updated_at = now()
  WHERE id = target_user_id;
  GET DIAGNOSTICS users_count = ROW_COUNT;

  -- Deactivate employee if exists
  UPDATE employees 
  SET status = 'Terminated', updated_at = now()
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS employees_count = ROW_COUNT;

  -- Build the affected records summary
  affected_counts := jsonb_build_object(
    'users_deactivated', users_count,
    'employees_terminated', employees_count
  );

  RETURN QUERY
  SELECT 
    true as success,
    'User safely deactivated (soft delete)' as message,
    affected_counts as affected_records;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT 
      false as success,
      SQLERRM as message,
      '{}'::jsonb as affected_records;
END;
$$;

-- ============================================================================
-- 📊 INSERT STANDARD DEDUCTION TYPES
-- ============================================================================

INSERT INTO deductions (deduction_name, ded_amount, sss, pag_ibig, philhealth, is_percentage, is_active) VALUES
('Federal Tax', 0.00, 0.00, 0.00, 0.00, true, true),
('Social Security', 0.00, 6.20, 0.00, 0.00, true, true),
('Medicare', 0.00, 0.00, 0.00, 1.45, true, true),
('Health Insurance', 150.00, 0.00, 0.00, 0.00, false, true),
('Dental Insurance', 25.00, 0.00, 0.00, 0.00, false, true),
('401k Contribution', 0.00, 0.00, 0.00, 0.00, true, true),
('PAG-IBIG', 0.00, 0.00, 2.00, 0.00, true, true),
('PhilHealth', 0.00, 0.00, 0.00, 4.00, true, true)
ON CONFLICT (deduction_name) DO NOTHING;

-- ============================================================================
-- 👤 CREATE DEFAULT USER ACCOUNTS
-- ============================================================================

-- Create Admin User
INSERT INTO users (id, username, email, password, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin@jaylondental.com', 'admin123', 'admin', true);

-- Create Owner record for Admin
INSERT INTO owners (user_id, lname, fname, mname, contact_number, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Administrator', 'System', NULL, '555-0001', 'admin@jaylondental.com');

-- Create Sample Employee Users
INSERT INTO users (id, username, email, password, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'sarah.johnson', 'sarah.johnson@jaylondental.com', 'employee123', 'employee', true),
('550e8400-e29b-41d4-a716-446655440003', 'mike.chen', 'mike.chen@jaylondental.com', 'employee123', 'employee', true),
('550e8400-e29b-41d4-a716-446655440004', 'lisa.garcia', 'lisa.garcia@jaylondental.com', 'employee123', 'employee', true);

-- Create Employee records
INSERT INTO employees (user_id, lname, fname, mname, role, email_address, hire_date, phone_number, status, base_salary, payment_type, hourly_rate, department, position) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Johnson', 'Sarah', 'M', 'Dental Hygienist', 'sarah.johnson@jaylondental.com', '2023-01-15', '555-0102', 'Active', 0, 'hourly', 25.00, 'Clinical', 'Dental Hygienist'),
('550e8400-e29b-41d4-a716-446655440003', 'Chen', 'Michael', 'L', 'Dental Assistant', 'mike.chen@jaylondental.com', '2023-03-20', '555-0103', 'Active', 0, 'hourly', 18.50, 'Clinical', 'Dental Assistant'),
('550e8400-e29b-41d4-a716-446655440004', 'Garcia', 'Lisa', 'A', 'Receptionist', 'lisa.garcia@jaylondental.com', '2023-02-10', '555-0104', 'Active', 0, 'hourly', 16.00, 'Administrative', 'Receptionist');

-- ============================================================================
-- 📅 CREATE SAMPLE SCHEDULES
-- ============================================================================

INSERT INTO schedules (employee_id, work_date, start_time, end_time, shift_time, status) VALUES
-- Sarah Johnson schedules (Employee ID 1)
(1, CURRENT_DATE, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 1, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 2, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 3, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 4, '08:00', '16:00', 'Day Shift', 'scheduled'),

-- Mike Chen schedules (Employee ID 2)
(2, CURRENT_DATE, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 1, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 2, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 3, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 4, '09:00', '17:00', 'Day Shift', 'scheduled'),

-- Lisa Garcia schedules (Employee ID 3)
(3, CURRENT_DATE, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 1, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 2, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 3, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 4, '08:30', '16:30', 'Day Shift', 'scheduled');

-- ============================================================================
-- ⏰ CREATE SAMPLE ATTENDANCE RECORDS
-- ============================================================================

INSERT INTO attendance (employee_id, attendance_date, check_in_am_pm, check_out_am_pm, total_worked_hours, regular_hours, overtime_hours, late_minutes, status, qr_scan_data) VALUES
-- Sarah Johnson attendance
(1, CURRENT_DATE - 1, '08:05', '16:00', 7.92, 7.92, 0, 0, 'present', '{"employeeId": "1", "firstName": "Sarah", "lastName": "Johnson", "scanTime": "08:05"}'),
(1, CURRENT_DATE - 2, '08:20', '16:15', 7.92, 7.92, 0, 5, 'late', '{"employeeId": "1", "firstName": "Sarah", "lastName": "Johnson", "scanTime": "08:20"}'),
(1, CURRENT_DATE - 3, '08:00', '16:30', 8.50, 8.00, 0.50, 0, 'present', '{"employeeId": "1", "firstName": "Sarah", "lastName": "Johnson", "scanTime": "08:00"}'),

-- Mike Chen attendance
(2, CURRENT_DATE - 1, '09:00', '17:30', 8.50, 8.00, 0.50, 0, 'present', '{"employeeId": "2", "firstName": "Michael", "lastName": "Chen", "scanTime": "09:00"}'),
(2, CURRENT_DATE - 2, '09:10', '17:00', 7.83, 7.83, 0, 10, 'late', '{"employeeId": "2", "firstName": "Michael", "lastName": "Chen", "scanTime": "09:10"}'),
(2, CURRENT_DATE - 3, '08:55', '17:15', 8.33, 8.00, 0.33, 0, 'present', '{"employeeId": "2", "firstName": "Michael", "lastName": "Chen", "scanTime": "08:55"}'),

-- Lisa Garcia attendance
(3, CURRENT_DATE - 1, '08:30', '16:30', 8.00, 8.00, 0, 0, 'present', '{"employeeId": "3", "firstName": "Lisa", "lastName": "Garcia", "scanTime": "08:30"}'),
(3, CURRENT_DATE - 2, '08:35', '16:30', 7.92, 7.92, 0, 5, 'late', '{"employeeId": "3", "firstName": "Lisa", "lastName": "Garcia", "scanTime": "08:35"}'),
(3, CURRENT_DATE - 3, '08:25', '16:45', 8.33, 8.00, 0.33, 0, 'present', '{"employeeId": "3", "firstName": "Lisa", "lastName": "Garcia", "scanTime": "08:25"}');

-- ============================================================================
-- 💰 CREATE SAMPLE PAYROLL RECORDS
-- ============================================================================

-- Calculate pay period dates (current month)
DO $$
DECLARE
  pay_start date := date_trunc('month', CURRENT_DATE)::date;
  pay_end date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
BEGIN
  -- Sarah Johnson payroll (25.00/hour)
  INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, regular_hours, overtime_hours, regular_pay, overtime_pay, gross_pay, total_deductions, net_pay, status) VALUES
  (1, pay_start, pay_end, 0, 160.00, 8.00, 4000.00, 300.00, 4300.00, 1032.00, 3268.00, 'processed');

  -- Mike Chen payroll (18.50/hour)
  INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, regular_hours, overtime_hours, regular_pay, overtime_pay, gross_pay, total_deductions, net_pay, status) VALUES
  (2, pay_start, pay_end, 0, 155.00, 5.00, 2867.50, 138.75, 3006.25, 721.50, 2284.75, 'processed');

  -- Lisa Garcia payroll (16.00/hour)
  INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, regular_hours, overtime_hours, regular_pay, overtime_pay, gross_pay, total_deductions, net_pay, status) VALUES
  (3, pay_start, pay_end, 0, 160.00, 4.00, 2560.00, 96.00, 2656.00, 637.44, 2018.56, 'pending');
END $$;

-- ============================================================================
-- 💸 CREATE SAMPLE PAYROLL DEDUCTIONS
-- ============================================================================

-- Add deductions for each payroll entry
INSERT INTO payroll_deductions (payroll_id, deduction_id, amount) VALUES
-- Sarah Johnson deductions (Payroll ID 1)
(1, 1, 946.00),  -- Federal Tax (22%)
(1, 2, 266.60),  -- Social Security (6.2%)
(1, 3, 62.35),   -- Medicare (1.45%)
(1, 4, 150.00),  -- Health Insurance
(1, 5, 25.00),   -- Dental Insurance

-- Mike Chen deductions (Payroll ID 2)
(2, 1, 661.38),  -- Federal Tax (22%)
(2, 2, 186.39),  -- Social Security (6.2%)
(2, 3, 43.59),   -- Medicare (1.45%)
(2, 4, 150.00),  -- Health Insurance
(2, 5, 25.00),   -- Dental Insurance

-- Lisa Garcia deductions (Payroll ID 3)
(3, 1, 584.32),  -- Federal Tax (22%)
(3, 2, 164.67),  -- Social Security (6.2%)
(3, 3, 38.51),   -- Medicare (1.45%)
(3, 4, 150.00),  -- Health Insurance
(3, 5, 25.00);   -- Dental Insurance

-- ============================================================================
-- 📝 ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'System users with simple password authentication (no Supabase Auth dependency)';
COMMENT ON TABLE employees IS 'Employee details and employment information with QR code support';
COMMENT ON TABLE owners IS 'System administrators and owners';
COMMENT ON TABLE schedules IS 'Employee work schedules and shifts';
COMMENT ON TABLE attendance IS 'QR code attendance tracking with time calculations and scan data storage';
COMMENT ON TABLE payroll IS 'Employee payroll records with automated calculations';
COMMENT ON TABLE payroll_deductions IS 'Individual deductions applied to payroll entries';
COMMENT ON TABLE deductions IS 'Standard deduction types and rates';

COMMENT ON COLUMN users.password IS 'Plain text password for simple authentication (in production, this should be hashed)';
COMMENT ON COLUMN attendance.qr_scan_data IS 'JSON data from QR code scans including employee info and scan timestamp';
COMMENT ON FUNCTION authenticate_user(text, text) IS 'Authenticates user with email and password, returns user data if valid';
COMMENT ON FUNCTION create_employee_with_user(text, text, text, text, text, text, decimal, date, text) IS 'Creates a complete employee record with associated user account';
COMMENT ON FUNCTION delete_user_completely(uuid) IS 'Permanently deletes a user and all related data with proper cascading';
COMMENT ON FUNCTION deactivate_user_safely(uuid) IS 'Soft deletes a user by marking as inactive instead of permanent deletion';
COMMENT ON FUNCTION preview_user_deletion(uuid) IS 'Shows what data would be deleted before actually deleting a user';

-- ============================================================================
-- ✅ SETUP VERIFICATION AND SUMMARY
-- ============================================================================

-- Display setup summary
SELECT 
  '🎉 SETUP COMPLETE! 🎉' as status,
  'Jaylon Dental Clinic Employee Management System' as system_name,
  'Database schema, functions, and sample data created successfully' as message;

-- Display available accounts
SELECT 
  '👤 AVAILABLE ACCOUNTS' as info,
  CASE 
    WHEN role = 'admin' THEN '🔑 ADMIN ACCOUNT'
    WHEN role = 'employee' THEN '👤 EMPLOYEE ACCOUNT'
    ELSE '❓ OTHER ACCOUNT'
  END as account_type,
  username,
  email,
  password,
  role,
  CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as status
FROM users 
ORDER BY role DESC, username;

-- Display table counts
SELECT 
  '📊 DATABASE SUMMARY' as info,
  'users' as table_name,
  COUNT(*) as record_count
FROM users
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'employees', COUNT(*) FROM employees
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'owners', COUNT(*) FROM owners
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'attendance', COUNT(*) FROM attendance
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'payroll', COUNT(*) FROM payroll
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'payroll_deductions', COUNT(*) FROM payroll_deductions
UNION ALL
SELECT '📊 DATABASE SUMMARY', 'deductions', COUNT(*) FROM deductions
ORDER BY table_name;

-- Test authentication function
SELECT 
  '🔐 AUTHENTICATION TEST' as test_type,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ SUCCESS'
    ELSE '❌ FAILED'
  END as result,
  COALESCE(email, 'No user found') as email,
  COALESCE(role, 'N/A') as role
FROM authenticate_user('admin@jaylondental.com', 'admin123')
UNION ALL
SELECT 
  '🔐 AUTHENTICATION TEST',
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ SUCCESS'
    ELSE '❌ FAILED'
  END,
  COALESCE(email, 'No user found'),
  COALESCE(role, 'N/A')
FROM authenticate_user('sarah.johnson@jaylondental.com', 'employee123');

-- ============================================================================
-- 🚀 FINAL SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '🎯 READY TO USE!' as final_status,
  'Your Jaylon Dental Clinic Employee Management System is now fully configured!' as message,
  'You can now start the application and begin using all features including QR code attendance, payroll management, and employee portals.' as next_steps;