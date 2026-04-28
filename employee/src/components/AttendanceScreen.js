import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, CheckCircle, MapPin, Calendar, Fingerprint, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS } from '../config';

const AttendanceScreen = ({ onBack }) => {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayLog, setTodayLog] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchLogs();
    return () => clearInterval(timer);
  }, [user]);

  const fetchLogs = async () => {
    const uid = user?.id || user?.empId || user?.employee_id || user?.userId;
    if (!uid) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.ATTENDANCE_LOGS(uid), {
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending
        const sortedLogs = data.sort((a, b) => new Date(b.punch_date || b.date) - new Date(a.punch_date || a.date)).reverse();
        setLogs(sortedLogs);

        // Find today's log to set check-in status
        const todayStr = new Date().toISOString().split('T')[0]; // Matches YYYY-MM-DD
        const today = sortedLogs.find(l => (l.punch_date || l.date) === todayStr);
        if (today) {
          setTodayLog(today);
          setIsCheckedIn(!!today.in_time && (!today.out_time || today.out_time === '--:--'));
        }
      }
    } catch (err) {
      console.error("Fetch Logs Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async () => {
    const uid = user?.id || user?.empId || user?.employee_id || user?.userId;
    if (!uid) return;

    const action = isCheckedIn ? 'checkout' : 'checkin';
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Authentication required. Please re-login.");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.ATTENDANCE_PUNCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ userId: uid, action, timestamp: new Date().toISOString() })
      });

      if (res.ok) {
        setIsCheckedIn(!isCheckedIn);
        fetchLogs(); // Refresh history
      } else {
        alert('Operation failed. Please try again.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', paddingBottom: '100px' },
    header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' },
    backBtn: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', cursor: 'pointer' },
    clockCard: { backgroundColor: 'white', borderRadius: '32px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', marginBottom: '25px', position: 'relative', overflow: 'hidden' },
    timeText: { fontSize: '48px', fontWeight: '1000', color: '#0B1E3F', margin: '15px 0 5px 0', letterSpacing: '-1px' },
    dateText: { fontSize: '15px', fontWeight: '700', color: '#94a3b8', marginBottom: '30px' },
    actionBtn: (active) => ({ width: '200px', height: '200px', borderRadius: '100px', border: '12px solid #f1f5f9', backgroundColor: active ? '#ef4444' : '#22c55e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', margin: '0 auto', boxShadow: active ? '0 20px 40px rgba(239, 68, 68, 0.2)' : '0 20px 40px rgba(34, 197, 94, 0.2)', transition: 'all 0.3s ease' }),
    logsCard: { backgroundColor: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #e2e8f0' },
    logItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 0', borderBottom: '1px solid #f1f5f9' },
    indicator: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color })
  };

  const formatTimeText = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    return timeStr; // Assuming HH:mm format
  };

  const calculateDuration = (inTime, outTime, workTime) => {
    if (workTime && workTime !== '00:00') return `${workTime.replace(':', 'h ')}m`;
    if (!inTime || inTime === '--:--') return '0h 0m';

    // Live duration calculation if still checked in
    const [h, m] = inTime.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0);

    const end = (!outTime || outTime === '--:--') ? new Date() : (() => {
      const [eh, em] = outTime.split(':').map(Number);
      const d = new Date(); d.setHours(eh, em, 0); return d;
    })();

    const diff = Math.floor((end - start) / 60000);
    const dh = Math.floor(diff / 60);
    const dm = diff % 60;
    return `${dh}h ${dm}m`;
  };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.backBtn} onClick={onBack}><ArrowLeft size={20} color="#64748b" /></div>
        <h1 style={{ fontSize: '24px', fontWeight: '1000', color: '#0B1E3F', margin: 0 }}>Attendance</h1>
      </header>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={s.clockCard}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: '12px' }}>
          <MapPin size={14} color="#22c55e" />
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#166534' }}>OFFICE LOCATION</span>
        </div>

        <div style={{ fontSize: '13px', fontWeight: '800', color: theme.color, letterSpacing: '2px' }}>CURRENT TIME</div>
        <div style={s.timeText}>{currentTime.toLocaleTimeString()}</div>
        <div style={s.dateText}>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={handlePunch}
          style={s.actionBtn(isCheckedIn)}
        >
          <Fingerprint size={48} />
          <span style={{ fontWeight: '1000', fontSize: '16px' }}>{isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}</span>
        </motion.div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>PUNCH IN</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>{todayLog ? formatTimeText(todayLog.in_time) : '--:--'}</div>
          </div>
          <div style={{ width: '1px', height: '30px', backgroundColor: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>DURATION</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>{calculateDuration(todayLog?.in_time, todayLog?.out_time, todayLog?.work_time)}</div>
          </div>
        </div>
      </motion.div>

      <div style={s.logsCard}>
        <h3 style={{ fontWeight: '900', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} color={theme.color} /> Recent Logs
        </h3>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Synchronizing logs...</div>
        ) : logs.length > 0 ? (
          logs.map((log, i) => (
            <div key={i} style={s.logItem}>
              <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#f8fafc' }}><Clock size={20} color="#64748b" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{new Date(log.punch_date || log.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>{calculateDuration(log.in_time, log.out_time, log.work_time)} Total Duration</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#3b82f6' }}>{formatTimeText(log.in_time)} - {formatTimeText(log.out_time)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <div style={{ 
                    fontSize: '10px', 
                    fontWeight: '900', 
                    color: (log.status === 'P' || log.status === 'PRESENT' || (log.in_time && log.in_time !== '--:--' && (!log.out_time || log.out_time === '--:--' || log.out_time === '00:00:00'))) ? '#22c55e' : '#ef4444', 
                    backgroundColor: (log.status === 'P' || log.status === 'PRESENT' || (log.in_time && log.in_time !== '--:--' && (!log.out_time || log.out_time === '--:--' || log.out_time === '00:00:00'))) ? '#f0fdf4' : '#fef2f2', 
                    padding: '2px 8px', 
                    borderRadius: '6px' 
                  }}>
                    {(log.status === 'P' || log.status === 'PRESENT' || (log.in_time && log.in_time !== '--:--' && (!log.out_time || log.out_time === '--:--' || log.out_time === '00:00:00'))) ? 'PRESENT' : 'ABSENT'}
                  </div>
                  {log.remark && <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>({log.remark})</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <Calendar size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
            <div>No attendance history found.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScreen;
