import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function FieldQRScanner({ targetName, onScanSuccess, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setLoading(true);
      setError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setLoading(false);
          scanFrame();
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (active) {
          setError('Could not access camera. Please ensure permissions are granted.');
          setLoading(false);
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      // QR Code detected!
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      onScanSuccess(code.data);
      return;
    }

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl p-3.5 relative space-y-2 border border-slate-700 shadow-lg">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <Camera className="w-3.5 h-3.5 animate-pulse" />
          <span>Point camera at {targetName} QR</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          title="Close Camera"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative w-full max-w-[260px] mx-auto aspect-square overflow-hidden rounded-lg bg-black flex items-center justify-center border border-slate-800">
        {loading && (
          <div className="text-center space-y-1 z-10">
            <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />
            <p className="text-[11px] text-slate-400">Starting camera...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Reticle / Target overlay */}
        {!loading && !error && (
          <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-3/4 h-3/4 border-2 border-dashed border-emerald-400 rounded-md"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 bg-rose-950/70 border border-rose-800 rounded-lg text-[11px] text-rose-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
