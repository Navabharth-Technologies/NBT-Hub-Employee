export const BASE_URL = 'http://192.168.1.32:5000';
export const TEAM_OFFICE_AUTH_TOKEN = 'your_default_token_here'; // Added as requested by new component

export const cleanId = (id) => {
  if (!id) return '';
  let s = String(id).trim();

  // Handle comma-separated IDs (take the first one)
  if (s.includes(',')) {
    s = s.split(',')[0].trim();
  }

  // Handle triple repetition bug (e.g. 202516202516202516)
  if (s.length >= 9 && s.length % 3 === 0) {
    const partLen = s.length / 3;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen, partLen * 2);
    const p3 = s.substring(partLen * 2);
    if (p1 === p2 && p1 === p3) return p1;
  }

  // Handle double repetition bug (e.g. 202512202512)
  if (s.length >= 6 && s.length % 2 === 0) {
    const partLen = s.length / 2;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen);
    if (p1 === p2) return p1;
  }

  return s;
};

// ✅ Company branding constants — single source of truth
export const COMPANY_INFO = {
  name: 'Navabharath Technologies',
  tagline: 'Smarter Solutions for Better Future',
  phone: '0821-3128831',
  website: 'www.navabharathtechnologies.com',
  email: 'contact@navabharathtechnologies.com',
};

// ✅ Helper to resolve any image path (URL or Base64) without corrupting data
export const resolveImagePath = (path) => {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


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
  BANK_IFSC: (code) => `${BASE_URL}/api/bank/ifsc/${code}`,

  TEAMS: `${BASE_URL}/api/teams`,
  USERS: `${BASE_URL}/api/users`,
  EMPLOYEES: `${BASE_URL}/api/employees`,
  ROSTER: (type) => `${BASE_URL}/api/roster/${type}`,

  HOLIDAYS: `${BASE_URL}/api/holidays`,
  BIRTHDAYS: `${BASE_URL}/api/birthdays`,

  ASSIGN_TASK: `${BASE_URL}/api/master-task`,
  TASKS_ASSIGNED: (userId) => `${BASE_URL}/api/tasks/assigned/${userId}`,
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
  NOTIFICATIONS_MARK_READ: (id) => `${BASE_URL}/api/notifications/${id}/read`,
  NOTIFICATIONS_MARK_READ_ALL: (userId) => `${BASE_URL}/api/notifications/read-all/${userId}`,
  SUPPORT_TICKETS: `${BASE_URL}/api/support-tickets`,
  UPDATE_TICKET: (id) => `${BASE_URL}/api/support-tickets/${id}`,
  SUPPORT_AGENTS: `${BASE_URL}/api/support-agents`,
  COURSES: `${BASE_URL}/api/courses`,
  COURSE_PROGRESS: `${BASE_URL}/api/courses/progress`,
  USER_COURSES: `${BASE_URL}/api/user-courses`,
  COURSE_COMPLETE: (id) => `${BASE_URL}/api/courses/${id}/complete`,
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
  REWARDS_LEADERBOARD: `${BASE_URL}/api/public/employees/leaderboard/all?key=1abeb9c7e1c705b449384bbd8caf8328e538ff496c969024a7aaefb64edd17de`,
  REWARDS_MY: `${BASE_URL}/api/rewards/my`,
  REWARDS_ALL: `${BASE_URL}/api/rewards`,
  REWARDS_USER: (userId) => `${BASE_URL}/api/rewards/user/${String(userId || '').split(':')[0]}`,
  REWARDS_GRANT: `${BASE_URL}/api/rewards/grant`,


  // Resignation System
  RESIGNATION_SUBMIT: `${BASE_URL}/api/resignations`,
  RESIGNATION_MY: `${BASE_URL}/api/resignations/my`,
  EXIT_FORMALITIES: `${BASE_URL}/api/exit-formalities`,

  // Service Certificate System
  SERVICE_CERT_SUBMIT: `${BASE_URL}/api/service-certificates`,
  SERVICE_CERT_MY: `${BASE_URL}/api/service-certificates/my`,
  SERVICE_CERTIFICATES: (id) => `${BASE_URL}/api/service-certificates${id ? `/${String(id || '').split(':')[0]}` : ''}`,
  SERVICE_CERTIFICATES_MY: `${BASE_URL}/api/service-certificates/my`,
  SERVICE_CERTIFICATES_USER: (id) => `${BASE_URL}/api/service-certificates?userId=${String(id || '').split(':')[0]}`,

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
  SUGGESTIONS: `${BASE_URL}/api/suggestions`,
  MY_PAYSLIPS: (userId) => `${BASE_URL}/api/pay-slips/my${userId ? `?userId=${String(userId).split(':')[0]}` : ''}`,
  PASSWORD_REQUEST_OTP: `${BASE_URL}/api/password/request-otp`,
  PASSWORD_VERIFY_OTP: `${BASE_URL}/api/password/verify-otp`,
  PASSWORD_RESET: `${BASE_URL}/api/password/reset-with-otp`,
  CHANGE_PASSWORD: `${BASE_URL}/api/password/change-password`,
  QUIZ_USER_POINTS: `${BASE_URL}/api/quizzes/user-points`,
  QUIZ_LEADERBOARD: `${BASE_URL}/api/quizzes/leaderboard`,
  EXIT_FEEDBACK: `${BASE_URL}/api/exit-feedback`
};

export const INTERN_API_ENDPOINTS = {
  ...API_ENDPOINTS,
  USERS: `${BASE_URL}/api/interns`,
  EMPLOYEES: `${BASE_URL}/api/interns`,
  MANAGERS: `${BASE_URL}/api/users`,
  INTERN_UPDATE: (id) => `${BASE_URL}/api/interns/update/${String(id || '').split(':')[0]}`
};