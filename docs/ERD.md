# HappiU — Entity-Relationship Diagram (ERD)

เอกสารแสดงโครงสร้างความสัมพันธ์ของฐานข้อมูล **HappiU v2.0 (SQLite)** ทั้ง **13 ตาราง + 3 SQL Views** อ้างอิงตรงจากไฟล์ Schema กลาง [server/schema.sql](file:///home/keng/Desktop/past-time/server/schema.sql)

---

## 1. แผนภาพความสัมพันธ์รวมทั้งระบบ (Full ERD)

```mermaid
erDiagram
    faculties {
        INTEGER id PK
        TEXT name UK "ชื่อคณะ / วิทยาลัย ม.นเรศวร (18 แห่ง)"
    }

    majors {
        INTEGER id PK
        INTEGER faculty_id FK "ON DELETE CASCADE"
        TEXT name "ชื่อสาขาวิชา"
    }

    users {
        TEXT id PK
        TEXT identifier UK "รหัสนิสิต / รหัสเจ้าหน้าที่ / อีเมลผู้จ้าง"
        TEXT password_hash
        TEXT role "student | employer | admin"
        TEXT display_name
        TEXT entity_id FK "ชี้ไป students.id หรือ employers.id"
        TEXT created_at
    }

    students {
        TEXT id PK
        TEXT code UK "รหัสนิสิต เช่น NU-DEMO-001"
        TEXT name
        TEXT nick
        INTEGER year
        TEXT faculty
        TEXT major
        TEXT contact
        TEXT photo "URL รูปโปรไฟล์จริง /uploads/profiles/..."
        TEXT intro
        TEXT skills
        TEXT experience
        TEXT interests_json
        TEXT availability
        TEXT schedule_json "ตารางเรียน 2 มิติ (JSON Array)"
        INTEGER hide_skills_banner
    }

    employers {
        TEXT id PK
        TEXT name
        TEXT type "campus | near | online"
        TEXT contact
        TEXT status "verified | pending | update"
        TEXT reason
        TEXT document
    }

    jobs {
        TEXT id PK
        TEXT employer_id FK
        TEXT title
        TEXT kind "campus | near | online"
        TEXT job_type "part-time | full-time | online"
        TEXT category
        TEXT location
        TEXT pay_type "hourly | fixed"
        REAL rate
        REAL distance
        TEXT status "draft | review | edits | rejected | live | paused"
        TEXT deadline
        INTEGER doc
        TEXT description
        TEXT skills
        TEXT required_skills
        TEXT required_major
        TEXT reason
        TEXT shifts_json "ช่วงเวลาทำงานหลายรอบ (JSON Array)"
        TEXT created_at
    }

    applications {
        TEXT id PK
        TEXT student_id FK
        TEXT job_id FK
        TEXT employer_id FK
        TEXT shift_id
        TEXT status "pending | offered | accepted | declined | withdrawn | offer_declined | resigned"
        TEXT hiring_stage "review | interview | training | hired"
        TEXT hiring_note
        TEXT interview_json
        TEXT profile_json
        TEXT doc
        TEXT work_status
        TEXT student_review_json
        TEXT employer_review_json
        TEXT resigned_at
        TEXT resign_reason
        TEXT closed_at
        TEXT created_at
        TEXT updated_at
    }

    work_sessions {
        TEXT id PK
        TEXT application_id FK
        TEXT student_id FK
        TEXT job_id FK
        TEXT employer_id FK
        TEXT shift_id
        TEXT check_in_at "เวลาเข้างานจริงจากเซิร์ฟเวอร์"
        TEXT check_in_photo_url "รูปเช็กอินพร้อมลายน้ำวัน-เวลา"
        TEXT check_out_at "เวลาออกงานจริงจากเซิร์ฟเวอร์"
        TEXT check_out_photo_url "รูปเช็กเอาต์พร้อมลายน้ำวัน-เวลา"
        REAL hours
        REAL amount
        TEXT status "checked_in | pending_approval | approved | paid"
        TEXT payment_proof
        TEXT note
        TEXT created_at
        TEXT updated_at
    }

    chat_messages {
        TEXT id PK
        TEXT thread_key "student_id::employer_id (1 ร้าน 1 ห้องแชท)"
        TEXT application_id FK
        TEXT student_id FK
        TEXT employer_id FK
        TEXT sender_role "student | employer"
        TEXT text
        TEXT photo_url
        TEXT status "read | sending"
        TEXT created_at
    }

    tutors {
        TEXT id PK
        TEXT owner_id FK "students.id"
        TEXT category
        TEXT subject
        TEXT level
        REAL rate
        TEXT format "online | inPerson | both"
        TEXT availability
        TEXT experience
        TEXT banner_url "URL รูปแบนเนอร์ติวเตอร์"
        TEXT banner_text "คำอธิบายแบนเนอร์ด้านบน"
        TEXT created_at
    }

    tutor_requests {
        TEXT id PK
        TEXT tutor_id FK
        TEXT name
        TEXT contact
        TEXT message
        TEXT created_at
    }

    tutor_reviews {
        TEXT id PK
        TEXT tutor_id FK
        TEXT reviewer_name
        INTEGER rating "1 ถึง 5 ดาว"
        TEXT comment
        TEXT created_at
    }

    reports {
        TEXT id PK
        TEXT student_id FK
        TEXT job_id FK
        TEXT status "new | reviewing | closed"
        TEXT reason
        TEXT detail
        TEXT attachment
        TEXT request
        TEXT reply
        TEXT result
        TEXT created_at
    }

    faculties ||--o{ majors : "contains_majors"
    users ||--o| students : "maps_student_role"
    users ||--o| employers : "maps_employer_role"
    employers ||--o{ jobs : "posts"
    students ||--o{ applications : "applies"
    jobs ||--o{ applications : "receives"
    employers ||--o{ applications : "reviews"
    applications ||--o{ work_sessions : "has_many_rounds"
    students ||--o{ work_sessions : "records_attendance"
    employers ||--o{ work_sessions : "approves_and_pays"
    students ||--o{ chat_messages : "chats_via_thread_key"
    employers ||--o{ chat_messages : "chats_via_thread_key"
    applications |o--o{ chat_messages : "references"
    students ||--o{ tutors : "publishes"
    tutors ||--o{ tutor_requests : "receives"
    tutors ||--o{ tutor_reviews : "gets_reviews"
    students ||--o{ reports : "submits"
    jobs ||--o{ reports : "reported_on"
```

---

## 2. สรุปความสัมพันธ์สำคัญ (Key Design Decisions)

| ความสัมพันธ์ | ประเภท | เหตุผลทางธุรกิจ (Business Rule) |
|---|---|---|
| `users` → `students` / `employers` | `1 : 0..1` | รองรับ **Unified Login** ช่องเดียว (รหัสนิสิต / รหัสเจ้าหน้าที่ / อีเมลผู้จ้าง) โดยไม่ต้องเลือกบทบาทตอนล็อกอิน |
| `applications` → `work_sessions` | `1 : N` | **1 งานที่รับเข้าทำ สามารถลงเวลาเข้า–ออกงานได้ไม่จำกัดรอบ** (ทำงานระยะยาวได้จริง) แม้รอบก่อนหน้าจะยัง `pending_approval` ก็เช็กอินรอบใหม่ได้ และหากนิสิตกด **แจ้งลาออก** (`resigned`) ประวัติ `work_sessions` และยอดเงินเดิมทั้งหมดยังคงอยู่ครบ |
| `students` + `employers` → `chat_messages` | `1 : N` (ผ่าน `thread_key`) | ใช้ `thread_key = student_id::employer_id` ทำให้ **1 นิสิต กับ 1 ร้าน มีห้องแชทเดียวเสมอ** แก้ปัญหาสมัครงานซ้ำแล้วระบบสร้างห้องแชทใหม่ซ้ำกับร้านเดิม |
| `students` → `tutors` → `tutor_reviews` / `tutor_requests` | `1 : N` | นิสิต 1 คนลงประกาศรับสอนได้หลายวิชา แก้ไข/ลบประกาศได้ (Cascade ลบคำขอและรีวิวที่ผูกกันออกด้วย) พร้อมเก็บรูป/คำอธิบายแบนเนอร์และรีวิวจากผู้เรียน |
| `employers` → `jobs` → `applications` | `1 : N` | ผู้จ้าง 1 ร้านลงได้หลายประกาศ แต่ละประกาศเก็บช่วงเวลาทำงาน (`shifts_json`) และประเภทงาน (`part-time`, `full-time`, `online`) เมื่อผู้จ้างอัปเดต `hiring_stage = 'hired'` ระบบซิงก์ `applications.status = 'accepted'` และผูก `shift_id` ทันที |

---

## 3. ดัชนีเพิ่มความเร็ว (8 Indexes) และ SQL Views (3 Views)
- `idx_jobs_employer_status` บน `jobs(employer_id, status)`
- `idx_apps_student` บน `applications(student_id, status)`
- `idx_apps_employer` บน `applications(employer_id, status)`
- `idx_chat_thread` บน `chat_messages(thread_key, created_at)` — โหลดประวัติแชทของแต่ละร้านได้เร็ว
- `idx_ws_app` บน `work_sessions(application_id, check_in_at DESC)` — ดึงประวัติรอบเช็กอิน–เช็กเอาต์ของงานแต่ละใบได้เร็ว
- `idx_ws_student` บน `work_sessions(student_id, status)` — คำนวณสรุปรายได้และชั่วโมงทำงานรวมของนิสิตได้เร็ว
- `idx_ws_employer` บน `work_sessions(employer_id, status)` — ดึงรายการรอรับรอง/รอโอนเงินฝั่งผู้จ้างได้เร็ว
- `idx_tutors_owner` บน `tutors(owner_id)`

### Views ที่สร้างไว้ใน `server/schema.sql`
- `v_login_accounts` — ดูบัญชีล็อกอินทุกบทบาทพร้อมคณะ/ประเภทผู้จ้าง
- `v_student_work_summary` — สรุปจำนวนรอบ, ชั่วโมงรวม และยอดเงิน (รอรับรอง / รับรองแล้ว / จ่ายแล้ว) รายงาน
- `v_job_overview` — ภาพรวมประกาศงานพร้อมชื่อร้านและจำนวนผู้สมัคร
