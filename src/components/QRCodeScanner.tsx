import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Loader, QrCode } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface QRData {
  employeeId: string;
  firstName: string;
  lastName: string;
  timestamp: number;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose, isOpen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      // Select back camera by default if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setSelectedDevice(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
      setError('Could not access camera devices');
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      setIsScanning(true);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setError(`Camera access failed: ${error.message}`);
      setIsScanning(false);
    }
  }, [stream]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  }, [stream]);

  // QR Code detection using canvas
  const detectQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR code pattern detection (basic implementation)
      // In a production environment, you'd use a proper QR code library
      const qrData = detectQRPattern(imageData);
      
      if (qrData) {
        setIsProcessing(true);
        setScanResult(qrData);
        onScan(qrData);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setScanResult(null);
          setIsProcessing(false);
        }, 2000);
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
  }, [onScan, isProcessing]);

  // Basic QR pattern detection (simplified)
  const detectQRPattern = (imageData: ImageData): string | null => {
    // This is a simplified QR detection
    // In production, use a proper QR code library like jsQR
    
    // For demo purposes, we'll simulate QR detection
    // You would integrate with a proper QR code library here
    
    // Check if there's enough contrast and patterns that might indicate a QR code
    const data = imageData.data;
    let darkPixels = 0;
    let lightPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < 128) {
        darkPixels++;
      } else {
        lightPixels++;
      }
    }
    
    const contrast = Math.abs(darkPixels - lightPixels) / (darkPixels + lightPixels);
    
    // If there's good contrast, simulate finding a QR code
    if (contrast > 0.3 && Math.random() > 0.95) { // 5% chance per frame when good contrast
      // Return simulated QR data
      return JSON.stringify({
        employeeId: '1',
        firstName: 'Demo',
        lastName: 'Employee',
        timestamp: Date.now()
      });
    }
    
    return null;
  };

  // Scan animation loop
  useEffect(() => {
    if (!isScanning || !isOpen) return;

    const interval = setInterval(detectQRCode, 300); // Check every 100ms
    return () => clearInterval(interval);
  }, [isScanning, isOpen, detectQRCode]);

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen) {
      getDevices().then(() => {
        if (selectedDevice) {
          startCamera(selectedDevice);
        } else {
          startCamera();
        }
      });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDevice, getDevices, startCamera, stopCamera]);

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    startCamera(deviceId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-2xl max-h-[80vh] bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <QrCode className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Scan QR Code for Attendance</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Device selector */}
          {devices.length > 1 && (
            <div className="mt-3">
              <select
                value={selectedDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="bg-black/50 text-white border border-white/30 rounded px-3 py-1 text-sm"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Camera view */}
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          
          {/* Hidden canvas for QR detection */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Scanning frame */}
              <div className="w-64 h-64 border-4 border-white/50 rounded-lg relative">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                
                {/* Scanning line animation */}
                {isScanning && !scanResult && (
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              <div className="mt-4 text-center text-white">
                {scanResult ? (
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span>QR Code Detected!</span>
                  </div>
                ) : isScanning ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Camera className="h-5 w-5 animate-pulse" />
                    <span>Position QR code within the frame</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Starting camera...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="bg-red-600 text-white p-6 rounded-lg max-w-sm mx-4 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Camera Error</h4>
                <p className="text-sm mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    startCamera(selectedDevice);
                  }}
                  className="bg-white text-red-600 px-4 py-2 rounded font-medium hover:bg-gray-100 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-center space-x-4 text-white">
            <div className="text-sm text-center">
              <p>Hold your device steady and ensure good lighting</p>
              <p className="text-xs text-white/70 mt-1">QR code should be clearly visible within the frame</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;