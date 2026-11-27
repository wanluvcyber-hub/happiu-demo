-- ============================================================================
-- HappiU v2.0 — SQLite Database Schema (มหาวิทยาลัยนเรศวร)
-- แก้ไขโครงสร้างตารางได้ที่ไฟล์นี้โดยตรง (server/db.js จะโหลดไฟล์นี้อัตโนมัติ)
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. ข้อมูลอ้างอิงคณะและสาขาวิชา มหาวิทยาลัยนเรศวร (Reference Tables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS majors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(faculty_id, name)
);

-- ----------------------------------------------------------------------------
-- 2. บัญชีผู้ใช้งานกลาง (Unified Authentication)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  identifier TEXT UNIQUE NOT NULL,           -- รหัสนิสิต / รหัสเจ้าหน้าที่ / อีเมลผู้ประกอบการ
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'employer', 'admin')),
  display_name TEXT NOT NULL,
  entity_id TEXT,                            -- อ้างอิง students.id หรือ employers.id
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 3. โปรไฟล์นิสิตและผู้จ้าง (Profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                 -- รหัสนิสิต เช่น 6631xxxx หรือ NU-DEMO-001
  name TEXT NOT NULL,
  nick TEXT DEFAULT '',
  year INTEGER DEFAULT 1 CHECK(year BETWEEN 1 AND 8),
  faculty TEXT DEFAULT '',
  major TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  photo TEXT DEFAULT '',                     -- URL รูปโปรไฟล์จริง (/uploads/profiles/...)
  intro TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  interests_json TEXT DEFAULT '[]',
  availability TEXT DEFAULT '',
  schedule_json TEXT DEFAULT '[]',           -- ตารางเรียน 2 มิติ (JSON Array)
  hide_skills_banner INTEGER DEFAULT 0 CHECK(hide_skills_banner IN (0, 1))
);

CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'near' CHECK(type IN ('campus', 'near', 'online')),
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('verified', 'pending', 'update')),
  reason TEXT DEFAULT '',
  document TEXT DEFAULT ''
);

-- ----------------------------------------------------------------------------
-- 4. ประกาศงาน (Jobs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'near' CHECK(kind IN ('campus', 'near', 'online')),
  job_type TEXT NOT NULL DEFAULT 'part-time' CHECK(job_type IN ('part-time', 'full-time', 'online')),
  category TEXT DEFAULT '',
  location TEXT DEFAULT '',
  pay_type TEXT NOT NULL DEFAULT 'hourly' CHECK(pay_type IN ('hourly', 'fixed')),
  rate REAL NOT NULL DEFAULT 0 CHECK(rate >= 0),
  distance REAL DEFAULT 0 CHECK(distance >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'edits', 'rejected', 'live', 'paused')),
  deadline TEXT DEFAULT '',
  doc INTEGER DEFAULT 0 CHECK(doc IN (0, 1)),
  description TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  required_skills TEXT DEFAULT '',
  required_major TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  revision_original TEXT,
  revision_location TEXT,
  shifts_json TEXT NOT NULL DEFAULT '[]',    -- ช่วงเวลาทำงานของประกาศ (JSON Array)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 5. ใบสมัครงาน & สถานะการจ้างงาน (Applications)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  shift_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'offered', 'accepted', 'declined', 'withdrawn', 'offer_declined', 'resigned')),
  hiring_stage TEXT DEFAULT 'review'
    CHECK(hiring_stage IS NULL OR hiring_stage IN ('review', 'interview', 'training', 'hired')),
  hiring_note TEXT DEFAULT '',
  interview_json TEXT,
  profile_json TEXT DEFAULT '{}',
  doc TEXT DEFAULT '',
  work_status TEXT,
  work_in TEXT,
  work_out TEXT,
  work_amount REAL DEFAULT 0,
  work_proof TEXT DEFAULT '',
  student_review_json TEXT,
  employer_review_json TEXT,
  closed_at TEXT,
  resigned_at TEXT,
  resign_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 6. รอบลงเวลาเข้า–ออกงานพร้อมรูปถ่ายลายน้ำเวลา (Multi-Session Attendance)
--    1 งาน (application) มีได้หลายรอบการทำงาน (1:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  shift_id TEXT,
  check_in_at TEXT NOT NULL,                 -- เวลาเข้างานจริงจากเซิร์ฟเวอร์ (ISO-8601)
  check_in_photo_url TEXT NOT NULL,          -- รูปถ่ายเช็กอินพร้อมลายน้ำวัน–เวลา
  check_out_at TEXT,                         -- เวลาออกงานจริงจากเซิร์ฟเวอร์ (ISO-8601)
  check_out_photo_url TEXT,                  -- รูปถ่ายเช็กเอาต์พร้อมลายน้ำวัน–เวลา
  hours REAL DEFAULT 0 CHECK(hours >= 0),
  amount REAL DEFAULT 0 CHECK(amount >= 0),
  status TEXT NOT NULL DEFAULT 'checked_in'
    CHECK(status IN ('checked_in', 'pending_approval', 'approved', 'paid')),
  payment_proof TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 7. ข้อความแชท (Unified Chat Thread ต่อคู่ นิสิต-ร้านค้า)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_key TEXT NOT NULL,                  -- รูปแบบ "student_id::employer_id" (กันสร้างห้องซ้ำ)
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('student', 'employer')),
  text TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  status TEXT DEFAULT 'read' CHECK(status IN ('sending', 'read')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 8. ระบบติวเตอร์ (ประกาศรับสอน, คำขอติดต่อ และรีวิว)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutors (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0 CHECK(rate >= 0),
  format TEXT NOT NULL DEFAULT 'online' CHECK(format IN ('online', 'inPerson', 'both')),
  availability TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  banner_url TEXT DEFAULT '',
  banner_text TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tutor_requests (
  id TEXT PRIMARY KEY,
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tutor_reviews (
  id TEXT PRIMARY KEY,
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 9. เรื่องร้องเรียนงานเสี่ยงและการชี้แจง (Reports)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'closed')),
  reason TEXT NOT NULL,
  detail TEXT NOT NULL,
  attachment TEXT DEFAULT '',
  request TEXT DEFAULT '',
  reply TEXT DEFAULT '',
  result TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Indexes เพิ่มความเร็วในการค้นหา
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_employer_status ON jobs(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_employer ON applications(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_thread ON chat_messages(thread_key, created_at);
CREATE INDEX IF NOT EXISTS idx_ws_app ON work_sessions(application_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_student ON work_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_ws_employer ON work_sessions(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_tutors_owner ON tutors(owner_id);

-- ----------------------------------------------------------------------------
-- SQL Views สำหรับเปิดดูและตรวจสอบข้อมูลง่ายๆ ใน SQLite Viewer
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_login_accounts AS
SELECT
  u.identifier,
  u.role,
  u.display_name,
  COALESCE(s.faculty, e.type, 'มหาวิทยาลัยนเรศวร') AS unit,
  COALESCE(s.major, e.status, 'admin') AS detail
FROM users u
LEFT JOIN students s ON u.role = 'student' AND u.entity_id = s.id
LEFT JOIN employers e ON u.role = 'employer' AND u.entity_id = e.id;

CREATE VIEW IF NOT EXISTS v_student_work_summary AS
SELECT
  s.code AS student_code,
  s.name AS student_name,
  j.title AS job_title,
  e.name AS employer_name,
  a.status AS employment_status,
  COUNT(ws.id) AS total_rounds,
  COALESCE(SUM(ws.hours), 0) AS total_hours,
  COALESCE(SUM(CASE WHEN ws.status = 'pending_approval' THEN ws.amount ELSE 0 END), 0) AS pending_baht,
  COALESCE(SUM(CASE WHEN ws.status = 'approved' THEN ws.amount ELSE 0 END), 0) AS approved_baht,
  COALESCE(SUM(CASE WHEN ws.status = 'paid' THEN ws.amount ELSE 0 END), 0) AS paid_baht
FROM applications a
JOIN students s ON s.id = a.student_id
JOIN jobs j ON j.id = a.job_id
JOIN employers e ON e.id = a.employer_id
LEFT JOIN work_sessions ws ON ws.application_id = a.id
GROUP BY a.id;

CREATE VIEW IF NOT EXISTS v_job_overview AS
SELECT
  j.id,
  j.title,
  e.name AS employer_name,
  j.job_type,
  j.kind,
  j.pay_type,
  j.rate,
  j.status,
  (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
FROM jobs j
JOIN employers e ON e.id = j.employer_id;
