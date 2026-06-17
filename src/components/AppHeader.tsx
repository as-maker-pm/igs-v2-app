'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ActiveNav = 'projects' | 'tenants' | 'data' | 'methodology' | 'data-tables' | 'map';

interface AppHeaderProps {
  currentUser: { id: string; email: string; name: string; role: string } | null;
  activeNav?: ActiveNav;
}

export default function AppHeader({ currentUser, activeNav }: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLink = (href: string, label: string, key: ActiveNav) => (
    <Link
      key={key}
      href={href}
      className={`text-xs transition-colors ${
        activeNav === key
          ? 'text-[#203A5B] font-bold'
          : 'text-gray-500 font-medium hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between z-20 shadow-sm" style={{ minHeight: 56 }}>

      {/* Left: logo + brand */}
      <div className="flex items-center gap-3">
        <img src="/IGS-logo.svg" alt="IGS" className="h-8" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Outdoor Expressions</p>
          <p className="text-[11px] text-gray-400 leading-tight">Market Demand & Saturation</p>
        </div>
      </div>

      {/* Right: all nav + user + logout */}
      <div className="flex items-center gap-5">
        {isSuperAdmin && (
          <>
            {navLink('/admin/tenants?tab=projects', 'Projects', 'projects')}
            {navLink('/admin/tenants?tab=tenants', 'Tenants', 'tenants')}
            {navLink('/admin/tenants?tab=data', 'Data', 'data')}
            <span className="text-gray-200">|</span>
          </>
        )}
        {isAdmin && (
          <>
            {navLink('/admin/users', 'User Management', 'projects')}
            <span className="text-gray-200">|</span>
          </>
        )}
        {navLink('/methodology', 'Methodology', 'methodology')}
        {navLink('/data-tables', 'Data Tables', 'data-tables')}
        <span className="text-gray-200">|</span>
        {currentUser && (
          <span className="text-xs text-gray-500 font-medium">{currentUser.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
