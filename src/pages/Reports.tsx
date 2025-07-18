import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users,
  Clock,
  DollarSign,
  Filter
} from 'lucide-react';

const Reports: React.FC = () => {
  const { state } = useAppContext();
  const { employees, attendance, payroll, schedules } = state;
  const [reportType, setReportType] = useState<'attendance' | 'payroll' | 'schedule'>('attendance');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  // Attendance Report Data
  const getAttendanceReportData = () => {
    const startDate = parseISO(dateRange.start);
    const endDate = parseISO(dateRange.end);
    
    const filteredAttendance = attendance.filter(record => 
      isWithinInterval(parseISO(record.date), { start: startDate, end: endDate })
    );

    const attendanceByEmployee = employees.map(employee => {
      const employeeAttendance = filteredAttendance.filter(record => 
        record.employeeId === employee.id
      );
      
      return {
        name: `${employee.firstName} ${employee.lastName}`,
        present: employeeAttendance.filter(r => r.status === 'present').length,
        late: employeeAttendance.filter(r => r.status === 'late').length,
        absent: employeeAttendance.filter(r => r.status === 'absent').length,
        totalHours: employeeAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0),
        overtime: employeeAttendance.reduce((sum, r) => sum + (r.overtime || 0), 0),
      };
    });

    const dailyAttendance = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayAttendance = filteredAttendance.filter(record => record.date === dateStr);
      
      dailyAttendance.push({
        date: format(currentDate, 'MMM dd'),
        present: dayAttendance.filter(r => r.status === 'present').length,
        late: dayAttendance.filter(r => r.status === 'late').length,
        absent: employees.length - dayAttendance.length,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { attendanceByEmployee, dailyAttendance, filteredAttendance };
  };

  // Payroll Report Data
  const getPayrollReportData = () => {
    const startDate = parseISO(dateRange.start);
    const endDate = parseISO(dateRange.end);
    
    const filteredPayroll = payroll.filter(entry => 
      isWithinInterval(parseISO(entry.payPeriodStart), { start: startDate, end: endDate })
    );

    const payrollByEmployee = employees.map(employee => {
      const employeePayroll = filteredPayroll.filter(entry => 
        entry.employeeId === employee.id
      );
      
      const totalGrossPay = employeePayroll.reduce((sum, entry) => 
        sum + entry.regularPay + entry.overtimePay, 0
      );
      const totalNetPay = employeePayroll.reduce((sum, entry) => sum + entry.netPay, 0);
      const totalDeductions = employeePayroll.reduce((sum, entry) => sum + entry.deductions, 0);
      
      return {
        name: `${employee.firstName} ${employee.lastName}`,
        grossPay: totalGrossPay,
        netPay: totalNetPay,
        deductions: totalDeductions,
        regularHours: employeePayroll.reduce((sum, entry) => sum + entry.regularHours, 0),
        overtimeHours: employeePayroll.reduce((sum, entry) => sum + entry.overtimeHours, 0),
      };
    });

    return { payrollByEmployee, filteredPayroll };
  };

  // Schedule Report Data
  const getScheduleReportData = () => {
    const startDate = parseISO(dateRange.start);
    const endDate = parseISO(dateRange.end);
    
    const filteredSchedules = schedules.filter(schedule => 
      isWithinInterval(parseISO(schedule.date), { start: startDate, end: endDate })
    );

    const schedulesByEmployee = employees.map(employee => {
      const employeeSchedules = filteredSchedules.filter(schedule => 
        schedule.employeeId === employee.id
      );
      
      return {
        name: `${employee.firstName} ${employee.lastName}`,
        scheduled: employeeSchedules.filter(s => s.status === 'scheduled').length,
        completed: employeeSchedules.filter(s => s.status === 'completed').length,
        missed: employeeSchedules.filter(s => s.status === 'missed').length,
        total: employeeSchedules.length,
      };
    });

    const scheduleStatus = [
      { name: 'Completed', value: filteredSchedules.filter(s => s.status === 'completed').length, color: '#10b981' },
      { name: 'Scheduled', value: filteredSchedules.filter(s => s.status === 'scheduled').length, color: '#3b82f6' },
      { name: 'Missed', value: filteredSchedules.filter(s => s.status === 'missed').length, color: '#ef4444' },
    ];

    return { schedulesByEmployee, scheduleStatus, filteredSchedules };
  };

  const exportReport = (data: any[], filename: string) => {
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderAttendanceReport = () => {
    const { attendanceByEmployee, dailyAttendance, filteredAttendance } = getAttendanceReportData();

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{filteredAttendance.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Present Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAttendance.filter(r => r.status === 'present').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Late Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAttendance.filter(r => r.status === 'late').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(filteredAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Attendance Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Attendance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyAttendance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
              <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Employee Attendance Table */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Employee Attendance Summary</h3>
            <button
              onClick={() => exportReport(attendanceByEmployee, 'attendance-report')}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Present
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Late
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceByEmployee.map((employee, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.present}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.late}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.totalHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.overtime.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPayrollReport = () => {
    const { payrollByEmployee, filteredPayroll } = getPayrollReportData();
    const totalGrossPay = filteredPayroll.reduce((sum, entry) => sum + entry.regularPay + entry.overtimePay, 0);
    const totalNetPay = filteredPayroll.reduce((sum, entry) => sum + entry.netPay, 0);
    const totalDeductions = filteredPayroll.reduce((sum, entry) => sum + entry.deductions, 0);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Gross Pay</p>
                <p className="text-2xl font-bold text-gray-900">${totalGrossPay.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Net Pay</p>
                <p className="text-2xl font-bold text-gray-900">${totalNetPay.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Deductions</p>
                <p className="text-2xl font-bold text-gray-900">${totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Payroll Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payrollByEmployee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="grossPay" fill="#3b82f6" name="Gross Pay" />
              <Bar dataKey="netPay" fill="#10b981" name="Net Pay" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Employee Payroll Summary</h3>
            <button
              onClick={() => exportReport(payrollByEmployee, 'payroll-report')}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regular Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Pay
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollByEmployee.map((employee, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.regularHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.overtimeHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{employee.grossPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{employee.deductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{employee.netPay.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleReport = () => {
    const { schedulesByEmployee, scheduleStatus, filteredSchedules } = getScheduleReportData();

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Schedules</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSchedules.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSchedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSchedules.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Missed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSchedules.filter(s => s.status === 'missed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schedule Status Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scheduleStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {scheduleStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Employee Schedule Chart */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Schedule Summary</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={schedulesByEmployee}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                <Bar dataKey="scheduled" stackId="a" fill="#3b82f6" name="Scheduled" />
                <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Employee Schedule Summary</h3>
            <button
              onClick={() => exportReport(schedulesByEmployee, 'schedule-report')}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Schedules
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Missed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedulesByEmployee.map((employee, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.scheduled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.missed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.total > 0 ? ((employee.completed / employee.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive reports for attendance, payroll, and scheduling data
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="attendance">Attendance Report</option>
              <option value="payroll">Payroll Report</option>
              <option value="schedule">Schedule Report</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'attendance' && renderAttendanceReport()}
      {reportType === 'payroll' && renderPayrollReport()}
      {reportType === 'schedule' && renderScheduleReport()}
    </div>
  );
};

export default Reports;