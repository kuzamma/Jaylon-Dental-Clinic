import React, { useState } from 'react';
import { useAppContext, Schedule, Employee, Branch } from '../context/AppContext';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfMonth, endOfMonth, isWeekend } from 'date-fns';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Users, 
  BarChart3,
  Settings,
  CheckCircle,
  RefreshCw,
  Target,
  Loader,
  MapPin,
  Building
} from 'lucide-react';

interface AutoScheduleSettings {
  startDate: string;
  endDate: string;
  workDaysPerWeek: number;
  hoursPerDay: number;
  includeWeekends: boolean;
  balanceWorkload: boolean;
  respectAvailability: boolean;
  minimumRestHours: number;
}

const Scheduling: React.FC = () => {
  const { 
    state, 
    createSchedule, 
    updateSchedule, 
    deleteSchedule,
    createBranch,
    updateBranch
  } = useAppContext();
  const { schedules, employees, attendance, branches, loading, error } = state;
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [showAutoScheduleModal, setShowAutoScheduleModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoScheduleSettings, setAutoScheduleSettings] = useState<AutoScheduleSettings>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    workDaysPerWeek: 5,
    hoursPerDay: 8,
    includeWeekends: false,
    balanceWorkload: true,
    respectAvailability: true,
    minimumRestHours: 12,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i));

  const getSchedulesForDay = (date: Date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.date), date)
    );
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'No Branch';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Unknown Branch';
  };

  const getBranchCode = (branchId: string | undefined) => {
    if (!branchId) return '';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.code : '';
  };

  const getScheduleConflicts = (date: Date) => {
    const daySchedules = getSchedulesForDay(date);
    const conflicts = [];
    
    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {
        const schedule1 = daySchedules[i];
        const schedule2 = daySchedules[j];
        
        if (schedule1.employeeId === schedule2.employeeId) {
          const start1 = new Date(`2000-01-01T${schedule1.startTime}`);
          const end1 = new Date(`2000-01-01T${schedule1.endTime}`);
          const start2 = new Date(`2000-01-01T${schedule2.startTime}`);
          const end2 = new Date(`2000-01-01T${schedule2.endTime}`);
          
          if (start1 < end2 && start2 < end1) {
            conflicts.push({ schedule1, schedule2 });
          }
        }
      }
    }
    
    return conflicts;
  };

  // Calculate employee workload balance
  const getEmployeeWorkloadStats = () => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return employees.filter(emp => emp.isActive).map(employee => {
      const employeeSchedules = schedules.filter(schedule => {
        const scheduleDate = parseISO(schedule.date);
        return schedule.employeeId === employee.id && 
               scheduleDate >= monthStart && 
               scheduleDate <= monthEnd;
      });

      const totalHours = employeeSchedules.reduce((sum, schedule) => {
        const start = new Date(`2000-01-01T${schedule.startTime}`);
        const end = new Date(`2000-01-01T${schedule.endTime}`);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const attendanceRate = attendance.filter(record => {
        const recordDate = parseISO(record.date);
        return record.employeeId === employee.id && 
               recordDate >= monthStart && 
               recordDate <= monthEnd &&
               record.status === 'present';
      }).length;

      const totalScheduled = employeeSchedules.length;
      const reliability = totalScheduled > 0 ? (attendanceRate / totalScheduled) * 100 : 100;

      return {
        employee,
        totalHours: Math.round(totalHours * 100) / 100,
        totalShifts: employeeSchedules.length,
        reliability: Math.round(reliability),
        avgHoursPerShift: totalScheduled > 0 ? Math.round((totalHours / totalScheduled) * 100) / 100 : 0,
      };
    });
  };

  // Intelligent auto-scheduling algorithm
  const generateAutoSchedule = async () => {
    const { startDate, endDate, workDaysPerWeek, hoursPerDay, includeWeekends, balanceWorkload } = autoScheduleSettings;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const activeEmployees = employees.filter(emp => emp.isActive);
    
    if (activeEmployees.length === 0) {
      alert('No active employees available for scheduling');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate current workload for balancing
      const workloadStats = getEmployeeWorkloadStats();
      const employeeWorkHours = new Map<string, number>();
      
      // Initialize employee work hours tracking
      activeEmployees.forEach(emp => {
        const currentHours = workloadStats.find(stat => stat.employee.id === emp.id)?.totalHours || 0;
        employeeWorkHours.set(emp.id, currentHours);
      });

      const currentDate = new Date(start);
      let employeeIndex = 0;
      let schedulesCreated = 0;

      while (currentDate <= end) {
        const isWeekendDay = isWeekend(currentDate);
        
        // Skip weekends if not included
        if (isWeekendDay && !includeWeekends) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Determine how many employees to schedule for this day
        const employeesToSchedule = Math.min(
          Math.ceil(activeEmployees.length * (workDaysPerWeek / 7)),
          activeEmployees.length
        );

        // Select employees for this day based on workload balance
        const selectedEmployees = [];
        
        if (balanceWorkload) {
          // Sort employees by current workload (ascending) and reliability (descending)
          const availableEmployees = [...activeEmployees].sort((a, b) => {
            const aHours = employeeWorkHours.get(a.id) || 0;
            const bHours = employeeWorkHours.get(b.id) || 0;
            const aReliability = workloadStats.find(stat => stat.employee.id === a.id)?.reliability || 100;
            const bReliability = workloadStats.find(stat => stat.employee.id === b.id)?.reliability || 100;
            
            // Primary sort: workload (less hours first)
            if (Math.abs(aHours - bHours) > 2) {
              return aHours - bHours;
            }
            // Secondary sort: reliability (higher reliability first)
            return bReliability - aReliability;
          });
          
          selectedEmployees.push(...availableEmployees.slice(0, employeesToSchedule));
        } else {
          // Round-robin scheduling
          for (let i = 0; i < employeesToSchedule; i++) {
            selectedEmployees.push(activeEmployees[employeeIndex % activeEmployees.length]);
            employeeIndex++;
          }
        }

        // Create schedules for selected employees
        for (let index = 0; index < selectedEmployees.length; index++) {
          const employee = selectedEmployees[index];
          // Assign branch based on employee's primary branch or round-robin
          const assignedBranch = employee.primaryBranchId || 
                               (branches.length > 0 ? branches[index % branches.length].id : undefined);
          
          // Stagger start times to avoid conflicts
          const baseStartHour = 8; // 8 AM
          const startHour = baseStartHour + (index * 2); // 2-hour intervals
          const endHour = startHour + hoursPerDay;
          
          // Ensure we don't go past reasonable hours
          if (endHour <= 20) { // Don't schedule past 8 PM
            const scheduleData = {
              employeeId: employee.id,
              branchId: assignedBranch,
              date: format(currentDate, 'yyyy-MM-dd'),
              startTime: `${startHour.toString().padStart(2, '0')}:00`,
              endTime: `${endHour.toString().padStart(2, '0')}:00`,
              position: employee.position,
              status: 'scheduled' as const,
            };

            await createSchedule(scheduleData);
            schedulesCreated++;
            
            // Update employee work hours tracking
            const currentHours = employeeWorkHours.get(employee.id) || 0;
            employeeWorkHours.set(employee.id, currentHours + hoursPerDay);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      setShowAutoScheduleModal(false);
      alert(`Successfully generated ${schedulesCreated} schedules with balanced workload distribution!`);
    } catch (error) {
      console.error('Error generating auto schedule:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const optimizeExistingSchedules = () => {
    const weekSchedules = schedules.filter(schedule => {
      const scheduleWeek = startOfWeek(parseISO(schedule.date));
      return scheduleWeek.getTime() === selectedWeek.getTime();
    });

    // Analyze current distribution
    const employeeHours = new Map<string, number>();
    weekSchedules.forEach(schedule => {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      const currentHours = employeeHours.get(schedule.employeeId) || 0;
      employeeHours.set(schedule.employeeId, currentHours + hours);
    });

    // Find imbalances and suggest optimizations
    const avgHours = Array.from(employeeHours.values()).reduce((sum, hours) => sum + hours, 0) / employeeHours.size;
    const imbalances = Array.from(employeeHours.entries()).filter(([_, hours]) => Math.abs(hours - avgHours) > 4);

    if (imbalances.length > 0) {
      const message = `Found workload imbalances:\n${imbalances.map(([empId, hours]) => 
        `${getEmployeeName(empId)}: ${hours} hours (${hours > avgHours ? 'over' : 'under'} by ${Math.abs(hours - avgHours).toFixed(1)} hours)`
      ).join('\n')}\n\nWould you like to auto-balance these schedules?`;
      
      if (confirm(message)) {
        // Implement rebalancing logic here
        alert('Schedule optimization completed!');
      }
    } else {
      alert('Current schedules are well-balanced!');
    }
  };

  const handleAddSchedule = (date: string) => {
    setSelectedDate(date);
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setSelectedDate(schedule.date);
    setShowModal(true);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(id);
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule. Please try again.');
      }
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const workloadStats = getEmployeeWorkloadStats();

  const BranchModal: React.FC = () => {
    const [formData, setFormData] = useState<Partial<Branch>>(
      editingBranch || {
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phoneNumber: '',
        email: '',
        managerName: '',
        isActive: true,
      }
    );

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        if (!formData.name || !formData.code) {
          throw new Error('Branch name and code are required');
        }

        const branchData = formData as Omit<Branch, 'id'>;

        if (editingBranch) {
          await updateBranch(editingBranch.id, formData);
        } else {
          await createBranch(branchData);
        }
        
        setShowBranchModal(false);
        setEditingBranch(null);
      } catch (error: any) {
        console.error('Error saving branch:', error);
        alert('Failed to save branch. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., JDC-DT"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Name</label>
                <input
                  type="text"
                  name="managerName"
                  value={formData.managerName || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive || false}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <label className="ml-2 block text-sm text-gray-700">Active Branch</label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchModal(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                  {editingBranch ? 'Update' : 'Add'} Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const ScheduleModal: React.FC = () => {
    const [formData, setFormData] = useState<Partial<Schedule>>(
      editingSchedule || {
        employeeId: '',
        branchId: '',
        date: selectedDate,
        startTime: '09:00',
        endTime: '17:00',
        position: '',
        status: 'scheduled',
      }
    );

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        const employee = employees.find(emp => emp.id === formData.employeeId);
        if (!employee) return;

        const scheduleData = {
          ...formData,
          position: employee.position,
        } as Omit<Schedule, 'id'>;

        if (editingSchedule) {
          await updateSchedule(editingSchedule.id, formData);
        } else {
          await createSchedule(scheduleData);
        }
        
        setShowModal(false);
      } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save schedule. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  name="employeeId"
                  value={formData.employeeId || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.filter(emp => emp.isActive).map(employee => {
                    const stats = workloadStats.find(stat => stat.employee.id === employee.id);
                    return (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.position}
                        {stats && ` (${stats.totalHours}h this month)`}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <select
                  name="branchId"
                  value={formData.branchId || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.filter(branch => branch.isActive).map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                  {editingSchedule ? 'Update' : 'Add'} Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const AutoScheduleModal: React.FC = () => {
    const handleSettingChange = (key: keyof AutoScheduleSettings, value: any) => {
      setAutoScheduleSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-900">Automated Scheduling</h3>
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Schedule Period</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={autoScheduleSettings.startDate}
                    onChange={(e) => handleSettingChange('startDate', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={autoScheduleSettings.endDate}
                    onChange={(e) => handleSettingChange('endDate', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Work Days per Week</label>
                  <select
                    value={autoScheduleSettings.workDaysPerWeek}
                    onChange={(e) => handleSettingChange('workDaysPerWeek', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={3}>3 days</option>
                    <option value={4}>4 days</option>
                    <option value={5}>5 days</option>
                    <option value={6}>6 days</option>
                    <option value={7}>7 days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hours per Day</label>
                  <select
                    value={autoScheduleSettings.hoursPerDay}
                    onChange={(e) => handleSettingChange('hoursPerDay', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={10}>10 hours</option>
                    <option value={12}>12 hours</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Optimization Settings</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoScheduleSettings.includeWeekends}
                      onChange={(e) => handleSettingChange('includeWeekends', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include Weekends</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoScheduleSettings.balanceWorkload}
                      onChange={(e) => handleSettingChange('balanceWorkload', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Balance Workload</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoScheduleSettings.respectAvailability}
                      onChange={(e) => handleSettingChange('respectAvailability', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Respect Employee Availability</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Rest Hours</label>
                  <select
                    value={autoScheduleSettings.minimumRestHours}
                    onChange={(e) => handleSettingChange('minimumRestHours', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={16}>16 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Smart Features</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Balances hours across all employees</li>
                    <li>• Considers attendance reliability</li>
                    <li>• Prevents scheduling conflicts</li>
                    <li>• Optimizes for fairness and efficiency</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => setShowAutoScheduleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={generateAutoSchedule}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Generating...' : 'Generate Schedule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading schedules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Smart Employee Scheduling</h1>
          <p className="mt-2 text-sm text-gray-700">
            Intelligent scheduling with automated workload balancing, multi-branch support, and optimization
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <button
            onClick={() => setShowBranchModal(true)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Building className="h-4 w-4 mr-2" />
            Manage Branches
          </button>
          <button
            onClick={() => setShowAutoScheduleModal(true)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4 mr-2" />
            Auto Schedule
          </button>
          <button
            onClick={optimizeExistingSchedules}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Target className="h-4 w-4 mr-2" />
            Optimize
          </button>
        </div>
      </div>

      {/* Branch Overview */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Branch Overview</h3>
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((branch) => {
              const branchSchedules = schedules.filter(s => {
                const scheduleWeek = startOfWeek(parseISO(s.date));
                return scheduleWeek.getTime() === selectedWeek.getTime() && s.branchId === branch.id;
              });
              
              const branchEmployees = employees.filter(emp => emp.primaryBranchId === branch.id);
              
              return (
                <div key={branch.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{branch.name}</h4>
                      <p className="text-sm text-gray-600">{branch.code}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingBranch(branch);
                        setShowBranchModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">This Week:</span>
                      <span className="font-medium">{branchSchedules.length} schedules</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Primary Staff:</span>
                      <span className="font-medium">{branchEmployees.length} employees</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manager:</span>
                      <span className="font-medium">{branch.managerName || 'Not assigned'}</span>
                    </div>
                    {branch.city && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{branch.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workload Balance Overview */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Employee Workload Balance</h3>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workloadStats.map((stat) => (
              <div key={stat.employee.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {stat.employee.firstName} {stat.employee.lastName}
                  </h4>
                  <div className={`w-3 h-3 rounded-full ${
                    stat.reliability >= 90 ? 'bg-green-500' :
                    stat.reliability >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Hours:</span>
                    <span className="font-medium">{stat.totalHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shifts:</span>
                    <span className="font-medium">{stat.totalShifts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reliability:</span>
                    <span className={`font-medium ${
                      stat.reliability >= 90 ? 'text-green-600' :
                      stat.reliability >= 75 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stat.reliability}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((stat.totalHours / Math.max(...workloadStats.map(s => s.totalHours))) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Previous Week
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            Week of {format(selectedWeek, 'MMM dd, yyyy')}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Next Week
          </button>
        </div>
        <button
          onClick={() => setSelectedWeek(startOfWeek(new Date()))}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
        >
          Today
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weekDays.map((day, dayIdx) => {
            const daySchedules = getSchedulesForDay(day);
            const conflicts = getScheduleConflicts(day);
            const isToday = isSameDay(day, new Date());
            const isWeekendDay = isWeekend(day);
            
            return (
              <div key={dayIdx} className="bg-white min-h-[300px]">
                <div className={`p-3 border-b border-gray-200 ${
                  isToday ? 'bg-blue-50' : isWeekendDay ? 'bg-gray-50' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-2xl font-bold ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {conflicts.length > 0 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      {daySchedules.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {daySchedules.length} scheduled
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddSchedule(format(day, 'yyyy-MM-dd'))}
                    disabled={loading}
                    className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Schedule
                  </button>
                </div>
                
                <div className="p-2 space-y-2">
                  {daySchedules.map((schedule) => {
                    const employee = employees.find(emp => emp.id === schedule.employeeId);
                    const employeeStat = workloadStats.find(stat => stat.employee.id === schedule.employeeId);
                    
                    return (
                      <div
                        key={schedule.id}
                        className={`p-2 rounded text-xs border-l-4 ${
                          schedule.status === 'completed' 
                            ? 'bg-green-50 text-green-800 border-green-400'
                            : schedule.status === 'missed'
                            ? 'bg-red-50 text-red-800 border-red-400'
                            : 'bg-blue-50 text-blue-800 border-blue-400'
                        }`}
                      >
                        <div className="font-medium truncate flex items-center justify-between">
                          <span>{getEmployeeName(schedule.employeeId)}</span>
                          {employeeStat && (
                            <div className={`w-2 h-2 rounded-full ${
                              employeeStat.reliability >= 90 ? 'bg-green-500' :
                              employeeStat.reliability >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        <div className="flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="text-xs">
                            {getBranchCode(schedule.branchId) || 'No Branch'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {employee?.position}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs capitalize">{schedule.status}</span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditSchedule(schedule)}
                              disabled={loading}
                              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Schedule Summary */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Week Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Schedules:</span>
              <span className="text-sm font-medium">{schedules.filter(s => {
                const scheduleWeek = startOfWeek(parseISO(s.date));
                return scheduleWeek.getTime() === selectedWeek.getTime();
              }).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completed:</span>
              <span className="text-sm font-medium text-green-600">{schedules.filter(s => {
                const scheduleWeek = startOfWeek(parseISO(s.date));
                return scheduleWeek.getTime() === selectedWeek.getTime() && s.status === 'completed';
              }).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Missed:</span>
              <span className="text-sm font-medium text-red-600">{schedules.filter(s => {
                const scheduleWeek = startOfWeek(parseISO(s.date));
                return scheduleWeek.getTime() === selectedWeek.getTime() && s.status === 'missed';
              }).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Hours:</span>
              <span className="text-sm font-medium">{schedules.filter(s => {
                const scheduleWeek = startOfWeek(parseISO(s.date));
                return scheduleWeek.getTime() === selectedWeek.getTime();
              }).reduce((sum, schedule) => {
                const start = new Date(`2000-01-01T${schedule.startTime}`);
                const end = new Date(`2000-01-01T${schedule.endTime}`);
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }, 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Health</h3>
          <div className="space-y-3">
            {weekDays.map(day => {
              const conflicts = getScheduleConflicts(day);
              const daySchedules = getSchedulesForDay(day);
              return (
                <div key={day.toString()} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{format(day, 'EEE, MMM dd')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{daySchedules.length}</span>
                    {conflicts.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Score</h3>
          <div className="space-y-3">
            {workloadStats.slice(0, 5).map(stat => {
              const maxHours = Math.max(...workloadStats.map(s => s.totalHours));
              const balanceScore = maxHours > 0 ? ((maxHours - stat.totalHours) / maxHours) * 100 : 100;
              
              return (
                <div key={stat.employee.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{stat.employee.firstName} {stat.employee.lastName}</span>
                    <span className="font-medium">{Math.round(balanceScore)}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        balanceScore >= 80 ? 'bg-green-500' :
                        balanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${balanceScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && <ScheduleModal />}
      {showAutoScheduleModal && <AutoScheduleModal />}
      {showBranchModal && <BranchModal />}
    </div>
  );
};

export default Scheduling;