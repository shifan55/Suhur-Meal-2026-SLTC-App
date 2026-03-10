// ============================================================
//  SAHAR MEAL REGISTRATION — Web App Backend
//  Place this in Apps Script of your CONFIG/BASE Spreadsheet
// ============================================================

var ADMIN_EMAIL     = "admin@gmail.com";
var ADMIN_PASSWORD  = "admin123";
var ROLE_ADMIN      = "admin";
var ROLE_COADMIN    = "co_admin";
var APPROVED_SS_ID  = "YOUR_APPROVED_STUDENTS_SPREADSHEET_ID";
var APPROVED_SHEET  = "Approved";  // sheet tab name
var REJECTED_SS_ID  = "YOUR_REJECTED_LOG_SPREADSHEET_ID";
var REJECTED_SHEET  = "Rejected Responses";
var CONFIG_SHEET    = "Config";
var TESTING_SHEET_NAME = "testing only";
var STUDENT_ID_BODY_RX = "((2[1-3])[Uu][Gg][1-2]-0\\d{3}|(CIT|ENG|BUS|TEC|SCI)-(23|24|25)-(01|02)-0(?:00[1-9]|0[1-9][0-9]|[1-9][0-9]{2}))";
var STUDENT_ID_RX = new RegExp("^" + STUDENT_ID_BODY_RX + "$", "i");
var STUDENT_EMAIL_RX = new RegExp("^" + STUDENT_ID_BODY_RX + "@(sltc\\.ac\\.lk|sltc\\.edu\\.lk)$", "i");

function isValidStudentID_(studentID) {
  return STUDENT_ID_RX.test(String(studentID || "").trim());
}

function isValidStudentEmail_(email) {
  return STUDENT_EMAIL_RX.test(String(email || "").trim());
}

// ============================================================
//  Serve HTML
// ============================================================
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Sahar Meal Registration – SLTC")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
//  Get the logged-in user's email to verify SLTC account
// ============================================================
function getActiveUserEmail() {
  try {
    var email = Session.getActiveUser().getEmail();
    return {
      email     : email || "",
      isSLTC    : email ? (email.toLowerCase().endsWith("@sltc.ac.lk") || email.toLowerCase().endsWith("@sltc.edu.lk")) : null,
      detected  : email !== ""
    };
  } catch(e) {
    return { email: "", isSLTC: null, detected: false };
  }
}

// ============================================================
//  Hijri Date Calculation
// ============================================================
function gregorianToHijri(date) {
  var day   = date.getDate();
  var month = date.getMonth() + 1;
  var year  = date.getFullYear();

  var jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4)
         + Math.floor((367  * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12)
         - Math.floor((3    * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4)
         + day - 32075;

  var l = jd - 1948440 + 10632;
  var n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
        + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
        - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  var hMonth = Math.floor((24 * l) / 709);
  var hDay   = l - Math.floor((709 * hMonth) / 24);
  var hYear  = 30 * n + j - 29;

  var names = [
    "Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani",
    "Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban",
    "Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"
  ];
  return { day: hDay, month: hMonth, year: hYear, monthName: names[hMonth - 1] };
}

function getHijriString(date) {
  var h  = gregorianToHijri(date || new Date());
  var gd = (date || new Date());
  var gMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return h.day + " " + h.monthName + " • " + gMonths[gd.getMonth()] + " " + gd.getDate();
}

// ============================================================
//  Config helpers  (stored in the script's own spreadsheet)
// ============================================================
function getConfigSheet() {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
    config.getRange("A1:B1").setValues([["Setting","Value"]]);
    config.getRange("A2:B6").setValues([
      ["close_hour",            "16"],
      ["close_min",             "0"],
      ["open_hour",             "0"],
      ["open_min",              "0"],
      ["current_response_ss_id",""]
    ]);
  }
  return config;
}

function getConfig() {
  var data     = getConfigSheet().getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) settings[data[i][0]] = data[i][1];
  return settings;
}

function setConfigValue(key, value) {
  var sheet = getConfigSheet();
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sheet.getRange(i + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

// ============================================================
//  Form open/close logic
// ============================================================
function isFormOpen() {
  var cfg        = getConfig();
  var now        = new Date();
  var nowM       = now.getHours() * 60 + now.getMinutes();
  var openM      = parseInt(cfg["open_hour"])  * 60 + parseInt(cfg["open_min"]);
  var closeM     = parseInt(cfg["close_hour"]) * 60 + parseInt(cfg["close_min"]);
  var hasSheet   = cfg["current_response_ss_id"] && cfg["current_response_ss_id"] !== "";
  return hasSheet && nowM >= openM && nowM < closeM;
}

function getFormStatus() {
  var cfg  = getConfig();
  var open = isFormOpen();
  return {
    isOpen    : open,
    closeHour : cfg["close_hour"],
    closeMin  : cfg["close_min"],
    openHour  : cfg["open_hour"],
    openMin   : cfg["open_min"],
    hasSheet  : cfg["current_response_ss_id"] !== ""
  };
}

// ============================================================
//  Admin Authentication  (token stored in PropertiesService)
// ============================================================
function getCoAdminUsers_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("CO_ADMIN_USERS");
    var list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(function(u){
      return u && u.email && u.password;
    });
  } catch (e) {
    return [];
  }
}

function saveCoAdminUsers_(users) {
  PropertiesService.getScriptProperties().setProperty("CO_ADMIN_USERS", JSON.stringify(users || []));
}

function getAdminSessions_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty("ADMIN_SESSIONS");
    var map = raw ? JSON.parse(raw) : {};
    return map && typeof map === "object" ? map : {};
  } catch (e) {
    return {};
  }
}

function saveAdminSessions_(sessions) {
  PropertiesService.getScriptProperties().setProperty("ADMIN_SESSIONS", JSON.stringify(sessions || {}));
}

function createAdminSession_(email, role) {
  var token = Utilities.getUuid();
  var sessions = getAdminSessions_();
  sessions[token] = {
    email: String(email || "").toLowerCase(),
    role: role || ROLE_COADMIN,
    createdAt: new Date().toISOString()
  };
  saveAdminSessions_(sessions);
  return token;
}

function getSessionUser_(token) {
  if (!token) return null;
  var sessions = getAdminSessions_();
  if (sessions[token]) return sessions[token];

  // Backward compatibility for previous single-token admin login.
  var legacy = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
  if (legacy && legacy === token) {
    return { email: ADMIN_EMAIL.toLowerCase(), role: ROLE_ADMIN };
  }
  return null;
}

function adminLogin(email, password) {
  var em = String(email || "").trim().toLowerCase();
  var pw = String(password || "");

  if (!em || !pw) {
    return { success: false, message: "Access denied. Invalid email or password." };
  }

  if (em === ADMIN_EMAIL.toLowerCase()) {
    if (pw !== ADMIN_PASSWORD) return { success: false, message: "Access denied. Invalid password." };
    var adminToken = createAdminSession_(em, ROLE_ADMIN);
    return { success: true, token: adminToken, role: ROLE_ADMIN, email: em };
  }

  var coAdmins = getCoAdminUsers_();
  for (var i = 0; i < coAdmins.length; i++) {
    var u = coAdmins[i];
    if (String(u.email || "").toLowerCase() === em && String(u.password || "") === pw) {
      var coToken = createAdminSession_(em, ROLE_COADMIN);
      return { success: true, token: coToken, role: ROLE_COADMIN, email: em };
    }
  }

  return { success: false, message: "Access denied. Invalid email or password." };
}

function verifyToken(token) {
  return !!getSessionUser_(token);
}

function requireRole_(token, roles) {
  var user = getSessionUser_(token);
  if (!user) return { ok: false, message: "Unauthorized." };
  if (roles.indexOf(user.role) === -1) return { ok: false, message: "Insufficient permissions." };
  return { ok: true, user: user };
}

function getMyAdminProfile(token) {
  var chk = requireRole_(token, [ROLE_ADMIN, ROLE_COADMIN]);
  if (!chk.ok) return { success: false, message: chk.message };
  return { success: true, role: chk.user.role, email: chk.user.email || "" };
}

function getCoAdmins(token) {
  var chk = requireRole_(token, [ROLE_ADMIN]);
  if (!chk.ok) return { success: false, message: chk.message };

  var users = getCoAdminUsers_().map(function(u){
    return {
      email: String(u.email || "").toLowerCase(),
      createdAt: u.createdAt || ""
    };
  });
  users.sort(function(a, b){
    return (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime();
  });
  return { success: true, users: users };
}

function createCoAdmin(token, email, password) {
  var chk = requireRole_(token, [ROLE_ADMIN]);
  if (!chk.ok) return { success: false, message: chk.message };

  var em = String(email || "").trim().toLowerCase();
  var pw = String(password || "").trim();
  if (!em || !pw) return { success: false, message: "Email and password are required." };
  if (!/@/.test(em)) return { success: false, message: "Invalid email address." };
  if (em === ADMIN_EMAIL.toLowerCase()) return { success: false, message: "This email is reserved for main admin." };
  if (pw.length < 6) return { success: false, message: "Password must be at least 6 characters." };

  var users = getCoAdminUsers_();
  var exists = users.some(function(u){ return String(u.email || "").toLowerCase() === em; });
  if (exists) return { success: false, message: "Co-admin already exists." };

  users.push({ email: em, password: pw, createdAt: new Date().toISOString(), createdBy: chk.user.email || "" });
  saveCoAdminUsers_(users);
  return { success: true, message: "Co-admin created successfully." };
}

function removeCoAdmin(token, email) {
  var chk = requireRole_(token, [ROLE_ADMIN]);
  if (!chk.ok) return { success: false, message: chk.message };

  var em = String(email || "").trim().toLowerCase();
  if (!em) return { success: false, message: "Missing email." };
  if (em === ADMIN_EMAIL.toLowerCase()) return { success: false, message: "Cannot remove main admin." };

  var users = getCoAdminUsers_();
  var next = users.filter(function(u){ return String(u.email || "").toLowerCase() !== em; });
  if (next.length === users.length) return { success: false, message: "Co-admin not found." };
  saveCoAdminUsers_(next);
  return { success: true, message: "Co-admin removed." };
}

// ============================================================
//  Schedule New Form  → creates a new Spreadsheet
// ============================================================
function scheduleNewForm(token, dateStr, openHour, openMin, closeHour, closeMin) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };

  // Parse the selected date (dateStr format: "YYYY-MM-DD")
  var parts    = dateStr.split("-");
  var selDate  = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

  // Build spreadsheet name using selected date
  var hijri    = getHijriString(selDate);
  var ssName   = "Suhur Meal 2026\u2014SLTC Student Sign-Up " + hijri;

  // Create new spreadsheet
  var newSS    = SpreadsheetApp.create(ssName);
  var sheet    = newSS.getActiveSheet();
  sheet.setName("Form Responses 1");
  try {
    newSS.addDeveloperMetadata("SUHUR_APP_SOURCE", "SLTC_SAHAR_2026");
  } catch (e) {}
  try {
    var sessionFolder = getOrCreateSessionFolder_();
    var ssFile = DriveApp.getFileById(newSS.getId());
    ssFile.moveTo(sessionFolder);
  } catch (e) {}

  // Add headers
  var headers  = ["Timestamp","Email","Full Name","Student ID","Faculty","Year / Batch","Contact Number","Sahar Meal Tomorrow","Delivery Location"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatResponseSheet_(sheet, headers.length);

  // Save config
  setConfigValue("current_response_ss_id", newSS.getId());
  setConfigValue("open_hour",  openHour);
  setConfigValue("open_min",   openMin);
  setConfigValue("close_hour", closeHour);
  setConfigValue("close_min",  closeMin);

  return {
    success     : true,
    sheetName   : ssName,
    sheetId     : newSS.getId(),
    sheetUrl    : newSS.getUrl(),
    message     : "New registration sheet created and form scheduled successfully."
  };
}

// ============================================================
//  Update schedule only (no new sheet)
// ============================================================
function updateSchedule(token, openHour, openMin, closeHour, closeMin) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };
  setConfigValue("open_hour",  openHour);
  setConfigValue("open_min",   openMin);
  setConfigValue("close_hour", closeHour);
  setConfigValue("close_min",  closeMin);
  return { success: true };
}

function getOrCreateSessionFolder_() {
  var folderName = "App Script Session";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function formatResponseSheet_(sheet, colCount) {
  var header = sheet.getRange(1, 1, 1, colCount);
  header
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground("#1f2937")
    .setFontColor("#f8fafc")
    .setBorder(true, true, true, true, true, true, "#334155", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // Keep the sheet easy to scan on desktop and mobile.
  sheet.setColumnWidths(1, colCount, 170);
  sheet.setColumnWidth(1, 190); // Timestamp
  sheet.setColumnWidth(2, 260); // Email
  sheet.setColumnWidth(3, 220); // Full Name
  sheet.setColumnWidth(4, 150); // Student ID
  sheet.setColumnWidth(5, 230); // Faculty
  sheet.setColumnWidth(6, 150); // Year / Batch
  sheet.setColumnWidth(7, 170); // Contact
  sheet.setColumnWidth(8, 220); // Sahar Meal Tomorrow
  sheet.setColumnWidth(9, 220); // Delivery Location

  var maxRows = Math.max(sheet.getMaxRows(), 1000);
  var body = sheet.getRange(2, 1, maxRows - 1, colCount);
  body
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(2, 1, maxRows - 1, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange(1, 1, maxRows, colCount).createFilter();
  sheet.getRange(1, 1, maxRows, colCount).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

function isAppSessionSpreadsheet_(ss) {
  try {
    var md = ss.getDeveloperMetadata ? ss.getDeveloperMetadata() : [];
    for (var i = 0; i < md.length; i++) {
      if (md[i].getKey && md[i].getKey() === "SUHUR_APP_SOURCE" &&
          md[i].getValue && md[i].getValue() === "SLTC_SAHAR_2026") {
        return true;
      }
    }
  } catch (e) {}

  var sheet = ss.getSheetByName("Form Responses 1");
  if (!sheet) return false;
  if (sheet.getLastColumn() < 9) return false;

  var expected = ["Timestamp","Email","Full Name","Student ID","Faculty","Year / Batch","Contact Number","Sahar Meal Tomorrow","Delivery Location"];
  var got = sheet.getRange(1, 1, 1, expected.length).getValues()[0].map(String);
  for (var j = 0; j < expected.length; j++) {
    if (got[j] !== expected[j]) return false;
  }
  return true;
}

// ============================================================
//  Admin: List session spreadsheets (old + current)
// ============================================================
function getSessionSheets(token) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };

  var cfg = getConfig();
  var activeId = String(cfg["current_response_ss_id"] || "");
  var sessions = [];

  try {
    var files = DriveApp.searchFiles("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    while (files.hasNext()) {
      var f = files.next();
      var name = f.getName();
      try {
        var ss = SpreadsheetApp.openById(f.getId());
        if (!isAppSessionSpreadsheet_(ss)) continue;
        sessions.push({
          id: f.getId(),
          name: name,
          url: f.getUrl(),
          createdAt: f.getDateCreated() ? f.getDateCreated().toISOString() : "",
          updatedAt: f.getLastUpdated() ? f.getLastUpdated().toISOString() : "",
          isActive: f.getId() === activeId
        });
      } catch (inner) {
        // Skip inaccessible/invalid spreadsheets.
      }
    }

    sessions.sort(function(a, b){
      return (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime();
    });

    return { success: true, activeId: activeId, sessions: sessions };
  } catch (e) {
    return { success: false, message: "Could not load sessions: " + e.message };
  }
}

// ============================================================
//  Admin: Set active session spreadsheet
// ============================================================
function setActiveSession(token, sheetId) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };
  if (!sheetId) return { success: false, message: "Missing sheet id." };

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sh = ss.getSheetByName("Form Responses 1");
    if (!sh) return { success: false, message: "Selected spreadsheet does not contain 'Form Responses 1'." };
    setConfigValue("current_response_ss_id", sheetId);
    return { success: true, message: "Active session updated.", sheetName: ss.getName(), sheetId: sheetId, sheetUrl: ss.getUrl() };
  } catch (e) {
    return { success: false, message: "Could not set active session: " + e.message };
  }
}

// ============================================================
//  Get today's responses for admin view
// ============================================================
function getResponses(token) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };
  var cfg = getConfig();
  if (!cfg["current_response_ss_id"]) return { success: true, rows: [], headers: [], sheetName: "" };

  try {
    var ss    = SpreadsheetApp.openById(cfg["current_response_ss_id"]);
    var sheet = ss.getSheetByName("Form Responses 1");
    if (!sheet || sheet.getLastRow() < 1) return { success: true, rows: [], headers: [], sheetName: ss.getName() };

    var data    = sheet.getDataRange().getValues();
    var headers = data[0].map(String);
    var rows    = data.slice(1).map(function(r) {
      return r.map(function(c) { return c instanceof Date ? c.toLocaleString() : String(c); });
    });
    var rowNumbers = data.slice(1).map(function(_, i){ return i + 2; });
    return { success: true, headers: headers, rows: rows, rowNumbers: rowNumbers, sheetName: ss.getName(), sheetUrl: ss.getUrl() };
  } catch(e) {
    return { success: false, message: "Could not load responses: " + e.message };
  }
}

// ============================================================
//  Admin: Add record manually to active response sheet
// ============================================================
function addManualRecord(token, formData) {
  var chk = requireRole_(token, [ROLE_ADMIN]);
  if (!chk.ok) return { success: false, message: chk.message };

  var cfg = getConfig();
  var responseId = cfg["current_response_ss_id"];
  if (!responseId) return { success: false, message: "No active sheet is scheduled." };

  if (!formData) return { success: false, message: "Missing data." };

  var fullName = String(formData.fullName || "").trim();
  var studentID = String(formData.studentID || "").trim().toUpperCase();
  var faculty = String(formData.faculty || "").trim();
  var batch = String(formData.batch || "").trim();
  var email = String(formData.email || "").trim();
  var contact = String(formData.contact || "").trim();
  var mealTomorrow = String(formData.mealTomorrow || "").trim();
  var location = String(formData.location || "").trim();

  if (!fullName || !studentID || !faculty || !batch || !email || !contact || !mealTomorrow || !location) {
    return { success: false, message: "All fields are required." };
  }
  if (!isValidStudentID_(studentID)) return { success: false, message: "Invalid Student ID format." };
  if (!isValidStudentEmail_(email)) return { success: false, message: "Invalid email address format." };
  if (!/^07\d{8}$/.test(contact)) return { success: false, message: "Invalid contact number. Use 07XXXXXXXX." };

  if (mealTomorrow !== "Yes" && mealTomorrow !== "No") {
    return { success: false, message: "Meal preference must be Yes or No." };
  }

  var row = [
    new Date(),
    email,
    fullName,
    studentID,
    faculty,
    batch,
    contact,
    mealTomorrow,
    location
  ];

  try {
    var ss = SpreadsheetApp.openById(responseId);
    var sheet = ss.getSheetByName("Form Responses 1");
    if (!sheet) return { success: false, message: "Response sheet not found." };
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return { success: true, message: "Record added successfully." };
  } catch (e) {
    return { success: false, message: "Could not add record: " + e.message };
  }
}

// ============================================================
//  Admin: Update an existing response row in active sheet
// ============================================================
function updateResponseRecord(token, rowNumber, formData) {
  if (!verifyToken(token)) return { success: false, message: "Unauthorized." };

  var cfg = getConfig();
  var responseId = cfg["current_response_ss_id"];
  if (!responseId) return { success: false, message: "No active sheet is scheduled." };

  var rowNo = parseInt(rowNumber, 10);
  if (!rowNo || rowNo < 2) return { success: false, message: "Invalid row number." };
  if (!formData) return { success: false, message: "Missing data." };

  var fullName = String(formData.fullName || "").trim();
  var studentID = String(formData.studentID || "").trim().toUpperCase();
  var faculty = String(formData.faculty || "").trim();
  var batch = String(formData.batch || "").trim();
  var email = String(formData.email || "").trim();
  var contact = String(formData.contact || "").trim();
  var mealTomorrow = String(formData.mealTomorrow || "").trim();
  var location = String(formData.location || "").trim();

  if (!fullName || !studentID || !faculty || !batch || !email || !contact || !mealTomorrow || !location) {
    return { success: false, message: "All fields are required." };
  }
  if (!isValidStudentID_(studentID)) return { success: false, message: "Invalid Student ID format." };
  if (!isValidStudentEmail_(email)) return { success: false, message: "Invalid email address format." };
  if (!/^07\d{8}$/.test(contact)) return { success: false, message: "Invalid contact number. Use 07XXXXXXXX." };
  if (mealTomorrow !== "Yes" && mealTomorrow !== "No") {
    return { success: false, message: "Meal preference must be Yes or No." };
  }

  try {
    var ss = SpreadsheetApp.openById(responseId);
    var sheet = ss.getSheetByName("Form Responses 1");
    if (!sheet) return { success: false, message: "Response sheet not found." };
    if (rowNo > sheet.getLastRow()) return { success: false, message: "Row does not exist." };

    var existingTs = sheet.getRange(rowNo, 1).getValue();
    var row = [
      existingTs,
      email,
      fullName,
      studentID,
      faculty,
      batch,
      contact,
      mealTomorrow,
      location
    ];
    sheet.getRange(rowNo, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return { success: true, message: "Record updated successfully." };
  } catch (e) {
    return { success: false, message: "Could not update record: " + e.message };
  }
}

// ============================================================
//  Check duplicate submission today
// ============================================================
function alreadySubmittedToday(studentID, responseSSId) {
  if (!responseSSId) return false;
  try {
    var ss    = SpreadsheetApp.openById(responseSSId);
    var sheet = ss.getSheetByName("Form Responses 1");
    if (!sheet || sheet.getLastRow() < 2) return false;

    var today    = new Date();
    var todayStr = today.getFullYear() + "-" +
                   String(today.getMonth() + 1).padStart(2,"0") + "-" +
                   String(today.getDate()).padStart(2,"0");
    var data     = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var rowDate = new Date(data[i][0]);
      var rowStr  = rowDate.getFullYear() + "-" +
                    String(rowDate.getMonth() + 1).padStart(2,"0") + "-" +
                    String(rowDate.getDate()).padStart(2,"0");
      if (rowStr === todayStr && data[i][3].toString().trim().toUpperCase() === studentID.toUpperCase()) return true;
    }
  } catch(e) {}
  return false;
}

// ============================================================
//  Check approved list
// ============================================================
function isApproved(studentID) {
  try {
    var ss    = SpreadsheetApp.openById(APPROVED_SS_ID);
    var sheet = ss.getSheetByName(APPROVED_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return false;
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    var ids  = data.map(function(r) { return r[0].toString().trim().toUpperCase(); });
    return ids.indexOf(studentID.toString().trim().toUpperCase()) !== -1;
  } catch(e) { return false; }
}

function getTestingSheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty("TESTING_SS_ID");
  var ss;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create(TESTING_SHEET_NAME);
    props.setProperty("TESTING_SS_ID", ss.getId());
  }

  var sh = ss.getSheetByName(TESTING_SHEET_NAME) || ss.getSheets()[0];
  if (sh.getName() !== TESTING_SHEET_NAME) sh.setName(TESTING_SHEET_NAME);

  var headers = ["Timestamp","Email","Full Name","Student ID","Faculty","Year / Batch","Contact","Sahar Meal Tomorrow","Delivery Location"];
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatResponseSheet_(sh, headers.length);
  } else {
    var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var hasHeaders = first.join("|") === headers.join("|");
    if (!hasHeaders) {
      sh.insertRows(1);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatResponseSheet_(sh, headers.length);
    }
  }
  return sh;
}

// ============================================================
//  Submit Form
// ============================================================
function submitForm(formData) {
  if (!isFormOpen()) {
    return { success: false, reason: "closed",
             message: "⏰ Registration is now closed for today. <br>🌙 Insha Allah, Try Tomorrow 😉" };
  }

  var cfg       = getConfig();
  var responseId = cfg["current_response_ss_id"];
  var email = String(formData.email || "").trim();
  var studentID = formData.studentID.toString().trim().toUpperCase();
  var mealTomorrow = String(formData.mealTomorrow || "").trim();

  if (mealTomorrow !== "Yes" && mealTomorrow !== "No") {
    return { success: false, reason: "error", message: "Please select Yes or No for Sahar meal tomorrow." };
  }
  if (!isValidStudentID_(studentID)) {
    return { success: false, reason: "error", message: "Invalid Student ID format." };
  }
  if (!isValidStudentEmail_(email)) {
    return { success: false, reason: "error", message: "Invalid email address format." };
  }

  if (alreadySubmittedToday(studentID, responseId)) {
    return { success: false, reason: "duplicate",
             message: "⚠️ You have already submitted today. Only one submission per day is allowed." };
  }

  var row = [
    new Date(),
    email,
    formData.fullName,
    studentID,
    formData.faculty,
    formData.batch,
    formData.contact,
    mealTomorrow,
    formData.location || ""
  ];

  if (!isApproved(studentID)) {
    try {
      var rejSS    = SpreadsheetApp.openById(REJECTED_SS_ID);
      var rejSheet = rejSS.getSheetByName(REJECTED_SHEET);
      if (rejSheet) rejSheet.appendRow(row.concat(["Not in approved list", new Date()]));
    } catch(e) {}
    return { success: false, reason: "rejected",
             message: "Invalid Student ID. Only preregistered users can submit this form." };
  }

  try {
    var resSS    = SpreadsheetApp.openById(responseId);
    var resSheet = resSS.getSheetByName("Form Responses 1");
    resSheet.appendRow(row);
  } catch(e) {
    return { success: false, reason: "error", message: "Could not save your response. Please try again." };
  }

  // ── Send confirmation email ──────────────────────────────
  try {
    var submittedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy 'at' hh:mm a");
    var subject     = "✅ Sahar Meal Registration Confirmed – SLTC";

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0e18;color:#d8e0f0;border-radius:12px;overflow:hidden">' +
        '<div style="background:#111827;padding:28px 32px;text-align:center;border-bottom:1px solid #253045">' +
          '<div style="font-size:40px;margin-bottom:8px">🌙</div>' +
          '<h1 style="font-family:Georgia,serif;color:#e8c96a;margin:0;font-size:22px">Sahar Meal Registration</h1>' +
          '<p style="color:#64748b;margin:6px 0 0;font-size:13px">Sri Lanka Technological Campus</p>' +
        '</div>' +
        '<div style="padding:28px 32px">' +
          '<p style="color:#a0aec0;font-size:15px;margin-top:0">Assalamu Alaikum <strong style="color:#d8e0f0">' + formData.fullName + '</strong>,</p>' +
          '<p style="color:#a0aec0;font-size:14px;line-height:1.7">Your Sahar meal registration has been <strong style="color:#22c55e">confirmed successfully</strong>. Here is a summary of your submission:</p>' +
          '<div style="background:#1a2438;border:1px solid #253045;border-radius:10px;overflow:hidden;margin:20px 0">' +
            '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b;width:40%">Full Name</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0;font-weight:600">' + formData.fullName + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Student ID</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0;font-weight:600">' + studentID + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Faculty</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0">' + formData.faculty + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Year / Batch</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0">' + formData.batch + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Email</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0">' + email + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Contact</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0">' + formData.contact + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Sahar Meal Tomorrow</td>' +
                '<td style="padding:12px 16px;color:#d8e0f0">' + mealTomorrow + '</td>' +
              '</tr>' +
              '<tr style="border-bottom:1px solid #253045">' +
                '<td style="padding:12px 16px;color:#64748b">Delivery Location</td>' +
                '<td style="padding:12px 16px;color:#c9a84c;font-weight:600">🚚 ' + (formData.location || '—') + '</td>' +
              '</tr>' +
              '<tr>' +
                '<td style="padding:12px 16px;color:#64748b">Submitted At</td>' +
                '<td style="padding:12px 16px;color:#c9a84c;font-weight:600">' + submittedAt + '</td>' +
              '</tr>' +
            '</table>' +
          '</div>' +
          '<div style="background:#0f2a1a;border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:16px 20px;margin-top:4px">' +
            '<p style="margin:0;font-size:14px;color:#22c55e;font-weight:600">📍 Important Reminder</p>' +
            '<p style="margin:8px 0 0;font-size:13px;color:#a0aec0;line-height:1.6">Please be at your designated pickup point on time. Ramadan Mubarak! 🌙</p>' +
          '</div>' +
        '</div>' +
        '<div style="padding:20px 32px;text-align:center;border-top:1px solid #253045;background:#111827">' +
          '<p style="color:#64748b;font-size:12px;margin:0">This is an automated confirmation from SLTC Sahar Meal Registration System.</p>' +
          '<p style="color:#64748b;font-size:12px;margin:6px 0 0">If you did not register, please contact us immediately.</p>' +
        '</div>' +
      '</div>';

    var plainBody =
      "Assalamu Alaikum " + formData.fullName + ",\n\n" +
      "Your Sahar meal registration has been confirmed.\n\n" +
      "REGISTRATION DETAILS\n" +
      "────────────────────\n" +
      "Full Name  : " + formData.fullName + "\n" +
      "Student ID : " + studentID + "\n" +
      "Faculty    : " + formData.faculty + "\n" +
      "Year/Batch : " + formData.batch + "\n" +
      "Email      : " + email + "\n" +
      "Contact    : " + formData.contact + "\n" +
      "Meal Tomorrow: " + mealTomorrow + "\n" +
      "Location   : " + (formData.location || "—") + "\n" +
      "Submitted  : " + submittedAt + "\n\n" +
      "📍 Please be at your pickup point on time and bring your Student ID.\n\n" +
      "Ramadan Mubarak! 🌙\n" +
      "SLTC Sahar Meal Registration System";

    MailApp.sendEmail({
      to      : email,
      subject : subject,
      body    : plainBody,
      htmlBody: htmlBody
    });
  } catch(mailErr) {
    // Email failure should not block the success response
    Logger.log("Email send failed: " + mailErr.message);
  }

  return { success: true,
           message: "JazakAllah Khair! Your Sahar meal has been registered successfully. A confirmation email has been sent to " + email + ". Please be at your pickup point on time. 🌙" };
}

function submitTestingForm(token, formData) {
  var chk = requireRole_(token, [ROLE_ADMIN]);
  if (!chk.ok) return { success: false, reason: "error", message: chk.message };

  if (!formData) {
    return { success: false, reason: "error", message: "Missing form data." };
  }

  var fullName = String(formData.fullName || "").trim();
  var studentID = String(formData.studentID || "").trim().toUpperCase();
  var faculty = String(formData.faculty || "").trim();
  var batch = String(formData.batch || "").trim();
  var email = String(formData.email || "").trim();
  var contact = String(formData.contact || "").trim();
  var mealTomorrow = String(formData.mealTomorrow || "").trim();
  var location = String(formData.location || "").trim();

  if (!fullName || !studentID || !faculty || !batch || !email || !contact || !mealTomorrow || !location) {
    return { success: false, reason: "error", message: "All fields are required." };
  }
  if (!isValidStudentID_(studentID)) {
    return { success: false, reason: "error", message: "Invalid Student ID format." };
  }
  if (!isValidStudentEmail_(email)) {
    return { success: false, reason: "error", message: "Invalid email address format." };
  }
  if (!/^07\d{8}$/.test(contact)) {
    return { success: false, reason: "error", message: "Contact must be 10 digits and start with 07." };
  }
  if (mealTomorrow !== "Yes" && mealTomorrow !== "No") {
    return { success: false, reason: "error", message: "Please select Yes or No for Sahar meal tomorrow." };
  }

  var row = [
    new Date(),
    email,
    fullName,
    studentID,
    faculty,
    batch,
    contact,
    mealTomorrow,
    location
  ];

  try {
    getTestingSheet_().appendRow(row);
    return { success: true, reason: "success", message: "Testing submission saved to '" + TESTING_SHEET_NAME + "'." };
  } catch (e) {
    return { success: false, reason: "error", message: "Could not save testing response. Please try again." };
  }
}
