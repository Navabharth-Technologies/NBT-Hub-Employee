import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Send, X, ClipboardList, Lightbulb } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

const SaturdayRequirementsPopover = () => {
    const [show, setShow] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState({ requirements: '', suggestions: '' });

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const uid = userData.employee_id || userData.userId || userData.id || 'unknown';

    const isSaturday = new Date().getDay() === 6; // 0=Sun, 6=Sat
    const today = new Date().toDateString();
    
    const submittedKey = `saturdayReflectionSubmittedDate_${uid}`;
    const dismissedKey = `saturdayReflectionDismissedDate_${uid}`;

    const hasSubmittedEver = !!localStorage.getItem(submittedKey);
    const hasDismissedToday = localStorage.getItem(dismissedKey) === today;

    useEffect(() => {
        if (!isSaturday || hasSubmittedEver) {
            setShow(false);
            setIsMinimized(false);
            return;
        }

        if (!hasDismissedToday) {
            const timer = setTimeout(() => setShow(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setIsMinimized(true);
        }
    }, [isSaturday, hasSubmittedEver, hasDismissedToday]);

    const handleDismiss = () => {
        setShow(false);
        if (!submitted) {
            localStorage.setItem(dismissedKey, new Date().toDateString());
            setIsMinimized(true);
        }
    };

    const handleRestore = () => {
        setIsMinimized(false);
        setShow(true);
    };

    const handleSubmit = async () => {
        if (!feedback.requirements.trim() && !feedback.suggestions.trim()) return;

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(API_ENDPOINTS.SUGGESTIONS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token?.trim()}`
                },
                body: JSON.stringify({
                    employee_id: uid,
                    employee_name: userData.name || userData.employee_name || 'Anonymous',
                    requirement: feedback.requirements,
                    suggestion: feedback.suggestions,
                    created_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                setSubmitted(true);
                localStorage.setItem(submittedKey, new Date().toDateString());
                setTimeout(() => {
                    setShow(false);
                    setIsMinimized(false);
                }, 2000);
            }
        } catch (err) {
            console.error("Failed to submit suggestions:", err);
        }
    };

    if (!isSaturday) return null;
    // Hide entirely if already submitted ever, UNLESS they just submitted (to show the success message)
    if (hasSubmittedEver && !submitted) return null;

    return (
        <>
            <AnimatePresence>
                {show && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                backgroundColor: 'white',
                                width: '100%',
                                maxWidth: '500px',
                                borderRadius: '32px',
                                boxShadow: '0 40px 100px rgba(0, 0, 0, 0.4)',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #3B5998 0%, #1e3a8a 100%)',
                                padding: '30px',
                                color: 'white',
                                position: 'relative'
                            }}>
                                <button
                                    onClick={handleDismiss}
                                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', cursor: 'pointer' }}
                                >
                                    <X size={18} />
                                </button>
                                <div style={{ width: '50px', height: '50px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                    <Calendar size={24} color="white" />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>Saturday Reflection</h2>
                                <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px', fontWeight: '600' }}>Help us improve the portal with your requirements and suggestions.</p>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '30px' }}>
                                {submitted ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{ textAlign: 'center', padding: '40px 0' }}
                                    >
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                            <Send size={40} color="#15803d" />
                                        </div>
                                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 10px 0' }}>Feedback Received!</h3>
                                        <p style={{ color: '#64748b', fontWeight: '600', margin: 0 }}>Thank you for helping us grow. Have a great weekend!</p>
                                    </motion.div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                                                <ClipboardList size={16} color="#3B5998" />
                                                NEW REQUIREMENTS
                                            </label>
                                            <textarea
                                                placeholder="What features or tools do you need?"
                                                value={feedback.requirements}
                                                onChange={(e) => setFeedback(prev => ({ ...prev, requirements: e.target.value }))}
                                                style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '16px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', resize: 'none', transition: 'border-color 0.2s' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                                                <Lightbulb size={16} color="#f59e0b" />
                                                PORTAL SUGGESTIONS
                                            </label>
                                            <textarea
                                                placeholder="Any ideas to make things better?"
                                                value={feedback.suggestions}
                                                onChange={(e) => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
                                                style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '16px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', resize: 'none', transition: 'border-color 0.2s' }}
                                            />
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={!feedback.requirements.trim() && !feedback.suggestions.trim()}
                                            style={{
                                                backgroundColor: (!feedback.requirements.trim() && !feedback.suggestions.trim()) ? '#cbd5e1' : '#3B5998',
                                                color: 'white',
                                                border: 'none',
                                                padding: '16px',
                                                borderRadius: '16px',
                                                fontWeight: '900',
                                                fontSize: '15px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                marginTop: '10px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Send size={18} />
                                            Submit Feedback
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isMinimized && !show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, x: 50 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: 50 }}
                        onClick={() => handleRestore()}
                        drag
                        dragMomentum={false}
                        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            right: '30px',
                            backgroundColor: '#3B5998',
                            color: 'white',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                            boxShadow: '0 10px 25px rgba(59, 89, 152, 0.4)',
                            zIndex: 9998,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div style={{ position: 'relative' }}>
                            <ClipboardList size={24} />
                            <div style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#ef4444',
                                borderRadius: '50%',
                                border: '2px solid #3B5998'
                            }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SaturdayRequirementsPopover;
