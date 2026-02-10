import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Calendar, Activity, MessageSquare, Search, Bell, 
  LayoutDashboard, ChevronRight, RefreshCcw, Send, CheckCircle2,
  Clock, Phone, Heart, Brain, Stethoscope,
  AlertCircle, X, Eye, UserPlus, CalendarDays, MessageCircle,
  Building2, TestTube, Bed
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'https://whatsapp.mallikahospitals.in';

// Types - Updated to match new API
interface Stats {
  total_patients: number;
  total_appointments: number;
  total_diagnostics: number;
  total_admissions: number;
  pending_admissions: number;
  today_appointments: number;
  today_diagnostics: number;
  recent_activity: number;
  new_patients_week: number;
  platforms: Record<string, number>;
  departments: Record<string, number>;
  test_types: Record<string, number>;
}

interface Patient {
  id: number;
  external_id: string;
  platform: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  first_touch: number;
  last_touch: number;
  total_bookings: number;
  total_appointments: number;
  total_diagnostics: number;
  total_admissions: number;
  notes: string | null;
}

interface Appointment {
  booking_id: string;
  user_id: string;
  patient_name: string;
  phone: string;
  department: string;
  department_name: string;
  doctor: string;
  date: string;
  time: string;
  status: string;
  created_at: number;
}

interface Diagnostic {
  booking_id: string;
  user_id: string;
  patient_name: string;
  phone: string;
  test_type: string;
  date: string;
  time: string;
  status: string;
  created_at: number;
}

interface Admission {
  admission_id: string;
  user_id: string;
  patient_name: string;
  phone: string;
  age: string;
  sex: string;
  admission_type: string;
  preferred_date: string;
  status: string;
  created_at: number;
}

interface Interaction {
  id: number;
  patient_id: number;
  user_id: string;
  direction: string;
  platform: string;
  message: string;
  message_type: string;
  timestamp: number;
  patient_name?: string;
  external_id?: string;
}

// Colors for charts
const COLORS = ['#0891b2', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<Interaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientTimeline, setPatientTimeline] = useState<Interaction[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [showPatientModal, setShowPatientModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, weeklyRes, feedRes, patientsRes, appointmentsRes, diagnosticsRes, admissionsRes, todayRes] = await Promise.all([
        axios.get(`${API_BASE}/api/stats`),
        axios.get(`${API_BASE}/api/analytics/weekly`),
        axios.get(`${API_BASE}/api/live-feed?limit=15`),
        axios.get(`${API_BASE}/api/patients?search=${searchTerm}&limit=50`),
        axios.get(`${API_BASE}/api/appointments?status=${appointmentFilter}`),
        axios.get(`${API_BASE}/api/diagnostics`),
        axios.get(`${API_BASE}/api/admissions`),
        axios.get(`${API_BASE}/api/appointments/today`)
      ]);
      
      setStats(statsRes.data);
      setWeeklyData(weeklyRes.data);
      setLiveFeed(feedRes.data);
      setPatients(patientsRes.data);
      setAppointments(appointmentsRes.data);
      setDiagnostics(diagnosticsRes.data);
      setAdmissions(admissionsRes.data);
      setTodayAppointments(todayRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  }, [searchTerm, appointmentFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchPatientDetail = async (patient: Patient) => {
    try {
      const res = await axios.get(`${API_BASE}/api/patients/${patient.id}/timeline`);
      setSelectedPatient(patient);
      setPatientTimeline(res.data.interactions || []);
      setShowPatientModal(true);
    } catch (err) {
      console.error('Error fetching patient details:', err);
    }
  };

  const updateAppointmentStatus = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_BASE}/api/appointments/${bookingId}/status`, { status });
      fetchData();
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
  };

  const updateDiagnosticStatus = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_BASE}/api/diagnostics/${bookingId}/status`, { status });
      fetchData();
    } catch (err) {
      console.error('Error updating diagnostic:', err);
    }
  };

  const updateAdmissionStatus = async (admissionId: string, status: string) => {
    try {
      await axios.put(`${API_BASE}/api/admissions/${admissionId}/status`, { status });
      fetchData();
    } catch (err) {
      console.error('Error updating admission:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '--';
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '--';
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      confirmed: 'badge-success',
      completed: 'badge-info',
      cancelled: 'badge-danger',
      'no-show': 'badge-warning',
      pending: 'badge-warning',
      admitted: 'badge-info',
      discharged: 'badge-default'
    };
    return badges[status] || 'badge-default';
  };

  const getDeptIcon = (dept: string) => {
    if (!dept) return <Stethoscope size={16} />;
    if (dept.toLowerCase().includes('cardio') || dept.toLowerCase().includes('heart')) return <Heart size={16} />;
    if (dept.toLowerCase().includes('neuro') || dept.toLowerCase().includes('brain')) return <Brain size={16} />;
    return <Stethoscope size={16} />;
  };

  // Prepare pie chart data
  const pieData = stats ? Object.entries(stats.departments || {}).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 sidebar-gradient fixed h-screen flex flex-col text-white">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mallika</h1>
              <p className="text-xs text-cyan-100 font-medium">Hospital CRM</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'patients', icon: Users, label: 'Patients' },
            { id: 'appointments', icon: Calendar, label: 'Appointments' },
            { id: 'diagnostics', icon: TestTube, label: 'Diagnostics' },
            { id: 'admissions', icon: Bed, label: 'Admissions' },
            { id: 'omnichannel', icon: MessageSquare, label: 'Messages' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-white text-cyan-700 shadow-lg shadow-black/10 font-semibold'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
            <p className="text-xs text-cyan-100 font-semibold uppercase tracking-wider mb-3">Today's Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Appointments</span>
                <span className="font-bold">{stats?.today_appointments || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Diagnostics</span>
                <span className="font-bold">{stats?.today_diagnostics || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Pending Admissions</span>
                <span className="font-bold">{stats?.pending_admissions || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              MB
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">Dr. Mahesh Babu</p>
              <p className="text-xs text-cyan-100">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Dashboard
              </p>
              <h2 className="text-2xl font-bold text-slate-800 mt-1">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'patients' && 'Patient Directory'}
                {activeTab === 'appointments' && 'Appointment Manager'}
                {activeTab === 'diagnostics' && 'Diagnostic Bookings'}
                {activeTab === 'admissions' && 'Admission Requests'}
                {activeTab === 'omnichannel' && 'WhatsApp Messages'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search patients, appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-72"
                />
              </div>
              <button className="btn btn-ghost relative">
                <Bell size={20} />
                {(stats?.pending_admissions || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {stats?.pending_admissions}
                  </span>
                )}
              </button>
              <button onClick={fetchData} className="btn btn-secondary">
                <RefreshCcw size={16} /> Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <RefreshCcw className="animate-spin text-cyan-600 mb-4" size={48} />
              <p className="text-slate-400 font-medium">Loading dashboard...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Total Patients', value: stats?.total_patients || 0, icon: Users, color: 'cyan' },
                      { label: 'Appointments', value: stats?.total_appointments || 0, icon: Calendar, color: 'indigo' },
                      { label: 'Diagnostics', value: stats?.total_diagnostics || 0, icon: TestTube, color: 'emerald' },
                      { label: 'Admissions', value: stats?.total_admissions || 0, icon: Bed, color: 'amber' },
                      { label: "Today's Appts", value: stats?.today_appointments || 0, icon: CalendarDays, color: 'rose' },
                      { label: 'New This Week', value: stats?.new_patients_week || 0, icon: UserPlus, color: 'violet' },
                    ].map((stat, idx) => (
                      <div key={idx} className={`stat-card ${stat.color} card-hover`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className={`p-2.5 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                            <stat.icon size={20} />
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
                      </div>
                    ))}
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Weekly Trend Chart */}
                    <div className="lg:col-span-2 card p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Weekly Activity Trend</h3>
                        <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-cyan-500"></span> Appointments</span>
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-indigo-500"></span> New Patients</span>
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyData}>
                            <defs>
                              <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="appointments" stroke="#0891b2" strokeWidth={2} fill="url(#colorAppt)" />
                            <Area type="monotone" dataKey="new_patients" stroke="#6366f1" strokeWidth={2} fill="url(#colorPatients)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Department Distribution */}
                    <div className="card p-6">
                      <h3 className="font-bold text-slate-800 mb-6">Department Distribution</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4">
                        {pieData.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                              {item.name || 'Other'}
                            </span>
                            <span className="font-bold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Today's Schedule */}
                    <div className="card p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Today's Schedule</h3>
                        <span className="badge badge-info">{todayAppointments.length} appointments</span>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {todayAppointments.length > 0 ? todayAppointments.map((appt) => (
                          <div key={appt.booking_id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold">
                              {appt.time?.split(':')[0] || '--'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{appt.patient_name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-2">
                                {getDeptIcon(appt.department_name)}
                                {appt.department_name || 'General'} • {appt.doctor || 'Doctor'}
                              </p>
                            </div>
                            <span className={`badge ${getStatusBadge(appt.status)}`}>{appt.status}</span>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-slate-400">
                            <CalendarDays size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No appointments today</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="card p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Live Activity</h3>
                        <span className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Real-time
                        </span>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {liveFeed.length > 0 ? liveFeed.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className={`p-2 rounded-lg ${item.direction === 'inbound' ? 'bg-cyan-100 text-cyan-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {item.direction === 'inbound' ? <MessageCircle size={16} /> : <Send size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-800 text-sm">{item.patient_name || 'Patient'}</p>
                                <span className="text-xs text-slate-400">{formatTime(item.timestamp)}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-1">{item.message}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-slate-400">
                            <Activity size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No recent activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PATIENTS TAB */}
              {activeTab === 'patients' && (
                <motion.div
                  key="patients"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Patients Table */}
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="table-header text-left">Patient</th>
                          <th className="table-header text-left">Platform</th>
                          <th className="table-header text-left">Phone</th>
                          <th className="table-header text-left">First Contact</th>
                          <th className="table-header text-left">Last Activity</th>
                          <th className="table-header text-center">Bookings</th>
                          <th className="table-header text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.length > 0 ? patients.map((patient) => (
                          <tr key={patient.id} className="table-row">
                            <td className="table-cell">
                              <div className="flex items-center gap-3">
                                <div className="avatar bg-cyan-100 text-cyan-600">
                                  {patient.name?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{patient.name || 'Anonymous'}</p>
                                  <p className="text-xs text-slate-400">#{patient.external_id?.slice(-8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="badge badge-success">
                                {patient.platform || 'whatsapp'}
                              </span>
                            </td>
                            <td className="table-cell text-slate-600">
                              {patient.phone || patient.external_id || '--'}
                            </td>
                            <td className="table-cell text-slate-500">
                              {patient.first_touch ? formatDate(patient.first_touch) : '--'}
                            </td>
                            <td className="table-cell text-slate-500">
                              {patient.last_touch ? formatDate(patient.last_touch) : '--'}
                            </td>
                            <td className="table-cell text-center">
                              <span className="font-bold text-slate-800">
                                {(patient.total_appointments || 0) + (patient.total_diagnostics || 0) + (patient.total_admissions || 0)}
                              </span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => fetchPatientDetail(patient)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                                >
                                  <Eye size={18} />
                                </button>
                                <button className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                  <MessageCircle size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="table-cell text-center py-16">
                              <Users size={48} className="mx-auto text-slate-200 mb-4" />
                              <p className="text-slate-400 font-medium">No patients found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* APPOINTMENTS TAB */}
              {activeTab === 'appointments' && (
                <motion.div
                  key="appointments"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Filters */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {['all', 'confirmed', 'completed', 'cancelled'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setAppointmentFilter(status)}
                          className={`btn ${appointmentFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
                        <p className="text-xs text-slate-500">Confirmed</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'completed').length}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                        <X size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'cancelled').length}</p>
                        <p className="text-xs text-slate-500">Cancelled</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'no-show').length}</p>
                        <p className="text-xs text-slate-500">No-show</p>
                      </div>
                    </div>
                  </div>

                  {/* Appointments Table */}
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="table-header text-left">Booking ID</th>
                          <th className="table-header text-left">Patient</th>
                          <th className="table-header text-left">Phone</th>
                          <th className="table-header text-left">Doctor</th>
                          <th className="table-header text-left">Date & Time</th>
                          <th className="table-header text-center">Status</th>
                          <th className="table-header text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.length > 0 ? appointments.map((appt) => (
                          <tr key={appt.booking_id} className="table-row">
                            <td className="table-cell">
                              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{appt.booking_id}</span>
                            </td>
                            <td className="table-cell font-semibold text-slate-800">{appt.patient_name}</td>
                            <td className="table-cell text-slate-600">{appt.phone || '--'}</td>
                            <td className="table-cell text-slate-600">{appt.doctor || '--'}</td>
                            <td className="table-cell">
                              <div>
                                <p className="font-medium text-slate-800">{appt.date || '--'}</p>
                                <p className="text-xs text-slate-500">{appt.time || '--'}</p>
                              </div>
                            </td>
                            <td className="table-cell text-center">
                              <span className={`badge ${getStatusBadge(appt.status)}`}>{appt.status}</span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                {appt.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => updateAppointmentStatus(appt.booking_id, 'completed')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Mark Complete"
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => updateAppointmentStatus(appt.booking_id, 'cancelled')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="table-cell text-center py-16">
                              <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                              <p className="text-slate-400 font-medium">No appointments found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* DIAGNOSTICS TAB */}
              {activeTab === 'diagnostics' && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                        <TestTube size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{diagnostics.filter(d => d.status === 'confirmed').length}</p>
                        <p className="text-xs text-slate-500">Confirmed</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{diagnostics.filter(d => d.status === 'completed').length}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                        <X size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{diagnostics.filter(d => d.status === 'cancelled').length}</p>
                        <p className="text-xs text-slate-500">Cancelled</p>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostics Table */}
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="table-header text-left">Booking ID</th>
                          <th className="table-header text-left">Patient</th>
                          <th className="table-header text-left">Phone</th>
                          <th className="table-header text-left">Test Type</th>
                          <th className="table-header text-left">Date & Time</th>
                          <th className="table-header text-center">Status</th>
                          <th className="table-header text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.length > 0 ? diagnostics.map((diag) => (
                          <tr key={diag.booking_id} className="table-row">
                            <td className="table-cell">
                              <span className="font-mono text-xs bg-emerald-100 px-2 py-1 rounded">{diag.booking_id}</span>
                            </td>
                            <td className="table-cell font-semibold text-slate-800">{diag.patient_name}</td>
                            <td className="table-cell text-slate-600">{diag.phone || '--'}</td>
                            <td className="table-cell">
                              <span className="flex items-center gap-2 text-slate-600">
                                <TestTube size={16} />
                                {diag.test_type}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div>
                                <p className="font-medium text-slate-800">{diag.date || '--'}</p>
                                <p className="text-xs text-slate-500">{diag.time || '--'}</p>
                              </div>
                            </td>
                            <td className="table-cell text-center">
                              <span className={`badge ${getStatusBadge(diag.status)}`}>{diag.status}</span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                {diag.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => updateDiagnosticStatus(diag.booking_id, 'completed')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Mark Complete"
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => updateDiagnosticStatus(diag.booking_id, 'cancelled')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="table-cell text-center py-16">
                              <TestTube size={48} className="mx-auto text-slate-200 mb-4" />
                              <p className="text-slate-400 font-medium">No diagnostic bookings found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ADMISSIONS TAB */}
              {activeTab === 'admissions' && (
                <motion.div
                  key="admissions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                        <Clock size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'pending').length}</p>
                        <p className="text-xs text-slate-500">Pending</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'confirmed').length}</p>
                        <p className="text-xs text-slate-500">Confirmed</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600">
                        <Bed size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'admitted').length}</p>
                        <p className="text-xs text-slate-500">Admitted</p>
                      </div>
                    </div>
                    <div className="card p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                        <X size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{admissions.filter(a => a.status === 'cancelled').length}</p>
                        <p className="text-xs text-slate-500">Cancelled</p>
                      </div>
                    </div>
                  </div>

                  {/* Admissions Table */}
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="table-header text-left">Admission ID</th>
                          <th className="table-header text-left">Patient</th>
                          <th className="table-header text-left">Phone</th>
                          <th className="table-header text-left">Type</th>
                          <th className="table-header text-left">Age/Gender</th>
                          <th className="table-header text-left">Preferred Date</th>
                          <th className="table-header text-center">Status</th>
                          <th className="table-header text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissions.length > 0 ? admissions.map((adm) => (
                          <tr key={adm.admission_id} className="table-row">
                            <td className="table-cell">
                              <span className="font-mono text-xs bg-amber-100 px-2 py-1 rounded">{adm.admission_id}</span>
                            </td>
                            <td className="table-cell font-semibold text-slate-800">{adm.patient_name}</td>
                            <td className="table-cell text-slate-600">{adm.phone || '--'}</td>
                            <td className="table-cell">
                              <span className={`badge ${adm.admission_type === 'Emergency' ? 'badge-danger' : 'badge-info'}`}>
                                {adm.admission_type}
                              </span>
                            </td>
                            <td className="table-cell text-slate-600">
                              {adm.age ? `${adm.age} yrs` : '--'} / {adm.sex || '--'}
                            </td>
                            <td className="table-cell text-slate-600">{adm.preferred_date || '--'}</td>
                            <td className="table-cell text-center">
                              <span className={`badge ${getStatusBadge(adm.status)}`}>{adm.status}</span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                {adm.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateAdmissionStatus(adm.admission_id, 'confirmed')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Confirm"
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => updateAdmissionStatus(adm.admission_id, 'cancelled')}
                                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                )}
                                {adm.status === 'confirmed' && (
                                  <button
                                    onClick={() => updateAdmissionStatus(adm.admission_id, 'admitted')}
                                    className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                                    title="Mark Admitted"
                                  >
                                    <Bed size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={8} className="table-cell text-center py-16">
                              <Bed size={48} className="mx-auto text-slate-200 mb-4" />
                              <p className="text-slate-400 font-medium">No admission requests found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* OMNICHANNEL TAB */}
              {activeTab === 'omnichannel' && (
                <motion.div
                  key="omnichannel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]"
                >
                  {/* Conversations List */}
                  <div className="card flex flex-col">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800">Recent Conversations</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {patients.slice(0, 15).map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => fetchPatientDetail(patient)}
                          className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="avatar bg-cyan-100 text-cyan-600 relative">
                              {patient.name?.charAt(0) || 'P'}
                              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{patient.name || 'Patient'}</p>
                              <p className="text-xs text-slate-400 truncate">WhatsApp • {patient.external_id?.slice(-8)}</p>
                            </div>
                            <span className="text-xs text-slate-400">{patient.last_touch ? formatTime(patient.last_touch) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="col-span-2 card flex flex-col">
                    {selectedPatient ? (
                      <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="avatar bg-cyan-100 text-cyan-600">
                              {selectedPatient.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{selectedPatient.name || 'Patient'}</p>
                              <p className="text-xs text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                WhatsApp
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost"><Phone size={18} /></button>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                          {patientTimeline.length > 0 ? patientTimeline.slice().reverse().map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`chat-bubble ${msg.direction}`}>
                                <p>{msg.message}</p>
                                <p className={`text-xs mt-2 ${msg.direction === 'outbound' ? 'text-cyan-100' : 'text-slate-400'}`}>
                                  {formatTime(msg.timestamp)}
                                </p>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-16 text-slate-400">
                              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                              <p>No messages yet</p>
                            </div>
                          )}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-slate-100">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              placeholder="Type a message..."
                              className="input flex-1"
                            />
                            <button className="btn btn-primary">
                              <Send size={18} />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-slate-400">
                          <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
                          <p className="font-medium">Select a conversation</p>
                          <p className="text-sm">Choose a patient from the list to view messages</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Patient Detail Modal */}
      <AnimatePresence>
        {showPatientModal && selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPatientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-2xl font-bold">
                    {selectedPatient.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedPatient.name || 'Anonymous Patient'}</h2>
                    <p className="text-slate-500">{selectedPatient.phone || selectedPatient.external_id} • WhatsApp</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-4 gap-4 border-b border-slate-100">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-cyan-600">{selectedPatient.total_appointments || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Appointments</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{selectedPatient.total_diagnostics || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Diagnostics</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{selectedPatient.total_admissions || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Admissions</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-bold text-slate-700">{selectedPatient.first_touch ? formatDate(selectedPatient.first_touch) : '--'}</p>
                  <p className="text-xs text-slate-500 font-medium">First Contact</p>
                </div>
              </div>

              <div className="p-6 max-h-80 overflow-y-auto custom-scrollbar">
                <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {patientTimeline.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                      <div className={`p-2 rounded-lg ${item.direction === 'inbound' ? 'bg-cyan-100 text-cyan-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {item.direction === 'inbound' ? <MessageCircle size={14} /> : <Send size={14} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{item.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(item.timestamp)} at {formatTime(item.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
