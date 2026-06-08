import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Play, Clock, Zap, Award, CheckCircle, XCircle, RefreshCw, ClipboardList } from 'lucide-react';
import { useAuth, checkAuthOnce } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config';

const TaskNotification = ({ onOpenTask }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastIds, setLastIds] = useState(new Set());
  const sanitizeId = (id) => String(id || '').split(':')[0];
  const authValidRef = useRef(true);

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  
  const parseDbDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    try {
      const s = String(dateStr);
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [_, y, m, d, hh, mm, ss] = match;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
      }
    } catch (e) {}
    return new Date(dateStr);
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    const s = seconds < 10 ? '0' + seconds : seconds;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year} at ${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
  };

  const fetchNotifications = async () => {
    if (!authValidRef.current) return;
    const authOk = await checkAuthOnce();
    if (!authOk) { authValidRef.current = false; return; }
    const rawUid = user?.id || user?.empId || user?.userId || user?.employee_id;
    const uid = sanitizeId(rawUid);
    if (!uid || uid === 'undefined') return;

    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      if (!cleanToken) return;
      
      const headers = { 'Authorization': `Bearer ${cleanToken}` };

      // Fetch Global Notifications from Backend Table
      let globalNotifs = [];
      const globalRes = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${uid}`, { headers }).catch(() => null);
      if (globalRes && globalRes.ok) {
        const data = await globalRes.json();
        globalNotifs = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      const newIds = new Set();
      let addedNew = false;
      const readIds = JSON.parse(localStorage.getItem(`read_employee_notifs_${uid}`) || '[]');

      // Map Global Notifications
      const mappedGlobal = globalNotifs.map(gn => {
        const gId = `global_${gn.id}`;
        newIds.add(gId);
        const parseDate = parseDbDate(gn.created_at || gn.createdAt || new Date());
        const isNewlyAdded = lastIds.size > 0 && !lastIds.has(gId);
        if (isNewlyAdded) addedNew = true;
        const isRead = gn.is_read || gn.isRead || gn.read_status || readIds.includes(gId);

        const rawMsg = gn.message || gn.content || gn.description || '';
        let dynamicTitle = gn.title;
        
        if (!dynamicTitle || dynamicTitle === 'System Alert' || dynamicTitle.toLowerCase().includes('system alert')) {
            const lowerMsg = rawMsg.toLowerCase();
            if (lowerMsg.includes('ticket')) {
                dynamicTitle = 'Ticket response';
            } else if (lowerMsg.includes('leave') && (lowerMsg.includes('approved') || lowerMsg.includes('accepted'))) {
                dynamicTitle = 'Leave Approved';
            } else if (lowerMsg.includes('leave') && (lowerMsg.includes('rejected') || lowerMsg.includes('declined'))) {
                dynamicTitle = 'Leave Rejected';
            } else if (lowerMsg.includes('leave') && lowerMsg.includes('updated')) {
                dynamicTitle = 'Leave Status Updated';
            } else if (lowerMsg.includes('leave')) {
                dynamicTitle = 'Leave Update';
            } else if (lowerMsg.includes('quiz')) {
                dynamicTitle = 'New Fun Quiz';
            } else if (lowerMsg.includes('task') && (lowerMsg.includes('approved') || lowerMsg.includes('accepted'))) {
                dynamicTitle = 'Task Approved';
            } else if (lowerMsg.includes('task') && (lowerMsg.includes('rejected') || lowerMsg.includes('declined'))) {
                dynamicTitle = 'Task Rejected';
            } else if (lowerMsg.includes('task') && (lowerMsg.includes('completed') || lowerMsg.includes('done') || lowerMsg.includes('finished'))) {
                dynamicTitle = 'Task Completed';
            } else if (lowerMsg.includes('task') && (lowerMsg.includes('updated') || lowerMsg.includes('changed') || lowerMsg.includes('modified'))) {
                dynamicTitle = 'Task Update';
            } else if (lowerMsg.includes('task') && lowerMsg.includes('assigned to')) {
                dynamicTitle = 'New Task Assigned';
            } else if (lowerMsg.includes('task') || lowerMsg.includes('assigned')) {
                // Check if it's a status update (has "has been" pattern) or new assignment
                dynamicTitle = lowerMsg.includes('has been') ? 'Task Update' : 'New Task Assigned';
            } else if (lowerMsg.includes('reward') || lowerMsg.includes('points')) {
                dynamicTitle = 'Reward Earned';
            } else {
                dynamicTitle = 'System Alert';
            }
        }

        let finalDesc = rawMsg;
        if (dynamicTitle === 'New Fun Quiz' || (gn.type && gn.type.toUpperCase() === 'QUIZ') || rawMsg.toLowerCase().includes('new fun quiz')) {
            finalDesc = "Added new quiz";
        }

        return {
          id: gId,
          type: gn.type || 'ALERT',
          title: dynamicTitle,
          description: finalDesc,
          formattedTime: formatDate(parseDate),
          isNew: !isRead,
          rawDate: parseDate
        };
      });

      const sortedNotifications = mappedGlobal.sort((a, b) => b.rawDate - a.rawDate);

      setNotifications(sortedNotifications);

      if (sortedNotifications.length > 0) {
        const latestId = String(sortedNotifications[0].id);
        const savedId = localStorage.getItem(`last_seen_task_${uid}`);
        if (latestId !== savedId && (addedNew || lastIds.size === 0)) {
          setHasUnread(true);
        }
      }
      setLastIds(newIds);
    } catch (err) {
      console.error("Management Sync Error:", err);
    }
  };

  useEffect(() => {
    authValidRef.current = true;
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 20000);
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notifications', handleToggle);
    return () => {
      clearInterval(poll);
      window.removeEventListener('toggle-notifications', handleToggle);
    };
  }, [user]);

  const isMobile = winWidth < 768;

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? '120px' : '100px',
      right: isMobile ? '15px' : '30px',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '15px'
    }}>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            style={{
              background: 'white',
              width: isMobile ? 'calc(100vw - 20px)' : '340px',
              maxHeight: '480px',
              borderRadius: isMobile ? '20px' : '28px 28px 4px 28px',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px', background: '#3B5998', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} fill="white" />
                <span style={{ fontWeight: '1000', fontSize: '14px', letterSpacing: '1px' }}>Management Alerts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {notifications.some(n => n.isNew) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rawUid = user?.id || user?.empId || user?.userId || user?.employee_id;
                      const uid = sanitizeId(rawUid);
                      if (uid) {
                        try {
                          const token = localStorage.getItem('token');
                          const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
                          fetch(API_ENDPOINTS.NOTIFICATIONS_MARK_READ_ALL(uid), {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${cleanToken}` }
                          }).catch(console.error);
                          
                          setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
                          setHasUnread(false);
                        } catch(err) {}
                      }
                    }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif, idx) => {
                const isRead = !notif.isNew;
                return (
                  <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginLeft: '5px', marginBottom: '2px' }}>
                      {notif.formattedTime}
                    </div>
                    <div 
                      onClick={() => {
                        const rawUid = user?.id || user?.empId || user?.userId || user?.employee_id;
                        const uid = sanitizeId(rawUid);
                        if (uid) {
                          const readIds = JSON.parse(localStorage.getItem(`read_employee_notifs_${uid}`) || '[]');
                          if (!readIds.includes(notif.id)) {
                            readIds.push(notif.id);
                            localStorage.setItem(`read_employee_notifs_${uid}`, JSON.stringify(readIds.slice(-100)));
                          }
                        }

                        // Immediately update local UI status
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isNew: false } : n));

                        // Backend API call to mark as read
                        if (String(notif.id).startsWith('global_')) {
                          const dbId = String(notif.id).replace('global_', '');
                          try {
                            const token = localStorage.getItem('token');
                            const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
                            fetch(API_ENDPOINTS.NOTIFICATIONS_MARK_READ(dbId), {
                              method: 'PUT',
                              headers: { 'Authorization': `Bearer ${cleanToken}` }
                            }).catch(console.error);
                          } catch(err) {}
                        }

                        let tab = 'HOME';
                        const nType = String(notif.type || '').toUpperCase();
                        const nTitle = String(notif.title || '').toLowerCase();
                        const nDesc = String(notif.description || '').toLowerCase();
                        
                        if (nType === 'TICKET' || nTitle.includes('ticket') || nDesc.includes('ticket')) {
                          tab = 'TICKET';
                        } else if (nType === 'LEAVE' || nTitle.includes('leave') || nDesc.includes('leave')) {
                          tab = 'LEAVE';
                        } else if (nType === 'THREAD' || nTitle.includes('thread') || nDesc.includes('thread')) {
                          tab = 'THREAD';
                        } else if (nType === 'QUIZ' || nTitle.includes('quiz') || nDesc.includes('quiz')) {
                          tab = 'FUN';
                        } else if (
                          nType === 'TASK' ||
                          nTitle.includes('task') ||
                          nTitle.includes('assigned') ||
                          nDesc.includes('task assigned') ||
                          nDesc.includes('new task') ||
                          nDesc.includes('assigned to')
                        ) {
                          tab = 'PROJECTS';
                        }

                        onOpenTask(tab);
                        setIsOpen(false);
                        setHasUnread(false);
                      }}
                      style={{
                        background: isRead ? '#ffffff' : '#f0f7ff',
                        padding: '16px',
                        borderRadius: '20px',
                        border: isRead ? '1.5px solid #f1f5f9' : '1.5px solid #3B599820',
                        boxShadow: isRead ? 'none' : '0 8px 20px rgba(59, 89, 152, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isRead ? '#fafbfc' : '#e8f2ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isRead ? '#ffffff' : '#f0f7ff';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      {/* Left Icon Box — color-coded by task status */}
                      {(() => {
                        const t = String(notif.title || '').toLowerCase();
                        let bg = !isRead ? '#3B5998' : '#f1f5f9';
                        let iconEl = <Bell size={18} fill={!isRead ? 'white' : 'transparent'} />;
                        if (notif.type === 'QUIZ') { bg = '#0d676c'; iconEl = <Zap size={18} fill="white" />; }
                        else if (notif.type === 'AWARD') { bg = '#f59e0b'; iconEl = <Award size={18} />; }
                        else if (t.includes('approved') || t.includes('accepted')) { bg = '#16a34a'; iconEl = <CheckCircle size={18} />; }
                        else if (t.includes('rejected') || t.includes('declined')) { bg = '#ef4444'; iconEl = <XCircle size={18} />; }
                        else if (t.includes('completed') || t.includes('done')) { bg = '#8b5cf6'; iconEl = <CheckCircle size={18} />; }
                        else if (t.includes('update') || t.includes('changed') || t.includes('modified')) { bg = '#f97316'; iconEl = <RefreshCw size={18} />; }
                        else if (t.includes('task') || t.includes('assigned')) { bg = '#3B5998'; iconEl = <ClipboardList size={18} />; }
                        return (
                          <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, transition: 'all 0.3s ease' }}>
                            {iconEl}
                          </div>
                        );
                      })()}

                      {/* Text details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: '14px', 
                          fontWeight: !isRead ? '1000' : '500', 
                          color: !isRead ? '#0B1E3F' : '#64748b', 
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'all 0.3s ease'
                        }}>{notif.title}</h4>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '12px', 
                          color: !isRead ? '#3B5998' : '#94a3b8', 
                          fontWeight: !isRead ? '800' : '400', 
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease'
                        }}>{notif.description}</p>
                        {/* Assignee chip for task notifications */}
                        {(String(notif.title || '').toLowerCase().includes('task') || String(notif.title || '').toLowerCase().includes('assigned')) && (() => {
                          const desc = notif.description || '';
                          // Extract "assigned to [Name]" or "by [Name]"
                          let assignee = '';
                          const toMatch = desc.match(/assigned to ([^:]+?)(?:\s*:|,|\s+by\s|$)/i);
                          const byMatch = desc.match(/\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/i);
                          if (toMatch) assignee = toMatch[1].trim();
                          else if (byMatch) assignee = byMatch[1].trim();
                          return assignee ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: !isRead ? '#3B5998' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '900', color: 'white', flexShrink: 0 }}>
                                {assignee.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: '900', color: !isRead ? '#3B5998' : '#94a3b8' }}>{assignee}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* Unread Blue dot */}
                      {!isRead && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#3B5998',
                            borderRadius: '50%',
                            flexShrink: 0,
                            boxShadow: '0 0 10px rgba(59, 89, 152, 0.4)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  No team updates logged.
                </div>
              )}
            </div>


          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && notifications.length > 0) {
            setHasUnread(false);
            const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
            localStorage.setItem(`last_seen_task_${uid}`, String(notifications[0].id));
          }
        }}
        style={{
          background: '#3B5998',
          color: 'white',
          width: isMobile ? '50px' : '60px',
          height: isMobile ? '50px' : '60px',
          borderRadius: '50%',
          boxShadow: '0 20px 40px rgba(59, 89, 152, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0
        }}
      >
        <Bell size={isMobile ? 24 : 28} fill="white" />
        {hasUnread && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              position: 'absolute',
              top: isMobile ? '12px' : '18px',
              right: isMobile ? '12px' : '18px',
              width: '14px',
              height: '14px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white'
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TaskNotification;