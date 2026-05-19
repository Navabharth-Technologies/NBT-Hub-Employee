import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Printer, Calendar, ChevronRight, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS, COMPANY_INFO } from '../../config';
import logo from '../../assets/image.png';

// Helper: format a month label like "April 2026" from a date string or {month, year} object
function formatMonthLabel(payslip) {
  if (payslip.month_label) return payslip.month_label;
  if (payslip.month && payslip.year) {
    const d = new Date(`${payslip.year}-${String(payslip.month).padStart(2, '0')}-01`);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  if (payslip.period || payslip.payPeriod) {
    const raw = payslip.period || payslip.payPeriod;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  return 'Payslip';
}

// Helper: format currency
function formatAmount(val) {
  const num = parseFloat(String(val || '0').replace(/,/g, ''));
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
}

export default function PayslipScreen({ onBack }) {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Fetch payslips from backend ──
  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userId = user?.id || user?.employee_id || user?.empId;
        const url = API_ENDPOINTS.MY_PAYSLIPS(userId);

        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token.trim()}` : ''
          }
        });

        if (res.ok) {
          const data = await res.json();
          console.log('[PayslipScreen] Raw API response:', JSON.stringify(data, null, 2));
          const list = Array.isArray(data)
            ? data
            : (data.value || data.data || data.payslips || data.result || data.results || data.records || data.items || []);
          console.log('[PayslipScreen] Parsed list:', list);
          setPayslips(list);
        } else {
          console.warn('[PayslipScreen] API returned error:', res.status);
          setError(`Failed to load payslips (${res.status}). Please try again later.`);
          setPayslips([]);
        }
      } catch (err) {
        console.error('[PayslipScreen] Fetch error:', err);
        setError('Could not connect to server. Please check your connection.');
        setPayslips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [user]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!selectedPayslip) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const el = document.querySelector('.printable-payslip');
      if (!el) return;

      const canvas = await html2canvas(el, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      let imgW = pageW;
      let imgH = (canvas.height * imgW) / canvas.width;

      if (imgH > pageH) {
        const ratio = pageH / imgH;
        imgH = pageH;
        imgW = imgW * ratio;
      }

      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      const label = formatMonthLabel(selectedPayslip).replace(/\s+/g, '_');
      
      // Save directly as standard PDF file
      pdf.save(`Payslip_${label}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      window.print();
    }
  };

  // ── Shared helpers ──
  const parseAmt = (val) => {
    const n = parseFloat(String(val || '0').replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const cell = (extra = {}) => ({
    border: '1px solid #cbd5e1', padding: '12px 15px', fontSize: '13px', color: '#1e293b', ...extra
  });
  const labelCell = (extra = {}) => cell({ fontWeight: '800', color: '#0B1E3F', backgroundColor: '#f8fafc', ...extra });
  const valueCell = (extra = {}) => cell({ fontWeight: '600', color: '#334155', ...extra });

  const SectionCard = ({ title, rows, total, totalLabel, color }) => (
    <div style={{ border: '1px solid #cbd5e1', overflow: 'hidden', flex: 1 }}>
      <div style={{ backgroundColor: '#f8fafc', padding: '10px 15px', fontSize: '12px', fontWeight: '900', color: '#0B1E3F', borderBottom: '1px solid #cbd5e1' }}>{title}</div>
      {rows.map(([label, val], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
          <span style={{ color: '#64748b', fontWeight: '600' }}>{label}</span>
          <span style={{ color: '#1e293b', fontWeight: '700' }}>{val}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>
        <span>{totalLabel}</span>
        <span style={{ color: color || '#0B1E3F' }}>{total}</span>
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  //  MONTH PICKER VIEW
  // ════════════════════════════════════════════
  if (!selectedPayslip) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: winWidth < 768 ? '20px 15px 120px' : '40px 20px 120px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none', backgroundColor: 'white', color: '#0B1E3F', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#0B1E3F' }}>Salary Statements</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Select a month to view your payslip</p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
              <Loader2 size={36} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Fetching your payslips...</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div style={{ padding: '20px 24px', backgroundColor: '#fef2f2', borderRadius: '16px', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} color="#ef4444" />
              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '700' }}>{error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && payslips.length === 0 && (
            <div style={{ padding: '50px 20px', textAlign: 'center', backgroundColor: 'white', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
              <FileText size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#94a3b8' }}>No payslips found</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>Payslips will appear here once processed by your HR team</div>
            </div>
          )}

          {/* Payslip Cards */}
          {!loading && !error && payslips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {payslips.map((ps, idx) => {
                const netPay = formatAmount(
                  ps.total_earnings || ps.total_earning || ps.totalEarnings ||
                  ps.basic_salary   || ps.basic         || ps.basicSalary   ||
                  ps.net_payable    || ps.net_pay       || ps.amount        || 0
                );
                const monthLabel = formatMonthLabel(ps);
                const status = ps.status || ps.payment_status || ps.paymentStatus || 'Paid';
                const isPaid = String(status).toLowerCase().includes('paid');

                return (
                  <motion.div
                    key={ps.id || ps._id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    onClick={() => setSelectedPayslip(ps)}
                    whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(11,30,63,0.12)' }}
                    whileTap={{ scale: 0.99 }}
                    style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '2px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={22} color="#1e40af" />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0B1E3F' }}>{monthLabel}</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>₹ {netPay}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isPaid ? '#10b981' : '#f59e0b', backgroundColor: isPaid ? '#dcfce7' : '#fef3c7', padding: '4px 10px', borderRadius: '8px' }}>
                        {status}
                      </span>
                      <ChevronRight size={20} color="#94a3b8" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Info note */}
          {!loading && (
            <div style={{ marginTop: '24px', padding: '14px 18px', backgroundColor: '#eff6ff', borderRadius: '14px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color="#3b82f6" />
              <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>Click on any month to view and print your full payslip</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  PAYSLIP DETAIL VIEW
  // ════════════════════════════════════════════
  const ps = selectedPayslip;
  const monthLabel = formatMonthLabel(ps);

  // Earnings
  const basicAmt        = parseAmt(ps.basic_salary     || ps.basic          || ps.basicSalary        || 0);
  const hraAmt          = parseAmt(ps.hra              || ps.house_rent_allowance || ps.houseRentAllowance || 0);
  const conveyanceAmt   = parseAmt(ps.conveyance       || ps.conveyance_allowance || ps.conveyanceAllowance || 0);
  const specialAllowAmt = parseAmt(ps.special_allowance || ps.specialAllowance || ps.other_allowance   || 0);

  const earningRows = [
    ['Basic',             formatAmount(basicAmt)],
    ['HRA',               formatAmount(hraAmt)],
    ['Conveyance',        formatAmount(conveyanceAmt)],
    ['Special Allowance', formatAmount(specialAllowAmt)],
  ];
  const totalEarningAmt = parseAmt(ps.total_earnings || ps.total_earning || ps.totalEarning || ps.gross_salary || ps.grossSalary || 0)
    || (basicAmt + hraAmt + conveyanceAmt + specialAllowAmt);
  const totalEarning = formatAmount(totalEarningAmt);

  // Incentives
  const perfAmt   = parseAmt(ps.performance_incentive || ps.performanceIncentive || ps.performance || 0);
  const yearlyAmt = parseAmt(ps.yearly_incentive      || ps.yearlyIncentive      || ps.yearly      || 0);
  const incentiveRows = [
    ['Performance',      formatAmount(perfAmt)],
    ['Yearly Incentive', formatAmount(yearlyAmt)],
  ];
  const totalIncentiveAmt = parseAmt(ps.total_incentive || ps.totalIncentive || 0) || (perfAmt + yearlyAmt);
  const totalIncentive    = formatAmount(totalIncentiveAmt);

  // Deductions
  const pfAmt        = parseAmt(ps.pf_deduction  || ps.pf  || ps.provident_fund    || ps.providentFund            || 0);
  const esiAmt       = parseAmt(ps.esi_deduction || ps.esi || ps.employee_state_insurance || ps.employeeStateInsurance || 0);
  const ptAmt        = parseAmt(ps.pt_deduction  || ps.pt  || ps.professional_tax   || ps.professionalTax          || 0);
  const lwfAmt       = parseAmt(ps.lwf           || ps.labour_welfare_fund || ps.labourWelfareFund || 0);
  const incomeTaxAmt = parseAmt(ps.income_tax    || ps.incomeTax || ps.tds || 0);

  const deductionRows = [
    ['PF',         formatAmount(pfAmt)],
    ['ESI',        formatAmount(esiAmt)],
    ['PT',         formatAmount(ptAmt)],
    ['LWF',        formatAmount(lwfAmt)],
    ['Income Tax', formatAmount(incomeTaxAmt)],
  ];
  const totalDeductionAmt = parseAmt(ps.total_deductions || ps.total_deduction || ps.totalDeduction || 0)
    || (pfAmt + esiAmt + ptAmt + lwfAmt + incomeTaxAmt);
  const totalDeduction = formatAmount(totalDeductionAmt);

  // Net Payable — show total_earnings (gross) as primary display
  const netPayAmt = parseAmt(
    ps.total_earnings || ps.total_earning || ps.totalEarnings ||
    ps.basic_salary   || ps.basic         || ps.basicSalary   ||
    ps.net_payable    || ps.net_pay       || ps.amount        || 0
  ) || (totalEarningAmt + totalIncentiveAmt);
  const netPay = formatAmount(netPayAmt);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '40px 20px 120px', fontFamily: "'Inter', sans-serif" }}>

      {/* Action bar */}
      <div className="no-print" style={{ maxWidth: '900px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={() => setSelectedPayslip(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#0B1E3F', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={18} /> Back to Statements
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#0B1E3F', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <Printer size={18} /> Print
          </button>
          <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>
            <Download size={18} /> Download
          </button>
        </div>
      </div>

      {/* Payslip document */}
      <motion.div
        key={ps.id || ps._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="printable-payslip"
        style={{ maxWidth: '900px', width: '100%', margin: '0 auto', backgroundColor: 'white', padding: '40px 30px 80px', borderRadius: '2px', boxShadow: '0 0 40px rgba(0,0,0,0.05)', position: 'relative', overflowX: 'auto', minHeight: '1100px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      >
        {/* Decorative corner shapes */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '150px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 100%, 0 0)', opacity: 0.1, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '110px', backgroundColor: '#1d4ed8', clipPath: 'polygon(100% 0, 100% 100%, 30% 0)', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '90px', height: '80px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 100%, 60% 0)', zIndex: 1 }} />

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px', position: 'relative', zIndex: 10 }}>
          <img src={logo} alt="NBT Logo" style={{ height: '80px', marginBottom: '20px' }} />
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#0B1E3F', letterSpacing: '0.5px', textAlign: 'center' }}>
            {ps.company_name || ps.companyName || ps.organisation || ps.organization || COMPANY_INFO.name}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px', marginTop: '4px', textAlign: 'center' }}>
            {ps.company_tagline || ps.companyTagline || ps.tagline || COMPANY_INFO.tagline}
          </div>
          <div style={{ marginTop: '25px', padding: '8px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', width: '100%', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#1e293b', letterSpacing: '0.5px' }}>
            Pay Slip for the Month of {monthLabel}
          </div>
        </div>

        {/* Employee Info */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={labelCell({ width: '20%' })}>Emp Code</td>
                <td style={valueCell({ width: '30%' })}>{ps.employee_id || ps.emp_code || ps.empCode || user?.employee_id || user?.empId || user?.emp_id || '--'}</td>
                <td style={labelCell({ width: '20%' })}>Department</td>
                <td style={valueCell({ width: '30%' })}>{ps.department || ps.dept || user?.department || user?.dept || '--'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>Emp. Name</td>
                <td style={valueCell()}>{ps.emp_name || ps.employee_name || ps.name || user?.name || user?.employee_name || user?.emp_name || '--'}</td>
                <td style={labelCell()}>Designation</td>
                <td style={valueCell()}>{ps.designation || ps.role || ps.position || user?.designation || user?.role || user?.position || '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendance Summary */}
        <div style={{ position: 'relative', zIndex: 10, marginTop: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                {[
                  ['Tot. pre:',   ps.total_present   || ps.totalPresent   || '0'],
                  ['Tot. wo:',    ps.total_weekly_off || ps.total_wo      || ps.totalWO        || '0'],
                  ['Tot. hl:',    ps.total_holidays   || ps.totalHolidays || '0'],
                  ['Tot. leave:', ps.total_leaves     || ps.total_leave   || ps.totalLeave     || '0'],
                ].map(([l, v], i) => (
                  <React.Fragment key={i}>
                    <td style={labelCell({ width: '15%' })}>{l}</td>
                    <td style={cell({ textAlign: 'right', width: '10%', fontWeight: '700' })}>{v}</td>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                {[
                  ['Total absent',      ps.total_absent     || ps.totalAbsent  || '0'],
                  ['Total work+ot',     ps.total_work_ot    || ps.totalWorkOt  || '0'],
                  ['Total ot',          ps.total_ot_hours   || ps.total_ot     || ps.totalOt     || '0'],
                  ['Bs/reference amt.', ps.bonus_ref_amt    || ps.bs_reference_amt || ps.bsReferenceAmt || '0'],
                ].map(([l, v], i) => (
                  <React.Fragment key={i}>
                    <td style={labelCell({ width: '15%' })}>{l}</td>
                    <td style={cell({ textAlign: 'right', width: '10%', fontWeight: '700' })}>{v}</td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Earnings / Incentives / Deductions */}
        <div style={{ marginTop: '20px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {['Earning', 'Incentives', 'Deduction'].map(t => (
              <div key={t} style={{ backgroundColor: '#f8fafc', padding: '10px 15px', fontSize: '12px', fontWeight: '900', color: '#0B1E3F', border: '1px solid #cbd5e1', borderBottom: 'none' }}>{t}</div>
            ))}
          </div>
          <div style={{ display: 'flex' }}>
            <SectionCard title="Earning"    rows={earningRows}   total={totalEarning}   totalLabel="Total Earning"  color="#16a34a" />
            <SectionCard title="Incentives" rows={incentiveRows} total={totalIncentive} totalLabel="Total Incent."  />
            <SectionCard title="Deduction"  rows={deductionRows} total={totalDeduction} totalLabel="Total Deduct."  color="#ef4444" />
          </div>

          {/* Net Payable */}
          <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#eef2ff' }}>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0B1E3F' }}>Net Payable</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e40af' }}>₹ {netPay}</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: '30px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          This is a computer generated payslip and does not require a physical signature.
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#1e3a8a', fontWeight: '700', lineHeight: '1.6' }}>
            {(ps.company_phone || ps.phone || COMPANY_INFO.phone) && <>{ps.company_phone || ps.phone || COMPANY_INFO.phone}<br /></>}
            {(ps.company_website || ps.website || COMPANY_INFO.website) && <>{ps.company_website || ps.website || COMPANY_INFO.website}<br /></>}
            {(ps.company_email || ps.email || COMPANY_INFO.email) && <>{ps.company_email || ps.email || COMPANY_INFO.email}</>}
          </div>
        </div>

        {/* Bottom decorative shapes */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '200px', height: '150px', backgroundColor: '#3b82f6', clipPath: 'polygon(0 0, 0 100%, 100% 100%)', opacity: 0.1, zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '150px', height: '110px', backgroundColor: '#2563eb', clipPath: 'polygon(0 30%, 0 100%, 70% 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '90px', height: '80px', backgroundColor: '#1e40af', clipPath: 'polygon(0 60%, 0 100%, 40% 100%)', zIndex: 1 }} />

        <style>{`
          @media print {
            .no-print { display: none; }
            body { background: white; padding: 0; }
            .printable-payslip { box-shadow: none !important; margin: 0 !important; padding: 40px !important; width: 100% !important; max-width: none !important; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
