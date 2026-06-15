

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Upload, 
  ArrowLeftRight, 
  FileText,
  Wallet,
  Users
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/import', label: 'Import CSV', icon: Upload },
  { href: '/import-report', label: 'Import Report', icon: FileText },
  { href: '/settlements', label: 'Settlements', icon: ArrowLeftRight },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <aside className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100%-1rem)] transition-all duration-500">
      {/* Ambient Spotlight Behind Dock */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-cyan-500/30 to-violet-600/30 blur-2xl -z-10 rounded-full opacity-70 animate-[shimmer_5s_linear_infinite] bg-[length:200%_auto]" />

      <nav className="relative flex items-center p-2 rounded-full shadow-[0_20px_50px_-12px_rgba(139,92,246,0.5)] border border-white/20 bg-slate-950/40 backdrop-blur-[32px] overflow-hidden">
        {/* Futuristic top-edge glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Logo / Brand - Minimalist */}
        <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 mr-1 md:mr-2 border-r border-white/10 pr-1 md:pr-2">
          <Link href="/" className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-500 opacity-20 group-hover:opacity-100 group-hover:animate-spin transition-all duration-700 blur-[2px]" />
            <div className="relative z-10 w-full h-full rounded-full bg-slate-900/80 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
              <Wallet className="w-4 h-4 md:w-5 md:h-5 text-violet-300 group-hover:text-cyan-300 transition-colors duration-500" />
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  relative flex items-center justify-center h-10 md:h-12 rounded-full text-sm font-semibold
                  transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group
                  ${isActive
                    ? 'px-4 md:px-5 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-white/20'
                    : 'w-10 md:w-12 text-slate-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5'
                  }
                `}
                title={label}
              >
                {/* Active Liquid Shimmer Background */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full -z-10 bg-gradient-to-r from-violet-600/50 via-cyan-500/50 to-violet-600/50 bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite] opacity-90" />
                )}
                
                <Icon className={`w-5 h-5 shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110' : 'group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`} />
                
                {/* Expandable Label */}
                <span 
                  className={`
                    whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isActive ? 'max-w-[120px] ml-2.5 opacity-100 tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'max-w-0 ml-0 opacity-0'}
                  `}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {/* AI Chat Toggle */}
          <button
            id="chat-dock-icon"
            onClick={() => globalThis.dispatchEvent(new Event('toggle-chat'))}
            className="relative flex items-center justify-center h-10 md:h-12 w-10 md:w-12 rounded-full text-sm font-semibold text-violet-400 hover:text-white hover:bg-violet-500/20 hover:-translate-y-0.5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group"
            title="AI Chat"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 shrink-0 transition-all duration-700 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              // Sign out from NextAuth
              import('next-auth/react').then(({ signOut }) => signOut());
            }}
            className="relative flex items-center justify-center h-10 md:h-12 w-10 md:w-12 rounded-full text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:-translate-y-0.5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group"
            title="Sign Out"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 shrink-0 transition-all duration-700 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </nav>
    </aside>
  );
}
