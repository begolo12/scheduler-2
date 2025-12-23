
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  onSnapshot, 
  tasksCol, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  db, 
  collection, 
  setDoc, 
  getDocs 
} from './firebase';
import { Task, Division, User, Role } from './types';
import { INDONESIAN_HOLIDAYS, DIVISIONS } from './constants';
import { 
  Plus, LayoutDashboard, GanttChartSquare, ListTodo, Users, 
  Settings, LogOut, ChevronLeft, ChevronRight, Search, 
  CheckCircle, AlertCircle, TrendingUp, Menu, Lock, User as UserIcon, Eye, EyeOff, Save, Key, Loader2,
  CalendarDays, CalendarRange, PanelLeftClose, PanelLeft, X, Calendar as CalendarIcon, ClipboardList, Filter, ChevronDown, Camera, Trash2 as TrashIcon
} from 'lucide-react';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import { addMonths, startOfMonth, endOfMonth, format, parseISO, isBefore, startOfDay } from 'date-fns';

type View = 'Dashboard' | 'Gantt' | 'TaskList' | 'Team' | 'Settings';
type GanttFilter = 'All' | Division;
type TimeRange = '1 Month' | '3 Months';
type TaskStatusFilter = 'All' | 'Active' | 'Completed' | 'Overdue';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('Gantt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [ganttFilter, setGanttFilter] = useState<GanttFilter>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1 Month');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('All');

  useEffect(() => {
    const qTasks = query(tasksCol, orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    seedInitialManagers();

    const savedUser = localStorage.getItem('daniswara_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('daniswara_user');
      }
    }

    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => { unsubTasks(); unsubUsers(); window.removeEventListener('resize', handleResize); };
  }, []);

  const seedInitialManagers = async () => {
    const managers = [
      { name: 'Irvan', username: 'irvan', password: '123', role: 'Manager' as Role, division: 'Busdev' as Division },
      { name: 'Yoga', username: 'yoga', password: '123', role: 'Manager' as Role, division: 'Operasi' as Division },
      { name: 'Muklis', username: 'muklis', password: '123', role: 'Manager' as Role, division: 'Keuangan' as Division },
      { name: 'Admin Utama', username: 'admin', password: '123', role: 'Admin' as Role, division: 'General' as Division },
    ];
    
    try {
      for (const m of managers) {
        const id = `user-${m.username}`;
        await setDoc(doc(db, 'users', id), { ...m, id }, { merge: true });
      }
    } catch (err) {}
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const fd = new FormData(e.currentTarget);
    const userInput = (fd.get('username') as string || '').toLowerCase().trim();
    const passInput = fd.get('password') as string || '';

    try {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      let foundUser = allUsers.find(u => u.username?.toLowerCase() === userInput);
      
      if (foundUser && (foundUser.password === passInput || (!foundUser.password && passInput === '123'))) {
        localStorage.setItem('daniswara_user', JSON.stringify(foundUser));
        setCurrentUser(foundUser);
        setIsLoggedIn(true);
      } else {
        alert('Username atau Password salah!');
      }
    } catch (err) {
      alert('Gagal terhubung ke database.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('daniswara_user');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const ganttTasks = useMemo(() => {
    let filtered = tasks;
    if (!showCompleted) {
      filtered = filtered.filter(t => !t.completed && t.status !== 'Finalisasi');
    }
    if (ganttFilter !== 'All') {
      const targetDiv = ganttFilter.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const taskDiv = (t.division || 'General').trim().toLowerCase();
        return taskDiv === targetDiv;
      });
    }
    return filtered;
  }, [tasks, ganttFilter, showCompleted]);

  const visibleTasksList = useMemo(() => {
    if (!currentUser) return [];
    let base = tasks;
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      base = base.filter(t => t.assignees?.includes(currentUser.name));
    }
    const today = startOfDay(new Date());
    if (taskStatusFilter === 'Completed') {
      return base.filter(t => t.completed || t.status === 'Finalisasi');
    } else if (taskStatusFilter === 'Active') {
      return base.filter(t => !t.completed && t.status !== 'Finalisasi' && (!t.endDate || !isBefore(parseISO(t.endDate), today)));
    } else if (taskStatusFilter === 'Overdue') {
      return base.filter(t => !t.completed && t.status !== 'Finalisasi' && t.endDate && isBefore(parseISO(t.endDate), today));
    }
    return base;
  }, [tasks, currentUser, taskStatusFilter]);

  const rangeDates = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(addMonths(viewDate, timeRange === '1 Month' ? 0 : 2));
    return { start, end };
  }, [viewDate, timeRange]);

  const handleStatClick = (filter: TaskStatusFilter) => {
    setTaskStatusFilter(filter);
    setCurrentView('TaskList');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans p-6">
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[3rem] p-10 md:p-14 text-white text-center">
            <div className="bg-indigo-600 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-indigo-600/30 mx-auto mb-8 animate-float">
              <GanttChartSquare size={32} className="md:w-10 md:h-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">Daniswara</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Operational Scheduler</p>
            
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input name="username" required className="w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500 transition-all" placeholder="Username" />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input name="password" type="password" required className="w-full pl-14 pr-5 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500 transition-all" placeholder="Password" />
              </div>
              <button type="submit" disabled={isLoggingIn} className="w-full py-5 bg-indigo-600 rounded-[1.5rem] font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all">
                {isLoggingIn ? <Loader2 className="animate-spin mx-auto" /> : 'MASUK KE SISTEM'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans text-xs antialiased">
      {/* Mobile Overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 ${isSidebarOpen ? 'w-[85vw] md:w-64 translate-x-0' : 'w-0 lg:w-20 -translate-x-full lg:translate-x-0'} bg-slate-900 transition-all duration-300 flex flex-col z-[110] shadow-2xl overflow-hidden shrink-0`}>
        <div className="p-6 flex items-center gap-4 mb-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl shrink-0 shadow-lg"><GanttChartSquare size={24} className="text-white" /></div>
          {(isSidebarOpen || window.innerWidth < 1024) && <span className="text-white font-black text-xl tracking-tighter whitespace-nowrap uppercase">Daniswara</span>}
        </div>
        
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          <SidebarLink icon={<LayoutDashboard size={24} />} label="Dashboard" active={currentView === 'Dashboard'} collapsed={!isSidebarOpen && window.innerWidth >= 1024} onClick={() => { setCurrentView('Dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <SidebarLink icon={<GanttChartSquare size={24} />} label="Schedule" active={currentView === 'Gantt'} collapsed={!isSidebarOpen && window.innerWidth >= 1024} onClick={() => { setCurrentView('Gantt'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <SidebarLink icon={<ListTodo size={24} />} label="Task List" active={currentView === 'TaskList'} collapsed={!isSidebarOpen && window.innerWidth >= 1024} onClick={() => { setCurrentView('TaskList'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Users size={24} />} label="Team Registry" active={currentView === 'Team'} collapsed={!isSidebarOpen && window.innerWidth >= 1024} onClick={() => { setCurrentView('Team'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
        </nav>

        <div className="p-3 bg-black/10">
          <SidebarLink icon={<Settings size={22} />} label="Settings" active={currentView === 'Settings'} collapsed={!isSidebarOpen && window.innerWidth >= 1024} onClick={() => { setCurrentView('Settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-slate-500 hover:text-rose-400 transition-all rounded-2xl mt-1">
            <LogOut size={22} />
            {(isSidebarOpen || window.innerWidth < 1024) && <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b h-16 md:h-20 flex items-center justify-between px-4 md:px-10 shrink-0 z-40">
          <div className="flex items-center gap-2 md:gap-5">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl text-slate-600 transition-all">
              {isSidebarOpen ? <X size={24} className="lg:hidden" /> : <Menu size={24} className="lg:hidden" />}
              <span className="hidden lg:block">
                {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeft size={24} />}
              </span>
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-none">Daniswara</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-900 leading-none">{currentUser?.name}</p>
              <p className="text-[9px] font-black text-indigo-500 uppercase mt-1 tracking-widest">{currentUser?.division}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-indigo-600/20">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg md:text-xl">{currentUser?.name?.[0]}</span>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
          {currentView === 'Dashboard' && <DashboardView tasks={tasks} onStatClick={handleStatClick} />}
          {currentView === 'Gantt' && (
            <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-500">
              <div className="bg-white p-3 md:p-5 rounded-[1.5rem] md:rounded-[2.5rem] border shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 md:gap-5">
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  <button onClick={() => setGanttFilter('All')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${ganttFilter === 'All' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All</button>
                  {DIVISIONS.map(div => (
                    <button key={div} onClick={() => setGanttFilter(div)} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${ganttFilter === div ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{div}</button>
                  ))}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
                  <div className="flex bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl flex-1 xl:flex-none shadow-inner">
                    <button onClick={() => setTimeRange('1 Month')} className={`flex-1 xl:flex-none px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${timeRange === '1 Month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1 Bulan</button>
                    <button onClick={() => setTimeRange('3 Months')} className={`flex-1 xl:flex-none px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${timeRange === '3 Months' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>3 Bulan</button>
                  </div>
                  
                  <button onClick={() => setShowCompleted(!showCompleted)} className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl border transition-all ${showCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-400'}`}>
                    {showCompleted ? <Eye size={18}/> : <EyeOff size={18}/>}
                  </button>
                  
                  <div className="flex items-center gap-1 bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl">
                    <button onClick={() => setViewDate(addMonths(viewDate, -1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={18}/></button>
                    <span className="font-black text-[8px] md:text-[10px] uppercase tracking-widest min-w-[80px] md:min-w-[120px] text-center text-slate-700">{format(viewDate, 'MMM yyyy')}</span>
                    <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[400px] md:min-h-[500px]">
                <GanttChart 
                  tasks={ganttTasks} 
                  holidays={INDONESIAN_HOLIDAYS} 
                  onTaskClick={(t) => { if (currentUser?.role !== 'Staff') { setEditingTask(t); setIsModalOpen(true); } }} 
                  startDate={rangeDates.start} 
                  endDate={rangeDates.end} 
                />
              </div>
            </div>
          )}
          {currentView === 'TaskList' && (
            <TaskListView 
              tasks={visibleTasksList} 
              statusFilter={taskStatusFilter}
              setStatusFilter={setTaskStatusFilter}
              onEdit={(t: any) => { setEditingTask(t); setIsModalOpen(true); }} 
            />
          )}
          {currentView === 'Team' && <TeamView users={users} tasks={tasks} isAdmin={currentUser?.role === 'Admin'} />}
          {currentView === 'Settings' && <SettingsView user={currentUser!} onUpdate={async (u) => {
             await updateDoc(doc(db, 'users', currentUser!.id), u);
             setCurrentUser({...currentUser!, ...u});
             localStorage.setItem('daniswara_user', JSON.stringify({...currentUser!, ...u}));
             alert('Profile updated successfully.');
          }} />}
        </div>
      </main>

      {/* Floating Add Button for Mobile */}
      {currentUser?.role !== 'Staff' && currentView !== 'Settings' && (
        <button 
          onClick={() => { setEditingTask({}); setIsModalOpen(true); }}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center z-50 active:scale-90 transition-transform"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          currentUser={currentUser!}
          users={users}
          onClose={() => setIsModalOpen(false)} 
          onSave={async (data) => {
             if (data.id) await updateDoc(doc(db, 'tasks', data.id), data);
             else await addDoc(tasksCol, { ...data, createdAt: Date.now(), completed: false });
             setIsModalOpen(false);
          }}
          onDelete={async (id) => {
            if (confirm('Hapus task operasional ini?')) {
              await deleteDoc(doc(db, 'tasks', id));
              setIsModalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

const SidebarLink = ({ icon, label, active, collapsed, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-xl md:rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span>
    {(!collapsed || window.innerWidth < 1024) && <span className="text-[11px] font-black uppercase tracking-widest truncate">{label}</span>}
  </button>
);

const StatCard = ({ label, value, icon, colorClass, onClick }: any) => (
  <div 
    onClick={onClick} 
    className="p-5 md:p-8 bg-white rounded-[1.5rem] md:rounded-[3rem] border shadow-sm flex items-center justify-between group hover:shadow-lg transition-all cursor-pointer active:scale-95"
  >
    <div className="overflow-hidden">
      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 truncate">{label}</p>
      <p className="text-xl md:text-3xl font-black text-slate-900">{value}</p>
    </div>
    <div className={`p-3 md:p-5 rounded-xl md:rounded-3xl ${colorClass} group-hover:scale-110 transition-transform shrink-0 shadow-sm`}>
      {React.cloneElement(icon as React.ReactElement, { size: window.innerWidth < 768 ? 20 : 28 })}
    </div>
  </div>
);

const DashboardView = ({ tasks, onStatClick }: { tasks: Task[], onStatClick: (f: TaskStatusFilter) => void }) => {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed || t.status === 'Finalisasi').length;
    const overdue = tasks.filter((t) => !t.completed && t.status !== 'Finalisasi' && t.endDate && isBefore(parseISO(t.endDate), today)).length;
    const active = total - completed - overdue;
    return { total, completed, active, overdue };
  }, [tasks]);

  const workloadData = useMemo(() => {
    const filteredTasks = tasks.filter(t => t.division !== 'General');
    const totalSpecific = filteredTasks.length;
    
    return DIVISIONS.filter(d => d !== 'General').map(div => {
      const count = filteredTasks.filter(t => t.division === div).length;
      const pct = totalSpecific > 0 ? Math.round((count / totalSpecific) * 100) : 0;
      return { div, count, pct };
    });
  }, [tasks]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
        <StatCard onClick={() => onStatClick('All')} label="Total Task" value={stats.total} icon={<ClipboardList />} colorClass="bg-slate-50 text-slate-400" />
        <StatCard onClick={() => onStatClick('Completed')} label="Selesai" value={stats.completed} icon={<CheckCircle />} colorClass="bg-emerald-50 text-emerald-500" />
        <StatCard onClick={() => onStatClick('Active')} label="Sedang Jalan" value={stats.active} icon={<TrendingUp />} colorClass="bg-indigo-50 text-indigo-500" />
        <StatCard onClick={() => onStatClick('Overdue')} label="Overdue" value={stats.overdue} icon={<AlertCircle />} colorClass="bg-rose-50 text-rose-500" />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border shadow-sm">
          <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
            <div className="w-1 md:w-1.5 h-5 md:h-6 bg-indigo-600 rounded-full" />
            Beban Kerja Unit
          </h3>
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-10 ml-4 md:ml-4.5">Distribusi berdasarkan jumlah task</p>
          <div className="space-y-6 md:space-y-8">
            {workloadData.map(data => (
              <div key={data.div}>
                <div className="flex justify-between text-[9px] md:text-[11px] font-black uppercase tracking-widest mb-2 md:mb-3 text-slate-500">
                  <span>{data.div} Unit ({data.count})</span>
                  <span className="text-indigo-600">{data.pct}%</span>
                </div>
                <div className="h-2 md:h-3 bg-slate-50 rounded-full overflow-hidden border shadow-inner">
                  <div className="h-full bg-indigo-600 transition-all duration-1000 ease-out" style={{ width: `${data.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border shadow-sm flex flex-col">
          <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-10 tracking-tight flex items-center gap-3">
             <div className="w-1 md:w-1.5 h-5 md:h-6 bg-indigo-600 rounded-full" />
             Aktivitas Terbaru
          </h3>
          <div className="space-y-3 md:space-y-4 flex-1 overflow-auto max-h-[300px] md:max-h-[400px] pr-2">
            {tasks.slice(0, 10).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 md:gap-5 p-3 md:p-5 hover:bg-slate-50 rounded-2xl md:rounded-3xl border border-transparent hover:border-slate-100 transition-all group">
                <div className={`w-1 md:w-1.5 h-8 md:h-10 rounded-full shrink-0 ${t.completed ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-black text-slate-900 truncate">{t.title}</p>
                  <div className="flex items-center gap-1 md:gap-2 mt-0.5">
                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.division}</p>
                    <span className="text-[7px] md:text-[8px] text-slate-300">•</span>
                    {t.fDate ? (
                      <p className="text-[8px] md:text-[10px] text-emerald-500 font-black uppercase tracking-widest">Done: {format(parseISO(t.fDate), 'dd MMM')}</p>
                    ) : (
                      <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">DL: {t.endDate ? format(parseISO(t.endDate), 'dd MMM') : '-'}</p>
                    )}
                  </div>
                </div>
                {t.completed && <CheckCircle size={18} className="text-emerald-500 shrink-0 md:w-6 md:h-6" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskListView = ({ tasks, onEdit, statusFilter, setStatusFilter }: { tasks: Task[], onEdit: (t: Task) => void, statusFilter: TaskStatusFilter, setStatusFilter: (f: TaskStatusFilter) => void }) => {
  const [search, setSearch] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filtered = tasks.filter((t: any) => (t.title || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] border shadow-sm overflow-hidden h-full flex flex-col animate-in fade-in duration-500">
      <div className="p-4 md:p-8 border-b flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 md:py-5 bg-slate-50 rounded-xl md:rounded-[1.5rem] outline-none font-bold text-xs md:text-sm border-2 border-transparent focus:border-indigo-100 transition-all" placeholder="Cari task operasional..." />
        </div>
        
        {/* Mobile Filter Selection */}
        <div className="xl:hidden relative">
          <button 
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 rounded-xl border font-black text-[10px] uppercase tracking-widest text-slate-600"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-indigo-600" />
              Status: {statusFilter}
            </div>
            <ChevronDown size={14} className={`transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isFilterDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl z-50 p-2 space-y-1">
              {(['All', 'Active', 'Completed', 'Overdue'] as TaskStatusFilter[]).map(f => (
                <button 
                  key={f}
                  onClick={() => { setStatusFilter(f); setIsFilterDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-black text-[9px] uppercase tracking-widest ${statusFilter === f ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                >
                  {f === 'All' ? 'Semua' : f === 'Active' ? 'Aktif' : f === 'Completed' ? 'Selesai' : 'Overdue'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Filter Tabs */}
        <div className="hidden xl:flex items-center gap-2">
          {(['All', 'Active', 'Completed', 'Overdue'] as TaskStatusFilter[]).map(f => (
            <button 
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {f === 'All' ? 'Semua' : f === 'Active' ? 'Aktif' : f === 'Completed' ? 'Selesai' : 'Overdue'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10"><tr className="bg-slate-50/50">
              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Status</th>
              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Task</th>
              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b text-center">Unit</th>
              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Deadline</th>
              <th className="px-10 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t: any) => {
                 const isTOverdue = !t.completed && t.status !== 'Finalisasi' && t.endDate && isBefore(parseISO(t.endDate), startOfDay(new Date()));
                 return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-6">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        t.completed ? 'bg-emerald-100 text-emerald-700' : isTOverdue ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {t.completed ? 'Selesai' : isTOverdue ? 'Overdue' : 'Aktif'}
                      </span>
                    </td>
                    <td className="px-10 py-6 font-black text-slate-900 text-sm truncate max-w-xs">{t.title}</td>
                    <td className="px-10 py-6 text-center font-bold text-slate-500 uppercase text-[10px]">{t.division}</td>
                    <td className="px-10 py-6 text-[12px] font-bold text-slate-400">{t.endDate ? format(parseISO(t.endDate), 'dd MMM yyyy') : '-'}</td>
                    <td className="px-10 py-6 text-right"><button onClick={() => onEdit(t)} className="bg-white border-2 border-slate-100 text-slate-600 font-black px-6 py-2.5 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-[11px] uppercase">Kelola</button></td>
                  </tr>
                 )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden p-4 space-y-4">
          {filtered.map((t: any) => {
            const isTOverdue = !t.completed && t.status !== 'Finalisasi' && t.endDate && isBefore(parseISO(t.endDate), startOfDay(new Date()));
            return (
              <div key={t.id} onClick={() => onEdit(t)} className="bg-white border rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${
                    t.completed ? 'bg-emerald-100 text-emerald-700' : isTOverdue ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {t.completed ? 'Selesai' : isTOverdue ? 'Overdue' : 'Aktif'}
                  </span>
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest px-2 py-1 bg-indigo-50 rounded-lg">
                    {t.division}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 mb-4 line-clamp-2">{t.title}</h4>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px]">
                    <CalendarIcon size={14} />
                    {t.endDate ? format(parseISO(t.endDate), 'dd MMM yy') : 'No Date'}
                  </div>
                  <div className="flex -space-x-2">
                    {t.assignees?.slice(0, 3).map((a: string, i: number) => (
                      <div key={i} className="w-7 h-7 bg-indigo-100 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-indigo-600 uppercase">
                        {a[0]}
                      </div>
                    ))}
                    {t.assignees?.length > 3 && (
                      <div className="w-7 h-7 bg-slate-100 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-slate-400">
                        +{t.assignees.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tidak ada task ditemukan</div>
          )}
        </div>
      </div>
    </div>
  );
};

const TeamView = ({ users, tasks, isAdmin }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = (fd.get('username') as string || '').toLowerCase().trim();
    if (!username) return;
    const id = `user-${username}`;
    await setDoc(doc(db, 'users', id), {
      id, 
      name: fd.get('name'), 
      username, 
      password: '123', 
      role: fd.get('role'), 
      division: fd.get('division'),
      photoURL: photoPreview || ''
    });
    setIsAdding(false);
    setPhotoPreview(null);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`Hapus personel ${name} dari registry?`)) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Team Registry</h3>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">Personnel Management</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsAdding(true)} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-4 rounded-xl md:rounded-[1.5rem] font-black uppercase text-[10px] md:text-[11px] tracking-widest shadow-xl flex gap-3 items-center justify-center hover:bg-indigo-700 transition-all">
            <Plus size={20}/> Onboard Baru
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 md:px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Personel</th>
                <th className="px-6 md:px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Role & Unit</th>
                <th className="px-6 md:px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b text-center">Performance</th>
                <th className="px-6 md:px-10 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u: any) => {
                const userTasks = tasks.filter((t: any) => t.assignees?.includes(u.name));
                const doneTasks = userTasks.filter((t: any) => t.completed || t.status === 'Finalisasi');
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 md:px-10 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center text-indigo-600 font-black shrink-0 border border-indigo-100">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm md:text-base uppercase">{u.name?.[0]}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-xs md:text-sm truncate">{u.name}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5">
                      <div className="inline-flex flex-col">
                        <span className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase">{u.role}</span>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{u.division}</span>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-xs md:text-sm font-black text-slate-900">{doneTasks.length} / {userTasks.length}</span>
                        </div>
                        <div className="w-20 md:w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-indigo-500" style={{ width: `${userTasks.length > 0 ? (doneTasks.length / userTasks.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5 text-right">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <TrashIcon size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-14 animate-in zoom-in-95 duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">Tambah Personel</h3>
               <button onClick={() => { setIsAdding(false); setPhotoPreview(null); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="flex flex-col items-center gap-4 mb-2">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={24} className="mb-1" />
                      <span className="text-[9px] font-black uppercase text-center">Upload Foto</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                {photoPreview && (
                  <button type="button" onClick={() => setPhotoPreview(null)} className="text-[9px] font-black uppercase text-rose-500">Remove Photo</button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap</label>
                <input name="name" required className="w-full px-5 py-3.5 bg-slate-50 rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Username</label>
                <input name="username" required className="w-full px-5 py-3.5 bg-slate-50 rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100" />
              </div>
              <div className="bg-amber-50 p-4 rounded-xl text-center border border-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-widest">Password Awal: 123</div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Role</label>
                <select name="role" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold text-sm border-2 border-transparent focus:border-indigo-100">
                  <option value="Staff">Staff</option><option value="SPV">SPV</option><option value="Manager">Manager</option><option value="Admin">Full Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Unit Divisi</label>
                <select name="division" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold text-sm border-2 border-transparent focus:border-indigo-100">
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] shadow-xl hover:bg-indigo-700 transition-all mt-4">Simpan Data</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ user, onUpdate }: { user: User, onUpdate: (u: any) => void }) => {
  const [pass, setPass] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updateData: any = {};
    if (pass.trim().length > 0) {
      if (pass.length < 3) return alert('Password minimal 3 karakter');
      updateData.password = pass;
    }
    updateData.photoURL = photoPreview || '';
    onUpdate(updateData);
    setPass('');
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col items-center gap-4 md:gap-6 mb-10 md:mb-12 text-center">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-28 h-28 md:w-36 md:h-36 bg-slate-50 border-4 border-white shadow-xl rounded-[2.5rem] md:rounded-[3rem] overflow-hidden relative cursor-pointer group"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <UserIcon size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Camera size={24} />
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
        
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Profile Settings</h3>
          <p className="text-slate-400 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] mt-2">Personal Identity Vault</p>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        <div className="space-y-2">
          <label className="block text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Username Profile</label>
          <input disabled value={user.username} className="w-full px-5 md:px-7 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-[1.5rem] text-slate-400 font-bold text-sm" />
        </div>
        <div className="space-y-2">
          <label className="block text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Ganti Password (Opsional)</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full px-5 md:px-7 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-sm transition-all" placeholder="Input Password Baru" />
        </div>
        <button onClick={handleSave} className="w-full py-5 md:py-6 bg-indigo-600 text-white rounded-[1.25rem] md:rounded-[1.5rem] font-black shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all uppercase text-[11px] md:text-[13px] tracking-[0.2em] mt-4">
          <Save size={20} /> Update Security
        </button>
      </div>
    </div>
  );
};

export default App;
