/**
 * 実行対象のスプレッドシートを返す。
 * このプロジェクトは対象スプレッドシートにバインドして利用する。
 */
function getApplicationSpreadsheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error(APP_CONFIG.TEXT.NO_SPREADSHEET);
  }
  return spreadsheet;
}

function getRequiredSheet_(sheetName) {
  var sheet = getApplicationSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(APP_CONFIG.TEXT.SHEET_MISSING_PREFIX + sheetName);
  }
  return sheet;
}

/**
 * 1行目のヘッダー名から、1始まりの列番号を生成する。
 */
function getHeaderMap_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error(APP_CONFIG.TEXT.HEADER_MISSING_PREFIX + sheet.getName());
  }
  var headers = sheet
    .getRange(
      APP_CONFIG.HEADER_ROW,
      APP_CONFIG.FIRST_COLUMN,
      1,
      lastColumn
    )
    .getDisplayValues()[0];
  var map = {};
  headers.forEach(function (header, index) {
    var normalized = String(header).trim();
    if (!normalized) {
      return;
    }
    if (map[normalized]) {
      throw new Error(APP_CONFIG.TEXT.HEADER_DUPLICATE_PREFIX + normalized);
    }
    map[normalized] = index + 1;
  });
  return map;
}

function assertHeaders_(headerMap, requiredHeaders, sheetName) {
  var missing = requiredHeaders.filter(function (header) {
    return !headerMap[header];
  });
  if (missing.length) {
    throw new Error(
      sheetName + APP_CONFIG.TEXT.REQUIRED_HEADERS_INFIX + missing.join(', ')
    );
  }
}

function getNamedValue_(namedValues, headerName) {
  if (!Object.prototype.hasOwnProperty.call(namedValues, headerName)) {
    throw new Error(APP_CONFIG.TEXT.FORM_VALUE_MISSING_PREFIX + headerName);
  }
  var value = namedValues[headerName];
  return Array.isArray(value) ? value[0] : value;
}

function createApplicationId_(receivedAt) {
  var timestamp = Utilities.formatDate(
    receivedAt,
    APP_CONFIG.TIME_ZONE,
    'yyyyMMdd-HHmmss'
  );
  var suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return [APP_CONFIG.APPLICATION_ID_PREFIX, timestamp, suffix].join('-');
}

function formatDateTime_(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return String(value || '');
  }
  return Utilities.formatDate(
    date,
    APP_CONFIG.TIME_ZONE,
    APP_CONFIG.DATE_FORMAT
  );
}

function normalizeError_(error) {
  if (!error) {
    return { message: APP_CONFIG.TEXT.UNKNOWN_ERROR, detail: '' };
  }
  return {
    message: error.message || String(error),
    detail: error.stack || String(error)
  };
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * スプレッドシートの数式として解釈され得る外部入力を文字列化する。
 */
function sanitizeForSheet_(value) {
  if (typeof value !== 'string' || !value.length) {
    return value;
  }
  return APP_CONFIG.FORMULA_GUARD_PREFIXES.indexOf(value.charAt(0)) !== -1
    ? "'" + value
    : value;
}

function showUiAlert_(message) {
  SpreadsheetApp.getUi().alert(message);
}
