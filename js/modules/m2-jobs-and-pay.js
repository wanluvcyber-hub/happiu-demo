/* === Embedded M2 Module === */
(function (root) {
  const PAY_TYPES = {
    hourly: { label: "รายชั่วโมง", unit: "บาท / ชม." },
    fixed: { label: "งานเหมาต่อครั้ง", unit: "บาท / งาน" }
  };

  const SHIFT_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

  const SEED_FIXED_JOB = {
    id: "clip-edit",
    employer: "library",
    title: "ตัดต่อคลิปโปรโมตกิจกรรมคณะ",
    kind: "online",
    category: "ออนไลน์",
    location: "ทำงานออนไลน์",
    payType: "fixed",
    rate: 450,
    distance: 0,
    status: "live",
    description: "ตัดต่อคลิปสั้นโปรโมตกิจกรรมคณะความยาว 1–2 นาที พร้อมใส่คำบรรยาย",
    skills: "ตัดต่อวิดีโอ, จัดการข้อมูล",
    deadline: "30 พ.ย. 2569",
    doc: false,
    shifts: [
      { id: "CL-01", day: "ศุกร์", start: "16:00", end: "19:00", capacity: 2 },
      { id: "CL-02", day: "เสาร์", start: "13:00", end: "16:00", capacity: 1 }
    ]
  };

  function defaultHtml(value) {
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

  function defaultCurrency(value) {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return safe.toLocaleString("th-TH", { maximumFractionDigits: 2 }) + " บาท";
  }

  function getEscaper(helpers) {
    return helpers && typeof helpers.html === "function" ? helpers.html : defaultHtml;
  }

  function getCurrencyFormatter(helpers) {
    return helpers && typeof helpers.currency === "function" ? helpers.currency : defaultCurrency;
  }

  function normalizePayType(job) {
    return job && job.payType === "fixed" ? "fixed" : "hourly";
  }

  function payUnit(job) {
    return normalizePayType(job) === "fixed" ? PAY_TYPES.fixed.unit : PAY_TYPES.hourly.unit;
  }

  function formatJobPay(job, helpers) {
    const fmtCurrency = getCurrencyFormatter(helpers);
    const rate = Number(job && job.rate);
    const amountStr = fmtCurrency(Number.isFinite(rate) && rate >= 0 ? rate : 0);
    if (normalizePayType(job) === "fixed") {
      return amountStr + " / งาน (เหมา)";
    }
    return amountStr + " / ชม.";
  }

  function computeCheckoutAmount(job, shiftHours) {
    const rate = Number(job && job.rate);
    if (!Number.isFinite(rate) || rate < 0) return 0;
    if (normalizePayType(job) === "fixed") {
      return Math.round(rate * 100) / 100;
    }
    const hrs = Number(shiftHours);
    if (!Number.isFinite(hrs) || hrs <= 0) return 0;
    return Math.round(hrs * rate * 100) / 100;
  }

  function formatEarningsFormula(job, shiftHours, amount, helpers) {
    const fmtCurrency = getCurrencyFormatter(helpers);
    const type = normalizePayType(job);
    const hasExplicitAmount = amount !== undefined && amount !== null && amount !== "" && Number.isFinite(Number(amount));
    const total = hasExplicitAmount ? Number(amount) : computeCheckoutAmount(job, shiftHours);
    if (type === "fixed") {
      return "งานเหมา " + fmtCurrency(total) + " / งาน";
    }
    const hrs = Number(shiftHours);
    const hrsStr = (Number.isFinite(hrs) && hrs >= 0 ? hrs : 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
    const rate = Number(job && job.rate);
    const rateStr = fmtCurrency(Number.isFinite(rate) && rate >= 0 ? rate : 0);
    return hrsStr + " ชม. × " + rateStr + " / ชม. = " + fmtCurrency(total);
  }

  function renderPayTypeField(job, helpers) {
    const esc = getEscaper(helpers);
    const payType = normalizePayType(job);
    const rawRate = job && job.rate !== undefined && job.rate !== null && job.rate !== "" ? String(job.rate) : "";
    const note = payType === "fixed"
      ? "คิดเป็นยอดเหมาต่อครั้ง (บาท / งาน) ไม่คูณตามจำนวนชั่วโมง"
      : "คิดตามชั่วโมงทำงานจริง (บาท / ชม.)";

    return '<div class="pay-type-group" data-pay-type-group>' +
      '<fieldset class="pay-type-selector">' +
      '<legend>รูปแบบค่าตอบแทน</legend>' +
      '<div class="pay-type-options">' +
      '<label class="pay-type-option">' +
      '<input type="radio" name="payType" value="hourly"' + (payType === "hourly" ? " checked" : "") + '>' +
      '<span><strong>' + esc(PAY_TYPES.hourly.label) + '</strong><small>' + esc(PAY_TYPES.hourly.unit) + '</small></span>' +
      '</label>' +
      '<label class="pay-type-option">' +
      '<input type="radio" name="payType" value="fixed"' + (payType === "fixed" ? " checked" : "") + '>' +
      '<span><strong>' + esc(PAY_TYPES.fixed.label) + '</strong><small>' + esc(PAY_TYPES.fixed.unit) + '</small></span>' +
      '</label>' +
      '</div>' +
      '</fieldset>' +
      '<label class="field">ค่าตอบแทน (บาท)' +
      '<input type="number" name="rate" value="' + esc(rawRate) + '" required min="1" max="99999" step="0.01">' +
      '<small data-pay-rate-note>' + esc(note) + '</small>' +
      '</label>' +
      '</div>';
  }

  function renderShiftEditorRow(shift, index, totalCount, helpers) {
    const esc = getEscaper(helpers);
    const s = shift || {};
    const idx = Number.isInteger(index) && index >= 0 ? index : 0;
    const total = Number.isInteger(totalCount) && totalCount >= 1 ? totalCount : 1;
    const shiftId = s.id ? String(s.id) : (s.shiftId ? String(s.shiftId) : "");
    const day = SHIFT_DAYS.includes(s.day) ? s.day : SHIFT_DAYS[0];
    const start = typeof s.start === "string" && s.start ? s.start : "17:00";
    const end = typeof s.end === "string" && s.end ? s.end : "20:00";
    const capacity = s.capacity !== undefined && s.capacity !== null && s.capacity !== "" ? String(s.capacity) : "2";
    const disabledAttr = total <= 1 ? ' disabled aria-disabled="true"' : "";

    const dayOptions = SHIFT_DAYS.map(function (d) {
      return '<option value="' + esc(d) + '"' + (d === day ? " selected" : "") + '>' + esc(d) + '</option>';
    }).join("");

    return '<div class="shift-editor-row" data-shift-row data-shift-index="' + idx + '">' +
      '<input type="hidden" name="shiftId" value="' + esc(shiftId) + '">' +
      '<div class="shift-editor-header">' +
      '<strong>กะที่ ' + (idx + 1) + '</strong>' +
      '<button type="button" class="danger shift-remove-btn" data-action="remove-shift-row" data-shift-index="' + idx + '"' + disabledAttr + '>ลบกะ</button>' +
      '</div>' +
      '<div class="shift-editor-fields">' +
      '<label class="field">วันทำงาน<select name="day">' + dayOptions + '</select></label>' +
      '<label class="field">เวลาเริ่ม<input type="time" name="start" value="' + esc(start) + '" required></label>' +
      '<label class="field">เวลาเลิก<input type="time" name="end" value="' + esc(end) + '" required></label>' +
      '<label class="field">จำนวนที่รับ<input type="number" name="capacity" value="' + esc(capacity) + '" required min="1" max="50"></label>' +
      '</div>' +
      '</div>';
  }

  function renderMultiShiftRows(shifts, helpers) {
    const list = Array.isArray(shifts) && shifts.length
      ? shifts
      : [{ day: "จันทร์", start: "17:00", end: "20:00", capacity: 2 }];
    return list.map(function (shift, index) {
      return renderShiftEditorRow(shift, index, list.length, helpers);
    }).join("");
  }

  function renderMultiShiftSection(shifts, helpers) {
    return '<fieldset class="multi-shift-section" data-shift-section>' +
      '<legend>กะงานที่เปิดรับ (อย่างน้อย 1 กะ)</legend>' +
      '<div class="shift-editor-list" data-shift-list>' +
      renderMultiShiftRows(shifts, helpers) +
      '</div>' +
      '<div class="shift-editor-actions">' +
      '<button type="button" class="secondary" data-action="add-shift-row">+ เพิ่มกะงาน</button>' +
      '</div>' +
      '<p class="helper" data-shift-error role="alert"></p>' +
      '</fieldset>';
  }

  function parseTimeString(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!match) return null;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    return {
      minutes: hh * 60 + mm,
      formatted: String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0")
    };
  }

  function extractRows(rawRowsOrForm) {
    if (!rawRowsOrForm) return [];
    if (Array.isArray(rawRowsOrForm)) return rawRowsOrForm;

    if (typeof rawRowsOrForm.querySelectorAll === "function") {
      const rowEls = Array.from(rawRowsOrForm.querySelectorAll("[data-shift-row]"));
      if (rowEls.length > 0) {
        return rowEls.map(function (rowEl) {
          const idEl = rowEl.querySelector('[name="shiftId"], [name="id"]');
          const dayEl = rowEl.querySelector('[name="day"], [name="shiftDay"]');
          const startEl = rowEl.querySelector('[name="start"], [name="shiftStart"]');
          const endEl = rowEl.querySelector('[name="end"], [name="shiftEnd"]');
          const capEl = rowEl.querySelector('[name="capacity"], [name="shiftCapacity"]');
          return {
            id: idEl ? idEl.value : "",
            day: dayEl ? dayEl.value : "",
            start: startEl ? startEl.value : "",
            end: endEl ? endEl.value : "",
            capacity: capEl ? capEl.value : ""
          };
        });
      }
      if (typeof FormData !== "undefined" && rawRowsOrForm.tagName === "FORM") {
        rawRowsOrForm = new FormData(rawRowsOrForm);
      }
    }

    if (typeof rawRowsOrForm.getAll === "function") {
      const ids = rawRowsOrForm.getAll("shiftId");
      const days = rawRowsOrForm.getAll("day").length ? rawRowsOrForm.getAll("day") : rawRowsOrForm.getAll("shiftDay");
      const starts = rawRowsOrForm.getAll("start").length ? rawRowsOrForm.getAll("start") : rawRowsOrForm.getAll("shiftStart");
      const ends = rawRowsOrForm.getAll("end").length ? rawRowsOrForm.getAll("end") : rawRowsOrForm.getAll("shiftEnd");
      const caps = rawRowsOrForm.getAll("capacity").length ? rawRowsOrForm.getAll("capacity") : rawRowsOrForm.getAll("shiftCapacity");
      const count = Math.max(days.length, starts.length, ends.length, caps.length);
      const rows = [];
      for (let i = 0; i < count; i += 1) {
        rows.push({
          id: ids[i] || "",
          day: days[i] ?? "",
          start: starts[i] ?? "",
          end: ends[i] ?? "",
          capacity: caps[i] ?? ""
        });
      }
      return rows;
    }

    if (typeof rawRowsOrForm === "object") {
      if (Array.isArray(rawRowsOrForm.shifts)) return rawRowsOrForm.shifts;
      if (Array.isArray(rawRowsOrForm.day)) {
        const count = Math.max(
          rawRowsOrForm.day.length,
          Array.isArray(rawRowsOrForm.start) ? rawRowsOrForm.start.length : 0,
          Array.isArray(rawRowsOrForm.end) ? rawRowsOrForm.end.length : 0,
          Array.isArray(rawRowsOrForm.capacity) ? rawRowsOrForm.capacity.length : 0
        );
        const rows = [];
        for (let i = 0; i < count; i += 1) {
          rows.push({
            id: Array.isArray(rawRowsOrForm.shiftId) ? rawRowsOrForm.shiftId[i] : "",
            day: rawRowsOrForm.day[i],
            start: Array.isArray(rawRowsOrForm.start) ? rawRowsOrForm.start[i] : "",
            end: Array.isArray(rawRowsOrForm.end) ? rawRowsOrForm.end[i] : "",
            capacity: Array.isArray(rawRowsOrForm.capacity) ? rawRowsOrForm.capacity[i] : ""
          });
        }
        return rows;
      }
      if ("day" in rawRowsOrForm || "start" in rawRowsOrForm || "end" in rawRowsOrForm || "capacity" in rawRowsOrForm) {
        return [rawRowsOrForm];
      }
    }

    return [];
  }

  function makePrefix(jobId) {
    const cleaned = String(jobId || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
    return cleaned || "SHIFT";
  }

  function parseAndValidateShifts(rawRowsOrForm, jobId, existingShifts) {
    const rows = extractRows(rawRowsOrForm);
    if (!rows.length) {
      return { ok: false, shifts: [], error: "ต้องระบุอย่างน้อย 1 กะงาน" };
    }

    const existingList = Array.isArray(existingShifts) ? existingShifts : [];
    const existingIds = new Set(
      existingList
        .map(function (s) { return s && s.id ? String(s.id).trim() : ""; })
        .filter(Boolean)
    );
    const usedIds = new Set();
    const prefix = makePrefix(jobId);
    let seq = 1;

    function nextUniqueId() {
      while (true) {
        const candidate = prefix + "-" + String(seq).padStart(2, "0");
        seq += 1;
        if (!usedIds.has(candidate) && !existingIds.has(candidate)) {
          return candidate;
        }
      }
    }

    const validShifts = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      const rowLabel = "กะที่ " + (i + 1) + ": ";
      const day = typeof row.day === "string" ? row.day.trim() : "";
      if (!SHIFT_DAYS.includes(day)) {
        return { ok: false, shifts: [], error: rowLabel + "เลือกวันทำงานให้ถูกต้อง" };
      }

      const startParsed = parseTimeString(typeof row.start === "string" ? row.start : "");
      const endParsed = parseTimeString(typeof row.end === "string" ? row.end : "");
      if (!startParsed || !endParsed) {
        return { ok: false, shifts: [], error: rowLabel + "กรอกเวลาเริ่มและเวลาเลิกให้ถูกต้อง" };
      }
      if (endParsed.minutes <= startParsed.minutes) {
        return { ok: false, shifts: [], error: rowLabel + "เวลาเลิกงานต้องอยู่หลังเวลาเริ่ม" };
      }

      const capRaw = String(row.capacity ?? "").trim();
      const cap = capRaw === "" ? NaN : Number(capRaw);
      if (!Number.isInteger(cap) || cap < 1) {
        return { ok: false, shifts: [], error: rowLabel + "จำนวนที่รับต้องเป็นจำนวนเต็มอย่างน้อย 1 คน" };
      }

      const providedId = String(row.id || row.shiftId || "").trim();
      let finalId = "";
      if (providedId && !usedIds.has(providedId)) {
        finalId = providedId;
      } else {
        finalId = nextUniqueId();
      }
      usedIds.add(finalId);

      validShifts.push({
        id: finalId,
        day: day,
        start: startParsed.formatted,
        end: endParsed.formatted,
        capacity: cap
      });
    }

    return { ok: true, shifts: validShifts, error: "" };
  }

  const M2_CSS = [
    ".pay-type-group{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:12px;align-items:start;margin-bottom:6px}",
    ".pay-type-selector{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0;background:var(--surface)}",
    ".pay-type-selector legend{font-size:.9rem;font-weight:700;padding:0 6px;color:var(--text)}",
    ".pay-type-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
    ".pay-type-option{display:flex;align-items:flex-start;gap:8px;min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}",
    ".pay-type-option:has(input:checked){border-color:var(--primary);background:var(--soft);color:var(--primary)}",
    ".pay-type-option input{width:18px;height:18px;min-height:0;margin-top:2px;accent-color:var(--primary);flex:none}",
    ".pay-type-option span{display:grid;gap:2px;font-size:.9rem}",
    ".pay-type-option small{color:var(--muted);font-size:.78rem;font-weight:400}",
    ".multi-shift-section{border:1px solid var(--line);border-radius:12px;padding:14px;margin:14px 0;background:var(--surface)}",
    ".multi-shift-section legend{font-size:.95rem;font-weight:700;padding:0 6px;color:var(--text)}",
    ".shift-editor-list{display:grid;gap:10px}",
    ".shift-editor-row{border:1px solid var(--line);border-radius:10px;padding:12px;background:#faf9fd}",
    ".shift-editor-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}",
    ".shift-remove-btn{min-height:44px;padding:6px 12px;font-size:.86rem}",
    ".shift-editor-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}",
    ".shift-editor-fields .field{margin-bottom:0}",
    ".shift-editor-actions{display:flex;align-items:center;gap:10px;margin-top:12px}",
    "@media(max-width:900px){.shift-editor-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}",
    "@media(max-width:640px){.pay-type-group,.pay-type-options,.shift-editor-fields{grid-template-columns:1fr}}"
  ].join("\n");

  const api = {
    PAY_TYPES: PAY_TYPES,
    SHIFT_DAYS: SHIFT_DAYS,
    SEED_FIXED_JOB: SEED_FIXED_JOB,
    normalizePayType: normalizePayType,
    payUnit: payUnit,
    formatJobPay: formatJobPay,
    computeCheckoutAmount: computeCheckoutAmount,
    formatEarningsFormula: formatEarningsFormula,
    renderPayTypeField: renderPayTypeField,
    renderShiftEditorRow: renderShiftEditorRow,
    renderMultiShiftRows: renderMultiShiftRows,
    renderMultiShiftSection: renderMultiShiftSection,
    parseAndValidateShifts: parseAndValidateShifts,
    M2_CSS: M2_CSS
  };

  root.HappiUM2 = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
