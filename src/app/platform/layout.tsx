import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PlatformSidebar } from '@/components/platform/platform-sidebar';
import { PlatformHeader } from '@/components/platform/platform-header';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-svh w-full bg-background font-sans text-foreground selection:bg-brand-red selection:text-white">
        {/* Cinematic Grain Overlay - Robust Data URI */}
        <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-repeat"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        <PlatformSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header hidden for minimal view */}
          {/* <PlatformHeader /> */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
