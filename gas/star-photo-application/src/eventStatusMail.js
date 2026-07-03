/**
 * インストール型編集トリガーの入口。ここではメールを送信しない。
 */
function onEventStatusEdit(e) {
  if (!isEventStatusEdit_(e)) {
    return;
  }
  var context = getEventStatusEditContext_(e);
  if (!context) {
    return;
  }
  if (context.eventMailStatus === APP_CONFIG.EVENT_MAIL_STATUS.SENT) {
    revertEventStatus_(context.eventSlotKey);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.WARN,
      APP_CONFIG.PROCESS.EVENT_STATUS_EDIT,
      context.eventSlotKey,
      APP_CONFIG.TEXT.EVENT_STATUS_MAIL_ALREADY_SENT,
      ''
    );
    showUiAlert_(APP_CONFIG.TEXT.EVENT_STATUS_MAIL_ALREADY_SENT);
    return;
  }
  showEventStatusMailConfirmationDialog_(context);
}

function isEventStatusEdit_(e) {
  if (!e || !e.range || e.range.getNumRows() !== 1 ||
      e.range.getNumColumns() !== 1) {
    return false;
  }
  var sheet = e.range.getSheet();
  if (
    sheet.getName() !== APP_CONFIG.SHEETS.EVENT_DATES ||
    e.range.getRow() < APP_CONFIG.DATA_START_ROW
  ) {
    return false;
  }
  var headerMap = getHeaderMap_(sheet);
  return (
    e.range.getColumn() ===
      headerMap[APP_CONFIG.EVENT_DATE_HEADERS.EXECUTION_STATUS] &&
    String(e.value || '') !== String(e.oldValue || '') &&
    APP_CONFIG.EXECUTION_STATUS_OPTIONS.indexOf(String(e.value || '')) !== -1
  );
}

function getEventStatusEditContext_(e) {
  var sheet = e.range.getSheet();
  var headerMap = getHeaderMap_(sheet);
  var headers = APP_CONFIG.EVENT_DATE_HEADERS;
  assertHeaders_(
    headerMap,
    APP_CONFIG.EVENT_DATE_HEADER_ORDER,
    APP_CONFIG.SHEETS.EVENT_DATES
  );
  var row = sheet
    .getRange(e.range.getRow(), APP_CONFIG.FIRST_COLUMN, 1, sheet.getLastColumn())
    .getValues()[0];
  var applicationDate = row[headerMap[headers.APPLICATION_DATE] - 1];
  var title = String(row[headerMap[headers.TITLE] - 1] || '').trim();
  if (!(applicationDate instanceof Date) || isNaN(applicationDate.getTime()) ||
      !title) {
    return null;
  }
  var previousStatus = typeof e.oldValue === 'undefined'
    ? String(row[headerMap[headers.PREVIOUS_EXECUTION_STATUS] - 1] || '')
    : String(e.oldValue || '');
  sheet
    .getRange(e.range.getRow(), headerMap[headers.PREVIOUS_EXECUTION_STATUS])
    .setValue(previousStatus);
  var eventSlotKey = createEventSlotKey_(applicationDate, title);
  var applications = getParticipantApplicationsForEventSlot_(eventSlotKey);
  return {
    eventSlotKey: eventSlotKey,
    title: title,
    applicationDate: formatDateTime_(applicationDate),
    newStatus: String(e.value),
    eventMailStatus: String(
      row[headerMap[headers.EVENT_MAIL_STATUS] - 1] || ''
    ),
    participantNames: applications.map(function (application) {
      return String(application[APP_CONFIG.APPLICATION_HEADERS.NAME] || '');
    })
  };
}

function showEventStatusMailConfirmationDialog_(context) {
  var template = HtmlService.createTemplateFromFile(
    'eventStatusMailConfirmDialog'
  );
  template.contextJson = JSON.stringify(context).replace(/</g, '\\u003c');
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(520).setHeight(560),
    '実施状況メール確認'
  );
}

function getParticipantApplicationsForEventSlot_(eventSlotKey) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.APPLICATIONS);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.APPLICATION_HEADER_ORDER,
    APP_CONFIG.SHEETS.APPLICATIONS
  );
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return [];
  }
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  return sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getValues()
    .filter(function (row) {
      return (
        String(row[headerMap[headers.EVENT_SLOT_KEY] - 1] || '') ===
          String(eventSlotKey) &&
        row[headerMap[headers.STATUS] - 1] ===
          APP_CONFIG.EVENT_APPLICATION_STATUS.PARTICIPATING &&
        String(row[headerMap[headers.EMAIL] - 1] || '').trim()
      );
    })
    .map(function (row) {
      var application = {};
      Object.keys(headerMap).forEach(function (header) {
        application[header] = row[headerMap[header] - 1];
      });
      return application;
    });
}

function getEventStatusTemplateKeys_(status) {
  var statuses = APP_CONFIG.EXECUTION_STATUS;
  var keys = APP_CONFIG.MAIL_TEMPLATE_KEYS;
  var mapping = {};
  mapping[statuses.CONFIRMED] = {
    subject: keys.EVENT_CONFIRMED_SUBJECT,
    body: keys.EVENT_CONFIRMED_BODY
  };
  mapping[statuses.RAIN_CANCELED] = {
    subject: keys.EVENT_RAIN_CANCEL_SUBJECT,
    body: keys.EVENT_RAIN_CANCEL_BODY
  };
  mapping[statuses.INSUFFICIENT_CANCELED] = {
    subject: keys.EVENT_INSUFFICIENT_CANCEL_SUBJECT,
    body: keys.EVENT_INSUFFICIENT_CANCEL_BODY
  };
  mapping[statuses.COMPLETED] = {
    subject: keys.EVENT_COMPLETED_SUBJECT,
    body: keys.EVENT_COMPLETED_BODY
  };
  if (!mapping[status]) {
    throw new Error('実施状況メールの対象外ステータスです: ' + status);
  }
  return mapping[status];
}

function buildEventStatusMailContext_(application, slot, status, settings) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var placeholders = APP_CONFIG.MAIL_PLACEHOLDERS;
  var participantCount = Number(application[headers.PARTICIPANTS]) || 0;
  var context = {};
  context[placeholders.NAME] = application[headers.NAME];
  context[placeholders.APPLICATION_DATE] = formatDateTime_(slot.applicationDate);
  context[placeholders.TITLE] = slot.title;
  context[placeholders.PARTICIPANTS] = participantCount;
  context[placeholders.PRICE_PER_PERSON] = slot.pricePerPerson;
  context[placeholders.TOTAL_PRICE] = slot.pricePerPerson * participantCount;
  context[placeholders.RECEPTION_START_TIME] =
    formatReceptionTime_(slot.receptionStartTime);
  context[placeholders.STATUS] = application[headers.STATUS];
  context[placeholders.EXECUTION_STATUS] = status;
  context[placeholders.CONTACT_NAME] =
    settings[APP_CONFIG.SETTING_KEYS.CONTACT_NAME] ||
    APP_CONFIG.INITIAL_SETTINGS[1][1];
  context[placeholders.REPLY_TO_EMAIL] =
    settings[APP_CONFIG.SETTING_KEYS.REPLY_TO_EMAIL] || '';
  return context;
}

function sendEventStatusMailForSlot_(slot, status, applications) {
  var templateKeys = getEventStatusTemplateKeys_(status);
  var templates = getMailTemplates_();
  var subjectTemplate = requireMailTemplate_(templates, templateKeys.subject);
  var bodyTemplate = requireMailTemplate_(templates, templateKeys.body);
  var settings = getSettings_();
  var prepared = applications.map(function (application) {
    var context = buildEventStatusMailContext_(
      application,
      slot,
      status,
      settings
    );
    return {
      to: String(
        application[APP_CONFIG.APPLICATION_HEADERS.EMAIL] || ''
      ).trim(),
      subject: renderMailTemplate_(subjectTemplate, context),
      body: renderMailTemplate_(bodyTemplate, context),
      name: context[APP_CONFIG.MAIL_PLACEHOLDERS.CONTACT_NAME],
      replyTo: context[APP_CONFIG.MAIL_PLACEHOLDERS.REPLY_TO_EMAIL]
    };
  });
  prepared.forEach(function (mail) {
    var options = {
      to: mail.to,
      subject: mail.subject,
      body: mail.body,
      name: mail.name
    };
    if (mail.replyTo) {
      options.replyTo = mail.replyTo;
    }
    MailApp.sendEmail(options);
  });
  return prepared.length;
}

function sendEventStatusMailAfterConfirmation(eventSlotKey, newStatus) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var slot = getEventSlotForStatusMail_(eventSlotKey);
    if (slot.executionStatus !== newStatus) {
      throw new Error(APP_CONFIG.TEXT.EVENT_STATUS_CHANGED_AGAIN);
    }
    var currentMailStatus = getEventSlotField_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.EVENT_MAIL_STATUS
    );
    if (currentMailStatus === APP_CONFIG.EVENT_MAIL_STATUS.SENT) {
      throw new Error(APP_CONFIG.TEXT.EVENT_STATUS_MAIL_ALREADY_SENT);
    }
    var applications = getParticipantApplicationsForEventSlot_(eventSlotKey);
    var sentCount = sendEventStatusMailForSlot_(
      slot,
      newStatus,
      applications
    );
    markEventStatusMailSent_(eventSlotKey);
    updatePreviousEventStatus_(eventSlotKey);
    var message = sentCount
      ? APP_CONFIG.TEXT.EVENT_STATUS_MAIL_SENT
      : APP_CONFIG.TEXT.EVENT_STATUS_MAIL_NO_RECIPIENTS;
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
      eventSlotKey,
      message,
      'status=' + newStatus + ', recipients=' + sentCount
    );
    return { ok: true, message: message, sentCount: sentCount };
  } catch (error) {
    var normalized = normalizeError_(error);
    if (normalized.message === APP_CONFIG.TEXT.EVENT_STATUS_CHANGED_AGAIN) {
      appendLog_(
        APP_CONFIG.LOG_LEVEL.WARN,
        APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
        eventSlotKey,
        normalized.message,
        ''
      );
      throw error;
    }
    try {
      markEventStatusMailError_(eventSlotKey);
      revertEventStatus_(eventSlotKey);
      appendLog_(
        APP_CONFIG.LOG_LEVEL.ERROR,
        APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
        eventSlotKey,
        APP_CONFIG.TEXT.EVENT_STATUS_MAIL_FAILED,
        normalized.detail || normalized.message
      );
    } catch (recoveryError) {
      normalized.detail += '\nRecovery: ' + normalizeError_(recoveryError).detail;
    }
    throw new Error(
      APP_CONFIG.TEXT.EVENT_STATUS_MAIL_FAILED + ' ' + normalized.message
    );
  } finally {
    lock.releaseLock();
  }
}

function cancelEventStatusChange(eventSlotKey) {
  revertEventStatus_(eventSlotKey);
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
    eventSlotKey,
    APP_CONFIG.TEXT.EVENT_STATUS_CHANGE_CANCELED,
    ''
  );
  return { ok: true };
}

function getEventSlotForStatusMail_(eventSlotKey) {
  var slot = getEventSlots_().filter(function (candidate) {
    return candidate.key === eventSlotKey;
  })[0];
  if (!slot) {
    throw new Error(APP_CONFIG.TEXT.EVENT_SLOT_NOT_FOUND_PREFIX + eventSlotKey);
  }
  return slot;
}

function getEventSlotField_(rowNumber, header) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  return sheet.getRange(rowNumber, getHeaderMap_(sheet)[header]).getValue();
}

function setEventSlotField_(rowNumber, header, value) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  if (!headerMap[header]) {
    throw new Error(APP_CONFIG.TEXT.UPDATE_TARGET_MISSING_PREFIX + header);
  }
  sheet.getRange(rowNumber, headerMap[header]).setValue(value);
}

function revertEventStatus_(eventSlotKey) {
  var slot = getEventSlotForStatusMail_(eventSlotKey);
  setEventSlotField_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.EXECUTION_STATUS,
    getEventSlotField_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.PREVIOUS_EXECUTION_STATUS
    )
  );
}

function updatePreviousEventStatus_(eventSlotKey) {
  var slot = getEventSlotForStatusMail_(eventSlotKey);
  setEventSlotField_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.PREVIOUS_EXECUTION_STATUS,
    slot.executionStatus
  );
}

function markEventStatusMailSent_(eventSlotKey) {
  var slot = getEventSlotForStatusMail_(eventSlotKey);
  setEventSlotField_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.EVENT_MAIL_STATUS,
    APP_CONFIG.EVENT_MAIL_STATUS.SENT
  );
}

function markEventStatusMailError_(eventSlotKey) {
  var slot = getEventSlotForStatusMail_(eventSlotKey);
  setEventSlotField_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.EVENT_MAIL_STATUS,
    APP_CONFIG.EVENT_MAIL_STATUS.ERROR
  );
}
