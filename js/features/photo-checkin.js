/* === HappiU Photo Check-in / Check-out Modal with Live Camera & Timestamp Watermark === */
(function (root) {
  let activeStream = null;
  let clockInterval = null;
  let facingMode = "environment";

  function stopCamera() {
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
    if (activeStream) {
      for (const track of activeStream.getTracks()) {
        try { track.stop(); } catch {}
      }
      activeStream = null;
    }
  }

  function formatThaiDateTime(date = new Date()) {
    const d = new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
    const t = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
    return { dateText: d, timeText: t + " น.", fullText: `${d} · ${t} น.` };
  }

  function drawWatermarkedPhoto(sourceEl, { mode, jobTitle, location, studentName }) {
    const sw = sourceEl.videoWidth || sourceEl.naturalWidth || sourceEl.width || 960;
    const sh = sourceEl.videoHeight || sourceEl.naturalHeight || sourceEl.height || 720;
    const maxDim = 1080;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const width = Math.max(320, Math.round(sw * scale));
    const height = Math.max(240, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(sourceEl, 0, 0, width, height);

    // Draw dark glass watermark bar at bottom
    const barH = Math.max(102, Math.round(height * 0.22));
    const pad = Math.round(width * 0.032);
    const y0 = height - barH;

    const grad = ctx.createLinearGradient(0, y0 - 24, 0, height);
    grad.addColorStop(0, "rgba(15, 23, 42, 0)");
    grad.addColorStop(0.25, "rgba(15, 23, 42, 0.72)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0 - 24, width, barH + 24);

    const isOut = mode === "check-out";
    const badgeColor = isOut ? "#ea580c" : "#059669";
    const badgeText = isOut ? "CHECK-OUT ออกงาน" : "CHECK-IN เข้างาน";
    const now = formatThaiDateTime(new Date());

    // Badge pill
    const badgeH = Math.max(28, Math.round(barH * 0.27));
    const badgeW = Math.max(150, Math.round(width * 0.28));
    const bx = pad;
    const by = y0 + Math.round(barH * 0.14);

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(13, Math.round(badgeH * 0.52))}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, bx + 14, by + badgeH / 2);

    // Large timestamp on the right or next to badge
    const timeFontSize = Math.max(20, Math.round(barH * 0.27));
    ctx.font = `800 ${timeFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(now.fullText, bx + badgeW + 14, by + badgeH / 2);

    // Job & Location line
    const subFontSize = Math.max(14, Math.round(barH * 0.17));
    ctx.font = `600 ${subFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#f1f5f9";
    const line1 = `${jobTitle || "งานพาร์ตไทม์"} · ${location || "มหาวิทยาลัยนเรศวร"}`;
    ctx.fillText(line1.slice(0, 68), pad, by + badgeH + Math.round(subFontSize * 1.35));

    // Student & HappiU verification line
    const smallFontSize = Math.max(12, Math.round(barH * 0.14));
    ctx.font = `500 ${smallFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(
      `HappiU Time Attendance · ${studentName || "นิสิต มน."} (บันทึกเวลาจริงโดยระบบ)`,
      pad,
      by + badgeH + Math.round(subFontSize * 1.35) + Math.round(smallFontSize * 1.45)
    );

    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function openPhotoCheckinModal(dialogEl, options) {
    stopCamera();
    const {
      mode = "check-in",
      jobTitle = "",
      location = "",
      studentName = "",
      onConfirm
    } = options;

    const isOut = mode === "check-out";
    const title = isOut ? "ถ่ายรูปเช็กเอาต์ (ออกงาน)" : "ถ่ายรูปเช็กอิน (เข้างาน)";
    const actionLabel = isOut ? "ยืนยันเช็กเอาต์และส่งรับรอง" : "ยืนยันเช็กอินเข้าทำงาน";
    let capturedDataUrl = "";

    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

    dialogEl.innerHTML = `
      <div class="photo-checkin-modal">
        <div class="photo-checkin-head">
          <div>
            <h2 id="dialog-title">${esc(title)}</h2>
            <p class="helper">${esc(jobTitle)}${location ? " · " + esc(location) : ""}</p>
          </div>
          <button type="button" class="quiet" data-photo-close aria-label="ปิดหน้าต่าง">✕</button>
        </div>

        <div class="photo-stage" data-photo-stage>
          <video autoplay playsinline muted data-photo-video></video>
          <img class="photo-preview-img" data-photo-preview hidden alt="ภาพที่ถ่ายพร้อมลายน้ำวันเวลา">
          <div class="photo-live-stamp" data-live-stamp>
            <span class="stamp-pill ${isOut ? "is-out" : "is-in"}">${isOut ? "CHECK-OUT" : "CHECK-IN"}</span>
            <strong data-live-clock>--:--:-- น.</strong>
          </div>
          <div class="photo-camera-fallback" data-camera-fallback hidden>
            <p>ไม่สามารถเปิดกล้องได้ในอุปกรณ์นี้ หรือยังไม่ได้อนุญาตสิทธิ์กล้อง</p>
            <p class="helper">สามารถเลือกถ่ายรูปหรืออัปโหลดรูปจากเครื่องได้ทันที (ระบบจะประทับเวลาให้อัตโนมัติ)</p>
          </div>
        </div>

        <div class="photo-controls" data-capture-controls>
          <button type="button" class="primary" data-take-shot><img class="icon-3d-btn" src="img/icons-3d/camera-checkin.png" alt="">ถ่ายภาพพร้อมเวลา</button>
          <button type="button" class="secondary" data-switch-camera>สลับกล้อง</button>
          <label class="secondary photo-upload-btn">
            เลือก/อัปโหลดรูป
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-photo-file hidden>
          </label>
        </div>

        <div class="photo-confirm-bar" data-confirm-controls hidden>
          <label class="field">หมายเหตุรอบนี้ (ไม่บังคับ)
            <input type="text" data-session-note maxlength="200" placeholder="${isOut ? "เช่น ส่งมอบงานเรียบร้อยแล้ว" : "เช่น ถึงหน้าร้านพร้อมเริ่มงาน"}">
          </label>
          <div class="actions">
            <button type="button" class="secondary" data-retake-shot>ถ่ายใหม่</button>
            <button type="button" class="primary" data-confirm-shot>${esc(actionLabel)}</button>
          </div>
        </div>

        <p class="helper" role="alert" data-photo-error></p>
      </div>
    `;

    const videoEl = dialogEl.querySelector("[data-photo-video]");
    const previewEl = dialogEl.querySelector("[data-photo-preview]");
    const fallbackEl = dialogEl.querySelector("[data-camera-fallback]");
    const liveStampEl = dialogEl.querySelector("[data-live-stamp]");
    const liveClockEl = dialogEl.querySelector("[data-live-clock]");
    const captureControls = dialogEl.querySelector("[data-capture-controls]");
    const confirmControls = dialogEl.querySelector("[data-confirm-controls]");
    const takeBtn = dialogEl.querySelector("[data-take-shot]");
    const switchBtn = dialogEl.querySelector("[data-switch-camera]");
    const fileInput = dialogEl.querySelector("[data-photo-file]");
    const retakeBtn = dialogEl.querySelector("[data-retake-shot]");
    const confirmBtn = dialogEl.querySelector("[data-confirm-shot]");
    const closeBtn = dialogEl.querySelector("[data-photo-close]");
    const noteInput = dialogEl.querySelector("[data-session-note]");
    const errorEl = dialogEl.querySelector("[data-photo-error]");

    function updateClock() {
      if (liveClockEl) liveClockEl.textContent = formatThaiDateTime(new Date()).fullText;
    }
    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        videoEl.hidden = true;
        fallbackEl.hidden = false;
        takeBtn.hidden = true;
        switchBtn.hidden = true;
        return;
      }
      try {
        if (activeStream) {
          for (const t of activeStream.getTracks()) t.stop();
        }
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        videoEl.srcObject = activeStream;
        videoEl.hidden = false;
        fallbackEl.hidden = true;
        takeBtn.hidden = false;
        switchBtn.hidden = false;
      } catch {
        videoEl.hidden = true;
        fallbackEl.hidden = false;
        takeBtn.hidden = true;
        switchBtn.hidden = true;
      }
    }

    function showCapturedPreview(dataUrl) {
      capturedDataUrl = dataUrl;
      previewEl.src = dataUrl;
      previewEl.hidden = false;
      videoEl.hidden = true;
      fallbackEl.hidden = true;
      liveStampEl.hidden = true;
      captureControls.hidden = true;
      confirmControls.hidden = false;
      errorEl.textContent = "";
    }

    takeBtn.addEventListener("click", () => {
      if (!videoEl.videoWidth) {
        errorEl.textContent = "กล้องยังไม่พร้อม ลองรอสักครู่หรือกดอัปโหลดรูป";
        return;
      }
      const dataUrl = drawWatermarkedPhoto(videoEl, { mode, jobTitle, location, studentName });
      showCapturedPreview(dataUrl);
    });

    switchBtn.addEventListener("click", () => {
      facingMode = facingMode === "environment" ? "user" : "environment";
      startCamera();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      errorEl.textContent = "";
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพนี้ได้"));
          img.src = objectUrl;
        });
        const dataUrl = drawWatermarkedPhoto(img, { mode, jobTitle, location, studentName });
        URL.revokeObjectURL(objectUrl);
        showCapturedPreview(dataUrl);
      } catch (err) {
        errorEl.textContent = err.message || "ประมวลผลรูปภาพไม่สำเร็จ";
      }
      fileInput.value = "";
    });

    retakeBtn.addEventListener("click", () => {
      capturedDataUrl = "";
      previewEl.hidden = true;
      liveStampEl.hidden = false;
      captureControls.hidden = false;
      confirmControls.hidden = true;
      if (activeStream) {
        videoEl.hidden = false;
      } else {
        fallbackEl.hidden = false;
      }
    });

    confirmBtn.addEventListener("click", async () => {
      if (!capturedDataUrl) {
        errorEl.textContent = "กรุณาถ่ายภาพหรือเลือกรูปก่อนยืนยัน";
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = "กำลังบันทึก...";
      errorEl.textContent = "";
      try {
        await onConfirm(capturedDataUrl, noteInput.value.trim());
        stopCamera();
        dialogEl.close();
      } catch (err) {
        errorEl.textContent = err.message || "บันทึกเวลาไม่สำเร็จ กรุณาลองใหม่";
        confirmBtn.disabled = false;
        confirmBtn.textContent = actionLabel;
      }
    });

    const handleClose = () => {
      stopCamera();
      dialogEl.removeEventListener("close", handleClose);
    };
    dialogEl.addEventListener("close", handleClose);
    closeBtn.addEventListener("click", () => {
      stopCamera();
      dialogEl.close();
    });

    dialogEl.showModal();
    startCamera();
  }

  root.HappiUPhotoCheckin = {
    openPhotoCheckinModal,
    stopCamera,
    formatThaiDateTime
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
