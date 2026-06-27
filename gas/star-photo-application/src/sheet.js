function appendApplication_(application) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.APPLICATIONS);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.APPLICATION_HEADER_ORDER,
    APP_CONFIG.SHEETS.APPLICATIONS
  );

  var rowNumber = Math.max(sheet.getLastRow() + 1, APP_CONFIG.DATA_START_ROW);
  var rowValues = new Array(sheet.getLastColumn()).fill('');
  Object.keys(application).forEach(function (header) {
    if (!headerMap[header]) {
      throw new Error(
        APP_CONFIG.TEXT.APPLICATION_TARGET_MISSING_PREFIX + header
      );
    }
    rowValues[headerMap[header] - 1] = sanitizeForSheet_(application[header]);
  });
  sheet
    .getRange(
      rowNumber,
      APP_CONFIG.FIRST_COLUMN,
      1,
      rowValues.length
    )
    .setValues([rowValues]);
  return rowNumber;
}

function getApplicationByRow_(rowNumber) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.APPLICATIONS);
  if (rowNumber < APP_CONFIG.DATA_START_ROW || rowNumber > sheet.getLastRow()) {
    throw new Error(APP_CONFIG.UI_MESSAGES.SELECT_APPLICATION_ROW);
  }
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.APPLICATION_HEADER_ORDER,
    APP_CONFIG.SHEETS.APPLICATIONS
  );
  var values = sheet
    .getRange(
      rowNumber,
      APP_CONFIG.FIRST_COLUMN,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0];
  var application = {};
  Object.keys(headerMap).forEach(function (header) {
    application[header] = values[headerMap[header] - 1];
  });
  if (!application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID]) {
    throw new Error(APP_CONFIG.UI_MESSAGES.SELECT_APPLICATION_ROW);
  }
  return application;
}

function updateApplicationFields_(rowNumber, updates) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.APPLICATIONS);
  var headerMap = getHeaderMap_(sheet);
  Object.keys(updates).forEach(function (header) {
    if (!headerMap[header]) {
      throw new Error(APP_CONFIG.TEXT.UPDATE_TARGET_MISSING_PREFIX + header);
    }
    sheet.getRange(rowNumber, headerMap[header]).setValue(updates[header]);
  });
  if (
    !Object.prototype.hasOwnProperty.call(
      updates,
      APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT
    )
  ) {
    sheet
      .getRange(rowNumber, headerMap[APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT])
      .setValue(new Date());
  }
}

function getActiveApplicationRow_() {
  var spreadsheet = getApplicationSpreadsheet_();
  var sheet = spreadsheet.getActiveSheet();
  var range = sheet.getActiveRange();
  if (
    sheet.getName() !== APP_CONFIG.SHEETS.APPLICATIONS ||
    !range ||
    range.getNumRows() !== 1 ||
    range.getRow() < APP_CONFIG.DATA_START_ROW
  ) {
    throw new Error(APP_CONFIG.UI_MESSAGES.SELECT_APPLICATION_ROW);
  }
  return range.getRow();
}

function getSettings_() {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.SETTINGS);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.SETTINGS_HEADER_ORDER,
    APP_CONFIG.SHEETS.SETTINGS
  );
  var settings = {};
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return settings;
  }
  var values = sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getDisplayValues();
  values.forEach(function (row) {
    var key = row[headerMap[APP_CONFIG.SETTINGS_HEADERS.KEY] - 1].trim();
    if (key) {
      settings[key] =
        row[headerMap[APP_CONFIG.SETTINGS_HEADERS.VALUE] - 1].trim();
    }
  });
  return settings;
}

function appendLog_(level, processName, applicationId, message, detail) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.LOGS);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(headerMap, APP_CONFIG.LOG_HEADER_ORDER, APP_CONFIG.SHEETS.LOGS);
  var entry = {};
  entry[APP_CONFIG.LOG_HEADERS.AT] = new Date();
  entry[APP_CONFIG.LOG_HEADERS.LEVEL] = level;
  entry[APP_CONFIG.LOG_HEADERS.PROCESS] = processName;
  entry[APP_CONFIG.LOG_HEADERS.APPLICATION_ID] = applicationId || '';
  entry[APP_CONFIG.LOG_HEADERS.MESSAGE] = sanitizeForSheet_(message || '');
  entry[APP_CONFIG.LOG_HEADERS.DETAIL] = sanitizeForSheet_(detail || '');

  var row = new Array(sheet.getLastColumn()).fill('');
  Object.keys(entry).forEach(function (header) {
    row[headerMap[header] - 1] = entry[header];
  });
  var rowNumber = Math.max(sheet.getLastRow() + 1, APP_CONFIG.DATA_START_ROW);
  sheet
    .getRange(
      rowNumber,
      APP_CONFIG.FIRST_COLUMN,
      1,
      row.length
    )
    .setValues([row]);
}
