import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, AlertCircle, CheckCircle, RefreshCw, StopCircle } from 'lucide-react';

export default function QRScanner({ onScanSuccess }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'file'
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannedResult, setScannedResult] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  
  const qrRegionId = 'qr-reader-region';
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera list
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Unable to get cameras:', err);
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async (cameraId) => {
    setScannerError('');
    setScannedResult('');
    
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      const camIdToUse = cameraId || selectedCamera || { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        camIdToUse,
        config,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore frame parse errors
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error('Start scan error:', err);
      setScannerError(err.message || 'Unable to access camera. Please allow camera permissions or upload an image.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleSuccess = async (decodedText) => {
    setScannedResult(decodedText);
    await stopScanning();
    if (onScanSuccess) {
      onScanSuccess(decodedText);
    }
  };

  const handleFileScan = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setScannerError('');
    setScannedResult('');

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setScannerError('Could not find a valid QR code in this image. Please try another image.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner Mode Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 space-x-2">
        <button
          type="button"
          onClick={() => {
            stopScanning();
            setMode('camera');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            mode === 'camera'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Live Camera Scan
        </button>
        <button
          type="button"
          onClick={() => {
            stopScanning();
            setMode('file');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            mode === 'file'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload QR Image
        </button>
      </div>

      {/* Success Notification */}
      {scannedResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <strong>Scanned Code:</strong> <span className="font-mono">{scannedResult}</span>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {scannerError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{scannerError}</span>
        </div>
      )}

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div className="space-y-3 text-center">
          <div 
            id={qrRegionId} 
            className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[240px] flex items-center justify-center text-slate-400 text-xs"
          >
            {!isScanning && (
              <div className="p-6 text-center space-y-2">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p>Click "Start Camera" to point at your Soundbox or Telegram QR code</p>
              </div>
            )}
          </div>

          {cameras.length > 1 && !isScanning && (
            <div className="max-w-xs mx-auto text-left">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Select Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.label || `Camera ${c.id}`}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!isScanning ? (
              <button
                type="button"
                onClick={() => startScanning()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Camera Scanner
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanning}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop Camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* File Upload Mode */}
      {mode === 'file' && (
        <div className="space-y-3">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50 dark:bg-slate-800/40"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Click to upload QR code image
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports PNG, JPG, or screenshot from Telegram
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileScan}
              className="hidden"
            />
          </div>
        </div>
      )}

    </div>
  );
}
