import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
};

export const WorkerDashboard: React.FC = () => {
  const { currentUser, trucks, trailers, shifts, clockIn, clockOut, tasks, completeTask, addDamageReport, availabilities, toggleAvailability, currentView, getAssignmentForWorker, addPayrollEntry, updateShift, addVehicleDocument } = useApp();

  // Local state for UI flow
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedTrailer, setSelectedTrailer] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [damageDesc, setDamageDesc] = useState('');
  const [damageImages, setDamageImages] = useState<string[]>([]);
  const [damageFiles, setDamageFiles] = useState<File[]>([]);
  const [noPauseTaken, setNoPauseTaken] = useState(false);
  const [invoiceHours, setInvoiceHours] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const activeShift = shifts.find(s => s.workerId === currentUser?.id && !s.endTime);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayDate = new Date().toISOString().split('T')[0];
  const todaysAssignment = currentUser ? getAssignmentForWorker(currentUser.id, todayDate) : undefined;
  const assignedVehicleType = todaysAssignment?.truckId ? 'TRUCK' : todaysAssignment?.trailerId ? 'TRAILER' : undefined;
  const assignedVehicleId = todaysAssignment?.truckId || todaysAssignment?.trailerId;
  const assignedTruck = todaysAssignment?.truckId ? trucks.find(t => t.id === todaysAssignment.truckId) : undefined;
  const assignedTrailer = todaysAssignment?.trailerId ? trailers.find(t => t.id === todaysAssignment.trailerId) : undefined;
  const VEHICLE_DOC_BUCKET = 'vehicle-docs';
  const INCIDENT_BUCKET = 'incident-photos';

  useEffect(() => {
    if (todaysAssignment) {
      setSelectedTruck(todaysAssignment.truckId || '');
      setSelectedTrailer(todaysAssignment.trailerId || '');
    }
  }, [todaysAssignment]);

  const handleClockIn = () => {
    const enforcedTruck = todaysAssignment?.truckId || selectedTruck;
    const enforcedTrailer = todaysAssignment?.trailerId || selectedTrailer;
    clockIn(currentUser!.id, enforcedTruck, enforcedTrailer);
  };

  const handleClockOut = () => {
    if (!activeShift) return;
    clockOut(activeShift.id, feedback, { noPause: noPauseTaken });
    if (noPauseTaken) alert('Super admin will be notified: no pause taken (prototype).');
    setShowFeedbackModal(false);
    setFeedback('');
    setNoPauseTaken(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setDamageFiles(files);
    const base64s = await Promise.all(files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    })));
    setDamageImages(base64s);
  };

  const submitDamageReport = async () => {
    if (!damageFiles.length || !currentUser) return;
    const reportId = createId();
    const uploadedUrls: string[] = [];

    for (let i = 0; i < damageFiles.length; i++) {
      const file = damageFiles[i];
      const path = `${currentUser.id}/${reportId}/${Date.now()}-${i}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(INCIDENT_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadErr) {
        console.error('[Upload] incident photo failed', uploadErr);
        alert('Failed to upload damage photos. Please try again.');
        return;
      }
      const { data } = supabase.storage.from(INCIDENT_BUCKET).getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    addDamageReport({
      id: reportId,
      workerId: currentUser.id,
      imageUrl: uploadedUrls[0],
      description: damageDesc,
      timestamp: new Date().toISOString(),
      resolved: false
    }, uploadedUrls);
    setDamageFiles([]);
    setDamageImages([]);
    setDamageDesc('');
    alert('Report submitted.');
  };

  const submitInvoice = () => {
    if (!currentUser) return;
    const hours = parseFloat(invoiceHours);
    const amount = parseFloat(invoiceAmount);
    if (Number.isNaN(hours) || Number.isNaN(amount)) return alert('Enter valid hours and amount');
    addPayrollEntry({
      workerId: currentUser.id,
      date: new Date().toISOString().split('T')[0],
      hours,
      amount,
      type: 'INDEPENDENT_INVOICE',
      status: 'PENDING',
    });
    setInvoiceHours('');
    setInvoiceAmount('');
    alert('Invoice submitted.');
  };

  // Stats for "Monthly Hours"
  const currentMonth = new Date().getMonth();
  const monthlyHours = shifts
    .filter(s => s.workerId === currentUser?.id && new Date(s.date).getMonth() === currentMonth)
    .reduce((acc, s) => acc + (s.totalHours || 0), 0);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(today.getFullYear(), today.getMonth(), i + 1).toISOString().split('T')[0];
  });
  const hourlyRateDisplay = currentUser?.hourlyRate ? currentUser.hourlyRate.toFixed(2) : 'Set by admin';
  const availabilityStatus = (date: string) => availabilities.find(a => a.workerId === currentUser?.id && a.date === date)?.status || 'UNAVAILABLE';
  const availabilityClasses: Record<string, string> = {
    DAY: 'bg-green-500 text-white shadow-lg shadow-green-500/30',
    NIGHT: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30',
    BOTH: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
    UNAVAILABLE: 'bg-slate-50 text-slate-400 hover:bg-slate-100',
  };

  // Render Documents View
  const uploadVehicleDoc = async () => {
    if (!assignedVehicleId || !assignedVehicleType) {
      alert('You need a truck or trailer assignment to upload a vehicle document.');
      return;
    }
    if (!docFile) {
      alert('Choose a file to upload.');
      return;
    }
    setDocUploading(true);
    const path = `${currentUser?.id || 'worker'}/${Date.now()}-${docFile.name}`;
    const { error: uploadErr } = await supabase.storage.from(VEHICLE_DOC_BUCKET).upload(path, docFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) {
      console.error('[Upload] vehicle doc failed', uploadErr);
      alert('Upload failed; check bucket permissions and size limits.');
      setDocUploading(false);
      return;
    }
    const { data } = supabase.storage.from(VEHICLE_DOC_BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;
    addVehicleDocument({
      vehicleId: assignedVehicleId,
      vehicleType: assignedVehicleType,
      category: 'DOCUMENT',
      label: docLabel || docFile.name,
      url: publicUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.id || 'unknown',
    });
    setDocLabel('');
    setDocFile(null);
    alert('Document saved to vehicle_documents');
    setDocUploading(false);
  };

  if (currentView === 'DOCUMENTS') {
    return (
      <div className="animate-in fade-in duration-500 space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Documents</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your licenses, certifications, and insurance.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentUser?.documents?.map(doc => (
            <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={doc.type === 'PDF' ? "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" : "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"} />
                  </svg>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${doc.status === 'VALID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {doc.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{doc.name}</h3>
              <p className="text-slate-400 text-sm mt-1">Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
              <div className="mt-6 pt-4 border-t border-slate-50 flex gap-3">
                <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100">View</button>
                <button className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100">Download</button>
              </div>
            </div>
          ))}

          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col gap-3 p-6 text-center hover:bg-slate-100 transition-colors">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-bold text-slate-700">Upload Vehicle Document</p>
            <p className="text-xs text-slate-400">Uploads to Supabase Storage and saves the URL to vehicle_documents.</p>
            <input
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm"
              placeholder="Label (e.g., Insurance, CDL)"
              value={docLabel}
              onChange={e => setDocLabel(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf,image/*"
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm"
              onChange={e => setDocFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={uploadVehicleDoc}
              disabled={docUploading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 disabled:opacity-60"
            >
              {docUploading ? 'Uploading…' : 'Upload'}
            </button>
            {!assignedVehicleId && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Tip: get an assignment first so we know which vehicle to attach the document to.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Welcome back, {currentUser?.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${activeShift ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
          <span className="text-sm font-semibold text-slate-600">{activeShift ? 'Active Shift' : 'Off Duty'}</span>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* 1. MAIN CLOCK IN/OUT CARD (Span 8) */}
        <div className={`md:col-span-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20 group flex flex-col justify-between border border-white/10`}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-700"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2 tracking-tight">Time Tracking</h2>
                <p className="text-slate-300 max-w-md text-sm leading-relaxed">
                  {activeShift
                    ? `Shift started at ${new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                    : "Select vehicles to start your shift."}
                  {todaysAssignment && (
                    <span className="block text-brand-200 mt-2 font-medium bg-white/10 w-max px-3 py-1 rounded-lg backdrop-blur-sm">
                      Assigned: {assignedTruck?.plateNumber || 'Truck pending'}{assignedTruck?.model ? ` (${assignedTruck.model})` : ''}
                      {assignedTrailer ? ` + ${assignedTrailer.identifier} (${assignedTrailer.type})` : ''}
                    </span>
                  )}
                </p>
              </div>
              {/* Monthly Hours Stat */}
              <div className="text-right">
                <div className="text-4xl font-bold font-mono tracking-tight">{monthlyHours.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Hours (Month)</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            {!activeShift ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row flex-wrap gap-4 items-center">
                <select
                  className="w-full md:w-auto bg-slate-800/80 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer flex-grow disabled:cursor-not-allowed disabled:opacity-70 transition-all hover:bg-slate-800"
                  value={selectedTruck}
                  onChange={(e) => setSelectedTruck(e.target.value)}
                  disabled={!!todaysAssignment?.truckId}
                >
                  <option value="">{todaysAssignment?.truckId ? 'Truck Assigned' : 'Select Truck'}</option>
                  {trucks.filter(t => t.status === 'AVAILABLE' || t.id === todaysAssignment?.truckId).map(t => (
                    <option key={t.id} value={t.id}>{t.plateNumber} — {t.model}</option>
                  ))}
                </select>

                <select
                  className="w-full md:w-auto bg-slate-800/80 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer flex-grow disabled:cursor-not-allowed disabled:opacity-70 transition-all hover:bg-slate-800"
                  value={selectedTrailer}
                  onChange={(e) => setSelectedTrailer(e.target.value)}
                  disabled={!!todaysAssignment?.trailerId}
                >
                  <option value="">{todaysAssignment?.trailerId ? 'Trailer Assigned' : 'Select Trailer'}</option>
                  {trailers.filter(t => t.status === 'AVAILABLE' || t.id === todaysAssignment?.trailerId).map(t => (
                    <option key={t.id} value={t.id}>{t.identifier} — {t.type}</option>
                  ))}
                </select>

                <button
                  onClick={handleClockIn}
                  className="w-full md:w-auto bg-brand-500 hover:bg-brand-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all active:scale-95 flex-grow md:flex-grow-0 whitespace-nowrap"
                >
                  Start Shift
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-slate-300 font-medium">Shift Active Since</span>
                  <span className="text-3xl font-mono font-bold tracking-widest text-white">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/10 px-3 py-2 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={noPauseTaken}
                    onChange={(e) => setNoPauseTaken(e.target.checked)}
                    className="rounded border-slate-300 bg-white/20"
                  />
                  No pause taken (notify admin, deduct 0m)
                </label>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full md:w-auto bg-red-500 hover:bg-red-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  End Shift
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. TASK WIDGET (Span 4) */}
        <div className="md:col-span-4 glass-card p-6 rounded-3xl flex flex-col h-full min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Tasks</h3>
            <span className="bg-brand-100 text-brand-700 text-xs px-2.5 py-1 rounded-full font-bold">
              {tasks.filter(t => t.workerId === currentUser?.id && t.status === 'PENDING').length} New
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {tasks.filter(t => t.workerId === currentUser?.id).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All caught up!
              </div>
            )}
            {tasks.filter(t => t.workerId === currentUser?.id).map(task => (
              <div key={task.id} className={`group p-4 rounded-2xl border transition-all duration-300 ${task.status === 'COMPLETED'
                  ? 'bg-slate-50/50 border-slate-100 opacity-60'
                  : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5'
                }`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={task.status === 'COMPLETED'}
                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : 'border-slate-300 group-hover:border-brand-500'
                      }`}
                  >
                    {task.status === 'COMPLETED' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div>
                    <h4 className={`text-sm font-bold ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded-lg border border-slate-100">Due: {task.dueDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. CALENDAR WIDGET (Span 6) */}
        <div id="calendar-widget" className={`md:col-span-6 glass-panel rounded-3xl p-8 ${currentView === 'SCHEDULE' ? 'ring-2 ring-brand-500' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">Availability Check</h3>
            <div className="text-sm font-bold text-slate-400">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <div key={`${d}-${idx}`} className="text-center text-xs font-bold text-slate-300 mb-2">{d}</div>
            ))}
            {calendarDays.map(date => {
              const day = new Date(date).getDate();
              const status = availabilityStatus(date);
              return (
                <button
                  key={date}
                  onClick={() => toggleAvailability(currentUser!.id, date)}
                  className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 ${availabilityClasses[status] || availabilityClasses.UNAVAILABLE} ${status !== 'UNAVAILABLE' ? 'scale-105' : ''}`}
                  >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4 justify-center bg-slate-50 p-3 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-green-500"></span> Available Day</div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Available Night</div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Day/Night</div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><span className="w-3 h-3 rounded-full bg-slate-200"></span> Unavailable</div>
          </div>
        </div>

        {/* 4. DAMAGE REPORT (Span 6) */}
        <div className="md:col-span-6 glass-panel rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
          <h3 className="font-bold text-lg text-slate-800 mb-6 relative z-10 flex items-center gap-2">
            <span className="p-2 bg-red-50 text-red-500 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </span>
            Report Incident
          </h3>

          <div className="flex flex-col sm:flex-row gap-6 relative z-10">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex-shrink-0 w-full sm:w-40 aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${damageImages.length ? 'border-brand-500 bg-brand-50/50 p-2' : 'border-slate-300 hover:border-brand-400 hover:bg-white/50 bg-slate-50/50'
                }`}
            >
              {damageImages.length ? (
                <div className="w-full h-full grid grid-cols-2 gap-1">
                  {damageImages.slice(0,4).map((img, idx) => (
                    <img key={idx} src={img} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Upload Photo</span>
                </>
              )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
            </div>

            <div className="flex-grow flex flex-col gap-4">
              <textarea
                className="flex-grow p-4 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-all backdrop-blur-sm focus:bg-white placeholder:text-slate-400"
                placeholder="Describe the incident details..."
                rows={3}
                value={damageDesc}
                onChange={(e) => setDamageDesc(e.target.value)}
              />
              <button
                onClick={submitDamageReport}
                disabled={!damageImages.length}
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-[0.98]"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>

        {/* 5. INDEPENDENT / PAYROLL (Span 6) */}
        <div className="md:col-span-6 glass-panel rounded-3xl p-8">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-2 bg-green-100 text-green-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            Compensation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-wider">Hourly Wage ($)</p>
              <div className="flex gap-2">
                <input
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-700"
                  placeholder="Set by admin"
                  value={hourlyRateDisplay}
                  readOnly
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Locked at account creation. Contact admin for updates.</p>
            </div>
            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-wider">Submit Invoice</p>
              <div className="flex flex-col gap-3">
                <input
                  className="bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                  placeholder="Total Hours"
                  value={invoiceHours}
                  onChange={e => setInvoiceHours(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                    placeholder="Amount ($)"
                    value={invoiceAmount}
                    onChange={e => setInvoiceAmount(e.target.value)}
                  />
                  <button
                    onClick={submitInvoice}
                    className="bg-brand-500 text-white px-5 rounded-xl font-bold hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">End of Shift Report</h3>
            <p className="text-slate-500 mb-6 text-sm">Please provide a brief summary of your shift for the admin log.</p>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="E.g., Delivered to warehouse A. Heavy traffic on return."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all"
              >
                Complete Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
