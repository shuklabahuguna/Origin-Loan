"use strict";

const appRoot = document.getElementById("app");
const applications = [];
let currentView = "overview";
let currentApplicationId = null;
let formStep = 1;
let formDraft = {};
let toastTimer;

const states = [
  ["", "Select state"], ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"]
];
const purposes = [
  ["", "Select a purpose"], ["debt_consolidation", "Debt consolidation"], ["home_improvement", "Home improvement"],
  ["major_purchase", "Major purchase"], ["medical", "Medical expenses"], ["vehicle", "Vehicle expenses"],
  ["education", "Education"], ["other", "Other"]
];
const employmentTypes = [
  ["", "Select employment status"], ["employed", "Employed"], ["self_employed", "Self-employed"],
  ["retired", "Retired"], ["unemployed", "Unemployed"], ["other", "Other"]
];
const statusLabels = {
  processing: "Processing", "under-review": "In underwriting", conditional: "Conditional approval",
  approved: "Approved for closing", accepted: "Accepted", denied: "Declined", funded: "Funded"
};
const fieldNames = {
  firstName: "First name", middleName: "Middle name", lastName: "Last name", suffix: "Suffix",
  dateOfBirth: "Date of birth", email: "Email address", phone: "Phone number",
  address1: "Street address", address2: "Apartment or unit", city: "City", state: "State",
  zip: "ZIP code", housing: "Housing status", monthlyHousing: "Monthly housing cost",
  employment: "Employment status", employer: "Employer name", occupation: "Occupation",
  monthlyIncome: "Monthly gross income", otherIncome: "Other monthly income",
  monthlyDebt: "Monthly debt payments", loanAmount: "Requested loan amount",
  loanPurpose: "Loan purpose", loanTerm: "Loan term"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function money(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function displayDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fullName(record) {
  return [record.firstName, record.middleName, record.lastName, record.suffix].filter(Boolean).join(" ");
}

function optionList(items, selected = "") {
  return items.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function showToast(message, isError = false) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.textContent = message;
  document.body.append(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 3500);
}

function navigate(view) {
  currentView = view;
  currentApplicationId = null;
  formStep = 1;
  render();
}

function applicantCell(record) {
  const name = fullName(record);
  const initials = `${record.firstName?.[0] ?? ""}${record.lastName?.[0] ?? ""}`.toUpperCase();
  return `<div class="applicant-cell"><span class="mini-avatar">${escapeHtml(initials)}</span><span><span class="applicant-name">${escapeHtml(name)}</span><span class="applicant-sub">${escapeHtml(record.email)}</span></span></div>`;
}

function applicationRow(record) {
  return `<tr>
    <td>${applicantCell(record)}</td>
    <td>${escapeHtml(record.id)}</td>
    <td class="amount-cell">${money(record.loanAmount)}</td>
    <td>${escapeHtml(purposeLabel(record.loanPurpose))}</td>
    <td><span class="status-pill status-${escapeHtml(record.status)}">${escapeHtml(statusLabels[record.status])}</span></td>
    <td>${displayDate(record.createdAt)}</td>
    <td><button class="table-action" type="button" data-open="${escapeHtml(record.id)}">Open</button></td>
  </tr>`;
}

function purposeLabel(value) {
  return purposes.find(([key]) => key === value)?.[1] ?? value;
}

function tableMarkup(records, emptyText = "Applications appear here after an applicant submits an application.") {
  if (!records.length) {
    return `<div class="empty-state table-empty"><p>${escapeHtml(emptyText)}</p></div>`;
  }
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Applicant</th><th>Application ID</th><th>Requested</th><th>Purpose</th><th>Status</th><th>Received</th><th></th></tr></thead>
    <tbody>${records.map(applicationRow).join("")}</tbody>
  </table></div>`;
}

function pageHeading(eyebrow, title, subtitle, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p class="page-subtitle">${escapeHtml(subtitle)}</p></div>${action}</div>`;
}

function overviewPage() {
  const processing = applications.filter((item) => item.status === "processing").length;
  const underwriting = applications.filter((item) => item.status === "under-review").length;
  const closing = applications.filter((item) => ["approved", "conditional"].includes(item.status)).length;
  const funded = applications.filter((item) => item.status === "funded").length;
  const recent = [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const action = `<button class="button button-primary" type="button" data-action="new"><span class="button-icon">＋</span> New application</button>`;
  return `${pageHeading(new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase(), "Good morning", "Here's your personal lending workspace.", action)}
    <section class="metrics-grid" aria-label="Application summary">
      <article class="metric-card"><div class="metric-top">Total applications<span class="metric-icon">▤</span></div><div class="metric-value">${applications.length}</div><div class="metric-foot">All applications in this session</div></article>
      <article class="metric-card"><div class="metric-top">Processing<span class="metric-icon">◷</span></div><div class="metric-value">${processing}</div><div class="metric-foot">Application setup and document checks</div></article>
      <article class="metric-card"><div class="metric-top">Underwriting<span class="metric-icon">◈</span></div><div class="metric-value">${underwriting}</div><div class="metric-foot">Awaiting manual underwriting outcome</div></article>
      <article class="metric-card"><div class="metric-top">Closing<span class="metric-icon">▣</span></div><div class="metric-value">${closing}</div><div class="metric-foot">Approved; preparing agreement</div></article>
      <article class="metric-card"><div class="metric-top">Funded<span class="metric-icon">↗</span></div><div class="metric-value">${funded}</div><div class="metric-foot">Marked funded in this session</div></article>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Recent applications</h2><p class="panel-caption">A live view of the latest applicant activity</p></div><button class="text-button" type="button" data-view="applications">View all applications →</button></div>
      ${tableMarkup(recent)}
    </section>
    <div class="split-panels">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Retail lending workflow</h2><p class="panel-caption">Move each case through the lending lifecycle</p></div></div>
        <div class="quick-start"><span class="quick-icon">↗</span><div><h3>Application to funding</h3><p>Application &amp; pre-qualification → Processing → Underwriting → Closing → Funding.</p></div></div>
        <div class="workflow-note"><strong>Human review:</strong> Pre-qualification and credit decisions are not automated by this prototype. Complete required checks in accordance with lender policy.</div>
      </section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Activity</h2><p class="panel-caption">Latest actions in this workspace</p></div></div>
        <div class="activity-list">${recent.length ? recent.slice(0, 3).map((item) => `<div class="activity-item"><span class="activity-dot"></span><div class="activity-copy"><strong>${escapeHtml(fullName(item))}</strong> application ${escapeHtml(statusLabels[item.status].toLowerCase())}<div class="activity-time">${displayDate(item.createdAt)}</div></div></div>`).join("") : `<div class="activity-item"><span class="activity-dot"></span><div class="activity-copy">Your application activity will appear here.</div></div>`}</div>
      </section>
    </div>`;
}

function listPage(filter = "all") {
  const filtered = applications.filter((item) => filter === "all" || item.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const action = `<button class="button button-primary" type="button" data-action="new"><span class="button-icon">＋</span> New application</button>`;
  return `${pageHeading("RETAIL LENDING", "Application & pre-qualification", "Capture a loan request and track the case from initial application into processing.", action)}
    <section class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Application register</h2><p class="panel-caption">${applications.length} application${applications.length === 1 ? "" : "s"} in this session</p></div>
        <div class="filter-bar"><label class="sr-only" for="application-search">Search applications</label><input class="search-input" type="search" id="application-search" placeholder="Search applicant or ID"><label class="sr-only" for="status-filter">Filter by status</label><select id="status-filter" class="filter-select">${optionList([["all", "All statuses"], ...Object.entries(statusLabels).map(([value, label]) => [value, label])], filter)}</select></div>
      </div>
      <div id="applications-table">${tableMarkup(filtered, "No applications match these filters.")}</div>
      <div class="filter-summary" id="filter-summary">Showing ${filtered.length} of ${applications.length} applications</div>
    </section>`;
}

function applicationFormPage() {
  return `${pageHeading("APPLICATION & PRE-QUALIFICATION", "Start an application", "Capture the applicant's initial loan request and information for a preliminary, non-binding review.")}
    <form id="application-form" novalidate>
      <div class="form-layout">
        <section class="form-card">
          <div class="form-progress" aria-label="Application form progress">
            ${[["1", "Applicant"], ["2", "Loan & finances"], ["3", "Review"]].map(([number, label], index) => `<div class="progress-step ${formStep === index + 1 ? "active" : formStep > index + 1 ? "done" : ""}"><span class="progress-number">${formStep > index + 1 ? "✓" : number}</span><span>${label}</span></div>${index < 2 ? `<span class="progress-line"></span>` : ""}`).join("")}
          </div>
          <div class="form-body">${formStep === 1 ? applicantFormStep() : formStep === 2 ? financeFormStep() : reviewFormStep()}</div>
        </section>
        <aside class="form-aside">
          <section class="aside-card"><h3>What you'll need</h3><ul class="aside-list"><li><span class="aside-check">✓</span> Applicant contact and residential details</li><li><span class="aside-check">✓</span> Income, housing and monthly obligations</li><li><span class="aside-check">✓</span> Loan purpose, amount and preferred term</li></ul></section>
          <section class="aside-card privacy-card"><h3><span class="privacy-lock">◆</span> Demo data notice</h3><p>This prototype does not save or transmit application data. Do not enter real personal or financial information.</p></section>
          <section class="aside-card"><h3>Pre-qualification is not automated</h3><p>This intake captures information for a preliminary review only. It does not estimate eligibility or loan terms. Submitting routes the case to processing.</p></section>
        </aside>
      </div>
    </form>`;
}

function field(name, label, type = "text", options = {}) {
  const { required = false, placeholder = "", value = "", hint = "", attrs = "", full = false } = options;
  const id = `field-${name}`;
  const reqLabel = required ? ` <span class="required" aria-hidden="true">*</span><span class="sr-only"> required</span>` : "";
  const common = `id="${id}" name="${name}" ${required ? "required" : ""} ${attrs}`;
  let control;
  if (type === "select") {
    control = `<select ${common}>${optionList(options.items ?? [], value)}</select>`;
  } else {
    control = `<input type="${type}" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"${type === "number" ? ` min="${options.min ?? 0}" max="${options.max ?? 1000000}" step="${options.step ?? 1}"` : ""}${type === "date" ? ` max="${todayIso()}"` : ""}>`;
  }
  return `<div class="field${full ? " full" : ""}"><label for="${id}">${label}${reqLabel}</label>${control}${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ""}<p class="field-error" data-error-for="${name}"></p></div>`;
}

function applicantFormStep() {
  const old = readFormValues();
  return `<div class="form-section-head"><h2>Applicant information</h2><span class="required-note"><span class="required">*</span> Required field</span></div>
    <div class="form-grid">
      ${field("firstName", "Legal first name", "text", { required: true, placeholder: "As shown on identification", value: old.firstName })}
      ${field("middleName", "Middle name", "text", { placeholder: "Optional", value: old.middleName })}
      ${field("lastName", "Legal last name", "text", { required: true, placeholder: "As shown on identification", value: old.lastName })}
      ${field("suffix", "Suffix", "select", { items: [["", "None"], ["Jr.", "Jr."], ["Sr.", "Sr."], ["II", "II"], ["III", "III"], ["IV", "IV"]], value: old.suffix })}
      ${field("dateOfBirth", "Date of birth", "date", { required: true, value: old.dateOfBirth, hint: "Applicant must be at least 18 years old." })}
      ${field("email", "Email address", "email", { required: true, placeholder: "name@example.com", value: old.email })}
      ${field("phone", "Phone number", "tel", { required: true, placeholder: "(555) 555-0100", value: old.phone, attrs: 'autocomplete="tel"' })}
    </div>
    <div class="form-divider"></div>
    <div class="form-section-head"><h2>Residential address</h2></div>
    <div class="form-grid">
      ${field("address1", "Street address", "text", { required: true, placeholder: "Street address", value: old.address1, full: true })}
      ${field("address2", "Apartment, suite, or unit", "text", { placeholder: "Optional", value: old.address2, full: true })}
      ${field("city", "City", "text", { required: true, placeholder: "City", value: old.city })}
      ${field("state", "State", "select", { required: true, items: states, value: old.state })}
      ${field("zip", "ZIP code", "text", { required: true, placeholder: "12345", value: old.zip, attrs: 'inputmode="numeric" autocomplete="postal-code" maxlength="10"' })}
    </div>
    <div class="form-footer"><span class="form-footer-note">Applicant details are required to create a case.</span><span class="button-group"><button class="button button-primary" type="button" data-action="next">Continue <span aria-hidden="true">→</span></button></span></div>`;
}

function financeFormStep() {
  const old = readFormValues();
  return `<div class="form-section-head"><h2>Loan request</h2><span class="required-note"><span class="required">*</span> Required field</span></div>
    <div class="form-grid">
      ${field("loanAmount", "Requested amount", "number", { required: true, min: 500, max: 100000, step: 100, value: old.loanAmount, hint: "Enter an amount from $500 to $100,000." })}
      ${field("loanPurpose", "Loan purpose", "select", { required: true, items: purposes, value: old.loanPurpose })}
      ${field("loanTerm", "Preferred loan term", "select", { required: true, items: [["", "Select a term"], ["12", "12 months"], ["24", "24 months"], ["36", "36 months"], ["48", "48 months"], ["60", "60 months"]], value: old.loanTerm })}
      <div class="field"><span class="field-label">Housing status <span class="required" aria-hidden="true">*</span></span><div class="radio-options">${[["rent", "Rent"], ["own", "Own"], ["other", "Other"]].map(([value, label]) => `<label class="radio-card"><input type="radio" name="housing" value="${value}"${old.housing === value ? " checked" : ""} required> ${label}</label>`).join("")}</div><p class="field-error" data-error-for="housing"></p></div>
      ${field("monthlyHousing", "Monthly housing cost", "number", { required: true, min: 0, max: 100000, step: 50, value: old.monthlyHousing, hint: "Rent or mortgage payment.", attrs: 'data-currency="true"' })}
    </div>
    <div class="form-divider"></div>
    <div class="form-section-head"><h2>Income & obligations</h2></div>
    <div class="form-grid">
      ${field("employment", "Employment status", "select", { required: true, items: employmentTypes, value: old.employment })}
      ${field("employer", "Employer name", "text", { placeholder: "Optional", value: old.employer })}
      ${field("occupation", "Occupation", "text", { placeholder: "Optional", value: old.occupation })}
      ${field("monthlyIncome", "Monthly gross income", "number", { required: true, min: 1, max: 10000000, step: 100, value: old.monthlyIncome, hint: "Before taxes; include recurring income.", attrs: 'data-currency="true"' })}
      ${field("otherIncome", "Other monthly income", "number", { min: 0, max: 10000000, step: 100, value: old.otherIncome || 0, attrs: 'data-currency="true"' })}
      ${field("monthlyDebt", "Monthly debt payments", "number", { required: true, min: 0, max: 1000000, step: 50, value: old.monthlyDebt, hint: "Estimated monthly payments on existing debt.", attrs: 'data-currency="true"' })}
    </div>
    <div class="form-divider"></div>
    <div class="form-section-head"><h2>Applicant authorizations</h2></div>
    <div class="check-list">
      <label class="check-row"><input type="checkbox" name="creditAuthorization"${old.creditAuthorization ? " checked" : ""}><span><strong>Credit report authorization <span class="required">*</span></strong><br>I authorize the lender to obtain a consumer report as part of evaluating this application. No report is obtained by this prototype.</span></label>
      <label class="check-row"><input type="checkbox" name="electronicConsent"${old.electronicConsent ? " checked" : ""}><span><strong>Electronic communications <span class="required">*</span></strong><br>I consent to receive application communications and disclosures electronically.</span></label>
      <label class="check-row"><input type="checkbox" name="privacyAcknowledgment"${old.privacyAcknowledgment ? " checked" : ""}><span><strong>Privacy notice acknowledgment <span class="required">*</span></strong><br>I acknowledge receipt of the lender's privacy notice.</span></label>
    </div>
    <p class="field-error" data-error-for="consents"></p>
    <div class="form-footer"><span class="form-footer-note">Required consents are recorded with the submission.</span><span class="button-group"><button class="button button-secondary" type="button" data-action="back">Back</button><button class="button button-primary" type="button" data-action="next">Review application <span aria-hidden="true">→</span></button></span></div>`;
}

function readFormValues() {
  const form = document.getElementById("application-form");
  const values = { ...formDraft };
  if (!form) return values;
  new FormData(form).forEach((value, key) => { values[key] = value; });
  ["creditAuthorization", "electronicConsent", "privacyAcknowledgment"].forEach((name) => {
    const control = form.elements.namedItem(name);
    if (control) values[name] = control.checked;
  });
  return values;
}

function reviewItem(label, value) {
  return `<div class="review-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function reviewFormStep() {
  const data = readFormValues();
  const housingLabel = { rent: "Rent", own: "Own", other: "Other" }[data.housing] ?? "—";
  const employmentLabel = employmentTypes.find(([key]) => key === data.employment)?.[1] ?? "—";
  return `<div class="form-section-head"><h2>Review application</h2><span class="required-note">Check details before submitting</span></div>
    <div class="review-block"><h3>Applicant</h3><div class="review-grid">
      ${reviewItem("Legal name", fullName(data))}${reviewItem("Date of birth", displayDate(data.dateOfBirth))}
      ${reviewItem("Email", data.email)}${reviewItem("Phone", data.phone)}
      ${reviewItem("Address", [data.address1, data.address2, data.city, data.state, data.zip].filter(Boolean).join(", "))}
    </div></div>
    <div class="review-block"><h3>Request & finances</h3><div class="review-loan"><div><span>Requested loan amount</span><br><strong>${money(data.loanAmount)}</strong></div><span>${escapeHtml(data.loanTerm)} month term</span></div>
      <div class="review-grid" style="margin-top:12px">
        ${reviewItem("Purpose", purposeLabel(data.loanPurpose))}${reviewItem("Housing status", housingLabel)}
        ${reviewItem("Monthly housing", money(data.monthlyHousing))}${reviewItem("Employment", employmentLabel)}
        ${reviewItem("Monthly gross income", money(data.monthlyIncome))}${reviewItem("Other monthly income", money(data.otherIncome))}
        ${reviewItem("Monthly debt payments", money(data.monthlyDebt))}${reviewItem("Employer", data.employer)}
      </div>
    </div>
    <div class="notice">By submitting, you confirm these details and authorizations are recorded for this demo. This is not a pre-qualification result, credit decision, or loan offer. Submission routes the case to processing.</div>
    <div class="form-footer"><span class="form-footer-note">All data remains in this browser tab's memory.</span><span class="button-group"><button class="button button-secondary" type="button" data-action="back">Back</button><button class="button button-primary" type="submit">Submit application <span aria-hidden="true">→</span></button></span></div>`;
}

function setFieldError(name, message) {
  const error = appRoot.querySelector(`[data-error-for="${name}"]`);
  if (error) error.textContent = message;
  const input = appRoot.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute("aria-invalid", "true");
}

function clearErrors() {
  appRoot.querySelectorAll(".field-error").forEach((item) => { item.textContent = ""; });
  appRoot.querySelectorAll("[aria-invalid='true']").forEach((item) => item.removeAttribute("aria-invalid"));
}

function validateApplicantStep() {
  clearErrors();
  const form = document.getElementById("application-form");
  const data = readFormValues();
  const errors = {};
  ["firstName", "lastName", "email", "phone", "address1", "city", "state", "zip"].forEach((name) => {
    if (!String(data[name] ?? "").trim()) errors[name] = `${fieldNames[name]} is required.`;
  });
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  const digits = String(data.phone ?? "").replace(/\D/g, "");
  if (data.phone && (digits.length < 10 || digits.length > 15)) errors.phone = "Enter a valid phone number with 10 to 15 digits.";
  if (data.zip && !/^\d{5}(?:-\d{4})?$/.test(data.zip.trim())) errors.zip = "Enter a 5-digit ZIP code or ZIP+4.";
  if (!data.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else {
    const date = new Date(`${data.dateOfBirth}T12:00:00`);
    const latestEligibleDate = new Date();
    latestEligibleDate.setHours(12, 0, 0, 0);
    latestEligibleDate.setFullYear(latestEligibleDate.getFullYear() - 18);
    if (Number.isNaN(date.getTime()) || date > latestEligibleDate) errors.dateOfBirth = "Applicant must be at least 18 years old.";
  }
  Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
  if (Object.keys(errors).length) {
    appRoot.querySelector("[aria-invalid='true']")?.focus();
    return false;
  }
  return Boolean(form);
}

function validateFinanceStep() {
  clearErrors();
  const data = readFormValues();
  const errors = {};
  if (!data.loanAmount || !Number.isInteger(Number(data.loanAmount)) || Number(data.loanAmount) < 500 || Number(data.loanAmount) > 100000) errors.loanAmount = "Enter a whole-dollar loan amount from $500 to $100,000.";
  ["loanPurpose", "loanTerm", "employment"].forEach((name) => {
    if (!data[name]) errors[name] = `${fieldNames[name]} is required.`;
  });
  if (!data.housing) errors.housing = "Select the applicant's housing status.";
  if (data.monthlyHousing === "" || !Number.isInteger(Number(data.monthlyHousing)) || Number(data.monthlyHousing) < 0 || Number(data.monthlyHousing) > 100000) errors.monthlyHousing = "Enter a whole-dollar monthly housing cost.";
  if (!data.monthlyIncome || !Number.isInteger(Number(data.monthlyIncome)) || Number(data.monthlyIncome) <= 0 || Number(data.monthlyIncome) > 10000000) errors.monthlyIncome = "Enter a whole-dollar monthly income greater than $0.";
  if (data.otherIncome && (!Number.isInteger(Number(data.otherIncome)) || Number(data.otherIncome) < 0 || Number(data.otherIncome) > 10000000)) errors.otherIncome = "Enter a whole-dollar other monthly income.";
  if (data.monthlyDebt === "" || !Number.isInteger(Number(data.monthlyDebt)) || Number(data.monthlyDebt) < 0 || Number(data.monthlyDebt) > 1000000) errors.monthlyDebt = "Enter a whole-dollar monthly debt payment amount.";
  ["creditAuthorization", "electronicConsent", "privacyAcknowledgment"].forEach((name) => {
    if (!data[name]) errors.consents = "All three applicant authorizations are required to submit.";
  });
  Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
  if (Object.keys(errors).length) {
    appRoot.querySelector("[aria-invalid='true']")?.focus();
    appRoot.querySelector(".field-error:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function formatPhoneInput(input) {
  const digits = input.value.replace(/\D/g, "");
  if (digits.length === 10) input.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function updateNavCount() {
  const count = document.getElementById("nav-count");
  if (count) count.textContent = String(applications.length);
}

function showForm() {
  currentView = "new";
  formStep = 1;
  formDraft = {};
  render();
}

function openApplication(id) {
  currentView = "detail";
  currentApplicationId = id;
  render();
}

function getCurrentApplication() {
  return applications.find((item) => item.id === currentApplicationId);
}

function workflowTimeline(record) {
  const steps = [
    ["Application & pre-qualification", record.createdAt],
    ["Processing complete", record.processedAt],
    ["Underwriting decision", record.reviewedAt],
    ["Closing complete", record.acceptedAt],
    ["Funding recorded", record.fundedAt]
  ];
  return `<div class="timeline">${steps.map(([label, date], index) => `<div class="timeline-item ${date ? "complete" : ""}"><span class="timeline-mark"></span><div class="timeline-copy"><strong>${label}</strong><small>${date ? displayDate(date) : index === 0 ? "Submitted" : "Pending"}</small></div></div>`).join("")}</div>`;
}

function detailPage(record) {
  if (!record) return `${pageHeading("APPLICATION", "Application not found", "It may have been cleared when this page was refreshed.")}<button class="button button-secondary" type="button" data-view="applications">Back to applications</button>`;
  const status = statusLabels[record.status];
  let workflowAction = "";
  if (record.status === "processing") {
    workflowAction = `<div class="review-action"><h3>Processing checklist</h3><p>Complete the lender's required application, identity, income, and documentation checks before routing to underwriting. This prototype does not perform those checks.</p>
      <label class="check-row" style="margin-top:10px"><input type="checkbox" id="processing-application"><span>Application information reviewed</span></label>
      <label class="check-row" style="margin-top:10px"><input type="checkbox" id="processing-identity"><span>Identity and supporting documents reviewed</span></label>
      <label class="check-row" style="margin-top:10px"><input type="checkbox" id="processing-income"><span>Income and obligations reviewed</span></label>
      <button class="button button-primary" type="button" data-action="complete-processing">Complete processing &amp; send to underwriting</button></div>`;
  } else if (record.status === "under-review") {
    workflowAction = `<div class="review-action"><h3>Record a review decision</h3><p>Choose an outcome in accordance with your lending policies. This demo does not determine eligibility.</p>
      <label class="sr-only" for="decision-reason">Decision notes or reason</label><textarea id="decision-reason" placeholder="Decision notes or adverse action reason"></textarea>
      <button class="button button-primary" type="button" data-action="approve">Approve</button>
      <button class="button button-secondary" type="button" data-action="conditional">Conditional approval</button>
      <button class="button button-danger" type="button" data-action="deny">Record decline</button></div>`;
  } else if (["approved", "conditional"].includes(record.status)) {
    workflowAction = `<div class="review-action"><h3>${record.status === "conditional" ? "Conditional offer" : "Approval recorded"}</h3><p>${record.status === "conditional" ? "Confirm the conditions have been satisfied before recording offer acceptance." : "Record acceptance of the offer and signed agreement."}</p>
      ${record.status === "conditional" ? `<textarea id="condition-note" placeholder="Conditions to satisfy" aria-label="Conditions to satisfy">${escapeHtml(record.conditions || "")}</textarea><button class="button button-secondary" type="button" data-action="save-conditions">Save conditions</button><label class="check-row" style="margin-top:10px"><input type="checkbox" id="conditions-met"><span>Conditions verified as satisfied</span></label>` : ""}
      <label class="check-row" style="margin-top:10px"><input type="checkbox" id="agreement-signed"><span>Signed agreement and applicable disclosures recorded</span></label>
      <button class="button button-primary" type="button" data-action="accept-offer">Record acceptance</button></div>`;
  } else if (record.status === "accepted") {
    workflowAction = `<div class="review-action"><h3>Ready to fund</h3><p>Record this step only after funding has been executed and verified through your lender's authorized process.</p><label class="check-row" style="margin-top:10px"><input type="checkbox" id="funding-confirmed"><span>Funding sent and verified outside this demo</span></label><button class="button button-primary" type="button" data-action="record-funding">Mark funded</button></div>`;
  } else if (record.status === "funded") {
    workflowAction = `<div class="review-action"><h3>Funding complete</h3><p>Funding was recorded for this application on ${displayDate(record.fundedAt)}.</p></div>`;
  } else {
    workflowAction = `<div class="review-action"><h3>Application declined</h3><p>This application has been marked declined. Follow applicable notice and record-retention requirements in your operating process.</p></div>`;
  }
  return `<div class="detail-header"><button class="back-button" type="button" data-view="applications" aria-label="Back to applications">←</button><div><div class="eyebrow">${escapeHtml(record.id)}</div><h1>${escapeHtml(fullName(record))}</h1><p class="page-subtitle">Created ${displayDate(record.createdAt)} · ${escapeHtml(record.email)}</p></div><div class="detail-actions"><span class="status-pill status-${escapeHtml(record.status)}">${escapeHtml(status)}</span></div></div>
    ${record.status === "denied" && record.decisionNote ? `<div class="notice warning">Review note: ${escapeHtml(record.decisionNote)}</div>` : ""}
    ${record.status === "conditional" && record.decisionNote ? `<div class="notice warning">Review note: ${escapeHtml(record.decisionNote)}</div>` : ""}
    <div class="detail-layout"><div class="detail-main">
      <section class="panel detail-section"><h2 class="detail-section-title">Applicant details <small>Personal information</small></h2><div class="detail-grid">
        ${detailField("Date of birth", displayDate(record.dateOfBirth))}${detailField("Phone", record.phone)}${detailField("Email", record.email)}
        ${detailField("Residential address", [record.address1, record.address2, record.city, record.state, record.zip].filter(Boolean).join(", "))}${detailField("Housing status", { rent: "Rent", own: "Own", other: "Other" }[record.housing] ?? record.housing)}${detailField("Monthly housing cost", money(record.monthlyHousing))}
      </div></section>
      <section class="panel detail-section"><h2 class="detail-section-title">Request & finances <small>Applicant reported</small></h2><div class="detail-grid">
        ${detailField("Requested amount", money(record.loanAmount))}${detailField("Purpose", purposeLabel(record.loanPurpose))}${detailField("Preferred term", `${record.loanTerm} months`)}
        ${detailField("Employment", employmentTypes.find(([key]) => key === record.employment)?.[1] ?? record.employment)}${detailField("Employer", record.employer || "Not provided")}${detailField("Occupation", record.occupation || "Not provided")}
        ${detailField("Monthly gross income", money(record.monthlyIncome))}${detailField("Other monthly income", money(record.otherIncome))}${detailField("Monthly debt payments", money(record.monthlyDebt))}
      </div></section>
      <section class="panel detail-section"><h2 class="detail-section-title">Applicant authorizations <small>Recorded at submission</small></h2><div class="detail-grid">
        ${detailField("Credit report authorization", record.creditAuthorization ? "Recorded" : "Not recorded")}${detailField("Electronic communications", record.electronicConsent ? "Recorded" : "Not recorded")}${detailField("Privacy notice acknowledgment", record.privacyAcknowledgment ? "Recorded" : "Not recorded")}
      </div></section>
    </div><aside class="side-stack">
      <section class="panel"><h3>Loan request</h3><div class="summary-amount">${money(record.loanAmount)}</div><div class="summary-caption">${escapeHtml(purposeLabel(record.loanPurpose))}</div><div class="summary-divider"></div><div class="summary-line"><span>Preferred term</span><strong>${escapeHtml(record.loanTerm)} months</strong></div><div class="summary-line"><span>Application status</span><strong>${escapeHtml(status)}</strong></div></section>
      <section class="panel"><h3>Case timeline</h3>${workflowTimeline(record)}</section>
      ${workflowAction}
    </aside></div>`;
}

function detailField(label, value) {
  return `<div class="detail-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function sectionPage(status, title, subtitle, empty) {
  const records = applications.filter((item) => status.includes(item.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return `${pageHeading("LOAN WORKSPACE", title, subtitle)}<section class="panel"><div class="panel-header"><div><h2 class="panel-title">${escapeHtml(title)} queue</h2><p class="panel-caption">${records.length} case${records.length === 1 ? "" : "s"}</p></div></div>${tableMarkup(records, empty)}<div class="filter-summary">Cases are held in this session only.</div></section>`;
}

function render() {
  const pageNames = {
    overview: "Overview",
    applications: "Application & pre-qualification",
    processing: "Processing",
    underwriting: "Underwriting",
    closing: "Closing",
    funding: "Funding",
    new: "New application",
    detail: "Application details"
  };
  document.getElementById("breadcrumb-current").textContent = pageNames[currentView] ?? "Overview";
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === (currentView === "detail" || currentView === "new" ? "applications" : currentView)));
  updateNavCount();
  if (currentView === "overview") appRoot.innerHTML = overviewPage();
  else if (currentView === "applications") appRoot.innerHTML = listPage();
  else if (currentView === "new") appRoot.innerHTML = applicationFormPage();
  else if (currentView === "processing") appRoot.innerHTML = sectionPage(["processing"], "Processing", "Review application completeness and supporting documents before underwriting.", "No applications are waiting in processing.");
  else if (currentView === "underwriting") appRoot.innerHTML = sectionPage(["under-review"], "Underwriting", "Review the processed application and record a manual underwriting outcome.", "No applications are waiting in underwriting.");
  else if (currentView === "closing") appRoot.innerHTML = sectionPage(["approved", "conditional"], "Closing", "Prepare disclosures and agreements, confirm conditions, and record applicant acceptance.", "No approved applications are waiting for closing.");
  else if (currentView === "funding") appRoot.innerHTML = sectionPage(["accepted", "funded"], "Funding", "Track accepted agreements through verified funding.", "No accepted applications are waiting for funding.");
  else if (currentView === "detail") appRoot.innerHTML = detailPage(getCurrentApplication());
}

function submitApplication() {
  const data = readFormValues();
  const record = {
    ...data,
    id: `PL-${new Date().getFullYear()}-${String(applications.length + 1).padStart(4, "0")}`,
    status: "processing",
    createdAt: todayIso(),
    processedAt: "",
    reviewedAt: "",
    acceptedAt: "",
    fundedAt: "",
    decisionNote: "",
    conditions: ""
  };
  applications.unshift(record);
  formDraft = {};
  currentView = "detail";
  currentApplicationId = record.id;
  render();
  showToast(`Application ${record.id} submitted to the processing queue.`);
}

function recordDecision(outcome) {
  const record = getCurrentApplication();
  if (!record) return;
  const note = document.getElementById("decision-reason")?.value.trim() ?? "";
  if (outcome === "denied" && !note) {
    showToast("Add the applicable decision reason or review note before recording a decline.", true);
    document.getElementById("decision-reason")?.focus();
    return;
  }
  if (outcome === "conditional" && !note) {
    showToast("List the conditions to be met before recording conditional approval.", true);
    document.getElementById("decision-reason")?.focus();
    return;
  }
  record.status = outcome;
  record.reviewedAt = todayIso();
  record.decisionNote = note;
  if (outcome === "conditional") record.conditions = note;
  render();
  showToast(`Review outcome recorded: ${statusLabels[outcome]}.`);
}

function recordAcceptance() {
  const record = getCurrentApplication();
  if (!record) return;
  if (!document.getElementById("agreement-signed")?.checked) {
    showToast("Confirm the signed agreement and applicable disclosures are recorded.", true);
    return;
  }
  if (record.status === "conditional" && !document.getElementById("conditions-met")?.checked) {
    showToast("Confirm the conditions have been verified before recording acceptance.", true);
    return;
  }
  record.acceptedAt = todayIso();
  record.status = "accepted";
  render();
  showToast("Offer acceptance recorded. Complete and verify funding through the authorized process.");
}

function recordFunding() {
  const record = getCurrentApplication();
  if (!record) return;
  if (!document.getElementById("funding-confirmed")?.checked) {
    showToast("Confirm funding was sent and verified outside this demo before marking the application funded.", true);
    return;
  }
  record.status = "funded";
  record.fundedAt = todayIso();
  render();
  showToast("Funding marked complete.");
}

function filterApplications() {
  const search = document.getElementById("application-search")?.value.trim().toLowerCase() ?? "";
  const status = document.getElementById("status-filter")?.value ?? "all";
  const filtered = applications.filter((record) => {
    const matchesSearch = !search || `${fullName(record)} ${record.id} ${record.email}`.toLowerCase().includes(search);
    return matchesSearch && (status === "all" || record.status === status);
  });
  const target = document.getElementById("applications-table");
  if (target) target.innerHTML = tableMarkup(filtered, "No applications match these filters.");
  const summary = document.getElementById("filter-summary");
  if (summary) summary.textContent = `Showing ${filtered.length} of ${applications.length} applications`;
}

document.addEventListener("click", (event) => {
  const viewLink = event.target.closest("a[data-view]");
  if (viewLink) {
    event.preventDefault();
    navigate(viewLink.dataset.view);
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) { navigate(button.dataset.view); return; }
  if (button.dataset.open) { openApplication(button.dataset.open); return; }
  const action = button.dataset.action;
  if (!action) return;
  if (action === "new") showForm();
  if (action === "next") {
    if ((formStep === 1 && validateApplicantStep()) || (formStep === 2 && validateFinanceStep())) {
      formDraft = readFormValues();
      formStep += 1;
      render();
      appRoot.querySelector("h2")?.setAttribute("tabindex", "-1");
      appRoot.querySelector("h2")?.focus();
    }
  }
  if (action === "back") {
    formDraft = readFormValues();
    formStep -= 1;
    render();
    restoreFormValues(formDraft);
  }
  if (action === "complete-processing") {
    const record = getCurrentApplication();
    const checks = ["processing-application", "processing-identity", "processing-income"];
    if (!checks.every((id) => document.getElementById(id)?.checked)) {
      showToast("Complete all processing checklist items before routing to underwriting.", true);
      return;
    }
    if (record) {
      record.status = "under-review";
      record.processedAt = todayIso();
      render();
      showToast("Processing complete. Application moved to underwriting.");
    }
  }
  if (action === "start-review") {
    const record = getCurrentApplication();
    if (record) { record.status = "under-review"; render(); showToast("Application moved to underwriting review."); }
  }
  if (action === "approve") recordDecision("approved");
  if (action === "conditional") recordDecision("conditional");
  if (action === "deny") recordDecision("denied");
  if (action === "save-conditions") {
    const record = getCurrentApplication();
    const note = document.getElementById("condition-note")?.value.trim() ?? "";
    if (!note) showToast("Enter the conditions to be met.", true);
    else if (record) { record.conditions = note; record.decisionNote = note; showToast("Conditions saved."); }
  }
  if (action === "accept-offer") recordAcceptance();
  if (action === "record-funding") recordFunding();
});

function restoreFormValues(values) {
  const form = document.getElementById("application-form");
  if (!form) return;
  Object.entries(values).forEach(([key, value]) => {
    const control = form.elements.namedItem(key);
    if (!control) return;
    if (control instanceof RadioNodeList) {
      [...control].forEach((item) => { item.checked = item.value === value; });
    } else if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = value;
  });
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "application-form") return;
  event.preventDefault();
  submitApplication();
});

document.addEventListener("input", (event) => {
  if (event.target.id === "application-search") filterApplications();
  if (event.target.name === "phone") formatPhoneInput(event.target);
  if (event.target.matches("[aria-invalid='true']")) event.target.removeAttribute("aria-invalid");
});

document.addEventListener("change", (event) => {
  if (event.target.id === "status-filter") filterApplications();
});

render();
