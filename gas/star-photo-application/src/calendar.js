/**
 * 開催日管理をGoogleカレンダーへ同期する。
 * 未登録枠は作成し、キャンセル枠の登録済みイベントは削除する。
 */
function registerEventSlotsToCalendar() {
  if (!APP_CONFIG.FEATURES.CALENDAR_SYNC_ENABLED) {
    console.info(APP_CONFIG.TEXT.CALENDAR_SYNC_DISABLED);
    return {
      disabled: true,
      candidateCount: 0,
      registeredCount: 0,
      deletionCandidateCount: 0,
      deletedCount: 0,
      errorCount: 0,
      skippedCount: 0
    };
  }
  var calendarId = validateCalendarSettings_();
  var calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error(APP_CONFIG.TEXT.CALENDAR_NOT_FOUND);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
    var headerMap = getHeaderMap_(sheet);
    assertHeaders_(
      headerMap,
      APP_CONFIG.EVENT_DATE_HEADER_ORDER,
      APP_CONFIG.SHEETS.EVENT_DATES
    );
    var result = {
      candidateCount: 0,
      registeredCount: 0,
      deletionCandidateCount: 0,
      deletedCount: 0,
      errorCount: 0,
      skippedCount: 0
    };
    if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
      appendLog_(
        APP_CONFIG.LOG_LEVEL.INFO,
        APP_CONFIG.PROCESS.CALENDAR_REGISTER,
        '',
        APP_CONFIG.TEXT.CALENDAR_REGISTER_COMPLETE,
        JSON.stringify(result)
      );
      return result;
    }

    var headers = APP_CONFIG.EVENT_DATE_HEADERS;
    var values = sheet
      .getRange(
        APP_CONFIG.DATA_START_ROW,
        APP_CONFIG.FIRST_COLUMN,
        sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
        sheet.getLastColumn()
      )
      .getValues();
    values.forEach(function (row, index) {
      var slot = {
        rowNumber: APP_CONFIG.DATA_START_ROW + index,
        applicationDate: row[headerMap[headers.APPLICATION_DATE] - 1],
        title: row[headerMap[headers.TITLE] - 1],
        eventId: row[headerMap[headers.EVENT_ID] - 1],
        recruitmentStatus:
          row[headerMap[headers.RECRUITMENT_STATUS] - 1]
      };
      if (isCalendarDeletionCandidate_(slot)) {
        result.deletionCandidateCount += 1;
        try {
          deleteEventSlotFromCalendar_(calendar, slot);
          sheet
            .getRange(slot.rowNumber, headerMap[headers.EVENT_ID])
            .clearContent();
          sheet
            .getRange(slot.rowNumber, headerMap[headers.CALENDAR_STATUS])
            .setValue(APP_CONFIG.CALENDAR_STATUS.DELETED);
          result.deletedCount += 1;
          appendLog_(
            APP_CONFIG.LOG_LEVEL.INFO,
            APP_CONFIG.PROCESS.CALENDAR_REGISTER,
            '',
            APP_CONFIG.TEXT.CALENDAR_DELETED_PREFIX + slot.rowNumber,
            ''
          );
        } catch (error) {
          recordCalendarRowError_(
            sheet,
            headerMap,
            slot,
            error,
            APP_CONFIG.TEXT.CALENDAR_DELETE_ERROR_PREFIX
          );
          result.errorCount += 1;
        }
        return;
      }
      if (!isCalendarRegistrationCandidate_(slot)) {
        result.skippedCount += 1;
        return;
      }
      result.candidateCount += 1;
      try {
        var eventId = registerEventSlotToCalendar_(calendar, slot);
        sheet
          .getRange(slot.rowNumber, headerMap[headers.EVENT_ID])
          .setValue(eventId);
        sheet
          .getRange(slot.rowNumber, headerMap[headers.CALENDAR_STATUS])
          .setValue(APP_CONFIG.CALENDAR_STATUS.REGISTERED);
        result.registeredCount += 1;
        appendLog_(
          APP_CONFIG.LOG_LEVEL.INFO,
          APP_CONFIG.PROCESS.CALENDAR_REGISTER,
          '',
          APP_CONFIG.TEXT.CALENDAR_REGISTERED_PREFIX + slot.rowNumber,
          ''
        );
      } catch (error) {
        recordCalendarRowError_(
          sheet,
          headerMap,
          slot,
          error,
          APP_CONFIG.TEXT.CALENDAR_REGISTER_ERROR_PREFIX
        );
        result.errorCount += 1;
      }
    });
    appendLog_(
      result.errorCount
        ? APP_CONFIG.LOG_LEVEL.WARN
        : APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.CALENDAR_REGISTER,
      '',
      APP_CONFIG.TEXT.CALENDAR_REGISTER_COMPLETE,
      JSON.stringify(result)
    );
    return result;
  } finally {
    lock.releaseLock();
  }
}

function isCalendarRegistrationCandidate_(slot) {
  return Boolean(
    !String(slot.eventId || '').trim() &&
      slot.applicationDate &&
      String(slot.title || '').trim() &&
      slot.recruitmentStatus !== APP_CONFIG.RECRUITMENT_STATUS.CANCELED
  );
}

function isCalendarDeletionCandidate_(slot) {
  return Boolean(
    String(slot.eventId || '').trim() &&
      slot.recruitmentStatus === APP_CONFIG.RECRUITMENT_STATUS.CANCELED
  );
}

/**
 * タイトル、開始日時、終了日時だけでイベントを作成する。
 */
function registerEventSlotToCalendar_(calendar, slot) {
  var startAt = slot.applicationDate;
  var title = String(slot.title || '').trim();
  if (
    !(startAt instanceof Date) ||
    isNaN(startAt.getTime()) ||
    !title
  ) {
    throw new Error(
      APP_CONFIG.TEXT.CALENDAR_EVENT_INVALID_PREFIX + slot.rowNumber
    );
  }
  var endAt = new Date(
    startAt.getTime() +
      APP_CONFIG.CALENDAR_EVENT_DURATION_HOURS * 60 * 60 * 1000
  );
  return calendar.createEvent(title, startAt, endAt).getId();
}

function deleteEventSlotFromCalendar_(calendar, slot) {
  var eventId = String(slot.eventId || '').trim();
  var event = calendar.getEventById(eventId);
  if (event) {
    event.deleteEvent();
  }
}

function recordCalendarRowError_(
  sheet,
  headerMap,
  slot,
  error,
  messagePrefix
) {
  sheet
    .getRange(
      slot.rowNumber,
      headerMap[APP_CONFIG.EVENT_DATE_HEADERS.CALENDAR_STATUS]
    )
    .setValue(APP_CONFIG.CALENDAR_STATUS.ERROR);
  var normalized = normalizeError_(error);
  appendLog_(
    APP_CONFIG.LOG_LEVEL.ERROR,
    APP_CONFIG.PROCESS.CALENDAR_REGISTER,
    '',
    messagePrefix + slot.rowNumber,
    normalized.message + '\n' + normalized.detail
  );
}

function validateCalendarSettings_() {
  return getCalendarId_();
}

/**
 * カレンダーIDは返すだけとし、ログへ出力しない。
 */
function getCalendarId_() {
  var calendarId = PropertiesService.getScriptProperties().getProperty(
    APP_CONFIG.SCRIPT_PROPERTIES.CALENDAR_ID
  );
  if (!calendarId || !String(calendarId).trim()) {
    throw new Error(
      APP_CONFIG.TEXT.SCRIPT_PROPERTY_MISSING_PREFIX +
        APP_CONFIG.SCRIPT_PROPERTIES.CALENDAR_ID +
        APP_CONFIG.TEXT.SCRIPT_PROPERTY_MISSING_SUFFIX
    );
  }
  return String(calendarId).trim();
}
