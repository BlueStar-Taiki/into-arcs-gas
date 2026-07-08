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
    APP_CONFIG.DATE_TIME_DISPLAY_FORMAT
  );
}

function formatDateOnly_(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return String(value || '');
  }
  return Utilities.formatDate(
    date,
    APP_CONFIG.TIME_ZONE,
    APP_CONFIG.DATE_ONLY_FORMAT
  );
}

function formatTimeOnly_(value) {
  var time = parseTimeParts_(value);
  if (!time) {
    return String(value || '');
  }
  return ('0' + time.hour).slice(-2) + ':' + ('0' + time.minute).slice(-2);
}

function formatJapaneseWeekday_(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  var year = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'yyyy'));
  var month = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'M'));
  var day = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'd'));
  if (month < 3) {
    month += 12;
    year -= 1;
  }
  var zeller =
    (day +
      Math.floor((13 * (month + 1)) / 5) +
      year +
      Math.floor(year / 4) -
      Math.floor(year / 100) +
      Math.floor(year / 400)) %
    7;
  return APP_CONFIG.JAPANESE_WEEKDAYS[(zeller + 6) % 7];
}

function combineDateAndTime_(dateValue, timeValue) {
  var date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  var time = parseTimeParts_(timeValue);
  if (isNaN(date.getTime()) || !time) {
    return null;
  }
  var year = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'yyyy'));
  var month = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'M'));
  var day = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'd'));
  return new Date(year, month - 1, day, time.hour, time.minute, 0);
}

function toDateOnly_(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }
  var year = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'yyyy'));
  var month = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'M'));
  var day = Number(Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'd'));
  return new Date(year, month - 1, day);
}

function parseTimeParts_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      hour: Number(Utilities.formatDate(value, APP_CONFIG.TIME_ZONE, 'H')),
      minute: Number(Utilities.formatDate(value, APP_CONFIG.TIME_ZONE, 'm'))
    };
  }
  if (typeof value === 'number' && isFinite(value)) {
    var totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    return {
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60
    };
  }
  var match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return null;
  }
  var hour = Number(match[1]);
  var minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour: hour, minute: minute };
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
