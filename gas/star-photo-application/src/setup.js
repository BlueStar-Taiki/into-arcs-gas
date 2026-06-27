/**
 * 管理用シートを再現する。既存データは削除せず、ヘッダーと書式を整える。
 */
function setupApplicationFormSheet() {
  var spreadsheet = getApplicationSpreadsheet_();
  spreadsheet.setSpreadsheetTimeZone(APP_CONFIG.TIME_ZONE);

  ensureResponseSheet_(spreadsheet);
  var applicationSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.APPLICATIONS,
    APP_CONFIG.APPLICATION_HEADER_ORDER
  );
  var settingsSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.SETTINGS,
    APP_CONFIG.SETTINGS_HEADER_ORDER
  );
  var logSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.LOGS,
    APP_CONFIG.LOG_HEADER_ORDER
  );

  configureApplicationSheet_(applicationSheet);
  configureSettingsSheet_(settingsSheet);
  configureLogSheet_(logSheet);
  seedSettings_(settingsSheet);
  SpreadsheetApp.flush();
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.SETUP,
    '',
    APP_CONFIG.TEXT.SETUP_LOG_COMPLETE,
    ''
  );
}

function ensureResponseSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.RESPONSES);
  if (!sheet) {
    throw new Error(
      APP_CONFIG.TEXT.RESPONSE_SHEET_NOT_LINKED +
        APP_CONFIG.SHEETS.RESPONSES
    );
  }
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    Object.keys(APP_CONFIG.RESPONSE_HEADERS).map(function (key) {
      return APP_CONFIG.RESPONSE_HEADERS[key];
    }),
    APP_CONFIG.SHEETS.RESPONSES
  );
}

function ensureSheetWithHeaders_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var existingLastColumn = sheet.getLastColumn();
  if (existingLastColumn > 0) {
    var existingHeaders = sheet
      .getRange(
        APP_CONFIG.HEADER_ROW,
        APP_CONFIG.FIRST_COLUMN,
        1,
        existingLastColumn
      )
      .getDisplayValues()[0];
    var hasUnexpectedHeader = existingHeaders.some(function (header) {
      return header && headers.indexOf(String(header).trim()) === -1;
    });
    var existingHeaderOrder = existingHeaders
      .map(function (header) {
        return String(header).trim();
      })
      .filter(String);
    var expectedExistingOrder = headers.slice(0, existingHeaderOrder.length);
    var orderDiffers =
      existingHeaderOrder.join('\u0000') !==
      expectedExistingOrder.join('\u0000');
    if (
      hasUnexpectedHeader ||
      (sheet.getLastRow() > APP_CONFIG.HEADER_ROW &&
        (existingHeaders.join('') === '' || orderDiffers))
    ) {
      throw new Error(
        sheetName + APP_CONFIG.TEXT.UNSAFE_EXISTING_SHEET_INFIX
      );
    }
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns()
    );
  }
  sheet
    .getRange(
      APP_CONFIG.HEADER_ROW,
      APP_CONFIG.FIRST_COLUMN,
      1,
      headers.length
    )
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#d9eaf7')
    .setWrap(true);
  sheet.setFrozenRows(APP_CONFIG.HEADER_ROW);
  return sheet;
}

function configureApplicationSheet_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  var widths = {};
  widths[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID] = 220;
  widths[APP_CONFIG.APPLICATION_HEADERS.RECEIVED_AT] = 150;
  widths[APP_CONFIG.APPLICATION_HEADERS.NAME] = 140;
  widths[APP_CONFIG.APPLICATION_HEADERS.PARTICIPANTS] = 90;
  widths[APP_CONFIG.APPLICATION_HEADERS.EMERGENCY_PHONE] = 170;
  widths[APP_CONFIG.APPLICATION_HEADERS.EMAIL] = 220;
  widths[APP_CONFIG.APPLICATION_HEADERS.STATUS] = 110;
  widths[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS] = 120;
  widths[APP_CONFIG.APPLICATION_HEADERS.DISCORD_STATUS] = 130;
  widths[APP_CONFIG.APPLICATION_HEADERS.CALENDAR_STATUS] = 140;
  widths[APP_CONFIG.APPLICATION_HEADERS.EVENT_ID] = 180;
  widths[APP_CONFIG.APPLICATION_HEADERS.INTERNAL_NOTE] = 260;
  widths[APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT] = 150;
  Object.keys(widths).forEach(function (header) {
    sheet.setColumnWidth(headerMap[header], widths[header]);
  });

  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.STATUS],
    APP_CONFIG.STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS],
    APP_CONFIG.MAIL_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.DISCORD_STATUS],
    APP_CONFIG.DISCORD_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.CALENDAR_STATUS],
    APP_CONFIG.CALENDAR_STATUS_OPTIONS
  );

  [
    APP_CONFIG.APPLICATION_HEADERS.RECEIVED_AT,
    APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT
  ].forEach(function (header) {
    sheet
      .getRange(
        APP_CONFIG.DATA_START_ROW,
        headerMap[header],
        APP_CONFIG.VALIDATION_ROW_COUNT,
        1
      )
      .setNumberFormat(APP_CONFIG.DATE_FORMAT);
  });
}

function setDropdown_(sheet, column, options) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      column,
      APP_CONFIG.VALIDATION_ROW_COUNT,
      1
    )
    .setDataValidation(rule);
}

function configureSettingsSheet_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  sheet.setColumnWidth(headerMap[APP_CONFIG.SETTINGS_HEADERS.KEY], 180);
  sheet.setColumnWidth(headerMap[APP_CONFIG.SETTINGS_HEADERS.VALUE], 300);
  sheet.setColumnWidth(headerMap[APP_CONFIG.SETTINGS_HEADERS.DESCRIPTION], 420);
}

function configureLogSheet_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.AT], 150);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.LEVEL], 80);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.PROCESS], 220);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.APPLICATION_ID], 220);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.MESSAGE], 360);
  sheet.setColumnWidth(headerMap[APP_CONFIG.LOG_HEADERS.DETAIL], 500);
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      headerMap[APP_CONFIG.LOG_HEADERS.AT],
      APP_CONFIG.VALIDATION_ROW_COUNT,
      1
    )
    .setNumberFormat(APP_CONFIG.DATE_FORMAT);
}

function seedSettings_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  var existingKeys = {};
  if (sheet.getLastRow() >= APP_CONFIG.DATA_START_ROW) {
    sheet
      .getRange(
        APP_CONFIG.DATA_START_ROW,
        headerMap[APP_CONFIG.SETTINGS_HEADERS.KEY],
        sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
        1
      )
      .getDisplayValues()
      .forEach(function (row) {
        if (row[0]) {
          existingKeys[row[0]] = true;
        }
      });
  }
  APP_CONFIG.INITIAL_SETTINGS.forEach(function (setting) {
    if (existingKeys[setting[0]]) {
      return;
    }
    var row = new Array(sheet.getLastColumn()).fill('');
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.KEY] - 1] = setting[0];
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.VALUE] - 1] = setting[1];
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.DESCRIPTION] - 1] = setting[2];
    sheet.appendRow(row);
  });
}
