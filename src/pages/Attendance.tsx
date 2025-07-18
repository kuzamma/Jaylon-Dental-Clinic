import React, { useState, useRef } from 'react';
import { useAppContext, AttendanceRecord } from '../context/AppContext';
import { format, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Filter,
  Users,
  TrendingUp
} from 'lucide-react';
import QRCodeScanner from '../components/QRCodeScanner';

const Attendance: React.FC = () => {
  const { state, dispatch, createAttendance, updateAttendance } = useAppContext();
  const { attendance, employees } = state;
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isProcessingAttendance, setIsProcessingAttendance] = useState(false);

  // Attendance time rules
  const STANDARD_START_TIME = '08:00'; // 8:00 AM
  const GRACE_PERIOD_END = '08:15'; // 8:15 AM 
  const STANDARD_HOURS = 8; // Standard work hours per day

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getEmployeeById = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId);
  };

  const determineAttendanceStatus = (clockInTime: string) => {
    const clockIn = new Date(`2000-01-01T${clockInTime}`);
    const gracePeriodEnd = new Date(`2000-01-01T${GRACE_PERIOD_END}`);

    if (clockIn <= gracePeriodEnd) {
      return 'present'; // On time or within grace period
    } else {
      return 'late'; // After grace period
    }
  };

  const calculateHoursAndPay = (clockInTime: string, clockOutTime: string, status: string) => {
    const clockIn = new Date(`2000-01-01T${clockInTime}`);
    const clockOut = new Date(`2000-01-01T${clockOutTime}`);

    let effectiveClockIn = clockIn;

    // For late arrivals, calculate from when they actually arrived
    if (status === 'late') {
      effectiveClockIn = clockIn; // They only get paid from when they actually arrived
    } else {
      // Present employees get paid from their actual clock in time
      effectiveClockIn = clockIn;
    }

    // Calculate total actual hours worked
    const actualHoursWorked = (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60);
    
    // Calculate regular and overtime hours
    const regularHours = Math.min(actualHoursWorked, STANDARD_HOURS);
    const overtimeHours = Math.max(0, actualHoursWorked - STANDARD_HOURS);
    const lateMinutes = status === 'late' ? Math.round((clockIn.getTime() - new Date(`2000-01-01T${GRACE_PERIOD_END}`).getTime()) / (1000 * 60)) : 0;

    return {
      totalHours: Math.round(actualHoursWorked * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtime: Math.round(overtimeHours * 100) / 100,
      payableHours: Math.round(actualHoursWorked * 100) / 100,
      lateMinutes
    };
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesDate = filterDate ? record.date === filterDate : true;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  const todaysAttendance = attendance.filter(record => 
    isToday(parseISO(record.date))
  );

  // Handle QR code scan for attendance
  const handleQRScan = async (qrData: string) => {
    setIsProcessingAttendance(true);
    
    try {
      const parsedData = JSON.parse(qrData);
      
      if (!parsedData.employeeId || !parsedData.firstName || !parsedData.lastName) {
        throw new Error('Invalid QR code format');
      }

      const employee = employees.find(emp => emp.id === parsedData.employeeId);
      if (!employee) {
        throw new Error('Employee not found in system');
      }

      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const timeStr = format(now, 'HH:mm:ss');

      const existingRecord = attendance.find(record => 
        record.employeeId === parsedData.employeeId && record.date === dateStr
      );

      if (existingRecord && !existingRecord.clockOut) {
        // Clock out
        const status = existingRecord.status;
        const calculation = calculateHoursAndPay(existingRecord.clockIn, timeStr, status);

        await updateAttendance(existingRecord.id, {
          clockOut: timeStr,
          totalHours: calculation.totalHours,
          regularHours: calculation.regularHours,
          overtime: calculation.overtime,
          payableHours: calculation.payableHours,
          lateMinutes: calculation.lateMinutes,
        });

        alert(`✅ ${employee.firstName} ${employee.lastName} successfully clocked out!\nTotal hours: ${calculation.totalHours.toFixed(2)}`);
      } else if (!existingRecord) {
        // Clock in
        const status = determineAttendanceStatus(timeStr);
        const lateMinutes = status === 'late' ? Math.round((new Date(`2000-01-01T${timeStr}`).getTime() - new Date(`2000-01-01T${GRACE_PERIOD_END}`).getTime()) / (1000 * 60)) : 0;

        await createAttendance({
          employeeId: parsedData.employeeId,
          date: dateStr,
          clockIn: timeStr,
          status: status,
          lateMinutes,
        });

        const statusMessage = status === 'late' 
          ? `⚠️ ${employee.firstName} ${employee.lastName} clocked in late by ${lateMinutes} minutes`
          : `✅ ${employee.firstName} ${employee.lastName} clocked in on time`;
        
        alert(statusMessage);
      } else {
        alert(`ℹ️ ${employee.firstName} ${employee.lastName} has already completed attendance for today.`);
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      alert(`❌ Error processing attendance: ${error.message}`);
    } finally {
      setIsProcessingAttendance(false);
      setShowQrScanner(false);
    }
  };

  const handleManualClockIn = async (employeeId: string) => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm:ss');
    
    const existingRecord = attendance.find(record => 
      record.employeeId === employeeId && record.date === dateStr
    );

    try {
      if (existingRecord && !existingRecord.clockOut) {
        // Clock out
        const status = existingRecord.status;
        const calculation = calculateHoursAndPay(existingRecord.clockIn, timeStr, status);

        await updateAttendance(existingRecord.id, {
          clockOut: timeStr,
          totalHours: calculation.totalHours,
          regularHours: calculation.regularHours,
          overtime: calculation.overtime,
          payableHours: calculation.payableHours,
          lateMinutes: calculation.lateMinutes,
        });
      } else if (!existingRecord) {
        // Clock in
        const status = determineAttendanceStatus(timeStr);
        const lateMinutes = status === 'late' ? Math.round((new Date(`2000-01-01T${timeStr}`).getTime() - new Date(`2000-01-01T${GRACE_PERIOD_END}`).getTime()) / (1000 * 60)) : 0;

        await createAttendance({
          employeeId,
          date: dateStr,
          clockIn: timeStr,
          status: status,
          lateMinutes,
        });
      }
    } catch (error: any) {
      console.error('Manual clock in/out error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const exportAttendanceData = () => {
    const csvData = [
      ['Employee', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Regular Hours', 'Overtime', 'Late Minutes', 'Status'],
      ...filteredAttendance.map(record => [
        getEmployeeName(record.employeeId),
        record.date,
        record.clockIn,
        record.clockOut || 'Not clocked out',
        record.totalHours?.toString() || 'N/A',
        record.regularHours?.toString() || 'N/A',
        record.overtime?.toString() || '0',
        record.lateMinutes?.toString() || '0',
        record.status
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${filterDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'late':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">QR Code Attendance System</h1>
          <p className="mt-2 text-sm text-gray-700">
            Advanced attendance tracking with QR code scanning and real-time camera integration
          </p>
          <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p><strong>Attendance Rules:</strong></p>
            <p>• <strong>On Time:</strong> Clock in between 8:00 AM - 8:15 AM (Grace Period)</p>
            <p>• <strong>Late:</strong> Clock in after 8:15 AM (Pay calculated from actual clock-in time)</p>
            <p>• <strong>Overtime:</strong> Hours worked over 8 hours per day (1.5x rate)</p>
            <p>• <strong>QR Scanning:</strong> Use camera to scan employee QR codes for attendance</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <button
            type="button"
            onClick={() => setShowQrScanner(true)}
            disabled={isProcessingAttendance}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isProcessingAttendance ? 'Processing...' : 'Scan QR Code'}
          </button>
          <button
            type="button"
            onClick={exportAttendanceData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">On Time Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {todaysAttendance.filter(r => r.status === 'present').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Late Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {todaysAttendance.filter(r => r.status === 'late').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Absent Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(emp => emp.isActive).length - todaysAttendance.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(todaysAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <QrCode className="h-8 w-8 text-blue-600 mt-1 mr-4 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">QR Code Attendance Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-1">For Employees:</p>
                <ul className="space-y-1">
                  <li>• Get your personal QR code from admin or employee portal</li>
                  <li>• Present QR code to the scanning device</li>
                  <li>• Wait for confirmation message</li>
                  <li>• QR code works for both clock-in and clock-out</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">For Administrators:</p>
                <ul className="space-y-1">
                  <li>• Click "Scan QR Code" to open camera scanner</li>
                  <li>• Point camera at employee's QR code</li>
                  <li>• System automatically processes attendance</li>
                  <li>• View real-time attendance updates below</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Clock In/Out (Manual Override)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.filter(emp => emp.isActive).map(employee => {
            const todayRecord = todaysAttendance.find(r => r.employeeId === employee.id);
            const isClockedIn = todayRecord && !todayRecord.clockOut;
            
            return (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {todayRecord ? getStatusIcon(todayRecord.status) : <Clock className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {todayRecord 
                        ? `${todayRecord.clockIn}${todayRecord.clockOut ? ` - ${todayRecord.clockOut}` : ' (Active)'}`
                        : 'Not clocked in'
                      }
                    </p>
                    {todayRecord?.lateMinutes && todayRecord.lateMinutes > 0 && (
                      <p className="text-xs text-red-500">
                        Late by {todayRecord.lateMinutes} minutes
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleManualClockIn(employee.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    isClockedIn
                      ? 'text-red-700 bg-red-100 hover:bg-red-200'
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                >
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            );
          })}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="present">On Time</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => {
              setFilterStatus('all');
              setFilterDate(format(new Date(), 'yyyy-MM-dd'));
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Records</h3>
          
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
              <p className="mt-1 text-sm text-gray-500">
                No records found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overtime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late (min)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(record.employeeId)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getEmployeeById(record.employeeId)?.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(record.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockIn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockOut || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.totalHours?.toFixed(2) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.overtime?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.lateMinutes || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <span className={`ml-2 text-sm font-medium capitalize ${
                            record.status === 'present' ? 'text-green-800' :
                            record.status === 'late' ? 'text-yellow-800' :
                            'text-red-800'
                          }`}>
                            {record.status === 'present' ? 'On Time' : record.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQrScanner && (
        <QRCodeScanner
          isOpen={showQrScanner}
          onScan={handleQRScan}
          onClose={() => setShowQrScanner(false)}
        />
      )}
    </div>
  );
};

export default Attendance;