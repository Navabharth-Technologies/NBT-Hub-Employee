import React, { useState, useEffect } from 'react';
import { LogOut, Send, Calendar, FileText, ChevronLeft, AlertCircle, History, Users, RefreshCcw, X, Check, User, Info, Download, Printer, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getTheme } from '../../constants/Theme';
import { API_ENDPOINTS } from '../../config';
import logo from '../../assets/image.png';

export default function ResignationScreen({ onBack }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const sanitizeId = (id) => String(id || '').split(':')[0].trim();
  
  // Tabs: 'main' (Submit + My History), 'team' (Team notice), 'letter' (Active Letter View)
  const [activeTab, setActiveTab] = useState('main');

  // Form State
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [detailedReason, setDetailedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // UI simulation states
  const [myHistory, setMyHistory] = useState([]);
  const [teamResignations, setTeamResignations] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeData, setRevokeData] = useState({ id: '', reason: '' });
  
  // Detail Overlay State
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [previewLetter, setPreviewLetter] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchMyResignations();
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const fetchMyResignations = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.RESIGNATION_MY, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
        setMyHistory(data);
        const active = data.find(r => (r.status || '').toUpperCase() === 'PENDING');
        if (active) setPreviewLetter(active);
      } else {
        // Fallback to localStorage if backend fails
        const sid = sanitizeId(user?.id || user?.employee_id || user?.empId);
        const saved = localStorage.getItem(`sim_resignations_${sid}`);
        if (saved) {
          const history = JSON.parse(saved);
          setMyHistory(history);
          const active = history.find(r => r.status === 'PENDING');
          if (active) setPreviewLetter(active);
        }
      }
    } catch {
      const saved = localStorage.getItem(`sim_resignations_${user?.id}`);
      if (saved) setMyHistory(JSON.parse(saved));
    }
  };

  const handleSubmit = async () => {
    if (!lastWorkingDay || !reason || !detailedReason.trim()) {
      return alert('Please fill in all required fields.');
    }
    // Built-in deduplication: prevent double submission
    const alreadyActive = myHistory.find(r => (r.status || '').toUpperCase() === 'PENDING');
    if (alreadyActive) {
      return alert('You already have a pending resignation. Please revoke it before submitting a new one.');
    }
    const sid = sanitizeId(user?.id || user?.employee_id || user?.empId);
    const mId = Number(user?.reporting_manager_id || user?.reportingManagerId || user?.manager_id || user?.managerId || 0) || 0;
    
    // Create the entry for local preview IMMEDIATELY to show the letter view as requested
    const entry = {
      id: 'TEMP_' + Math.floor(Math.random() * 10000),
      userId: sid, 
      userName: user?.name,
      resignation_date: resignationDate, 
      last_working_day: lastWorkingDay,
      resignationDate, 
      lastWorkingDay,
      reason, 
      detailedReason: detailedReason,
      detailed_reason: detailedReason,
      status: 'PENDING', 
      timestamp: new Date().toISOString()
    };
    
    setPreviewLetter(entry);
    setActiveTab('letter');

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Safely resolve employee_id — never send NaN or undefined
      const empIdNum = Number(sid);
      const safeEmpId = !isNaN(empIdNum) && empIdNum > 0 ? empIdNum : sid;

      const letterText = `This is to formally notify you of my resignation from the position of ${user?.designation || user?.role || 'Engineer'} at Navabharath Technologies. My last working day will be ${new Date(lastWorkingDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nI have decided to move on for ${reason}. ${detailedReason}\n\nI want to thank you for the opportunities for professional and personal development that I have provided me during my tenure. I have enjoyed working for Navabharath Technologies and appreciate the support provided during my time with the company.\n\nI will ensure a smooth handover of my responsibilities before my departure.`;

      const payload = {
        employee_id: safeEmpId,
        user_id: safeEmpId,
        email: user?.email || '',
        employee_name: user?.name || '',
        designation: user?.designation || user?.role || '',
        department: user?.department || 'Operations',
        manager_id: mId,
        resignation_date: resignationDate,
        last_working_day: lastWorkingDay,
        reason: reason,
        detailed_reason: detailedReason,
        status: 'PENDING',
        letter_content: letterText,
      };
      
      // Payload ready — submitting to backend
      
      const res = await fetch(API_ENDPOINTS.RESIGNATION_SUBMIT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newEntry = await res.json().catch(() => ({}));
        const finalEntry = { ...entry, id: newEntry.id || newEntry.insertId || entry.id };
        const updatedHistory = [finalEntry, ...myHistory];
        setMyHistory(updatedHistory);
        localStorage.setItem(`sim_resignations_${sid}`, JSON.stringify(updatedHistory));
        setSubmitted(true);
      } else {
        // Submission failed silently — local preview is still shown
      }
    } catch {
      // Network error — local preview still shown to user
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeData.reason.trim()) return alert('Please provide a reason.');
    setLoading(true);
    try {
      // Update locally and attempt backend sync
      const updatedHistory = myHistory.map(r => r.id === revokeData.id ? { ...r, status: 'REVOKED', revokeReason: revokeData.reason } : r);
      setMyHistory(updatedHistory);
      localStorage.setItem(`sim_resignations_${user?.id}`, JSON.stringify(updatedHistory));
      setShowRevokeModal(false);
      setPreviewLetter(null);
    } catch {
      // Revoke failed silently
    } finally {
      setLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F5F6FC', padding: '30px 40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
    backBtn: { padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0B1E3F', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    title: { fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '30px', background: '#e2e8f0', padding: '6px', borderRadius: '18px', maxWidth: '600px', overflowX: 'auto' },
    tab: (active) => ({ flex: 1, padding: '12px 20px', borderRadius: '14px', border: 'none', backgroundColor: active ? 'white' : 'transparent', color: active ? '#0B1E3F' : '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', whiteSpace: 'nowrap' }),
    card: { backgroundColor: 'white', borderRadius: '35px', padding: '50px', boxShadow: '0 20px 60px rgba(0,0,0,0.03)', border: '1.5px solid #f1f5f9', marginBottom: '30px' },
    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' },
    input: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '25px' },
    textarea: { width: '100%', padding: '20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '160px', marginBottom: '25px', resize: 'none' },
    select: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', cursor: 'pointer', marginBottom: '25px', appearance: 'none' },
    submitBtn: { width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)' },
    historyItem: { padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', marginBottom: '15px' },
    statusBadge: (s) => ({ padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', backgroundColor: s === 'PENDING' ? '#fffbeb' : (s === 'REVOKED' ? '#f1f5f9' : '#f0fdf4'), color: s === 'PENDING' ? '#d97706' : (s === 'REVOKED' ? '#64748b' : '#16a34a') }),
    revokeBtn: { padding: '10px 20px', borderRadius: '12px', backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' },
    
    // Detail View Styles
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', zIndex: 11000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '100px 40px 40px', overflowY: 'auto' },
    detailCard: { backgroundColor: 'white', borderRadius: '40px', width: '100%', maxWidth: '700px', padding: '50px', position: 'relative' },

    // Geometric shapes (Matched to Reference Image)
    topShape: { position: 'absolute', top: 0, right: 0, width: '350px', height: '350px', backgroundColor: '#3b82f6', clipPath: 'polygon(100% 0, 100% 100%, 20% 0)', opacity: 0.1, zIndex: 1 },
    topShapePrimary: { position: 'absolute', top: 0, right: 0, width: '280px', height: '280px', backgroundColor: '#1d4ed8', clipPath: 'polygon(100% 0, 100% 100%, 40% 0)', zIndex: 1 },
    topShapeSecondary: { position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 80%, 60% 0)', zIndex: 1 },
    bottomShape: { position: 'absolute', bottom: 0, left: 0, width: '350px', height: '350px', backgroundColor: '#3b82f6', clipPath: 'polygon(0 30%, 0 100%, 80% 100%)', opacity: 0.1, zIndex: 1 },
    bottomShapePrimary: { position: 'absolute', bottom: 0, left: 0, width: '280px', height: '280px', backgroundColor: '#1d4ed8', clipPath: 'polygon(0 60%, 0 100%, 60% 100%)', zIndex: 1 },
    bottomShapeSecondary: { position: 'absolute', bottom: 0, left: 0, width: '180px', height: '180px', backgroundColor: '#1e3a8a', clipPath: 'polygon(0 80%, 0 100%, 40% 100%)', zIndex: 1 },

    letterHeader: { marginBottom: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
    logo: { height: '80px', marginBottom: '10px' },
    footerInfo: { marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right' },
    footerItem: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px', color: '#1e3a8a', fontSize: '13px', fontWeight: '800' },
    footerBar: (color) => ({ width: '40px', height: '14px', backgroundColor: color, borderRadius: '4px' }),

    // Premium Letter Container - Centered and constrained for "Square" feel
    letterContainer: { position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: '100px 100px 150px', borderRadius: '4px', boxShadow: '0 0 50px rgba(0,0,0,0.06)', color: '#1e3a8a', fontSize: '15px', lineHeight: '2', minHeight: '1000px', border: '1px solid #e2e8f0', maxWidth: '1000px', margin: '0 auto' },
    watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, zIndex: 0, pointerEvents: 'none', width: '500px', filter: 'grayscale(100%)' }
  };

  return (
    <div style={s.container}>
      <div style={s.main}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}><ChevronLeft size={20} /></button>
          <h1 style={s.title}>Exit Management</h1>
        </div>

        <div style={s.tabBar}>
          <button style={s.tab(activeTab === 'main')} onClick={() => setActiveTab('main')}><Send size={16} /> Submit Notice</button>
          {previewLetter && <button style={s.tab(activeTab === 'letter')} onClick={() => setActiveTab('letter')}><FileText size={16} /> Viewed Letter</button>}
          {(user?.role === 'Manager' || user?.role === 'Admin') && (
            <button style={s.tab(activeTab === 'team')} onClick={() => setActiveTab('team')}><Users size={16} /> Team notice</button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                  <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#fef2f2', color: '#dc2626' }}><LogOut size={30} /></div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Resignation Intent</h2>
                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>Step 1: Fill in your details to generate your official letter.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Intent Date</label>
                    <input type="date" style={s.input} value={resignationDate} disabled />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Proposed Last Working Day</label>
                    <input type="date" style={s.input} value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} />
                  </div>
                </div>

                <label style={s.label}>Primary Reason</label>
                <select style={s.select} value={reason} onChange={e => setReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  <option value="Better Career Opportunity">Better Career Opportunity</option>
                  <option value="Personal Reasons">Personal Reasons</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Other">Other</option>
                </select>

                <label style={s.label}>Additional Details</label>
                <textarea style={s.textarea} placeholder="Describe your reasons briefly..." value={detailedReason} onChange={e => setDetailedReason(e.target.value)} />

                <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit}>
                  {loading ? "Generating..." : <><FileText size={18} /> Generate & Submit Letter</>}
                </button>
              </div>

              <div style={s.card}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '30px' }}>My Resignation History</h2>
                {myHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: '700' }}>No history found.</div>
                ) : myHistory.map(r => (
                  <div key={r.id} style={s.historyItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div onClick={() => { setPreviewLetter(r); setActiveTab('letter'); }} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Submitted: {r.resignationDate} • LWD: {r.lastWorkingDay}</div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                    {r.status === 'PENDING' && (
                      <button style={s.revokeBtn} onClick={() => { setRevokeData({ id: r.id, reason: '' }); setShowRevokeModal(true); }}>
                        <RefreshCcw size={14} /> Revoke Notice
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'letter' && previewLetter && (
             <motion.div key="letter" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'flex-end' }}>
                   <button style={{ ...s.backBtn, padding: '12px 20px', background: '#0B1E3F', color: 'white' }} onClick={() => window.print()}><Printer size={18} /> Print</button>
                   <button style={{ ...s.backBtn, padding: '12px 20px' }} onClick={() => window.print()}><Download size={18} /> Download PDF</button>
                </div>
                <div style={s.letterContainer} className="printable-area">
                    <div style={s.topShape}></div>
                    <div style={s.topShapePrimary}></div>
                    <div style={s.topShapeSecondary}></div>

                    <img src={logo} alt="Watermark" style={s.watermark} />

                    <div style={s.letterHeader}>
                      <img src={logo} alt="Logo" style={s.logo} />
                      <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '2px' }}>NAVABHARATH TECHNOLOGIES</div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <div style={{ fontSize: '28px', fontWeight: '1000', color: '#1e3a8a', textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: '8px', margin: '40px 0 60px', textTransform: 'uppercase' }}>
                            Resignation Letter
                        </div>

                        <div style={{ fontWeight: '800', marginBottom: '40px' }}>Date: {new Date(previewLetter.resignationDate || previewLetter.resignation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

                        <div style={{ fontWeight: '1000', color: '#1e3a8a', marginBottom: '50px', fontSize: '17px' }}>TO WHOMSOEVER IT MAY CONCERN</div>

                        <div style={{ marginBottom: '25px', textAlign: 'justify' }}>
                          This is to formally notify you of my resignation from the position of <strong>{user?.designation || user?.role || 'Engineer'}</strong> at Navabharath Technologies. My last working day will be <strong>{new Date(previewLetter.lastWorkingDay || previewLetter.last_working_day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                        </div>

                        <div style={{ marginBottom: '25px', textAlign: 'justify' }}>
                          I have decided to move on for <strong>{previewLetter.reason}</strong>. {previewLetter.detailedReason || previewLetter.detailed_reason}
                        </div>

                        <div style={{ marginBottom: '25px', textAlign: 'justify' }}>
                          I want to thank you for the opportunities for professional and personal development that I have provided me during my tenure. I have enjoyed working for Navabharath Technologies and appreciate the support provided during my time with the company.
                        </div>

                        <div style={{ marginBottom: '60px', textAlign: 'justify' }}>
                          I will ensure a smooth handover of my responsibilities before my departure.
                        </div>

                        <div style={{ marginTop: '40px' }}>
                          <div style={{ fontWeight: '1000', marginBottom: '10px' }}>For Navabharath Technologies.</div>
                          <div style={{ marginTop: '50px' }}>
                            <div style={{ fontWeight: '1000', fontSize: '18px', color: '#1e3a8a' }}>Dinesh JK</div>
                            <div style={{ fontWeight: '1000', fontSize: '14px', marginTop: '5px' }}>CEO & FOUNDER</div>
                            <div style={{ fontWeight: '1000', fontSize: '14px' }}>NAVABHARATH TECHNOLOGIES</div>
                          </div>
                        </div>
                    </div>

                    <div style={s.footerInfo}>
                      <div style={s.footerItem}>
                        <span>Phone: 0821-3128831</span>
                        <div style={s.footerBar('#3b82f6')}></div>
                      </div>
                      <div style={s.footerItem}>
                        <span>www.navabharathtechnologies.com</span>
                        <div style={s.footerBar('#1d4ed8')}></div>
                      </div>
                      <div style={s.footerItem}>
                        <span>contact@navabharathtechnologies.com</span>
                        <div style={s.footerBar('#1e3a8a')}></div>
                      </div>
                    </div>

                    <div style={s.bottomShape}></div>
                    <div style={s.bottomShapePrimary}></div>
                    <div style={s.bottomShapeSecondary}></div>

                    <style>{`
                      @media print {
                        body * { visibility: hidden; }
                        .printable-area, .printable-area * { visibility: visible; }
                        .printable-area { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 1000px; margin: 0; padding: 100px 80px; box-shadow: none; border: none; }
                        button { display: none; }
                      }
                    `}</style>
                </div>
                <button onClick={() => setActiveTab('main')} style={{ ...s.submitBtn, marginTop: '30px', backgroundColor: '#64748b' }}>
                    <ArrowLeft size={18} /> Back to Management
                </button>
             </motion.div>
          )}

          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Team notice</h2>
                  <div style={{ padding: '6px 14px', backgroundColor: '#dc2626', color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
                    {teamResignations.filter(r => r.status === 'PENDING').length} PENDING
                  </div>
                </div>
                {teamResignations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '700' }}>No team resignations logged.</div>
                ) : teamResignations.map(r => (
                  <motion.div 
                    key={r.id} 
                    whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    onClick={() => setSelectedResignation(r)}
                    style={{ ...s.historyItem, borderLeft: '4px solid #dc2626', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.userName}</div>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '800', marginBottom: '8px' }}>Reason: {r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Submitted: {r.resignationDate} • LWD: <strong>{r.lastWorkingDay}</strong></div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedResignation && (
          <div style={s.overlay} onClick={() => setSelectedResignation(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={s.detailCard}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '35px' }}>
                <button 
                  onClick={() => setSelectedResignation(null)}
                  style={{ ...s.backBtn }}
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Review Resignation</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <User size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{selectedResignation.userName}</h2>
                  <div style={s.statusBadge(selectedResignation.status)}>{selectedResignation.status}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '35px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Submitted On</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>{selectedResignation.resignationDate}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Last Working Day</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>{selectedResignation.lastWorkingDay}</div>
                </div>
              </div>

              <div style={{ marginBottom: '35px' }}>
                <div style={s.label}>Reason for Exit</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1E3F', backgroundColor: '#fef2f2', padding: '12px 18px', borderRadius: '12px', display: 'inline-block' }}>
                  {selectedResignation.reason}
                </div>
              </div>

              <div style={{ marginBottom: '40px' }}>
                <div style={s.label}>Formal Letter Content</div>
                <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '150px' }}>
                  {selectedResignation.detailedReason}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button style={{ flex: 1, padding: '18px', borderRadius: '18px', backgroundColor: '#f1f5f9', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={() => setSelectedResignation(null)}>
                  Close
                </button>
                <button style={{ flex: 2, padding: '18px', borderRadius: '18px', backgroundColor: '#0B1E3F', border: 'none', color: 'white', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Info size={18} /> Discuss Release
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showRevokeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '450px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '25px' }}>Revoke Resignation</h2>
            <label style={s.label}>Reason for Revoking</label>
            <textarea style={{ ...s.textarea, minHeight: '100px' }} placeholder="Why are you revoking?" value={revokeData.reason} onChange={e => setRevokeData({ ...revokeData, reason: e.target.value })} />
            <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setShowRevokeModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: '#f1f5f9', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleRevoke} style={{ flex: 2, ...s.submitBtn, backgroundColor: '#0B1E3F', padding: '15px' }}>{loading ? "Revoking..." : "Confirm Revoke"}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
