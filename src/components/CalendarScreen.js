import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS } from '../config';
import BackButton from './BackButton';

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
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const resp = await fetch(API_ENDPOINTS.HOLIDAYS, { headers }).catch(() => null);

      let data = [];
      if (resp && resp.ok) {
        data = await resp.json();
      } else {
        console.warn("Holiday API unreachable or returned an error. No data loaded.");
      }

      const holidayList = Array.isArray(data) ? data : (data?.value || data?.data || []);
      const sorted = holidayList.sort((a, b) => new Date(a.date) - new Date(b.date));
      setHolidays(sorted);
    } catch (err) {
      console.error("Holiday Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPassed = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateStr);
    return holidayDate < today;
  };

  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  const s = {
    container: {
      padding: isMobile ? '15px 15px' : '20px 40px',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    headerCard: {
      backgroundColor: 'white',
      borderRadius: '45px',
      padding: isMobile ? '20px' : '30px 40px',
      textAlign: 'left',
      boxShadow: '0 20px 60px rgba(0,0,0,0.02)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'left',
      gap: '8px',
      position: 'relative'
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
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '1000',
      color: '#0B1E3F',
      marginBottom: '2px'
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
      gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr 1fr' : '1fr 1fr 1fr'),
      gap: '20px',
      paddingBottom: '100px'
    },
    holidayCard: (passed) => ({
      backgroundColor: passed ? 'rgba(255, 255, 255, 0.7)' : '#ffffff',
      borderRadius: '28px',
      padding: isMobile ? '18px' : '24px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '15px' : '20px',
      border: passed ? '1px solid #f1f5f9' : '2px solid #10b981',
      boxShadow: passed ? '0 4px 12px rgba(0,0,0,0.02)' : '0 10px 30px rgba(16, 185, 129, 0.1)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: passed ? 0.7 : 1
    }),
    dateBox: {
      minWidth: isMobile ? '65px' : '75px',
      height: isMobile ? '65px' : '75px',
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #f1f5f9'
    },
    month: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    day: { fontSize: isMobile ? '20px' : '26px', fontWeight: '900', color: '#0B1E3F', lineHeight: '1' },
    info: { flex: 1, paddingRight: '40px' },
    holidayName: { fontSize: isMobile ? '14px' : '16px', fontWeight: '800', color: '#0B1E3F', lineHeight: '1.4', letterSpacing: '-0.3px' },
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
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={s.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
          <BackButton onClick={onBack} />
          <div>
            <h1 style={{ ...s.title, margin: 0 }}>NBT Calendar</h1>
            <div style={s.subtitle}>OFFICIAL CORPORATE HOLIDAYS 2026</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Fetching Calendar Data...</div>
        ) : (
          <div style={{ ...s.grid, width: '100%', marginTop: '20px' }}>
            {holidays.map((h, i) => {
              const date = new Date(h.date);
              if (isNaN(date.getTime())) return null; // Skip invalid dates
              const passed = isPassed(h.date);
              return (
                <motion.div
                  key={h.id || i}
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
                    <div style={s.dayOfWeek}>{date.toLocaleString('default', { weekday: 'long' }).replace(/Wednesdayy/g, 'Wednesday').replace(/\bWednesda\b/g, 'Wednesday')}</div>
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
