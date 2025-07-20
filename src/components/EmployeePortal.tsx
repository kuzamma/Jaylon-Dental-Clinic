import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, isToday, parseISO } from 'date-fns';
import logo from '../assets/log.png';
import { 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  LogOut, 
  QrCode,
  Camera,
  AlertTriangle,
  Edit,
  Lock,
  Phone,
  Mail,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  Save,
  X,
  Download,
  FileText
} from 'lucide-react';
import QRCodeScanner from './QRCodeScanner';
import QRCodeGenerator from './QRCodeGenerator';
import Footer from './Footer';


interface EmployeePortalProps {
  onLogout: () => void;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ onLogout }) => {
  const { 
    state, 
    createAttendance, 
    updateAttendance,
    updateEmployeeProfile,
    updateEmployeePassword 
  } = useAppContext();
  const { employees, schedules, attendance, payroll } = state;
  
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'attendance' | 'schedule' | 'payroll'>('dashboard');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessingAttendance, setIsProcessingAttendance] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPayrollSlip, setShowPayrollSlip] = useState<any>(null);

  // Get current employee (assuming first employee for demo)
  const currentEmployee = employees[0];
  
  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Employee Data Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your employee information.</p>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Get employee's data
  const employeeSchedules = schedules.filter(schedule => schedule.employeeId === currentEmployee.id);
  const employeeAttendance = attendance.filter(record => record.employeeId === currentEmployee.id);
  const employeePayroll = payroll.filter(entry => entry.employeeId === currentEmployee.id);
  
  // Today's data
  const todaySchedule = employeeSchedules.find(schedule => 
    isToday(parseISO(schedule.date))
  );
  const todayAttendance = employeeAttendance.find(record => 
    isToday(parseISO(record.date))
  );

  // Philippine tax calculation functions
  const calculateWithholdingTax = (grossPay: number): number => {
    if (grossPay <= 20833) return 0;
    if (grossPay <= 33333) return (grossPay - 20833) * 0.15;
    if (grossPay <= 66667) return 1875 + (grossPay - 33333) * 0.20;
    if (grossPay <= 166667) return 8541.80 + (grossPay - 66667) * 0.25;
    if (grossPay <= 666667) return 33541.80 + (grossPay - 166667) * 0.30;
    return 183541.80 + (grossPay - 666667) * 0.35;
  };

  const calculateSSS = (grossPay: number): number => {
    if (grossPay < 4000) return 180;
    if (grossPay >= 30000) return 1350;
    const bracket = Math.floor(grossPay / 1000) * 1000;
    return Math.min(bracket * 0.045, 1350);
  };

  const calculatePhilHealth = (grossPay: number): number => {
    if (grossPay <= 10000) return 500;
    if (grossPay >= 100000) return 5000;
    return grossPay * 0.025; // 2.5% employee share
  };

  const calculatePagIbig = (grossPay: number): number => {
    if (grossPay <= 1500) return grossPay * 0.01;
    return Math.min(grossPay * 0.02, 200);
  };

  // Handle QR code scan
  const handleQRScan = async (qrData: string) => {
    setIsProcessingAttendance(true);
    setScanResult(qrData);
    
    try {
      const parsedData = JSON.parse(qrData);
      
      // Verify this is the correct employee's QR code
      if (parsedData.employeeId !== currentEmployee.id) {
        throw new Error('This QR code belongs to a different employee');
      }

      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const timeStr = format(now, 'HH:mm:ss');

      if (todayAttendance && !todayAttendance.clockOut) {
        // Clock out
        await updateAttendance(todayAttendance.id, {
          clockOut: timeStr,
          totalHours: calculateHours(todayAttendance.clockIn, timeStr),
        });
        alert('Successfully clocked out!');
      } else if (!todayAttendance) {
        // Clock in
        const status = determineAttendanceStatus(timeStr);
        await createAttendance({
          employeeId: currentEmployee.id,
          date: dateStr,
          clockIn: timeStr,
          status: status,
          lateMinutes: status === 'late' ? calculateLateMinutes(timeStr) : 0,
        });
        alert('Successfully clocked in!');
      } else {
        alert('You have already completed attendance for today.');
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      alert(`Error processing attendance: ${error.message}`);
    } finally {
      setIsProcessingAttendance(false);
      setShowQRScanner(false);
      setScanResult(null);
    }
  };

  const calculateHours = (clockIn: string, clockOut: string): number => {
    const start = new Date(`2000-01-01T${clockIn}`);
    const end = new Date(`2000-01-01T${clockOut}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const determineAttendanceStatus = (clockInTime: string): 'present' | 'late' => {
    const clockIn = new Date(`2000-01-01T${clockInTime}`);
    const gracePeriodEnd = new Date(`2000-01-01T08:15:00`);
    return clockIn <= gracePeriodEnd ? 'present' : 'late';
  };

  const calculateLateMinutes = (clockInTime: string): number => {
    const clockIn = new Date(`2000-01-01T${clockInTime}`);
    const gracePeriodEnd = new Date(`2000-01-01T08:15:00`);
    return Math.round((clockIn.getTime() - gracePeriodEnd.getTime()) / (1000 * 60));
  };

  const getAttendanceStatus = () => {
    if (!todayAttendance) return { status: 'not-clocked-in', text: 'Not Clocked In', color: 'text-gray-500' };
    if (!todayAttendance.clockOut) return { status: 'clocked-in', text: 'Clocked In', color: 'text-green-600' };
    return { status: 'completed', text: 'Day Completed', color: 'text-blue-600' };
  };

  const attendanceStatus = getAttendanceStatus();

  // Payroll Slip Modal Component
  const PayrollSlipModal: React.FC<{ payrollEntry: any }> = ({ payrollEntry }) => {
    const grossPay = payrollEntry.regularPay + payrollEntry.overtimePay;
    
    // Calculate Philippine deductions
    const withholdingTax = calculateWithholdingTax(grossPay);
    const sssContribution = calculateSSS(grossPay);
    const philHealthContribution = calculatePhilHealth(grossPay);
    const pagIbigContribution = calculatePagIbig(grossPay);

    const printPayrollSlip = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payroll Slip - ${currentEmployee.firstName} ${currentEmployee.lastName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
              }
              .payroll-slip {
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
              }
              .header {
                background: #1f2937;
                color: white;
                padding: 20px;
                text-align: center;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .document-title {
                font-size: 18px;
                opacity: 0.9;
              }
              .content {
                padding: 30px;
              }
              .employee-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
                padding: 20px;
                background: #f9fafb;
                border-radius: 8px;
              }
              .info-section h3 {
                font-size: 16px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 5px;
              }
              .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
              }
              .info-label {
                font-weight: 500;
                color: #6b7280;
              }
              .info-value {
                font-weight: 600;
                color: #1f2937;
              }
              .earnings-deductions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
              }
              .section {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
              }
              .section-header {
                background: #f3f4f6;
                padding: 15px;
                font-weight: bold;
                color: #1f2937;
                border-bottom: 1px solid #e5e7eb;
              }
              .section-content {
                padding: 0;
              }
              .line-item {
                display: flex;
                justify-content: space-between;
                padding: 12px 15px;
                border-bottom: 1px solid #f3f4f6;
                font-size: 14px;
              }
              .line-item:last-child {
                border-bottom: none;
              }
              .line-item.total {
                background: #f9fafb;
                font-weight: bold;
                border-top: 2px solid #e5e7eb;
              }
              .net-pay {
                background: #dbeafe;
                border: 2px solid #3b82f6;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin-top: 20px;
              }
              .net-pay-label {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 5px;
              }
              .net-pay-amount {
                font-size: 32px;
                font-weight: bold;
                color: #1d4ed8;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                .payroll-slip { border: 1px solid #000; }
              }
            </style>
          </head>
          <body>
            <div class="payroll-slip">
              <div class="header">
                <div class="company-name">Jaylon Dental Clinic</div>
                <div class="document-title">Payroll Slip</div>
              </div>
              
              <div class="content">
                <div class="employee-info">
                  <div class="info-section">
                    <h3>Employee Information</h3>
                    <div class="info-item">
                      <span class="info-label">Name:</span>
                      <span class="info-value">${currentEmployee.firstName} ${currentEmployee.lastName}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Position:</span>
                      <span class="info-value">${currentEmployee.position}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Department:</span>
                      <span class="info-value">${currentEmployee.department}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Employee ID:</span>
                      <span class="info-value">${currentEmployee.id}</span>
                    </div>
                  </div>
                  
                  <div class="info-section">
                    <h3>Pay Period</h3>
                    <div class="info-item">
                      <span class="info-label">Period:</span>
                      <span class="info-value">${format(parseISO(payrollEntry.payPeriodStart), 'MMM dd')} - ${format(parseISO(payrollEntry.payPeriodEnd), 'MMM dd, yyyy')}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Hourly Rate:</span>
                      <span class="info-value">₱${currentEmployee.hourlyRate.toFixed(2)}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Regular Hours:</span>
                      <span class="info-value">${payrollEntry.regularHours.toFixed(2)}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Overtime Hours:</span>
                      <span class="info-value">${payrollEntry.overtimeHours.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div class="earnings-deductions">
                  <div class="section">
                    <div class="section-header">Earnings</div>
                    <div class="section-content">
                      <div class="line-item">
                        <span>Regular Pay</span>
                        <span>₱${payrollEntry.regularPay.toFixed(2)}</span>
                      </div>
                      <div class="line-item">
                        <span>Overtime Pay (25%)</span>
                        <span>₱${payrollEntry.overtimePay.toFixed(2)}</span>
                      </div>
                      <div class="line-item total">
                        <span>Gross Pay</span>
                        <span>₱${grossPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div class="section">
                    <div class="section-header">Deductions</div>
                    <div class="section-content">
                      <div class="line-item">
                        <span>Withholding Tax</span>
                        <span>₱${withholdingTax.toFixed(2)}</span>
                      </div>
                      <div class="line-item">
                        <span>SSS Contribution</span>
                        <span>₱${sssContribution.toFixed(2)}</span>
                      </div>
                      <div class="line-item">
                        <span>PhilHealth</span>
                        <span>₱${philHealthContribution.toFixed(2)}</span>
                      </div>
                      <div class="line-item">
                        <span>Pag-IBIG</span>
                        <span>₱${pagIbigContribution.toFixed(2)}</span>
                      </div>
                      <div class="line-item total">
                        <span>Total Deductions</span>
                        <span>₱${payrollEntry.deductions.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="net-pay">
                  <div class="net-pay-label">Net Pay</div>
                  <div class="net-pay-amount">₱${payrollEntry.netPay.toFixed(2)}</div>
                </div>

                <div class="footer">
                  <p>This is a computer-generated payroll slip.</p>
                  <p>Generated on ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}</p>
                  <p>Jaylon Dental Clinic - Employee Management System</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="bg-white">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Jaylon Dental Clinic</h2>
                    <p className="text-gray-600">Payroll Slip</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pay Period</p>
                    <p className="font-medium">
                      {format(parseISO(payrollEntry.payPeriodStart), 'MMM dd')} - {format(parseISO(payrollEntry.payPeriodEnd), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Employee Information</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {currentEmployee.firstName} {currentEmployee.lastName}</p>
                    <p><span className="font-medium">Position:</span> {currentEmployee.position}</p>
                    <p><span className="font-medium">Department:</span> {currentEmployee.department}</p>
                    <p><span className="font-medium">Employee ID:</span> {currentEmployee.id}</p>
                    <p><span className="font-medium">Hourly Rate:</span> ₱{currentEmployee.hourlyRate.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Pay Summary</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Regular Hours:</span> {payrollEntry.regularHours.toFixed(2)}</p>
                    <p><span className="font-medium">Overtime Hours:</span> {payrollEntry.overtimeHours.toFixed(2)}</p>
                    <p><span className="font-medium">Gross Pay:</span> ₱{grossPay.toFixed(2)}</p>
                    <p><span className="font-medium">Total Deductions:</span> ₱{payrollEntry.deductions.toFixed(2)}</p>
                    <p><span className="font-medium text-blue-600">Net Pay:</span> ₱{payrollEntry.netPay.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Earnings</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-3 py-2">Regular Pay</td>
                          <td className="px-3 py-2 text-right">₱{payrollEntry.regularPay.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">Overtime Pay (25%)</td>
                          <td className="px-3 py-2 text-right">₱{payrollEntry.overtimePay.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t bg-gray-50 font-medium">
                          <td className="px-3 py-2">Gross Pay</td>
                          <td className="px-3 py-2 text-right">₱{grossPay.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Deductions (Philippine Standards)</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-3 py-2">Withholding Tax</td>
                          <td className="px-3 py-2 text-right">₱{withholdingTax.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">SSS Contribution</td>
                          <td className="px-3 py-2 text-right">₱{sssContribution.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">PhilHealth</td>
                          <td className="px-3 py-2 text-right">₱{philHealthContribution.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">Pag-IBIG</td>
                          <td className="px-3 py-2 text-right">₱{pagIbigContribution.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t bg-gray-50 font-medium">
                          <td className="px-3 py-2">Total Deductions</td>
                          <td className="px-3 py-2 text-right">₱{payrollEntry.deductions.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Net Pay</span>
                  <span className="text-2xl font-bold text-blue-600">₱{payrollEntry.netPay.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowPayrollSlip(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={printPayrollSlip}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2 inline" />
                Print/Download
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Profile editing components
  const EditProfileModal: React.FC = () => {
    const [formData, setFormData] = useState({
      firstName: currentEmployee.firstName,
      lastName: currentEmployee.lastName,
      email: currentEmployee.email,
      phone: currentEmployee.phone,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        await updateEmployeeProfile(currentEmployee.id, formData);
        alert('Profile updated successfully!');
        setShowEditProfile(false);
      } catch (error: any) {
        alert(`Failed to update profile: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
            <button
              onClick={() => setShowEditProfile(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ChangePasswordModal: React.FC = () => {
    const [formData, setFormData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
      current: false,
      new: false,
      confirm: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (formData.newPassword !== formData.confirmPassword) {
        alert('New passwords do not match');
        return;
      }

      if (formData.newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
      }

      setIsSubmitting(true);
      
      try {
        await updateEmployeePassword(currentEmployee.id, formData.currentPassword, formData.newPassword);
        alert('Password updated successfully!');
        setShowChangePassword(false);
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } catch (error: any) {
        alert(`Failed to update password: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
            <button
              onClick={() => setShowChangePassword(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={logo} alt="Jaylon Dental Logo" className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Employee Portal</h1>
                <p className="text-sm text-gray-600">Welcome, {currentEmployee.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowQRScanner(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </button>
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: User },
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'attendance', name: 'Attendance', icon: Clock },
              { id: 'schedule', name: 'Schedule', icon: Calendar },
              { id: 'payroll', name: 'Payroll', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Today's Status</p>
                    <p className={`text-lg font-semibold ${attendanceStatus.color}`}>
                      {attendanceStatus.text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">This Week</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {employeeSchedules.filter(s => {
                        const scheduleDate = parseISO(s.date);
                        const weekStart = new Date();
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
                      }).length} Shifts
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">This Month</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ₱{employeePayroll.reduce((sum, entry) => sum + entry.netPay, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            {todaySchedule && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Schedule</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Shift Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {todaySchedule.startTime} - {todaySchedule.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="text-lg font-semibold text-gray-900">{todaySchedule.position}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      todaySchedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                      todaySchedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {todaySchedule.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Clock In/Out with QR
                </button>
                <button
                  onClick={() => setShowQRGenerator(true)}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  View My QR Code
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium text-gray-900">
                          {currentEmployee.firstName} {currentEmployee.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{currentEmployee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{currentEmployee.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Position</p>
                        <p className="font-medium text-gray-900">{currentEmployee.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium text-gray-900">{currentEmployee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Hire Date</p>
                        <p className="font-medium text-gray-900">
                          {format(parseISO(currentEmployee.hireDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Security</h3>
              </div>
              <div className="px-6 py-4">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Attendance History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeeAttendance.slice(0, 10).map((record) => (
                      <tr key={record.id}>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'present' ? 'On Time' : record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Schedules</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeeSchedules.slice(0, 10).map((schedule) => (
                      <tr key={schedule.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(schedule.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schedule.startTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schedule.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schedule.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                            schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {schedule.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Payroll History & Slips</h3>
                <p className="text-sm text-gray-600 mt-1">View and download your payroll slips with Philippine deductions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pay Period
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
                        Net Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeePayroll.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(entry.payPeriodStart), 'MMM dd')} - {format(parseISO(entry.payPeriodEnd), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.regularHours.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.overtimeHours.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₱{(entry.regularPay + entry.overtimePay).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₱{entry.netPay.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === 'paid' ? 'bg-green-100 text-green-800' :
                            entry.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => setShowPayrollSlip(entry)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {employeePayroll.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll records</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your payroll records will appear here once processed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

       {/* Footer */}
       <Footer />

      

      {/* Modals */}
      {showQRScanner && (
        <QRCodeScanner
          isOpen={showQRScanner}
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showQRGenerator && (
        <QRCodeGenerator
          employee={currentEmployee}
          onClose={() => setShowQRGenerator(false)}
        />
      )}

      {showEditProfile && <EditProfileModal />}
      {showChangePassword && <ChangePasswordModal />}
      {showPayrollSlip && <PayrollSlipModal payrollEntry={showPayrollSlip} />}
    </div>
  );
};

export default EmployeePortal;