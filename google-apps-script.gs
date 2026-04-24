/**
 * Google Apps Script – Volunteer Registration Backend
 * 
 * Sheet: Hajj-Volunteer-Sheet (ID: 1Xj4dKsVmf3Kz2RO7B-HqX4MFOFjtbdBplGKXfCEZvkc)
 * Drive folder for photos: 1US0aRl9dJ2zbcfijmfCiL9IVf5tHXvtz
 */

const SPREADSHEET_ID = '1Xj4dKsVmf3Kz2RO7B-HqX4MFOFjtbdBplGKXfCEZvkc';
const SHEET_NAME = 'Hajj-Volunteer-Sheet';
const DRIVE_FOLDER_ID = '1US0aRl9dJ2zbcfijmfCiL9IVf5tHXvtz';

/**
 * Handles POST requests (registration submission)
 */
function doPost(e) {
  try {
    // Parse incoming data
    let requestData = null;

    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback for application/x-www-form-urlencoded requests
        if (e.parameter && Object.keys(e.parameter).length > 0) {
          requestData = e.parameter;
        }
      }
    }

    if (!requestData || Object.keys(requestData).length === 0) {
      if (e && e.parameter && Object.keys(e.parameter).length > 0) {
        requestData = e.parameter;
      } else {
        const keys = e ? Object.keys(e).join(', ') : 'none';
        throw new Error('No data received – empty postData. Event keys: ' + keys);
      }
    }

    if (requestData.file && typeof requestData.file === 'string') {
      try {
        requestData.file = JSON.parse(requestData.file);
      } catch (jsonErr) {
        requestData.file = null;
      }
    }

    const fullName = (requestData.fullName || '').trim();
    const idNumber = (requestData.idNumber || '').trim();
    const mobile = (requestData.mobile || '').trim();
    const bloodGroup = requestData.bloodGroup || '';
    const additionalInfo = (requestData.additionalInfo || '').trim();

    // Required fields validation
    if (!fullName || !idNumber || !mobile || !bloodGroup) {
      throw new Error('Missing required fields: fullName, idNumber, mobile, bloodGroup');
    }

    let photoUrl = 'No photo uploaded';
    let photoDriveId = '';

    // Process uploaded file if present
    if (requestData.file && requestData.file.data && requestData.file.name) {
      try {
        const fileData = requestData.file;
        const decodedBlob = Utilities.newBlob(
          Utilities.base64Decode(fileData.data),
          fileData.type,
          fileData.name
        );
        photoDriveId = savePhotoToDrive(decodedBlob);
        photoUrl = `https://drive.google.com/file/d/${photoDriveId}/view`;
      } catch (fileErr) {
        console.error('Photo save error: ' + fileErr.message);
        photoUrl = 'Photo upload failed';
      }
    }

    // Write to sheet
    const sheet = getOrCreateSheet();
    const timestamp = new Date();
    const rowData = [
      timestamp,
      fullName,
      idNumber,
      mobile,
      bloodGroup,
      additionalInfo,
      photoUrl,
      photoDriveId
    ];
    sheet.appendRow(rowData);

    return buildCorsResponse({ status: 'success', message: 'Registration saved' });

  } catch (err) {
    console.error('doPost error: ' + err.message);
    return buildCorsResponse({ status: 'error', message: err.message });
  }
}

/**
 * Handles GET requests (for testing)
 */
function doGet() {
  return buildCorsResponse({ status: 'online', message: 'Volunteer registration endpoint active' });
}

/**
 * Handles OPTIONS requests (CORS preflight)
 */
function doOptions() {
  return buildCorsResponse({ status: 'ok' });
}

/**
 * Builds a JSON response with CORS headers
 */
function buildCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Returns the target sheet; creates it with headers if missing
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'Timestamp', 'Full Name', 'ID Number', 'Mobile Number',
      'Blood Group', 'Additional Information', 'Photo Link', 'Drive File ID'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // Ensure header row exists
    const firstRow = sheet.getRange(1, 1, 1, 8).getValues()[0];
    if (!firstRow[0] || firstRow[0] !== 'Timestamp') {
      sheet.insertRowBefore(1);
      const headers = [
        'Timestamp', 'Full Name', 'ID Number', 'Mobile Number',
        'Blood Group', 'Additional Information', 'Photo Link', 'Drive File ID'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

/**
 * Saves an image blob into the designated Drive folder.
 * @param {Blob} blob Image blob
 * @returns {string} Drive file ID
 */
function savePhotoToDrive(blob) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const timestamp = new Date().getTime();
  const originalName = blob.getName() || 'profile_photo';
  const safeName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
  blob.setName(safeName);
  const file = folder.createFile(blob);
  return file.getId();
}