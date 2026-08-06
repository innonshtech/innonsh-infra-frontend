import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './AppLayout.css';

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
      <div className="app-main">
        <Topbar toggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
