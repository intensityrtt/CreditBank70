/**
 * App Controller & Router
 * ระบบสำรวจ Credit Bank สพป.น่าน เขต 1
 */
window.App = (function() {
  var activeTab = "survey";
  var surveyConfig = null;

  // ฟังก์ชันเรนเดอร์ไอคอนอย่างปลอดภัย
  function safeRenderIcons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      } else {
        setTimeout(function() {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 300);
      }
    } catch (e) {
      console.warn("Lucide render notice:", e);
    }
  }
  window.safeRenderIcons = safeRenderIcons;

  function init() {
    setupTabListeners();
    // 1. เรนเดอร์หน้าจอทันที ไม่ต้องรอเครือข่าย เพื่อให้เปิดเร็วที่สุด
    switchTab(activeTab);
    safeRenderIcons();
    // 2. ตรวจสอบสถานะเซิร์ฟเวอร์แบบเบื้องหลัง (Non-blocking)
    checkSystemStatus();
  }

  // ตรวจสอบสถานะระบบจาก API
  async function checkSystemStatus() {
    try {
      var resp = await window.ApiService.getConfig();
      if (resp && resp.success) {
        surveyConfig = resp;
        updateStatusBadge(resp);
      }
    } catch (e) {
      console.warn("Could not check config", e);
    }
  }

  function updateStatusBadge(config) {
    var badge = document.getElementById("system-status-pill");
    if (!badge) return;

    var isLive = window.ApiService.isLiveConnected();
    var isOpen = config.isOpen !== false;

    badge.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isOpen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}">
        <span class="w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></span>
        <span>${isOpen ? 'เปิดรับแบบสำรวจ' : 'ปิดรับแบบสำรวจ'}</span>
        <span class="text-slate-400">|</span>
        <span class="text-xs ${isLive ? 'text-blue-700 font-bold' : 'text-amber-700'}">${isLive ? '● Live Server' : '○ Standby / Demo'}</span>
      </div>
    `;
  }

  // สลับแท็บหน้าจอ
  function switchTab(tabId) {
    // ตรวจสอบสิทธิ์: ถ้าจะเข้า tracker หรือ obec-report ต้องเป็น Admin ที่ล็อกอินแล้วเท่านั้น
    if (tabId === "tracker" || tabId === "obec-report") {
      var isAuth = window.AdminPortal && typeof window.AdminPortal.isLoggedIn === 'function' && window.AdminPortal.isLoggedIn();
      if (!isAuth) {
        showToast("ส่วนนี้สำหรับผู้ดูแลระบบเขตพื้นที่เท่านั้น กรุณาเข้าสู่ระบบ", "warning");
        tabId = "admin";
      }
    }

    activeTab = tabId;

    // ซ่อนทุกหน้า
    ["survey-view", "tracker-view", "admin-view", "obec-report-view"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    // อัปเดตสไตล์ปุ่มแท็บ
    document.querySelectorAll(".nav-tab-btn").forEach(function(btn) {
      var target = btn.getAttribute("data-tab");
      if (target === tabId) {
        btn.classList.add("text-blue-700", "border-blue-600", "bg-blue-50/70", "font-bold");
        btn.classList.remove("text-slate-600", "border-transparent", "hover:text-slate-900");
      } else {
        btn.classList.remove("text-blue-700", "border-blue-600", "bg-blue-50/70", "font-bold");
        btn.classList.add("text-slate-600", "border-transparent", "hover:text-slate-900");
      }
    });

    // แสดงหน้าที่เลือกและสั่ง Init
    var targetEl = document.getElementById(tabId + "-view");
    if (targetEl) {
      targetEl.classList.remove("hidden");
    }

    try {
      if (tabId === "survey" && window.SurveyForm) {
        window.SurveyForm.init();
      } else if (tabId === "tracker" && window.TrackerView) {
        window.TrackerView.init();
      } else if (tabId === "admin" && window.AdminPortal) {
        window.AdminPortal.init();
      } else if (tabId === "obec-report" && window.ObecReport) {
        window.ObecReport.init();
      }
    } catch (err) {
      console.error("Tab switch error for " + tabId, err);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    safeRenderIcons();
  }

  function setupTabListeners() {
    document.querySelectorAll(".nav-tab-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var tab = this.getAttribute("data-tab");
        if (tab) switchTab(tab);
      });
    });
  }

  // ระบบแจ้งเตือนลอย (Floating Toast Notification)
  function showToast(message, type) {
    var container = document.getElementById("toast-container");
    if (!container) return;

    var bgColors = {
      success: "bg-emerald-600 text-white",
      warning: "bg-amber-600 text-white",
      error: "bg-red-600 text-white",
      info: "bg-slate-800 text-white"
    };

    var icons = {
      success: "check-circle",
      warning: "alert-triangle",
      error: "alert-octagon",
      info: "info"
    };

    var toast = document.createElement("div");
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all transform duration-300 translate-y-2 opacity-0 ${bgColors[type || 'info']}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type || 'info']}" class="w-5 h-5 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    safeRenderIcons();

    setTimeout(function() {
      toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    setTimeout(function() {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // หน้าต่างตั้งค่าระบบ (Settings Modal) - เข้าถึงได้เฉพาะเมื่อล็อกอิน Admin
  function openSettingsModal() {
    var curUrl = window.ApiService.getApiUrl();
    var modalHtml = `
      <div id="settings-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-2">
              <i data-lucide="settings" class="w-6 h-6 text-blue-700"></i>
              <h3 class="text-xl font-bold text-slate-800">ตั้งค่าระบบและการเชื่อมต่อ (Admin)</h3>
            </div>
            <button onclick="App.closeSettingsModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL
              </label>
              <input type="url" id="input_gas_url" 
                value="${curUrl}" 
                placeholder="https://script.google.com/macros/s/.../exec" 
                class="input-gov font-mono text-xs" />
              <p class="text-xs text-slate-400 mt-1">
                นำ Web App URL ที่ได้จากการ Deploy ใน Google Apps Script มาใส่ที่นี่
              </p>
            </div>

            <!-- ลิงก์ฐานข้อมูลสำหรับ Admin -->
            <div class="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div class="font-bold text-slate-700">แหล่งจัดเก็บข้อมูล (Admin เข้าถึงได้เท่านั้น):</div>
              <div class="flex items-center justify-between py-1 border-b border-slate-200">
                <span class="text-slate-500">Google Spreadsheet:</span>
                <a href="${window.APP_CONFIG.SHEET_URL}" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                  เปิดชีตฐานข้อมูล <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                </a>
              </div>
              <div class="flex items-center justify-between py-1">
                <span class="text-slate-500">Google Drive Folder:</span>
                <a href="${window.APP_CONFIG.DRIVE_FOLDER_URL}" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                  เปิดโฟลเดอร์ไดรฟ์ <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                </a>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button onclick="App.testApiConnection()" class="btn-secondary text-xs">
              <i data-lucide="wifi" class="w-4 h-4"></i> ทดสอบการเชื่อมต่อ
            </button>
            <div class="flex items-center gap-2">
              <button onclick="App.closeSettingsModal()" class="btn-secondary text-xs">ยกเลิก</button>
              <button onclick="App.saveSettingsModal()" class="btn-primary text-xs">บันทึกการตั้งค่า</button>
            </div>
          </div>
        </div>
      </div>
    `;

    var root = document.getElementById("modal-root");
    if (root) {
      root.innerHTML = modalHtml;
      safeRenderIcons();
    }
  }

  function closeSettingsModal() {
    var root = document.getElementById("modal-root");
    if (root) root.innerHTML = "";
  }

  function saveSettingsModal() {
    var input = document.getElementById("input_gas_url");
    if (input) {
      window.ApiService.setApiUrl(input.value.trim());
      showToast("บันทึกการตั้งค่า URL เรียบร้อยแล้ว", "success");
      closeSettingsModal();
      checkSystemStatus();
    }
  }

  async function testApiConnection() {
    var input = document.getElementById("input_gas_url");
    var url = input ? input.value.trim() : "";
    if (!url) {
      showToast("กรุณาระบุ URL ก่อนทดสอบ", "warning");
      return;
    }

    showToast("กำลังส่งคำขอทดสอบไปยัง Google Apps Script...", "info");
    try {
      var resp = await fetch(url + (url.includes("?") ? "&" : "?") + "action=ping");
      var data = await resp.json();
      if (data && data.success) {
        showToast("เชื่อมต่อ Google Apps Script สำเร็จ! " + (data.message || ""), "success");
      } else {
        showToast("เซิร์ฟเวอร์ตอบกลับแต่พบปัญหา: " + JSON.stringify(data), "warning");
      }
    } catch (e) {
      showToast("ไม่สามารถเชื่อมต่อได้: ตรวจสอบสิทธิ์ Access ว่าเป็น 'Anyone' แล้วหรือไม่", "error");
    }
  }

  return {
    init: init,
    switchTab: switchTab,
    showToast: showToast,
    openSettingsModal: openSettingsModal,
    closeSettingsModal: closeSettingsModal,
    saveSettingsModal: saveSettingsModal,
    testApiConnection: testApiConnection
  };
})();

// รันอัตโนมัติทันทีที่ DOM พร้อม
(function() {
  function startApp() {
    if (window.App && typeof window.App.init === 'function') {
      try {
        window.App.init();
      } catch (err) {
        console.error("App init error:", err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
