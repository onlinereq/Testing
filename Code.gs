

// ── ROUTER ─────────────────────────────────────────────────────
function doGet(e) {
  const params = e ? e.parameter : {};
  if (params.action) {
    return handleRequest(params);
  }
  try {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Leave Request & HR Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  } catch (err) {
    return handleRequest(params);
  }
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    return '';
  }
}

function doPost(e) {
  let params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = e ? e.parameter : {};
  }
  return handleRequest(params);
}

function handleRequest(params) {
  const action = params.action || '';
  let response = { result: 'error', message: 'Invalid action' };

  try {
    switch (action) {
      case 'ping':
        response = { result: 'success', time: new Date().toISOString() };
        break;
      case 'logError':
        response = logError(params);
        break;
      case 'getStaff':
        response = getStaff(params);
        break;
      case 'getAllStaff':
      case 'getStaffList':
        response = getAllStaff(params);
        break;
      case 'getAppInitData':
        response = getAppInitData(params);
        break;
      case 'getHistory':
        response = getHistory(params);
        break;
      case 'getStaffNotices':
        response = getStaffNotices(params);
        break;
      case 'submitRequest':
        response = submitRequest(params);
        break;
      case 'submitNotice':
      case 'sendNotice':
        response = submitNotice(params);
        break;
      case 'hrLogin':
      case 'login':
        response = hrLogin(params);
        break;
      case 'getAllData':
      case 'getDashboardData':
        response = getDashboardData(params);
        break;
      case 'updateStatus':
      case 'updateRequestStatus':
        response = updateRequestStatus(params);
        break;
      case 'deleteRequest':
        response = deleteRequest(params);
        break;
      case 'deleteNotice':
        response = deleteNotice(params);
        break;
      case 'importAttendance':
        response = importAttendance(params);
        break;
      case 'manualEntry':
        response = manualEntry(params);
        break;
      case 'manualNotice':
        response = manualNotice(params);
        break;
      case 'convertLateToLeave':
        response = convertLateToLeave(params);
        break;
      case 'getLateThreshold':
        response = getLateThreshold(params);
        break;
      case 'setLateThreshold':
        response = setLateThreshold(params);
        break;
      case 'getTimedMode':
        response = getTimedMode(params);
        break;
      case 'setTimedMode':
        response = setTimedMode(params);
        break;
      case 'getHolidays':
      case 'getHolidayList':
        response = getHolidays(params);
        break;
      case 'addHoliday':
      case 'saveHoliday':
        response = addHoliday(params);
        break;
      case 'deleteHoliday':
      case 'removeHoliday':
        response = deleteHoliday(params);
        break;
      case 'syncHolidays':
        response = syncHolidays(params);
        break;
      case 'importHolidays':
      case 'bulkSaveHolidays':
      case 'uploadHolidays':
        response = importHolidays(params);
        break;
      case 'wipeTestUser':
        response = wipeTestUser(params);
        break;
      case 'setupInitialSheets':
      case 'setupSheet':
        response = setupInitialSheets();
        break;
      default:
        response = { result: 'error', message: 'Action not found: ' + action };
    }
  } catch (err) {
    response = { result: 'error', message: err.toString(), stack: err.stack };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── STRING & DATA NORMALIZATION HELPERS ─────────────────────────
function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(key) {
  return cleanStr(key).toLowerCase().replace(/[\s_\-()\/\\.:#\*\?\[\]]/g, '');
}

function parseNumeric(val, fallback) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? fallback : num;
}

function normalizeGender(val) {
  if (!val) return '';
  const s = cleanStr(val).toLowerCase();
  if (s.startsWith('f') || s.includes('female') || s === 'ស្រី' || s === 'woman' || s === 'w' || s === 'ស' || s.startsWith('ms') || s.startsWith('mrs') || s.startsWith('miss') || s === '女') return 'Female';
  if (s.startsWith('m') || s.includes('male') || s === 'ប្រុស' || s === 'man' || s === 'ប' || s.startsWith('mr') || s === '男') return 'Male';
  return cleanStr(val);
}

function formatDateISO(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
  }
  const str = cleanStr(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const dmy = str.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{4})/);
  if (dmy) {
    const day = ('0' + dmy[1]).slice(-2);
    const mNames = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
    const m = mNames[dmy[2].slice(0,3).toLowerCase()] || '01';
    return dmy[3] + '-' + m + '-' + day;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    try {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
    } catch(e) {}
  }
  return str;
}

function todayFmtBackend() {
  const d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'GMT+7', 'dd-MMM-yyyy');
}

// ── INTELLIGENT SHEET FINDER ──────────────────────────────────
function findSheetFlexible(possibleNames) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();

  for (let name of possibleNames) {
    let sheet = ss.getSheetByName(name);
    if (sheet) return sheet;
  }

  for (let name of possibleNames) {
    const targetNorm = normalizeKey(name);
    for (let s of allSheets) {
      const sNorm = normalizeKey(s.getName());
      if (sNorm === targetNorm || sNorm.includes(targetNorm) || targetNorm.includes(sNorm)) {
        return s;
      }
    }
  }

  let fallback = ss.getSheetByName(possibleNames[0]);
  if (!fallback) {
    fallback = ss.insertSheet(possibleNames[0]);
  }
  return fallback;
}

function getSheet(sheetName) {
  return findSheetFlexible([sheetName]);
}

function getDataRows(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return [];

  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(data.length, 5); r++) {
    const nonEmpties = data[r].filter(c => cleanStr(c) !== '');
    if (nonEmpties.length >= 1) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) return [];

  const headers = data[headerRowIdx].map(h => cleanStr(h));
  const rows = [];

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    const hasData = row.some(c => cleanStr(c) !== '');
    if (!hasData) continue;

    let obj = {};
    headers.forEach((h, i) => {
      const key = h || ('col_' + i);
      obj[key] = row[i];
    });
    obj._raw = row;
    rows.push(obj);
  }
  return rows;
}

// ── TELEGRAM CONFIGURATION ──────────────────────────────────────
const TELEGRAM_BOT_TOKEN = "8708990326:AAGfkwObhS6W7mDUqSKK61Lo9axiwYITqKE";

const PORTAL_URL = "";

const TELEGRAM_CHAT_ID_NEW_LEAVE   = "-1004455416433"; // 1. New Leave Request destination
const TELEGRAM_CHAT_ID_APPROVED    = "-1004455416433"; // 2. Approved destination
const TELEGRAM_CHAT_ID_REJECTED    = "-1004455416433"; // 3. Reject destination
const TELEGRAM_CHAT_ID_ATTENDANCE  = "-1004455416433"; // 4. Arrived Late & Leave Early destination

const TELEGRAM_CHAT_ID_DECLINED    = TELEGRAM_CHAT_ID_REJECTED;
const TELEGRAM_CHAT_ID_NOTICE      = TELEGRAM_CHAT_ID_ATTENDANCE;

function escapeTelegramHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sendTelegramMessage(chatId, messageText) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_TELEGRAM_BOT_TOKEN" || !chatId) {
    Logger.log("Telegram Bot Token or Chat ID not configured.");
    return;
  }
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  const payload = {
    chat_id: chatId,
    text: messageText,
    parse_mode: "HTML"
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    if (code !== 200) {
      Logger.log("Telegram API returned status " + code + ": " + res.getContentText());
    }
  } catch (err) {
    Logger.log("Error sending Telegram message: " + err.toString());
  }
}

function getWebAppUrl() {
  if (typeof PORTAL_URL !== 'undefined' && PORTAL_URL && PORTAL_URL.trim() !== "") {
    return PORTAL_URL.trim();
  }
  try {
    const url = ScriptApp.getService().getUrl();
    if (url) return url;
  } catch (e) {
    Logger.log("Could not get Web App URL dynamically: " + e.toString());
  }
  return "https://script.google.com/macros/s/AKfycbxYjeoCtNv3G9UScOl0AW2H3KZazvFF02Yxd8BX7qw6QJt16g_SRYZJYM1aZU-qvqOt/exec";
}

function notifyTelegramLeave(params, reqId) {
  const leaveType = String(params.leaveType || '').toLowerCase();
  let chatId = TELEGRAM_CHAT_ID_NEW_LEAVE;
  let title = "<b>NEW LEAVE REQUEST</b>";

  if (leaveType.includes("late") || leaveType.includes("arrive late")) {
    chatId = TELEGRAM_CHAT_ID_ATTENDANCE;
    title = "<b>ARRIVE LATE REQUEST</b>";
  } else if (leaveType.includes("early") || leaveType.includes("leave early")) {
    chatId = TELEGRAM_CHAT_ID_ATTENDANCE;
    title = "<b>LEAVE EARLY REQUEST</b>";
  }

  const msg = [
    title,
    "──────────────",
    "<b>ID:</b> " + escapeTelegramHtml(params.employeeId || "-"),
    "<b>Name:</b> " + escapeTelegramHtml(params.name || "-"),
    "<b>Position:</b> " + escapeTelegramHtml(params.position || "-"),
    "<b>Type:</b> " + escapeTelegramHtml(params.leaveType || "-"),
    "<b>From:</b> " + escapeTelegramHtml(params.dateFrom ? formatDateISO(params.dateFrom) : "-"),
    "<b>To:</b> " + escapeTelegramHtml(params.dateTo ? formatDateISO(params.dateTo) : "-"),
    "<b>Duration:</b> " + escapeTelegramHtml(params.workingDays || "0") + " day(s)",
    "<b>Reason:</b> " + escapeTelegramHtml(params.reason || "-"),
    "<b>Submitted:</b> " + escapeTelegramHtml(params.submissionDate || todayFmtBackend()),
    "<b>Status:</b> " + escapeTelegramHtml(params.status || "Pending"),
    "──────────────",
    "<i>Request ID: " + escapeTelegramHtml(reqId) + "</i>"
  ].join("\n");

  sendTelegramMessage(chatId, msg);

  const deepLink = getWebAppUrl() + "?req=" + encodeURIComponent(reqId);
  const actionMsg = 'Approve/Reject via this link [<a href="' + deepLink + '">' + deepLink + '</a>]';
  sendTelegramMessage(chatId, actionMsg);
}

function notifyTelegramNotice(params, noticeId) {
  const rawType = String(params.noticeType || '').toLowerCase();
  const isLate = rawType.includes('late') || rawType.includes('arrive');
  const isEarly = rawType.includes('early') || rawType.includes('leave');

  let title = "<b>NEW NOTICE LETTER</b>";
  let typeLabel = params.noticeType || "Notice";

  if (isEarly) {
    title = "<b>LEAVE EARLY NOTICE</b>";
    typeLabel = "Leave Early";
  } else if (isLate) {
    title = "<b>ARRIVED LATE NOTICE</b>";
    typeLabel = "Arrived Late";
  }

  const msg = [
    title,
    "──────────────",
    "<b>Employee ID:</b> " + escapeTelegramHtml(params.employeeId || "-"),
    "<b>Name:</b> " + escapeTelegramHtml(params.name || "-"),
    "<b>Notice Type:</b> " + escapeTelegramHtml(typeLabel),
    "<b>Date / Time:</b> " + escapeTelegramHtml(params.effectiveDate || "-"),
    "<b>Reason / Details:</b> " + escapeTelegramHtml(params.reason || "-"),
    "──────────────",
    "<i>Notice ID: " + escapeTelegramHtml(noticeId) + "</i>"
  ].join("\n");

  sendTelegramMessage(TELEGRAM_CHAT_ID_ATTENDANCE, msg);
}

function notifyTelegramLeaveStatus(params, reqId) {
  const status = cleanStr(params.status || 'Approved');
  const isApprove = status.toLowerCase() === 'approved';

  let chatId = isApprove ? TELEGRAM_CHAT_ID_APPROVED : TELEGRAM_CHAT_ID_REJECTED;
  const statusBadge = isApprove ? 'APPROVED' : 'REJECTED';
  let title = "<b>LEAVE REQUEST " + statusBadge + "</b>";

  const msgLines = [
    title,
    "──────────────",
    "<b>ID:</b> " + escapeTelegramHtml(params.employeeId || "-"),
    "<b>Name:</b> " + escapeTelegramHtml(params.name || "-"),
    "<b>Position:</b> " + escapeTelegramHtml(params.position || "-"),
    "<b>Type:</b> " + escapeTelegramHtml(params.leaveType || "-"),
    "<b>From:</b> " + escapeTelegramHtml(params.dateFrom ? formatDateISO(params.dateFrom) : "-"),
    "<b>To:</b> " + escapeTelegramHtml(params.dateTo ? formatDateISO(params.dateTo) : "-"),
    "<b>Duration:</b> " + escapeTelegramHtml(params.workingDays || "0") + " day(s)",
    "<b>Reason:</b> " + escapeTelegramHtml(params.reason || "-"),
    "<b>Status:</b> <b>" + statusBadge + "</b>"
  ];

  if (params.hrUser) {
    msgLines.push("<b>Updated By:</b> " + escapeTelegramHtml(params.hrUser));
  }

  msgLines.push("──────────────");
  msgLines.push("<i>Request ID: " + escapeTelegramHtml(reqId) + "</i>");

  sendTelegramMessage(chatId, msgLines.join("\n"));
}

// ── ACTION HANDLERS ───────────────────────────────────────────

function hrLogin(params) {
  const username = cleanStr(params.username).toLowerCase();
  const password = cleanStr(params.password);

  if (!username || !password) {
    return { result: 'error', message: 'Username and password are required.' };
  }

  const hrSheetNames = [
    'HR Account', 'HR Accounts', 'HRAccount', 'HR_Account', 'HR',
    'Admin', 'Admins', 'Admin Account', 'Admin Accounts', 'Users', 'User',
    'Accounts', 'Login', 'Credentials'
  ];
  const hrSheet = findSheetFlexible(hrSheetNames);
  const rows = getDataRows(hrSheet);

  for (let r of rows) {
    let uVal = '';
    let pVal = '';
    let roleVal = 'Admin';

    for (let k of Object.keys(r)) {
      if (k === '_raw') continue;
      const kNorm = normalizeKey(k);

      if (['username', 'user', 'userid', 'account', 'login', 'email', 'name', 'admin', 'empid', 'id', 'staffid', 'ឈ្មោះអ្នកប្រើ', 'ឈ្មោះ'].includes(kNorm)) {
        if (!uVal) uVal = cleanStr(r[k]);
      }
      if (['password', 'pass', 'pwd', 'passcode', 'pin', 'code', 'secret', 'key', 'ពាក្យសម្ងាត់'].includes(kNorm)) {
        if (!pVal) pVal = cleanStr(r[k]);
      }
      if (['role', 'type', 'permission', 'position', 'level', 'តួនាទី'].includes(kNorm)) {
        roleVal = cleanStr(r[k]) || 'Admin';
      }
    }

    if ((!uVal || !pVal) && r._raw && r._raw.length >= 2) {
      if (!uVal) uVal = cleanStr(r._raw[0]);
      if (!pVal) pVal = cleanStr(r._raw[1]);
      if (r._raw.length >= 3 && cleanStr(r._raw[2])) roleVal = cleanStr(r._raw[2]);
    }

    if (uVal && pVal) {
      if (uVal.toLowerCase() === username && pVal === password) {
        return {
          result: 'success',
          displayName: uVal,
          token: 'HR-TOKEN-' + Date.now(),
          role: roleVal || 'Admin'
        };
      }
    }
  }

  const staffSheet = findSheetFlexible(['Staff', 'Staffs', 'Staff List', 'Employees', 'Employee']);
  const staffRows = getDataRows(staffSheet);
  for (let r of staffRows) {
    let empId = '';
    let staffName = '';
    let staffPass = '';
    let staffRole = 'Staff';

    for (let k of Object.keys(r)) {
      if (k === '_raw') continue;
      const kNorm = normalizeKey(k);
      if (['empid', 'id', 'staffid'].includes(kNorm)) empId = cleanStr(r[k]);
      if (['name', 'fullname', 'staffname'].includes(kNorm)) staffName = cleanStr(r[k]);
      if (['password', 'pass', 'pwd', 'pin', 'passcode'].includes(kNorm)) staffPass = cleanStr(r[k]);
      if (['role', 'position', 'type'].includes(kNorm)) staffRole = cleanStr(r[k]);
    }

    if (staffPass) {
      const isUserMatch = (empId && empId.toLowerCase() === username) ||
                          (staffName && staffName.toLowerCase() === username);
      if (isUserMatch && staffPass === password) {
        return {
          result: 'success',
          displayName: staffName || empId,
          token: 'HR-TOKEN-' + Date.now(),
          role: staffRole || 'Staff'
        };
      }
    }
  }

  if ((username === 'admin' && (password === 'admin123' || password === 'Admin2026' || password === 'admin')) ||
      (username === 'hrmanager' && (password === 'HRPass2026' || password === 'admin123'))) {
    return {
      result: 'success',
      displayName: username === 'hrmanager' ? 'HR Manager' : 'Admin',
      token: 'HR-TOKEN-' + Date.now(),
      role: 'Admin'
    };
  }

  return {
    result: 'error',
    message: `Invalid username or password. Please verify credentials in the Google Sheet.`
  };
}

function parseStaffRow(r) {
  let empIdVal = '';
  let nameVal = '';
  let nameKhVal = '';
  let genderVal = '';
  let posVal = '';
  let posKhVal = '';
  let annualDaysVal = null;
  let usedDaysVal = null;
  let specialUsedVal = null;
  let remDaysVal = null;
  let locVal = '';

  for (let k of Object.keys(r)) {
    if (k === '_raw') continue;
    const kNorm = normalizeKey(k);
    const val = r[k];

    if (['empid', 'id', 'staffid', 'employeeid', 'staffcode', 'code', 'idno', 'no', 'employee', 'staff', 'អត្តលេខ', 'លរ', 'ល.រ', 'កូដ'].includes(kNorm)) {
      if (cleanStr(val)) empIdVal = cleanStr(val);
    }
    if (['name', 'fullname', 'staffname', 'employeename', 'empname', 'stafffullname', 'nameinenglish', 'englishname', 'ឈ្មោះ', 'ឈ្មោះអង់គ្លេស', 'ឈ្មោះឡាតាំង', 'ឈ្មោះជាឡាតាំង'].includes(kNorm)) {
      if (cleanStr(val)) nameVal = cleanStr(val);
    }
    if (['namekhmer', 'namekh', 'khmername', 'nameinkhmer', 'khname', 'ឈ្មោះខ្មែរ', 'ឈ្មោះភាសាខ្មែរ', 'គោត្តនាមនិងនាម'].includes(kNorm)) {
      if (cleanStr(val)) nameKhVal = cleanStr(val);
    }
    if (['gender', 'sex', 'gendermf', 'sexmf', 'mf', 'fm', 'gendersex', 'sexgender', 'genderfm', 'sexfm', 'ភេទ', 'ភេទប្រុសស្រី', 'g', 'gender(m/f)', 'sex(m/f)'].includes(kNorm) || kNorm.startsWith('gender') || kNorm.startsWith('sex') || kNorm.startsWith('ភេទ')) {
      if (cleanStr(val)) genderVal = normalizeGender(val);
    }
    if (['position', 'jobtitle', 'role', 'title', 'designation', 'post', 'តួនាទី', 'មុខតំណែង', 'មុខងារ'].includes(kNorm)) {
      if (cleanStr(val)) posVal = cleanStr(val);
    }
    if (['positionkhmer', 'positionkh', 'khmerposition', 'positioninkhmer', 'khpos', 'តួនាទីខ្មែរ', 'មុខតំណែងខ្មែរ', 'មុខងារខ្មែរ'].includes(kNorm)) {
      if (cleanStr(val)) posKhVal = cleanStr(val);
    }
    if (['annualdays', 'annual', 'totaldays', 'annualleave', 'entitlement', 'albalance', 'balance', 'totalleave', 'annualleavedays', 'totalleavedays', 'totalannualleave', 'alentitlement', 'leaveentitlement', 'annualentitlement', 'ចំនួនថ្ងៃច្បាប់', 'ច្បាប់ប្រចាំឆ្នាំ', 'សរុបថ្ងៃច្បាប់', 'ថ្ងៃច្បាប់សរុប', 'ថ្ងៃច្បាប់ប្រចាំឆ្នាំ'].includes(kNorm) || kNorm.includes('annual') || kNorm.includes('entitlement')) {
      const parsed = parseNumeric(val, null);
      if (parsed !== null) annualDaysVal = parsed;
    }
    if ((['useddays', 'used', 'leavetaken', 'taken', 'usedleave', 'altaken', 'daysused', 'totalused', 'totaltaken', 'leaveused', 'បានប្រើ', 'ចំនួនថ្ងៃបានប្រើ', 'ថ្ងៃបានប្រើ', 'ឈប់សម្រាករួច'].includes(kNorm) || kNorm.includes('used') || kNorm.includes('taken')) && !kNorm.includes('special')) {
      const parsed = parseNumeric(val, null);
      if (parsed !== null) usedDaysVal = parsed;
    }
    if (['specialused', 'specialdays', 'specialleave', 'specialtaken', 'special'].includes(kNorm) || kNorm.includes('special')) {
      const parsed = parseNumeric(val, null);
      if (parsed !== null) specialUsedVal = parsed;
    }
    if (['remainingdays', 'remaining', 'alremaining', 'balanceremaining', 'daysremaining', 'ថ្ងៃនៅសល់', 'នៅសល់'].includes(kNorm) || kNorm.includes('remain')) {
      const parsed = parseNumeric(val, null);
      if (parsed !== null) remDaysVal = parsed;
    }
    if (['location', 'branch', 'city', 'office', 'workplace', 'site', 'base', 'locationbranch', 'branchlocation', 'officelocation', 'worklocation', 'currentlocation', 'ទីតាំង', 'សាខា', 'ការិយាល័យ', 'កន្លែងធ្វើការ', 'ទីកន្លែង', 'ទីតាំងបម្រើការងារ'].includes(kNorm) || kNorm.includes('location') || kNorm.includes('branch') || kNorm.includes('office') || kNorm.includes('ទីតាំង')) {
      if (cleanStr(val)) locVal = cleanStr(val);
    }
  }

  if (r._raw && Array.isArray(r._raw)) {
    const raw = r._raw;
    if (!empIdVal && raw[0]) empIdVal = cleanStr(raw[0]);
    if (!nameVal && raw[1]) nameVal = cleanStr(raw[1]);
    if (!nameKhVal && raw[2] && /[\u1780-\u17FF]/.test(cleanStr(raw[2]))) nameKhVal = cleanStr(raw[2]);
    if (!genderVal && raw[3]) genderVal = normalizeGender(raw[3]);
    if (!posVal && raw[4]) posVal = cleanStr(raw[4]);
    if (!posKhVal && raw[5] && /[\u1780-\u17FF]/.test(cleanStr(raw[5]))) posKhVal = cleanStr(raw[5]);
    if (annualDaysVal === null && raw[6] !== undefined && raw[6] !== '') annualDaysVal = parseNumeric(raw[6], 18);
    if (usedDaysVal === null && raw[7] !== undefined && raw[7] !== '') usedDaysVal = parseNumeric(raw[7], 0);
    if (!locVal && raw[8]) locVal = cleanStr(raw[8]);
  }

  if (annualDaysVal === null) annualDaysVal = 18;
  if (usedDaysVal === null) {
    if (remDaysVal !== null) {
      usedDaysVal = Math.max(0, annualDaysVal - remDaysVal);
    } else {
      usedDaysVal = 0;
    }
  }
  if (specialUsedVal === null) specialUsedVal = 0;
  if (!genderVal) genderVal = 'Male';
  if (!locVal) locVal = 'Phnom Penh';

  return {
    empId: empIdVal,
    name: nameVal,
    nameKh: nameKhVal,
    gender: genderVal,
    position: posVal,
    positionKh: posKhVal,
    annualDays: annualDaysVal,
    usedDays: usedDaysVal,
    specialUsed: specialUsedVal,
    location: locVal
  };
}

function getStaff(params) {
  const rawQuery = cleanStr(params.empId || params.id || params.fullName || params.name || params.query || '');
  if (!rawQuery) {
    return { result: 'notfound' };
  }

  let searchId = rawQuery;
  let searchName = rawQuery.toLowerCase();
  const idParenMatch = rawQuery.match(/\(([^)]+)\)$/);
  if (idParenMatch) {
    searchId = idParenMatch[1].trim();
    searchName = rawQuery.replace(/\([^)]+\)$/, '').trim().toLowerCase();
  }

  const sheet = findSheetFlexible(['Staff', 'Staffs', 'Staff List', 'Employees', 'Employee']);
  const rows = getDataRows(sheet);

  const staffRow = rows.find(r => {
    const s = parseStaffRow(r);
    const cleanRId = cleanStr(s.empId).toUpperCase();
    const cleanSearchId = cleanStr(searchId).toUpperCase();
    const idMatch = cleanSearchId && (cleanRId === cleanSearchId || cleanRId.replace(/^0+/, '') === cleanSearchId.replace(/^0+/, ''));
    const nameMatch = searchName && (
      (s.name && cleanStr(s.name).toLowerCase() === searchName) ||
      (s.nameKh && cleanStr(s.nameKh).toLowerCase() === searchName) ||
      (s.name && cleanStr(s.name).toLowerCase().includes(searchName)) ||
      (searchName.length >= 3 && s.name && searchName.includes(cleanStr(s.name).toLowerCase()))
    );
    return idMatch || nameMatch;
  });

  if (!staffRow) {
    return { result: 'notfound' };
  }

  const staffObj = parseStaffRow(staffRow);
  if (!staffObj.empId && searchId) staffObj.empId = searchId;

  return {
    result: 'success',
    staff: staffObj
  };
}

function getAllStaff(params) {
  const sheet = findSheetFlexible(['Staff', 'Staffs', 'Staff List', 'Employees', 'Employee']);
  const rows = getDataRows(sheet);

  const staffList = rows.map(r => parseStaffRow(r)).filter(s => s.empId || s.name || s.nameKh);

  return { result: 'success', staffList: staffList, staff: staffList };
}

function getAppInitData(params) {
  const staffRes = getAllStaff(params);
  let staffList = staffRes.staffList || [];

  const reqSheet = findSheetFlexible(['Leave Requests', 'Leave Request', 'LeaveRequests', 'Requests']);
  const reqRows = getDataRows(reqSheet);

  const history = reqRows.map(r => {
    let idVal = '';
    let empIdVal = '';
    let nameVal = '';
    let typeVal = '';
    let fromVal = '';
    let toVal = '';
    let daysVal = 0;
    let statusVal = 'Pending';
    let reasonVal = '';
    let subVal = '';
    let posVal = '';
    let genVal = '';
    let locVal = 'Phnom Penh';

    for (let k of Object.keys(r)) {
      const kNorm = normalizeKey(k);
      if (['requestid', 'id', 'reqid'].includes(kNorm)) idVal = cleanStr(r[k]);
      if (['employeeid', 'empid', 'staffid'].includes(kNorm)) empIdVal = cleanStr(r[k]);
      if (['name', 'fullname', 'empname'].includes(kNorm)) nameVal = cleanStr(r[k]);
      if (['gender', 'sex', 'gendermf', 'sexmf', 'mf', 'fm', 'gendersex', 'sexgender', 'ភេទ', 'g'].includes(kNorm)) genVal = normalizeGender(r[k]);
      if (['position', 'pos'].includes(kNorm)) posVal = cleanStr(r[k]);
      if (['leavetype', 'type'].includes(kNorm)) typeVal = cleanStr(r[k]);
      if (['datefrom', 'from'].includes(kNorm)) fromVal = formatDateISO(r[k]);
      if (['dateto', 'to'].includes(kNorm)) toVal = formatDateISO(r[k]);
      if (['workingdays', 'days', 'duration'].includes(kNorm)) daysVal = Number(r[k]) || 0;
      if (['status', 'state'].includes(kNorm)) statusVal = cleanStr(r[k]) || 'Pending';
      if (['reason', 'note'].includes(kNorm)) reasonVal = cleanStr(r[k]);
      if (['submissiondate', 'submitted', 'timestamp'].includes(kNorm)) subVal = formatDateISO(r[k]);
      if (['submittedfrom', 'location'].includes(kNorm)) locVal = cleanStr(r[k]) || 'Phnom Penh';
    }

    if (!nameVal && empIdVal) {
      const match = staffList.find(s => cleanStr(s.empId).toUpperCase() === empIdVal.toUpperCase() || cleanStr(s.empId).replace(/^0+/, '') === empIdVal.replace(/^0+/, ''));
      if (match) {
        nameVal = match.name;
        if (!posVal) posVal = match.position;
        if (!genVal) genVal = match.gender;
      }
    }

    return {
      id: idVal,
      empId: empIdVal,
      empName: nameVal,
      name: nameVal,
      gender: genVal,
      position: posVal,
      leaveType: typeVal,
      type: typeVal,
      from: fromVal,
      dateFrom: fromVal,
      to: toVal,
      dateTo: toVal,
      days: daysVal,
      workingDays: daysVal,
      status: statusVal,
      reason: reasonVal,
      submitted: subVal,
      submissionDate: subVal,
      submittedFrom: locVal
    };
  });

  staffList = staffList.map(s => {
    let used = Number(s.usedDays) || 0;
    if (used === 0 && history.length > 0) {
      const sId = cleanStr(s.empId).toUpperCase();
      const sIdTrimmed = sId.replace(/^0+/, '');
      const approvedAL = history.filter(h => {
        const hId = cleanStr(h.empId).toUpperCase();
        const idMatch = hId && (hId === sId || hId.replace(/^0+/, '') === sIdTrimmed);
        const nameMatch = !idMatch && h.name && s.name && cleanStr(h.name).toLowerCase() === cleanStr(s.name).toLowerCase();
        const isApproved = h.status === 'Approved';
        const isAL = (h.leaveType || h.type || '').toLowerCase().includes('annual') || (h.leaveType || h.type || '').includes('ប្រចាំឆ្នាំ');
        return (idMatch || nameMatch) && isApproved && isAL;
      });
      const calcUsed = approvedAL.reduce((sum, h) => sum + (Number(h.workingDays || h.days) || 0), 0);
      if (calcUsed > 0) {
        used = calcUsed;
      }
    }
    return {
      ...s,
      usedDays: used
    };
  });

  const noticeSheet = findSheetFlexible(['Notice Letters', 'Notice Letter', 'NoticeLetters', 'Notices', 'Notice']);
  const noticeRows = getDataRows(noticeSheet);

  const notices = noticeRows.map(r => {
    let idVal = '';
    let empIdVal = '';
    let nameVal = '';
    let typeVal = '';
    let dateVal = '';
    let timeVal = '';
    let retVal = '—';
    let reasonVal = '';
    let statusVal = 'Submitted';

    for (let k of Object.keys(r)) {
      const kNorm = normalizeKey(k);
      if (['noticeid', 'id', 'notid'].includes(kNorm)) idVal = cleanStr(r[k]);
      if (['employeeid', 'empid', 'staffid'].includes(kNorm)) empIdVal = cleanStr(r[k]);
      if (['name', 'fullname'].includes(kNorm)) nameVal = cleanStr(r[k]);
      if (['noticetype', 'type'].includes(kNorm)) typeVal = cleanStr(r[k]);
      if (['effectivedate', 'date', 'noticedate'].includes(kNorm)) dateVal = formatDateISO(r[k]);
      if (['time', 'arrivaltime', 'departuretime'].includes(kNorm)) timeVal = cleanStr(r[k]);
      if (['returntime', 'return'].includes(kNorm)) retVal = cleanStr(r[k]) || '—';
      if (['reason', 'reason/details', 'details', 'note'].includes(kNorm)) reasonVal = cleanStr(r[k]);
      if (['status', 'state'].includes(kNorm)) statusVal = cleanStr(r[k]) || 'Submitted';
    }

    return {
      id: idVal,
      noticeId: idVal,
      empId: empIdVal,
      name: nameVal,
      type: typeVal,
      noticeType: typeVal,
      date: dateVal,
      effectiveDate: dateVal,
      time: timeVal,
      returnTime: retVal,
      reason: reasonVal,
      status: statusVal
    };
  });

  const holidaysRes = getHolidays(params);
  const holidays = holidaysRes.holidays || [];

  return {
    result: 'success',
    staffList: staffList,
    staff: staffList,
    history: history,
    requests: history,
    notices: notices,
    holidays: holidays
  };
}

function getHistory(params) {
  const empId = cleanStr(params.empId || params.id);
  const fullName = cleanStr(params.fullName || params.name).toLowerCase();

  const initData = getAppInitData(params);
  const history = (initData.history || []).filter(r => {
    const idMatch = empId && (r.empId === empId || r.empId.replace(/^0+/, '') === empId.replace(/^0+/, ''));
    const nameMatch = fullName && (r.empName || '').toLowerCase() === fullName;
    return idMatch || nameMatch;
  });

  return { result: 'success', history: history };
}

function getStaffNotices(params) {
  const empId = cleanStr(params.empId || params.id);
  const fullName = cleanStr(params.fullName || params.name).toLowerCase();

  const initData = getAppInitData(params);
  const notices = (initData.notices || []).filter(n => {
    const idMatch = empId && (n.empId === empId || n.empId.replace(/^0+/, '') === empId.replace(/^0+/, ''));
    const nameMatch = fullName && (n.name || '').toLowerCase() === fullName;
    return idMatch || nameMatch;
  });

  return { result: 'success', notices: notices };
}

function getDashboardData(params) {
  const initData = getAppInitData(params);
  const requests = initData.history || [];
  const staff = initData.staffList || [];
  const notices = initData.notices || [];
  const holidays = initData.holidays || [];

  const statsMap = {};
  notices.forEach(n => {
    const eid = n.empId || 'unknown';
    if (!statsMap[eid]) {
      statsMap[eid] = {
        empId: eid,
        name: n.name || eid,
        late: 0,
        early: 0,
        total: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        totalMinutes: 0
      };
    }
    const isLate = String(n.type || '').toLowerCase().includes('late');
    if (isLate) {
      statsMap[eid].late++;
    } else {
      statsMap[eid].early++;
    }
    statsMap[eid].total++;
  });

  const stats = Object.values(statsMap).sort((a, b) => b.total - a.total);

  return {
    result: 'success',
    requests: requests,
    history: requests,
    staff: staff,
    staffList: staff,
    notices: notices,
    holidays: holidays,
    stats: stats
  };
}

function calcWorkDaysBackend(dateFrom, dateTo, halfFirst, halfLast) {
  if (!dateFrom || !dateTo) return 0;
  const d1 = new Date(dateFrom + (String(dateFrom).includes('T') ? '' : 'T00:00:00'));
  const d2 = new Date(dateTo + (String(dateTo).includes('T') ? '' : 'T00:00:00'));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 0;

  let holidaySet = new Set();
  try {
    const holRes = getHolidays();
    if (holRes && holRes.holidays) {
      holRes.holidays.forEach(h => { if (h.date) holidaySet.add(h.date); });
    }
  } catch (e) {}

  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const dow = cur.getDay();
    const iso = formatDateISO(cur);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (count === 0) return 0;

  const fIso = formatDateISO(d1);
  const lIso = formatDateISO(d2);
  const fNonWork = d1.getDay() === 0 || d1.getDay() === 6 || holidaySet.has(fIso);
  const lNonWork = d2.getDay() === 0 || d2.getDay() === 6 || holidaySet.has(lIso);
  const single = dateFrom === dateTo;

  if (halfFirst && halfFirst !== 'full' && !fNonWork) count -= 0.5;
  if (!single && halfLast && halfLast !== 'full' && !lNonWork) count -= 0.5;

  return Math.max(0, count);
}

function submitRequest(params) {
  const sheet = findSheetFlexible(['Leave Requests', 'Leave Request', 'LeaveRequests', 'Requests']);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Request ID', 'Timestamp', 'Employee ID', 'Name', 'Gender', 'Position',
      'Leave Type', 'Date From', 'Date To', 'Working Days', 'Half First Day',
      'Half Last Day', 'Reason', 'Submission Date', 'Submitted From', 'Status'
    ]);
  }

  const dateFrom = formatDateISO(params.dateFrom || params.from);
  const dateTo = formatDateISO(params.dateTo || params.to);
  const halfFirst = cleanStr(params.halfFirstDay || 'full');
  const halfLast = cleanStr(params.halfLastDay || 'full');

  let workingDays = Number(params.workingDays || params.days);
  if (!workingDays || workingDays <= 0) {
    workingDays = calcWorkDaysBackend(dateFrom, dateTo, halfFirst, halfLast);
  }
  if (workingDays <= 0) {
    return { result: 'error', message: 'Leave cannot be requested on Saturday or Sunday (Non-working days).' };
  }

  const reqId = 'REQ-' + Date.now().toString(36).toUpperCase();
  const timestamp = params.timestamp || new Date().toISOString();

  sheet.appendRow([
    reqId,
    timestamp,
    cleanStr(params.employeeId || params.empId),
    cleanStr(params.name),
    cleanStr(params.gender),
    cleanStr(params.position),
    cleanStr(params.leaveType || params.type),
    dateFrom,
    dateTo,
    workingDays,
    halfFirst,
    halfLast,
    cleanStr(params.reason),
    cleanStr(params.submissionDate || todayFmtBackend()),
    cleanStr(params.submittedFrom || params.location || 'Phnom Penh'),
    cleanStr(params.status || 'Pending')
  ]);

  params.workingDays = workingDays;
  notifyTelegramLeave(params, reqId);

  const lTypeForAdjust = String(params.leaveType || params.type || '').toLowerCase();
  if (workingDays > 0) {
    if (lTypeForAdjust.includes('annual')) {
      adjustStaffUsedDays(params.employeeId || params.empId, workingDays, 'annual');
    } else if (lTypeForAdjust.includes('special')) {
      adjustStaffUsedDays(params.employeeId || params.empId, workingDays, 'special');
    }
  }

  return { result: 'success', requestId: reqId };
}

function submitNotice(params) {
  const sheet = findSheetFlexible(['Notice Letters', 'Notice Letter', 'NoticeLetters', 'Notices', 'Notice']);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Notice ID', 'Timestamp', 'Employee ID', 'Name', 'Notice Type',
      'Effective Date', 'Time', 'Return Time', 'Reason / Details', 'Status'
    ]);
  }

  const noticeId = 'NOT-' + Date.now().toString(36).toUpperCase();
  const rawType = cleanStr(params.noticeType || params.type || '');
  const noticeType = rawType === 'late' ? 'Late Arrival' :
                     (rawType === 'early' ? 'Leave Early' : (rawType || 'Notice'));

  const dateVal = formatDateISO(params.noticeDate || params.effectiveDate || params.date || todayFmtBackend());
  const timeVal = cleanStr(params.time);
  const retVal = cleanStr(params.returnTime || '—');

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  let hasTimeCol = false;
  let hasRetCol = false;
  
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeKey(headers[i]);
    if (['time'].includes(h)) hasTimeCol = true;
    if (['returntime', 'return'].includes(h)) hasRetCol = true;
  }
  
  let finalReason = cleanStr(params.reason);
  if (!hasTimeCol && timeVal) finalReason = 'Time: ' + timeVal + ' | ' + finalReason;
  if (!hasRetCol && retVal && retVal !== '—') finalReason = 'Return: ' + retVal + ' | ' + finalReason;
  
  const rowData = new Array(headers.length).fill('');
  
  // If the sheet has no headers at all (e.g. brand new sheet), fallback to a standard array
  if (headers.length <= 1 && !headers[0]) {
    sheet.appendRow([
      noticeId,
      new Date().toISOString(),
      cleanStr(params.empId || params.employeeId),
      cleanStr(params.name),
      noticeType,
      dateVal,
      timeVal,
      retVal,
      cleanStr(params.reason),
      cleanStr(params.status || 'Submitted')
    ]);
  } else {
    for (let i = 0; i < headers.length; i++) {
      const h = normalizeKey(headers[i]);
      if (['noticeid', 'id'].includes(h)) rowData[i] = noticeId;
      else if (['timestamp', 'timeofrequest'].includes(h)) rowData[i] = new Date().toISOString();
      else if (['employeeid', 'empid'].includes(h)) rowData[i] = cleanStr(params.empId || params.employeeId);
      else if (['name', 'fullname'].includes(h)) rowData[i] = cleanStr(params.name);
      else if (['noticetype', 'type'].includes(h)) rowData[i] = noticeType;
      else if (['effectivedate', 'date', 'noticedate'].includes(h)) rowData[i] = dateVal;
      else if (['time'].includes(h)) rowData[i] = timeVal;
      else if (['returntime', 'return'].includes(h)) rowData[i] = retVal;
      else if (['reason', 'reason/details', 'details'].includes(h)) rowData[i] = finalReason;
      else if (['status', 'state'].includes(h)) rowData[i] = cleanStr(params.status || 'Submitted');
    }
    sheet.appendRow(rowData);
  }

  notifyTelegramNotice({
    employeeId: cleanStr(params.empId || params.employeeId),
    name: cleanStr(params.name),
    noticeType: noticeType,
    effectiveDate: dateVal + (timeVal ? (' at ' + timeVal) : ''),
    reason: cleanStr(params.reason)
  }, noticeId);

  return { result: 'success', noticeId: noticeId };
}

function updateRequestStatus(params) {
  const reqId = cleanStr(params.requestId || params.id);
  const status = cleanStr(params.status || 'Pending');
  const isSilent = params.silent === true || params.silent === 'true' || params.silent === 1 || params.silent === '1';

  const sheet = findSheetFlexible(['Leave Requests', 'Leave Request', 'LeaveRequests', 'Requests']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { result: 'error', message: 'No requests found' };

  const headers = data[0].map(h => normalizeKey(h));
  let idCol = headers.findIndex(h => h.includes('requestid') || h === 'id' || h === 'reqid');
  let statusCol = headers.findIndex(h => h === 'status');
  let empIdCol = headers.findIndex(h => h.includes('employeeid') || h === 'empid');
  let nameCol = headers.findIndex(h => h === 'name' || h.includes('empname'));
  let posCol = headers.findIndex(h => h === 'position');
  let daysCol = headers.findIndex(h => h.includes('workingdays') || h === 'days');
  let typeCol = headers.findIndex(h => h.includes('leavetype') || h === 'type');
  let fromCol = headers.findIndex(h => h.includes('datefrom') || h === 'from');
  let toCol = headers.findIndex(h => h.includes('dateto') || h === 'to');
  let reasonCol = headers.findIndex(h => h === 'reason');

  if (idCol === -1) idCol = 0;
  if (statusCol === -1) statusCol = 15;

  for (let i = 1; i < data.length; i++) {
    if (cleanStr(data[i][idCol]) === reqId) {
      const prevStatus = cleanStr(data[i][statusCol]);
      sheet.getRange(i + 1, statusCol + 1).setValue(status);

      const empId = empIdCol >= 0 ? cleanStr(data[i][empIdCol]) : '';
      const days = daysCol >= 0 ? Number(data[i][daysCol]) || 0 : 0;
      const lType = typeCol >= 0 ? cleanStr(data[i][typeCol]) : '';

      if (empId && days > 0) {
        const isAnnual = lType.toLowerCase().includes('annual');
        const isSpecial = lType.toLowerCase().includes('special');
        
        if (isAnnual || isSpecial) {
          const wasCounted = prevStatus !== 'Rejected' && prevStatus !== 'Cancelled';
          const nowCounted = status !== 'Rejected' && status !== 'Cancelled';
          const typeStr = isSpecial ? 'special' : 'annual';
          
          if (!wasCounted && nowCounted) {
            adjustStaffUsedDays(empId, days, typeStr);
          } else if (wasCounted && !nowCounted) {
            adjustStaffUsedDays(empId, -days, typeStr);
          }
        }
      }

      if (!isSilent && prevStatus !== status) {
        const reqData = {
          employeeId: empId,
          name: nameCol >= 0 ? cleanStr(data[i][nameCol]) : '',
          position: posCol >= 0 ? cleanStr(data[i][posCol]) : '',
          leaveType: lType,
          dateFrom: fromCol >= 0 ? data[i][fromCol] : '',
          dateTo: toCol >= 0 ? data[i][toCol] : '',
          workingDays: days,
          reason: reasonCol >= 0 ? cleanStr(data[i][reasonCol]) : '',
          status: status,
          hrUser: cleanStr(params.hrUser || '')
        };
        notifyTelegramLeaveStatus(reqData, reqId);
      }

      return { result: 'success', requestId: reqId, status: status };
    }
  }

  return { result: 'error', message: 'Request ID not found: ' + reqId };
}

function deleteRequest(params) {
  const reqId = cleanStr(params.requestId || params.id);
  if (!reqId) return { result: 'error', message: 'Request ID is required' };

  const sheet = findSheetFlexible(['Leave Requests', 'Leave Request', 'LeaveRequests', 'Requests']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { result: 'error', message: 'No requests found' };

  const headers = data[0].map(h => normalizeKey(h));
  let idCol = headers.findIndex(h => h.includes('requestid') || h === 'id' || h === 'reqid');
  if (idCol === -1) idCol = 0;

  let statusCol = headers.findIndex(h => h === 'status' || h === 'state');
  let empIdCol = headers.findIndex(h => h.includes('employeeid') || h === 'empid');
  let typeCol = headers.findIndex(h => h.includes('leavetype') || h === 'type');
  let daysCol = headers.findIndex(h => h.includes('workingdays') || h === 'days');
  
  if (statusCol === -1) statusCol = 15;

  for (let i = 1; i < data.length; i++) {
    if (cleanStr(data[i][idCol]) === reqId) {
      const prevStatus = cleanStr(data[i][statusCol]);
      const empId = empIdCol >= 0 ? cleanStr(data[i][empIdCol]) : '';
      const days = daysCol >= 0 ? Number(data[i][daysCol]) || 0 : 0;
      const lType = typeCol >= 0 ? cleanStr(data[i][typeCol]) : '';

      if (prevStatus !== 'Rejected' && prevStatus !== 'Cancelled' && empId && days > 0) {
        const isAnnual = lType.toLowerCase().includes('annual');
        const isSpecial = lType.toLowerCase().includes('special');
        if (isAnnual || isSpecial) {
          const typeStr = isSpecial ? 'special' : 'annual';
          adjustStaffUsedDays(empId, -days, typeStr);
        }
      }

      sheet.deleteRow(i + 1);
      return { result: 'success', deletedId: reqId };
    }
  }
  return { result: 'error', message: 'Request ID not found' };
}

function deleteNotice(params) {
  const empId = cleanStr(params.empId || params.employeeId);
  const noticeType = cleanStr(params.noticeType || params.type);
  const date = cleanStr(params.date || params.noticeDate);
  const time = cleanStr(params.time);

  const sheet = findSheetFlexible(['Notice Letters', 'Notice Letter', 'NoticeLetters', 'Notices', 'Notice']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { result: 'error', message: 'No notices found' };

  const headers = data[0].map(h => normalizeKey(h));
  const iEmp = headers.findIndex(h => h.includes('employeeid') || h === 'empid');
  const iType = headers.findIndex(h => h.includes('type') || h.includes('noticetype'));
  const iDate = headers.findIndex(h => h.includes('date') || h.includes('effectivedate'));
  const iTime = headers.findIndex(h => h.includes('time'));

  for (let i = data.length - 1; i >= 1; i--) {
    const rEmp = iEmp >= 0 ? cleanStr(data[i][iEmp]) : '';
    const rType = iType >= 0 ? cleanStr(data[i][iType]) : '';
    const rDate = iDate >= 0 ? cleanStr(data[i][iDate]) : '';
    const rTime = iTime >= 0 ? cleanStr(data[i][iTime]) : '';

    const empMatch = !empId || rEmp === empId || rEmp.replace(/^0+/, '') === empId.replace(/^0+/, '');
    const typeMatch = !noticeType || rType.toLowerCase() === noticeType.toLowerCase();
    const dateMatch = !date || rDate.includes(date) || date.includes(rDate);
    const timeMatch = !time || rTime === time;

    if (empMatch && typeMatch && (dateMatch || timeMatch)) {
      sheet.deleteRow(i + 1);
      return { result: 'success' };
    }
  }

  return { result: 'success', message: 'Notice processed' };
}

function importAttendance(params) {
  const records = params.records || [];
  if (!Array.isArray(records) || records.length === 0) {
    return { result: 'error', message: 'No records provided' };
  }

  const sheet = findSheetFlexible(['Attendance Records', 'Attendance', 'Attendance Log']);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Employee ID', 'Full Name', 'Date', 'Check In', 'Arrival Status', 'Check Out', 'Departure Status', 'Note', 'Imported At']);
  }

  const rows = records.map(r => [
    cleanStr(r.empId),
    cleanStr(r.name),
    cleanStr(r.date),
    cleanStr(r.checkIn),
    cleanStr(r.arrivalStatus),
    cleanStr(r.checkOut),
    cleanStr(r.departureStatus),
    cleanStr(r.note),
    new Date().toISOString()
  ]);

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 9).setValues(rows);

  return { result: 'success', imported: rows.length };
}

function manualEntry(params) {
  const res = submitRequest({
    ...params,
    status: 'Approved',
    submittedFrom: params.location || 'Phnom Penh'
  });
  return res;
}

function manualNotice(params) {
  return submitNotice(params);
}

function convertLateToLeave(params) {
  const empId = cleanStr(params.empId);
  const empName = cleanStr(params.empName);
  const totalMins = Number(params.totalMinutes) || 0;
  const lateCount = Number(params.lateCount) || 0;
  const days = Math.max(1, Math.floor(totalMins > 0 ? totalMins / 480 : lateCount / 2));

  const today = todayFmtBackend();
  const res = submitRequest({
    employeeId: empId,
    name: empName,
    gender: params.gender || '',
    position: params.position || '',
    leaveType: 'Annual Leave (Late Deduction)',
    dateFrom: today,
    dateTo: today,
    workingDays: days,
    reason: `Late / Early conversion: ${lateCount} instances (${totalMins} mins)`,
    submissionDate: today,
    submittedFrom: params.location || 'Phnom Penh',
    status: 'Approved'
  });

  if (res.result === 'success') {
    adjustStaffUsedDays(empId, days);
  }
  return res;
}

function adjustStaffUsedDays(empId, delta, lType) {
  if (!empId || !delta) return;
  const sheet = findSheetFlexible(['Staff', 'Staffs', 'Staff List', 'Employees', 'Employee']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0].map(h => normalizeKey(h));
  const idCol = headers.findIndex(h => h.includes('empid') || h === 'id' || h === 'staffid');
  
  let targetCol = -1;
  const isSpecial = lType && String(lType).toLowerCase().includes('special');
  
  if (isSpecial) {
    targetCol = headers.findIndex(h => h.includes('specialused') || h.includes('specialdays') || h.includes('specialleave') || h === 'special');
    if (targetCol === -1) {
      targetCol = headers.length;
      sheet.getRange(1, targetCol + 1).setValue('Special Leave Used');
      sheet.getRange(1, targetCol + 1).setFontWeight('bold');
    }
  } else {
    targetCol = headers.findIndex(h => h.includes('useddays') || h.includes('used'));
  }

  if (idCol === -1 || targetCol === -1) return;

  const cleanTargetId = cleanStr(empId);
  for (let i = 1; i < data.length; i++) {
    const rowId = cleanStr(data[i][idCol]);
    if (rowId === cleanTargetId || rowId.replace(/^0+/, '') === cleanTargetId.replace(/^0+/, '')) {
      const currentUsed = Number(data[i][targetCol]) || 0;
      const newUsed = Math.max(0, currentUsed + delta);
      sheet.getRange(i + 1, targetCol + 1).setValue(newUsed);
      break;
    }
  }
}

function getLateThreshold(params) {
  const props = PropertiesService.getScriptProperties();
  const th = parseInt(props.getProperty('LATE_THRESHOLD') || '2', 10);
  return { result: 'success', threshold: th };
}

function setLateThreshold(params) {
  const th = parseInt(params.threshold || '2', 10);
  PropertiesService.getScriptProperties().setProperty('LATE_THRESHOLD', String(th));
  return { result: 'success', threshold: th };
}

function getTimedMode(params) {
  const props = PropertiesService.getScriptProperties();
  const enabled = props.getProperty('TIMED_MODE') === 'true';
  return { result: 'success', enabled: enabled };
}

function setTimedMode(params) {
  const enabled = params.enabled ? 'true' : 'false';
  PropertiesService.getScriptProperties().setProperty('TIMED_MODE', enabled);
  return { result: 'success', enabled: params.enabled };
}

function wipeTestUser(params) {
  return { result: 'success', deleted: { requests: 0, notices: 0, attendance: 0 } };
}

function getHolidays(params) {
  const sheet = findSheetFlexible(['Holidays', 'Holiday', 'Public Holidays', 'PublicHolidays']);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);
    const defaults = [
      ['2026-01-01', 'International New Year', 'ទិវាចូលឆ្នាំសកល', 'Public Holiday'],
      ['2026-01-07', 'Victory over Genocide Day', 'ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍', 'Public Holiday'],
      ['2026-03-08', "International Women's Day", 'ទិវានារីអន្តរជាតិ', 'Public Holiday'],
      ['2026-04-14', 'Khmer New Year (Day 1)', 'ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ ថ្ងៃទី១', 'Public Holiday'],
      ['2026-04-15', 'Khmer New Year (Day 2)', 'ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ ថ្ងៃទី២', 'Public Holiday'],
      ['2026-04-16', 'Khmer New Year (Day 3)', 'ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ ថ្ងៃទី៣', 'Public Holiday'],
      ['2026-05-01', 'International Labor Day', 'ទិវាពលកម្មអន្តរជាតិ', 'Public Holiday'],
      ['2026-05-14', "King Sihamoni's Birthday", 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ', 'Public Holiday'],
      ['2026-06-18', "Queen Mother's Birthday", 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចម៉ែ', 'Public Holiday'],
      ['2026-09-24', 'Constitutional Day', 'ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ', 'Public Holiday'],
      ['2026-10-29', "King's Coronation Day", 'ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិ', 'Public Holiday'],
      ['2026-11-09', 'National Independence Day', 'ទិវាបុណ្យឯករាជ្យជាតិ', 'Public Holiday']
    ];
    defaults.forEach(row => sheet.appendRow(row));
  }

  const rows = getDataRows(sheet);
  const holidays = rows.map(r => {
    let dateVal = '';
    let nameVal = '';
    let nameKhVal = '';
    let typeVal = 'Public Holiday';

    for (let k of Object.keys(r)) {
      const kNorm = normalizeKey(k);
      if (['date', 'holidaydate', 'day'].includes(kNorm)) dateVal = formatDateISO(r[k]);
      if (['holidayname', 'name', 'title', 'event', 'holiday'].includes(kNorm)) nameVal = cleanStr(r[k]);
      if (['holidaynamekhmer', 'namekhmer', 'namekh', 'khmername', 'khmer'].includes(kNorm)) nameKhVal = cleanStr(r[k]);
      if (['type', 'category'].includes(kNorm)) typeVal = cleanStr(r[k]) || 'Public Holiday';
    }
    return {
      date: dateVal,
      dateISO: dateVal,
      name: nameVal,
      nameKh: nameKhVal,
      type: typeVal
    };
  }).filter(h => h.date);

  holidays.sort((a, b) => a.date.localeCompare(b.date));

  return { result: 'success', holidays: holidays };
}

function addHoliday(params) {
  const dateStr = formatDateISO(params.date || params.holidayDate);
  if (!dateStr) {
    return { result: 'error', message: 'Valid holiday date is required (YYYY-MM-DD).' };
  }
  const nameStr = cleanStr(params.name || params.holidayName || 'Holiday');
  const nameKhStr = cleanStr(params.nameKh || params.nameKhmer || '');
  const typeStr = cleanStr(params.type || 'Public Holiday');

  const sheet = findSheetFlexible(['Holidays', 'Holiday', 'Public Holidays', 'PublicHolidays']);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);
  }

  const data = sheet.getDataRange().getValues();
  let foundRowIdx = -1;

  if (data.length > 1) {
    const headers = data[0].map(h => normalizeKey(h));
    const dateCol = headers.findIndex(h => ['date', 'holidaydate', 'day'].includes(h));
    const nameCol = headers.findIndex(h => ['holidayname', 'name', 'title'].includes(h));
    const nameKhCol = headers.findIndex(h => ['holidaynamekhmer', 'namekhmer', 'namekh'].includes(h));
    const typeCol = headers.findIndex(h => ['type', 'category'].includes(h));

    const targetDateCol = dateCol >= 0 ? dateCol : 0;
    for (let r = 1; r < data.length; r++) {
      const rowDate = formatDateISO(data[r][targetDateCol]);
      if (rowDate === dateStr) {
        foundRowIdx = r + 1;
        if (nameCol >= 0) sheet.getRange(foundRowIdx, nameCol + 1).setValue(nameStr);
        if (nameKhCol >= 0) sheet.getRange(foundRowIdx, nameKhCol + 1).setValue(nameKhStr);
        if (typeCol >= 0) sheet.getRange(foundRowIdx, typeCol + 1).setValue(typeStr);
        break;
      }
    }
  }

  if (foundRowIdx === -1) {
    sheet.appendRow([dateStr, nameStr, nameKhStr, typeStr]);
  }

  return getHolidays(params);
}

function deleteHoliday(params) {
  const targetDate = formatDateISO(params.date || params.holidayDate);
  const targetName = cleanStr(params.name || '').toLowerCase();
  if (!targetDate && !targetName) {
    return { result: 'error', message: 'Target date or name is required to delete holiday.' };
  }

  const sheet = findSheetFlexible(['Holidays', 'Holiday', 'Public Holidays', 'PublicHolidays']);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return getHolidays(params);
  }

  const headers = data[0].map(h => normalizeKey(h));
  const dateCol = headers.findIndex(h => ['date', 'holidaydate', 'day'].includes(h));
  const nameCol = headers.findIndex(h => ['holidayname', 'name', 'title'].includes(h));
  const targetDateCol = dateCol >= 0 ? dateCol : 0;

  for (let r = data.length - 1; r >= 1; r--) {
    const rowDate = formatDateISO(data[r][targetDateCol]);
    const rowName = nameCol >= 0 ? cleanStr(data[r][nameCol]).toLowerCase() : '';
    if ((targetDate && rowDate === targetDate) || (targetName && rowName === targetName)) {
      sheet.deleteRow(r + 1);
    }
  }

  return getHolidays(params);
}

function syncHolidays(params) {
  let list = params.holidays;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list)) list = [];

  const sheet = findSheetFlexible(['Holidays', 'Holiday', 'Public Holidays', 'PublicHolidays']);
  sheet.clearContents();
  sheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);

  list.forEach(h => {
    const d = formatDateISO(h.date || h.dateISO);
    if (d) {
      sheet.appendRow([d, cleanStr(h.name), cleanStr(h.nameKh || h.nameKhmer), cleanStr(h.type || 'Public Holiday')]);
    }
  });

  return getHolidays(params);
}

function importHolidays(params) {
  let list = params.holidays;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list)) list = [];

  const mode = cleanStr(params.mode || 'replace_year').toLowerCase(); // 'replace_year', 'merge', 'replace_all'
  const targetYear = cleanStr(params.year || '');

  const sheet = findSheetFlexible(['Holidays', 'Holiday', 'Public Holidays', 'PublicHolidays']);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);
  }

  const cleanIncoming = [];
  const incomingDatesSet = new Set();
  const incomingYearsSet = new Set();

  list.forEach(h => {
    const d = formatDateISO(h.date || h.dateISO);
    if (d && !incomingDatesSet.has(d)) {
      incomingDatesSet.add(d);
      const y = d.slice(0, 4);
      if (y) incomingYearsSet.add(y);
      cleanIncoming.push({
        date: d,
        name: cleanStr(h.name || h.holidayName || 'Holiday'),
        nameKh: cleanStr(h.nameKh || h.nameKhmer || ''),
        type: cleanStr(h.type || 'Public Holiday')
      });
    }
  });

  if (cleanIncoming.length === 0) {
    return { result: 'error', message: 'No valid holiday rows found to import.' };
  }

  const existingRows = getDataRows(sheet);
  const finalMap = new Map();

  if (mode === 'replace_all') {
    cleanIncoming.forEach(item => finalMap.set(item.date, item));
  } else if (mode === 'replace_year') {
    const yearsToReplace = targetYear ? new Set([targetYear]) : incomingYearsSet;
    existingRows.forEach(r => {
      let d = '';
      let n = '';
      let nKh = '';
      let t = 'Public Holiday';
      for (let k of Object.keys(r)) {
        const kNorm = normalizeKey(k);
        if (['date', 'holidaydate', 'day'].includes(kNorm)) d = formatDateISO(r[k]);
        if (['holidayname', 'name', 'title'].includes(kNorm)) n = cleanStr(r[k]);
        if (['holidaynamekhmer', 'namekhmer', 'namekh'].includes(kNorm)) nKh = cleanStr(r[k]);
        if (['type', 'category'].includes(kNorm)) t = cleanStr(r[k]) || 'Public Holiday';
      }
      if (d) {
        const rowYear = d.slice(0, 4);
        if (!yearsToReplace.has(rowYear)) {
          finalMap.set(d, { date: d, name: n, nameKh: nKh, type: t });
        }
      }
    });
    cleanIncoming.forEach(item => finalMap.set(item.date, item));
  } else {
    existingRows.forEach(r => {
      let d = '';
      let n = '';
      let nKh = '';
      let t = 'Public Holiday';
      for (let k of Object.keys(r)) {
        const kNorm = normalizeKey(k);
        if (['date', 'holidaydate', 'day'].includes(kNorm)) d = formatDateISO(r[k]);
        if (['holidayname', 'name', 'title'].includes(kNorm)) n = cleanStr(r[k]);
        if (['holidaynamekhmer', 'namekhmer', 'namekh'].includes(kNorm)) nKh = cleanStr(r[k]);
        if (['type', 'category'].includes(kNorm)) t = cleanStr(r[k]) || 'Public Holiday';
      }
      if (d) {
        finalMap.set(d, { date: d, name: n, nameKh: nKh, type: t });
      }
    });
    cleanIncoming.forEach(item => finalMap.set(item.date, item));
  }

  const sortedList = Array.from(finalMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  sheet.clearContents();
  sheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);
  sheet.getRange('A:A').setNumberFormat('@');

  if (sortedList.length > 0) {
    const sheetData = sortedList.map(h => [h.date, h.name, h.nameKh, h.type]);
    sheet.getRange(2, 1, sheetData.length, 4).setValues(sheetData);
  }

  return {
    result: 'success',
    count: cleanIncoming.length,
    total: sortedList.length,
    holidays: sortedList,
    message: `Successfully imported ${cleanIncoming.length} holiday(s) to Google Sheets.`
  };
}

function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let staffSheet = ss.getSheetByName('Staff');
  if (!staffSheet) staffSheet = ss.insertSheet('Staff');
  staffSheet.getRange('A:A').setNumberFormat('@');
  if (staffSheet.getLastRow() === 0) {
    staffSheet.appendRow(['Emp ID', 'Name', 'Name (Khmer)', 'Gender', 'Position', 'Position (Khmer)', 'Annual Days', 'Used Days', 'Location']);
  }

  let hrSheet = ss.getSheetByName('HR Account');
  if (!hrSheet) hrSheet = ss.insertSheet('HR Account');
  if (hrSheet.getLastRow() === 0) {
    hrSheet.appendRow(['Username', 'Password', 'Role']);
    hrSheet.appendRow(['admin', 'admin123', 'Admin']);
  }

  let reqSheet = ss.getSheetByName('Leave Requests');
  if (!reqSheet) reqSheet = ss.insertSheet('Leave Requests');
  if (reqSheet.getLastRow() === 0) {
    reqSheet.appendRow([
      'Request ID', 'Timestamp', 'Employee ID', 'Name', 'Gender', 'Position',
      'Leave Type', 'Date From', 'Date To', 'Working Days', 'Half First Day',
      'Half Last Day', 'Reason', 'Submission Date', 'Submitted From', 'Status'
    ]);
  }

  let noticeSheet = ss.getSheetByName('Notice Letters');
  if (!noticeSheet) noticeSheet = ss.insertSheet('Notice Letters');
  if (noticeSheet.getLastRow() === 0) {
    noticeSheet.appendRow([
      'Notice ID', 'Timestamp', 'Employee ID', 'Name', 'Notice Type',
      'Effective Date', 'Time', 'Return Time', 'Reason / Details', 'Status'
    ]);
  }

  let holidaySheet = ss.getSheetByName('Holidays');
  if (!holidaySheet) holidaySheet = ss.insertSheet('Holidays');
  if (holidaySheet.getLastRow() === 0) {
    holidaySheet.appendRow(['Date', 'Holiday Name', 'Holiday Name (Khmer)', 'Type']);
  }

  return { result: 'success', message: 'Sheets initialized successfully!' };
}

function setupSheet() {
  return setupInitialSheets();
}

function onOpen() {
const ui = SpreadsheetApp.getUi();
ui.createMenu('System Setup')
.addItem('Initialize All Sheets & Sample Data', 'setupSheet')
.addItem('Setup Automations (Triggers)', 'setupAutomations')
.addToUi();
}

function logError(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ErrorLogs');
    if (!sheet) {
      const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('ErrorLogs');
      newSheet.appendRow(['Timestamp', 'Error Message', 'Source', 'Line', 'Context', 'User Agent']);
      newSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      return logError(params);
    }

    sheet.appendRow([
      new Date().toISOString(),
      params.errorMsg || 'Unknown Error',
      params.source || 'Unknown Source',
      params.line || 'Unknown Line',
      params.context || '',
      params.userAgent || ''
    ]);
    return { result: 'success' };
  } catch (e) {
    return { result: 'error', message: e.toString() };
  }
}

// ── AUTOMATION & TRIGGERS ──────────────────────────────────────

function setupAutomations() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyCronJob') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('dailyCronJob')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  SpreadsheetApp.getUi().alert('Automations (Yearly Reset & Holiday Reminders) have been set up successfully!');
}

function dailyCronJob() {
  const today = new Date();
  const tz = Session.getScriptTimeZone() || 'GMT+7';

  const dayStr = Utilities.formatDate(today, tz, 'dd');
  const monthStr = Utilities.formatDate(today, tz, 'MM');
  const yearStr = Utilities.formatDate(today, tz, 'yyyy');

  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (month === 1 && day === 1) {
    autoResetAnnualLeave(year);
  }

  if (month === 12 && day === 20) {
    checkAndNotifyHolidays(year + 1);
  }
}

function autoResetAnnualLeave(currentYear) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName('Staff');
  if (!staffSheet) return;

  let historySheet = ss.getSheetByName('Yearly Leave History');
  if (!historySheet) {
    historySheet = ss.insertSheet('Yearly Leave History');
    historySheet.appendRow(['Timestamp', 'Year', 'Emp ID', 'Name', 'Annual Days', 'Used Days Balance']);
    historySheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  const data = staffSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0].map(h => normalizeKey(h));
  const idIdx = headers.indexOf('empid');
  const nameIdx = headers.indexOf('name');
  const annualIdx = headers.indexOf('annualdays');
  let usedIdx = headers.indexOf('useddays');

  if (usedIdx === -1) {
    usedIdx = headers.findIndex(h => h.includes('used'));
  }

  if (idIdx === -1 || usedIdx === -1) return;

  const timestamp = new Date().toISOString();
  const previousYear = currentYear - 1;
  const historyData = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const empId = row[idIdx];
    if (!empId) continue;

    const name = nameIdx !== -1 ? row[nameIdx] : '';
    const annualDays = annualIdx !== -1 ? row[annualIdx] : '';
    const usedDays = row[usedIdx];

    historyData.push([timestamp, previousYear, empId, name, annualDays, usedDays]);

    staffSheet.getRange(i + 1, usedIdx + 1).setValue(0);
  }

  if (historyData.length > 0) {
    historySheet.getRange(historySheet.getLastRow() + 1, 1, historyData.length, historyData[0].length).setValues(historyData);
  }
}

function checkAndNotifyHolidays(nextYear) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const holidaySheet = ss.getSheetByName('Holidays');
  if (!holidaySheet) return;

  const data = holidaySheet.getDataRange().getValues();
  let nextYearHolidaysSet = false;

  for (let i = 1; i < data.length; i++) {
    const dateVal = data[i][0];
    if (!dateVal) continue;

    let year = '';
    if (dateVal instanceof Date) {
      year = Utilities.formatDate(dateVal, Session.getScriptTimeZone() || 'GMT+7', 'yyyy');
    } else {
      year = String(dateVal).substring(0, 4);
    }

    if (String(year) === String(nextYear)) {
      nextYearHolidaysSet = true;
      break;
    }
  }

  if (!nextYearHolidaysSet) {
    const adminEmail = Session.getEffectiveUser().getEmail();
    if (adminEmail) {
      const subject = `[Action Required] Setup Holidays for ${nextYear}`;
      const body = `Hello,\n\nThe holidays for the upcoming year (${nextYear}) have not been set up in the Leave Request Portal yet.\nPlease log in to the HR Portal or check the Google Sheet to set up the holidays before the new year starts.\n\nThank you.`;

      try {
        MailApp.sendEmail(adminEmail, subject, body);
      } catch(e) {
      }
    }
  }
}
