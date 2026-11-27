/* === HappiU 2D Timetable (Day x Time) with Drag & Drop + AI Schedule Generator === */
(function (root) {
  const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  const SHORT_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
  const START_HOUR = 8;
  const END_HOUR = 21; // 08:00 - 21:00
  const ROW_HEIGHT = 48; // px per hour

  function toMin(hhmm) {
    if (!hhmm || !hhmm.includes(":")) return START_HOUR * 60;
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function toClock(mins) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  function render2DTimetable(student, workList, { mode = "all" } = {}) {
    const schedule = Array.isArray(student?.schedule) ? student.schedule : [];
    const courseCodes = [...new Set(schedule.map(l => l.code || l.course))];
    const hoursRange = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const totalHeight = hoursRange.length * ROW_HEIGHT;

    const timeAxisHtml = hoursRange
      .map(h => `<div class="tt2d-hour-label" style="height:${ROW_HEIGHT}px">${String(h).padStart(2, "0")}:00</div>`)
      .join("");

    const dayColumnsHtml = DAYS.map((day, dIdx) => {
      // Background drop cells per hour
      const cellsHtml = hoursRange
        .map(h => `<div class="tt2d-cell" data-tt-drop data-day="${esc(day)}" data-hour="${h}" style="height:${ROW_HEIGHT}px" title="วางวิชาลงวัน${esc(day)} เวลา ${String(h).padStart(2, "0")}:00"></div>`)
        .join("");

      const studyBlocks = mode === "job"
        ? []
        : schedule
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.day === day)
            .map(({ item, idx }) => {
              const fromM = Math.max(START_HOUR * 60, toMin(item.start));
              const toM = Math.min((END_HOUR + 1) * 60, Math.max(fromM + 30, toMin(item.end)));
              const top = ((fromM - START_HOUR * 60) / 60) * ROW_HEIGHT;
              const height = Math.max(32, ((toM - fromM) / 60) * ROW_HEIGHT - 4);
              const toneIdx = Math.max(0, courseCodes.indexOf(item.code || item.course)) % 6;
              return `
                <div class="tt2d-block is-study tone-${toneIdx}" draggable="true"
                     data-tt-drag-index="${idx}"
                     style="top:${top + 2}px;height:${height}px"
                     title="ลากเพื่อย้ายวันหรือเวลาเรียน">
                  <div class="tt2d-block-head">
                    <span class="tt2d-time">${esc(item.start)}–${esc(item.end)}</span>
                    <button type="button" class="tt2d-del" data-tt-delete-index="${idx}" aria-label="ลบวิชา ${esc(item.course)}" title="ลบวิชานี้">×</button>
                  </div>
                  <strong class="tt2d-title">${esc(item.course)}</strong>
                  ${item.room || item.code ? `<span class="tt2d-meta">${esc([item.code, item.room].filter(Boolean).join(" · "))}</span>` : ""}
                </div>
              `;
            });

      const jobBlocks = mode === "study"
        ? []
        : (workList || [])
            .filter(({ shift }) => shift && shift.day === day)
            .map(({ job, shift }) => {
              const fromM = Math.max(START_HOUR * 60, toMin(shift.start));
              const toM = Math.min((END_HOUR + 1) * 60, Math.max(fromM + 30, toMin(shift.end)));
              const top = ((fromM - START_HOUR * 60) / 60) * ROW_HEIGHT;
              const height = Math.max(34, ((toM - fromM) / 60) * ROW_HEIGHT - 4);
              return `
                <div class="tt2d-block is-job" style="top:${top + 2}px;height:${height}px">
                  <div class="tt2d-block-head">
                    <span class="tt2d-time">${esc(shift.start)}–${esc(shift.end)}</span>
                    <span class="tt2d-job-pill">งาน</span>
                  </div>
                  <strong class="tt2d-title">${esc(job.title)}</strong>
                  <span class="tt2d-meta">${esc(job.location || "")}</span>
                </div>
              `;
            });

      return `
        <div class="tt2d-day-col" data-day-col="${esc(day)}">
          <div class="tt2d-day-header"><strong>${esc(SHORT_DAYS[dIdx])}</strong><span>${esc(day)}</span></div>
          <div class="tt2d-day-body" style="height:${totalHeight}px">
            ${cellsHtml}
            ${studyBlocks.join("")}
            ${jobBlocks.join("")}
          </div>
        </div>
      `;
    }).join("");

    const aiToolsHtml = `
      <div class="tt2d-tools-grid">
        <section class="panel tt2d-ai-panel">
          <div class="tt2d-panel-head">
            <div>
              <h2 class="heading-with-3d"><img class="icon-3d-lg" src="/img/icons-3d/ai-sparkle.png" alt="">AI สร้างตารางเรียนอัตโนมัติ</h2>
              <p class="helper">วางข้อความตารางเรียน (1 วิชาต่อบรรทัด) หรืออัปโหลดภาพตารางเรียน เพื่อให้ AI จัดลงตาราง 2 มิติให้อัตโนมัติ</p>
            </div>
            <button type="button" class="secondary" data-tt-fill-sample>ใส่ตัวอย่างข้อความ</button>
          </div>
          <form data-form="ai-schedule">
            <label class="field">ข้อความตารางเรียน
              <textarea name="text" rows="3" maxlength="2000" placeholder="เช่น&#10;จันทร์ 09:00-11:00 แคลคูลัส 1 MTH101 ห้อง SC2101&#10;พุธ 13:00-15:00 การสื่อสารภาษาอังกฤษ ENG101 ห้อง HS3301"></textarea>
            </label>
            <div class="tt2d-ai-row">
              <label class="field">หรืออัปโหลดรูปตารางเรียน (ถ้ามี)
                <input type="file" name="scheduleImage" accept="image/jpeg,image/png,image/webp">
              </label>
              <label class="field">รูปแบบการเพิ่ม
                <select name="mode">
                  <option value="merge">เพิ่มต่อจากตารางเดิม</option>
                  <option value="replace">แทนที่ตารางเรียนเดิมทั้งหมด</option>
                </select>
              </label>
            </div>
            <div class="actions">
              <button type="submit" class="primary"><img class="icon-3d-btn" src="/img/icons-3d/ai-sparkle.png" alt="">ให้ AI สร้างตารางเรียน</button>
            </div>
            <p class="helper" role="alert" data-form-error></p>
          </form>
        </section>

        <section class="panel tt2d-manual-panel">
          <h2 class="heading-with-3d"><img class="icon-3d-lg" src="/img/icons-3d/add-class.png" alt="">เพิ่มวิชาเรียนด้วยตนเอง</h2>
          <p class="helper">เพิ่มทีละวิชาแล้วสามารถลากวาง (Drag &amp; Drop) ย้ายวัน/เวลาในตารางด้านล่างได้ทันที</p>
          <form data-form="add-schedule-class">
            <div class="field-grid">
              <label class="field">วัน
                <select name="day">${DAYS.map(d => `<option value="${esc(d)}">วัน${esc(d)}</option>`).join("")}</select>
              </label>
              <label class="field">ชื่อวิชา
                <input type="text" name="course" required maxlength="80" placeholder="เช่น การตลาดดิจิทัล">
              </label>
              <label class="field">เวลาเริ่ม
                <input type="time" name="start" value="09:00" required>
              </label>
              <label class="field">เวลาสิ้นสุด
                <input type="time" name="end" value="11:00" required>
              </label>
              <label class="field">รหัสวิชา
                <input type="text" name="code" maxlength="20" placeholder="เช่น MKT201">
              </label>
              <label class="field">ห้องเรียน
                <input type="text" name="room" maxlength="40" placeholder="เช่น QS 2204">
              </label>
            </div>
            <div class="actions">
              <button type="submit" class="secondary"><img class="icon-3d-btn" src="/img/icons-3d/add-class.png" alt="">เพิ่มลงตารางเรียน</button>
            </div>
            <p class="helper" role="alert" data-form-error></p>
          </form>
        </section>
      </div>
    `;

    return `
      ${aiToolsHtml}
      <div class="tt2d-hint-bar">
        <img class="icon-3d" src="/img/icons-3d/tip-bulb.png" alt="">
        <span><strong>เคล็ดลับ:</strong> ลากกล่องวิชาเรียนไปวางยังวันหรือชั่วโมงที่ต้องการเพื่อจัดตารางสอนใหม่ได้ทันที (ระบบบันทึกอัตโนมัติ)</span>
      </div>
      <div class="tt2d-scroll" data-tt2d-root>
        <div class="tt2d-grid">
          <div class="tt2d-time-col">
            <div class="tt2d-day-header"><strong>เวลา</strong><span>วัน</span></div>
            <div class="tt2d-time-body" style="height:${totalHeight}px">${timeAxisHtml}</div>
          </div>
          ${dayColumnsHtml}
        </div>
      </div>
    `;
  }

  function bind2DEvents(containerEl, getSchedule, onSaveSchedule) {
    if (!containerEl) return;
    let draggedIndex = null;

    containerEl.addEventListener("dragstart", event => {
      const block = event.target.closest("[data-tt-drag-index]");
      if (!block) return;
      draggedIndex = Number(block.dataset.ttDragIndex);
      block.classList.add("is-dragging");
      try { event.dataTransfer.setData("text/plain", String(draggedIndex)); } catch {}
      event.dataTransfer.effectAllowed = "move";
    });

    containerEl.addEventListener("dragend", event => {
      const block = event.target.closest("[data-tt-drag-index]");
      if (block) block.classList.remove("is-dragging");
      containerEl.querySelectorAll(".is-drop-over").forEach(el => el.classList.remove("is-drop-over"));
      draggedIndex = null;
    });

    containerEl.addEventListener("dragover", event => {
      const cell = event.target.closest("[data-tt-drop]");
      if (!cell || draggedIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      containerEl.querySelectorAll(".is-drop-over").forEach(el => {
        if (el !== cell) el.classList.remove("is-drop-over");
      });
      cell.classList.add("is-drop-over");
    });

    containerEl.addEventListener("dragleave", event => {
      const cell = event.target.closest("[data-tt-drop]");
      if (cell) cell.classList.remove("is-drop-over");
    });

    containerEl.addEventListener("drop", event => {
      const cell = event.target.closest("[data-tt-drop]");
      if (!cell) return;
      event.preventDefault();
      cell.classList.remove("is-drop-over");
      const idx = draggedIndex !== null ? draggedIndex : Number(event.dataTransfer.getData("text/plain"));
      const schedule = getSchedule();
      if (!Number.isInteger(idx) || !schedule[idx]) return;

      const targetDay = cell.dataset.day;
      const targetHour = Number(cell.dataset.hour);
      const item = schedule[idx];
      const duration = Math.max(30, toMin(item.end) - toMin(item.start));
      const newStartMin = Math.max(START_HOUR * 60, Math.min(21 * 60, targetHour * 60));
      const newEndMin = Math.min(22 * 60, newStartMin + duration);

      const next = schedule.map((entry, i) =>
        i === idx
          ? { ...entry, day: targetDay, start: toClock(newStartMin), end: toClock(newEndMin) }
          : entry
      );
      onSaveSchedule(next, `ย้ายวิชา ${item.course} ไปวัน${targetDay} ${toClock(newStartMin)}–${toClock(newEndMin)} น. แล้ว`);
    });

    containerEl.addEventListener("click", event => {
      const delBtn = event.target.closest("[data-tt-delete-index]");
      if (!delBtn) return;
      event.stopPropagation();
      const idx = Number(delBtn.dataset.ttDeleteIndex);
      const schedule = getSchedule();
      const removed = schedule[idx];
      if (!removed) return;
      const next = schedule.filter((_, i) => i !== idx);
      onSaveSchedule(next, `ลบวิชา ${removed.course} ออกจากตารางเรียนแล้ว`);
    });
  }

  root.HappiUTimetable2D = {
    render2DTimetable,
    bind2DEvents,
    DAYS
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
