import React, { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface WakeUpProps {
  onReady: () => void;
}

export default function WakeUp({ onReady }: WakeUpProps) {
  const [status, setStatus] = useState<'waking' | 'ready'>('waking');
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const dotsTimer = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    const elapsedTimer = setInterval(() => setElapsed(e => e + 1), 1000);

    const poll = async () => {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          setStatus('ready');
          setTimeout(onReady, 600);
          return;
        }
      } catch {}
      setTimeout(poll, 3000);
    };

    poll();

    return () => {
      clearInterval(dotsTimer);
      clearInterval(elapsedTimer);
    };
  }, [onReady]);

  return (
    <div className={`fixed inset-0 z-[100] bg-[#0f1929] flex flex-col items-center justify-center transition-opacity duration-500 ${status === 'ready' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#0053db 1px, transparent 1px), linear-gradient(90deg, #0053db 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-headline">Never Sign Blind</h1>
            <p className="text-[11px] text-white/40 uppercase tracking-[0.2em]">Change Order Intelligence</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 size={15} className="animate-spin text-primary" />
            <span>Starting up{dots}</span>
          </div>
          {elapsed > 8 && (
            <p className="text-white/30 text-xs max-w-xs text-center animate-pulse">
              First load takes 20–30 seconds on the free tier. Hang tight.
            </p>
          )}
          {/* Progress bar — fake but gives user a sense of progress */}
          <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(95, elapsed * 3)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
