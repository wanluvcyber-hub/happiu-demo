"use strict";

/* === Embedded M1 Module === */
(function (root) {
  const JOB_CATEGORIES = [
    "ร้านอาหารและกาแฟ",
    "งานในมหาวิทยาลัย",
    "อีเวนต์",
    "ออนไลน์",
    "บริการลูกค้า",
    "งานเอกสาร",
    "เทคโนโลยีและไอที",
    "การตลาดและสื่อ",
    "ดูแลสัตว์เลี้ยง",
    "ค้าปลีกและสต็อก",
    "สอนและการศึกษา"
  ];

  const SEED_STUDENT_INTERESTS = {
    baitong: ["ร้านอาหารและกาแฟ", "อีเวนต์"],
    thanwa: ["งานเอกสาร", "เทคโนโลยีและไอที", "งานในมหาวิทยาลัย", "ออนไลน์"],
    pim: ["งานในมหาวิทยาลัย", "ร้านอาหารและกาแฟ"]
  };

  const DAY_ALIASES = [
    ["จันทร์", /(?:วัน)?จันทร์|จ\./g],
    ["อังคาร", /(?:วัน)?อังคาร|อ\./g],
    ["พุธ", /(?:วัน)?พุธ|พ\./g],
    ["พฤหัสบดี", /(?:วัน)?พฤหัสบดี|(?:วัน)?พฤหัส|พฤ\./g],
    ["ศุกร์", /(?:วัน)?ศุกร์|ศ\./g],
    ["เสาร์", /(?:วัน)?เสาร์|ส\./g],
    ["อาทิตย์", /(?:วัน)?อาทิตย์|อา\./g]
  ];

  const RELATED_CATEGORY_KEYWORDS = {
    "ดูแลสัตว์เลี้ยง": ["สัตว์เลี้ยง", "สุนัข", "แมว"],
    "ค้าปลีกและสต็อก": ["สต็อก", "แพ็กสินค้า", "จัดชั้น", "แคชเชียร์"],
    "สอนและการศึกษา": ["สอน", "ติว", "แบบฝึก"],
    "ร้านอาหารและกาแฟ": ["ร้านอาหาร", "กาแฟ", "คาเฟ่", "เครื่องดื่ม", "อาหาร", "เบเกอรี", "บาริสต้า"],
    "งานในมหาวิทยาลัย": ["มหาวิทยาลัย", "มน.", "ห้องสมุด", "คณะ", "สำนักงาน", "วิจัย", "ผู้ช่วยอาจารย์"],
    "อีเวนต์": ["อีเวนต์", "งานแฟร์", "บูธ", "จัดงาน", "กิจกรรม", "ประสานงาน"],
    "ออนไลน์": ["ออนไลน์", "online", "ตัดต่อ", "สื่อ", "คอนเทนต์", "ดิจิทัล"],
    "บริการลูกค้า": ["บริการลูกค้า", "บริการ", "ต้อนรับ", "แคชเชียร์", "ขาย", "เสิร์ฟ"],
    "งานเอกสาร": ["เอกสาร", "ธุรการ", "คีย์ข้อมูล", "จัดหนังสือ", "จัดการข้อมูล"]
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

  function defaultMinutes(value) {
    if (typeof value !== "string" || !value.includes(":")) return 0;
    const parts = value.split(":");
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
    return hh * 60 + mm;
  }

  function defaultHours(shift) {
    if (!shift) return 0;
    const diff = (defaultMinutes(shift.end) - defaultMinutes(shift.start)) / 60;
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }

  function defaultClassConflict(student, shift) {
    if (!student || !Array.isArray(student.schedule) || !shift) return undefined;
    const shiftStart = defaultMinutes(shift.start);
    const shiftEnd = defaultMinutes(shift.end);
    return student.schedule.find(function (lesson) {
      if (!lesson || lesson.day !== shift.day) return false;
      const lessonStart = defaultMinutes(lesson.start);
      const lessonEnd = defaultMinutes(lesson.end);
      return shiftStart < lessonEnd && shiftEnd > lessonStart;
    });
  }

  function defaultAvailable(job, shift, state) {
    if (!shift) return 0;
    const cap = Number(shift.capacity);
    if (!Number.isFinite(cap) || cap <= 0) return 0;
    const apps = Array.isArray(state && state.applications) ? state.applications : [];
    const taken = apps.filter(function (app) {
      return app && app.job === (job && job.id) && app.shift === shift.id && (app.status === "accepted" || app.status === "offered");
    }).length;
    return Math.max(0, cap - taken);
  }

  function resolveHelpers(helpers, state) {
    const h = helpers && typeof helpers === "object" ? helpers : {};
    return {
      html: typeof h.html === "function" ? h.html : defaultHtml,
      hours: typeof h.hours === "function" ? h.hours : defaultHours,
      classConflict: typeof h.classConflict === "function" ? h.classConflict : defaultClassConflict,
      available: typeof h.available === "function"
        ? h.available
        : function (job, shift) {
            return defaultAvailable(job, shift, state);
          }
    };
  }

  function extractDaysFromClause(clause) {
    const days = [];
    if (/ทุกวัน/.test(clause)) {
      return ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
    }
    if (/วันหยุด|สุดสัปดาห์/.test(clause)) {
      days.push("เสาร์", "อาทิตย์");
    }
    if (/วันธรรมดา/.test(clause)) {
      days.push("จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์");
    }
    for (let i = 0; i < DAY_ALIASES.length; i++) {
      const entry = DAY_ALIASES[i];
      entry[1].lastIndex = 0;
      if (entry[1].test(clause) && days.indexOf(entry[0]) === -1) {
        days.push(entry[0]);
      }
    }
    return days;
  }

  function parseTimeConstraint(clause) {
    const rangeMatch = clause.match(/(\d{1,2})[:.](\d{2})\s*[-–ถึง]+\s*(\d{1,2})[:.](\d{2})/);
    if (rangeMatch) {
      return {
        after: Number(rangeMatch[1]) * 60 + Number(rangeMatch[2]),
        before: Number(rangeMatch[3]) * 60 + Number(rangeMatch[4])
      };
    }
    const afterMatch = clause.match(/(?:หลัง|ตั้งแต่)\s*(\d{1,2})[:.](\d{2})/);
    const beforeMatch = clause.match(/ก่อน\s*(\d{1,2})[:.](\d{2})/);
    if (!afterMatch && !beforeMatch) return null;
    return {
      after: afterMatch ? Number(afterMatch[1]) * 60 + Number(afterMatch[2]) : null,
      before: beforeMatch ? Number(beforeMatch[1]) * 60 + Number(beforeMatch[2]) : null
    };
  }

  function parseAvailabilityClauses(text) {
    if (typeof text !== "string" || !text.trim()) return [];
    const rawClauses = text
      .split(/(?:และ|,|;|\/|\n)+/)
      .map(function (c) {
        return c.trim();
      })
      .filter(Boolean);

    const parsed = rawClauses.map(function (clause) {
      return {
        days: extractDaysFromClause(clause),
        time: parseTimeConstraint(clause)
      };
    });

    // Propagate trailing time constraint backwards when student writes e.g. "จันทร์และพุธ หลัง 16:30 น."
    for (let i = parsed.length - 2; i >= 0; i--) {
      if (parsed[i].days.length > 0 && !parsed[i].time && parsed[i + 1].time) {
        parsed[i].time = parsed[i + 1].time;
      }
    }

    return parsed.filter(function (c) {
      return c.days.length > 0 || c.time !== null;
    });
  }

  function shiftMatchesClause(shift, clause) {
    if (!shift) return false;
    if (clause.days.length > 0 && clause.days.indexOf(shift.day) === -1) {
      return false;
    }
    if (!clause.time) return clause.days.length > 0;
    const sStart = defaultMinutes(shift.start);
    const sEnd = defaultMinutes(shift.end);
    if (clause.time.after !== null && sStart < clause.time.after) {
      return false;
    }
    if (clause.time.before !== null && sEnd > clause.time.before) {
      return false;
    }
    return true;
  }

  function withinAvailability(student, shift) {
    const clauses = parseAvailabilityClauses(student?.availability);
    return !clauses.length || clauses.some(clause => shiftMatchesClause(shift, clause));
  }

  const skillAliases = new Map([
    ["excel", "Microsoft Excel"], ["เอ็กเซล", "Microsoft Excel"], ["ไมโครซอฟท์ เอ็กเซล", "Microsoft Excel"],
    ["เอ็กเซลพื้นฐาน", "Excel พื้นฐาน"], ["excel basic", "Excel พื้นฐาน"],
    ["google sheet", "Google Sheets"], ["กูเกิลชีต", "Google Sheets"],
    ["กูเกิลชีตส์", "Google Sheets"], ["google ชีต", "Google Sheets"],
    ["คีย์ข้อมูล", "คีย์ข้อมูล"], ["ป้อนข้อมูล", "คีย์ข้อมูล"], ["data entry", "คีย์ข้อมูล"]
  ]);
  const relatedSkills = new Map([
    ["excel พื้นฐาน", ["google sheets"]],
    ["google sheets", ["excel พื้นฐาน", "microsoft excel"]]
  ]);
  const skillOptions = ["คีย์ข้อมูล", "Google Sheets", "Excel พื้นฐาน", "Microsoft Excel",
    "Excel PivotTable", "จัดแฟ้ม", "จัดเอกสาร", "จัดการข้อมูล", "พิมพ์เอกสาร", "บริการลูกค้า",
    "ประสานงาน", "ทำงานเป็นทีม", "ทำงานละเอียด", "แก้ปัญหาคอมพิวเตอร์", "Canva", "ภาษาอังกฤษ",
    "เขียนข้อความ", "ออกแบบกราฟิก", "จัดหนังสือ", "เตรียมวัตถุดิบ",
    "ดูแลสัตว์เลี้ยง", "พาสุนัขเดินเล่น", "จัดสต็อก", "แพ็กสินค้า", "ถ่ายภาพ", "ตัดต่อวิดีโอ", "สอนเด็ก",
    "จัดตารางนัดหมาย", "ตอบอีเมล", "ตอบแชตลูกค้า", "รับโทรศัพท์", "จัดประชุม", "จดบันทึกการประชุม",
    "ตรวจเอกสาร", "สแกนเอกสาร", "ถ่ายเอกสาร", "เข้าเล่มรายงาน", "ตรวจไฟล์ก่อนพิมพ์", "Microsoft Word",
    "Microsoft PowerPoint", "Google Docs", "Google Slides", "Google Forms", "จัดทำแบบสอบถาม", "สรุปข้อมูล",
    "ตรวจนับสินค้า", "เติมสินค้า", "จัดชั้นสินค้า", "จัดออเดอร์", "รับออเดอร์", "คิดเงิน", "ใช้เครื่องแคชเชียร์",
    "ใช้งานระบบ POS", "แนะนำสินค้า", "ขายหน้าร้าน", "ขายออนไลน์", "จัดส่งสินค้า", "ห่อของขวัญ",
    "ชงกาแฟ", "ทำเครื่องดื่ม", "ทำขนม", "ทำอาหาร", "เตรียมอาหาร", "เสิร์ฟอาหาร", "จัดโต๊ะ",
    "ล้างจาน", "ทำความสะอาด", "ดูแลความสะอาดครัว", "ให้อาหารสัตว์", "อาบน้ำสัตว์เลี้ยง", "จัดกรงสัตว์",
    "ช่วยลงทะเบียนกิจกรรม", "ต้อนรับผู้ร่วมงาน", "จัดสถานที่", "ดูแลอุปกรณ์กีฬา", "จัดคิว",
    "นำชมสถานที่", "เป็นพิธีกร", "พูดต่อหน้ากลุ่ม", "ประสานงานอีเวนต์", "จัดนิทรรศการ",
    "ถ่ายภาพสินค้า", "แต่งภาพ", "ถ่ายวิดีโอ", "ตัดต่อด้วย CapCut", "ทำซับไตเติล", "ถอดเสียง",
    "ทำโปสเตอร์", "ทำสไลด์", "ออกแบบโลโก้", "วาดภาพประกอบ", "Adobe Photoshop", "Adobe Illustrator",
    "จัดแสงถ่ายภาพ", "เขียนแคปชัน", "เขียนบทความ", "ตรวจคำผิด", "ดูแลเพจ", "ทำคอนเทนต์",
    "แปลภาษาอังกฤษ", "ภาษาจีน", "ภาษาญี่ปุ่น", "สอนภาษาอังกฤษ", "สอนคณิตศาสตร์", "สอนวิทยาศาสตร์",
    "สอนเขียนโปรแกรม", "ช่วยทำการบ้าน", "ทำใบงาน", "ดูแลเด็ก", "จัดกิจกรรมเด็ก",
    "ใช้งานคอมพิวเตอร์", "ติดตั้งโปรแกรม", "ตั้งค่าเครื่องพิมพ์", "ดูแลเว็บไซต์", "WordPress", "HTML", "CSS",
    "JavaScript", "Python", "SQL", "ทดสอบเว็บไซต์", "ค้นคว้าข้อมูล", "บริหารเวลา", "สื่อสารกับลูกค้า"];

  function normalizeText(value) {
    return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function canonicalSkill(value) {
    return skillAliases.get(normalizeText(value)) || value.trim();
  }

  function skillKey(value) {
    return normalizeText(canonicalSkill(value));
  }

  function skillList(value) {
    const unique = new Map();
    for (const label of String(value || "").split(/[,，;\n]+/)) {
      const name = canonicalSkill(label);
      if (name && !unique.has(skillKey(name))) unique.set(skillKey(name), name);
    }
    return [...unique.values()];
  }

  function matchingSkills(student, job) {
    const owned = new Map(skillList(student?.skills).map(skill => [skillKey(skill), skill]));
    const required = new Set(skillList(job?.requiredSkills).map(skillKey));
    const listed = skillList([job?.requiredSkills, job?.skills].filter(Boolean).join(","));
    const exact = new Set(listed.map(skillKey).filter(key =>
      owned.has(key) || (key === "excel พื้นฐาน" && owned.has("microsoft excel"))));
    const remaining = new Map(owned);
    for (const key of exact) remaining.delete(key);
    if (exact.has("excel พื้นฐาน")) remaining.delete("microsoft excel");

    return listed.map(skill => {
      const key = skillKey(skill);
      const necessary = required.has(key);
      if (exact.has(key)) return {skill, necessary, status:"exact"};
      const relatedKey = relatedSkills.get(key)?.find(candidate => remaining.has(candidate));
      if (!relatedKey) return {skill, necessary, status:owned.size ? "missing" : "unknown"};
      const source = remaining.get(relatedKey);
      if (!necessary) remaining.delete(relatedKey);
      return {skill, necessary, status:"related", source};
    });
  }

  function normalizeInterests(interests) {
    if (Array.isArray(interests)) {
      return interests
        .map(function (item) { return String(item || "").trim(); })
        .filter(Boolean);
    }
    if (typeof interests === "string" && interests.trim()) {
      return interests
        .split(/[,，\n]+/)
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
    }
    return [];
  }

  function scoreInterests(student, job) {
    const interests = normalizeInterests(student && student.interests);
    const category = String((job && job.category) || "").trim();
    if (interests.length === 0 || !category) return 0;

    const catLower = category.toLowerCase();
    for (let i = 0; i < interests.length; i++) {
      if (interests[i].toLowerCase() === catLower) {
        return 20;
      }
    }

    const jobContext = [category, job && job.title]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (let i = 0; i < interests.length; i++) {
      const item = interests[i];
      const itemLower = item.toLowerCase();
      if (catLower.includes(itemLower) || itemLower.includes(catLower)) {
        return 10;
      }
      const keywords = RELATED_CATEGORY_KEYWORDS[item] || itemLower.split(/[\s/\-และ,]+/).filter(Boolean);
      if (
        keywords.some(function (kw) {
          return kw.length >= 2 && jobContext.includes(kw.toLowerCase());
        })
      ) {
        return 10;
      }
    }

    return 0;
  }

  function hasRecommendationProfile(student) {
    return Boolean(skillList(student?.skills).length &&
      normalizeInterests(student?.interests).length && parseAvailabilityClauses(student?.availability).length);
  }

  function computeJobMatch(student, job, state, helpers) {
    const h = resolveHelpers(helpers, state);
    const employer = state?.employers?.[job?.employer];
    const unverifiedOrInactive = job?.status !== "live" || employer?.status !== "verified";
    const shifts = Array.isArray(job?.shifts) ? job.shifts : [];
    const availableShifts = shifts.filter(shift => h.available(job, shift) > 0);
    const conflicts = shifts.map(shift => ({shift, conflict:h.classConflict(student, shift)}));
    const conflictDetails = conflicts.filter(item => item.conflict);
    const conflictingShifts = conflictDetails.map(item => item.shift);
    const schoolFree = availableShifts.filter(shift => !conflictingShifts.includes(shift));
    const nonConflictingShifts = schoolFree.filter(shift => withinAvailability(student, shift));
    const skillMatches = matchingSkills(student, job);
    const exact = skillMatches.filter(match => match.status === "exact");
    const related = skillMatches.filter(match => match.status === "related" && !match.necessary);
    const missingRequired = skillMatches.filter(match => match.necessary && match.status !== "exact");
    const hasSkills = Boolean(skillList(student?.skills).length);
    const majorRequired = job?.requiredMajor || "";
    const majorMismatch = Boolean(majorRequired && student?.major !== majorRequired);
    const profileComplete = Boolean((hasSkills || !skillMatches.length) &&
      normalizeInterests(student?.interests).length && parseAvailabilityClauses(student?.availability).length);
    const fullOnly = !availableShifts.length;
    const conflictOnly = !fullOnly && !schoolFree.length;
    const reasonIfIneligible = unverifiedOrInactive ? "ประกาศยังไม่เปิดรับ"
      : fullOnly ? "กะเต็ม" : conflictOnly ? "กะชนเรียน"
      : !nonConflictingShifts.length ? "กะอยู่นอกเวลาที่สะดวก"
      : majorMismatch ? "งานนี้รับสาขา " + majorRequired
      : hasSkills && missingRequired.length ? "ยังไม่ตรงทักษะจำเป็น: " + missingRequired.map(match => match.skill).join(", ") : "";
    const availability = nonConflictingShifts.length ? 30 : 0;
    const skills = skillMatches.length ? Math.round(50 * (exact.length + .5 * related.length) / skillMatches.length) : 50;
    const interests = scoreInterests(student, job);
    const reasons = [
      skillMatches.length && hasSkills ? "ตรง " + exact.length + " จาก " + skillMatches.length + " ทักษะ" +
        (related.length ? " · ใกล้เคียง " + related.length + " ทักษะ" : "") : "",
      availability ? "มีกะตรงเวลาที่สะดวกและไม่ชนเรียน" : "",
      interests === 20 ? "ตรงประเภทงานที่สนใจ" : interests ? "ใกล้เคียงประเภทงานที่สนใจ" : ""
    ].filter(Boolean);
    const hypotheticalScore = availability + skills + interests;
    return {eligible: !reasonIfIneligible, unverifiedOrInactive, conflictOnly, fullOnly, profileComplete,
      reasonIfIneligible, totalScore: !reasonIfIneligible && profileComplete ? hypotheticalScore : null,
      hypotheticalScore, breakdown:{availability, skills, interests}, reasons, skillMatches,
      availableShifts, nonConflictingShifts, conflictingShifts, conflictDetails};
  }

  function rankJobsForStudent(student, jobs, state, helpers) {
    const list = Array.isArray(jobs) ? jobs : [];
    const eligibleEntries = [];
    const ineligibleEntries = [];

    for (let i = 0; i < list.length; i++) {
      const job = list[i];
      const match = computeJobMatch(student, job, state, helpers);
      if (match.unverifiedOrInactive) continue;
      if (match.eligible) {
        eligibleEntries.push({ job: job, match: match });
      } else {
        ineligibleEntries.push({ job: job, match: match });
      }
    }

    eligibleEntries.sort(function (a, b) {
      if (b.match.totalScore !== a.match.totalScore) {
        return b.match.totalScore - a.match.totalScore;
      }
      if (b.match.breakdown.availability !== a.match.breakdown.availability) {
        return b.match.breakdown.availability - a.match.breakdown.availability;
      }
      if (b.match.breakdown.skills !== a.match.breakdown.skills) {
        return b.match.breakdown.skills - a.match.breakdown.skills;
      }
      return String(a.job.id || "").localeCompare(String(b.job.id || ""));
    });

    ineligibleEntries.sort(function (a, b) {
      if (b.match.hypotheticalScore !== a.match.hypotheticalScore) {
        return b.match.hypotheticalScore - a.match.hypotheticalScore;
      }
      return String(a.job.id || "").localeCompare(String(b.job.id || ""));
    });

    return eligibleEntries.concat(ineligibleEntries);
  }

  function renderMatchBadge(match, helpers) {
    if (!match) return "";
    const h = resolveHelpers(helpers);
    const esc = h.html;

    if (!match.eligible) return "";
    if (!match.profileComplete) {
      return '<p class="m1-match-reasons">เพิ่มทักษะ งานที่สนใจ และเวลาว่างเพื่อดูคะแนน</p>';
    }
    const score = Number(match.totalScore) || 0;
    const tone = score >= 80 ? "good" : score >= 55 ? "info" : "wait";
    const reasons = Array.isArray(match.reasons) ? match.reasons.slice(0, 3) : [];
    const reasonHtml = reasons.length
      ? '<p class="m1-match-reasons">' + reasons.map(function (r) { return esc(r); }).join(" · ") + "</p>"
      : "";

    return '<div class="m1-match-wrap">' +
      '<span class="tag ' + tone + ' m1-match-badge"><span>ตรงกับคุณ ' + esc(score) + "%</span></span>" +
      reasonHtml +
      "</div>";
  }

  function renderMatchBreakdown(match, helpers) {
    if (!match) return "";
    const h = resolveHelpers(helpers);
    const esc = h.html;
    const b = match.breakdown;

    const factors = [
      ["เวลาว่าง", 30, b.availability || 0],
      ["ทักษะ", 50, b.skills || 0],
      ["ประเภทงานที่สนใจ", 20, b.interests || 0]
    ];

    const headerBanner = match.eligible && !match.profileComplete ? renderMatchBadge(match, helpers)
      : match.eligible
      ? '<div class="m1-breakdown-head"><span class="tag good m1-match-badge"><span>ตรงกับคุณ ' +
          esc(match.totalScore) + "%</span></span>" +
          (Array.isArray(match.reasons) && match.reasons.length
            ? '<p class="m1-match-reasons">' + match.reasons.map(function (r) { return esc(r); }).join(" · ") + "</p>"
            : "") +
          "</div>"
      : '<p class="callout ' + (match.fullOnly ? "wait" : "bad") + '">' +
          esc(match.conflictOnly
            ? "กะชนเรียน: กะที่เปิดรับทับซ้อนกับตารางเรียนของคุณ จึงยังไม่จัดเป็นงานที่แนะนำ"
            : match.fullOnly
              ? "กะเต็ม: ขณะนี้ยังไม่มีที่ว่างในกะที่เปิดรับ"
              : (match.reasonIfIneligible || "ประกาศยังไม่เปิดรับ")) +
          "</p>";

    const rows = factors.map(function (item) {
      const label = item[0];
      const max = item[1];
      const val = Math.max(0, Math.min(max, Number(item[2]) || 0));
      const pct = max > 0 ? Math.round((val / max) * 100) : 0;
      return '<li class="m1-factor-row">' +
        '<div class="m1-factor-meta"><span>' + esc(label) + " (" + esc(max) + "%)</span>" +
        "<strong>" + esc(val) + "/" + esc(max) + "</strong></div>" +
        '<div class="m1-factor-bar" role="progressbar" aria-valuenow="' + esc(val) +
        '" aria-valuemin="0" aria-valuemax="' + esc(max) + '">' +
        '<span class="m1-factor-fill" style="width:' + pct + '%"></span></div>' +
        "</li>";
    }).join("");

    return '<section class="m1-breakdown" aria-label="สัดส่วนคะแนนความเหมาะสม">' +
      headerBanner +
      (match.eligible && match.profileComplete ? '<ul class="m1-factor-list">' + rows + "</ul>" : "") +
      renderSkillMatches(match.skillMatches, esc) +
      "</section>";
  }

  function renderSkillMatches(matches, esc) {
    if (!matches.length) return "";
    const labels = {exact:["ตรง","good"], related:["ใกล้เคียง","wait"],
      missing:["ยังไม่มีในโปรไฟล์",""], unknown:["ยังไม่ได้ระบุทักษะ",""]};
    return '<h3>ผลจับคู่ทักษะ</h3><ul class="skill-match-list">' + matches.map(match => {
      const [label, tone] = labels[match.status];
      return '<li><span class="tag ' + tone + '">' + label + '</span><div><strong>' + esc(match.skill) +
        '</strong> <small>' + (match.necessary ? "ทักษะจำเป็น" : "ทักษะเสริม") + '</small>' +
        (match.source ? '<p class="helper">ทักษะของคุณ: ' + esc(match.source) +
          (match.necessary ? ' · งานนี้ต้องใช้ทักษะที่ระบุ' : '') + '</p>' : '') + '</div></li>';
    }).join("") + '</ul>';
  }

  function renderEmployerApplicantMatch(student, job, state, helpers) {
    const h = resolveHelpers(helpers, state);
    const esc = h.html;
    if (!student || !job) return "";

    const match = computeJobMatch(student, job, state, h);
    const availText = student.availability && String(student.availability).trim()
      ? String(student.availability).trim()
      : "ยังไม่ระบุช่วงเวลาว่าง";

    const scoreBadge = match.eligible ? ""
      : '<span class="tag wait">' + esc(match.reasonIfIneligible) + '</span>';
    const reasonsHtml = match.eligible && match.profileComplete
      ? '<p class="m1-match-reasons">' + match.reasons.map(esc).join(" · ") + '</p>'
      : "";
    return '<div class="m1-applicant-match">' +
      scoreBadge +
      reasonsHtml +
      '<p class="m1-applicant-availability"><strong>เวลาว่างที่นิสิตระบุ:</strong> ' + esc(availText) + "</p>" +
      "</div>";
  }

  function renderInterestsField(student, helpers) {
    const h = resolveHelpers(helpers);
    const esc = h.html;
    const selected = normalizeInterests(student && student.interests);
    const selectedLower = selected.map(function (s) { return s.toLowerCase(); });

    const items = JOB_CATEGORIES.map(function (cat) {
      const checked = selectedLower.indexOf(cat.toLowerCase()) !== -1;
      return '<label class="share-option m1-interest-chip">' +
        '<input type="checkbox" name="interests" value="' + esc(cat) + '"' + (checked ? " checked" : "") + "> " +
        "<span>" + esc(cat) + "</span></label>";
    }).join("");

    return '<fieldset class="share-fields m1-interests-fieldset">' +
      "<legend>ประเภทงานที่สนใจ</legend>" +
      '<div class="m1-interests-grid">' + items + "</div>" +
      "</fieldset>";
  }

  const M1_CSS = [
    ".m1-match-wrap{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:4px 0}",
    ".m1-match-badge{font-weight:700}",
    ".m1-match-reasons{margin:0;font-size:.82rem;color:var(--muted,#4a4d52);line-height:1.45}",
    ".m1-breakdown{margin-top:14px;padding:14px;border:1px solid var(--card-border,#ebecf0);border-radius:12px;background:var(--surface,#fff)}",
    ".m1-breakdown-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px}",
    ".m1-factor-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}",
    ".m1-factor-row{display:grid;gap:4px}",
    ".m1-factor-meta{display:flex;justify-content:space-between;gap:8px;font-size:.84rem;color:var(--text,#191c21)}",
    ".m1-factor-bar{height:8px;border-radius:999px;background:var(--soft,#fff0e4);overflow:hidden}",
    ".m1-factor-fill{display:block;height:100%;border-radius:999px;background:var(--primary,#ac3600)}",
    ".m1-applicant-match{margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--soft,#fff0e4);border:1px solid #f0d8cc;display:grid;gap:4px}",
    ".m1-applicant-availability{margin:0;font-size:.86rem;color:var(--text,#191c21)}",
    ".m1-interests-fieldset{border:1px solid var(--card-border,#ebecf0);border-radius:12px;padding:12px 14px;margin:12px 0}",
    ".m1-interests-fieldset legend{font-weight:700;font-size:.92rem;padding:0 6px;color:var(--text,#191c21)}",
    ".m1-interests-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:6px}",
    ".m1-interest-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--card-border,#ebecf0);border-radius:8px;background:var(--surface,#fff);cursor:pointer;min-height:44px}",
    ".m1-interest-chip:has(input:checked){background:var(--soft,#fff0e4);border-color:var(--primary,#ac3600);color:var(--primary,#ac3600);font-weight:600}"
  ].join("\n");

  const api = {
    JOB_CATEGORIES: JOB_CATEGORIES,
    SEED_STUDENT_INTERESTS: SEED_STUDENT_INTERESTS,
    computeJobMatch: computeJobMatch,
    rankJobsForStudent: rankJobsForStudent,
    renderMatchBadge: renderMatchBadge,
    renderMatchBreakdown: renderMatchBreakdown,
    renderEmployerApplicantMatch: renderEmployerApplicantMatch,
    renderInterestsField: renderInterestsField,
    parseAvailabilityClauses: parseAvailabilityClauses,
    withinAvailability: withinAvailability,
    hasRecommendationProfile: hasRecommendationProfile,
    skillOptions: skillOptions,
    skillList: skillList,
    skillKey: skillKey,
    M1_CSS: M1_CSS
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.HappiUM1 = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
