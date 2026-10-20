/**
 * SurveyForm Module
 * แบบสำรวจข้อมูล Credit Bank สำหรับสถานศึกษา
 * ออกแบบให้เข้าใจง่าย ไม่ซับซ้อน เหมาะสำหรับผู้ใช้ช่วงอายุ 23 - 60 ปี
 */
window.SurveyForm = (function() {
  var currentStep = 1;
  var totalSteps = 6;
  var formData = {};

  // ค่าเริ่มต้นของฟอร์ม
  var defaultFormData = {
    schoolName: "",
    schoolCode: "",
    areaOffice: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1",
    schoolSize: "กลาง",
    respondentName: "",
    respondentPhone: "",
    studentTotal: "",
    // ส่วนที่ 2: 5 รูปแบบ
    format1_students: 0,
    format2_students: 0,
    format3_students: 0,
    format4_students: 0,
    format5_students: 0,
    // ส่วนที่ 3: 9 โครงการ
    project1_students: 0,
    project2_students: 0,
    project3_students: 0,
    project4_students: 0,
    project5_students: 0,
    project6_students: 0,
    project7_students: 0,
    project8_students: 0,
    project9_name: "",
    project9_students: 0,
    // ส่วนที่ 4: แพลตฟอร์ม & แหล่งเรียนรู้
    platforms: [],
    learningProviders: [],
    // ส่วนที่ 5: ความพร้อม
    registrationStatus: "",
    mouStatus: "",
    personnelReadiness: "",
    digitalTechReadiness: "",
    // ส่วนที่ 6: งบประมาณ & อุปสรรค
    budgetFocus: [],
    obstacles: [],
    obstaclesOther: ""
  };

  function init() {
    loadDraft();
    renderForm();
  }

  // โหลดข้อมูลร่างที่บันทึกไว้
  function loadDraft() {
    var saved = localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.DRAFT_SURVEY);
    if (saved) {
      try {
        formData = Object.assign({}, defaultFormData, JSON.parse(saved));
        return;
      } catch (e) {}
    }
    formData = Object.assign({}, defaultFormData);
  }

  // บันทึกร่างอัตโนมัติ
  function saveDraft() {
    localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.DRAFT_SURVEY, JSON.stringify(formData));
  }

  function clearDraft() {
    if (confirm("คุณต้องการล้างข้อมูลที่กรอกไว้ทั้งหมด และเริ่มต้นใหม่ใช่หรือไม่?")) {
      localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.DRAFT_SURVEY);
      formData = Object.assign({}, defaultFormData);
      currentStep = 1;
      renderForm();
      window.App.showToast("ล้างข้อมูลเรียบร้อยแล้ว", "info");
    }
  }

  // Render ฟอร์มทั้งหมด
  function renderForm() {
    var container = document.getElementById("survey-content");
    if (!container) return;

    var html = `
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- แถบความคืบหน้า (Progress Steps) -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-3 text-sm font-medium text-slate-500">
            <span class="flex items-center gap-1.5 text-blue-700 font-semibold">
              <i data-lucide="clipboard-list" class="w-4 h-4"></i> ขั้นตอนที่ ${currentStep} จาก ${totalSteps}
            </span>
            <span>ความคืบหน้า: ${Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div class="bg-blue-600 h-full rounded-full transition-all duration-300" style="width: ${(currentStep / totalSteps) * 100}%"></div>
          </div>
          
          <!-- Step Labels -->
          <div class="grid grid-cols-6 gap-1 mt-4 text-xs text-center font-medium">
            <span class="${currentStep >= 1 ? 'text-blue-700 font-bold' : 'text-slate-400'}">1. ข้อมูลทั่วไป</span>
            <span class="${currentStep >= 2 ? 'text-blue-700 font-bold' : 'text-slate-400'}">2. 5 รูปแบบ</span>
            <span class="${currentStep >= 3 ? 'text-blue-700 font-bold' : 'text-slate-400'}">3. 9 โครงการ</span>
            <span class="${currentStep >= 4 ? 'text-blue-700 font-bold' : 'text-slate-400'}">4. แหล่งเรียนรู้</span>
            <span class="${currentStep >= 5 ? 'text-blue-700 font-bold' : 'text-slate-400'}">5. ความพร้อม</span>
            <span class="${currentStep >= 6 ? 'text-blue-700 font-bold' : 'text-slate-400'}">6. งบ & อุปสรรค</span>
          </div>
        </div>

        <!-- กล่องเนื้อหาแต่ละขั้นตอน -->
        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm" id="step-body">
          ${getStepContentHtml(currentStep)}
        </div>

        <!-- แถบปุ่มนำทาง (Navigation Buttons) -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            ${currentStep > 1 ? `
              <button onclick="SurveyForm.prevStep()" class="btn-secondary w-full sm:w-auto">
                <i data-lucide="arrow-left" class="w-5 h-5"></i> ย้อนกลับ
              </button>
            ` : `
              <button onclick="SurveyForm.clearDraft()" class="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 p-2">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i> ล้างข้อมูลเริ่มใหม่
              </button>
            `}
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto">
            <button onclick="SurveyForm.manualSaveDraft()" class="btn-secondary w-1/2 sm:w-auto text-sm text-slate-600">
              <i data-lucide="save" class="w-4 h-4"></i> บันทึกร่างไว้ก่อน
            </button>

            ${currentStep < totalSteps ? `
              <button onclick="SurveyForm.nextStep()" class="btn-primary w-1/2 sm:w-auto">
                ถัดไป <i data-lucide="arrow-right" class="w-5 h-5"></i>
              </button>
            ` : `
              <button onclick="SurveyForm.openConfirmModal()" class="btn-primary bg-emerald-600 hover:bg-emerald-700 w-1/2 sm:w-auto text-white shadow-lg shadow-emerald-600/20">
                <i data-lucide="check-circle" class="w-5 h-5"></i> ตรวจทานและส่งข้อมูล
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.safeRenderIcons) window.safeRenderIcons();
  }

  // เนื้อหาแต่ละขั้นตอน
  function getStepContentHtml(step) {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return "";
    }
  }

  // --- ขั้นตอนที่ 1: ข้อมูลทั่วไปของสถานศึกษา ---
  function renderStep1() {
    var schools = window.MASTER_SCHOOLS_DATA || [];
    var sizes = window.CREDIT_BANK_QUESTIONS.general.schoolSizes;

    return `
      <div class="space-y-6">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 1 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">ข้อมูลทั่วไปของสถานศึกษา</h2>
          <p class="text-slate-500 text-sm mt-1">โปรดเลือกสถานศึกษาในสังกัด สพป.น่าน เขต 1 (34 โรงเรียน) และกรอกข้อมูลผู้รับผิดชอบ</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 1. เลือกชื่อสถานศึกษา -->
          <div class="md:col-span-2">
            <label class="block text-base font-semibold text-slate-800 mb-2">
              1. ชื่อสถานศึกษา <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select id="input_schoolName" onchange="SurveyForm.onSchoolSelect(this.value)" class="input-gov text-lg pr-10">
                <option value="">-- โปรดเลือกสถานศึกษาของท่าน (34 แห่ง) --</option>
                ${schools.map(function(s) {
                  var sel = formData.schoolName === s.name ? 'selected' : '';
                  return `<option value="${s.name}" ${sel}>${s.name} (อ.${s.district})</option>`;
                }).join("")}
              </select>
            </div>
            <p class="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              <i data-lucide="info" class="w-3.5 h-3.5 text-blue-600"></i> เมื่อเลือกโรงเรียนแล้ว รหัสสถานศึกษาและขนาดจะถูกดึงให้อัตโนมัติ
            </p>
          </div>

          <!-- 2. รหัสสถานศึกษา 10 หลัก -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              2. รหัสสถานศึกษา (10 หลัก) <span class="text-red-500">*</span>
            </label>
            <input type="text" id="input_schoolCode" maxlength="10" 
              value="${formData.schoolCode || ''}" 
              oninput="SurveyForm.updateField('schoolCode', this.value.replace(/[^0-9]/g, ''))"
              placeholder="เช่น 1055250006" 
              class="input-gov font-mono text-base" />
            <p class="text-xs text-slate-400 mt-1">กำหนดค่าเป็นตัวเลขเท่านั้น (10 หลัก)</p>
          </div>

          <!-- 3. สังกัด สพท. -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              3. สังกัดสำนักงานเขตพื้นที่การศึกษา
            </label>
            <input type="text" value="${formData.areaOffice}" disabled 
              class="input-gov bg-slate-100 text-slate-600 cursor-not-allowed font-medium" />
          </div>

          <!-- 4. ขนาดสถานศึกษา -->
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              4. ขนาดสถานศึกษา <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              ${sizes.map(function(sz) {
                var isChecked = formData.schoolSize === sz.id;
                return `
                  <div onclick="SurveyForm.updateField('schoolSize', '${sz.id}'); SurveyForm.renderForm();" 
                    class="choice-card text-center ${isChecked ? 'selected' : ''}">
                    <div class="font-bold text-base text-slate-800">${sz.label}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${sz.desc}</div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- 5. ชื่อ-สกุล ผู้รับผิดชอบ -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              5. ชื่อ-สกุล ผู้รับผิดชอบงานธนาคารหน่วยกิต <span class="text-red-500">*</span>
            </label>
            <input type="text" id="input_respondentName" 
              value="${formData.respondentName || ''}" 
              oninput="SurveyForm.updateField('respondentName', this.value)"
              placeholder="เช่น ครูสมชาย ใจดี / ผอ.สมหญิง มีสุข" 
              class="input-gov text-base" />
          </div>

          <!-- 6. เบอร์โทรศัพท์ติดต่อ -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              6. เบอร์โทรศัพท์ติดต่อ <span class="text-red-500">*</span>
            </label>
            <input type="tel" id="input_respondentPhone" 
              value="${formData.respondentPhone || ''}" 
              oninput="SurveyForm.updateField('respondentPhone', this.value)"
              placeholder="เช่น 081-234-5678" 
              class="input-gov text-base" />
          </div>

          <!-- 7. จำนวนนักเรียนทั้งหมดในโรงเรียน -->
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              7. จำนวนนักเรียนทั้งหมดในสถานศึกษา (คน) <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-3">
              <input type="number" min="1" id="input_studentTotal" 
                value="${formData.studentTotal || ''}" 
                oninput="SurveyForm.updateField('studentTotal', this.value)"
                placeholder="ระบุจำนวนนักเรียนทั้งหมดในโรงเรียน" 
                class="input-gov text-lg font-semibold max-w-xs" />
              <span class="text-slate-600 font-medium text-base">คน</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">กำหนดค่าเป็นตัวเลขเท่านั้น (รวมนักเรียนทุกระดับชั้นในโรงเรียน)</p>
          </div>
        </div>
      </div>
    `;
  }

  // --- ขั้นตอนที่ 2: 5 รูปแบบการเทียบโอน ---
  function renderStep2() {
    var models = window.CREDIT_BANK_QUESTIONS.transferModels;
    var totalCreditStudents = 
      (Number(formData.format1_students) || 0) +
      (Number(formData.format2_students) || 0) +
      (Number(formData.format3_students) || 0) +
      (Number(formData.format4_students) || 0) +
      (Number(formData.format5_students) || 0);

    return `
      <div class="space-y-6">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 2 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">จำนวนผู้เรียนตามรูปแบบการเทียบโอน 5 รูปแบบ</h2>
          <p class="text-slate-600 text-sm mt-1">
            <strong>คำชี้แจง:</strong> โปรดระบุ <strong>"จำนวนผู้เรียน"</strong> ที่ดำเนินการสะสมหรือเทียบโอนหน่วยกิตตามรูปแบบต่อไปนี้ (1 คนอาจเข้าร่วมได้มากกว่า 1 รูปแบบ <strong>หากไม่มีให้กรอกเลข 0</strong>)
          </p>
        </div>

        <!-- กล่องสรุปผลรวมสด -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-xs text-blue-800 font-medium">รวมผู้เรียนสะสมหน่วยกิต 5 รูปแบบ</div>
              <div class="text-xl font-bold text-blue-900">${totalCreditStudents.toLocaleString()} คน</div>
            </div>
          </div>
          <span class="text-xs px-2.5 py-1 bg-white text-blue-800 border border-blue-200 rounded-full font-medium">
            คำนวณอัตโนมัติ
          </span>
        </div>

        <!-- รายการ 5 รูปแบบ -->
        <div class="space-y-4">
          ${models.map(function(m) {
            var fieldKey = "format" + m.number + "_students";
            var currentVal = Number(formData[fieldKey]) || 0;

            return `
              <div class="p-5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition-all space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">${m.number}</span>
                      <h3 class="text-base font-bold text-slate-800">${m.name}</h3>
                      <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">${m.badge}</span>
                    </div>
                    <p class="text-sm text-slate-600 leading-relaxed">${m.fullDesc}</p>
                  </div>
                </div>

                <!-- ช่องกรอกจำนวนคนพร้อมปุ่มเพิ่ม/ลด -->
                <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <label class="text-sm font-semibold text-slate-700">จำนวนผู้เรียน:</label>
                  <div class="flex items-center gap-2">
                    <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', -1)" class="stepper-btn">-</button>
                    <input type="number" min="0" 
                      value="${currentVal}" 
                      oninput="SurveyForm.updateNumberField('${fieldKey}', this.value)"
                      class="input-gov w-24 text-center font-bold text-lg" />
                    <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', 1)" class="stepper-btn">+</button>
                    <span class="text-sm text-slate-600 font-medium">คน</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // --- ขั้นตอนที่ 3: 9 โครงการ ---
  function renderStep3() {
    var projects = window.CREDIT_BANK_QUESTIONS.projects;

    return `
      <div class="space-y-6">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 3 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">จำนวนผู้เรียนที่เข้าร่วมขับเคลื่อนโครงการ 9 โครงการ</h2>
          <p class="text-slate-600 text-sm mt-1">
            <strong>คำชี้แจง:</strong> โปรดระบุ <strong>"จำนวนผู้เรียน"</strong> ที่เข้าร่วมโครงการที่เกี่ยวข้องกับระบบธนาคารหน่วยกิตดังต่อไปนี้ (<strong>หากไม่มีให้กรอกเลข 0</strong>)
          </p>
        </div>

        <div class="space-y-4">
          ${projects.map(function(p) {
            var fieldKey = "project" + p.number + "_students";
            var currentVal = Number(formData[fieldKey]) || 0;

            if (p.isCustom) {
              return `
                <div class="p-5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">9</span>
                    <h3 class="text-base font-bold text-slate-800">${p.title}</h3>
                  </div>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-slate-600 mb-1">ระบุชื่อโครงการอื่นๆ (ถ้ามี):</label>
                      <input type="text" 
                        value="${formData.project9_name || ''}" 
                        oninput="SurveyForm.updateField('project9_name', this.value)"
                        placeholder="เช่น โครงการเสริมทักษะอาชีพระยะสั้น" 
                        class="input-gov text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-slate-600 mb-1">จำนวนผู้เรียน (คน):</label>
                      <div class="flex items-center gap-2">
                        <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', -1)" class="stepper-btn">-</button>
                        <input type="number" min="0" 
                          value="${currentVal}" 
                          oninput="SurveyForm.updateNumberField('${fieldKey}', this.value)"
                          class="input-gov text-center font-bold text-lg" />
                        <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', 1)" class="stepper-btn">+</button>
                        <span class="text-sm text-slate-600">คน</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }

            return `
              <div class="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition-all">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">${p.number}</span>
                      <h3 class="text-base font-semibold text-slate-800">${p.title}</h3>
                    </div>
                    <p class="text-xs text-slate-500 pl-8">${p.desc}</p>
                  </div>

                  <div class="flex items-center self-end sm:self-center gap-2 pl-8 sm:pl-0">
                    <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', -1)" class="stepper-btn">-</button>
                    <input type="number" min="0" 
                      value="${currentVal}" 
                      oninput="SurveyForm.updateNumberField('${fieldKey}', this.value)"
                      class="input-gov w-24 text-center font-bold text-lg" />
                    <button type="button" onclick="SurveyForm.stepNumber('${fieldKey}', 1)" class="stepper-btn">+</button>
                    <span class="text-sm text-slate-600 font-medium">คน</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // --- ขั้นตอนที่ 4: แพลตฟอร์ม & แหล่งเรียนรู้ ---
  function renderStep4() {
    var p4 = window.CREDIT_BANK_QUESTIONS.part4;

    return `
      <div class="space-y-8">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 4 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">ความพร้อมด้านแพลตฟอร์มและแหล่งเรียนรู้ของสถานศึกษา</h2>
          <p class="text-slate-500 text-sm mt-1">เลือกคำตอบที่ตรงกับการดำเนินงานของโรงเรียน (สามารถเลือกได้มากกว่า 1 ข้อ)</p>
        </div>

        <!-- 1. แพลตฟอร์มออนไลน์ -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">
              1. แพลตฟอร์มออนไลน์ (Digital Platforms) ที่โรงเรียนใช้งานเพื่อการสะสมหน่วยกิต/คลังรายวิชา
            </h3>
            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">เลือกได้มากกว่า 1 ข้อ</span>
          </div>

          <div class="space-y-2.5">
            ${p4.platforms.map(function(item) {
              var isChecked = formData.platforms.includes(item.label);
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}">
                  <input type="checkbox" class="w-5 h-5 rounded text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''}
                    onchange="SurveyForm.toggleArrayField('platforms', '${item.label}')" />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 2. แหล่งเรียนรู้/หน่วยจัด -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">
              2. แหล่งเรียนรู้/หน่วยจัด (Learning Providers) ที่โรงเรียนนำมาเทียบโอนหรือใช้จัดทำ Micro-credentials
            </h3>
            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">เลือกได้มากกว่า 1 ข้อ</span>
          </div>

          <div class="space-y-2.5">
            ${p4.providers.map(function(item) {
              var isChecked = formData.learningProviders.includes(item.label);
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}">
                  <input type="checkbox" class="w-5 h-5 rounded text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''}
                    onchange="SurveyForm.toggleArrayField('learningProviders', '${item.label}')" />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // --- ขั้นตอนที่ 5: สถานะความก้าวหน้าและการประเมินความพร้อม ---
  function renderStep5() {
    var p5 = window.CREDIT_BANK_QUESTIONS.part5;

    return `
      <div class="space-y-8">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 5 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">สถานะความก้าวหน้าและการประเมินความพร้อม</h2>
          <p class="text-slate-500 text-sm mt-1">โปรดเลือกคำตอบที่ตรงกับสถานะจริงของสถานศึกษามากที่สุด (เลือกข้อเดียวในแต่ละหัวข้อ)</p>
        </div>

        <!-- 1. สถานะการขึ้นทะเบียน -->
        <div class="space-y-3">
          <h3 class="text-base font-bold text-slate-800">1. สถานะการขึ้นทะเบียนระบบธนาคารหน่วยกิตของสถานศึกษา <span class="text-red-500">*</span></h3>
          <div class="space-y-2">
            ${p5.registrationStatus.map(function(item) {
              var isChecked = formData.registrationStatus === item.label;
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}" 
                  onclick="SurveyForm.updateField('registrationStatus', '${item.label}'); SurveyForm.renderForm();">
                  <input type="radio" name="registrationStatus" class="w-5 h-5 text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''} />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 2. การจัดทำ MOU -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <h3 class="text-base font-bold text-slate-800">2. การจัดทำเครือข่ายความร่วมมือ (MOU) <span class="text-red-500">*</span></h3>
          <div class="space-y-2">
            ${p5.mouStatus.map(function(item) {
              var isChecked = formData.mouStatus === item.label;
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}"
                  onclick="SurveyForm.updateField('mouStatus', '${item.label}'); SurveyForm.renderForm();">
                  <input type="radio" name="mouStatus" class="w-5 h-5 text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''} />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 3. ความพร้อมบุคลากร -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <h3 class="text-base font-bold text-slate-800">3. ความพร้อมด้านบุคลากรและการจัดระบบเทียบโอน <span class="text-red-500">*</span></h3>
          <div class="space-y-2">
            ${p5.personnelReadiness.map(function(item) {
              var isChecked = formData.personnelReadiness === item.label;
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}"
                  onclick="SurveyForm.updateField('personnelReadiness', '${item.label}'); SurveyForm.renderForm();">
                  <input type="radio" name="personnelReadiness" class="w-5 h-5 text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''} />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 4. ความพร้อมด้านดิจิทัล -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <h3 class="text-base font-bold text-slate-800">4. ความพร้อมด้านเทคโนโลยีดิจิทัลและระบบจัดเก็บข้อมูล <span class="text-red-500">*</span></h3>
          <div class="space-y-2">
            ${p5.digitalTechReadiness.map(function(item) {
              var isChecked = formData.digitalTechReadiness === item.label;
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}"
                  onclick="SurveyForm.updateField('digitalTechReadiness', '${item.label}'); SurveyForm.renderForm();">
                  <input type="radio" name="digitalTechReadiness" class="w-5 h-5 text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''} />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // --- ขั้นตอนที่ 6: คำของบประมาณ ปัญหา และอุปสรรค ---
  function renderStep6() {
    var p6 = window.CREDIT_BANK_QUESTIONS.part6;

    return `
      <div class="space-y-8">
        <div class="border-b border-slate-100 pb-4">
          <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">ส่วนที่ 6 จาก 6</span>
          <h2 class="text-2xl font-bold text-slate-800">คำของบประมาณ ปัญหา และอุปสรรค</h2>
          <p class="text-slate-500 text-sm mt-1">ข้อมูลในส่วนนี้จะถูกนำไปใช้วางแผนการสนับสนุนและจัดสรรงบประมาณของ สพป.น่าน เขต 1</p>
        </div>

        <!-- 1. คำของบประมาณ -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">
              1. หากได้รับงบประมาณ สถานศึกษาจะมุ่งเน้นนำไปใช้ในด้านใดเป็นหลัก
            </h3>
            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">เลือกได้มากกว่า 1 ข้อ</span>
          </div>

          <div class="space-y-2.5">
            ${p6.budgetFocus.map(function(item) {
              var isChecked = formData.budgetFocus.includes(item.label);
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}">
                  <input type="checkbox" class="w-5 h-5 rounded text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''}
                    onchange="SurveyForm.toggleArrayField('budgetFocus', '${item.label}')" />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 2. ปัญหาและอุปสรรค -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">
              2. ปัญหาและอุปสรรคสำคัญที่พบในการดำเนินงานระดับสถานศึกษา
            </h3>
            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">เลือกได้มากกว่า 1 ข้อ</span>
          </div>

          <div class="space-y-2.5">
            ${p6.obstacles.map(function(item) {
              var isChecked = formData.obstacles.includes(item.label);
              return `
                <label class="choice-card flex items-start gap-3 ${isChecked ? 'selected' : ''}">
                  <input type="checkbox" class="w-5 h-5 rounded text-blue-600 mt-0.5 cursor-pointer"
                    ${isChecked ? 'checked' : ''}
                    onchange="SurveyForm.toggleArrayField('obstacles', '${item.label}')" />
                  <span class="text-sm text-slate-800 font-medium leading-relaxed">${item.label}</span>
                </label>
              `;
            }).join("")}
          </div>

          <!-- อื่นๆ ระบุ -->
          <div class="pt-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1">ปัญหาและอุปสรรคอื่นๆ (โปรดระบุ ถ้ามี):</label>
            <textarea rows="3" 
              oninput="SurveyForm.updateField('obstaclesOther', this.value)"
              placeholder="ระบุข้อคิดเห็น หรือข้อเสนอแนะเพิ่มเติม..."
              class="input-gov text-sm">${formData.obstaclesOther || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  // ตัวจัดการ Event เมื่อเลือกโรงเรียน
  function onSchoolSelect(schoolName) {
    formData.schoolName = schoolName;
    var master = window.MASTER_SCHOOLS_DATA || [];
    var match = master.find(function(m) { return m.name === schoolName; });
    if (match) {
      formData.schoolCode = match.code;
      formData.schoolSize = match.defaultSize || "กลาง";
    }
    saveDraft();
    renderForm();
  }

  // อัปเดตข้อมูลใน formData
  function updateField(key, value) {
    formData[key] = value;
    saveDraft();
  }

  function updateNumberField(key, value) {
    formData[key] = Math.max(0, parseInt(value, 10) || 0);
    saveDraft();
  }

  function stepNumber(key, delta) {
    var cur = Number(formData[key]) || 0;
    formData[key] = Math.max(0, cur + delta);
    saveDraft();
    renderForm();
  }

  function toggleArrayField(key, value) {
    if (!Array.isArray(formData[key])) formData[key] = [];
    var idx = formData[key].indexOf(value);
    if (idx > -1) {
      formData[key].splice(idx, 1);
    } else {
      formData[key].push(value);
    }
    saveDraft();
    renderForm();
  }

  // เลื่อนไปขั้นตอนถัดไป พร้อมการตรวจสอบความถูกต้อง (Validation)
  function nextStep() {
    if (!validateCurrentStep(currentStep)) return;
    if (currentStep < totalSteps) {
      currentStep++;
      renderForm();
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      renderForm();
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  }

  // การตรวจสอบความถูกต้อง
  function validateCurrentStep(step) {
    if (step === 1) {
      if (!formData.schoolName) {
        window.App.showToast("กรุณาเลือกชื่อสถานศึกษาของท่าน", "warning");
        return false;
      }
      if (!formData.schoolCode || formData.schoolCode.length !== 10) {
        window.App.showToast("กรุณาระบุรหัสสถานศึกษาให้ครบ 10 หลัก", "warning");
        return false;
      }
      if (!formData.respondentName.trim()) {
        window.App.showToast("กรุณาระบุชื่อ-สกุล ผู้รับผิดชอบงานธนาคารหน่วยกิต", "warning");
        return false;
      }
      if (!formData.respondentPhone.trim()) {
        window.App.showToast("กรุณาระบุเบอร์โทรศัพท์ติดต่อ", "warning");
        return false;
      }
      if (!formData.studentTotal || Number(formData.studentTotal) <= 0) {
        window.App.showToast("กรุณาระบุจำนวนนักเรียนทั้งหมดในโรงเรียน", "warning");
        return false;
      }
    } else if (step === 5) {
      if (!formData.registrationStatus) {
        window.App.showToast("กรุณาเลือกสถานะการขึ้นทะเบียนระบบธนาคารหน่วยกิต", "warning");
        return false;
      }
      if (!formData.mouStatus) {
        window.App.showToast("กรุณาเลือกสถานะการจัดทำ MOU", "warning");
        return false;
      }
      if (!formData.personnelReadiness) {
        window.App.showToast("กรุณาเลือกความพร้อมด้านบุคลากร", "warning");
        return false;
      }
      if (!formData.digitalTechReadiness) {
        window.App.showToast("กรุณาเลือกความพร้อมด้านเทคโนโลยีดิจิทัล", "warning");
        return false;
      }
    }
    return true;
  }

  function manualSaveDraft() {
    saveDraft();
    window.App.showToast("บันทึกข้อมูลร่างไว้ในเครื่องเรียบร้อยแล้ว", "success");
  }

  // แสดงหน้าต่างตรวจสอบและยืนยันข้อมูล (Confirmation Modal)
  function openConfirmModal() {
    if (!validateCurrentStep(6)) return;

    var totalStudents = 
      (Number(formData.format1_students) || 0) +
      (Number(formData.format2_students) || 0) +
      (Number(formData.format3_students) || 0) +
      (Number(formData.format4_students) || 0) +
      (Number(formData.format5_students) || 0);

    var modalHtml = `
      <div id="confirm-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <i data-lucide="shield-check" class="w-6 h-6"></i>
              </div>
              <div>
                <h3 class="text-xl font-bold text-slate-800">ตรวจทานข้อมูลก่อนส่งแบบสำรวจ</h3>
                <p class="text-xs text-slate-500">ข้อมูลจะถูกส่งเข้าสู่ระบบฐานข้อมูล สพป.น่าน เขต 1</p>
              </div>
            </div>
            <button onclick="SurveyForm.closeConfirmModal()" class="text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>

          <!-- ตารางสรุปข้อมูลสำคัญ -->
          <div class="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500">สถานศึกษา:</span>
              <span class="font-bold text-blue-900">${formData.schoolName}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500">รหัสสถานศึกษา 10 หลัก:</span>
              <span class="font-mono font-bold">${formData.schoolCode}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500">ผู้รับผิดชอบ:</span>
              <span class="font-medium">${formData.respondentName} (โทร. ${formData.respondentPhone})</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500">นักเรียนทั้งหมดในโรงเรียน:</span>
              <span class="font-bold">${Number(formData.studentTotal).toLocaleString()} คน</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200 bg-blue-50/80 px-2 rounded">
              <span class="text-blue-900 font-semibold">รวมผู้เรียนสะสมหน่วยกิต (5 รูปแบบ):</span>
              <span class="font-bold text-blue-900 text-base">${totalStudents.toLocaleString()} คน</span>
            </div>
            <div class="space-y-1 pt-1 text-xs text-slate-600">
              <div><strong>สถานะขึ้นทะเบียน:</strong> ${formData.registrationStatus || "-"}</div>
              <div><strong>สถานะ MOU:</strong> ${formData.mouStatus || "-"}</div>
            </div>
          </div>

          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0 text-amber-600"></i>
            <span>หากท่านตรวจสอบความถูกต้องเรียบร้อยแล้ว สามารถกดปุ่มยืนยันส่งข้อมูลด้านล่าง ระบบจะออกใบยืนยันการส่งข้อมูลให้ทันที</span>
          </div>

          <!-- ปุ่มกดยืนยัน -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button onclick="SurveyForm.closeConfirmModal()" class="btn-secondary">
              แก้ไขข้อมูล
            </button>
            <button id="btn-submit-final" onclick="SurveyForm.submitForm()" class="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
              <i data-lucide="send" class="w-5 h-5"></i> ยืนยันส่งข้อมูลแบบสำรวจ
            </button>
          </div>
        </div>
      </div>
    `;

    var modalContainer = document.getElementById("modal-root");
    if (modalContainer) {
      modalContainer.innerHTML = modalHtml;
      if (window.safeRenderIcons) window.safeRenderIcons();
    }
  }

  function closeConfirmModal() {
    var modalContainer = document.getElementById("modal-root");
    if (modalContainer) modalContainer.innerHTML = "";
  }

  // ส่งข้อมูลไปยัง API
  async function submitForm() {
    var btn = document.getElementById("btn-submit-final");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> กำลังบันทึกข้อมูล...`;
      if (window.safeRenderIcons) window.safeRenderIcons();
    }

    try {
      formData.clientInfo = navigator.userAgent;
      var resp = await window.ApiService.submitSurvey(formData);

      if (resp.success) {
        closeConfirmModal();
        // เคลียร์ร่าง
        localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.DRAFT_SURVEY);
        // บันทึกใบเสร็จ
        var receipt = {
          referenceId: resp.referenceId,
          schoolName: formData.schoolName,
          schoolCode: formData.schoolCode,
          submittedAt: resp.submittedAt,
          respondentName: formData.respondentName,
          respondentPhone: formData.respondentPhone,
          totalStudents: formData.studentTotal,
          creditStudents: resp.formatsTotal
        };
        localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.SUBMITTED_RECEIPT, JSON.stringify(receipt));

        // ฉลองด้วย Confetti
        if (window.confetti) {
          window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }

        // แสดงหน้าจอสำเร็จพร้อมใบเสร็จ
        showSuccessReceipt(receipt);
      } else {
        window.App.showToast(resp.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i> ยืนยันส่งข้อมูลแบบสำรวจ`;
          if (window.safeRenderIcons) window.safeRenderIcons();
        }
      }
    } catch (err) {
      window.App.showToast("เกิดข้อผิดพลาด: " + err.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i> ยืนยันส่งข้อมูลแบบสำรวจ`;
        if (window.safeRenderIcons) window.safeRenderIcons();
      }
    }
  }

  // แสดงใบยืนยันการส่งข้อมูล (Submission Receipt)
  function showSuccessReceipt(receipt) {
    var container = document.getElementById("survey-content");
    if (!container) return;

    var html = `
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="bg-white p-8 rounded-2xl border border-emerald-200 shadow-xl text-center space-y-4">
          <div class="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <i data-lucide="check-circle-2" class="w-12 h-12"></i>
          </div>

          <h2 class="text-3xl font-bold text-slate-900">ส่งข้อมูลแบบสำรวจเรียบร้อยแล้ว</h2>
          <p class="text-slate-600 text-base">
            สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1 ได้รับข้อมูลการดำเนินงานธนาคารหน่วยกิต (Credit Bank) ของท่านแล้ว
          </p>

          <!-- ใบยืนยันพิมพ์ได้ -->
          <div id="receipt-print-area" class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left space-y-4 font-sarabun mt-6">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div class="text-xs text-slate-500">ใบยืนยันการส่งข้อมูลแบบสำรวจ Credit Bank</div>
              <div class="text-xs font-mono font-bold text-blue-700">${receipt.referenceId}</div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-xs text-slate-500 block">ชื่อสถานศึกษา:</span>
                <span class="font-bold text-slate-800">${receipt.schoolName}</span>
              </div>
              <div>
                <span class="text-xs text-slate-500 block">รหัสสถานศึกษา 10 หลัก:</span>
                <span class="font-mono font-medium">${receipt.schoolCode}</span>
              </div>
              <div>
                <span class="text-xs text-slate-500 block">ผู้รับผิดชอบ:</span>
                <span class="text-slate-800">${receipt.respondentName}</span>
              </div>
              <div>
                <span class="text-xs text-slate-500 block">เบอร์โทรศัพท์:</span>
                <span class="text-slate-800">${receipt.respondentPhone}</span>
              </div>
              <div>
                <span class="text-xs text-slate-500 block">วันเวลาที่ส่งข้อมูล:</span>
                <span class="text-slate-800">${receipt.submittedAt}</span>
              </div>
              <div>
                <span class="text-xs text-slate-500 block">รวมผู้เรียนสะสมหน่วยกิต:</span>
                <span class="font-bold text-emerald-700">${receipt.creditStudents} คน</span>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-3 text-xs text-slate-500 flex items-center justify-between">
              <span>กลุ่มส่งเสริมการจัดการศึกษา สพป.น่าน เขต 1</span>
              <span>สถานะ: บันทึกข้อมูลสมบูรณ์</span>
            </div>
          </div>

          <!-- ปุ่มดำเนินการต่อ -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 no-print">
            <button onclick="window.print()" class="btn-secondary w-full sm:w-auto">
              <i data-lucide="printer" class="w-5 h-5"></i> พิมพ์ / บันทึก PDF ใบยืนยัน
            </button>
            <button onclick="App.switchTab('tracker')" class="btn-primary w-full sm:w-auto">
              <i data-lucide="bar-chart-3" class="w-5 h-5"></i> ดูสถานะ 34 โรงเรียน
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.safeRenderIcons) window.safeRenderIcons();
  }

  return {
    init: init,
    renderForm: renderForm,
    onSchoolSelect: onSchoolSelect,
    updateField: updateField,
    updateNumberField: updateNumberField,
    stepNumber: stepNumber,
    toggleArrayField: toggleArrayField,
    nextStep: nextStep,
    prevStep: prevStep,
    manualSaveDraft: manualSaveDraft,
    clearDraft: clearDraft,
    openConfirmModal: openConfirmModal,
    closeConfirmModal: closeConfirmModal,
    submitForm: submitForm
  };
})();
