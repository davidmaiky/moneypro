import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-xl border border-amber-400/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-100" />
      <div className="flex flex-col">
        <span className="font-semibold text-[11px] leading-tight">Modo Offline Ativo</span>
        <span className="text-[10px] text-amber-100/90 leading-tight">
          Seus dados estão salvos e 100% seguros no dispositivo
        </span>
      </div>
    </div>
  );
};
