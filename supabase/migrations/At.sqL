/*
  # Create Admin and Employee User Accounts
  
  This migration creates default admin and employee accounts with simple password authentication.
  
  1. Creates admin account with full privileges
  2. Creates sample employee account for testing
  3. Sets up proper relationships between users, employees, and owners tables
*/

-- First, let's make sure the authenticate_user function works correctly
DROP FUNCTION IF EXISTS authenticate_user(text, text);

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

-- Clear existing data to avoid conflicts
DELETE FROM payroll_deductions;
DELETE FROM payroll;
DELETE FROM attendance;
DELETE FROM schedules;
DELETE FROM employees;
DELETE FROM owners;
DELETE FROM users;

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

-- Create some sample schedules for the current week
INSERT INTO schedules (employee_id, work_date, start_time, end_time, shift_time, status) VALUES
-- Sarah Johnson schedules
(1, CURRENT_DATE, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 1, '08:00', '16:00', 'Day Shift', 'scheduled'),
(1, CURRENT_DATE + 2, '08:00', '16:00', 'Day Shift', 'scheduled'),

-- Mike Chen schedules  
(2, CURRENT_DATE, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 1, '09:00', '17:00', 'Day Shift', 'scheduled'),
(2, CURRENT_DATE + 3, '09:00', '17:00', 'Day Shift', 'scheduled'),

-- Lisa Garcia schedules
(3, CURRENT_DATE, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 1, '08:30', '16:30', 'Day Shift', 'scheduled'),
(3, CURRENT_DATE + 4, '08:30', '16:30', 'Day Shift', 'scheduled');

-- Create some sample attendance records
INSERT INTO attendance (employee_id, attendance_date, check_in_am_pm, check_out_am_pm, total_worked_hours, regular_hours, overtime_hours, late_minutes, status) VALUES
-- Sarah Johnson attendance
(1, CURRENT_DATE - 1, '08:05', '16:00', 7.92, 7.92, 0, 0, 'present'),
(1, CURRENT_DATE - 2, '08:20', '16:15', 7.92, 7.92, 0, 5, 'late'),

-- Mike Chen attendance
(2, CURRENT_DATE - 1, '09:00', '17:30', 8.50, 8.00, 0.50, 0, 'present'),
(2, CURRENT_DATE - 2, '09:10', '17:00', 7.83, 7.83, 0, 10, 'late'),

-- Lisa Garcia attendance
(3, CURRENT_DATE - 1, '08:30', '16:30', 8.00, 8.00, 0, 0, 'present'),
(3, CURRENT_DATE - 2, '08:35', '16:30', 7.92, 7.92, 0, 5, 'late');

-- Display created accounts
SELECT 
  'ADMIN ACCOUNT' as account_type,
  username,
  email,
  password,
  role
FROM users 
WHERE role = 'admin'

UNION ALL

SELECT 
  'EMPLOYEE ACCOUNT' as account_type,
  username,
  email,
  password,
  role
FROM users 
WHERE role = 'employee'
ORDER BY account_type, username;