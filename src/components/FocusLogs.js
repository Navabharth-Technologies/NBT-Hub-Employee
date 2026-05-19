import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Download, ChevronLeft, Search, Filter, Clock, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FocusLogs({ onBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sanitizeId = (id) => String(id || '').split(':')[0];

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  // Default range: Start of month to now
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [user]);

  useEffect(() => {
    filterData();
  }, [startDate, endDate, logs]);

  const fetchLogs = async () => {
    const rawUid = user?.id || user?.userId || user?.empId || user?.employee_id;
    if (!rawUid) return;
    const uid = sanitizeId(rawUid);
    setLoading(true);
    try {
      const resp = await fetch(`${API_ENDPOINTS.TASKS}?userId=${uid}`);
      if (resp.ok) {
        const data = await resp.json();
        const logsArray = Array.isArray(data) ? data : (data.value || data.data || []);
        // Absolute Personal Isolation Layer: Filter to ensure ZERO data leakage from team reports
        const personalLogs = logsArray.filter(log => 
          String(log.userId) === String(uid) || 
          String(log.employeeId) === String(uid) ||
          String(log.employee_id) === String(uid)
        );
        setLogs(personalLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filterData = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);

    const filtered = logs.filter(log => {
      const ts = log.timestamp || log.created_at || log.date || log.Date || log.CreatedAt;
      const d = new Date(ts);
      return d >= s && d <= e;
    });
    setFilteredLogs(filtered);
  };

  const handleClear = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const downloadSpreadsheet = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Status,Tasks\n";
    filteredLogs.forEach(log => {
      const ts = log.timestamp || log.created_at || log.date || log.Date || log.CreatedAt;
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dateStr = `${day}-${month}-${year}`;
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const status = log.overallStatus || "PENDING";
      const tasksStr = (log.tasks || []).map(t => typeof t === 'string' ? t : (t.text || '')).join('; ');
      
      const row = `"${dateStr}","${timeStr}","${status}","${tasksStr}"`;
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `focus_logs_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    const doc = new jsPDF();
    doc.text(`Personal Focus Logs: ${startDate} to ${endDate}`, 14, 15);
    
    const tableColumn = ["Date", "Time", "Status", "Tasks"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const ts = log.timestamp || log.created_at || log.date || log.Date || log.CreatedAt;
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dateStr = `${day}-${month}-${year}`;
      const logData = [
        dateStr,
        d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        log.overallStatus || "PENDING",
        (log.tasks || []).map(t => typeof t === 'string' ? t : (t.text || '')).join('\n')
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 3: { cellWidth: 100 } }
    });
    
    doc.save(`focus_logs_${startDate}_to_${endDate}.pdf`);
    setShowDownloadMenu(false);
  };

  const s = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', padding: winWidth < 768 ? '10px 5px' : '30px 40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0 auto', padding: winWidth < 768 ? '5px' : '20px' },
    
    header: { marginBottom: winWidth < 768 ? '20px' : '40px', padding: winWidth < 768 ? '0 15px' : '0' },
    title: { fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '900', color: '#0B1E3F', marginBottom: '8px' },
    subtitle: { fontSize: winWidth < 768 ? '13px' : '15px', color: '#64748b', fontWeight: '600' },

    /* Filter Bar */
    filterBar: { 
      backgroundColor: 'white', 
      borderRadius: '24px', 
      padding: winWidth < 768 ? '15px' : '12px 30px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: winWidth < 768 ? '12px' : '20px', 
      boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
      marginBottom: '32px',
      flexWrap: 'wrap',
      margin: winWidth < 768 ? '0 10px 32px' : '0 0 32px'
    },
    label: { fontSize: '12px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' },
    dateInputBox: { 
      padding: '10px 18px', 
      backgroundColor: '#f8fafc', 
      borderRadius: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      border: '1px solid #f1f5f9',
      flex: winWidth < 768 ? '1' : 'none',
      minWidth: winWidth < 768 ? '140px' : 'auto'
    },
    input: { border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', width: '100%' },
    toText: { fontSize: '12px', fontWeight: '900', color: '#cbd5e1', width: winWidth < 768 ? '100%' : 'auto', textAlign: winWidth < 768 ? 'center' : 'left' },
    clearBtn: { fontSize: '13px', fontWeight: '800', color: '#3B5998', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', marginLeft: winWidth < 768 ? '0' : 'auto' },
    downloadBtn: { 
      backgroundColor: '#1e293b', 
      color: 'white', 
      padding: '12px 24px', 
      borderRadius: '16px', 
      border: 'none', 
      fontWeight: '800', 
      fontSize: '14px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      cursor: 'pointer',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
      width: winWidth < 768 ? '100%' : 'auto',
      justifyContent: 'center'
    },

    /* Main Log Card */
    logCard: { backgroundColor: winWidth < 768 ? 'transparent' : 'white', borderRadius: winWidth < 768 ? '0' : '40px', padding: winWidth < 768 ? '10px' : '40px', boxShadow: winWidth < 768 ? 'none' : '0 20px 60px rgba(0,0,0,0.05)', border: winWidth < 768 ? 'none' : '1px solid #f1f5f9' },
    logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: winWidth < 768 ? 'flex-start' : 'center', marginBottom: '32px', flexDirection: winWidth < 768 ? 'column' : 'row', gap: '15px', padding: winWidth < 768 ? '0 10px' : '0' },
    logTitle: { fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '800', color: '#3B5998', display: 'flex', alignItems: 'center', gap: '14px' },
    countBadge: { padding: '6px 14px', borderRadius: '10px', backgroundColor: '#eff6ff', fontSize: '11px', fontWeight: '900', color: '#2563eb', whiteSpace: 'nowrap' },

    /* Entry List - Individual Cards */
    entry: { 
      padding: winWidth < 768 ? '20px' : '25px', 
      marginBottom: '20px', 
      display: 'flex', 
      gap: winWidth < 768 ? '20px' : '24px', 
      alignItems: 'flex-start', 
      flexDirection: winWidth < 768 ? 'column' : 'row',
      backgroundColor: 'white',
      borderRadius: '24px',
      border: '1.5px solid #cbd5e1',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease'
    },
    dateBox: { 
      minWidth: winWidth < 768 ? '100%' : '100px', 
      display: 'flex', 
      flexDirection: winWidth < 768 ? 'row' : 'column', 
      alignItems: 'center', 
      padding: '16px', 
      borderRadius: '16px', 
      backgroundColor: '#f8fafc', 
      gap: '10px',
      justifyContent: winWidth < 768 ? 'center' : 'center'
    },
    day: { fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F' },
    month: { fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
    
    content: { flex: 1, width: '100%' },
    timeRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' },
    reportText: { fontSize: winWidth < 768 ? '13px' : '14px', color: '#475569', fontWeight: '600', lineHeight: '1.6' },
    statusTag: { padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },

    emptyState: { padding: '80px 0', textAlign: 'center' },
    emptyTitle: { fontSize: '16px', fontWeight: '700', color: '#64748b', marginBottom: '10px' },
    viewHistory: { color: '#3B5998', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' },

    dropdownMenu: { position: 'absolute', top: '100%', right: '0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', marginTop: '8px' },
    dropdownItem: { padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#1e293b', backgroundColor: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s', display: 'flex', gap: '10px', alignItems: 'center' }
  };

  return (
    <div style={s.container}>
      <main style={s.main}>
        
        

        <button 
          onClick={handleBack} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            border: 'none', 
            background: 'none', 
            cursor: 'pointer', 
            color: '#64748b', 
            fontWeight: '800', 
            fontSize: '14px', 
            marginBottom: '20px',
            padding: '0',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#3B5998'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <ChevronLeft size={20} strokeWidth={3} /> BACK TO DASHBOARD
        </button>

        <header style={s.header}>
          <h1 style={s.title}>Your Focus Logs</h1>
          <p style={s.subtitle}>Personal visibility for task reporting.</p>
        </header>

        {/* Filter Bar */}
        <div style={s.filterBar}>
          <div style={s.label}><Calendar size={18} /> DATE RANGE</div>
          
          <div style={s.dateInputBox}>
            <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B5998'}} />
            <input type="date" style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <span style={s.toText}>TO</span>

          <div style={s.dateInputBox}>
            <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981'}} />
            <input type="date" style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <button style={s.clearBtn} onClick={handleClear}>Clear</button>
          
          <div style={{ position: 'relative' }}>
            <button style={s.downloadBtn} onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
              <Download size={18} /> Download Logs
            </button>
            {showDownloadMenu && (
              <div style={s.dropdownMenu}>
                <button 
                  style={s.dropdownItem} 
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadSpreadsheet}
                >
                  <FileText size={16} color="#059669" /> Download Spreadsheet
                </button>
                <button 
                  style={s.dropdownItem}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadPDF}
                >
                  <FileText size={16} color="#e11d48" /> Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Log Card */}
        <div style={s.logCard}>
          <div style={s.logHeader}>
            <div style={s.logTitle}><Clock size={24} /> Day-by-Day Focus Logs</div>
            <div style={s.countBadge}>{filteredLogs.length} RECORDS FOUND</div>
          </div>

          <div>
            {loading ? (
              <div style={s.emptyState}>Fetching your logs...</div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const ts = log.timestamp || log.created_at || log.date || log.Date || log.CreatedAt;
                // Accurate timing logic: Use the LATEST task ID if it looks like a valid timestamp, 
                // otherwise fall back to the record's overall timestamp.
                const taskTimestamps = (log.tasks || [])
                  .map(t => Number(t.id))
                  .filter(id => !isNaN(id) && id > 1000000000000); 
                
                const displayDate = taskTimestamps.length > 0 
                  ? new Date(Math.max(...taskTimestamps)) 
                  : new Date(ts);

                return (
                  <div key={log.id || `log-${idx}`} style={s.entry}>
                    <div style={s.dateBox}>
                      <div style={s.day}>{displayDate.getDate()}</div>
                      <div style={s.month}>{displayDate.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={s.content}>
                      <div style={s.timeRow}>
                        <Clock size={14} color="#94a3b8" />
                        <span style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8'}}>{displayDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        <div style={{
                          ...s.statusTag, 
                          backgroundColor: log.overallStatus === 'Completed' ? '#dcfce7' : '#fef9c3',
                          color: log.overallStatus === 'Completed' ? '#16a34a' : '#a16207',
                        }}>
                          {log.overallStatus || 'PENDING'}
                        </div>
                      </div>
                      <div style={s.reportText}>
                        {log.tasks?.map((t, i) => {
                           const taskId = typeof t === 'object' ? Number(t.id) : null;
                           const tTime = displayDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                           return (
                             <div key={i} style={{marginBottom: '4px', display:'flex', gap:'8px', alignItems: 'center'}}>
                               <CheckCircle2 size={16} color="#3B5998" /> 
                               <span style={{flex: 1}}>{typeof t === 'string' ? t : (t.text || '')}</span>
                               {tTime && <span style={{fontSize: '10px', color: '#94a3b8', fontWeight: '800'}}>{tTime}</span>}
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={s.emptyState}>
                <ShieldCheck size={48} color="#f1f5f9" style={{marginBottom: '20px'}} />
                <div style={s.emptyTitle}>No logs found for this date range.</div>
                <button onClick={handleClear} style={s.viewHistory}>View All History</button>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
