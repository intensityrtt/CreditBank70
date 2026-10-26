/**
 * API Service สำหรับติดต่อกับ Google Apps Script Server
 * รองรับทั้งการเชื่อมต่อเซิร์ฟเวอร์ Google Apps Script และระบบจัดเก็บข้อมูลจริงในเครื่อง
 */
window.ApiService = (function() {
  var SCHOOLS_STORAGE_KEY = "cb_nan1_schools_prod_v1";
  var SUBMISSIONS_STORAGE_KEY = "cb_nan1_submissions_prod_v1";
  var CLEANUP_FLAG_KEY = "cb_nan1_mock_purged_v1";

  var localSchools = [];

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
          // ซิงค์ชื่ออำเภอและรหัสกับ MASTER_SCHOOLS_DATA เสมอ
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

  // ตรวจสอบสถานะการเชื่อมต่อ
  function getApiUrl() {
    return localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL) || window.APP_CONFIG.GAS_API_URL || "";
  }

  function isLiveConnected() {
    var url = getApiUrl();
    return Boolean(url && url.startsWith("https://script.google.com"));
  }

  // เรียก API ไปยัง Google Apps Script
  async function request(action, method, data, params) {
    var url = getApiUrl();
    
    // หากยังไม่ได้ตั้งค่า URL ของ Google Apps Script ให้ใช้ระบบจัดเก็บข้อมูลจริงในเครื่อง
    if (!url || !url.startsWith("https://script.google.com")) {
      return handleLocalRequest(action, data, params);
    }

    try {
      if (method === "GET") {
        var queryParams = new URLSearchParams(params || {});
        queryParams.set("action", action);
        var finalUrl = url + (url.includes("?") ? "&" : "?") + queryParams.toString();
        var resp = await fetch(finalUrl, { method: "GET", mode: "cors" });
        return await resp.json();
      } else {
        // POST request
        var postData = Object.assign({ credentials: 'omit' }, data || {}, { credentials: 'omit', action: action });
        // ใช้ text/plain เพื่อเลี่ยง preflight CORS issue ใน Google Apps Script
        var postResp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(postData)
        });
        return await postResp.json();
      }
    } catch (err) {
      console.warn("API request failed, fallback to local storage handler:", err);
      return handleLocalRequest(action, data, params);
    }
  }

  // ตัวจัดการคำขอข้อมูลจากฐานข้อมูลในเครื่อง (ไม่มีข้อมูลจำลอง เริ่มต้นที่ 0 ทั้งหมด)
  function handleLocalRequest(action, data, params) {
    switch (action) {
      case "getConfig":
        var submitted = localSchools.filter(function(s) { return s.isSubmitted; });
        var totalCredit = submitted.reduce(function(acc, c) { return acc + (Number(c.creditStudents) || 0); }, 0);
        return Promise.resolve({
          success: true,
          isOpen: localStorage.getItem("cb_nan1_is_open") !== "false",
          academicYear: "2570",
          title: "ระบบสำรวจข้อมูล Credit Bank สพป.น่าน เขต 1",
          areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
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

        var now = new Date();
        var dateStr = now.toLocaleDateString("th-TH") + " " + now.toLocaleTimeString("th-TH");
        var ref = "CB70-" + now.getFullYear() + ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2) + "-" + Math.floor(100 + Math.random() * 900);

        // อัปเดตสถานะโรงเรียนที่ส่งข้อมูลจริง
        for (var i = 0; i < localSchools.length; i++) {
          if (localSchools[i].name === schoolName) {
            localSchools[i].status = "ส่งข้อมูลแล้ว";
            localSchools[i].isSubmitted = true;
            localSchools[i].submittedAt = dateStr;
            localSchools[i].contactName = data.respondentName || "-";
            localSchools[i].contactPhone = data.respondentPhone || "-";
            localSchools[i].size = data.schoolSize || localSchools[i].size;
            localSchools[i].totalStudents = Number(data.studentTotal) || 0;
            localSchools[i].creditStudents = fTot;
            localSchools[i].refId = ref;
            break;
          }
        }
        saveLocalSchools();

        // บันทึกคำตอบจริงลงในรายการส่งข้อมูล
        var savedSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
        savedSubmissions.push(Object.assign({}, data, { refId: ref, submittedAt: dateStr, formatsTotal: fTot }));
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(savedSubmissions));

        return Promise.resolve({
          success: true,
          message: "บันทึกข้อมูลเรียบร้อยแล้ว",
          referenceId: ref,
          schoolName: schoolName,
          submittedAt: dateStr,
          formatsTotal: fTot
        });

      case "adminLogin":
        var pin = (params && params.pin) || (data && data.pin);
        var expectedPin = localStorage.getItem("cb_nan1_admin_pin") || window.APP_CONFIG.DEFAULT_ADMIN_PIN;
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

        // ลบรายการส่งของโรงเรียนนี้ออกจากคลังคำตอบด้วย
        var currentSubs = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
        var filteredSubs = currentSubs.filter(function(sub) { return sub.schoolName !== sName; });
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(filteredSubs));

        return Promise.resolve({ success: true, message: "รีเซ็ตข้อมูลโรงเรียน " + sName + " สำเร็จ" });

      case "adminResetAll":
        localSchools = createCleanSchoolsList();
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

  // คำนวณข้อมูลสถิติ Admin และรายงาน สพฐ. จากข้อมูลการส่งจริงเท่านั้น (ไม่มีการสุ่มหรือจำลองตัวเลข)
  function calculateLocalAdminData() {
    var subList = localSchools.filter(function(s) { return s.isSubmitted; });
    var submittedNamesMap = {};
    subList.forEach(function(s) { submittedNamesMap[s.name] = true; });

    var totCredit = subList.reduce(function(acc, c) { return acc + (Number(c.creditStudents) || 0); }, 0);
    var subCount = subList.length;

    var rawSubmissions = [];
    try {
      rawSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || "[]");
    } catch (e) {
      rawSubmissions = [];
    }

    // คัดเฉพาะคำตอบล่าสุดของโรงเรียนที่มีสถานะส่งข้อมูลแล้ว
    var latestSubmissions = {};
    for (var i = 0; i < rawSubmissions.length; i++) {
      var sub = rawSubmissions[i];
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

      // ส่วนที่ 4: แพลตฟอร์ม
      var plats = Array.isArray(row.platforms) ? row.platforms : [];
      plats.forEach(function(pl) {
        if (platformsStats[pl] !== undefined) platformsStats[pl]++;
      });

      // ส่วนที่ 4: แหล่งเรียนรู้
      var provs = Array.isArray(row.learningProviders) ? row.learningProviders : [];
      provs.forEach(function(pr) {
        if (providersStats[pr] !== undefined) providersStats[pr]++;
      });

      // ส่วนที่ 5: ความพร้อม
      if (row.registrationStatus && regStats[row.registrationStatus] !== undefined) {
        regStats[row.registrationStatus]++;
      }
      if (row.mouStatus && mouStats[row.mouStatus] !== undefined) {
        mouStats[row.mouStatus]++;
      }
      if (row.personnelReadiness && personnelStats[row.personnelReadiness] !== undefined) {
        personnelStats[row.personnelReadiness]++;
      }
      if (row.digitalTechReadiness && digitalStats[row.digitalTechReadiness] !== undefined) {
        digitalStats[row.digitalTechReadiness]++;
      }

      // ส่วนที่ 6: งบประมาณ & อุปสรรค
      var bgs = Array.isArray(row.budgetFocus) ? row.budgetFocus : [];
      bgs.forEach(function(b) {
        if (budgetStats[b] !== undefined) budgetStats[b]++;
      });

      var obs = Array.isArray(row.obstacles) ? row.obstacles : [];
      obs.forEach(function(o) {
        if (obstacleStats[o] !== undefined) obstacleStats[o]++;
      });
    }

    return {
      success: true,
      settings: {
        isOpen: localStorage.getItem("cb_nan1_is_open") !== "false",
        academicYear: "2570",
        title: "ระบบสำรวจ Credit Bank สพป.น่าน เขต 1",
        areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1"
      },
      schools: localSchools,
      submissionsCount: subCount,
      obecSummary: {
        part1_general: {
          areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalTargetSchools: 34,
          totalSchoolsInArea: 149,
          participatingSchoolsCount: subCount,
          totalStudentsInCreditBank: totCredit
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
        localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL, url.trim());
      } else {
        localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL);
      }
    },
    getConfig: function() { return request("getConfig", "GET"); },
    getSchools: function() { return request("getSchools", "GET"); },
    getPublicStats: function() { return request("getPublicStats", "GET"); },
    submitSurvey: function(formData) { return request("submitSurvey", "POST", formData); },
    adminLogin: function(pin) { return request("adminLogin", "GET", null, { pin: pin }); },
    adminGetFullData: function(pin) { return request("adminGetFullData", "GET", null, { pin: pin }); },
    adminToggleSurvey: function(state, pin) { return request("adminToggleSurvey", "GET", null, { state: state ? "open" : "closed", pin: pin }); },
    adminResetSchool: function(schoolName, pin) { return request("adminResetSchool", "POST", { schoolName: schoolName, pin: pin }); },
    adminResetAll: function(pin) { return request("adminResetAll", "POST", { pin: pin }); }
  };
})();
