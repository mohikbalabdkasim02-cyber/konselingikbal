"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorCard({ title = "Terjadi kendala", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="error-card" role="alert">
      <div className="error-card-icon"><AlertTriangle size={19} /></div>
      <div className="error-card-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {onRetry && <button type="button" onClick={onRetry}><RefreshCw size={15}/> Coba lagi</button>}
    </div>
  );
}
