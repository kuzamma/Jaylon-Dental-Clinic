import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { supabase } from '../lib/supabase';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hourlyRate: number;
  hireDate: string;
  isActive: boolean;
  qrCode?: string;
}

export interface Schedule {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  status: 'scheduled' | 'completed' | 'missed';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  regularHours?: number;
  overtime?: number;
  payableHours?: number;
  lateMinutes?: number;
  status: 'present' | 'absent' | 'late';
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  deductions: number;
  netPay: number;
  status: 'pending' | 'processed' | 'paid';
}

interface AppState {
  employees: Employee[];
  schedules: Schedule[];
  attendance: AttendanceRecord[];
  payroll: PayrollEntry[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EMPLOYEES'; payload: Employee[] }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'SET_SCHEDULES'; payload: Schedule[] }
  | { type: 'ADD_SCHEDULE'; payload: Schedule }
  | { type: 'UPDATE_SCHEDULE'; payload: Schedule }
  | { type: 'DELETE_SCHEDULE'; payload: string }
  | { type: 'SET_ATTENDANCE'; payload: AttendanceRecord[] }
  | { type: 'ADD_ATTENDANCE'; payload: AttendanceRecord }
  | { type: 'UPDATE_ATTENDANCE'; payload: AttendanceRecord }
  | { type: 'SET_PAYROLL'; payload: PayrollEntry[] }
  | { type: 'ADD_PAYROLL'; payload: PayrollEntry }
  | { type: 'UPDATE_PAYROLL'; payload: PayrollEntry };

const initialState: AppState = {
  employees: [],
  schedules: [],
  attendance: [],
  payroll: [],
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.payload] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp.id === action.payload.id ? action.payload : emp
        ),
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(emp => emp.id !== action.payload),
      };
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload };
    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.payload] };
    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(schedule =>
          schedule.id === action.payload.id ? action.payload : schedule
        ),
      };
    case 'DELETE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.filter(schedule => schedule.id !== action.payload),
      };
    case 'SET_ATTENDANCE':
      return { ...state, attendance: action.payload };
    case 'ADD_ATTENDANCE':
      return { ...state, attendance: [...state.attendance, action.payload] };
    case 'UPDATE_ATTENDANCE':
      return {
        ...state,
        attendance: state.attendance.map(record =>
          record.id === action.payload.id ? action.payload : record
        ),
      };
    case 'SET_PAYROLL':
      return { ...state, payroll: action.payload };
    case 'ADD_PAYROLL':
      return { ...state, payroll: [...state.payroll, action.payload] };
    case 'UPDATE_PAYROLL':
      return {
        ...state,
        payroll: state.payroll.map(entry =>
          entry.id === action.payload.id ? action.payload : entry
        ),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // CRUD operations
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string, hardDelete?: boolean) => Promise<void>;
  createSchedule: (schedule: Omit<Schedule, 'id'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  createAttendance: (attendance: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  createPayroll: (payroll: Omit<PayrollEntry, 'id'>) => Promise<void>;
  updatePayroll: (id: string, updates: Partial<PayrollEntry>) => Promise<void>;
  refreshData: () => Promise<void>;
  loadEmployeeData: (userEmail: string) => Promise<Employee[]>;
  previewUserDeletion: (userId: string) => Promise<any[]>;
  // Employee profile management
  updateEmployeeProfile: (id: string, updates: Partial<Pick<Employee, 'firstName' | 'lastName' | 'email' | 'phone'>>) => Promise<void>;
  updateEmployeePassword: (id: string, currentPassword: string, newPassword: string) => Promise<void>;
} | null>(null);

// Helper function to convert database employee to app employee
const convertDbEmployeeToApp = (dbEmployee: any): Employee => ({
  id: dbEmployee.employee_id.toString(),
  firstName: dbEmployee.fname,
  lastName: dbEmployee.lname,
  email: dbEmployee.email_address,
  phone: dbEmployee.phone_number || '',
  position: dbEmployee.position || dbEmployee.role,
  department: dbEmployee.department || 'General',
  hourlyRate: dbEmployee.hourly_rate || 0,
  hireDate: dbEmployee.hire_date,
  isActive: dbEmployee.status === 'Active',
});

// Helper function to convert app employee to database format
const convertAppEmployeeToDb = (appEmployee: Omit<Employee, 'id'>) => ({
  fname: appEmployee.firstName,
  lname: appEmployee.lastName,
  email_address: appEmployee.email,
  phone_number: appEmployee.phone,
  role: appEmployee.position,
  position: appEmployee.position,
  department: appEmployee.department,
  hourly_rate: appEmployee.hourlyRate,
  hire_date: appEmployee.hireDate,
  status: appEmployee.isActive ? 'Active' : 'Inactive',
  payment_type: 'hourly',
  base_salary: 0,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'Active')
        .order('fname', { ascending: true });

      if (employeesError) throw employeesError;

      const employees = employeesData?.map(convertDbEmployeeToApp) || [];
      dispatch({ type: 'SET_EMPLOYEES', payload: employees });

      // Load schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .order('work_date', { ascending: false });

      if (schedulesError) throw schedulesError;

      const schedules = schedulesData?.map((schedule: any) => ({
        id: schedule.schedule_id.toString(),
        employeeId: schedule.employee_id.toString(),
        date: schedule.work_date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        position: schedule.shift_time || 'Day Shift',
        status: schedule.status,
      })) || [];
      dispatch({ type: 'SET_SCHEDULES', payload: schedules });

      // Load attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (attendanceError) throw attendanceError;

      const attendance = attendanceData?.map((record: any) => ({
        id: record.attendance_id.toString(),
        employeeId: record.employee_id.toString(),
        date: record.attendance_date,
        clockIn: record.check_in_am_pm,
        clockOut: record.check_out_am_pm,
        totalHours: record.total_worked_hours,
        regularHours: record.regular_hours,
        overtime: record.overtime_hours,
        payableHours: record.total_worked_hours,
        lateMinutes: record.late_minutes,
        status: record.status,
      })) || [];
      dispatch({ type: 'SET_ATTENDANCE', payload: attendance });

      // Load payroll
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('*')
        .order('pay_period_start', { ascending: false });

      if (payrollError) throw payrollError;

      const payroll = payrollData?.map((entry: any) => ({
        id: entry.payroll_id.toString(),
        employeeId: entry.employee_id.toString(),
        payPeriodStart: entry.pay_period_start,
        payPeriodEnd: entry.pay_period_end,
        regularHours: entry.regular_hours,
        overtimeHours: entry.overtime_hours,
        regularPay: entry.regular_pay,
        overtimePay: entry.overtime_pay,
        deductions: entry.total_deductions,
        netPay: entry.net_pay,
        status: entry.status,
      })) || [];
      dispatch({ type: 'SET_PAYROLL', payload: payroll });

    } catch (error: any) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // New function to load employee data by email (for employee portal)
  const loadEmployeeData = async (userEmail: string): Promise<Employee[]> => {
    try {
      console.log('🔍 Loading employee data for email:', userEmail);
      
      // First, get the user record to find the user_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .eq('is_active', true)
        .single();

      if (userError) {
        console.error('❌ Error finding user:', userError);
        throw new Error(`User not found: ${userError.message}`);
      }

      if (!userData) {
        throw new Error('User not found in system');
      }

      console.log('✅ Found user record:', userData);

      // Now get the employee record using the user_id (which is actually the users.id)
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userData.id)  // Use users.id, not user_id field
        .eq('status', 'Active');

      if (employeeError) {
        console.error('❌ Error finding employee:', employeeError);
        throw new Error(`Employee data not found: ${employeeError.message}`);
      }

      if (!employeeData || employeeData.length === 0) {
        console.log('⚠️ No employee record found, this might be a new OAuth user');
        
        // For OAuth users, try to create employee record automatically
        const authProvider = localStorage.getItem('auth_provider');
        if (authProvider === 'google') {
          console.log('🔄 Attempting to create employee record for Google OAuth user...');
          
          try {
            // Get current Supabase user for name info
            const { supabaseAuthService } = await import('../lib/supabaseAuth');
            const currentSupabaseUser = await supabaseAuthService.getCurrentUser();
            
            if (currentSupabaseUser) {
              const userName = currentSupabaseUser.user_metadata?.name || currentSupabaseUser.email.split('@')[0];
              
              console.log('🔄 Creating employee record with full data...');
              
              // Create employee record using the supabaseAuth service
              const newEmployee = await supabaseAuthService.createEmployeeForOAuthUser(
                userEmail, 
                userName, 
                userData.id
              );
              
              console.log('✅ Employee record created successfully for OAuth user');
              
              // Convert and return the new employee
              const employees = [convertDbEmployeeToApp(newEmployee)];
              dispatch({ type: 'SET_EMPLOYEES', payload: employees });
              return employees;
            } else {
              throw new Error('Could not get current OAuth user information');
            }
          } catch (createError) {
            console.error('❌ Error creating employee record:', createError);
            throw new Error(`Failed to create employee profile: ${createError.message || createError}`);
          }
        }
        
        throw new Error('No employee record found for this user');
      }

      console.log('✅ Found employee record:', employeeData);

      const employees = employeeData.map(convertDbEmployeeToApp);
      dispatch({ type: 'SET_EMPLOYEES', payload: employees });
      
      return employees;
    } catch (error: any) {
      console.error('💥 Error loading employee data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Function to preview what would be deleted
  const previewUserDeletion = async (userId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase.rpc('preview_user_deletion', {
        target_user_id: userId
      });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error previewing deletion:', error);
      throw error;
    }
  };

  // Employee CRUD operations
  const createEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 Creating employee with data:', employee);
      
      // Step 1: Create user record first (without user_id field since it's removed)
      const newUserId = crypto.randomUUID();
      const username = `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}`;
      
      console.log('📝 Creating user record with ID:', newUserId);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          username: username,
          email: employee.email,
          role: 'employee',
          is_active: employee.isActive,
          password: 'employee123' // Default password
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creating user:', userError);
        throw userError;
      }

      console.log('✅ User created successfully:', userData);

      // Step 2: Create employee record with the user_id pointing to users.id
      const dbEmployee = {
        ...convertAppEmployeeToDb(employee),
        user_id: newUserId // Use the UUID we just created (users.id)
      };
      
      console.log('📝 Creating employee record with data:', dbEmployee);
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert(dbEmployee)
        .select()
        .single();

      if (employeeError) {
        console.error('❌ Error creating employee:', employeeError);
        // If employee creation fails, clean up the user record
        await supabase.from('users').delete().eq('id', newUserId);
        throw employeeError;
      }

      console.log('✅ Employee created successfully:', employeeData);

      const newEmployee = convertDbEmployeeToApp(employeeData);
      dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
      
    } catch (error: any) {
      console.error('💥 Error creating employee:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const dbUpdates: any = {};
      if (updates.firstName) dbUpdates.fname = updates.firstName;
      if (updates.lastName) dbUpdates.lname = updates.lastName;
      if (updates.email) dbUpdates.email_address = updates.email;
      if (updates.phone) dbUpdates.phone_number = updates.phone;
      if (updates.position) {
        dbUpdates.role = updates.position;
        dbUpdates.position = updates.position;
      }
      if (updates.department) dbUpdates.department = updates.department;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
      if (updates.hireDate) dbUpdates.hire_date = updates.hireDate;
      if (updates.isActive !== undefined) dbUpdates.status = updates.isActive ? 'Active' : 'Inactive';

      const { data, error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('employee_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      // Also update the user record if email changed
      if (updates.email) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            email: updates.email,
            is_active: updates.isActive !== undefined ? updates.isActive : true
          })
          .eq('id', data.user_id);  // Use users.id

        if (userUpdateError) {
          console.warn('Warning: Could not update user email:', userUpdateError);
        }
      }

      const updatedEmployee = convertDbEmployeeToApp(data);
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
    } catch (error: any) {
      console.error('Error updating employee:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteEmployee = async (id: string, hardDelete: boolean = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get the employee record first to get the user_id
      const { data: employeeData, error: fetchError } = await supabase
        .from('employees')
        .select('user_id')
        .eq('employee_id', parseInt(id))
        .single();

      if (fetchError) throw fetchError;

      if (hardDelete) {
        // Hard delete: completely remove user and all related data
        console.log('🗑️ Performing hard delete for user:', employeeData.user_id);
        
        const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_user_completely', {
          target_user_id: employeeData.user_id
        });

        if (deleteError) throw deleteError;

        const result = deleteResult[0];
        if (!result.success) {
          throw new Error(result.message);
        }

        console.log('✅ Hard delete completed:', result.deleted_records);
        
        // Show detailed deletion summary
        const deletedCounts = result.deleted_records;
        const summary = Object.entries(deletedCounts)
          .filter(([_, count]) => count > 0)
          .map(([table, count]) => `${table}: ${count}`)
          .join(', ');
        
        alert(`Employee and all related data deleted successfully!\n\nDeleted records: ${summary}`);
      } else {
        // Soft delete: deactivate user and terminate employee
        console.log('🔒 Performing soft delete for user:', employeeData.user_id);
        
        const { data: deactivateResult, error: deactivateError } = await supabase.rpc('deactivate_user_safely', {
          target_user_id: employeeData.user_id
        });

        if (deactivateError) throw deactivateError;

        const result = deactivateResult[0];
        if (!result.success) {
          throw new Error(result.message);
        }

        console.log('✅ Soft delete completed:', result.affected_records);
        alert('Employee account deactivated successfully!\n\nThe employee has been marked as terminated but all historical data is preserved.');
      }

      dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
      
      // Refresh data to reflect changes
      await refreshData();
      
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Employee profile management functions
  const updateEmployeeProfile = async (id: string, updates: Partial<Pick<Employee, 'firstName' | 'lastName' | 'email' | 'phone'>>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 Updating employee profile:', id, updates);
      
      // Update employee record
      const dbUpdates: any = {};
      if (updates.firstName) dbUpdates.fname = updates.firstName;
      if (updates.lastName) dbUpdates.lname = updates.lastName;
      if (updates.email) dbUpdates.email_address = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone_number = updates.phone;

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('employee_id', parseInt(id))
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Also update the user record if email changed
      if (updates.email) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ email: updates.email })
          .eq('id', employeeData.user_id);

        if (userUpdateError) {
          console.warn('Warning: Could not update user email:', userUpdateError);
        }
      }

      const updatedEmployee = convertDbEmployeeToApp(employeeData);
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
      
      console.log('✅ Employee profile updated successfully');
    } catch (error: any) {
      console.error('💥 Error updating employee profile:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateEmployeePassword = async (id: string, currentPassword: string, newPassword: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 Updating employee password for ID:', id);
      
      // Get the employee's user_id
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('user_id')
        .eq('employee_id', parseInt(id))
        .single();

      if (employeeError) throw employeeError;

      // Verify current password
      const { data: userVerification, error: verificationError } = await supabase
        .from('users')
        .select('password')
        .eq('id', employeeData.user_id)
        .single();

      if (verificationError) throw verificationError;

      if (userVerification.password !== currentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', employeeData.user_id);

      if (updateError) throw updateError;

      console.log('✅ Employee password updated successfully');
    } catch (error: any) {
      console.error('💥 Error updating employee password:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Schedule CRUD operations
  const createSchedule = async (schedule: Omit<Schedule, 'id'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          employee_id: parseInt(schedule.employeeId),
          work_date: schedule.date,
          start_time: schedule.startTime,
          end_time: schedule.endTime,
          shift_time: schedule.position,
          status: schedule.status,
        })
        .select()
        .single();

      if (error) throw error;

      const newSchedule: Schedule = {
        id: data.schedule_id.toString(),
        employeeId: data.employee_id.toString(),
        date: data.work_date,
        startTime: data.start_time,
        endTime: data.end_time,
        position: data.shift_time || 'Day Shift',
        status: data.status,
      };

      dispatch({ type: 'ADD_SCHEDULE', payload: newSchedule });
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const dbUpdates: any = {};
      if (updates.employeeId) dbUpdates.employee_id = parseInt(updates.employeeId);
      if (updates.date) dbUpdates.work_date = updates.date;
      if (updates.startTime) dbUpdates.start_time = updates.startTime;
      if (updates.endTime) dbUpdates.end_time = updates.endTime;
      if (updates.position) dbUpdates.shift_time = updates.position;
      if (updates.status) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('schedules')
        .update(dbUpdates)
        .eq('schedule_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      const updatedSchedule: Schedule = {
        id: data.schedule_id.toString(),
        employeeId: data.employee_id.toString(),
        date: data.work_date,
        startTime: data.start_time,
        endTime: data.end_time,
        position: data.shift_time || 'Day Shift',
        status: data.status,
      };

      dispatch({ type: 'UPDATE_SCHEDULE', payload: updatedSchedule });
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('schedule_id', parseInt(id));

      if (error) throw error;

      dispatch({ type: 'DELETE_SCHEDULE', payload: id });
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Attendance CRUD operations
  const createAttendance = async (attendance: Omit<AttendanceRecord, 'id'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: parseInt(attendance.employeeId),
          attendance_date: attendance.date,
          check_in_am_pm: attendance.clockIn,
          check_out_am_pm: attendance.clockOut,
          total_worked_hours: attendance.totalHours,
          regular_hours: attendance.regularHours,
          overtime_hours: attendance.overtime,
          late_minutes: attendance.lateMinutes,
          status: attendance.status,
        })
        .select()
        .single();

      if (error) throw error;

      const newAttendance: AttendanceRecord = {
        id: data.attendance_id.toString(),
        employeeId: data.employee_id.toString(),
        date: data.attendance_date,
        clockIn: data.check_in_am_pm,
        clockOut: data.check_out_am_pm,
        totalHours: data.total_worked_hours,
        regularHours: data.regular_hours,
        overtime: data.overtime_hours,
        payableHours: data.total_worked_hours,
        lateMinutes: data.late_minutes,
        status: data.status,
      };

      dispatch({ type: 'ADD_ATTENDANCE', payload: newAttendance });
    } catch (error: any) {
      console.error('Error creating attendance:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateAttendance = async (id: string, updates: Partial<AttendanceRecord>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const dbUpdates: any = {};
      if (updates.clockOut) dbUpdates.check_out_am_pm = updates.clockOut;
      if (updates.totalHours !== undefined) dbUpdates.total_worked_hours = updates.totalHours;
      if (updates.regularHours !== undefined) dbUpdates.regular_hours = updates.regularHours;
      if (updates.overtime !== undefined) dbUpdates.overtime_hours = updates.overtime;
      if (updates.lateMinutes !== undefined) dbUpdates.late_minutes = updates.lateMinutes;
      if (updates.status) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('attendance')
        .update(dbUpdates)
        .eq('attendance_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      const updatedAttendance: AttendanceRecord = {
        id: data.attendance_id.toString(),
        employeeId: data.employee_id.toString(),
        date: data.attendance_date,
        clockIn: data.check_in_am_pm,
        clockOut: data.check_out_am_pm,
        totalHours: data.total_worked_hours,
        regularHours: data.regular_hours,
        overtime: data.overtime_hours,
        payableHours: data.total_worked_hours,
        lateMinutes: data.late_minutes,
        status: data.status,
      };

      dispatch({ type: 'UPDATE_ATTENDANCE', payload: updatedAttendance });
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Payroll CRUD operations - FIXED VERSION
  const createPayroll = async (payroll: Omit<PayrollEntry, 'id'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 Creating payroll entry:', payroll);
      
      const { data, error } = await supabase
        .from('payroll')
        .insert({
          employee_id: parseInt(payroll.employeeId),
          pay_period_start: payroll.payPeriodStart,
          pay_period_end: payroll.payPeriodEnd,
          regular_hours: payroll.regularHours,
          overtime_hours: payroll.overtimeHours,
          regular_pay: payroll.regularPay,
          overtime_pay: payroll.overtimePay,
          gross_pay: payroll.regularPay + payroll.overtimePay,
          total_deductions: payroll.deductions,
          net_pay: payroll.netPay,
          status: payroll.status,
          base_salary: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating payroll:', error);
        throw error;
      }

      console.log('✅ Payroll created successfully:', data);

      const newPayroll: PayrollEntry = {
        id: data.payroll_id.toString(),
        employeeId: data.employee_id.toString(),
        payPeriodStart: data.pay_period_start,
        payPeriodEnd: data.pay_period_end,
        regularHours: data.regular_hours,
        overtimeHours: data.overtime_hours,
        regularPay: data.regular_pay,
        overtimePay: data.overtime_pay,
        deductions: data.total_deductions,
        netPay: data.net_pay,
        status: data.status,
      };

      dispatch({ type: 'ADD_PAYROLL', payload: newPayroll });
      
      // Refresh payroll data to ensure consistency
      await refreshPayrollData();
      
    } catch (error: any) {
      console.error('💥 Error creating payroll:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updatePayroll = async (id: string, updates: Partial<PayrollEntry>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔄 Updating payroll entry:', id, updates);
      
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.regularHours !== undefined) dbUpdates.regular_hours = updates.regularHours;
      if (updates.overtimeHours !== undefined) dbUpdates.overtime_hours = updates.overtimeHours;
      if (updates.regularPay !== undefined) dbUpdates.regular_pay = updates.regularPay;
      if (updates.overtimePay !== undefined) dbUpdates.overtime_pay = updates.overtimePay;
      if (updates.deductions !== undefined) dbUpdates.total_deductions = updates.deductions;
      if (updates.netPay !== undefined) dbUpdates.net_pay = updates.netPay;
      
      // Update gross pay if regular or overtime pay changed
      if (updates.regularPay !== undefined || updates.overtimePay !== undefined) {
        const currentPayroll = state.payroll.find(p => p.id === id);
        if (currentPayroll) {
          const newRegularPay = updates.regularPay !== undefined ? updates.regularPay : currentPayroll.regularPay;
          const newOvertimePay = updates.overtimePay !== undefined ? updates.overtimePay : currentPayroll.overtimePay;
          dbUpdates.gross_pay = newRegularPay + newOvertimePay;
        }
      }

      const { data, error } = await supabase
        .from('payroll')
        .update(dbUpdates)
        .eq('payroll_id', parseInt(id))
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating payroll:', error);
        throw error;
      }

      console.log('✅ Payroll updated successfully:', data);

      const updatedPayroll: PayrollEntry = {
        id: data.payroll_id.toString(),
        employeeId: data.employee_id.toString(),
        payPeriodStart: data.pay_period_start,
        payPeriodEnd: data.pay_period_end,
        regularHours: data.regular_hours,
        overtimeHours: data.overtime_hours,
        regularPay: data.regular_pay,
        overtimePay: data.overtime_pay,
        deductions: data.total_deductions,
        netPay: data.net_pay,
        status: data.status,
      };

      dispatch({ type: 'UPDATE_PAYROLL', payload: updatedPayroll });
      
      // Refresh payroll data to ensure consistency
      await refreshPayrollData();
      
    } catch (error: any) {
      console.error('💥 Error updating payroll:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Helper function to refresh only payroll data
  const refreshPayrollData = async () => {
    try {
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('*')
        .order('pay_period_start', { ascending: false });

      if (payrollError) throw payrollError;

      const payroll = payrollData?.map((entry: any) => ({
        id: entry.payroll_id.toString(),
        employeeId: entry.employee_id.toString(),
        payPeriodStart: entry.pay_period_start,
        payPeriodEnd: entry.pay_period_end,
        regularHours: entry.regular_hours,
        overtimeHours: entry.overtime_hours,
        regularPay: entry.regular_pay,
        overtimePay: entry.overtime_pay,
        deductions: entry.total_deductions,
        netPay: entry.net_pay,
        status: entry.status,
      })) || [];
      
      dispatch({ type: 'SET_PAYROLL', payload: payroll });
      console.log('✅ Payroll data refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing payroll data:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      createSchedule,
      updateSchedule,
      deleteSchedule,
      createAttendance,
      updateAttendance,
      createPayroll,
      updatePayroll,
      refreshData,
      loadEmployeeData,
      previewUserDeletion,
      updateEmployeeProfile,
      updateEmployeePassword,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}