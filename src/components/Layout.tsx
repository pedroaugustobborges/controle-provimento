import React from 'react';
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Bell, Search, User } from 'lucide-react';

export function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
          </div>
          <div className="flex items-center gap-6">
            <button className="relative">
              <Bell className="h-5 w-5 text-muted-foreground hover:text-primary" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>
            <div className="flex items-center gap-3 border-l pl-6">
              <div className="text-right">
                <p className="text-sm font-medium">João Silva</p>
                <p className="text-xs text-muted-foreground italic">Administrador</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                JS
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
