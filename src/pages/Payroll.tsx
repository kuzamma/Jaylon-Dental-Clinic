import React, { useState } from 'react';
import { useAppContext, PayrollEntry } from '../context/AppContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { 
  DollarSign, 
  Calculator, 
  FileText, 
  Download, 
  Eye,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const Payroll: React.FC = () => {
  const { state, createPayroll, updatePayroll, refreshData } = useAppContext();
  const { employees, attendance, payroll, loading } = state;
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPayStub, setShowPayStub] = useState<PayrollEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  const calculatePayroll = (employeeId: string, startDate: Date, endDate: Date) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return null;

    const employeeAttendance = attendance.filter(record => {
      const recordDate = parseISO(record.date);
      return record.employeeId === employeeId && 
             recordDate >= startDate && 
             recordDate <= endDate &&
             record.totalHours;
    });

    const regularHours = employeeAttendance.reduce((sum, record) => {
      const hours = record.totalHours || 0;
      const overtime = record.overtime || 0;
      return sum + (hours - overtime);
    }, 0);

    const overtimeHours = employeeAttendance.reduce((sum, record) => 
      sum + (record.overtime || 0), 0
    );

    const regularPay = regularHours * employee.hourlyRate;
    const overtimePay = overtimeHours * employee.hourlyRate * 1.5; // Time and a half
    const grossPay = regularPay + overtimePay;
    
    // Calculate Philippine deductions
    const withholdingTax = calculateWithholdingTax(grossPay); // Philippine withholding tax
    const sssContribution = calculateSSS(grossPay); // SSS contribution
    const philHealthContribution = calculatePhilHealth(grossPay); // PhilHealth contribution
    const pagIbigContribution = calculatePagIbig(grossPay); // Pag-IBIG contribution
    
    const totalDeductions = withholdingTax + sssContribution + philHealthContribution + pagIbigContribution;
    
    const netPay = grossPay - totalDeductions;

    return {
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      regularPay: Math.round(regularPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      deductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      taxBreakdown: {
        withholdingTax: Math.round(withholdingTax * 100) / 100,
        sssContribution: Math.round(sssContribution * 100) / 100,
        philHealthContribution: Math.round(philHealthContribution * 100) / 100,
        pagIbigContribution: Math.round(pagIbigContribution * 100) / 100,
      }
    };
  };

  // Philippine tax calculation functions
  const calculateWithholdingTax = (grossPay: number): number => {
    // Simplified Philippine withholding tax calculation (monthly basis)
    if (grossPay <= 20833) return 0; // Below minimum taxable income
    if (grossPay <= 33333) return (grossPay - 20833) * 0.15;
    if (grossPay <= 66667) return 1875 + (grossPay - 33333) * 0.20;
    if (grossPay <= 166667) return 8541.80 + (grossPay - 66667) * 0.25;
    if (grossPay <= 666667) return 33541.80 + (grossPay - 166667) * 0.30;
    return 183541.80 + (grossPay - 666667) * 0.35;
  };

  const calculateSSS = (grossPay: number): number => {
    // SSS contribution table (2024 rates)
    if (grossPay < 4000) return 180; // Minimum contribution
    if (grossPay >= 30000) return 1350; // Maximum contribution
    
    // Calculate based on salary bracket (simplified)
    const bracket = Math.floor(grossPay / 1000) * 1000;
    return Math.min(bracket * 0.045, 1350); // 4.5% employee share, max 1350
  };

  const calculatePhilHealth = (grossPay: number): number => {
    // PhilHealth contribution (2024 rates)
    const monthlyBasicSalary = grossPay;
    if (monthlyBasicSalary <= 10000) return 500; // Minimum contribution
    if (monthlyBasicSalary >= 100000) return 5000; // Maximum contribution
    
    return monthlyBasicSalary * 0.05; // 5% of basic salary (employee share is 2.5%)
  };

  const calculatePagIbig = (grossPay: number): number => {
    // Pag-IBIG contribution (2024 rates)
    if (grossPay <= 1500) return grossPay * 0.01; // 1% for salary ≤ 1,500
    return Math.min(grossPay * 0.02, 200); // 2% for salary > 1,500, max 200
  };

  const generatePayroll = async () => {
    setIsGenerating(true);
    setGenerationStatus('Starting payroll generation...');
    
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(startDate);

      const activeEmployees = employees.filter(emp => emp.isActive);
      let successCount = 0;
      let errorCount = 0;

      setGenerationStatus(`Processing ₱ ${activeEmployees.length} employees...`);

      for (const employee of activeEmployees) {
        try {
          const calculation = calculatePayroll(employee.id, startDate, endDate);
          if (!calculation) {
            console.warn(`No calculation data for employee ${employee.id}`);
            continue;
          }

          // Check if payroll already exists for this period
          const existingPayroll = payroll.find(entry => 
            entry.employeeId === employee.id &&
            entry.payPeriodStart === format(startDate, 'yyyy-MM-dd')
          );

          if (!existingPayroll) {
            setGenerationStatus(`Processing ${employee.firstName} ${employee.lastName}...`);
            
            const newPayrollEntry: Omit<PayrollEntry, 'id'> = {
              employeeId: employee.id,
              payPeriodStart: format(startDate, 'yyyy-MM-dd'),
              payPeriodEnd: format(endDate, 'yyyy-MM-dd'),
              regularHours: calculation.regularHours,
              overtimeHours: calculation.overtimeHours,
              regularPay: calculation.regularPay,
              overtimePay: calculation.overtimePay,
              deductions: calculation.deductions,
              netPay: calculation.netPay,
              status: 'pending',
            };

            await createPayroll(newPayrollEntry);
            successCount++;
          } else {
            console.log(`Payroll already exists for ${employee.firstName} ${employee.lastName}`);
          }
        } catch (error) {
          console.error(`Error processing payroll for employee ${employee.id}:`, error);
          errorCount++;
        }
      }

      setGenerationStatus('Refreshing data...');
      await refreshData();

      const message = `Payroll generation completed!\n\nSuccessfully processed: ${successCount} employees\nErrors: ${errorCount} employees\n\nPayroll entries have been created and are ready for review.`;
      alert(message);
      
    } catch (error) {
      console.error('Error generating payroll:', error);
      alert('Failed to generate payroll. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const updatePayrollStatus = async (payrollId: string, status: 'pending' | 'processed' | 'paid') => {
    try {
      await updatePayroll(payrollId, { status });
      
      // Show success message
      const payrollEntry = payroll.find(entry => entry.id === payrollId);
      if (payrollEntry) {
        const employee = employees.find(emp => emp.id === payrollEntry.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';
        alert(`✅ ${employeeName}'s payroll status updated to "${status}"`);
      }
    } catch (error) {
      console.error('Error updating payroll status:', error);
      alert('Failed to update payroll status. Please try again.');
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processed':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const currentMonthPayroll = payroll.filter(entry => {
    const entryMonth = format(parseISO(entry.payPeriodStart), 'yyyy-MM');
    return entryMonth === selectedMonth;
  });

  const totalPayroll = currentMonthPayroll.reduce((sum, entry) => sum + entry.netPay, 0);
  const paidAmount = currentMonthPayroll
    .filter(entry => entry.status === 'paid')
    .reduce((sum, entry) => sum + entry.netPay, 0);

  const PayStubModal: React.FC<{ payrollEntry: PayrollEntry }> = ({ payrollEntry }) => {
    const employee = employees.find(emp => emp.id === payrollEntry.employeeId);
    if (!employee) return null;

    const calculation = calculatePayroll(
      payrollEntry.employeeId,
      parseISO(payrollEntry.payPeriodStart),
      parseISO(payrollEntry.payPeriodEnd)
    );

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-8 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="bg-white p-8">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Jaylon Dental Clinic</h2>
                    <p className="text-gray-600">Pay Stub</p>
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
                    <p><span className="font-medium">Name:</span> {employee.firstName} {employee.lastName}</p>
                    <p><span className="font-medium">Position:</span> {employee.position}</p>
                    <p><span className="font-medium">Employee ID:</span> {employee.id}</p>
                    <p><span className="font-medium">Hourly Rate:</span> ₱{employee.hourlyRate.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Pay Summary</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Regular Hours:</span> {payrollEntry.regularHours.toFixed(2)}</p>
                    <p><span className="font-medium">Overtime Hours:</span> {payrollEntry.overtimeHours.toFixed(2)}</p>
                    <p><span className="font-medium">Gross Pay:</span> ₱{(payrollEntry.regularPay + payrollEntry.overtimePay).toFixed(2)}</p>
                    <p><span className="font-medium">Net Pay:</span> ₱{payrollEntry.netPay.toFixed(2)}</p>
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
                          <td className="px-3 py-2">Overtime Pay</td>
                          <td className="px-3 py-2 text-right">₱{payrollEntry.overtimePay.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t bg-gray-50 font-medium">
                          <td className="px-3 py-2">Gross Pay</td>
                          <td className="px-3 py-2 text-right">₱{(payrollEntry.regularPay + payrollEntry.overtimePay).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Deductions</h3>
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
                          <td className="px-3 py-2">Philippine withholding tax</td>
                          <td className="px-3 py-2 text-right">₱{calculation?.taxBreakdown.withholdingTax.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">SSS contribution </td>
                          <td className="px-3 py-2 text-right">₱{calculation?.taxBreakdown.sssContribution.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">PhilHealth contribution</td>
                          <td className="px-3 py-2 text-right">₱{calculation?.taxBreakdown.philHealthContribution.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2">Pag-IBIG contribution</td>
                          <td className="px-3 py-2 text-right">₱{calculation?.taxBreakdown.pagIbigContribution.toFixed(2) || '0.00'}</td>
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
                onClick={() => setShowPayStub(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2 inline" />
                Print/Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Calculate and manage employee payroll with automated attendance integration
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={generatePayroll}
            disabled={isGenerating || loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate Payroll
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && generationStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Loader className="h-5 w-5 text-blue-600 animate-spin mr-3" />
            <div>
              <p className="text-blue-800 font-medium">Processing Payroll</p>
              <p className="text-blue-700 text-sm">{generationStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Pay Period:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900">₱{totalPayroll.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900">₱{paidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonthPayroll.filter(entry => entry.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Processed</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonthPayroll.filter(entry => entry.status !== 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Payroll Entries - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
          </h3>
          
          {currentMonthPayroll.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll entries</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate payroll for this month to see entries here.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={generatePayroll}
                  disabled={isGenerating}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Payroll
                </button>
              </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentMonthPayroll.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(entry.employeeId)}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{entry.deductions.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{entry.netPay.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(entry.status)}
                          <span className={`ml-2 text-sm font-medium capitalize ${
                            entry.status === 'paid' ? 'text-green-800' :
                            entry.status === 'processed' ? 'text-yellow-800' :
                            'text-red-800'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowPayStub(entry)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Pay Stub"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {entry.status === 'pending' && (
                            <button
                              onClick={() => updatePayrollStatus(entry.id, 'processed')}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Processed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {entry.status === 'processed' && (
                            <button
                              onClick={() => updatePayrollStatus(entry.id, 'paid')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Mark as Paid"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
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

      {showPayStub && <PayStubModal payrollEntry={showPayStub} />}
    </div>
  );
};

export default Payroll;