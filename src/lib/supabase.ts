import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on our schema
export interface DatabaseEmployee {
  employee_id: number;
  user_id: string;
  lname: string;
  fname: string;
  mname?: string;
  date_of_birth?: string;
  role: string;
  email_address: string;
  hire_date: string;
  phone_number?: string;
  status: 'Active' | 'Inactive' | 'Terminated';
  base_salary: number;
  payment_type: 'hourly' | 'salary' | 'contract';
  hourly_rate: number;
  department?: string;
  position?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchedule {
  schedule_id: number;
  employee_id: number;
  user_id?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  shift_time?: string;
  click_location?: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DatabaseAttendance {
  attendance_id: number;
  employee_id: number;
  attendance_date: string;
  check_in_am_pm?: string;
  check_out_am_pm?: string;
  total_worked_hours?: number;
  overtime_hours?: number;
  regular_hours?: number;
  late_minutes?: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  created_at: string;
  updated_at: string;
}

export interface DatabasePayroll {
  payroll_id: number;
  employee_id: number;
  user_id?: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DatabaseDeduction {
  id_deduct: number;
  deduction_name: string;
  ded_amount: number;
  sss: number;
  pag_ibig: number;
  philhealth: number;
  is_percentage: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DatabasePayrollDeduction {
  id_deduct: number;
  payroll_id: number;
  user_id?: string;
  deduction_id: number;
  amount: number;
  created_at: string;
}

export interface DatabaseUser {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'employee' | 'admin' | 'owner';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOwner {
  user_id: string;
  lname: string;
  fname: string;
  mname?: string;
  contact_number?: string;
  email: string;
  created_at: string;
}