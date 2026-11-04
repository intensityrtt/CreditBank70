/**
 * API Service สำหรับติดต่อกับ Google Apps Script Server และดึงข้อมูลสดจาก Google Sheet โดยตรง
 * Spreadsheet ID: 1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU
 */
window.ApiService = (function() {
  var SCHOOLS_STORAGE_KEY = "cb_nan1_schools_prod_v1";
  var SUBMISSIONS_STORAGE_KEY = "cb_nan1_submissions_prod_v1";
  var CLEANUP_FLAG_KEY = "cb_nan1_mock_purged_v1";

  var localSchools = [];
  var cachedSheetSettings = null;
  var cachedSheetSubmissions = [];
  var isPublishingGasUrl = false;
  var isSyncingPending = false;

  function getSheetId() {
    return (window.APP_CONFIG && window.APP_CONFIG.SHEET_ID) || "1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU";
  }

  function cleanTitleText(rawTitle) {
    var t = String(rawTitle || "ระบบสำรวจข้อมูลการดำเนินงานระบบธนาคารหน่วยกิต (Credit Bank) สพป.น่าน เขต 1");
    if (t.indexOf("||") !== -1) {
      return t.split("||")[0].trim();
    }
    return t.trim();
  }

  function extractEmbeddedGasUrl(settingsObj) {
    if (!settingsObj) return "";
    if (settingsObj.webAppUrl && String(settingsObj.webAppUrl).trim().indexOf("https://script.google.com") === 0) {
      return String(settingsObj.webAppUrl).trim();
    }
    if (settingsObj.GAS_API_URL && String(settingsObj.GAS_API_URL).trim().indexOf("https://script.google.com") === 0) {
      return String(settingsObj.GAS_API_URL).trim();
    }
    var rawTitle = String(settingsObj.title || "");
    if (rawTitle.indexOf("||https://script.google.com") !== -1) {
      var parts = rawTitle.split("||");
      for (var i = 1; i < parts.length; i++) {
        var candidate = parts[i].trim();
        if (candidate.indexOf("https://script.google.com") === 0) {
          return candidate;
        }
      }
    }
    return "";
  }

  // ล้างข้อมูลจำลอง (Mock Data) เดิมออกทั้งหมด เพื่อให้ระบบพร้อมใช้งานจริง 100%
  function purgeLegacyMockData() {
    try {
      localStorage.removeItem("cb_nan1_mock_schools");
      localStorage.removeItem("cb_nan1_mock_submissions");
      if (!localStorage.getItem(CLEANUP_FLAG_KEY)) {
        localStorage.removeItem("cb_nan1_survey_draft_v1");
        localStorage.removeItem("cb_nan1_last_receipt");
        localStorage.setItem(CLEANUP_FLAG_KEY, "true");
      }
    } catch (e) {}
  }

  // สร้างรายชื่อตั้งต้น 34 โรงเรียน (สถานะเริ่มต้น: ยังไม่ส่งข้อมูลทั้งหมด 0 แห่ง)
  function createCleanSchoolsList() {
    var master = window.MASTER_SCHOOLS_DATA || [];
    return master.map(function(s) {
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        district: s.district,
        status: "ยังไม่ส่งข้อมูล",
        isSubmitted: false,
        submittedAt: "-",
        contactName: "-",
        contactPhone: "-",
        size: s.defaultSize,
        totalStudents: 0,
        creditStudents: 0,
        refId: "-"
      };
    });
  }

  // เริ่มต้นข้อมูลโรงเรียนสำหรับใช้งานจริง
  function initLocalData() {
    purgeLegacyMockData();

    var savedSchools = localStorage.getItem(SCHOOLS_STORAGE_KEY);
    if (savedSchools) {
      try {
        var parsed = JSON.parse(savedSchools);
        if (Array.isArray(parsed) && parsed.length === 34) {
          var masterMap = {};
          (window.MASTER_SCHOOLS_DATA || []).forEach(function(m) {
            masterMap[m.name] = m;
          });
          localSchools = parsed.map(function(item) {
            var m = masterMap[item.name];
            if (m) {
              item.code = m.code;
              item.district = m.district;
            }
            return item;
          });
          return;
        }
      } catch (e) {}
    }

    localSchools = createCleanSchoolsList();
    saveLocalSchools();
  }

  function saveLocalSchools() {
    try {
      localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(localSchools));
    } catch (e) {}
  }

  initLocalData();

  var DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxbjcNtoGJHDH3HDN_3RjcVUJEOE07NRdU5v2qHjriKJdcmDYeJzY0lSDk1EuTPcdbO/exec";

  // ตรวจสอบสถานะการเชื่อมต่อ
  function getApiUrl() {
    var stored = "";
    try {
      stored = localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL) || "";
    } catch (e) {}
    return (stored || (window.APP_CONFIG && window.APP_CONFIG.GAS_API_URL) || DEFAULT_GAS_URL).trim();
  }

  function setApiUrlInternal(url) {
    if (!url || url.indexOf("https://script.google.com") !== 0) return;
    var clean = url.trim();
    try {
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL, clean);
    } catch (e) {}
    if (window.APP_CONFIG) {
      window.APP_CONFIG.GAS_API_URL = clean;
    }
  }

  function isLiveConnected() {
    var url = getApiUrl();
    return Boolean(url && url.indexOf("https://script.google.com") === 0);
  }

  /**
   * ดึงข้อมูลสดจาก Google Sheet (1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU) ผ่าน Google Visualization JSONP
   * ทำงานได้บนทุกเบราว์เซอร์โดยไม่ติด CORS และไม่ต้องล็อกอินบัญชี Google
   */
  function fetchSheetGviz(sheetName) {
    return new Promise(function(resolve, reject) {
      var sheetId = getSheetId();
      var cbName = "__gviz_cb_" + sheetName.replace(/[^a-zA-Z0-9]/g, "") + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      var script = document.createElement("script");
      var timer = setTimeout(function() {
        cleanup();
        reject(new Error("Google Sheet gviz timeout: " + sheetName));
      }, 8000);

      function cleanup() {
        clearTimeout(timer);
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        try {
          delete window[cbName];
        } catch (e) {
          window[cbName] = undefined;
        }
      }

      window[cbName] = function(response) {
        cleanup();
        if (response && response.status === "ok" && response.table) {
          resolve(parseGvizTable(response.table));
        } else {
          reject(new Error("Invalid gviz response for " + sheetName));
        }
      };

      script.onerror = function() {
        cleanup();
        reject(new Error("Failed to load gviz script for " + sheetName));
      };

      var url = "https://docs.google.com/spreadsheets/d/" + sheetId +
        "/gviz/tq?tqx=out:json;responseHandler:" + cbName +
        "&sheet=" + encodeURIComponent(sheetName) +
        "&_t=" + Date.now();
      script.src = url;
      document.head.appendChild(script);
    });
  }

  /**
   * แปลงโครงสร้างตาราง gviz เป็น headers, rows (2D array) และ objects
   * รองรับทั้งกรณี parsedNumHeaders === 1 และ parsedNumHeaders === 0
   */
  function parseGvizTable(table) {
    if (!table || !table.rows) return { headers: [], rows: [], objects: [] };
    var cols = table.cols || [];
    var rawRows = table.rows || [];
    var hasColLabels = cols.some(function(c) { return c && c.label && String(c.label).trim() !== ""; });
    var headers = [];
    var startRow = 0;

    if (hasColLabels && table.parsedNumHeaders !== 0) {
      headers = cols.map(function(c) { return c && c.label ? String(c.label).trim() : ""; });
      startRow = 0;
    } else if (rawRows.length > 0) {
      var firstCells = rawRows[0].c || [];
      headers = firstCells.map(function(cell) {
        return (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v).trim() : "";
      });
      startRow = 1;
    }

    var matrix = [];
    var objects = [];
    for (var r = startRow; r < rawRows.length; r++) {
      var rowCells = (rawRows[r] && rawRows[r].c) ? rawRows[r].c : [];
      var rowArr = [];
      var obj = {};
      var maxLen = Math.max(headers.length, rowCells.length);
      var hasAnyValue = false;

      for (var c = 0; c < maxLen; c++) {
        var cell = rowCells[c];
        var val = "";
        if (cell) {
          if (cell.f !== undefined && cell.f !== null && typeof cell.v === "string" && cell.v.indexOf("Date(") === 0) {
            val = cell.f;
          } else if (cell.v !== undefined && cell.v !== null) {
            val = cell.v;
          } else if (cell.f !== undefined && cell.f !== null) {
            val = cell.f;
          }
        }
        if (val !== "" && val !== null && val !== undefined) {
          hasAnyValue = true;
        }
        rowArr.push(val);
        if (headers[c]) {
          obj[headers[c]] = val;
        }
      }

      if (!hasAnyValue) continue;
      // ข้ามแถวหัวตารางหากติดมาในข้อมูล
      if (String(rowArr[0]).trim() === "ลำดับ" || String(rowArr[0]).trim() === "Key" || String(rowArr[2]).trim() === "ชื่อสถานศึกษา") {
        continue;
      }

      matrix.push(rowArr);
      objects.push(obj);
    }

    return { headers: headers, rows: matrix, objects: objects };
  }

  /**
   * แปลงแถวจากชีต Submissions ให้เป็นออบเจกต์มาตรฐานเดียวกันทั้งระบบ
   */
  function normalizeSubmissionRow(rowArr, rowObj) {
    rowArr = rowArr || [];
    rowObj = rowObj || {};

    function pick(colIdx, headerKey) {
      if (rowArr[colIdx] !== undefined && rowArr[colIdx] !== "") return rowArr[colIdx];
      if (headerKey && rowObj[headerKey] !== undefined && rowObj[headerKey] !== "") return rowObj[headerKey];
      return "";
    }

    function splitList(val) {
      if (Array.isArray(val)) return val;
      var s = String(val || "").trim();
      if (!s || s === "-") return [];
      return s.split(", ").map(function(x) { return x.trim(); }).filter(Boolean);
    }

    var f1 = Number(pick(9, "รูปแบบ 1: ในระบบ (คน)")) || Number(rowObj.format1_students) || 0;
    var f2 = Number(pick(10, "รูปแบบ 2: ไร้ห้องเรียน (คน)")) || Number(rowObj.format2_students) || 0;
    var f3 = Number(pick(11, "รูปแบบ 3: ต่อเนื่องเชื่อมโยง CLC (คน)")) || Number(rowObj.format3_students) || 0;
    var f4 = Number(pick(12, "รูปแบบ 4: เรียนล่วงหน้า/คู่ขนาน Pre-degree (คน)")) || Number(rowObj.format4_students) || 0;
    var f5 = Number(pick(13, "รูปแบบ 5: ประสบการณ์ (คน)")) || Number(rowObj.format5_students) || 0;
    var fSum = f1 + f2 + f3 + f4 + f5;
    var fReported = Number(pick(14, "รวมผู้เรียน 5 รูปแบบ (คน)")) || Number(rowObj.formatsTotal) || 0;
    var formatsTotal = fSum > 0 ? fSum : fReported;

    var p1 = Number(pick(15, "โครงการ 1: 1 โรงเรียน 3 รูปแบบ (คน)")) || Number(rowObj.project1_students) || 0;
    var p2 = Number(pick(16, "โครงการ 2: ทวิศึกษา (คน)")) || Number(rowObj.project2_students) || 0;
    var p3 = Number(pick(17, "โครงการ 3: ต่อเนื่องเชื่อมโยง CLC (คน)")) || Number(rowObj.project3_students) || 0;
    var p4 = Number(pick(18, "โครงการ 4: มาตรฐานอาชีพและ NQF (คน)")) || Number(rowObj.project4_students) || 0;
    var p5 = Number(pick(19, "โครงการ 5: พื้นที่นวัตกรรม Sandbox (คน)")) || Number(rowObj.project5_students) || 0;
    var p6 = Number(pick(20, "โครงการ 6: Micro-credentials (คน)")) || Number(rowObj.project6_students) || 0;
    var p7 = Number(pick(21, "โครงการ 7: Skill Certificate (คน)")) || Number(rowObj.project7_students) || 0;
    var p8 = Number(pick(22, "โครงการ 8: Pre-degree (คน)")) || Number(rowObj.project8_students) || 0;
    var p9Name = String(pick(23, "โครงการ 9: อื่นๆ (ชื่อโครงการ)") || rowObj.project9_name || "-").trim();
    var p9 = Number(pick(24, "โครงการ 9: อื่นๆ (คน)")) || Number(rowObj.project9_students) || 0;
    var projectsTotal = p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

    // หากโรงเรียนกรอกจำนวนนักเรียนใน 9 โครงการ แต่ไม่ได้กรอกใน 5 รูปแบบ ให้ใช้ยอดจากโครงการเป็นยอดผู้เรียนสะสมหน่วยกิตด้วย
    var effectiveCreditStudents = formatsTotal > 0 ? formatsTotal : projectsTotal;

    return {
      submittedAt: String(pick(0, "วันเวลาที่บันทึก (Timestamp)") || rowObj.submittedAt || "-").trim(),
      refId: String(pick(1, "รหัสอ้างอิง (Ref ID)") || rowObj.refId || "-").trim(),
      schoolName: String(pick(2, "ชื่อสถานศึกษา") || rowObj.schoolName || "").trim(),
      schoolCode: String(pick(3, "รหัสสถานศึกษา (10 หลัก)") || rowObj.schoolCode || "").replace(/^'/, "").trim(),
      areaOffice: String(pick(4, "สังกัด สพท.") || rowObj.areaOffice || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1").trim(),
      schoolSize: String(pick(5, "ขนาดสถานศึกษา") || rowObj.schoolSize || "กลาง").trim(),
      respondentName: String(pick(6, "ชื่อ-สกุล ผู้รับผิดชอบ") || rowObj.respondentName || "-").trim(),
      respondentPhone: String(pick(7, "เบอร์โทรศัพท์") || rowObj.respondentPhone || "-").replace(/^'/, "").trim(),
      studentTotal: Number(pick(8, "จำนวนนักเรียนทั้งหมดในโรงเรียน (คน)")) || Number(rowObj.studentTotal) || 0,
      format1_students: f1,
      format2_students: f2,
      format3_students: f3,
      format4_students: f4,
      format5_students: f5,
      formatsTotal: effectiveCreditStudents,
      projectsTotal: projectsTotal,
      project1_students: p1,
      project2_students: p2,
      project3_students: p3,
      project4_students: p4,
      project5_students: p5,
      project6_students: p6,
      project7_students: p7,
      project8_students: p8,
      project9_name: p9Name,
      project9_students: p9,
      platforms: splitList(pick(25, "แพลตฟอร์มออนไลน์ที่ใช้งาน") || rowObj.platforms),
      learningProviders: splitList(pick(26, "แหล่งเรียนรู้/หน่วยจัดที่นำมาเทียบโอน") || rowObj.learningProviders),
      registrationStatus: String(pick(27, "สถานะการขึ้นทะเบียนธนาคารหน่วยกิต") || rowObj.registrationStatus || "-").trim(),
      mouStatus: String(pick(28, "การจัดทำเครือข่ายความร่วมมือ (MOU)") || rowObj.mouStatus || "-").trim(),
      personnelReadiness: String(pick(29, "ความพร้อมด้านบุคลากรและการจัดระบบ") || rowObj.personnelReadiness || "-").trim(),
      digitalTechReadiness: String(pick(30, "ความพร้อมด้านเทคโนโลยีดิจิทัล") || rowObj.digitalTechReadiness || "-").trim(),
      budgetFocus: splitList(pick(31, "การมุ่งเน้นนำงบประมาณไปใช้") || rowObj.budgetFocus),
      obstacles: splitList(pick(32, "ปัญหาและอุปสรรคสำคัญ") || rowObj.obstacles),
      obstaclesOther: String(pick(33, "ปัญหาและอุปสรรคอื่นๆ (ระบุ)") || rowObj.obstaclesOther || "-").trim()
    };
  }

  /**
   * บันทึก GAS_API_URL ลงในแผ่นงาน Settings ของ Google Sheet อัตโนมัติ
   * เพื่อให้เครื่องอื่นๆ หรือโรงเรียนที่เปิดเว็บผ่านอุปกรณ์อื่น ดึง URL ไปใช้งานได้ทันทีโดยไม่ต้องตั้งค่าเอง
   */
  async function publishGasUrlToSheetIfNeeded(localUrl, sheetSettings) {
    if (!localUrl || localUrl.indexOf("https://script.google.com") !== 0) return;
    if (isPublishingGasUrl) return;
    var existingInSheet = extractEmbeddedGasUrl(sheetSettings);
    if (existingInSheet === localUrl) return;

    isPublishingGasUrl = true;
    try {
      var pin = (sheetSettings && sheetSettings.adminPin) || window.APP_CONFIG.DEFAULT_ADMIN_PIN || "nan1credit2570";
      var baseTitle = cleanTitleText((sheetSettings && sheetSettings.title) || "ระบบสำรวจข้อมูลการดำเนินงานระบบธนาคารหน่วยกิต (Credit Bank) สพป.น่าน เขต 1");
      var payload = {
        action: "adminUpdateSettings",
        pin: String(pin).trim(),
        settings: {
          webAppUrl: localUrl,
          title: baseTitle + "||" + localUrl
        }
      };
      await fetch(localUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("Auto-publish GAS URL notice:", e);
    } finally {
      isPublishingGasUrl = false;
    }
  }

  /**
   * อัปโหลดคำตอบที่ค้างอยู่ในเบราว์เซอร์ (กรณีโรงเรียนกดส่งตอนที่ยังไม่ได้ซิงค์ GAS URL) ขึ้นสู่ Google Sheet อัตโนมัติ
   */
  async function syncPendingLocalSubmissionsToCloud(sheetSubmittedMap) {
    var apiUrl = getApiUrl();
    if (!apiUrl || apiUrl.indexOf("https://script.google.com") !== 0) return false;
    if (isSyncingPending) return false;

    var rawLocalSubs = [];
    try {
      rawLocalSubs = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
    } catch (e) {
      rawLocalSubs = [];
    }
    if (!Array.isArray(rawLocalSubs) || rawLocalSubs.length === 0) return false;

    var unsynced = rawLocalSubs.filter(function(item) {
      return item && item.schoolName && item._pendingCloudSync === true && !sheetSubmittedMap[item.schoolName];
    });

    if (unsynced.length === 0) return false;

    isSyncingPending = true;
    var uploadedAny = false;
    try {
      for (var i = 0; i < unsynced.length; i++) {
        var sub = unsynced[i];
        var postData = Object.assign({}, sub, { action: "submitSurvey" });
        var resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(postData)
        });
        var resJson = await resp.json();
        if (resJson && resJson.success) {
          sub._pendingCloudSync = false;
          sub._syncedToCloud = true;
          uploadedAny = true;
        }
      }
      if (uploadedAny) {
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(rawLocalSubs));
      }
    } catch (e) {
      console.warn("Pending local submission sync notice:", e);
    } finally {
      isSyncingPending = false;
    }
    return uploadedAny;
  }

  /**
   * ซิงค์ข้อมูลสดจาก Google Sheet (1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU) ทั้ง 3 แผ่นงาน:
   * Settings, Schools, และ Submissions
   */
  async function syncFromGoogleSheet() {
    try {
      var results = await Promise.all([
        fetchSheetGviz("Settings").catch(function() { return null; }),
        fetchSheetGviz("Schools").catch(function() { return null; }),
        fetchSheetGviz("Submissions").catch(function() { return null; })
      ]);

      var settingsTable = results[0];
      var schoolsTable = results[1];
      var submissionsTable = results[2];

      if (!settingsTable && !schoolsTable && !submissionsTable) {
        return false;
      }

      // 1. ประมวลผล Settings จาก Google Sheet
      var settingsMap = {
        isOpen: "TRUE",
        academicYear: "2570",
        adminPin: window.APP_CONFIG.DEFAULT_ADMIN_PIN || "nan1credit2570",
        areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
        totalTargetSchools: "34",
        title: "ระบบสำรวจข้อมูลการดำเนินงานระบบธนาคารหน่วยกิต (Credit Bank) สพป.น่าน เขต 1"
      };

      if (settingsTable && settingsTable.rows) {
        settingsTable.rows.forEach(function(r) {
          var k = String(r[0] || "").trim();
          var v = r[1];
          if (k) settingsMap[k] = v;
        });
      }
      cachedSheetSettings = settingsMap;

      // ซิงค์สถานะเปิด-ปิดระบบ และรหัสผ่าน Admin
      var isOpenBool = String(settingsMap.isOpen).toUpperCase() !== "FALSE";
      try {
        localStorage.setItem("cb_nan1_is_open", isOpenBool ? "true" : "false");
        if (settingsMap.adminPin) {
          localStorage.setItem("cb_nan1_admin_pin", String(settingsMap.adminPin).trim());
        }
      } catch (e) {}

      // ตรวจสอบและซิงค์ GAS_API_URL อัตโนมัติระหว่างเบราว์เซอร์และ Google Sheet
      var sheetGasUrl = extractEmbeddedGasUrl(settingsMap);
      var currentLocalGasUrl = getApiUrl();
      if (sheetGasUrl && !currentLocalGasUrl) {
        setApiUrlInternal(sheetGasUrl);
        currentLocalGasUrl = sheetGasUrl;
      } else if (currentLocalGasUrl && currentLocalGasUrl !== sheetGasUrl) {
        publishGasUrlToSheetIfNeeded(currentLocalGasUrl, settingsMap);
      }

      // 2. ประมวลผล Submissions จาก Google Sheet
      var parsedSubmissions = [];
      var latestSubBySchool = {};
      if (submissionsTable && submissionsTable.rows) {
        for (var i = 0; i < submissionsTable.rows.length; i++) {
          var norm = normalizeSubmissionRow(submissionsTable.rows[i], submissionsTable.objects[i]);
          if (norm.schoolName) {
            parsedSubmissions.push(norm);
            latestSubBySchool[norm.schoolName] = norm;
          }
        }
      }

      // 3. ประมวลผล Schools (34 โรงเรียน) จาก Google Sheet คู่กับ MASTER_SCHOOLS_DATA
      var cleanList = createCleanSchoolsList();
      var sheetSchoolMap = {};
      if (schoolsTable && schoolsTable.rows) {
        schoolsTable.rows.forEach(function(r) {
          var sName = String(r[1] || "").trim();
          if (sName) {
            sheetSchoolMap[sName] = {
              status: String(r[4] || "ยังไม่ส่งข้อมูล").trim(),
              isSubmitted: String(r[4] || "").trim() === "ส่งข้อมูลแล้ว",
              submittedAt: r[5] ? String(r[5]).trim() : "-",
              contactName: r[6] ? String(r[6]).trim() : "-",
              contactPhone: r[7] ? String(r[7]).replace(/^'/, "").trim() : "-",
              size: r[8] && r[8] !== "-" ? String(r[8]).trim() : "",
              totalStudents: Number(r[9]) || 0,
              creditStudents: Number(r[10]) || 0,
              refId: r[11] ? String(r[11]).trim() : "-"
            };
          }
        });
      }

      var sheetSubmittedNames = {};
      cleanList.forEach(function(sch) {
        var fromSheet = sheetSchoolMap[sch.name];
        var fromSub = latestSubBySchool[sch.name];

        if (fromSheet && fromSheet.isSubmitted) {
          sch.status = "ส่งข้อมูลแล้ว";
          sch.isSubmitted = true;
          sch.submittedAt = fromSheet.submittedAt || "-";
          sch.contactName = fromSheet.contactName || "-";
          sch.contactPhone = fromSheet.contactPhone || "-";
          sch.size = fromSheet.size || sch.size;
          sch.totalStudents = fromSheet.totalStudents || 0;
          sch.creditStudents = fromSheet.creditStudents || 0;
          sch.refId = fromSheet.refId || "-";
          sheetSubmittedNames[sch.name] = true;
        }

        // หากมีข้อมูลในแผ่นงาน Submissions ให้ถือว่าส่งข้อมูลแล้วเสมอ และใช้ค่าล่าสุดจาก Submissions
        if (fromSub) {
          sch.status = "ส่งข้อมูลแล้ว";
          sch.isSubmitted = true;
          sch.submittedAt = fromSub.submittedAt || sch.submittedAt || "-";
          sch.contactName = fromSub.respondentName || sch.contactName || "-";
          sch.contactPhone = fromSub.respondentPhone || sch.contactPhone || "-";
          sch.size = fromSub.schoolSize || sch.size;
          sch.totalStudents = fromSub.studentTotal || sch.totalStudents || 0;
          sch.creditStudents = fromSub.formatsTotal !== undefined ? fromSub.formatsTotal : sch.creditStudents;
          sch.refId = fromSub.refId || sch.refId || "-";
          sheetSubmittedNames[sch.name] = true;
        }
      });

      // 4. หากมีคำตอบที่เพิ่งกรอกในเครื่องนี้และรอการซิงค์ขึ้น Cloud ให้รวมแสดงผลและซิงค์ขึ้น Google Sheet ทันที
      var uploaded = await syncPendingLocalSubmissionsToCloud(sheetSubmittedNames);
      if (uploaded) {
        // ดึงข้อมูลใหม่หลังจากอัปโหลดสำเร็จ
        return await syncFromGoogleSheet();
      }

      // รวมคำตอบที่ยังรอซิงค์ในเครื่อง (ถ้ามี) เพื่อไม่ให้ข้อมูลในเครื่องที่เพิ่งกรอกหายไป
      try {
        var localSubs = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
        if (Array.isArray(localSubs)) {
          localSubs.forEach(function(lSub) {
            if (lSub && lSub.schoolName && lSub._pendingCloudSync === true && !latestSubBySchool[lSub.schoolName]) {
              var normLocal = normalizeSubmissionRow([], lSub);
              parsedSubmissions.push(normLocal);
              latestSubBySchool[lSub.schoolName] = normLocal;
              cleanList.forEach(function(sch) {
                if (sch.name === lSub.schoolName) {
                  sch.status = "ส่งข้อมูลแล้ว";
                  sch.isSubmitted = true;
                  sch.submittedAt = normLocal.submittedAt || "-";
                  sch.contactName = normLocal.respondentName || "-";
                  sch.contactPhone = normLocal.respondentPhone || "-";
                  sch.size = normLocal.schoolSize || sch.size;
                  sch.totalStudents = normLocal.studentTotal || 0;
                  sch.creditStudents = normLocal.formatsTotal || 0;
                  sch.refId = normLocal.refId || "-";
                }
              });
            }
          });
        }
      } catch (e) {}

      localSchools = cleanList;
      cachedSheetSubmissions = parsedSubmissions;
      saveLocalSchools();
      return true;
    } catch (err) {
      console.warn("Direct Google Sheet sync notice:", err);
      return false;
    }
  }

  // ซิงค์ข้อมูลจาก Google Sheet ทันทีที่เปิดหน้าเว็บ
  syncFromGoogleSheet();

  // เรียก API ไปยัง Google Apps Script พร้อมระบบดึงข้อมูลตรงจาก Google Sheet ID 1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU
  async function request(action, method, data, params) {
    // สำหรับคำขออ่านข้อมูล หรือตรวจสอบสิทธิ์ ให้ซิงค์ข้อมูลสดจาก Google Sheet เสมอ
    if (method === "GET" || action === "submitSurvey") {
      await syncFromGoogleSheet();
    }

    var url = getApiUrl();

    // หากมี URL ของ Google Apps Script ให้ส่งคำขอไปยัง GAS
    if (url && url.indexOf("https://script.google.com") === 0) {
      try {
        if (method === "GET") {
          var queryParams = new URLSearchParams(params || {});
          queryParams.set("action", action);
          queryParams.set("_t", String(Date.now()));
          var finalUrl = url + (url.indexOf("?") !== -1 ? "&" : "?") + queryParams.toString();
          var resp = await fetch(finalUrl, { method: "GET", mode: "cors", cache: "no-store" });
          var json = await resp.json();

          // สำหรับการดึงข้อมูลโรงเรียนและรายงาน Admin ให้ผสานกับข้อมูลสดที่อ่านตรงจาก Sheet 1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU เสมอ
          if (action === "adminGetFullData" && json && json.success) {
            var directData = calculateLocalAdminData();
            if (directData.submissionsCount >= (json.submissionsCount || 0)) {
              return directData;
            }
            if (Array.isArray(json.schools)) {
              var mMap = {};
              (window.MASTER_SCHOOLS_DATA || []).forEach(function(m) { mMap[m.name] = m; });
              json.schools = json.schools.map(function(s) {
                if (mMap[s.name]) {
                  s.district = mMap[s.name].district;
                  s.code = mMap[s.name].code;
                }
                return s;
              });
            }
            if (json.settings && json.settings.title) {
              json.settings.title = cleanTitleText(json.settings.title);
            }
            return json;
          }
          if (action === "getSchools" && json && json.success) {
            return { success: true, schools: localSchools };
          }
          if (action === "getConfig" && json && json.success) {
            json.title = cleanTitleText(json.title);
            return json;
          }
          return json;
        } else {
          // POST request (submitSurvey, adminResetSchool, adminResetAll, etc.)
          var postData = Object.assign({}, data || {}, { action: action });
          var postResp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(postData)
          });
          var postJson = await postResp.json();
          // ซิงค์ข้อมูลจาก Google Sheet ทันทีหลังบันทึกหรือแก้ไขสำเร็จ
          await syncFromGoogleSheet();
          return postJson;
        }
      } catch (err) {
        console.warn("GAS API request failed, using direct Google Sheet / local handler:", err);
        return handleLocalRequest(action, data, params);
      }
    }

    // กรณีเบราว์เซอร์ยังไม่มี GAS_API_URL ให้ใช้ข้อมูลสดที่ซิงค์ตรงจาก Google Sheet 1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU
    return handleLocalRequest(action, data, params);
  }

  // ตัวจัดการคำขอจากข้อมูลที่ซิงค์กับ Google Sheet (1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU)
  function handleLocalRequest(action, data, params) {
    switch (action) {
      case "getConfig":
        var submitted = localSchools.filter(function(s) { return s.isSubmitted; });
        var totalCredit = submitted.reduce(function(acc, c) { return acc + (Number(c.creditStudents) || 0); }, 0);
        var isOpen = cachedSheetSettings
          ? String(cachedSheetSettings.isOpen).toUpperCase() !== "FALSE"
          : localStorage.getItem("cb_nan1_is_open") !== "false";
        return Promise.resolve({
          success: true,
          isOpen: isOpen,
          academicYear: (cachedSheetSettings && cachedSheetSettings.academicYear) || "2570",
          title: cleanTitleText(cachedSheetSettings && cachedSheetSettings.title),
          areaOffice: (cachedSheetSettings && cachedSheetSettings.areaOffice) || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalSchools: 34,
          submittedCount: submitted.length,
          pendingCount: 34 - submitted.length,
          totalStudentsInCreditBank: totalCredit
        });

      case "getSchools":
        return Promise.resolve({
          success: true,
          schools: localSchools
        });

      case "getSchoolSubmission":
        var targetSchool = (params && params.schoolName) || (data && data.schoolName) || "";
        for (var sIdx = cachedSheetSubmissions.length - 1; sIdx >= 0; sIdx--) {
          if (cachedSheetSubmissions[sIdx].schoolName === targetSchool) {
            return Promise.resolve({
              success: true,
              data: cachedSheetSubmissions[sIdx]
            });
          }
        }
        return Promise.resolve({ success: false, message: "ไม่พบข้อมูลการส่งของโรงเรียนนี้" });

      case "getPublicStats":
        var subList = localSchools.filter(function(s) { return s.isSubmitted; });
        var pendList = localSchools.filter(function(s) { return !s.isSubmitted; });
        var totCred = subList.reduce(function(acc, c) { return acc + (Number(c.creditStudents) || 0); }, 0);
        return Promise.resolve({
          success: true,
          totalSchools: 34,
          submittedCount: subList.length,
          pendingCount: pendList.length,
          percentage: Math.round((subList.length / 34) * 100),
          totalStudents: totCred,
          schools: localSchools
        });

      case "submitSurvey":
        if (localStorage.getItem("cb_nan1_is_open") === "false") {
          return Promise.resolve({
            success: false,
            message: "ระบบสำรวจปิดรับการกรอกข้อมูลแล้ว กรุณาติดต่อผู้ดูแลระบบ สพป.น่าน เขต 1"
          });
        }

        var schoolName = data.schoolName;
        var fTot = (Number(data.format1_students) || 0) +
                   (Number(data.format2_students) || 0) +
                   (Number(data.format3_students) || 0) +
                   (Number(data.format4_students) || 0) +
                   (Number(data.format5_students) || 0);
        var pTot = (Number(data.project1_students) || 0) +
                   (Number(data.project2_students) || 0) +
                   (Number(data.project3_students) || 0) +
                   (Number(data.project4_students) || 0) +
                   (Number(data.project5_students) || 0) +
                   (Number(data.project6_students) || 0) +
                   (Number(data.project7_students) || 0) +
                   (Number(data.project8_students) || 0) +
                   (Number(data.project9_students) || 0);
        var effectiveCredit = fTot > 0 ? fTot : pTot;

        var now = new Date();
        var dateStr = now.toLocaleDateString("th-TH") + " " + now.toLocaleTimeString("th-TH");
        var ref = "CB70-" + now.getFullYear() + ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2) + "-" + Math.floor(100 + Math.random() * 900);

        for (var i = 0; i < localSchools.length; i++) {
          if (localSchools[i].name === schoolName) {
            localSchools[i].status = "ส่งข้อมูลแล้ว";
            localSchools[i].isSubmitted = true;
            localSchools[i].submittedAt = dateStr;
            localSchools[i].contactName = data.respondentName || "-";
            localSchools[i].contactPhone = data.respondentPhone || "-";
            localSchools[i].size = data.schoolSize || localSchools[i].size;
            localSchools[i].totalStudents = Number(data.studentTotal) || 0;
            localSchools[i].creditStudents = effectiveCredit;
            localSchools[i].refId = ref;
            break;
          }
        }
        saveLocalSchools();

        var savedSubmissions = [];
        try {
          savedSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
        } catch (e) {
          savedSubmissions = [];
        }
        var newRecord = Object.assign({}, data, {
          refId: ref,
          submittedAt: dateStr,
          formatsTotal: effectiveCredit,
          _pendingCloudSync: true
        });
        savedSubmissions.push(newRecord);
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(savedSubmissions));
        cachedSheetSubmissions.push(normalizeSubmissionRow([], newRecord));

        return Promise.resolve({
          success: true,
          message: "บันทึกข้อมูลเรียบร้อยแล้ว",
          referenceId: ref,
          schoolName: schoolName,
          submittedAt: dateStr,
          formatsTotal: effectiveCredit
        });

      case "adminLogin":
        var pin = (params && params.pin) || (data && data.pin);
        var expectedPin = (cachedSheetSettings && cachedSheetSettings.adminPin) ||
          localStorage.getItem("cb_nan1_admin_pin") ||
          window.APP_CONFIG.DEFAULT_ADMIN_PIN;
        if (pin && String(pin).trim() === String(expectedPin).trim()) {
          return Promise.resolve({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ",
            token: "admin_token_" + Date.now()
          });
        }
        return Promise.resolve({ success: false, message: "รหัส PIN ไม่ถูกต้อง" });

      case "adminGetFullData":
        return Promise.resolve(calculateLocalAdminData());

      case "adminToggleSurvey":
        var targetState = (params && params.state === "open") || (data && (data.state === "open" || data.state === true));
        localStorage.setItem("cb_nan1_is_open", targetState ? "true" : "false");
        if (cachedSheetSettings) cachedSheetSettings.isOpen = targetState ? "TRUE" : "FALSE";
        return Promise.resolve({
          success: true,
          isOpen: targetState,
          message: targetState ? "เปิดรับแบบสำรวจเรียบร้อยแล้ว" : "ปิดรับแบบสำรวจเรียบร้อยแล้ว"
        });

      case "adminResetSchool":
        var sName = data && data.schoolName;
        for (var j = 0; j < localSchools.length; j++) {
          if (localSchools[j].name === sName) {
            localSchools[j].status = "ยังไม่ส่งข้อมูล";
            localSchools[j].isSubmitted = false;
            localSchools[j].submittedAt = "-";
            localSchools[j].contactName = "-";
            localSchools[j].contactPhone = "-";
            localSchools[j].totalStudents = 0;
            localSchools[j].creditStudents = 0;
            localSchools[j].refId = "-";
            break;
          }
        }
        saveLocalSchools();

        var currentSubs = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
        var filteredSubs = currentSubs.filter(function(sub) { return sub.schoolName !== sName; });
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(filteredSubs));
        cachedSheetSubmissions = cachedSheetSubmissions.filter(function(sub) { return sub.schoolName !== sName; });

        return Promise.resolve({ success: true, message: "รีเซ็ตข้อมูลโรงเรียน " + sName + " สำเร็จ" });

      case "adminResetAll":
        localSchools = createCleanSchoolsList();
        cachedSheetSubmissions = [];
        saveLocalSchools();
        localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
        localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.DRAFT_SURVEY);
        localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.SUBMITTED_RECEIPT);
        return Promise.resolve({
          success: true,
          message: "ล้างข้อมูลการส่งทั้งหมดเรียบร้อยแล้ว ระบบพร้อมเริ่มต้นใช้งานจริง"
        });

      default:
        return Promise.resolve({ success: false, message: "Action not handled: " + action });
    }
  }

  // คำนวณข้อมูลสถิติ Admin และรายงาน สพฐ. จากข้อมูลใน Google Sheet (1OX7wLdznfnRAvR0XkIoKXS7lD8TlWMMsE95thnsuIrU)
  function calculateLocalAdminData() {
    var subList = localSchools.filter(function(s) { return s.isSubmitted; });
    var submittedNamesMap = {};
    subList.forEach(function(s) { submittedNamesMap[s.name] = true; });

    var totCredit = subList.reduce(function(acc, c) { return acc + (Number(c.creditStudents) || 0); }, 0);
    var totSchoolStudents = subList.reduce(function(acc, c) { return acc + (Number(c.totalStudents) || 0); }, 0);
    var subCount = subList.length;

    // ผสานคำตอบจาก Google Sheet Submissions และในเครื่อง
    var allSubmissions = cachedSheetSubmissions.slice();
    try {
      var rawLocal = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
      if (Array.isArray(rawLocal)) {
        rawLocal.forEach(function(r) {
          if (r && r.schoolName && r._pendingCloudSync === true) {
            allSubmissions.push(normalizeSubmissionRow([], r));
          }
        });
      }
    } catch (e) {}

    var latestSubmissions = {};
    for (var i = 0; i < allSubmissions.length; i++) {
      var sub = allSubmissions[i];
      if (sub && sub.schoolName && submittedNamesMap[sub.schoolName]) {
        latestSubmissions[sub.schoolName] = sub;
      }
    }

    var formats = [
      { id: 1, name: "แบบในระบบการศึกษา", schoolsCount: 0, studentsCount: 0 },
      { id: 2, name: "แบบไร้ห้องเรียน", schoolsCount: 0, studentsCount: 0 },
      { id: 3, name: "แบบหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", schoolsCount: 0, studentsCount: 0 },
      { id: 4, name: "แบบเรียนล่วงหน้า/คู่ขนาน (Pre-degree)", schoolsCount: 0, studentsCount: 0 },
      { id: 5, name: "แบบประสบการณ์", schoolsCount: 0, studentsCount: 0 }
    ];

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

    function matchAndIncrement(statsObj, valueStr) {
      if (!valueStr || valueStr === "-") return;
      if (statsObj[valueStr] !== undefined) {
        statsObj[valueStr]++;
        return;
      }
      var keys = Object.keys(statsObj);
      for (var m = 0; m < keys.length; m++) {
        var prefix = keys[m].substring(0, 15);
        if (String(valueStr).indexOf(prefix) !== -1) {
          statsObj[keys[m]]++;
          return;
        }
      }
    }

    var schoolKeys = Object.keys(latestSubmissions);
    for (var k = 0; k < schoolKeys.length; k++) {
      var row = latestSubmissions[schoolKeys[k]];

      // 5 รูปแบบ
      for (var f = 0; f < 5; f++) {
        var fStd = Number(row["format" + (f + 1) + "_students"]) || 0;
        if (fStd > 0) {
          formats[f].schoolsCount++;
          formats[f].studentsCount += fStd;
        }
      }

      // โครงการ 1-8
      for (var p = 0; p < 8; p++) {
        var pStd = Number(row["project" + (p + 1) + "_students"]) || 0;
        if (pStd > 0) {
          projects[p].schoolsCount++;
          projects[p].studentsCount += pStd;
        }
      }

      // โครงการ 9 อื่นๆ
      var p9Std = Number(row.project9_students) || 0;
      var p9Name = String(row.project9_name || "").trim();
      if (p9Std > 0 || (p9Name && p9Name !== "-")) {
        projects[8].schoolsCount++;
        projects[8].studentsCount += p9Std;
        if (p9Name && p9Name !== "-") {
          projects[8].details.push(p9Name + " (" + p9Std + " คน)");
        }
      }

      // ส่วนที่ 4: แพลตฟอร์ม & แหล่งเรียนรู้
      var plats = Array.isArray(row.platforms) ? row.platforms : [];
      plats.forEach(function(pl) { matchAndIncrement(platformsStats, pl); });

      var provs = Array.isArray(row.learningProviders) ? row.learningProviders : [];
      provs.forEach(function(pr) { matchAndIncrement(providersStats, pr); });

      // ส่วนที่ 5: ความพร้อม
      matchAndIncrement(regStats, row.registrationStatus);
      matchAndIncrement(mouStats, row.mouStatus);
      matchAndIncrement(personnelStats, row.personnelReadiness);
      matchAndIncrement(digitalStats, row.digitalTechReadiness);

      // ส่วนที่ 6: งบประมาณ & อุปสรรค
      var bgs = Array.isArray(row.budgetFocus) ? row.budgetFocus : [];
      bgs.forEach(function(b) { matchAndIncrement(budgetStats, b); });

      var obs = Array.isArray(row.obstacles) ? row.obstacles : [];
      obs.forEach(function(o) { matchAndIncrement(obstacleStats, o); });
    }

    var isOpenState = cachedSheetSettings
      ? String(cachedSheetSettings.isOpen).toUpperCase() !== "FALSE"
      : localStorage.getItem("cb_nan1_is_open") !== "false";

    return {
      success: true,
      settings: {
        isOpen: isOpenState,
        academicYear: (cachedSheetSettings && cachedSheetSettings.academicYear) || "2570",
        title: cleanTitleText(cachedSheetSettings && cachedSheetSettings.title),
        areaOffice: (cachedSheetSettings && cachedSheetSettings.areaOffice) || "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1"
      },
      schools: localSchools,
      submissions: latestSubmissions,
      submissionsCount: subCount,
      obecSummary: {
        part1_general: {
          areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalTargetSchools: 34,
          totalSchoolsInArea: 149,
          participatingSchoolsCount: subCount,
          totalStudentsInCreditBank: totCredit,
          totalStudentsInSchools: totSchoolStudents
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
      }
    };
  }

  return {
    isLiveConnected: isLiveConnected,
    getApiUrl: getApiUrl,
    setApiUrl: function(url) {
      if (url) {
        var clean = url.trim();
        setApiUrlInternal(clean);
        publishGasUrlToSheetIfNeeded(clean, cachedSheetSettings);
        syncFromGoogleSheet();
      } else {
        localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL);
      }
    },
    syncFromGoogleSheet: syncFromGoogleSheet,
    getConfig: function() { return request("getConfig", "GET"); },
    getSchools: function() { return request("getSchools", "GET"); },
    getSchoolSubmission: function(schoolName) { return request("getSchoolSubmission", "GET", null, { schoolName: schoolName }); },
    getPublicStats: function() { return request("getPublicStats", "GET"); },
    submitSurvey: function(formData) { return request("submitSurvey", "POST", formData); },
    adminLogin: function(pin) { return request("adminLogin", "GET", null, { pin: pin }); },
    adminGetFullData: function(pin) { return request("adminGetFullData", "GET", null, { pin: pin }); },
    adminToggleSurvey: function(state, pin) { return request("adminToggleSurvey", "GET", null, { state: state ? "open" : "closed", pin: pin }); },
    adminResetSchool: function(schoolName, pin) { return request("adminResetSchool", "POST", { schoolName: schoolName, pin: pin }); },
    adminResetAll: function(pin) { return request("adminResetAll", "POST", { pin: pin }); }
  };
})();
