import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, safeSetItem, checkAuthOnce } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { 
  User, Users, Briefcase, Clock, CheckCircle2, 
  Shield
} from 'lucide-react';
import BackButton from './BackButton';

const ProjectScreen = ({ onBack, defaultView, defaultStatus }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [activeView, setActiveView] = useState(defaultView || 'INDIVIDUAL'); // INDIVIDUAL or TEAM
  const [statusFilter, setStatusFilter] = useState(defaultStatus || 'ALL');
  const [individualProjects, setIndividualProjects] = useState([]);
  const [teamProjects, setTeamProjects] = useState([]);
  const [sprintProgressMap, setSprintProgressMap] = useState({});
  const [sprintStatusMap, setSprintStatusMap] = useState({});
  const [notificationFeedback, setNotificationFeedback] = useState(null);
  const [reviewData] = useState({}); // taskId -> { review, verified }
  const [taskDetailMap, setTaskDetailMap] = useState({}); // Stores explicit task metadata
  const [taskReviewMap, setTaskReviewMap] = useState({}); // Stores manager review from /api/master-task/review/{id}
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [pendingStatusData, setPendingStatusData] = useState(null);
  
  // Helper to strip legacy ":1" suffixes from IDs
  const sanitizeId = (id) => String(id || '').split(':')[0];

  const fetchSprintStatus = useCallback(async (targetId, currentProjectName) => {
    const sid = sanitizeId(targetId);
    
    // First, try to load from localStorage cache to prevent layout shift or reversion
    try {
      const cached = localStorage.getItem(`sprint_progress_${sid}_${currentProjectName}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.status) {
          setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: parsed.status }));
        }
        if (parsed.progress !== undefined && parsed.progress !== null) {
          setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: parsed.progress }));
        }
      }
    } catch (e) { }

    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined') return;
      const authOk = await checkAuthOnce();
      if (!authOk) return;

      const headers = { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      };
      const res = await fetch(`${BASE_URL}/api/sprint-updates/${sid}`, { headers });
      if (res.ok) {
        const raw = await res.json();
        const dataArr = Array.isArray(raw) ? raw : (raw.value && Array.isArray(raw.value) ? raw.value : [raw]);
        console.log(`[DEBUG] fetchSprintStatus API response for ${sid}:`, dataArr);
        
        // Find the latest update for this specific project by searching in reverse
        const data = [...dataArr].reverse().find(d => {
          if (!d) return false;
          const respName = d.project_name || d.projectName;
          return respName === currentProjectName;
        });
        
        console.log(`[DEBUG] fetchSprintStatus matching data for ${currentProjectName}:`, data);

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
          } catch (e) {}

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
  }, []);

  const fetchTaskDetail = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined') return;
      const authOk = await checkAuthOnce();
      if (!authOk) return;

      const headers = { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      };
      const res = await fetch(API_ENDPOINTS.SINGLE_TASK_DETAIL(taskId), { headers });
      if (res.ok) {
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw[0] : (raw.value && Array.isArray(raw.value) ? raw.value[0] : (raw.value || raw));
        if (data) {
          setTaskDetailMap(prev => ({ ...prev, [taskId]: data }));
          
          // Priority fix: If this is an assignment row, it might contain the master task ID.
          // Fetch the review using that master task ID.
          const discoveredMasterTid = data.task_id || data.taskId || data.master_task_id || data.masterTaskId;
          if (discoveredMasterTid && String(sanitizeId(discoveredMasterTid)) !== String(sanitizeId(taskId))) {
            fetchTaskReview(discoveredMasterTid);
          }
        }
      }
    } catch (e) {}
  }, []);

  // Fetch manager review from dedicated review endpoint
  const fetchTaskReview = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined') return;
      const authOk = await checkAuthOnce();
      if (!authOk) return;

      const headers = { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      };
      const res = await fetch(API_ENDPOINTS.TASK_REVIEW(taskId), { headers });
      if (res.ok) {
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw[0] : (raw.value && Array.isArray(raw.value) ? raw.value[0] : (raw.value || raw));
        if (data) {
          setTaskReviewMap(prev => ({ ...prev, [taskId]: data }));
        }
      }
    } catch (e) {}
  }, []);

  const fetchProjectData = useCallback(async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    if (!uid) return;
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined') return;
      const authOk = await checkAuthOnce();
      if (!authOk) return;

      const headers = { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      };

      const [indResp, empProfileResp] = await Promise.all([
        fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid), { headers }).catch(() => null),
        user?.email ? fetch(API_ENDPOINTS.PROFILE(user.email), { headers }).catch(() => null) : Promise.resolve(null)
      ]);

      if (indResp && indResp.ok) {
        const list = await indResp.json();
        const data = Array.isArray(list) ? list : (list.value || list.data || []);
        const valid = data.filter(p => !!(p && (p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title || p.taskTitle)));
        setIndividualProjects(valid);
        safeSetItem(`ind_projects_${user.id}`, JSON.stringify(valid));
        
        valid.forEach(p => {
          const pName = p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title;
          if (pName) fetchSprintStatus(uid, pName);
          const tid = p.id || p.assigned_id || p.task_id;
          const masterTid = p.task_id || p.taskId || p.master_task_id || p.masterTaskId;
          if (tid) {
            fetchTaskDetail(tid);
            fetchTaskReview(tid);
          }
          // Also fetch review using master task ID if different from assignment ID
          if (masterTid && String(sanitizeId(masterTid)) !== String(sanitizeId(tid))) {
            fetchTaskDetail(masterTid);
            fetchTaskReview(masterTid);
          }
        });
      }

      let managerId = user?.reporting_manager_id || user?.reportingManagerId || user?.manager_id || user?.managerId || user?.tl_id || user?.team_leader_id || user?.teamLeaderId || user?.representative_tl || null;

      if (!managerId && empProfileResp && empProfileResp.ok) {
        try {
          const empData = await empProfileResp.json();
          managerId = empData?.reporting_manager_id || empData?.reportingManagerId || empData?.manager_id || empData?.managerId || empData?.tl_id || empData?.team_leader_id || empData?.teamLeaderId || null;
        } catch (e) {}
      }

      let teamTasksFound = [];
      if (managerId) {
        try {
          const mgrIdStr = String(sanitizeId(managerId));
          const allResp = await fetch(API_ENDPOINTS.ALL_ASSIGNED_TASKS, { headers }).catch(() => null);
          if (allResp && allResp.ok) {
            const allData = await allResp.json().catch(() => []);
            const allList = Array.isArray(allData) ? allData : (allData.value || allData.data || []);
            teamTasksFound = allList.filter(p => {
              if (!p) return false;
              const assigneeId = String(sanitizeId(p.assignee_id || p.assigned_to || p.assignedTo || p.assigneeId || ''));
              const nameRaw = p.task_name || p.taskName || p.projectName || p.project_name || p.project || p.title || p.taskTitle || '';
              return assigneeId === mgrIdStr && String(nameRaw).trim() !== '';
            });
          }
        } catch (e) {}
      }

      if (teamTasksFound.length > 0) {
        setTeamProjects(teamTasksFound);
        safeSetItem(`team_projects_${user.id}`, JSON.stringify(teamTasksFound));
        teamTasksFound.forEach(p => {
          const pName = p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title;
          if (pName) fetchSprintStatus(managerId || uid, pName);
          const tid = p.id || p.assigned_id || p.task_id;
          const masterTid = p.task_id || p.taskId || p.master_task_id || p.masterTaskId;
          if (tid) {
            fetchTaskDetail(tid);
            fetchTaskReview(tid);
          }
          // Also fetch review using master task ID if different from assignment ID
          if (masterTid && String(sanitizeId(masterTid)) !== String(sanitizeId(tid))) {
            fetchTaskDetail(masterTid);
            fetchTaskReview(masterTid);
          }
        });
      }
    } catch (err) {
      console.error("Project Fetch Error:", err);
    }
  }, [user, fetchSprintStatus, fetchTaskDetail, fetchTaskReview]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    if (user) {
      try {
        const cachedInd = localStorage.getItem(`ind_projects_${user.id}`);
        const cachedTeam = localStorage.getItem(`team_projects_${user.id}`);
        if (cachedInd) setIndividualProjects(JSON.parse(cachedInd));
        if (cachedTeam) setTeamProjects(JSON.parse(cachedTeam));
      } catch (e) {}
      fetchProjectData();
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [user, fetchProjectData]);

  const handleStatusUpdate = async (pName, st, taskId, currentStatus, currentProgress) => {
    // Prevent re-triggering the finalize modal if the task is already 100% completed
    if (st === 'Completed' && currentProgress === 100) return;

    // Once completed, lock Pending and In Progress so user can't revert
    if ((currentStatus === 'Completed' || currentProgress === 100) && st !== 'Completed') return;

    if (st === 'Completed') {
      setPendingStatusData({ pName, st, taskId });
      setShowFinalizeModal(true);
    } else {
      let newProgress = currentProgress || 0;
      if (st === 'Pending') {
        // Keep progress unchanged (do not reset to 0%)
      } else if (st === 'In Progress') {
        // Each click on In Progress increases by 5%, capped at 95%
        newProgress = Math.min(95, newProgress + 5);
        if (newProgress < 5) newProgress = 5;
      }
      
      const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
      const suid = sanitizeId(uid);
      const leadId = user?.reportingManagerId || user?.managerId || user?.reporting_manager_id || user?.representative_tl || user?.team_leader || user?.reporting_manager || user?.manager || uid;
      const ownerId = activeView === 'INDIVIDUAL' ? uid : leadId;
      
      setSprintStatusMap(prev => ({ ...prev, [pName]: st }));
      setSprintProgressMap(prev => ({ ...prev, [pName]: newProgress }));

      // Save to localStorage immediately
      try {
        localStorage.setItem(`sprint_progress_${suid}_${pName}`, JSON.stringify({ 
          status: st, 
          progress: newProgress 
        }));
      } catch (e) {}

      const sid = sanitizeId(ownerId);
      try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 'Content-Type': 'application/json' };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        await fetch(`${BASE_URL}/api/sprint-updates`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            projectName: pName,
            teamLeaderId: sid,
            sprintStatus: st,
            progressPercentage: newProgress
          })
        });

        if (taskId) {
          await fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(taskId), {
              method: 'PUT',
              headers,
              body: JSON.stringify({ 
                status: st, 
                overallStatus: st,
                progress: newProgress 
              })
          });
        }
      } catch (err) {
        console.error("[DEBUG] Network error updating task status:", err);
      }
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusData) return;
    const { pName, st, taskId } = pendingStatusData;

    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    const suid = sanitizeId(uid);
    const leadId = user?.reportingManagerId || user?.managerId || user?.reporting_manager_id || user?.representative_tl || user?.team_leader || user?.reporting_manager || user?.manager || uid;
    const ownerId = activeView === 'INDIVIDUAL' ? uid : leadId;
    
    const currentProgress = sprintProgressMap[pName] || 0;
    let progress = currentProgress;
    
    if (st === 'Pending') {
      progress = 0;
    } else if (st === 'In Progress') {
      progress = Math.min(95, currentProgress + 10);
    } else if (st === 'Completed') {
      progress = 100;
    }

    // Optimistic update: update UI state immediately so the user sees the change
    setSprintStatusMap(prev => ({ ...prev, [pName]: st }));
    setSprintProgressMap(prev => ({ ...prev, [pName]: progress }));
    setNotificationFeedback(`Project "${pName}" updated to ${st}!`);
    setTimeout(() => setNotificationFeedback(null), 3000);

    // Save to localStorage immediately
    try {
      localStorage.setItem(`sprint_progress_${suid}_${pName}`, JSON.stringify({ 
        status: st, 
        progress: progress 
      }));
    } catch (e) {}

    try {
      // 1. Log to Sprint History (Temporal)
      const sid = sanitizeId(ownerId);
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Content-Type': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      await fetch(`${BASE_URL}/api/sprint-updates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectName: pName,
          teamLeaderId: sid,
          sprintStatus: st,
          progressPercentage: progress
        })
      });

      // 2. Update Main Task Table (Persistence)
      if (taskId) {
        await fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(taskId), {
            method: 'PUT',
            headers,
            body: JSON.stringify({ 
              status: st, 
              overallStatus: st,
              progress: progress 
            })
        });
      }
    } catch (e) {
      console.error("[DEBUG] Error finalizing task status:", e);
    } finally {
      setShowFinalizeModal(false);
      setPendingStatusData(null);
    }
  };

  const s = {
    container: { padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px', maxWidth: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '40px' },
    title: { fontSize: '28px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    subtitle: { fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' },
    toggleGrid: { 
      display: 'grid', 
      gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', 
      gap: winWidth < 768 ? '15px' : '20px', 
      marginBottom: '30px' 
    },
    toggleCard: (active) => ({
      padding: winWidth < 768 ? '18px 22px' : '25px',
      borderRadius: '30px',
      backgroundColor: active ? '#3B5998' : 'white',
      border: '1px solid',
      borderColor: active ? '#3B5998' : '#0B1E3F',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: active ? '0 15px 35px rgba(59, 89, 152, 0.15)' : '0 8px 25px rgba(0,0,0,0.02)',
      transform: active ? 'translateY(-2px)' : 'none'
    }),
    projectCard: {
      backgroundColor: 'white',
      borderRadius: '35px',
      padding: winWidth < 768 ? '22px' : '35px',
      marginBottom: '20px',
      border: '1.5px solid #f1f5f9',
      boxShadow: '0 15px 45px rgba(0,0,0,0.02)'
    }
  };

  const projectsToShow = (activeView === 'INDIVIDUAL' ? individualProjects : teamProjects)
    .filter(p => {
      if (statusFilter === 'Today') {
        const pDate = p.created_at || p.assigned_date || p.Date || p.createdAt || p.date || p.assignedDate || p.creation_date;
        if (!pDate) return false;
        try {
          const d1 = new Date(pDate).toDateString();
          const d2 = new Date().toDateString();
          return d1 === d2;
        } catch { return false; }
      }
      if (statusFilter === 'ALL') return true;
      const pName = p.task_name || p.taskName || p.project_name || p.projectName;
      const pStatus = sprintStatusMap[pName] || p.status || p.sprint_status || p.overallStatus || 'Pending';
      return pStatus.toLowerCase() === statusFilter.toLowerCase();
    });

  return (
    <div style={s.container}>
      <header style={{ ...s.header, display: 'flex', alignItems: 'center', gap: '20px' }}>
        <BackButton onClick={onBack} />
        <div>
          <h1 style={s.title}>Project Center</h1>
        </div>
      </header>

      <div style={{ ...s.toggleGrid, marginBottom: '20px' }}>
        {['INDIVIDUAL', 'TEAM'].map(type => (
          <div key={type} style={s.toggleCard(activeView === type)} onClick={() => {
            setActiveView(type);
            setStatusFilter('ALL');
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ backgroundColor: activeView === type ? 'rgba(255,255,255,0.2)' : '#f1f5f9', padding: '12px', borderRadius: '15px' }}>
                {type === 'INDIVIDUAL' ? <User size={26} color={activeView === type ? 'white' : '#3B5998'} /> : <Users size={26} color={activeView === type ? 'white' : '#3B5998'} />}
              </div>
              <div style={{ fontSize: winWidth < 768 ? '14px' : '18px', fontWeight: '900', color: activeView === type ? 'white' : '#0B1E3F', letterSpacing: '0.3px' }}>
                {type === 'INDIVIDUAL' ? 'Individual' : 'Team'} projects
              </div>
            </div>
            <div style={{ fontSize: winWidth < 768 ? '24px' : '36px', fontWeight: '900', color: activeView === type ? 'white' : '#0B1E3F' }}>
              {type === 'INDIVIDUAL' ? individualProjects.length : teamProjects.length}
            </div>
          </div>
        ))}
      </div>



      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {projectsToShow.length > 0 ? projectsToShow.map((proj, idx) => {
          const targetId = proj.id || proj.assigned_id || proj.task_id || proj.assignment_id;
          const masterTid = proj.task_id || proj.taskId || proj.master_task_id || proj.masterTaskId;
          const td = taskDetailMap[targetId] || (masterTid ? taskDetailMap[masterTid] : null) || {};
          
          const derivedMasterTid = masterTid || td.task_id || td.taskId || td.master_task_id || td.masterTaskId;
          const rv = taskReviewMap[targetId] || (derivedMasterTid ? taskReviewMap[derivedMasterTid] : null) || {};

          const getValidString = (...strs) => {
            for (const s of strs) {
              if (s && String(s).trim() !== '' && String(s).toLowerCase() !== 'null' && String(s).toLowerCase() !== 'undefined') {
                return s;
              }
            }
            return 'Unnamed Project';
          };

          const pName = getValidString(
            td.task_name,
            td.taskName,
            td.projectName,
            td.project_name,
            proj.task_name,
            proj.taskName,
            proj.task_text,
            proj.title,
            proj.taskTitle,
            proj.projectName,
            proj.project_name,
            proj.project,
            proj.name
          );

          const pDesc = proj.description || proj.projectDescription || proj.project_description || proj.task_text || proj.task_description || 'No description provided.';
          
          // Priority Fix: Use task_status and task_review from master_tasks table, review endpoint, or detail fetch
          const finalReview = rv.task_review || rv.review || rv.feedback || rv.taskReview || rv.reviewText || rv.managerReview ||
                              proj.task_review || proj.taskReview || proj.review || proj.reviewText || proj.feedback || proj.managerReview ||
                              td.task_review || td.taskReview || td.review || td.feedback || '';
          const finalStatus = rv.task_status || rv.status || proj.task_status || proj.status || td.task_status || td.status || '';
          
          const verifyStatus = proj.verify || td.verify || rv.verify || '';
          const verifyText = String(verifyStatus).toUpperCase();

          // Overall status for buttons/progress
          let pStatus = sprintStatusMap[pName] || finalStatus || proj.overall_status || proj.overallStatus || 'Pending';
          
          // Ensure 'In-Progress' is handled as 'In Progress'
          if (pStatus === 'In-Progress') pStatus = 'In Progress';

          const statusText = String(finalStatus || '').toUpperCase();
          const reviewText = String(finalReview || '').toUpperCase();

          const isApproved = (statusText === 'APPROVED' || 
                             statusText === 'APP' || 
                             statusText === 'VERIFIED' ||
                             reviewText.includes('APPROVED') ||
                             reviewText.includes('VERIFIED') ||
                             verifyText === 'VERIFIED' ||
                             verifyText === 'APPROVED' ||
                             verifyText === 'APPROVE' ||
                             verifyText === 'TRUE' ||
                             verifyText === '1');

          const isRejected = (statusText === 'REJECTED' || 
                             statusText === 'REJECT' ||
                             reviewText.includes('REJECTED') ||
                             reviewText.includes('REJECT') ||
                             verifyText === 'REJECTED' ||
                             verifyText === 'REJECT' ||
                             verifyText === 'FALSE' ||
                             verifyText === '0');

          // Check if employee has explicitly overridden via sprint status update (e.g. clicked Complete after rejection)
          const explicitSprintStatus = sprintStatusMap[pName];
          const userExplicitlyCompleted = explicitSprintStatus === 'Completed';

          if (isApproved) pStatus = 'Completed';
          else if (isRejected && !userExplicitlyCompleted) {
            // Manager rejected — force back to In Progress at 70%, UNLESS employee explicitly completed again
            pStatus = 'In Progress';
          } else if (isRejected && userExplicitlyCompleted) {
            // Employee resubmitted after rejection — honor their explicit completion
            pStatus = 'Completed';
          }

          let pProg = (sprintProgressMap[pName] !== undefined && sprintProgressMap[pName] !== null) ? sprintProgressMap[pName] :
                      ((td.progress !== undefined && td.progress !== null) ? td.progress :
                      (proj.progress !== undefined && proj.progress !== null ? proj.progress : 
                      (proj.progress_percentage || proj.sprint_progress || (pStatus === 'Completed' ? 100 : 0))));

          if (isRejected && !userExplicitlyCompleted && (pProg === 100 || pProg < 70)) {
            pProg = 70;
          }

          const getValidDate = (...dates) => {
            for (const d of dates) {
              if (d && String(d).trim() !== '' && String(d).toLowerCase() !== 'null' && String(d).toLowerCase() !== 'undefined') {
                return d;
              }
            }
            return null;
          };

          const deadlineDate = getValidDate(
            td.deadline,
            td.sprint_deadline,
            proj.deadline,
            proj.sprint_deadline,
            proj.end_date,
            proj.target_date
          );
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dDate = deadlineDate ? new Date(deadlineDate) : null;
          if (dDate) dDate.setHours(0, 0, 0, 0);
          
          let isToday = false;
          let isDeadlinePast = false;
          if (dDate) {
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth();
            const todayDate = today.getDate();
            
            const dYear = dDate.getFullYear();
            const dMonth = dDate.getMonth();
            const dDay = dDate.getDate();
            
            isToday = (todayYear === dYear && todayMonth === dMonth && todayDate === dDay);
            if (!isToday) {
              isDeadlinePast = dDate.getTime() < today.getTime();
            }
          }

          const isCompleted = pStatus === 'Completed' || pProg === 100;
          
          const compDateRaw = proj.completed_at || proj.completion_date || proj.updated_at || td.updated_at || null;
          const compDate = compDateRaw ? new Date(compDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Today';

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={idx} 
              style={{
                ...s.projectCard,
                backgroundColor: 'white',
                borderRadius: '35px',
                padding: winWidth < 768 ? '20px' : '30px 40px',
                border: '1.5px solid #0B1E3F',
                boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', gap: '20px' }}>
                {/* Left Side: Title & Description */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{pName}</h2>
                    { (deadlineDate || isCompleted) && (
                      <div style={{ 
                        backgroundColor: isCompleted ? '#f0fdf4' : (isToday ? '#fff7ed' : (isDeadlinePast ? '#fff1f2' : '#f8fafc')), 
                        color: isCompleted ? '#16a34a' : (isToday ? '#ea580c' : (isDeadlinePast ? '#e11d48' : '#64748b')), 
                        padding: '6px 14px', 
                        borderRadius: '12px', 
                        fontSize: '10px', 
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid',
                        borderColor: isCompleted ? '#dcfce7' : (isToday ? '#ffedd5' : (isDeadlinePast ? '#ffe4e6' : '#e2e8f0')),
                        boxShadow: (isToday || isDeadlinePast) && !isCompleted ? '0 0 10px rgba(234, 88, 12, 0.1)' : 'none'
                      }}>
                        <Clock size={12} />
                        {isCompleted ? (
                          <>
                            DEADLINE: {new Date(deadlineDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} | 
                            COMPLETED ON {compDate} ✅
                          </>
                        ) : (
                          <>
                            {new Date(deadlineDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} | 
                            {isToday ? ' DEADLINE TODAY ⚠️' : (isDeadlinePast ? ' DEADLINE CROSSED' : ' DEADLINE')}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 20px 0', maxWidth: '600px' }}>{pDesc}</p>
                  
                  {isApproved && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '6px 14px', 
                      borderRadius: '12px', 
                      backgroundColor: '#f0fdf4', 
                      color: '#16a34a', 
                      fontSize: '11px', 
                      fontWeight: '800', 
                      border: '1.5px solid #dcfce7',
                      width: 'fit-content'
                    }}>
                      ✓ VERIFIED
                    </div>
                  )}
                </div>

                {/* Right Side: Progress & Buttons */}
                <div style={{ width: winWidth < 1024 ? '100%' : '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sprint Progress</span>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a8a' }}>{pProg}%</span>
                  </div>
                  
                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${pProg}%` }} 
                      style={{ height: '100%', backgroundColor: '#3B5998', borderRadius: '10px' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Pending', 'In Progress', 'Completed'].map(st => {
                        const isActive = pStatus.toLowerCase() === st.toLowerCase();
                        // Lock logic:
                        // 1. Fully locked if Approved by manager.
                        // 2. If Completed (or 100%), lock Pending/In Progress so user can't revert, UNLESS it was Rejected by manager.
                        const isTaskDone = pStatus === 'Completed' || pProg === 100;
                        const isTeamProject = activeView === 'TEAM';
                        const isLocked = isTeamProject || isApproved || (isTaskDone && st !== 'Completed');
                        
                        // Keep all buttons visible so they are never removed from the UI

                        return (
                          <button 
                            key={st}
                            onClick={() => !isLocked && handleStatusUpdate(pName, st, proj.id, pStatus, pProg)}
                            disabled={isLocked}
                            title={isLocked ? (isTeamProject ? 'Team projects are read-only' : isApproved ? 'Approved by manager' : isRejected ? 'Rejected – awaiting resubmission' : 'Task is completed') : ''}
                            style={{ 
                              flex: 1, 
                              padding: '10px 5px', 
                              borderRadius: '12px', 
                              border: '1.5px solid',
                              borderColor: isActive ? '#3B5998' : '#e2e8f0',
                              backgroundColor: isActive ? '#3B5998' : (isLocked ? '#f8fafc' : 'white'),
                              color: isActive ? 'white' : (isLocked ? '#cbd5e1' : '#64748b'),
                              fontSize: '9px', 
                              fontWeight: '1000', 
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              textTransform: 'uppercase',
                              transition: 'all 0.2s ease',
                              opacity: isLocked && !isActive ? 0.5 : 1
                            }}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                </div>
              </div>

              {/* Highlighted Manager Review & Status Section */}
              <div style={{ 
                marginTop: '15px', 
                padding: '10px 18px', 
                borderRadius: '16px', 
                backgroundColor: '#0B1E3F',
                boxShadow: '0 6px 20px rgba(11, 30, 63, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                      <Shield size={16} color="white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Managerial Review</span>
                  </div>
                  
                  {/* Status Badge */}
                  <div style={{ 
                    padding: '6px 14px', 
                    borderRadius: '10px', 
                    fontSize: '10px', 
                    fontWeight: '900',
                    backgroundColor: isApproved ? '#16a34a' : (isRejected ? '#e11d48' : 'rgba(255,255,255,0.15)'),
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}>
                    {isApproved ? 'APPROVED' : (isRejected ? 'REJECTED' : (verifyText ? verifyText : 'PENDING REVIEW'))}
                  </div>
                </div>

                <div style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255,255,255,0.85)', 
                  lineHeight: '1.4',
                  fontWeight: '500',
                  fontStyle: 'italic',
                  paddingLeft: '10px',
                  borderLeft: '2px solid rgba(255,255,255,0.2)'
                }}>
                  { finalReview 
                    ? `"${finalReview}"`
                    : "Your manager hasn't provided feedback yet. It will appear here once reviewed."
                  }
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '35px', color: '#94a3b8' }}>
            <Briefcase size={40} style={{ opacity: 0.3, marginBottom: '15px' }} />
            <div style={{ fontWeight: '800' }}>No active missions logged for this category.</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {notificationFeedback && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3B5998', color: 'white', padding: '12px 30px', borderRadius: '15px', fontWeight: '900', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            {notificationFeedback}
          </motion.div>
        )}
      </AnimatePresence>

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
                Are you sure you want to mark <span style={{ fontWeight: '800', color: '#1e3a8a' }}>{pendingStatusData?.pName}</span> as <span style={{ fontWeight: '800' }}>{pendingStatusData?.st}</span>? 
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

export default ProjectScreen;
