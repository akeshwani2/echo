import React from 'react';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-black">
      <Sidebar />
      {children}
    </div>
  );
}