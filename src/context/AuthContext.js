import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

export const AuthContext = (typeof window !== 'undefined' && window.__NBT_AUTH_CONTEXT__)
  ? window.__NBT_AUTH_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_AUTH_CONTEXT__) {
  window.__NBT_AUTH_CONTEXT__ = AuthContext;
}

// Helper to safely set localStorage with failover to sessionStorage
export const safeSetItem = (key, value) => {
    let finalValue = value;
    
    // Aggressive pruning: Only prune if reaching the absolute limits of localStorage (~5MB)
    if (key === 'user' && value.length > 5000000) { 
        try {
            const u = JSON.parse(value);
            // Keep critical identity AND visual data
            const pruned = { 
                id: u.id || u.employee_id || u.userId, 
                employee_id: u.employee_id || u.id,
                name: u.name || u.employee_name, 
                email: u.email, 
                role: u.role,
                profileImage: u.profileImage || u.profile_image || u.profile_pic || u.profile_picture || u.avatar,
                profile_pic: u.profile_pic || u.profileImage || u.profile_image || u.profile_picture || u.avatar,
                profile_picture: u.profile_picture || u.profile_pic || u.profileImage,
                pan_card_copy: u.pan_card_copy,
                aadhar_card_copy: u.aadhar_card_copy
            };

            finalValue = JSON.stringify(pruned);
        } catch (e) {}
    }

    try {
        localStorage.setItem(key, finalValue);
    } catch (e) {
        // Fallback to SessionStorage if LocalStorage is full/blocked
        try {
            sessionStorage.setItem(key, finalValue);
        } catch (err) {}
    }
};

export const safeGetItem = (key) => {
    try {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (e) {
        return sessionStorage.getItem(key);
    }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // ✅ Lazy initialization: read persisted user directly from localStorage on first render
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Security: block admin/HR sessions on the employee portal
      const role = String(parsed?.role || '').toUpperCase();
      if (role.includes('ADMIN') || role.includes('HR') || role.includes('PM') || role.includes('PROJECT MANAGER')) {
        return null;
      }
      return parsed;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const savedUser = safeGetItem('user');
    const token = safeGetItem('token');
    if (savedUser && token) {
      const u = JSON.parse(savedUser);
      
      // Security Validation: Ensure no leftover Admin/Manager sessions persist on the Employee Portal
      const role = String(u.role || '').toUpperCase();
      if (role.includes('ADMIN') || role.includes('HR') || role.includes('PM') || role.includes('PROJECT MANAGER')) {
          logout();
          return;
      }

      setUser(u);
      
      // FIX: Master Copy Synchronization
      // We load from LocalStorage first, then fetch from server.
      // If server returns empty fields for things we have locally (like Base64 images), we preserve the local ones.
      fetch(API_ENDPOINTS.PROFILE(u.email), {
        headers: { 'Authorization': `Bearer ${token.trim()}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data) {
                // Strategic Merge: Preserve local visual data if server is null/broken
                const mergedUser = { ...u };
                Object.keys(data).forEach(key => {
                    const serverVal = data[key];
                    // Only overwrite if server has a non-null, non-empty value
                    if (serverVal !== null && serverVal !== '' && serverVal !== 'null') {
                        mergedUser[key] = serverVal;
                    }
                });
                
                setUser(mergedUser);
                safeSetItem('user', JSON.stringify(mergedUser));
            }
        }).catch(err => console.error("Profile Sync error:", err));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = String(password || '').trim().toLowerCase();

    const productionLoginPromise = fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sanitizedEmail, password })
    }).catch(e => ({ ok: false, error: e }));

    try {
      // Prioritize Production Login Result
      const prodRes = await productionLoginPromise;
      if (prodRes.ok) {
        const data = await prodRes.json();
        const userData = data.user;
        
        // --- ROLE-BASED RESTRICTION ---
        // Block Super Admin, HR, and PM from accessing the Employee-only webpage
        const role = String(userData.role || '').toUpperCase();
        if (role.includes('ADMIN') || role.includes('HR') || role.includes('PM') || role.includes('PROJECT MANAGER')) {
          console.warn('[Login Auth] ACCESS DENIED: Manager/Admin role attempted employee portal login:', role);
          return { success: false, error: 'Access Restricted: Please use the Administrative Portal.' };
        }

        setUser(userData);
        
        // Sync full profile metadata
        try {
          const profileRes = await fetch(API_ENDPOINTS.PROFILE(userData.email));
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const fullUser = { ...userData, ...profileData };
            setUser(fullUser);
            safeSetItem('user', JSON.stringify(fullUser));
          }
        } catch (err) {
          // Profile sync failed or timed out
        }

        safeSetItem('user', JSON.stringify(userData));
        safeSetItem('token', data.token);
        return { success: true };
      }

      // If production login fails (e.g. 401 Unauthorized), return error immediately.
      // Removed insecure sandbox/hardcoded password fallbacks.
      if (prodRes.status === 401 || prodRes.status === 404) {
        return { success: false, error: 'Invalid email or password' };
      }
      return { success: false, error: 'Connection refused or Server Error' };

    } catch (e) {
      console.error("Login unexpected error:", e);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };


  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateProfile = async (field, value) => {
    if (!user) return { success: false, error: 'User not logged in' };
    try {
      const token = safeGetItem('token');
      const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value, email: user.email })
      });
      if (res.ok) {
        const updatedUser = { ...user, [field]: value };
        setUser(updatedUser);
        // Sync with localStorage so it persists on reload
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
      }
      
      // If 400 (Bad Request), it's likely a payload size issue. Fallback to local-only sync to prevent "vanishing".
      if (res.status === 400) {
        console.warn("[AuthContext] Payload too large for server. Syncing locally only for visual persistence.");
        const updatedUser = { ...user, [field]: value };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: 'Failed to update' };
    } catch (e) {
      const updatedUser = { ...user, [field]: value };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true };
    }
  };

  const checkBlockedStatus = async (currentUser) => {
    if (!currentUser || (currentUser.role !== 'Trainee' && !currentUser.isNewJoinee)) {
      setIsBlocked(false);
      return;
    }

    const uid = currentUser.id || currentUser.empId || currentUser.employee_id || 1;
    const token = safeGetItem('token');
    const headers = { 'Accept': 'application/json' };
    if (token && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    try {
      const [detailRes, enrollmentRes] = await Promise.allSettled([
        fetch(API_ENDPOINTS.NEW_JOINEE_DETAIL(uid), { headers }),
        fetch(API_ENDPOINTS.NEW_JOINEE_COURSES(uid), { headers })
      ]);

      let joiningDateStr = currentUser.joining_date || currentUser.created_at;
      if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
        const detail = await detailRes.value.json();
        joiningDateStr = detail?.joining_date || detail?.created_at || joiningDateStr;
      }

      let courses = [];
      if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.ok) {
        const raw = await enrollmentRes.value.json();
        courses = Array.isArray(raw) ? raw : (raw.value || raw.data || []);
      }

      const startDate = joiningDateStr ? new Date(joiningDateStr) : null;
      const today = new Date();
      const diffDays = startDate ? Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) : 0;
      const isAllCompleted = courses.length > 0 && courses.every(c => c.status === 'Completed');

      if (diffDays > 10 && !isAllCompleted) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    } catch (e) {
      console.error("[AuthContext] Block check failed:", e);
    }
  };

  useEffect(() => {
    if (user) checkBlockedStatus(user);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading, isBlocked, setIsBlocked, checkBlockedStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
