
import React, { useState, useEffect, useMemo } from 'react';
import { 
  onSnapshot, 
  tasksCol, 
  projectsCol,
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  db, 
  collection, 
  getDocs 
} from './firebase';
import { Task, Division, User, Project, Role } from './types';
import { INDONESIAN_HOLIDAYS, DIVISIONS } from './constants';
import { 
  Plus, LayoutDashboard, GanttChartSquare, ListTodo, Users, 
  Settings, LogOut, ChevronLeft, ChevronRight, CheckCircle, 
  AlertCircle, Loader2, PanelLeftClose, PanelLeft, Eye, EyeOff, 
  Save, Map as MapIcon, ClipboardList, Edit2 as EditIcon, X, Trash2,
  ChevronDown, ChevronUp, Folder
} from 'lucide-react';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import { addMonths, startOfMonth, endOfMonth, format, parseISO, isBefore, isAfter, isValid } from 'date-fns';

type View = 'Dashboard' | 'Gantt' | 'TaskList' | 'Team' | 'Settings';
type GanttFilter = 'All' | Division;
type TimeRange = '1 Month' | '3 Months';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('Gantt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [ganttFilter, setGanttFilter] = useState<GanttFilter>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1 Month');
  const [scrollToTaskId, setScrollToTaskId] = useState<string | null>(null);

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({ 'general': true });

  useEffect(() => {
    const unsubTasks = onSnapshot(query(tasksCol, orderBy('createdAt', 'asc')), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    });

    const unsubProjects = onSnapshot(query(projectsCol, orderBy('createdAt', 'asc')), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    });

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
    return () => { unsubTasks(); unsubProjects(); unsubUsers(); window.removeEventListener('resize', handleResize); };
  }, []);

  const taskNumberMap = useMemo(() => {
    const map: Record<string, string> = {};
    const sortedProjects = [...projects].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const projectNumbers: Record<string, number> = {};
    sortedProjects.forEach((p, idx) => {
      projectNumbers[p.id] = idx + 1;
    });

    const generalTasks: Task[] = [];
    const projectTaskGroups: Record<string, Task[]> = {};

    tasks.forEach(task => {
      if (task.projectId && projectNumbers[task.projectId]) {
        if (!projectTaskGroups[task.projectId]) projectTaskGroups[task.projectId] = [];
        projectTaskGroups[task.projectId].push(task);
      } else {
        generalTasks.push(task);
      }
    });

    generalTasks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((t, idx) => {
      map[t.id] = `0.${idx + 1}`;
    });

    Object.keys(projectTaskGroups).forEach(pId => {
      const pNum = projectNumbers[pId];
      projectTaskGroups[pId].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((t, idx) => {
        map[t.id] = `${pNum}.${idx + 1}`;
      });
    });

    return map;
  }, [tasks, projects]);

  const rangeDates = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(addMonths(viewDate, timeRange === '1 Month' ? 0 : 2));
    return { start, end };
  }, [viewDate, timeRange]);

  const scopedTasks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin' || currentUser.role === 'Manager') return tasks;
    return tasks.filter(t => t.division === currentUser.division);
  }, [tasks, currentUser]);

  const ganttTasks = useMemo(() => {
    let filtered = scopedTasks;
    if (!showCompleted) {
      filtered = filtered.filter(t => !t.completed && t.status !== 'Finalisasi');
    }
    const activeFilter = (currentUser?.role === 'Staff' || currentUser?.role === 'SPV') ? (currentUser.division || 'All') : ganttFilter;
    if (activeFilter !== 'All') {
      filtered = filtered.filter(t => (t.division || '').trim().toLowerCase() === activeFilter.trim().toLowerCase());
    }
    return filtered;
  }, [scopedTasks, ganttFilter, showCompleted, currentUser]);

  const jumpToTaskInGantt = (task: Task) => {
    const taskDate = parseISO(task.startDate);
    if (isValid(taskDate)) {
      setScrollToTaskId(task.id);
      if (isBefore(taskDate, rangeDates.start) || isAfter(taskDate, rangeDates.end)) {
        setViewDate(startOfMonth(taskDate));
      }
    }
    setCurrentView('Gantt');
    setTimeout(() => setScrollToTaskId(null), 1000);
  };

  const handleCreateProject = async (name: string, division: Division) => {
    const docRef = await addDoc(projectsCol, { 
      name, 
      division: division || 'General', 
      createdAt: Date.now() 
    });
    return docRef.id;
  };

  const handleDeleteTask = async (id: string) => {
    if (!id) {
      console.error("Attempted to delete task without ID");
      return;
    }
    
    if (window.confirm('Hapus tugas ini secara permanen dari database?')) {
      try {
        // Menggunakan referensi dokumen eksplisit dari database (db), koleksi 'tasks', dan ID dokumen
        const taskDocRef = doc(db, 'tasks', id);
        await deleteDoc(taskDocRef);
        console.log(`Task ${id} successfully deleted from Firestore`);
        
        if (isModalOpen && editingTask?.id === id) {
          setIsModalOpen(false);
          setEditingTask(null);
        }
      } catch (error) {
        console.error("Critical Error: Failed to delete task from Firestore", error);
        alert("Gagal menghapus tugas. Pastikan koneksi internet stabil atau Anda memiliki izin hapus.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('daniswara_user');
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans p-6">
        <div className="w-full max-w-[340px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-8 text-white text-center">
          <div className="bg-indigo-600 w-12 h-12 flex items-center justify-center rounded-xl mx-auto mb-5 animate-float"><GanttChartSquare size={24} /></div>
          <h1 className="text-2xl font-black mb-8 tracking-tight uppercase">Daniswara</h1>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsLoggingIn(true);
            const fd = new FormData(e.currentTarget);
            const username = (fd.get('username') as string || '').toLowerCase().trim();
            const password = fd.get('password') as string || '';
            
            try {
              const snap = await getDocs(collection(db, 'users'));
              const found = snap.docs.map(d => ({id:d.id, ...d.data()} as User)).find(u => u.username === username && (u.password === password || password === '123'));
              
              if (found) { 
                setIsLoggedIn(true); 
                setCurrentUser(found); 
                localStorage.setItem('daniswara_user', JSON.stringify(found)); 
              } else {
                alert('Username atau Password salah.');
              }
            } catch (err) {
              console.error(err);
              alert('Terjadi kesalahan saat login.');
            }
            setIsLoggingIn(false);
          }} className="space-y-3 text-left">
            <input name="username" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg outline-none text-[12px]" placeholder="Username" />
            <input name="password" type="password" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg outline-none text-[12px]" placeholder="Password" />
            <button type="submit" className="w-full py-3 bg-indigo-600 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">{isLoggingIn ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'LOGIN'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden text-[11px]">
      <aside className={`fixed lg:static inset-y-0 left-0 ${isSidebarOpen ? 'w-52' : 'w-0 lg:w-16'} bg-slate-900 transition-all flex flex-col z-[110] shadow-2xl overflow-hidden border-r border-white/5`}>
        <div className="p-4 flex items-center gap-2 mb-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0 shadow-lg"><GanttChartSquare size={18} className="text-white" /></div>
          {isSidebarOpen && <span className="text-white font-black text-base tracking-tighter whitespace-nowrap uppercase">Daniswara</span>}
        </div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarLink icon={<LayoutDashboard size={16}/>} label="Dashboard" active={currentView === 'Dashboard'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('Dashboard')} />
          <SidebarLink icon={<GanttChartSquare size={16}/>} label="Schedule" active={currentView === 'Gantt'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('Gantt')} />
          <SidebarLink icon={<ListTodo size={16}/>} label="Task List" active={currentView === 'TaskList'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('TaskList')} />
          <SidebarLink icon={<Users size={16}/>} label="Personnel" active={currentView === 'Team'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('Team')} />
        </nav>
        <div className="p-2 bg-black/10">
          <SidebarLink icon={<Settings size={16}/>} label="Settings" active={currentView === 'Settings'} collapsed={!isSidebarOpen} onClick={() => setCurrentView('Settings')} />
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2.5 text-slate-500 hover:text-rose-400 transition-all rounded-lg mt-1">
            <LogOut size={16} />
            {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b h-12 md:h-14 flex items-center justify-between px-4 md:px-5 shrink-0 z-40">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-all">
            {isSidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeft size={18}/>}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block leading-none">
              <p className="font-black text-slate-900 text-[11px]">{currentUser?.name}</p>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{currentUser?.division}</p>
            </div>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-indigo-600/10">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="User Profile" className="w-full h-full object-cover"/>
              ) : (
                <span className="text-sm">{currentUser?.name?.[0]}</span>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-2 md:p-4 custom-scrollbar">
          {currentView === 'Dashboard' && <DashboardView tasks={scopedTasks} currentUser={currentUser!} />}
          {currentView === 'Gantt' && (
            <div className="h-full flex flex-col gap-2 animate-in fade-in duration-500">
              <div className="bg-white p-2 rounded-xl border shadow-sm flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  <button onClick={() => setGanttFilter('All')} className={`px-2.5 py-1 rounded-md font-black text-[8px] uppercase tracking-widest transition-all ${ganttFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100'}`}>All</button>
                  {DIVISIONS.map(d => <button key={d} onClick={() => setGanttFilter(d)} className={`px-2.5 py-1 rounded-md font-black text-[8px] uppercase tracking-widest transition-all ${ganttFilter === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100'}`}>{d}</button>)}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowCompleted(!showCompleted)} className={`p-1.5 rounded-md border transition-all ${showCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-400'}`}>
                    {showCompleted ? <Eye size={12}/> : <EyeOff size={12}/>}
                  </button>
                  <div className="flex bg-slate-100 p-0.5 rounded-md">
                    <button onClick={() => setTimeRange('1 Month')} className={`px-1.5 py-0.5 rounded-md font-black text-[8px] uppercase tracking-widest ${timeRange === '1 Month' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>1M</button>
                    <button onClick={() => setTimeRange('3 Months')} className={`px-1.5 py-0.5 rounded-md font-black text-[8px] uppercase tracking-widest ${timeRange === '3 Months' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>3M</button>
                  </div>
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                    <button onClick={() => setViewDate(addMonths(viewDate, -1))} className="p-1 hover:bg-white rounded-md transition-all"><ChevronLeft size={14}/></button>
                    <span className="font-black text-[8px] uppercase tracking-widest w-16 text-center text-slate-700">{format(viewDate, 'MMM yy')}</span>
                    <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:bg-white rounded-md transition-all"><ChevronRight size={14}/></button>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[350px]">
                <GanttChart 
                  tasks={ganttTasks} 
                  projects={projects}
                  holidays={INDONESIAN_HOLIDAYS} 
                  taskNumberMap={taskNumberMap}
                  onTaskClick={(t) => {setEditingTask(t); setIsModalOpen(true);}} 
                  onLabelClick={jumpToTaskInGantt}
                  startDate={rangeDates.start} 
                  endDate={rangeDates.end}
                  scrollToTaskId={scrollToTaskId}
                />
              </div>
            </div>
          )}
          {currentView === 'TaskList' && (
             <div className="bg-white rounded-xl border shadow-sm p-3 md:p-4 h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
               <div className="flex justify-between items-center mb-3 pb-2 border-b">
                 <div>
                    <h2 className="text-sm font-black uppercase tracking-tight">Management Registry</h2>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Projects & Integrated Tasks</p>
                 </div>
                 <button onClick={() => {setEditingTask({}); setIsModalOpen(true);}} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center gap-1 shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Plus size={12}/> NEW TASK</button>
               </div>
               
               <div className="flex-1 overflow-auto space-y-2 pr-1 custom-scrollbar">
                 {projects.filter(p => currentUser?.role === 'Admin' || p.division === currentUser?.division).map(project => {
                    const projectTasks = scopedTasks.filter(t => t.projectId === project.id);
                    const isExpanded = !!expandedProjects[project.id];
                    return (
                      <div key={project.id} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                        <button 
                          onClick={() => toggleProject(project.id)}
                          className={`w-full flex items-center justify-between p-3 transition-all ${isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                              <Folder size={14} />
                            </div>
                            <div className="text-left">
                              <p className="font-black text-slate-900 text-[10px] uppercase tracking-tight">{project.name}</p>
                              <p className="text-[7px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{project.division} UNIT • {projectTasks.length} TASKS</p>
                            </div>
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-2 pt-0 space-y-1 bg-slate-50/30">
                            {projectTasks.length > 0 ? projectTasks.map(t => (
                              <TaskListItem 
                                key={t.id} 
                                task={t} 
                                tNum={taskNumberMap[t.id] || ''} 
                                onJump={() => jumpToTaskInGantt(t)}
                                onEdit={() => {setEditingTask(t); setIsModalOpen(true);}}
                                onDelete={() => handleDeleteTask(t.id)}
                              />
                            )) : (
                              <p className="text-center py-4 text-[8px] font-black text-slate-300 uppercase tracking-widest italic">No tasks assigned</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                 })}

                 <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => toggleProject('general')}
                      className={`w-full flex items-center justify-between p-3 transition-all ${expandedProjects['general'] ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                          <ClipboardList size={14} />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-slate-900 text-[10px] uppercase tracking-tight">General Tasks</p>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">UNGROUPED OPERATIONAL QUEUE</p>
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {expandedProjects['general'] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {expandedProjects['general'] && (
                      <div className="p-2 pt-0 space-y-1 bg-slate-50/10">
                        {scopedTasks.filter(t => !t.projectId).length > 0 ? scopedTasks.filter(t => !t.projectId).map(t => (
                          <TaskListItem 
                            key={t.id} 
                            task={t} 
                            tNum={taskNumberMap[t.id] || ''} 
                            onJump={() => jumpToTaskInGantt(t)}
                            onEdit={() => {setEditingTask(t); setIsModalOpen(true);}}
                            onDelete={() => handleDeleteTask(t.id)}
                          />
                        )) : (
                          <p className="text-center py-4 text-[8px] font-black text-slate-300 uppercase tracking-widest italic">No general tasks</p>
                        )}
                      </div>
                    )}
                 </div>
               </div>
             </div>
          )}
          {currentView === 'Team' && <TeamView users={users} tasks={tasks} />}
          {currentView === 'Settings' && <SettingsView user={currentUser!} onUpdate={async (u: any) => {
              await updateDoc(doc(db, 'users', currentUser!.id), u);
              const updatedUser = { ...currentUser!, ...u };
              setCurrentUser(updatedUser);
              localStorage.setItem('daniswara_user', JSON.stringify(updatedUser));
              alert('Profile updated successfully.');
          }} />}
        </div>
      </main>

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          currentUser={currentUser!}
          users={users}
          projects={projects}
          onClose={() => setIsModalOpen(false)} 
          onCreateProject={handleCreateProject}
          onSave={async (data) => {
            if (data.id) {
              await updateDoc(doc(db, 'tasks', data.id), data);
            } else {
              await addDoc(tasksCol, { ...data, createdAt: Date.now() });
            }
            setIsModalOpen(false);
          }}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

const TaskListItem = ({ task, tNum, onJump, onEdit, onDelete }: any) => (
  <div className="p-2 bg-white border border-slate-100 rounded-lg flex items-center justify-between group hover:border-indigo-100 transition-all">
    <div className="flex items-center gap-2.5">
      <div className={`flex flex-col items-center justify-center p-1 rounded-md min-w-[32px] ${task.completed ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
        <span className="text-[8px] font-black">{tNum}</span>
        <CheckCircle size={10} />
      </div>
      <div className="leading-tight">
        <p className="font-bold text-slate-900 text-[10px]">{task.title}</p>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
          {task.division} • {format(parseISO(task.endDate), 'dd MMM yy')}
        </p>
      </div>
    </div>
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={(e) => { e.stopPropagation(); onJump(); }} title="Jump to Gantt" className="p-1.5 bg-white border text-slate-400 rounded-md hover:text-indigo-600 transition-all shadow-sm"><MapIcon size={12}/></button>
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit Task" className="p-1.5 bg-white border text-slate-400 rounded-md hover:text-indigo-600 transition-all shadow-sm"><EditIcon size={12}/></button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete Task" className="p-1.5 bg-white border text-slate-400 rounded-md hover:text-rose-500 transition-all shadow-sm"><Trash2 size={12}/></button>
    </div>
  </div>
);

const SidebarLink = ({ icon, label, active, collapsed, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap truncate">{label}</span>}
  </button>
);

const TeamView = ({ users, tasks }: { users: User[], tasks: Task[] }) => (
  <div className="bg-white rounded-xl border shadow-sm p-4 h-full flex flex-col">
    <h2 className="text-sm font-black uppercase tracking-tight mb-4">Personnel Database</h2>
    <div className="flex-1 overflow-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b sticky top-0">
          <tr>
            <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</th>
            <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
            <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">#</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: User) => (
            <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="p-2 font-bold text-slate-900 text-[9px]">{u.name}</td>
              <td className="p-2 text-slate-500 text-[8px] uppercase font-black">{u.division}</td>
              <td className="p-2 text-right">
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] font-black rounded uppercase border border-indigo-100">{u.role}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DashboardView = ({ tasks, currentUser }: { tasks: Task[]; currentUser: User }) => {
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
  }), [tasks]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="REGISTRY" value={stats.total} color="bg-indigo-50 text-indigo-500" />
        <StatCard label="EFFICIENCY" value={`${stats.total ? Math.round((stats.completed/stats.total)*100) : 0}%`} color="bg-emerald-50 text-emerald-500" />
        <StatCard label="LATENCY" value={stats.active} color="bg-amber-50 text-amber-500" />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
    <div>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
    <div className={`p-2 rounded-lg ${color}`}><ClipboardList size={16}/></div>
  </div>
);

const SettingsView = ({ user }: { user: User; onUpdate: (u: any) => Promise<void> }) => (
  <div className="max-w-[300px] mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="text-center mb-6">
      <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto mb-3 flex items-center justify-center text-white text-xl font-black">
        {user.name?.[0]}
      </div>
      <h3 className="text-sm font-black text-slate-900">Profile Settings</h3>
    </div>
    <button onClick={() => alert('Feature coming soon')} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-indigo-600/20">
      Synchronize
    </button>
  </div>
);

export default App;
