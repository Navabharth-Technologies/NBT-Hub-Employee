import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lightbulb, ClipboardList, Calendar, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS } from '../config';

const parseSafeDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/.]/);
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      if (!isNaN(d.getTime())) return d;
    }
    let s = dateStr.replace(/[Zz]$/, '').replace(/[\+\-]\d{2}:\d{2}$/, '');
    if (!s.includes('T') && s.includes('-')) s = s.replace(' ', 'T');
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateStr) => {
  const d = parseSafeDate(dateStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const cleanId = (id) => String(id || '').split(':')[0];

export default function SaturdaySuggestionsScreen({ onBack }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;

  useEffect(() => {
    fetchSuggestions();
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Authorization': `Bearer ${cleanToken}` };
      const res = await fetch(API_ENDPOINTS.SUGGESTIONS, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);

        // Deduplicate by employee_id + date
        const unique = [];
        const seen = new Set();
        const sorted = list
          .filter(Boolean)
          .sort((a, b) => new Date(b?.created_at || b?.timestamp || b?.date || b?.createdAt) - new Date(a?.created_at || a?.timestamp || a?.date || a?.createdAt));

        sorted.forEach(sug => {
          if (!sug) return;
          const d = parseSafeDate(sug.created_at || sug.timestamp || sug.date || sug.createdAt);
          const dateKey = d ? d.toISOString().split('T')[0] : 'no-date';
          const userKey = cleanId(sug.employee_id || sug.employee_name || 'anon');
          const key = `${userKey}_${dateKey}`;
          if (!seen.has(key)) { unique.push(sug); seen.add(key); }
        });

        setSuggestions(unique);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
    setLoading(false);
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    padding: isMobile ? '20px 16px 40px' : '40px 32px 60px',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: isMobile ? '24px' : '36px',
  };

  const backBtnStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    backgroundColor: 'white',
    border: '1.5px solid #e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    outline: 'none',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  };

  const titleBlockStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const iconWrapStyle = {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const countBadgeStyle = {
    fontSize: '11px',
    fontWeight: '800',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '20px',
    padding: '3px 10px',
    marginLeft: '4px',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .sug-back-btn:hover { transform: translateX(-4px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; }
        .sug-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(251, 191, 36, 0.12) !important; }
      `}</style>

      {/* Header */}
      <div style={headerStyle}>
        <button
          className="sug-back-btn"
          onClick={onBack}
          style={backBtnStyle}
        >
          <ArrowLeft size={20} color="#0B1E3F" strokeWidth={2.5} />
        </button>

        <div style={titleBlockStyle}>
          <div style={iconWrapStyle}>
            <Lightbulb size={22} color="#b45309" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F' }}>
                Saturday Suggestions
              </span>
              {!loading && suggestions.length > 0 && (
                <span style={countBadgeStyle}>{suggestions.length}</span>
              )}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginTop: '5px' }}>
              Requirements &amp; Improvement ideas
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: '110px', borderRadius: '24px', backgroundColor: '#f1f5f9',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 1 - i * 0.1
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
        </div>
      ) : suggestions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center', padding: '80px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}
        >
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
          }}>
            <Inbox size={36} color="#b45309" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>No suggestions yet</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', maxWidth: '260px', lineHeight: '1.6' }}>
            Suggestions submitted on Saturdays will appear here.
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', width: '100%' }}>
          {suggestions.map((sug, i) => {
            const hasReq = !!(sug?.requirement?.trim());
            const hasSug = !!(sug?.suggestion?.trim());

            return (
              <motion.div
                key={i}
                className="sug-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                }}
              >
                {/* Card Top Bar */}
                <div style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  width: '100%',
                }} />

                <div style={{ padding: isMobile ? '18px 18px 20px' : '22px 28px 24px' }}>
                  {/* Card Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '16px',
                    flexWrap: 'wrap', gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '14px', fontWeight: '800', color: '#0B1E3F'
                    }}>
                      <span style={{ color: '#0B1E3F' }}>{sug?.employee_name || 'Anonymous'}</span>
                    </div>

                    {(sug?.created_at || sug?.timestamp || sug?.date || sug?.createdAt) && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '14px', fontWeight: '800', color: '#64748b'
                      }}>
                        <Calendar size={14} color="#64748b" style={{ flexShrink: 0 }} />
                        <strong>{formatDate(sug.created_at || sug.timestamp || sug.date || sug.createdAt)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', marginBottom: '16px' }} />

                  {/* Content blocks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hasReq && (
                      <div style={{
                        padding: '14px 18px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '16px',
                        border: '1px solid #dbeafe',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          marginBottom: '7px',
                        }}>
                          <ClipboardList size={14} color="#3b82f6" />
                          <span style={{ fontSize: '11px', fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Requirement
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a', lineHeight: '1.65' }}>
                          {sug.requirement}
                        </div>
                      </div>
                    )}

                    {hasSug && (
                      <div style={{
                        padding: '14px 18px',
                        backgroundColor: '#fffbeb',
                        borderRadius: '16px',
                        border: '1px solid #fde68a',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          marginBottom: '7px',
                        }}>
                          <Lightbulb size={14} color="#f59e0b" />
                          <span style={{ fontSize: '11px', fontWeight: '900', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Suggestion
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#78350f', lineHeight: '1.65' }}>
                          {sug.suggestion}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
