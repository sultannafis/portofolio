"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(() => import("react-hot-toast").then((c) => c.Toaster), {
  ssr: false,
});

export function ClientToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevated)',
          fontSize: '0.9rem',
        },
        success: { iconTheme: { primary: '#7c6cf0', secondary: '#fff' } },
        error: { iconTheme: { primary: '#e879a0', secondary: '#fff' } },
      }}
    />
  );
}

