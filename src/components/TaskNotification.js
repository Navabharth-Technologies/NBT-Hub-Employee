import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Play, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config';

const TaskNotification = ({ onOpenTask }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastIds, setLastIds] = useState(new Set());
  const sanitizeId = (id) => String(id || '').split(':')[0];

  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${String(h).padStart(2, '0')}:${m} ${ampm} - ${day}/${month}/${year}`;
  };

  const fetchNotifications = async () => {
    const rawUid = user?.id || user?.empId || user?.userId || user?.employee_id;
    const uid = sanitizeId(rawUid);
    if (!uid || uid === 'undefined') return;

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token?.trim()}` };

      // 0. Fetch Users Map for Role/Name resolution
      let usersMap = {};
      try {
        const userRes = await fetch(API_ENDPOINTS.USERS, { headers }).catch(() => null);
        if (userRes && userRes.ok) {
          const uData = await userRes.json();
          const uList = Array.isArray(uData) ? uData : (uData.value || uData.data || []);
          uList.forEach(u => {
            const userId = String(u.id || u.empId || u.employee_id || u.userId);
            if (userId) usersMap[userId] = u;
          });
        }
      } catch (e) { }

      // 1. Fetch Assigned Tasks
      const taskRes = await fetch(`${API_ENDPOINTS.TASKS_ASSIGNED(uid)}?userId=${uid}&_t=${Date.now()}`, { headers }).catch(() => null);
      let tasks = [];
      if (taskRes && taskRes.ok) {
        const data = await taskRes.json();
        tasks = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      // 2. Fetch Leaves (Personal + Team if leader)
      let leaves = [];
      const isLeader = (user?.role || '').toLowerCase().includes('lead') || (user?.role || '').toLowerCase() === 'tl' || (user?.role || '').toLowerCase() === 'manager' || (user?.role || '').toLowerCase().includes('admin') || (user?.role || '').toLowerCase() === 'hr';

      const myLeavesRes = await fetch(API_ENDPOINTS.MY_LEAVES_GET(uid), { headers }).catch(() => null);
      if (myLeavesRes && myLeavesRes.ok) {
        const data = await myLeavesRes.json();
        leaves = [...(Array.isArray(data) ? data : (data.value || data.data || []))];
      }

      if (isLeader) {
        const allLeavesRes = await fetch(API_ENDPOINTS.ALL_LEAVES, { headers }).catch(() => null);
        if (allLeavesRes && allLeavesRes.ok) {
          const data = await allLeavesRes.json();
          const allLeaves = Array.isArray(data) ? data : (data.value || data.data || []);
          allLeaves.forEach(l => {
            if (Number(l.user_id || l.userId) !== Number(uid)) leaves.push(l);
          });
        }
      }

      // 3. Fetch Threads for TL Alerts
      let threads = [];
      const threadRes = await fetch(`${API_ENDPOINTS.THREADS}?userId=${uid}&_t=${Date.now()}`, { headers }).catch(() => null);
      if (threadRes && threadRes.ok) {
        const data = await threadRes.json();
        threads = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      // 4. Fetch Funny Quizzes for Engagement
      let quizzes = [];
      const quizRes = await fetch(`${API_ENDPOINTS.QUIZZES_ALL}?userId=${uid}&_t=${Date.now()}`, { headers }).catch(() => null);
      if (quizRes && quizRes.ok) {
        const data = await quizRes.json();
        quizzes = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      // 5. Fetch Global Notifications from Backend Table
      let globalNotifs = [];
      const globalRes = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${uid}`, { headers }).catch(() => null);
      if (globalRes && globalRes.ok) {
        const data = await globalRes.json();
        globalNotifs = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      const newIds = new Set();
      let addedNew = false;
      const seenApprovals = JSON.parse(localStorage.getItem(`seen_approvals_${uid}`) || '{}');
      const updatedApprovals = { ...seenApprovals };

      // Map Tasks - Use "Real Time" from backend
      const mappedTasks = tasks.map(t => {
        const rawTs = t.assigned_at || t.created_at || t.timestamp || t.deadline;
        const parseDate = rawTs ? new Date(rawTs) : new Date();
        const tid = `task_${t.id}`;
        newIds.add(tid);
        const isNewlyAssigned = lastIds.size > 0 && !lastIds.has(tid);
        if (isNewlyAssigned) addedNew = true;

        return {
          id: tid,
          type: 'TASK',
          title: t.task_name || t.projectName || t.title || 'Management Update',
          description: t.task_text || t.projectDescription || t.description || 'New leadership directive.',
          formattedTime: formatDate(parseDate),
          isNew: isNewlyAssigned,
          rawDate: parseDate
        };
      });

      // Map Leaves - Track ALL status changes (Approve/Reject)
      const mappedLeaves = [];
      leaves.forEach(l => {
        const lid = `leave_${l.id}`;
        newIds.add(lid);

        const rmApp = (l.rm_status || l.rmStatus || 'Pending').toUpperCase();
        const hrApp = (l.hr_status || l.hrStatus || 'Pending').toUpperCase();
        const pmApp = (l.pm_status || l.pmStatus || (String(l.status || '').includes('Approved') ? 'Approved' : 'Pending')).toUpperCase();

        // Comprehensive Status Tracking via Signature
        const currentSignature = `RM:${rmApp}|HR:${hrApp}|PM:${pmApp}`;
        const prevSignature = seenApprovals[lid] || 'RM:PENDING|HR:PENDING|PM:PENDING';
        const statusChanged = currentSignature !== prevSignature;
        const isFirstLoadEver = !localStorage.getItem(`seen_approvals_${uid}`);
        if (statusChanged) updatedApprovals[lid] = currentSignature;

        // Condition 1: Always show in list if it's not Pending (so user can see recent history)
        // Condition 2: Mark as 'New' if status changed since last check (except first load)
        const isProcessed = rmApp !== 'PENDING' || hrApp !== 'PENDING' || pmApp !== 'PENDING';
        const isNewlyUpdated = statusChanged && !isFirstLoadEver;

        if (isProcessed) {
          if (isNewlyUpdated) addedNew = true;

          const rawTs = l.updated_at || l.created_at || new Date();
          const parseDate = new Date(rawTs);

          let statusText = 'Updated';
          if (currentSignature.includes('REJECTED')) statusText = 'Rejected';
          else if (currentSignature.includes('APPROVED')) statusText = 'Approved';

          const ename = l.employeeName || l.user_name || l.name || (Number(l.user_id) === Number(uid) ? 'Your' : 'Team member');

          mappedLeaves.push({
            id: lid,
            type: 'LEAVE',
            title: `Leave Request ${statusText}`,
            description: `${ename} request for ${l.leave_type || 'Time Off'} is now ${statusText}. (TL/RM: ${rmApp}, HR: ${hrApp}, PM: ${pmApp})`,
            formattedTime: formatDate(parseDate),
            isNew: isNewlyUpdated,
            rawDate: parseDate
          });
        }
      });

      // Map Threads - Important leadership updates (Only within last 48 hours)
      const mappedThreads = [];
      const now = new Date();
      threads.forEach(t => {
        const tid = `thread_${t.id}`;
        newIds.add(tid);

        const threadUserId = sanitizeId(t.user_id || t.userId || t.user_Id);
        const uProfile = usersMap[threadUserId] || {};
        const role = (t.role || t.userRole || uProfile.role || uProfile.Role || '').toLowerCase();
        // Silence notifications from HR, Admin, TL, and PM per user request
        const isExcluded = role.includes('hr') || role.includes('admin') || role.includes('tl') || role.includes('superadmin') || role.includes('pm') || role.includes('manager') || (uProfile.email && uProfile.email.includes('dinesh'));

        if (!isExcluded && String(threadUserId) !== String(uid)) {
          const rawTs = t.created_at || t.createdAt || new Date();
          const parseDate = new Date(rawTs);
          const daysDiff = (now - parseDate) / (1000 * 60 * 60 * 24);
          // Notify for posts within last 24 hours to ensure they are fresh "Alerts"
          if (daysDiff <= 1) {
            const isNewlyPosted = lastIds.size > 0 && !lastIds.has(tid);
            if (isNewlyPosted) addedNew = true;

            mappedThreads.push({
              id: tid,
              type: 'THREAD',
              title: `${t.userName || 'Leader'} posted a Thread`,
              description: t.content || 'New organization update.',
              formattedTime: formatDate(parseDate),
              isNew: isNewlyPosted,
              rawDate: parseDate
            });
          }
        }
      });

      // Map Quizzes - Engagement Alerts (Only within last 24 hours)
      const mappedQuizzes = [];
      quizzes.forEach(q => {
        const qid = `quiz_${q.id}`;
        newIds.add(qid);

        const rawTs = q.created_at || q.createdAt || new Date();
        const parseDate = new Date(rawTs);
        const daysDiff = (now - parseDate) / (1000 * 60 * 60 * 24);

        // Notify for quizzes within last 24 hours
        if (daysDiff <= 1) {
          const isNewlyAdded = lastIds.size > 0 && !lastIds.has(qid);
          if (isNewlyAdded) addedNew = true;

          mappedQuizzes.push({
            id: qid,
            type: 'QUIZ',
            title: `New Fun Quiz: ${q.title || 'Engagement Task'}`,
            description: q.description || 'A new engagement activity has been posted. Join now!',
            formattedTime: formatDate(parseDate),
            isNew: isNewlyAdded,
            rawDate: parseDate
          });
        }
      });

      // Map Global Notifications
      const mappedGlobal = globalNotifs.map(gn => {
        const gId = `global_${gn.id}`;
        newIds.add(gId);
        const parseDate = new Date(gn.created_at || gn.createdAt || new Date());
        const isNewlyAdded = lastIds.size > 0 && !lastIds.has(gId);
        if (isNewlyAdded) addedNew = true;

        return {
          id: gId,
          type: gn.type || 'ALERT',
          title: gn.title || 'System Alert',
          description: gn.message || gn.content || gn.description || '',
          formattedTime: formatDate(parseDate),
          isNew: isNewlyAdded,
          rawDate: parseDate
        };
      });

      localStorage.setItem(`seen_approvals_${uid}`, JSON.stringify(updatedApprovals));

      const merged = [...mappedTasks, ...mappedLeaves, ...mappedThreads, ...mappedQuizzes, ...mappedGlobal].sort((a, b) => b.rawDate - a.rawDate);
      setNotifications(merged);

      if (merged.length > 0) {
        const latestId = String(merged[0].id);
        const savedId = localStorage.getItem(`last_seen_task_${uid}`);
        if (latestId !== savedId && (addedNew || lastIds.size === 0)) {
          setHasUnread(true);
          if (addedNew) setIsOpen(true);
        }
      }
      setLastIds(newIds);
    } catch (err) {
      console.error("Management Sync Error:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 20000);
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notifications', handleToggle);
    return () => {
      clearInterval(poll);
      window.removeEventListener('toggle-notifications', handleToggle);
    };
  }, [user, lastIds.size]);

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
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif, idx) => (
                <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '1000', color: '#94a3b8', marginLeft: '5px', marginBottom: '2px' }}>
                    {notif.formattedTime}
                  </div>
                  <div style={{
                    background: notif.isNew ? '#ffffff' : '#f1f5f9',
                    padding: '15px',
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: notif.isNew ? '0 4px 12px rgba(59, 89, 152, 0.15)' : 'none',
                    border: notif.isNew ? '1.5px solid #3B5998' : '1px solid #eef2f6',
                    position: 'relative'
                  }}>
                    {notif.isNew && (
                      <div style={{ position: 'absolute', top: '-8px', right: '10px', background: '#3B5998', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '8px', fontWeight: '1000' }}>New Alert</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Bell size={14} color="#3B5998" />
                      <span style={{ fontWeight: '1000', fontSize: '13px', color: '#0B1E3F' }}>{notif.title}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>{notif.description}</p>

                    {(notif.isNew || idx === 0 || notif.type === 'QUIZ' || notif.type === 'THREAD' || notif.type === 'LEAVE') && (
                      <button
                        onClick={() => {
                          let tab = 'HOME';
                          if (notif.type === 'LEAVE') tab = 'LEAVE';
                          if (notif.type === 'THREAD') tab = 'THREAD';
                          if (notif.type === 'QUIZ') tab = 'FUN';

                          onOpenTask(tab);
                          setIsOpen(false);
                          setHasUnread(false);
                        }}
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          background: '#3B5998',
                          color: 'white',
                          border: 'none',
                          padding: '11px',
                          borderRadius: '11px',
                          fontWeight: '1000',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(59, 89, 152, 0.2)'
                        }}
                      >
                        <Play size={12} fill="white" />
                        {notif.type === 'LEAVE' ? 'Go To Leaves' : (notif.type === 'THREAD' ? 'Go To Threads' : (notif.type === 'QUIZ' ? 'Join Quiz' : 'Go To Dashboard'))}
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  No team updates logged.
                </div>
              )}
            </div>

            <div style={{ padding: '12px', background: 'white', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '11px', fontWeight: '1000', color: '#3B5998' }}>
              Team Leader Oversight AI
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