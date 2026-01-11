
/**
 * Syifamili Backend - Fixed Push Broadcast Logic
 */

const VERCEL_PUSH_API_URL = 'https://GANTI_DENGAN_DOMAIN_VERCEL_ANDA/api/send-push'; 
const UPLOAD_FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_GOOGLE_DRIVE_ANDA'; 

const DATABASE_SCHEMA = {
  'members': ['id', 'name', 'relation', 'gender', 'birthDate', 'bloodType', 'photoUrl', 'isElderly', 'isChild', 'nik', 'insurances', 'allergies', 'aiGrowthAnalysis', 'aiImmunizationAnalysis', 'aiDevelopmentAnalysis', 'developmentChecklist', 'immunizationChecklist'],
  'records': ['id', 'memberId', 'title', 'dateTime', 'type', 'description', 'diagnosis', 'saran', 'obat', 'doctorName', 'facility', 'files', 'temperature', 'systolic', 'diastolic', 'heartRate', 'oxygen', 'respiratoryRate', 'investigations', 'aiAnalysis'], 
  'appointments': ['id', 'memberId', 'title', 'dateTime', 'doctor', 'location', 'reminded'],
  'meds': ['id', 'memberId', 'name', 'dosage', 'frequency', 'instructions', 'nextTime', 'active', 'fileUrl', 'fileName', 'aiAnalysis', 'consumptionHistory'],
  'growthLogs': ['id', 'memberId', 'dateTime', 'weight', 'height', 'headCircumference'],
  'vitalLogs': ['id', 'memberId', 'dateTime', 'heartRate', 'systolic', 'diastolic', 'temperature', 'oxygen', 'respiratoryRate'],
  'homeCareLogs': ['id', 'memberId', 'title', 'active', 'entries', 'createdTime', 'aiAnalysis'], 
  'notes': ['id', 'memberId', 'date', 'dateTime', 'text', 'type', 'mood', 'activity', 'meals', 'fluids', 'hygiene', 'bab', 'bak'],
  'contacts': ['id', 'name', 'type', 'phone', 'address', 'gmapsUrl', 'latitude', 'longitude'],
  'subscriptions': ['endpoint', 'keys_p256dh', 'keys_auth', 'userAgent', 'timestamp'],
  'Listing': ['id', 'priorities', 'startDate', 'periodeAktif', 'endDate', 'jenis', 'subJenis', 'tenagaKesehatan', 'nama', 'str', 'kontak', 'alamat', 'linkAlamat', 'tempatPraktik1', 'kontak1', 'alamat1', 'link1', 'sip1', 'tempatPraktik2', 'kontak2', 'alamat2', 'link2', 'sip2', 'tempatPraktik3', 'kontak3', 'alamat3', 'link3', 'sip3', 'sosmed', 'campaign', 'imageUrl', 'wilayahKerja', 'keywords'],
  'Banner': ['ID', 'Client', 'StartDate', 'Periode', 'EndDate', 'LinkImage']
};

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  
  if (e.parameter.test === 'true') {
     try {
       sendPushBroadcast({
         title: "Syifamili Berhasil Terhubung! 🔔",
         body: "Notifikasi otomatis dari cloud sekarang aktif di HP ini.",
         url: "/"
       });
       return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Test broadcast initiated' })).setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
     }
  }

  Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) { 
      sheet = ss.insertSheet(sheetName); 
      sheet.appendRow(DATABASE_SCHEMA[sheetName]);
    }
  });

  Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
    if (sheetName === 'subscriptions') return;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) { result[sheetName] = []; return; }
    
    const values = sheet.getDataRange().getDisplayValues(); 
    if (values.length <= 1) { result[sheetName] = []; return; }
    const headers = values[0];
    result[sheetName] = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) { try { val = JSON.parse(val); } catch(err) {} }
        obj[header] = val;
      });
      return obj;
    });
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (lock.tryLock(30000)) {
      const request = JSON.parse(e.postData.contents);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      if (request.action === 'saveSubscription') {
        const sub = request.subscription;
        let sheet = ss.getSheetByName('subscriptions') || ss.insertSheet('subscriptions');
        if (sheet.getLastRow() === 0) sheet.appendRow(DATABASE_SCHEMA['subscriptions']);
        
        const data = sheet.getDataRange().getValues();
        // Cek duplikasi endpoint
        const isDuplicate = data.some(row => row[0] === sub.endpoint);
        if (!isDuplicate) {
          sheet.appendRow([sub.endpoint, sub.keys.p256dh, sub.keys.auth, request.userAgent, new Date().toISOString()]);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
      }

      if (request.action === 'saveAll') {
        const payload = request.payload;
        Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
          if (sheetName === 'subscriptions') return;
          if (payload.hasOwnProperty(sheetName)) {
            let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
            const headers = DATABASE_SCHEMA[sheetName];
            const dataRows = payload[sheetName] || [];
            sheet.clearContents();
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            if (dataRows.length > 0) {
              const formattedRows = dataRows.map(item => headers.map(h => {
                let val = item[h]; if (val === undefined || val === null) return '';
                return "'" + ((typeof val === 'object') ? JSON.stringify(val) : val.toString()); 
              }));
              sheet.getRange(2, 1, formattedRows.length, headers.length).setValues(formattedRows);
            }
          }
        });
        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (request.action === 'upload') {
        try {
          let folder = UPLOAD_FOLDER_ID && !UPLOAD_FOLDER_ID.includes('GANTI') ? DriveApp.getFolderById(UPLOAD_FOLDER_ID) : DriveApp.getRootFolder();
          const data = Utilities.base64Decode(request.base64);
          const blob = Utilities.newBlob(data, request.mimeType, request.fileName);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', url: "https://drive.google.com/uc?export=view&id=" + file.getId() })).setMimeType(ContentService.MimeType.JSON);
        } catch (err) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
      }
    }
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
  finally { lock.releaseLock(); }
}

/**
 * Pengecekan Terjadwal (Run every 1 minute via Trigger)
 */
function checkReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const now = new Date();
  
  // Deteksi event 10 menit ke depan
  const target = new Date(now.getTime() + (10 * 60 * 1000));
  const targetStr = Utilities.formatDate(target, tz, "yyyy-MM-dd HH:mm");
  
  // 1. Pengingat Obat
  const medSheet = ss.getSheetByName('meds');
  if (medSheet) {
    const vals = medSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < vals.length; i++) {
      const row = vals[i]; // 0:id, 1:memberId, 2:name, 6:nextTime, 7:active
      if ((row[7] === 'TRUE' || row[7] === 'true') && row[6]) {
        const sched = Utilities.formatDate(new Date(row[6]), tz, "yyyy-MM-dd HH:mm");
        if (sched === targetStr) {
          sendPushBroadcast({
            title: "Waktunya Minum Obat 💊",
            body: `Pemberitahuan 10 menit lagi: ${row[2]} (${row[3]}).`,
            url: "/?tab=meds&id=" + row[0] + "&memberId=" + row[1]
          });
        }
      }
    }
  }

  // 2. Jadwal Kontrol
  const apptSheet = ss.getSheetByName('appointments');
  if (apptSheet) {
    const vals = apptSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < vals.length; i++) {
      const row = vals[i]; // 0:id, 1:memberId, 2:title, 3:dateTime, 5:location
      if (row[3]) {
        const sched = Utilities.formatDate(new Date(row[3]), tz, "yyyy-MM-dd HH:mm");
        if (sched === targetStr) {
          sendPushBroadcast({
            title: "Jadwal Kontrol 🏥",
            body: `Pengingat 10 menit lagi: ${row[2]} di ${row[5]}.`,
            url: "/?tab=schedule&id=" + row[0] + "&memberId=" + row[1]
          });
        }
      }
    }
  }
}

function sendPushBroadcast(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('subscriptions');
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const [endpoint, p256dh, auth] = data[i];
    if (endpoint) {
      try {
        UrlFetchApp.fetch(VERCEL_PUSH_API_URL, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            subscription: { endpoint, keys: { p256dh, auth } },
            payload: payload
          }),
          muteHttpExceptions: true
        });
      } catch (e) { Logger.log("Err broadcast: " + e); }
    }
  }
}
