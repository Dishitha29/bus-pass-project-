const API = "/api";
const state = { token: localStorage.getItem("buspass_token"), user: null, applications: [], authMode: "login", view: "home", allApplications: [] };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function showMessage(element, text, type = "info") {
  element.textContent = text; element.className = `message ${type}`;
}
function hideMessage(element) { element.textContent = ""; element.className = "message hidden"; }
function toast(text) {
  const el = $("#toast"); el.textContent = text; el.classList.remove("hidden");
  window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.add("hidden"), 3200);
}
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && state.token) {
    logout(false);
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function navigate(view) {
  state.view = view;
  $$(".view").forEach(el => el.classList.add("hidden"));
  const target = $(`#${view}View`) || $("#notFoundView");
  target.classList.remove("hidden");
  $$(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  if (view === "dashboard") loadDashboard();
  if (view === "apply") prepareApplication();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "signup";
  $("#authTitle").textContent = signup ? "Create your account" : "Welcome back";
  $("#authEyebrow").textContent = signup ? "JOIN BUSPASS" : "YOUR ACCOUNT";
  $("#authSubtitle").textContent = signup ? "Register to apply for and track a bus pass." : "Log in to continue to your dashboard.";
  $("#signupNameWrap").classList.toggle("hidden", !signup);
  $("#authName").required = signup;
  $("#authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("#authSubmit").textContent = signup ? "Create account" : "Log in";
  $("#authSwitch").innerHTML = signup
    ? 'Already registered? <button type="button" class="text-button" id="switchAuth">Log in</button>'
    : 'New here? <button type="button" class="text-button" id="switchAuth">Create an account</button>';
  $("#switchAuth").addEventListener("click", () => setAuthMode(signup ? "login" : "signup"));
  hideMessage($("#authMessage"));
}
function openAuth(mode) { setAuthMode(mode); navigate("auth"); $("#authEmail").focus(); }
function updateAccountArea() {
  const area = $("#accountArea");
  if (!state.user) {
    area.innerHTML = '<button class="btn btn-outline" id="openLogin">Log in</button><button class="btn btn-primary" id="openSignup">Get started</button>';
    $("#openLogin").addEventListener("click", () => openAuth("login"));
    $("#openSignup").addEventListener("click", () => openAuth("signup"));
  } else {
    area.innerHTML = `<span class="account-name">Hi, ${escapeHTML(state.user.name.split(" ")[0])}</span><button class="btn btn-outline" id="logoutButton">Log out</button>`;
    $("#logoutButton").addEventListener("click", () => logout(true));
  }
}
function logout(showToast = true) {
  state.token = null; state.user = null; state.applications = []; state.allApplications = [];
  localStorage.removeItem("buspass_token"); updateAccountArea();
  if (showToast) toast("You have logged out.");
  if (state.view === "dashboard" || state.view === "apply") navigate("home");
}
async function refreshUser() {
  if (!state.token) { updateAccountArea(); return; }
  try {
    const data = await api("/auth/me"); state.user = data.user;
  } catch { state.token = null; state.user = null; localStorage.removeItem("buspass_token"); }
  updateAccountArea();
}
$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const message = $("#authMessage"); hideMessage(message);
  const mode = state.authMode;
  const body = { email: $("#authEmail").value.trim(), password: $("#authPassword").value };
  if (mode === "signup") body.name = $("#authName").value.trim();
  $("#authSubmit").disabled = true; $("#authSubmit").textContent = "Please wait…";
  try {
    const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
    state.token = data.token; state.user = data.user; localStorage.setItem("buspass_token", data.token);
    updateAccountArea(); toast(mode === "signup" ? "Account created successfully." : "Welcome back!");
    navigate("dashboard");
  } catch (error) { showMessage(message, error.message, "error"); }
  finally { $("#authSubmit").disabled = false; $("#authSubmit").textContent = mode === "signup" ? "Create account" : "Log in"; }
});
function prepareApplication() {
  if (!state.user) { openAuth("login"); showMessage($("#authMessage"), "Please log in before applying for a bus pass.", "info"); return; }
  $("#applicantName").value = state.user.name || "";
  $("#travelDate").min = new Date().toISOString().slice(0, 10);
}
$("#applicationForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const message = $("#applyMessage"); hideMessage(message);
  if (!state.user) { openAuth("login"); return; }
  const body = {
    applicant_name: $("#applicantName").value.trim(),
    phone: $("#applicantPhone").value.trim(),
    pass_type: $("#passType").value,
    route_start: $("#travelStart").value.trim(),
    route_end: $("#travelEnd").value.trim(),
    requested_start_date: $("#travelDate").value,
    address: $("#applicantAddress").value.trim()
  };
  if (body.route_start.toLowerCase() === body.route_end.toLowerCase()) {
    showMessage(message, "Starting point and destination must be different.", "error"); return;
  }
  const button = event.submitter; button.disabled = true; button.textContent = "Submitting…";
  try {
    const result = await api("/applications", { method: "POST", body: JSON.stringify(body) });
    showMessage(message, `Application #${result.application.id} submitted. Your status is Pending.`, "success");
    event.target.reset(); toast("Application submitted successfully."); setTimeout(() => navigate("dashboard"), 900);
  } catch (error) { showMessage(message, error.message, "error"); }
  finally { button.disabled = false; button.innerHTML = 'Submit application <span>→</span>'; }
});
async function loadDashboard() {
  const body = $("#applicationsBody");
  if (!state.user) {
    $("#dashboardTitle").textContent = "Your dashboard"; $("#dashboardSubtitle").textContent = "Log in to view and manage applications.";
    body.innerHTML = '<tr><td colspan="6" class="empty-cell">Please log in to see your applications. <button class="text-button" id="dashLogin">Log in now</button></td></tr>';
    $("#dashLogin").addEventListener("click", () => openAuth("login")); $("#adminSummary").classList.add("hidden"); return;
  }
  $("#dashboardTitle").textContent = `Hello, ${state.user.name.split(" ")[0]}`;
  $("#dashboardSubtitle").textContent = state.user.role === "admin" ? "Review applications and manage transport requests." : "Manage your bus pass applications.";
  $("#tableTitle").textContent = state.user.role === "admin" ? "All bus pass applications" : "My applications";
  $("#actionHeader").textContent = state.user.role === "admin" ? "Review" : "Details";
  $("#adminHint").textContent = state.user.role === "admin" ? "Admin access is assigned securely in the database. Only authorized administrators can change application status." : "If you need to correct an application, contact your transport office. Application editing is not included in this version.";
  try {
    const data = await api("/applications");
    state.allApplications = data.applications;
    renderApplications();
    if (state.user.role === "admin") renderAdminSummary(data.applications);
    else $("#adminSummary").classList.add("hidden");
    hideMessage($("#dashboardMessage"));
  } catch (error) { showMessage($("#dashboardMessage"), error.message, "error"); }
}
function renderAdminSummary(applications) {
  const summary = $("#adminSummary"); summary.classList.remove("hidden");
  const counts = { total: applications.length, pending: applications.filter(a => a.status === "Pending").length, approved: applications.filter(a => a.status === "Approved").length };
  summary.innerHTML = `<article class="stat-card"><span class="stat-icon blue">▤</span><div><b>${counts.total}</b><p>Total applications</p></div></article><article class="stat-card"><span class="stat-icon orange">◷</span><div><b>${counts.pending}</b><p>Pending review</p></div></article><article class="stat-card"><span class="stat-icon mint">✓</span><div><b>${counts.approved}</b><p>Approved</p></div></article>`;
}
function renderApplications() {
  const query = $("#searchApplications").value.trim().toLowerCase(), status = $("#statusFilter").value;
  const apps = state.allApplications.filter(a => (!status || a.status === status) && [a.applicant_name,a.route_start,a.route_end,a.pass_type,a.email].some(v => String(v || "").toLowerCase().includes(query)));
  const body = $("#applicationsBody");
  if (!apps.length) { body.innerHTML = '<tr><td colspan="6" class="empty-cell">No applications match your search.</td></tr>'; return; }
  body.innerHTML = apps.map(a => {
    const admin = state.user?.role === "admin";
    const actions = admin && a.status === "Pending"
      ? `<div class="action-group"><button class="small-btn approve" data-action="approve" data-id="${a.id}">Approve</button><button class="small-btn reject" data-action="reject" data-id="${a.id}">Reject</button></div>`
      : `<span class="muted">${admin ? "Reviewed" : `#${a.id}`}</span>`;
    return `<tr><td><span class="route-name">${escapeHTML(a.applicant_name)}</span><span class="route-sub">${escapeHTML(a.route_start)} → ${escapeHTML(a.route_end)}${admin ? ` · ${escapeHTML(a.email || "")}` : ""}</span></td><td>${escapeHTML(a.pass_type)}</td><td>${formatDate(a.requested_start_date)}</td><td>${formatDate(a.created_at)}</td><td><span class="status status-${a.status.toLowerCase()}">${escapeHTML(a.status)}</span></td><td>${actions}</td></tr>`;
  }).join("");
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
$("#searchApplications").addEventListener("input", renderApplications);
$("#statusFilter").addEventListener("change", renderApplications);
$("#applicationsBody").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const status = button.dataset.action === "approve" ? "Approved" : "Rejected";
  $("#confirmTitle").textContent = `${status} application?`;
  $("#confirmText").textContent = `Change application #${button.dataset.id} to ${status.toLowerCase()}? The applicant will see this status in their dashboard.`;
  const dialog = $("#confirmDialog"); dialog.showModal();
  const result = await new Promise(resolve => {
    const handler = (e) => { dialog.removeEventListener("close", handler); resolve(dialog.returnValue); };
    dialog.addEventListener("close", handler);
  });
  if (result !== "confirm") return;
  button.disabled = true;
  try {
    await api(`/applications/${button.dataset.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    toast(`Application ${status.toLowerCase()}.`); await loadDashboard();
  } catch (error) { showMessage($("#dashboardMessage"), error.message, "error"); button.disabled = false; }
});
$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$("#openLogin").addEventListener("click", () => openAuth("login"));
$("#openSignup").addEventListener("click", () => openAuth("signup"));
$("#year").textContent = new Date().getFullYear();
(async function init() { await refreshUser(); navigate("home"); })();
