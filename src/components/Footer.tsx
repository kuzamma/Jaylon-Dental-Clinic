import React from 'react';
import { Building2, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          
          {/* Company Info */}
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-lg font-semibold text-gray-900">Jaylon Dental Clinic</span>
              <p className="text-sm text-gray-600">Employee Management System</p>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center space-x-2 text-gray-600 text-sm">
            <span>© {currentYear} Jaylon Dental Clinic. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;