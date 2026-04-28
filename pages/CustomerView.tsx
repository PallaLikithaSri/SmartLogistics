import React from 'react';
import { useApp } from '../context/AppContext';

export const CustomerView: React.FC = () => {
  const { availabilities, users, customerRequests, addCustomerRequest, deleteCustomerRequest, currentUser } = useApp();
  
  // Get next 7 days starting Monday
  const today = new Date();
  const day = today.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DAY: 'bg-green-50 text-green-700 border-green-100',
      NIGHT: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      BOTH: 'bg-amber-50 text-amber-700 border-amber-100',
      UNAVAILABLE: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[status] || map.UNAVAILABLE;
  };

  const handleRequestToggle = (workerId: string, date: string) => {
    const existing = customerRequests.find(
      r => r.customerId === currentUser?.id && r.workerId === workerId && r.date === date
    );
    if (existing) {
      deleteCustomerRequest(existing.id);
    } else {
      addCustomerRequest({ customerId: currentUser?.id || 'customer', workerId, date });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white">
        <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Worker Availability</h2>
            <p className="text-slate-500 font-medium mt-1">Real-time scheduling for the upcoming week.</p>
        </div>

        <div className="overflow-x-auto pb-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-6 text-left bg-slate-50/50 rounded-tl-2xl rounded-bl-2xl min-w-[200px] text-xs font-bold text-slate-400 uppercase tracking-wider">Professional</th>
                {nextDays.map((date, idx) => {
                   const d = new Date(date);
                   const isFirst = idx === 0;
                   const isLast = idx === nextDays.length - 1;
                   return (
                     <th key={date} className={`p-4 text-center bg-slate-50/50 min-w-[100px] ${isLast ? 'rounded-tr-2xl rounded-br-2xl' : ''}`}>
                       <div className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1">{d.toLocaleDateString('en-US', {weekday: 'short'})}</div>
                       <div className="text-xl font-bold text-slate-800">{d.getDate()}</div>
                     </th>
                   );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.filter(u => u.role === 'WORKER').map(user => (
                <tr key={user.id} className="group transition-colors hover:bg-white/50">
                  <td className="p-4 flex items-center gap-4">
                    <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-700">{user.name}</span>
                  </td>
                  {nextDays.map(date => {
                    const status = availabilities.find(a => a.workerId === user.id && a.date === date)?.status || 'UNAVAILABLE';
                    const request = customerRequests.find(
                      r => r.customerId === currentUser?.id && r.workerId === user.id && r.date === date
                    );
                    const requestStatusBadge = (reqStatus: string) => {
                      const map: Record<string, string> = {
                        REQUESTED: 'bg-blue-50 text-blue-700 border-blue-100',
                        VERIFIED: 'bg-green-50 text-green-700 border-green-100',
                        REJECTED: 'bg-red-50 text-red-700 border-red-100',
                      };
                      return map[reqStatus] || map.REQUESTED;
                    };
                    return (
                      <td key={date} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusBadge(status)}`}>{status}</span>
                            {status !== 'UNAVAILABLE' && (
                              <>
                                {request ? (
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${requestStatusBadge(request.status)}`}>
                                      {request.status}
                                    </span>
                                    {request.status === 'REQUESTED' && (
                                      <button
                                        onClick={() => handleRequestToggle(user.id, date)}
                                        className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleRequestToggle(user.id, date)}
                                    className="text-[11px] font-bold px-2.5 py-1 rounded-full text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                                  >
                                    Request
                                  </button>
                                )}
                              </>
                            )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
};
