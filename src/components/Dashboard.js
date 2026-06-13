import React, { useState, useEffect } from 'react';
import { useAuth, checkAuthOnce } from '../context/AuthContext';
import { CheckCircle2, Edit3, TrendingUp, Clock, Gift, Calendar, Trash2, User, Users, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_ENDPOINTS, BASE_URL } from '../config';
import { safeSetItem } from '../context/AuthContext';

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

const Dashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Real Data State
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [yesterdayStatus, setYesterdayStatus] = useState('Pending');
  const [yesterdayCompletion, setYesterdayCompletion] = useState(0);
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
      const authOk = await checkAuthOnce();
      if (!authOk) return;
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      if (!cleanToken) return;

      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      };
      const res = await fetch(`${BASE_URL}/api/sprint-updates/${sid}`, { headers });
      if (res.ok) {
        const raw = await res.json();
        const dataArr = Array.isArray(raw) ? raw : (raw.value && Array.isArray(raw.value) ? raw.value : [raw]);

        // Find the latest update for this specific project by searching in reverse
        const data = [...dataArr].reverse().find(d => {
          if (!d) return false;
          const respName = d.project_name || d.projectName;
          return respName === currentProjectName;
        });

        if (data) {
          const newStatus = data.sprint_status || data.sprintStatus;
          const newProg = data.progress_percentage || data.progressPercentage || data.progress;

          const currentCached = localStorage.getItem(`sprint_progress_${sid}_${currentProjectName}`);
          let isLocallyCompleted = false;
          try {
            if (currentCached) {
              const parsed = JSON.parse(currentCached);
              if (parsed.status === 'Completed' || parsed.progress === 100) {
                isLocallyCompleted = true;
              }
            }
          } catch (e) { }

          if (isLocallyCompleted) {
            setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: 'Completed' }));
            setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: 100 }));
          } else {
            if (newStatus) setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: newStatus }));
            if (newProg !== undefined && newProg !== null) {
              setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: newProg }));
              localStorage.setItem(`sprint_progress_${sid}_${currentProjectName}`, JSON.stringify({
                status: newStatus || 'Pending',
                progress: newProg
              }));
            }
          }
        }
      }
    } catch (e) { }
  };

  const [taskDetailMap, setTaskDetailMap] = useState({});
  const fetchTaskDetail = async (tid) => {
    const sid = sanitizeId(tid);
    if (!sid) return;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      if (!cleanToken) return;

      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      };
      const res = await fetch(API_ENDPOINTS.SINGLE_TASK_DETAIL(sid), { headers });
      if (res.ok) {
        const data = await res.json();
        setTaskDetailMap(prev => ({ ...prev, [tid]: data }));
      }
    } catch { }
  };

  const syncSprintToBackend = async (projName, st, prog, taskId = null) => {
    try {
      const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
      const suid = sanitizeId(uid);
      localStorage.setItem(`sprint_progress_${suid}_${projName}`, JSON.stringify({ status: st, progress: prog }));

      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';

      const headers = { 'Content-Type': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      // Dual-action sync: Attempt both specific task update and global sprint log
      const payloads = [
        fetch(`${BASE_URL}/api/sprint-updates`, {
          method: 'POST',
          headers,
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
          headers,
          body: JSON.stringify({ status: st, progress: prog })
        }));
      }

      // Also mirror to Daily TASK_UPDATES so it shows in the report log
      payloads.push(fetch(API_ENDPOINTS.TASK_UPDATES, {
        method: 'POST',
        headers,
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
    const curProg = sprintProgressMap[projName] || 0;

    // Once completed (status or 100%), lock Pending and In Progress so user can't revert
    if ((curStatus === 'Completed' || curProg === 100) && st !== 'Completed') return;
    if (curStatus === 'Completed') return;

    if (st === 'Completed') {
      setPendingStatusData({ projName, st, taskId });
      setShowFinalizeModal(true);
    } else {
      let newProgress = curProg;

      if (st === 'Pending') {
        // Keep progress unchanged
      } else if (st === 'In Progress') {
        // In Progress increases the progress by 5%
        newProgress = Math.min(95, curProg + 5);
        if (newProgress < 5) newProgress = 5;
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
        // Optimistic hydration: load exactly what is in cache, or 0 if missing.
        setYesterdayCompletion(cachedCompletion !== null ? Number(cachedCompletion) : 0);
      } catch (e) { }

      fetchTaskHistory();
      fetchSecondaryData();
      fetchCoursesAndProgress();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const fetchSecondaryData = async () => {
    try {
      const authOk = await checkAuthOnce();
      if (!authOk) return;
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      // Integrated Birthdays API Suite (Strictly following user endpoints)
      const bEndpoints = [
        `${BASE_URL}/api/users`,
        `${BASE_URL}/api/birthdays`,
        `${BASE_URL}/api/birthday-list`,
        `${BASE_URL}/api/employees/birthdays`
      ];
      let bData = [];
      for (const ep of bEndpoints) {
        try {
          console.log("[DOB Flow] Dashboard fetching birthdays from endpoint:", ep);
          const res = await fetch(ep, { headers });
          if (res.ok) {
            const raw = await res.json();
            console.log(`[DOB Flow] Dashboard received raw data from ${ep}:`, raw);
            const list = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
            list.forEach(item => {
              const bestDate = item.date_of_birth || item.dob || item.dateOfBirth || item.date || item.birthday;
              const personName = item.name || item.emp_name || item.employee_name;
              if (bestDate && personName && !bData.some(p => (p.name || '').toLowerCase() === (personName || '').toLowerCase())) {
                bData.push({ ...item, name: personName, date: bestDate });
              }
            });
          }
        } catch (e) { }
      }

      // Ensure the current user is always included with their latest profile DOB
      if (user) {
        const myName = user.name || user.employee_name || user.emp_name;
        const myDob = user.date_of_birth || user.dob || user.dateOfBirth;
        if (myName && myDob) {
          bData = bData.filter(p => (p.name || '').toLowerCase() !== myName.toLowerCase());
          bData.push({
            ...user,
            name: myName,
            date: myDob
          });
        }
      }

      const [hRes, njRes] = await Promise.allSettled([
        fetch(API_ENDPOINTS.HOLIDAYS, { headers }).catch(() => null),
        fetch(API_ENDPOINTS.NEW_JOINEES_GET || API_ENDPOINTS.NEW_JOINEE, { headers }).catch(() => null)
      ]);

      if (bData.length > 0) {

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
          headers: { 'Authorization': `Bearer ${cleanToken}` }
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
      const authOk = await checkAuthOnce();
      if (!authOk) return;
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
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
      const authOk = await checkAuthOnce();
      if (!authOk) return;
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      if (!cleanToken) return;

      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      };

      // Parallel fetching of core data streams with silent resilience
      let assignedResp = null, logsResp = null, profileResp = null;
      try {
        const results = await Promise.all([
          fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid), { headers }).catch(() => null),
          fetch(API_ENDPOINTS.TASK_UPDATES_USER(uid), { headers }).catch(() => null),
          user?.email ? fetch(API_ENDPOINTS.PROFILE(user.email), { headers }).catch(() => null) : Promise.resolve(null)
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
      // We need the TL's ID to fetch projects assigned TO them by the PM
      let mId = user?.reporting_manager_id || user?.reportingManagerId || user?.manager_id || user?.managerId || user?.tl_id || user?.team_leader_id || user?.teamLeaderId || user?.representative_tl || user?.manager_email || user?.manager;

      if (profileResp && profileResp.ok) {
        try {
          // Use clone() to allow multiple reads if necessary
          const mData = await profileResp.clone().json();
          mId = mData?.reporting_manager_id || mData?.reportingManagerId || mData?.manager_id || mData?.managerId || mData?.tl_id || mData?.team_leader_id || mData?.id || mId;
        } catch { }
      }

      if (mId) {
        const mgrIdStr = String(sanitizeId(mId));
        try {
          const allResp = await fetch(API_ENDPOINTS.ALL_ASSIGNED_TASKS, { headers }).catch(() => null);
          if (allResp && allResp.ok) {
            const allData = await allResp.json().catch(() => []);
            const allList = Array.isArray(allData) ? allData : (allData.value || allData.data || []);
            const validT = allList.filter(p => {
              if (!p) return false;
              // API uses assignee_id for the person a task is assigned TO
              const assigneeId = String(sanitizeId(p.assignee_id || p.assigned_to || p.assignedTo || p.assigneeId || ''));
              const nameRaw = p.task_name || p.taskName || p.projectName || p.project_name || p.project || p.title || p.taskTitle || '';
              return assigneeId === mgrIdStr && String(nameRaw).trim() !== '';
            });
            setTeamProjects(validT);
            safeSetItem(`team_projects_${user.id}`, JSON.stringify(validT));
          }
        } catch (err) {
          console.error("[Dashboard] Team Projects Fetch Error:", err);
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
        const yestLogs = sortedLogs.filter(r => isSameDay(yesterdayDate, getLogDate(r)));

        // Merge all tasks from all records for the day to avoid missing data
        const mergeTasks = (logs) => {
          return logs.reduce((acc, r) => {
            const tasks = parseTasks(r.tasks || r.task_list || r.content);
            return [...acc, ...tasks];
          }, []).sort((a, b) => {
            const idA = typeof a === 'object' ? Number(a.id || 0) : 0;
            const idB = typeof b === 'object' ? Number(b.id || 0) : 0;
            return idA - idB; // Chronological order to preserve manual index order
          });
        };

        finalTodayTasks = mergeTasks(todayLogs);
        finalYestTasks = mergeTasks(yestLogs);

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
      const lsYestRaw = localStorage.getItem(lsKey(uid, yesterdayDate));
      const lsTodayRec = lsTodayRaw ? JSON.parse(lsTodayRaw) : null;
      const lsYestRec = lsYestRaw ? JSON.parse(lsYestRaw) : null;

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
        } else if (yStatus === 'In Progress') {
          percentage = 50;
        } else {
          percentage = 0;
        }

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
        setNotificationFeedback('✅ Task Updated Successfully!');
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
    mainCard: { backgroundColor: 'white', borderRadius: winWidth < 768 ? '25px' : '45px', padding: winWidth < 768 ? (winWidth < 480 ? '10px' : '15px') : '35px 45px 45px', minHeight: '280px', boxShadow: '0 20px 60px rgba(0,0,0,0.02)', border: '1px solid #0B1E3F', display: 'flex', flexDirection: 'column' },
    mainTitle: { fontSize: winWidth < 768 ? '14px' : '18px', fontWeight: '800', color: '#3b5b80ff', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    taskGrid: { display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: winWidth < 768 ? '15px' : '25px', marginTop: '5px', paddingTop: '10px', borderTop: '1.5px solid #f8fafc' },
    yesterdayBox: { backgroundColor: '#f0fdf4', borderRadius: '15px', padding: winWidth < 768 ? '15px' : '20px', minHeight: '180px', height: '100%', border: '1.5px solid #dcfce7', display: 'flex', flexDirection: 'column' },
    yesterdayLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#0B1E3F', fontWeight: '1000', fontSize: '18px', marginBottom: '8px' },
    yesterdayText: { fontSize: '14px', color: '#16a34a', fontWeight: '700' },
    todayBox: { backgroundColor: '#f8fafc', borderRadius: '15px', padding: winWidth < 768 ? '15px' : '20px', border: '1.0px solid #bfdbfe', display: 'flex', flexDirection: 'column', minHeight: '180px', height: '100%' },
    todayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    todayLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#0B1E3F', fontWeight: '1000', fontSize: '18px' },
    editBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '12px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#0B1E3F' },
    taskItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', color: '#1e293b', fontWeight: '700', fontSize: '13px', lineHeight: '1.4' },
    statusBadge: { fontSize: '10px', fontWeight: '1000', padding: '6px 14px', borderRadius: '10px', background: '#f1f5f9', color: '#0B1E3F', width: 'fit-content', marginTop: '12px' },
    liveBadge: { fontSize: '10px', fontWeight: '1000', color: '#cbd5e1', alignSelf: 'flex-end', marginTop: 'auto' },
    statsCard: { backgroundColor: '#0B1E3F', borderRadius: '45px', padding: '45px', boxShadow: '0 20px 60px rgba(11,30,63,0.15)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minWidth: '300px' }
  };

  const avatarInitial = (name = '') => name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div style={s.page}>
      <div style={s.grid}>
        {/* ────── ATTENDANCE PORTAL SECTION ────── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ ...s.mainTitle, fontSize: '28px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="#2a3c63ff" /> Attendance Overview
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); setActiveTab('ATTENDANCE'); }}
            style={{
              padding: '26px 24px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #0b1e3f',
              borderLeft: '10px solid #0b1e3f',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '50%', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#371534ff', letterSpacing: '0.5px' }}>My Attendance</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#20427cff', marginTop: '2px' }}>Attendance History</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span>LIVE UPDATES</span>
            </div>
            <ChevronRight size={20} color="#161718ff" />
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1fr 320px', gap: '30px', marginTop: winWidth < 768 ? '15px' : '30px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ ...s.mainCard, minHeight: 'fit-content', padding: winWidth < 768 ? '25px' : '35px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: winWidth < 768 ? '15px' : '25px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ ...s.mainTitle, fontSize: winWidth < 768 ? '17px' : '24px', marginBottom: 0 }}>Team Command Center</div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: winWidth < 768 ? '15px' : '25px', marginBottom: '15px' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); setActiveTab('PROJECTS', { view: 'INDIVIDUAL' }); }}
                  onMouseEnter={() => setHoveredCard('individual')}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: winWidth < 768 ? '12px' : '16px',
                    background: hoveredCard === 'individual' ? '#0b1e3f' : 'white',
                    borderRadius: '34px',
                    border: hoveredCard === 'individual' ? '1.5px solid #0b1e3f' : '1.5px solid #1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: winWidth < 768 ? '15px' : '25px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: hoveredCard === 'individual' ? '0 10px 25px rgba(11,30,63,0.2)' : '0 10px 20px rgba(37,99,235,0.03)'
                  }}
                >
                  <div style={{ backgroundColor: 'white', padding: winWidth < 768 ? '8px' : '12px', borderRadius: '50%', border: '1.5px solid #bfdbfe', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={winWidth < 768 ? 22 : 28} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: hoveredCard === 'individual' ? 'white' : '#475569', letterSpacing: '0.5px', transition: 'color 0.2s ease' }}>Individual</div>
                    <div style={{ fontSize: winWidth < 768 ? '20px' : '22px', fontWeight: '900', color: hoveredCard === 'individual' ? 'white' : '#0b1e3f', transition: 'color 0.2s ease', marginTop: '2px' }}>
                      {individualProjects.length} <span style={{ fontSize: winWidth < 768 ? '14px' : '15px', color: hoveredCard === 'individual' ? 'white' : '#64748b', fontWeight: '700', transition: 'color 0.2s ease' }}>Projects</span>
                    </div>
                  </div>
                  <ChevronRight size={20} color={hoveredCard === 'individual' ? 'white' : '#2563eb'} style={{ transition: 'color 0.2s ease' }} />
                </div>

                <div
                  onClick={(e) => { e.stopPropagation(); setActiveTab('PROJECTS', { view: 'TEAM' }); }}
                  onMouseEnter={() => setHoveredCard('team')}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: winWidth < 768 ? '12px' : '16px',
                    background: hoveredCard === 'team' ? '#0b1e3f' : 'white',
                    borderRadius: '34px',
                    border: hoveredCard === 'team' ? '1.5px solid #0b1e3f' : '1.5px solid #5b21b6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: winWidth < 768 ? '15px' : '25px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: hoveredCard === 'team' ? '0 10px 25px rgba(11,30,63,0.2)' : '0 10px 20px rgba(124,58,237,0.03)'
                  }}
                >
                  <div style={{ backgroundColor: 'white', padding: winWidth < 768 ? '8px' : '12px', borderRadius: '50%', border: '1.5px solid #ddd6fe', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={28} color="#7c3aed" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: hoveredCard === 'team' ? 'white' : '#475569', letterSpacing: '0.5px', transition: 'color 0.2s ease' }}>Team</div>
                    <div style={{ fontSize: winWidth < 768 ? '20px' : '22px', fontWeight: '900', color: hoveredCard === 'team' ? 'white' : '#0b1e3f', transition: 'color 0.2s ease', marginTop: '2px' }}>
                      {teamProjects.length} <span style={{ fontSize: winWidth < 768 ? '14px' : '15px', color: hoveredCard === 'team' ? 'white' : '#64748b', fontWeight: '700', transition: 'color 0.2s ease' }}>Projects</span>
                    </div>
                  </div>
                  <ChevronRight size={20} color={hoveredCard === 'team' ? 'white' : '#7c3aed'} style={{ transition: 'color 0.2s ease' }} />
                </div>
              </div>


              <div style={s.taskGrid}>
                <div style={{ ...s.yesterdayBox, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={s.yesterdayLabel}>
                      <CheckCircle2 size={22} color="#0B1E3F" /> Yesterday
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('FOCUS_LOGS'); }}
                        style={{ ...s.editBtn, background: 'white', border: '1.5px solid #0f4824ff', color: '#15803d', padding: '8px 14px', borderRadius: '20px', fontSize: '11px', fontFamily: 'sans-serif' }}
                      >
                        View Report &rarr;
                      </button>
                    </div>
                  </div>

                  {yesterdayTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px', flex: 1 }}>
                      {yesterdayTasks.map((t, i) => {
                        const taskId = typeof t === 'object' ? Number(t.id) : null;
                        const timeStr = (!isNaN(taskId) && taskId > 1000000000000)
                          ? new Date(taskId).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                          : '';
                        return (
                          <div key={i} style={{ ...s.taskItem, padding: 0, border: 'none', background: 'transparent' }}>
                            <CheckCircle2 size={12} color="#16a34a" flexShrink={0} />
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                              {typeof t === 'string' ? t : t.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, margin: '20px 0', color: '#64748b', fontWeight: '600', fontSize: '16px' }}>
                      No log found.
                    </div>
                  )}

                  {yesterdayTasks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 'auto' }}>
                      <div style={{ padding: '5px 12px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #0B1E3F', color: '#0B1E3F', fontSize: '12px', fontWeight: '1000', }}>
                        {yesterdayStatus && yesterdayStatus !== 'No Data' ? yesterdayStatus : 'Pending'}
                      </div>
                    </div>
                  )}
                </div>

                <div style={s.todayBox} onClick={(e) => e.stopPropagation()}>
                  <div style={s.todayHeader}>
                    <div style={s.todayLabel}>
                      <TrendingUp size={22} color="#0B1E3F" /> Today
                    </div>
                    {!isEditing ? (
                      <button style={s.editBtn} onClick={startEditing}>
                        <Edit3 size={14} color="#0B1E3F" /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ ...s.editBtn, background: '#f8fafc', color: '#64748b' }} onClick={() => setIsEditing(false)}>Cancel</button>
                        {(() => {
                          const hasValidTask = editBuffer.some(t => t.text && t.text.trim() !== '');
                          return (
                            <button
                              style={{
                                ...s.editBtn,
                                background: hasValidTask ? '#1e40af' : '#cbd5e1',
                                color: 'white',
                                border: 'none',
                                cursor: hasValidTask ? 'pointer' : 'not-allowed'
                              }}
                              onClick={hasValidTask ? handleSaveTasks : undefined}
                              disabled={!hasValidTask}
                            >
                              Save
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Manual Logged Tasks ONLY (as requested to remove assigned projects from here as well) */}
                      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                        {todayTasks.length > 0 ? (
                          todayTasks.map((t, i) => {
                            return (
                              <div key={i} style={s.taskItem}>
                                <CheckCircle2 size={14} color="#3b82f6" />
                                <span style={{ flex: 1 }}>{typeof t === 'string' ? t : t.text}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ backgroundColor: '#fff7ed', border: '1.5px solid #ffedd5', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: '#c2410c', fontSize: '13px', fontWeight: '800' }}>
                            <AlertCircle size={16} /> Update ur todays task
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
                        <div style={{ padding: '5px 12px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #0B1E3F', color: '#0B1E3F', fontSize: '12px', fontWeight: '1000', }}>
                          {todayStatus && todayStatus !== 'No Data' ? todayStatus : 'PENDING'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
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
                      </div>
                      <button onClick={() => setEditBuffer([...editBuffer, { text: '', id: Date.now() }])} style={{ padding: '8px', borderRadius: '8px', border: '1.5px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}>
                        + Add Task
                      </button>
                      <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
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
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: '24px', fontFamily: "'Outfit', 'Inter', sans-serif" }}>Yesterday Progress</div>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: `radial-gradient(closest-side, #0B1E3F 79%, transparent 80% 100%), conic-gradient(#38bdf8 ${yesterdayCompletion}%, rgba(255,255,255,0.1) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{yesterdayCompletion}%</span>
            </div>
            <div style={{ marginTop: '24px', fontSize: '11px', color: yesterdayCompletion === 100 ? '#4ade80' : '#cbd5e1', fontWeight: '800', textAlign: 'center', backgroundColor: yesterdayCompletion === 100 ? 'rgba(22, 163, 74, 0.2)' : 'rgba(255, 255, 255, 0.1)', padding: '10px 20px', borderRadius: '15px' }}>
              {yesterdayCompletion === 100 ? 'Completed' : yesterdayCompletion > 0 ? 'In Progress' : 'Verified'}
            </div>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: '32px', marginTop: '32px' }}>
          <div style={{ ...s.mainCard, display: 'flex', flexDirection: 'column', minHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gift size={24} color="#ec4899" /> Upcoming Birthdays
              </div>
              <button
                onClick={() => { if (typeof setActiveTab === 'function') setActiveTab('BIRTHDAYS'); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1.2px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                View All &rarr;
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {birthdaysList.slice(0, 2).map((b, idx) => {
                return (
                  <div key={idx} style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0, overflow: 'hidden' }}>
                        {b.profileImage ? <img src={`${BASE_URL}${b.profileImage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : avatarInitial(b.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>{b.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#000000', marginTop: '4px', lineHeight: '1.2' }}>
                          {(() => {
                            const nextDob = getNextOccurrence(b.date || b.dob);
                            return `${String(nextDob.getDate()).padStart(2, '0')}/${String(nextDob.getMonth() + 1).padStart(2, '0')}/${nextDob.getFullYear()}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {birthdaysList.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#fb7185', fontWeight: '700', fontSize: '13px', backgroundColor: 'transparent', borderRadius: '20px' }}>No upcoming birthdays.</div>}
            </div>
          </div>

          <div style={{ ...s.mainCard, display: 'flex', flexDirection: 'column', minHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} color="#2563eb" /> Public Holidays
              </div>
              <button
                onClick={() => { if (typeof setActiveTab === 'function') setActiveTab('CALENDAR'); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1.2px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                View All &rarr;
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {holidays.filter(h => new Date(h.date) >= new Date().setHours(0, 0, 0, 0)).slice(0, 2).map((h, idx) => {
                const hDate = new Date(h.date);
                return (
                  <div key={idx} style={{ padding: '14px 18px', backgroundColor: '#eff6ff', borderRadius: '18px', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#1e3a8a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.9 }}>
                          {hDate.toLocaleString('default', { month: 'short' })}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '900', lineHeight: '1.1' }}>
                          {hDate.getDate()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>{h.name}</div>
                        <div style={{ fontSize: '11px', color: '#000000', fontWeight: '600', marginTop: '4px', textTransform: 'capitalize', lineHeight: '1.2' }}>
                          {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {holidays.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#d97706', fontWeight: '700', fontSize: '13px', backgroundColor: 'transparent', borderRadius: '20px' }}>No upcoming holidays.</div>}
            </div>
          </div>
        </div>

        {/* Team Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '2px solid #cbd5e1', marginTop: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={24} color="#f59e0b" /> Saturday Suggestions
              </div>
              <button
                onClick={() => { if (typeof setActiveTab === 'function') setActiveTab('SATURDAY_SUGGESTIONS'); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1.2px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                View More &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestions.slice(0, 3).map((sug, i) => (
                <div key={i} style={{ padding: '14px 18px', borderRadius: '18px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>
                      {sug.employee_name || 'Anonymous'}
                    </div>
                    {(sug.created_at || sug.timestamp || sug.date || sug.createdAt) && (
                      <div style={{ fontSize: '10px', color: '#161718ff', fontWeight: '800' }}>
                        {(() => {
                          const d = new Date(sug.created_at || sug.timestamp || sug.date || sug.createdAt);
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        })()}
                      </div>
                    )}
                  </div>
                  {sug.requirement && (
                    <div style={{ fontSize: '12px', color: '#141415ff', marginBottom: '4px' }}>
                      <strong>Requirements:</strong> {sug.requirement}
                    </div>
                  )}
                  {sug.suggestion && (
                    <div style={{ fontSize: '12px', color: '#141415ff' }}>
                      <strong>Suggestions:</strong> {sug.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
