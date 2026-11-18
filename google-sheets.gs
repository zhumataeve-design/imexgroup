// Add the spreadsheet ID to the script property SPREADSHEET_ID.
function doPost(e) {
  try {
    const fields = e.parameter;
    const name = String(fields.name || '').trim();
    const attendance = String(fields.attendance || '');
    const comment = String(fields.comment || '').trim();
    if (!name || name.length > 120 || comment.length > 500 ||
        !['Да, я приду', 'Нет, я не смогу прийти'].includes(attendance)) {
      return reply(false);
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = SpreadsheetApp.openById(id);
      const sheet = spreadsheet.getSheetByName('Гости IMEX') || spreadsheet.insertSheet('Гости IMEX');
      if (sheet.getLastRow() === 0) sheet.appendRow(['Дата', 'Имя и фамилия', 'Участие', 'Комментарий']);
      const plain = (value) => /^[=+\-@]/.test(value) ? "'" + value : value;
      sheet.appendRow([new Date(), plain(name), attendance, plain(comment)]);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return reply(true);
  } catch (error) {
    console.error(error.message);
    return reply(false);
  }
}

function reply(ok) {
  return ContentService.createTextOutput(JSON.stringify({ok}))
    .setMimeType(ContentService.MimeType.JSON);
}
