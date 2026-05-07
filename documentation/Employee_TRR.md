# Employee
## TEST REQUIREMENT REPORT (TRR)

### Project Information

| Field | Details |
|-------|---------|
| Project Name | NBT HUB – Employee Portal |
| Module Scope | Employee Self-Service & Operations |
| Document Type | Test Requirement Report (TRR) |
| Prepared By | Development Team |
| Date | May 7, 2026 |
| Environment | Development / Staging |

---

### Module Inventory

| Module Name | Route / Path | Description |
|-------------|-------------|-------------|
| Authentication | /login | User authentication, role-based access control, token validation, and session management. |
| Dashboard | / | Employee task board displaying Today's tasks, Yesterday summary, project updates, and precision timestamping. |
| Profile & Documents | /profile | User profile management, reporting manager details, tenure calculation, and HR document access. |
| Documents Vault | /documents | Upload and management of academic, finance, identity-related documents (PAN, Aadhar, Voter ID). |
| Attendance Management | /attendance | Geofenced attendance tracking, biometric punch records, shift monitoring, and attendance logs. |
| Leave Management | /leave | Leave request workflows, leave balances (SL, CL, EL), approvals, and leave history management. |
| Knowledge Hub | /courses | Learning Management System supporting videos, PDFs, quizzes, and certifications. |
| Fun Quiz | /fun | Daily engagement quizzes integrated with REP point rewards. |
| Awards & REP System | /awards | Employee recognition system with leaderboard and REP point tracking. |
| Threads & Chat | /thread | Real-time communication platform with task alerts and notifications. |
| HR Operations | /resignation | HR-related workflows including resignation, pay slips, and service certificates. |
| Calendar | /calendar | Holiday calendar, birthday reminders, and event scheduling. |
| Focus Logs | /focus-logs | Granular task timeline with individual sub-task timestamp tracking. |
| Projects & Training | /projects | Project status tracking with automatic task logging on completion. |

---

### Functional Test Requirements

| Module | Feature | Test Scenario | Test Steps | Input Data | Expected Result |
|--------|---------|--------------|------------|------------|-----------------|
| Dashboard | Task Board | Verify task creation with timestamp | 1. Open Dashboard 2. Add task under "Today" 3. Verify timestamp | Task description text | Task appears with exact current time next to it. |
| Dashboard | Edit Locking | Verify timestamp preservation on edit | 1. Edit an existing task 2. Save changes | Modified task text | Original timestamp remains unchanged after editing. |
| Dashboard | Yesterday Card | Verify yesterday task summary | 1. Open "Yesterday" summary card | N/A | All yesterday tasks merged into one list with latest activity time. |
| Attendance | Geofence Punch-In | Verify office attendance punch | 1. Set GPS within office radius 2. Click Punch In | 12.2885, 76.6345 | Attendance marked as OFFICE and shift starts successfully. |
| Attendance | Remote Punch-In | Verify remote attendance punch | 1. Set GPS outside office radius 2. Click Punch In | Remote coordinates | Attendance marked as REMOTE/HOME and shift starts. |
| Attendance | Half-Day Detection | Verify short shift validation | 1. Punch In 2. Punch Out after 5 hours | N/A | Attendance status changes to HALF DAY. |
| Leave | Leave Application | Submit leave request | 1. Navigate to Leave 2. Select dates 3. Submit | Leave type, dates, reason | Leave request appears in "Pending" section with correct details. |
| Leave | Balance Display | Verify leave balance rendering | 1. Open Leave Management | N/A | SL, CL, and EL balances display correctly matching database. |
| Profile | Profile Image Upload | Upload profile picture | 1. Open Profile 2. Click camera icon 3. Select image | JPEG/PNG file | Image uploads successfully, persists after page refresh. |
| Profile | About Me Editing | Update About Me section | 1. Open Profile 2. Edit About Me 3. Save changes | "New Intro Text" | Updated text persists after page refresh. |
| Profile | Phone Number Edit | Update contact number | 1. Click phone number 2. Edit 3. Save on blur | "9876543210" | Phone number updates and syncs with backend. |
| Profile | Tenure Calculation | Verify tenure display | 1. Open Profile 2. Check tenure card | N/A | Tenure displays correctly based on joining date (e.g., "1Y 2M 15D"). |
| Profile | Reporting Manager | Verify RM details | 1. Open Profile | N/A | Correct reporting manager name and ID displayed. |
| Documents | PAN Card Upload | Upload PAN card copy | 1. Navigate to Documents 2. Upload PAN image | Image file | PAN card image uploads, displays preview, and persists after refresh. |
| Documents | Aadhar Card Upload | Upload Aadhar card copy | 1. Navigate to Documents 2. Upload Aadhar image | Image file | Aadhar card image uploads, displays preview, and persists after refresh. |
| Documents | Voter ID Upload | Upload Voter ID proof | 1. Navigate to Documents 2. Upload Voter ID image | Image file | Voter ID image uploads successfully with success toast. |
| Documents | Save All Details | Save complete document form | 1. Fill all fields 2. Click "Save All Details" | Form data | All text fields and documents saved to backend without errors. |
| Quiz | REP Synchronization | Verify REP reward allocation | 1. Complete quiz correctly 2. Open Awards page | Quiz answers | REP points increase by 10–20 points. |
| Threads | Notifications | Verify real-time task notification | 1. Receive task assignment 2. Open thread | N/A | Notification appears with sound and visual indicator. |
| Awards | Real-Time Display | Verify live points display | 1. Open Awards page | N/A | Awards display real-time points and recognitions without hardcoded values. |
| HR Ops | Pay Slip Access | Download salary statement | 1. Open Profile 2. Click "Monthly Pay Slip" | N/A | Pay slip downloads or displays correctly. |
| HR Ops | Experience Letter | Request service certificate | 1. Open Profile 2. Click "Experience Letter" | N/A | Service certificate request form opens correctly. |
| HR Ops | Resignation Letter | Submit resignation | 1. Open Profile 2. Click "Resignation Letter" | N/A | Resignation form opens with correct workflow. |
| Security | Password Change | Update password with old password | 1. Open Security Vault 2. Enter old + new password 3. Submit | Old password, New password | Password updated successfully with confirmation toast. |
| Security | Password Reset (OTP) | Reset password via OTP | 1. Open Security Vault 2. Select OTP mode 3. Request OTP 4. Enter code 5. Set new password | OTP code, New password | OTP dispatched, verified, and password reset successfully. |
| Support | Ticket Submission | Raise support ticket | 1. Click Support & Maintenance 2. Fill subject, description 3. Submit | Ticket details | Ticket submitted with success confirmation. |

---

### UI Test Requirements

| Screen Name | UI Element | Element Type | Test Case | Expected Behavior | Pass Criteria |
|-------------|-----------|-------------|-----------|-------------------|---------------|
| Login | Company Logo | Image | Verify logo rendering | Logo image renders clearly without distortion. | Logo visible |
| Login | Login Form | Form Fields | Verify input fields | Email and password fields accept input correctly. | Inputs functional |
| Dashboard | Task Card | Card Component | Verify task card rendering | Task cards display with timestamp and status. | Cards render correctly |
| Dashboard | Timestamp | Text Element | Verify precision timing | Exact current time appears next to new tasks. | Time accurate |
| Attendance | Live Status Badge | Pulse Indicator | Verify active shift pulse | Badge pulses green while shift is active. | Pulse animation visible |
| Attendance | Punch Button | Action Button | Verify punch interaction | Button responds with visual feedback on click. | Button state changes |
| Leave | Balance Card | Information Card | Verify leave balance display | SL, CL, and EL balances display correctly. | Values match database |
| Leave | Calendar Picker | Date Selector | Verify date selection | Calendar opens and dates are selectable. | Dates selectable |
| Navigation | Navigation Dock | Dock Component | Verify route navigation | Clicking icons navigates to correct screens. | Route changes successfully |
| Navigation | Active Tab | Highlight State | Verify active indicator | Current tab is visually highlighted. | Highlight visible |
| Profile | Avatar Container | Image/Icon | Verify profile image display | Profile image or User icon renders correctly. | Image or fallback visible |
| Profile | Camera Button | Overlay Button | Verify upload trigger | Clicking camera icon opens file picker. | File picker opens |
| Profile | Fullscreen Modal | Modal Component | Verify profile image zoom | Clicking the image opens fullscreen modal. | Modal opens correctly |
| Profile | Security Vault | Modal Component | Verify password modal | Security Vault modal opens with tabs. | Modal renders |
| Profile | Tenure Card | Information Card | Verify tenure display | Tenure card shows calculated experience. | Values display correctly |
| Profile | Doc Cards | Interactive Cards | Verify hover effects | Cards animate on hover with color transition. | Hover effect visible |
| Documents | Upload Zone | Dropzone Component | Verify upload interaction | Clicking upload zone opens file picker. | File picker opens |
| Documents | Image Preview | Thumbnail | Verify document preview | Uploaded image shows inline preview. | Preview renders |
| Documents | Form Fields | Input Fields | Verify field validation | Invalid inputs show error messages. | Validation fires |
| Awards | Trophy Asset | Image Asset | Verify trophy rendering | Trophy image loads in high resolution. | Asset loaded |
| Awards | Leaderboard | List Component | Verify ranking display | Employee ranks display in correct order. | Ranking accurate |
| Header | Profile Image | Avatar Image | Verify header avatar | Profile image syncs with uploaded photo. | Image matches profile |
| Header | Logout Button | Action Button | Verify logout action | Clicking logout clears session and redirects. | Session cleared |

---

### Employee-Specific Feature Test Cases

#### Profile & Identity Management

| Feature | Scenario | Test Steps | Expected Result |
|---------|----------|------------|-----------------|
| Profile Image | Upload and persist photo | 1. Open Profile 2. Upload image 3. Refresh page | Image remains visible after page refresh. |
| Profile Image | Header sync | 1. Upload profile image 2. Check Header avatar | Header avatar updates to match new profile image. |
| Employee ID | Display correct ID | 1. Open Profile 2. Check ID badge | Employee ID from backend users table displayed correctly. |
| Team Display | Show current team | 1. Open Profile 2. Check team card | Current team name from backend displayed. |
| Joining Date | Parse and display | 1. Open Profile 2. Check joining date card | Date formatted correctly (e.g., "10 November 2025"). |
| Date of Birth | Editable DOB | 1. Click DOB field 2. Select date 3. Blur | DOB updates and syncs with backend. |

#### Document Vault Tests

| Feature | Scenario | Test Steps | Expected Result |
|---------|----------|------------|-----------------|
| PAN Card | Upload and save | 1. Upload PAN image 2. Click Save All Details | PAN card saved and visible after refresh. |
| Aadhar Card | Upload and save | 1. Upload Aadhar image 2. Click Save All Details | Aadhar card saved and visible after refresh. |
| Voter ID | Upload and save | 1. Upload Voter ID 2. Click Save All Details | Voter ID saved and visible after refresh. |
| Bank Details | IFSC Auto-fill | 1. Enter IFSC code (11 chars) | Bank name and branch auto-populate. |
| Age Calculation | Auto from DOB | 1. Enter DOB in documents | Age field automatically calculates. |
| Field Validation | PAN format check | 1. Enter invalid PAN format | Error message "Use ABCDE1234F format" displayed. |
| Field Validation | Aadhar length check | 1. Enter < 12 digit Aadhar | Error message "Must be 12 digits" displayed. |
| View Document | Full-screen preview | 1. Click uploaded document image | Full-screen modal opens with document preview. |

#### Focus Logs & History

| Feature | Scenario | Test Steps | Expected Result |
|---------|----------|------------|-----------------|
| Granular Timeline | View sub-task timestamps | 1. Open Focus Logs | Each sub-task contains its own timestamp for accurate tracking. |
| Sorting | Latest first | 1. Open Focus Logs | Latest logs appear at the top of the list. |

#### Project & Training Updates

| Feature | Scenario | Test Steps | Expected Result |
|---------|----------|------------|-----------------|
| Automatic Logging | Project completion log | 1. Change project status to "Completed" | Task automatically added to "Today's Tasks" with current time. |
| Course Completion | Track training progress | 1. Open training Video or PDF | Course status changes from "Not Started" to "In Progress" or "Completed". |

---

### Authentication & Session Test Cases

| Scenario | Test Steps | Expected Result |
|----------|------------|-----------------|
| Valid Employee Login | Enter valid employee credentials | Redirected to Dashboard successfully. |
| Valid Trainee Login | Enter valid trainee credentials | Redirected to Trainee Dashboard. |
| Trainee Access Block | Login as trainee with joining date > 10 days ago | "Access Blocked" screen displayed. Header and Footer interactions disabled. |
| Blocked Screen Logout | Click "Log Out" on blocked screen | Session cleared and redirected to login page. |
| Role Restriction | Attempt to access Admin/HR routes as employee | Access denied or redirected to Dashboard. |
| Browser Back Button | Logout and click browser back button | The login page remains active without session restore. |
| Token Expiry | Wait for token to expire | User prompted to re-authenticate gracefully. |
| Concurrent Sessions | Login from two different browsers | Both sessions function independently. |

---

### Negative Test Requirements

| Req ID | Module | Negative Scenario | Invalid Input | Expected Validation |
|--------|--------|-------------------|---------------|---------------------|
| EMP-NEG-01 | Profile | Empty phone number | Empty string | Update blocked with validation error. |
| EMP-NEG-02 | Profile | Invalid phone number | "abc123" | Only numeric input accepted. |
| EMP-NEG-03 | Leave | Past date leave request | Previous date | Warning message displayed for invalid date. |
| EMP-NEG-04 | Leave | Zero balance leave request | Leave type with 0 balance | Submission blocked except for LOP leave. |
| EMP-NEG-05 | Attendance | Invalid geolocation | 0,0 coordinates | System marks attendance outside valid range. |
| EMP-NEG-06 | Documents | Large file upload | 50MB PDF | File upload rejected with size warning. |
| EMP-NEG-07 | Documents | Invalid PAN format | "12345" | Validation error "Use ABCDE1234F format" displayed. |
| EMP-NEG-08 | Documents | Invalid Aadhar number | "123" | Validation error "Must be 12 digits" displayed. |
| EMP-NEG-09 | Documents | Numbers in name field | "John123" | Numbers are blocked from name fields. |
| EMP-NEG-10 | Authentication | Empty login form | No input values | "All fields required" validation message displayed. |
| EMP-NEG-11 | Authentication | Invalid credentials | Wrong email/password | "Invalid credentials" error message displayed. |
| EMP-NEG-12 | Security | Password mismatch | Different new & confirm passwords | "Passwords do not match" error displayed. |
| EMP-NEG-13 | Security | Empty password fields | Empty strings | "All fields required" error displayed. |
| EMP-NEG-14 | Support | Empty ticket submission | No subject or description | Submit button disabled / validation error. |

---

### Responsive UI Test Requirements

| Req ID | Screen | Device Type | Resolution | Expected Layout |
|--------|--------|-------------|------------|-----------------|
| EMP-RES-01 | Dashboard | Mobile | 375 × 812 | Dashboard grid collapses into single-column layout. Task cards stack vertically. |
| EMP-RES-02 | Dashboard | Tablet | 768 × 1024 | Two-column grid layout with proper spacing. |
| EMP-RES-03 | Dashboard | Desktop | 1920 × 1080 | Full multi-column layout with all widgets visible. |
| EMP-RES-04 | Navigation Dock | Mobile | 375 × 812 | Navigation dock remains fixed at bottom with icon labels. |
| EMP-RES-05 | Navigation Dock | Tablet | 768 × 1024 | Navigation dock remains fixed at bottom. |
| EMP-RES-06 | Header | Mobile | 375 × 812 | Logo scales down, profile image and logout button remain accessible. |
| EMP-RES-07 | Profile | Mobile | 375 × 812 | Profile card stacks vertically: avatar → name → info → manager section. |
| EMP-RES-08 | Profile | Tablet | 768 × 1024 | Profile info flows in two-column layout with proper alignment. |
| EMP-RES-09 | Profile | Desktop | 1920 × 1080 | Full horizontal layout with avatar, info, and RM section side-by-side. |
| EMP-RES-10 | Documents Vault | Mobile | 375 × 812 | Form fields stack single-column. Upload zones scale to full width. |
| EMP-RES-11 | Documents Vault | Desktop | 1920 × 1080 | Two-column grid for form fields. Upload previews display inline. |
| EMP-RES-12 | Courses | Desktop | 1920 × 1080 | Course grid displays in multi-column layout correctly. |
| EMP-RES-13 | Leave Management | Mobile | 375 × 812 | Leave cards and balance display stack vertically. |
| EMP-RES-14 | Security Vault Modal | Mobile | 375 × 812 | Modal scales to full width with proper padding and readable inputs. |

---

### QA Testing Workflow – Employee Portal

#### 1. Access & Security Controls

**Login Verification**
- Verify that regular employees are redirected to the Dashboard after login.
- Verify that trainees are redirected to the Trainee Dashboard.

**Trainee Access Block**
- Test with a trainee whose joining date is older than 10 days.
- Confirm that the "Access Blocked" screen is displayed.
- Ensure Header and Footer interactions (Home, Fun, Profile) are completely disabled.

**Logout Logic**
- Verify that the "Log Out" button on the blocked screen works properly.

---

#### 2. Dashboard & Precision Timing

**Task Timestamping**
- Add a new task under "Today."
- Verify that the exact current time appears next to the task.

**Edit Locking**
- Edit an existing task.
- Confirm that the original timestamp remains unchanged.

**Yesterday Card**
- Open the "Yesterday" summary card.
- Verify that all yesterday tasks are merged into one list.
- Ensure the displayed time matches the latest activity from that day.

---

#### 3. Focus Logs & History

**Granular Timeline**
- Open the "Focus Logs" module.
- Verify that each sub-task contains its own timestamp for accurate tracking.

**Sorting**
- Ensure the latest logs appear at the top of the list.

---

#### 4. Project & Training Updates

**Automatic Logging**
- Change any project status to "Completed."
- Verify that a task is automatically added to "Today's Tasks" with the current time.

**Course Completion (Trainees)**
- Open a training Video or PDF.
- Verify that the course status changes automatically from "Not Started" to "In Progress" or "Completed."

---

#### 5. Profile & Document Persistence

**Profile Image Upload**
- Upload a profile picture from the Profile screen.
- Refresh the page and verify the image persists.
- Navigate to Dashboard and verify the Header avatar matches.

**Document Upload**
- Upload PAN, Aadhar, and Voter ID documents.
- Click "Save All Details" and refresh the page.
- Verify all uploaded documents remain visible.

**Profile Data Sync**
- Edit phone number, About Me, and Date of Birth.
- Refresh the page and verify all changes are saved.

---

#### 6. General Features

**Awards**
- Verify that Awards display real-time points and recognitions without hardcoded values.

**Leave Management**
- Apply for leave and confirm it appears in the "Pending" section.

**Resiliency**
- Refresh the page after adding a task.
- Verify that the task remains saved through Local Storage even if backend loading is slow.

---

### Final QA Review Notes

| Area | Validation Focus |
|------|-----------------|
| Security | Token validation, unauthorized access prevention, role-based restrictions, and password update workflows must be verified thoroughly. |
| Performance | Attendance APIs, dashboard rendering, document upload compression, and notification systems should maintain stable response times under load. |
| Responsiveness | Mobile, tablet, and desktop layouts must remain visually consistent without UI overlap issues. |
| Data Integrity | Leave balances, attendance logs, REP points, task statuses, profile images, and uploaded documents must remain synchronized across modules and survive page refreshes. |
| User Experience | Navigation flow, alerts, animations, toast notifications, and form validations should provide smooth interaction across all screens. |
| Document Persistence | Uploaded identity documents (PAN, Aadhar, Voter ID) and profile images must persist in both localStorage and backend database after page refresh. |
