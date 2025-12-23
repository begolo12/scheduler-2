
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Division, User as UserType, TaskStatus } from '../types';
import { DIVISIONS } from '../constants';
import { X, Trash2, Calendar, User, Tag, AlignLeft, AlertTriangle, Layers, PlayCircle, FileSearch, CheckCircle2, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TaskModalProps {
  task: Partial<Task> | null;
  currentUser: UserType;
  users: UserType[];
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
}

const TASK_STATUSES: TaskStatus[] = ['Draft', 'Eksekusi', 'Review', 'Finalisasi'];

const TaskModal: React.FC<TaskModalProps> = ({ task, currentUser, users, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    division: 'General',
    assignees: [],
    completed: false,
    status: 'Draft',
    sDate: '',
    dDate: '',
    fDate: ''
  });

  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        startDate: task.startDate ? task.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: task.endDate ? task.endDate.split('T')[0] : new Date().toISOString().split('T')[0],
        status: task.status || 'Draft',
        sDate: task.sDate || '',
        dDate: task.dDate || '',
        fDate: task.fDate || ''
      });
    }
  }, [task]);

  const setActualDate = (type: 'sDate' | 'dDate' | 'fDate') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type] ? '' : new Date().toISOString().split('T')[0]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return alert("Judul task wajib diisi!");
    const isFinal = formData.status === 'Finalisasi' || !!formData.fDate;
    onSave({ ...formData, completed: isFinal || formData.completed });
  };

  const addAssignee = () => {
    if (selectedUser && !formData.assignees?.includes(selectedUser)) {
      setFormData(prev => ({
        ...prev,
        assignees: [...(prev.assignees || []), selectedUser]
      }));
      setSelectedUser('');
    }
  };

  const removeAssignee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees?.filter((_, i) => i !== index)
    }));
  };

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => u.division === formData.division);
    if (currentUser.role === 'Admin') return list;
    if (currentUser.role === 'Staff') return list.filter(u => u.id === currentUser.id);
    return list.filter(u => u.division === currentUser.division);
  }, [users, currentUser, formData.division]);

  const availableDivisions = useMemo(() => {
    return DIVISIONS.filter(div => {
      if (div === 'General') return currentUser.role === 'Admin' || currentUser.division === 'Busdev';
      return true;
    });
  }, [currentUser]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {task?.id ? 'MANAGE TASK' : 'NEW TASK'}
            </h2>
            <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5 md:mt-1">Operational Parameter</p>
          </div>
          <button onClick={onClose} className="p-2.5 md:p-3 hover:bg-white hover:shadow-md rounded-xl md:rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="space-y-1 md:space-y-2">
              <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Name</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm shadow-sm" placeholder="Nama Tugas / Pekerjaan..." />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Start</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs md:text-sm" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs md:text-sm" />
              </div>
            </div>

            {/* ACTION STATUS TRACKING S D F */}
            {task?.id && (
              <div className="space-y-3 md:space-y-4 bg-slate-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest block">Live Progression Log</label>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <button type="button" onClick={() => setActualDate('sDate')} className={`flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl md:rounded-2xl border-2 transition-all ${formData.sDate ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                    <PlayCircle size={18} />
                    <span className="font-black text-[8px] md:text-[9px]">START</span>
                    {formData.sDate && <span className="text-[7px] md:text-[8px] opacity-80">{format(parseISO(formData.sDate), 'dd MMM')}</span>}
                  </button>
                  <button type="button" onClick={() => setActualDate('dDate')} className={`flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl md:rounded-2xl border-2 transition-all ${formData.dDate ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                    <FileSearch size={18} />
                    <span className="font-black text-[8px] md:text-[9px]">DRAFT</span>
                    {formData.dDate && <span className="text-[7px] md:text-[8px] opacity-80">{format(parseISO(formData.dDate), 'dd MMM')}</span>}
                  </button>
                  <button type="button" onClick={() => setActualDate('fDate')} className={`flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl md:rounded-2xl border-2 transition-all ${formData.fDate ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                    <CheckCircle2 size={18} />
                    <span className="font-black text-[8px] md:text-[9px]">FINISH</span>
                    {formData.fDate && <span className="text-[7px] md:text-[8px] opacity-80">{format(parseISO(formData.fDate), 'dd MMM')}</span>}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:space-y-2">
                <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Division Unit</label>
                <select value={formData.division} onChange={e => { setFormData({ ...formData, division: e.target.value as Division }); setSelectedUser(''); }} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl font-bold text-sm">
                  {availableDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 py-2 md:pt-6 ml-1">
                <input type="checkbox" id="completed" checked={formData.completed} onChange={e => setFormData({ ...formData, completed: e.target.checked })} className="w-6 h-6 md:w-7 md:h-7 accent-emerald-500 cursor-pointer rounded-lg" />
                <label htmlFor="completed" className="text-[10px] md:text-[11px] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none">Tandai Selesai</label>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignees</label>
              <div className="flex gap-2">
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="flex-1 px-4 md:px-5 py-3.5 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm">
                  <option value="">Pilih Personel {formData.division}...</option>
                  {filteredUsers.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
                <button type="button" onClick={addAssignee} disabled={!selectedUser} className="p-3.5 md:px-8 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black transition-all disabled:opacity-50">
                   <UserPlus size={20} className="md:hidden" />
                   <span className="hidden md:inline text-[10px] uppercase tracking-widest">ADD</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.assignees?.map((name, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider">
                    <User size={12} className="md:w-3.5 md:h-3.5" /> {name}
                    <button type="button" onClick={() => removeAssignee(idx)} className="hover:text-rose-600 transition-colors ml-1"><X size={12} /></button>
                  </span>
                ))}
                {(!formData.assignees || formData.assignees.length === 0) && (
                   <p className="text-[9px] font-black text-slate-300 uppercase italic ml-1 py-2">Belum ada personel ditugaskan</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t flex flex-row items-center justify-between gap-3 shrink-0 bg-slate-50/50">
          {task?.id && (
            <button type="button" onClick={() => onDelete?.(task.id!)} className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-rose-50 rounded-xl transition-all">
              <Trash2 size={20} /> <span className="hidden sm:inline">Hapus</span>
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-5 md:px-8 py-3.5 md:py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">Cancel</button>
            <button form="task-form" type="submit" className="px-8 md:px-10 py-3.5 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-[1.5rem] hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30">SIMPAN</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
