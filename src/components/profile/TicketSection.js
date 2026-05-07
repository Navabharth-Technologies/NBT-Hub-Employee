import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

export default function TicketSection({ onClose }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.SUPPORT_TICKETS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          category,
          description,
          priority,
          email: user?.email,
          employee_id: user?.employee_id || user?.id,
          name: user?.name
        })
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error('Ticket submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(11, 30, 63, 0.7)',
        backdropFilter: 'blur(15px)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        style={{
          backgroundColor: 'white', borderRadius: '40px',
          maxWidth: '500px', width: '100%',
          boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#f97316', padding: '30px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>
                Support Ticket
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <AlertCircle size={14} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Technical Assistance
                </span>
              </div>
            </div>
            <X size={24} color="rgba(255,255,255,0.6)" onClick={onClose} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        {submitted ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <CheckCircle2 size={60} color="#16a34a" style={{ marginBottom: '20px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 8px' }}>Ticket Submitted</h3>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Our support team will review your request shortly.</p>
          </div>
        ) : (
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Subject */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>
                  Subject <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '14px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', appearance: 'none', boxSizing: 'border-box' }}
                  >
                    {['Technical', 'HR', 'IT Support', 'Payroll', 'Access', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '14px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', appearance: 'none', boxSizing: 'border-box' }}
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>
                  Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '14px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !description.trim()}
                style={{
                  padding: '20px', borderRadius: '20px',
                  backgroundColor: submitting ? '#94a3b8' : '#0B1E3F',
                  color: 'white', fontWeight: '900', border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  boxShadow: '0 15px 30px rgba(11, 30, 63, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
              >
                <Send size={18} />
                {submitting ? 'SUBMITTING...' : 'DISPATCH SUPPORT TICKET'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ backgroundColor: '#f8fafc', padding: '15px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>RESPONSE TIME: 24-48H</span>
          <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '800' }}>NBT SUPPORT v4.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
