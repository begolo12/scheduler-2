import React, { useState, useEffect } from 'react';
import { User, Division, Role } from '../types';
import { DIVISIONS } from '../constants';
import { X, Trash2 } from 'lucide-react';

interface UserModalProps {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
  onDelete?: (id: string) => void;
}

const ROLES: Role[] = ['Admin', 'Manager', 'SPV', 'Staff'];

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    role: 'Staff',
    division: 'General'
  });

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return alert("Nama dan Username wajib diisi!");
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {user?.id ? 'EDIT USER' : 'NEW USER'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-xs" placeholder="Nama Lengkap..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" placeholder="Username login" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" placeholder={user?.id ? "(Unchanged)" : "Password"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Division</label>
                <select value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value as Division })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs">
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            {user?.id && onDelete && (
               <button type="button" onClick={() => onDelete(user.id!)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all">
                 <Trash2 size={18} />
               </button>
            )}
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">
              Simpan User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
