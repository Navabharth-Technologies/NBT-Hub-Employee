import React, { useState, useEffect, cloneElement } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Save, CreditCard, Building2, FileText, ChevronDown,
  Shield, AlertCircle, CheckCircle2, User, Hash, Landmark, RefreshCw,
  Briefcase, MapPin, Mail, Phone, GraduationCap, History, DollarSign,
  FileCheck, Users, Calendar, Heart, Globe, Trash2, Pencil, Camera, Image as ImageIcon, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';

// These fields are strictly controlled by the backend for non-admin users
const LOCKED_FIELDS = [
  'designation', 'department',
  'gross_salary_a', 'salary', 'pt', 'bgv_status', 'approved_by_ceo',
  'onboarding_link', 'appointment_letter', 'onboarding_doc_completed', 'id_card',
  'emp_id', 'doj', 'lwd', 'asset_name', 'asset_serial_no', 'asset_charger_details',
  'has_mouse', 'has_keyboard', 'has_laptop_stand', 'has_ruf_pad', 'has_pendrive',
  'has_mobile', 'has_camera', 'has_headphone', 'has_tablet'
];

const SECTIONS = [
  {
    id: 'primary',
    label: 'Primary Profile',
    icon: <User size={20} />,
    color: '#3b82f6',
    fields: [
      { key: 'emp_name', label: 'Employee Name', placeholder: 'Full Name', type: 'text' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'dob', label: 'Date of Birth', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'age', label: 'Age', type: 'text', placeholder: 'Years' },
      { key: 'religion', label: 'Religion', type: 'text' },
      { key: 'blood_group', label: 'Blood Group', type: 'text' },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Indian' },
      { key: 'father_husband_name', label: "Father/Husband's Name", type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Other'] },
      { key: 'pan_number', label: 'PAN Number', type: 'text', placeholder: 'ABCDE1234F' },
      { key: 'pan_card_copy', label: 'PAN Card Proof', type: 'file' },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: '1234 5678 9012' },
      { key: 'aadhar_card_copy', label: 'Aadhar Card Proof', type: 'file' },
    ]
  },
  {
    id: 'hierarchy',
    label: 'Organizational Hierarchy',
    icon: <Building2 size={20} />,
    color: '#8b5cf6',
    fields: [
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'process', label: 'Process', type: 'text' },
      { key: 'supervisor_l1', label: 'Supervisor L1 (Reporting Person)', type: 'text' },
      { key: 'supervisor_l2', label: 'Supervisor L2', type: 'text' },
      { key: 'doj', label: 'Date of Joining', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'ft_pt', label: 'FT/PT', type: 'select', options: ['Full Time', 'Part Time', 'Contract'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Bench', 'Notice Period', 'Terminated'] },
      { key: 'place', label: 'Work Location', type: 'text' },
      { key: 'moved', label: 'Moved (Project/Dept)', type: 'text' },
      { key: 'official_email_id', label: 'Official Email ID', type: 'text' },
    ]
  },
  {
    id: 'contact',
    label: 'Contact & Geography',
    icon: <MapPin size={20} />,
    color: '#10b981',
    fields: [
      { key: 'contact_no', label: 'Contact No', type: 'text' },
      { key: 'emergency_contact_no', label: 'Emergency Contact No', type: 'text' },
      { key: 'personal_email_id', label: 'Personal Email ID', type: 'text' },
      { key: 'present_address', label: 'Present Address', type: 'text' },
      { key: 'permanent_address', label: 'Permanent Address', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
    ]
  },
  {
    id: 'academic',
    label: 'Academic & Career',
    icon: <GraduationCap size={20} />,
    color: '#f59e0b',
    fields: [
      { key: 'qualification', label: 'Qualification', type: 'text' },
      { key: 'edu_completion_year', label: 'EDU Completion Year', type: 'text' },
      { key: 'college', label: 'College', type: 'text' },
      { key: 'university', label: 'University', type: 'text' },
      { key: 'languages_known', label: 'Languages Known', type: 'text' },
      
      { type: 'header', label: 'Academic Milestones & Proofs' },
      { key: 'sslc_percentage', label: 'SSLC Percentage', type: 'text' },
      { key: 'sslc_marks_card', label: 'SSLC Marks Card', type: 'file' },
      
      { key: 'puc_percentage', label: 'PUC / 12th Percentage', type: 'text' },
      { key: 'puc_marks_card', label: 'PUC Marks Card / 12th', type: 'file' },
      
      { key: 'graduation_percentage', label: 'Graduation Percentage / CGPA', type: 'text' },
      { key: 'graduation_certificate', label: 'Graduation Certificate', type: 'file' },
      
      { type: 'header', label: 'Professional History & Proofs' },
      { key: 'previous_organization', label: 'Previous Organization', type: 'text' },
      { key: 'previous_experience', label: 'Previous Experience (Years)', type: 'text' },
      { key: 'exp_letter_copy', label: 'Experience Letter', type: 'file' },
      { key: 'source', label: 'Source (How you found us)', type: 'text' },
    ]
  },
  {
    id: 'exit',
    label: 'Exit & Retention',
    icon: <History size={20} />,
    color: '#ef4444',
    fields: [
      { key: 'separation', label: 'Separation Date', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'lwd', label: 'Last Working Day (LWD)', type: 'text' },
      { key: 'attrition_bucket', label: 'Attrition Bucket', type: 'select', options: ['N/A', 'Resignation', 'Performance', 'Behavioral', 'Medical'] },
      { key: 'reason', label: 'Reason of Separation', type: 'text' },
    ]
  },
  {
    id: 'finance',
    label: 'Banking & Finance',
    icon: <Landmark size={20} />,
    color: '#315A9E',
    fields: [
      { key: 'bank_name', label: 'Bank Name', type: 'text' },
      { key: 'bank_account_no', label: 'Bank Account No.', type: 'text' },
      { key: 'ifsc_code', label: 'IFSC Code', type: 'text' },
      { key: 'bank_branch', label: 'Bank Branch', type: 'text' },
      { key: 'gross_salary_a', label: 'Gross Salary (A)', type: 'text' },
      { key: 'salary', label: 'Net Salary', type: 'text' },
      { key: 'pt', label: 'Professional Tax (PT)', type: 'text' },
    ]
  },
  {
    id: 'compliance',
    label: 'Compliance & Docs',
    icon: <FileCheck size={20} />,
    color: '#0ea5e9',
    fields: [
      { key: 'bgv_status', label: 'BGV Status', type: 'select', options: ['Pending', 'Completed', 'Failed'] },
      { key: 'appointment_letter', label: 'Appointment Letter', type: 'select', options: ['Not Sent', 'Sent', 'Signed'] },
      { key: 'approved_by_ceo', label: 'Approved By CEO', type: 'select', options: ['No', 'Yes'] },
      { key: 'onboarding_doc_completed', label: 'Onboarding Doc Completed', type: 'select', options: ['No', 'Yes'] },
      { key: 'id_card', label: 'ID Card Status', type: 'select', options: ['Not Issued', 'Issued'] },
      { key: 'onboarding_link', label: 'Onboarding Link', type: 'text' },
    ]
  },
  {
    id: 'assets',
    label: 'Assets Management',
    icon: <Briefcase size={20} />,
    color: '#6366f1',
    fields: [
      { key: 'emp_id', label: 'Employee ID', type: 'text' },
      { key: 'emp_name', label: 'Employee Name', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'doj', label: 'Joining Date', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'lwd', label: 'Last Working Day', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'asset_name', label: 'Laptop Details', type: 'textarea' },
      { key: 'has_mouse', label: 'Mouse', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_keyboard', label: 'Keyboard', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_laptop_stand', label: 'Laptop Stand', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_ruf_pad', label: 'Ruf Pad', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_pendrive', label: 'Pendrive', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_mobile', label: 'Company Mobile', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_camera', label: 'External Camera', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_headphone', label: 'Earphone/Headphone', type: 'select', options: ['No', 'Yes'] },
      { key: 'has_tablet', label: 'Tablet', type: 'select', options: ['No', 'Yes'] },
    ]
  }
];

export default function DocumentsScreen({ onBack }) {
  const { user } = useAuth();
  const { employeeId } = useParams();

  const [form, setForm] = useState({
    emp_name: '', gender: 'Male', dob: '', age: '', religion: '', blood_group: '', marital_status: 'Single', nationality: 'Indian', father_husband_name: '', pan_number: '', aadhar_number: '', category: 'General',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email_id: '',
    contact_no: '', emergency_contact_no: '', personal_email_id: '', present_address: '', permanent_address: '', state: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_organization: '', previous_experience: '', source: '', languages_known: '',
    separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
    bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '',
    bgv_status: 'Pending', appointment_letter: 'Not Sent', approved_by_ceo: 'No', onboarding_doc_completed: 'No', id_card: 'Not Issued', onboarding_link: '',
    emp_id: '', doj: '', lwd: '', asset_name: '',
    has_mouse: 'No', has_keyboard: 'No', has_laptop_stand: 'No', has_ruf_pad: 'No', has_pendrive: 'No', has_mobile: 'No', has_camera: 'No', has_headphone: 'No', has_tablet: 'No',
    pan_card_copy: '', aadhar_card_copy: '', exp_letter_copy: '', sslc_marks_card: '', graduation_certificate: '',
    sslc_percentage: '', puc_percentage: '', graduation_percentage: '', puc_marks_card: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [activeSection, setActiveSection] = useState('primary');
  const [isEditing, setIsEditing] = useState(false);
  const [viewImage, setViewImage] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadAssets = async () => {
    const uid = employeeId || user?.employee_id || user?.id || user?.userId;
    if (!uid) return;
    


    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token || token === 'undefined') return;

      const headers = { 'Accept': 'application/json' };
      // Sandbox bypass: if token is the hardcoded demo string, some backends might reject 'Bearer '
      if (token === 'joinee-sandbox-secure-nbt') {
          headers['Authorization'] = token;
      } else {
          headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(API_ENDPOINTS.MY_ASSETS(uid), { headers });
      
      if (res.status === 401 && headers['Authorization'].startsWith('Bearer ')) {
          // Fallback: try without 'Bearer ' prefix if 401 occurs
          const retryRes = await fetch(API_ENDPOINTS.MY_ASSETS(uid), {
              headers: { ...headers, 'Authorization': token.trim() }
          });
          if (retryRes.ok) {
              const data = await retryRes.json();
              processAssets(data);
              return;
          }
      }

      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      processAssets(data);
    } catch (err) {
      console.error('%c [Assets Error] ', 'background: red; color: white;', err.message);
    }
  };

  const processAssets = (data) => {
      // Handle both single objects and arrays
      const assetData = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
      
      if (assetData) {
        const assetUpdates = {};
        Object.keys(assetData).forEach(key => {
          let val = assetData[key] === null ? '' : assetData[key];
          const lowerKey = key.toLowerCase();
          
          if (typeof val === 'string' && val.includes('T') && val.length > 10) {
            val = val.substring(0, 10);
          }

          assetUpdates[lowerKey] = val;
          if (lowerKey === 'employee_id') assetUpdates['emp_id'] = val;
          if (lowerKey === 'employee_name') assetUpdates['emp_name'] = val;
          if (lowerKey === 'joining_date') assetUpdates['doj'] = val;
          if (lowerKey === 'last_working_date') assetUpdates['lwd'] = val;
          if (lowerKey === 'laptop_details') assetUpdates['asset_name'] = val;
          
          if (lowerKey === 'mouse') assetUpdates['has_mouse'] = val;
          if (lowerKey === 'keyboard') assetUpdates['has_keyboard'] = val;
          if (lowerKey === 'laptop_stand') assetUpdates['has_laptop_stand'] = val;
          if (lowerKey === 'ruf_pad') assetUpdates['has_ruf_pad'] = val;
          if (lowerKey === 'pendrive') assetUpdates['has_pendrive'] = val;
          if (lowerKey === 'mobile') assetUpdates['has_mobile'] = val;
          if (lowerKey === 'camera') assetUpdates['has_camera'] = val;
          if (lowerKey === 'earphone_headphone') assetUpdates['has_headphone'] = val;
          if (lowerKey === 'tablet') assetUpdates['has_tablet'] = val;
        });

        setForm(prev => ({ ...prev, ...assetUpdates }));
      }
  };

  const loadDocs = async () => {
    const uid = employeeId || user?.employee_id || user?.id || user?.userId;
    if (!uid) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token || token === 'undefined') return;

      const headers = { 'Accept': 'application/json' };
      if (token === 'joinee-sandbox-secure-nbt') {
          headers['Authorization'] = token;
      } else {
          headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // STRATEGY: Regular employees should use the standard profile endpoint which is more reliable.
      // Admins or Manager-View (with employeeId) use the specialized employee-profile endpoint.
      const isPowerUser = ['admin', 'hr', 'ceo', 'manager'].includes(user?.role?.toLowerCase());
      
      let endpoint;
      if (employeeId) {
          endpoint = API_ENDPOINTS.EMPLOYEE_PROFILE(employeeId);
      } else if (isPowerUser) {
          endpoint = API_ENDPOINTS.MY_EMPLOYEE_PROFILE;
      } else {
          endpoint = API_ENDPOINTS.PROFILE(user?.email);
      }

      let res = await fetch(endpoint, { headers });
      
      // Fallback: If specialized endpoint fails (401/403/404), try the basic profile one
      if (!res.ok && endpoint !== API_ENDPOINTS.PROFILE(user?.email)) {
          console.log("[Profile] specialized endpoint failed/forbidden, trying basic profile fallback...");
          res = await fetch(API_ENDPOINTS.PROFILE(user?.email), { headers });
      }

      if (res.ok) {
        const result = await res.json();
        const docData = result.data || (Array.isArray(result) ? result[0] : result);

        if (docData) {
          const cleanData = {};
          Object.keys(docData).forEach(key => {
            let val = docData[key];

            // Ultimate Fix: Deduplicate repeating values even with mixed delimiters/spacing
            if (typeof val === 'string' && (val.includes(',') || val.includes(';'))) {
              const parts = val.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);
              const unique = Array.from(new Set(parts.map(p => p.toLowerCase())));
              if (unique.length > 0) val = parts.find(p => p.toLowerCase() === unique[0]);
            }

            // Date Fix: Truncate ISO timestamps (T00:00:00.000Z) to YYYY-MM-DD
            if (typeof val === 'string' && val.includes('T') && val.length > 10) {
              val = val.substring(0, 10);
            }

            // Normalize DB naming convention (snake_case) to Frontend form keys
            // FIX: Convert null values to empty strings to avoid breaking React inputs
            cleanData[key.toLowerCase()] = val === null ? '' : val;
          });

          // Fallback mapping for core organizational fields if profile record is empty/outdated
          if (!cleanData.designation) cleanData.designation = user?.role || user?.designation || '';
          if (!cleanData.department) cleanData.department = user?.department || user?.dept || '';


          setForm(prev => ({ ...prev, ...cleanData }));
        }
      } else {
        console.warn("DEBUG: Profile Info fetch failed with status:", res.status);
      }
    } catch (err) {
      console.error("Critical: Failed to fetch profile metadata:", err);
    }
  };

  useEffect(() => {
    loadAssets();
    loadDocs();
  }, [user, employeeId]);

  const validateField = (key, value) => {
    let error = null;

    if (!value) return null;

    if (['emp_name', 'father_husband_name', 'nominee_name', 'bank_name', 'religion', 'nationality'].includes(key)) {
      if (/[0-9]/.test(value)) error = 'Numbers are not allowed here';
    } else if (['contact_no', 'emergency_contact_no'].includes(key)) {
      if (/[a-zA-Z]/.test(value)) error = 'Numbers only';
      else if (value.length !== 10) error = 'Must be 10 digits';
    } else if (key === 'aadhar_number') {
      const clean = String(value).replace(/\s/g, '');
      if (/[a-zA-Z]/.test(clean)) error = 'Numbers only';
      else if (clean.length !== 12) error = 'Must be 12 digits';
    } else if (key === 'pan_number') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(String(value).toUpperCase())) error = 'Use ABCDE1234F format';
    } else if (key === 'ifsc_code') {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(String(value).toUpperCase())) error = 'Use ABCD0123456 format';
    } else if (key.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) error = 'Invalid email address';
    }

    return error;
  };

  const handleChange = (key, value) => {
    // Immediate cleaning for specific fields
    let cleanValue = value;
    if (['emp_name', 'father_husband_name', 'religion', 'nationality'].includes(key)) {
      cleanValue = value.replace(/[0-9]/g, ''); // Block numbers instantly
    } else if (['contact_no', 'emergency_contact_no', 'aadhar_number', 'bank_account_no', 'age'].includes(key)) {
      cleanValue = value.replace(/\D/g, ''); // Block non-numbers instantly
    }

    // Length caps
    if ((key === 'contact_no' || key === 'emergency_contact_no') && cleanValue.length > 10) return;
    if (key === 'aadhar_number' && cleanValue.length > 12) return;
    if (key === 'pan_number' && cleanValue.length > 10) cleanValue = cleanValue.substring(0, 10).toUpperCase();
    if (key === 'ifsc_code') cleanValue = cleanValue.toUpperCase();

    let updates = { [key]: cleanValue };

    // Auto-calculate age for DOB format YYYY-MM-DD
    if (key === 'dob' && cleanValue && cleanValue.length === 10) {
      const birthDate = new Date(cleanValue);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0) updates.age = String(age);
      }
    }

    setForm(prev => ({ ...prev, ...updates }));

    // Clear error for this field as the user types
    const error = validateField(key, cleanValue);
    setErrors(prev => ({ ...prev, [key]: error }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    // Preview locally
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', employeeId || user?.employee_id || user?.id);
    formData.append('fieldKey', key);

    try {
      const res = await fetch(`${BASE_URL}/api/profile/upload-document`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const serverPath = data.path || data.url;
        
        if (serverPath) {
          // 1. Update local state
          setForm(prev => ({ ...prev, [key]: serverPath }));
          
          // 2. Automatically persist to individual record to ensure it "stores"
          const uid = employeeId || user?.employee_id || user?.id;
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (!token || token === 'undefined') return;
          
          await fetch(API_ENDPOINTS.UPDATE_EMPLOYEE_PROFILE, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token.trim()}` 
            },
            body: JSON.stringify({ [key]: serverPath, employee_id: uid })
          });
          
          setToast({ type: 'success', msg: `${key.replace(/_/g, ' ').toUpperCase()} stored permanently!` });
        }
      } else {
        if (res.status === 404) {
          console.warn('Backend upload endpoint not found. Image kept in local state for preview.');
          setToast({ type: 'info', msg: 'Photo saved locally (Backend endpoint missing)' });
        } else {
          setToast({ type: 'error', msg: 'Failed to upload document.' });
        }
      }
    } catch (err) {
      console.error('Upload Error:', err);
      // Fallback to local state if server is down
      setToast({ type: 'info', msg: 'Photo updated locally (Network error)' });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSave = async () => {
    // Perform final exhaustive validation
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToast({ type: 'error', msg: 'Please fix the highlighted errors before saving.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const uid = employeeId || user?.employee_id || user?.id || user?.userId;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token || token === 'undefined') {
          setToast({ type: 'error', msg: 'Session expired. Please login again.' });
          return;
      }

      // Scrub data before sending to prevent backend "appending" loops
      const sanitizedForm = {};
      Object.keys(form).forEach(key => {
        let val = form[key];
        if (typeof val === 'string' && val.includes(',')) {
          const parts = val.split(',').map(p => p.trim()).filter(p => p.length > 0);
          const unique = Array.from(new Set(parts));
          if (unique.length > 0) val = unique[0];
        } else if (typeof val === 'string') {
          val = val.trim();
        }
        sanitizedForm[key] = val;
      });

      const payload = { 
        ...sanitizedForm, 
        employee_id: uid,
        email: user?.email,
        userId: uid
      };

      const headers = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token.trim()}` 
      };

      let res = await fetch(API_ENDPOINTS.UPDATE_EMPLOYEE_PROFILE, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      // Fallback 1: Try without 'Bearer ' if 401
      if (res.status === 401) {
          res = await fetch(API_ENDPOINTS.UPDATE_EMPLOYEE_PROFILE, {
              method: 'POST',
              headers: { ...headers, 'Authorization': token.trim() },
              body: JSON.stringify(payload)
          });
      }

      // Fallback 2: Try standard profile update endpoint if specialized one still fails (401/403/404)
      if (!res.ok) {
          console.log("[Profile Save] specialized endpoint failed, trying standard update fallback...");
          res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
              method: 'PUT', // standard update usually uses PUT in this app
              headers: { ...headers, 'Authorization': `Bearer ${token.trim()}` },
              body: JSON.stringify(payload)
          });
      }

      if (res.ok) {
        setToast({ type: 'success', msg: 'Profile updated successfully!' });
        setIsEditing(false);
        await loadDocs();
      } else {
        const err = await res.json().catch(() => ({ error: 'Server Error' }));
        setToast({ type: 'error', msg: err.error || 'Failed to save changes.' });
      }
    } catch (err) {
      console.error("Save Error:", err);
      setToast({ type: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const userRole = user?.role?.toLowerCase() || 'employee';
  const isAdmin = ['admin', 'manager', 'lead', 'teamleader', 'ceo', 'hr'].includes(userRole);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fa', fontFamily: "'Inter', sans-serif", padding: isMobile ? '15px 0' : (isTablet ? '25px' : '40px'), boxSizing: 'border-box', overflowX: 'hidden', width: '100%' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed', top: isMobile ? '20px' : '110px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, backgroundColor: toast.type === 'success' ? '#0B1E3F' : '#ef4444',
              color: 'white', padding: isMobile ? '10px 20px' : '14px 28px', borderRadius: '16px',
              display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '90%' : 'auto',
              fontWeight: '800', fontSize: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              justifyContent: 'center'
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {viewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewImage(null)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
              zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '40px', cursor: 'zoom-out'
            }}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={viewImage}
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            />
            <button style={{ position: 'absolute', top: '30px', right: '30px', background: 'white', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>
              <Trash2 size={20} color="#ef4444" onClick={(e) => { e.stopPropagation(); setViewImage(null); }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'center' : 'center', justifyContent: 'space-between', marginBottom: isMobile ? '24px' : '32px', flexDirection: isMobile ? 'row' : 'row', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', justifyContent: 'flex-start' }}>
          <button onClick={onBack} style={{ padding: isMobile ? '8px' : '12px', borderRadius: '12px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
            <ChevronLeft size={isMobile ? 16 : 22} color="#0B1E3F" />
          </button>
          <div>
            <h1 style={{ fontSize: isMobile ? '18px' : '32px', fontWeight: '900', color: '#0B1E3F', margin: 0, lineHeight: 1 }}>Profile Info</h1>
            <p style={{ fontSize: isMobile ? '10px' : '14px', color: '#64748b', margin: '2px 0 0 0', fontWeight: '600' }}>{isMobile ? 'Metadata record' : 'Employee metadata record'}</p>
          </div>
        </div>

        {isEditing ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: isMobile ? '8px 16px' : '14px 28px', backgroundColor: '#315A9E', color: 'white',
              border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: isMobile ? '12px' : '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 8px 20px rgba(49,90,158,0.25)',
              justifyContent: 'center'
            }}
          >
            {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
            {isMobile ? 'Save' : 'Save All Details'}
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsEditing(true)}
            style={{
              padding: isMobile ? '8px 16px' : '14px 28px', backgroundColor: 'white', color: '#0B1E3F',
              border: '1.5px solid #0B1E3F', borderRadius: '12px', fontWeight: '900', fontSize: isMobile ? '12px' : '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              justifyContent: 'center'
            }}
          >
            <Pencil size={14} />
            {isMobile ? 'Edit' : 'Edit Profile'}
          </motion.button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
        gap: isMobile ? '20px' : '24px',
        alignItems: 'start',
        padding: 0,
        width: isMobile ? '90%' : '100%',
        margin: '0 auto'
      }}>
        <div style={{ width: '100%', margin: '0' }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? '8px' : '12px',
            overflowX: isMobile ? 'auto' : 'visible',
            padding: isMobile ? '5px 15px 15px 15px' : '0',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            maxWidth: isMobile ? '100vw' : '100%'
          }}>
            {SECTIONS.map(sec => {
              const isActive = activeSection === sec.id;
              const hasErrors = sec.fields.some(f => !!errors[f.key]);

              return (
                <motion.button
                  key={sec.id}
                  whileHover={!isMobile ? { x: 4 } : {}}
                  onClick={() => setActiveSection(sec.id)}
                  style={{
                    padding: isMobile ? '8px 14px' : '16px 20px',
                    borderRadius: isMobile ? '12px' : '18px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#0B1E3F' : 'white',
                    color: isActive ? 'white' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '10px' : '14px',
                    fontWeight: '800',
                    fontSize: isMobile ? '12px' : '15px',
                    textAlign: 'left',
                    border: `1.5px solid ${isActive ? '#0B1E3F' : (hasErrors ? '#ef4444' : '#e2e8f0')}`,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative'
                  }}
                >
                  <div style={{ color: isActive ? 'white' : sec.color }}>{cloneElement(sec.icon, { size: isMobile ? 16 : 20 })}</div>
                  <div>{sec.label}</div>

                  {hasErrors && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                    }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '40px',
            border: '1.5px solid #e2e8f0',
            borderRadius: isMobile ? '22px' : '28px',
            boxSizing: 'border-box',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '24px' : '32px' }}>
            <div style={{ padding: isMobile ? '10px' : '12px', borderRadius: '14px', backgroundColor: `${currentSection.color}15`, flexShrink: 0 }}>
              <div style={{ color: currentSection.color }}>{cloneElement(currentSection.icon, { size: isMobile ? 18 : 20 })}</div>
            </div>
            <div>
              <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{currentSection.label}</h2>
              <p style={{ fontSize: isMobile ? '10px' : '14px', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: '600' }}>{isMobile ? 'Metadata records' : 'Official employee metadata records'}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            {currentSection.fields.map((field, fIdx) => {
              if (field.type === 'header') {
                return (
                  <div key={`header-${fIdx}`} style={{ gridColumn: '1 / -1', marginTop: fIdx === 0 ? '0' : '24px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.5px', paddingBottom: '12px', borderBottom: '1.5px solid #f1f5f9' }}>
                      {field.label}
                    </h3>
                  </div>
                );
              }
              const isLockedForRole = LOCKED_FIELDS.includes(field.key) && !isAdmin;
              const isDisabled = (activeSection === 'assets') || !isEditing || isLockedForRole;

              return (
                <div key={field.key} style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  opacity: isLockedForRole ? 0.7 : 1,
                  gridColumn: !isMobile && field.fullWidth ? '1 / -1' : 'auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '900', color: '#64748b', letterSpacing: '0.3px' }}>
                      {field.label}
                    </label>
                    {isLockedForRole && <Shield size={10} color="#94a3b8" />}
                  </div>
                  {field.type === 'select' ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <select
                        value={form[field.key]}
                        disabled={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{
                          width: '100%', padding: isMobile ? '14px 40px 14px 16px' : '16px 45px 16px 20px', borderRadius: isMobile ? '12px' : '16px', fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '700', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                          border: !isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0', outline: 'none', cursor: isDisabled ? 'default' : 'pointer', appearance: 'none', boxSizing: 'border-box',
                          transition: 'all 0.2s', opacity: isDisabled ? 0.8 : 1
                        }}
                      >
                        {field.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                      <div style={{ position: 'absolute', right: isMobile ? '14px' : '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: isDisabled ? '#cbd5e1' : '#315A9E' }}>
                        <ChevronDown size={isMobile ? 16 : 18} strokeWidth={3} />
                      </div>
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={form[field.key]}
                      readOnly={isDisabled}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={isEditing ? (field.placeholder || `Enter ${field.label}`) : 'Not Provided'}
                      style={{
                        width: '100%', padding: '16px 20px', borderRadius: '16px', fontSize: isMobile ? '14px' : '16px',
                        fontWeight: '700', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                        border: errors[field.key] ? '2px solid #ef4444' : (!isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0'),
                        outline: 'none', boxSizing: 'border-box', minHeight: '120px',
                        transition: 'all 0.2s', cursor: isDisabled ? 'default' : 'text', resize: 'vertical', fontFamily: 'inherit',
                        opacity: isDisabled ? 0.8 : 1
                      }}
                    />
                  ) : field.type === 'file' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{
                        width: '100%', height: '140px', borderRadius: '20px', border: '2.5px dashed #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        backgroundColor: '#f8fafc', cursor: 'pointer', position: 'relative',
                        transition: 'all 0.2s', borderColor: form[field.key] ? '#315A9E' : '#e2e8f0'
                      }} onClick={() => {
                        if (isEditing) {
                          document.getElementById(`upload-${field.key}`).click();
                        } else if (form[field.key]) {
                          setViewImage(form[field.key].startsWith('http') || form[field.key].startsWith('data:') ? form[field.key] : `${BASE_URL}${form[field.key]}`);
                        }
                      }}>
                        {form[field.key] ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img src={form[field.key].startsWith('http') || form[field.key].startsWith('data:') ? form[field.key] : `${BASE_URL}${form[field.key]}`} alt={field.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, hover: { opacity: 1 }, transition: '0.2s' }}>
                              <Eye size={24} color="white" />
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              padding: '12px 24px', backgroundColor: '#315A9E', borderRadius: '14px',
                              color: 'white', fontWeight: '900', fontSize: '13px', display: 'flex',
                              alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(49,90,158,0.2)'
                            }}>
                              <Camera size={18} /> UPLOAD
                            </div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', margin: 0 }}>Select from Gallery or Camera</p>
                          </div>
                        )}
                        <input
                          type="file" id={`upload-${field.key}`} style={{ display: 'none' }} accept="image/*"
                          onChange={(e) => handleFileUpload(field.key, e.target.files[0])}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', minHeight: '20px' }}>
                        {form[field.key] && !isDisabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`upload-${field.key}`).click();
                            }}
                            style={{ fontSize: '11px', color: '#ef4444', fontWeight: '800', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={12} /> Update Photo
                          </button>
                        )}
                        {form[field.key] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewImage(form[field.key].startsWith('http') || form[field.key].startsWith('data:') ? form[field.key] : `${BASE_URL}${form[field.key]}`)
                            }
                            }
                            style={{ fontSize: '11px', color: '#315A9E', fontWeight: '800', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} /> View Full
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        value={form[field.key]}
                        readOnly={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={isEditing ? (field.placeholder || `Enter ${field.label}`) : 'Not Provided'}
                        style={{
                          width: '100%', padding: isMobile ? '12px' : '16px 20px',
                          borderRadius: isMobile ? '10px' : '16px', fontSize: isMobile ? '13px' : '16px',
                          fontWeight: '700', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                          border: errors[field.key] ? '2px solid #ef4444' : (!isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0'),
                          outline: 'none', boxSizing: 'border-box',
                          transition: 'all 0.2s', cursor: isDisabled ? 'default' : 'text',
                          opacity: isDisabled ? 0.8 : 1
                        }}
                      />
                    </div>
                  )}
                  {errors[field.key] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ef4444', fontWeight: '800', marginTop: '2px' }}>
                      <AlertCircle size={12} />
                      {errors[field.key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}