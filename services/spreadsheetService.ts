
/**
 * LAYANAN DATABASE SPREADSHEET (Versi High Integrity v8.8)
 */

const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwIk5aeQ2yBHRfS8iwaJySiyUXyiZ-_NszDyRRfBgrU2mq_7FFhyyF5l0HSJWPMqL9j/exec'; 

// ID Spreadsheet sumber Data Listing dan Banner Ads
const SOURCE_SHEET_ID = '1R8y4mnnq8HnmmOOPyVje5bBxT229EbRDq8-Axsm1Kmc';

const isUrlPlaceholder = (url: string) => {
  return !url || url.includes('MASUKKAN_URL') || url === '' || url.length < 20;
};

/**
 * Mengubah URL Drive standar menjadi format lh3 yang diminta user.
 * Mendukung format: uc?id=, /d/ID, open?id=
 */
const transformDriveUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return url || '';
  
  // Jika sudah format lh3, jangan diproses lagi
  if (url.includes('lh3.googleusercontent.com/d/')) return url;

  // Mencari ID file menggunakan Regex yang lebih kuat
  const driveIdMatch = url.match(/(?:id=|\/d\/|v=)([\w-]+)/);
  if (driveIdMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }
  
  return url;
};

/**
 * Memproses seluruh data dari Cloud agar semua URL gambar/file 
 * yang tersimpan di database utama dikonversi ke format yang bisa tampil.
 */
const processCloudData = (data: any) => {
  if (!data) return data;

  // 1. Members (Profile Photo, Insurance Cards, Allergy Photos)
  data.members?.forEach((m: any) => {
    if (m.photoUrl) m.photoUrl = transformDriveUrl(m.photoUrl);
    m.insurances?.forEach((ins: any) => {
      if (ins.cardUrl) ins.cardUrl = transformDriveUrl(ins.cardUrl);
    });
    m.allergies?.forEach((al: any) => {
      if (al.photoUrl) al.photoUrl = transformDriveUrl(al.photoUrl);
    });
  });

  // 2. Medical Records (Main files & Investigation files)
  data.records?.forEach((r: any) => {
    r.files?.forEach((f: any) => {
      if (f.url) f.url = transformDriveUrl(f.url);
    });
    r.investigations?.forEach((inv: any) => {
      inv.files?.forEach((f: any) => {
        if (f.url) f.url = transformDriveUrl(f.url);
      });
    });
  });

  // 3. Medications (Packshot Photo)
  data.meds?.forEach((med: any) => {
    if (med.fileUrl) med.fileUrl = transformDriveUrl(med.fileUrl);
  });

  // 4. Home Care Logs (Entry Photos)
  data.homeCareLogs?.forEach((log: any) => {
    log.entries?.forEach((entry: any) => {
      entry.files?.forEach((f: any) => {
        if (f.url) f.url = transformDriveUrl(f.url);
      });
    });
  });

  return data;
};

/**
 * Helper untuk parsing tanggal dari format gviz Date(Y,M,D)
 */
const parseGvizDate = (dateVal: any) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string' && dateVal.includes('Date(')) {
        const parts = dateVal.match(/\d+/g);
        if (parts && parts.length >= 3) {
            // Note: Month in gviz is 0-indexed
            return new Date(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        }
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

export const spreadsheetService = {
  async fetchAllData() {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return null;
    
    try {
      const response = await fetch(`${SPREADSHEET_WEB_APP_URL}?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-cache',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) return null;
      const result = await response.json();
      
      // Transformasi data database utama sebelum dikirim ke App.tsx
      if (result && result.status === 'success' && result.data) {
        return processCloudData(result.data);
      }
      
      return null;
    } catch (error: any) {
      console.error('Cloud Fetch failed:', error);
      return null; 
    }
  },

  async fetchBannerImage() {
    try {
      const sheetName = 'Banner';
      // Ambil Baris 2 dan 3 (Range A2:F3)
      const url = `https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&range=A2:F3`;
      
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return null;
      
      const text = await response.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(jsonStr);
      const rows = json.table.rows;
      
      if (!rows || rows.length === 0) return null;
      
      // Aturan:
      // rows[0] = Baris 2 (Fallback)
      // rows[1] = Baris 3 (Campaign)
      
      const today = new Date();
      today.setHours(0,0,0,0);

      let finalBannerUrl = null;

      // Cek Baris 3 (Campaign) jika tersedia
      if (rows.length >= 2) {
          const row3EndDateVal = rows[1].c[4]?.v; // Kolom E (EndDate) index 4
          const row3EndDate = parseGvizDate(row3EndDateVal);
          
          if (row3EndDate && row3EndDate >= today) {
              // Jika hari ini belum melewati EndDate baris 3, gunakan baris 3
              finalBannerUrl = rows[1].c[5]?.v || rows[1].c[5]?.f;
          }
      }

      // Jika baris 3 tidak valid/sudah lewat, gunakan Baris 2 (Fallback)
      if (!finalBannerUrl) {
          finalBannerUrl = rows[0].c[5]?.v || rows[0].c[5]?.f;
      }
      
      return transformDriveUrl(finalBannerUrl);
    } catch (e) { 
      console.error("Banner fetch error:", e);
      return null; 
    }
  },

  async fetchRecommendations() {
    try {
      const sheetName = 'Listing';
      const url = `https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return [];
      
      const text = await response.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(jsonStr);
      const rows = json.table.rows;
      const headers = json.table.cols;

      const keyMap: Record<string, string> = {
        'ID': 'id',
        'Priorities': 'priorities',
        'StartDate': 'startDate',
        'Periode Aktif': 'periodeAktif',
        'EndDate': 'endDate',
        'Jenis': 'jenis',
        'SubJenis': 'subJenis',
        'Tenaga Kesehatan': 'tenagaKesehatan',
        'Nama': 'nama',
        'STR': 'str',
        'Kontak': 'kontak',
        'Alamat': 'alamat',
        'Link Alamat': 'linkAlamat',
        'Tempat Praktik 1': 'tempatPraktik1',
        'Kontak Tempat Praktik 1': 'kontak1',
        'Alamat Praktik 1': 'alamat1',
        'Link Alamat Praktik 1': 'link1',
        'SIP Praktik 1': 'sip1',
        'Tempat Praktik 2': 'tempatPraktik2',
        'Kontak Tempat Praktik 2': 'kontak2',
        'Alamat Praktik 2': 'alamat2',
        'Link Alamat Praktik 2': 'link2',
        'SIP Praktik 2': 'sip2',
        'Tempat Praktik 3': 'tempatPraktik3',
        'Kontak Tempat Praktik 3': 'kontak3',
        'Alamat Praktik 3': 'alamat3',
        'Link Alamat Praktik 3': 'link3',
        'SIP Praktik 3': 'sip3',
        'Sosial Media': 'sosmed',
        'Marketing Campaign': 'campaign',
        'Link Image': 'imageUrl',
        'WilayahKerja': 'wilayahKerja',
        'Keywords': 'keywords'
      };

      return rows.map((row: any) => {
        const item: any = {};
        row.c.forEach((cell: any, idx: number) => {
          const rawHeader = headers[idx]?.label || '';
          const appKey = keyMap[rawHeader] || rawHeader;
          
          if (appKey) {
            let val = cell ? (cell.v !== null ? cell.v : cell.f) : '';
            if (appKey === 'tenagaKesehatan' || appKey === 'priorities') {
                val = (String(val).toLowerCase() === 'true' || val === 1 || val === true);
            }
            if (appKey === 'imageUrl') {
                val = transformDriveUrl(val);
            }
            item[appKey] = val;
          }
        });
        const checkId = String(item.id || '').trim().toLowerCase();
        if (!checkId || checkId === 'id') return null;
        return item;
      }).filter(Boolean);
    } catch (error) {
      console.error("Recommendations Fetch Error:", error);
      return [];
    }
  },

  async saveData(data: any) {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return false;
    try {
      await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveAll', payload: data }),
      });
      return true; 
    } catch (error) {
      console.error('Cloud Save Error:', error);
      return false;
    }
  },

  async uploadFile(file: File): Promise<{ url: string; fileId: string } | null> {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetch(SPREADSHEET_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({
              action: 'upload',
              fileName: file.name,
              mimeType: file.type,
              base64: base64
            }),
          });
          
          if (!response.ok) throw new Error('Upload error');
          const result = await response.json();
          if (result?.url) result.url = transformDriveUrl(result.url);
          resolve(result && result.status === 'success' ? result : null);
        } catch (error) {
          console.error('Upload failed:', error);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
};
