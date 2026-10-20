/**
 * TrackerView Module
 * ติดตามความก้าวหน้าการส่งข้อมูลของ 34 โรงเรียนเป้าหมาย
 * สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1
 */
window.TrackerView = (function() {
  var schoolsData = [];
  var filterStatus = "all"; // "all", "submitted", "pending"
  var searchQuery = "";

  async function init() {
    await loadData();
    render();
  }

  async function loadData() {
    try {
      var resp = await window.ApiService.getSchools();
      if (resp && resp.schools) {
        schoolsData = resp.schools;
      }
    } catch (e) {
      console.error("Failed to load tracker data", e);
    }
  }

  function render() {
    var container = document.getElementById("tracker-content");
    if (!container) return;

    var total = schoolsData.length || 34;
    var submittedList = schoolsData.filter(function(s) { return s.isSubmitted; });
    var pendingList = schoolsData.filter(function(s) { return !s.isSubmitted; });
    var submittedCount = submittedList.length;
    var pendingCount = total - submittedCount;
    var percent = Math.round((submittedCount / total) * 100);
    var totalCreditStudents = submittedList.reduce(function(acc, c) { return acc + (c.creditStudents || 0); }, 0);

    // Filter list
    var filtered = schoolsData.filter(function(s) {
      var matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.district && s.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (s.code && s.code.includes(searchQuery));
      if (!matchQuery) return false;
      if (filterStatus === "submitted") return s.isSubmitted;
      if (filterStatus === "pending") return !s.isSubmitted;
      return true;
    });

    var html = `
      <div class="space-y-6 max-w-6xl mx-auto">
        <!-- หัวข้อหน้าจอ -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-1">สารสนเทศระดับเขตพื้นที่</span>
            <h2 class="text-2xl font-bold text-slate-800">ติดตามความก้าวหน้าการส่งข้อมูล Credit Bank</h2>
            <p class="text-slate-500 text-sm mt-0.5">โรงเรียนขยายโอกาสทางการศึกษาในสังกัด สพป.น่าน เขต 1 (34 แห่ง)</p>
          </div>
          <button onclick="TrackerView.refreshData()" class="btn-secondary text-sm">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i> รีเฟรชข้อมูลล่าสุด
          </button>
        </div>

        <!-- การ์ดสรุปตัวเลข 4 ช่อง -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 1. เป้าหมายทั้งหมด -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>สถานศึกษาเป้าหมาย</span>
              <i data-lucide="school" class="w-4 h-4 text-slate-400"></i>
            </div>
            <div class="text-3xl font-bold text-slate-800">${total} <span class="text-base font-normal text-slate-500">แห่ง</span></div>
            <div class="text-xs text-slate-400">รหัสสังกัด สพป.น่าน เขต 1</div>
          </div>

          <!-- 2. ส่งข้อมูลแล้ว -->
          <div class="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-sm space-y-1">
            <div class="flex items-center justify-between text-emerald-700 text-xs font-medium">
              <span>ส่งข้อมูลแล้ว</span>
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <div class="text-3xl font-bold text-emerald-800">${submittedCount} <span class="text-base font-normal text-emerald-600">แห่ง</span></div>
            <div class="text-xs text-emerald-600 font-medium">คิดเป็น ${percent}% ของเป้าหมาย</div>
          </div>

          <!-- 3. รอส่งข้อมูล -->
          <div class="bg-amber-50/60 p-5 rounded-xl border border-amber-200 shadow-sm space-y-1">
            <div class="flex items-center justify-between text-amber-700 text-xs font-medium">
              <span>ยังไม่ส่งข้อมูล</span>
              <i data-lucide="clock" class="w-4 h-4 text-amber-600"></i>
            </div>
            <div class="text-3xl font-bold text-amber-800">${pendingCount} <span class="text-base font-normal text-amber-600">แห่ง</span></div>
            <div class="text-xs text-amber-600">อยู่ระหว่างการดำเนินการ</div>
          </div>

          <!-- 4. รวมผู้เรียนในระบบ -->
          <div class="bg-blue-50/60 p-5 rounded-xl border border-blue-200 shadow-sm space-y-1">
            <div class="flex items-center justify-between text-blue-700 text-xs font-medium">
              <span>ผู้เรียนสะสมหน่วยกิตรวม</span>
              <i data-lucide="graduation-cap" class="w-4 h-4 text-blue-600"></i>
            </div>
            <div class="text-3xl font-bold text-blue-900">${totalCreditStudents.toLocaleString()} <span class="text-base font-normal text-blue-700">คน</span></div>
            <div class="text-xs text-blue-600">จากโรงเรียนที่รายงานแล้ว</div>
          </div>
        </div>

        <!-- แถบเปอร์เซ็นต์ความคืบหน้ารวม -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div class="flex justify-between items-center text-sm font-semibold text-slate-700">
            <span>ความก้าวหน้าการรายงานข้อมูลภาพรวมเขตพื้นที่</span>
            <span class="text-blue-700">${percent}% (${submittedCount} / ${total} โรงเรียน)</span>
          </div>
          <div class="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
            <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>

        <!-- เครื่องมือค้นหาและตัวกรอง -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
          <!-- กล่องค้นหา -->
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-3.5 text-slate-400"></i>
            <input type="text" 
              value="${searchQuery}" 
              oninput="TrackerView.setSearch(this.value)"
              placeholder="ค้นหาชื่อโรงเรียน หรืออำเภอ..." 
              class="input-gov pl-9 py-2 text-sm" />
          </div>

          <!-- ปุ่มตัวกรองสถานะ -->
          <div class="flex items-center gap-1.5 w-full sm:w-auto">
            <button onclick="TrackerView.setFilter('all')" 
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
              ทั้งหมด (${total})
            </button>
            <button onclick="TrackerView.setFilter('submitted')" 
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'submitted' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
              ส่งแล้ว (${submittedCount})
            </button>
            <button onclick="TrackerView.setFilter('pending')" 
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">
              ยังไม่ส่ง (${pendingCount})
            </button>
          </div>
        </div>

        <!-- รายการตารางสถานศึกษา 34 แห่ง -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4 w-12 text-center">ลำดับ</th>
                  <th class="py-3 px-4">ชื่อสถานศึกษา</th>
                  <th class="py-3 px-4 w-32">รหัส 10 หลัก</th>
                  <th class="py-3 px-4 w-28">อำเภอ</th>
                  <th class="py-3 px-4 w-36 text-center">สถานะ</th>
                  <th class="py-3 px-4 w-32 text-center">นร.สะสม</th>
                  <th class="py-3 px-4 w-44">วันเวลาที่ส่ง</th>
                  <th class="py-3 px-4 w-24 text-center">การกระทำ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${filtered.length > 0 ? filtered.map(function(s, idx) {
                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3.5 px-4 text-center font-mono text-xs text-slate-400">${idx + 1}</td>
                      <td class="py-3.5 px-4 font-semibold text-slate-800">
                        ${s.name}
                        ${s.contactName && s.contactName !== '-' ? `
                          <div class="text-xs font-normal text-slate-400 mt-0.5">ผู้รับผิดชอบ: ${s.contactName}</div>
                        ` : ''}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-xs text-slate-500">${s.code}</td>
                      <td class="py-3.5 px-4 text-xs font-medium text-slate-600">อ.${s.district}</td>
                      <td class="py-3.5 px-4 text-center">
                        ${s.isSubmitted ? `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i> ส่งข้อมูลแล้ว
                          </span>
                        ` : `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <i data-lucide="clock" class="w-3.5 h-3.5"></i> ยังไม่ส่ง
                          </span>
                        `}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold ${s.creditStudents > 0 ? 'text-blue-700' : 'text-slate-400'}">
                        ${s.isSubmitted ? (s.creditStudents + ' คน') : '-'}
                      </td>
                      <td class="py-3.5 px-4 text-xs text-slate-500">
                        ${s.submittedAt || '-'}
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        ${!s.isSubmitted ? `
                          <button onclick="TrackerView.prefillAndGo('${s.name}')" 
                            class="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-all">
                            กรอกข้อมูล
                          </button>
                        ` : `
                          <span class="text-xs text-slate-400">เรียบร้อย</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join("") : `
                  <tr>
                    <td colspan="8" class="text-center py-8 text-slate-400">
                      ไม่พบข้อมูลสถานศึกษาที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  function setFilter(status) {
    filterStatus = status;
    render();
  }

  function setSearch(query) {
    searchQuery = query;
    render();
  }

  async function refreshData() {
    window.App.showToast("กำลังดึงข้อมูลล่าสุด...", "info");
    await loadData();
    render();
    window.App.showToast("อัปเดตข้อมูลสำเร็จ", "success");
  }

  // นำชื่อโรงเรียนไปใส่ในฟอร์มและกระโดดไปยังแท็บกรอกแบบสำรวจ
  function prefillAndGo(schoolName) {
    window.App.switchTab("survey");
    window.SurveyForm.onSchoolSelect(schoolName);
  }

  return {
    init: init,
    refreshData: refreshData,
    setFilter: setFilter,
    setSearch: setSearch,
    prefillAndGo: prefillAndGo
  };
})();
