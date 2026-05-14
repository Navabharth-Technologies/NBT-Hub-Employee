import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Edit3, TrendingUp, Clock, Gift, Calendar, Trash2, User, Users, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_ENDPOINTS, BASE_URL } from '../config';
import { safeSetItem } from '../context/AuthContext';
import SaturdayRequirementsPopover from './SaturdayRequirementsPopover';

const Dashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);

  // Real Data State
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [yesterdayStatus, setYesterdayStatus] = useState('Pending');
  const [yesterdayCompletion, setYesterdayCompletion] = useState(100);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayStatus, setTodayStatus] = useState('Pending');
  const [isEditing, setIsEditing] = useState(false);

  // Edit Buffer
  const [editBuffer, setEditBuffer] = useState([]);
  const [editStatus, setEditStatus] = useState('');

  // Project/Course Data
  const [projectInfo, setProjectInfo] = useState({ name: '', description: '', fileUrl: null });
  const [courseInfo, setCourseInfo] = useState({ name: 'Acquiring curriculum...', progress: 0 });
  const [activeCourses, setActiveCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [assignedTasksList, setAssignedTasksList] = useState([]);
  const [taskReviews, setTaskReviews] = useState({}); // Stores manager reviews for tasks
  const [sprintProgressMap, setSprintProgressMap] = useState({});
  const [sprintStatusMap, setSprintStatusMap] = useState({});
  const [isDirectlyAssigned, setIsDirectlyAssigned] = useState(false);
  const [individualProjects, setIndividualProjects] = useState([]);
  const [teamProjects, setTeamProjects] = useState([]);
  const [activeProjectView, setActiveProjectView] = useState('INDIVIDUAL'); // INDIVIDUAL or TEAM
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [pendingStatusData, setPendingStatusData] = useState(null);

  // Helper to strip legacy ":1" suffixes from IDs
  const sanitizeId = (id) => String(id || '').split(':')[0];

  const fetchSprintProgress = async (targetId, currentProjectName) => {
    // Guard against undefined or missing IDs to prevent 404 console spam
    const sid = sanitizeId(targetId);
    if (!sid || sid === 'undefined' || !currentProjectName) return;

    // Check cache
    const cached = localStorage.getItem(`sprint_progress_${sid}_${currentProjectName}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: parsed.status }));
        setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: parsed.progress }));
      } catch (e) { }
    }

    try {
      const res = await fetch(`${BASE_URL}/api/sprint-updates/${sid}`);
      if (res.ok) {
        const data = await res.json();
        const respName = data.project_name || data.projectName;
        if (!respName || respName === currentProjectName) {
          setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: data.sprint_status || data.sprintStatus || 'Pending' }));
          setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: data.progress_percentage || data.progressPercentage || data.progress || 0 }));
          localStorage.setItem(`sprint_progress_${targetId}_${currentProjectName}`, JSON.stringify({ 
            status: data.sprint_status || data.sprintStatus || 'Pending', 
            progress: data.progress_percentage || data.progressPercentage || data.progress || 0 
          }));
        }
      }
    } catch (e) { }
  };

  const [taskDetailMap, setTaskDetailMap] = useState({});
  const fetchTaskDetail = async (tid) => {
    const sid = sanitizeId(tid);
    if (!sid) return;
    try {
      const res = await fetch(API_ENDPOINTS.SINGLE_TASK_DETAIL(sid));
      if (res.ok) {
        const data = await res.json();
        setTaskDetailMap(prev => ({ ...prev, [tid]: data }));
      }
    } catch {}
  };

  const syncSprintToBackend = async (projName, st, prog, taskId = null) => {
    try {
      const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
      localStorage.setItem(`sprint_progress_${uid}_${projName}`, JSON.stringify({ status: st, progress: prog }));
      
      // Dual-action sync: Attempt both specific task update and global sprint log
      const suid = sanitizeId(uid);
      const payloads = [
        fetch(`${BASE_URL}/api/sprint-updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: projName,
            teamLeaderId: suid, // for backward compat/tracking
            userId: suid,
            sprintStatus: st,
            progressPercentage: prog,
            taskId: taskId
          })
        })
      ];

      if (taskId) {
        const sid = sanitizeId(taskId);
        payloads.push(fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(sid), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: st, progress: prog })
        }));
      }

      // Also mirror to Daily TASK_UPDATES so it shows in the report log
      payloads.push(fetch(API_ENDPOINTS.TASK_UPDATES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          userName: user?.name,
          tasks: [{ text: `Status update for ${projName}: ${st} (${prog}%)`, id: Date.now() }],
          overallStatus: st,
          projectName: projName,
          timestamp: new Date().toISOString()
        })
      }));

      await Promise.all(payloads);
    } catch (e) {
      console.error("Sprint Sync Error:", e);
    }
  };

  const handleSprintStatusClick = (projName, st, taskId = null) => {
    const curStatus = sprintStatusMap[projName] || 'Pending';
    if (curStatus === 'Completed') return;

    if (st === 'Completed') {
      setPendingStatusData({ projName, st, taskId });
      setShowFinalizeModal(true);
    } else {
      const curProg = sprintProgressMap[projName] || 0;
      let newProgress = curProg;

      if (st === 'Pending') {
        // Pending should always reset to 5% and not increase
        newProgress = 5;
      } else if (st === 'In Progress') {
        // In Progress increases the progress
        newProgress = Math.min(95, curProg + 5);
        if (newProgress < 10) newProgress = 10; // Ensure it's higher than Pending
      }
      
      setSprintStatusMap(prev => ({ ...prev, [projName]: st }));
      setSprintProgressMap(prev => ({ ...prev, [projName]: newProgress }));
      syncSprintToBackend(projName, st, newProgress, taskId);
    }
  };

  const confirmStatusChange = () => {
    if (!pendingStatusData) return;
    const { projName, st, taskId } = pendingStatusData;
    
    let newProgress = sprintProgressMap[projName] || 0;
    if (st === 'Pending') {
      newProgress = 5;
    } else if (st === 'In Progress') {
      newProgress = Math.min(95, newProgress + 5);
    } else if (st === 'Completed') {
      newProgress = 100;
    }

    setSprintStatusMap(prev => ({ ...prev, [projName]: st }));
    setSprintProgressMap(prev => ({ ...prev, [projName]: newProgress }));
    syncSprintToBackend(projName, st, newProgress, taskId).then(() => {
      if (st === 'Completed') setTimeout(() => fetchTaskHistory(), 2000);
    });

    if (st === 'Completed') {
      setNotificationFeedback(`Success: ${projName} marked as Completed!`);
      setTimeout(() => setNotificationFeedback(null), 3000);
    }
    
    setShowFinalizeModal(false);
    setPendingStatusData(null);
  };

  const [notificationFeedback, setNotificationFeedback] = useState(null);

  // Secondary Data
  const [birthdaysList, setBirthdaysList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [newJoinees, setNewJoinees] = useState([]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    if (user) {
      // Fast Hydration: Try to load from cache immediately
      try {
        const cachedInd = localStorage.getItem(`ind_projects_${user.id}`);
        const cachedTeam = localStorage.getItem(`team_projects_${user.id}`);
        const cachedReviews = localStorage.getItem(`reviews_${user.id}`);
        const cachedCompletion = localStorage.getItem(`yesterday_completion_${user.id}`);
        if (cachedInd) setIndividualProjects(JSON.parse(cachedInd));
        if (cachedTeam) setTeamProjects(JSON.parse(cachedTeam));
        if (cachedReviews) setTaskReviews(JSON.parse(cachedReviews));
        // Optimistic hydration: if 0 or missing, assume 100 per user request
        setYesterdayCompletion(cachedCompletion ? (Number(cachedCompletion) || 100) : 100);
      } catch (e) {}

      fetchTaskHistory();
      fetchSecondaryData();
      fetchCoursesAndProgress();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const fetchSecondaryData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Integrated Birthdays API Suite (Strictly following user endpoints)
      const bEndpoints = [`${BASE_URL}/api/birthdays`, `${BASE_URL}/api/birthday-list`, `${BASE_URL}/api/employees/birthdays`];
      let bData = [];
      for (const ep of bEndpoints) {
        try {
          const res = await fetch(ep, { headers });
          if (res.ok) {
            const raw = await res.json();
            const list = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
            list.forEach(item => {
              const bestDate = item.dob || item.dateOfBirth || item.date || item.birthday;
              if (bestDate && !bData.some(p => (p.name || '').toLowerCase() === (item.name || '').toLowerCase())) {
                bData.push({ ...item, date: bestDate });
              }
            });
          }
        } catch (e) {}
      }

      const [hRes, njRes] = await Promise.allSettled([
        fetch(API_ENDPOINTS.HOLIDAYS, { headers }).catch(() => null),
        fetch(API_ENDPOINTS.NEW_JOINEES_GET || API_ENDPOINTS.NEW_JOINEE, { headers }).catch(() => null)
      ]);

      if (bData.length > 0) {



        const parseSafe = (d) => {
          if (!d) return new Date();
          if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)) {
            const p = d.split(/[-/]/);
            return new Date(`${p[2]}-${p[1]}-${p[0]}`);
          }
          return new Date(d);
        };

        const getNextOccurrence = (d) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let bDate = parseSafe(d);
          let occurrence = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
          
          if (occurrence < today) {
            occurrence.setFullYear(today.getFullYear() + 1);
          }
          return occurrence;
        };

        // Sort by how soon the next occurrence is
        const sorted = [...bData].sort((a, b) => {
          const nextA = getNextOccurrence(a.date || a.dob);
          const nextB = getNextOccurrence(b.date || b.dob);
          return nextA - nextB;
        });

        // Filter: only show if occurrence is today or in the future (all should be future now)
        setBirthdaysList(sorted);
      }
      if (hRes.status === 'fulfilled' && hRes.value && hRes.value.ok) {
        const json = await hRes.value.json();
        setHolidays(Array.isArray(json) ? json : (json?.data || []));
      }
      if (njRes.status === 'fulfilled' && njRes.value && njRes.value.ok) {
        const json = await njRes.value.json();
        setNewJoinees(Array.isArray(json) ? json : (json?.data || []));
      }

      // Fetch Suggestions
      try {
        const response = await fetch(API_ENDPOINTS.SUGGESTIONS, {
          headers: { 'Authorization': `Bearer ${token?.trim()}` }
        });
        
        if (response.ok) {
          const sData = await response.json();
          setSuggestions(Array.isArray(sData) ? sData : (sData.data || []));
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      }
      
    } catch (err) { 
      // This catch is only for catastrophic failures in the promise setup
      console.warn("Secondary optional data fetch reduced:", err); 
    }
  };

  const fetchCoursesAndProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(API_ENDPOINTS.COURSES, { headers });
      if (res.ok) {
        const catalog = await res.json();
        setAllCourses(catalog);
        const uid = user?.id || user?.userId || user?.empId || user?.employee_id || 'unknown';
        const savedProgress = localStorage.getItem(`courseProgressRecords_${uid}`);

        let inProgress = [];
        if (savedProgress) {
          const map = JSON.parse(savedProgress);
          inProgress = catalog.filter(c => {
            const p = map[c.id]?.progress || 0;
            return p > 0 && p < 100;
          }).map(c => ({
            ...c,
            currentProgress: map[c.id].progress
          }));
        }
        setActiveCourses(inProgress);
      }
    } catch { }
  };

  const fetchTaskHistory = async () => {
    const uid = user?.id || user?.empId || user?.employee_id || user?.userId;
    if (!uid) return;

    let sortedLogs = []; // Initialize early to avoid scope errors
    let backendYestRec = null; 
    let finalTodayTasks = []; // Declare early for merge logic
    let finalYestTasks = [];  // Declare early for merge logic
    const todayDate = new Date();
    const yesterdayDate = new Date(Date.now() - 86400000);
    const getLogDate = (r) => r.timestamp || r.created_at || r.date || r.Date || r.CreatedAt;
    const isSameDay = (d1, d2String) => {
      try {
        const date1 = new Date(d1);
        const date2 = new Date(d2String);
        return date1.toDateString() === date2.toDateString();
      } catch { return false; }
    };

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Parallel fetching of core data streams with silent resilience
      let assignedResp = null, logsResp = null, profileResp = null;
      try {
        const results = await Promise.all([
          fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid), { headers }).catch(() => null),
          fetch(API_ENDPOINTS.TASK_UPDATES_USER(uid), { headers }).catch(() => null),
          (!user?.manager_id && user?.email) ? fetch(API_ENDPOINTS.PROFILE(user.email), { headers }).catch(() => null) : Promise.resolve(null)
        ]);
        [assignedResp, logsResp, profileResp] = results;
      } catch (err) {
        console.warn("[Dashboard] Connection Timeout. Loading from cache.");
      }

      // 1. Process Individual Assignments
      if (assignedResp && assignedResp.ok) {
        const list = await assignedResp.json();
        const tasksData = (Array.isArray(list) ? list : (list.value || list.data || []));
        const validTasksData = tasksData.filter(p => !!(p && (p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title || p.taskTitle)));
        
        setIndividualProjects(validTasksData);
        setAssignedTasksList(validTasksData);
        safeSetItem(`ind_projects_${user.id}`, JSON.stringify(validTasksData));

        if (validTasksData.length > 0) {
          const latest = validTasksData[validTasksData.length - 1];
          setProjectInfo({
            name: latest.task_name || latest.taskName || latest.projectName || latest.project_name || latest.project || 'Unassigned Project',
            description: latest.projectDescription || latest.project_description || latest.task_text || latest.task_description || 'No project details provided.',
            deadline: latest.deadline || latest.end_date || null,
            assigner: latest.assignedBy || latest.assigned_by || 'Management',
            fileUrl: latest.file_url || latest.file_path || latest.attachment || latest.pdf_url || latest.task_file || null
          });
        }

        // Parallel processing of supplementary task data
        tasksData.forEach(t => {
          const pName = t.projectName || t.project_name || t.project || t.task_name;
          const mId = user?.manager_id || user?.tl_id || user?.team_leader_id || user?.reporting_manager_id || uid;
          fetchSprintProgress(mId, pName);
          const tid = t.id || t.assigned_id || t.task_id || t.assignment_id;
          if (tid) fetchTaskDetail(tid);
        });
      }

      // 2. Process Manager / Team Projects
      let mId = user?.manager_id || user?.tl_id || user?.team_leader_id || user?.reporting_manager_id || user?.managerId || user?.reportingManagerId;
      if (!mId && profileResp && profileResp.ok) {
        const mData = await profileResp.json();
        mId = mData?.id || mData?.manager_id || mData?.userId || mData?.managerId || mData?.reporting_manager_id;
      }

      if (mId && String(mId) !== String(uid) && String(mId) !== 'undefined') {
        const sid = sanitizeId(mId);
        if (sid && sid !== 'undefined') {
          const teamResp = await fetch(API_ENDPOINTS.TASKS_ASSIGNED(sid)).catch(() => null);
          if (teamResp && teamResp.ok) {
            const tList = await teamResp.json().catch(() => []);
            const tData = Array.isArray(tList) ? tList : (tList.value || tList.data || []);
            const validT = tData.filter(t => {
              if (!t) return false;
              const nameRaw = t.projectName || t.project_name || t.project || t.task_name || t.taskName || t.title || t.taskTitle || '';
              const pName = String(nameRaw).toLowerCase();
              return pName !== '' && !pName.includes('individual');
            });
            setTeamProjects(validT);
            safeSetItem(`team_projects_${user.id}`, JSON.stringify(validT));
          }
        }
      }

      // 3. Process Task Logs (Yesterday/Today)
      const parseTasks = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return []; }
      };

      // ── Helper: build a localStorage key for a given Date object ──
      const lsKey = (uid, d) => `task_log_${uid}_${d.toISOString().slice(0, 10)}`;

      if (logsResp && logsResp.ok) {
        const lData = await logsResp.json();
        const list = Array.isArray(lData) ? lData : (lData.value || lData.data || []);
        console.log('[Dashboard] task-updates from backend:', list.length, 'records', list);

        sortedLogs = list.sort((a, b) => new Date(getLogDate(b)) - new Date(getLogDate(a)));
        
        const todayLogs = sortedLogs.filter(r => isSameDay(todayDate, getLogDate(r)));
        const yestLogs  = sortedLogs.filter(r => isSameDay(yesterdayDate, getLogDate(r)));

        // Merge all tasks from all records for the day to avoid missing data
        const mergeTasks = (logs) => {
          return logs.reduce((acc, r) => {
            const tasks = parseTasks(r.tasks || r.task_list || r.content);
            return [...acc, ...tasks];
          }, []).sort((a, b) => {
            const idA = typeof a === 'object' ? Number(a.id || 0) : 0;
            const idB = typeof b === 'object' ? Number(b.id || 0) : 0;
            return idB - idA; // Newest first
          });
        };

        finalTodayTasks = mergeTasks(todayLogs);
        finalYestTasks  = mergeTasks(yestLogs);

        setTodayTasks(finalTodayTasks);
        setYesterdayTasks(finalYestTasks);

        if (todayLogs.length > 0) {
          setTodayStatus(todayLogs[0].overallStatus || todayLogs[0].status || 'Pending');
        }
        if (yestLogs.length > 0) {
          setYesterdayStatus(yestLogs[0].overallStatus || yestLogs[0].status || 'Pending');
        }

        // Keep backendYestRec for legacy logic if needed (e.g. completion %)
        backendYestRec = yestLogs[0] || null;

        if (!backendYestRec) {
          backendYestRec = sortedLogs.filter(r => !isSameDay(todayDate, getLogDate(r)))[0] || null;
        }

        // Cache Reviews
        const reviewMap = {};
        list.forEach(t => {
          const tid = t.id || t.assigned_id || t.task_id;
          const rev = t.task_review || t.taskReview || t.review || t.reviewText || t.feedback || t.managerReview;
          if (tid && rev) reviewMap[tid] = rev;
        });
        setTaskReviews(prev => {
          const next = { ...prev, ...reviewMap };
          localStorage.setItem(`reviews_${user.id}`, JSON.stringify(next));
          return next;
        });
      } else {
        console.warn('[Dashboard] task-updates endpoint returned:', logsResp.status, '— falling back to localStorage');
      }

      // ── Merge backend records with localStorage cache ──
      // localStorage is ALWAYS written on save, so it works even when backend fails.
      const lsTodayRaw = localStorage.getItem(lsKey(uid, todayDate));
      const lsYestRaw  = localStorage.getItem(lsKey(uid, yesterdayDate));
      const lsTodayRec = lsTodayRaw ? JSON.parse(lsTodayRaw) : null;
      const lsYestRec  = lsYestRaw  ? JSON.parse(lsYestRaw)  : null;

      // Define finalYestRec for legacy performance calculations below
      let backendYestMatch = null;
      try {
        if (sortedLogs) {
          backendYestMatch = sortedLogs.filter(r => isSameDay(yesterdayDate, getLogDate(r)))[0];
        }
      } catch { }
      const finalYestRec = backendYestMatch || lsYestRec;

      // Prefer merged backend records; fall back to localStorage if empty
      if (finalTodayTasks.length === 0 && lsTodayRec) {
        setTodayTasks(parseTasks(lsTodayRec.tasks));
        setTodayStatus(lsTodayRec.overallStatus);
      }
      if (finalYestTasks.length === 0 && lsYestRec) {
        setYesterdayTasks(parseTasks(lsYestRec.tasks));
        setYesterdayStatus(lsYestRec.overallStatus);
      }



      // Note: Today/Yesterday tasks already set in backend merge logic above
      // This section is kept for any additional side effects if needed.


      // Calculate Yesterday's Completion Dynamically (Based on Assigned Tasks + Log Status)
      if (finalYestRec) {
        const yestTasks = parseTasks(finalYestRec.tasks || finalYestRec.task_list || finalYestRec.content);
        setYesterdayTasks(yestTasks);
        
        const yStatus = finalYestRec.overallStatus || finalYestRec.status || 'Pending';
        setYesterdayStatus(yStatus);
        
        let percentage = 0;
        if (yStatus === 'Completed') {
          percentage = 100;
        } else {
          // Calculate based on the actual progress of assigned projects
          // This ensures the % is tied to the "tasks which we have assigned"
          const currentProjects = individualProjects.filter(p => !!(p && (p.projectName || p.project_name || p.project || p.task_name)));
          
          if (currentProjects.length > 0) {
            const totalProg = currentProjects.reduce((acc, p) => {
              // Try to get real-time progress from the sprint map or the task itself
              const pName = p.projectName || p.project_name || p.task_name;
              const pProg = sprintProgressMap[pName] || p.progress_percentage || p.progressPercentage || p.progress || 0;
              return acc + Number(pProg);
            }, 0);
            percentage = Math.round(totalProg / currentProjects.length);
          } else {
            // Default mappings if no specific project progress is available
            percentage = (yStatus === 'In Progress') ? 70 : 30;
          }
        }
        
        // Final sanity check: if status is In Progress, don't show 100
        if (yStatus !== 'Completed' && percentage >= 100) percentage = 95;

        setYesterdayCompletion(percentage);
        localStorage.setItem(`yesterday_completion_${user.id}`, String(percentage));
      } else {
        setYesterdayCompletion(0);
        setYesterdayStatus('No Data');
      }

    } catch (err) {
      console.error("[Dashboard] Performance Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTasks = async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    const mId = sanitizeId(user?.manager_id || user?.tl_id || user?.team_leader_id || user?.reporting_manager_id || user?.managerId || user?.reportingManagerId || '1');

    if (!uid) {
      alert('Session error: User ID not found. Please re-login.');
      return;
    }

    const now = Date.now();
    const cleanTasks = editBuffer
      .filter(t => t.text && t.text.trim() !== '')
      .map((t, idx) => {
        // ALWAYS refresh the timestamp ID on save to ensure the timing reflects the actual last-update moment
        // This solves the issue of edited tasks keeping old timestamps.
        return { ...t, id: now + idx };
      });

    const payload = {
      userId: Number(uid),
      user_id: Number(uid),        // some backends expect snake_case
      userName: user?.name || 'Employee',
      user_name: user?.name || 'Employee',
      role: user?.role || 'Employee',
      managerId: Number(mId),
      manager_id: Number(mId),
      reportingManagerId: Number(mId),
      reporting_manager_id: Number(mId),
      teamName: user?.team || user?.teamName || 'General',
      team_name: user?.team || user?.teamName || 'General',
      projectName: 'Daily Tasks',
      project_name: 'Daily Tasks',
      tasks: cleanTasks, // Send full objects with updated IDs
      overallStatus: editStatus || 'Pending',
      overall_status: editStatus || 'Pending',
      timestamp: new Date().toISOString()
    };

    // ── STEP 1: Always persist to localStorage first (survives backend failures) ──
    const todayKey = `task_log_${uid}_${new Date().toISOString().slice(0, 10)}`;
    const localRecord = {
      tasks: cleanTasks,
      overallStatus: editStatus || 'Pending',
      timestamp: new Date().toISOString()
    };
    safeSetItem(todayKey, JSON.stringify(localRecord));
    console.log('[Dashboard] Tasks saved to localStorage key:', todayKey, localRecord);

    // ── STEP 2: Update UI immediately ──
    setTodayTasks(cleanTasks);
    setTodayStatus(editStatus || 'Pending');
    setIsEditing(false);

    // ── STEP 3: Try to sync to backend ──
    try {
      console.log('[Dashboard] Sending to backend:', API_ENDPOINTS.TASK_UPDATES, payload);
      const res = await fetch(API_ENDPOINTS.TASK_UPDATES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const responseData = await res.json().catch(() => ({}));
        setNotificationFeedback('✅ Tasks saved to database!');
        setTimeout(() => fetchTaskHistory(), 1000);
      } else {
        const errText = await res.text();
        // Log full details for teammate to debug backend
        console.error(
          '❌ [Dashboard] Backend REJECTED save request\n',
          'Status:', res.status, res.statusText, '\n',
          'URL:', API_ENDPOINTS.TASK_UPDATES, '\n',
          'Payload sent:', JSON.stringify(payload, null, 2), '\n',
          'Backend response:', errText
        );
        setNotificationFeedback('⚠️ Saved locally — backend returned ' + res.status + '. Show console to teammate.');
      }
    } catch (err) {
      console.error('❌ [Dashboard] Network error saving tasks — backend may be down\n', err);
      setNotificationFeedback('⚠️ Saved locally — backend unreachable. Tasks will appear in Yesterday card.');
    }

    setTimeout(() => setNotificationFeedback(null), 6000);
  };

  const startEditing = () => {
    // Normalize tasks to ensure they are objects { text: '', id: ... } 
    // This prevents crashes if legacy data is in string format.
    const normalized = todayTasks.map((t, idx) => {
      if (typeof t === 'string') return { text: t, id: Date.now() + idx };
      // Ensure we don't reset existing IDs if they are already timestamps
      if (!t.id || isNaN(Number(t.id)) || Number(t.id) < 1000000000000) {
        return { ...t, id: Date.now() + idx };
      }
      return t;
    });
    setEditBuffer(normalized.length > 0 ? normalized : [{ text: '', id: Date.now() }]);
    setEditStatus(todayStatus);
    setIsEditing(true);
  };

  const sendBirthdayWish = async (person) => {
    try {
      const uid = user?.id || user?.userId || user?.empId || user?.employee_id;
      const suid = sanitizeId(uid);
      const payload = {
        userId: Number(suid),
        user_id: Number(suid),
        userName: user?.name || 'Employee',
        user: user?.name || 'Employee',
        role: user?.role?.toUpperCase() || 'EMPLOYEE',
        tagline: 'Birthday Wish! 🎂',
        content: `Happy Birthday ${person.name}! 🎂🎉 Wish you a great day and a fantastic year ahead! from ${user?.name || 'Employee'}`
      };
      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert(`Birthday wish sent for ${person.name}!`);
    } catch { }
  };

  const s = {
    page: { 
      paddingTop: winWidth < 768 ? '10px' : '20px', 
      paddingLeft: winWidth < 768 ? '15px' : '40px',
      paddingRight: winWidth < 768 ? '15px' : '40px',
      paddingBottom: '120px', 
      maxWidth: '100%', 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: winWidth < 768 ? '15px' : '30px', 
      fontFamily: "'Inter', sans-serif", 
      overflowX: 'hidden' 
    },
    grid: { display: 'flex', flexDirection: 'column', gap: winWidth < 768 ? '12px' : '25px' },
    mainCard: { backgroundColor: 'white', borderRadius: winWidth < 768 ? '25px' : '45px', padding: winWidth < 768 ? (winWidth < 480 ? '10px' : '15px') : '35px 45px 45px', minHeight: '280px', boxShadow: '0 20px 60px rgba(0,0,0,0.02)', border: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column' },
    mainTitle: { fontSize: winWidth < 768 ? '14px' : '18px', fontWeight: '800', color: '#0B1E3F', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    taskGrid: { display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1.1fr 1fr', gap: '25px', marginTop: '5px', paddingTop: '10px', borderTop: '1.5px solid #f8fafc' },
    yesterdayBox: { backgroundColor: '#ebf9f1', borderRadius: '30px', padding: '22px' },
    yesterdayLabel: { display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', fontWeight: '1000', fontSize: '16px', marginBottom: '12px' },
    yesterdayText: { fontSize: '14px', color: '#16a34a', fontWeight: '700' },
    todayBox: { backgroundColor: 'white', borderRadius: '30px', padding: '22px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' },
    todayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    todayLabel: { display: 'flex', alignItems: 'center', gap: '10px', color: '#1E40AF', fontWeight: '1000', fontSize: '16px' },
    editBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '12px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#0B1E3F' },
    taskItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', color: '#1e293b', fontWeight: '700', fontSize: '13px', lineHeight: '1.4' },
    statusBadge: { fontSize: '10px', fontWeight: '1000', padding: '6px 14px', borderRadius: '10px', background: '#f1f5f9', color: '#0B1E3F', width: 'fit-content', marginTop: '12px' },
    liveBadge: { fontSize: '10px', fontWeight: '1000', color: '#cbd5e1', alignSelf: 'flex-end', marginTop: 'auto' },
    statsCard: { backgroundColor: 'white', borderRadius: '45px', padding: '45px', boxShadow: '0 20px 60px rgba(0,0,0,0.02)', border: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minWidth: '300px' }
  };

  const avatarInitial = (name = '') => name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div style={s.page}>
      <div style={s.grid}>
        {/* ────── ATTENDANCE PORTAL SECTION ────── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ ...s.mainTitle, fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="#3B5998" /> Attendance Tracking
          </div>
          <div 
            onClick={(e) => { e.stopPropagation(); setActiveTab('ATTENDANCE'); }}
            style={{ 
              padding: '30px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '35px', 
              border: '2px solid #dbeafe', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '25px', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              boxShadow: '0 10px 20px rgba(59, 89, 152, 0.05)' 
            }}
          >
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Calendar size={28} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>My Attendance</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a8a' }}>Log History</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', backgroundColor: 'white', borderRadius: '15px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a' }}>● Live updates</span>
            </div>
            <ChevronRight size={24} color="#94a3b8" />
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1fr 320px', gap: '30px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ ...s.mainCard, minHeight: 'fit-content', padding: winWidth < 768 ? '25px' : '35px' }}>
              <div style={{ ...s.mainTitle, fontSize: winWidth < 768 ? '17px' : '18px', marginBottom: winWidth < 768 ? '15px' : '25px' }}>Team Command Center</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: winWidth < 768 ? '15px' : '25px', marginBottom: '35px' }}>
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('PROJECTS', { view: 'INDIVIDUAL' }); }}
                  style={{ padding: winWidth < 768 ? '20px' : '30px', backgroundColor: '#3B5998', borderRadius: '35px', border: '1.5px solid #3B5998', display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '15px' : '25px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 15px 30px rgba(59, 89, 152, 0.15)' }}
                >
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: winWidth < 768 ? '10px' : '15px', borderRadius: '50%' }}>
                    <User size={winWidth < 768 ? 22 : 28} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>Individual</div>
                    <div style={{ fontSize: winWidth < 768 ? '18px' : '20px', fontWeight: '900', color: 'white' }}>{individualProjects.length} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Projects</span></div>
                  </div>
                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </div>
 
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('PROJECTS', { view: 'TEAM' }); }}
                  style={{ padding: winWidth < 768 ? '20px' : '30px', backgroundColor: '#f8fafc', borderRadius: '35px', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '15px' : '25px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '50%' }}>
                    <Users size={28} color="#3B5998" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>Team</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{teamProjects.length} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700' }}>Projects</span></div>
                  </div>
                  <ChevronRight size={20} color="#cbd5e1" />
                </div>
              </div>

              <div style={s.taskGrid}>
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('FOCUS_LOGS'); }}
                  style={{ ...s.yesterdayBox, cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={s.yesterdayLabel}>
                      <CheckCircle2 size={20} color="#16a34a" /> Yesterday
                    </div>
                    {yesterdayTasks.length > 0 && (
                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} />
                        {(() => {
                           // Use the MOST RECENT task's ID for the card timing
                           const validTs = yesterdayTasks
                             .map(t => typeof t === 'object' ? Number(t.id) : null)
                             .filter(id => !isNaN(id) && id > 1000000000000);
                           const latestId = validTs.length > 0 ? Math.max(...validTs) : null;
                           return latestId
                             ? new Date(latestId).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                             : '';
                        })()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
                    {yesterdayTasks.slice(0, 3).map((t, i) => {
                      const taskId = typeof t === 'object' ? Number(t.id) : null;
                      const timeStr = (!isNaN(taskId) && taskId > 1000000000000)
                        ? new Date(taskId).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                        : '';
                      return (
                        <div key={i} style={{ ...s.taskItem, padding: 0, border: 'none', background: 'transparent' }}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <span style={{ fontSize: '12px', color: '#475569' }}>
                            {typeof t === 'string' ? t : t.text} 
                            {timeStr && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>({timeStr})</span>}
                          </span>
                        </div>
                      );
                    })}
                    {yesterdayTasks.length > 3 && <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>+ {yesterdayTasks.length - 3} more</div>}
                  </div>
                  <div style={{...s.statusBadge, background: '#ebf9f1', color: '#16a34a' }}>{yesterdayStatus}</div>
                </div>

                <div style={s.todayBox} onClick={(e) => e.stopPropagation()}>
                  <div style={s.todayHeader}>
                    <div style={s.todayLabel}>
                      <TrendingUp size={20} color="#1E40AF" /> Today
                    </div>
                    {!isEditing ? (
                      <button style={s.editBtn} onClick={startEditing}>
                        <Edit3 size={14} color="#0B1E3F" /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ ...s.editBtn, background: '#f8fafc', color: '#64748b' }} onClick={() => setIsEditing(false)}>Cancel</button>
                        <button style={{ ...s.editBtn, background: '#1e40af', color: 'white', border: 'none' }} onClick={handleSaveTasks}>Save</button>
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                       {/* Manual Logged Tasks ONLY (as requested to remove assigned projects from here as well) */}
                       {todayTasks.length > 0 ? (
                         todayTasks.map((t, i) => {
                           const taskId = typeof t === 'object' ? Number(t.id) : null;
                           const timeStr = (!isNaN(taskId) && taskId > 1000000000000)
                             ? new Date(taskId).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                             : '';
                           return (
                             <div key={i} style={s.taskItem}>
                               <CheckCircle2 size={14} color="#3b82f6" />
                               <span style={{ flex: 1 }}>{typeof t === 'string' ? t : t.text}</span>
                               {timeStr && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>{timeStr}</span>}
                             </div>
                           );
                         })
                       ) : (
                         <div style={{ ...s.taskItem, color: '#94a3b8' }}>Plan your day. Update your tasks here.</div>
                       )}
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px' }}>
                           <div style={{...s.statusBadge, marginTop: 0 }}>{todayStatus}</div>
                           <div style={s.liveBadge}>Live Updates</div>
                       </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      {editBuffer.map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                             type="text"
                             value={t.text}
                             onChange={(e) => {
                               const nb = [...editBuffer];
                               nb[i].text = e.target.value;
                               setEditBuffer(nb);
                             }}
                             style={{ flex: 1, padding: '10px 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                             placeholder="Type task details..."
                          />
                          <button onClick={() => setEditBuffer(editBuffer.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setEditBuffer([...editBuffer, { text: '', id: Date.now() }])} style={{ padding: '8px', borderRadius: '8px', border: '1.5px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '5px' }}>
                         + Add Task
                      </button>
                      <div style={{ marginTop: '15px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>End of day status override</div>
                        <select 
                          value={editStatus} 
                          onChange={e => setEditStatus(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '700' }}
                        >
                          <option value="Pending">Pending (Default)</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed (Finalized)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {notificationFeedback && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '10px 25px', borderRadius: '40px', fontSize: '13px', fontWeight: '1000', zIndex: 10000, boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}>
                    {notificationFeedback}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={{ ...s.statsCard, minHeight: 'fit-content', padding: '30px', borderRadius: winWidth < 768 ? '25px' : '45px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', textAlign: 'center', letterSpacing: '0.5px', marginBottom: '24px' }}>Yesterday's<br />completion</div>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: `radial-gradient(closest-side, white 79%, transparent 80% 100%), conic-gradient(#0B1E3F ${yesterdayCompletion}%, #f1f5f9 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>{yesterdayCompletion}%</span>
            </div>
            <div style={{ marginTop: '24px', fontSize: '11px', color: yesterdayCompletion === 100 ? '#16a34a' : '#64748b', fontWeight: '800', textAlign: 'center', backgroundColor: yesterdayCompletion === 100 ? '#ebf9f1' : '#f8fafc', padding: '10px 20px', borderRadius: '15px' }}>
              {yesterdayCompletion === 100 ? 'Full Success!' : yesterdayCompletion > 0 ? 'In Progress' : 'Verified'}
            </div>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: '32px', marginTop: '32px' }}>
          <div style={{ ...s.mainCard, display: 'flex', flexDirection: 'column', minHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '10px' }}><Gift size={24} /> Birthdays</div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#fb7185' }}>Celebrations</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {birthdaysList.slice(0, 2).map((b, idx) => {
                const isToday = new Date(b.date).toDateString() === new Date().toDateString();
                return (
                  <div key={idx} style={{ padding: '16px 20px', backgroundColor: '#fff1f2', borderRadius: '20px', border: '1px solid #ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e11d48', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', flexShrink: 0, overflow: 'hidden' }}>
                        {b.profileImage ? <img src={`${BASE_URL}${b.profileImage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : avatarInitial(b.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#881337' }}>{b.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#fb7185' }}>{new Date(new Date().getFullYear(), new Date(b.date).getMonth(), new Date(b.date).getDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                    </div>
                    {isToday && <button onClick={() => sendBirthdayWish(b)} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#e11d48', color: 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}>Wish him/her</button>}
                  </div>
                );
              })}
              {birthdaysList.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#fb7185', fontWeight: '700', fontSize: '13px', backgroundColor: '#fff1f2', borderRadius: '20px' }}>No upcoming birthdays.</div>}
            </div>
            <button onClick={() => { if (typeof setActiveTab === 'function') setActiveTab('BIRTHDAYS'); }} style={{ marginTop: '20px', padding: '12px', width: '100%', borderRadius: '15px', border: '1.5px solid #ffe4e6', backgroundColor: 'transparent', color: '#e11d48', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'block' }}>More celebrations</button>
          </div>

          <div style={{ ...s.mainCard, display: 'flex', flexDirection: 'column', minHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706', display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={24} /> Holidays</div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#fbbf24' }}>Public calendar</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {holidays.filter(h => new Date(h.date) >= new Date().setHours(0, 0, 0, 0)).slice(0, 2).map((h, idx) => (
                <div key={idx} style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderRadius: '20px', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#d97706', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}><Calendar size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#0B1E3F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                    <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '800', marginTop: '4px' }}>{new Date(h.date).toLocaleString('default', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              ))}
              {holidays.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#d97706', fontWeight: '700', fontSize: '13px', backgroundColor: '#fffbeb', borderRadius: '20px' }}>No upcoming holidays.</div>}
            </div>
            <button onClick={() => { if (typeof setActiveTab === 'function') setActiveTab('CALENDAR'); }} style={{ marginTop: '20px', padding: '12px', width: '100%', borderRadius: '15px', border: '1.5px solid #fef3c7', backgroundColor: 'transparent', color: '#d97706', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'block' }}>More holidays</button>
          </div>
        </div>

        {/* Team Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '2px solid #cbd5e1', marginTop: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={24} color="#f59e0b" /> Team Suggestions
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestions.slice(0, 3).map((sug, i) => (
                <div key={i} style={{ padding: '14px 18px', borderRadius: '18px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>
                    {sug.employee_name || 'Anonymous'}
                  </div>
                  {sug.requirement && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                      <strong>Req:</strong> {sug.requirement}
                    </div>
                  )}
                  {sug.suggestion && (
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <strong>Idea:</strong> {sug.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <SaturdayRequirementsPopover />
      {/* Finalize Task Modal */}
      <AnimatePresence>
        {showFinalizeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 30px 70px rgba(0,0,0,0.3)' }}
            >
              <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle2 size={32} color="#1e3a8a" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', marginBottom: '12px' }}>Finalize Task?</h2>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                Are you sure you want to mark <span style={{ fontWeight: '800', color: '#1e3a8a' }}>{pendingStatusData?.projName}</span> as <span style={{ fontWeight: '800' }}>{pendingStatusData?.st}</span>? 
                {pendingStatusData?.st === 'Completed' && " This will set progress to 100%."}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowFinalizeModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStatusChange}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(11, 30, 63, 0.2)' }}
                >
                  Yes, {pendingStatusData?.st === 'Completed' ? 'Complete' : 'Update'} it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
