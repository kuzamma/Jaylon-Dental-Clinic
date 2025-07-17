import { supabase } from '../lib/supabase';

export class ReportService {
  static async getAttendanceReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employees (
          employee_id,
          fname,
          lname,
          position,
          department
        )
      `)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getPayrollReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('payroll')
      .select(`
        *,
        employees (
          employee_id,
          fname,
          lname,
          position,
          department
        ),
        payroll_deductions (
          *,
          deductions (*)
        )
      `)
      .gte('pay_period_start', startDate)
      .lte('pay_period_end', endDate)
      .order('pay_period_start', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getScheduleReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        employees (
          employee_id,
          fname,
          lname,
          position,
          department
        )
      `)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getEmployeeWorkloadStats(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        schedules!inner (
          work_date,
          start_time,
          end_time,
          status
        ),
        attendance (
          attendance_date,
          status,
          total_worked_hours,
          overtime_hours
        )
      `)
      .eq('status', 'Active');

    if (error) throw error;
    return data;
  }

  static async getDashboardStats() {
    // Get active employees count
    const { count: activeEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');

    // Get today's schedules
    const today = new Date().toISOString().split('T')[0];
    const { count: todaySchedules } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('work_date', today);

    // Get today's attendance
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('attendance_date', today);

    // Get current month payroll total
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyPayroll } = await supabase
      .from('payroll')
      .select('net_pay')
      .gte('pay_period_start', `${currentMonth}-01`)
      .lt('pay_period_start', `${currentMonth}-32`);

    const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const monthlyTotal = monthlyPayroll?.reduce((sum, p) => sum + p.net_pay, 0) || 0;

    return {
      activeEmployees: activeEmployees || 0,
      todaySchedules: todaySchedules || 0,
      presentToday,
      monthlyPayroll: monthlyTotal
    };
  }
}