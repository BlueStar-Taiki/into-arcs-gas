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
    .clearDataValidations()
    .setValue(previousStatus);
  var eventSlotKey = createEventSlotKey_(applicationDate, title);
  var applications = getParticipantApplicationsForEventSlot_(eventSlotKey);
  var slot = getEventSlotForStatusMail_(eventSlotKey);
  var guidePreview = buildGuideStatusPreviewData_(slot);
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
    }),
    guideNames: guidePreview.guideNames,
    guideWarnings: guidePreview.warnings
  };
}

function showEventStatusMailConfirmationDialog_(context) {
  var template = HtmlService.createTemplateFromFile(
    'eventStatusMailConfirmDialog'
  );
  template.contextJson = JSON.stringify(context).replace(/</g, '\\u003c');
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(560).setHeight(680),
    '実施状況メール確認'
  );
}

function getParticipantApplicationsForEventSlot_(eventSlotKey, requireEmail) {
  requireEmail =
    typeof requireEmail === 'undefined' ? true : Boolean(requireEmail);
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
        (!requireEmail ||
          String(row[headerMap[headers.EMAIL] - 1] || '').trim())
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

function getGuideSheet_() {
  return getRequiredSheet_(APP_CONFIG.SHEETS.GUIDES);
}

function getGuideMap_() {
  var sheet = getGuideSheet_();
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.GUIDE_HEADER_ORDER,
    APP_CONFIG.SHEETS.GUIDES
  );
  var guides = {};
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return guides;
  }
  var headers = APP_CONFIG.GUIDE_HEADERS;
  sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getValues()
    .forEach(function (row) {
      var name = String(row[headerMap[headers.NAME] - 1] || '').trim();
      if (!name) {
        return;
      }
      guides[name] = {
        name: name,
        email: String(row[headerMap[headers.EMAIL] - 1] || '').trim(),
        attendanceKey: String(
          row[headerMap[headers.ATTENDANCE_KEY] - 1] || ''
        ).trim(),
        attendanceTarget: String(
          row[headerMap[headers.ATTENDANCE_TARGET] - 1] || ''
        ).trim(),
        note: String(row[headerMap[headers.NOTE] - 1] || '')
      };
    });
  return guides;
}

function parseGuideNames_(value) {
  return String(value || '')
    .split(/[,、\/\n]/)
    .map(function (name) {
      return name.trim();
    })
    .filter(function (name) {
      return Boolean(name);
    });
}

function getGuidesForEventSlot_(eventRowObject) {
  var requestedNames = parseGuideNames_(eventRowObject.assignee);
  var guideMap = getGuideMap_();
  var seenEmails = {};
  var result = {
    guides: [],
    missingNames: [],
    emptyEmailNames: []
  };
  requestedNames.forEach(function (name) {
    var guide = guideMap[name];
    if (!guide) {
      result.missingNames.push(name);
      return;
    }
    if (!guide.email) {
      result.emptyEmailNames.push(name);
      return;
    }
    var emailKey = guide.email.toLowerCase();
    if (seenEmails[emailKey]) {
      return;
    }
    seenEmails[emailKey] = true;
    result.guides.push(guide);
  });
  return result;
}

function getGuideStatusTemplateKeys_(status) {
  var statuses = APP_CONFIG.EXECUTION_STATUS;
  var keys = APP_CONFIG.MAIL_TEMPLATE_KEYS;
  var mapping = {};
  mapping[statuses.CONFIRMED] = {
    subject: keys.GUIDE_EVENT_CONFIRMED_SUBJECT,
    body: keys.GUIDE_EVENT_CONFIRMED_BODY
  };
  mapping[statuses.RAIN_CANCELED] = {
    subject: keys.GUIDE_EVENT_RAIN_CANCEL_SUBJECT,
    body: keys.GUIDE_EVENT_RAIN_CANCEL_BODY
  };
  mapping[statuses.INSUFFICIENT_CANCELED] = {
    subject: keys.GUIDE_EVENT_INSUFFICIENT_CANCEL_SUBJECT,
    body: keys.GUIDE_EVENT_INSUFFICIENT_CANCEL_BODY
  };
  mapping[statuses.COMPLETED] = {
    subject: keys.GUIDE_EVENT_COMPLETED_SUBJECT,
    body: keys.GUIDE_EVENT_COMPLETED_BODY
  };
  if (!mapping[status]) {
    throw new Error('ガイド向け実施状況メールの対象外ステータスです: ' + status);
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
  context[placeholders.PARTICIPANT_ROSTER_URL] =
    eventRowObject.participantRosterUrl || '';
  return context;
}

function getGuideCancellationReason_(status) {
  if (status === APP_CONFIG.EXECUTION_STATUS.RAIN_CANCELED) {
    return '天候不良のため開催中止';
  }
  if (status === APP_CONFIG.EXECUTION_STATUS.INSUFFICIENT_CANCELED) {
    return '最小催行人数に達しなかったため開催中止';
  }
  return '';
}

function buildGuideStatusMailContext_(guide, eventRowObject, status, settings) {
  var placeholders = APP_CONFIG.MAIL_PLACEHOLDERS;
  var context = {};
  context[placeholders.GUIDE_NAME] = guide.name;
  context[placeholders.APPLICATION_DATE] =
    formatDateTime_(eventRowObject.applicationDate);
  context[placeholders.TITLE] = eventRowObject.title;
  context[placeholders.RECEPTION_START_TIME] =
    formatReceptionTime_(eventRowObject.receptionStartTime);
  context[placeholders.EXECUTION_STATUS] = status;
  context[placeholders.EVENT_AVAILABILITY] =
    getGuideCancellationReason_(status) ? '開催中止' : '開催予定';
  context[placeholders.CANCELLATION_REASON] =
    getGuideCancellationReason_(status);
  context[placeholders.PARTICIPANTS] =
    eventRowObject.participatingCount || 0;
  context[placeholders.WAITLISTED] =
    eventRowObject.waitlistedCount || 0;
  context[placeholders.CAPACITY] = eventRowObject.capacity;
  context[placeholders.MINIMUM_PARTICIPANTS] =
    eventRowObject.minimumParticipants;
  context[placeholders.PRICE_PER_PERSON] =
    eventRowObject.pricePerPerson;
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

function sendGuideStatusMailForSlot_(eventRowObject, status) {
  var guideResult = getGuidesForEventSlot_(eventRowObject);
  logGuideResolutionWarnings_(eventRowObject.key, guideResult);
  if (!guideResult.guides.length) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
      eventRowObject.key,
      APP_CONFIG.TEXT.GUIDE_MAIL_NO_RECIPIENTS,
      'assignee=' + eventRowObject.assignee
    );
    return {
      sentCount: 0,
      skippedCount:
        guideResult.missingNames.length + guideResult.emptyEmailNames.length
    };
  }
  var templateKeys = getGuideStatusTemplateKeys_(status);
  var templates = getMailTemplates_();
  var subjectTemplate = requireMailTemplate_(templates, templateKeys.subject);
  var bodyTemplate = requireMailTemplate_(templates, templateKeys.body);
  var settings = getSettings_();
  var prepared = guideResult.guides.map(function (guide) {
    var context = buildGuideStatusMailContext_(
      guide,
      eventRowObject,
      status,
      settings
    );
    return {
      guide: guide,
      context: context,
      subject: renderMailTemplate_(subjectTemplate, context),
      body: appendParticipantRosterUrlIfNeeded_(
        renderMailTemplate_(bodyTemplate, context),
        status,
        context
      )
    };
  });
  prepared.forEach(function (mail) {
    sendGuideStatusMail_(mail.guide, mail.context, mail.subject, mail.body);
  });
  return {
    sentCount: prepared.length,
    skippedCount:
      guideResult.missingNames.length + guideResult.emptyEmailNames.length
  };
}

function sendGuideStatusMail_(guide, context, subject, body) {
  var options = {
    to: guide.email,
    subject: subject,
    body: body,
    name: context[APP_CONFIG.MAIL_PLACEHOLDERS.CONTACT_NAME]
  };
  var replyTo = context[APP_CONFIG.MAIL_PLACEHOLDERS.REPLY_TO_EMAIL];
  if (replyTo) {
    options.replyTo = replyTo;
  }
  MailApp.sendEmail(options);
}

function appendParticipantRosterUrlIfNeeded_(body, status, context) {
  var rosterUrl =
    context[APP_CONFIG.MAIL_PLACEHOLDERS.PARTICIPANT_ROSTER_URL];
  if (
    status !== APP_CONFIG.EXECUTION_STATUS.CONFIRMED ||
    !rosterUrl ||
    String(body).indexOf(rosterUrl) !== -1
  ) {
    return body;
  }
  return body + '\n\n参加者名簿: ' + rosterUrl;
}

function buildGuideStatusPreviewData_(eventRowObject) {
  var guideResult = getGuidesForEventSlot_(eventRowObject);
  var warnings = [];
  guideResult.missingNames.forEach(function (name) {
    warnings.push(APP_CONFIG.TEXT.GUIDE_NOT_FOUND_PREFIX + name);
  });
  guideResult.emptyEmailNames.forEach(function (name) {
    warnings.push(APP_CONFIG.TEXT.GUIDE_EMAIL_EMPTY_PREFIX + name);
  });
  return {
    guideNames: guideResult.guides.map(function (guide) {
      return guide.name;
    }),
    warnings: warnings
  };
}

function ensureParticipantRosterForStatus_(slot, status, applications) {
  if (status !== APP_CONFIG.EXECUTION_STATUS.CONFIRMED) {
    return slot.participantRosterUrl || '';
  }
  if (slot.participantRosterUrl) {
    return slot.participantRosterUrl;
  }
  var rosterUrl = createParticipantRosterPdf_(slot, applications);
  setEventSlotField_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.PARTICIPANT_ROSTER_URL,
    rosterUrl
  );
  slot.participantRosterUrl = rosterUrl;
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
    slot.key,
    APP_CONFIG.TEXT.PARTICIPANT_ROSTER_CREATED,
    rosterUrl
  );
  return rosterUrl;
}

function createParticipantRosterPdf_(slot, applications) {
  var sheet = getParticipantRosterSheet_();
  populateParticipantRosterSheet_(sheet, slot, applications);
  SpreadsheetApp.flush();
  var spreadsheet = getApplicationSpreadsheet_();
  var exportUrl =
    'https://docs.google.com/spreadsheets/d/' +
    spreadsheet.getId() +
    '/export?format=pdf&gid=' +
    sheet.getSheetId() +
    '&size=A4&portrait=true&fitw=true&sheetnames=false&printtitle=false' +
    '&pagenumbers=false&gridlines=false&fzr=false';
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    }
  });
  var fileName = buildParticipantRosterFileName_(slot);
  var file = getParticipantRosterFolder_()
    .createFile(response.getBlob().setName(fileName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getParticipantRosterFolder_() {
  var settings = getSettings_();
  var folderId =
    settings[APP_CONFIG.SETTING_KEYS.PARTICIPANT_ROSTER_FOLDER_ID] ||
    getInitialSettingValue_(APP_CONFIG.SETTING_KEYS.PARTICIPANT_ROSTER_FOLDER_ID);
  return DriveApp.getFolderById(folderId);
}

function getInitialSettingValue_(key) {
  var matched = APP_CONFIG.INITIAL_SETTINGS.filter(function (setting) {
    return setting[0] === key;
  })[0];
  return matched ? matched[1] : '';
}

function getParticipantRosterSheet_() {
  var sheet = getApplicationSpreadsheet_().getSheetByName(
    APP_CONFIG.SHEETS.PARTICIPANT_ROSTER
  );
  if (!sheet) {
    throw new Error(APP_CONFIG.TEXT.PARTICIPANT_ROSTER_TEMPLATE_MISSING);
  }
  return sheet;
}

function populateParticipantRosterSheet_(sheet, slot, applications) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var startRow = APP_CONFIG.PARTICIPANT_ROSTER_START_ROW;
  sheet.getRange(2, 2).setValue(slot.title);
  sheet.getRange(3, 2).setValue(formatDateTime_(slot.applicationDate));
  sheet.getRange(4, 2).setValue(slot.executionStatus);
  sheet
    .getRange(startRow, 1, APP_CONFIG.VALIDATION_ROW_COUNT, 3)
    .clearContent();
  if (!applications.length) {
    return;
  }
  var values = applications.map(function (application, index) {
    return [
      index + 1,
      sanitizeForSheet_(application[headers.NAME] || ''),
      Number(application[headers.PARTICIPANTS]) || 0
    ];
  });
  sheet.getRange(startRow, 1, values.length, 3).setValues(values);
}

function buildParticipantRosterFileName_(slot) {
  var datePart = Utilities.formatDate(
    slot.applicationDate,
    APP_CONFIG.TIME_ZONE,
    'yyyyMMdd_HHmm'
  );
  return (
    '参加者名簿_' +
    datePart +
    '_' +
    sanitizeFileName_(slot.title) +
    '.pdf'
  );
}

function sanitizeFileName_(value) {
  return String(value || '')
    .replace(/[\\\/:*?"<>|#%\{\}~&]/g, '_')
    .trim()
    .slice(0, 80);
}

function logGuideResolutionWarnings_(eventSlotKey, guideResult) {
  guideResult.missingNames.forEach(function (name) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.WARN,
      APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
      eventSlotKey,
      APP_CONFIG.TEXT.GUIDE_NOT_FOUND_PREFIX + name,
      ''
    );
  });
  guideResult.emptyEmailNames.forEach(function (name) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.WARN,
      APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
      eventSlotKey,
      APP_CONFIG.TEXT.GUIDE_EMAIL_EMPTY_PREFIX + name,
      ''
    );
  });
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
    var rosterApplications = getParticipantApplicationsForEventSlot_(
      eventSlotKey,
      false
    );
    ensureParticipantRosterForStatus_(slot, newStatus, rosterApplications);
    var sentCount = sendEventStatusMailForSlot_(
      slot,
      newStatus,
      applications
    );
    var guideResult;
    try {
      guideResult = sendGuideStatusMailForSlot_(slot, newStatus);
    } catch (guideError) {
      var guideNormalized = normalizeError_(guideError);
      appendLog_(
        APP_CONFIG.LOG_LEVEL.ERROR,
        APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
        eventSlotKey,
        APP_CONFIG.TEXT.GUIDE_MAIL_FAILED_PREFIX + guideNormalized.message,
        guideNormalized.detail
      );
      throw guideError;
    }
    markEventStatusMailSent_(eventSlotKey);
    updatePreviousEventStatus_(eventSlotKey);
    var message = sentCount || guideResult.sentCount
      ? APP_CONFIG.TEXT.EVENT_STATUS_MAIL_SENT
      : APP_CONFIG.TEXT.EVENT_STATUS_MAIL_NO_RECIPIENTS;
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.EVENT_STATUS_MAIL,
      eventSlotKey,
      message,
      'status=' + newStatus +
        ', participants=' + sentCount +
        ', guides=' + guideResult.sentCount +
        ', guideSkipped=' + guideResult.skippedCount
    );
    return {
      ok: true,
      message: message,
      sentCount: sentCount,
      guideSentCount: guideResult.sentCount
    };
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
  setPreviousEventStatus_(slot.rowNumber, slot.executionStatus);
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

function setPreviousEventStatus_(rowNumber, value) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  var header = APP_CONFIG.EVENT_DATE_HEADERS.PREVIOUS_EXECUTION_STATUS;
  if (!headerMap[header]) {
    throw new Error(APP_CONFIG.TEXT.UPDATE_TARGET_MISSING_PREFIX + header);
  }
  sheet
    .getRange(rowNumber, headerMap[header])
    .clearDataValidations()
    .setValue(value);
}
