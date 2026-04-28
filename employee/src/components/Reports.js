import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { 
  CheckCircle2, TrendingUp, Edit3, Save, X, 
  History, Calendar, Clock, Target, ArrowRight 
} from 'lucide-react';

const Reports = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayStatus, setTodayStatus] = useState('Pending');
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState([]);
  const [editStatus, setEditStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchTaskHistory();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTaskHistory = async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.TASK_UPDATES_USER(uid));
      if (res.ok) {
        const data = await res.json();
        const history = Array.isArray(data) ? data : (data.data || []);
        
        const todayStr = new Date().toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

        const today = history.find(h => new Date(h.timestamp).toDateString() === todayStr);
        const yesterday = history.find(h => new Date(h.timestamp).toDateString() === yesterdayStr);

        if (today) {
          setTodayTasks(today.tasks || []);
          setTodayStatus(today.overallStatus || 'Pending');
        }
        if (yesterday) {
          setYesterdayTasks(yesterday.tasks || []);
        }
      }
    } catch (err) {
      console.error("Report Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditBuffer(todayTasks.map(t => typeof t === 'string' ? { id: Date.now()+Math.random(), text: t } : { ...t }));
    setEditStatus(todayStatus);
    setIsEditing(true);
  };

  const saveReport = async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    try {
      const res = await fetch(API_ENDPOINTS.TASK_UPDATES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          userName: user?.name,
          tasks: editBuffer.map(t => typeof t === 'string' ? t : t.text).filter(Boolean),
          overallStatus: editStatus,
          timestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        const result = await res.json();
        const savedTask = result.task || { tasks: editBuffer, overallStatus: editStatus };
        setTodayTasks(savedTask.tasks || editBuffer);
        setTodayStatus(savedTask.overallStatus || editStatus);
        setIsEditing(false);
        setToast('Daily report synchronized successfully!');
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      alert("Network Error: Failed to save report.");
    }
  };

  const s = {
    container: {
      padding: winWidth < 768 ? '15px' : '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      marginBottom: '40px',
      display: 'flex',
      flexDirection: winWidth < 768 ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: winWidth < 768 ? 'flex-start' : 'center',
      gap: '20px'
    },
    title: { fontSize: '32px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    subtitle: { fontSize: '14px', color: '#64748b', fontWeight: '600', marginTop: '4px' },
    card: {
      backgroundColor: 'white',
      borderRadius: '35px',
      padding: winWidth < 768 ? '25px' : '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.03)',
      border: '1.5px solid #f1f5f9',
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '800',
      color: '#0B1E3F',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '25px'
    },
    input: {
      width: '100%',
      padding: '18px',
      borderRadius: '15px',
      border: '1.5px solid #e2e8f0',
      fontSize: '14px',
      fontWeight: '700',
      outline: 'none',
      marginBottom: '15px'
    },
    btnPrimary: {
      padding: '15px 30px',
      backgroundColor: '#3B5998',
      color: 'white',
      borderRadius: '15px',
      fontSize: '14px',
      fontWeight: '900',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 10px 25px rgba(59, 89, 152, 0.2)'
    },
    btnSecondary: {
      padding: '15px 30px',
      backgroundColor: '#f1f5f9',
      color: '#64748b',
      borderRadius: '15px',
      fontSize: '14px',
      fontWeight: '900',
      border: 'none',
      cursor: 'pointer'
    }
  };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Daily Reports</h1>
          <div style={s.subtitle}>Centralized workforce logs and performance tracking</div>
        </div>
        {!isEditing ? (
          <button style={s.btnPrimary} onClick={startEditing}>
            <Edit3 size={18} /> UPDATE TODAY'S LOG
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ ...s.btnPrimary, backgroundColor: '#16a34a' }} onClick={saveReport}>
              <Save size={18} /> SUBMIT LOG
            </button>
            <button style={s.btnSecondary} onClick={() => setIsEditing(false)}>
              <X size={18} /> CANCEL
            </button>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? '1fr' : '1.5fr 1fr', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Today's Log Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={s.card}>
            <div style={s.sectionTitle}>
              <TrendingUp size={22} color="#3B5998" />
              TODAY'S MISSION LOG
              <div style={{ marginLeft: 'auto', backgroundColor: '#eff6ff', color: '#3B5998', padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '1000' }}>
                {String(todayStatus || '').toUpperCase()}
              </div>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {editBuffer.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      style={s.input} 
                      value={t.text} 
                      onChange={(e) => {
                        const newB = [...editBuffer];
                        newB[i].text = e.target.value;
                        setEditBuffer(newB);
                      }}
                    />
                    <button 
                      onClick={() => setEditBuffer(editBuffer.filter((_, idx) => idx !== i))}
                      style={{ height: '55px', width: '55px', borderRadius: '15px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setEditBuffer([...editBuffer, { text: '', id: Date.now() }])}
                  style={{ ...s.btnSecondary, background: '#f8fafc', border: '1.5px dashed #cbd5e1' }}
                >
                  + ADD ADDITIONAL TASK
                </button>
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '10px', display: 'block' }}>OVERALL STATUS</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Pending', 'In Progress', 'Completed'].map(st => (
                      <button 
                        key={st}
                        onClick={() => setEditStatus(st)}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid', borderColor: editStatus === st ? '#3B5998' : '#e2e8f0', backgroundColor: editStatus === st ? '#3B5998' : 'white', color: editStatus === st ? 'white' : '#64748b', fontWeight: '800', cursor: 'pointer' }}
                      >
                        {st.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {todayTasks.length > 0 ? todayTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '18px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1.5px solid #f1f5f9' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FDB913' }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{typeof t === 'string' ? t : (t.text || '')}</span>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>No tasks logged for today yet.</div>
                )}
                
                {/* Manager Review (Oversight Feedback) */}
                {(todayTasks.length > 0 && (todayTasks[0].task_review || todayTasks[0].review || todayTasks[0].feedback)) && (
                   <div style={{ marginTop: '20px', padding: '20px', borderRadius: '20px', backgroundColor: '#f0fdfa', border: '1.5px solid #ccfbf1' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                       <Target size={18} color="#0d9488" />
                       <span style={{ fontSize: '12px', fontWeight: '900', color: '#0d9488', textTransform: 'uppercase' }}>Oversight Feedback</span>
                     </div>
                     <p style={{ fontSize: '14px', fontWeight: '700', color: '#134e4a', margin: 0, lineHeight: '1.6' }}>
                       {todayTasks[0].task_review || todayTasks[0].review || todayTasks[0].feedback}
                     </p>
                   </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Yesterday's Recap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...s.card, backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
            <div style={{ ...s.sectionTitle, color: '#16a34a' }}>
              <CheckCircle2 size={22} />
              YESTERDAY'S ACCOMPLISHMENTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {yesterdayTasks.length > 0 ? yesterdayTasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#166534', fontWeight: '700', fontSize: '14px' }}>
                  <ArrowRight size={14} /> {typeof t === 'string' ? t : (t.text || '')}
                </div>
              )) : (
                <div style={{ color: '#166534', opacity: 0.6, fontStyle: 'italic' }}>No record found for yesterday.</div>
              )}
            </div>
          </motion.div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Performance Summary Card */}
          <div style={s.card}>
            <div style={s.sectionTitle}><History size={22} color="#3B5998" /> WORK SUMMARY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>TOTAL TASKS TODAY</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>{todayTasks.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>PROJECT UPTIME</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>{todayStatus === 'Completed' ? '100%' : todayTasks.length > 0 ? 'Normal' : 'Idle'}</span>
              </div>
              <div style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: '20px', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '15px' }}>OVERSIGHT SNAPSHOT</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '10px', backgroundColor: '#e2e8f0' }}><div style={{ width: '70%', height: '100%', borderRadius: '10px', backgroundColor: '#FDB913' }} /></div>
                  <div style={{ flex: 1, height: '6px', borderRadius: '10px', backgroundColor: '#e2e8f0' }}><div style={{ width: '40%', height: '100%', borderRadius: '10px', backgroundColor: '#3B5998' }} /></div>
                  <div style={{ flex: 1, height: '6px', borderRadius: '10px', backgroundColor: '#e2e8f0' }}><div style={{ width: '90%', height: '100%', borderRadius: '10px', backgroundColor: '#16a34a' }} /></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...s.card, background: 'linear-gradient(135deg, #1e293b 0%, #0B1E3F 100%)', border: 'none', color: 'white' }}>
            <Calendar size={32} style={{ marginBottom: '15px', opacity: 0.8 }} />
            <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '10px' }}>Focus Logs</div>
            <p style={{ fontSize: '13px', opacity: 0.7, lineHeight: '1.5', margin: 0 }}>Review your deep-work sessions and categorical time tracking analysis.</p>
            <button 
              onClick={() => setActiveTab('FOCUS_LOGS')}
              style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontWeight: '800', cursor: 'pointer' }}
            >
              GO TO FOCUS ANALYTICS
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#16a34a', color: 'white', padding: '12px 30px', borderRadius: '15px', fontWeight: '900', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
