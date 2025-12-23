import React, { useState, useEffect } from 'react';
import { Project, Division } from '../types';
import { DIVISIONS } from '../constants';
import { X, Trash2 } from 'lucide-react';

interface ProjectModalProps {
  project: Partial<Project> | null;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  onDelete?: (id: string) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    division: 'General',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        startDate: project.startDate || new Date().toISOString().split('T')[0],
        endDate: project.endDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return alert("Nama Project wajib diisi!");
    if (!formData.startDate || !formData.endDate) return alert("Tanggal wajib diisi!");
    if (formData.startDate > formData.endDate) return alert("Tanggal mulai tidak boleh melebihi tanggal selesai!");
    
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {project?.id ? 'EDIT PROJECT' : 'NEW PROJECT'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
            <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-xs" placeholder="Nama Project..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Division Owner</label>
            <select 
              value={formData.division} 
              onChange={e => setFormData({ ...formData, division: e.target.value as Division })} 
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs"
            >
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                <input required type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
             </div>
          </div>
          
          <div className="pt-4 flex gap-2">
            {project?.id && onDelete && (
               <button type="button" onClick={() => onDelete(project.id!)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all">
                 <Trash2 size={18} />
               </button>
            )}
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">
              Simpan Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
