import React, { useState, useEffect, cloneElement, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Save, CreditCard, Building2, FileText, ChevronDown,
  Shield, AlertCircle, CheckCircle2, User, Hash, Landmark, RefreshCw,
  Briefcase, MapPin, Mail, Phone, GraduationCap, History, DollarSign,
  FileCheck, Users, Calendar, Heart, Globe, Trash2, Pencil, Camera, Image as ImageIcon, Eye, Check, X
} from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';

// These fields are strictly controlled by the backend for non-admin users
const LOCKED_FIELDS = [
  'designation',
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
      { key: 'dob', label: 'Date of Birth', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'age', label: 'Age', type: 'text', placeholder: 'Years' },
      { key: 'religion', label: 'Religion', type: 'text' },
      { key: 'blood_group', label: 'Blood Group', type: 'text' },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Indian' },
      { key: 'father_husband_name', label: "Father/Husband's Name", type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Other'] },
      { key: 'pan_number', label: 'PAN Number', type: 'text', placeholder: 'ABCDE1234F' },
      { key: 'pancard_photo', label: 'PAN Card Proof', type: 'file' },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: '1234 5678 9012' },
      { key: 'adharcard_photo', label: 'Aadhar Card Proof', type: 'file' },
      { key: 'voter_id', label: 'Voter ID Number', type: 'text' },
      { key: 'voter_id_photo', label: 'Voter ID Proof', type: 'file' },
      { key: 'passport_photo', label: 'Passport Photo', type: 'file' },
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
      { key: 'doj', label: 'Date of Joining', type: 'text', placeholder: 'DD/MM/YYYY' },
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
      {
        key: 'languages_known',
        label: 'Languages Known',
        type: 'multiselect',
        options: ['English', 'Hindi', 'Kannada', 'Telugu', 'Tamil', 'Malayalam', 'Marathi', 'Gujarati', 'Punjabi', 'Bengali', 'Odia', 'Urdu']
      },

      { type: 'header', label: 'Academic Milestones & Proofs' },
      { key: 'sslc_percentage', label: 'SSLC Percentage', type: 'text', placeholder: 'Enter SSLC Percentage' },
      { key: 'puc_percentage', label: '12th or equivalent Percentage', type: 'text', placeholder: 'Enter 12th or equivalent Percentage' },

      { key: 'sslc_markscard', label: 'SSLC Marks Card', type: 'file' },
      { key: 'puc_markscard', label: '12th or equivalent Marks Card', type: 'file' },

      { key: 'ug_pg_percentage', label: 'Graduation Percentage / CGPA', type: 'text', placeholder: 'Enter Graduation Percentage / CGPA' },
      { key: 'ug_pg_markscard', label: 'Graduation Certificate', type: 'file' },
      { key: 'source', label: 'Source (How you found us)', type: 'text' },
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
      { key: 'passbook_photo', label: 'Bank Passbook / Cancelled Cheque', type: 'file' },
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
      { key: 'doj', label: 'Joining Date', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'lwd', label: 'Last Working Day', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'asset_name', label: 'Laptop Details', type: 'textarea' },
      { key: 'has_mouse', label: 'Mouse', type: 'boolean' },
      { key: 'has_keyboard', label: 'Keyboard', type: 'boolean' },
      { key: 'has_laptop_stand', label: 'Laptop Stand', type: 'boolean' },
      { key: 'has_ruf_pad', label: 'Ruf Pad', type: 'boolean' },
      { key: 'has_pendrive', label: 'Pendrive', type: 'boolean' },
      { key: 'has_mobile', label: 'Company Mobile', type: 'boolean' },
      { key: 'has_camera', label: 'External Camera', type: 'boolean' },
      { key: 'has_headphone', label: 'Earphone/Headphone', type: 'boolean' },
      { key: 'has_tablet', label: 'Tablet', type: 'boolean' },
    ]
  },
  {
    id: 'exit',
    label: 'Experience',
    icon: <History size={20} />,
    color: '#ef4444',
    fields: [
      { key: 'previous_organization', label: 'Previous Organization', type: 'text' },
      { key: 'previous_experience', label: 'Previous Experience (Years)', type: 'text' },
      { key: 'total_experience', label: 'Total Experience (Years)', type: 'text' },
      { key: 'experience_letter_photo', label: 'Experience Letter', type: 'file' },
      { key: 'separation', label: 'Separation Date', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'lwd', label: 'Last Working Day (LWD)', type: 'text' },
      { key: 'attrition_bucket', label: 'Attrition Bucket', type: 'select', options: ['N/A', 'Resignation', 'Performance', 'Behavioral', 'Medical'] },
      { key: 'reason', label: 'Primary Reason', type: 'text' },
      { type: 'header', label: 'Salary Proof' },
      { key: 'previous_company_payslip', label: 'Last 3 months payslip (Consolidated PDF)', type: 'file' },
    ]
  }
];

export default function DocumentsScreen({ onBack }) {
  const { user } = useAuth();
  const { employeeId } = useParams();

  const [form, setForm] = useState({
    emp_name: '', gender: '', dob: '', age: '', religion: '', blood_group: '', marital_status: 'Single', nationality: 'Indian', father_husband_name: '', pan_number: '', aadhar_number: '', category: 'General',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email_id: '',
    contact_no: '', emergency_contact_no: '', personal_email_id: '', present_address: '', permanent_address: '', state: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_organization: '', previous_experience: '', source: '', languages_known: '',
    separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
    bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '',
    bgv_status: 'Pending', appointment_letter: 'Not Sent', approved_by_ceo: 'No', onboarding_doc_completed: 'No', id_card: 'Not Issued', onboarding_link: '',
    emp_id: '', doj: '', lwd: '', asset_name: '',
    has_mouse: 'No', has_keyboard: 'No', has_laptop_stand: 'No', has_ruf_pad: 'No', has_pendrive: 'No', has_mobile: 'No', has_camera: 'No', has_headphone: 'No', has_tablet: 'No',
    pancard_photo: '', adharcard_photo: '', experience_letter_photo: '', sslc_markscard: '', ug_pg_markscard: '',
    sslc_percentage: '', puc_percentage: '', ug_pg_percentage: '', puc_markscard: '',
    total_experience: '',
    previous_company_payslip: '',
    voter_id: '', voter_id_photo: '', passport_photo: '', passbook_photo: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1100;
  const [activeSection, setActiveSection] = useState('primary');
  const [isEditing, setIsEditing] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const tabsRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      console.log(`[Nav] Scrolling ${direction}`);
      const { clientWidth } = tabsRef.current;
      const scrollAmount = clientWidth * 0.7;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadAssets = async () => {
    // Determine UID (support current user or viewed profile)
    const uid = employeeId || user?.employee_id || user?.id || user?.userId;
    console.log(`[Assets Request] Starting fetch for UID: ${uid}`);

    try {
      const token = localStorage.getItem('token');
      // Using API_ENDPOINTS for target environment compatibility
      const res = await fetch(API_ENDPOINTS.MY_ASSETS(uid), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const assetData = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;

      if (assetData) {
        console.log("[Assets Debug] Raw record:", assetData);
        const assetUpdates = {};

        Object.keys(assetData).forEach(key => {
          let val = assetData[key] === null ? '' : assetData[key];
          const lowerKey = key.toLowerCase().trim();

          // FIX: Improved Date Check (don't corrupt laptop details containing 'T')
          const isISODate = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val);
          if (isISODate) {
            val = val.substring(0, 10);
          }

          // Map core identification values
          if (lowerKey === 'employee_id' || lowerKey === 'emp_id') assetUpdates['emp_id'] = val;
          if (lowerKey === 'employee_name' || lowerKey === 'emp_name') assetUpdates['emp_name'] = val;
          if (lowerKey === 'joining_date' || lowerKey === 'doj') assetUpdates['doj'] = val;
          if (lowerKey === 'last_working_date' || lowerKey === 'lwd') assetUpdates['lwd'] = val;
          if (lowerKey === 'laptop_details' || lowerKey === 'asset_name') assetUpdates['asset_name'] = val;
          if (lowerKey === 'asset_serial_no' || lowerKey === 'serial_number') assetUpdates['serial_number'] = val;

          const toYesNo = (v) => {
            if (v === true || v === 1 || String(v).toLowerCase().trim() === 'yes' || String(v).toLowerCase().trim() === 'true') return 'Yes';
            return 'No';
          };

          // Map peripherals using exact column names from the 'assets' table as shown in DB screenshot
          if (lowerKey === 'mouse') assetUpdates['has_mouse'] = toYesNo(val);
          if (lowerKey === 'keyboard') assetUpdates['has_keyboard'] = toYesNo(val);
          if (lowerKey === 'laptop_stand') assetUpdates['has_laptop_stand'] = toYesNo(val);
          if (lowerKey === 'ruf_pad') assetUpdates['has_ruf_pad'] = toYesNo(val);
          if (lowerKey === 'pendrive') assetUpdates['has_pendrive'] = toYesNo(val);
          if (lowerKey === 'mobile' || lowerKey === 'company_mobile') assetUpdates['has_mobile'] = toYesNo(val);
          if (lowerKey === 'camera' || lowerKey === 'external_camera') assetUpdates['has_camera'] = toYesNo(val);
          if (lowerKey === 'earphone_headphone' || lowerKey === 'earphone') assetUpdates['has_headphone'] = toYesNo(val);
          if (lowerKey === 'tablet') assetUpdates['has_tablet'] = toYesNo(val);
        });

        console.log("[Assets Debug] Calculated updates:", assetUpdates);

        setForm(prev => {
          const merged = { ...prev, ...assetUpdates };
          // Prevent overwriting a good name with an empty one
          if (!assetUpdates['emp_name'] && prev.emp_name && prev.emp_name !== 'Not Provided') {
            merged.emp_name = prev.emp_name;
          }
          return merged;
        });
      }
    } catch (err) {
      console.error("[Assets Load Error]:", err.message);
    }
  };

  const fetchUserDataFromUsersTable = async (targetId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const usersList = await res.json();
        const searchId = targetId || employeeId || user?.employee_id || user?.id;

        const foundUser = usersList.find(u =>
          String(u.employee_id || u.id || u.userId || '').toLowerCase() === String(searchId || '').toLowerCase() ||
          (u.email && user?.email && String(u.email).toLowerCase() === String(user?.email).toLowerCase())
        );

        if (foundUser) {
          console.log("[Users Table Sync] Found user:", foundUser.name);
          setForm(prev => ({
            ...prev,
            emp_name: prev.emp_name && prev.emp_name !== 'Not Provided' ? prev.emp_name : (foundUser.name || foundUser.userName || ''),
            emp_id: prev.emp_id && prev.emp_id !== 'Not Provided' ? prev.emp_id : (foundUser.employee_id || foundUser.id || ''),
            official_email_id: prev.official_email_id || foundUser.email || '',
            department: prev.department && prev.department !== 'Not Provided' ? prev.department : (foundUser.department || foundUser.dept || ''),
            designation: prev.designation && prev.designation !== 'Not Provided' ? prev.designation : (foundUser.designation || foundUser.role || '')
          }));
          return foundUser;
        }
      }
    } catch (err) {
      console.error('Fetch Users Table Error:', err);
    }
    return null;
  };

  const loadDocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = employeeId
        ? API_ENDPOINTS.EMPLOYEE_PROFILE(employeeId)
        : API_ENDPOINTS.MY_EMPLOYEE_PROFILE;

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        const docData = result.data || (Array.isArray(result) ? result[0] : result);

        if (docData) {
          console.group("%c Profile Data Sync ", 'background: #0B1E3F; color: white; border-radius: 4px; padding: 2px 6px;');
          console.log("Raw Backend Data:", docData);
          console.groupEnd();

          const cleanData = {};
          Object.keys(docData).forEach(key => {
            let val = docData[key];
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
              val = val.substring(0, 10);
            }
            cleanData[key.toLowerCase().replace(/\s/g, '_')] = val === null ? '' : val;
          });

          const empIdVal = cleanData.emp_id || cleanData.employee_id || cleanData.employeeid || cleanData.userid || cleanData.id || cleanData.emp_no;
          const empNameVal = cleanData.emp_name || cleanData.employee_name || cleanData.employeename || cleanData.user_name || cleanData.username || cleanData.name || cleanData.full_name;
          if (empIdVal) cleanData.emp_id = empIdVal;
          if (empNameVal) cleanData.emp_name = empNameVal;

          const dojVal = cleanData.doj || cleanData.joining_date || cleanData.date_of_joining || cleanData.dateofjoining || cleanData.joiningdate;
          if (dojVal) cleanData.doj = dojVal;

          const lwdVal = cleanData.lwd || cleanData.last_working_day || cleanData.last_working_date || cleanData.lwd_date;
          if (lwdVal) cleanData.lwd = lwdVal;

          const dobVal = cleanData.dob || cleanData.date_of_birth || cleanData.dateofbirth || cleanData.birth_date;
          if (dobVal) cleanData.dob = dobVal;

          // Aggressive Name and DOB Resolution
          const isOwnProfile = !employeeId || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
          if (isOwnProfile && (!cleanData.emp_name || cleanData.emp_name === 'Not Provided')) {
            cleanData.emp_name = user?.name || user?.userName || '';
          }

          if (isOwnProfile && (!cleanData.emp_id || cleanData.emp_id === 'Not Provided')) {
            cleanData.emp_id = user?.employee_id || user?.empId || user?.id || '';
          }

          if (isOwnProfile && (!cleanData.dob || cleanData.dob === 'Not Provided')) {
            cleanData.dob = user?.date_of_birth || user?.dob || '';
          }

          if (!cleanData.designation) cleanData.designation = user?.role || user?.designation || '';
          if (!cleanData.department) cleanData.department = user?.department || user?.dept || '';

          // No manual mapping needed anymore as keys are aligned with backend columns
          console.log(`%c [Profile Feed] Loaded core attributes for: ${cleanData.emp_name || 'User'}`, 'color: #0ea5e9; font-weight: bold;');
          setForm(prev => ({ ...prev, ...cleanData }));

          // NEW: Fetch latest resignation details if not already in cleanData
          try {
            const uid = empIdVal || user?.id || employeeId;
            if (uid) {
              const resigResp = await fetch(`${BASE_URL}/api/resignations/my?userId=${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (resigResp.ok) {
                const resigData = await resigResp.json();
                const latest = Array.isArray(resigData) ? resigData[0] : resigData;
                if (latest) {
                  setForm(prev => ({
                    ...prev,
                    separation: latest.resignation_date || latest.resignationDate || prev.separation,
                    lwd: latest.last_working_day || latest.lastWorkingDay || prev.lwd,
                    reason: latest.reason || prev.reason,
                    detailed_reason: latest.letter_content || latest.detailedReason || latest.detailed_reason || prev.detailed_reason,
                    attrition_bucket: (latest.status === 'PENDING' || latest.status === 'Approved') ? 'Resignation' : prev.attrition_bucket
                  }));
                }
              }
            }
          } catch (resigErr) {
            console.warn("Failed to fetch resignation details for profile:", resigErr);
          }
        } else {
          // Fallback if record is empty but user exists in context
          if (!employeeId && user) {
            setForm(prev => ({
              ...prev,
              emp_name: user.name || user.userName || '',
              emp_id: user.employee_id || user.empId || user.id || '',
              designation: user.role || user.designation || '',
              official_email_id: user.email || ''
            }));
          }
        }
      } else if (!employeeId && user) {
        // Handle failed request by using context data
        setForm(prev => ({
          ...prev,
          emp_name: user.name || user.userName || '',
          emp_id: user.employee_id || user.empId || user.id || '',
          designation: user.role || user.designation || '',
          department: user.department || user.dept || '',
          official_email_id: user.email || ''
        }));
      }
    } catch (err) {
      console.error("Critical: Failed to fetch profile metadata:", err);
    }
  };

  useEffect(() => {
    if (user || employeeId) {
      const init = async () => {
        await loadDocs();
        await loadAssets();
        await fetchUserDataFromUsersTable();
      };
      init();
    }
  }, [employeeId, user]);

  useEffect(() => {
    const isOwnProfile = !employeeId || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
    if (isOwnProfile && user && (!form.emp_name || form.emp_name === 'Not Provided')) {
      setForm(prev => ({
        ...prev,
        emp_name: user.name || user.userName || prev.emp_name,
        emp_id: user.employee_id || user.empId || user.id || prev.emp_id,
        designation: user.role || user.designation || prev.designation,
        department: user.department || user.dept || prev.department,
        official_email_id: user.email || prev.official_email_id
      }));
    }
  }, [user, employeeId, form.emp_name]);

  const validateField = (key, value) => {
    let error = null;

    const isRepeatedPlaceholder = (str) => {
      if (!str) return false;
      const s = String(str).toUpperCase().replace(/\s/g, '');
      return /^(.)\1+$/.test(s);
    };

    // REQUIRED FIELDS CHECK
    const required = ['emp_name', 'dob', 'pan_number', 'aadhar_number', 'contact_no', 'designation', 'department', 'official_email_id'];
    if (required.includes(key) && (!value || String(value).trim() === '')) {
      return `${key.replace('_', ' ').toUpperCase()} is required`;
    }

    if (!value) return null;

    if (['emp_name', 'father_husband_name', 'nominee_name', 'bank_name', 'religion', 'nationality', 'state', 'college', 'university', 'qualification'].includes(key)) {
      if (/[0-9]/.test(value)) error = 'Numbers are not allowed here';
      if (/[^a-zA-Z\s]/.test(value)) error = 'Special characters are not allowed';
    } else if (key === 'blood_group') {
      const clean = String(value).toUpperCase().trim();
      if (!/^(A|B|AB|O)[+-]$/.test(clean)) {
        error = 'Invalid blood group (e.g., A+, AB-)';
      }
    } else if (key === 'age') {
      if (value && String(value).length > 2) error = 'Maximum 2 digits allowed';
    } else if (['contact_no', 'emergency_contact_no'].includes(key)) {
      if (/[a-zA-Z]/.test(value)) error = 'Numbers only';
      else if (value.length !== 10) error = 'Must be exactly 10 digits';
    } else if (key === 'aadhar_number') {
      const clean = String(value).replace(/\s/g, '');
      if (!/^\d{12}$/.test(clean)) error = 'Aadhaar must be exactly 12 digits';
      else if (isRepeatedPlaceholder(clean)) error = 'Repeated placeholder numbers are not allowed';
    } else if (key === 'pan_number') {
      const clean = String(value).toUpperCase().trim();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
        error = 'Format must be: 5 Letters, 4 Numbers, 1 Letter (e.g., ABCDE1234F)';
      } else if (isRepeatedPlaceholder(clean)) {
        error = 'Repeated placeholder sequences are not allowed';
      }
    } else if (key === 'voter_id') {
      const clean = String(value).toUpperCase();
      if (clean.length > 11) error = 'Maximum 11 characters allowed';
      else if (/[^A-Z0-9]/.test(clean)) error = 'Alphanumeric only';
    } else if (key === 'ifsc_code') {
      const clean = String(value).toUpperCase();
      if (clean.length !== 11) error = 'IFSC must be 11 characters';
      else if (/[^A-Z0-9]/.test(clean)) error = 'Alphanumeric only';
    } else if (key === 'bank_account_no') {
      if (/\D/.test(value)) error = 'Numbers only';
    } else if (key === 'edu_completion_year') {
      if (value && value.length !== 4) error = 'Year must be exactly 4 digits';
    } else if (['sslc_percentage', 'puc_percentage', 'ug_pg_percentage'].includes(key)) {
      if (value && parseFloat(value) > 100) error = 'Maximum 100% allowed';
    } else if (key.toLowerCase().includes('email')) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) error = 'Format: abc@gmail.com';
    }

    return error;
  };

  const verifyIFSC = async (code) => {
    if (!code || code.length !== 11) return;
    try {
      const res = await fetch(API_ENDPOINTS.BANK_IFSC(code));
      if (res.ok) {
        const data = await res.json();
        // Support multiple backend field naming conventions (uppercase/lowercase)
        const branch = data.BRANCH || data.branch;
        const bank = data.BANK || data.bank;

        if (branch) {
          setForm(prev => ({
            ...prev,
            bank_branch: branch,
            bank_name: bank || prev.bank_name
          }));
        }
      }
    } catch (e) {
      console.warn("IFSC Verification failed:", e);
    }
  };

  const handleChange = (key, value) => {
    // Immediate cleaning for specific fields
    let cleanValue = value;
    if (['emp_name', 'father_husband_name', 'religion', 'nationality', 'state', 'college', 'university', 'qualification'].includes(key)) {
      cleanValue = value.replace(/[^a-zA-Z\s]/g, ''); // Block non-alphabets instantly
    } else if (key === 'blood_group') {
      const clean = value.replace(/[^a-zA-Z\+\-]/g, '').toUpperCase();
      if (clean.length > 3) return;
      if (clean.length >= 1 && !/^[A-Z]/.test(clean)) return;
      if (clean.length >= 2 && !/^[A-Z][A-Z+-]/.test(clean)) return;
      if (clean.length >= 3 && !/^[A-Z][A-Z+-][+-]$/.test(clean)) return;
      cleanValue = clean;
    } else if (['contact_no', 'emergency_contact_no', 'aadhar_number', 'bank_account_no', 'age', 'edu_completion_year'].includes(key)) {
      cleanValue = value.replace(/\D/g, ''); // Block non-numbers instantly
    } else if (['sslc_percentage', 'puc_percentage', 'ug_pg_percentage'].includes(key)) {
      cleanValue = value.replace(/[^0-9.]/g, ''); // Block characters, allow dots for decimals
      const parts = cleanValue.split('.');
      if (parts.length > 2) cleanValue = parts[0] + '.' + parts.slice(1).join(''); // Prevent multiple dots
    } else if (['pan_number', 'voter_id', 'ifsc_code'].includes(key)) {
      cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); // Alphanumeric only
    } else if (key.toLowerCase().includes('email')) {
      const basicClean = value.replace(/[^a-zA-Z0-9@\._\-\+]/g, ''); // Block spaces and invalid characters instantly
      const tldMatch = basicClean.match(/^(.*@[a-zA-Z0-9.-]+\.(?:com|co\.in|in|org|net|edu|gov))(.*)$/i);
      if (tldMatch) {
        cleanValue = tldMatch[1]; // Truncate everything after the TLD
      } else {
        cleanValue = basicClean;
      }
    }

    // Length caps
    if ((key === 'contact_no' || key === 'emergency_contact_no') && cleanValue.length > 10) return;
    if (key === 'aadhar_number' && cleanValue.length > 12) return;
    if (key === 'age' && cleanValue.length > 2) return;
    if (key === 'edu_completion_year' && cleanValue.length > 4) return;
    if (key === 'pan_number' && cleanValue.length > 10) return;
    if (key === 'voter_id' && cleanValue.length > 11) return;
    if (key === 'ifsc_code' && cleanValue.length > 11) return;

    let updates = { [key]: cleanValue };

    // Auto-calculate age for DOB formats (DD/MM/YYYY or YYYY-MM-DD)
    if (key === 'dob' && cleanValue && cleanValue.length === 10) {
      let birthDate = null;
      if (cleanValue.includes('/')) {
        const parts = cleanValue.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          if (y > 1000) birthDate = new Date(y, m - 1, d);
        }
      } else if (cleanValue.includes('-')) {
        const parts = cleanValue.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) { // YYYY-MM-DD
            birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
          } else { // DD-MM-YYYY
            birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
      }

      if (birthDate && !isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0) updates.age = String(age);
      }
    }

    if (key === 'ifsc_code' && cleanValue.length === 11) {
      setForm(prev => ({ ...prev, bank_branch: 'Fetching...' }));
      verifyIFSC(cleanValue);
    }

    setForm(prev => ({ ...prev, ...updates }));

    // Clear error for this field as the user types
    const error = validateField(key, cleanValue);
    setErrors(prev => ({ ...prev, [key]: error }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    // Read file as Base64 and preview locally
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;

      // Instant local preview
      setForm(prev => ({ ...prev, [key]: base64 }));

      // Sync to backend via the working /api/profile/update endpoint
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: user?.email,
            [key]: base64,
          }),
        });

        if (res.ok) {
          setToast({ type: 'success', msg: `${key.replace(/_/g, ' ').toUpperCase()} uploaded successfully!` });

          // Persist in localStorage so it survives page refresh
          try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, [key]: base64 }));
          } catch (_) {}
        } else {
          // Keep the local preview even if server rejects
          setToast({ type: 'info', msg: 'Document saved locally. Server sync pending.' });
        }
      } catch (err) {
        console.error('Upload Error:', err);
        setToast({ type: 'info', msg: 'Document saved locally (Network error).' });
      } finally {
        setTimeout(() => setToast(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    // Perform validation for the current section to allow incremental saves
    const newErrors = {};
    const currentSectionConfig = SECTIONS.find(s => s.id === activeSection);

    if (currentSectionConfig && currentSectionConfig.fields) {
      currentSectionConfig.fields.forEach(field => {
        if (field.key) {
          const error = validateField(field.key, form[field.key]);
          if (error) newErrors[field.key] = error;
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToast({ type: 'error', msg: 'Please fix the highlighted errors in this section before saving.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const uid = employeeId || user?.employee_id || user?.id || user?.userId;
      const token = localStorage.getItem('token');

      // Scrub data: Only include fields from the current section for targeted updates
      const sanitizedForm = {};
      if (currentSectionConfig && currentSectionConfig.fields) {
        currentSectionConfig.fields.forEach(field => {
          if (field.key) {
            let val = form[field.key];
            if (typeof val === 'string') {
              val = val.trim();
            }

            // Convert "Yes"/"No" strings to booleans for fields starting with 'has_'
            if (field.key.startsWith('has_')) {
              val = (val === 'Yes');
            }
            sanitizedForm[field.key] = val;
          }
        });
      }

      const res = await fetch(API_ENDPOINTS.UPDATE_EMPLOYEE_PROFILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...sanitizedForm, employee_id: uid })
      });

      if (res.ok) {
        setToast({ type: 'success', msg: 'Profile updated successfully!' });
        setIsEditing(false);
        await loadDocs();
      } else {
        const err = await res.json();
        setToast({ type: 'error', msg: err.error || 'Failed to save changes.' });
      }
    } catch {
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
    <div style={{
      height: '90vh',
      backgroundColor: '#f4f7fa',
      fontFamily: "'Inter', sans-serif",
      padding: isMobile ? '0 0 15px 0' : (isTablet ? '0 25px 25px 25px' : '0 40px 20px 40px'),
      boxSizing: 'border-box',
      overflow: 'hidden',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      marginTop: '0'
    }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed', top: isMobile ? '70px' : '100px', left: '50%', transform: 'translateX(-50%)',
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
              <X size={20} color="#ef4444" onClick={(e) => { e.stopPropagation(); setViewImage(null); }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Mobile Nav */}
      <div style={{
        position: 'sticky',
        top: '0',
        zIndex: 1000,
        backgroundColor: '#f4f7fa',
        padding: isMobile ? '10px 15px 10px 15px' : '0px 40px 0px 0px',
        display: 'flex',
        flexDirection: (isMobile || isTablet) ? 'column' : 'row',
        alignItems: (isMobile || isTablet) ? 'stretch' : 'center',
        justifyContent: 'space-between',
        marginBottom: '15px',
        gap: isMobile ? '15px' : '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            <button onClick={onBack} style={{
              padding: isMobile ? '8px' : '12px',
              borderRadius: '12px',
              backgroundColor: 'white',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
            </button>
            <div>
              <h1 style={{ fontSize: isMobile ? '20px' : '32px', fontWeight: '900', color: '#0B1E3F', margin: 0, lineHeight: 1 }}>Profile Info</h1>
              <p style={{ fontSize: isMobile ? '11px' : '14px', color: '#64748b', margin: '2px 0 0 0', fontWeight: '600' }}>Employee metadata record</p>
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
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                boxShadow: '0 8px 20px rgba(49,90,158,0.25)'
              }}
            >
              {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
              {isMobile ? 'Save' : 'Save Section Details'}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsEditing(true)}
              style={{
                padding: isMobile ? '8px 16px' : '14px 28px', backgroundColor: 'white', color: '#0B1E3F',
                border: '1.5px solid #0B1E3F', borderRadius: '12px', fontWeight: '900', fontSize: isMobile ? '12px' : '15px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
              }}
            >
              <Pencil size={14} />
              {isMobile ? 'Edit' : 'Edit Profile'}
            </motion.button>
          )}
        </div>

        {/* Categories Bar (Mobile Only) */}
        {(isMobile || isTablet) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '0 5px',
            boxSizing: 'border-box',
            marginBottom: '10px'
          }}>
            <button
              onClick={() => scrollTabs('left')}
              style={{
                color: '#0B1E3F', cursor: 'pointer', border: '1.5px solid #e2e8f0',
                backgroundColor: 'white', borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                zIndex: 10
              }}>
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            <div
              ref={tabsRef}
              style={{
                display: 'flex',
                flex: 1,
                gap: '10px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                padding: '8px 0',
                margin: '0 -2px',

              }}>
              {SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                const hasErrors = sec.fields.some(f => !!errors[f.key]);
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    style={{
                      padding: '10px 10px',
                      borderRadius: '12px',
                      backgroundColor: isActive ? '#0B1E3F' : 'white',
                      color: isActive ? 'white' : '#0B1E3F',
                      border: `1.5px solid ${isActive ? '#0B1E3F' : (hasErrors ? '#ef4444' : '#e2e8f0')}`,
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 8px 20px rgba(11,30,63,0.1)' : 'none',

                    }}
                  >
                    {cloneElement(sec.icon, { size: 14 })}
                    {sec.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => scrollTabs('right')}
              style={{
                color: '#0B1E3F', cursor: 'pointer', border: '1.5px solid #e2e8f0',
                backgroundColor: 'white', borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                zIndex: 10
              }}>
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
        gap: isMobile ? '2px' : '24px',
        alignItems: 'start',
        padding: isMobile ? '0 15px' : '0',
        width: '100%',
        margin: '0 auto',
        marginTop: '0',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {!isMobile && !isTablet && (
          <div style={{
            width: '100%',
            margin: '0',
            position: 'sticky',
            top: '100px',
            alignSelf: 'start',
            maxHeight: '100%',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '20px',

          }}>
            <div
              ref={tabsRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '0',

              }}>
              {SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                const hasErrors = sec.fields.some(f => !!errors[f.key]);

                return (
                  <motion.button
                    key={sec.id}
                    whileHover={{ x: 4 }}
                    onClick={() => setActiveSection(sec.id)}
                    style={{
                      padding: '16px 32px',
                      borderRadius: '18px',
                      backgroundColor: isActive ? '#0B1E3F' : 'white',
                      color: isActive ? 'white' : '#0B1E3F',
                      border: `1.5px solid ${isActive ? '#0B1E3F' : (hasErrors ? '#ef4444' : '#e2e8f0')}`,
                      fontSize: '15px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: isActive ? '0 15px 35px rgba(11,30,63,0.15)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ color: isActive ? 'white' : sec.color }}>{cloneElement(sec.icon, { size: 20 })}</div>
                    <div>{sec.label}</div>

                    {hasErrors && (
                      <div style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                      }} />
                    )}
                    <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: isActive ? 1 : 0.3 }} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ height: '100%', overflowY: 'auto', paddingRight: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: 'white',
              padding: isMobile ? '20px' : '40px 40px 80px 40px',
              border: 'none',
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
              <div style={{ marginTop: '10px' }}>
                <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: '#000000', margin: 0 }}>{currentSection.label}</h2>
                <p style={{ fontSize: isMobile ? '10px' : '14px', color: '#000000', margin: '2px 0 0 0', fontWeight: '600' }}>{isMobile ? 'Metadata records' : 'Official employee metadata records'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '24px' : '40px' }}>
              {currentSection.fields.map((field, fIdx) => {
                if (field.type === 'header') {
                  return (
                    <div key={`header-${fIdx}`} style={{ gridColumn: '1 / -1', marginTop: fIdx === 0 ? '0' : '24px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', paddingBottom: '12px', borderBottom: '1.5px solid #f1f5f9' }}>
                        {field.label}
                      </h3>
                    </div>
                  );
                }
                const isLockedForRole = LOCKED_FIELDS.includes(field.key) && !isAdmin;
                const isDisabled = (activeSection === 'assets') || !isEditing || isLockedForRole || field.key === 'age';

                return (
                  <div key={field.key} style={{
                    display: 'flex',
                    flexDirection: field.type === 'boolean' ? 'row' : 'column',
                    justifyContent: field.type === 'boolean' ? 'space-between' : 'flex-start',
                    alignItems: field.type === 'boolean' ? 'center' : 'stretch',
                    gap: '12px',
                    opacity: isLockedForRole ? 0.7 : 1,
                    gridColumn: !isMobile && field.fullWidth ? '1 / -1' : 'auto',
                    padding: '12px 0',
                    alignSelf: 'start'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                      <label style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '900', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {field.label} {['emp_name', 'dob', 'pan_number', 'aadhar_number', 'contact_no', 'designation', 'department', 'official_email_id'].includes(field.key) && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      {isLockedForRole && <Shield size={10} color="#000000" />}
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
                    ) : field.type === 'boolean' ? (
                      <div style={{ display: 'flex', gap: '8px', width: 'auto', flexShrink: 0 }}>
                        {['Yes', 'No'].map(option => {
                          const isSelected = (form[field.key] || 'No') === option;
                          return (
                            <motion.button
                              key={option}
                              type="button"
                              whileTap={!isDisabled ? { scale: 0.95 } : {}}
                              disabled={isDisabled}
                              onClick={() => handleChange(field.key, option)}
                              style={{
                                width: isMobile ? '40px' : '50px',
                                height: isMobile ? '32px' : '36px',
                                borderRadius: '10px',
                                cursor: isDisabled ? 'default' : 'pointer',
                                border: '2px solid',
                                borderColor: isSelected ? (option === 'Yes' ? '#10B981' : '#EF4444') : '#f1f5f9',
                                backgroundColor: isSelected ? (option === 'Yes' ? '#10B981' : '#EF4444') : (isDisabled ? '#f8fafc' : 'white'),
                                color: isSelected ? 'white' : (isDisabled ? '#cbd5e1' : '#cbd5e1'),
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isDisabled && !isSelected ? 0.6 : 1,
                                boxShadow: isSelected ? `0 4px 10px ${option === 'Yes' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` : 'none'
                              }}
                            >
                              {option === 'Yes' ? <Check size={isMobile ? 16 : 18} strokeWidth={4} /> : <X size={isMobile ? 16 : 18} strokeWidth={4} />}
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={form[field.key]}
                        readOnly={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={isEditing ? (field.placeholder || `Enter ${field.label}`) : 'Not Provided'}
                        style={{
                          width: '100%', padding: '16px 20px', borderRadius: '16px', fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '800', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                          border: errors[field.key] ? '2px solid #ef4444' : (!isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0'),
                          outline: 'none', boxSizing: 'border-box', minHeight: '120px',
                          transition: 'all 0.2s', cursor: isDisabled ? 'default' : 'text', resize: 'vertical', fontFamily: 'inherit',
                          opacity: isDisabled ? 1 : 1
                        }}
                      />
                    ) : field.type === 'multiselect' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {field.options.map(opt => {
                            const currentVals = (form[field.key] || '').split(',').map(v => v.trim()).filter(v => v);
                            const isSelected = currentVals.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  let next;
                                  if (isSelected) {
                                    next = currentVals.filter(v => v !== opt).join(', ');
                                  } else {
                                    next = [...currentVals, opt].join(', ');
                                  }
                                  handleChange(field.key, next);
                                }}
                                style={{
                                  padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '800',
                                  backgroundColor: isSelected ? '#315A9E' : '#f1f5f9',
                                  color: isSelected ? 'white' : '#64748b',
                                  border: isSelected ? '2px solid #315A9E' : '2px solid transparent',
                                  cursor: isDisabled ? 'default' : 'pointer', transition: '0.2s',
                                  boxShadow: isSelected ? '0 4px 12px rgba(49,90,158,0.2)' : 'none'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
                          {form[field.key] && (form[field.key].length > 100 || !form[field.key].startsWith('data:')) ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              {String(form[field.key]).toLowerCase().endsWith('.pdf') || String(form[field.key]).startsWith('data:application/pdf') ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                                  <FileText size={48} color="#ef4444" />
                                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginTop: '8px' }}>PDF DOCUMENT</span>
                                </div>
                              ) : (
                                <img src={form[field.key].startsWith('http') || form[field.key].startsWith('data:') ? form[field.key] : `${BASE_URL}${form[field.key]}`} alt={field.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
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
                              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', margin: 0 }}>Image or PDF supported</p>
                            </div>
                          )}
                          <input
                            type="file" id={`upload-${field.key}`} style={{ display: 'none' }} accept="image/*,application/pdf"
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
                              <RefreshCw size={12} /> Update File
                            </button>
                          )}
                          {form[field.key] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = form[field.key].startsWith('http') || form[field.key].startsWith('data:') ? form[field.key] : `${BASE_URL}${form[field.key]}`;
                                if (url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf')) {
                                  if (url.startsWith('data:application/pdf')) {
                                    fetch(url).then(res => res.blob()).then(blob => {
                                      const blobUrl = URL.createObjectURL(blob);
                                      window.open(blobUrl, '_blank');
                                    });
                                  } else {
                                    window.open(url, '_blank');
                                  }
                                } else {
                                  setViewImage(url);
                                }
                              }}
                              style={{ fontSize: '11px', color: '#315A9E', fontWeight: '800', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={12} /> View Full
                            </button>
                          )}
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
                          fontWeight: '800', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                          border: errors[field.key] ? '2px solid #ef4444' : (!isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0'),
                          outline: 'none', boxSizing: 'border-box', minHeight: '120px',
                          transition: 'all 0.2s', cursor: isDisabled ? 'default' : 'text', resize: 'vertical', fontFamily: 'inherit'
                        }}
                      />
                    ) : (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          value={(form[field.key] && typeof form[field.key] === 'string' && form[field.key].includes('T') && form[field.key].length > 15) ? form[field.key].split('T')[0] : (form[field.key] || '')}
                          readOnly={isDisabled}
                          onChange={e => handleChange(field.key, e.target.value)}
                          placeholder={isEditing ? (field.placeholder || `Enter ${field.label}`) : 'Not Provided'}
                          style={{
                            width: '100%', padding: isMobile ? '12px' : '16px 20px',
                            borderRadius: isMobile ? '10px' : '16px', fontSize: isMobile ? '13px' : '16px',
                            fontWeight: '800', color: '#000000', backgroundColor: isDisabled ? '#f1f5f9' : '#f8fafc',
                            border: errors[field.key] ? '2px solid #ef4444' : (!isDisabled ? '2px solid #315A9E' : '2px solid #e2e8f0'),
                            outline: 'none', boxSizing: 'border-box',
                            transition: 'all 0.2s', cursor: isDisabled ? 'default' : 'text'
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
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}