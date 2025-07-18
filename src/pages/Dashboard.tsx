import React from 'react';
import { useAppContext } from '../context/AppContext';
import { format, isToday, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const { employees, schedules, attendance, payroll } = state;

  // Calculate statistics
  const activeEmployees = employees.filter(emp => emp.isActive).length;
  const todaySchedules = schedules.filter(schedule => 
    isToday(parseISO(schedule.date))
  ).length;
  const todayAttendance = attendance.filter(record => 
    isToday(parseISO(record.date))
  );
  const presentToday = todayAttendance.filter(record => record.status === 'present').length;
  const monthlyPayroll = payroll.reduce((sum, entry) => sum + entry.netPay, 0);

  // Replace dummy data with actual data from the state
  const attendanceByDay = attendance.reduce((acc: { day: string; present: number; absent: number; late: number }[], record) => {
    const day = format(parseISO(record.date), 'EEE');
    const dayData = acc.find(item => item.day === day);

    if (dayData) {
      if (record.status === 'present') dayData.present++;
      if (record.status === 'absent') dayData.absent++;
      if (record.status === 'late') dayData.late++;
    } else {
      acc.push({
        day,
        present: record.status === 'present' ? 1 : 0,
        absent: record.status === 'absent' ? 1 : 0,
        late: record.status === 'late' ? 1 : 0,
      });
    }

    return acc;
  }, []);

  const departmentData = employees.reduce((acc: { name: string; value: number; color: string }[], emp) => {
    const department = emp.department || 'Unknown';
    const departmentEntry = acc.find(item => item.name === department);

    if (departmentEntry) {
      departmentEntry.value++;
    } else {
      acc.push({ name: department, value: 1, color: '#'+Math.floor(Math.random()*16777215).toString(16) });
    }

    return acc;
  }, []);

  const payrollTrend = payroll.map(entry => ({
    month: format(parseISO(entry.payPeriodEnd), 'MMM'), // Using 'pay_period_end' from the payroll table
    amount: entry.netPay,
  }));

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    change?: string;
    changeType?: 'positive' | 'negative';
  }> = ({ title, value, icon: Icon, color, change, changeType }) => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                    <span className="ml-1">{change}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to Jaylon Dental Clinic's Employee Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Active Employees"
          value={activeEmployees}
          icon={Users}
          color="text-blue-600"
          change="+2"
          changeType="positive"
        />
        <StatCard
          title="Today's Schedules"
          value={todaySchedules}
          icon={Calendar}
          color="text-teal-600"
        />
        <StatCard
          title="Present Today"
          value={`${presentToday}/${todayAttendance.length}`}
          icon={Clock}
          color="text-green-600"
        />
        <StatCard
          title="Monthly Payroll"
          value={`₱${monthlyPayroll.toLocaleString()}`}
          icon={DollarSign}
          color="text-purple-600"
          change="+5.2%"
          changeType="positive"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Attendance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
              <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payroll Trend */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={payrollTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`₱${value.toLocaleString()}`, 'Amount']} />
            <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">Sarah Johnson clocked in at 8:15 AM</p>
              <p className="text-xs text-gray-500">5 minutes ago</p>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">Schedule conflict detected for tomorrow</p>
              <p className="text-xs text-gray-500">1 hour ago</p>
            </div>
          </div>
          <div className="px-6 py-4 flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">Michael Chen marked absent</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    
  );

  
};



export default Dashboard;