/* === Embedded M4 Module === */
(function (global) {
  "use strict";

  const RATING_LABELS = [
    [5, "5 ดาว - ดีมาก"],
    [4, "4 ดาว - ดี"],
    [3, "3 ดาว - ปานกลาง"],
    [2, "2 ดาว - พอใช้"],
    [1, "1 ดาว - ควรปรับปรุง"]
  ];

  function defaultEscHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function getEsc(helpers) {
    return helpers && typeof helpers.html === "function" ? helpers.html : defaultEscHtml;
  }

  function defaultTime(shift) {
    if (!shift) return "-";
    return shift.day + " " + shift.start + "–" + shift.end + " น.";
  }

  function isShiftReviewable(app) {
    return Boolean(app && app.status === "accepted" && (app.work === "approved" || app.work === "paid"));
  }

  function canSubmitReview(app, actorRole) {
    if (!isShiftReviewable(app)) return false;
    if (actorRole === "student") return !app.studentReview;
    if (actorRole === "employer") return !app.employerReview;
    return false;
  }

  function submitReview(state, appId, actorRole, rating, comment, nowIso) {
    if (!state || !Array.isArray(state.applications)) {
      return { ok: false, error: "ข้อมูลระบบไม่พร้อมสำหรับการประเมิน" };
    }

    const app = state.applications.find(function (item) {
      return item && item.id === appId;
    });
    if (!app) {
      return { ok: false, error: "ไม่พบรายการกะงานที่ต้องการประเมิน" };
    }

    if (actorRole !== "student" && actorRole !== "employer") {
      return { ok: false, error: "บทบาทผู้ประเมินไม่ถูกต้อง" };
    }

    if (!isShiftReviewable(app)) {
      return { ok: false, error: "ประเมินได้เฉพาะกะงานที่รับรองชั่วโมงหรือจ่ายเงินแล้วเท่านั้น" };
    }

    if (!canSubmitReview(app, actorRole)) {
      return { ok: false, error: "คุณได้ประเมินกะงานนี้ไปแล้ว (ประเมินได้ 1 ครั้งต่อกะ)" };
    }

    if (
      rating === null ||
      rating === undefined ||
      typeof rating === "boolean" ||
      (typeof rating === "string" && rating.trim() === "")
    ) {
      return { ok: false, error: "กรุณาเลือกคะแนนความพึงพอใจ 1 ถึง 5 ดาว" };
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return { ok: false, error: "กรุณาเลือกคะแนนความพึงพอใจเป็นจำนวนเต็ม 1 ถึง 5 ดาว" };
    }

    const cleanComment = String(comment ?? "").trim().slice(0, 500);
    const timestamp = nowIso && String(nowIso).trim() ? String(nowIso).trim() : new Date().toISOString();

    const review = {
      rating: numericRating,
      comment: cleanComment,
      at: timestamp
    };

    if (actorRole === "student") {
      app.studentReview = review;
    } else {
      app.employerReview = review;
    }

    return { ok: true, review: review };
  }

  function renderStars(rating) {
    const raw = Number(rating);
    const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(5, raw)) : 0;
    const filled = Math.round(clamped);
    const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
    const displayNumeric = Number.isInteger(clamped)
      ? String(clamped)
      : clamped.toFixed(1).replace(/\.0$/, "");

    return (
      '<span class="m4-stars" aria-label="คะแนน ' +
      displayNumeric +
      ' จาก 5 ดาว">' +
      '<span class="m4-stars-glyph" aria-hidden="true">' +
      stars +
      "</span> " +
      '<span class="m4-stars-num">(' +
      displayNumeric +
      "/5)</span>" +
      "</span>"
    );
  }

  function renderReviewForm(app, actorRole, helpers) {
    if (!canSubmitReview(app, actorRole)) return "";
    const esc = getEsc(helpers);
    const isStudent = actorRole === "student";
    const heading = isStudent
      ? "ประเมินประสบการณ์การทำงาน (Work & Grow)"
      : "ประเมินผลการปฏิบัติงานของนิสิต (Work & Grow)";
    const submitLabel = isStudent ? "ส่งผลประเมินงาน" : "ส่งผลประเมินนิสิต";
    const commentPlaceholder = isStudent
      ? "เล่าประสบการณ์ บรรยากาศงาน หรือคำแนะนำเพิ่มเติม (ไม่บังคับ)"
      : "บันทึกจุดเด่น ความรับผิดชอบ หรือข้อเสนอแนะให้นิสิต (ไม่บังคับ)";

    const optionsHtml =
      '<option value="">-- เลือกคะแนน (1–5 ดาว) --</option>' +
      RATING_LABELS.map(function (entry) {
        return '<option value="' + entry[0] + '">' + esc(entry[1]) + "</option>";
      }).join("");

    return (
      '<form class="m4-review-form" data-form="shift-review">' +
      '<input type="hidden" name="appId" value="' +
      esc(app.id) +
      '">' +
      '<input type="hidden" name="actorRole" value="' +
      esc(actorRole) +
      '">' +
      '<div class="m4-review-form-head"><strong>' +
      esc(heading) +
      "</strong><small>ประเมินได้ 1 ครั้งต่อกะ</small></div>" +
      '<label class="field">คะแนนความพึงพอใจ (1–5 ดาว)' +
      '<select name="rating" required>' +
      optionsHtml +
      "</select></label>" +
      '<label class="field">ความเห็นเพิ่มเติม (ไม่บังคับ)' +
      '<textarea name="comment" maxlength="500" rows="2" placeholder="' +
      esc(commentPlaceholder) +
      '"></textarea></label>' +
      '<div class="actions"><button class="primary" type="submit">' +
      esc(submitLabel) +
      "</button></div>" +
      '<p class="helper" role="alert" data-form-error></p>' +
      "</form>"
    );
  }

  function renderSingleReviewBlock(title, review, missingHint, esc) {
    if (review && typeof review === "object") {
      const commentHtml = review.comment
        ? '<p class="m4-review-comment">' + esc(review.comment) + "</p>"
        : '<p class="m4-review-comment m4-review-empty-comment">ไม่มีความเห็นเพิ่มเติม</p>';
      return (
        '<div class="m4-review-item m4-review-done">' +
        '<div class="m4-review-item-head"><strong>' +
        esc(title) +
        "</strong>" +
        renderStars(review.rating) +
        "</div>" +
        commentHtml +
        "</div>"
      );
    }

    return (
      '<div class="m4-review-item m4-review-pending">' +
      '<div class="m4-review-item-head"><strong>' +
      esc(title) +
      '</strong><span class="m4-review-status-hint">' +
      esc(missingHint) +
      "</span></div>" +
      "</div>"
    );
  }

  function renderShiftReviewsSummary(app, actorRole, helpers) {
    if (!isShiftReviewable(app)) return "";
    const esc = getEsc(helpers);

    const studentMissingHint =
      actorRole === "student" ? "ยังไม่ได้ประเมิน" : "รอประเมินจากอีกฝ่าย";
    const employerMissingHint =
      actorRole === "employer" ? "ยังไม่ได้ประเมิน" : "รอประเมินจากอีกฝ่าย";

    return (
      '<div class="m4-reviews-summary">' +
      renderSingleReviewBlock("ผลประเมินจากนิสิต", app.studentReview, studentMissingHint, esc) +
      renderSingleReviewBlock("ผลประเมินจากผู้จ้าง", app.employerReview, employerMissingHint, esc) +
      "</div>"
    );
  }

  function computePortfolioStats(studentApps) {
    const reviewableApps = Array.isArray(studentApps)
      ? studentApps.filter(isShiftReviewable)
      : [];

    const employerRated = reviewableApps.filter(function (app) {
      return app.employerReview && Number.isFinite(Number(app.employerReview.rating));
    });

    const employerReviewCount = employerRated.length;
    const avgEmployerRating = employerReviewCount
      ? Math.round(
          (employerRated.reduce(function (sum, app) {
            return sum + Number(app.employerReview.rating);
          }, 0) /
            employerReviewCount) *
            10
        ) / 10
      : null;

    const totalReviewedShifts = reviewableApps.filter(function (app) {
      return Boolean(app.employerReview || app.studentReview);
    }).length;

    return {
      reviewableApps: reviewableApps,
      reviewableCount: reviewableApps.length,
      employerReviewCount: employerReviewCount,
      avgEmployerRating: avgEmployerRating,
      totalReviewedShifts: totalReviewedShifts
    };
  }

  function renderPortfolioReviews(studentApps, state, helpers) {
    const esc = getEsc(helpers);
    const stats = computePortfolioStats(studentApps);

    if (!stats.reviewableCount) {
      return (
        '<div class="m4-portfolio-empty">' +
        '<p class="helper">ประวัติ Work &amp; Grow จะปรากฏเมื่อผู้จ้างรับรองชั่วโมงทำงานแล้ว</p>' +
        "</div>"
      );
    }

    const jobs = state && Array.isArray(state.jobs) ? state.jobs : [];
    const employers = state && state.employers ? state.employers : {};

    const resolveJob = function (jobId) {
      if (helpers && typeof helpers.jobBy === "function") return helpers.jobBy(jobId);
      return jobs.find(function (j) {
        return j && j.id === jobId;
      });
    };

    const resolveShift = function (job, shiftId) {
      if (!job) return null;
      if (helpers && typeof helpers.shiftBy === "function") return helpers.shiftBy(job, shiftId);
      return Array.isArray(job.shifts)
        ? job.shifts.find(function (s) {
            return s && s.id === shiftId;
          })
        : null;
    };

    const formatShiftTime = function (shift, fallbackId) {
      if (!shift) return fallbackId || "-";
      if (helpers && typeof helpers.time === "function") return helpers.time(shift);
      return defaultTime(shift);
    };

    const aggregateBadgeHtml =
      stats.avgEmployerRating !== null
        ? '<div class="m4-portfolio-summary">' +
          '<div class="m4-portfolio-badge">' +
          '<span class="m4-portfolio-badge-label">คะแนนเฉลี่ยจากผู้จ้าง</span>' +
          renderStars(stats.avgEmployerRating) +
          '<small class="m4-portfolio-count">จาก ' +
          stats.employerReviewCount +
          " รีวิว · ประเมินแล้ว " +
          stats.totalReviewedShifts +
          "/" +
          stats.reviewableCount +
          " กะ</small>" +
          "</div></div>"
        : '<div class="m4-portfolio-summary">' +
          '<div class="m4-portfolio-badge m4-portfolio-badge-empty">' +
          '<span class="m4-portfolio-badge-label">คะแนนเฉลี่ยจากผู้จ้าง</span>' +
          '<span class="m4-review-status-hint">ยังไม่มีผลประเมิน</span>' +
          '<small class="m4-portfolio-count">กะที่รับรองแล้ว ' +
          stats.reviewableCount +
          " กะ · ประเมินแล้ว " +
          stats.totalReviewedShifts +
          " กะ</small>" +
          "</div></div>";

    const cardsHtml = stats.reviewableApps
      .map(function (app) {
        const job = resolveJob(app.job);
        const shift = resolveShift(job, app.shift);
        const jobTitle = job && job.title ? job.title : app.job || "งานพาร์ตไทม์";
        const employerObj = job && employers[job.employer];
        const employerName =
          employerObj && employerObj.name
            ? employerObj.name
            : (job && job.employer) || "ผู้จ้าง";
        const shiftTime = formatShiftTime(shift, app.shift);
        const workTag = app.work === "paid" ? "จ่ายแล้ว" : "รับรองชั่วโมงแล้ว";

        return (
          '<article class="m4-portfolio-card">' +
          '<div class="m4-portfolio-card-head">' +
          "<div><h4>" +
          esc(jobTitle) +
          '</h4><p class="m4-portfolio-meta">' +
          esc(employerName) +
          " · " +
          esc(shiftTime) +
          "</p></div>" +
          '<span class="tag good"><span>' +
          esc(workTag) +
          "</span></span>" +
          "</div>" +
          '<div class="m4-portfolio-reviews">' +
          renderSingleReviewBlock(
            "ผลประเมินจากผู้จ้าง",
            app.employerReview,
            "รอประเมินจากอีกฝ่าย",
            esc
          ) +
          renderSingleReviewBlock(
            "ผลประเมินจากนิสิต",
            app.studentReview,
            "ยังไม่ได้ประเมิน",
            esc
          ) +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    return (
      '<section class="m4-portfolio-section" aria-label="สรุปผลประเมิน Work & Grow">' +
      aggregateBadgeHtml +
      '<div class="m4-portfolio-list">' +
      cardsHtml +
      "</div>" +
      "</section>"
    );
  }

  const M4_CSS = [
    ".m4-stars{display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#9a4a00;background:#fff6e5;border:1px solid #f3d19e;border-radius:999px;padding:2px 10px;font-size:.86rem;line-height:1.4}",
    ".m4-stars-glyph{letter-spacing:1px;color:#b45309}",
    ".m4-stars-num{color:var(--text,#191c21);font-weight:700}",
    ".m4-review-form{margin-top:12px;padding:12px 14px;border:1px solid var(--card-border,#ebecf0);border-radius:12px;background:var(--soft,#fff0e4)}",
    ".m4-review-form-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}",
    ".m4-review-form-head strong{font-size:.95rem;color:var(--primary-deep,#842700)}",
    ".m4-review-form-head small{color:var(--muted,#4a4d52);font-size:.82rem}",
    ".m4-review-form .field{margin-bottom:8px}",
    ".m4-review-form .actions{margin-top:8px}",
    ".m4-reviews-summary{margin-top:10px;display:grid;gap:8px}",
    ".m4-review-item{padding:10px 12px;border-radius:10px;border:1px solid var(--line,#e2e2eb);background:var(--surface,#fff)}",
    ".m4-review-item.m4-review-pending{background:var(--page,#f8f7fc);border-style:dashed}",
    ".m4-review-item-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}",
    ".m4-review-item-head strong{font-size:.9rem;color:var(--text,#191c21)}",
    ".m4-review-status-hint{font-size:.84rem;color:var(--muted,#4a4d52)}",
    ".m4-review-comment{margin-top:6px;font-size:.9rem;color:var(--text,#191c21);overflow-wrap:anywhere}",
    ".m4-review-empty-comment{color:var(--muted,#4a4d52);font-style:italic}",
    ".m4-portfolio-section{display:grid;gap:12px}",
    ".m4-portfolio-summary{padding:12px 14px;border-radius:12px;border:1px solid var(--card-border,#ebecf0);background:var(--soft,#fff0e4)}",
    ".m4-portfolio-badge{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}",
    ".m4-portfolio-badge-label{font-weight:700;color:var(--primary-deep,#842700)}",
    ".m4-portfolio-count{color:var(--muted,#4a4d52);font-size:.84rem}",
    ".m4-portfolio-list{display:grid;gap:10px}",
    ".m4-portfolio-card{padding:12px 14px;border-radius:12px;border:1px solid var(--card-border,#ebecf0);background:var(--surface,#fff);box-shadow:var(--shadow,0 2px 10px #23113309)}",
    ".m4-portfolio-card-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}",
    ".m4-portfolio-card-head h4{margin:0;font-size:1rem}",
    ".m4-portfolio-meta{font-size:.88rem;color:var(--muted,#4a4d52)}",
    ".m4-portfolio-reviews{display:grid;gap:8px}"
  ].join("\n");

  const api = {
    RATING_LABELS: RATING_LABELS,
    isShiftReviewable: isShiftReviewable,
    canSubmitReview: canSubmitReview,
    submitReview: submitReview,
    renderStars: renderStars,
    renderReviewForm: renderReviewForm,
    renderShiftReviewsSummary: renderShiftReviewsSummary,
    computePortfolioStats: computePortfolioStats,
    renderPortfolioReviews: renderPortfolioReviews,
    M4_CSS: M4_CSS
  };

  global.HappiUM4 = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
