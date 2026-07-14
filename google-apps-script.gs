/**
 * LC Computer Build & Repair — Google connector.
 *
 * Paste this whole file into a new Google Apps Script project (script.google.com),
 * then Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Copy the Web app URL into Netlify as GOOGLE_SCRIPT_URL, and set
 * GOOGLE_SCRIPT_SECRET to the SECRET value below.
 *
 * It handles:
 *   - bookings  -> adds an event to your Google Calendar
 *   - quotes    -> appends a row to a "LC Computer — Quotes" spreadsheet AND
 *                  creates a formatted Google Doc for the quote (valid 90 days)
 */

var SECRET = 'lcq_7Ka9Wm2Rf5Xz8Qn';
var SHEET_NAME = 'LC Computer — Quotes';
var FOLDER_NAME = 'LC Computer — Quotes';

function doGet() {
  return ContentService.createTextOutput('LC Assistant Google connector is running.');
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return json({ error: 'unauthorized' });
    if (d.type === 'booking') return handleBooking(d);
    if (d.type === 'quote') return handleQuote(d);
    return json({ error: 'unknown type' });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function handleBooking(d) {
  var cal = CalendarApp.getDefaultCalendar();
  cal.createEvent(d.title, new Date(d.startISO), new Date(d.endISO), {
    description: d.description || '',
    location: d.location || '',
  });
  return json({ ok: true });
}

function handleQuote(d) {
  // --- Spreadsheet (all quotes on one sheet) ---
  var ss = getOrCreateSpreadsheet(SHEET_NAME);
  var sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Created', 'Expires (90 days)', 'Customer', 'Contact', 'Type',
      'Summary', 'Total', 'Parts', 'Tax', 'Labor', 'Doc']);
    sheet.setFrozenRows(1);
  }

  // --- Doc for this quote ---
  var doc = DocumentApp.create('Quote — ' + (d.customerName || 'Customer') + ' — ' + fmtDate(d.createdISO));
  var body = doc.getBody();
  body.appendParagraph('LC Computer Build & Repair').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Estimate for ' + (d.customerName || 'Customer'));
  body.appendParagraph('Date: ' + fmtDate(d.createdISO) + '   ·   Valid through: ' + fmtDate(d.expiresISO) + ' (90 days)');
  body.appendParagraph('Contact: ' + (d.contact || '(none)'));
  body.appendParagraph('');
  body.appendParagraph(d.summary || '').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (d.items || []).forEach(function (it) {
    body.appendListItem(it.qty + '× ' + it.name + ' — $' + Number(it.lineTotal).toFixed(2));
  });
  body.appendParagraph('');
  if (d.partsCharge) body.appendParagraph('Parts: $' + Number(d.partsCharge).toFixed(2));
  if (d.tax) body.appendParagraph('Parts tax: $' + Number(d.tax).toFixed(2));
  if (d.labor) body.appendParagraph('Labor: $' + Number(d.labor).toFixed(2));
  body.appendParagraph('ESTIMATED TOTAL: $' + Number(d.total).toFixed(2)).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (d.assumptions) { body.appendParagraph(''); body.appendParagraph('Notes: ' + d.assumptions); }
  doc.saveAndClose();

  // Move the doc into the quotes folder
  var folder = getOrCreateFolder(FOLDER_NAME);
  var file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e2) {}
  var docUrl = doc.getUrl();

  sheet.appendRow([fmtDate(d.createdISO), fmtDate(d.expiresISO), d.customerName || '', d.contact || '',
    d.kind || '', d.summary || '', Number(d.total || 0), Number(d.partsCharge || 0),
    Number(d.tax || 0), Number(d.labor || 0), docUrl]);

  return json({ ok: true, docUrl: docUrl });
}

function getOrCreateSpreadsheet(name) {
  var files = DriveApp.getFilesByName(name);
  while (files.hasNext()) {
    var f = files.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.open(f);
  }
  return SpreadsheetApp.create(name);
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function fmtDate(iso) {
  var d = new Date(iso);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM d, yyyy');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
