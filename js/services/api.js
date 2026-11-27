/* === HappiU Frontend REST API Client === */
(function (root) {
  const TOKEN_KEY = "happiu-auth-token";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  async function request(path, { method = "GET", body, isFormData = false } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

    const resp = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = new Error(data.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      err.status = resp.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const HappiUApi = {
    getToken,
    setToken,
    request,

    // Bootstrap & Auth
    bootstrap: () => request("/api/state"),
    login: (identifier, password) =>
      request("/api/auth/login", { method: "POST", body: { identifier, password } }),
    register: (payload) =>
      request("/api/auth/register", { method: "POST", body: payload }),
    me: () => request("/api/auth/me"),

    // Student profile & schedule
    updateStudentProfile: (payload) =>
      request("/api/student/profile", { method: "PATCH", body: payload }),
    saveStudentSchedule: (schedule) =>
      request("/api/student/schedule", { method: "PUT", body: { schedule } }),
    aiParseSchedule: (payload) =>
      request("/api/schedule/ai-parse", { method: "POST", body: payload }),

    // Uploads
    uploadProfilePhoto: (photoDataUrl) =>
      request("/api/uploads/profile", { method: "POST", body: { photoDataUrl } }),
    uploadBannerPhoto: (photoDataUrl) =>
      request("/api/uploads/banner", { method: "POST", body: { photoDataUrl } }),
    uploadChatPhoto: (photoDataUrl) =>
      request("/api/uploads/chat", { method: "POST", body: { photoDataUrl } }),

    // Work Sessions (Multi-round Photo Check-in / Check-out)
    checkIn: (applicationId, photoDataUrl, note = "") =>
      request("/api/work-sessions/check-in", {
        method: "POST",
        body: { applicationId, photoDataUrl, note }
      }),
    checkOut: (sessionId, photoDataUrl, note = "") =>
      request(`/api/work-sessions/${encodeURIComponent(sessionId)}/check-out`, {
        method: "POST",
        body: { photoDataUrl, note }
      }),
    approveSession: (sessionId) =>
      request(`/api/work-sessions/${encodeURIComponent(sessionId)}/approve`, { method: "PATCH" }),
    paySession: (sessionId, proof) =>
      request(`/api/work-sessions/${encodeURIComponent(sessionId)}/pay`, {
        method: "PATCH",
        body: { proof }
      }),

    // Applications & Chat
    applyJob: (payload) =>
      request("/api/applications", { method: "POST", body: payload }),
    updateHiring: (appId, payload) =>
      request(`/api/applications/${encodeURIComponent(appId)}/hiring`, { method: "PATCH", body: payload }),
    sendOffer: (appId, shiftId) =>
      request(`/api/applications/${encodeURIComponent(appId)}/offer`, { method: "PATCH", body: { shiftId } }),
    declineApplicant: (appId) =>
      request(`/api/applications/${encodeURIComponent(appId)}/decline`, { method: "PATCH" }),
    acceptOffer: (appId) =>
      request(`/api/applications/${encodeURIComponent(appId)}/accept`, { method: "PATCH" }),
    withdrawApp: (appId) =>
      request(`/api/applications/${encodeURIComponent(appId)}/withdraw`, { method: "PATCH" }),
    declineOffer: (appId) =>
      request(`/api/applications/${encodeURIComponent(appId)}/decline-offer`, { method: "PATCH" }),
    resignJob: (appId, reason = "") =>
      request(`/api/applications/${encodeURIComponent(appId)}/resign`, { method: "POST", body: { reason } }),
    sendMessage: (appId, payload) =>
      request(`/api/applications/${encodeURIComponent(appId)}/messages`, { method: "POST", body: payload }),
    submitReview: (appId, rating, comment) =>
      request(`/api/applications/${encodeURIComponent(appId)}/review`, { method: "POST", body: { rating, comment } }),

    // Tutors
    saveTutor: (payload) =>
      request("/api/tutors", { method: "POST", body: payload }),
    deleteTutor: (tutorId) =>
      request(`/api/tutors/${encodeURIComponent(tutorId)}`, { method: "DELETE" }),
    requestTutor: (tutorId, payload) =>
      request(`/api/tutors/${encodeURIComponent(tutorId)}/requests`, { method: "POST", body: payload }),
    reviewTutor: (tutorId, payload) =>
      request(`/api/tutors/${encodeURIComponent(tutorId)}/reviews`, { method: "POST", body: payload }),

    // Jobs, Employer & Admin
    saveJob: (payload) =>
      request("/api/jobs", { method: "POST", body: payload }),
    submitJob: (jobId) =>
      request(`/api/jobs/${encodeURIComponent(jobId)}/submit`, { method: "PATCH" }),
    adminJobDecision: (jobId, action, reason = "") =>
      request(`/api/admin/jobs/${encodeURIComponent(jobId)}`, { method: "PATCH", body: { action, reason } }),
    updateEmployerProfile: (payload) =>
      request("/api/employer/profile", { method: "PATCH", body: payload }),
    adminEmployerDecision: (empId, action, reason = "") =>
      request(`/api/admin/employers/${encodeURIComponent(empId)}`, { method: "PATCH", body: { action, reason } }),

    // Reports
    createReport: (payload) =>
      request("/api/reports", { method: "POST", body: payload }),
    replyReport: (reportId, reply) =>
      request(`/api/reports/${encodeURIComponent(reportId)}/reply`, { method: "PATCH", body: { reply } }),
    adminReportDecision: (reportId, action, reason = "") =>
      request(`/api/admin/reports/${encodeURIComponent(reportId)}`, { method: "PATCH", body: { action, reason } }),

    // Demo Reset
    resetDemo: () => request("/api/demo/reset", { method: "POST" })
  };

  root.HappiUApi = HappiUApi;
})(typeof globalThis !== "undefined" ? globalThis : this);
