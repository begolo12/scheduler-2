
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Division, User as UserType, Project } from '../types';
import { DIVISIONS } from '../constants';
import { X, Trash2, User, UserPlus, FolderPlus, Folder } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface TaskModalProps {
  task: Partial<Task> | null;
  currentUser: UserType;
  users: UserType[];
  projects: Project[];
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  onCreateProject: (name: string, division: Division) => Promise<string>;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  task, 
  currentUser, 
  users, 
  projects, 
  onClose, 
  onSave, 
  onDelete,
  onCreateProject
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    division: currentUser.role === 'Admin' ? 'General' : currentUser.division,
    assignees: [],
    completed: false,
    status: 'Draft',
    projectId: '',
    sDate: '',
    dDate: '',
    fDate: ''
  });

  const [selectedUser, setSelectedUser] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (task && Object.keys(task).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...task,
        startDate: task.startDate ? task.startDate.split('T')[0] : (prev.startDate || new Date().toISOString().split('T')[0]),
        endDate: task.endDate ? task.endDate.split('T')[0] : (prev.endDate || new Date().toISOString().split('T')[0]),
        status: task.status || 'Draft',
        division: task.division || prev.division || 'General'
      }));
    } else {
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        division: currentUser.role === 'Admin' ? 'General' : currentUser.division,
        assignees: [],
        completed: false,
        status: 'Draft',
        projectId: '',
        sDate: '',
        dDate: '',
        fDate: ''
      });
    }
  }, [task, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return alert("Judul task wajib diisi!");
    if (!formData.division) return alert("Divisi wajib diisi!");
    
    const isFinal = formData.status === 'Finalisasi' || !!formData.fDate;
    onSave({ 
      ...formData, 
      completed: isFinal || formData.completed,
      division: formData.division as Division 
    });
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const targetDivision = (formData.division || 'General') as Division;
      const newId = await onCreateProject(newProjectName, targetDivision);
      setFormData(prev => ({ ...prev, projectId: newId }));
      setIsCreatingProject(false);
      setNewProjectName('');
    } catch (err) {
      alert("Gagal membuat project");
    }
  };

  const addAssignee = () => {
    if (selectedUser && !formData.assignees?.includes(selectedUser)) {
      setFormData(prev => ({ ...prev, assignees: [...(prev.assignees || []), selectedUser] }));
      setSelectedUser('');
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => u.division === formData.division);
    if (currentUser.role === 'Admin') return list;
    return list.filter(u => u.division === currentUser.division);
  }, [users, currentUser, formData.division]);

  const availableProjects = useMemo(() => {
    return projects.filter(p => p.division === formData.division);
  }, [projects, formData.division]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
        
        <div className="flex items-center justify-between p-6 md:p-8 border-b bg-slate-50/50">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {task?.id ? 'MANAGE TASK' : 'NEW TASK'}
            </h2>
            <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Operational Parameter</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Group</label>
              {!isCreatingProject ? (
                <div className="flex gap-2">
                  <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm">
                    <option value="">-- Tanpa Project (General) --</option>
                    {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsCreatingProject(true)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"><FolderPlus size={20} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nama Project Baru..." className="flex-1 px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm outline-none" />
                  <button type="button" onClick={handleCreateProject} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Create</button>
                  <button type="button" onClick={() => setIsCreatingProject(false)} className="p-3 text-slate-400"><X size={18} /></button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Name</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm" placeholder="Nama Tugas..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Division</label>
                <select 
                  value={formData.division} 
                  onChange={e => setFormData({ ...formData, division: e.target.value as Division })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm"
                  disabled={currentUser.role !== 'Admin'}
                >
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="completed" checked={formData.completed} onChange={e => setFormData({ ...formData, completed: e.target.checked })} className="w-6 h-6 accent-emerald-500 rounded-lg" />
                <label htmlFor="completed" className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Completed</label>
              </div>
            </div>

            {task?.id && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Progress Milestones</label>
                <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <ProgButton label="S" active={!!formData.sDate} date={formData.sDate} onClick={() => setFormData(prev => ({...prev, sDate: prev.sDate ? '' : new Date().toISOString().split('T')[0]}))} />
                  <ProgButton label="D" active={!!formData.dDate} date={formData.dDate} onClick={() => setFormData(prev => ({...prev, dDate: prev.dDate ? '' : new Date().toISOString().split('T')[0]}))} />
                  <ProgButton label="F" active={!!formData.fDate} date={formData.fDate} onClick={() => setFormData(prev => ({...prev, fDate: prev.fDate ? '' : new Date().toISOString().split('T')[0]}))} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignees</label>
              <div className="flex gap-2">
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm">
                  <option value="">Pilih Personel...</option>
                  {filteredUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <button type="button" onClick={addAssignee} disabled={!selectedUser} className="px-4 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase transition-all shadow-sm hover:bg-indigo-700">ADD</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.assignees?.map((name, idx) => (
                  <span key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase">
                    <User size={12} /> {name}
                    <button type="button" onClick={() => setFormData(p => ({...p, assignees: p.assignees?.filter((_, i) => i !== idx)}))} className="ml-1 hover:text-rose-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 md:p-8 border-t flex items-center justify-between gap-3 bg-slate-50/50">
          {task?.id && (
            <button onClick={() => onDelete?.(task.id!)} className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-6 py-3.5 text-slate-400 font-black text-[10px] uppercase hover:text-slate-600">Cancel</button>
            <button form="task-form" type="submit" className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">SIMPAN</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgButton = ({ label, active, date, onClick }: any) => (
  <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>
    <span className="font-black text-[10px]">{label}</span>
    {date && <span className="text-[7px] opacity-80">{format(parseISO(date), 'dd MMM')}</span>}
  </button>
);

export default TaskModal;
