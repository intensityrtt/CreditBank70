/**
 * ==============================================================================
 * ระบบสำรวจข้อมูลการดำเนินงานธนาคารหน่วยกิต (Credit Bank) ระดับการศึกษาขั้นพื้นฐาน
 * สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1 (สพป.น่าน เขต 1) ปีงบประมาณ 2570
 * ==============================================================================
 * 
 * Google Apps Script Server API
 * Spreadsheet ID: 1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU
 * Folder ID: 1CVEw_Ux3HWjkYwHQQFoPU6MZjX_pY6mL
 */

// รหัส Google Spreadsheet เป้าหมาย
var TARGET_SPREADSHEET_ID = "1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU";

// รายชื่อสถานศึกษาเป้าหมาย 34 โรงเรียน (กลุ่มโรงเรียนขยายโอกาสทางการศึกษา สพป.น่าน เขต 1)
var MASTER_SCHOOLS = [
  { name: "โรงเรียนบ้านน้ำครกใหม่", code: "1055250006", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านไชยสถาน", code: "1055250020", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านถืมตอง", code: "1055250026", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านน้ำงาว", code: "1055250034", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านผาตูบ", code: "1055250036", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านห้วยมอญ", code: "1055250031", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านน้ำโค้ง", code: "1055250027", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านสองแคว", code: "1055250030", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านปางเป๋ย", code: "1055250032", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านตอง", code: "1055250059", district: "แม่จริม" },
  { name: "โรงเรียนบ้านห้วยละเบ้ายา", code: "1055250060", district: "เมืองน่าน" },
  { name: "โรงเรียนบ้านน้ำปาย", code: "1055250064", district: "แม่จริม" },
  { name: "โรงเรียนบ้านน้ำพาง", code: "1055250067", district: "แม่จริม" },
  { name: "โรงเรียนบ้านร่มเกล้า", code: "1055250068", district: "แม่จริม" },
  { name: "โรงเรียนบ้านน้ำตวง", code: "1055250074", district: "แม่จริม" },
  { name: "โรงเรียนบ้านฟ้า", code: "1055250080", district: "บ้านหลวง" },
  { name: "โรงเรียนบ้านเปา", code: "1055250085", district: "นาน้อย" },
  { name: "โรงเรียนชุมชนบ้านอ้อย", code: "1055250088", district: "นาน้อย" },
  { name: "โรงเรียนบ้านนา", code: "1055250091", district: "นาน้อย" },
  { name: "โรงเรียนบ้านสันทะ", code: "1055250100", district: "นาน้อย" },
  { name: "โรงเรียนประกิตเวชศักดิ์", code: "1055250106", district: "นาน้อย" },
  { name: "โรงเรียนจอมจันทร์วิทยาคาร", code: "1055250107", district: "เวียงสา" },
  { name: "โรงเรียนบ้านแม่ขะนิง", code: "1055250118", district: "เวียงสา" },
  { name: "โรงเรียนภูเค็งพัฒนา", code: "1055250120", district: "เวียงสา" },
  { name: "โรงเรียนไตรธารวิทยา", code: "1055250122", district: "เวียงสา" },
  { name: "โรงเรียนบ้านท่ามงคล", code: "1055250125", district: "เวียงสา" },
  { name: "โรงเรียนบ้านบ่อหอย", code: "1055250130", district: "นาน้อย" },
  { name: "โรงเรียนป่าแลวหลวงวิทยา", code: "1055250133", district: "สันติสุข" },
  { name: "โรงเรียนบ้านห้วยแฮ้ว", code: "1055250137", district: "สันติสุข" },
  { name: "โรงเรียนบ้านศรีนาม่าน", code: "1055250140", district: "สันติสุข" },
  { name: "โรงเรียนราษฎร์รัฐพัฒนา", code: "1055250142", district: "สันติสุข" },
  { name: "โรงเรียนบ้านทุ่งน้อย", code: "1055250145", district: "ภูเพียง" },
  { name: "โรงเรียนบ้านห้วยไฮ", code: "1055250148", district: "ภูเพียง" },
  { name: "โรงเรียนบ้านหาดเค็ด", code: "1055250152", district: "ภูเพียง" }
];

/**
 * ดึง Spreadsheet ที่ใช้งาน
 */
function getSpreadsheet() {
  try {
    if (TARGET_SPREADSHEET_ID && TARGET_SPREADSHEET_ID.length > 10) {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    }
  } catch (e) {
    Logger.log("openById failed, fallback to getActiveSpreadsheet: " + e.toString());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * ฟังก์ชันเริ่มต้นสร้างฐานข้อมูลอัตโนมัติ (รันครั้งแรก หรือรันเมื่อเปิดใช้งาน)
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  
  // 1. แผ่นงาน Settings
  var settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["Key", "Value", "Description"]);
    settingsSheet.appendRow(["isOpen", "TRUE", "สถานะเปิดรับแบบสำรวจ (TRUE/FALSE)"]);
    settingsSheet.appendRow(["academicYear", "2570", "ปีงบประมาณ/ปีการศึกษา"]);
    settingsSheet.appendRow(["adminPin", "nan1credit2570", "รหัสผ่านผู้ดูแลระบบ (Admin PIN)"]);
    settingsSheet.appendRow(["areaOffice", "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1", "ชื่อหน่วยงาน"]);
    settingsSheet.appendRow(["totalTargetSchools", "34", "จำนวนสถานศึกษาเป้าหมาย"]);
    settingsSheet.appendRow(["title", "ระบบสำรวจข้อมูลการดำเนินงานระบบธนาคารหน่วยกิต (Credit Bank) สพป.น่าน เขต 1", "หัวข้อระบบ"]);
    settingsSheet.getRange("A1:C1").setBackground("#1b4d89").setFontColor("#ffffff").setFontWeight("bold");
    settingsSheet.autoResizeColumns(1, 3);
  }

  // 2. แผ่นงาน Schools (รายชื่อ 34 โรงเรียน)
  var schoolsSheet = ss.getSheetByName("Schools");
  if (!schoolsSheet) {
    schoolsSheet = ss.insertSheet("Schools");
    schoolsSheet.appendRow([
      "ลำดับ", "ชื่อสถานศึกษา", "รหัสสถานศึกษา (10 หลัก)", "อำเภอ",
      "สถานะการส่งข้อมูล", "วันเวลาที่ส่งข้อมูล", "ผู้รับผิดชอบ", "เบอร์โทรศัพท์",
      "ขนาดสถานศึกษา", "จำนวนนักเรียนรวม", "จำนวนผู้เรียนสะสมหน่วยกิต", "รหัสอ้างอิง"
    ]);
    schoolsSheet.getRange("A1:L1").setBackground("#1b4d89").setFontColor("#ffffff").setFontWeight("bold");
    
    for (var i = 0; i < MASTER_SCHOOLS.length; i++) {
      var s = MASTER_SCHOOLS[i];
      schoolsSheet.appendRow([
        i + 1, s.name, "'" + s.code, s.district,
        "ยังไม่ส่งข้อมูล", "-", "-", "-", "-", 0, 0, "-"
      ]);
    }
    schoolsSheet.autoResizeColumns(1, 12);
  } else {
    // ซิงค์ชื่ออำเภอให้เป็นปัจจุบันเสมอ
    var schoolRows = schoolsSheet.getDataRange().getValues();
    for (var r = 1; r < schoolRows.length; r++) {
      var schName = String(schoolRows[r][1]).trim();
      for (var m = 0; m < MASTER_SCHOOLS.length; m++) {
        if (MASTER_SCHOOLS[m].name === schName && schoolRows[r][3] !== MASTER_SCHOOLS[m].district) {
          schoolsSheet.getRange(r + 1, 4).setValue(MASTER_SCHOOLS[m].district);
          break;
        }
      }
    }
  }

  // 3. แผ่นงาน Submissions (เก็บคำตอบละเอียดตามแบบสำรวจโรงเรียน)
  var subSheet = ss.getSheetByName("Submissions");
  if (!subSheet) {
    subSheet = ss.insertSheet("Submissions");
    var headers = [
      "วันเวลาที่บันทึก (Timestamp)", "รหัสอ้างอิง (Ref ID)",
      "ชื่อสถานศึกษา", "รหัสสถานศึกษา (10 หลัก)", "สังกัด สพท.", "ขนาดสถานศึกษา",
      "ชื่อ-สกุล ผู้รับผิดชอบ", "เบอร์โทรศัพท์", "จำนวนนักเรียนทั้งหมดในโรงเรียน (คน)",
      // ส่วนที่ 2: 5 รูปแบบ
      "รูปแบบ 1: ในระบบ (คน)",
      "รูปแบบ 2: ไร้ห้องเรียน (คน)",
      "รูปแบบ 3: ต่อเนื่องเชื่อมโยง CLC (คน)",
      "รูปแบบ 4: เรียนล่วงหน้า/คู่ขนาน Pre-degree (คน)",
      "รูปแบบ 5: ประสบการณ์ (คน)",
      "รวมผู้เรียน 5 รูปแบบ (คน)",
      // ส่วนที่ 3: 9 โครงการ
      "โครงการ 1: 1 โรงเรียน 3 รูปแบบ (คน)",
      "โครงการ 2: ทวิศึกษา (คน)",
      "โครงการ 3: ต่อเนื่องเชื่อมโยง CLC (คน)",
      "โครงการ 4: มาตรฐานอาชีพและ NQF (คน)",
      "โครงการ 5: พื้นที่นวัตกรรม Sandbox (คน)",
      "โครงการ 6: Micro-credentials (คน)",
      "โครงการ 7: Skill Certificate (คน)",
      "โครงการ 8: Pre-degree (คน)",
      "โครงการ 9: อื่นๆ (ชื่อโครงการ)",
      "โครงการ 9: อื่นๆ (คน)",
      // ส่วนที่ 4: แพลตฟอร์ม & แหล่งเรียนรู้
      "แพลตฟอร์มออนไลน์ที่ใช้งาน",
      "แหล่งเรียนรู้/หน่วยจัดที่นำมาเทียบโอน",
      // ส่วนที่ 5: ความพร้อม
      "สถานะการขึ้นทะเบียนธนาคารหน่วยกิต",
      "การจัดทำเครือข่ายความร่วมมือ (MOU)",
      "ความพร้อมด้านบุคลากรและการจัดระบบ",
      "ความพร้อมด้านเทคโนโลยีดิจิทัล",
      // ส่วนที่ 6: งบประมาณ & อุปสรรค
      "การมุ่งเน้นนำงบประมาณไปใช้",
      "ปัญหาและอุปสรรคสำคัญ",
      "ปัญหาและอุปสรรคอื่นๆ (ระบุ)",
      "ข้อมูลอุปกรณ์/เบราว์เซอร์"
    ];
    subSheet.appendRow(headers);
    subSheet.getRange(1, 1, 1, headers.length).setBackground("#1b4d89").setFontColor("#ffffff").setFontWeight("bold");
    subSheet.autoResizeColumns(1, headers.length);
  }

  // 4. แผ่นงาน Logs
  var logSheet = ss.getSheetByName("Logs");
  if (!logSheet) {
    logSheet = ss.insertSheet("Logs");
    logSheet.appendRow(["Timestamp", "Action", "School/User", "Details"]);
    logSheet.getRange("A1:D1").setBackground("#334155").setFontColor("#ffffff").setFontWeight("bold");
    logSheet.appendRow([new Date(), "INITIALIZE_DATABASE", "SYSTEM", "ระบบฐานข้อมูลถูกสร้างเรียบร้อยแล้ว"]);
    logSheet.autoResizeColumns(1, 4);
  }

  return { success: true, message: "ฐานข้อมูลถูกติดตั้งเรียบร้อยแล้ว" };
}

/**
 * ตัวอ่านค่า Settings จากชีต
 */
function getSettingsMap() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("Settings");
  }
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    var k = data[i][0];
    var v = data[i][1];
    if (k) settings[k] = v;
  }
  return settings;
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getConfig";
  var result = {};

  try {
    switch (action) {
      case "ping":
        result = { success: true, timestamp: new Date().toISOString(), message: "Credit Bank API ready" };
        break;

      case "init":
      case "setup":
        result = setupDatabase();
        break;

      case "getConfig":
        var settings = getSettingsMap();
        var schoolsStats = getQuickSchoolStats();
        result = {
          success: true,
          isOpen: String(settings.isOpen).toUpperCase() === "TRUE",
          academicYear: settings.academicYear || "2570",
          title: settings.title || "ระบบสำรวจ Credit Bank สพป.น่าน เขต 1",
          areaOffice: settings.areaOffice || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalSchools: 34,
          submittedCount: schoolsStats.submittedCount,
          pendingCount: schoolsStats.pendingCount,
          totalStudentsInCreditBank: schoolsStats.totalStudentsInCreditBank
        };
        break;

      case "getSchools":
        result = {
          success: true,
          schools: getSchoolsList()
        };
        break;

      case "getSchoolSubmission":
        var schoolName = e.parameter.schoolName;
        result = getSchoolSubmissionByName(schoolName);
        break;

      case "getPublicStats":
        result = getPublicOverviewStats();
        break;

      case "adminLogin":
        var pin = e.parameter.pin;
        var appSettings = getSettingsMap();
        if (pin && String(pin).trim() === String(appSettings.adminPin).trim()) {
          result = { success: true, message: "เข้าสู่ระบบสำเร็จ", token: "token_" + Utilities.getUuid() };
        } else {
          result = { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }
        break;

      case "adminGetFullData":
        var verifyPin = e.parameter.pin;
        var currentSettings = getSettingsMap();
        if (verifyPin && String(verifyPin).trim() === String(currentSettings.adminPin).trim()) {
          result = getAdminFullData();
        } else {
          result = { success: false, message: "ไม่ได้รับอนุญาต (PIN ไม่ถูกต้อง)" };
        }
        break;

      case "adminToggleSurvey":
        var authPin = e.parameter.pin;
        var targetState = e.parameter.state; // "open" หรือ "closed"
        var conf = getSettingsMap();
        if (authPin && String(authPin).trim() === String(conf.adminPin).trim()) {
          result = toggleSurveyState(targetState === "open");
        } else {
          result = { success: false, message: "ไม่ได้รับอนุญาต (PIN ไม่ถูกต้อง)" };
        }
        break;

      default:
        result = { success: false, message: "Unknown action: " + action };
        break;
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  var result = {};
  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || "submitSurvey";

    switch (action) {
      case "submitSurvey":
        result = handleSurveySubmission(payload);
        break;

      case "adminToggleSurvey":
        var conf = getSettingsMap();
        if (payload.pin && String(payload.pin).trim() === String(conf.adminPin).trim()) {
          result = toggleSurveyState(payload.state === "open" || payload.state === true);
        } else {
          result = { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }
        break;

      case "adminResetSchool":
        var setMap = getSettingsMap();
        if (payload.pin && String(payload.pin).trim() === String(setMap.adminPin).trim()) {
          result = resetSchoolSubmission(payload.schoolName);
        } else {
          result = { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }
        break;

      case "adminResetAll":
        var resetAllMap = getSettingsMap();
        if (payload.pin && String(payload.pin).trim() === String(resetAllMap.adminPin).trim()) {
          result = resetAllSubmissions();
        } else {
          result = { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }
        break;

      case "adminUpdateSettings":
        var adminConf = getSettingsMap();
        if (payload.pin && String(payload.pin).trim() === String(adminConf.adminPin).trim()) {
          result = updateSettings(payload.settings);
        } else {
          result = { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }
        break;

      default:
        result = { success: false, message: "Unknown POST action: " + action };
        break;
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * สถิติด่วนของโรงเรียน
 */
function getQuickSchoolStats() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Schools");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("Schools");
  }
  var data = sheet.getDataRange().getValues();
  var submitted = 0;
  var totalStudents = 0;

  for (var i = 1; i < data.length; i++) {
    var status = data[i][4];
    var stdCount = Number(data[i][10]) || 0;
    if (status === "ส่งข้อมูลแล้ว") {
      submitted++;
      totalStudents += stdCount;
    }
  }

  return {
    submittedCount: submitted,
    pendingCount: 34 - submitted,
    totalStudentsInCreditBank: totalStudents
  };
}

/**
 * ดึงรายการโรงเรียนทั้งหมด 34 แห่งพร้อมสถานะ
 */
function getSchoolsList() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Schools");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("Schools");
  }
  var data = sheet.getDataRange().getValues();
  var list = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    list.push({
      id: row[0],
      name: String(row[1]).trim(),
      code: String(row[2]).replace("'", "").trim(),
      district: row[3],
      status: row[4], // "ส่งข้อมูลแล้ว" หรือ "ยังไม่ส่งข้อมูล"
      isSubmitted: row[4] === "ส่งข้อมูลแล้ว",
      submittedAt: row[5] ? row[5].toString() : "-",
      contactName: row[6] || "-",
      contactPhone: row[7] || "-",
      size: row[8] || "-",
      totalStudents: Number(row[9]) || 0,
      creditStudents: Number(row[10]) || 0,
      refId: row[11] || "-"
    });
  }
  return list;
}

/**
 * ดึงข้อมูลการส่งของโรงเรียนตามชื่อ
 */
function getSchoolSubmissionByName(schoolName) {
  if (!schoolName) return { success: false, message: "ไม่พบชื่อโรงเรียน" };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Submissions");
  if (!sheet) return { success: false, message: "ยังไม่มีข้อมูล" };

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) { // ค้นหาจากแถวล่าสุด
    if (String(data[i][2]).trim() === String(schoolName).trim()) {
      var row = data[i];
      return {
        success: true,
        data: {
          timestamp: row[0],
          refId: row[1],
          schoolName: row[2],
          schoolCode: row[3],
          areaOffice: row[4],
          schoolSize: row[5],
          respondentName: row[6],
          respondentPhone: row[7],
          studentTotal: row[8],
          formats: [row[9], row[10], row[11], row[12], row[13]],
          formatsTotal: row[14],
          projects: [row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22]],
          project9_name: row[23],
          project9_students: row[24],
          platforms: row[25] ? String(row[25]).split(", ") : [],
          learningProviders: row[26] ? String(row[26]).split(", ") : [],
          registrationStatus: row[27],
          mouStatus: row[28],
          personnelReadiness: row[29],
          digitalTechReadiness: row[30],
          budgetFocus: row[31] ? String(row[31]).split(", ") : [],
          obstacles: row[32] ? String(row[32]).split(", ") : [],
          obstaclesOther: row[33]
        }
      };
    }
  }
  return { success: false, message: "โรงเรียนนี้ยังไม่ได้บันทึกข้อมูล" };
}

/**
 * บันทึกข้อมูลการส่งแบบสำรวจ (submitSurvey)
 */
function handleSurveySubmission(payload) {
  var settings = getSettingsMap();
  var isOpen = String(settings.isOpen).toUpperCase() === "TRUE";

  if (!isOpen) {
    return {
      success: false,
      message: "ระบบสำรวจปิดรับการกรอกข้อมูลแล้ว กรุณาติดต่อผู้ดูแลระบบ สพป.น่าน เขต 1"
    };
  }

  var schoolName = String(payload.schoolName || "").trim();
  if (!schoolName) {
    return { success: false, message: "กรุณาระบุชื่อสถานศึกษา" };
  }

  var ss = getSpreadsheet();
  var subSheet = ss.getSheetByName("Submissions");
  var schoolsSheet = ss.getSheetByName("Schools");
  var logsSheet = ss.getSheetByName("Logs");

  if (!subSheet || !schoolsSheet) {
    setupDatabase();
    subSheet = ss.getSheetByName("Submissions");
    schoolsSheet = ss.getSheetByName("Schools");
    logsSheet = ss.getSheetByName("Logs");
  }

  var now = new Date();
  var thaiDateStr = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
  var refId = "CB70-" + Utilities.formatDate(now, "Asia/Bangkok", "yyyyMMdd") + "-" + ("000" + Math.floor(Math.random() * 1000)).slice(-3);

  // คำนวณผลรวม 5 รูปแบบ
  var f1 = Number(payload.format1_students) || 0;
  var f2 = Number(payload.format2_students) || 0;
  var f3 = Number(payload.format3_students) || 0;
  var f4 = Number(payload.format4_students) || 0;
  var f5 = Number(payload.format5_students) || 0;
  var formatsTotal = f1 + f2 + f3 + f4 + f5;

  var rowData = [
    thaiDateStr,
    refId,
    schoolName,
    "'" + String(payload.schoolCode || ""),
    payload.areaOffice || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
    payload.schoolSize || "-",
    payload.respondentName || "-",
    payload.respondentPhone || "-",
    Number(payload.studentTotal) || 0,
    f1, f2, f3, f4, f5, formatsTotal,
    Number(payload.project1_students) || 0,
    Number(payload.project2_students) || 0,
    Number(payload.project3_students) || 0,
    Number(payload.project4_students) || 0,
    Number(payload.project5_students) || 0,
    Number(payload.project6_students) || 0,
    Number(payload.project7_students) || 0,
    Number(payload.project8_students) || 0,
    payload.project9_name || "-",
    Number(payload.project9_students) || 0,
    Array.isArray(payload.platforms) ? payload.platforms.join(", ") : (payload.platforms || "-"),
    Array.isArray(payload.learningProviders) ? payload.learningProviders.join(", ") : (payload.learningProviders || "-"),
    payload.registrationStatus || "-",
    payload.mouStatus || "-",
    payload.personnelReadiness || "-",
    payload.digitalTechReadiness || "-",
    Array.isArray(payload.budgetFocus) ? payload.budgetFocus.join(", ") : (payload.budgetFocus || "-"),
    Array.isArray(payload.obstacles) ? payload.obstacles.join(", ") : (payload.obstacles || "-"),
    payload.obstaclesOther || "-",
    payload.clientInfo || "-"
  ];

  // 1. เพิ่มใน Submissions Sheet
  subSheet.appendRow(rowData);

  // 2. อัปเดตใน Schools Sheet
  var schoolsData = schoolsSheet.getDataRange().getValues();
  for (var i = 1; i < schoolsData.length; i++) {
    if (String(schoolsData[i][1]).trim() === schoolName) {
      var rowNum = i + 1;
      schoolsSheet.getRange(rowNum, 5).setValue("ส่งข้อมูลแล้ว");
      schoolsSheet.getRange(rowNum, 6).setValue(thaiDateStr);
      schoolsSheet.getRange(rowNum, 7).setValue(payload.respondentName || "-");
      schoolsSheet.getRange(rowNum, 8).setValue(payload.respondentPhone || "-");
      schoolsSheet.getRange(rowNum, 9).setValue(payload.schoolSize || "-");
      schoolsSheet.getRange(rowNum, 10).setValue(Number(payload.studentTotal) || 0);
      schoolsSheet.getRange(rowNum, 11).setValue(formatsTotal);
      schoolsSheet.getRange(rowNum, 12).setValue(refId);
      break;
    }
  }

  // 3. Log
  if (logsSheet) {
    logsSheet.appendRow([now, "SUBMIT_SURVEY", schoolName, "Ref: " + refId + " | นร.สะสม: " + formatsTotal]);
  }

  return {
    success: true,
    message: "บันทึกข้อมูลเรียบร้อยแล้ว",
    referenceId: refId,
    schoolName: schoolName,
    submittedAt: thaiDateStr,
    formatsTotal: formatsTotal
  };
}

/**
 * ข้อมูลสำหรับหน้าภาพรวมสาธารณะ (Public Tracker)
 */
function getPublicOverviewStats() {
  var schools = getSchoolsList();
  var submitted = schools.filter(function(s) { return s.isSubmitted; });
  var pending = schools.filter(function(s) { return !s.isSubmitted; });
  var totalStudents = submitted.reduce(function(acc, curr) { return acc + curr.creditStudents; }, 0);

  return {
    success: true,
    totalSchools: 34,
    submittedCount: submitted.length,
    pendingCount: pending.length,
    percentage: Math.round((submitted.length / 34) * 100),
    totalStudents: totalStudents,
    schools: schools
  };
}

/**
 * ดึงข้อมูลสรุปสำหรับรายงาน สพฐ. และภาพรวม Admin
 */
function getAdminFullData() {
  var ss = getSpreadsheet();
  var subSheet = ss.getSheetByName("Submissions");
  var schools = getSchoolsList();
  var settings = getSettingsMap();

  var submissions = [];
  if (subSheet) {
    var rawSub = subSheet.getDataRange().getValues();
    var headers = rawSub[0];
    for (var r = 1; r < rawSub.length; r++) {
      var item = {};
      for (var c = 0; c < headers.length; c++) {
        item[headers[c]] = rawSub[r][c];
      }
      submissions.push(item);
    }
  }

  // คำนวณสรุปตามโครงสร้าง รายงาน CreditBank สพฐ.pdf
  var obecSummary = calculateObecMetrics(submissions, schools);

  return {
    success: true,
    settings: {
      isOpen: String(settings.isOpen).toUpperCase() === "TRUE",
      academicYear: settings.academicYear || "2570",
      title: settings.title,
      areaOffice: settings.areaOffice || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1"
    },
    schools: schools,
    submissionsCount: submissions.length,
    obecSummary: obecSummary
  };
}

/**
 * ฟังก์ชันคำนวณสถิติเพื่อรายงาน สพฐ. (1:1 ตรงกับ รายงาน CreditBank สพฐ.pdf)
 */
function calculateObecMetrics(submissions, schools) {
  // สพฐ. ส่วนที่ 1: ข้อมูลทั่วไป
  var submittedSchools = schools.filter(function(s) { return s.isSubmitted; });
  var totalStudentsInCreditBank = submittedSchools.reduce(function(sum, s) { return sum + s.creditStudents; }, 0);
  
  // สพฐ. ส่วนที่ 2: 5 รูปแบบ
  var formats = [
    { id: 1, name: "แบบในระบบการศึกษา", schoolsCount: 0, studentsCount: 0 },
    { id: 2, name: "แบบไร้ห้องเรียน", schoolsCount: 0, studentsCount: 0 },
    { id: 3, name: "แบบหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", schoolsCount: 0, studentsCount: 0 },
    { id: 4, name: "แบบเรียนล่วงหน้า/คู่ขนาน (Pre-degree)", schoolsCount: 0, studentsCount: 0 },
    { id: 5, name: "แบบประสบการณ์", schoolsCount: 0, studentsCount: 0 }
  ];

  // สพฐ. ส่วนที่ 3: 9 โครงการ
  var projects = [
    { id: 1, number: 1, name: "โครงการ 1 โรงเรียน 3 รูปแบบการศึกษา", title: "โครงการ 1 โรงเรียน 3 รูปแบบการศึกษา", schoolsCount: 0, studentsCount: 0 },
    { id: 2, number: 2, name: "โครงการทวิศึกษา", title: "โครงการทวิศึกษา", schoolsCount: 0, studentsCount: 0 },
    { id: 3, number: 3, name: "โครงการการพัฒนาหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", title: "โครงการการพัฒนาหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", schoolsCount: 0, studentsCount: 0 },
    { id: 4, number: 4, name: "โครงการพัฒนาหลักสูตรตามมาตรฐานอาชีพ และ NQF", title: "โครงการพัฒนาหลักสูตรตามมาตรฐานอาชีพ และ NQF", schoolsCount: 0, studentsCount: 0 },
    { id: 5, number: 5, name: "โครงการหลักสูตรสถานศึกษาฐานสมรรถนะในพื้นที่นวัตกรรมการศึกษา (Sandbox)", title: "โครงการหลักสูตรสถานศึกษาฐานสมรรถนะในพื้นที่นวัตกรรมการศึกษา (Sandbox)", schoolsCount: 0, studentsCount: 0 },
    { id: 6, number: 6, name: "โครงการคลังรายวิชาและสมรรถนะย่อย (Micro-credentials)", title: "โครงการคลังรายวิชาและสมรรถนะย่อย (Micro-credentials)", schoolsCount: 0, studentsCount: 0 },
    { id: 7, number: 7, name: "โครงการเรียนรู้จากใบประกาศ (Skill Certificate) และผลทดสอบมาตรฐาน", title: "โครงการเรียนรู้จากใบประกาศ (Skill Certificate) และผลทดสอบมาตรฐาน", schoolsCount: 0, studentsCount: 0 },
    { id: 8, number: 8, name: "โครงการส่งเสริมผู้เรียนเรียนล่วงหน้าในหลักสูตรที่สูงขึ้น (Pre-degree)", title: "โครงการส่งเสริมผู้เรียนเรียนล่วงหน้าในหลักสูตรที่สูงขึ้น (Pre-degree)", schoolsCount: 0, studentsCount: 0 },
    { id: 9, number: 9, name: "อื่น ๆ (ระบุ)", title: "อื่น ๆ (ระบุ)", schoolsCount: 0, studentsCount: 0, details: [] }
  ];

  // สพฐ. ส่วนที่ 4: แพลตฟอร์ม & แหล่งเรียนรู้
  var platformsStats = {
    "แพลตฟอร์มระดับชาติ (เช่น ระบบ NDLP, แพลตฟอร์มของ สพฐ., Thai MOOC เป็นต้น)": 0,
    "แพลตฟอร์มของสถาบันอุดมศึกษา/อาชีวศึกษา ที่ทำ MOU ร่วมกัน": 0,
    "แพลตฟอร์มระดับสากลหรือเอกชน (เช่น Coursera, Google Classroom, Microsoft Teams)": 0,
    "แพลตฟอร์มหรือ Learning Management System LMS ที่สถานศึกษาพัฒนาขึ้นเอง": 0,
    "ยังไม่มีแพลตฟอร์มรองรับที่ชัดเจน": 0
  };

  var providersStats = {
    "ศูนย์ฝึกอาชีพ / สถาบันพัฒนาฝีมือแรงงาน": 0,
    "สถานประกอบการ / ภาคธุรกิจในพื้นที่": 0,
    "ศูนย์การเรียนรู้ชุมชน / ปราชญ์ชาวบ้าน / แหล่งเรียนรู้ท้องถิ่น": 0,
    "สถาบันภาษา / ศูนย์ทดสอบมาตรฐานสากล": 0,
    "สถานศึกษาจัดการประเมินและรับรองด้วยตนเองทั้งหมด": 0
  };

  // สพฐ. ส่วนที่ 5: ความพร้อม
  var regStats = {
    "ได้รับการอนุมัติและประกาศขึ้นทะเบียนธนาคารหน่วยกิตจาก ศธจ. เรียบร้อยแล้ว": 0,
    "สพท. ตรวจสอบ และเสนอขออนุมัติต่อสำนักงานศึกษาธิการจังหวัด (ศธจ.) แล้ว": 0,
    "สถานศึกษาที่ดำเนินการระบบธนาคารหน่วยกิตฯ โดยอยู่ในกำกับของ สพท. แล้ว": 0,
    "จัดทำข้อมูลความพร้อม (OCB-01) และยื่นคำร้อง (OCB-02) ต่อ สพท. แล้ว": 0,
    "สถานศึกษาเป็นผู้ดำเนินการด้วยตนเอง โดยความร่วมมือ MOU กับหน่วยงานต่าง ๆ": 0,
    "ยังไม่ได้เริ่มดำเนินการ / อยู่ระหว่างเตรียมการ": 0
  };

  var mouStats = {
    "มีการทำ MOU ร่วมกับสถาบันอื่น พร้อมจัดทำตารางเทียบเคียงรายวิชา/สมรรถนะแล้ว": 0,
    "มีการทำ MOU ร่วมกับสถาบันอื่น แต่ยังไม่มีตารางเทียบเคียงรายวิชา/สมรรถนะที่ชัดเจน": 0,
    "อยู่ระหว่างการเจรจาหรือเตรียมการ": 0,
    "ยังไม่มีการดำเนินการ": 0
  };

  var personnelStats = {
    "มีคณะกรรมการดำเนินงาน ครูและบุคลากรมีความเข้าใจระเบียบและเกณฑ์การเทียบโอนเป็นอย่างดี": 0,
    "มีผู้รับผิดชอบ แต่ยังต้องการการอบรม (Workshop) เพื่อสร้างความเข้าใจและจัดทำเครื่องมือประเมิน": 0
  };

  var digitalStats = {
    "มีระบบฐานข้อมูลที่เสถียรและสามารถเชื่อมโยงกับหน่วยงานอื่นได้": 0,
    "มีระบบบันทึกผลภายใน แต่ยังต้องการงบประมาณสนับสนุนด้านเทคโนโลยีและอุปกรณ์เพิ่มเติม": 0,
    "ยังใช้ระบบกระดาษ (Manual) ขาดความพร้อมด้านโครงสร้างพื้นฐานดิจิทัลอย่างเร่งด่วน": 0
  };

  var budgetStats = {
    "การพัฒนาหลักสูตร การเทียบสมรรถนะ และจัดทำตารางเทียบเคียงรายวิชา": 0,
    "การพัฒนาเครื่องมือประเมินผลตามสภาพจริง (Authentic Assessment / Rubric)": 0,
    "การจัดอบรมเชิงปฏิบัติการเพื่อพัฒนาทักษะครูและคณะกรรมการเทียบโอน": 0,
    "การพัฒนาระบบสารสนเทศ ฐานข้อมูล และจัดหาอุปกรณ์ (Digital Readiness)": 0,
    "การจัดกิจกรรมการเรียนรู้และพัฒนาทักษะวิชาชีพให้แก่ผู้เรียน": 0
  };
  var obstacleStats = {
    "ขาดงบประมาณในการจัดกิจกรรมและพัฒนาระบบ": 0,
    "ขาดความเข้าใจในการกำหนดผลลัพธ์การเรียนรู้ (Learning Outcome) และการเทียบโอน": 0,
    "ภาระงานของครูมีมาก ทำให้การประเมินและติดตามผู้เรียนเป็นรายบุคคลทำได้ยาก": 0,
    "ขาดแหล่งเรียนรู้หรือขาดความร่วมมือจากสถานประกอบการและชุมชน": 0
  };

  var submittedNamesMap = {};
  for (var sIdx = 0; sIdx < submittedSchools.length; sIdx++) {
    submittedNamesMap[submittedSchools[sIdx].name] = true;
  }

  // วนลูปคำนวณจาก Submissions ล่าสุดของแต่ละโรงเรียนที่มีสถานะส่งแล้ว (De-duplicate by school)
  var latestSubmissions = {};
  for (var i = 0; i < submissions.length; i++) {
    var sub = submissions[i];
    var sName = String(sub["ชื่อสถานศึกษา"] || "").trim();
    if (sName && submittedNamesMap[sName]) {
      latestSubmissions[sName] = sub; // ทับด้วยอันล่าสุด
    }
  }

  var schoolKeys = Object.keys(latestSubmissions);
  for (var k = 0; k < schoolKeys.length; k++) {
    var row = latestSubmissions[schoolKeys[k]];

    // 5 รูปแบบ
    for (var f = 0; f < 5; f++) {
      var colName = [
        "รูปแบบ 1: ในระบบ (คน)",
        "รูปแบบ 2: ไร้ห้องเรียน (คน)",
        "รูปแบบ 3: ต่อเนื่องเชื่อมโยง CLC (คน)",
        "รูปแบบ 4: เรียนล่วงหน้า/คู่ขนาน Pre-degree (คน)",
        "รูปแบบ 5: ประสบการณ์ (คน)"
      ][f];
      var std = Number(row[colName]) || 0;
      if (std > 0) {
        formats[f].schoolsCount++;
        formats[f].studentsCount += std;
      }
    }

    // 9 โครงการ
    for (var p = 0; p < 8; p++) {
      var pCol = [
        "โครงการ 1: 1 โรงเรียน 3 รูปแบบ (คน)",
        "โครงการ 2: ทวิศึกษา (คน)",
        "โครงการ 3: ต่อเนื่องเชื่อมโยง CLC (คน)",
        "โครงการ 4: มาตรฐานอาชีพและ NQF (คน)",
        "โครงการ 5: พื้นที่นวัตกรรม Sandbox (คน)",
        "โครงการ 6: Micro-credentials (คน)",
        "โครงการ 7: Skill Certificate (คน)",
        "โครงการ 8: Pre-degree (คน)"
      ][p];
      var pStd = Number(row[pCol]) || 0;
      if (pStd > 0) {
        projects[p].schoolsCount++;
        projects[p].studentsCount += pStd;
      }
    }
    // โครงการ 9 อื่นๆ
    var p9Std = Number(row["โครงการ 9: อื่นๆ (คน)"]) || 0;
    var p9Name = row["โครงการ 9: อื่นๆ (ชื่อโครงการ)"];
    if (p9Std > 0 || (p9Name && p9Name !== "-")) {
      projects[8].schoolsCount++;
      projects[8].studentsCount += p9Std;
      if (p9Name && p9Name !== "-") {
        projects[8].details.push(p9Name + " (" + p9Std + " คน)");
      }
    }

    // Platforms
    var platStr = String(row["แพลตฟอร์มออนไลน์ที่ใช้งาน"] || "");
    for (var platKey in platformsStats) {
      if (platStr.indexOf(platKey.substring(0, 15)) !== -1) {
        platformsStats[platKey]++;
      }
    }

    // Providers
    var provStr = String(row["แหล่งเรียนรู้/หน่วยจัดที่นำมาเทียบโอน"] || "");
    for (var provKey in providersStats) {
      if (provStr.indexOf(provKey.substring(0, 15)) !== -1) {
        providersStats[provKey]++;
      }
    }

    // Registration
    var reg = String(row["สถานะการขึ้นทะเบียนธนาคารหน่วยกิต"] || "");
    for (var rk in regStats) {
      if (reg.indexOf(rk.substring(0, 15)) !== -1) {
        regStats[rk]++;
        break;
      }
    }

    // MOU
    var mou = String(row["การจัดทำเครือข่ายความร่วมมือ (MOU)"] || "");
    for (var mk in mouStats) {
      if (mou.indexOf(mk.substring(0, 15)) !== -1) {
        mouStats[mk]++;
        break;
      }
    }

    // Personnel
    var prs = String(row["ความพร้อมด้านบุคลากรและการจัดระบบ"] || "");
    for (var pk in personnelStats) {
      if (prs.indexOf(pk.substring(0, 15)) !== -1) {
        personnelStats[pk]++;
        break;
      }
    }

    // Digital
    var dgt = String(row["ความพร้อมด้านเทคโนโลยีดิจิทัล"] || "");
    for (var dk in digitalStats) {
      if (dgt.indexOf(dk.substring(0, 15)) !== -1) {
        digitalStats[dk]++;
        break;
      }
    }

    // Budget Focus
    var bgt = String(row["การมุ่งเน้นนำงบประมาณไปใช้"] || "").split(", ");
    for (var b = 0; b < bgt.length; b++) {
      var item = bgt[b].trim();
      if (item && item !== "-") {
        budgetStats[item] = (budgetStats[item] || 0) + 1;
      }
    }

    // Obstacles
    var obs = String(row["ปัญหาและอุปสรรคสำคัญ"] || "").split(", ");
    for (var o = 0; o < obs.length; o++) {
      var oitem = obs[o].trim();
      if (oitem && oitem !== "-") {
        obstacleStats[oitem] = (obstacleStats[oitem] || 0) + 1;
      }
    }
  }

  return {
    part1_general: {
      areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
      totalTargetSchools: 34,
      totalSchoolsInArea: 149,
      participatingSchoolsCount: schoolKeys.length,
      totalStudentsInCreditBank: totalStudentsInCreditBank
    },
    part2_formats: formats,
    part3_projects: projects,
    part4_platforms: platformsStats,
    part4_providers: providersStats,
    part5_registration: regStats,
    part5_mou: mouStats,
    part5_personnel: personnelStats,
    part5_digital: digitalStats,
    part6_budget: budgetStats,
    part6_obstacles: obstacleStats
  };
}

/**
 * เปิด/ปิด ระบบสำรวจ
 */
function toggleSurveyState(newState) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  var logsSheet = ss.getSheetByName("Logs");
  var valStr = newState ? "TRUE" : "FALSE";

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "isOpen") {
      sheet.getRange(i + 1, 2).setValue(valStr);
      break;
    }
  }

  if (logsSheet) {
    logsSheet.appendRow([new Date(), "TOGGLE_SURVEY", "ADMIN", "สถานะใหม่: " + valStr]);
  }

  return {
    success: true,
    isOpen: newState,
    message: newState ? "เปิดรับแบบสำรวจเรียบร้อยแล้ว" : "ปิดรับแบบสำรวจเรียบร้อยแล้ว"
  };
}

/**
 * รีเซ็ตการส่งของโรงเรียน (กรณีต้องการให้กรอกใหม่)
 */
function resetSchoolSubmission(schoolName) {
  var ss = getSpreadsheet();
  var schoolsSheet = ss.getSheetByName("Schools");
  var subSheet = ss.getSheetByName("Submissions");
  var logsSheet = ss.getSheetByName("Logs");

  if (subSheet) {
    var subData = subSheet.getDataRange().getValues();
    for (var s = subData.length - 1; s >= 1; s--) {
      if (String(subData[s][2]).trim() === String(schoolName).trim()) {
        subSheet.deleteRow(s + 1);
      }
    }
  }

  var data = schoolsSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(schoolName).trim()) {
      var row = i + 1;
      schoolsSheet.getRange(row, 5).setValue("ยังไม่ส่งข้อมูล");
      schoolsSheet.getRange(row, 6).setValue("-");
      schoolsSheet.getRange(row, 7).setValue("-");
      schoolsSheet.getRange(row, 8).setValue("-");
      schoolsSheet.getRange(row, 9).setValue("-");
      schoolsSheet.getRange(row, 10).setValue(0);
      schoolsSheet.getRange(row, 11).setValue(0);
      schoolsSheet.getRange(row, 12).setValue("-");

      if (logsSheet) {
        logsSheet.appendRow([new Date(), "RESET_SCHOOL", schoolName, "รีเซ็ตสถานะโดย Admin"]);
      }

      return { success: true, message: "รีเซ็ตสถานะโรงเรียน " + schoolName + " เรียบร้อยแล้ว" };
    }
  }
  return { success: false, message: "ไม่พบชื่อโรงเรียนที่ระบุ" };
}

/**
 * ล้างข้อมูลการส่งทั้งหมด 34 โรงเรียนเพื่อเริ่มต้นใช้งานจริง
 */
function resetAllSubmissions() {
  var ss = getSpreadsheet();
  var schoolsSheet = ss.getSheetByName("Schools");
  var subSheet = ss.getSheetByName("Submissions");
  var logsSheet = ss.getSheetByName("Logs");

  if (subSheet && subSheet.getLastRow() > 1) {
    subSheet.deleteRows(2, subSheet.getLastRow() - 1);
  }

  if (schoolsSheet) {
    var data = schoolsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = i + 1;
      schoolsSheet.getRange(row, 5).setValue("ยังไม่ส่งข้อมูล");
      schoolsSheet.getRange(row, 6).setValue("-");
      schoolsSheet.getRange(row, 7).setValue("-");
      schoolsSheet.getRange(row, 8).setValue("-");
      schoolsSheet.getRange(row, 9).setValue("-");
      schoolsSheet.getRange(row, 10).setValue(0);
      schoolsSheet.getRange(row, 11).setValue(0);
      schoolsSheet.getRange(row, 12).setValue("-");
    }
  }

  if (logsSheet) {
    logsSheet.appendRow([new Date(), "RESET_ALL_DATA", "ADMIN", "ล้างข้อมูลการส่งทั้งหมดเพื่อเริ่มใช้งานจริง"]);
  }

  return { success: true, message: "ล้างข้อมูลการส่งทั้งหมดเรียบร้อยแล้ว ระบบพร้อมเริ่มต้นใช้งานจริง" };
}

/**
 * อัปเดต Settings
 */
function updateSettings(newSettings) {
  if (!newSettings) return { success: false, message: "ไม่มีข้อมูลตั้งค่า" };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (newSettings[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(String(newSettings[key]));
    }
  }

  return { success: true, message: "บันทึกการตั้งค่าเรียบร้อยแล้ว" };
}
