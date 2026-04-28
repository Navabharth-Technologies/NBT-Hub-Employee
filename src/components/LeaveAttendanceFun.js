import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Plane, PartyPopper, 
  ChevronRight, ArrowLeft, CheckCircle2, 
  AlertCircle, Star, Music, Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';

const LeaveAttendanceFun = ({ onBack }) => {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const [activeView, setActiveView] = useState('MAIN'); // MAIN, LEAVE, ATTENDANCE, FUN

  // Styles
  const s = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px',
      paddingBottom: '100px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '25px'
    },
    backBtn: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #e2e8f0',
      cursor: 'pointer'
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px'
    },
    actionCard: (color) => ({
      backgroundColor: 'white',
      borderRadius: '24px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }),
    iconBox: (color) => ({
      width: '50px',
      height: '50px',
      borderRadius: '16px',
      backgroundColor: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color
    })
  };

  const renderMain = () => (
    <div style={s.cardGrid}>
      <motion.div 
        whileHover={{ y: -5 }}
        onClick={() => setActiveView('LEAVE')}
        style={s.actionCard('#ef4444')}
      >
        <div style={s.iconBox('#ef4444')}><Calendar size={24} /></div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Leave Management</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>Apply for time off or check status</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '20px', fontWeight: '700' }}>12 Annual Left</span>
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ y: -5 }}
        onClick={() => setActiveView('ATTENDANCE')}
        style={s.actionCard('#3b82f6')}
      >
        <div style={s.iconBox('#3b82f6')}><Clock size={24} /></div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Attendance Tracking</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>Check-in/out and log hours</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '20px', fontWeight: '700' }}>Checked-In 09:00 AM</span>
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ y: -5 }}
        onClick={() => setActiveView('FUN')}
        style={s.actionCard('#f59e0b')}
      >
        <div style={s.iconBox('#f59e0b')}><PartyPopper size={24} /></div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Fun Zone</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>Games, events, and relaxation</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#fffbe3', color: '#d97706', borderRadius: '20px', fontWeight: '700' }}>New Quiz Available</span>
        </div>
      </motion.div>
    </div>
  );

  const renderLeave = () => (
    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ fontWeight: '800', marginBottom: '20px' }}>Apply for Leave</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>Leave Type</label>
          <select style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', marginTop: '5px' }}>
            <option>Annual Leave</option>
            <option>Sick Leave</option>
            <option>Emergency Leave</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>Start Date</label>
            <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>End Date</label>
            <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
          </div>
        </div>
        <button style={{ backgroundColor: theme.color, color: 'white', padding: '14px', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}>Submit Application</button>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #e2e8f0' }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Clock size={48} color={theme.color} style={{ opacity: 0.8 }} />
        <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', marginTop: '15px' }}>11:45 AM</h2>
        <p style={{ color: '#64748b', fontWeight: '700' }}>Tuesday, April 7th</p>
        <button style={{ backgroundColor: '#ef4444', color: 'white', padding: '18px 40px', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '16px', marginTop: '20px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.2)' }}>CHECK OUT</button>
      </div>
      <div style={{ marginTop: '30px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0B1E3F', marginBottom: '15px' }}>Log History</h4>
        {[1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>April {7-i}, 2026</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#3b82f6' }}>09:02 AM - 06:05 PM</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFun = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ backgroundColor: '#fffbe3', borderRadius: '24px', padding: '24px', border: '1.2px dashed #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '15px', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Trophy size={24} /></div>
          <div>
            <h4 style={{ margin: 0, fontWeight: '900' }}>Weekly Leaderboard</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#d97706', fontWeight: '700' }}>Top performers this week</p>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <Music size={32} color="#8b5cf6" />
          <h4 style={{ marginTop: '10px', fontSize: '14px' }}>Office Playlist</h4>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <Star size={32} color="#ec4899" />
          <h4 style={{ marginTop: '10px', fontSize: '14px' }}>Peer Kudos</h4>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.backBtn} onClick={activeView === 'MAIN' ? onBack : () => setActiveView('MAIN')}>
          <ArrowLeft size={20} color="#64748b" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '1000', color: '#0B1E3F', margin: 0 }}>
          {activeView === 'MAIN' ? 'Hub Services' : activeView}
        </h1>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {activeView === 'MAIN' && renderMain()}
          {activeView === 'LEAVE' && renderLeave()}
          {activeView === 'ATTENDANCE' && renderAttendance()}
          {activeView === 'FUN' && renderFun()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LeaveAttendanceFun;
