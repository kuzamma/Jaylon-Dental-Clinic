import React, { useEffect, useState } from 'react';
import { Download, QrCode, User, Calendar, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { Employee } from '../context/AppContext';

interface QRCodeGeneratorProps {
  employee: Employee;
  onClose: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ employee, onClose }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsGenerating(true);
        
        // Create QR data with employee information
        const qrData = {
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          timestamp: Date.now(),
          version: '1.0'
        };

        // Generate QR code with high quality settings
        const qrCodeURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 400,
          margin: 2,
          color: {
            dark: '#1f2937', // Dark gray
            light: '#ffffff'  // White
          },
          errorCorrectionLevel: 'M'
        });

        setQrCodeDataURL(qrCodeURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQRCode();
  }, [employee]);

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return;

    const link = document.createElement('a');
    link.href = qrCodeDataURL;
    link.download = `${employee.firstName}_${employee.lastName}_QR_Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = () => {
    if (!qrCodeDataURL) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee QR Code - ${employee.firstName} ${employee.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 30px;
              background: white;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              margin-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .employee-info {
              margin: 20px 0;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .employee-name {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .employee-details {
              font-size: 14px;
              color: #6b7280;
              line-height: 1.5;
            }
            .qr-code {
              margin: 20px 0;
            }
            .instructions {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 20px;
              max-width: 300px;
              line-height: 1.4;
            }
            @media print {
              body { margin: 0; }
              .qr-container { box-shadow: none; border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="header">
              <div class="company-name">Jaylon Dental Clinic</div>
              <div class="subtitle">Employee Attendance QR Code</div>
            </div>
            
            <div class="employee-info">
              <div class="employee-name">${employee.firstName} ${employee.lastName}</div>
              <div class="employee-details">
                Position: ${employee.position}<br>
                Department: ${employee.department}<br>
                Employee ID: ${employee.id}
              </div>
            </div>
            
            <div class="qr-code">
              <img src="${qrCodeDataURL}" alt="Employee QR Code" style="max-width: 300px; height: auto;" />
            </div>
            
            <div class="instructions">
              Scan this QR code using the clinic's attendance system to clock in/out. 
              Keep this code secure and do not share with others.
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
      <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div className="text-center">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <QrCode className="h-8 w-8 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Employee QR Code</h3>
          </div>

          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-3">
              <User className="h-5 w-5 text-gray-600 mr-2" />
              <span className="font-medium text-gray-900">
                {employee.firstName} {employee.lastName}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center justify-center">
                <span className="font-medium">Position:</span>
                <span className="ml-2">{employee.position}</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="font-medium">Department:</span>
                <span className="ml-2">{employee.department}</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="font-medium">ID:</span>
                <span className="ml-2">{employee.id}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6">
            {isGenerating ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Generating QR Code...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src={qrCodeDataURL} 
                  alt="Employee QR Code" 
                  className="max-w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to use:</p>
                <ul className="text-left space-y-1">
                  <li>• Use this QR code for attendance check-in/out</li>
                  <li>• Scan with the clinic's attendance system</li>
                  <li>• Keep this code secure and personal</li>
                  <li>• Contact admin if you lose access</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generated timestamp */}
          <div className="text-xs text-gray-500 mb-6 flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-1" />
            Generated on {new Date().toLocaleString()}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={downloadQRCode}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={printQRCode}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;