import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#admin-main-content">Bỏ qua tới nội dung chính</a>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="admin-main">
        <AdminHeader onMenu={() => setSidebarOpen(true)} />
        <main className="admin-content" id="admin-main-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
