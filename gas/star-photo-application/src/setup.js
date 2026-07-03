/**
 * 管理用シートを再現する。明示された廃止列以外の既存データは保持する。
 */
function setupApplicationFormSheet() {
  var spreadsheet = getApplicationSpreadsheet_();
  spreadsheet.setSpreadsheetTimeZone(APP_CONFIG.TIME_ZONE);

  ensureResponseSheet_(spreadsheet);
  var logSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.LOGS,
    APP_CONFIG.LOG_HEADER_ORDER
  );
  var removedApplicationHeaders =
    removeDeprecatedApplicationColumns_(spreadsheet);
  if (removedApplicationHeaders.length) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.SETUP_MIGRATION,
      '',
      APP_CONFIG.TEXT.DEPRECATED_APPLICATION_COLUMNS_REMOVED_PREFIX +
        removedApplicationHeaders.join(', '),
      ''
    );
  }
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
  var eventDateSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.EVENT_DATES,
    APP_CONFIG.EVENT_DATE_HEADER_ORDER
  );
  var mailTemplateSheet = ensureSheetWithHeaders_(
    spreadsheet,
    APP_CONFIG.SHEETS.MAIL_TEMPLATES,
    APP_CONFIG.MAIL_TEMPLATE_HEADER_ORDER
  );

  configureApplicationSheet_(applicationSheet);
  configureSettingsSheet_(settingsSheet);
  configureLogSheet_(logSheet);
  configureEventDateSheet_(eventDateSheet);
  seedEventDiscordStatuses_(eventDateSheet);
  seedSettings_(settingsSheet);
  getEventOperationalSettings_();
  seedMailTemplates_(mailTemplateSheet);
  configureMailTemplateSheet_(mailTemplateSheet);
  SpreadsheetApp.flush();
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.SETUP,
    '',
    APP_CONFIG.TEXT.SETUP_LOG_COMPLETE,
    ''
  );
}

/**
 * 初回セットアップの入口。
 * シート整備、必須プロパティ検証、インストール型トリガー作成を順に行う。
 */
function setupApplicationFormSystem() {
  var result = {
    sheetsConfigured: false,
    propertiesValidated: false,
    triggerCreated: false,
    triggerAlreadyExisted: false,
    matchingTriggerCount: 0,
    fiveDaysTriggerCreated: false
  };
  try {
    setupApplicationFormSheet();
    result.sheetsConfigured = true;
    validateRequiredProperties();
    result.propertiesValidated = true;

    var triggerResult = installApplicationFormTriggers();
    result.triggerCreated = triggerResult.created;
    result.triggerAlreadyExisted = !triggerResult.created;
    result.matchingTriggerCount = triggerResult.created
      ? 1
      : triggerResult.existingCount;
    result.fiveDaysTriggerCreated =
      installFiveDaysBeforeNotificationTrigger_().created;
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.SYSTEM_SETUP,
      '',
      APP_CONFIG.TEXT.SYSTEM_SETUP_COMPLETE,
      JSON.stringify(result)
    );
    return result;
  } catch (error) {
    var normalized = normalizeError_(error);
    try {
      appendLog_(
        APP_CONFIG.LOG_LEVEL.ERROR,
        APP_CONFIG.PROCESS.SYSTEM_SETUP,
        '',
        APP_CONFIG.TEXT.SYSTEM_SETUP_FAILED + ' ' + normalized.message,
        JSON.stringify(result) + '\n' + normalized.detail
      );
    } catch (logError) {
      console.error(logError);
    }
    throw error;
  }
}

/**
 * 必須 Script Properties の存在と空文字でないことを検証する。
 * 値そのものは返却・ログ出力しない。
 */
function validateRequiredProperties() {
  var missingKeys = getMissingRequiredProperties_();
  if (missingKeys.length) {
    throw new Error(
      APP_CONFIG.TEXT.REQUIRED_PROPERTIES_MISSING_PREFIX +
        missingKeys.join(', ')
    );
  }
  return true;
}

function getMissingRequiredProperties_() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  return APP_CONFIG.REQUIRED_SCRIPT_PROPERTIES.filter(function (key) {
    return !Object.prototype.hasOwnProperty.call(properties, key) ||
      !String(properties[key]).trim();
  });
}

/**
 * 対象スプレッドシートのフォーム送信時トリガーを、重複させず作成する。
 */
function installApplicationFormTriggers() {
  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet) {
    throw new Error(APP_CONFIG.TEXT.NO_SPREADSHEET);
  }
  var matchingTriggers = getApplicationFormSubmitTriggers_(spreadsheet);
  if (matchingTriggers.length) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.TRIGGER_INSTALL,
      '',
      APP_CONFIG.TEXT.TRIGGER_EXISTS,
      'count=' + matchingTriggers.length
    );
    return { created: false, existingCount: matchingTriggers.length };
  }

  ScriptApp.newTrigger(APP_CONFIG.TRIGGERS.FORM_SUBMIT_HANDLER)
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.TRIGGER_INSTALL,
    '',
    APP_CONFIG.TEXT.TRIGGER_CREATED,
    ''
  );
  return { created: true, existingCount: 0 };
}

/**
 * 現在のプロジェクトトリガーを、秘密値を含まない情報に整形して返す。
 */
function listApplicationFormTriggers() {
  var triggers = ScriptApp.getProjectTriggers().map(function (trigger) {
    return describeTrigger_(trigger);
  });
  console.log(JSON.stringify(triggers, null, 2));
  return triggers;
}

/**
 * 対象スプレッドシートの onFormSubmit トリガーを1件残して削除する。
 * 明示的にこの関数を実行したときだけ削除する。
 */
function removeDuplicateApplicationFormTriggers() {
  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet) {
    throw new Error(APP_CONFIG.TEXT.NO_SPREADSHEET);
  }
  var triggers = getApplicationFormSubmitTriggers_(spreadsheet);
  var duplicateTriggers = triggers.slice(1);
  var duplicateDescriptions = duplicateTriggers.map(function (trigger) {
    return describeTrigger_(trigger);
  });
  duplicateTriggers.forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  var message = duplicateTriggers.length
    ? APP_CONFIG.TEXT.TRIGGER_CLEANUP_COMPLETE_PREFIX +
      duplicateTriggers.length
    : APP_CONFIG.TEXT.TRIGGER_CLEANUP_NONE;
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.TRIGGER_CLEANUP,
    '',
    message,
    JSON.stringify(duplicateDescriptions)
  );
  return {
    removedCount: duplicateTriggers.length,
    remainingCount: triggers.length ? 1 : 0
  };
}

/**
 * 現在の構成を変更せず点検する。点検ログの追記だけを行う。
 */
function checkApplicationFormSetup() {
  var result = {
    ok: true,
    sheets: {},
    missingProperties: [],
    formSubmitTriggerCount: 0,
    fiveDaysTriggerCount: 0,
    issues: [],
    warnings: []
  };
  var spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet) {
    result.ok = false;
    result.issues.push(APP_CONFIG.TEXT.NO_SPREADSHEET);
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  var sheetDefinitions = {};
  sheetDefinitions[APP_CONFIG.SHEETS.RESPONSES] =
    Object.keys(APP_CONFIG.RESPONSE_HEADERS).map(function (key) {
      return APP_CONFIG.RESPONSE_HEADERS[key];
    });
  sheetDefinitions[APP_CONFIG.SHEETS.APPLICATIONS] =
    APP_CONFIG.APPLICATION_HEADER_ORDER;
  sheetDefinitions[APP_CONFIG.SHEETS.EVENT_DATES] =
    APP_CONFIG.EVENT_DATE_HEADER_ORDER;
  sheetDefinitions[APP_CONFIG.SHEETS.MAIL_TEMPLATES] =
    APP_CONFIG.MAIL_TEMPLATE_HEADER_ORDER;
  sheetDefinitions[APP_CONFIG.SHEETS.SETTINGS] =
    APP_CONFIG.SETTINGS_HEADER_ORDER;
  sheetDefinitions[APP_CONFIG.SHEETS.LOGS] = APP_CONFIG.LOG_HEADER_ORDER;

  Object.keys(sheetDefinitions).forEach(function (sheetName) {
    var sheetResult = { exists: false, headersValid: false, error: '' };
    try {
      var sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(APP_CONFIG.TEXT.SHEET_MISSING_PREFIX + sheetName);
      }
      sheetResult.exists = true;
      var headerMap = getHeaderMap_(sheet);
      assertHeaders_(headerMap, sheetDefinitions[sheetName], sheetName);
      sheetResult.headersValid = true;
    } catch (error) {
      sheetResult.error = normalizeError_(error).message;
      result.issues.push(sheetResult.error);
    }
    result.sheets[sheetName] = sheetResult;
  });

  result.missingProperties = getMissingRequiredProperties_();
  if (result.missingProperties.length) {
    result.issues.push(
      APP_CONFIG.TEXT.REQUIRED_PROPERTIES_MISSING_PREFIX +
        result.missingProperties.join(', ')
    );
  }
  var calendarId = PropertiesService.getScriptProperties().getProperty(
    APP_CONFIG.SCRIPT_PROPERTIES.CALENDAR_ID
  );
  if (!calendarId || !String(calendarId).trim()) {
    result.warnings.push(APP_CONFIG.TEXT.OPTIONAL_CALENDAR_ID_MISSING);
  }
  var discordWebhook =
    PropertiesService.getScriptProperties().getProperty(
      APP_CONFIG.SCRIPT_PROPERTIES.DISCORD_WEBHOOK_URL
    );
  if (!discordWebhook || !String(discordWebhook).trim()) {
    result.warnings.push(APP_CONFIG.TEXT.OPTIONAL_DISCORD_WEBHOOK_MISSING);
  }
  try {
    getEventOperationalSettings_();
  } catch (error) {
    result.issues.push(normalizeError_(error).message);
  }
  result.formSubmitTriggerCount =
    getApplicationFormSubmitTriggers_(spreadsheet).length;
  if (result.formSubmitTriggerCount !== 1) {
    result.issues.push(
      APP_CONFIG.TRIGGERS.FORM_SUBMIT_HANDLER +
        ' trigger count=' +
        result.formSubmitTriggerCount
    );
  }
  result.fiveDaysTriggerCount = ScriptApp.getProjectTriggers().filter(
    function (trigger) {
      return (
        trigger.getHandlerFunction() ===
          APP_CONFIG.TRIGGERS.FIVE_DAYS_HANDLER &&
        trigger.getEventType() === ScriptApp.EventType.CLOCK
      );
    }
  ).length;
  if (result.fiveDaysTriggerCount !== 1) {
    result.issues.push(
      APP_CONFIG.TRIGGERS.FIVE_DAYS_HANDLER +
        ' trigger count=' +
        result.fiveDaysTriggerCount
    );
  }
  result.ok = result.issues.length === 0;

  var level =
    result.ok && !result.warnings.length
      ? APP_CONFIG.LOG_LEVEL.INFO
      : APP_CONFIG.LOG_LEVEL.WARN;
  var message = !result.ok
    ? APP_CONFIG.TEXT.SETUP_CHECK_NG
    : result.warnings.length
      ? APP_CONFIG.TEXT.SETUP_CHECK_WARNING
      : APP_CONFIG.TEXT.SETUP_CHECK_OK;
  try {
    appendLog_(
      level,
      APP_CONFIG.PROCESS.SETUP_CHECK,
      '',
      message,
      JSON.stringify(result)
    );
  } catch (logError) {
    console.error(logError);
  }
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function getApplicationFormSubmitTriggers_(spreadsheet) {
  var spreadsheetId = spreadsheet.getId();
  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    return (
      trigger.getHandlerFunction() ===
        APP_CONFIG.TRIGGERS.FORM_SUBMIT_HANDLER &&
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
      trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS &&
      trigger.getTriggerSourceId() === spreadsheetId
    );
  });
}

function describeTrigger_(trigger) {
  return {
    uniqueId: trigger.getUniqueId(),
    handlerFunction: trigger.getHandlerFunction(),
    eventType: String(trigger.getEventType()),
    triggerSource: String(trigger.getTriggerSource()),
    triggerSourceId: trigger.getTriggerSourceId() || ''
  };
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
  var formOwnedHeaders = [
    APP_CONFIG.RESPONSE_HEADERS.TIMESTAMP,
    APP_CONFIG.RESPONSE_HEADERS.NAME,
    APP_CONFIG.RESPONSE_HEADERS.PARTICIPANTS,
    APP_CONFIG.RESPONSE_HEADERS.EMERGENCY_PHONE,
    APP_CONFIG.RESPONSE_HEADERS.EMAIL
  ];
  assertHeaders_(
    headerMap,
    formOwnedHeaders,
    APP_CONFIG.SHEETS.RESPONSES
  );
  if (!headerMap[APP_CONFIG.RESPONSE_HEADERS.APPLICATION_DATE]) {
    throw new Error(APP_CONFIG.TEXT.RESPONSE_APPLICATION_DATE_REQUIRED);
  }
  appendMissingHeaders_(sheet, [
    APP_CONFIG.RESPONSE_HEADERS.TITLE,
    APP_CONFIG.RESPONSE_HEADERS.EVENT_SLOT_KEY
  ]);
  assertHeaders_(
    getHeaderMap_(sheet),
    APP_CONFIG.RESPONSE_HEADER_ORDER,
    APP_CONFIG.SHEETS.RESPONSES
  );
}

/**
 * 既存列やデータを動かさず、不足ヘッダーだけを末尾へ追加する。
 */
function appendMissingHeaders_(sheet, requiredHeaders) {
  var headerMap = getHeaderMap_(sheet);
  var missingHeaders = requiredHeaders.filter(function (header) {
    return !headerMap[header];
  });
  if (!missingHeaders.length) {
    return;
  }
  var startColumn = sheet.getLastColumn() + 1;
  var requiredLastColumn = startColumn + missingHeaders.length - 1;
  if (sheet.getMaxColumns() < requiredLastColumn) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      requiredLastColumn - sheet.getMaxColumns()
    );
  }
  sheet
    .getRange(
      APP_CONFIG.HEADER_ROW,
      startColumn,
      1,
      missingHeaders.length
    )
    .setValues([missingHeaders]);
}

/**
 * 廃止対象ヘッダーと完全一致する申込管理列だけを削除する。
 * 右側の列から削除し、列移動による誤削除を防ぐ。
 */
function removeDeprecatedApplicationColumns_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.APPLICATIONS);
  if (!sheet || sheet.getLastColumn() < 1) {
    return [];
  }
  var headerMap = getHeaderMap_(sheet);
  var targets = APP_CONFIG.DEPRECATED_APPLICATION_HEADERS
    .filter(function (header) {
      return Boolean(headerMap[header]);
    })
    .map(function (header) {
      return { header: header, column: headerMap[header] };
    })
    .sort(function (left, right) {
      return right.column - left.column;
    });
  targets.forEach(function (target) {
    sheet.deleteColumn(target.column);
  });
  return targets.map(function (target) {
    return target.header;
  });
}

function ensureSheetWithHeaders_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  var isNewOrEmpty = false;
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    isNewOrEmpty = true;
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
    if (hasUnexpectedHeader || existingHeaders.join('') === '') {
      throw new Error(
        sheetName + APP_CONFIG.TEXT.UNSAFE_EXISTING_SHEET_INFIX
      );
    }
    getHeaderMap_(sheet);
    appendMissingHeaders_(sheet, headers);
  } else {
    isNewOrEmpty = true;
  }

  if (isNewOrEmpty) {
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
      .setValues([headers]);
  }
  var requiredMaxRows =
    APP_CONFIG.DATA_START_ROW + APP_CONFIG.VALIDATION_ROW_COUNT - 1;
  if (sheet.getMaxRows() < requiredMaxRows) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      requiredMaxRows - sheet.getMaxRows()
    );
  }
  sheet
    .getRange(
      APP_CONFIG.HEADER_ROW,
      APP_CONFIG.FIRST_COLUMN,
      1,
      sheet.getLastColumn()
    )
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
  widths[APP_CONFIG.APPLICATION_HEADERS.INTERNAL_NOTE] = 260;
  widths[APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT] = 150;
  widths[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_DATE] = 170;
  widths[APP_CONFIG.APPLICATION_HEADERS.TITLE] = 240;
  widths[APP_CONFIG.APPLICATION_HEADERS.EVENT_SLOT_KEY] = 260;
  Object.keys(widths).forEach(function (header) {
    sheet.setColumnWidth(headerMap[header], widths[header]);
  });

  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.STATUS],
    APP_CONFIG.EVENT_APPLICATION_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS],
    APP_CONFIG.MAIL_STATUS_OPTIONS
  );
  [
    APP_CONFIG.APPLICATION_HEADERS.RECEIVED_AT,
    APP_CONFIG.APPLICATION_HEADERS.UPDATED_AT,
    APP_CONFIG.APPLICATION_HEADERS.APPLICATION_DATE
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

function configureEventDateSheet_(sheet) {
  var headers = APP_CONFIG.EVENT_DATE_HEADERS;
  var headerMap = getHeaderMap_(sheet);
  var widths = {};
  widths[headers.APPLICATION_DATE] = 170;
  widths[headers.TITLE] = 240;
  widths[headers.CAPACITY] = 80;
  widths[headers.MINIMUM_PARTICIPANTS] = 120;
  widths[headers.WAITLIST_CAPACITY] = 140;
  widths[headers.PRICE_PER_PERSON] = 130;
  widths[headers.RECEPTION_START_TIME] = 120;
  widths[headers.EVENT_MAIL_STATUS] = 110;
  widths[headers.RECRUITMENT_STATUS] = 110;
  widths[headers.EXECUTION_STATUS] = 140;
  widths[headers.FINAL_PARTICIPANTS] = 110;
  widths[headers.GUIDE_FEE] = 110;
  widths[headers.ASSIGNEE] = 120;
  widths[headers.PARTICIPATING] = 90;
  widths[headers.WAITLISTED] = 120;
  widths[headers.CANCELED] = 90;
  widths[headers.DECLINED] = 90;
  widths[headers.TOTAL_APPLICATION_PARTICIPANTS] = 110;
  widths[headers.EVENT_ID] = 220;
  widths[headers.ATTENDANCE_STATUS] = 130;
  widths[headers.ATTENDANCE_KEY] = 180;
  widths[headers.DISCORD_STATUS] = 130;
  widths[headers.CALENDAR_STATUS] = 140;
  widths[headers.INTERNAL_NOTE] = 280;
  widths[headers.MINIMUM_NOTIFICATION] = 150;
  widths[headers.WAITLIST_NOTIFICATION] = 150;
  widths[headers.FIVE_DAYS_NOTIFICATION] = 110;
  Object.keys(widths).forEach(function (header) {
    sheet.setColumnWidth(headerMap[header], widths[header]);
  });

  setDropdown_(
    sheet,
    headerMap[headers.RECRUITMENT_STATUS],
    APP_CONFIG.RECRUITMENT_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[headers.EXECUTION_STATUS],
    APP_CONFIG.EXECUTION_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[headers.EVENT_MAIL_STATUS],
    APP_CONFIG.EVENT_MAIL_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[headers.DISCORD_STATUS],
    APP_CONFIG.DISCORD_STATUS_OPTIONS
  );
  setDropdown_(
    sheet,
    headerMap[headers.CALENDAR_STATUS],
    APP_CONFIG.CALENDAR_STATUS_OPTIONS
  );
  [
    headers.MINIMUM_NOTIFICATION,
    headers.WAITLIST_NOTIFICATION,
    headers.FIVE_DAYS_NOTIFICATION
  ].forEach(function (header) {
    setDropdown_(
      sheet,
      headerMap[header],
      APP_CONFIG.NOTIFICATION_STATUS_OPTIONS
    );
  });
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      headerMap[headers.APPLICATION_DATE],
      APP_CONFIG.VALIDATION_ROW_COUNT,
      1
    )
    .setNumberFormat(APP_CONFIG.DATE_FORMAT);
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      headerMap[headers.RECEPTION_START_TIME],
      APP_CONFIG.VALIDATION_ROW_COUNT,
      1
    )
    .setNumberFormat(APP_CONFIG.TIME_FORMAT);
  [headers.PRICE_PER_PERSON, headers.GUIDE_FEE].forEach(function (header) {
    sheet
      .getRange(
        APP_CONFIG.DATA_START_ROW,
        headerMap[header],
        APP_CONFIG.VALIDATION_ROW_COUNT,
        1
      )
      .setNumberFormat('#,##0');
  });
  ensureBasicFilter_(sheet, APP_CONFIG.EVENT_DATE_HEADER_ORDER.length);
}

function configureMailTemplateSheet_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  sheet.setColumnWidth(headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.KEY], 280);
  sheet.setColumnWidth(headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.VALUE], 520);
  sheet.setColumnWidth(
    headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.DESCRIPTION],
    240
  );
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.VALUE],
      APP_CONFIG.VALIDATION_ROW_COUNT,
      1
    )
    .setWrap(true);
  ensureBasicFilter_(sheet, APP_CONFIG.MAIL_TEMPLATE_HEADER_ORDER.length);
}

function seedEventDiscordStatuses_(sheet) {
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return;
  }
  var headers = APP_CONFIG.EVENT_DATE_HEADERS;
  var headerMap = getHeaderMap_(sheet);
  var values = sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getValues();
  values.forEach(function (row, index) {
    var hasEvent =
      row[headerMap[headers.APPLICATION_DATE] - 1] ||
      row[headerMap[headers.TITLE] - 1];
    var status = row[headerMap[headers.DISCORD_STATUS] - 1];
    if (
      hasEvent &&
      APP_CONFIG.DISCORD_STATUS_OPTIONS.indexOf(status) === -1
    ) {
      sheet
        .getRange(
          APP_CONFIG.DATA_START_ROW + index,
          headerMap[headers.DISCORD_STATUS]
        )
        .setValue(APP_CONFIG.DISCORD_STATUS.UNNOTIFIED);
    }
    if (!hasEvent) {
      return;
    }
    var combinedStatus =
      APP_CONFIG.DISCORD_STATUS_OPTIONS.indexOf(status) !== -1
        ? status
        : APP_CONFIG.DISCORD_STATUS.UNNOTIFIED;
    var initialStatuses = {};
    initialStatuses[headers.MINIMUM_NOTIFICATION] =
      combinedStatus === APP_CONFIG.DISCORD_STATUS.MINIMUM_NOTIFIED ||
      combinedStatus === APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
        ? APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
        : combinedStatus === APP_CONFIG.DISCORD_STATUS.ERROR
          ? APP_CONFIG.NOTIFICATION_STATUS.ERROR
          : APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED;
    initialStatuses[headers.WAITLIST_NOTIFICATION] =
      combinedStatus === APP_CONFIG.DISCORD_STATUS.WAITLIST_NOTIFIED ||
      combinedStatus === APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
        ? APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
        : combinedStatus === APP_CONFIG.DISCORD_STATUS.ERROR
          ? APP_CONFIG.NOTIFICATION_STATUS.ERROR
          : APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED;
    initialStatuses[headers.FIVE_DAYS_NOTIFICATION] =
      APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED;
    Object.keys(initialStatuses).forEach(function (header) {
      var currentValue = row[headerMap[header] - 1];
      if (
        APP_CONFIG.NOTIFICATION_STATUS_OPTIONS.indexOf(currentValue) === -1
      ) {
        sheet
          .getRange(APP_CONFIG.DATA_START_ROW + index, headerMap[header])
          .setValue(initialStatuses[header]);
      }
    });
  });
}

function ensureBasicFilter_(sheet, columnCount) {
  if (!sheet.getFilter()) {
    sheet
      .getRange(
        APP_CONFIG.HEADER_ROW,
        APP_CONFIG.FIRST_COLUMN,
        Math.max(
          sheet.getLastRow(),
          APP_CONFIG.VALIDATION_ROW_COUNT + APP_CONFIG.HEADER_ROW
        ),
        columnCount
      )
      .createFilter();
  }
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
      .forEach(function (row, index) {
        if (row[0]) {
          existingKeys[row[0]] = APP_CONFIG.DATA_START_ROW + index;
        }
      });
  }
  APP_CONFIG.INITIAL_SETTINGS.forEach(function (setting) {
    if (existingKeys[setting[0]]) {
      sheet
        .getRange(
          existingKeys[setting[0]],
          headerMap[APP_CONFIG.SETTINGS_HEADERS.DESCRIPTION]
        )
        .setValue(setting[2]);
      return;
    }
    var row = new Array(sheet.getLastColumn()).fill('');
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.KEY] - 1] = setting[0];
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.VALUE] - 1] = setting[1];
    row[headerMap[APP_CONFIG.SETTINGS_HEADERS.DESCRIPTION] - 1] = setting[2];
    sheet.appendRow(row);
  });
}

function seedMailTemplates_(sheet) {
  var headerMap = getHeaderMap_(sheet);
  var existingKeys = {};
  if (sheet.getLastRow() >= APP_CONFIG.DATA_START_ROW) {
    sheet
      .getRange(
        APP_CONFIG.DATA_START_ROW,
        headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.KEY],
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
  APP_CONFIG.INITIAL_MAIL_TEMPLATES.forEach(function (template) {
    if (existingKeys[template[0]]) {
      return;
    }
    var row = new Array(sheet.getLastColumn()).fill('');
    row[headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.KEY] - 1] = template[0];
    row[headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.VALUE] - 1] = template[1];
    row[headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.DESCRIPTION] - 1] =
      template[2];
    sheet.appendRow(row);
  });
}
