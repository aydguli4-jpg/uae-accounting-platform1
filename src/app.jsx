import { useState, useRef, useEffect } from "react";

const OPENAI_KEY = ""; // замени на свой ключ sk-...

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite AI financial and tax advisor for UAE businesses.
You have deep expertise in:
- UAE VAT Law (Federal Decree-Law No. 8 of 2017)
- UAE Corporate Tax Law (Federal Decree-Law No. 47 of 2022): 9% rate
- Tax Procedures Law (Federal Law No. 7 of 2017)
- Full IFRS suite, IFRS for SMEs
- UAE Banking, CBUAE regulations, Islamic finance
- UAE Labour Law, WPS, gratuity calculations
- DIFC, ADGM, JAFZA, DMCC, RAKEZ Free Zones
- CIMA, ACCA, CFA professional standards
Always cite specific laws and articles. Answer in EN/AR/RU based on user language.
End every answer with: "* Please consult a licensed UAE tax advisor or auditor for binding advice."`;

// ─── CONTRACT DATA ────────────────────────────────────────────────────────────
const CONTRACT_TYPES = [
  { id: "service",     label: "Service Agreement",   icon: "ti-briefcase",    desc: "Accounting / consulting" },
  { id: "engagement",  label: "Engagement Letter",    icon: "ti-mail-forward", desc: "ACCA-standard" },
  { id: "nda",         label: "NDA / Confidentiality",icon: "ti-lock",         desc: "Non-disclosure" },
  { id: "employment",  label: "Employment Contract",  icon: "ti-user-check",   desc: "UAE Labour Law" },
  { id: "freelancer",  label: "Freelancer Agreement", icon: "ti-user-bolt",    desc: "Independent contractor" },
  { id: "poa",         label: "Power of Attorney",    icon: "ti-certificate",  desc: "FTA representation" },
];

const CONTRACT_FIELDS = {
  service:    [
    { key: "providerName", label: "Provider Name",    placeholder: "ABC Accounting LLC" },
    { key: "providerTRN",  label: "Provider TRN",     placeholder: "100123456700003" },
    { key: "clientName",   label: "Client Name",      placeholder: "XYZ Trading LLC" },
    { key: "services",     label: "Scope of Services",placeholder: "Monthly bookkeeping, VAT filing" },
    { key: "fee",          label: "Monthly Fee (AED)",placeholder: "3,500" },
    { key: "startDate",    label: "Start Date",       placeholder: "01 July 2026" },
    { key: "jurisdiction", label: "Jurisdiction",     placeholder: "Dubai, UAE" },
  ],
  engagement: [
    { key: "firmName",       label: "Firm Name",         placeholder: "Alpha Advisory FZ LLC" },
    { key: "clientName",     label: "Client Name",       placeholder: "Beta Hospitality LLC" },
    { key: "engagementType", label: "Type of Engagement",placeholder: "Audit, VAT compliance" },
    { key: "fee",            label: "Total Fee (AED)",   placeholder: "18,000" },
    { key: "periodCovered",  label: "Period Covered",    placeholder: "FY ending 31 Dec 2026" },
    { key: "startDate",      label: "Engagement Date",   placeholder: "01 January 2026" },
  ],
  nda: [
    { key: "party1",       label: "Disclosing Party",      placeholder: "TechVentures LLC" },
    { key: "party2",       label: "Receiving Party",       placeholder: "Digital Solutions FZ LLC" },
    { key: "purpose",      label: "Purpose",               placeholder: "Evaluation of potential partnership" },
    { key: "duration",     label: "Confidentiality Period",placeholder: "3 years from signing" },
    { key: "jurisdiction", label: "Governing Law",         placeholder: "DIFC Courts, Dubai" },
    { key: "effectiveDate",label: "Effective Date",        placeholder: "15 June 2026" },
  ],
  employment: [
    { key: "employerName", label: "Employer Name",      placeholder: "Gulf Services LLC" },
    { key: "employeeName", label: "Employee Full Name", placeholder: "Sarah Johnson" },
    { key: "jobTitle",     label: "Job Title",          placeholder: "Senior Accountant" },
    { key: "basicSalary",  label: "Basic Salary (AED/month)", placeholder: "12,000" },
    { key: "startDate",    label: "Start Date",         placeholder: "01 August 2026" },
    { key: "contractType", label: "Contract Type",      placeholder: "Limited (2 years)" },
  ],
  freelancer: [
    { key: "clientName",      label: "Client / Company",  placeholder: "Nexus Consulting LLC" },
    { key: "freelancerName",  label: "Freelancer Name",   placeholder: "Ahmed Al Mansoori" },
    { key: "services",        label: "Services",          placeholder: "Financial modelling, analysis" },
    { key: "rate",            label: "Rate",              placeholder: "AED 500/hour" },
    { key: "projectDuration", label: "Duration",          placeholder: "3 months from 01 July 2026" },
    { key: "paymentSchedule", label: "Payment Schedule",  placeholder: "50% upfront, 50% on delivery" },
  ],
  poa: [
    { key: "principalName", label: "Principal",       placeholder: "XYZ Trading LLC — Mohammed Al Rashid" },
    { key: "agentName",     label: "Agent / Attorney", placeholder: "Alpha Advisory — Tax Agent No. 20012345" },
    { key: "scope",         label: "Scope",           placeholder: "Represent before FTA for VAT and CT" },
    { key: "effectiveDate", label: "Effective Date",  placeholder: "01 June 2026" },
    { key: "expiryDate",    label: "Expiry Date",     placeholder: "31 May 2027" },
  ],
};

const CONTRACT_PROMPTS = {
  service:    (f) => `Generate a UAE Service Agreement. Provider: ${f.providerName}, TRN: ${f.providerTRN}. Client: ${f.clientName}. Services: ${f.services}. Fee: AED ${f.fee}/month. Start: ${f.startDate}. Jurisdiction: ${f.jurisdiction}. Include definitions, scope, fees with 5% VAT, obligations, confidentiality, termination (30 days notice), dispute resolution. Number all clauses.`,
  engagement: (f) => `Generate a professional Engagement Letter per ACCA/ICAEW standards. Firm: ${f.firmName}. Client: ${f.clientName}. Engagement: ${f.engagementType}. Fee: AED ${f.fee}. Period: ${f.periodCovered}. Date: ${f.startDate}. Include scope, responsibilities, fees with 5% VAT, independence, confidentiality, liability limitation, acceptance block.`,
  nda:        (f) => `Generate a UAE NDA. Disclosing: ${f.party1}. Receiving: ${f.party2}. Purpose: ${f.purpose}. Period: ${f.duration}. Governing law: ${f.jurisdiction}. Effective: ${f.effectiveDate}. Include definition of confidential info, exclusions, obligations, permitted disclosures, return of information, remedies, signature blocks.`,
  employment: (f) => `Generate a UAE Employment Contract per Federal Decree-Law No. 33 of 2021. Employer: ${f.employerName}. Employee: ${f.employeeName}. Title: ${f.jobTitle}. Basic: AED ${f.basicSalary}/month. Start: ${f.startDate}. Type: ${f.contractType}. Include duties, hours (48hrs/week), annual leave (30 days), sick leave, gratuity (21 days/year first 5 years), probation (6 months max), WPS compliance, signature blocks.`,
  freelancer: (f) => `Generate a UAE Freelancer Agreement. Client: ${f.clientName}. Freelancer: ${f.freelancerName}. Services: ${f.services}. Rate: ${f.rate}. Duration: ${f.projectDuration}. Payment: ${f.paymentSchedule}. Include independent contractor status, deliverables, IP assignment, confidentiality, termination (14 days), governing law UAE.`,
  poa:        (f) => `Generate a UAE Power of Attorney for tax representation. Principal: ${f.principalName}. Agent: ${f.agentName}. Scope: ${f.scope}. Effective: ${f.effectiveDate}. Expires: ${f.expiryDate}. Include specific powers granted, limitations, validity, revocation, notarisation note for mainland UAE, witness lines.`,
};

// ─── INVOICE HELPERS ──────────────────────────────────────────────────────────
const EMPTY_INV = {
  supplierName:"", supplierTRN:"", supplierAddress:"", supplierEmail:"",
  clientName:"", clientTRN:"", clientAddress:"", clientEmail:"",
  invoiceNo:"", invoiceDate:"", dueDate:"", currency:"AED",
  items:[{ desc:"", qty:"1", unit:"Service", unitPrice:"", vatRate:"5" }],
  notes:"", bankName:"", iban:"", swift:"",
};
const calcItem = (it) => {
  const qty = parseFloat(it.qty)||0, price = parseFloat(it.unitPrice)||0, net = qty*price;
  const vat = it.vatRate==="exempt" ? 0 : net*(parseFloat(it.vatRate)/100);
  return { net, vat, gross: net+vat };
};
const fmt = (n) => n.toLocaleString("en-AE",{minimumFractionDigits:2,maximumFractionDigits:2});

// ─── AI CATEGORIES ────────────────────────────────────────────────────────────
const AI_CATS = [
  { label:"Accounting", icon:"ti-calculator", color:"#534AB7", bg:"#EEEDFE",
    questions:["What is the double-entry for a VAT-inclusive invoice?","How do I close the books at month-end?","What journal entries are needed for payroll in UAE?"] },
  { label:"UAE VAT",    icon:"ti-receipt-tax", color:"#185FA5", bg:"#E6F1FB",
    questions:["What is the VAT registration threshold in UAE?","Which supplies are zero-rated?","What are required fields on a UAE tax invoice?"] },
  { label:"Corp. Tax",  icon:"ti-building-skyscraper", color:"#3B6D11", bg:"#EAF3DE",
    questions:["Who qualifies for Small Business Relief?","How are Free Zone companies taxed?","What income is exempt under UAE CT?"] },
  { label:"IFRS",       icon:"ti-report-analytics", color:"#854F0B", bg:"#FAEEDA",
    questions:["How do I account for a lease under IFRS 16?","What is the 5-step revenue model under IFRS 15?","How does ECL impairment work under IFRS 9?"] },
  { label:"Finance",    icon:"ti-chart-bar", color:"#712B13", bg:"#FAECE7",
    questions:["How do I calculate the cash conversion cycle?","What KPIs should a CFO track monthly?","What is the difference between EBITDA and operating profit?"] },
];

const TABS = [
  { id:"advisor",   label:"AI Advisor",  icon:"ti-brain" },
  { id:"contracts", label:"Contracts",   icon:"ti-file-text" },
  { id:"invoice",   label:"Tax Invoice", icon:"ti-receipt" },
];

// ─── OPENAI CALL ──────────────────────────────────────────────────────────────
async function callOpenAI(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1000, messages }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

// ─── AI ADVISOR ───────────────────────────────────────────────────────────────
function AIAdvisor() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);

  async function send(text) {
    const q = (text||input).trim(); if (!q||loading) return;
    setInput("");
    const newMsgs = [...msgs, { role:"user", content:q }];
    setMsgs(newMsgs); setLoading(true);
    try {
      const reply = await callOpenAI([{ role:"system", content:SYSTEM_PROMPT }, ...newMsgs]);
      setMsgs([...newMsgs, { role:"assistant", content:reply }]);
    } catch { setMsgs([...newMsgs, { role:"assistant", content:"Connection error. Check your API key." }]); }
    finally { setLoading(false); }
  }

  const cat = AI_CATS[tab];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:580 }}>
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.length === 0 && (
          <div>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", textAlign:"center", marginBottom:12 }}>Select a topic and ask a question</div>
            <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
              {AI_CATS.map((c,i) => (
                <button key={i} onClick={()=>setTab(i)} style={{ padding:"4px 11px", borderRadius:20, fontSize:11, fontFamily:"var(--font-sans)", border:`1px solid ${i===tab?c.color:"var(--color-border-tertiary)"}`, background:i===tab?c.bg:"transparent", color:i===tab?c.color:"var(--color-text-secondary)", cursor:"pointer", fontWeight:i===tab?500:400, display:"flex", alignItems:"center", gap:4 }}>
                  <i className={`ti ${c.icon}`} aria-hidden="true" /> {c.label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {cat.questions.map((q,i) => (
                <button key={i} onClick={()=>send(q)} style={{ background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", borderLeft:`3px solid ${cat.color}`, borderRadius:8, padding:"8px 12px", fontSize:12, color:"var(--color-text-primary)", cursor:"pointer", textAlign:"left", fontFamily:"var(--font-sans)" }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <div style={{ width:26, height:26, borderRadius:"50%", background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", marginRight:7, marginTop:2, flexShrink:0 }}><i className="ti ti-brain" style={{ fontSize:13, color:"#185FA5" }} aria-hidden="true" /></div>}
            <div style={{ maxWidth:"80%", padding:"9px 13px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"#185FA5":"var(--color-background-secondary)", color:m.role==="user"?"#fff":"var(--color-text-primary)", fontSize:12, lineHeight:1.65, border:m.role==="assistant"?"1px solid var(--color-border-tertiary)":"none", whiteSpace:"pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", alignItems:"center", gap:7 }}><div style={{ width:26, height:26, borderRadius:"50%", background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-brain" style={{ fontSize:13, color:"#185FA5" }} aria-hidden="true" /></div><div style={{ padding:"9px 13px", borderRadius:"16px 16px 16px 4px", background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", fontSize:12, color:"var(--color-text-secondary)" }}>Analysing...</div></div>}
        <div ref={ref} />
      </div>
      <div style={{ padding:"10px 14px", borderTop:"1px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)", display:"flex", gap:7, alignItems:"flex-end" }}>
        {msgs.length > 0 && <button onClick={()=>setMsgs([])} style={{ width:34, height:34, borderRadius:"50%", border:"1px solid var(--color-border-tertiary)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} aria-label="Clear"><i className="ti ti-refresh" style={{ fontSize:14, color:"var(--color-text-secondary)" }} aria-hidden="true" /></button>}
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask about UAE VAT, IFRS, Corporate Tax..." rows={1} style={{ flex:1, resize:"none", border:"1px solid var(--color-border-secondary)", borderRadius:18, padding:"7px 13px", fontSize:12, fontFamily:"var(--font-sans)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", outline:"none", lineHeight:1.5 }} />
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:34, height:34, borderRadius:"50%", background:input.trim()&&!loading?"#185FA5":"var(--color-border-tertiary)", border:"none", cursor:input.trim()&&!loading?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} aria-label="Send"><i className="ti ti-arrow-up" style={{ fontSize:15, color:"#fff" }} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

// ─── CONTRACT GENERATOR ───────────────────────────────────────────────────────
function ContractGen() {
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  function pick(t) { setSel(t); setForm({}); setResult(""); setStep(2); }
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  const fields = sel ? CONTRACT_FIELDS[sel.id] : [];
  const filled = fields.filter(f=>form[f.key]?.trim()).length;

  async function generate() {
    setLoading(true);
    try {
      const reply = await callOpenAI([
        { role:"system", content:"You are a senior UAE legal counsel. Generate complete professional contracts ready for signing. Number all clauses. End with: LEGAL DISCLAIMER: Review with a licensed UAE legal practitioner before execution. Output contract text only." },
        { role:"user", content: CONTRACT_PROMPTS[sel.id](form) }
      ]);
      setResult(reply); setStep(3);
    } catch { } finally { setLoading(false); }
  }

  return (
    <div style={{ padding:16, minHeight:540 }}>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {["Choose type","Fill details","Review"].map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5, flex:i<2?1:"auto" }}>
            <div style={{ width:20, height:20, borderRadius:"50%", background:step>i?"#534AB7":step===i+1?"#EEEDFE":"var(--color-border-tertiary)", border:step===i+1?"2px solid #534AB7":"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:step>i?"#fff":step===i+1?"#534AB7":"var(--color-text-tertiary)", fontWeight:500, flexShrink:0 }}>
              {step>i+1?<i className="ti ti-check" style={{fontSize:11}} />:i+1}
            </div>
            <span style={{ fontSize:11, color:step===i+1?"var(--color-text-primary)":"var(--color-text-tertiary)", fontWeight:step===i+1?500:400 }}>{s}</span>
            {i<2&&<div style={{ flex:1, height:1, background:"var(--color-border-tertiary)" }} />}
          </div>
        ))}
        {step>1&&<button onClick={()=>{setStep(1);setSel(null);setResult("");}} style={{ fontSize:11, padding:"3px 9px", borderRadius:14, border:"1px solid var(--color-border-tertiary)", background:"transparent", color:"var(--color-text-secondary)", cursor:"pointer", fontFamily:"var(--font-sans)" }}>← Back</button>}
      </div>

      {step===1&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>{CONTRACT_TYPES.map(t=>(
        <button key={t.id} onClick={()=>pick(t)} style={{ padding:"12px 14px", borderRadius:10, border:"1px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)", cursor:"pointer", textAlign:"left", display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ width:30, height:30, borderRadius:7, background:"#EEEDFE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><i className={`ti ${t.icon}`} style={{ fontSize:15, color:"#534AB7" }} aria-hidden="true" /></div>
          <div><div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>{t.label}</div><div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{t.desc}</div></div>
        </button>
      ))}</div>}

      {step===2&&sel&&<div>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>{sel.label} — {filled}/{fields.length} fields</div>
        <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:16 }}>
          {fields.map(f=>(
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>{f.label}</label>
              <input value={form[f.key]||""} onChange={e=>setF(f.key,e.target.value)} placeholder={f.placeholder} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:12, fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <button onClick={generate} disabled={loading||filled<3} style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:filled>=3&&!loading?"#534AB7":"var(--color-border-tertiary)", color:"#fff", fontSize:12, fontWeight:500, cursor:filled>=3&&!loading?"pointer":"default", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <i className="ti ti-wand" style={{fontSize:14}} aria-hidden="true" />{loading?"Generating...":"Generate Contract"}
        </button>
      </div>}

      {step===3&&result&&<div>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
          <div style={{ width:24, height:24, borderRadius:"50%", background:"#EAF3DE", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-check" style={{ fontSize:13, color:"#3B6D11" }} aria-hidden="true" /></div>
          <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Contract ready</span>
          <button onClick={()=>navigator.clipboard.writeText(result)} style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:14, border:"1px solid var(--color-border-tertiary)", background:"transparent", fontSize:11, color:"var(--color-text-secondary)", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:4 }}><i className="ti ti-copy" style={{fontSize:12}} aria-hidden="true" /> Copy</button>
        </div>
        <div style={{ background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", borderRadius:9, padding:"14px 16px", fontSize:11, lineHeight:1.8, color:"var(--color-text-primary)", whiteSpace:"pre-wrap", maxHeight:380, overflowY:"auto", fontFamily:"var(--font-mono)" }}>{result}</div>
        <div style={{ marginTop:10, padding:"8px 12px", borderRadius:7, background:"var(--color-background-warning)", border:"1px solid var(--color-border-warning)", fontSize:11, color:"var(--color-text-warning)", display:"flex", gap:7 }}>
          <i className="ti ti-alert-triangle" style={{fontSize:13,flexShrink:0}} aria-hidden="true" /> Review with a licensed UAE legal practitioner before signing.
        </div>
      </div>}
    </div>
  );
}

// ─── INVOICE GENERATOR ────────────────────────────────────────────────────────
function InvoiceGen() {
  const [data, setData] = useState(EMPTY_INV);
  const [view, setView] = useState("form");
  const set = (k,v) => setData(p=>({...p,[k]:v}));
  const setItem = (i,k,v) => setData(p=>{ const items=[...p.items]; items[i]={...items[i],[k]:v}; return {...p,items}; });
  const addItem = () => setData(p=>({...p,items:[...p.items,{desc:"",qty:"1",unit:"Service",unitPrice:"",vatRate:"5"}]}));
  const removeItem = (i) => setData(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const totals = data.items.reduce((acc,it)=>{ const c=calcItem(it); return {net:acc.net+c.net,vat:acc.vat+c.vat,gross:acc.gross+c.gross}; },{net:0,vat:0,gross:0});

  function printInvoice() {
    const w=window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${data.invoiceNo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:32px}
.hdr{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #185FA5}
.brand{font-size:18px;font-weight:700;color:#185FA5}.badge{background:#E6F1FB;color:#185FA5;font-size:10px;font-weight:700;padding:3px 9px;border-radius:12px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.pb{background:#f8f9fa;border-radius:8px;padding:10px}
.pl{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px}.pn{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#185FA5;color:#fff;font-size:11px;padding:6px 8px;text-align:left}
th.r{text-align:right}td{padding:6px 8px;border-bottom:1px solid #eee;font-size:11px}td.r{text-align:right}
.tots{display:flex;justify-content:flex-end;margin-bottom:16px}.tb{min-width:200px}
.tr{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px solid #eee}
.tg{display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#185FA5;padding-top:6px}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center}</style></head><body>
<div class="hdr"><div><div class="brand">${data.supplierName||"Your Company"}</div><div style="font-size:11px;color:#666">${data.supplierAddress||""}</div>${data.supplierTRN?`<div style="font-size:11px;font-weight:600">TRN: ${data.supplierTRN}</div>`:""}</div>
<div style="text-align:right"><div class="badge">TAX INVOICE</div><div style="font-size:15px;font-weight:700;margin-top:5px">#${data.invoiceNo||"INV-001"}</div><div style="font-size:11px;color:#666">${data.invoiceDate}</div>${data.dueDate?`<div style="font-size:11px;color:#666">Due: ${data.dueDate}</div>`:""}</div></div>
<div class="parties"><div class="pb"><div class="pl">Bill From</div><div class="pn">${data.supplierName||""}</div><div style="font-size:11px;color:#555">${data.supplierAddress||""}</div></div>
<div class="pb"><div class="pl">Bill To</div><div class="pn">${data.clientName||""}</div><div style="font-size:11px;color:#555">${data.clientTRN?"TRN: "+data.clientTRN+"<br>":""}${data.clientAddress||""}</div></div></div>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">VAT</th><th class="r">Total</th></tr></thead><tbody>
${data.items.map(it=>{const c=calcItem(it);return`<tr><td>${it.desc||""}</td><td class="r">${it.qty}</td><td class="r">${fmt(parseFloat(it.unitPrice)||0)}</td><td class="r">${it.vatRate==="exempt"?"Exempt":it.vatRate+"%"}</td><td class="r">${fmt(c.gross)}</td></tr>`;}).join("")}
</tbody></table>
<div class="tots"><div class="tb"><div class="tr"><span>Subtotal</span><span>${data.currency} ${fmt(totals.net)}</span></div><div class="tr"><span>VAT</span><span>${data.currency} ${fmt(totals.vat)}</span></div><div class="tg"><span>Total Due</span><span>${data.currency} ${fmt(totals.gross)}</span></div></div></div>
${data.bankName?`<div style="background:#f0f7ff;border-radius:8px;padding:10px;margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:#185FA5;margin-bottom:4px">PAYMENT DETAILS</div><div style="font-size:11px;color:#444">${data.bankName?"Bank: "+data.bankName+"<br>":""}${data.iban?"IBAN: "+data.iban+"<br>":""}${data.swift?"SWIFT: "+data.swift:""}</div></div>`:""}
${data.notes?`<div style="background:#fffbf0;border-radius:8px;padding:10px"><div style="font-size:10px;font-weight:700;color:#854F0B;margin-bottom:4px">NOTES</div><div style="font-size:11px;color:#444">${data.notes}</div></div>`:""}
<div class="footer">Tax Invoice per UAE VAT Law (Federal Decree-Law No. 8 of 2017)${data.supplierTRN?" | TRN: "+data.supplierTRN:""}</div>
</body></html>`);
    w.document.close(); w.print();
  }

  const inp = (label,key,placeholder,half) => (
    <div style={{ gridColumn:half?"span 1":"span 2" }}>
      <label style={{ fontSize:11, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>{label}</label>
      <input value={data[key]} onChange={e=>set(key,e.target.value)} placeholder={placeholder} style={{ width:"100%", padding:"6px 9px", borderRadius:7, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:12, fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" }} />
    </div>
  );

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {["form","preview"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{ padding:"4px 12px", borderRadius:16, border:`1px solid ${view===v?"#185FA5":"var(--color-border-tertiary)"}`, background:view===v?"#E6F1FB":"transparent", color:view===v?"#185FA5":"var(--color-text-secondary)", fontSize:11, fontWeight:view===v?500:400, cursor:"pointer", fontFamily:"var(--font-sans)", textTransform:"capitalize" }}>{v}</button>
        ))}
      </div>

      {view==="form"?<div>
        <div style={{ fontSize:11, fontWeight:600, color:"#185FA5", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Supplier</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:14 }}>
          {inp("Company Name","supplierName","ABC Accounting LLC",true)}
          {inp("TRN","supplierTRN","100123456700003",true)}
          {inp("Address","supplierAddress","Office 301, Business Bay, Dubai",true)}
          {inp("Email","supplierEmail","invoices@abc.ae",true)}
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:"#534AB7", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Client</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:14 }}>
          {inp("Client Name","clientName","XYZ Trading LLC",true)}
          {inp("Client TRN","clientTRN","100987654300003",true)}
          {inp("Client Address","clientAddress","Unit 5, JAFZA",true)}
          {inp("Client Email","clientEmail","accounts@xyz.ae",true)}
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:"#854F0B", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Invoice Details</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:14 }}>
          {inp("Invoice No.","invoiceNo","INV-2026-001",true)}
          {inp("Currency","currency","AED",true)}
          {inp("Invoice Date","invoiceDate","15 June 2026",true)}
          {inp("Due Date","dueDate","22 June 2026",true)}
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:"#3B6D11", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Line Items</div>
        {data.items.map((it,i)=>{
          const c=calcItem(it);
          return (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"3fr 0.5fr 1fr 0.7fr 0.6fr", gap:5, marginBottom:6, alignItems:"end" }}>
              <input value={it.desc} onChange={e=>setItem(i,"desc",e.target.value)} placeholder="Accounting services — June 2026" style={{ padding:"6px 8px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none" }} />
              <input value={it.qty} onChange={e=>setItem(i,"qty",e.target.value)} type="number" placeholder="1" style={{ padding:"6px 8px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none" }} />
              <input value={it.unitPrice} onChange={e=>setItem(i,"unitPrice",e.target.value)} type="number" placeholder="5000" style={{ padding:"6px 8px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none" }} />
              <select value={it.vatRate} onChange={e=>setItem(i,"vatRate",e.target.value)} style={{ padding:"6px 7px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none" }}>
                <option value="5">5%</option><option value="0">0%</option><option value="exempt">Exempt</option>
              </select>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ flex:1, padding:"6px 8px", borderRadius:6, background:"var(--color-background-secondary)", fontSize:11, color:"var(--color-text-secondary)", textAlign:"right" }}>{fmt(c.gross)}</div>
                {data.items.length>1&&<button onClick={()=>removeItem(i)} style={{ width:24, height:24, borderRadius:5, border:"1px solid var(--color-border-tertiary)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }} aria-label="Remove"><i className="ti ti-x" style={{fontSize:11,color:"var(--color-text-tertiary)"}} aria-hidden="true"/></button>}
              </div>
            </div>
          );
        })}
        <button onClick={addItem} style={{ padding:"5px 12px", borderRadius:7, border:"1px dashed var(--color-border-secondary)", background:"transparent", fontSize:11, color:"var(--color-text-secondary)", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:4, marginBottom:14 }}>
          <i className="ti ti-plus" style={{fontSize:12}} aria-hidden="true"/> Add line item
        </button>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
          <div style={{ minWidth:220, background:"var(--color-background-secondary)", borderRadius:9, padding:"10px 14px", border:"1px solid var(--color-border-tertiary)" }}>
            {[["Subtotal",totals.net],["VAT",totals.vat]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0", borderBottom:"1px solid var(--color-border-tertiary)", color:"var(--color-text-secondary)" }}><span>{l}</span><span>{data.currency} {fmt(v)}</span></div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:500, paddingTop:7, color:"#185FA5" }}><span>Total Due</span><span>{data.currency} {fmt(totals.gross)}</span></div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:1, marginBottom:7 }}>Bank Details</div>
            {[["bankName","Bank Name","Emirates NBD"],["iban","IBAN","AE07033..."],["swift","SWIFT","EBILAEAD"]].map(([k,l,p])=>(
              <div key={k} style={{ marginBottom:6 }}>
                <label style={{ fontSize:10, color:"var(--color-text-tertiary)", display:"block", marginBottom:2 }}>{l}</label>
                <input value={data[k]} onChange={e=>set(k,e.target.value)} placeholder={p} style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:1, marginBottom:7 }}>Notes</div>
            <textarea value={data.notes} onChange={e=>set("notes",e.target.value)} placeholder="Payment terms, notes..." rows={5} style={{ width:"100%", padding:"7px 9px", borderRadius:6, border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:11, fontFamily:"var(--font-sans)", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
          </div>
        </div>
        <button onClick={printInvoice} style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:"#185FA5", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <i className="ti ti-printer" style={{fontSize:14}} aria-hidden="true"/> Print / Save as PDF
        </button>
      </div>:<div>
        <div style={{ background:"#fff", border:"1px solid var(--color-border-tertiary)", borderRadius:10, padding:20, color:"#222" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, paddingBottom:12, borderBottom:"2px solid #185FA5" }}>
            <div><div style={{ fontSize:18, fontWeight:700, color:"#185FA5" }}>{data.supplierName||"Your Company"}</div><div style={{ fontSize:11, color:"#666" }}>{data.supplierAddress}</div>{data.supplierTRN&&<div style={{ fontSize:11, fontWeight:600 }}>TRN: {data.supplierTRN}</div>}</div>
            <div style={{ textAlign:"right" }}><div style={{ display:"inline-block", background:"#E6F1FB", color:"#185FA5", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:12, letterSpacing:1 }}>TAX INVOICE</div><div style={{ fontSize:15, fontWeight:700, marginTop:5 }}>#{data.invoiceNo||"INV-001"}</div><div style={{ fontSize:11, color:"#666" }}>{data.invoiceDate}{data.dueDate&&" · Due: "+data.dueDate}</div></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            {[["From",data.supplierName,data.supplierTRN,data.supplierAddress],["To",data.clientName,data.clientTRN,data.clientAddress]].map(([l,n,t,a])=>(
              <div key={l} style={{ background:"#f8f9fa", borderRadius:8, padding:10 }}><div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{l}</div><div style={{ fontSize:12, fontWeight:700 }}>{n||"—"}</div>{t&&<div style={{ fontSize:11, color:"#555" }}>TRN: {t}</div>}{a&&<div style={{ fontSize:11, color:"#666" }}>{a}</div>}</div>
            ))}
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:11 }}>
            <thead><tr style={{ background:"#185FA5", color:"#fff" }}>{["Description","Qty","Unit Price","VAT","Total"].map((h,i)=><th key={h} style={{ padding:"6px 8px", textAlign:i>0?"right":"left", fontWeight:600 }}>{h}</th>)}</tr></thead>
            <tbody>{data.items.map((it,i)=>{const c=calcItem(it);return(<tr key={i} style={{ background:i%2===0?"#fff":"#fafafa", borderBottom:"1px solid #eee" }}><td style={{ padding:"6px 8px" }}>{it.desc||"—"}</td><td style={{ padding:"6px 8px", textAlign:"right" }}>{it.qty}</td><td style={{ padding:"6px 8px", textAlign:"right" }}>{fmt(parseFloat(it.unitPrice)||0)}</td><td style={{ padding:"6px 8px", textAlign:"right" }}>{it.vatRate==="exempt"?"Exempt":it.vatRate+"%"}</td><td style={{ padding:"6px 8px", textAlign:"right", fontWeight:500 }}>{fmt(c.gross)}</td></tr>);})}</tbody>
          </table>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <div style={{ minWidth:200 }}>{[["Subtotal",totals.net],["VAT",totals.vat]].map(([l,v])=><div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 0", borderBottom:"1px solid #eee", color:"#555" }}><span>{l}</span><span>{data.currency} {fmt(v)}</span></div>)}<div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:"#185FA5", paddingTop:6 }}><span>Total Due</span><span>{data.currency} {fmt(totals.gross)}</span></div></div>
          </div>
          <div style={{ fontSize:10, color:"#aaa", textAlign:"center", borderTop:"1px solid #eee", paddingTop:8 }}>UAE VAT Law — Federal Decree-Law No. 8 of 2017{data.supplierTRN?" | TRN: "+data.supplierTRN:""}</div>
        </div>
        <button onClick={printInvoice} style={{ width:"100%", marginTop:12, padding:"10px", borderRadius:9, border:"none", background:"#185FA5", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <i className="ti ti-printer" style={{fontSize:14}} aria-hidden="true"/> Print / Save as PDF
        </button>
      </div>}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("advisor");
  return (
    <div style={{ fontFamily:"var(--font-sans)", minHeight:"100vh", background:"var(--color-background-primary)" }}>
      <div style={{ padding:"12px 20px", background:"var(--color-background-secondary)", borderBottom:"1px solid var(--color-border-tertiary)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className="ti ti-building-bank" style={{ fontSize:16, color:"#fff" }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>UAE Financial Platform</div>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>AI-powered · Tax · Accounting · Legal · Micro & Small Business</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${tab===t.id?"#185FA5":"var(--color-border-tertiary)"}`, background:tab===t.id?"#E6F1FB":"transparent", color:tab===t.id?"#185FA5":"var(--color-text-secondary)", fontSize:12, fontWeight:tab===t.id?500:400, cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:5 }}>
              <i className={`ti ${t.icon}`} style={{fontSize:13}} aria-hidden="true" />{t.label}
            </button>
          ))}
        </div>
      </div>
      {tab==="advisor"   && <AIAdvisor />}
      {tab==="contracts" && <ContractGen />}
      {tab==="invoice"   && <InvoiceGen />}
    </div>
  );
}
