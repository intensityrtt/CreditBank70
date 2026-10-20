/**
 * AdminPortal Module
 * ระบบสำหรับผู้ดูแลระบบ (Admin สพป.น่าน เขต 1)
 * ควบคุมการเปิด/ปิดรับแบบสำรวจ วิเคราะห์สารสนเทศ และส่งต่อไปยังรายงาน สพฐ.
 */
window.AdminPortal = (function() {
  var isLoggedIn = false;
  var adminPin = "";
  var adminData = null;
  var charts = {};

  function init() {
    // ตรวจสอบสถานะการล็อกอิน
    var savedToken = sessionStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
    var savedPin = sessionStorage.getItem("cb_admin_current_pin");
    if (savedToken && savedPin) {
      isLoggedIn = true;
      adminPin = savedPin;
      loadAdminData();
    } else {
      isLoggedIn = false;
      renderLogin();
    }
  }

  // หน้าจอล็อกอินสำหรับผู้ดูแลระบบ
  function renderLogin() {
    var container = document.getElementById("admin-content");
    if (!container) return;

    var html = `
      <div class="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
        <div class="text-center space-y-2">
          <div class="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <i data-lucide="lock" class="w-8 h-8"></i>
          </div>
          <h2 class="text-2xl font-bold text-slate-800">เข้าสู่ระบบผู้ดูแลเขตพื้นที่</h2>
          <p class="text-xs text-slate-500">สำหรับเจ้าหน้าที่ผู้รับผิดชอบโครงการ Credit Bank สพป.น่าน เขต 1</p>
        </div>

        <form onsubmit="event.preventDefault(); AdminPortal.handleLogin();" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">รหัสผ่าน / Admin PIN</label>
            <input type="password" id="input_admin_pin" 
              placeholder="ระบุรหัส PIN ผู้ดูแลระบบ" 
              class="input-gov text-center text-lg tracking-widest font-mono" />
            <p class="text-xs text-slate-400 mt-1.5 text-center">เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ผู้ได้รับมอบหมายเท่านั้น</p>
          </div>

          <button type="submit" class="btn-primary w-full bg-slate-800 hover:bg-slate-900 text-white">
            <i data-lucide="key" class="w-5 h-5"></i> เข้าสู่ระบบควบคุม
          </button>
        </form>

        <div class="text-center pt-2 border-t border-slate-100">
          <button onclick="App.switchTab('survey')" class="text-xs text-slate-500 hover:text-blue-600">
            &larr; กลับไปยังหน้าแบบสำรวจสำหรับสถานศึกษา
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.safeRenderIcons) window.safeRenderIcons();
  }

  async function handleLogin() {
    var pinInput = document.getElementById("input_admin_pin");
    var pin = pinInput ? pinInput.value.trim() : "";
    if (!pin) {
      window.App.showToast("กรุณาระบุรหัส PIN ผู้ดูแลระบบ", "warning");
      return;
    }

    window.App.showToast("กำลังตรวจสอบสิทธิ์...", "info");
    try {
      var resp = await window.ApiService.adminLogin(pin);
      if (resp.success) {
        isLoggedIn = true;
        adminPin = pin;
        sessionStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.ADMIN_TOKEN, resp.token || "logged_in");
        sessionStorage.setItem("cb_admin_current_pin", pin);
        window.App.showToast("เข้าสู่ระบบผู้ดูแลสำเร็จ", "success");
        await loadAdminData();
      } else {
        window.App.showToast(resp.message || "รหัส PIN ไม่ถูกต้อง", "error");
      }
    } catch (e) {
      window.App.showToast("เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์", "error");
    }
  }

  function checkLoginStatus() {
    var savedToken = sessionStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
    var savedPin = sessionStorage.getItem("cb_admin_current_pin");
    return isLoggedIn || !!(savedToken && savedPin);
  }

  // แถบเมนูนำทางเฉพาะผู้ดูแลระบบเขต (Admin Navigation Bar)
  function getAdminNavHtml(activeItem) {
    return `
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg border border-slate-700/50 mb-6 no-print">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-300">ADMIN CONTROL CENTER</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">เข้าสู่ระบบแล้ว</span>
            </div>
            <div class="text-sm font-bold text-white">ระบบจัดการสารสนเทศ Credit Bank (สพป.น่าน เขต 1)</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <button onclick="App.switchTab('admin')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${activeItem === 'admin' ? 'bg-blue-600 text-white shadow-md font-bold ring-2 ring-blue-400/30' : 'bg-white/10 hover:bg-white/20 text-slate-200'}">
            <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i> ภาพรวม & วิเคราะห์สถิติ
          </button>
          <button onclick="App.switchTab('tracker')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${activeItem === 'tracker' ? 'bg-blue-600 text-white shadow-md font-bold ring-2 ring-blue-400/30' : 'bg-white/10 hover:bg-white/20 text-slate-200'}">
            <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> ติดตามความก้าวหน้า 34 รร.
          </button>
          <button onclick="App.switchTab('obec-report')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${activeItem === 'obec-report' ? 'bg-blue-600 text-white shadow-md font-bold ring-2 ring-blue-400/30' : 'bg-white/10 hover:bg-white/20 text-slate-200'}">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> ข้อมูลรายงาน สพฐ.
          </button>
          <button onclick="AdminPortal.logout()" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/60 hover:bg-red-900 text-red-200 transition-all flex items-center gap-1.5 cursor-pointer ml-1 border border-red-800/40">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> ออกจากระบบ
          </button>
        </div>
      </div>
    `;
  }

  function logout() {
    isLoggedIn = false;
    adminPin = "";
    sessionStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
    sessionStorage.removeItem("cb_admin_current_pin");
    renderLogin();
    window.App.showToast("ออกจากระบบผู้ดูแลแล้ว", "info");
    window.App.switchTab("survey");
  }

  async function loadAdminData() {
    var container = document.getElementById("admin-content");
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-20">
        <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-blue-600 mx-auto"></i>
        <p class="text-slate-500 mt-3 font-medium">กำลังโหลดข้อมูลสารสนเทศและสถิติภาพรวม...</p>
      </div>
    `;
    if (window.safeRenderIcons) window.safeRenderIcons();

    try {
      var resp = await window.ApiService.adminGetFullData(adminPin);
      if (resp && resp.success) {
        adminData = resp;
        renderDashboard();
      } else {
        container.innerHTML = `<div class="p-8 bg-red-50 text-red-700 rounded-xl">ไม่สามารถโหลดข้อมูลได้: ${resp.message}</div>`;
      }
    } catch (e) {
      container.innerHTML = `<div class="p-8 bg-red-50 text-red-700 rounded-xl">เกิดข้อผิดพลาด: ${e.message}</div>`;
    }
  }

  // แสดงผลหน้าแดชบอร์ดหลักของ Admin
  function renderDashboard() {
    var container = document.getElementById("admin-content");
    if (!container || !adminData) return;

    var s = adminData.settings;
    var obec = adminData.obecSummary;
    var schools = adminData.schools || [];
    var submitted = schools.filter(function(sc) { return sc.isSubmitted; });
    var pending = schools.filter(function(sc) { return !sc.isSubmitted; });

    var isOpen = s.isOpen !== false;

    var html = `
      <div class="space-y-6 max-w-7xl mx-auto">
        ${getAdminNavHtml('admin')}

        <!-- แถบด้านบน: ศูนย์ควบคุมและสถานะเปิด/ปิดระบบ -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                ● ระบบ: ${isOpen ? 'เปิดรับข้อมูลปกติ' : 'ปิดรับข้อมูลแล้ว'}
              </span>
              <span class="text-xs text-slate-500">ปีงบประมาณ ${s.academicYear}</span>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">ศูนย์บริหารจัดการระบบสำรวจ Credit Bank</h2>
            <p class="text-xs text-slate-500">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1</p>
          </div>

          <!-- ปุ่มควบคุมเปิด-ปิด และปุ่มรายงาน สพฐ. -->
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- ปุ่มสวิตช์เปิด/ปิด ระบบ -->
            <button onclick="AdminPortal.toggleSurvey(${!isOpen})" 
              class="btn-secondary text-sm ${isOpen ? 'hover:bg-red-50 hover:text-red-700' : 'hover:bg-emerald-50 hover:text-emerald-700'}">
              <i data-lucide="${isOpen ? 'pause-circle' : 'play-circle'}" class="w-4 h-4"></i>
              ${isOpen ? 'สั่งปิดรับแบบสำรวจ' : 'สั่งเปิดรับแบบสำรวจ'}
            </button>

            <!-- ปุ่มตรงไปยังหน้ารายงาน สพฐ. -->
            <button onclick="App.switchTab('obec-report')" class="btn-primary text-sm bg-blue-700 hover:bg-blue-800 shadow-sm">
              <i data-lucide="file-text" class="w-4 h-4"></i> นำข้อมูลไปรายงานต่อ สพฐ.
            </button>

            <!-- ปุ่มออกจากระบบ -->
            <button onclick="AdminPortal.logout()" class="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer" title="ออกจากระบบ">
              <i data-lucide="log-out" class="w-5 h-5"></i>
            </button>
          </div>
        </div>

        <!-- แถบเครื่องมือและแหล่งจัดเก็บข้อมูล (เฉพาะ Admin เท่านั้น) -->
        <div class="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span class="text-xs font-bold text-amber-300 uppercase tracking-wider">Admin Cloud Resources</span>
            </div>
            <h3 class="text-base font-bold text-white">คลังข้อมูลและเอกสารส่วนกลาง (เฉพาะผู้ดูแลระบบ)</h3>
            <p class="text-xs text-slate-300">เชื่อมต่อ Google Sheets ฐานข้อมูล และ Google Drive ที่ได้รับการปกป้อง</p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <a href="${window.APP_CONFIG.SHEET_URL}" target="_blank" 
               class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all">
              <i data-lucide="table" class="w-4 h-4"></i> เปิด Google Sheet ฐานข้อมูล
            </a>

            <a href="${window.APP_CONFIG.DRIVE_FOLDER_URL}" target="_blank" 
               class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all">
              <i data-lucide="folder" class="w-4 h-4"></i> เปิดโฟลเดอร์ Google Drive
            </a>

            <button onclick="App.openSettingsModal()" 
               class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow transition-all cursor-pointer">
              <i data-lucide="settings" class="w-4 h-4"></i> ตั้งค่า API / Web App
            </button>
          </div>
        </div>

        <!-- การ์ดตัวเลขสรุป Executive Summary -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs text-slate-500">เป้าหมายสถานศึกษาขยายโอกาส</div>
            <div class="text-3xl font-bold text-slate-800 mt-1">34 <span class="text-sm font-normal text-slate-500">โรงเรียน</span></div>
            <div class="text-xs text-slate-400 mt-1">จากโรงเรียนในสังกัดทั้งหมด 149 แห่ง</div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs text-slate-500">รายงานข้อมูลเข้ามาแล้ว</div>
            <div class="text-3xl font-bold text-emerald-700 mt-1">${submitted.length} <span class="text-sm font-normal text-slate-500">แห่ง</span></div>
            <div class="text-xs text-emerald-600 mt-1">ความสำเร็จ ${Math.round((submitted.length / 34) * 100)}%</div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs text-slate-500">สถานศึกษาที่ยังไม่ได้รายงาน</div>
            <div class="text-3xl font-bold text-amber-700 mt-1">${pending.length} <span class="text-sm font-normal text-slate-500">แห่ง</span></div>
            <div class="text-xs text-amber-600 mt-1">ต้องการการประสานงานติดตาม</div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs text-slate-500">ผู้เรียนเข้าร่วม Credit Bank รวม</div>
            <div class="text-3xl font-bold text-blue-800 mt-1">${obec.part1_general.totalStudentsInCreditBank.toLocaleString()} <span class="text-sm font-normal text-slate-500">คน</span></div>
            <div class="text-xs text-blue-600 mt-1">ยอดรวมที่ต้องรายงาน สพฐ.</div>
          </div>
        </div>

        <!-- ส่วนกราฟวิเคราะห์สารสนเทศ (Analytics Charts) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- กราฟ 1: 5 รูปแบบเทียบโอน -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-800">ผู้เรียนตามรูปแบบเทียบโอน 5 รูปแบบ</h3>
                <p class="text-xs text-slate-400">เปรียบเทียบจำนวนนักเรียนในแต่ละรูปแบบ</p>
              </div>
              <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">สพฐ. ส่วนที่ 2</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-formats"></canvas>
            </div>
          </div>

          <!-- กราฟ 2: 9 โครงการขับเคลื่อน -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-800">ผู้เรียนใน 9 โครงการขับเคลื่อน</h3>
                <p class="text-xs text-slate-400">จำนวนนักเรียนที่เข้าร่วมแต่ละโครงการ</p>
              </div>
              <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">สพฐ. ส่วนที่ 3</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-projects"></canvas>
            </div>
          </div>

          <!-- กราฟ 3: สถานะการขึ้นทะเบียนธนาคารหน่วยกิต -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-800">สถานะการขึ้นทะเบียนของสถานศึกษา</h3>
                <p class="text-xs text-slate-400">การอนุมัติและยื่นคำร้อง ศธจ./สพท.</p>
              </div>
              <span class="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium">สพฐ. ส่วนที่ 5</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-registration"></canvas>
            </div>
          </div>

          <!-- กราฟ 4: ความต้องการงบประมาณ & ปัญหาอุปสรรค -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-800">ความต้องการงบประมาณหลัก</h3>
                <p class="text-xs text-slate-400">ด้านที่สถานศึกษาต้องการงบประมาณสนับสนุน</p>
              </div>
              <span class="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-medium">ส่วนที่ 6</span>
            </div>
            <div class="h-64 relative">
              <canvas id="chart-budget"></canvas>
            </div>
          </div>
        </div>

        <!-- รายการจัดการสถานศึกษา 34 แห่ง พร้อมปุ่มรีเซ็ต -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-slate-800">จัดการข้อมูลสถานศึกษาเป้าหมาย (34 แห่ง)</h3>
              <p class="text-xs text-slate-500">สามารถตรวจสอบ หรือสั่งรีเซ็ตสถานะเพื่อให้โรงเรียนกรอกใหม่ได้</p>
            </div>
            <button onclick="AdminPortal.exportRawSubmissionsCsv()" class="btn-secondary text-xs">
              <i data-lucide="download" class="w-4 h-4"></i> ดาวน์โหลดข้อมูลดิบ (CSV)
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3 w-10 text-center">ที่</th>
                  <th class="py-3 px-3">ชื่อโรงเรียน</th>
                  <th class="py-3 px-3">ผู้รับผิดชอบ / โทร</th>
                  <th class="py-3 px-3 text-center">สถานะ</th>
                  <th class="py-3 px-3 text-center">นร.สะสม</th>
                  <th class="py-3 px-3">วันเวลาที่ส่ง</th>
                  <th class="py-3 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${schools.map(function(sc, idx) {
                  return `
                    <tr class="hover:bg-slate-50/80">
                      <td class="py-2.5 px-3 text-center text-xs text-slate-400">${idx + 1}</td>
                      <td class="py-2.5 px-3 font-semibold text-slate-800">
                        ${sc.name}
                        <span class="text-xs font-normal text-slate-400 block">${sc.code}</span>
                      </td>
                      <td class="py-2.5 px-3 text-xs">
                        <div>${sc.contactName || '-'}</div>
                        <div class="text-slate-400">${sc.contactPhone || '-'}</div>
                      </td>
                      <td class="py-2.5 px-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${sc.isSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                          ${sc.status}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-center font-bold text-blue-700">
                        ${sc.isSubmitted ? sc.creditStudents : '-'}
                      </td>
                      <td class="py-2.5 px-3 text-xs text-slate-500">${sc.submittedAt || '-'}</td>
                      <td class="py-2.5 px-3 text-center">
                        ${sc.isSubmitted ? `
                          <button onclick="AdminPortal.confirmResetSchool('${sc.name}')" 
                            class="text-xs text-red-600 hover:text-red-800 font-semibold p-1 hover:bg-red-50 rounded">
                            รีเซ็ตให้ส่งใหม่
                          </button>
                        ` : `
                          <span class="text-xs text-slate-400">-</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.safeRenderIcons) window.safeRenderIcons();
    initCharts(obec);
  }

  // สร้างกราฟสารสนเทศด้วย Chart.js
  function initCharts(obec) {
    if (!window.Chart) return;

    // Destroy existing charts
    Object.keys(charts).forEach(function(k) {
      if (charts[k]) charts[k].destroy();
    });

    // 1. Chart Formats
    var ctxFormats = document.getElementById("chart-formats");
    if (ctxFormats) {
      var labels = obec.part2_formats.map(function(f) { return f.name.replace("แบบ", "").substring(0, 16); });
      var dataValues = obec.part2_formats.map(function(f) { return f.studentsCount; });
      charts.formats = new window.Chart(ctxFormats, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'จำนวนผู้เรียน (คน)',
            data: dataValues,
            backgroundColor: '#2563eb',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 2. Chart Projects
    var ctxProj = document.getElementById("chart-projects");
    if (ctxProj) {
      var pLabels = obec.part3_projects.map(function(p) { return "โครงการ " + p.number; });
      var pData = obec.part3_projects.map(function(p) { return p.studentsCount; });
      charts.projects = new window.Chart(ctxProj, {
        type: 'bar',
        data: {
          labels: pLabels,
          datasets: [{
            label: 'จำนวนผู้เรียน (คน)',
            data: pData,
            backgroundColor: '#7c3aed',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 3. Chart Registration
    var ctxReg = document.getElementById("chart-registration");
    if (ctxReg) {
      var rLabels = Object.keys(obec.part5_registration).map(function(k) { return k.substring(0, 20) + "..."; });
      var rData = Object.values(obec.part5_registration);
      charts.reg = new window.Chart(ctxReg, {
        type: 'doughnut',
        data: {
          labels: rLabels,
          datasets: [{
            data: rData,
            backgroundColor: ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#94a3b8']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
          }
        }
      });
    }

    // 4. Chart Budget Focus
    var ctxBg = document.getElementById("chart-budget");
    if (ctxBg) {
      var bgLabels = Object.keys(obec.part6_budget).map(function(k) { return k.substring(0, 18) + "..."; });
      var bgData = Object.values(obec.part6_budget);
      charts.budget = new window.Chart(ctxBg, {
        type: 'bar',
        data: {
          labels: bgLabels,
          datasets: [{
            label: 'จำนวนโรงเรียนที่เลือก (แห่ง)',
            data: bgData,
            backgroundColor: '#059669',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }

  // คำสั่งเปิด/ปิดรับแบบสำรวจ
  async function toggleSurvey(targetState) {
    var actionText = targetState ? "เปิดรับการกรอกแบบสำรวจ" : "ปิดรับการกรอกแบบสำรวจ";
    if (!confirm("คุณต้องการ " + actionText + " ใช่หรือไม่?")) return;

    window.App.showToast("กำลังดำเนินการ...", "info");
    try {
      var resp = await window.ApiService.adminToggleSurvey(targetState, adminPin);
      if (resp && resp.success) {
        window.App.showToast(resp.message || "บันทึกสถานะเรียบร้อย", "success");
        await loadAdminData();
      } else {
        window.App.showToast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
      }
    } catch (e) {
      window.App.showToast("เกิดข้อผิดพลาด: " + e.message, "error");
    }
  }

  // รีเซ็ตการส่งของโรงเรียน
  async function confirmResetSchool(schoolName) {
    if (!confirm("คุณต้องการรีเซ็ตสถานะของ " + schoolName + " เพื่อให้กรอกข้อมูลใหม่ใช่หรือไม่?")) return;
    window.App.showToast("กำลังรีเซ็ตข้อมูล...", "info");
    try {
      var resp = await window.ApiService.adminResetSchool(schoolName, adminPin);
      if (resp && resp.success) {
        window.App.showToast(resp.message, "success");
        await loadAdminData();
      } else {
        window.App.showToast("ไม่สามารถรีเซ็ตได้", "error");
      }
    } catch (e) {
      window.App.showToast("เกิดข้อผิดพลาด: " + e.message, "error");
    }
  }

  // ดาวน์โหลดข้อมูลดิบ CSV
  function exportRawSubmissionsCsv() {
    if (!adminData || !adminData.schools) return;
    var rows = [
      ["ลำดับ", "ชื่อสถานศึกษา", "รหัส 10 หลัก", "อำเภอ", "สถานะ", "วันเวลาที่ส่ง", "ผู้รับผิดชอบ", "เบอร์โทร", "ผู้เรียนสะสมหน่วยกิต (คน)"]
    ];
    adminData.schools.forEach(function(s, idx) {
      rows.push([
        idx + 1,
        '"' + s.name + '"',
        "'" + s.code,
        '"' + s.district + '"',
        '"' + s.status + '"',
        '"' + s.submittedAt + '"',
        '"' + (s.contactName || "") + '"',
        "'" + (s.contactPhone || ""),
        s.creditStudents || 0
      ]);
    });

    var csvContent = "\uFEFF" + rows.map(function(e) { return e.join(","); }).join("\n");
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "CreditBank_Nan1_Submissions_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.App.showToast("ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว", "success");
  }

  return {
    init: init,
    renderLogin: renderLogin,
    handleLogin: handleLogin,
    logout: logout,
    toggleSurvey: toggleSurvey,
    confirmResetSchool: confirmResetSchool,
    exportRawSubmissionsCsv: exportRawSubmissionsCsv,
    isLoggedIn: checkLoginStatus,
    getAdminNavHtml: getAdminNavHtml,
    getAdminData: function() { return adminData; }
  };
})();
