/* === Naresuan University (มน.) Faculties & Majors + Searchable Cascading Dropdown === */
(function (root) {
  const NU_FACULTIES = [
    {
      faculty: "คณะวิทยาศาสตร์",
      majors: [
        "วิทยาการคอมพิวเตอร์",
        "เทคโนโลยีสารสนเทศ",
        "วิทยาการข้อมูลและการวิเคราะห์",
        "คณิตศาสตร์",
        "สถิติ",
        "เคมี",
        "ฟิสิกส์",
        "ฟิสิกส์ประยุกต์",
        "ชีววิทยา",
        "เทคโนโลยีชีวภาพ"
      ]
    },
    {
      faculty: "คณะวิศวกรรมศาสตร์",
      majors: [
        "วิศวกรรมคอมพิวเตอร์",
        "วิศวกรรมไฟฟ้า",
        "วิศวกรรมเครื่องกล",
        "วิศวกรรมโยธา",
        "วิศวกรรมอุตสาหการ",
        "วิศวกรรมเคมี",
        "วิศวกรรมสิ่งแวดล้อม",
        "วิศวกรรมวัสดุ"
      ]
    },
    {
      faculty: "คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร",
      majors: [
        "การตลาด",
        "การเงิน",
        "การจัดการธุรกิจ",
        "การจัดการทรัพยากรมนุษย์",
        "การบัญชี",
        "เศรษฐศาสตร์",
        "นิเทศศาสตร์",
        "การสื่อสาร",
        "การท่องเที่ยว",
        "การเป็นผู้ประกอบการ"
      ]
    },
    {
      faculty: "คณะมนุษยศาสตร์",
      majors: [
        "ภาษาอังกฤษ",
        "ภาษาไทย",
        "ภาษาจีน",
        "ภาษาญี่ปุ่น",
        "ภาษาเกาหลี",
        "ภาษาฝรั่งเศส",
        "ภาษาพม่า",
        "ภาษาศาสตร์",
        "ดุริยางคศาสตร์ไทย",
        "ดุริยางคศาสตร์สากล",
        "นาฏศิลป์ไทย",
        "สารสนเทศศึกษา"
      ]
    },
    {
      faculty: "คณะสังคมศาสตร์",
      majors: [
        "จิตวิทยา",
        "รัฐศาสตร์ (การเมืองการปกครอง)",
        "รัฐศาสตร์ (ความสัมพันธ์ระหว่างประเทศ)",
        "รัฐประศาสนศาสตร์",
        "พัฒนาสังคม",
        "ประวัติศาสตร์",
        "อาเซียนศึกษา"
      ]
    },
    {
      faculty: "คณะนิติศาสตร์",
      majors: [
        "นิติศาสตร์"
      ]
    },
    {
      faculty: "คณะศึกษาศาสตร์",
      majors: [
        "คณิตศาสตร์ (กศ.บ.)",
        "ภาษาไทย (กศ.บ.)",
        "ภาษาอังกฤษ (กศ.บ.)",
        "เคมี (กศ.บ.)",
        "ฟิสิกส์ (กศ.บ.)",
        "ชีววิทยา (กศ.บ.)",
        "คอมพิวเตอร์ (กศ.บ.)",
        "พลศึกษาและวิทยาศาสตร์การออกกำลังกาย",
        "เทคโนโลยีและสื่อสารการศึกษา",
        "การศึกษาปฐมวัย",
        "ประถมศึกษา"
      ]
    },
    {
      faculty: "คณะเกษตรศาสตร์ ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
      majors: [
        "เกษตรศาสตร์",
        "วิทยาศาสตร์และเทคโนโลยีการอาหาร",
        "สัตวศาสตร์",
        "ประมง",
        "ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
        "ภูมิศาสตร์",
        "วิทยาศาสตร์การเกษตร"
      ]
    },
    {
      faculty: "คณะสถาปัตยกรรมศาสตร์ ศิลปะและการออกแบบ",
      majors: [
        "สถาปัตยกรรมศาสตร์",
        "การออกแบบผลิตภัณฑ์",
        "การออกแบบบรรจุภัณฑ์",
        "การออกแบบสื่อสาร",
        "ทัศนศิลป์",
        "นวัตกรรมการออกแบบสถาปัตยกรรม"
      ]
    },
    {
      faculty: "คณะโลจิสติกส์และดิจิทัลซัพพลายเชน",
      majors: [
        "การจัดการโลจิสติกส์และโซ่อุปทาน",
        "ดิจิทัลซัพพลายเชน"
      ]
    },
    {
      faculty: "คณะแพทยศาสตร์",
      majors: [
        "แพทยศาสตร์"
      ]
    },
    {
      faculty: "คณะทันตแพทยศาสตร์",
      majors: [
        "ทันตแพทยศาสตร์"
      ]
    },
    {
      faculty: "คณะเภสัชศาสตร์",
      majors: [
        "การบริบาลทางเภสัชกรรม",
        "วิทยาศาสตร์เครื่องสำอางและผลิตภัณฑ์ธรรมชาติ"
      ]
    },
    {
      faculty: "คณะพยาบาลศาสตร์",
      majors: [
        "พยาบาลศาสตร์"
      ]
    },
    {
      faculty: "คณะสหเวชศาสตร์",
      majors: [
        "เทคนิคการแพทย์",
        "กายภาพบำบัด",
        "ทัศนมาตรศาสตร์",
        "รังสีเทคนิค",
        "เทคโนโลยีหัวใจและทรวงอก"
      ]
    },
    {
      faculty: "คณะสาธารณสุขศาสตร์",
      majors: [
        "อนามัยชุมชน",
        "อาชีวอนามัยและความปลอดภัย",
        "อนามัยสิ่งแวดล้อม",
        "การแพทย์แผนไทยประยุกต์"
      ]
    },
    {
      faculty: "คณะวิทยาศาสตร์การแพทย์",
      majors: [
        "วิทยาศาสตร์การแพทย์",
        "จุลชีววิทยา",
        "ชีวเคมีและชีววิทยาโมเลกุล",
        "พยาธิวิทยากายวิภาค"
      ]
    },
    {
      faculty: "วิทยาลัยนานาชาติ (NUIC)",
      majors: [
        "การจัดการธุรกิจระหว่างประเทศ (นานาชาติ)",
        "การจัดการการท่องเที่ยวระหว่างประเทศ (นานาชาติ)",
        "ภาษาอังกฤษเพื่อการสื่อสารธุรกิจ (นานาชาติ)",
        "การจัดการทรัพยากรมนุษย์ (นานาชาติ)"
      ]
    }
  ];

  const ALL_MAJORS = NU_FACULTIES.flatMap(f =>
    f.majors.map(major => ({ major, faculty: f.faculty }))
  );

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  function findFacultyEntry(name) {
    const t = String(name || "").trim();
    if (!t) return null;
    return NU_FACULTIES.find(f => f.faculty === t) || null;
  }

  function renderFacultyMajorFields({
    facultyValue = "",
    majorValue = "",
    facultyLabel = "คณะ (สำหรับนิสิต มน.)",
    majorLabel = "สาขาวิชา (สำหรับนิสิต มน.)"
  } = {}) {
    return `
      <div class="field-grid nu-faculty-major-pair" data-nu-pair>
        <div class="field nu-combo" data-nu-combo="faculty">
          <label>${esc(facultyLabel)}</label>
          <div class="nu-combo-input-wrap">
            <input type="text" name="faculty" value="${esc(facultyValue)}" autocomplete="off"
                   placeholder="พิมพ์ค้นหาหรือเลือกคณะ เช่น วิทยาศาสตร์, บริหาร..."
                   aria-autocomplete="list" aria-expanded="false" data-nu-input="faculty">
            <button type="button" class="nu-combo-toggle" data-nu-toggle="faculty" aria-label="เปิดรายชื่อคณะทั้งหมด">▾</button>
          </div>
          <ul class="nu-combo-list" role="listbox" data-nu-list="faculty" hidden></ul>
        </div>

        <div class="field nu-combo" data-nu-combo="major">
          <label>${esc(majorLabel)}</label>
          <div class="nu-combo-input-wrap">
            <input type="text" name="major" value="${esc(majorValue)}" autocomplete="off"
                   placeholder="พิมพ์ค้นหาหรือเลือกสาขา เช่น วิทยาการคอมฯ, การตลาด..."
                   aria-autocomplete="list" aria-expanded="false" data-nu-input="major">
            <button type="button" class="nu-combo-toggle" data-nu-toggle="major" aria-label="เปิดรายชื่อสาขาทั้งหมด">▾</button>
          </div>
          <ul class="nu-combo-list" role="listbox" data-nu-list="major" hidden></ul>
        </div>
      </div>
    `;
  }

  function closeAllCombos(exceptEl = null) {
    document.querySelectorAll("[data-nu-list]").forEach(list => {
      if (exceptEl && list === exceptEl) return;
      list.hidden = true;
      const combo = list.closest("[data-nu-combo]");
      combo?.querySelector("[data-nu-input]")?.setAttribute("aria-expanded", "false");
    });
  }

  function populateComboList(comboEl, query, showAll = false) {
    const kind = comboEl.dataset.nuCombo;
    const pairEl = comboEl.closest("[data-nu-pair]");
    const listEl = comboEl.querySelector("[data-nu-list]");
    const inputEl = comboEl.querySelector("[data-nu-input]");
    const term = showAll ? "" : String(query || "").trim().toLowerCase();

    let items = [];
    if (kind === "faculty") {
      items = NU_FACULTIES
        .filter(f => !term || f.faculty.toLowerCase().includes(term))
        .map(f => ({
          value: f.faculty,
          primary: f.faculty,
          sub: `${f.majors.length} สาขาวิชา`,
          faculty: f.faculty
        }));
    } else {
      const selectedFaculty = pairEl?.querySelector('[data-nu-input="faculty"]')?.value?.trim() || "";
      const facEntry = findFacultyEntry(selectedFaculty);
      const source = facEntry && !term
        ? facEntry.majors.map(m => ({ major: m, faculty: facEntry.faculty }))
        : facEntry
          ? [
              ...facEntry.majors.filter(m => m.toLowerCase().includes(term)).map(m => ({ major: m, faculty: facEntry.faculty })),
              ...ALL_MAJORS.filter(x => x.faculty !== facEntry.faculty && (x.major.toLowerCase().includes(term) || x.faculty.toLowerCase().includes(term)))
            ]
          : ALL_MAJORS.filter(x => !term || x.major.toLowerCase().includes(term) || x.faculty.toLowerCase().includes(term));

      items = source.slice(0, 40).map(x => ({
        value: x.major,
        primary: x.major,
        sub: x.faculty,
        faculty: x.faculty
      }));
    }

    if (!items.length) {
      listEl.innerHTML = `<li class="nu-combo-empty">ไม่พบข้อมูลที่ตรงกับ "${esc(query)}" (สามารถพิมพ์กรอกเองได้)</li>`;
    } else {
      listEl.innerHTML = items.map(item => `
        <li class="nu-combo-option" role="option"
            data-nu-pick="${esc(kind)}"
            data-value="${esc(item.value)}"
            data-faculty="${esc(item.faculty)}">
          <strong>${esc(item.primary)}</strong>
          <span>${esc(item.sub)}</span>
        </li>
      `).join("");
    }

    closeAllCombos(listEl);
    listEl.hidden = false;
    inputEl?.setAttribute("aria-expanded", "true");
  }

  // Global delegated listeners for all NU Faculty/Major comboboxes (browser only)
  if (typeof document !== "undefined") {
  document.addEventListener("focusin", event => {
    const input = event.target.closest("[data-nu-input]");
    if (!input) return;
    const combo = input.closest("[data-nu-combo]");
    if (combo) populateComboList(combo, input.value, false);
  });

  document.addEventListener("input", event => {
    const input = event.target.closest("[data-nu-input]");
    if (!input) return;
    const combo = input.closest("[data-nu-combo]");
    if (combo) populateComboList(combo, input.value, false);
  });

  document.addEventListener("mousedown", event => {
    const opt = event.target.closest("[data-nu-pick]");
    if (opt) {
      event.preventDefault(); // prevent blur before selection
      const kind = opt.dataset.nuPick;
      const val = opt.dataset.value;
      const fac = opt.dataset.faculty;
      const combo = opt.closest("[data-nu-combo]");
      const pair = combo.closest("[data-nu-pair]");
      const input = combo.querySelector("[data-nu-input]");
      if (input) input.value = val;

      if (kind === "faculty" && pair) {
        const majorInput = pair.querySelector('[data-nu-input="major"]');
        const facEntry = findFacultyEntry(val);
        if (majorInput && facEntry && !facEntry.majors.includes(majorInput.value.trim())) {
          majorInput.value = "";
        }
        closeAllCombos();
        // Smoothly open Major dropdown right after picking Faculty!
        const majorCombo = pair.querySelector('[data-nu-combo="major"]');
        if (majorCombo && majorInput) {
          majorInput.focus();
          populateComboList(majorCombo, "", true);
        }
        return;
      }

      if (kind === "major" && pair && fac) {
        const facInput = pair.querySelector('[data-nu-input="faculty"]');
        if (facInput && facInput.value.trim() !== fac) {
          facInput.value = fac;
        }
      }
      closeAllCombos();
      return;
    }

    const toggle = event.target.closest("[data-nu-toggle]");
    if (toggle) {
      event.preventDefault();
      const combo = toggle.closest("[data-nu-combo]");
      const list = combo?.querySelector("[data-nu-list]");
      if (list && !list.hidden) {
        closeAllCombos();
      } else if (combo) {
        combo.querySelector("[data-nu-input]")?.focus();
        populateComboList(combo, "", true);
      }
      return;
    }

    if (!event.target.closest("[data-nu-combo]")) {
      closeAllCombos();
    }
  });

  document.addEventListener("keydown", event => {
    const input = event.target.closest("[data-nu-input]");
    if (!input) return;
    const combo = input.closest("[data-nu-combo]");
    const list = combo?.querySelector("[data-nu-list]");
    if (!list || list.hidden) return;

    if (event.key === "Escape") {
      closeAllCombos();
      return;
    }
    const options = [...list.querySelectorAll("[data-nu-pick]")];
    if (!options.length) return;
    const activeIdx = options.findIndex(o => o.classList.contains("is-active"));

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (activeIdx + 1) % options.length;
      options.forEach((o, i) => o.classList.toggle("is-active", i === next));
      options[next].scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (activeIdx - 1 + options.length) % options.length;
      options.forEach((o, i) => o.classList.toggle("is-active", i === prev));
      options[prev].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && activeIdx >= 0) {
      event.preventDefault();
      options[activeIdx].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }
  });
  }

  root.HappiUFaculties = {
    NU_FACULTIES,
    ALL_MAJORS,
    renderFacultyMajorFields
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
