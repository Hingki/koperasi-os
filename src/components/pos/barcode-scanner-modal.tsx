'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, AlertCircle, RefreshCcw } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [constraints, setConstraints] = useState<{ facingMode?: 'environment' | 'user' }>({ 
    facingMode: 'environment' 
  });

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      // setLoading(true);
      setConstraints({ facingMode: 'environment' });
    }
  }, [isOpen]);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const rawValue = result[0].rawValue;
      if (rawValue) {
        // Play beep sound
        playBeep();
        onScan(rawValue);
      }
    }
  };

  const handleError = (err: any) => {
    console.error("Scanner Error:", err);
    
    // Attempt fallback if environment camera not found
    // NotFoundError: Requested device not found (usually means no camera matches criteria)
    // OverconstrainedError: Constraints cannot be satisfied
    if ((err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') && constraints.facingMode === 'environment') {
        console.log("Environment camera not found, switching to user/default camera...");
        setConstraints({ facingMode: 'user' });
        return;
    }

    // Common errors: "NotAllowedError" (Permission denied), "NotFoundError" (No camera)
    if (err?.name === 'NotAllowedError') {
      setError('Akses kamera ditolak. Mohon izinkan akses kamera di browser Anda.');
    } else if (err?.name === 'NotFoundError') {
      setError('Kamera tidak ditemukan pada perangkat ini.');
    } else {
      setError('Terjadi kesalahan pada kamera: ' + (err?.message || 'Unknown error'));
    }
    // setLoading(false);
  };

  const toggleCamera = () => {
    setConstraints(prev => ({
      facingMode: prev.facingMode === 'environment' ? 'user' : 'environment'
    }));
  };

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.error("Audio feedback failed:", e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-slate-800">
        <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 z-10 absolute top-0 w-full bg-opacity-80 backdrop-blur-sm">
          <DialogTitle className="flex items-center justify-between w-full text-white">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scan Barcode Produk
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-slate-800 p-2 h-8 w-8"
                onClick={toggleCamera}
                title="Ganti Kamera"
            >
                <RefreshCcw className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-[400px] w-full flex items-center justify-center bg-black">
          {error ? (
            <div className="text-center p-6 space-y-4 max-w-[80%]">
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400 font-medium">{error}</p>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={onClose}>
                Tutup
              </Button>
            </div>
          ) : (
            <>
              <Scanner
                key={constraints.facingMode}
                onScan={handleScan}
                onError={handleError}
                components={{
                    // audio: false, // We handle audio manually
                    onOff: true,
                    torch: true,
                    zoom: true,
                    finder: true,
                }}
                constraints={constraints}
                styles={{
                    container: { height: '100%', width: '100%' },
                    video: { height: '100%', objectFit: 'cover' }
                }}
              />
              {/* Optional: Custom overlay or hints can go here */}
              <div className="absolute bottom-6 left-0 w-full text-center z-20 pointer-events-none">
                 <p className="text-white/80 text-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                    Arahkan kamera ke barcode produk
                 </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
