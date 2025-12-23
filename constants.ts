
import { Holiday } from './types';

export const DIVISIONS = ['General', 'Busdev', 'Operasi', 'Keuangan'] as const;

// 2024 - 2025 Indonesian Public Holidays
export const INDONESIAN_HOLIDAYS: Holiday[] = [
  { date: '2024-01-01', name: 'Tahun Baru 2024' },
  { date: '2024-02-08', name: 'Isra Mikraj' },
  { date: '2024-02-10', name: 'Tahun Baru Imlek' },
  { date: '2024-03-11', name: 'Hari Suci Nyepi' },
  { date: '2024-03-29', name: 'Wafat Yesus Kristus' },
  { date: '2024-03-31', name: 'Hari Paskah' },
  { date: '2024-04-10', name: 'Hari Raya Idul Fitri' },
  { date: '2024-04-11', name: 'Hari Raya Idul Fitri' },
  { date: '2024-05-01', name: 'Hari Buruh Internasional' },
  { date: '2024-05-09', name: 'Kenaikan Yesus Kristus' },
  { date: '2024-05-23', name: 'Hari Raya Waisak' },
  { date: '2024-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2024-06-17', name: 'Hari Raya Idul Adha' },
  { date: '2024-07-07', name: 'Tahun Baru Islam' },
  { date: '2024-08-17', name: 'Hari Kemerdekaan RI' },
  { date: '2024-09-16', name: 'Maulid Nabi Muhammad SAW' },
  { date: '2024-12-25', name: 'Hari Raya Natal' },
  { date: '2025-01-01', name: 'Tahun Baru 2025' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek 2025' },
  { date: '2025-03-29', name: 'Hari Raya Idul Fitri 2025' },
  { date: '2025-03-30', name: 'Hari Raya Idul Fitri 2025' },
];
