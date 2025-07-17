import { supabase } from '../lib/supabase';
import type { DatabaseEmployee, DatabaseSchedule, DatabaseAttendance, DatabasePayroll } from '../lib/supabase';

export class EmployeeService {
  // Employee CRUD operations
  static async getAllEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'Active')
      .order('fname', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getEmployeeById(employeeId: number) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error) throw error;
    return data;
  }

  static async createEmployee(employee: Omit<DatabaseEmployee, 'employee_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateEmployee(employeeId: number, updates: Partial<DatabaseEmployee>) {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('employee_id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEmployee(employeeId: number) {
    const { error } = await supabase
      .from('employees')
      .update({ status: 'Terminated' })
      .eq('employee_id', employeeId);

    if (error) throw error;
  }

  // Schedule operations
  static async getEmployeeSchedules(employeeId: number, startDate?: string, endDate?: string) {
    let query = supabase
      .from('schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .order('work_date', { ascending: true });

    if (startDate) {
      query = query.gte('work_date', startDate);
    }
    if (endDate) {
      query = query.lte('work_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async createSchedule(schedule: Omit<DatabaseSchedule, 'schedule_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSchedule(scheduleId: number, updates: Partial<DatabaseSchedule>) {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSchedule(scheduleId: number) {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('schedule_id', scheduleId);

    if (error) throw error;
  }

  // Attendance operations
  static async getEmployeeAttendance(employeeId: number, startDate?: string, endDate?: string) {
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('attendance_date', { ascending: false });

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async clockIn(employeeId: number, clockInTime: string, date: string) {
    // Check if already clocked in today
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', date)
      .single();

    if (existing) {
      throw new Error('Already clocked in today');
    }

    // Determine status based on time
    const clockInDate = new Date(`2000-01-01T${clockInTime}`);
    const gracePeriodEnd = new Date(`2000-01-01T08:15:00`);
    const status = clockInDate <= gracePeriodEnd ? 'present' : 'late';
    const lateMinutes = status === 'late' ? 
      Math.round((clockInDate.getTime() - gracePeriodEnd.getTime()) / (1000 * 60)) : 0;

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        attendance_date: date,
        check_in_am_pm: clockInTime,
        status,
        late_minutes: lateMinutes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async clockOut(attendanceId: number, clockOutTime: string) {
    // Get the attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('attendance_id', attendanceId)
      .single();

    if (fetchError) throw fetchError;
    if (!attendance.check_in_am_pm) throw new Error('No clock in time found');

    // Calculate hours
    const clockIn = new Date(`2000-01-01T${attendance.check_in_am_pm}`);
    const clockOut = new Date(`2000-01-01T${clockOutTime}`);
    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    const regularHours = Math.min(totalHours, 8);
    const overtimeHours = Math.max(0, totalHours - 8);

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out_am_pm: clockOutTime,
        total_worked_hours: Math.round(totalHours * 100) / 100,
        regular_hours: Math.round(regularHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100
      })
      .eq('attendance_id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Payroll operations
  static async getEmployeePayroll(employeeId: number) {
    const { data, error } = await supabase
      .from('payroll')
      .select(`
        *,
        payroll_deductions (
          *,
          deductions (*)
        )
      `)
      .eq('employee_id', employeeId)
      .order('pay_period_start', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async generatePayroll(employeeId: number, payPeriodStart: string, payPeriodEnd: string) {
    // Get employee details
    const employee = await this.getEmployeeById(employeeId);
    
    // Get attendance for the period
    const attendance = await this.getEmployeeAttendance(employeeId, payPeriodStart, payPeriodEnd);
    
    // Calculate totals
    const regularHours = attendance.reduce((sum, record) => sum + (record.regular_hours || 0), 0);
    const overtimeHours = attendance.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);
    const regularPay = regularHours * employee.hourly_rate;
    const overtimePay = overtimeHours * employee.hourly_rate * 1.5;
    const grossPay = regularPay + overtimePay;
    
    // Calculate deductions (simplified)
    const totalDeductions = grossPay * 0.24; // 24% total deductions
    const netPay = grossPay - totalDeductions;

    const { data, error } = await supabase
      .from('payroll')
      .insert({
        employee_id: employeeId,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        base_salary: employee.base_salary,
        regular_hours: Math.round(regularHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        regular_pay: Math.round(regularPay * 100) / 100,
        overtime_pay: Math.round(overtimePay * 100) / 100,
        gross_pay: Math.round(grossPay * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}