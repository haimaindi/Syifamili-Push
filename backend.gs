
/**
 * Syifamili Backend - Fixed Data Integrity & Image Preview v8.1
 */

const VERCEL_PUSH_API_URL = 'https://syifamili.vercel.app/api/send-push'; 
const UPLOAD_FOLDER_ID = '1GfO_p3jM7Y2XvVvVvVvVvVvVvVvVvVvV'; // Ganti dengan ID Folder Anda

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
    
    const values = sheet.getDataRange().getValues(); 
    if (values.length <= 1) { result[sheetName] = []; return; }
    const headers = values[0];
    result[sheetName] = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        // Jika sel diawali petik satu (format paksa teks), bersihkan
        if (typeof val === 'string' && val.startsWith("'")) {
          val = val.substring(1);
        }
        // Deteksi JSON secara akurat
        if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) { 
          try { 
            obj[header] = JSON.parse(val); 
          } catch(err) { 
            obj[header] = val; 
          } 
        } else {
          obj[header] = val;
        }
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
                let val = item[h]; 
                if (val === undefined || val === null) return '';
                let finalVal = (typeof val === 'object') ? JSON.stringify(val) : val.toString();
                return "'" + finalVal; // Paksa format teks agar string JSON tidak diubah oleh Excel/Sheets
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
          let folder = (UPLOAD_FOLDER_ID && UPLOAD_FOLDER_ID.length > 10) ? DriveApp.getFolderById(UPLOAD_FOLDER_ID) : DriveApp.getRootFolder();
          const data = Utilities.base64Decode(request.base64);
          const blob = Utilities.newBlob(data, request.mimeType, request.fileName);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const fastUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
          return ContentService.createTextOutput(JSON.stringify({ 
            status: 'success', 
            url: fastUrl,
            fileId: file.getId() 
          })).setMimeType(ContentService.MimeType.JSON);
        } catch (err) { 
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON); 
        }
      }
    }
  } catch (err) { 
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON); 
  }
  finally { lock.releaseLock(); }
}
