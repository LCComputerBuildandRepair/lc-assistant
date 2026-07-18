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
  var b = d.business || {};
  var bizName = b.name || 'LC Computer Build & Repair';
  var items = d.items || [];

  var INK = '#14181f', ORANGE = '#ee6b12', SOFT = '#6b7280', HAIR = '#c9d2dc', WHITE = '#ffffff';
  var RIGHT = DocumentApp.HorizontalAlignment.RIGHT;
  var CENTER = DocumentApp.HorizontalAlignment.CENTER;
  var DASH = '—', BULLET = '   •   ';

  // --- Spreadsheet (all quotes on one sheet) ---
  var ss = getOrCreateSpreadsheet(SHEET_NAME);
  var sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Created', 'Expires (90 days)', 'Customer', 'Contact', 'Type',
      'Summary', 'Total', 'Parts', 'Tax', 'Labor', 'Doc', 'Quote #']);
    sheet.setFrozenRows(1);
  }

  // --- Printable estimate document ---
  var docName = 'Quote ' + (d.quoteNumber ? d.quoteNumber + ' ' : '') + DASH + ' ' +
    (d.customerName || 'Customer') + ' ' + DASH + ' ' + fmtDate(d.createdISO);
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  body.setMarginTop(48); body.setMarginBottom(48); body.setMarginLeft(54); body.setMarginRight(54);

  // Letterhead
  styleText(body.appendParagraph(bizName), { bold: true, size: 22, color: INK }).setSpacingAfter(1);
  var contactBits = [b.location, b.phone, b.email, (b.website || '').replace(/^https?:\/\//, '')]
    .filter(function (x) { return x; });
  styleText(body.appendParagraph(contactBits.join(BULLET)), { size: 9, color: SOFT }).setSpacingAfter(8);
  body.appendHorizontalRule();

  // ESTIMATE heading + meta
  styleText(body.appendParagraph('ESTIMATE'), { bold: true, size: 20, color: ORANGE })
    .setSpacingBefore(6).setSpacingAfter(2);
  var metaLine = [];
  if (d.quoteNumber) metaLine.push('Quote ' + d.quoteNumber);
  metaLine.push('Date: ' + fmtDate(d.createdISO));
  metaLine.push('Valid through: ' + fmtDate(d.expiresISO) + ' (90 days)');
  styleText(body.appendParagraph(metaLine.join(BULLET)), { size: 9.5, color: SOFT }).setSpacingAfter(14);

  // Prepared for
  styleText(body.appendParagraph('PREPARED FOR'), { bold: true, size: 8, color: SOFT }).setSpacingAfter(1);
  styleText(body.appendParagraph(d.customerName || 'Customer'), { bold: true, size: 12, color: INK }).setSpacingAfter(0);
  if (d.contact) styleText(body.appendParagraph(d.contact), { size: 10, color: SOFT }).setSpacingAfter(12);

  // Regarding
  if (d.summary) {
    var reg = styleText(body.appendParagraph('Regarding: ' + d.summary), { size: 11, color: INK });
    reg.editAsText().setBold(0, 9, true);
    reg.setSpacingAfter(12);
  }

  // Line-item table
  var rows = [['DESCRIPTION', 'QTY', 'UNIT', 'AMOUNT']];
  if (items.length) {
    items.forEach(function (it) {
      var qty = it.qty || 1;
      var unit = (it.unitPrice != null) ? it.unitPrice : (qty ? it.lineTotal / qty : it.lineTotal);
      rows.push([String(it.name), String(qty), money(unit), money(it.lineTotal)]);
    });
  } else {
    rows.push([d.summary || 'Professional services', '1', money(d.labor || d.total), money(d.labor || d.total)]);
  }
  var table = body.appendTable(rows);
  table.setBorderColor(HAIR); table.setBorderWidth(0.5);
  table.setColumnWidth(0, 288); table.setColumnWidth(1, 44); table.setColumnWidth(2, 76); table.setColumnWidth(3, 84);
  for (var i = 0; i < 4; i++) {
    var hc = table.getCell(0, i);
    hc.setBackgroundColor(INK);
    hc.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(8).setPaddingRight(8);
    var hp = hc.getChild(0).asParagraph();
    styleText(hp, { bold: true, size: 8.5, color: WHITE });
    if (i > 0) hp.setAlignment(RIGHT);
  }
  for (var r = 1; r < rows.length; r++) {
    for (var c = 0; c < 4; c++) {
      var cell = table.getCell(r, c);
      cell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8);
      var cp = cell.getChild(0).asParagraph();
      styleText(cp, { size: 10, color: INK });
      if (c > 0) cp.setAlignment(RIGHT);
    }
  }

  // Totals (right-aligned)
  var totalRows = [];
  if (d.partsCharge) totalRows.push(['Parts', money(d.partsCharge)]);
  if (d.tax) totalRows.push(['Parts tax', money(d.tax)]);
  if (d.labor) totalRows.push(['Labor', money(d.labor)]);
  totalRows.push(['ESTIMATED TOTAL', money(d.total)]);
  var tt = body.appendTable(totalRows);
  tt.setBorderWidth(0);
  tt.setColumnWidth(0, 372); tt.setColumnWidth(1, 120);
  for (var tr = 0; tr < totalRows.length; tr++) {
    var isTotal = (tr === totalRows.length - 1);
    var lp = tt.getCell(tr, 0).setPaddingTop(2).setPaddingBottom(2).getChild(0).asParagraph();
    var rp = tt.getCell(tr, 1).setPaddingTop(2).setPaddingBottom(2).getChild(0).asParagraph();
    lp.setAlignment(RIGHT); rp.setAlignment(RIGHT);
    styleText(lp, { size: isTotal ? 12 : 10, color: isTotal ? INK : SOFT, bold: isTotal });
    styleText(rp, { size: isTotal ? 13 : 10, color: isTotal ? ORANGE : INK, bold: isTotal });
  }

  // Notes
  if (d.assumptions) {
    styleText(body.appendParagraph('Notes'), { bold: true, size: 9, color: SOFT }).setSpacingBefore(12).setSpacingAfter(1);
    styleText(body.appendParagraph(d.assumptions), { size: 9.5, color: INK }).setSpacingAfter(8);
  }

  // Terms
  styleText(body.appendParagraph(
    'This is an estimate, not a final invoice. Parts availability and prices can change; any change to the total ' +
    'will be confirmed with you before work begins. Estimate valid for 90 days from the date above.'
  ), { size: 8.5, color: SOFT, italic: true }).setSpacingBefore(6).setSpacingAfter(16);

  // Acceptance & authorization
  body.appendHorizontalRule();
  styleText(body.appendParagraph('Acceptance & Authorization'), { bold: true, size: 12, color: INK })
    .setSpacingBefore(8).setSpacingAfter(2);
  styleText(body.appendParagraph(
    'By signing below, I authorize ' + bizName + ' to perform the work described above and agree to the estimated ' +
    'total shown. I understand the final cost may vary only if additional issues or parts are found, and that any ' +
    'change will be confirmed with me before proceeding.'
  ), { size: 9, color: SOFT }).setSpacingAfter(22);

  var sig = body.appendTable([['X ______________________________________', 'Date __________________']]);
  sig.setBorderWidth(0); sig.setColumnWidth(0, 336); sig.setColumnWidth(1, 156);
  styleText(sig.getCell(0, 0).getChild(0).asParagraph(), { size: 11, color: INK });
  styleText(sig.getCell(0, 1).getChild(0).asParagraph(), { size: 11, color: INK });
  var sigLbl = body.appendTable([['Customer signature', 'Date']]);
  sigLbl.setBorderWidth(0); sigLbl.setColumnWidth(0, 336); sigLbl.setColumnWidth(1, 156);
  styleText(sigLbl.getCell(0, 0).setPaddingTop(0).getChild(0).asParagraph(), { size: 8, color: SOFT });
  styleText(sigLbl.getCell(0, 1).setPaddingTop(0).getChild(0).asParagraph(), { size: 8, color: SOFT });
  styleText(body.appendParagraph('Printed name ______________________________________'), { size: 11, color: INK })
    .setSpacingBefore(16);

  // Footer
  body.appendHorizontalRule();
  styleText(body.appendParagraph(
    'Thank you for choosing ' + bizName + BULLET + (b.phone || '') + BULLET + (b.website || '').replace(/^https?:\/\//, '')
  ), { size: 9, color: SOFT }).setAlignment(CENTER).setSpacingBefore(4);

  // Drop the blank first paragraph the new doc starts with
  var firstEl = body.getChild(0);
  if (firstEl.getType() === DocumentApp.ElementType.PARAGRAPH &&
      firstEl.asParagraph().getText() === '' && body.getNumChildren() > 1) {
    firstEl.removeFromParent();
  }

  doc.saveAndClose();

  // Move the doc into the quotes folder
  var folder = getOrCreateFolder(FOLDER_NAME);
  var file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e2) {}
  var docUrl = doc.getUrl();

  sheet.appendRow([fmtDate(d.createdISO), fmtDate(d.expiresISO), d.customerName || '', d.contact || '',
    d.kind || '', d.summary || '', Number(d.total || 0), Number(d.partsCharge || 0),
    Number(d.tax || 0), Number(d.labor || 0), docUrl, d.quoteNumber || '']);

  return json({ ok: true, docUrl: docUrl });
}

/** Style a paragraph/text element in one call. */
function styleText(para, opts) {
  var t = para.editAsText();
  if (opts.size != null) t.setFontSize(opts.size);
  if (opts.color) t.setForegroundColor(opts.color);
  if (opts.bold != null) t.setBold(opts.bold);
  if (opts.italic != null) t.setItalic(opts.italic);
  t.setFontFamily('Arial');
  return para;
}

/** Format a number as US currency, e.g. 1234.5 -> "$1,234.50". */
function money(n) {
  n = Number(n || 0);
  var parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + parts.join('.');
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
