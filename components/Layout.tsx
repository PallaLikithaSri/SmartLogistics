import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, currentView, navigateTo, adminSection, setAdminSection } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ label, icon, view, section }: any) => {
    const active = section ? adminSection === section : currentView === view;
    return (
      <button 
        onClick={() => {
          if (section) {
            setAdminSection(section);
            navigateTo('DASHBOARD');
          } else {
            navigateTo(view);
          }
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium border transition-all duration-300 group relative overflow-hidden ${
          active 
            ? 'text-brand-700 bg-brand-50/90 border-brand-100 shadow-sm' 
            : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border-transparent hover:border-white'
        }`}
      >
        {active && <div className="absolute inset-0 bg-brand-100/50 translate-x-[-100%] animate-[slideRight_0.5s_forwards] rounded-2xl"></div>}
        <span className="relative z-10 transition-transform group-hover:scale-110 duration-200">{icon}</span>
        <span className="relative z-10">{label}</span>
        {active && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(26,68,216,0.5)]"></div>}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-transparent relative selection:bg-brand-100 selection:text-brand-900">
       {/* Mobile Menu Backdrop */}
       {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
       )}

      {/* Mobile/Tablet Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/20">LC</div>
           <span className="font-bold text-slate-900 tracking-tight">LogisticsCore</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Sidebar Navigation - Desktop (lg) & Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 glass-panel border-r border-white/50 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) lg:translate-x-0 shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 pb-8 hidden lg:block">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-11 h-11 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">LogisticsCore</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">Workspace</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 mt-20 lg:mt-0 overflow-y-auto custom-scrollbar pt-2">
            {currentUser && (
              <>
                <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">
                  Main Menu
                </div>
                
                {['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'].includes(currentUser.role) ? (
                  <>
                    {(
                      currentUser.role === 'SUPER_ADMIN'
                        ? ['OVERVIEW', 'ASSIGNMENTS', 'ANALYTICS', 'FLEET', 'SCHEDULE', 'ATTENDANCE', 'WORKERS', 'TASKS', 'REPORTS', 'PAYROLL', 'CUSTOMER PLANS', 'DOCUMENTS', 'USERS']
                        : ['OVERVIEW', 'ASSIGNMENTS', 'ANALYTICS', 'FLEET', 'SCHEDULE', 'ATTENDANCE', 'WORKERS', 'TASKS', 'REPORTS', 'PAYROLL', 'DOCUMENTS']
                    ).map((tab) => (
                      <NavItem 
                        key={tab}
                        label={tab}
                        section={tab}
                        icon={<span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-[10px] font-bold text-slate-500">{tab === 'CUSTOMER PLANS' ? 'CP' : tab.slice(0,2)}</span>}
                      />
                    ))}
                  </>
                ) : currentUser.role === 'WORKER' ? (
                  <>
                    <NavItem 
                      label="Schedule" 
                      view="SCHEDULE"
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      } 
                    />
                    <NavItem 
                      label="Documents" 
                      view="DOCUMENTS"
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      } 
                    />
                  </>
                ) : (
                  <NavItem 
                    label="Dashboard" 
                    view="DASHBOARD"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    } 
                  />
                )}
              </>
            )}
            
            {!currentUser && (
               <div className="px-4 py-4 text-sm text-slate-500 text-center italic">
                 Log in to access features.
               </div>
            )}
          </nav>

          {currentUser && (
            <div className="p-4 border-t border-white/50">
              <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/60 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold ring-2 ring-white shadow-sm">
                    {(currentUser.name || '?').slice(0, 1).toUpperCase()}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold truncate uppercase tracking-wider">{currentUser.title || currentUser.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { void logout(); }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 md:p-8 pt-24 lg:pt-8 min-h-screen w-full overflow-x-hidden">
         <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
           {children}
         </div>
      </main>
    </div>
  );
};
