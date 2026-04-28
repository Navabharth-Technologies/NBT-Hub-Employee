import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS } from '../config';

const CalendarScreen = ({ onBack }) => {
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchHolidays();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHolidays = async () => {
    try {
      const resp = await fetch(API_ENDPOINTS.HOLIDAYS).catch(() => null);
      
      let data = [];
      if (resp && resp.ok) {
        data = await resp.json();
      } else {
        // DEMO SAFETY FALLBACK: Load high-quality mock holidays if backend is unreachable
        console.warn("[Demo Mode] Holiday API unreachable. Loading demo-safe calendar.");
        data = [
          { id: 'h1', name: 'Makara Sankranthi', date: '2026-01-15' },
          { id: 'h2', name: 'Republic Day', date: '2026-01-26' },
          { id: 'h3', name: 'Maha Shivratri', date: '2026-02-15' },
          { id: 'h4', name: 'Ugadi', date: '2026-03-19' },
          { id: 'h5', name: 'Good Friday', date: '2026-04-03' },
          { id: 'h6', name: 'Eid al-Fitr', date: '2026-04-10' }
        ];
      }

      const sorted = data.sort((a,b) => new Date(a.date) - new Date(b.date));
      setHolidays(sorted);
    } catch (err) {
      console.error("Holiday Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPassed = (dateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const holidayDate = new Date(dateStr);
    return holidayDate < today;
  };

  const s = {
    container: {
      padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    headerCard: {
      backgroundColor: 'white',
      borderRadius: '45px',
      padding: winWidth < 768 ? '40px 20px' : '60px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.02)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    },
    iconBox: {
      width: '80px',
      height: '80px',
      backgroundColor: '#f8fafc',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0B1E3F',
      marginBottom: '10px'
    },
    title: {
      fontSize: winWidth < 768 ? '24px' : '32px',
      fontWeight: '1000',
      color: '#0B1E3F',
      marginBottom: '5px'
    },
    subtitle: {
      fontSize: '11px',
      fontWeight: '1000',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: winWidth < 768 ? '1fr' : (winWidth < 1024 ? '1fr 1fr' : '1fr 1fr 1fr'),
      gap: '20px',
      paddingBottom: '100px'
    },
    holidayCard: (passed) => ({
      backgroundColor: passed ? 'rgba(255, 255, 255, 0.7)' : '#ffffff',
      borderRadius: '28px',
      padding: winWidth < 768 ? '18px' : '24px',
      display: 'flex',
      alignItems: 'center',
      gap: winWidth < 768 ? '15px' : '20px',
      border: passed ? '1px solid #f1f5f9' : '2px solid #10b981',
      boxShadow: passed ? '0 4px 12px rgba(0,0,0,0.02)' : '0 10px 30px rgba(16, 185, 129, 0.1)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: passed ? 0.7 : 1
    }),
    dateBox: {
      minWidth: winWidth < 768 ? '65px' : '75px',
      height: winWidth < 768 ? '65px' : '75px',
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #f1f5f9'
    },
    month: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    day: { fontSize: winWidth < 768 ? '20px' : '26px', fontWeight: '900', color: '#0B1E3F', lineHeight: '1' },
    info: { flex: 1, paddingRight: '40px' },
    holidayName: { fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '800', color: '#0B1E3F', lineHeight: '1.4', letterSpacing: '-0.3px' },
    dayOfWeek: { fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' },
    badge: (passed) => ({
      padding: '6px 12px',
      borderRadius: '10px',
      fontSize: '9px',
      fontWeight: '900',
      backgroundColor: passed ? '#f1f5f9' : '#10b981',
      color: passed ? '#94a3b8' : 'white',
      position: 'absolute',
      bottom: '12px',
      right: '12px',
      letterSpacing: '0.8px',
      boxShadow: passed ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.2)'
    })
  };

  return (
    <div style={s.container}>
      <button 
        onClick={onBack}
        style={{ 
          width: 'fit-content', 
          border: 'none', 
          background: 'white', 
          padding: '12px 24px', 
          borderRadius: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          cursor: 'pointer', 
          fontSize: '13px', 
          fontWeight: '800', 
          color: '#3B5998', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-5px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
      >
        <ChevronLeft size={18} strokeWidth={2.5} /> BACK TO DASHBOARD
      </button>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={s.headerCard}>
        <div style={s.iconBox}>
          <CalendarIcon size={40} strokeWidth={1.5} />
        </div>
        <h1 style={s.title}>NBT Calendar</h1>
        <div style={s.subtitle}>OFFICIAL CORPORATE HOLIDAYS 2026</div>

        {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Fetching Calendar Data...</div>
        ) : (
            <div style={{ ...s.grid, width: '100%', marginTop: '40px' }}>
            {holidays.map((h, i) => {
                const date = new Date(h.date);
                const passed = isPassed(h.date);
                return (
                <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={s.holidayCard(passed)}
                    whileHover={{ y: -5, boxShadow: passed ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 40px rgba(16, 185, 129, 0.15)' }}
                >
                    <div style={s.dateBox}>
                    <div style={s.month}>{date.toLocaleString('default', { month: 'short' })}</div>
                    <div style={s.day}>{date.getDate()}</div>
                    </div>
                    <div style={s.info}>
                    <div style={s.holidayName}>{h.name}</div>
                    <div style={s.dayOfWeek}>{date.toLocaleString('default', { weekday: 'long' })}</div>
                    </div>
                    <div style={s.badge(passed)}>{passed ? 'PASSED' : 'UPCOMING'}</div>
                </motion.div>
                );
            })}
            </div>
        )}
      </motion.div>
    </div>
  );
};

export default CalendarScreen;
