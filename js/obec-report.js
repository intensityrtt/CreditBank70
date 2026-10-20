/**
 * ObecReport Module
 * ระบบประมวลผลและนำข้อมูลไปรายงานต่อ สพฐ.
 * โครงสร้างตรงตามเอกสาร "รายงาน CreditBank สพฐ.pdf" แบบ 1:1
 */
window.ObecReport = (function() {
  var coordinator = {
    name: "นาย/นาง....................................",
    phone: "054-XXXXXX",
    position: "ศึกษานิเทศก์ / ผู้ประสานงาน Credit Bank"
  };

  function init() {
    render();
  }

  function render() {
    var container = document.getElementById("obec-report-content");
    if (!container) return;

    var adminData = window.AdminPortal.getAdminData();
    if (!adminData || !adminData.obecSummary) {
      container.innerHTML = `
        <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12">
          <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <i data-lucide="shield-alert" class="w-8 h-8"></i>
          </div>
          <h3 class="text-xl font-bold text-slate-800">ต้องเข้าสู่ระบบ Admin ก่อน</h3>
          <p class="text-sm text-slate-500">หน้ารายงาน สพฐ. สงวนไว้สำหรับผู้ดูแลระบบและเจ้าหน้าที่เขตพื้นที่การศึกษาเท่านั้น</p>
          <button onclick="App.switchTab('admin')" class="btn-primary">
            <i data-lucide="lock" class="w-4 h-4"></i> เข้าสู่ระบบ Admin
          </button>
        </div>
      `;
      if (window.safeRenderIcons) window.safeRenderIcons();
      return;
    }

    var obec = adminData.obecSummary;
    var g = obec.part1_general;
    var formats = obec.part2_formats;
    var projects = obec.part3_projects;

    var html = `
      <div class="space-y-6 max-w-5xl mx-auto">
        <!-- แถบด้านบนและปุ่มพิมพ์/Export -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div>
            <span class="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-semibold rounded-full mb-1">
              แบบรายงาน สพฐ. (ฉบับประมวลผลอัตโนมัติ)
            </span>
            <h2 class="text-2xl font-bold text-slate-800">ข้อมูลสรุปเพื่อรายงานต่อ สพฐ. (Google Form)</h2>
            <p class="text-xs text-slate-500">ระบบรวบรวมและคำนวณจากสถานศึกษาในสังกัด 34 แห่งตรงตามแบบฟอร์ม สพฐ.</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="ObecReport.copyAllData()" class="btn-secondary text-xs">
              <i data-lucide="copy" class="w-4 h-4"></i> คัดลอกสรุปทั้งหมด
            </button>
            <button onclick="window.print()" class="btn-primary text-xs bg-slate-800 hover:bg-slate-900">
              <i data-lucide="printer" class="w-4 h-4"></i> พิมพ์ / บันทึก PDF (A4)
            </button>
          </div>
        </div>

        <!-- แถบแจ้งเตือนวิธีใช้ -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900 no-print">
          <i data-lucide="lightbulb" class="w-5 h-5 shrink-0 text-blue-600 mt-0.5"></i>
          <div class="space-y-1">
            <strong>คำแนะนำสำหรับเจ้าหน้าที่ สพท.:</strong>
            <p>ท่านสามารถคลิกปุ่ม <strong>"คัดลอกค่า"</strong> ในแต่ละข้อ เพื่อนำไปวาง (Paste) ใน Google Form ของ สพฐ. ได้ทันทีโดยไม่ต้องคำนวณใหม่ หรือกดพิมพ์เป็นเอกสารราชการแนบรายงาน</p>
          </div>
        </div>

        <!-- หน้าเอกสารรายงาน สพฐ. (แบบฟอร์มทางการ) -->
        <div class="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-sm space-y-8 font-sarabun text-slate-800 print-page">
          <!-- หัวเอกสาร -->
          <div class="text-center space-y-2 border-b-2 border-slate-800 pb-6">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-mono">แบบสำรวจข้อมูลระดับสำนักงานเขตพื้นที่การศึกษา (สพท.)</div>
            <h1 class="text-2xl font-bold">แบบสำรวจข้อมูลการดำเนินงานระบบธนาคารหน่วยกิต (Credit Bank)</h1>
            <h2 class="text-lg font-semibold text-slate-700">ระดับการศึกษาขั้นพื้นฐาน รูปแบบการศึกษาในระบบ สำหรับสำนักงานเขตพื้นที่การศึกษา</h2>
            <p class="text-xs text-slate-500 max-w-2xl mx-auto">
              คำชี้แจง: แบบสำรวจฉบับนี้จัดทำขึ้นสำหรับสำนักงานเขตพื้นที่การศึกษา (สพท.) เพื่อใช้รวบรวมข้อมูลสถานะการดำเนินงานของสถานศึกษาในสังกัด เพื่อรวบรวมรายงานบนระบบ Google form ของ สพฐ.
            </p>
          </div>

          <!-- ส่วนที่ 1: ข้อมูลทั่วไปของสำนักงานเขตพื้นที่การศึกษา -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold bg-slate-100 p-2.5 rounded-lg border-l-4 border-blue-700">
              ส่วนที่ 1: ข้อมูลทั่วไปของสำนักงานเขตพื้นที่การศึกษา
            </h3>
            <div class="space-y-3 pl-2 text-sm">
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>1. ชื่อสำนักงานเขตพื้นที่การศึกษา:</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-blue-900">${g.areaOffice}</span>
                  <button onclick="ObecReport.copyText('${g.areaOffice}')" class="text-xs text-blue-600 hover:underline no-print">[คัดลอก]</button>
                </div>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>2. ชื่อ-สกุล ผู้รับผิดชอบโครงการ/ผู้ประสานงานระดับ สพท.:</span>
                <span class="font-medium text-slate-600">[ระบุในฟอร์ม สพฐ.]</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>3. เบอร์โทรศัพท์ติดต่อ:</span>
                <span class="font-medium text-slate-600">[ระบุในฟอร์ม สพฐ.]</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>4. จำนวนสถานศึกษาทั้งหมดในสังกัด:</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">${g.totalSchoolsInArea} แห่ง</span>
                  <button onclick="ObecReport.copyText('${g.totalSchoolsInArea}')" class="text-xs text-blue-600 hover:underline no-print">[คัดลอก]</button>
                </div>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100 bg-amber-50/60 px-2 rounded">
                <span class="font-semibold text-amber-900">5. จำนวนสถานศึกษาในสังกัดที่เข้าร่วม/สนใจระบบธนาคารหน่วยกิตทั้งหมด:</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-amber-900 text-base">${g.participatingSchoolsCount} แห่ง</span>
                  <button onclick="ObecReport.copyText('${g.participatingSchoolsCount}')" class="text-xs text-blue-600 hover:underline no-print">[คัดลอก]</button>
                </div>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100 bg-blue-50/60 px-2 rounded">
                <span class="font-semibold text-blue-900">6. จำนวนผู้เรียนรวมทั้งหมดในสังกัดที่เข้าร่วมระบบธนาคารหน่วยกิต:</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-blue-900 text-base">${g.totalStudentsInCreditBank.toLocaleString()} คน</span>
                  <button onclick="ObecReport.copyText('${g.totalStudentsInCreditBank}')" class="text-xs text-blue-600 hover:underline no-print">[คัดลอก]</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ส่วนที่ 2: จำนวนผู้เรียนตามรูปแบบการเทียบโอน 5 รูปแบบ -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold bg-slate-100 p-2.5 rounded-lg border-l-4 border-blue-700">
              ส่วนที่ 2: จำนวนผู้เรียนตามรูปแบบการเทียบโอน 5 รูปแบบ
            </h3>
            <p class="text-xs text-slate-500">
              คำชี้แจง: โปรดระบุ "จำนวนผู้เรียน" ที่ดำเนินการสะสมหรือเทียบโอนหน่วยกิตตามรูปแบบต่อไปนี้ (1 คนอาจเข้าร่วมได้มากกว่า 1 รูปแบบ หากไม่มีให้กรอกเลข 0)
            </p>

            <div class="space-y-3">
              ${formats.map(function(f) {
                return `
                  <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div class="font-bold text-sm text-slate-800">
                      รูปแบบที่ ${f.id}: ${f.name}
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                      <div class="flex items-center gap-2">
                        <span class="text-slate-500">จำนวนสถานศึกษา:</span>
                        <span class="font-bold text-slate-800 text-sm">${f.schoolsCount} แห่ง</span>
                        <button onclick="ObecReport.copyText('${f.schoolsCount}')" class="text-blue-600 hover:underline no-print">[คัดลอก]</button>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-slate-500">จำนวนผู้เรียน:</span>
                        <span class="font-bold text-blue-700 text-sm">${f.studentsCount.toLocaleString()} คน</span>
                        <button onclick="ObecReport.copyText('${f.studentsCount}')" class="text-blue-600 hover:underline no-print">[คัดลอก]</button>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- ส่วนที่ 3: จำนวนผู้เรียนที่เข้าร่วมขับเคลื่อนโครงการ 9 โครงการ -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold bg-slate-100 p-2.5 rounded-lg border-l-4 border-blue-700">
              ส่วนที่ 3: จำนวนผู้เรียนที่เข้าร่วมขับเคลื่อนโครงการ 9 โครงการ
            </h3>
            <div class="space-y-3">
              ${projects.map(function(p) {
                return `
                  <div class="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div class="text-sm font-semibold text-slate-800">
                        ${p.number}. ${p.title}
                        ${p.details && p.details.length > 0 ? `
                          <span class="text-xs text-slate-500 block">ระบุ: ${p.details.join(", ")}</span>
                        ` : ''}
                      </div>
                      <div class="flex items-center gap-4 text-xs shrink-0 bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        <div class="flex items-center gap-1.5">
                          <span class="text-slate-500">สถานศึกษา:</span>
                          <span class="font-bold text-slate-800">${p.schoolsCount} แห่ง</span>
                          <button onclick="ObecReport.copyText('${p.schoolsCount}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-slate-500">ผู้เรียน:</span>
                          <span class="font-bold text-blue-700">${p.studentsCount.toLocaleString()} คน</span>
                          <button onclick="ObecReport.copyText('${p.studentsCount}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- ส่วนที่ 4: ความพร้อมด้านแพลตฟอร์มและแหล่งเรียนรู้ -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold bg-slate-100 p-2.5 rounded-lg border-l-4 border-blue-700">
              ส่วนที่ 4: ความพร้อมด้านแพลตฟอร์มและแหล่งเรียนรู้ของสถานศึกษา
            </h3>
            <div class="space-y-4 text-xs">
              <!-- แพลตฟอร์ม -->
              <div class="space-y-2">
                <div class="font-bold text-sm text-slate-800">1. แพลตฟอร์มออนไลน์ (Digital Platforms) ที่โรงเรียนใช้งาน:</div>
                <div class="space-y-1.5 pl-2">
                  ${Object.keys(obec.part4_platforms).map(function(k) {
                    var count = obec.part4_platforms[k];
                    return `
                      <div class="flex justify-between items-center py-1 border-b border-slate-100">
                        <span class="text-slate-700">${k}</span>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900">${count} แห่ง</span>
                          <button onclick="ObecReport.copyText('${count}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>

              <!-- แหล่งเรียนรู้ -->
              <div class="space-y-2 pt-2 border-t border-slate-100">
                <div class="font-bold text-sm text-slate-800">2. แหล่งเรียนรู้/หน่วยจัด (Learning Providers) ที่โรงเรียนนำมาเทียบโอน:</div>
                <div class="space-y-1.5 pl-2">
                  ${Object.keys(obec.part4_providers).map(function(k) {
                    var count = obec.part4_providers[k];
                    return `
                      <div class="flex justify-between items-center py-1 border-b border-slate-100">
                        <span class="text-slate-700">${k}</span>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900">${count} แห่ง</span>
                          <button onclick="ObecReport.copyText('${count}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- ส่วนที่ 5: สถานะความก้าวหน้าและการประเมินความพร้อม -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold bg-slate-100 p-2.5 rounded-lg border-l-4 border-blue-700">
              ส่วนที่ 5: สถานะความก้าวหน้าและการประเมินความพร้อม
            </h3>
            <div class="space-y-4 text-xs">
              <!-- การขึ้นทะเบียน -->
              <div class="space-y-2">
                <div class="font-bold text-sm text-slate-800">1. สถานะการขึ้นทะเบียนระบบธนาคารหน่วยกิตของสถานศึกษา:</div>
                <div class="space-y-1.5 pl-2">
                  ${Object.keys(obec.part5_registration).map(function(k) {
                    var count = obec.part5_registration[k];
                    return `
                      <div class="flex justify-between items-center py-1 border-b border-slate-100">
                        <span class="text-slate-700">${k}</span>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900">${count} แห่ง</span>
                          <button onclick="ObecReport.copyText('${count}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>

              <!-- MOU -->
              <div class="space-y-2 pt-2 border-t border-slate-100">
                <div class="font-bold text-sm text-slate-800">2. การจัดทำเครือข่ายความร่วมมือ (MOU):</div>
                <div class="space-y-1.5 pl-2">
                  ${Object.keys(obec.part5_mou).map(function(k) {
                    var count = obec.part5_mou[k];
                    return `
                      <div class="flex justify-between items-center py-1 border-b border-slate-100">
                        <span class="text-slate-700">${k}</span>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900">${count} แห่ง</span>
                          <button onclick="ObecReport.copyText('${count}')" class="text-blue-600 no-print">[คัดลอก]</button>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- ช่องลงนามท้ายเอกสารราชการ (สำหรับพิมพ์) -->
          <div class="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div class="space-y-12">
              <div>
                <p>ลงชื่อ..............................................................ผู้รายงาน</p>
                <p class="text-slate-500 mt-1">(..............................................................)</p>
                <p class="text-slate-400">ตำแหน่ง..........................................................</p>
              </div>
              <p>วันที่.........เดือน..........................พ.ศ. 2570</p>
            </div>
            <div class="space-y-12">
              <div>
                <p>ลงชื่อ..............................................................ผู้รับรองข้อมูล</p>
                <p class="text-slate-500 mt-1">(..............................................................)</p>
                <p class="text-slate-400">ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1</p>
              </div>
              <p>วันที่.........เดือน..........................พ.ศ. 2570</p>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.safeRenderIcons) window.safeRenderIcons();
  }

  // คัดลอกข้อความลงคลิปบอร์ด
  function copyText(text) {
    if (!navigator.clipboard) {
      window.App.showToast("คัดลอก: " + text, "info");
      return;
    }
    navigator.clipboard.writeText(String(text)).then(function() {
      window.App.showToast("คัดลอกค่า '" + text + "' แล้ว", "success");
    }).catch(function() {
      window.App.showToast("ไม่สามารถคัดลอกได้", "warning");
    });
  }

  // คัดลอกสรุปทั้งหมดเป็นข้อความพร้อมกรอก
  function copyAllData() {
    var adminData = window.AdminPortal.getAdminData();
    if (!adminData) return;
    var obec = adminData.obecSummary;
    var g = obec.part1_general;

    var summaryText = `รายงานสรุป Credit Bank สพป.น่าน เขต 1 ส่ง สพฐ.
1. สพท.: ${g.areaOffice}
2. จำนวนสถานศึกษาทั้งหมด: ${g.totalSchoolsInArea} แห่ง
3. สถานศึกษาที่เข้าร่วม Credit Bank: ${g.participatingSchoolsCount} แห่ง
4. จำนวนผู้เรียนสะสมหน่วยกิตรวม: ${g.totalStudentsInCreditBank} คน

[5 รูปแบบเทียบโอน]
${obec.part2_formats.map(function(f) { return `${f.name}: ${f.schoolsCount} แห่ง, ${f.studentsCount} คน`; }).join("\n")}

[9 โครงการขับเคลื่อน]
${obec.part3_projects.map(function(p) { return `${p.title}: ${p.schoolsCount} แห่ง, ${p.studentsCount} คน`; }).join("\n")}
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      window.App.showToast("คัดลอกข้อมูลสรุปทั้งหมดเรียบร้อยแล้ว", "success");
    }
  }

  return {
    init: init,
    copyText: copyText,
    copyAllData: copyAllData
  };
})();
