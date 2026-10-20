/**
 * การตั้งค่าระบบและการเชื่อมต่อ API
 */
window.APP_CONFIG = {
  // ค่าเริ่มต้น URL ของ Google Apps Script Web App
  // สามารถเปลี่ยนผ่านหน้าต่างตั้งค่าในเว็บได้ทันที หรือแก้ไขที่นี่
  GAS_API_URL: localStorage.getItem("CREDIT_BANK_GAS_URL") || "",

  // Google Sheet & Drive Links
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU/edit?usp=drive_link",
  DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/1CVEw_Ux3HWjkYwHQQFoPU6MZjX_pY6mL?usp=drive_link",

  // รหัสผ่าน Admin PIN เริ่มต้น
  DEFAULT_ADMIN_PIN: "nan1credit2570",

  // LocalStorage Keys
  STORAGE_KEYS: {
    DRAFT_SURVEY: "cb_nan1_survey_draft_v1",
    SUBMITTED_RECEIPT: "cb_nan1_last_receipt",
    ADMIN_TOKEN: "cb_nan1_admin_token",
    GAS_URL: "CREDIT_BANK_GAS_URL"
  },

  // ข้อมูลหน่วยงาน
  ORG_INFO: {
    name: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
    shortName: "สพป.น่าน เขต 1",
    department: "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)",
    targetSchoolsCount: 34,
    totalAreaSchoolsCount: 149,
    academicYear: "2570"
  }
};
