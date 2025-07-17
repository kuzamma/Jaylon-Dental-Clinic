/*
  # Employee Management System - Database Schema
  
  This migration creates the complete database schema for the employee management system.
  
  ## Tables Created:
  1. users - System users (employees, admins, owners)
  2. employees - Employee details and information  
  3. owners - System administrators/owners
  4. schedules - Employee work schedules
  5. attendance - Employee attendance records
  6. payroll - Employee payroll records
  7. payroll_deductions - Individual payroll deduction records
  8. deductions - Standard deduction types and rates
  
  ## Features:
  - Proper foreign key relationships
  - Automatic timestamp updates
  - Performance indexes
  - Data validation constraints
*/

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username varchar(50) UNIQUE NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  role varchar(20) DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'owner')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
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

-- Create owners table
CREATE TABLE IF NOT EXISTS owners (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lname varchar(50) NOT NULL,
  fname varchar(50) NOT NULL,
  mname varchar(50),
  contact_number varchar(15),
  email varchar(50) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
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

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deductions table (standard deduction types)
CREATE TABLE IF NOT EXISTS deductions (
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

-- Create payroll table
CREATE TABLE IF NOT EXISTS payroll (
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

-- Create payroll_deductions table (links payroll to specific deductions)
CREATE TABLE IF NOT EXISTS payroll_deductions (
  id_deduct serial PRIMARY KEY,
  payroll_id integer REFERENCES payroll(payroll_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  deduction_id integer REFERENCES deductions(id_deduct),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email_address);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON payroll(employee_id, pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_payroll ON payroll_deductions(payroll_id);
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);

-- Create function for automatic timestamp updates
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

-- Insert standard deduction types
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

-- Add helpful comments
COMMENT ON TABLE users IS 'System users linked to Supabase auth.users';
COMMENT ON TABLE employees IS 'Employee details and employment information';
COMMENT ON TABLE owners IS 'System administrators and owners';
COMMENT ON TABLE schedules IS 'Employee work schedules and shifts';
COMMENT ON TABLE attendance IS 'Employee attendance tracking with time calculations';
COMMENT ON TABLE payroll IS 'Employee payroll records with calculations';
COMMENT ON TABLE payroll_deductions IS 'Individual deductions applied to payroll entries';
COMMENT ON TABLE deductions IS 'Standard deduction types and rates';

COMMENT ON COLUMN users.user_id IS 'References auth.users.id from Supabase Auth';
COMMENT ON COLUMN users.role IS 'User role: employee, admin, or owner (admin and owner have same privileges)';
COMMENT ON COLUMN employees.user_id IS 'References users.id (not auth.users.id)';
COMMENT ON COLUMN employees.status IS 'Employee status: Active, Inactive, or Terminated';
COMMENT ON COLUMN employees.payment_type IS 'Payment method: hourly, salary, or contract';