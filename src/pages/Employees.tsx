import React, { useState } from 'react';
import { useAppContext, Employee } from '../context/AppContext';
import { Plus, Search, Edit, Trash2, Mail, Phone, QrCode, Loader, Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { authService } from '../lib/auth';
import QRCodeGenerator from '../components/QRCodeGenerator';

const Employees: React.FC = () => {
  const { 
    state, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee,
    previewUserDeletion
  } = useAppContext();
  const { employees, loading, error } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmployeeForQR, setSelectedEmployeeForQR] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deletePreview, setDeletePreview] = useState<any[]>([]);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  const filteredEmployees = employees.filter(employee =>
    employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    setDeletingEmployee(employee);
    
    try {
      // Get preview of what would be deleted
      const preview = await previewUserDeletion(employee.id);
      setDeletePreview(preview);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Error getting delete preview:', error);
      alert('Error getting deletion preview. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingEmployee) return;

    try {
      await deleteEmployee(deletingEmployee.id, deleteType === 'hard');
      setShowDeleteModal(false);
      setDeletingEmployee(null);
      setDeletePreview([]);
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const generateQRCode = (employee: Employee) => {
    setSelectedEmployeeForQR(employee);
    setShowQrModal(true);
  };

  const DeleteConfirmationModal: React.FC = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium text-gray-900">Delete Employee</h3>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          
          {deletingEmployee && (
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You are about to delete <strong>{deletingEmployee.firstName} {deletingEmployee.lastName}</strong>.
                Please choose how you want to proceed:
              </p>
              
              <div className="space-y-4">
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="deleteType"
                    value="soft"
                    checked={deleteType === 'soft'}
                    onChange={(e) => setDeleteType(e.target.value as 'soft' | 'hard')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Deactivate Account (Recommended)</div>
                    <div className="text-sm text-gray-600">
                      Mark employee as terminated but preserve all historical data (schedules, attendance, payroll).
                      This is the safer option for record keeping.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-red-50 border-red-200">
                  <input
                    type="radio"
                    name="deleteType"
                    value="hard"
                    checked={deleteType === 'hard'}
                    onChange={(e) => setDeleteType(e.target.value as 'soft' | 'hard')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-red-900 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Permanently Delete (Dangerous)
                    </div>
                    <div className="text-sm text-red-700">
                      Completely remove employee and ALL related data from the database. 
                      This action cannot be undone!
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {deletePreview.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">
                {deleteType === 'hard' ? 'Data to be permanently deleted:' : 'Data to be affected:'}
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {deletePreview.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.table_name}:</span>
                      <span className={`${item.record_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {item.record_count} records
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  {deleteType === 'hard' 
                    ? '⚠️ All this data will be permanently lost'
                    : 'ℹ️ Data will be preserved but marked as inactive'
                  }
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingEmployee(null);
                setDeletePreview([]);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                deleteType === 'hard' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {deleteType === 'hard' ? 'Permanently Delete' : 'Deactivate Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const EmployeeModal: React.FC = () => {
    const [formData, setFormData] = useState<Partial<Employee & { password: string; confirmPassword: string; createLogin: boolean }>>(
      editingEmployee ? {
        ...editingEmployee,
        password: '',
        confirmPassword: '',
        createLogin: false
      } : {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hourlyRate: 0,
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        isActive: true,
        password: '',
        confirmPassword: '',
        createLogin: false
      }
    );
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.position) {
          throw new Error('Please fill in all required fields');
        }

        // Validate passwords if creating login
        if (formData.createLogin) {
          if (!formData.password || formData.password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
          }
          
          if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
        }

        const employeeData = {
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          email: formData.email!,
          phone: formData.phone!,
          position: formData.position!,
          department: formData.department!,
          hourlyRate: formData.hourlyRate!,
          hireDate: formData.hireDate!,
          isActive: formData.isActive!,
        } as Omit<Employee, 'id'>;

        if (editingEmployee) {
          await updateEmployee(editingEmployee.id, employeeData);
        } else {
          // Create employee first
          await createEmployee(employeeData);
          
          // If creating login, create user account
          if (formData.createLogin && formData.password) {
            try {
              const { userId, error: authError } = await authService.createUser({
                username: `${formData.firstName?.toLowerCase()}.${formData.lastName?.toLowerCase()}`,
                email: formData.email!,
                password: formData.password,
                role: 'employee'
              });

              if (authError) {
                console.warn('Employee created but login setup failed:', authError);
                alert(`Employee created successfully!\n\nNote: Login setup failed (${authError}). You can set up login credentials later if needed.`);
              } else {
                alert(`Employee and login created successfully!\n\nLogin Details:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nThe employee can now log in to the system.`);
              }
            } catch (authError) {
              console.warn('Employee created but login setup failed:', authError);
              alert(`Employee created successfully!\n\nNote: Login setup encountered an issue. You can set up login credentials later if needed.`);
            }
          } else {
            alert(`Employee created successfully!\n\nEmployee Details:\nName: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPosition: ${formData.position}\n\nLogin credentials were not created (optional).`);
          }
        }
        
        setShowModal(false);
      } catch (error: any) {
        console.error('Error saving employee:', error);
        alert(`Failed to save employee: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : 
                type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    };

    const generateRandomPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData(prev => ({ ...prev, password, confirmPassword: password }));
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Position *</label>
                <select
                  name="position"
                  value={formData.position || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Position</option>
                  <option value="Dentist">Dentist</option>
                  <option value="Dental Hygienist">Dental Hygienist</option>
                  <option value="Dental Assistant">Dental Assistant</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Office Manager">Office Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select
                  name="department"
                  value={formData.department || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  <option value="Clinical">Clinical</option>
                  <option value="Administrative">Administrative</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hourly Rate *</label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate || ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date *</label>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Login Credentials Section - Only for new employees */}
              {!editingEmployee && (
                <div className="border-t pt-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      name="createLogin"
                      checked={formData.createLogin || false}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm font-medium text-gray-700">
                      Create login credentials for this employee
                    </label>
                  </div>

                  {formData.createLogin && (
                    <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-800 mb-3">
                        <strong>Login Setup:</strong> The employee will be able to log in with their email and the password you set below.
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">Password *</label>
                          <button
                            type="button"
                            onClick={generateRandomPassword}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Generate Random
                          </button>
                        </div>
                        <div className="mt-1 relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password || ''}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                            minLength={6}
                            required={formData.createLogin}
                            placeholder="Minimum 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                        <div className="mt-1 relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword || ''}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                            minLength={6}
                            required={formData.createLogin}
                            placeholder="Confirm password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive || false}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <label className="ml-2 block text-sm text-gray-700">Active Employee</label>
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
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading employees...</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your clinic's employee records with QR code generation and secure deletion options
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleAddEmployee}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{employee.position}</p>
                  <p className="text-xs text-gray-400">{employee.department}</p>
                </div>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  employee.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {employee.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {employee.phone}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Rate:</span> ₱{employee.hourlyRate}/hr
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Hired:</span> {format(new Date(employee.hireDate), 'MMM dd, yyyy')}
                </div>
              </div>
              
              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee)}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
                <button
                  onClick={() => generateQRCode(employee)}
                  className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  QR Code
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new employee.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleAddEmployee}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && <EmployeeModal />}
      {showQrModal && selectedEmployeeForQR && (
        <QRCodeGenerator
          employee={selectedEmployeeForQR}
          onClose={() => {
            setShowQrModal(false);
            setSelectedEmployeeForQR(null);
          }}
        />
      )}
      {showDeleteModal && <DeleteConfirmationModal />}
    </div>
  );
};

export default Employees;