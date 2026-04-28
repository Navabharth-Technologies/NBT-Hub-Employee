import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, History, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS } from '../config';

export default function TicketScreen() {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  const sanitizeId = (id) => String(id || '').split(':')[0];

  // Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    setDepartments(['Infrastructure', 'Technical', 'HR']);
    setDepartment('Technical');
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    try {
      const sid = sanitizeId(user.id);
      const resp = await fetch(`${API_ENDPOINTS.SUPPORT_TICKETS}?userId=${sid}`);
      const data = await resp.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch tickets error:", err);
      setTickets([]);
    }
  };

  const updateTicketStatus = async (id, status) => {
    try {
      const resp = await fetch(API_ENDPOINTS.UPDATE_TICKET(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        fetchTickets();
      }
    } catch (err) { console.error("Update ticket error:", err); }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return alert("Please fill all fields");
    setLoading(true);
    try {
      const sid = sanitizeId(user.id);
      const resp = await fetch(API_ENDPOINTS.SUPPORT_TICKETS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sid,
          assignee: user?.name || user?.employee_name || user?.username || 'Unknown',
          subject,
          description,
          priority,
          department
        })
      });
      if (resp.ok) {
        setSubject('');
        setDescription('');
        fetchTickets();
        alert("Ticket submitted successfully!");
      }
    } catch (err) {
      console.error("Submit ticket error:", err);
    } finally {
      setLoading(false);
    }
  };

  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F5F6FC', padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0 auto', padding: '20px' },
    backBtn: { padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0B1E3F', marginBottom: '20px' },
    
    // FORM STYLES
    formCard: { backgroundColor: 'white', borderRadius: '40px', padding: winWidth < 768 ? '25px' : '50px', boxShadow: '0 20px 60px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', marginBottom: '40px' },
    formHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' },
    iconBox: { width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' },
    title: { fontSize: '28px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' },
    subtitle: { fontSize: '14px', color: '#64748b', fontWeight: '600' },
    
    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', display: 'block' },
    input: { width: '100%', padding: '18px 24px', borderRadius: '20px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '15px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '30px' },
    textarea: { width: '100%', padding: '24px', borderRadius: '25px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '15px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '180px', marginBottom: '30px', resize: 'none' },
    
    priorityGrid: { display: 'grid', gridTemplateColumns: isMobile() ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '15px', marginBottom: '40px' },
    priorityTab: (active) => ({
      padding: '16px',
      borderRadius: '16px',
      border: active ? 'none' : '1.5px solid #f1f5f9',
      backgroundColor: active ? '#0B1E3F' : 'white',
      color: active ? 'white' : '#0B1E3F',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }),
    
    deptGrid: { display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' },
    deptTab: (active) => ({
      padding: '12px 24px',
      borderRadius: '14px',
      border: active ? 'none' : '1.5px solid #f1f5f9',
      backgroundColor: active ? '#315A9E' : 'white',
      color: active ? 'white' : '#64748b',
      fontSize: '13px',
      fontWeight: '900',
      cursor: 'pointer',
      textTransform: 'uppercase',
      boxShadow: active ? '0 10px 20px rgba(49, 90, 158, 0.2)' : 'none',
      transition: 'all 0.2s ease'
    }),
    
    submitBtn: { width: '100%', padding: '20px', borderRadius: '20px', backgroundColor: '#0B1E3F', color: 'white', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(11, 30, 63, 0.2)', transition: 'transform 0.2s' },
    
    // LIST STYLES
    recentHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' },
    recentTitle: { fontSize: '22px', fontWeight: '900', color: '#0B1E3F' },
    ticketItem: { backgroundColor: 'white', borderRadius: '30px', padding: '24px 35px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', transition: 'all 0.3s ease' },
    tID: { fontSize: '12px', fontWeight: '800', color: '#315A9E', marginBottom: '6px' },
    tSubject: { fontSize: '16px', fontWeight: '900', color: '#0B1E3F', marginBottom: '6px' },
    tMeta: { fontSize: '13px', color: '#94a3b8', fontWeight: '600' },
    statusBadge: { padding: '8px 18px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
  };

  function isMobile() { return winWidth < 768; }

  return (
    <div style={s.container}>
      <div style={s.main}>

        {/* ────── TICKET FORM ────── */}
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.iconBox}><AlertTriangle size={28} /></div>
            <div>
              <h1 style={s.title}>Ticket Support</h1>
              <p style={s.subtitle}>Describe your issue and we'll resolve it swiftly.</p>
            </div>
          </div>

          <label style={s.label}>Department / Category</label>
          <div style={s.deptGrid}>
            {departments.map(d => (
              <button key={d} style={s.deptTab(department === d)} onClick={() => setDepartment(d)}>{d}</button>
            ))}
          </div>

          <label style={s.label}>Issue Subject</label>
          <input style={s.input} placeholder="e.g., Access Denied to HR Portal" value={subject} onChange={e => setSubject(e.target.value)} />

          <label style={s.label}>Detailed Description</label>
          <textarea style={s.textarea} placeholder="Provide as much context as possible..." value={description} onChange={e => setDescription(e.target.value)} />

          <label style={s.label}>Priority Level</label>
          <div style={s.priorityGrid}>
            {priorities.map(p => (
              <div key={p} style={s.priorityTab(priority === p)} onClick={() => setPriority(p)}>{p}</div>
            ))}
          </div>

          <button 
            style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }} 
            onClick={handleSubmit}
            onMouseOver={e=>e.currentTarget.style.transform='scale(0.99)'} 
            onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
          >
            {loading ? "Processing..." : (
               <>
                 <Send size={18} /> Submit Issue Securely
               </>
            )}
          </button>
        </div>

        {/* ────── RECENT ACTIVITY ────── */}
        <div style={s.recentHeader}>
          <History size={24} color="#315A9E" />
          <h2 style={s.recentTitle}>Your Recent Support Tickets</h2>
        </div>

        <div style={s.recentList}>
          {tickets.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '30px', color: '#94a3b8', fontWeight: '700', border: '1px solid #f1f5f9' }}>
               No recent support tickets found in your history.
            </div>
          ) : tickets.map(ticket => (
            <div key={ticket.id} style={s.ticketItem}>
              <div>
                <div style={s.tID}>#{ticket.id || ticket._id}</div>
                <div style={s.tSubject}>{ticket.subject}</div>
                <div style={{ ...s.tMeta, display: 'flex', flexDirection: isMobile() ? 'column' : 'row', alignItems: isMobile() ? 'flex-start' : 'center', gap: isMobile() ? '15px' : '30px', marginTop: '10px' }}>
                  <span style={{ color: '#315A9E', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {ticket.department || ticket.category || 'SUPPORT'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ticket.time || new Date(ticket.timestamp || Date.now()).toLocaleDateString()}
                    <span style={{ color: isMobile() ? '#315A9E' : '#cbd5e1' }}>{isMobile() ? '—' : '|'}</span>
                    {ticket.priority}
                  </span>
                  {ticket.action && (
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', marginRight: '4px' }}>ACTION:</span> {ticket.action}
                    </span>
                  )}
                  {ticket.verify && (
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', marginRight: '4px' }}>VERIFY:</span> {ticket.verify}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ 
                  ...s.statusBadge, 
                  backgroundColor: ticket.status === 'RESOLVED' ? '#f0fdf4' : '#fffbeb',
                  color: ticket.status === 'RESOLVED' ? '#16a34a' : '#d97706'
                }}>
                  {ticket.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
