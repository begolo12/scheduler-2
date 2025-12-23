
export type Division = 'General' | 'Busdev' | 'Operasi' | 'Keuangan';
export type Role = 'Admin' | 'Manager' | 'SPV' | 'Staff';
export type TaskStatus = 'Draft' | 'Eksekusi' | 'Review' | 'Finalisasi';

export interface Project {
  id: string;
  name: string;
  division: Division;
  startDate?: string;
  endDate?: string;
  createdAt: number;
}

export interface Task {
  id: string;
  projectId?: string; // Links task to a project
  title: string;
  description: string;
  startDate: string; 
  endDate: string; 
  completed: boolean;
  division: Division;
  assignees: string[];
  createdAt: number;
  status?: TaskStatus;
  sDate?: string; 
  dDate?: string; 
  fDate?: string; 
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  division: Division;
  photoURL?: string; 
}

export interface Holiday {
  date: string; 
  name: string;
}
