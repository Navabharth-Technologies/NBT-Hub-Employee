export const BASE_URL = 'http://192.168.1.17:5000';
export const TEAM_OFFICE_AUTH_TOKEN = 'your_default_token_here'; // Added as requested by new component


export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/api/login`,
  REGISTER: `${BASE_URL}/api/register`,
  PROFILE: (email) => `${BASE_URL}/api/profile/${email}`,
  MANAGER: (email) => `${BASE_URL}/api/profile/manager?email=${email}`,
  UPDATE_PROFILE: `${BASE_URL}/api/profile/update`,
  UPDATE_ABOUT: `${BASE_URL}/api/profile/about`,
  UPDATE_PASSWORD: `${BASE_URL}/api/profile/update-password`,
  NEW_JOINEES_GET: `${BASE_URL}/api/new-joinees`,
  NEW_JOINEE: `${BASE_URL}/api/new-joinee`,

  TEAMS: `${BASE_URL}/api/teams`,
  USERS: `${BASE_URL}/api/users`,
  EMPLOYEES: `${BASE_URL}/api/employees`,
  ROSTER: (type) => `${BASE_URL}/api/roster/${type}`,

  HOLIDAYS: `${BASE_URL}/api/holidays`,
  BIRTHDAYS: `${BASE_URL}/api/birthdays`,

  ASSIGN_TASK: `${BASE_URL}/api/master-task`,
  TASKS_ASSIGNED: (userId) => `${BASE_URL}/api/tasks/assigned/${String(userId || '').split(':')[0]}`,
  UPDATE_TASK_STATUS: (taskId) => `${BASE_URL}/api/tasks/status/${String(taskId || '').split(':')[0]}`,
  VERIFY_TASK: (taskId) => `${BASE_URL}/api/master-task/review/${String(taskId || '').split(':')[0]}`,
  TASK_UPDATES: `${BASE_URL}/api/task-updates`,
  TASKS: `${BASE_URL}/api/tasks`,
  TASKS_BY_MANAGER: (managerId) => `${BASE_URL}/api/tasks/manager/${managerId}`,
  TASKS_BY_TEAM: (teamName) => `${BASE_URL}/api/tasks/team/${teamName}`,
  TASK_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${String(id || '').split(':')[0]}`,
  TASKS_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${String(id || '').split(':')[0]}`,
  SINGLE_TASK_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${String(id || '').split(':')[0]}`,
  ALL_ASSIGNED_TASKS: `${BASE_URL}/api/tasks/all-assigned`,
  SINGLE_TASK_DETAIL: (id) => `${BASE_URL}/api/master-task/${String(id || '').split(':')[0]}`,

  STATUS: `${BASE_URL}/api/status`,
  TEST_DB: `${BASE_URL}/api/test-db`,
  THREADS: `${BASE_URL}/api/threads`,
  THREAD_REACT: (id) => `${BASE_URL}/api/threads/${id}/react`,
  THREAD_REACTORS: (id, type) => `${BASE_URL}/api/threads/${id}/reactors${type ? `?type=${encodeURIComponent(type)}` : ''}`,
  THREAD_BADGE: (id) => `${BASE_URL}/api/threads/${id}/badge`,
  THREAD_COMMENT: (id) => `${BASE_URL}/api/threads/${id}/comment`,
  THREAD_COMMENTS: (id) => `${BASE_URL}/api/threads/${id}/comments`,
  THREAD_UPDATE: (id) => `${BASE_URL}/api/threads/${id}`,
  THREAD_DELETE: (id) => `${BASE_URL}/api/threads/${id}`,
  THREAD_USER: (userId) => `${BASE_URL}/api/threads/user/${userId}`,
  COMMENT_DELETE: (threadId, commentId) => `${BASE_URL}/api/threads/${threadId}/comments/${commentId}`,
  COMMENT_UPDATE: (threadId, commentId) => `${BASE_URL}/api/threads/${threadId}/comments/${commentId}`,
  SUBORDINATES: (userId) => `${BASE_URL}/api/subordinates/${userId}`,

  NOTIFICATIONS: `${BASE_URL}/api/notifications`,
  SUPPORT_TICKETS: `${BASE_URL}/api/support-tickets`,
  UPDATE_TICKET: (id) => `${BASE_URL}/api/support-tickets/${id}`,
  SUPPORT_AGENTS: `${BASE_URL}/api/support-agents`,
  COURSES: `${BASE_URL}/api/courses`,
  NEW_JOINEE_DETAIL: (id) => `${BASE_URL}/api/new-joinees/${String(id || '').split(':')[0]}`,
  NEW_JOINEE_COURSES: (id) => `${BASE_URL}/api/newjoinee-courses?joineeId=${String(id || '').split(':')[0]}`,
  NEW_JOINEE_COURSES_BASE: `${BASE_URL}/api/newjoinee-courses`,
  UPDATE_JOINEE_COURSE: (id) => `${BASE_URL}/api/newjoinee-courses/${String(id || '').split(':')[0]}`,
  ATTENDANCE_LOGS: (userId) => `${BASE_URL}/api/attendance_logs?userId=${String(userId || '').split(':')[0]}`,
  ATTENDANCE_LOGS_GET: `${BASE_URL}/api/attendance_logs`,
  ATTENDANCE_PUNCH: `${BASE_URL}/api/attendance_logs/punch`,
  ATTENDANCE_PUNCH_UPDATE: `${BASE_URL}/api/attendance/update-punch-time`, // New endpoint for manual edits

  LEAVE_BALANCE: (userId) => `${BASE_URL}/api/leaves/balance/${String(userId || '').split(':')[0]}`,
  LEAVE_REQUEST: `${BASE_URL}/api/leaves/request`,
  UPDATE_LEAVE_STATUS: (id) => `${BASE_URL}/api/leaves/${String(id || '').split(':')[0]}/status`,
  MY_LEAVES_GET: (userId) => `${BASE_URL}/api/leaves/my?userId=${String(userId || '').split(':')[0]}`,
  ALL_LEAVES: `${BASE_URL}/api/leaves`,
  LEAVES_GET: `${BASE_URL}/api/leaves`, // Unified name for new component
  LEAVE_STATS: (userId) => `${BASE_URL}/api/leave-stats?userId=${String(userId || '').split(':')[0]}`,
  LEAVE_STATS_MY: `${BASE_URL}/api/leaves/stats/my`,
  LEAVE_STATS_ADMIN: `${BASE_URL}/api/admin/leaves/stats`,
  LEAVE_BALANCE_UPDATE: `${BASE_URL}/api/leaves/stats/update`,
  LEAVE_BALANCE_ALIAS: `${BASE_URL}/api/leaves/balance/update`,

  TASK_UPDATES_USER: (userId) => `${BASE_URL}/api/task-updates?userId=${String(userId || '').split(':')[0]}`,

  // Rewards System
  REWARDS_LEADERBOARD: `${BASE_URL}/api/rewards/leaderboard`,
  REWARDS_MY: `${BASE_URL}/api/rewards/my`,
  REWARDS_ALL: `${BASE_URL}/api/rewards`,
  REWARDS_USER: (id) => `${BASE_URL}/api/rewards/user/${String(id || '').split(':')[0]}`,
  REWARDS_GRANT_OPTIONS: `${BASE_URL}/api/rewards/grant`,
  REWARDS_GRANT: `${BASE_URL}/api/rewards/grant`,

  // Resignation System
  RESIGNATION_SUBMIT: `${BASE_URL}/api/resignations`,
  RESIGNATION_MY: `${BASE_URL}/api/resignations/my`,

  // Service Certificate System
  SERVICE_CERT_SUBMIT: `${BASE_URL}/api/service-certificates`,
  SERVICE_CERT_MY: `${BASE_URL}/api/service-certificates/my`,

  // Quiz System
  QUIZ_ANSWER: (quizId) => `${BASE_URL}/api/quizzes/${quizId}/answer`,
  QUIZ_DATA: (quizId) => `${BASE_URL}/api/quizzes/${quizId}`,
  QUIZZES_ALL: `${BASE_URL}/api/quizzes`,
  QUIZ_COMPLETIONS_MY: `${BASE_URL}/api/quizzes/my-completions`,
  FUN_QUIZZES: `${BASE_URL}/api/fun-quizzes`,
  QUIZ_SUBMIT_SESSION: `${BASE_URL}/api/quizzes/submit-session`,
  QUIZ_SUBMIT_TOTAL: `${BASE_URL}/api/quizzes/submit-total`,
  //employee profile
  EMPLOYEE_PROFILE: (id) => `${BASE_URL}/api/employee-profile/${id}`,
  MY_EMPLOYEE_PROFILE: `${BASE_URL}/api/employee-profile/my`,
  UPDATE_EMPLOYEE_PROFILE: `${BASE_URL}/api/employee-profile/update`,
  ASSETS: `${BASE_URL}/api/assets`,
  MY_ASSETS: (id) => `${BASE_URL}/api/my-assets?employee_id=${String(id || '').split(':')[0]}`,
  USER_SEARCH: (query) => `${BASE_URL}/api/users/search?query=${query}`,
  SUGGESTIONS: `${BASE_URL}/api/suggestions`
};
