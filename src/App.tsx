import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import EmployeePortal from './components/EmployeePortal';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Scheduling from './pages/Scheduling';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import { AppProvider, useAppContext } from './context/AppContext';
import { authService, User } from './lib/auth';

type UserType = 'admin' | 'employee' | null;

function App() {
  const [currentUser, setCurrentUser] = useState<UserType>(null);
  const [userCredentials, setUserCredentials] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user.role === 'employee' ? 'employee' : 'admin');
        setUserCredentials(user);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(user.role === 'employee' ? 'employee' : 'admin');
        setUserCredentials(user);
      } else {
        setCurrentUser(null);
        setUserCredentials(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogin = (userType: UserType, credentials?: any) => {
    setCurrentUser(userType);
    setUserCredentials(credentials?.user || credentials);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setUserCredentials(null);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (currentUser === 'employee') {
    return (
      <AppProvider>
        <EmployeePortalWrapper 
          onLogout={handleLogout} 
          userCredentials={userCredentials} 
        />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <Router>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

// Wrapper component to handle employee data loading
function EmployeePortalWrapper({ 
  onLogout, 
  userCredentials 
}: { 
  onLogout: () => void; 
  userCredentials: User | null; 
}) {
  const { loadEmployeeData } = useAppContext();
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [employeeLoadError, setEmployeeLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!userCredentials?.email) {
        setEmployeeLoadError('No user email found');
        setIsLoadingEmployee(false);
        return;
      }

      try {
        console.log('🔄 Loading employee data for:', userCredentials.email);
        await loadEmployeeData(userCredentials.email);
        setEmployeeLoadError(null);
      } catch (error: any) {
        console.error('❌ Failed to load employee data:', error);
        setEmployeeLoadError(error.message);
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    loadData();
  }, [userCredentials?.email, loadEmployeeData]);

  if (isLoadingEmployee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (employeeLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Employee Data Not Found</h2>
            <p className="text-red-700 mb-4">{employeeLoadError}</p>
            <div className="space-y-2 text-sm text-red-600">
              <p><strong>Possible causes:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Employee record not created yet</li>
                <li>User account not linked to employee record</li>
                <li>Employee account is inactive</li>
              </ul>
            </div>
            <div className="mt-6 space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <EmployeePortal onLogout={onLogout} />;
}

export default App;