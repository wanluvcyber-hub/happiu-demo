/* === HappiU Core Application: Views, Router, Forms & Interactive Actions === */
let state = readState();
let role = state.signedIn && Object.hasOwn(names,state.demoRole) ? state.demoRole : "student";
let loginRole = role;
let loginMode = "login"; // "login" | "register"
let navCollapsed = false;
let chatNavOpen = false;
let page = state.signedIn ? "home" : "landing";
let selected = {};
let filters = emptyFilters();
let employerId = Object.hasOwn(state.employers,state.demoEmployer) ? state.demoEmployer : "cafe";
function applyServerState(serverState, user = null) {
  if (!serverState || typeof serverState !== "object") return;
  const keepSignedIn = user ? true : state.signedIn;
  const keepStudentId = user?.role === "student" ? user.entityId : state.studentId;
  const keepRole = user ? user.role : role;
  const keepEmployer = user?.role === "employer" ? user.entityId : employerId;
  Object.assign(state, {
    students: serverState.students || state.students,
    employers: serverState.employers || state.employers,
    jobs: serverState.jobs || state.jobs,
    applications: serverState.applications || state.applications,
    workSessions: serverState.workSessions || [],
    tutors: serverState.tutors || state.tutors,
    reports: serverState.reports || state.reports,
    signedIn: keepSignedIn,
    studentId: keepStudentId && serverState.students?.[keepStudentId] ? keepStudentId : Object.keys(serverState.students || {})[0] || firstStudent,
    demoRole: keepRole,
    demoEmployer: keepEmployer && serverState.employers?.[keepEmployer] ? keepEmployer : Object.keys(serverState.employers || {})[0] || "cafe"
  });
  role = keepRole;
  employerId = state.demoEmployer;
  persist();
}
function jobTypeBadge(job) {
  const jt = job?.jobType || (job?.kind === "online" ? "online" : "part-time");
  const entry = jobTypeLabels[jt] || jobTypeLabels["part-time"];
  return tag(entry[0], entry[1]);
}
function formatSessionClock(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d) + " น.";
}
function emptyFilters() { return {kind:"all",q:"",category:"",duration:"",period:""}; }
let announcing;
const main = document.querySelector("#main");
const dialog = document.querySelector("#dialog");
const html = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
const currency = value => Number(value).toLocaleString("th-TH",{maximumFractionDigits:2}) + " บาท";
const jobBy = id => state.jobs.find(job => job.id === id);
const appBy = id => state.applications.find(app => app.id === id);
const shiftBy = (job, id) => job?.shifts?.find(shift => shift.id === id);
const time = shift => shift.day + " " + shift.start + "–" + shift.end + " น.";
const minutes = value => Number(value.slice(0,2))*60 + Number(value.slice(3));
const hours = shift => (minutes(shift.end)-minutes(shift.start))/60;
const currentStudent = () => state.students[state.studentId];
const studentApplications = () => state.applications.filter(app => app.student === state.studentId);
const studentReportsList = () => state.reports.filter(report => report.student === state.studentId);
const classConflictFor = (student,shift) => student.schedule.find(lesson =>
  shift.day === lesson.day && minutes(shift.start) < minutes(lesson.end) && minutes(shift.end) > minutes(lesson.start)
);
const classConflict = shift => state.signedIn ? classConflictFor(currentStudent(),shift) : undefined;
const busy = shift => !!classConflict(shift);
const available = (job, shift, excludeAppId) => HappiUM3.availableShiftSlots(job, shift, state, excludeAppId);
const active = job => job.status === "live";
const existing = job => state.signedIn ? HappiUM3.hasActiveApplication(state, state.studentId, job.id) : null;
const ownsApplication = app => !!app && state.signedIn && role === "employer" && jobBy(app.job)?.employer === employerId;
const studentOwns = app => !!app && state.signedIn && role === "student" && app.student === state.studentId;
const canChat = app => studentOwns(app) || ownsApplication(app);
const newId = prefix => prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6);
const icon = name => '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + icons[name] + '</svg></span>';
const statusIcons = {good:"check",wait:"clock",bad:"error",info:"info"};
const tag = (label, kind="") => '<span class="tag ' + kind + '">' +
  (statusIcons[kind] ? icon(statusIcons[kind]) : "") + '<span>' + html(label) + '</span></span>';
const badge = values => tag(...values);
const button = (label, action, kind="primary", id="", disabled=false) => '<button type="button" class="' + kind + '" data-action="' + action + '" data-id="' + html(id) + '"' + (disabled ? " disabled" : "") + '>' + html(label) + '</button>';
const navButton = (label, to, kind="secondary") => '<button type="button" class="' + kind + '" data-route="' + to + '">' + html(label) + '</button>';
function headerMascotSrc() {
  if (page === "tutors") return tutorClayArt;
  if (page === "work") return headerMascots.work;
  if (page === "reports" || page === "report" || role === "admin") return headerMascots.shield;
  return "";
}
const pageHeaderMeta = {
  "student:profile": { icon: "person", desc: "จัดการข้อมูลนิสิต ทักษะ และพอร์ตฟอลิโอสมัครงานของคุณ" },
  "employer:profile": { icon: "person", desc: "จัดการข้อมูลร้านค้า หน่วยงาน และสถานะการรับรองผู้จ้าง" },
  "admin:profile": { icon: "check", desc: "ตรวจสอบและรับรองสถานะผู้จ้างในระบบมหาวิทยาลัยนเรศวร" },
  "student:schedule": { icon: "calendar", desc: "วางแผนตารางเรียนควบคู่กะงานพาร์ตไทม์ไม่ให้เวลาชนกัน" },
  "student:applications": { icon: "list", desc: "ติดตามสถานะใบสมัครและข้อความนัดหมายจากผู้จ้าง" },
  "employer:applications": { icon: "person", desc: "ตรวจรายชื่อผู้สมัคร นัดสัมภาษณ์ และส่งข้อเสนอกะงาน" },
  "student:work": { icon: "wallet", desc: "เช็กกะงานที่กำลังจะมาถึง ชั่วโมงที่รับรอง และรายได้ทั้งหมด" },
  "employer:work": { icon: "clock", desc: "ตรวจรายการวันที่และเวลาที่นิสิตบันทึกในกะเดียวกัน" },
  "student:reports": { icon: "flag", desc: "แจ้งปัญหาการทำงานหรือติดตามความคืบหน้ากับเจ้าหน้าที่ มน." },
  "employer:reports": { icon: "flag", desc: "ส่งคำชี้แจงและข้อมูลประกอบการตรวจสอบจากเจ้าหน้าที่ มน." },
  "admin:reports": { icon: "flag", desc: "ตรวจสอบข้อร้องเรียนและติดตามคำชี้แจงจากนิสิตและผู้จ้าง" }
};
const header = (title, desc="") => {
  const m = headerMascotSrc();
  const meta = pageHeaderMeta[role + ":" + page] || {};
  const finalDesc = desc || meta.desc || "";
  const glyph = (meta.icon && icons[meta.icon]) ? '<span class="pagehead-badge" aria-hidden="true">' + icon(meta.icon) + '</span>' : '';
  return '<header class="pagehead' + (m ? ' pagehead-illustrated' : '') + '" data-page="' + html(page) + '">' +
    '<div class="pagehead-main">' + glyph + '<div><h1>' + html(title) + '</h1>' +
    (finalDesc ? '<p>' + html(finalDesc) + '</p>' : '') + '</div></div>' +
    (m ? '<img class="pagehead-art" src="' + m + '" alt="" aria-hidden="true">' : '') + '</header>';
};
const panel = body => '<section class="panel">' + body + '</section>';
const actions = body => '<div class="actions">' + body + '</div>';
const empty = (title, detail, next="") => '<div class="empty"><h3>' + html(title) + '</h3><p>' + html(detail) + '</p>' + next + '</div>';
const callout = (message, kind="") => '<p class="callout ' + kind + '">' + html(message) + '</p>';
const dataList = rows => '<dl>' + rows.map(([k,v]) => '<dt>' + html(k) + '</dt><dd>' + html(v) + '</dd>').join("") + '</dl>';
const field = (label,name,value="",type="text",extra="") => '<label class="field">' + html(label) + '<input type="' + type + '" name="' + name + '" value="' + html(value) + '" ' + extra + '></label>';
const area = (label,name,value="",required=true) => '<label class="field">' + html(label) + '<textarea name="' + name + '" maxlength="600"' + (required ? " required" : "") + '>' + html(value) + '</textarea></label>';
const selectField = (label,name,options,value) => '<label class="field">' + html(label) + '<select name="' + name + '">' + options.map(([v,l]) => '<option value="' + html(v) + '"' + (v === value ? ' selected' : '') + '>' + html(l) + '</option>').join("") + '</select></label>';
const row = (body, controls="") => '<article class="work-row"><div>' + body + '</div>' + (controls ? actions(controls) : "") + '</article>';
const form = (id, body, submit) => '<form data-form="' + id + '">' + body + '<div class="actions"><button class="primary" type="submit">' + html(submit) + '</button></div><p class="helper" role="alert" data-form-error></p></form>';
function skillTags(values) {
  return values.map(skill => '<button type="button" class="tag skill-tag" data-remove-skill="' +
    html(skill) + '" aria-label="' + html("ลบทักษะ " + skill) + '">' + html(skill) +
    ' <span aria-hidden="true">×</span></button>').join("");
}

const starterSkills = new Map([
  ["Excel พื้นฐาน","ใช้ Excel พื้นฐาน"],
  ["คีย์ข้อมูล","คีย์ข้อมูล"],
  ["Canva","ทำโปสเตอร์ด้วย Canva"],
  ["ช่วยลงทะเบียนกิจกรรม","ช่วยลงทะเบียนกิจกรรม"]
]);

const skillSearchWords = {
  "ชงกาแฟ":"บาริสต้า barista coffee",
  "ทำเครื่องดื่ม":"ร้านกาแฟ คาเฟ่",
  "คิดเงิน":"แคชเชียร์ cashier",
  "จัดสต็อก":"สต๊อก stock คลังสินค้า",
  "คีย์ข้อมูล":"ป้อนข้อมูล กรอกข้อมูล data entry",
  "Google Sheets":"กูเกิลชีต สเปรดชีต ตาราง",
  "Microsoft Excel":"เอ็กเซล เอกเซล ตาราง spreadsheet",
  "Excel พื้นฐาน":"เอ็กเซล เอกเซล ตาราง",
  "Canva":"แคนวา แคนว่า ออกแบบ โปสเตอร์",
  "ตัดต่อวิดีโอ":"วิดีโอ วีดีโอ video คลิป editing",
  "ถ่ายภาพ":"ช่างภาพ ถ่ายรูป photo",
  "ตัดต่อด้วย CapCut":"แคปคัต ตัดคลิป",
  "ทำซับไตเติล":"ซับคลิป คำบรรยาย subtitle",
  "สอนเด็ก":"ติวเตอร์ tutor สอนพิเศษ",
  "แพ็กสินค้า":"แพ็คสินค้า แพ็กของ แพ็คของ",
  "ช่วยลงทะเบียนกิจกรรม":"อีเวนต์ event เช็กชื่อ"
};

function quickSkillResults(query, values) {
  const term = query.normalize("NFC").toLowerCase().trim();
  const key = HappiUM1.skillKey(term);
  const selectedKeys = new Set(values.map(HappiUM1.skillKey));
  const options = term ? HappiUM1.skillOptions.filter(skill =>
    HappiUM1.skillKey(skill) === key || skill.toLowerCase().includes(term) ||
    skillSearchWords[skill]?.includes(term) || starterSkills.get(skill)?.toLowerCase().includes(term)
  ).sort((a,b) => Number(b.toLowerCase().startsWith(term)) - Number(a.toLowerCase().startsWith(term)))
    : [...starterSkills.keys()];
  const suggestions = options.filter(skill => !selectedKeys.has(HappiUM1.skillKey(skill))).slice(0,10);
  if (!suggestions.length && term) return '<p class="helper">เพิ่มคำที่พิมพ์เป็นทักษะของคุณได้</p>';
  return suggestions.map(skill => '<button type="button" class="quick-skill" data-quick-skill="' +
    html(skill) + '">' + icon("plus") + html(term ? skill : starterSkills.get(skill)) + '</button>').join("");
}

function skillPicker(label, name, value, help = "") {
  const values = HappiUM1.skillList(value);
  return '<fieldset class="skill-picker" data-skill-picker><legend>' + html(label) + '</legend>' +
    (help ? '<p class="helper">' + html(help) + '</p>' : "") +
    '<input type="hidden" name="' + name + '" value="' + html(values.join(", ")) + '">' +
    '<div class="skill-tags" data-skill-tags>' + skillTags(values) + '</div>' +
    '<div class="skill-picker-split">' +
      '<div class="skill-box">' +
        '<span class="skill-box-title">ทักษะแนะนำ (แตะเพื่อเลือก)</span>' +
        '<div class="quick-skills" role="group" aria-label="ทักษะที่แนะนำ" data-quick-skills>' +
        quickSkillResults("",values) + '</div>' +
      '</div>' +
      '<div class="skill-box">' +
        '<span class="skill-box-title">ทักษะที่อยากเพิ่มเอง</span>' +
        '<div class="skill-entry">' + field("พิมพ์ชื่อทักษะที่ต้องการเพิ่ม","", "", "text",
          'maxlength="80" autocomplete="off" data-skill-input placeholder="เช่น ชงกาแฟ, Excel, ถ่ายรูป"') +
        '<button type="button" class="secondary" data-add-skill>เพิ่มทักษะ</button></div>' +
      '</div>' +
    '</div>' +
    '<p class="helper skill-feedback" data-skill-feedback role="status"></p></fieldset>';
}

function updateSkillPicker(picker, removal, choice) {
  const input = picker.querySelector("[data-skill-input]");
  const saved = picker.querySelector('input[type="hidden"]');
  const feedback = picker.querySelector("[data-skill-feedback]");
  const values = HappiUM1.skillList(saved.value);
  const pending = choice || input.value.trim();
  if (!removal && !pending) return true;

  const next = removal ? values.filter(skill => skill !== removal)
    : HappiUM1.skillList([...values,pending].join(","));
  if (!removal && next.length > 20 && next.length > values.length) {
    feedback.textContent = "เลือกได้สูงสุด 20 ทักษะต่อรายการ";
    input.focus();
    return false;
  }
  saved.value = next.join(", ");
  picker.querySelector("[data-skill-tags]").innerHTML = skillTags(next);
  if (!removal) input.value = "";
  const quick = picker.querySelector("[data-quick-skills]");
  if (quick) quick.innerHTML = quickSkillResults(input.value,next);
  feedback.textContent = removal ? "ลบ " + removal + " แล้ว"
    : next.length === values.length ? "ทักษะนี้อยู่ในรายการแล้ว" : "เพิ่มทักษะแล้ว";
  input.focus();
  return true;
}

const headingRow = (title, status="") => '<div class="labelrow"><h3>' + html(title) + '</h3>' + status + '</div>';

function announce(message) {
  const notice = document.querySelector("#announcement");
  notice.textContent = message;
  clearTimeout(announcing);
  announcing = setTimeout(() => { notice.textContent = ""; }, 4200);
}
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
function save(message) {
  persist();
  render(false);
  if (message) announce(message);
}
function go(next, params = {}) {
  chatNavOpen = false;
  if (!state.signedIn && !["landing","home","detail","login","tutors","tutor-detail"].includes(next)) {
    loginRole = "student";
    page = "login";
    selected = {after:next, ...params};
  } else {
    page = next;
    selected = params;
  }
  render(true);
}
function showDialog(title, content, choice) {
  dialog.innerHTML = '<h2 id="dialog-title">' + html(title) + '</h2>' + content + actions(button("ปิด","close-dialog","secondary") + (choice || ""));
  dialog.showModal();
}
function jobFacts(job, shift) {
  return dataList([["ผู้จ้าง",state.employers[job.employer].name],["สถานที่",job.location],["หน้าที่",job.description],...(shift ? [["เวลาทำงานที่เสนอ",time(shift)+" · ทำงาน "+hours(shift).toLocaleString("th-TH",{maximumFractionDigits:1})+" ชม./วัน"]] : []),["ค่าจ้าง",HappiUM2.formatJobPay(job, { currency })]]);
}

const jobArt = {"coffee": "data:image/webp;base64,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", "books": "data:image/webp;base64,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", "event": "data:image/webp;base64,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", "pawstay": "data:image/webp;base64,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", "petcorner": "data:image/webp;base64,UklGRmYOAABXRUJQVlA4IFoOAACQOwCdASqgAKAAPkUcjEOioaGYrJWkKAREtABpVSAvbyr/YebHU37N/af0X+V/yZ7repfMS8p/XP+B/g/bP/mPVJ94/uB/qX/uv8H1lvMT+v/7k+8j/ivWJ/Yv9h7C/9Y/zPWmehz5dPtAftf6VX////+ep/67tt/2v9j5tyZHYj/AmNZksvIv1VvcoAvrF/yPDN1O8gDgko+/+l6m31X6GPpf2Ev1+62n7d+z4ozQCNrb17izZK4M7viYI5C7i5G0yMj//8BexyCeGrWjdajhfSLAM2QfyakuwMS/Kp4w8cLBZKPzLbLzb3ckrOwwEoRZ/19hcb/8w8CRc41ZZT7oHNqiKXQ/75+VmmZUCcov7WjffVuVExhZtlGqN11eNYSiyT1X6bxG3Q9n6GBMBSYke+pwQyzg70JE21tfKPBgF5APguiazyVNUIwzYkSlQLkjpcPQ3Vh8k4fjrjZs2LZuKfO7La9bwxjwbf+FiLu+BtyOL1oolSGRG/C0RSJ8GgdXOMBGamy58LFMi1LnjaYhdj/mha6lcSa0Q/tFdj7YHQSbJNr6QYKj5KyDB4u+MDsTDrxnSQOhaPkxF2J81zcJED4MQGbmE10RZGpxfMb/5y3hBl0cw/4EH3BO80gQWlHW8U7EAAD+/lXQDJF2UlsZLbauwdOH5mrLPXs0X+vQlTa0yMEa1kSCFI5hYNb6IADfxn0KUvpBMGgIugN/L7KEgN6TVmDWwRbHOWvIxryqG5p7WUKVzAADHr3yP+h1i685qz74a1inPtUeRnXtLzsNkCJGaHSC0f3PoA9aTP2ry78cQvkBYRKR9mSX9gZsqRGwFmVADxqF0XqvkRN1yoNbdUAcYme08RT4ec0sBaZbvVeNYHfcWpTZp2MZnBugVL9w0flYQZxtkrS6v4mZ0kW3Umw7ib1oGy7JqC8F/7PElF1NdxA2cwQBp2TciEG3S3GdF/sdpwk5zXqJkv40K6xR4wchMCJ4iB75o6hUycCq0OWzPt9VHARRjGfJ5+9ZIvlQ8oGZVoya8BQu5T0NhgfW7K49XLD8W/WgvZhUInNvJX+wGtB5vw+UYn6tg3X0y/hbITw1lqut9uBDG+CDDhBUTqn5V2VCoVmpV7UOdO8S1kKlcX+Bc/W+u8Kwxp/8w/vmwyxMU+6v9RXjG9NyCRzTKpJ7GqkMXV3RE23FkbVq/3KG54Q/izLKQcyHpHRe9V7AzyKyAzMTLbL2RwKi7Qnj89Z4uIyaVeSan+Pfzk5GXyg3onNkiDZbeQoKvaGT7iF4+os/BRQwyoLTLf57zIuVMOvxTJ5ftU3djK17nMdm4HiM4Smn1UEJfvmsD2MXpEIhlLaCs4HIiSEXpfOmmTte+Y8+ddfjPKCluGO/Zu4CvB/4hLe+pMi9kzoD2sZ6qnRC1iS7fLSI6NJGEitwLxob6f0Qcz2OAm/YB1pT66ClwXHwc+kC2Q2VAoOjUgdd4ZkW/6s+jnrT/nDVhK4gDKAv+pbxCLhYcWP8E4fwbmKxy1DrX/hmiZvPk4I3Vg04q0wlWu+N8RevTtqqV/FsV7QyiU+OkJqey1YItVMJT/T6YdJL73qhlrT9KcKaGStAWvQRaFlZP+yPGUpc5IjAm28dRmoN1fZpOVmseh1bMNEdQWEjxlBftHogT9ZjYSuXHK00yOVjPa0V6lPDP2lg8do+VO9PPyqkw7DFFrFBrxUPnO81/ipJd3QlCKJ2EMuKjxHpMH1gI2LFfXAI1+PhYxZzOp6TDi/jD6T/xh6HFgsjt2hL1blDRxPgQhhZSbdefSEWwI0Nc6gdtt+X73PNLFysQ0iWosq8psofYyjJOg6Hm/BkSV9U8RMxK7/3xcdKpfC/fp9/Hl3EMGG/AtnCf2a+pEc1cvcr46Ir0APyQKrRBppZj1JOC1NNkK2mG+fG8YaFV9m8dGeGmyq+3y44yWLchw8Dou8gkBvX502agIrjB+qH983E9IdAA53tL5vmbCRfm9G6rMV039YOlki9sw8rEuRoOCpI+h7NXxbZtPmv3nyL2WKRGy5HOT0UwRdfyMe47EqPEbcttXRobhlCvxGr7IjJsSAliL25liHXg75g5nazjbdRbIBIUJQ8cdCP6cL6GPllOLWt38BL1rmOFA4h8s8FAgV9MO3INCgnLQmK3JhOiS0uKY8hPoPVYaDQA5qSGNWmgHvbOrqFbyVZoelKK4IYZ/yK/sZ4IYhGnQ6MABX+tUhsc3LNs5Pka3nFS859CVqA3v+sx6nFomIj8j02RSycXuSg1YtCLvkqqE3Mw+smrZlF+5w8ojhT6tmzu5bxe7lZ5Ga3xA2uJ3UBsxpFll3x3ZqSRufRmPi48lMcdSXHaZw6QpEDSxWZD1axwlCXR+46vYRZko0UVOj7zx/WvF8ffnKrtzjD48R5aMQsVBlTiMqRi6MZMxG14ec+7+diJ9qYIn7FTdp8ITBJTRgCaB1RGvWvBbwWE7ttjOWpqOZUWJEd2jSbcqdFS+vA6UVb9EeF+8jZTnCxs5zMKcpV5AFTYnhy5isKdWBXo9ZYQfqNrLZ+OvFs42C3Jo29mxlPCIyQ25T6Er8oH0fvNtcJ03aQWRzFV5K8yXFJ3jC7QlZ28b+e8SwQ7yLGGAW3oU4oPeeKe3vAAmjYfGY/2s40jbgu+wWC9zKhBC+qdVpm00lFD8jnFWV7xCS7uc6p/QwQW8QY1pW5lhPOcT8Tw4swfeY9B/7zPwswWuOfMsrYN4ghXoKIHCBYhaf7cGC/Rf7xvdX0mSAeW6AoVJfC3zE3BYYb0ork92Rp/+YRW8zMXq3bobPBQ39CyGn0JnhEzuVfRhVgv1Vv2DOtndzMW1xRh2GVorv5Zx8mow/RbuldZGJHDmfDyDxACc3c3CCuHvTAqc6FRrXRvaKVyHx9G/bCj2havjVL/tAldJrCcJ1wyWbctAcWFb5UsZKQ+EkH/H86IHd/C878Snb7U9Y32tWmUj3r4euGU8vLbn2shuif+93znp+RICwDMyPO6b/JibAKosYXwDBzTvQIZByx+zBy5+h3JpSzrZxkLE570YHdAFMRgTBtAQum/xTL52IG/JpRlE0iUkiVj5cmiXVUixab80wFJdcFswZXYx7+z03I0Ym9qpq40TmB92t7q1NQZC6L3gs9c5i9k2MxnwA5OcF0P+sYSHsTuTWstiCBVHxulMh8AAuZ1jpruHNkY/KP1ewP38Mn+ZAQi94ngCbcrtD5W0MhWmSx4x+ip/jo/N0tYgRxbvhS9CLdPtj59ir4Q2RcHaGnWKa1egf6VFLm+F0oAZJBIVIfnTxGl0NjWexU9Fwl0MCJZqUWid5G+9RELXl1EX3HIMXTshHnYPsWnZkOBrENnk2UJtzTLjpunLY1ds9EvDS7Fg636/e2v86AhQPMHAEzKakSTtE6GKkTmvBVdKIfE1k7ztWXEHC09OmOVFX4xr5h66lrz6kO+G6BhL8n2R3Dy3CtxLkUw/pE4sz2nyosje6/fiEETH/ru7oOotTjJfXqxwbspk3w4twrcL72BL4tvP+tz8U3nw4qZqfZPEj3EYGKKH5JeqT3bA1BwHJ7BNzscvHzbGXpfH0lJ9hQUbEMK9SYz/vbvP7XeFwnsCkM4b/IMgYkptIAQHYkL+HZi/RpxraOPdX5obWvsfHrKqO/3Z7IhKdTa9t27MYWHOcZ+Cctzh3+mwWf/zAI8Z2a225v1UQbqynz/rGVcP+zvfffpPgR3Rz2xBMgsI5Wl/oNXWl93S7St0T/FIxohftoKzQ0knL6VOvNIdkaupFF/SadER2+25RMelTWV8Zzfd/eguq9vCQg/tRI9FSX6u9gIxDjPXfmVV8pFcQK0gd5s9xTwJd3h1WlDJka0FU7KQU+gFQItTT3WtU1TxGgn7x6h3mBoyDsMliD+iTtquwKKOE5Vih+0/h31W+PsIj/VhRoFz1LMoG3hFhaEjuUiqtUrXSTG7m9OXKhmtdOmt8Tuzjrv4SFW/C4ftHm3Sme8qGSBE9/FyiBcGE68DQmGcfI6z4NXYYF+mnGFT2O0x+2z2bBaxehcQjlEhqmA6jSu6QH5+j1KFvnuy6+wfjilViEOcTpot7OOCJnejHoSxkvwDClwpCvmp+i+CF1pQHg4PJP7RC7AEQSp/6aLiOjqZ5EPpc8A/UC0NmdvYwyIo0NuyOQytoMFZ7LCXWKcI6iOHTjdTvlGnTeFycLY8Gm1ZcGiATVj9GLdc1nzxhOqi2n/FKlLlJmozSojRVI2a/JfsZ7aeci9XhRcrYPLR30Wx1eh/93pyMujDpaVH6Y7mG4L3o0jNIltsNX/v2k8kQYArwSTMYC07G6p2ilEukklBBBEttNo9pnVVh5P/TwAAFAnz6EZ5EELBnrX6kg92gQUCjYVqr9/uP2T/24ylfDO4ez/JTOQGNXGqIjHaTnHCixwcrGy2dbkX77JJYVD6L/O1Y9Tlr3YwU6qJrqAKfACebD0rpIrsyu0zj8TxVocBEi5H0K9EYXu2Ivr+Rympq9yZYoqRRyoYO0jc7NIWtHJDUwmQArdBef6Ug2zti2pBdC0uuw9fBe/BWgl6SwZ95Q34BB8ZqYOybEB9dznVzX+DeINI73BckNkSXoC/yRc7TEijjL3r7kPOXTYxtc2idnkcu/XV2VC25FyVe6rwukkMTfh+GYv4dSm1XfA6wnYxNR6WwVklFXvf4T+ZfJDTjeE4GTlSoRARChuLkUrSRPB1mjVQDYEsMhCk8kCBBanzPrZ1y86MIJpb78GtFPUx88t+Tb1Y8RKv0KBkY7DycX3+ah6AwMOIoAGy+M9dTpAJdIs7HAdfQ0+USMONdNuiYar8RdAfAqGuMF7j41iW93iUOQ3k+wUFOm3YK/L7Bn2n7+wdAeAEW9ts4KwxsjOoKSq3Phb9uAAAAAAA==", "campusmart": "data:image/webp;base64,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", "campusstudio": "data:image/webp;base64,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", "learnroom": "data:image/webp;base64,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", "sport": "data:image/webp;base64,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", "print": "data:image/webp;base64,UklGRlAJAABXRUJQVlA4IEQJAADQKwCdASqgAKAAPkkijkSioiGTaSW4KASEsQBqgPkwDzA+6+c1Y/7d+KuQpJ92IfsP6x6mf9v7Hv0f/xvcD/Xj9bus35h/1X/5n+393T/F/tN7n/65/dv2U/xnyEf07+9dap6E37e+mp7SH7s+l7eL31r7KunTPlfz3ELtZ/5zfZscf47w09T7v75S3KiTLf7P5930D6fvpP0Z9+ANMINvfmg5g7LCp7eygHm3AkXLBoc4/6zPH74XOeQmTf7IHm/ODsbTAfDv4eEOQTSODscfHrHrV0pNGRyogqnvIT7RpaqFPCImVSpSMveaRFgvfyghUmOiFeTqH8fJYs1hp5hF8Xz/SBIkfssRbPW62DkLGmGnIBrpMyIUECn0ELOQ0XDVdhRsJbEjjFIP9O11hUGD0NLsud3zyT6DtFC02rt2wpFR3q/6Wvpmil5RDRBeTQuyQXHCt90/XrRKBCdjJwYFDnJmZOlAMAD+/cCAk/uf8ejLP8Xb/ExZKBaPBM5/GCH3S5uYwJJOg7ntJpij/AvLeXr1JTN3jcKtHfgTGpDPyXDX9mxgAFBDnUXSL1eYqvth7hxv1OBV3EXPaeA3dpOJhgOQPpx//7QjwZrXal0XHFAhu+IbffE8Ec5OLXDvZYOt9W+/6n/37Wj/Bfw5R43pVOLCrvgbswstOmv2KOjZMlqfTYLJ88q82aZdY3HMzYNI9ao+XBPVFxnp2lp9+khs4PqbzkmEG/2K8D/6V3YX2Uxqco87xZihZpOisXtH5kRHomKhtzlsqslenZScpkZIzotTE+um4H7Y6gD/bke5ql7vPNA7j4UEKTn1k6YH9K/BScDtXDjRItoBpmSsRLjCJld81+SiaVDKUuDyqlivosROHQSXzilseKIzyLRERQLw7HM0Av+1/cRKOEjdlMn3pvFtjUDF8wE8NUlLEeMVyg5f1a17Orh6nqKlrB1mc1rN+aUzjdsy8W2vRmh3DyIGZzPFswvmnrZyYT3cfiIdiyYw9WPGLJpJLZXSNHn0dL0B6MKpNCf4sFo0BCYO4nzjAWQR1pfMV7GCrT+eltG53xBJPIJYmcPX2gRf37NOL2fkZZeOZLbZIiKWR/mxrfhiQkoBGBPVo/z5Q6of9bBHquw/5rp8ITyl9JBAMX7Lp+hR6REz5f20OyhwptiVRTV7IWtSTiY89H2WMTjfIpd24klLyllf1O1YLgfAy/fpo89FG0Kw0mpmAyzR0P7XKZzolMBLPTMsqJGWYJEi4kp5MOxGYeHPwQUZa/z24Uqc7PV9kqQAeFQAHdtlwJ/kH5p/kV45P0q8KowE6cq71Bjdf6twYMHNAECsPnwb+fb/rWNl1zFZCrpHeBjDcNkPr8EKI1XYR1SrD/Z9u5ZvAahqGwbl2mQvtVDA3qYrqAh64LhagzqP64euCrq4TIRptBruUzMzJpwPrPimX8OTLYMzu6D1UOu5mzjG1tDmXn+8slJCpSWv/FpXxrc/r1Zf5H4IQYFXsIh++iVfIIAdsAQQk8tvEa2ibR5JiSKRLK5Aanpw2MePAT0OsrNgZaT5PjLZS/GQNz1od6JgdzrWeKObpM6GEvKxsVxuxYVF/bcDcmjWwlb4Gy95ORX+kRAjwqdi8g9Tk/kuzAl0qaOagV+O0WM+OF4rwTqnDppyGGJEYRFCpN/rX/0u7zv79kWxAB4nYkZpL7wPdIMCaygMntMfvIf2LO8q9JlQup+4bJJqWw0Cx3tgi4hWLXttW6yYqE+61LLd/miylsk/1uMKE25KI0sPsjSNdyf5zOrFA4MtIow0Nkk733zYUMJln1UFxQ9f1xGrIIGUc1ptfepcf/yvPNjUfl1/sunfvn+ThgVwBgcD4Q0e7Sf5/yZ37BPeltpOutxJmzNTqSxBoY4JTWs9Yi5rzEkPCjwR9ke7EAm+xgpmNP/MsBbv+93sQZOX659BPOrmyKtsAQX9S1ua2gAr97SdrDlfKzm+9F7VbBCfqKDTYozcfs4T4oRrNn8iLVmU29BRxG6Qu+E/sflNvYjeRaGqB0AMhKl9fmLqZUopQFWHRUZCEqmBqCtY8li3I0HYnTFSDvGOrhR/kH/7NknkdB7tbNoq2f45R7kuCwy2GfaGMiTtzI2NACyAA8G/UYP7hkqGAl4WuAsyCU3uGNUW33+Y7ZluPrnw4lEqxPyxOeB6SS9oFOnjtVed6OHO2DCG4W/vrN9fEngll58HhbsmCmjPOP5jB7ImIj3O4JeMth8fb3RinJ3QfnRV+jUnGkvIvJ9KMWMDDjqEeGc1scF7DAz4uujDmktiN/MnYkwlVcRDC9sRHtldD5zwCsBQ5vTOhf2XxX3MaW0pa7V0LkLLUutbGOpMx0KLi19Hbq5mtwv736sCtnZxZ9KBQrM/x4MVIQS3n8/9eK6+stWU8HxHqR9i8N2cRGHTe7+5CiAi44MxkVx/8LnwMJJYlQRo2UxnmzzgSRFArjgn3x09eScLah+vAxMn+UOEvVOsajP8pyCmnylunaCQFgfS/VZ+TIEtklrQ/5acRBFv6bOxLEsw5fwsUMB/2y5yr0RF3UI0X+Xi6wQu8OFaQV/dDDH2sG3h0zOhA+i+uuai8iqJLOrkkxLmzs/FGcMm407UJEfjAPXGT0L/ToOIavj5NBYpurKs8Ibu6pFop/w9ZwVIq95XDOF2pIWpsVzwJ5A4GWXw8HLUfTtYoqiM159nMihVGcyq+x5Eoi5XgEXfwe5SwaWnVn9FpqWvkvLfUTc2mXWeIQb5/+OpO/2ZTeS+UT+qk8Dzo5eemzKxeEZveS0nim1zuOw+r/eZzIQ4UXJ/8WwtsYxMHfUc40k25jfuu+//Y5CQd+RKPoU82lD5+SQaMqsDVVSEcCl72fctGtdk/QNtFwO33dyBsrM9iCdnyNrjwIUo39vTitMHKgXPGCFA4NNms7bKfhKr2SCKm0EhjJcvwYuBuvP5n8QxoJUl+TyshVOQP75QJ9QcYtP7zqka6fWzI2ukIriv/fiycMmniW0WddPnH0laLH5RhSK7XjNudyeoS+FCAuiQNeWzjW4ODNZLciabZt6wHEXFjcxjbOESBOKzmOV5FWFAAtKSBjVud69YD8tn/wCe4DeNrOSh3be0ybMKkeanD9N1EgS2+WAx2kYHFDros4+iPBe07AC8dYKAAAAAAA==", "remote": "data:image/webp;base64,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"};

const employerArtMap = {
  cafe:"coffee",
  library:"books",
  activities:"event",
  pawstay:"pawstay",
  petcorner:"petcorner",
  campusmart:"campusmart",
  campusstudio:"campusstudio",
  learnroom:"learnroom",
  sports:"sport",
  copyshop:"print"
};
function employerArtKind(employerId) {
  return employerArtMap[employerId] || "";
}
function employerEmblemHtml(employerId) {
  const employer = state.employers[employerId];
  const kind = employerArtKind(employerId);
  const image = jobArt[kind];
  const glyph = employer?.type === "campus" ? "campus" : "briefcase";
  return '<span class="job-emblem" data-art="' + kind + '">' + (image ? '<img src="' + image + '" alt="">' : icon(glyph)) + '</span>';
}
function jobArtKind(job) {
  if (job.kind === "online") return employerArtKind(job.employer) || "remote";
  if (employerArtKind(job.employer)) return employerArtKind(job.employer);
  if (job.category === "ดูแลสัตว์เลี้ยง") return "pawstay";
  if (job.category === "สอนและการศึกษา") return "learnroom";
  if (job.category === "อีเวนต์") return "event";
  if (job.category === "ร้านอาหารและกาแฟ") return "coffee";
  return "briefcase";
}

const phoneLabels = {
  student:{home:"งาน", tutors:"ติวเตอร์", schedule:"ตาราง", work:"รายได้"},
  employer:{home:"ประกาศ", applications:"ผู้สมัคร", work:"ชั่วโมง", reports:"ชี้แจง", profile:"ผู้จ้าง"},
  admin:{home:"ประกาศ", profile:"ผู้จ้าง", reports:"ร้องเรียน"}
};
function mainNav() {
  const atLogin = page === "login";
  const atLanding = page === "landing";
  const atChat = page === "chat";
  const atSkillSetup = page === "recommendation-setup";
  const master = {detail:"home", apply:"home", "application-sent":"applications", "recommendation-setup":"home", offer:"applications", chat:"chat", report:"reports", editor:"home", "tutor-detail":"tutors", "tutor-editor":"tutors"};
  const activePage = master[page] || page;
  document.body.classList.toggle("at-login",atLogin);
  document.body.classList.toggle("at-chat",atChat);
  document.body.classList.toggle("nav-collapsed", !atChat && navCollapsed);
  document.body.classList.toggle("chat-nav-open", atChat && chatNavOpen);
  document.body.dataset.role = role;
  document.body.dataset.page = page;
  const nav = document.querySelector("#nav");
  const hideNav = atLogin || atLanding || atSkillSetup || (!state.signedIn && Object.hasOwn(tutorPages,page));
  nav.hidden = hideNav;
  nav.innerHTML = nav.hidden ? "" : '<span class="nav-title">' + names[role] + '</span>' + menus[role].map(([to,label,glyph]) =>
    '<button type="button" class="nav-link' + (role === "student" && to === "reports" ? " nav-desktop-only" : "") +
    '" data-route="' + to + '" aria-label="' + html(label) + '" title="' + html(label) + '"' +
    (activePage === to ? ' aria-current="page"' : '') + '>' + '<span class="nav-icon">' + icon(glyph) + '</span>' +
    '<span class="nav-desktop nav-label">' + html(label) +
    '</span><span class="nav-phone" aria-hidden="true">' +
    html(phoneLabels[role]?.[to] || label) + '</span></button>'
  ).join("");
  const navToggle = document.querySelector("#nav-toggle");
  if (navToggle) {
    navToggle.hidden = hideNav && !atChat;
    navToggle.setAttribute("aria-expanded", String(atChat ? chatNavOpen : !navCollapsed));
  }
  document.querySelector(".mast .logo").dataset.route = state.signedIn ? "home" : "landing";
  const account = document.querySelector("#account");
  account.hidden = atLogin;
  account.innerHTML = state.signedIn && role === "student"
    ? studentAvatar(currentStudent()) + '<span>' + html(currentStudent().nick || currentStudent().name) + '</span>'
    : state.signedIn
      ? '<span>' + html(role === "employer" ? (state.employers[employerId]?.name || names[role]) : names[role]) + '</span>'
      : icon("person") + '<span>เข้าสู่ระบบ</span>';
  account.dataset.route = state.signedIn ? "profile" : "login";
  account.classList.toggle("is-login-cta", !state.signedIn);
  document.querySelector("#sign-out").hidden = !state.signedIn || atLogin;
}
function jobCard(job, match = null, recommended = false, period = "") {
  const shifts = job.shifts.filter(shift => matchesPeriod(shift,period));
  const suggested = match && match.eligible
    ? match.nonConflictingShifts.find(shift => matchesPeriod(shift,period))
    : shifts.find(shift => !busy(shift) && available(job,shift)>0);
  const shift = suggested || shifts[0];
  const employer = state.employers[job.employer];
  const photo = jobPhoto(job);
  const recommendation = recommended ? recommendationSummary(job, match, suggested) : "";
  const availability = !state.signedIn || recommended ? ""
    : match && !match.eligible ? tag(match.reasonIfIneligible || "ยังไม่มีเวลาทำงานที่ตรงกับตารางเรียน", match.conflictOnly ? "bad" : "wait")
    : suggested ? tag("ไม่ชนตารางเรียน","good") : tag("ยังไม่มีเวลาทำงานที่ตรงกับตารางเรียน","wait");
  const illustration = jobArtKind(job);
  const image = jobArt[illustration];
  const emblem = image ? '<img src="' + image + '" alt="">' : icon(illustration);
  return '<article class="job-card' + (recommended ? ' is-recommended' : '') + '" data-kind="' + job.kind + '" data-card-job="' + html(job.id) + '">' +
    (photo ? '<div class="job-card-photo" aria-hidden="true">' + photo + '</div>' : '') +
    '<div class="job-type-pills">' + jobTypeBadge(job) + tag(groups[job.kind]) + '</div>' +
    '<div class="job-card-top">' +
    '<span class="job-emblem" data-art="' + illustration + '">' + emblem + '</span><div><h3>' +
    button(job.title,"detail","job-title",job.id) + '</h3><p class="helper">' + html(employer.name) +
    (employer.status === "verified" ? ' <span class="verified-mark" aria-label="ผู้จ้างผ่านการรับรอง" title="ผู้จ้างผ่านการรับรอง">' + icon("check") + '</span>' : '') +
    '</p></div></div>' + recommendation + '<div class="job-card-facts">' +
    (shift ? '<p class="job-meta">' + icon("clock") + html(time(shift)) + ' (' + hours(shift).toLocaleString("th-TH",{maximumFractionDigits:1}) + ' ชม./วัน)</p>' : '') +
    '<p class="pay">' + html(HappiUM2.formatJobPay(job, { currency })) + '</p>' +
    '<p class="job-meta">' + jobLocation(job) + '</p></div>' +
    '<div class="job-card-footer">' + (existing(job) ? tag("สมัครแล้ว","good") : availability) +
    button("ดูรายละเอียด","detail","text-button",job.id) + '</div></article>';
}
function attachLandingCarousel(track) {
  const controls = main.querySelector(".landing-carousel-controls");
  if (!track || !controls) return () => {};
  const toggle = controls.querySelector("[data-carousel-toggle]");
  const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let playing = false;

  function update() {
    controls.hidden = track.scrollWidth - track.clientWidth <= 1;
    toggle.dataset.playing = playing;
    toggle.setAttribute("aria-label",playing ? "พักการเคลื่อนไหวของการ์ด" : "เริ่มการเคลื่อนไหวของการ์ด");
  }

  function move(direction) {
    const limit = track.scrollWidth - track.clientWidth;
    if (limit <= 1) return;
    const current = track.scrollLeft;
    const first = track.firstElementChild;
    const next = first?.nextElementSibling;
    const distance = next ? next.offsetLeft - first.offsetLeft : track.clientWidth;
    const wrap = direction > 0 ? current >= limit - 1 : current <= 1;
    const target = wrap ? (direction > 0 ? 0 : limit) : Math.max(0, Math.min(limit, current + direction * distance));
    track.scrollTo({left:target, behavior:wrap || motionPreference?.matches ? "auto" : "smooth"});
  }

  function pause() {
    playing = false;
    update();
  }

  controls.addEventListener("click", event => {
    const step = event.target.closest("[data-carousel-step]");
    if (step) {
      pause();
      move(Number(step.dataset.carouselStep));
    } else if (event.target.closest("[data-carousel-toggle]")) {
      playing = !playing;
      update();
    }
  });
  track.addEventListener("pointerdown", pause);
  track.addEventListener("focusin", pause);
  function syncMotion(event) {
    if (event.matches) pause();
  }
  motionPreference?.addEventListener("change", syncMotion);
  window.addEventListener("resize", update);
  update();
  const timer = window.setInterval(() => {
    if (playing && !document.hidden && !track.matches(":hover")) move(1);
  }, 4300);

  return () => {
    window.clearInterval(timer);
    motionPreference?.removeEventListener("change", syncMotion);
    window.removeEventListener("resize", update);
  };
}

const happiuSearchArt = "data:image/webp;base64,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";

function emptyJobSearch(title,detail,next) {
  return '<div class="empty empty-search"><img src="' + happiuSearchArt +
    '" width="94" height="94" alt=""><h3>' + html(title) + '</h3><p>' + html(detail) + '</p>' + next + '</div>';
}

const landingPinArt = {"print":"data:image/webp;base64,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","sport":"data:image/webp;base64,UklGRoQRAABXRUJQVlA4IHgRAAAQTQCdASrAAMAAPjkai0OiIaETKJW4IAOEoA0I5r4V6Wfmvxu9ouzf3z8Rf2P9m+iSNV2afw/77+OPzX/z3rE/Qv/O9wb9Pv+F/bOuT+4HqL/ZP9n/d5/3H7M+6T+6/6D2BP7h/gOtP/dD2E/5J/rPTg/aT4Vf3E/bv2rP//drPEX8b+v/2H5faBX1q/fcYPyj1C/Y/+i4lTO3/A8PHV07+eaX/r/6X5uHjY+dewL+dfRI0dvTPsLfrYWb7rPbeTOqughWKAfiJSjFHRSarv/0F/FXzOxoKX27FxfJ6QJLpLABRIUCB9xRJ2hG74odAgyAdaMei4t8HaIsztcD7ZrbkOn0tuwWRxA2MV4gVu6ufTzEx9/zj7a5Hs+RelrP7t039V4Rm4J6LFgLDnbs+EE4SboW6fU2rANbumS7p1BAHohjOqfJkEfQ7xPYDx0nuTAAfC7k3PX9mfARUazZGGtgb9nBMSFlgVsB6CXy4Pqtym8+4tLcoB5+iSuYkse/leQBHw+TLgwOljZ446O6aGUC6FCM9QxcXBI8nlFEreoRs63VsCkRzEzBhsHD87MaeDt0bZSUESAY0IZkWOD3k52u/tjJJZKS6f+jZS9iwIzOB9mkVU4KVVB86vTRcwy/ME4K745BVv9deZd1TQ0+Tl7O3dy0eaux783V4w2ZfE2equfcDFjG7g0mCfls79+IdH7RYFkui1hhk1cVKZ+/rY7L6fKs9ajZ9nsA4riC+pr2LhnibkDOuDdYp0ckHMNfrDdR/er/kHLLlBhCSG3K6REwklPZ7taSDL5qgKfILSrrw0z1D1e7aNuJGItbbgp4lVUAAP7+aGATlKcaLE9j1qC8V91SXQews9ADnQUR0yzWouQEUAR81GOnKYqB9V12XyRaGwv2uqZ3FRvsO0GHji5hihCxUVdUeWrWO67kUPL84b/iApT8PD2d5GVUdLDSypuWnpyHtyS09LWEo/axMt1w6C/X/ItB2Px+qWF6kwo4nF4j0GmfJKPY4KC93rfdEG60xVlNhlTVVanmIrREmmudAPLvOSSjBwNgv6oJSaTXMZaeJKS96jEeFF6BR+pu5rTjr27lOhMXVy4QX0Kc71dLYDh5Ab5g4mXTo6YLXuVItc9Esao5EOWSSqhgbF2wAImEk0rJW4VPJ0mNhlSRLExzhH37sIo1U6qGTZ0OY27vvLF5REz1uwbkriSo7Zv4HVvKKzMrQXR9zbTXtW6uvpUn1CfiIQ/S3ztKM2XQI2JeJr8+l7axyjqkSlmaL8JmJcNSLzTWlH9sccLKNjEltbQJJxb8bmz5KO7BjvPsdMuU4K9q6foQBJK8dCTy7POJ2Ej6YwBtvqw9iZsL/LZm2jA0uTQFo7z1PE78bDilkRwBn63SJEBdZIKukRcUAsSV1+I+MQ39aqwXeThLg8ifPZ5UIY3St2olQvirX+Y5fqkuhPSNMIVPn15CTgB4sJ9egXqbwnqGPA1J0IHpwzqIY97px8t0s+xsxLU3IyoZL2iOGnTc4qwyNiCK/xxoWee0V1dtwX1+QdqmnRVxbQHzzHDQ7ZjC0QsPP+cv0Yg2q1/1cyFU3DAXW73KtTGGfZjJWffouc1+fSdax2dB/N6XuNNEboaTV0/uCSovkZ/1+r04wdDdw1QGpeGdGhoj/oH4F6Nro1pWzf1Qj1Kb9dnn4GvvOK6nnF6oojD+Vf/ozX/D/OqrfSh1y01w99+O6bHeSmMo1Q+E+V+p1JW/9VLVGkFZrI/qA+vqoHKZsv37YdQRTHY61iB7hg08qdht4Oh6ZypFN238KZWO4mOQKHoweASNXu6yHnvkN4aqDLOE46+4D3oY7nVBS8z7U1PqFLD8hzL9xZot6azPnjoByVDyrUXi6qqYh6l/MGDvk1/I7+UGN/xH5T2NmGYpAfMearzZnsbADNH6S/C0ZcWY6rmc6SzCkIp5WAmHFaHiXfSeSSqdozNY+COaUrPB2+QhkF3zVT731jvzY1W7Tm4S23XpysFvmsEsF/eHlMVid+YP5m2oleRmtuRRGNwOiF4MCvQ7jhNaHVbf7jblmE8wnY7kMnjwxnYHfK0+Z1ZpCJ1U43xFK91Fh/nOKfc6U2/J9qu6wSuHn8rnmZ+S9oonjWpNlnB2FZ7S65amJwmBx/8Th/Px/ck14bXFkEH+HXhtg1asHGXEgbDBjvXMd0rr5s0wYNBXInid98cW8YCWcrigWM4aAIbLtVx7y4q4Pi6IecX4nj441dO4nvZ+edePVdEXGOhmd+g+b8hP6cR+WDU1dTHeGm3SKYMWbNdsj8O/SU7GgdoN2/PleXBeHWyla7nb3WZ1SsxhZ/AaTOLqmvwmOhd7ibHY4LzEzAboeY9twHs5AgT4G6Skl9h/r6vjVWQGZEVuEDYwPhwE7tsP1bL/NAPV1fyKZrQisov4UeT7d+EVTO3G6rVSWkVND3g+Sr5o0cluowafVLkiNUHQg4sM2XqXd/oZcBTl9YbL2QrA790Z8+xwca7tkjaTyn0UnH5pGthspOWg/LzJl2tcn7adDnI5X6VRk40SevQkc+8v6dAljTRiI/zCU+olGX2B4kRPLCJDlE86UGcefDKzquLswnaiGKTr0lspezPxFx1NvD9G3giMKzBsepwu8K9gXYjnudTRbFFx6hAfHvbYnCjnmM1BA/4no2sUNisx9EpovlFOCcPqPc/RifoVYgNkWf7rLqVtNgZLNFboi1j5V7bIRH/Jbrx4ua0+6VpOEC7ZGA5pHHu940Mtwf5Tow3DkhGIeIEWiXe8SKMi6R8EHGY+cVb6x6TuiCBQzX0eESmk+7byQZoS5optara3/J89eHu/ZrDOa8Br3iucA+Th9MvQSGHOkJLacyvpkLcLWyfOgJKu23Xivf6NZCkiuyvkr8n7wPNwLYDrg+U2GxqOEqHF8Fx/FLZhtD7AD8IbPx47Yoh+6zSNP3zEo1sC9aNFngE8sVs4raxrDWBMk7mVTfLtD9fIEaAmIGpJJ4hxGtIlDx0M/x3CEtvN7bUK0uedRnRyh8qC2o3e8p9iM3cux/vTOQwWvZYP8Wo8rK6rCppdWlsFLwNLDTXT+tHuDnO4G38Qe7Iyw7XXe9t+EHduLsT+5u7s2GY9Nrju+gY9imgxdz3bYz9IrTSVedWVf0zU5DhLtugfOxDpeD8HC/MJZbH7jjT8ubwyV+p/kry9cFU/VmS1I6vjvqDbCmxh5rr8faS/31Z6X8JrwWpOEM/DgKVa2U+yjZbUqHmYtRgJiFqMV01Xuyvm4kYfFSdsavqHfGuBU7jKzfulWTiQ6LbEylVUb+SVIy/Q2A5o9JSdW4ZamG8MdB/EK5Hey/Bpy9CfhpWwq4Jv3noIBD5Lb1aZyEAHqtYiIgsruE30BOyaOc7XcCFJK7cU7GKVdcGPmNcc/o8C570JoDjfgkwNsO10sGINxPeJe5C750Xftjmgrxpq1luKON05/RrAsfAgPwKjy1g6L+Cisr0m7P/pKkpcl41VCOuPopgcnQ/9Tk8KMfVpdC5uyQURLidXubLhvDTOqlQPuSZ9Nfttn/0fnFsQVicrr5CNld1Kja8InwZ9tNS6ZAf/ypi7VySyldiTdpt1xnvs7PL4N8UR8/4hsYj62OzXqXZaqirZW3de7a03GD+Qi7f1GCC+XekADs6KS+mm0hJf/civrA9tfdJF5NaoD4sOneAtTfjer2q/VQeTwO+qE4HpLE2QLLARr/Z4fYG8aoZXug9+LnFi340JHZ20rVSY17wrAjPzfIwwUhTyd7IR+eTq5vh7I9I5YwrZP8TLu0irGBnhGEPmjh7WrIadFFGPqRtJwh25jz5Kb+5celY6xFy5PlK539euuS7Zlz5UVT7DL+As/e4JoYsY/2Ltihc7wRmPpcuC7wJzLKhfG5JHCWNhYRTBV7eNF1sN0w0V2oYe1ewjKWzJv1s6KK8UhqqeijqX1DioWykRTPpiuvOGtx2w2i+BQNXry8+h4cUkDxq2sSm4jWellvMZW6O8n1qIx+09/IAMuY0FSqBo886YcxCnzQEFdqQ9O6rKOlwBXT6twd05DoeRPj+NYCETG6lUD/SeVnXW22xPKV+P3eAtprQ8y+pLu14hrwvv3n41JygvD2ub4+kbdxzdgVUvG6CDLP0Iuvg0juZ8GNKSW2vWQhLxQOX3HMy8li0MTGEEg02xqF+drqnAIDuilTKxC/Wcr+LTvo82V0HCbBBlFL61LwvxxI09AwzuN6bgNwAYLM5yJFprT832g96cD0KM5LaOmAxVLc35MrvrasFlur4WtGJ8M1S1lyUMNpFhKc2QiFy3pm8i5Arl3dFb43+J1XnunN0ClvIwZAQSA2JE8ZNvXmj8egBHw2VO3ZAvJnJ45wc110Jd14sSCaOQ5sm+X394K5AfOSa7sbkgUoKsTvfduQr/FDlpJGwi/AdnmAPIKbgvif8AHBKx+rAftTJ8OwGMHfL00Yi2ceSolOko0ccfLXbQfyCcUbAuzWZMax1PbLpJT/+EUp7PMPqfoFxRmu/Fnjb1jRpdum/xj2Da48F9zVZhCX3gfKoTdNZYEsX0L6Xo1wA3NWoEkGcjMw38+YyzKDnSVyNNBGhkwn0XhurpEjenwHY+xdd24HeXDcpxhItpV7rRtjb8f7TghuJTxWBIAgteYNNK7PpV+FkUYIq8GPcJ6okx/JnVVio2uqrufVTAxrOLZeg5DFoQh/4KVb/F5thM3rngcgn74rzF+ybwzylPUQd9x/y6xF/A1cgTKMOZ77bUzzWsCKg5r+oYBtOiByqWQkkOaIrSDAw4xMgsWlFdRDwJGFRnz8v+CFFn005KLwKK10kAM4+g19yZeOwldPnmboLfYxYZVUbchuhfZAj5h1O811UGHlXwf5Amoe5WAWBqAd15SxpznL/XLLdnC7Dg56iQ3GykGf5ze5j11CHwnElbNqdy+yKsdUqBU8RdPmK6gROX3zCx+Bt5ungXf21zRgN5FOD+WWpib8X/l1lwXt2yTaHlCSylNotV5jsjJ7uEz+AUCBxZbFu/r8XUAcYcaH8xZBVPcZ8yw5xeB3lcJIr0nRRQ9A1IVspvzcy3FFmlmC3kEeNv5iBZB6nNL+fUrHHmkutn7wkTKxcfUCUMWe07TPHbC8GHtr2NhKih7bO9Fg38cViRGk1s9HKwIgtpxMGR+IoDwTEVgQRZNFXPNgpVvh8JUGLO9AN3b5HUw0k8OB23bzRowaCArkE4ir8PN7qWVJL5uC6HOigSS/ijAKAwao8PxEeAKebD3yCfqtF8hjJeds9Ee8VC/KHp9NaC21JeIdzzBbNNCqMtwt6+kmzo9LUcp+xNrL9J43c6D6wEZ0iZLwDoQHLiRj3wNKg0CJfN4ZyO44G55ZZrwcfsU4nErbFEKDClsq6rcCuLHiHWMaJhknh2iEMjCleIOKKLZHZssYBo2K15eV9YQpYlkqWxYkDY0U2Qvf3+Fo6S523yOwXrZwK5Y+J0AD0ul+94PywbKv0BCbzKO5RbcKVOqYr7Wn4NyzRP1Ey9Zrd43t9gLj8W0RSmFhuXi4GBg5oATeNituuBPOkPQjMrkSjPv6FsH1AUd/zKp6KavQLjG88fy5PmjHGpsuT/j2RQdGqIo8tSLr4/PMRnGpJsyCRbDpk5nU1KK/oXduCDo8GSj8f5CFQsJj3u8X4kzaVOlkbQDIM9Gzey83djpt8hsSsdKCyP4iNWe5vGPOG0mL9Mq+xCBjxiydUIoT71eTapM9eEU/MvfAidV/eTCWyer5kE+GGOYU7c6eW4EvvaTFPZQ/+YBioJCZzVC60yghHbMg2Rh2LFonlMjQMReQtc+UAwqoMSfou0BXjmuuA6GX8oAM6WrC1gBtn4rSsHlkZMiAaDUwlIAFR6cI3joRVtWZ4fLeTRpFQDXGpfMsGGyG9Ri0mRBwzbu0WO8uRKGVqd/bQ/kWx69ZEgwk3ATB+iKB6oCfpA8hFYAAAAAA==","remote":"data:image/webp;base64,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"};

const featuredJobPhotos = {
  "demo-event-photo":"photo",
  "demo-walk-dogs":"pets",
  "demo-video-captions":"video",
  cafe:"cafe",
  library:"library",
  "demo-shop-pack":"retail"
};

const allJobPhotos = {
  cafe:"cafe",
  "demo-cafe-prep":"cafe-prep",
  "demo-cafe-stock":"cafe-stock",
  "demo-coffee-orders":"coffee-orders",
  event:"drink-booth",
  "demo-cafe-menu":"cafe-menu",
  library:"library",
  "demo-library-returns":"library-returns",
  "demo-library-exhibit":"exhibition",
  "demo-library-welcome":"library-welcome",
  "demo-library-data":"library-data",
  "demo-library-media":"library-media",
  "demo-office-excel":"office",
  "demo-it-support":"it",
  "demo-walk-dogs":"pets",
  "demo-pet-sitter":"pet-sitter",
  "demo-pet-supplies":"pet-supplies",
  "demo-pet-media":"pet-media",
  "demo-shelf-stock":"shelf-stock",
  "demo-shop-pack":"retail",
  "demo-mart-cashier":"mart-cashier",
  "demo-copyshop-binding":"copyshop-binding",
  "demo-copyshop-packing":"copyshop-packing",
  "demo-copyshop-counter":"copyshop-counter",
  "demo-copyshop-check":"copyshop-check",
  "demo-video-captions":"video",
  "demo-event-photo":"photo",
  "clip-edit":"clip-edit",
  "demo-sports-frontdesk":"sports-desk",
  "demo-sports-equipment":"sports-equipment",
  "demo-sports-race":"sports-race",
  "demo-sports-design":"sports-design",
  "demo-worksheet":"worksheet",
  "demo-homework":"homework",
  "demo-learning-materials":"learning-materials",
  "demo-activities-checkin":"check-in"
};

function jobPhoto(job) {
  const photo = Object.hasOwn(allJobPhotos,job.id) && allJobPhotos[job.id];
  if (!photo) return "";
  return '<span class="job-photo" data-photo="' + photo + '" aria-hidden="true"></span>';
}

function landing() {
  const categoryLabels = groups;
  const availableJobs = state.jobs.filter(job => active(job) && state.employers[job.employer]?.status === "verified");
  const queues = Object.keys(groups).map(kind => availableJobs.filter(job => job.kind === kind)
    .sort((a,b) => Number(Object.hasOwn(featuredJobPhotos,b.id)) - Number(Object.hasOwn(featuredJobPhotos,a.id))));
  const featured = Array.from({length:Math.max(...queues.map(queue => queue.length))}, (_, i) =>
    queues.map(queue => queue[i]).filter(Boolean)).flat();
  const currentKind = selected.landingKind || "all";
  const cards = featured.filter(job => currentKind === "all" || job.kind === currentKind).map(job => {
    const employer = state.employers[job.employer];
    const cover = jobPhoto(job);
    const shift = job.shifts[0];
    const pay = HappiUM2.formatJobPay(job, { currency });
    return '<article class="landing-job" data-kind="' + job.kind + '" data-card-job="' + html(job.id) + '"><div class="landing-job-cover">' +
      '<span class="landing-kind">' + categoryLabels[job.kind] + '</span>' + cover + '</div>' +
      '<div class="landing-job-body"><div class="job-type-pills">' + jobTypeBadge(job) + '</div><h3>' + button(job.title,"detail","job-title",job.id) + '</h3>' +
      '<p class="helper">' + html(employer.name) + '</p>' +
      '<p class="helper landing-job-place">' + jobLocation(job) + '</p>' +
      '<div class="landing-job-meta"><div><p class="landing-job-pay">' + html(pay) + '</p>' +
      (shift ? '<p class="helper landing-job-shift">' + icon("clock") + html(time(shift)) + '</p>' : "") +
      '</div>' + button("ดูงาน","detail","text-button landing-job-next",job.id) + '</div></div></article>';
  }).join("");
  const categoryChoices = [["all","ทั้งหมด"],...Object.entries(groups)].filter(([id]) =>
    id === "all" || availableJobs.some(job => job.kind === id));
  const categoryFilters = categoryChoices.map(([id,label]) =>
    '<button class="chip" type="button" data-action="landing-kind" data-id="' + id +
    '" aria-pressed="' + (id === currentKind) + '">' + html(label) + '</button>'
  ).join("");
  return '<section class="landing-hero"><div class="landing-copy">' +
    '<h1>งานพาร์ตไทม์<span>ที่เข้ากับเวลาเรียน</span></h1>' +
    '<p class="landing-description">ค้นหางานใน มน. รอบมหาวิทยาลัย และงานออนไลน์</p>' +
    '<div class="actions landing-actions">' + navButton("ดูงานที่เปิดรับ","home","primary") + navButton("หาติวเตอร์","tutors","text-button") +
    '</div></div><div class="landing-art" aria-hidden="true"><img class="landing-elephant" src="' + campusClayArt + '" alt=""></div></section>' +
    (featured.length ? '<section class="landing-jobs" aria-labelledby="landing-jobs-title"><div class="section-head">' +
      '<div><h2 id="landing-jobs-title">งานน่าสนใจ</h2><p class="helper">ตัวอย่างประกาศงานใน HappiU</p></div><div class="landing-job-tools">' +
      '<div class="landing-carousel-controls" role="group" aria-label="ควบคุมการเลื่อนงาน" hidden>' +
      '<button class="secondary" type="button" data-carousel-step="-1" aria-label="งานก่อนหน้า" aria-controls="landing-jobs-track">' + icon("arrow") + '</button>' +
      '<button class="secondary landing-carousel-toggle" type="button" data-carousel-toggle data-playing="true" aria-label="พักการเคลื่อนไหวของการ์ด" aria-controls="landing-jobs-track"><span class="landing-play-icon" aria-hidden="true"></span></button>' +
      '<button class="secondary" type="button" data-carousel-step="1" aria-label="งานถัดไป" aria-controls="landing-jobs-track">' + icon("arrow") + '</button></div>' +
      '</div></div><div class="landing-pin-filters" role="group" aria-label="ประเภทงาน">' + categoryFilters + '</div>' +
      '<div id="landing-jobs-track" class="landing-jobs-grid" tabindex="0" role="group" aria-labelledby="landing-jobs-title">' +
      (cards || '<p class="helper">ยังไม่มีงานในประเภทนี้</p>') + '</div></section>' : '');
}

function recommendationSummary(job, match, shift) {
  const skills = match.skillMatches.filter(item => item.status === "exact").slice(0,2);
  const related = match.skillMatches.find(item => item.status === "related" && !item.necessary);
  const reasons = [];
  if (skills.length) reasons.push("ตรงกับทักษะ " + skills.map(item => item.skill).join(" และ "));
  else if (related) reasons.push(related.source + " ใกล้เคียงกับ " + related.skill);

  if (match.breakdown.interests === 20) reasons.push("สนใจหมวด" + job.category);
  if (match.breakdown.interests === 10) reasons.push("ใกล้เคียงกับประเภทงานที่สนใจ");

  if (!match.profileComplete) return '<div class="recommendation-summary"><strong>แนะนำจากทักษะ</strong><p>' +
    html(reasons[0] || "") + '</p></div>';
  const score = html(match.totalScore);
  const tier = match.totalScore >= 85 ? "high" : "mid";
  return '<div class="recommendation-summary" data-tier="' + tier + '"><div class="match-heading"><span>ความเข้ากันกับคุณ</span>' +
    '<strong class="match-score">' + score + '<small>%</small></strong></div>' +
    '<div class="match-meter" aria-hidden="true"><span style="width:' + Math.min(100, Math.max(0, Number(match.totalScore) || 0)) + '%"></span></div>' +
    '<ul>' + reasons.map(reason => '<li>' + html(reason) + '</li>').join("") + '</ul></div>';

}

function recommendations(ranked) {
  const student = currentStudent();
  if (student?.hideSkillsBanner && !HappiUM1.skillList(student.skills).length) {
    return "";
  }
  const topJobs = ranked.filter(({match}) => match.eligible &&
    ((match.profileComplete && match.breakdown.interests > 0) || match.skillMatches.some(skill =>
      skill.status === "exact" || (!skill.necessary && skill.status === "related")))).slice(0, 3);
  let content;
  if (!HappiUM1.skillList(student.skills).length) {
    content = '<div class="panel skills-banner-dismissible"><div><h3>เพิ่มทักษะเพื่อดูงานที่เหมาะกับคุณ</h3>' +
      '<p class="helper">เลือกทักษะที่ทำได้เพื่อให้ระบบคัดกรองงานที่เข้ากับคุณมากขึ้น</p></div>' +
      '<div class="actions">' + button("เลือกทักษะ","edit-recommendation-profile","primary") +
      button("× ลบส่วนนี้ออก","dismiss-skills-banner","text-button skills-banner-dismiss-btn") + '</div></div>';
  } else if (topJobs.length) {
    content = '<div class="job-grid recommendation-grid">' + topJobs.map(({job,match}) => jobCard(job,match,true)).join("") + '</div>';
  } else {
    content = empty("ตอนนี้ยังไม่มีงานที่ตรงกับโปรไฟล์ของคุณ",
      "ลองดูงานที่เปิดรับ หรือกลับมาตรวจงานแนะนำเมื่อมีประกาศใหม่",
      '<a class="secondary recommendation-link" href="#all-jobs">ดูงานทั้งหมด</a>');
  }

  return '<section class="recommendations" aria-labelledby="recommendations-heading"><div class="section-head">' +
    '<h2 id="recommendations-heading" tabindex="-1">' + icon("briefcase") + 'งานแนะนำสำหรับคุณ</h2></div>' + content +
    (HappiUM1.skillList(student.skills).length ? actions(button("ปรับทักษะ ความสนใจ และเวลาว่าง","edit-recommendation-profile","text-button")) : "") + '</section>';
}

function matchesPeriod(shift, period) {
  if (period === "weekend") return ["เสาร์","อาทิตย์"].includes(shift.day);
  if (period === "evening") return minutes(shift.start) >= 16 * 60;
  return true;
}
function studentHome() {
  const openJobs = state.jobs.filter(job => active(job) && state.employers[job.employer]?.status === "verified");
  const student = state.signedIn ? currentStudent() : null;
  const ranked = student ? HappiUM1.rankJobsForStudent(student, openJobs, state, {
    available, classConflict:classConflictFor
  }) : openJobs.map(job => ({job, match:null}));
  const query = filters.q.toLowerCase();
  const filtered = ranked.filter(({job,match}) =>
    (filters.kind === "all" || filters.kind === job.kind) &&
    (!filters.category || job.category === filters.category) &&
    (!query || [job.title,job.requiredSkills,job.skills,job.category,state.employers[job.employer].name]
      .join(" ").toLowerCase().includes(query)) &&
    (!filters.period && !filters.duration || job.shifts.some(shift =>
      matchesPeriod(shift, filters.period) && (!filters.duration ||
        (student ? match.nonConflictingShifts.some(free => free.id === shift.id) : available(job,shift) > 0)))));
  const categoryList = [...new Set([...HappiUM1.JOB_CATEGORIES,...openJobs.map(job => job.category).filter(Boolean)])];
  const tabs = [["all","ทั้งหมด"],...Object.entries(groups)].map(([id,label]) =>
    '<button class="chip" type="button" data-action="filter-kind" data-id="' + id + '" aria-pressed="' +
    (filters.kind === id) + '">' + html(label) + '</button>').join("");

  const homeHero = student ? (
    '<header class="pagehead pagehead-illustrated home-hero-rich" data-page="home">' +
      '<div class="home-hero-copy">' +
        '<span class="home-hero-eyebrow"><span class="nu-ios-dot" aria-hidden="true"></span>สวัสดี, ' + html(student.nick || student.name) + ' • งานพาร์ตไทม์ มอนอ</span>' +
        '<h1>หางานพาร์ตไทม์</h1>' +
        '<p>รวมงานในมอ หน้ามอ และออนไลน์ ที่คัดให้ตรงกับทักษะและความสนใจ โดยไม่ชนตารางเรียนของคุณ</p>' +
        '<div class="home-hero-pills">' +
          '<span>' + icon("briefcase") + '<strong>' + openJobs.length + '</strong> งานเปิดรับอยู่</span>' +
          '<span>' + icon("pin") + 'ในมอ • หน้ามอ • ออนไลน์</span>' +
          '<span>' + icon("calendar") + 'เช็กเวลาเรียนชนอัตโนมัติ</span>' +
        '</div>' +
      '</div>' +
      '<div class="home-hero-visual" aria-hidden="true">' +
        '<img class="home-hero-art" src="' + campusClayArt + '" alt="">' +
      '</div>' +
    '</header>'
  ) : "";
  return (student ? homeHero + recommendations(ranked) : "") +
    '<section id="all-jobs" aria-labelledby="all-jobs-heading" tabindex="-1">' +
    '<div class="section-head">' + (student ? '<h2 id="all-jobs-heading">งานทั้งหมด</h2>' : '<h1 id="all-jobs-heading">หางาน</h1>') + '<span>' + filtered.length + ' งาน</span></div>' +
    '<form class="search" data-form="search"><label>' + icon("search") +
    '<input type="search" aria-label="ค้นหางาน" name="q" placeholder="ค้นหาชื่องานหรือทักษะ" value="' +
    html(filters.q) + '"></label><button class="primary" type="submit">ค้นหา' + '</button></form>' +
    '<div class="filters" aria-label="ประเภทงาน">' + tabs + '</div><div class="period-filters" role="group" aria-label="ช่วงเวลาทำงาน">' +
    [["evening","เริ่ม 16:00 น. ขึ้นไป"],["weekend","เสาร์–อาทิตย์"]].map(([id,label]) =>
      '<button type="button" class="period-choice" data-action="filter-period" data-id="' + id + '" aria-pressed="' + (filters.period === id) + '">' + label + '</button>').join("") +
    '</div><details class="extra-filters"' +
    (filters.category || filters.duration ? ' open' : '') + '><summary>ตัวกรองเพิ่มเติม</summary><div class="filter-selects">' +
    selectField("หมวดงาน","category",[["","ทุกหมวด"],...categoryList.map(category => [category,category])],filters.category) +
    selectField("เวลาทำงาน","duration",[["","ทุกช่วงเวลา"],["free",student ? "เวลาทำงานที่ตรงเวลาว่าง" : "เวลาทำงานที่ยังมีที่ว่าง"]],filters.duration) +
    '</div></details>' + (filtered.length
      ? '<div class="job-grid">' + filtered.map(({job,match}) => jobCard(job,match,false,filters.period)).join("") + '</div>'
      : empty("ไม่พบงานตามตัวกรอง","ลองเปลี่ยนประเภทงานหรือคำค้น",button("ล้างตัวกรอง","clear-filters","secondary"))) +
    (student ? "" : '<p class="guest-sign-in helper">' + navButton("เข้าสู่ระบบ","login","text-button") +
      'เพื่อดูงานแนะนำสำหรับคุณ</p>') + '</section>';
}
const workplaceInfo = {
  pawstay:{"landmark":"ใกล้ประตู 4 มน."},
  petcorner:{"landmark":"ถนนหน้ามหาวิทยาลัย"},
  campusmart:{"landmark":"ใกล้ประตู 5 มน."},
  campusstudio:{"landmark":"รอบมหาวิทยาลัยนเรศวร"},
  learnroom:{"landmark":"ใกล้ประตูหลัก มน."},

  cafe:{landmark:"ประตูหลัก มน.",phone:"08x-xxx-0101",facebook:"ร้านกาแฟหน้ามอ HappiU",line:"@happiu-cafe",instagram:"@happiu.cafe"},
  library:{landmark:"ทางเข้าหอสมุด มน.",phone:"05x-xxx-0102",facebook:"หน่วยงานห้องสมุด HappiU",line:"@happiu-library",instagram:"@happiu.library"},
  sports:{landmark:"ทางเข้าสนามกีฬากลาง",phone:"05x-xxx-0103",facebook:"ศูนย์กีฬา HappiU",line:"@happiu-sports",instagram:"@happiu.sports"},
  copyshop:{landmark:"ประตู 5 มน.",phone:"08x-xxx-0104",facebook:"ร้านถ่ายเอกสารประตู 5 HappiU",line:"@happiu-copyshop",instagram:"@happiu.copyshop"},
  activities:{landmark:"ทางเข้าอาคารกิจกรรมนิสิต",phone:"05x-xxx-0105",facebook:"กิจกรรมนิสิต HappiU",line:"@happiu-activities",instagram:"@happiu.activities"}
};

function jobLocation(job) {
  if (job.kind === "online") return icon("screen") + "ทำงานออนไลน์";
  const label = job.location || "ดูสถานที่ทำงาน";
  return '<button type="button" class="job-location-button" data-action="job-location" data-id="' + html(job.id) +
    '" aria-label="' + html("ดูแผนที่ " + label) + '">' + icon("pin") + html(label) + '</button>';
}

const campusMapLandmarks = {
  library:"สำนักหอสมุด มหาวิทยาลัยนเรศวร",
  sports:"อาคารกีฬาในร่ม มหาวิทยาลัยนเรศวร",
  activities:"อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร",
  campusstudio:"ลานกิจกรรม อาคารอเนกประสงค์ มหาวิทยาลัยนเรศวร"
};
const nearbyMapLandmarks = {
  pawstay:"ประตู 4 มหาวิทยาลัยนเรศวร",
  campusmart:"ประตู 5 มหาวิทยาลัยนเรศวร",
  copyshop:"ประตู 5 มหาวิทยาลัยนเรศวร",
  learnroom:"ประตู 1 มหาวิทยาลัยนเรศวร",
  cafe:"ประตู 1 มหาวิทยาลัยนเรศวร"
};

function workplaceMap(job) {
  const title = '<h2>' + icon("pin") + 'สถานที่ทำงาน</h2>';
  if (job.kind === "online") return panel(title + '<p>ทำงานออนไลน์จากที่ไหนก็ได้</p>');
  const landmarks = job.kind === "campus" ? campusMapLandmarks : nearbyMapLandmarks;
  const reference = job.id === "demo-sports-race" ? "สนามกีฬากลาง มหาวิทยาลัยนเรศวร"
    : Object.hasOwn(landmarks,job.employer) ? landmarks[job.employer] : "มหาวิทยาลัยนเรศวร";
  const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(reference + " พิษณุโลก");
  return '<section class="panel" id="job-workplace" tabindex="-1">' + title +
    '<p><strong>' + html(job.location) + '</strong></p>' +
    '<div class="workplace-sketch" aria-hidden="true"><span class="workplace-sketch-pin">' + icon("pin") + '</span>' +
    '<span class="workplace-sketch-label">แผนที่จำลอง</span></div>' +
    '<p class="helper workplace-reference">แผนที่จำลอง • จุดอ้างอิงจริง ' + html(reference) + '</p>' +
    '<a class="secondary" href="' + html(url) + '" target="_blank" rel="noopener noreferrer">ดูจุดอ้างอิงใน Google Maps</a></section>';
}

const employerContactIcons = {
  phone:'<path d="M8.5 4H5.9A1.9 1.9 0 0 0 4 6c.7 7.3 6.7 13.3 14 14a1.9 1.9 0 0 0 2-1.9v-2.6l-4-1.6-1.5 1.8a12.5 12.5 0 0 1-6.2-6.2L10.1 8 8.5 4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  facebook:'<path fill="currentColor" d="M14 22v-8h2.7l.4-3H14V9.1c0-.9.25-1.5 1.55-1.5H17V4.9c-.45-.06-1.1-.15-2.35-.15-2.38 0-4 1.46-4 4.1V11H8v3h2.65v8z"/>',
  line:'<path fill="currentColor" d="M12 4C6.8 4 2.5 7.3 2.5 11.4c0 3.7 3.4 6.7 7.9 7.3.3.04.6.2.65.45.08.26-.02.68-.13 1.06-.12.5-.22 1.2.69.82 1.8-.77 9.9-5.68 9.9-9.63C21.5 7.3 17.2 4 12 4Z"/><text x="12" y="13.45" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.7" font-weight="800" fill="#067a35">LINE</text>',
  instagram:'<rect x="4.3" y="4.3" width="15.4" height="15.4" rx="4.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.5" cy="7.55" r="1" fill="currentColor"/>',
  mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m4.5 7 7.5 6 7.5-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
};

function employerContacts(id) {
  const employer = state.employers[id];
  const info = workplaceInfo[id] || {};
  const channels = [
    ["phone","เบอร์โทร",info.phone],
    ["line","LINE",info.line],
    ["facebook","Facebook",info.facebook],
    ["instagram","Instagram",info.instagram],
    ["mail","อีเมล",employer.contact]
  ];
  const contacts = channels.map(([kind,label,value]) =>
    '<li class="contact-channel">' +
    '<span class="contact-icon" data-channel="' + kind + '" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' +
    employerContactIcons[kind] + '</svg></span><div class="contact-text"><span class="contact-label">' + html(label) + '</span><span class="contact-value">' +
    html(value || "ไม่ระบุ") + '</span></div></li>'
  ).join("");
  return panel('<h2>ติดต่อผู้จ้าง</h2><p class="contact-employer-name"><strong>' + html(employer.name) +
    '</strong></p><ul class="contact-channels">' + contacts + '</ul>' +
    (info.phone ? '<p class="helper">ข้อมูลติดต่อสมมติสำหรับประกาศนี้</p>' : ''));
}

function detail() {
  const job = jobBy(selected.job);
  if (!job || !active(job)) return header("ประกาศงาน") + empty("ประกาศนี้ไม่เปิดรับแล้ว","กลับไปดูประกาศที่ยังเปิดรับได้",navButton("กลับไปหางาน","home"));
  const employer = state.employers[job.employer];
  const employerVerified = employer?.status === "verified";
  const photo = jobPhoto(job);
  const match = state.signedIn
    ? HappiUM1.computeJobMatch(currentStudent(), job, state, { available, classConflict: classConflictFor, hours, html })
    : null;
  const shifts = job.shifts.map(shift => {
    const conflict = classConflict(shift);
    const slots = available(job,shift);
    const isFull = slots <= 0;
    const hrs = hours(shift).toLocaleString("th-TH", { maximumFractionDigits: 1 });
    const cls = conflict ? " is-conflict" : (!isFull && state.signedIn ? " is-open" : "");
    const note = isFull ? "เวลาทำงานนี้เต็มแล้ว" :
      conflict ? "ชนตารางเรียน · " + conflict.start + "–" + conflict.end + " น. (" + conflict.course + ")" :
      state.signedIn ? (HappiUM1.withinAvailability(currentStudent(),shift) ? "ไม่ชนตารางเรียน" : "อยู่นอกเวลาที่สะดวก") + " · ว่าง " + slots + " ที่" : "เข้าสู่ระบบเพื่อตรวจตารางเรียน · ว่าง " + slots + " ที่";
    return '<div class="shift time-info' + cls + '">' + icon("clock") + '<span><strong>' + html(time(shift)) +
      ' · ทำงาน ' + html(hrs) + ' ชม./วัน</strong><small>' + html(note) + '</small></span></div>';
  }).join("");
  const submitted = existing(job);
  const next = submitted ? button("เปิดแชทงานนี้","chat","primary",submitted.id)
    : button("สมัครงาน","apply-job","primary",job.id);
  const avgHoursNum = job.shifts.length
    ? job.shifts.reduce((sum, s) => sum + hours(s), 0) / job.shifts.length
    : 0;
  const avgDailyHours = avgHoursNum > 0
    ? avgHoursNum.toLocaleString("th-TH", { maximumFractionDigits: 1 })
    : "—";
  const totalOpenSlots = job.shifts.reduce((sum, s) => sum + Math.max(0, available(job, s)), 0);
  const estDailyPay = job.payType !== "fixed" && avgHoursNum > 0
    ? Math.round(Number(job.rate || 0) * avgHoursNum).toLocaleString("th-TH")
    : "";
  const payUnit = job.payType === "fixed" ? "/ งาน" : "/ ชม.";
  const payAmountText = Number(job.rate || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 }) + " บาท";
  const distChip = job.kind === "online"
    ? "ทำออนไลน์ได้"
    : job.kind === "campus"
      ? "ภายใน มน."
      : (job.distance ? "ห่าง มน. " + Number(job.distance).toLocaleString("th-TH", { maximumFractionDigits: 1 }) + " กม." : "รอบ มน.");
  const summaryBar =
    '<section class="job-detail-bar" aria-label="สรุปค่าตอบแทนและสมัครงาน">' +
      '<div class="jdb-pay-group">' +
        '<span class="jdb-pay-icon" aria-hidden="true"><img src="/img/icons-3d/pay-wallet.png" alt=""></span>' +
        '<div class="jdb-pay-copy">' +
          '<span class="jdb-eyebrow">' + (job.payType === "fixed" ? "ค่าตอบแทนเหมางาน" : "ค่าตอบแทนรายชั่วโมง") + '</span>' +
          '<div class="jdb-pay-line"><strong class="jdb-amount">' + html(payAmountText) + '</strong><span class="jdb-unit">' + payUnit + '</span></div>' +
          (estDailyPay ? '<span class="jdb-est">เฉลี่ย ≈ ' + html(estDailyPay) + ' บาท/วัน</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="jdb-metrics">' +
        '<span class="jdb-chip">' + icon("clock") + '<span>' + html(avgDailyHours) + ' ชม./วัน</span></span>' +
        '<span class="jdb-chip">' + icon("pin") + '<span>' + html(distChip) + '</span></span>' +
        '<span class="jdb-chip ' + (totalOpenSlots > 0 ? 'is-open' : 'is-full') + '">' +
          '<span class="jdb-dot" aria-hidden="true"></span>' +
          '<span>' + (totalOpenSlots > 0 ? 'เปิดรับอีก ' + totalOpenSlots + ' ที่' : 'เต็มทุกช่วงเวลา') + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="jdb-cta">' + next + '</div>' +
    '</section>';
  return '<div class="back">' + navButton("กลับไปหางาน","home","text-button") + '</div>' + header(job.title,employer.name) +
    summaryBar +
    '<div class="two job-detail"><div class="job-detail-main">' +
    (photo ? '<div class="job-detail-photo" aria-hidden="true">' + photo + '</div>' : '') +
    panel('<h2>รายละเอียดงาน</h2><div class="pills">' + jobTypeBadge(job) + tag(groups[job.kind]) + (job.category ? tag(job.category) : "") +
      (employerVerified ? tag("ผู้จ้างผ่านการรับรอง","good") : tag("รอตรวจข้อมูลผู้จ้าง","wait")) + '</div>' +
      dataList([["หน้าที่",job.description],["จำนวนชั่วโมงทำงาน",avgDailyHours + " ชม./วัน"],["สาขาที่รับ",job.requiredMajor || "ทุกสาขา"],["ทักษะที่จำเป็น",job.requiredSkills || "ไม่ได้ระบุ"],["ทักษะเสริม",job.skills || "ไม่ได้ระบุ"],["วันปิดรับ",job.deadline],
        ["เอกสารที่ต้องเตรียม",job.doc ? "แนบเอกสารประกอบตอนส่งใบสมัคร" : "ใช้ข้อมูลจากโปรไฟล์"]]) +
      (match ? HappiUM1.renderMatchBreakdown(match, { html }) : callout("เข้าสู่ระบบเพื่อดูคะแนนความตรงกัน 3 ด้านและตรวจตารางเรียน","info")) +
      button("แจ้งงานเสี่ยง","report-job","text-button",job.id)) +
    '</div><div class="job-detail-side"><section class="panel" id="job-shifts" tabindex="-1"><h2>เวลาทำงานที่ระบุในประกาศ</h2>' +
      shifts + '<p class="helper">คุยตกลงเวลาทำงานกับผู้จ้างได้หลังส่งใบสมัคร</p></section>' +
    workplaceMap(job) + employerContacts(job.employer) + '</div></div>';
}
function login() {
  const returning = selected.after;
  const job = jobBy(selected.job);
  const next = returning === "apply" && job ? callout("เข้าสู่ระบบแล้วจะกลับไปสมัคร " + job.title + " ต่อ","info") : "";
  const isRegister = loginMode === "register";
  const tabsHtml =
    '<div class="auth-mode-tabs" role="tablist" aria-label="เข้าสู่ระบบหรือสร้างบัญชี">' +
      '<button type="button" data-action="auth-mode" data-id="login" aria-pressed="' + (!isRegister) + '">เข้าสู่ระบบ</button>' +
      '<button type="button" data-action="auth-mode" data-id="register" aria-pressed="' + isRegister + '">สร้างบัญชีใหม่</button>' +
    '</div>';

  const loginFormHtml = form("unified-login",
    field("รหัสนิสิต / รหัสเจ้าหน้าที่ / อีเมลผู้ประกอบการ","identifier","","text",'required maxlength="100" autocomplete="username" placeholder="เช่น 6631xxxx, NU-DEMO-001 หรือ cafe@example.com"') +
    field("รหัสผ่าน","password","","password",'required maxlength="80" autocomplete="current-password" placeholder="กรอกรหัสผ่าน"'),
    "เข้าสู่ระบบ");

  const registerFormHtml = form("unified-register",
    '<div class="field-grid">' +
      field("รหัสนิสิต หรือ อีเมลผู้ประกอบการ","identifier","","text",'required maxlength="100" autocomplete="username" placeholder="เช่น 66310999 หรือ shop@email.com"') +
      field("ชื่อ–นามสกุล หรือ ชื่อร้านค้า","name","","text",'required maxlength="80" placeholder="เช่น สมชาย ใจดี หรือ คาเฟ่หน้ามอ"') +
    '</div>' +
    HappiUFaculties.renderFacultyMajorFields({
      facultyValue: "",
      majorValue: "",
      facultyLabel: "คณะ (นิสิต มน. — พิมพ์ค้นหาหรือเลือก)",
      majorLabel: "สาขาวิชา (นิสิต มน. — พิมพ์ค้นหาหรือเลือก)"
    }) +
    '<div class="field-grid">' +
      selectField("ชั้นปี (สำหรับนิสิต)","year",[["1","ปี 1"],["2","ปี 2"],["3","ปี 3"],["4","ปี 4"]],"1") +
      selectField("ประเภทสถานที่ (สำหรับผู้ประกอบการ)","type",[["near","รอบมหาวิทยาลัย"],["campus","ในมหาวิทยาลัย"],["online","ออนไลน์"]],"near") +
    '</div>' +
    field("รหัสผ่าน (อย่างน้อย 4 ตัวอักษร)","password","","password",'required minlength="4" maxlength="80" autocomplete="new-password"'),
    "สมัครสมาชิกและเข้าสู่ระบบ");

  return '<section class="entry" aria-labelledby="login-title">' +
    '<div class="entry-form"><div class="entry-content">' +
    '<h1 id="login-title">' + (isRegister ? 'สร้างบัญชี HappiU' : 'เข้าสู่ระบบ HappiU') + '</h1>' +
    '<p class="entry-description">' +
      (isRegister ? 'ระบบแยกบทบาทให้อัตโนมัติจากรหัสนิสิตหรืออีเมลผู้ประกอบการ' : 'กรอกรหัสนิสิต รหัสเจ้าหน้าที่ หรืออีเมลผู้ประกอบการ ระบบจะเข้าสู่บทบาทของคุณโดยอัตโนมัติ') +
    '</p>' +
    tabsHtml +
    (isRegister ? registerFormHtml : loginFormHtml) +
    next +
    '</div></div>' +
    '<div class="entry-brand"><div class="entry-art" aria-hidden="true"><img src="' + campusClayArt + '" alt="มาสคอตช้างน้อย HappiU 3D"></div>' +
    '<div class="entry-intro"><img class="entry-logo" src="data:image/webp;base64,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" alt=""><h2>งานพาร์ตไทม์สำหรับนิสิต มน.</h2></div></div>' +
    '</section>';
}
function apply() {
  const job = jobBy(selected.job);
  if (!job || !active(job)) return header("ใบสมัคร") + empty("ประกาศนี้ไม่เปิดรับแล้ว","กลับไปดูงานที่ยังเปิดรับได้",navButton("ไปหน้าหางาน","home"));
  if (existing(job)) return studentApps();
  const student = currentStudent();
  const optional = Object.entries(profileFields).filter(([key])=>student[key] && (key !== "photo" || validPhoto(student.photo)))
    .map(([key,label])=>'<label class="share-option"><input type="checkbox" name="share" value="' + key + '" checked> ' +
      html(label) + (key === "photo" ? "" : ' · ' + html(student[key])) + '</label>').join("");
  const summary = '<aside class="panel guided-summary" aria-labelledby="apply-job-title"><h2 id="apply-job-title">' +
    icon("briefcase") + 'งานที่สมัคร</h2>' + jobFacts(job) + '</aside>';
  const submission = '<section class="panel guided-main"><h2>' + icon("person") + 'ข้อมูลที่ผู้จ้างได้รับ</h2>' +
    dataList([["ชื่อ",student.name],["สาขา",student.major],["ชั้นปี",student.year]]) +
    '<p class="helper">ผู้จ้างเห็นช่วงเวลาทำงานที่คุณทำได้จากตารางเรียน โดยตารางรายวิชาอยู่ในโปรไฟล์ของคุณ</p>' +
    form("application",(optional ? '<fieldset class="share-fields"><legend>ข้อมูลเสริมที่ต้องการส่ง</legend>' + optional + '</fieldset>' : "") +
      (job.doc ? '<label class="field">เอกสารประกอบ<span class="helper">แนบไฟล์ที่ประกาศกำหนด</span><input type="file" name="document" required></label>' : ""),"ส่งใบสมัคร") +
    '</section>';
  return '<div class="back">' + button("กลับไปดูประกาศ","detail","text-button",job.id) + '</div>' +
    header("ตรวจข้อมูลก่อนส่งใบสมัคร",job.title) + '<div class="guided-layout application-review">' +
    summary + submission + '</div>';
}

function applicationTimeline(app) {
  return HappiUM3.renderExtendedTimeline(app, { html, time, icon, jobBy, shiftBy });
}

function applicationSent() {
  const app = appBy(selected.app);
  if (!studentOwns(app)) return studentApps();
  return header("ส่งใบสมัครแล้ว",jobBy(app.job)?.title) +
    '<section class="panel first-application-panel"><h2>' + icon("check") + 'รอผู้จ้างพิจารณา</h2>' +
    '<p>เลือกทักษะที่ทำได้เพื่อดูงานอื่นที่เกี่ยวข้อง</p>' +
    actions(button("เพิ่มทักษะเพื่อดูงานแนะนำ","edit-recommendation-profile","primary",app.id) +
      navButton("ดูใบสมัคร","applications")) + '</section>';
}

const availabilityTimes = Array.from({length:97}, (_, index) => availabilityClock(index * 15));

function availabilityClock(minutes) {
  return [Math.floor(minutes / 60), minutes % 60].map(part => String(part).padStart(2,"0")).join(":");
}

function availabilityRow(day = "", start = "", end = "") {
  const select = (label,name,values,current) => '<label class="field">' + label +
    '<select name="' + name + '"><option value="">เลือก' + label + '</option>' +
    values.map(value => '<option' + (value === current ? ' selected' : '') + '>' + html(value) + '</option>').join("") +
    '</select></label>';
  const times = current => [...new Set([...availabilityTimes,...(current ? [current] : [])])].sort();
  return '<div class="availability-row" data-availability-row>' +
    select("วัน","availableDay",weekDays,day) +
    select("เวลาเริ่ม","availableStart",times(start).filter(time => time !== "24:00"),start) +
    select("เวลาสิ้นสุด","availableEnd",times(end).filter(time => time !== "00:00"),end) +
    '<button type="button" class="text-button" data-action="remove-availability">ลบช่วงเวลา</button></div>';
}

function availabilityField(value) {
  const rows = HappiUM1.parseAvailabilityClauses(value).flatMap(({days,time}) =>
    (days.length ? days : weekDays).map(day => availabilityRow(day,
      availabilityClock(time?.after ?? 0),availabilityClock(time?.before ?? 1440))));
  return '<fieldset class="availability-field"><legend>เวลาที่สะดวกทำงาน</legend>' +
    '<p class="helper">เลือกได้หลายวันหรือหลายช่วงเวลา ระบบจะใช้ข้อมูลนี้หากะงานที่ตรงกับคุณ</p>' +
    '<div data-availability-rows>' + (rows.join("") || availabilityRow()) + '</div>' +
    '<button type="button" class="secondary" data-action="add-availability">เพิ่มช่วงเวลา</button></fieldset>';
}

function selectedAvailability(data) {
  const starts = data.getAll("availableStart");
  const ends = data.getAll("availableEnd");
  const ranges = [];
  for (const [index, day] of data.getAll("availableDay").entries()) {
    const start = starts[index];
    const end = ends[index];
    if (!day && !start && !end) continue;
    if (!weekDays.includes(day) || !start || !end || start >= end) return null;
    ranges.push(day + " " + start + "–" + end);
  }
  return [...new Set(ranges)].join(", ");
}

function recommendationSetup() {
  const student = currentStudent();
  const step = selected.setupStep === 2 ? 2 : 1;
  const draftSkills = selected.draftSkills !== undefined ? selected.draftSkills : student.skills;
  const stepsBar =
    '<div class="wizard-steps-bar" aria-label="ขั้นตอนการเพิ่มทักษะ">' +
      '<span class="wizard-step-pill ' + (step === 1 ? 'is-active' : 'is-done') + '">1. เลือกทักษะที่ทำได้</span>' +
      '<span class="wizard-step-pill ' + (step === 2 ? 'is-active' : '') + '">2. ความสนใจและเวลาว่าง</span>' +
    '</div>';

  if (step === 1) {
    return header("เพิ่มทักษะของคุณ","ขั้นที่ 1 จาก 2 · แยกเลือกจากทักษะแนะนำ หรือพิมพ์เพิ่มทักษะเอง") +
      '<section class="panel recommendation-setup">' + stepsBar +
      '<form data-form="recommendation-step1">' +
        skillPicker("ทักษะที่ทำได้","skills",draftSkills) +
        '<div class="actions">' +
          navButton("ยกเลิก",selected.app ? "applications" : "home","secondary") +
          '<button class="primary" type="submit">ถัดไป: เลือกความสนใจและเวลาว่าง →</button>' +
        '</div>' +
        '<p class="helper" role="alert" data-form-error></p>' +
      '</form></section>';
  }

  return header("ความสนใจและเวลาที่สะดวก","ขั้นที่ 2 จาก 2 · เลือกประเภทงานที่สนใจและเวลาว่างของคุณ") +
    '<section class="panel recommendation-setup">' + stepsBar +
    '<form data-form="recommendation-setup">' +
      '<input type="hidden" name="skills" value="' + html(draftSkills) + '">' +
      HappiUM1.renderInterestsField(student, { html }) +
      availabilityField(student.availability) +
      '<div class="actions">' +
        button("← ย้อนกลับ","setup-step-back","secondary") +
        '<button class="primary" type="submit">บันทึกและดูงานแนะนำ</button>' +
      '</div>' +
      '<p class="helper" role="alert" data-form-error></p>' +
    '</form></section>';
}
const hiringStages = {
  review:["รอพิจารณา","wait"],
  interview:["นัดสัมภาษณ์","info"],
  training:["ฝึกงาน","info"],
  hired:["รับเข้าทำงาน","good"]
};

function hiringStage(app) {
  if (Object.hasOwn(hiringStages,app.hiringStage)) return app.hiringStage;
  return app.status === "accepted" ? "hired" : "review";
}

function hiringBadge(app) {
  return badge(app.status !== "pending" && Object.hasOwn(appStates,app.status)
    ? appStates[app.status] : hiringStages[hiringStage(app)]);
}

function hiringDetails(app) {
  const stage = hiringStages[app.hiringStage];
  const showStage = ["offered","accepted"].includes(app.status) &&
    Object.hasOwn(hiringStages,app.hiringStage) && app.hiringStage !== "review";
  const stageText = showStage ? '<p class="helper">ขั้นตอนคัดเลือก: ' + html(stage[0]) + '</p>' : "";
  const note = app.hiringNote ? '<p class="hiring-note"><strong>หมายเหตุจากผู้จ้าง</strong><br>' + html(app.hiringNote) + '</p>' : "";
  const interview = app.hiringStage === "interview" && ["pending","offered","accepted"].includes(app.status);
  const meeting = app.interview;
  const appointment = interview ? (meeting?.mode === "scheduled" ?
    dataList([["วันและเวลานัด",new Intl.DateTimeFormat("th-TH",{dateStyle:"long",timeStyle:"short"}).format(new Date(meeting.when))],
      ["สถานที่หรือช่องทาง",meeting.place]]) : callout("รอตกลงวัน เวลา และสถานที่สัมภาษณ์ในแชต","info")) : "";
  return stageText + appointment + note;
}

function canUpdateHiring(app) {
  return ownsApplication(app) && ["pending","offered","accepted"].includes(app.status);
}

function hiringButton(app) {
  return canUpdateHiring(app) ? button("อัปเดตสถานะการสมัคร","edit-hiring","primary",app.id) : "";
}

function syncInterviewFields() {
  const formEl = dialog.querySelector('form[data-form="update-hiring"]');
  if (!formEl) return;
  const interview = formEl.elements.stage.value === "interview";
  const scheduled = interview && formEl.elements.meetingMode.value === "scheduled";
  formEl.querySelector("[data-interview]").hidden = !interview;
  formEl.querySelector("[data-appointment]").hidden = !scheduled;
  for (const name of ["meetingTime","meetingPlace"]) {
    formEl.elements[name].disabled = !scheduled;
    formEl.elements[name].required = scheduled;
  }
}
function openHiringDialog(id) {
  const app = appBy(id);
  if (!canUpdateHiring(app)) return;
  const options = Object.entries(hiringStages).map(([value,[label]]) => [value,label]);
  dialog.innerHTML = '<h2 id="dialog-title">อัปเดตสถานะการสมัคร</h2><p>' + html(app.profile.name) + '</p>' +
    form("update-hiring",'<input type="hidden" name="application" value="' + html(id) + '">' +
      selectField("สถานะการสมัคร","stage",options,hiringStage(app)) +
      '<div data-interview>' + selectField("รายละเอียดนัด","meetingMode",[["chat","ตกลงนัดในแชต"],["scheduled","ระบุวัน เวลา และสถานที่"]],app.interview?.mode || "chat") +
      '<div data-appointment>' + field("วันและเวลาสัมภาษณ์","meetingTime",app.interview?.when,"datetime-local") +
      field("สถานที่หรือลิงก์สัมภาษณ์","meetingPlace",app.interview?.place,"text","maxlength=180") + '</div></div>' +
      area("หมายเหตุถึงนิสิต (ถ้ามี)","note",app.hiringNote,false),"บันทึกสถานะ") +
    button("ยกเลิก","close-dialog","text-button");
  syncInterviewFields();
  dialog.showModal();
}

function studentApps() {
  const list = studentApplications().slice().reverse();
  return header("ติดตามใบสมัคร","ดูสถานะความคืบหน้าและข้อเสนอเวลาทำงานของแต่ละร้าน") +
    (list.length ? '<div class="application-list">' + list.map(app => {
      const job = jobBy(app.job);
      if (!job) return "";
      const employer = state.employers[job.employer] || { name: "ร้านค้า/หน่วยงาน" };
      const chat = button(app.status === "pending" ? "คุยกับผู้จ้าง" : "เปิดแชท","chat",app.status === "pending" ? "primary" : "secondary",app.id);
      const extra = HappiUM3.renderStudentAppExtraActions(app, { html, button });
      let controlsHtml = "";
      if (app.status === "pending") {
        controlsHtml = chat + button("ดูประกาศ","detail","secondary",job.id) + extra;
      } else if (app.status === "offered") {
        controlsHtml = button("ดูข้อเสนอ","offer","primary",app.id) + chat + extra;
      } else if (app.status === "accepted") {
        controlsHtml = navButton("ดูตารางงาน","schedule","primary") + navButton("ลงเวลาเข้า-ออกงาน","work","secondary") + chat + extra;
      } else if (HappiUM3.isApplicationClosed(app.status)) {
        controlsHtml = (active(job) && !existing(job) ? button("สมัครใหม่","apply-job","primary",job.id) : "") +
          button("ดูประกาศ","detail","secondary",job.id) + chat;
      } else {
        controlsHtml = button("ดูประกาศ","detail","secondary",job.id) + chat;
      }
      return '<article class="panel application-card">' + headingRow(employer.name,hiringBadge(app)) +
        '<p class="helper"><strong>ตำแหน่งที่สมัคร: ' + html(job.title) + '</strong> · ' + html(HappiUM2.formatJobPay(job, { currency })) + '</p>' +
        hiringDetails(app) + applicationTimeline(app) + actions(controlsHtml) + '</article>';
    }).join("") + '</div>' : empty("ยังไม่มีใบสมัคร","เลือกประกาศที่สนใจเพื่อเริ่มสมัคร",navButton("ค้นหางาน","home","primary")));
}
function offer() {
  const app = appBy(selected.app);
  if (!app || app.student !== state.studentId || app.status !== "offered") return studentApps();
  const job = jobBy(app.job), shift = shiftBy(job, app.shift);
  const check = HappiUM3.canAcceptOffer(job, shift, state, app);
  const open = check.ok && !!shift && !busy(shift);
  const extra = HappiUM3.renderStudentAppExtraActions(app, { html, button });
  return navButton("กลับไปใบสมัคร","applications","text-button") + header("ตรวจข้อเสนอและยืนยันเวลาทำงาน") + panel(
    (job ? '<h2>' + html(job.title) + '</h2>' + jobFacts(job, shift) : callout("ไม่พบข้อมูลประกาศงาน","bad")) +
    (!shift && app.shift ? '<p class="helper">ไม่พบข้อมูลเวลาทำงาน · ' + html(app.shift) + '</p>' : '') +
    (open ? actions(button("ยืนยันเข้าทำงาน","accept","primary",app.id) + button("คุยกับผู้จ้าง","chat","secondary",app.id) + extra) :
      callout(check.error === "กะเต็ม" ? "ช่วงเวลาทำงานนี้เต็มแล้ว คุยกับผู้จ้างในแชทหรือปฏิเสธข้อเสนอนี้ได้" : "ช่วงเวลานี้ยืนยันไม่ได้แล้ว คุยกับผู้จ้างในแชทได้","bad") +
      actions(button("คุยกับผู้จ้างเรื่องเวลาทำงาน","chat","primary",app.id) + extra)));
}

const weekDays = ["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"];
const scheduleViews = {all:"ทั้งหมด",study:"ตารางเรียน",job:"เวลาทำงาน"};

function confirmedWork() {
  return studentApplications().filter(app => app.status === "accepted")
    .flatMap(app => {
      const job = jobBy(app.job);
      const shift = job && shiftBy(job,app.shift);
      return shift ? [{app,job,shift}] : [];
    });
}
function timetableClock(value) {
  return String(Math.floor(value/60)).padStart(2,"0") + ":" + String(value%60).padStart(2,"0");
}
function dailyTimetable(items, first, last) {
  const slots = [];
  let filledUntil = first;
  for (const item of items) {
    if (item.from > filledUntil) slots.push({from:filledUntil,to:item.from,type:"free",title:"ว่าง"});
    slots.push(item);
    filledUntil = Math.max(filledUntil,item.to);
  }
  if (filledUntil < last) slots.push({from:filledUntil,to:last,type:"free",title:"ว่าง"});
  return slots;
}
function scheduleSlot(item, rows) {
  const range = timetableClock(item.from) + "–" + timetableClock(item.to);
  const position = "--slot-rows:" + rows.get(item.from) + "/" + rows.get(item.to);
  return '<li class="schedule-event ' + item.type + (item.tone ? ' ' + item.tone : '') +
    '" style="' + position + '">' +
    '<span class="slot-time">' + range + '</span><div class="slot-content"><strong>' + html(item.title) + '</strong>' +
    (item.details ? '<span class="slot-details">' + html(item.details) + '</span>' : '') +
    (item.code ? '<span class="slot-details">' + html(item.code) + '</span>' : '') + '</div></li>';
}
function studentSchedule() {
  const mode = selected.mode || "all";
  const student = currentStudent();
  const work = confirmedWork();
  const tabs = Object.entries(scheduleViews).map(([id,label]) => '<button type="button" class="chip" data-action="schedule-view" data-id="' +
    id + '" aria-pressed="' + (mode === id) + '">' + html(label) + '</button>').join("");
  return header("ตารางเรียนและงาน","ตาราง 2 มิติ (วัน × เวลา) ของ " + (student.nick || student.name) + " · ลากวางเพื่อจัดตารางหรือให้ AI สร้างให้") +
    '<div class="schedule-tabs" role="group" aria-label="แสดงตาราง">' + tabs + '</div>' +
    '<div class="schedule-legend"><span><i class="study"></i> วิชาเรียน (ลากย้ายได้)</span><span><i class="job"></i> เวลาทำงานที่รับเข้าทำแล้ว</span></div>' +
    HappiUTimetable2D.render2DTimetable(student, work, { mode }) +
    (work.length ? actions(navButton("ไปหน้าลงเวลาทำงานและรายได้","work","primary")) : callout("เวลาทำงานจะขึ้นบนตารางอัตโนมัติเมื่อผู้จ้างรับเข้าทำงานหรือคุณยืนยันข้อเสนอแล้ว","info"));
}

const sessionStatusLabels = {
  checked_in: ["กำลังทำงาน (เช็กอินแล้ว)", "info"],
  pending_approval: ["รอผู้จ้างรับรอง", "wait"],
  approved: ["อนุมัติแล้ว · รอจ่าย", "info"],
  paid: ["จ่ายแล้ว", "good"]
};

function studentWork() {
  const myApps = studentApplications().filter(app => app.status === "accepted" || (app.status === "resigned" && (app.workSessions?.length || 0) > 0));
  const allSessions = myApps.flatMap(app => (app.workSessions || []).map(ws => ({ ws, app })));
  const sumByStatus = st => allSessions.filter(({ ws }) => ws.status === st).reduce((sum, { ws }) => sum + Number(ws.amount || 0), 0);

  return header("เวลาทำงานและรายได้","ถ่ายรูปลงเวลาเข้า–ออกงาน (รองรับหลายรอบสำหรับการทำงานระยะยาว) และติดตามรายได้ทุกรอบ") +
    '<div class="stats income-stats"><div>' + icon("clock") + '<span>คาดการณ์ / รอรับรอง</span><strong>' + currency(sumByStatus("pending_approval")) + '</strong></div><div>' + icon("check") + '<span>อนุมัติแล้ว</span><strong>' + currency(sumByStatus("approved")) + '</strong></div><div>' + icon("wallet") + '<span>จ่ายแล้ว</span><strong>' + currency(sumByStatus("paid")) + '</strong></div></div>' +
    (myApps.length ? myApps.map(app => {
      const job = jobBy(app.job);
      const employer = job ? state.employers[job.employer] : null;
      const s = shiftBy(job, app.shift);
      const shiftLabel = s ? time(s) + ' (' + hours(s).toLocaleString("th-TH",{maximumFractionDigits:1}) + ' ชม./วัน)' : "ตามตกลงกับผู้จ้าง";
      const sessions = app.workSessions || [];
      const activeSession = sessions.find(ws => ws.status === "checked_in");
      const isResigned = app.status === "resigned";

      let jobControls = "";
      if (isResigned) {
        jobControls = tag("แจ้งลาออกแล้ว (เก็บประวัติรายได้ครบ)", "bad");
      } else if (activeSession) {
        jobControls = '<button type="button" class="primary" data-action="photo-check-out" data-id="' + html(activeSession.id) + '"><img class="icon-3d-btn" src="/img/icons-3d/camera-checkin.png" alt="">ถ่ายรูปเช็กเอาต์ (ออกงาน)</button>';
      } else {
        jobControls =
          '<button type="button" class="primary" data-action="photo-check-in" data-id="' + html(app.id) + '"><img class="icon-3d-btn" src="/img/icons-3d/camera-checkin.png" alt="">ถ่ายรูปเช็กอินรอบใหม่ (เข้างาน)</button>' +
          button("แจ้งลาออก", "resign-job", "danger", app.id);
      }

      const sessionCardsHtml = sessions.length
        ? '<div class="work-session-list">' + sessions.map((ws, idx) => {
            const roundNo = sessions.length - idx;
            const photoThumbs =
              '<div class="work-session-photos">' +
                (validPhoto(ws.checkInPhotoUrl)
                  ? '<button type="button" class="work-photo-thumb" data-action="view-work-photo" data-id="' + html(ws.checkInPhotoUrl) + '"><img src="' + html(ws.checkInPhotoUrl) + '" alt="รูปเช็กอินรอบที่ ' + roundNo + '" loading="lazy"><span>เข้างาน: ' + html(formatSessionClock(ws.checkInAt)) + '</span></button>'
                  : '') +
                (validPhoto(ws.checkOutPhotoUrl)
                  ? '<button type="button" class="work-photo-thumb" data-action="view-work-photo" data-id="' + html(ws.checkOutPhotoUrl) + '"><img src="' + html(ws.checkOutPhotoUrl) + '" alt="รูปเช็กเอาต์รอบที่ ' + roundNo + '" loading="lazy"><span>ออกงาน: ' + html(formatSessionClock(ws.checkOutAt)) + '</span></button>'
                  : '') +
              '</div>';

            return '<article class="work-session-item">' +
              '<div class="work-session-top"><strong>รอบที่ ' + roundNo + ' · เข้า ' + html(formatSessionClock(ws.checkInAt)) + (ws.checkOutAt ? ' → ออก ' + html(formatSessionClock(ws.checkOutAt)) : ' (กำลังทำงานอยู่)') + '</strong>' +
              badge(sessionStatusLabels[ws.status] || ["บันทึกแล้ว", ""]) + '</div>' +
              (ws.checkOutAt ? '<p class="helper">รวม ' + html(ws.hours) + ' ชม. · ยอดรอบนี้ <strong>' + html(currency(ws.amount)) + '</strong>' + (ws.paymentProof ? ' · เลขอ้างอิง: ' + html(ws.paymentProof) : '') + '</p>' : '<p class="helper">เมื่อเลิกงานให้กดปุ่ม "ถ่ายรูปเช็กเอาต์" เพื่อสรุปชั่วโมงและส่งให้ผู้จ้างรับรอง</p>') +
              (ws.note ? '<p class="helper">หมายเหตุ: ' + html(ws.note) + '</p>' : '') +
              photoThumbs +
            '</article>';
          }).join("") + '</div>'
        : '<p class="helper">ยังไม่มีประวัติการเช็กอิน — กดปุ่ม "ถ่ายรูปเช็กอินรอบใหม่" เมื่อเริ่มทำงานได้เลย (ลงเวลาได้ไม่จำกัดรอบ)</p>';

      return '<section class="panel work-job-card">' +
        '<div class="work-job-header">' +
          '<div>' +
            headingRow((job?.title || "งานพาร์ตไทม์"), isResigned ? tag("ลาออกแล้ว","bad") : tag("กำลังทำงานอยู่","good")) +
            '<p class="helper">' + html(employer?.name || "") + ' · ' + html(shiftLabel) + ' · ' + html(job ? HappiUM2.formatJobPay(job, { currency }) : "") + '</p>' +
            (isResigned && app.resignReason ? '<p class="helper">เหตุผลการลาออก: ' + html(app.resignReason) + '</p>' : '') +
          '</div>' +
          '<div class="actions">' + jobControls + '</div>' +
        '</div>' +
        sessionCardsHtml +
        HappiUM4.renderShiftReviewsSummary(app, "student", { html }) +
        HappiUM4.renderReviewForm(app, "student", { html }) +
      '</section>';
    }).join("") : empty("ยังไม่มีงานที่กำลังทำอยู่","เมื่อผู้จ้างรับเข้าทำงานหรือคุณยืนยันข้อเสนอแล้ว จะสามารถถ่ายรูปเช็กอิน–เช็กเอาต์ได้ที่นี่",navButton("ไปที่ใบสมัคร","applications","primary")));
}
function profileForm() {
  if (!state.signedIn) return login();
  const p = currentStudent();
  const work = confirmedWork();
  const mySessions = studentApplications().flatMap(a => a.workSessions || []);
  const approvedSessions = mySessions.filter(ws => ["approved","paid"].includes(ws.status));
  const totalHours = approvedSessions.reduce((sum, ws) => sum + Number(ws.hours || 0), 0);
  const paid = mySessions.filter(ws => ws.status === "paid").reduce((sum, ws) => sum + Number(ws.amount || 0), 0);
  const skillList = Array.isArray(p.skills) ? p.skills : String(p.skills || "").split(/[,、\n]+/).map(s => s.trim()).filter(Boolean);
  const skillChips = skillList.slice(0, 5).map(s => '<span class="profile-skill-pill">' + html(s) + '</span>').join("");
  const infoItems = [
    ["ชื่อจริง", p.name],
    ["รหัสนิสิต", p.code],
    ["คณะ", p.faculty],
    ["สาขา", p.major],
    ["ชั้นปี", "ปี " + p.year],
    ["อีเมล", p.contact]
  ].map(([k, v]) => '<div class="profile-info-cell"><span>' + html(k) + '</span><strong>' + html(v || "—") + '</strong></div>').join("");
  return '<section class="student-profile-identity nu-id-hero">' +
      '<div class="nu-id-body">' +
        '<div class="nu-id-avatar">' + studentAvatar(p,"รูปโปรไฟล์ของ " + p.name) + '</div>' +
        '<div class="nu-id-meta">' +
          '<div class="nu-id-title-row">' +
            '<h2>' + html(p.nick || p.name) + '</h2>' +
            '<span class="nu-id-code">' + html(p.code) + '</span>' +
          '</div>' +
          '<p class="nu-id-sub">' + ((p.nick && p.nick.trim() && p.nick.trim() !== p.name.trim()) ? html(p.name) + ' · ' : '') + html(p.major) + ' ชั้นปีที่ ' + html(p.year) + ((p.nick && p.nick.trim() && p.nick.trim() !== p.name.trim()) ? '' : ' · ' + html(p.faculty)) + '</p>' +
          (skillChips ? '<div class="profile-skill-row">' + skillChips + '</div>' : '') +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="panel profile-info-panel">' +
      '<div class="profile-panel-head"><h2>ข้อมูลนิสิต</h2><span class="profile-faculty-tag">' + html(p.faculty) + '</span></div>' +
      '<div class="profile-info-grid">' + infoItems + '</div>' +
    '</section>' +
    '<div class="stats profile-stats"><div>' + icon("briefcase") + '<strong>' + new Set(work.map(({job}) => job.id)).size +
      '</strong><span>งานที่ยืนยัน</span></div><div>' + icon("clock") + '<strong>' + totalHours.toLocaleString("th-TH",{maximumFractionDigits:2}) +
      '</strong><span>ชม. ที่รับรอง</span></div><div>' + icon("wallet") + '<strong>' + currency(paid) + '</strong><span>รายได้ที่จ่ายแล้ว</span></div></div>' +
    '<details class="profile-section panel"' + (selected.returnTo ? ' open' : '') + '><summary>' + icon("person") +
    '<span><strong>แก้ไขโปรไฟล์และอัปโหลดรูปจริง</strong><small>อัปโหลดรูปจริงเพื่อให้ผู้จ้างเห็น ทักษะ ประเภทงานที่สนใจ และประสบการณ์</small></span></summary>' +
      form("student-profile",
        field("ชื่อเล่น","nick",p.nick,"text","maxlength=30") +
        HappiUFaculties.renderFacultyMajorFields({
          facultyValue: p.faculty,
          majorValue: p.major,
          facultyLabel: "คณะ (พิมพ์ค้นหาหรือเลือก)",
          majorLabel: "สาขาวิชา (พิมพ์ค้นหาหรือเลือก)"
        }) +
        area("แนะนำตัว","intro",p.intro,false) +
        skillPicker("ทักษะที่ทำได้","skills",p.skills) +
        availabilityField(p.availability) +
        HappiUM1.renderInterestsField(p, { html }) +
        area("ประสบการณ์","experience",p.experience,false) +
        '<label class="field">รูปโปรไฟล์จริง (แสดงให้ผู้จ้างเห็นตอนสมัครงาน)<input type="file" name="photo" accept="image/png,image/jpeg,image/webp"><small>รองรับไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB (บันทึกลงเซิร์ฟเวอร์จริง)</small></label>' +
        (p.photo ? '<label class="share-option"><input type="checkbox" name="remove-photo"> นำรูปปัจจุบันออก</label>' : ""),"บันทึกโปรไฟล์") +
      '</details>' +
    '<details class="profile-section panel"><summary>' + icon("briefcase") +
    '<span><strong>พอร์ตโฟลิโอ</strong><small>ประวัติงานที่ผู้จ้างรับรองชั่วโมงและผลประเมิน Work &amp; Grow</small></span></summary>' +
    HappiUM4.renderPortfolioReviews(studentApplications(), state, { html, jobBy, shiftBy, time }) + '</details>' +
    '<div class="profile-links">' + navButton("ตารางเรียนและงาน","schedule") + navButton("ติดตามเรื่องที่แจ้ง","reports") +
    button("ออกจากระบบ","sign-out","text-button") + '</div>';
}
function employerOverview(applications) {
  const totals = {review:0,interview:0,training:0,hired:0,closed:0};
  for (const app of applications) {
    const closed = ["declined","withdrawn","offer_declined"].includes(app.status);
    totals[closed ? "closed" : hiringStage(app)] += 1;
  }
  const counts = Object.entries(totals).map(([stage,total]) =>
    '<li>' + (stage === "closed" ? tag("ปิดใบสมัคร") : badge(hiringStages[stage])) + '<strong>' + html(total) + '</strong></li>'
  ).join("");
  const applicants = new Set(applications.map(app => app.student)).size;
  return '<section class="panel employer-overview" aria-labelledby="employer-overview-title">' +
    '<h2 id="employer-overview-title">ภาพรวมผู้สมัคร</h2>' +
    '<div class="overview-totals"><div><strong>' + html(applicants) + '</strong><span>ผู้สมัครทั้งหมด (คน)</span></div>' +
    '<div><strong>' + html(applications.length) + '</strong><span>ใบสมัครทั้งหมด</span></div></div>' +
    '<h3>จำนวนใบสมัครตามสถานะ</h3><ul class="overview-stages">' + counts + '</ul></section>';
}

function employerHome() {
  const jobs = state.jobs.filter(job => job.employer === employerId);
  const applications = state.applications.filter(ownsApplication);
  const applicantsByJob = new Map();
  for (const app of applications) {
    if (!applicantsByJob.has(app.job)) applicantsByJob.set(app.job,new Set());
    applicantsByJob.get(app.job).add(app.student);
  }
  return header("ประกาศของฉัน","ดูภาพรวมผู้สมัคร จัดการประกาศ และติดตามผลตรวจ · " + (state.employers[employerId]?.name || "")) +
    employerOverview(applications) +
    '<div class="workspace-tools">' + button("สร้างประกาศใหม่","edit-job","primary") + navButton("เปิดห้องแชท","chat","secondary") + '</div>' +
    (state.employers[employerId].status !== "verified" ?
      panel(callout(state.employers[employerId].reason || "ร้านอยู่ระหว่างการรับรอง คุณเตรียมฉบับร่างไว้ก่อนได้","wait") +
        navButton("ดูข้อมูลและเอกสารรับรองร้าน","profile","secondary")) : "") +
    '<div class="stats workspace-stats"><div><span>ประกาศทั้งหมด</span><strong>' + jobs.length +
      '</strong></div><div><span>เปิดรับอยู่</span><strong>' + jobs.filter(active).length +
      '</strong></div><div><span>รอตรวจ</span><strong>' + jobs.filter(job => job.status === "review").length + '</strong></div></div>' +
    '<div class="section-head"><h2>รายการประกาศ</h2></div>' +
    jobs.map(job => row(headingRow(job.title,badge(jobStates[job.status])) +
      '<p>' + html(state.employers[job.employer].name) + ' · ' + job.shifts.length + ' ช่วงเวลาทำงาน · ' + html(HappiUM2.formatJobPay(job, { currency })) + '</p>' +
      '<p class="job-applicant-count">ผู้สมัคร ' + (applicantsByJob.get(job.id)?.size || 0) + ' คน</p>' +
      (job.reason ? '<p class="approval-note">' + html(job.reason) + '</p>' : ''),
      button("ดูผู้สมัคร","job-applicants","secondary",job.id) + (job.status === "edits" ? button("แก้ตามข้อเสนอแนะ","edit-job","primary",job.id) : ["draft","rejected"].includes(job.status) ? button("แก้ประกาศ","edit-job","secondary",job.id) + button("ส่งตรวจ","submit-job","primary",job.id) : ""))).join("");
}
function revisionData(job) {
  const keys = ["title","kind","category","location","payType","rate","distance","description","skills","requiredSkills","requiredMajor","deadline","doc"];
  const values = keys.map(key => String(job[key] ?? (key === "payType" ? "hourly" : "")).trim());
  values.push(job.shifts.map(({day,start,end,capacity}) => [day,start,end,Number(capacity)]));
  return JSON.stringify(values);
}
function editor() {
  const job = jobBy(selected.job);
  const categoryOptions = Array.from(new Set([...HappiUM1.JOB_CATEGORIES, ...(job?.category ? [job.category] : [])]));
  const majors = [...new Set([...Object.values(state.students).map(student => student.major),job?.requiredMajor].filter(Boolean))];
  return header(job ? "แก้ประกาศ" : "สร้างประกาศ") + '<div class="guided-layout">' +
    '<section class="panel guided-main"><h2>' + icon("list") + 'รายละเอียดประกาศ</h2>' +
    form("job-editor",
    '<div class="field-grid">' +
    '<input type="hidden" name="employer" value="' + html(job?.employer || employerId) + '"><p class="field">ผู้จ้าง<strong>' + html(state.employers[job?.employer || employerId].name) + '</strong></p>'  +
    field("ชื่องาน","title",job?.title,"text","required maxlength=80") +
    selectField("ประเภทงาน","kind",Object.entries(groups),job?.kind || state.employers[employerId]?.type) +
    field("หมวดงาน","category",job?.category || "","text",'list="job-category-list" required maxlength=60') +
    (job?.reason ? callout("ข้อเสนอแนะจากมหาวิทยาลัย: " + job.reason,"wait") : "") +
    field("สถานที่หรือจุดนัดพบ (งานออนไลน์ระบุช่องทาง)","location",job?.location,"text","required maxlength=85") +
    selectField("สาขาที่รับ","requiredMajor",[["","ทุกสาขา"],...majors.map(major => [major,major])],job?.requiredMajor || "") +
    field("ระยะทางจาก มน. (กม.)","distance",job?.distance ?? 0,"number","required min=0 max=99 step=0.1") +
    field("วันปิดรับ","deadline",job?.deadline || "30 พ.ย. 2569","text","required maxlength=35") +
    selectField("เอกสารประกอบ","doc",[["no","ใช้โปรไฟล์"],["yes","ต้องแนบเอกสาร"]],job?.doc ? "yes" : "no") +
    HappiUM2.renderPayTypeField(job, { html }) +
    '</div>' +
    '<datalist id="job-category-list">' + categoryOptions.map(c => '<option value="' + html(c) + '"></option>').join("") + '</datalist>' +
    skillPicker("ทักษะจำเป็น","requiredSkills",job?.requiredSkills,"เลือกเฉพาะทักษะที่ต้องใช้ตั้งแต่เริ่มงาน") +
    skillPicker("ทักษะเสริม","skills",job?.skills,"เลือกทักษะที่มีแล้วได้เปรียบ") +
    HappiUM2.renderMultiShiftSection(job?.shifts, { html }) +
    area("หน้าที่", "description",job?.description),"บันทึกฉบับร่าง") + '</section>' +
    '<aside class="panel guided-summary"><h2>' + icon("info") + 'หลังบันทึก</h2><ol class="editor-steps">' +
    '<li>' + icon("list") + '<div><strong>ตรวจฉบับร่าง</strong><small>กลับมาแก้ไขได้จากหน้า «ประกาศของฉัน»</small></div></li>' +
    '<li>' + icon("check") + '<div><strong>ส่งตรวจเมื่อพร้อม</strong><small>ประกาศจะแสดงในหน้าหางานเมื่อเจ้าหน้าที่อนุมัติ</small></div></li>' +
    '</ol></aside></div>';
}
function employerSelector(label = "สลับบัญชีผู้จ้าง") {
  return '<div class="employer-switch employer-brand-row">' + employerEmblemHtml(employerId) + '<div style="flex:1;min-width:0">' + selectField(label,"demo-employer",
    Object.entries(state.employers).map(([id,employer])=>[id,employer.name]),employerId) + '</div></div>';
}
function canOffer(app) {
  return ownsApplication(app) && (app.status === "pending" || app.status === "offered") && active(jobBy(app.job));
}
function offerableShifts(app) {
  const job = jobBy(app.job), student = state.students[app.student];
  return job.shifts.filter(shift => !classConflictFor(student,shift) && available(job,shift,app.id)>0);
}
function employerApps() {
  const jobFilter = jobBy(selected.job);
  const list = state.applications.filter(app => ownsApplication(app) && (!jobFilter || app.job === jobFilter.id));
  const byJob = new Map();
  for (const app of list) {
    if (!byJob.has(app.job)) byJob.set(app.job,[]);
    byJob.get(app.job).push(app);
  }
  return header("ผู้สมัครตามประกาศ","อัปเดตสถานะการสมัคร คุยกับนิสิต และส่งข้อเสนอเวลาทำงาน · " + (state.employers[employerId]?.name || "")) +
    '<div class="workspace-tools">' + navButton("ไปที่หน้าแชท","chat","secondary") + '</div>' +
    (jobFilter ? panel(headingRow(jobFilter.title,navButton("ดูทุกประกาศ","applications","text-button"))) : "") +
    (list.length ? [...byJob].map(([id,items]) => {
      const job=jobBy(id);
      return '<div class="section-head"><h2>' + html(job.title) + '</h2><span>' + items.length + ' ใบสมัคร</span></div>' +
        items.map(app => {
          const shift = shiftBy(job,app.shift);
          const open = offerableShifts(app);
          const applicantStudent = state.students[app.student];
          const matchHtml = applicantStudent
            ? HappiUM1.renderEmployerApplicantMatch(applicantStudent, job, state, { available, classConflict: classConflictFor, hours, html })
            : "";
          const shiftLine = shift ? "เวลาทำงาน: " + time(shift)
            : app.status === "withdrawn" ? "นิสิตถอนใบสมัครแล้ว"
            : app.status === "resigned" ? "นิสิตแจ้งลาออกแล้ว" + (app.resignReason ? " (" + app.resignReason + ")" : "")
            : app.status === "offer_declined" ? "นิสิตปฏิเสธข้อเสนอเวลาทำงานแล้ว"
            : app.status === "declined" ? "แจ้งผลไม่ผ่านแล้ว"
            : "รอตกลงเวลาทำงานกับนิสิต";
          const controls = hiringButton(app) + button("เปิดแชท","chat","secondary",app.id) +
            (app.status === "pending" ? button("ส่งข้อเสนอเวลาทำงาน","review-offer","secondary",app.id) +
              button("แจ้งไม่ผ่าน","decline","danger",app.id) : "");
          return '<article class="panel employer-applicant-card">' +
            '<div>' +
              headingRow(app.profile.name,hiringBadge(app)) + hiringDetails(app) +
              matchHtml +
              applicationProfileDetails(app.profile) +
              '<p>' + html(shiftLine) + '</p>' +
              (!HappiUM3.isApplicationClosed(app.status) && app.status !== "accepted"
                ? '<p class="helper">' + html(open.length ? "เทียบจากตารางเรียน · ช่วงที่ไม่ชนเรียน: " + open.map(time).join(" / ") : "ยังไม่มีเวลาทำงานว่างที่ตรงกับตารางเรียน") + '</p>'
                : '') +
              (app.doc ? '<p>เอกสาร ' + html(app.doc) + '</p>' : '') +
            '</div>' +
            '<div class="employer-applicant-card-footer">' + controls + '</div>' +
          '</article>';
        }).join("");
    }).join("") : empty("ยังไม่มีผู้สมัคร","ใบสมัครจะปรากฏเมื่อมีนิสิตสมัครประกาศของร้านคุณ"));
}
const chatTimeFormat = new Intl.DateTimeFormat("th-TH", {hour:"2-digit", minute:"2-digit"});
const chatGlyph = '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.8 7.8 0 0 1-8 7.6H5l1.3-3.6A7 7 0 0 1 4 11.5a8 8 0 0 1 16 0Z"/><path d="M8.5 11.5h7"/></svg></span>';

function chatContact(app) {
  if (role === "employer") {
    return { name:app.profile.name, photo:validPhoto(app.profile.photo) ? app.profile.photo : "", glyph:"person" };
  }
  const id = jobBy(app.job).employer;
  const employer = state.employers[id];
  const artKind = employerArtKind(id);
  return { name:employer.name, photo:jobArt[artKind], artKind, glyph:employer.type === "campus" ? "campus" : "briefcase" };
}

function chatAvatar(contact) {
  return '<span class="chat-avatar" data-art="' + (contact.artKind || "") + '">' +
    (contact.photo ? '<img src="' + html(contact.photo) + '" alt="">' : icon(contact.glyph)) + '</span>';
}

function chatRooms(current) {
  // Deduplicate rooms by peer thread (student::employer) so applying twice NEVER shows duplicate chat rooms!
  const byThread = new Map();
  const eligible = state.applications.filter(canChat).slice().reverse().sort((a,b) =>
    (Date.parse(b.messages?.at(-1)?.at) || 0) - (Date.parse(a.messages?.at(-1)?.at) || 0));
  for (const app of eligible) {
    const empId = app.employer || jobBy(app.job)?.employer || "";
    const threadKey = app.student + "::" + empId;
    if (!byThread.has(threadKey) || app.id === current?.id) {
      byThread.set(threadKey, app);
    }
  }
  const rooms = [...byThread.values()];
  return rooms.map(app => {
    const peer = chatContact(app);
    const last = app.messages?.at(-1);
    const preview = last ? (last.from === role ? "คุณ: " : "") + (last.text || (last.photo ? "ส่งรูปภาพ" : "")) : "ยังไม่มีข้อความ";
    const statusText = last && last.from === role ? (last.status === "sending" ? "กำลังส่ง..." : "อ่านแล้ว") : "";
    const isCurrent = current && (current.id === app.id || ((current.employer || jobBy(current.job)?.employer) === (app.employer || jobBy(app.job)?.employer) && current.student === app.student));
    return '<button type="button" class="chat-room" data-action="chat" data-id="' + html(app.id) +
      '" data-room-search="' + html(peer.name.toLowerCase()) + '"' + (isCurrent ? ' aria-current="true"' : '') +
      '>' + chatAvatar(peer) + '<span class="chat-room-copy"><strong>' + html(peer.name) +
      '</strong><span class="chat-room-meta-row"><small class="chat-room-preview">' + html(preview) + '</small>' +
      (statusText ? '<small class="chat-room-status' + (statusText === "อ่านแล้ว" ? ' is-read' : '') + '">' + html(statusText) + '</small>' : '') +
      '</span></span></button>';
  }).join("");
}

function chatText(text) {
  const source = String(text || "");
  const pieces = [];
  let end = 0;
  for (const link of source.matchAll(/https?:\/\/[^\s<>]+|\bwww\.[^\s<>]+/gi)) {
    const target = link[0].replace(/[.,!?;:)\]}]+$/u,"");
    const href = /^www\./i.test(target) ? "https://" + target : target;
    try {
      const address = new URL(href);
      if (!["http:","https:"].includes(address.protocol) || address.username || address.password) continue;
      pieces.push(html(source.slice(end,link.index)),
        '<a href="' + html(address.href) + '" target="_blank" rel="noopener noreferrer">' + html(target) + '</a>');
      end = link.index + target.length;
    } catch {}
  }
  pieces.push(html(source.slice(end)));
  return pieces.join("");
}

const chatAttachmentTypes = ["image/jpeg","image/png","image/webp"];
let chatAttachmentPreview = "";

function releaseChatAttachmentPreview() {
  if (!chatAttachmentPreview) return;
  URL.revokeObjectURL(chatAttachmentPreview);
  chatAttachmentPreview = "";
}

function refreshChatAttachment(formEl) {
  const fileInput = formEl.querySelector('input[name="attachment"]');
  const preview = formEl.querySelector("[data-chat-pending-photo]");
  const image = preview.querySelector("img");
  const error = formEl.querySelector("[data-form-error]");
  let file = fileInput.files[0];
  releaseChatAttachmentPreview();
  image.removeAttribute("src");
  error.textContent = "";
  if (file && (!chatAttachmentTypes.includes(file.type) || file.size > 10_000_000)) {
    fileInput.value = "";
    error.textContent = "เลือกภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB";
    file = null;
  }
  preview.hidden = !file;
  if (!file) return;
  chatAttachmentPreview = URL.createObjectURL(file);
  image.src = chatAttachmentPreview;
}

function addChatLink(formEl) {
  const field = formEl.querySelector("[data-chat-link]");
  const error = formEl.querySelector("[data-chat-link-error]");
  const message = formEl.querySelector('textarea[name="message"]');
  const link = field.value.trim();
  try {
    const address = new URL(/^www\./i.test(link) ? "https://" + link : link);
    if (!["http:","https:"].includes(address.protocol) || address.username || address.password || /\s/.test(link)) {
      throw new Error();
    }
    const composed = [message.value.trimEnd(),address.href].filter(Boolean).join("\n");
    if (composed.length > message.maxLength) {
      error.textContent = "ข้อความพร้อมลิงก์ยาวเกิน 1,000 ตัวอักษร";
      return;
    }
    message.value = composed;
    field.value = "";
    error.textContent = "";
    formEl.querySelector("[data-chat-link-panel]").hidden = true;
    message.focus();
  } catch {
    error.textContent = "กรอกลิงก์ที่ขึ้นต้นด้วย https:// หรือ www.";
    field.focus();
  }
}

function chatAttachmentAction(buttonEl) {
  const formEl = buttonEl.closest(".chat-composer");
  if (!formEl) return;
  switch (buttonEl.dataset.chatAttach) {
    case "image":
      formEl.querySelector('input[name="attachment"]')?.click();
      break;
    case "remove-image":
      const input = formEl.querySelector('input[name="attachment"]');
      if (input) input.value = "";
      refreshChatAttachment(formEl);
      break;
  }
}

async function chatPhoto(file) {
  if (!chatAttachmentTypes.includes(file.type) || file.size > 10_000_000) {
    throw new Error("เลือกภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB");
  }
  const image = await createImageBitmap(file).catch(() => { throw new Error("เปิดรูปนี้ไม่ได้"); });
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1,1280 / Math.max(image.width,image.height));
    canvas.width = Math.max(1,Math.round(image.width * scale));
    canvas.height = Math.max(1,Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
    let photo = canvas.toDataURL("image/webp",.8);
    if (photo.length > 390000) photo = canvas.toDataURL("image/jpeg",.55);
    if (!validPhoto(photo) || photo.length > 390000) throw new Error("รูปยังใหญ่เกินไป ลองเลือกรูปที่เล็กลง");
    return photo;
  } finally {
    image.close();
  }
}

function showChatPhoto(id) {
  const app = appBy(selected.app);
  if (!canChat(app)) return;
  const photo = app.messages?.[Number(id)]?.photo;
  if (validPhoto(photo)) showDialog("รูปจากแชท",'<img class="chat-photo-full" src="' + html(photo) + '" alt="รูปที่แนบในแชท">');
}

function chatPage() {
  let app = appBy(selected.app);
  if (!canChat(app)) {
    const fallback = state.applications.filter(canChat).slice().reverse()[0];
    if (fallback) {
      app = fallback;
      selected.app = fallback.id;
    } else {
      return header("ข้อความแชท") + empty("ยังไม่มีห้องสนทนา","เมื่อมีการสมัครงาน ห้องแชทกับร้านหรือผู้สมัครจะแสดงที่นี่",navButton(role === "employer" ? "ดูผู้สมัคร" : "ไปหางาน", role === "employer" ? "applications" : "home","primary"));
    }
  }
  const job = jobBy(app.job);
  const peer = chatContact(app);
  const messages = (app.messages || []).map((message,index) => {
    const own = message.from === role;
    const date = new Date(message.at);
    const stamp = Number.isNaN(date.getTime()) ? "" : '<time datetime="' + date.toISOString() + '">' +
      chatTimeFormat.format(date) + '</time>';
    const readBadge = own ? '<span class="chat-msg-status">' + (message.status === "sending" ? "กำลังส่ง..." : "อ่านแล้ว") + '</span>' : '';
    return '<li class="chat-message' + (own ? ' own' : '') + '"><p class="helper">' +
      html(own ? "คุณ" : peer.name) + '</p>' +
      (message.text ? (window.__happiuChatEmoji ? window.__happiuChatEmoji.renderBubble(message.text, chatText) : '<p class="chat-message-text">' + chatText(message.text) + '</p>') : "") +
      (validPhoto(message.photo) ? '<button type="button" class="chat-photo-button" data-action="chat-photo" data-id="' + index +
        '" aria-label="เปิดรูปที่แนบในแชท"><img src="' + html(message.photo) + '" alt="" loading="lazy"></button>' : "") +
      '<div class="chat-msg-meta">' + stamp + readBadge + '</div></li>';
  }).join("");
  const composer = '<form class="chat-composer" data-form="chat-message">' +
    (window.__happiuChatEmoji ? window.__happiuChatEmoji.renderQuickBar() : '') +
    '<div class="chat-pending-photo" data-chat-pending-photo hidden><img alt="รูปที่เลือกไว้">' +
    '<button class="quiet" type="button" data-chat-attach="remove-image" aria-label="เอารูปออก">×</button></div>' +
    '<div class="chat-compose-controls">' +
    '<button type="button" class="chat-plus" data-chat-attach="image" aria-label="แนบรูปภาพ" title="แนบรูปภาพ">+</button>' +
    (window.__happiuChatEmoji ? window.__happiuChatEmoji.renderPicker() : '') +
    '<input type="file" name="attachment" accept="image/jpeg,image/png,image/webp" hidden>' +
    '<textarea aria-label="ข้อความ" name="message" placeholder="พิมพ์ข้อความ หรือวางลิงก์ได้เลย…" maxlength="1000" rows="1"></textarea>' +
    '<button class="primary" type="submit">ส่ง</button></div><p class="helper" role="alert" data-form-error></p></form>';
  return (selected.submitted ? callout("ส่งใบสมัครแล้ว คุยกับผู้จ้างเพื่อตกลงเวลาทำงานได้ที่นี่","good") : "") +
    '<div class="chat-shell">' +
      '<aside class="chat-rooms-pane" aria-label="รายชื่อห้องแชท">' +
        '<div class="chat-title-label">' + chatGlyph + '<strong>ห้องสนทนา</strong></div>' +
        '<label class="chat-room-search">' + icon("search") +
        '<input type="search" data-chat-search aria-label="ค้นหาชื่อร้านหรือผู้ติดต่อ" placeholder="ค้นหาชื่อร้าน..."></label>' +
        '<div class="chat-room-list">' + chatRooms(app) + '</div>' +
        '<p class="helper" data-chat-empty hidden>ไม่พบห้องสนทนา</p>' +
      '</aside>' +
      '<section class="chat-pane chat-thread" aria-label="ข้อความสนทนา">' +
        '<header class="chat-peer">' + chatAvatar(peer) +
          '<div><h2>' + html(peer.name) + '</h2><p>' + html(job?.title || "") + '</p></div>' +
        '</header>' +
        '<ol class="chat-log" aria-label="ประวัติการสนทนา" tabindex="0">' +
        (messages || '<li class="chat-empty">' + chatGlyph + 'เริ่มคุยเรื่องเวลาทำงานหรือรายละเอียดงานได้เลย</li>') +
        '</ol>' + composer +
      '</section>' +
    '</div>';
}

function employerWork() {
  const apps = state.applications.filter(app => ownsApplication(app) && (app.status === "accepted" || (app.status === "resigned" && (app.workSessions?.length || 0) > 0)));
  return header("รับรองชั่วโมงและตรวจรูปเช็กอิน","ตรวจรูปถ่ายพร้อมเวลาเข้า–ออกงานของนิสิต รับรองชั่วโมง และบันทึกการจ่ายเงินแต่ละรอบ · " + (state.employers[employerId]?.name || "")) +
    (apps.length ? apps.map(app => {
      const job = jobBy(app.job), shift = shiftBy(job, app.shift);
      const shiftLabel = shift ? time(shift) : "ตามตกลง";
      const sessions = app.workSessions || [];

      const sessionsHtml = sessions.length
        ? '<div class="work-session-list">' + sessions.map((ws, idx) => {
            const roundNo = sessions.length - idx;
            let controls = "";
            if (ws.status === "pending_approval") controls = '<button type="button" class="primary" data-action="approve-session" data-id="' + html(ws.id) + '"><img class="icon-3d-btn" src="/img/icons-3d/step-verified.png" alt="">รับรองชั่วโมงรอบนี้</button>';
            if (ws.status === "approved") controls = '<button type="button" class="secondary" data-action="pay-session" data-id="' + html(ws.id) + '"><img class="icon-3d-btn" src="/img/icons-3d/pay-wallet.png" alt="">บันทึกการจ่ายรอบนี้</button>';
            return '<article class="work-session-item">' +
              '<div class="work-session-top"><strong>รอบที่ ' + roundNo + ' · เข้า ' + html(formatSessionClock(ws.checkInAt)) + (ws.checkOutAt ? ' → ออก ' + html(formatSessionClock(ws.checkOutAt)) : ' (กำลังทำงานอยู่)') + '</strong>' +
              badge(sessionStatusLabels[ws.status] || ["บันทึกแล้ว",""]) + '</div>' +
              (ws.checkOutAt ? '<p class="helper">รวม ' + html(ws.hours) + ' ชม. · ค่าตอบแทนรอบนี้ <strong>' + html(currency(ws.amount)) + '</strong>' + (ws.paymentProof ? ' · เลขอ้างอิง: ' + html(ws.paymentProof) : '') + '</p>' : '<p class="helper">นิสิตกำลังทำงานอยู่ ยังไม่เช็กเอาต์</p>') +
              (ws.note ? '<p class="helper">หมายเหตุนิสิต: ' + html(ws.note) + '</p>' : '') +
              '<div class="work-session-photos">' +
                (validPhoto(ws.checkInPhotoUrl) ? '<button type="button" class="work-photo-thumb" data-action="view-work-photo" data-id="' + html(ws.checkInPhotoUrl) + '"><img src="' + html(ws.checkInPhotoUrl) + '" alt="รูปเข้างาน" loading="lazy"><span>รูปเข้างาน · ' + html(formatSessionClock(ws.checkInAt)) + '</span></button>' : '') +
                (validPhoto(ws.checkOutPhotoUrl) ? '<button type="button" class="work-photo-thumb" data-action="view-work-photo" data-id="' + html(ws.checkOutPhotoUrl) + '"><img src="' + html(ws.checkOutPhotoUrl) + '" alt="รูปออกงาน" loading="lazy"><span>รูปออกงาน · ' + html(formatSessionClock(ws.checkOutAt)) + '</span></button>' : '') +
              '</div>' +
              (controls ? '<div class="actions">' + controls + '</div>' : '') +
            '</article>';
          }).join("") + '</div>'
        : '<p class="helper">นิสิตยังไม่ได้กดเช็กอินรอบแรก</p>';

      return '<section class="panel work-job-card">' +
        headingRow(app.profile.name + " · " + (job?.title || "ประกาศงาน"), app.status === "resigned" ? tag("นิสิตลาออกแล้ว","bad") : tag("กำลังทำงาน","good")) +
        '<p class="helper">เวลาทำงาน: ' + html(shiftLabel) + '</p>' +
        sessionsHtml +
        HappiUM4.renderShiftReviewsSummary(app, "employer", { html }) +
        HappiUM4.renderReviewForm(app, "employer", { html }) +
      '</section>';
    }).join("") : empty("ยังไม่มีนิสิตที่รับเข้าทำงาน","เมื่อรับนิสิตเข้าทำงานและนิสิตถ่ายรูปลงเวลา รายการจะปรากฏในหน้านี้"));
}
function employerProfile() {
  const opts = {verified:["ผ่านการรับรอง","good"], pending:["รอตรวจ","wait"], update:["ขอข้อมูลเพิ่ม","bad"]};
  return header("ข้อมูลผู้จ้าง","หน่วยงานใน มน. และผู้จ้างรอบมหาวิทยาลัย") +
    [[employerId,state.employers[employerId]]].map(([id,e]) => panel('<div class="employer-brand-row">'  + employerEmblemHtml(id) + '<div style="flex:1;min-width:0">' + headingRow(e.name,badge(opts[e.status])) + '</div></div>' +
      (e.reason ? callout(e.reason,"wait") : "") +
      form("employer-profile",
        '<input type="hidden" name="employer" value="' + id + '">' + field("ผู้ติดต่อ","contact",e.contact,"email","required") +
        '<label class="field">เอกสารประกอบ<input type="file" name="document"></label>',"บันทึกและส่งตรวจ"))).join("");
}
function adminJobEmployer(id) {
  const employer = state.employers[id];
  const artwork = employerArtKind(id);
  const image = jobArt[artwork];
  const glyph = employer.type === "campus" ? "campus" : "briefcase";
  const emblem = image ? '<img src="' + image + '" alt="">' : icon(glyph);
  const status = employer.status === "verified" ? tag("ผ่านการรับรอง","good") : tag("รอตรวจข้อมูล","wait");
  return '<div class="admin-job-employer"><span class="job-emblem" data-art="' + artwork + '">' +
    emblem + '</span><div class="admin-job-employer-name"><span class="helper">ผู้จ้าง</span><strong>' +
    html(employer.name) + '</strong></div>' + status + '</div>';
}
function adminJobs() {
  const ordered = [...state.jobs].sort((a,b)=> Number(b.status === "review") - Number(a.status === "review"));
  return header("ตรวจประกาศงาน","ประกาศจะปรากฏในหน้าหางานหลังเจ้าหน้าที่อนุมัติ") +
    '<div class="stats workspace-stats"><div><span>รอตรวจ</span><strong>' + ordered.filter(job => job.status === "review").length +
      '</strong></div><div><span>เปิดรับอยู่</span><strong>' + ordered.filter(active).length +
      '</strong></div><div><span>ระงับประกาศ</span><strong>' + ordered.filter(job => job.status === "paused").length + '</strong></div></div>' +
    ordered.map(job => panel(headingRow(job.title,badge(jobStates[job.status])) +
      adminJobEmployer(job.employer) +
      dataList([["หน้าที่",job.description],["สถานที่",job.location],["กะ",job.shifts.map(time).join(" / ")],["ค่าจ้าง",HappiUM2.formatJobPay(job, { currency })]]) +
      (job.reason ? callout(job.reason, "info") : "") +
      (job.status === "review" ? callout(state.employers[job.employer].status === "verified"
        ? "ตรวจค่าจ้าง หน้าที่ และเงื่อนไขก่อนเผยแพร่"
        : "รับรองผู้จ้างในเมนูตรวจผู้จ้างก่อนเผยแพร่ประกาศนี้","info") + actions(
        (state.employers[job.employer].status !== "verified" ? button("ไปตรวจผู้จ้างรายนี้","review-company","primary",job.employer) : "") +
        button("อนุมัติเผยแพร่","publish","primary",job.id,state.employers[job.employer].status !== "verified") +
        button("ส่งกลับให้แก้","job-edits","secondary",job.id) + button("ปฏิเสธ","job-reject","danger",job.id)) : ""))).join("");
}
function adminEmployers() {
  const labels={verified:["ผ่านการรับรอง","good"],pending:["รอตรวจ","wait"],update:["ขอข้อมูลเพิ่ม","bad"]};
  const verified = selected.queue === "verified";
  const entries = Object.entries(state.employers);
  const queue = entries.filter(([id,e]) => selected.company ? id === selected.company : (e.status === "verified") === verified);
  const queues = [["pending","รอตรวจและติดตาม"],["verified","รับรองแล้ว"]];
  return header("ตรวจผู้จ้าง") + (selected.company ? navButton("กลับไปตรวจประกาศ","home","text-button") :
    '<div class="filters" aria-label="คิวผู้จ้าง">' + queues.map(([id,label]) =>
      '<button class="chip" type="button" data-action="company-queue" data-id="' + id + '" aria-pressed="' + ((id === "verified") === verified) + '">' +
      label + ' (' + entries.filter(([,e]) => (e.status === "verified") === (id === "verified")).length + ')</button>').join("") + '</div>') +
    (queue.length ? "" : empty("ไม่มีผู้จ้างในคิวนี้","เลือกรายการอีกฝั่งเพื่อดูข้อมูลผู้จ้าง")) +
    queue.map(([id,e]) => panel('<div class="employer-brand-row">' + employerEmblemHtml(id) + '<div style="flex:1;min-width:0">' + headingRow(e.name,badge(labels[e.status])) + '</div></div>' +
      dataList([["ประเภท",groups[e.type]],["ผู้ติดต่อ",e.contact],["เอกสาร",e.document || "ยังไม่มีเอกสารแนบ"]]) +
      (e.reason ? callout(e.reason,"info") : "") +
      (e.status !== "verified" ? actions(button("รับรองผู้จ้าง","verify-employer","primary",id) + button("ขอข้อมูลเพิ่ม","employer-update","secondary",id)) : ""))).join("");
}
function reportForm() {
  const job=jobBy(selected.job);
  if (!job) return studentReports();
  if (!state.signedIn) return login();
  return header("แจ้งงานเสี่ยง",job.title) + panel(form("new-report",
    selectField("เหตุที่แจ้ง","reason",[["ขอเงินล่วงหน้า","ขอเงินล่วงหน้า"],["ข้อมูลไม่ตรงประกาศ","ข้อมูลไม่ตรงประกาศ"],["อื่น ๆ","อื่น ๆ"]],"") +
    area("รายละเอียด","detail") + '<label class="field">ไฟล์ประกอบ (ถ้ามี)<input type="file" name="attachment"></label>',"ส่งเรื่องให้มหาวิทยาลัย"));
}
function studentReports() {
  return header("เรื่องที่แจ้ง","ติดตามผลจากเจ้าหน้าที่มหาวิทยาลัย") +
    (studentReportsList().length ? studentReportsList().map(r=>panel(headingRow(jobBy(r.job).title,badge(reportStates[r.status])) +
      dataList([["เหตุที่แจ้ง",r.reason],["รายละเอียด",r.detail],["ผลจากเจ้าหน้าที่",r.result || "รอการพิจารณา"]]))).join("") :
      empty("ยังไม่มีเรื่องที่แจ้ง","เปิดรายละเอียดของประกาศเพื่อส่งเรื่อง",navButton("กลับไปหางาน","home")));
}
function employerReports() {
  const list = state.reports.filter(r=>r.request);
  return header("ชี้แจงเรื่องร้องเรียน") +
    (list.length ? list.map(r=>panel(headingRow(jobBy(r.job).title,badge(reportStates[r.status])) +
      dataList([["คำขอข้อมูล",r.request],["คำชี้แจง",r.reply || "ยังไม่ส่งคำชี้แจง"]]) +
      (r.status !== "closed" ? form("reply-report",'<input type="hidden" name="report" value="' + html(r.id) + '">' + area("คำชี้แจง","reply",r.reply),"ส่งคำชี้แจง") : ""))).join("") :
      empty("ยังไม่มีเรื่องที่ต้องชี้แจง","รายการจะแสดงเมื่อเจ้าหน้าที่ส่งคำขอข้อมูล"));
}
function adminReports() {
  return header("เรื่องร้องเรียน","ตรวจรายละเอียด ขอคำชี้แจง และแจ้งผลกลับให้นิสิต") +
    (state.reports.length ? state.reports.map(r=>panel(headingRow(jobBy(r.job).title,badge(reportStates[r.status])) +
      dataList([["เหตุ",r.reason],["รายละเอียด",r.detail],["ไฟล์",r.attachment || "ไม่มี"],["คำขอข้อมูล",r.request || "ยังไม่ส่ง"],["คำชี้แจง",r.reply || "ยังไม่มี"],["ผล",r.result || "ยังไม่สรุป"]]) +
      (r.status !== "closed" ? actions((r.status === "new" ? button("เริ่มตรวจ","start-report","primary",r.id) : "") +
        button("ขอคำชี้แจง","request-reply","secondary",r.id) + button("สรุปผล","close-report","primary",r.id) +
        button("ระงับประกาศ","pause-report","danger",r.id)) : ""))).join("") :
      empty("ยังไม่มีเรื่องร้องเรียน","ลองส่งเรื่องจากหน้าประกาศฝั่งนิสิต"));
}
const pages = {
  student:{landing,home:studentHome, detail, login, apply, schedule:studentSchedule, applications:studentApps, offer, chat:chatPage, work:studentWork, reports:studentReports, report:reportForm, profile:profileForm,
    "application-sent":applicationSent,"recommendation-setup":recommendationSetup},
  employer:{home:employerHome, editor, applications:employerApps, chat:chatPage, work:employerWork, reports:employerReports, profile:employerProfile},
  admin:{home:adminJobs, profile:adminEmployers, reports:adminReports}
};
let stopLandingCarousel = () => {};
function render(focus) {
  stopLandingCarousel();
  releaseChatAttachmentPreview();
  mainNav();
  main.innerHTML = (page === "login" ? login : tutorPages[page] || pages[role][page] || pages[role].home)();
  stopLandingCarousel = attachLandingCarousel(main.querySelector("#landing-jobs-track"));
  if (page === "schedule" && state.signedIn && role === "student") {
    const ttRoot = main.querySelector("[data-tt2d-root]");
    if (ttRoot && window.HappiUTimetable2D) {
      HappiUTimetable2D.bind2DEvents(
        ttRoot,
        () => currentStudent()?.schedule || [],
        async (nextSchedule, msg) => {
          try {
            const res = await HappiUApi.saveStudentSchedule(nextSchedule);
            applyServerState(res.state);
            render(false);
            announce(msg || "บันทึกตารางเรียนแล้ว");
          } catch (err) {
            announce(err.message || "บันทึกตารางเรียนไม่สำเร็จ");
          }
        }
      );
    }
  }
  if (page === "chat") {
    const log = main.querySelector(".chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  }
  if (focus && page === "detail" && selected.showWorkplace) {
    const workplace = main.querySelector("#job-workplace");
    if (workplace) {
      workplace.focus({preventScroll:true});
      workplace.scrollIntoView({block:"start"});
      return;
    }
  }
  if (focus && page === "home" && selected.showRecommendations) {
    const heading = main.querySelector("#recommendations-heading");
    heading?.focus({preventScroll:true});
    heading?.scrollIntoView({block:"start"});
    return;
  }
  if (focus) {
    main.focus({preventScroll:true});
    window.scrollTo({top:0});
  }
}

function commit(next, message, params) {
  save();
  go(next,params);
  announce(message);
}

function signIn() {
  const {after, showStudentChoices, ...params} = selected;
  role = after ? "student" : loginRole;
  if (!after && role === "student") filters = emptyFilters();
  state.signedIn = true;
  state.demoRole = role;
  if (after === "apply" && !active(jobBy(params.job) || {})) {
    persist();
    go("detail",{job:params.job});
    return announce("ประกาศนี้ปิดรับแล้ว");
  }
  commit(after || "home","เข้าสู่ระบบแล้ว",params);
}

async function submitApplication(data,error) {
  const job=jobBy(selected.job);
  if (role !== "student" || !state.signedIn || !job || !active(job)) return error("ประกาศนี้ไม่สามารถส่งใบสมัครเพิ่มได้");
  const already = existing(job);
  if (already) {
    go("chat", { app: already.id });
    return announce("คุณสมัครงานนี้ไปแล้ว เปิดห้องแชทเดิมให้แล้วครับ");
  }
  const doc=data.get("document")?.name || "";
  if (job.doc && !doc) return error("แนบเอกสารก่อนส่งใบสมัคร");
  const showSetup = !studentApplications().length && !HappiUM1.hasRecommendationProfile(currentStudent());
  try {
    const res = await HappiUApi.applyJob({ jobId: job.id, doc, shared: data.getAll("share") });
    applyServerState(res.state);
    if (res.duplicate) {
      go("chat", { app: res.applicationId });
      return announce("คุณสมัครงานนี้ไปแล้ว เปิดห้องแชทเดิมให้แล้วครับ");
    }
    go(showSetup ? "application-sent" : "chat",{app:res.applicationId,submitted:true});
    announce("ส่งใบสมัครแล้ว");
  } catch (err) {
    error(err.message || "บันทึกใบสมัครไม่ได้ กรุณาลองใหม่");
  }
}
async function submitEditor(data,error,formEl) {
  const shiftErr = formEl?.querySelector("[data-shift-error]");
  if (shiftErr) shiftErr.textContent = "";
  const vals=Object.fromEntries(data);
  const old=jobBy(selected.job);
  const id=old?.id || "";
  const payType = data.get("payType") === "fixed" ? "fixed" : "hourly";
  const rate = Number(vals.rate);
  if (!Number.isFinite(rate) || rate <= 0) return error("กรอกค่าตอบแทนมากกว่า 0 บาท");
  const distance = Number(vals.distance);
  if (!Number.isFinite(distance) || distance < 0) return error("กรอกระยะทางให้ถูกต้อง");
  const title = String(vals.title || "").trim();
  const description = String(vals.description || "").trim();
  const location = String(vals.location || "").trim();
  const category = String(vals.category || "").trim();
  const required = HappiUM1.skillList(vals.requiredSkills);
  const requiredKeys = new Set(required.map(HappiUM1.skillKey));
  const skills = HappiUM1.skillList(vals.skills).filter(skill => !requiredKeys.has(HappiUM1.skillKey(skill))).join(", ");
  const requiredSkills = required.join(", ");
  const requiredMajor = String(vals.requiredMajor || "").trim();
  const deadline = String(vals.deadline || "").trim();
  if (!title || !description || !location || !category || !deadline) {
    return error("กรอกชื่องาน หน้าที่ สถานที่ หมวดงาน และวันปิดรับก่อนบันทึก");
  }
  const shiftResult = HappiUM2.parseAndValidateShifts(formEl || data, id || newId("job"), old?.shifts);
  if (!shiftResult.ok) {
    if (shiftErr) shiftErr.textContent = shiftResult.error;
    return error(shiftResult.error);
  }
  try {
    const res = await HappiUApi.saveJob({
      id,
      title,
      kind: vals.kind,
      jobType: vals.kind === "online" ? "online" : "part-time",
      category,
      location,
      payType,
      rate,
      distance,
      description,
      skills,
      requiredSkills,
      requiredMajor,
      deadline,
      doc: vals.doc === "yes",
      shifts: shiftResult.shifts
    });
    applyServerState(res.state);
    go("home");
    announce("บันทึกฉบับร่างแล้ว");
  } catch (err) {
    error(err.message || "บันทึกประกาศไม่สำเร็จ");
  }
}
function actionForm(title, explanation, action, id, label) {
  dialog.innerHTML = '<h2 id="dialog-title">' + html(title) + '</h2><p>' + html(explanation) + '</p>' +
    form("decision",'<input type="hidden" name="command" value="' + html(action) + '"><input type="hidden" name="id" value="' + html(id) + '">' + (action === "job-edits" ?
      selectField("ส่วนที่ต้องแก้","reviewField",[["general","รายละเอียดประกาศ"],["location","สถานที่หรือจุดนัดพบ"]],"general") : "") + area(label,"reason"),"ยืนยัน") +
    button("ยกเลิก","close-dialog","text-button");
  dialog.showModal();
}
const forms = {
  async "unified-login"(data, error) {
    const identifier = String(data.get("identifier") || "").trim();
    const password = String(data.get("password") || "");
    if (!identifier || !password) return error("กรอกรหัสประจำตัวหรืออีเมล และรหัสผ่านให้ครบ");
    try {
      const res = await HappiUApi.login(identifier, password);
      HappiUApi.setToken(res.token);
      applyServerState(res.state, res.user);
      const { after, ...params } = selected;
      if (res.user.role === "student" && after) {
        if (after === "apply" && !active(jobBy(params.job) || {})) {
          go("detail", { job: params.job });
          return announce("ประกาศนี้ปิดรับแล้ว");
        }
        go(after, params);
      } else {
        filters = emptyFilters();
        go("home");
      }
      announce("เข้าสู่ระบบในฐานะ " + names[res.user.role] + " แล้ว");
    } catch (err) {
      error(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    }
  },
  async "unified-register"(data, error) {
    const payload = {
      identifier: String(data.get("identifier") || "").trim(),
      name: String(data.get("name") || "").trim(),
      password: String(data.get("password") || ""),
      faculty: String(data.get("faculty") || "").trim(),
      major: String(data.get("major") || "").trim(),
      year: Number(data.get("year") || 1),
      type: String(data.get("type") || "near")
    };
    if (!payload.identifier || !payload.name || !payload.password) {
      return error("กรอกข้อมูลให้ครบถ้วน");
    }
    try {
      const res = await HappiUApi.register(payload);
      HappiUApi.setToken(res.token);
      applyServerState(res.state, res.user);
      const { after, ...params } = selected;
      if (res.user.role === "student" && after) {
        go(after, params);
      } else {
        filters = emptyFilters();
        go("home");
      }
      announce("สร้างบัญชีและเข้าสู่ระบบเรียบร้อยแล้ว");
    } catch (err) {
      error(err.message || "สมัครสมาชิกไม่สำเร็จ");
    }
  },
  "recommendation-step1"(data, error) {
    const skills = HappiUM1.skillList(data.get("skills")).join(", ");
    if (!skills) return error("กรุณาเลือกหรือเพิ่มทักษะอย่างน้อย 1 อย่างก่อนกดถัดไป");
    go("recommendation-setup", { ...selected, setupStep: 2, draftSkills: skills });
  },
  async "recommendation-setup"(data,error) {
    if (role !== "student" || !state.signedIn) return;
    const skills = HappiUM1.skillList(data.get("skills") || selected.draftSkills || currentStudent()?.skills).join(", ");
    const interests = data.getAll("interests");
    const availability = selectedAvailability(data);
    if (!skills) return error("เลือกทักษะอย่างน้อย 1 อย่าง");
    if (availability === null) return error("เลือกวันและเวลาให้ครบ โดยให้เวลาสิ้นสุดอยู่หลังเวลาเริ่ม");
    try {
      const res = await HappiUApi.updateStudentProfile({ skills, interests, availability, hideSkillsBanner: false });
      applyServerState(res.state);
      go("home",{showRecommendations:true});
      announce("บันทึกข้อมูลทักษะและความสนใจสำหรับแนะนำงานแล้ว");
    } catch (err) {
      error(err.message || "บันทึกข้อมูลไม่ได้ กรุณาลองใหม่");
    }
  },
  "tutor-search": filterTutors,
  "tutor-editor": saveTutor,
  "tutor-contact": requestTutor,
  "tutor-review": submitTutorReview,
  async "ai-schedule"(data, error, formEl) {
    if (role !== "student" || !state.signedIn) return;
    const text = String(data.get("text") || "").trim();
    const mode = String(data.get("mode") || "merge");
    const imgFile = data.get("scheduleImage");
    const submitBtn = formEl?.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "AI กำลังวิเคราะห์..."; }
    try {
      const imageDataUrl = imgFile?.name ? await fileToDataUrl(imgFile, 6 * 1024 * 1024) : "";
      const res = await HappiUApi.aiParseSchedule({ text, imageDataUrl, mode });
      applyServerState(res.state);
      render(false);
      announce("AI สร้างตารางเรียนเพิ่ม " + res.addedCount + " วิชาเรียบร้อยแล้ว (ลากวางจัดใหม่ได้)");
    } catch (err) {
      error(err.message || "AI วิเคราะห์ตารางเรียนไม่สำเร็จ");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<img class="icon-3d-btn" src="/img/icons-3d/ai-sparkle.png" alt="">ให้ AI สร้างตารางเรียน'; }
    }
  },
  async "add-schedule-class"(data, error) {
    if (role !== "student" || !state.signedIn) return;
    const day = String(data.get("day") || "").trim();
    const course = String(data.get("course") || "").trim();
    const start = String(data.get("start") || "").trim();
    const end = String(data.get("end") || "").trim();
    const code = String(data.get("code") || "").trim() || "COURSE";
    const room = String(data.get("room") || "").trim();
    if (!day || !course || !start || !end || start >= end) {
      return error("กรุณากรอกวัน ชื่อวิชา และเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
    }
    try {
      const current = Array.isArray(currentStudent()?.schedule) ? currentStudent().schedule : [];
      const next = [...current, { id: newId("cls"), day, start, end, course, code, room, section: "1" }];
      const res = await HappiUApi.saveStudentSchedule(next);
      applyServerState(res.state);
      render(false);
      announce("เพิ่มวิชา " + course + " ลงในตารางเรียนแล้ว");
    } catch (err) {
      error(err.message || "เพิ่มวิชาเรียนไม่สำเร็จ");
    }
  },
  "landing-search"(data) {
    const q = String(data.get("q") || "").trim();
    filters = {...emptyFilters(), q};
    go("home");
  },
  async "update-hiring"(data,error) {
    const app = appBy(data.get("application"));
    if (!canUpdateHiring(app)) return error("เปลี่ยนสถานะใบสมัครนี้ไม่ได้");
    const stage = data.get("stage");
    if (!Object.hasOwn(hiringStages,stage)) return error("เลือกสถานะการสมัคร");
    const note = String(data.get("note") || "").trim();
    if (note.length > 600) return error("หมายเหตุต้องยาวไม่เกิน 600 ตัวอักษร");
    let interview = null;
    if (stage === "interview") {
      interview = {mode:"chat"};
      if (data.get("meetingMode") === "scheduled") {
        const when = String(data.get("meetingTime") || "");
        const place = String(data.get("meetingPlace") || "").trim();
        if (!when || !Number.isFinite(Date.parse(when)) || !place) return error("ระบุวัน เวลา และสถานที่สัมภาษณ์ให้ครบ");
        interview = {mode:"scheduled",when,place};
      }
    }
    try {
      const res = await HappiUApi.updateHiring(app.id, { stage, note, interview });
      applyServerState(res.state);
      dialog.close();
      render(false);
      announce(stage === "hired" ? "รับเข้าทำงานแล้ว — อัปเดตตารางงานและหน้าเช็กอินฝั่งนิสิตทันที!" : "บันทึกสถานะการสมัครแล้ว");
    } catch (err) {
      error(err.message || "อัปเดตสถานะไม่สำเร็จ");
    }
  },
  search(data) { filters.q=String(data.get("q")).trim(); render(false); main.querySelector('input[type=search]')?.focus(); },
  application:submitApplication,
  "job-editor":submitEditor,
  async "chat-message"(data,error,formEl) {
    const app = appBy(selected.app);
    if (!canChat(app)) return error("เปิดห้องนี้จากใบสมัครของคุณ");
    const message = String(data.get("message") || "").trim();
    const file = data.get("attachment");
    if ((!message && !file?.name) || message.length > 1000) return error("พิมพ์ข้อความไม่เกิน 1,000 ตัวอักษร หรือเลือกรูป");

    const control = formEl?.querySelector('[type="submit"]');
    if (control) control.disabled = true;
    try {
      let photoDataUrl = "";
      if (file?.name) photoDataUrl = await chatPhoto(file);
      // Optimistic "กำลังส่ง..." preview
      const optimistic = { from: role, text: message, photo: photoDataUrl || undefined, status: "sending", at: new Date().toISOString() };
      (app.messages ||= []).push(optimistic);
      render(false);
      const res = await HappiUApi.sendMessage(app.id, { text: message, photoDataUrl });
      applyServerState(res.state);
      render(false);
      announce("ส่งข้อความแล้ว");
      main.querySelector('textarea[name="message"]')?.focus();
    } catch (err) {
      error(err.message || "ส่งข้อความไม่ได้");
      render(false);
    } finally {
      if (control) control.disabled = false;
    }
  },
  async "shift-offer"(data,error) {
    const app=appBy(data.get("application"));
    if (!canOffer(app)) return error("ส่งข้อเสนอสำหรับใบสมัครนี้ไม่ได้");
    const shift=offerableShifts(app).find(shift=>shift.id===data.get("shift"));
    if (!shift) return error("เลือกเวลาทำงานว่างที่ไม่ชนตารางเรียนของนิสิต");
    try {
      const res = await HappiUApi.sendOffer(app.id, shift.id);
      applyServerState(res.state);
      dialog.close();
      render(false);
      announce("ส่งข้อเสนอเวลาทำงานให้นิสิตแล้ว");
    } catch (err) {
      error(err.message || "ส่งข้อเสนอไม่สำเร็จ");
    }
  },
  async "student-profile"(data,error) {
    if (role !== "student" || !state.signedIn) return;
    const availability = selectedAvailability(data);
    if (availability === null) return error("เลือกวันและเวลาให้ครบ โดยให้เวลาสิ้นสุดอยู่หลังเวลาเริ่ม");
    const payload = {
      nick: String(data.get("nick") || "").trim(),
      faculty: String(data.get("faculty") || "").trim(),
      major: String(data.get("major") || "").trim(),
      intro: String(data.get("intro") || "").trim(),
      experience: String(data.get("experience") || "").trim(),
      availability,
      skills: HappiUM1.skillList(data.get("skills")).join(", "),
      interests: data.getAll("interests").map(item => String(item).trim()).filter(Boolean),
      removePhoto: data.get("remove-photo") === "on"
    };
    try {
      const image = data.get("photo");
      if (image?.name) {
        payload.photoDataUrl = await fileToDataUrl(image, 5 * 1024 * 1024);
      }
      const res = await HappiUApi.updateStudentProfile(payload);
      applyServerState(res.state);
      render(false);
      announce("บันทึกโปรไฟล์และรูปจริงเรียบร้อยแล้ว");
    } catch (err) {
      error(err.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    }
  },
  async "shift-review"(data,error) {
    const appId = String(data.get("appId") || "").trim();
    const rating = Number(data.get("rating"));
    const comment = String(data.get("comment") || "").trim();
    try {
      const res = await HappiUApi.submitReview(appId, rating, comment);
      applyServerState(res.state);
      render(false);
      announce(role === "student" ? "ส่งผลประเมินงานแล้ว" : "ส่งผลประเมินนิสิตแล้ว");
    } catch (err) {
      error(err.message || "ส่งผลประเมินไม่สำเร็จ");
    }
  },
  async "employer-profile"(data, error) {
    if (role !== "employer") return;
    try {
      const res = await HappiUApi.updateEmployerProfile({
        contact: String(data.get("contact") || "").trim(),
        document: data.get("document")?.name || ""
      });
      applyServerState(res.state);
      render(false);
      announce("ส่งข้อมูลให้เจ้าหน้าที่ตรวจแล้ว");
    } catch (err) {
      error(err.message || "บันทึกข้อมูลผู้จ้างไม่สำเร็จ");
    }
  },
  async "new-report"(data,error) {
    const detail=String(data.get("detail") || "").trim();
    if (!detail) return error("ระบุรายละเอียดก่อนส่งเรื่อง");
    try {
      const res = await HappiUApi.createReport({
        jobId: selected.job,
        reason: data.get("reason"),
        detail,
        attachment: data.get("attachment")?.name || ""
      });
      applyServerState(res.state);
      go("reports");
      announce("ส่งเรื่องให้มหาวิทยาลัยแล้ว");
    } catch (err) {
      error(err.message || "ส่งเรื่องไม่สำเร็จ");
    }
  },
  async "reply-report"(data,error) {
    const reply=String(data.get("reply") || "").trim();
    if (!reply) return error("กรอกคำชี้แจงก่อนส่ง");
    try {
      const res = await HappiUApi.replyReport(data.get("report"), reply);
      applyServerState(res.state);
      render(false);
      announce("ส่งคำชี้แจงแล้ว");
    } catch (err) {
      error(err.message || "ส่งคำชี้แจงไม่สำเร็จ");
    }
  },
  async decision(data,error) {
    const id=data.get("id"), reason=String(data.get("reason") || "").trim();
    const command=data.get("command");
    if (!reason && command !== "resign-confirm") return error("กรอกข้อมูลก่อนยืนยัน");
    try {
      let res;
      if (command === "job-edits" || command === "job-reject") {
        res = await HappiUApi.adminJobDecision(id, command === "job-edits" ? "edits" : "reject", reason);
      } else if (command === "employer-update") {
        res = await HappiUApi.adminEmployerDecision(id, "update", reason);
      } else if (command === "pay-session") {
        res = await HappiUApi.paySession(id, reason);
      } else if (command === "resign-confirm") {
        res = await HappiUApi.resignJob(id, reason);
      } else if (command === "request-reply" || command === "close-report" || command === "pause-report") {
        const mapped = command === "request-reply" ? "request-reply" : command === "pause-report" ? "pause" : "close";
        res = await HappiUApi.adminReportDecision(id, mapped, reason);
      }
      if (res?.state) applyServerState(res.state);
      dialog.close();
      render(false);
      announce(command === "resign-confirm" ? "แจ้งลาออกจากงานเรียบร้อยแล้ว (ประวัติและรายได้รอบเดิมยังอยู่ครบ)" : "บันทึกผลเรียบร้อยแล้ว");
    } catch (err) {
      error(err.message || "ดำเนินการไม่สำเร็จ");
    }
  }
};
function syncShiftEditorRows(listEl) {
  if (!listEl) return;
  const rows = Array.from(listEl.querySelectorAll("[data-shift-row]"));
  rows.forEach((rowEl, idx) => {
    rowEl.dataset.shiftIndex = String(idx);
    const titleEl = rowEl.querySelector(".shift-editor-header strong");
    if (titleEl) titleEl.textContent = "กะที่ " + (idx + 1);
    const rmBtn = rowEl.querySelector('[data-action="remove-shift-row"]');
    if (rmBtn) {
      rmBtn.dataset.shiftIndex = String(idx);
      rmBtn.disabled = rows.length <= 1;
      if (rows.length <= 1) rmBtn.setAttribute("aria-disabled", "true");
      else rmBtn.removeAttribute("aria-disabled");
    }
  });
}
const operations = {
  "toggle-nav"() {
    if (page === "chat") {
      chatNavOpen = !chatNavOpen;
    } else {
      navCollapsed = !navCollapsed;
    }
    mainNav();
  },
  "auth-mode"(mode) {
    if (mode !== "login" && mode !== "register") return;
    loginMode = mode;
    render(false);
  },
  "setup-step-back"() {
    go("recommendation-setup", { ...selected, setupStep: 1 });
  },
  async "dismiss-skills-banner"() {
    if (role !== "student" || !state.signedIn) return;
    try {
      const res = await HappiUApi.updateStudentProfile({ hideSkillsBanner: true });
      applyServerState(res.state);
      render(false);
      announce("ซ่อนส่วนเพิ่มทักษะแล้ว (แก้ไขได้ตลอดที่หน้าโปรไฟล์)");
    } catch (err) {
      announce(err.message || "ดำเนินการไม่สำเร็จ");
    }
  },
  "delete-tutor"(id) {
    const tutor = tutorBy(id);
    if (!tutor || !canPostTutor() || tutor.owner !== state.studentId) return;
    showDialog(
      "ยืนยันการลบประกาศรับสอน",
      "<p>ต้องการลบประกาศ <strong>" + html(tutor.subject) + "</strong> ออกจากระบบใช่หรือไม่? การลบไม่สามารถย้อนกลับได้</p>",
      button("ยืนยันลบประกาศ", "confirm-delete-tutor", "danger", tutor.id)
    );
  },
  async "confirm-delete-tutor"(id) {
    try {
      const res = await HappiUApi.deleteTutor(id);
      applyServerState(res.state);
      dialog.close();
      go("tutors");
      announce("ลบประกาศรับสอนเรียบร้อยแล้ว");
    } catch (err) {
      dialog.close();
      announce(err.message || "ลบประกาศไม่สำเร็จ");
    }
  },
  "photo-check-in"(appId) {
    const app = appBy(appId);
    if (!studentOwns(app) || app.status !== "accepted") return;
    const job = jobBy(app.job);
    HappiUPhotoCheckin.openPhotoCheckinModal(dialog, {
      mode: "check-in",
      jobTitle: job?.title || "งานพาร์ตไทม์",
      location: job?.location || "มหาวิทยาลัยนเรศวร",
      studentName: currentStudent()?.name || "นิสิต มน.",
      onConfirm: async (photoDataUrl, note) => {
        const res = await HappiUApi.checkIn(app.id, photoDataUrl, note);
        applyServerState(res.state);
        render(false);
        announce("เช็กอินพร้อมรูปถ่ายและเวลาเข้าทำงานเรียบร้อยแล้ว!");
      }
    });
  },
  "photo-check-out"(sessionId) {
    const ws = (state.workSessions || []).find(s => s.id === sessionId);
    const app = ws ? appBy(ws.applicationId) : null;
    if (!ws || !app || !studentOwns(app)) return;
    const job = jobBy(app.job);
    HappiUPhotoCheckin.openPhotoCheckinModal(dialog, {
      mode: "check-out",
      jobTitle: job?.title || "งานพาร์ตไทม์",
      location: job?.location || "มหาวิทยาลัยนเรศวร",
      studentName: currentStudent()?.name || "นิสิต มน.",
      onConfirm: async (photoDataUrl, note) => {
        const res = await HappiUApi.checkOut(ws.id, photoDataUrl, note);
        applyServerState(res.state);
        render(false);
        announce("เช็กเอาต์พร้อมรูปถ่ายแล้ว — ส่งชั่วโมงให้ผู้จ้างรับรอง และสามารถเช็กอินรอบถัดไปได้ทันที!");
      }
    });
  },
  "view-work-photo"(url) {
    if (!validPhoto(url)) return;
    showDialog("ภาพยืนยันเวลาเข้า–ออกงาน", '<img class="chat-photo-full" src="' + html(url) + '" alt="ภาพถ่ายพร้อมลายน้ำวันเวลา">');
  },
  async "approve-session"(sessionId) {
    try {
      const res = await HappiUApi.approveSession(sessionId);
      applyServerState(res.state);
      render(false);
      announce("รับรองชั่วโมงทำงานรอบนี้เรียบร้อยแล้ว");
    } catch (err) {
      announce(err.message || "รับรองชั่วโมงไม่สำเร็จ");
    }
  },
  "pay-session"(sessionId) {
    actionForm("บันทึกการจ่ายเงินรอบนี้", "ใส่เลขอ้างอิงการโอน/ใบเสร็จ เพื่อยืนยันการจ่ายค่าตอบแทนให้แก่นิสิต", "pay-session", sessionId, "เลขอ้างอิงการจ่ายเงิน");
  },
  "resign-job"(appId) {
    const app = appBy(appId);
    if (!studentOwns(app) || app.status !== "accepted") return;
    const job = jobBy(app.job);
    dialog.innerHTML = '<h2 id="dialog-title">ยืนยันการแจ้งลาออก</h2>' +
      '<p>ต้องการแจ้งลาออกจากงาน <strong>' + html(job?.title || "งานนี้") + '</strong> ใช่หรือไม่? ระบบจะหยุดการเช็กอินรอบใหม่ แต่ยังเก็บประวัติการทำงานและยอดเงินที่รอรับรอง/จ่ายแล้วไว้ครบถ้วน</p>' +
      form("decision",
        '<input type="hidden" name="command" value="resign-confirm">' +
        '<input type="hidden" name="id" value="' + html(app.id) + '">' +
        area("เหตุผลการลาออก (แจ้งให้ผู้จ้างทราบในแชท)", "reason", "", false),
        "ยืนยันแจ้งลาออก") +
      button("ยกเลิก", "close-dialog", "text-button");
    dialog.showModal();
  },
  "landing-browse"() {
    filters = emptyFilters();
    go("home");
  },
  "landing-kind"(kind) {
    if (page !== "landing" || (kind !== "all" && !Object.hasOwn(groups,kind))) return;
    selected.landingKind = kind;
    render(false);
    main.querySelector('.landing-pin-filters [aria-pressed="true"]')?.focus();
  },
  "review-company"(id) { if(role === "admin" && state.employers[id]) go("profile",{company:id}); },
  "company-queue"(id) { if(role === "admin") go("profile",{queue:id}); },
  "chat-photo":showChatPhoto,
  "edit-hiring":openHiringDialog,
  detail:id=>go("detail",{job:id}),
  "job-location":id=>go("detail",{job:id,showWorkplace:true}),
  "tutor-detail":id=>go("tutor-detail",{tutor:id}),
  "edit-tutor":id=>go("tutor-editor",{tutor:id}),
  "tutor-quick-cat":id=>go("tutors",{criteria:{...(selected.criteria||{q:"",category:"",level:"",format:"",max:""}),category:id}}),
  "schedule-view"(id) {
    if (page !== "schedule" || !Object.hasOwn(scheduleViews,id)) return;
    selected.mode = id;
    render(false);
    main.querySelector(".schedule-tabs [aria-pressed=true]")?.focus();
  },
  "schedule-day"(day) {
    if (page !== "schedule" || !weekDays.includes(day)) return;
    selected.day = day;
    render(false);
    main.querySelector(".schedule-days [aria-pressed=true]")?.focus();
  },
  "return-to-apply"() {
    if (selected.returnTo) go("apply",selected.returnTo);
  },
  "apply-job":id=>go("apply",{job:id}),
  offer:id=>go("offer",{app:id}),
  chat(id) {
    if (canChat(appBy(id))) go("chat",{app:id});
  },
  "filter-period"(id) {
    filters.period = filters.period === id ? "" : id;
    render(false);
    main.querySelector('[data-action="filter-period"][data-id="'+id+'"]')?.focus();
  },
  "filter-kind":id=>{filters.kind=id; render(false); main.querySelector('[aria-pressed=true]')?.focus();},
  "clear-filters":()=>{filters=emptyFilters(); render(false); main.querySelector('input[type=search]')?.focus();},
  "sign-out"() {
    HappiUApi.setToken("");
    state.signedIn = false;
    persist();
    role = "student";
    loginRole = "student";
    loginMode = "login";
    go("landing");
    announce("ออกจากระบบแล้ว");
  },
  "reset-demo"() {
    showDialog("เริ่มเดโมใหม่",
      '<p>ข้อมูลในฐานข้อมูลทดสอบจะถูกรีเซ็ตกลับเป็นค่าเริ่มต้น</p>',
      button("ยืนยันเริ่มเดโมใหม่","confirm-reset","danger"));
  },
  async "confirm-reset"() {
    try {
      const res = await HappiUApi.resetDemo();
      HappiUApi.setToken("");
      state.signedIn = false;
      applyServerState(res.state);
      role = "student";
      loginRole = "student";
      employerId = "cafe";
      filters = emptyFilters();
      dialog.close();
      go("landing");
      announce("เริ่มเดโมใหม่แล้ว");
    } catch (err) {
      dialog.close();
      announce(err.message || "ล้างข้อมูลเดโมไม่ได้");
    }
  },
  "edit-recommendation-profile":id=>go("recommendation-setup",id ? {app:id, setupStep: 1} : {setupStep: 1}),
  "add-availability"(_id, buttonEl) {
    const rows = buttonEl.closest("fieldset").querySelector("[data-availability-rows]");
    const last = rows.lastElementChild;
    if (last && [...last.querySelectorAll("select")].every(select => !select.value)) {
      last.querySelector("select").focus();
      return;
    }
    rows.insertAdjacentHTML("beforeend",availabilityRow());
    rows.lastElementChild.querySelector("select").focus();
  },
  "remove-availability"(_id, buttonEl) {
    const row = buttonEl.closest("[data-availability-row]");
    const rows = row.parentElement;
    row.remove();
    if (!rows.firstElementChild) rows.insertAdjacentHTML("beforeend",availabilityRow());
    rows.lastElementChild.querySelector("select").focus();
  },
  "add-shift-row"(_id, buttonEl) {
    const sectionEl = buttonEl?.closest("[data-shift-section]") || main.querySelector("[data-shift-section]");
    const listEl = sectionEl?.querySelector("[data-shift-list]");
    if (!listEl) return;
    const errEl = sectionEl.querySelector("[data-shift-error]");
    if (errEl) errEl.textContent = "";
    const count = listEl.querySelectorAll("[data-shift-row]").length;
    const tpl = document.createElement("div");
    tpl.innerHTML = HappiUM2.renderShiftEditorRow({ day:"จันทร์", start:"17:00", end:"20:00", capacity:2 }, count, count + 1, { html });
    const newRow = tpl.firstElementChild;
    if (!newRow) return;
    listEl.appendChild(newRow);
    syncShiftEditorRows(listEl);
    newRow.querySelector('select[name="day"]')?.focus();
  },
  "remove-shift-row"(_id, buttonEl) {
    const rowEl = buttonEl?.closest("[data-shift-row]");
    const listEl = rowEl?.closest("[data-shift-list]") || main.querySelector("[data-shift-list]");
    if (!rowEl || !listEl) return;
    const rows = listEl.querySelectorAll("[data-shift-row]");
    const sectionEl = listEl.closest("[data-shift-section]");
    const errEl = sectionEl?.querySelector("[data-shift-error]");
    if (rows.length <= 1) {
      if (errEl) errEl.textContent = "ต้องระบุอย่างน้อย 1 ช่วงเวลาทำงาน";
      return;
    }
    if (errEl) errEl.textContent = "";
    rowEl.remove();
    syncShiftEditorRows(listEl);
  },
  "withdraw-app"(id) {
    const app = appBy(id);
    if (!studentOwns(app) || app.status !== "pending") return;
    const job = jobBy(app.job);
    dialog.innerHTML = HappiUM3.renderConfirmDialogHtml("withdraw-app", app, job, null, { html, time, button });
    dialog.showModal();
  },
  async "confirm-withdraw"(id) {
    try {
      const res = await HappiUApi.withdrawApp(id);
      applyServerState(res.state);
      dialog.close();
      go("applications");
      announce("ถอนใบสมัครแล้ว");
    } catch (err) {
      dialog.close();
      announce(err.message || "ถอนใบสมัครไม่สำเร็จ");
    }
  },
  "decline-offer"(id) {
    const app = appBy(id);
    if (!studentOwns(app) || app.status !== "offered") return;
    const job = jobBy(app.job);
    const shift = job ? shiftBy(job, app.shift) : null;
    dialog.innerHTML = HappiUM3.renderConfirmDialogHtml("decline-offer", app, job, shift, { html, time, button });
    dialog.showModal();
  },
  async "confirm-decline-offer"(id) {
    try {
      const res = await HappiUApi.declineOffer(id);
      applyServerState(res.state);
      dialog.close();
      go("applications");
      announce("ปฏิเสธข้อเสนอและคืนที่ว่างแล้ว");
    } catch (err) {
      dialog.close();
      announce(err.message || "ปฏิเสธข้อเสนอไม่สำเร็จ");
    }
  },
  async accept(id) {
    const a=appBy(id);
    if (!studentOwns(a) || a.status!=="offered") return;
    const job=jobBy(a.job), s=job ? shiftBy(job,a.shift) : null;
    const check = HappiUM3.canAcceptOffer(job, s, state, a);
    if (!check.ok || busy(s)) {render(false);return announce(check.error || "ช่วงเวลานี้ไม่เปิดให้ยืนยันแล้ว");}
    try {
      const res = await HappiUApi.acceptOffer(id);
      applyServerState(res.state);
      go("work");
      announce("ยืนยันเข้าทำงานแล้ว — สามารถถ่ายรูปเช็กอินเมื่อเริ่มงานได้เลย!");
    } catch (err) {
      announce(err.message || "ยืนยันข้อเสนอไม่สำเร็จ");
    }
  },
  "job-applicants":id=>go("applications",{job:id}),
  "edit-job":id=>go("editor",{job:id}),
  async "submit-job"(id) {
    try {
      const res = await HappiUApi.submitJob(id);
      applyServerState(res.state);
      render(false);
      announce("ส่งประกาศเข้าคิวตรวจแล้ว");
    } catch (err) {
      announce(err.message || "ส่งตรวจประกาศไม่สำเร็จ");
    }
  },
  "review-offer"(id) {
    const app=appBy(id);
    if (!canOffer(app)) return;
    const shifts=offerableShifts(app);
    if (!shifts.length) return announce("ยังไม่มีเวลาทำงานว่างที่ไม่ชนตารางเรียนของนิสิต");
    dialog.innerHTML = '<h2 id="dialog-title">ส่งข้อเสนอเวลาทำงาน</h2><p>เลือกเวลาทำงานที่คุยกับนิสิตไว้ นิสิตจะเห็นข้อเสนอในหน้าใบสมัคร</p>' +
      form("shift-offer",'<input type="hidden" name="application" value="' + html(id) + '">' +
        selectField("เวลาทำงานที่เสนอ","shift",[["","เลือกเวลาทำงาน"],...shifts.map(shift=>[shift.id,time(shift)])],""),"ยืนยันส่งข้อเสนอ") +
      button("ยกเลิก","close-dialog","text-button");
    dialog.showModal();
  },
  async decline(id) {
    try {
      const res = await HappiUApi.declineApplicant(id);
      applyServerState(res.state);
      render(false);
      announce("แจ้งผลไม่ผ่านแล้ว");
    } catch (err) {
      announce(err.message || "ดำเนินการไม่สำเร็จ");
    }
  },
  async publish(id) {
    try {
      const res = await HappiUApi.adminJobDecision(id, "publish");
      applyServerState(res.state);
      render(false);
      announce("ประกาศเผยแพร่ในหน้าหางานแล้ว");
    } catch (err) {
      announce(err.message || "อนุมัติประกาศไม่สำเร็จ");
    }
  },
  "job-edits":id=>actionForm("ส่งกลับให้แก้","ผู้จ้างจะเห็นเหตุผลในหน้าประกาศของฉัน","job-edits",id,"สิ่งที่ต้องแก้"),
  "job-reject":id=>actionForm("ปฏิเสธประกาศ","ผู้จ้างจะเห็นเหตุผลในหน้าประกาศของฉัน","job-reject",id,"เหตุผล"),
  async "verify-employer"(id) {
    try {
      const res = await HappiUApi.adminEmployerDecision(id, "verify");
      applyServerState(res.state);
      render(false);
      announce("รับรองผู้จ้างแล้ว");
    } catch (err) {
      announce(err.message || "รับรองผู้จ้างไม่สำเร็จ");
    }
  },
  "employer-update":id=>actionForm("ขอข้อมูลเพิ่ม","ผู้จ้างจะเห็นข้อความในหน้าข้อมูลผู้จ้าง","employer-update",id,"ข้อมูลที่ต้องการ"),
  "report-job":id=>go("report",{job:id}),
  async "start-report"(id) {
    try {
      const res = await HappiUApi.adminReportDecision(id, "start");
      applyServerState(res.state);
      render(false);
      announce("เริ่มตรวจเรื่องร้องเรียนแล้ว");
    } catch (err) {
      announce(err.message || "ดำเนินการไม่สำเร็จ");
    }
  },
  "request-reply":id=>actionForm("ขอคำชี้แจง","ข้อความนี้จะแสดงในหน้าของผู้จ้าง","request-reply",id,"คำถามสำหรับผู้จ้าง"),
  "close-report":id=>actionForm("สรุปผลเรื่องร้องเรียน","ผลจะปรากฏในหน้าเรื่องที่แจ้งของนิสิต","close-report",id,"ผลการตรวจ"),
  "pause-report":id=>actionForm("ระงับประกาศ","ประกาศจะหายจากหน้าหางาน และผู้แจ้งเห็นผลการตรวจ","pause-report",id,"เหตุผลที่ระงับ"),
  "close-dialog":()=>dialog.close(),
};
document.addEventListener("click",event=>{
  if (page === "chat" && chatNavOpen && !event.target.closest("#nav") && !event.target.closest("#nav-toggle")) {
    chatNavOpen = false;
    mainNav();
  }
  const fillSample = event.target.closest("[data-tt-fill-sample]");
  if (fillSample) {
    const ta = main.querySelector('form[data-form="ai-schedule"] textarea[name="text"]');
    if (ta) {
      ta.value = "จันทร์ 09:00-11:00 แคลคูลัส 1 MTH101 ห้อง SC2101\nอังคาร 13:00-15:00 การเขียนโปรแกรมเว็บ CS210 ห้อง SC LAB 2\nพฤหัสบดี 10:00-12:00 ภาษาอังกฤษเพื่อการสื่อสาร ENG102 ห้อง HS3201";
      ta.focus();
    }
    return;
  }
  const b=event.target.closest("button");
  if (b && !b.disabled) {
    if (b.dataset.quickSkill) {
      return updateSkillPicker(b.closest("[data-skill-picker]"),"",b.dataset.quickSkill);
    }
    if (b.hasAttribute("data-add-skill") || b.hasAttribute("data-remove-skill")) {
      return updateSkillPicker(b.closest("[data-skill-picker]"),b.dataset.removeSkill);
    }
    if (b.dataset.chatAttach) return chatAttachmentAction(b);
    if(b.dataset.route) return go(b.dataset.route);
    if(b.dataset.action) return operations[b.dataset.action]?.(b.dataset.id, b);
    return;
  }
  // Clicking anywhere on a job card (landing or job directory) opens job details cleanly (fixes น้องข้าว ข้อ 1!)
  const card = event.target.closest("[data-card-job]");
  if (card && !event.target.closest("a, button, input, select")) {
    return go("detail", { job: card.dataset.cardJob });
  }
});

document.addEventListener("input", event => {
  if (event.target.matches("[data-skill-input]")) {
    const picker = event.target.closest("[data-skill-picker]");
    const quick = picker.querySelector("[data-quick-skills]");
    if (quick) quick.innerHTML = quickSkillResults(event.target.value,HappiUM1.skillList(picker.querySelector('input[type="hidden"]').value));
    return;
  }
  if (!event.target.matches("[data-chat-search]")) return;
  const pane = event.target.closest(".chat-rooms-pane");
  if (!pane) return;
  const term = event.target.value.trim().toLowerCase();
  let found = false;
  for (const room of pane.querySelectorAll("[data-room-search]")) {
    room.hidden = !room.dataset.roomSearch.includes(term);
    found ||= !room.hidden;
  }
  const emptyEl = pane.querySelector("[data-chat-empty]");
  if (emptyEl) emptyEl.hidden = found;
});
document.addEventListener("keydown",event=>{
  if (event.key === "Enter" && !event.isComposing && event.target.matches("[data-skill-input]")) {
    event.preventDefault();
    return updateSkillPicker(event.target.closest("[data-skill-picker]"));
  }
});

document.addEventListener("submit",event=>{
  const handler=forms[event.target.dataset.form];
  if(!handler) return;
  event.preventDefault();
  const error=message=>{const el=event.target.querySelector("[data-form-error]");if(el)el.textContent=message;};
  error("");
  for (const picker of event.target.querySelectorAll("[data-skill-picker]")) {
    if (!updateSkillPicker(picker)) return;
  }
  handler(new FormData(event.target),error,event.target);
});
document.addEventListener("change",event=>{
  if (event.target.closest('form[data-form="update-hiring"]') && ["stage","meetingMode"].includes(event.target.name)) syncInterviewFields();
  if (event.target.matches('.chat-composer input[name="attachment"]')) {
    refreshChatAttachment(event.target.closest(".chat-composer"));
    return;
  }
  if (event.target.matches('input[name="payType"]')) {
    const noteEl = event.target.closest("[data-pay-type-group]")?.querySelector("[data-pay-rate-note]");
    if (noteEl) {
      noteEl.textContent = event.target.value === "fixed"
        ? "คิดเป็นยอดเหมาต่อครั้ง (บาท / งาน) ไม่คูณตามจำนวนชั่วโมง"
        : "คิดตามชั่วโมงทำงานจริง (บาท / ชม.)";
    }
    return;
  }
  const select=event.target.closest(".filter-selects select");
  if(!select) return;
  filters[select.name]=select.value;
  render(false);
  main.querySelector('select[name="'+select.name+'"]')?.focus();
});

async function bootstrapFromBackend() {
  try {
    const res = await HappiUApi.bootstrap();
    if (res.user) {
      applyServerState(res.state, res.user);
      if (page === "landing" || page === "login") page = "home";
    } else {
      HappiUApi.setToken("");
      state.signedIn = false;
      applyServerState(res.state, null);
      if (!["landing", "home", "detail", "login", "tutors", "tutor-detail"].includes(page)) {
        page = "landing";
      }
    }
  } catch (err) {
    console.warn("HappiU API unavailable, falling back to local cache:", err.message);
  }
  render(false);
}

bootstrapFromBackend();
