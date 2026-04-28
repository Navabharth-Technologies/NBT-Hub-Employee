import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  RefreshCw, 
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, TEAM_OFFICE_AUTH_TOKEN } from '../config';
import Header from './Header';

export default function EmployeeAttendanceDetail({ employeeId, onBack }) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = employeeId || paramId || user?.Empcode;
  
  const [employee, setEmployee] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, [id, user, startDate, endDate]);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      const userRes = await fetch(API_ENDPOINTS.EMPLOYEES || API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const users = await userRes.json();
      const validUsers = Array.isArray(users) ? users : (users?.data || []);
      const found = validUsers.find(u => String(u.id) === String(id) || String(u.Empcode) === String(id));
      setEmployee(found);

      const queryParams = new URLSearchParams({ 
        startDate, 
        endDate,
        userId: id,
        limit: 1000 
      });
      const logsRes = await fetch(`${API_ENDPOINTS.ATTENDANCE_LOGS_GET}?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${TEAM_OFFICE_AUTH_TOKEN}` }
      });
      const result = await logsRes.json();
      const allLogs = result.data || result.attendance || result.logs || (Array.isArray(result) ? result : []);
      
      const filtered = allLogs.filter(l => {
        if (!l) return false;
        const targetId = String(id).trim();
        const lId = String(l.Empcode || l.userId || l.user_id || '').trim();
        return lId === targetId || (l.EmployeeName && (found?.name || user?.name) && l.EmployeeName.includes(found?.name || user?.name));
      });

      const grouped = {};
      filtered.forEach(l => {
        const d = String(l.punch_date || l.date || '').split('T')[0].split(' ')[0];
        if (!d) return;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(l);
      });

      const processed = Object.keys(grouped).map(date => {
        const dayPunches = grouped[date].sort((a,b) => String(a.in_time || '00:00').localeCompare(String(b.in_time || '00:00')));
        const first = dayPunches[0];
        const last = dayPunches[dayPunches.length - 1];
        const inTime = first.in_time || '----';
        const outTime = dayPunches.length > 1 ? (last.out_time || last.in_time || '----') : (first.out_time || '----');
        
        return {
          ...first,
          date,
          punch_in: inTime,
          punch_out: outTime,
          work_hrs: calculateWorkHours(inTime, outTime)
        };
      }).sort((a,b) => b.date.localeCompare(a.date));

      setLogs(processed);
    } catch (err) {
      setError("Sync failed.");
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkHours = (inT, outT) => {
    if (!inT || !outT || inT === '----' || outT === '----') return '00:00';
    try {
      const [h1, m1] = inT.split(':').map(Number);
      const [h2, m2] = outT.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff <= 0) return '00:00';
      return `${Math.floor(diff/60).toString().padStart(2,'0')}:${(diff%60).toString().padStart(2,'0')}`;
    } catch(e) { return '00:00'; }
  };

  const styles = {
    container: { backgroundColor: '#F0F4F8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
    main: { padding: winWidth < 768 ? '20px' : '40px', maxWidth: '1400px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    profileSection: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1e293b' },
    empName: { fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: 0 },
    empMeta: { fontSize: '11px', color: '#64748B', fontWeight: '700', marginTop: '2px' },
    statsRow: { display: 'flex', gap: '16px', marginBottom: '32px' },
    statBox: { background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' },
    statLabel: { fontSize: '9px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '13px', fontWeight: '900', color: '#0F172A' },
    tableCard: { background: 'white', borderRadius: '24px', border: '1.5px solid #F1F5F9', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '20px 24px', fontSize: '10px', fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #F1F5F9' },
    td: { padding: '18px 24px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    statusBadge: (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', background: bg, color, fontSize: '10px', fontWeight: '900' }),
    statusDot: (bg) => ({ width: '5px', height: '5px', borderRadius: '50%', background: bg })
  };

  return (
    <div style={styles.container}>
      <Header setActiveTab={onBack ? () => onBack() : undefined} />
      <main style={styles.main}>
        <div style={styles.header}>
          <div style={styles.profileSection}>
            <button style={styles.backBtn} onClick={onBack}><ArrowLeft size={16} /></button>
            <div>
              <h1 style={styles.empName}>{employee?.name || user?.name || 'Anish V N'} Dashboard</h1>
              <p style={styles.empMeta}>ID: {id} • Biometric Syncing: <span style={{color:'#10B981'}}>Operational</span></p>
            </div>
          </div>
          
          <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
            <div style={{display:'flex', background:'white', borderRadius:'10px', border:'1px solid #E2E8F0', padding:'2px 8px'}}>
               <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{border:'none', fontSize:'11px', fontWeight:'700', padding:'8px'}} />
               <span style={{margin:'auto 4px', color:'#CBD5E1', fontSize:'10px'}}>to</span>
               <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{border:'none', fontSize:'11px', fontWeight:'700', padding:'8px'}} />
            </div>
            <button style={{background:'#0F172A', color:'white', border:'none', padding:'10px 20px', borderRadius:'10px', fontWeight:'800', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <FileText size={16} color="#10B981" />
            <div>
              <div style={styles.statLabel}>TOTAL LOGS</div>
              <div style={styles.statValue}>{logs.length}</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <ShieldCheck size={16} color="#3B82F6" />
            <div>
              <div style={styles.statLabel}>POWERED BY</div>
              <div style={styles.statValue}>Biometric API</div>
            </div>
          </div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>EMPLOYEE</th>
                <th style={styles.th}>DATE</th>
                <th style={styles.th}>PUNCH IN</th>
                <th style={styles.th}>PUNCH OUT</th>
                <th style={styles.th}>WORK HRS</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>PUNCH IN LOCATION</th>
                <th style={styles.th}>PUNCH OUT LOCATION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{padding:'60px', textAlign:'center', color:'#94A3B8'}}>Syncing biometric records...</td></tr>
              ) : logs.map((log, i) => {
                const isAbsent = log.punch_in === '----';
                const d = new Date(log.date);
                const isSunday = d.getDay() === 0;
                let status = isAbsent ? (isSunday ? 'WO' : 'A') : 'P';
                const color = status === 'P' ? '#10B981' : (status === 'WO' ? '#3B82F6' : '#EF4444');
                const bg = status === 'P' ? '#F0FDF4' : (status === 'WO' ? '#EFF6FF' : '#FEF2F2');

                return (
                  <tr key={i}>
                    <td style={styles.td}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <div style={{width:'28px', height:'28px', borderRadius:'6px', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#475569'}}>
                          {String(employee?.name || user?.name || 'A').charAt(0)}
                        </div>
                        <div>
                          <div style={{fontWeight:'900', color:'#0F172A', fontSize:'13px'}}>{employee?.name || user?.name || 'Anish V N'}</div>
                          <div style={{fontSize:'10px', color:'#94A3B8'}}>ID: {id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <Calendar size={13} color="#CBD5E1" />
                        {log.date}
                      </div>
                    </td>
                    <td style={{...styles.td, color:'#3B82F6', fontWeight:'700'}}>{log.punch_in}</td>
                    <td style={styles.td}>{log.punch_out}</td>
                    <td style={{...styles.td, fontWeight:'900', color:'#0F172A'}}>{log.work_hrs} <span style={{fontSize:'9px', color:'#94A3B8'}}>HOURS</span></td>
                    <td style={styles.td}>
                      <div style={styles.statusBadge(bg, color)}>
                        <div style={styles.statusDot(color)}></div>
                        {status}
                      </div>
                    </td>
                    <td style={{...styles.td, color:'#94A3B8', fontSize:'11px'}}>----</td>
                    <td style={{...styles.td, color:'#94A3B8', fontSize:'11px'}}>----</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
