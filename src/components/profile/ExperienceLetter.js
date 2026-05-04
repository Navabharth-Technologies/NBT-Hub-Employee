import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, FileBadge, Send, Clock, CheckCircle2, 
  AlertCircle, History, User, Calendar, Briefcase,
  FileText, Download, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';

const ExperienceLetter = ({ onBack }) => {
  const { user } = useAuth();
  
  // Utility to handle ID sanitization (removes :1 suffix common in this codebase)
  const sanitizeId = (id) => String(id || '').split(':')[0].trim();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [purpose, setPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, success, error
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    empId: user?.employee_id || user?.id || 'N/A',
    designation: user?.designation || user?.role || 'Member',
    role: user?.role || ''
  });

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const identifier = user?.email || user?.id || user?.employee_id;
        if (!identifier) return;
        
        const sid = identifier.includes('@') ? identifier : sanitizeId(identifier);
        const token = localStorage.getItem('token');
        const resp = await fetch(`${BASE_URL}/api/profile/${sid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          setProfileData({
            name: data.employee_name || data.name || user?.name,
            empId: data.employee_id || data.id || user?.employee_id || user?.id,
            designation: data.designation || data.role || user?.designation || user?.role,
            role: data.role || user?.role || ''
          });
        }
      } catch (err) {
        console.error('Service Certificate Profile Sync Error:', err);
      }
    };
    fetchFullProfile();
  }, [user]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${BASE_URL}/api/service-certificates/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching certificate history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPurpose = purpose === 'Other' ? otherPurpose : purpose;
    if (!finalPurpose) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${BASE_URL}/api/service-certificates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          purpose: finalPurpose,
          designation: profileData.designation
        })
      });

      if (resp.ok) {
        setRequestStatus('success');
        fetchHistory(); 
      } else {
        const errorData = await resp.json().catch(() => ({ message: 'Failed to process request on server.' }));
        const errorMsg = errorData.message || errorData.error || 'The request could not be completed.';
        alert(`Service Request Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Submission Error:', err);
      alert('Connection Error: Unable to reach the server. Please check your internet or try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = {
    container: { padding: '30px 20px 120px', maxWidth: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' },
    backBtn: { padding: '12px', borderRadius: '15px', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: '32px', fontWeight: '900', color: '#10274A', margin: 0 },
    
    card: { backgroundColor: 'white', borderRadius: '30px', padding: '40px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 40px rgba(0,0,0,0.02)', marginBottom: '30px' },
    sectionTitle: { fontSize: '18px', fontWeight: '800', color: '#10274A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    
    label: { fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '10px', display: 'block' },
    select: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none', appearance: 'none', backgroundColor: '#f8fafc' },
    textarea: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none', minHeight: '120px', resize: 'none', backgroundColor: '#f8fafc' },
    
    submitBtn: { width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#10274A', color: 'white', border: 'none', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', marginTop: '20px' },
    
    historyCard: { padding: '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', backgroundColor: '#fcfdfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    statusBadge: (status) => ({
      padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
      backgroundColor: (status === 'Approved' || status === 'Completed') ? '#dcfce7' : (status === 'Pending' ? '#fef9c3' : '#fee2e2'),
      color: (status === 'Approved' || status === 'Completed') ? '#16a34a' : (status === 'Pending' ? '#a16207' : '#ef4444')
    })
  };

  if (requestStatus === 'success') {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#10274A', marginBottom: '15px' }}>Application Submitted!</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 30px' }}>
            Your request for an Experience Letter has been sent to the HR department. You will be notified once it is processed.
          </p>
          <button style={{ ...s.submitBtn, width: 'auto', margin: '0 auto', padding: '15px 40px' }} onClick={() => setRequestStatus('idle')}>Apply Another</button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '700', marginTop: '20px', cursor: 'pointer' }} onClick={onBack}>Go Back to Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <motion.button whileHover={{ scale: 1.05 }} style={s.backBtn} onClick={onBack}><ChevronLeft size={24} color="#10274A" /></motion.button>
        <div>
          <h1 style={s.title}>Experience Letter</h1>
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Request official service certificate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', width: '100%' }}>
        
        {/* Form Section */}
        <div>
          <div style={s.card}>
            <div style={s.sectionTitle}><FileBadge size={22} color="#10274A" /> Service Certificate Application</div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '25px' }}>
                <label style={s.label}>Purpose of Request</label>
                <select 
                  style={s.select} 
                  value={purpose} 
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                >
                  <option value="">Select Purpose</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Bank Loan / Financial">Bank Loan / Financial</option>
                  <option value="Visa / Immigration">Visa / Immigration</option>
                  <option value="Job Change">Internal Movement / Job Change</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {purpose === 'Other' && (
                <div style={{ marginBottom: '25px' }}>
                  <label style={s.label}>Specify Reason</label>
                  <textarea 
                    style={s.textarea} 
                    placeholder="Describe why you need the certificate..." 
                    value={otherPurpose}
                    onChange={(e) => setOtherPurpose(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Dynamic Employee Info (Read-only) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Current Position</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{profileData.designation}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Employee ID</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{profileData.empId}</div>
                  </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ ...s.submitBtn, opacity: isSubmitting ? 0.7 : 1 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Clock className="animate-spin" size={20} /> : <Send size={20} />}
                {isSubmitting ? 'Processing Request...' : 'Submit Application'}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Sidebar: Guidelines & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ ...s.card, padding: '30px' }}>
            <div style={{ ...s.sectionTitle, fontSize: '16px' }}><ShieldCheck size={20} color="#16a34a" /> Guidelines</div>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[
                'Standard processing time is 3-5 working days.',
                'Certificates will be issued in digital (PDF) format.',
                'Tenure must be at least 6 months for experience letters.',
                'Management approval is required for all requests.'
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                  <div style={{ minWidth: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', marginTop: '6px' }} />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#10274A', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} /> Request History
            </div>
            
            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                <Clock className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Loading history...</div>
              </div>
            ) : history.length === 0 ? (
              <div style={{ ...s.card, padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <FileText size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>No requests yet</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Your certificate applications will appear here.</div>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} style={s.historyCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Service Certificate</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>
                      Purpose: {item.purpose}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>
                      Requested on {new Date(item.created_at || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={s.statusBadge(item.status)}>{item.status}</div>
                    {(item.status === 'Approved' || item.status === 'Completed') && item.file_path && (
                      <button 
                        onClick={() => window.open(`${BASE_URL}/${item.file_path}`, '_blank')}
                        style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={12} /> Download
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default ExperienceLetter;
