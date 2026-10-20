/**
 * API Service สำหรับติดต่อกับ Google Apps Script Server
 * รองรับทั้งการเชื่อมต่อจริง (Live Mode) และจำลองข้อมูล (Demo/Offline Mode)
 */
window.ApiService = (function() {
  var isDemoMode = false;
  var demoSchools = [];

  // เริ่มต้น Mock Data สำหรับ Demo Mode
  function initDemoData() {
    var savedSchools = localStorage.getItem("cb_nan1_mock_schools");
    if (savedSchools) {
      try {
        demoSchools = JSON.parse(savedSchools);
        return;
      } catch (e) {}
    }

    // สร้างข้อมูลตั้งต้น 34 โรงเรียน โดยสุ่มส่งแล้วบางส่วนให้เห็นตัวอย่างรายงาน
    var master = window.MASTER_SCHOOLS_DATA || [];
    demoSchools = master.map(function(s, index) {
      var isSub = index < 8; // ให้ 8 โรงเรียนแรกมีข้อมูลส่งแล้วเป็นตัวอย่าง
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        district: s.district,
        status: isSub ? "ส่งข้อมูลแล้ว" : "ยังไม่ส่งข้อมูล",
        isSubmitted: isSub,
        submittedAt: isSub ? "20/10/2569 09:30:" + (10 + index) : "-",
        contactName: isSub ? "ครูผู้รับผิดชอบ " + s.name.replace("โรงเรียน", "") : "-",
        contactPhone: isSub ? "081-234-56" + (10 + index) : "-",
        size: s.defaultSize,
        totalStudents: isSub ? 150 + (index * 20) : 0,
        creditStudents: isSub ? 25 + (index * 5) : 0,
        refId: isSub ? "CB70-20261020-00" + (index + 1) : "-"
      };
    });
    saveDemoSchools();
  }

  function saveDemoSchools() {
    localStorage.setItem("cb_nan1_mock_schools", JSON.stringify(demoSchools));
  }

  initDemoData();

  // ตรวจสอบสถานะการเชื่อมต่อ
  function getApiUrl() {
    return localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.GAS_URL) || window.APP_CONFIG.GAS_API_URL || "";
  }

  function isLiveConnected() {
    var url = getApiUrl();
    return url && url.startsWith("https://script.google.com");
  }

  // เรียก API ไปยัง Google Apps Script
  async function request(action, method, data, params) {
    var url = getApiUrl();
    
    // หากไม่มี URL หรือเกิดข้อผิดพลาด ให้ทำงานใน Demo Mode
    if (!url || !url.startsWith("https://script.google.com")) {
      return handleMockRequest(action, data, params);
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
      console.warn("API request failed, fallback to local handler:", err);
      return handleMockRequest(action, data, params);
    }
  }

  // ตัวจัดการ Mock Request สำหรับทดสอบ
  function handleMockRequest(action, data, params) {
    switch (action) {
      case "getConfig":
        var submitted = demoSchools.filter(function(s) { return s.isSubmitted; });
        var totalCredit = submitted.reduce(function(acc, c) { return acc + c.creditStudents; }, 0);
        return Promise.resolve({
          success: true,
          isOpen: localStorage.getItem("cb_nan1_is_open") !== "false",
          academicYear: "2570",
          title: "ระบบสำรวจข้อมูล Credit Bank สพป.น่าน เขต 1",
          areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalSchools: 34,
          submittedCount: submitted.length,
          pendingCount: 34 - submitted.length,
          totalStudentsInCreditBank: totalCredit,
          isMock: true
        });

      case "getSchools":
        return Promise.resolve({
          success: true,
          schools: demoSchools,
          isMock: true
        });

      case "getPublicStats":
        var subList = demoSchools.filter(function(s) { return s.isSubmitted; });
        var pendList = demoSchools.filter(function(s) { return !s.isSubmitted; });
        var totCred = subList.reduce(function(acc, c) { return acc + c.creditStudents; }, 0);
        return Promise.resolve({
          success: true,
          totalSchools: 34,
          submittedCount: subList.length,
          pendingCount: pendList.length,
          percentage: Math.round((subList.length / 34) * 100),
          totalStudents: totCred,
          schools: demoSchools,
          isMock: true
        });

      case "submitSurvey":
        var schoolName = data.schoolName;
        var fTot = (Number(data.format1_students) || 0) +
                   (Number(data.format2_students) || 0) +
                   (Number(data.format3_students) || 0) +
                   (Number(data.format4_students) || 0) +
                   (Number(data.format5_students) || 0);

        var now = new Date();
        var dateStr = now.toLocaleDateString("th-TH") + " " + now.toLocaleTimeString("th-TH");
        var ref = "CB70-" + now.getFullYear() + ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2) + "-" + Math.floor(100 + Math.random() * 900);

        // อัปเดตใน demoSchools
        for (var i = 0; i < demoSchools.length; i++) {
          if (demoSchools[i].name === schoolName) {
            demoSchools[i].status = "ส่งข้อมูลแล้ว";
            demoSchools[i].isSubmitted = true;
            demoSchools[i].submittedAt = dateStr;
            demoSchools[i].contactName = data.respondentName || "-";
            demoSchools[i].contactPhone = data.respondentPhone || "-";
            demoSchools[i].size = data.schoolSize || demoSchools[i].size;
            demoSchools[i].totalStudents = Number(data.studentTotal) || 0;
            demoSchools[i].creditStudents = fTot;
            demoSchools[i].refId = ref;
            break;
          }
        }
        saveDemoSchools();

        // บันทึกคำตอบเต็มลงใน mock submissions
        var savedSubmissions = JSON.parse(localStorage.getItem("cb_nan1_mock_submissions") || "[]");
        savedSubmissions.push(Object.assign({}, data, { refId: ref, submittedAt: dateStr, formatsTotal: fTot }));
        localStorage.setItem("cb_nan1_mock_submissions", JSON.stringify(savedSubmissions));

        return Promise.resolve({
          success: true,
          message: "บันทึกข้อมูลเรียบร้อยแล้ว",
          referenceId: ref,
          schoolName: schoolName,
          submittedAt: dateStr,
          formatsTotal: fTot,
          isMock: true
        });

      case "adminLogin":
        var pin = (params && params.pin) || (data && data.pin);
        var expectedPin = localStorage.getItem("cb_nan1_admin_pin") || window.APP_CONFIG.DEFAULT_ADMIN_PIN;
        if (pin && String(pin).trim() === String(expectedPin).trim()) {
          return Promise.resolve({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ",
            token: "mock_token_" + Date.now(),
            isMock: true
          });
        }
        return Promise.resolve({ success: false, message: "รหัส PIN ไม่ถูกต้อง", isMock: true });

      case "adminGetFullData":
        return Promise.resolve(generateMockAdminData());

      case "adminToggleSurvey":
        var targetState = (params && params.state === "open") || (data && (data.state === "open" || data.state === true));
        localStorage.setItem("cb_nan1_is_open", targetState ? "true" : "false");
        return Promise.resolve({
          success: true,
          isOpen: targetState,
          message: targetState ? "เปิดรับแบบสำรวจเรียบร้อยแล้ว" : "ปิดรับแบบสำรวจเรียบร้อยแล้ว",
          isMock: true
        });

      case "adminResetSchool":
        var sName = data && data.schoolName;
        for (var j = 0; j < demoSchools.length; j++) {
          if (demoSchools[j].name === sName) {
            demoSchools[j].status = "ยังไม่ส่งข้อมูล";
            demoSchools[j].isSubmitted = false;
            demoSchools[j].submittedAt = "-";
            demoSchools[j].creditStudents = 0;
            break;
          }
        }
        saveDemoSchools();
        return Promise.resolve({ success: true, message: "รีเซ็ตข้อมูลโรงเรียนสำเร็จ", isMock: true });

      default:
        return Promise.resolve({ success: false, message: "Mock action not handled: " + action });
    }
  }

  // สร้างข้อมูล Admin Mock ที่ครบถ้วนตรงกับ สพฐ.
  function generateMockAdminData() {
    var subList = demoSchools.filter(function(s) { return s.isSubmitted; });
    var totCredit = subList.reduce(function(acc, c) { return acc + c.creditStudents; }, 0);
    var subCount = subList.length;

    return {
      success: true,
      settings: {
        isOpen: localStorage.getItem("cb_nan1_is_open") !== "false",
        academicYear: "2570",
        title: "ระบบสำรวจ Credit Bank สพป.น่าน เขต 1",
        areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1"
      },
      schools: demoSchools,
      submissionsCount: subCount,
      obecSummary: {
        part1_general: {
          areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
          totalTargetSchools: 34,
          totalSchoolsInArea: 149,
          participatingSchoolsCount: subCount,
          totalStudentsInCreditBank: totCredit
        },
        part2_formats: [
          { id: 1, name: "แบบในระบบการศึกษา", schoolsCount: Math.min(subCount, 7), studentsCount: Math.round(totCredit * 0.35) },
          { id: 2, name: "แบบไร้ห้องเรียน", schoolsCount: Math.min(subCount, 4), studentsCount: Math.round(totCredit * 0.18) },
          { id: 3, name: "แบบหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", schoolsCount: Math.min(subCount, 5), studentsCount: Math.round(totCredit * 0.22) },
          { id: 4, name: "แบบเรียนล่วงหน้า/คู่ขนาน (Pre-degree)", schoolsCount: Math.min(subCount, 3), studentsCount: Math.round(totCredit * 0.15) },
          { id: 5, name: "แบบประสบการณ์", schoolsCount: Math.min(subCount, 3), studentsCount: Math.round(totCredit * 0.10) }
        ],
        part3_projects: [
          { id: 1, name: "โครงการ 1 โรงเรียน 3 รูปแบบการศึกษา", schoolsCount: Math.min(subCount, 6), studentsCount: Math.round(totCredit * 0.25) },
          { id: 2, name: "โครงการทวิศึกษา", schoolsCount: Math.min(subCount, 4), studentsCount: Math.round(totCredit * 0.20) },
          { id: 3, name: "โครงการการพัฒนาหลักสูตรต่อเนื่องเชื่อมโยง (CLC)", schoolsCount: Math.min(subCount, 5), studentsCount: Math.round(totCredit * 0.18) },
          { id: 4, name: "โครงการพัฒนาหลักสูตรตามมาตรฐานอาชีพ และ NQF", schoolsCount: Math.min(subCount, 3), studentsCount: Math.round(totCredit * 0.12) },
          { id: 5, name: "โครงการหลักสูตรสถานศึกษาฐานสมรรถนะในพื้นที่นวัตกรรมการศึกษา (Sandbox)", schoolsCount: Math.min(subCount, 2), studentsCount: Math.round(totCredit * 0.08) },
          { id: 6, name: "โครงการคลังรายวิชาและสมรรถนะย่อย (Micro-credentials)", schoolsCount: Math.min(subCount, 4), studentsCount: Math.round(totCredit * 0.10) },
          { id: 7, name: "โครงการเรียนรู้จากใบประกาศ (Skill Certificate) และผลทดสอบมาตรฐาน", schoolsCount: Math.min(subCount, 4), studentsCount: Math.round(totCredit * 0.14) },
          { id: 8, name: "โครงการส่งเสริมผู้เรียนเรียนล่วงหน้าในหลักสูตรที่สูงขึ้น (Pre-degree)", schoolsCount: Math.min(subCount, 3), studentsCount: Math.round(totCredit * 0.10) },
          { id: 9, name: "อื่น ๆ (ระบุ)", schoolsCount: 1, studentsCount: 12, details: ["โครงการห้องเรียนอาชีพท้องถิ่น (12 คน)"] }
        ],
        part4_platforms: {
          "แพลตฟอร์มระดับชาติ (เช่น ระบบ NDLP, แพลตฟอร์มของ สพฐ., Thai MOOC เป็นต้น)": Math.min(subCount, 6),
          "แพลตฟอร์มของสถาบันอุดมศึกษา/อาชีวศึกษา ที่ทำ MOU ร่วมกัน": Math.min(subCount, 4),
          "แพลตฟอร์มระดับสากลหรือเอกชน (เช่น Coursera, Google Classroom, Microsoft Teams)": Math.min(subCount, 5),
          "แพลตฟอร์มหรือ Learning Management System LMS ที่สถานศึกษาพัฒนาขึ้นเอง": Math.min(subCount, 2),
          "ยังไม่มีแพลตฟอร์มรองรับที่ชัดเจน": Math.max(0, subCount - 6)
        },
        part4_providers: {
          "ศูนย์ฝึกอาชีพ / สถาบันพัฒนาฝีมือแรงงาน": Math.min(subCount, 5),
          "สถานประกอบการ / ภาคธุรกิจในพื้นที่": Math.min(subCount, 4),
          "ศูนย์การเรียนรู้ชุมชน / ปราชญ์ชาวบ้าน / แหล่งเรียนรู้ท้องถิ่น": Math.min(subCount, 6),
          "สถาบันภาษา / ศูนย์ทดสอบมาตรฐานสากล": Math.min(subCount, 2),
          "สถานศึกษาจัดการประเมินและรับรองด้วยตนเองทั้งหมด": Math.min(subCount, 4)
        },
        part5_registration: {
          "ได้รับการอนุมัติและประกาศขึ้นทะเบียนธนาคารหน่วยกิตจาก ศธจ. เรียบร้อยแล้ว": Math.min(subCount, 2),
          "สพท. ตรวจสอบ และเสนอขออนุมัติต่อสำนักงานศึกษาธิการจังหวัด (ศธจ.) แล้ว": Math.min(subCount, 2),
          "สถานศึกษาที่ดำเนินการระบบธนาคารหน่วยกิตฯ โดยอยู่ในกำกับของ สพท. แล้ว": Math.min(subCount, 2),
          "จัดทำข้อมูลความพร้อม (OCB-01) และยื่นคำร้อง (OCB-02) ต่อ สพท. แล้ว": Math.min(subCount, 1),
          "สถานศึกษาเป็นผู้ดำเนินการด้วยตนเอง โดยความร่วมมือ MOU กับหน่วยงานต่าง ๆ": 1,
          "ยังไม่ได้เริ่มดำเนินการ / อยู่ระหว่างเตรียมการ": Math.max(0, subCount - 8)
        },
        part5_mou: {
          "มีการทำ MOU ร่วมกับสถาบันอื่น พร้อมจัดทำตารางเทียบเคียงรายวิชา/สมรรถนะแล้ว": Math.min(subCount, 3),
          "มีการทำ MOU ร่วมกับสถาบันอื่น แต่ยังไม่มีตารางเทียบเคียงรายวิชา/สมรรถนะที่ชัดเจน": Math.min(subCount, 3),
          "อยู่ระหว่างการเจรจาหรือเตรียมการ": Math.min(subCount, 2),
          "ยังไม่มีการดำเนินการ": Math.max(0, subCount - 8)
        },
        part5_personnel: {
          "มีคณะกรรมการดำเนินงาน ครูและบุคลากรมีความเข้าใจระเบียบและเกณฑ์การเทียบโอนเป็นอย่างดี": Math.min(subCount, 3),
          "มีผู้รับผิดชอบ แต่ยังต้องการการอบรม (Workshop) เพื่อสร้างความเข้าใจและจัดทำเครื่องมือประเมิน": Math.max(0, subCount - 3)
        },
        part5_digital: {
          "มีระบบฐานข้อมูลที่เสถียรและสามารถเชื่อมโยงกับหน่วยงานอื่นได้": Math.min(subCount, 2),
          "มีระบบบันทึกผลภายใน แต่ยังต้องการงบประมาณสนับสนุนด้านเทคโนโลยีและอุปกรณ์เพิ่มเติม": Math.min(subCount, 5),
          "ยังใช้ระบบกระดาษ (Manual) ขาดความพร้อมด้านโครงสร้างพื้นฐานดิจิทัลอย่างเร่งด่วน": Math.max(0, subCount - 7)
        },
        part6_budget: {
          "การพัฒนาหลักสูตร การเทียบสมรรถนะ และจัดทำตารางเทียบเคียงรายวิชา": Math.min(subCount, 7),
          "การพัฒนาเครื่องมือประเมินผลตามสภาพจริง (Authentic Assessment / Rubric)": Math.min(subCount, 5),
          "การจัดอบรมเชิงปฏิบัติการเพื่อพัฒนาทักษะครูและคณะกรรมการเทียบโอน": Math.min(subCount, 6),
          "การพัฒนาระบบสารสนเทศ ฐานข้อมูล และจัดหาอุปกรณ์ (Digital Readiness)": Math.min(subCount, 6),
          "การจัดกิจกรรมการเรียนรู้และพัฒนาทักษะวิชาชีพให้แก่ผู้เรียน": Math.min(subCount, 5)
        },
        part6_obstacles: {
          "ขาดงบประมาณในการจัดกิจกรรมและพัฒนาระบบ": Math.min(subCount, 7),
          "ขาดความเข้าใจในการกำหนดผลลัพธ์การเรียนรู้ (Learning Outcome) และการเทียบโอน": Math.min(subCount, 5),
          "ภาระงานของครูมีมาก ทำให้การประเมินและติดตามผู้เรียนเป็นรายบุคคลทำได้ยาก": Math.min(subCount, 6),
          "ขาดแหล่งเรียนรู้หรือขาดความร่วมมือจากสถานประกอบการและชุมชน": Math.min(subCount, 3)
        }
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
    adminResetSchool: function(schoolName, pin) { return request("adminResetSchool", "POST", { schoolName: schoolName, pin: pin }); }
  };
})();
