/* === Embedded M3 Module === */
(function (root) {
  const EXTENDED_APP_STATES = Object.freeze({
    pending: Object.freeze({ label: "รอผล", tone: "wait" }),
    offered: Object.freeze({ label: "ได้รับข้อเสนอ", tone: "info" }),
    declined: Object.freeze({ label: "ไม่ผ่าน", tone: "bad" }),
    withdrawn: Object.freeze({ label: "ถอนใบสมัครแล้ว", tone: "bad" }),
    offer_declined: Object.freeze({ label: "ปฏิเสธข้อเสนอแล้ว", tone: "bad" }),
    resigned: Object.freeze({ label: "ลาออกแล้ว", tone: "bad" }),
    accepted: Object.freeze({ label: "รับเข้าทำงานแล้ว", tone: "good" })
  });

  function isApplicationClosed(status) {
    return status === "declined" || status === "withdrawn" || status === "offer_declined" || status === "resigned";
  }

  function hasActiveApplication(state, studentId, jobId) {
    if (!state || !Array.isArray(state.applications) || !studentId || !jobId) {
      return null;
    }
    return (
      state.applications.find(function (app) {
        return app && app.student === studentId && app.job === jobId && !isApplicationClosed(app.status);
      }) || null
    );
  }

  function availableShiftSlots(job, shift, state, excludeAppId) {
    if (!job || !shift) return 0;
    const capacity = Number(shift.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) return 0;
    const apps = state && Array.isArray(state.applications) ? state.applications : [];
    let reserved = 0;
    for (let i = 0; i < apps.length; i += 1) {
      const app = apps[i];
      if (
        app &&
        app.job === job.id &&
        app.shift === shift.id &&
        (app.status === "accepted" || app.status === "offered") &&
        (excludeAppId === undefined || excludeAppId === null || app.id !== excludeAppId)
      ) {
        reserved += 1;
      }
    }
    return Math.max(0, capacity - reserved);
  }

  function canAcceptOffer(job, shift, state, app) {
    if (!app || app.status !== "offered") {
      return { ok: false, error: "ข้อเสนอนี้ไม่อยู่ในสถานะรอการยืนยัน" };
    }
    if (!job) {
      return { ok: false, error: "ไม่พบประกาศงาน" };
    }
    if (job.status !== undefined && job.status !== "live") {
      return { ok: false, error: "ประกาศนี้ปิดรับแล้ว" };
    }
    if (!shift) {
      return { ok: false, error: "ไม่พบกะงานที่เสนอ" };
    }
    if (availableShiftSlots(job, shift, state, app.id) <= 0) {
      return { ok: false, error: "กะเต็ม" };
    }
    return { ok: true };
  }

  function withdrawApplication(state, appId, studentId) {
    if (!state || !Array.isArray(state.applications)) {
      return { ok: false, error: "ไม่พบข้อมูลใบสมัคร" };
    }
    const app = state.applications.find(function (item) {
      return item && item.id === appId;
    });
    if (!app) {
      return { ok: false, error: "ไม่พบใบสมัคร" };
    }
    if (arguments.length >= 3) {
      if (!studentId || app.student !== studentId) {
        return { ok: false, error: "ไม่มีสิทธิ์ถอนใบสมัครนี้" };
      }
    } else if (state.studentId && app.student !== state.studentId) {
      return { ok: false, error: "ไม่มีสิทธิ์ถอนใบสมัครนี้" };
    }
    if (app.status !== "pending") {
      return { ok: false, error: "ถอนใบสมัครได้เฉพาะสถานะรอผลเท่านั้น" };
    }
    app.status = "withdrawn";
    delete app.shift;
    app.closedAt = new Date().toISOString();
    return { ok: true, application: app };
  }

  function declineOffer(state, appId, studentId) {
    if (!state || !Array.isArray(state.applications)) {
      return { ok: false, error: "ไม่พบข้อมูลใบสมัคร" };
    }
    const app = state.applications.find(function (item) {
      return item && item.id === appId;
    });
    if (!app) {
      return { ok: false, error: "ไม่พบใบสมัคร" };
    }
    if (arguments.length >= 3) {
      if (!studentId || app.student !== studentId) {
        return { ok: false, error: "ไม่มีสิทธิ์ปฏิเสธข้อเสนอนี้" };
      }
    } else if (state.studentId && app.student !== state.studentId) {
      return { ok: false, error: "ไม่มีสิทธิ์ปฏิเสธข้อเสนอนี้" };
    }
    if (app.status !== "offered") {
      return { ok: false, error: "ปฏิเสธข้อเสนอได้เฉพาะเมื่อได้รับข้อเสนอกะเท่านั้น" };
    }
    app.status = "offer_declined";
    delete app.shift;
    app.closedAt = new Date().toISOString();
    return { ok: true, application: app };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function formatShiftTime(shift) {
    if (!shift) return "";
    return String(shift.day || "") + " " + String(shift.start || "") + "–" + String(shift.end || "") + " น.";
  }

  function resolveHelpers(helpers) {
    const h = helpers || {};
    const htmlFn = typeof h.html === "function" ? h.html : escapeHtml;
    const timeFn = typeof h.time === "function" ? h.time : formatShiftTime;
    const iconFn =
      typeof h.icon === "function"
        ? h.icon
        : function (name) {
            if (name === "check") {
              return '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg></span>';
            }
            return '<span class="icon" aria-hidden="true"></span>';
          };
    const buttonFn =
      typeof h.button === "function"
        ? h.button
        : function (label, action, kind, id, disabled) {
            const cls = kind || "primary";
            const idVal = id === undefined || id === null ? "" : id;
            return (
              '<button type="button" class="' +
              htmlFn(cls) +
              '" data-action="' +
              htmlFn(action) +
              '" data-id="' +
              htmlFn(idVal) +
              '"' +
              (disabled ? " disabled" : "") +
              ">" +
              htmlFn(label) +
              "</button>"
            );
          };
    return { html: htmlFn, time: timeFn, icon: iconFn, button: buttonFn };
  }

  function renderConfirmDialogHtml(actionType, app, job, shift, helpers) {
    if (!app) return "";
    const h = resolveHelpers(helpers);
    const jobTitle = job && job.title ? job.title : "ประกาศงาน";
    if (actionType === "withdraw-app") {
      return (
        '<h2 id="dialog-title">ยืนยันการถอนใบสมัคร</h2>' +
        "<p>ต้องการถอนใบสมัครงาน <strong>" +
        h.html(jobTitle) +
        "</strong> ใช่หรือไม่? หากประกาศยังเปิดรับ คุณสามารถสมัครใหม่ภายหลังได้</p>" +
        '<div class="actions">' +
        h.button("ยกเลิก", "close-dialog", "secondary", "") +
        h.button("ยืนยันถอนใบสมัคร", "confirm-withdraw", "danger", app.id) +
        "</div>"
      );
    }
    if (actionType === "decline-offer") {
      const shiftText = shift ? h.time(shift) : "กะที่ผู้จ้างเสนอ";
      return (
        '<h2 id="dialog-title">ยืนยันการปฏิเสธข้อเสนอกะ</h2>' +
        "<p>ต้องการปฏิเสธข้อเสนอสำหรับงาน <strong>" +
        h.html(jobTitle) +
        "</strong> (" +
        h.html(shiftText) +
        ") ใช่หรือไม่? ระบบจะคืนที่ว่างกะให้ผู้สมัครคนอื่น และคุณสามารถสมัครใหม่ได้หากประกาศยังเปิดรับ</p>" +
        '<div class="actions">' +
        h.button("ยกเลิก", "close-dialog", "secondary", "") +
        h.button("ยืนยันปฏิเสธข้อเสนอ", "confirm-decline-offer", "danger", app.id) +
        "</div>"
      );
    }
    return "";
  }

  function resolveShiftForTimeline(app, helpers) {
    if (!app) return null;
    const h = helpers || {};
    if (h.shift) return h.shift;
    if (!app.shift) return null;
    const job = h.job || (typeof h.jobBy === "function" ? h.jobBy(app.job) : null);
    if (!job) return null;
    if (typeof h.shiftBy === "function") return h.shiftBy(job, app.shift);
    if (Array.isArray(job.shifts)) {
      return job.shifts.find(function (s) {
        return s && s.id === app.shift;
      }) || null;
    }
    return null;
  }

  function renderExtendedTimeline(app, helpers) {
    const h = resolveHelpers(helpers);
    const status = app && app.status ? app.status : "pending";
    const shift = resolveShiftForTimeline(app, helpers);
    const shiftText = shift ? h.time(shift) : "";
    let steps;

    if (status === "resigned") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["คุยกับผู้จ้าง", "", "done"],
        ["รับเข้าทำงาน", shiftText, "done"],
        ["แจ้งลาออกแล้ว", app.resignReason ? "เหตุผล: " + app.resignReason : "สิ้นสุดการทำงาน (ยังดูประวัติรายได้ได้)", "closed"]
      ];
    } else if (status === "withdrawn") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["ถอนใบสมัครแล้ว", "นิสิตถอนใบสมัครก่อนรับข้อเสนอ", "closed"],
        ["ผู้จ้างเสนอเวลาทำงาน", "ยกเลิกการพิจารณา", "next"],
        ["รับเข้าทำงาน", "สมัครใหม่ได้หากประกาศยังเปิดรับ", "next"]
      ];
    } else if (status === "offer_declined") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["คุยกับผู้จ้าง", "", "done"],
        ["ผู้จ้างเสนอเวลาทำงาน", "ผู้จ้างเคยส่งข้อเสนอเวลาทำงานแล้ว", "done"],
        ["ปฏิเสธข้อเสนอแล้ว", "คืนสิทธิ์ที่ว่างแล้ว สมัครใหม่ได้หากประกาศยังเปิดรับ", "closed"]
      ];
    } else if (status === "declined") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["คุยกับผู้จ้าง", "ปิดการพิจารณาแล้ว", "done"],
        ["ไม่ผ่านการคัดเลือก", "ผู้จ้างแจ้งผลแล้ว", "closed"],
        ["รับเข้าทำงาน", "", "next"]
      ];
    } else if (status === "offered") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["คุยกับผู้จ้าง", "", "done"],
        ["ผู้จ้างเสนอเวลาทำงาน", shiftText, "current"],
        ["รับเข้าทำงาน", "", "next"]
      ];
    } else if (status === "accepted") {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        ["คุยกับผู้จ้าง", "", "done"],
        ["ผู้จ้างเสนอเวลาทำงาน", shiftText, "done"],
        ["รับเข้าทำงานแล้ว", "ดูเวลาทำงานและลงเวลาเข้า-ออกได้ในหน้าตารางและรายได้", "current"]
      ];
    } else {
      steps = [
        ["ส่งใบสมัครแล้ว", "ผู้จ้างได้รับข้อมูลที่คุณเลือกส่ง", "done"],
        app.hiringStage === "interview" ? ["นัดสัมภาษณ์",app.interview?.mode === "scheduled" ? "ดูรายละเอียดนัดด้านบน หรือติดต่อผู้จ้างในแชท" : "เปิดแชทเพื่อตกลงนัดกับผู้จ้าง","current"] :
          ["คุยกับผู้จ้าง", "เปิดแชทเพื่อตกลงรายละเอียดและเวลาทำงาน", "current"],
        ["ผู้จ้างเสนอเวลาทำงาน", "", "next"],
        ["รับเข้าทำงาน", "", "next"]
      ];
    }

    const stepIconSrcs = [
      "img/icons-3d/step-apply.png",
      "img/icons-3d/step-chat.png",
      "img/icons-3d/step-calendar.png",
      "img/icons-3d/step-verified.png"
    ];
    const horizontalHtml =
      '<div class="app-stepper-horizontal" aria-label="สถานะใบสมัครแบบย่อ">' +
      steps.map(function (step, index) {
        const stepState = step[2];
        const shortLabel = step[0];
        const iconSrc = stepState === "done" ? "img/icons-3d/step-verified.png" : (stepIconSrcs[index] || stepIconSrcs[0]);
        const glyph = stepState === "closed"
          ? "✕"
          : '<img class="icon-3d-step" src="' + iconSrc + '" alt="">';
        return (
          '<div class="hstep is-' + h.html(stepState) + '">' +
            '<span class="hstep-dot" aria-hidden="true">' + glyph + '</span>' +
            '<span class="hstep-label">' + h.html(shortLabel) + '</span>' +
          '</div>'
        );
      }).join('<span class="hstep-line" aria-hidden="true"></span>') +
      '</div>';

    const verticalHtml =
      '<ol class="application-timeline" aria-label="ความคืบหน้าใบสมัครแบบละเอียด">' +
      steps
        .map(function (step, index) {
          const title = step[0];
          const note = step[1];
          const stepState = step[2];
          const isCurrent = stepState === "current" || stepState === "closed";
          const marker = stepState === "done" ? h.icon("check") : String(index + 1);
          return (
            '<li class="' +
            h.html(stepState) +
            '"' +
            (isCurrent ? ' aria-current="step"' : "") +
            '><span class="timeline-marker" aria-hidden="true">' +
            marker +
            "</span><div><strong>" +
            h.html(title) +
            "</strong>" +
            (note ? "<p>" + h.html(note) + "</p>" : "") +
            "</div></li>"
          );
        })
        .join("") +
      "</ol>";

    return (
      '<div class="app-timeline-wrap" data-timeline-wrap>' +
        horizontalHtml +
        '<details class="app-timeline-details">' +
          '<summary class="app-timeline-toggle">ดูรายละเอียดสถานะทั้งหมด</summary>' +
          verticalHtml +
        '</details>' +
      '</div>'
    );
  }

  function renderStudentAppExtraActions(app, helpers) {
    if (!app) return "";
    const h = resolveHelpers(helpers);
    if (app.status === "pending") {
      return h.button("ถอนใบสมัคร", "withdraw-app", "secondary", app.id);
    }
    if (app.status === "offered") {
      return h.button("ปฏิเสธข้อเสนอ", "decline-offer", "secondary", app.id);
    }
    if (app.status === "accepted") {
      return h.button("ลาออก", "resign-job", "danger", app.id);
    }
    return "";
  }

  function renderApplicationActions(app, job, helpers) {
    if (!app) return "";
    const h = resolveHelpers(helpers);
    const extra = renderStudentAppExtraActions(app, helpers);
    const jobId = job && job.id ? job.id : app.job;
    const isLive = !job || job.status === undefined || job.status === "live";

    if (app.status === "pending") {
      return (
        h.button("คุยกับผู้จ้าง", "chat", "primary", app.id) +
        h.button("ดูประกาศ", "detail", "secondary", jobId) +
        extra
      );
    }
    if (app.status === "offered") {
      return (
        h.button("ดูข้อเสนอ", "offer", "primary", app.id) +
        h.button("เปิดแชท", "chat", "secondary", app.id) +
        extra
      );
    }
    if (app.status === "accepted") {
      return (
        h.button("เปิดแชท", "chat", "secondary", app.id) +
        h.button("ดูประกาศ", "detail", "secondary", jobId)
      );
    }
    if (isApplicationClosed(app.status)) {
      return (
        (isLive ? h.button("สมัครใหม่", "apply-job", "primary", jobId) : "") +
        h.button("ดูประกาศ", "detail", "secondary", jobId) +
        h.button("เปิดแชท", "chat", "secondary", app.id)
      );
    }
    return h.button("ดูประกาศ", "detail", "secondary", jobId);
  }

  const HappiUM3 = {
    EXTENDED_APP_STATES: EXTENDED_APP_STATES,
    isApplicationClosed: isApplicationClosed,
    hasActiveApplication: hasActiveApplication,
    availableShiftSlots: availableShiftSlots,
    canAcceptOffer: canAcceptOffer,
    withdrawApplication: withdrawApplication,
    declineOffer: declineOffer,
    renderConfirmDialogHtml: renderConfirmDialogHtml,
    renderExtendedTimeline: renderExtendedTimeline,
    renderStudentAppExtraActions: renderStudentAppExtraActions,
    renderApplicationActions: renderApplicationActions
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = HappiUM3;
  }
  if (root) {
    root.HappiUM3 = HappiUM3;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
