/**
 * スプレッドシート側の「フォーム送信時」インストール型トリガーから呼び出す。
 */
function onFormSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var applicationId = '';
  var rowNumber = null;
  try {
    if (!e || !e.namedValues) {
      throw new Error(APP_CONFIG.TEXT.NO_FORM_EVENT);
    }
    if (e.range.getSheet().getName() !== APP_CONFIG.SHEETS.RESPONSES) {
      throw new Error(APP_CONFIG.TEXT.UNEXPECTED_EVENT_SHEET);
    }

    var responseHeaders = APP_CONFIG.RESPONSE_HEADERS;
    var applicationHeaders = APP_CONFIG.APPLICATION_HEADERS;
    var responseSheet = e.range.getSheet();
    var responseHeaderMap = getHeaderMap_(responseSheet);
    assertHeaders_(
      responseHeaderMap,
      Object.keys(responseHeaders).map(function (key) {
        return responseHeaders[key];
      }),
      APP_CONFIG.SHEETS.RESPONSES
    );
    var receivedAt = responseSheet
      .getRange(e.range.getRow(), responseHeaderMap[responseHeaders.TIMESTAMP])
      .getValue();
    receivedAt = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);
    if (isNaN(receivedAt.getTime())) {
      receivedAt = new Date();
    }
    applicationId = createApplicationId_(receivedAt);

    var application = {};
    application[applicationHeaders.APPLICATION_ID] = applicationId;
    application[applicationHeaders.RECEIVED_AT] = receivedAt;
    application[applicationHeaders.NAME] = getNamedValue_(
      e.namedValues,
      responseHeaders.NAME
    );
    application[applicationHeaders.PARTICIPANTS] = getNamedValue_(
      e.namedValues,
      responseHeaders.PARTICIPANTS
    );
    application[applicationHeaders.EMERGENCY_PHONE] = getNamedValue_(
      e.namedValues,
      responseHeaders.EMERGENCY_PHONE
    );
    application[applicationHeaders.EMAIL] = getNamedValue_(
      e.namedValues,
      responseHeaders.EMAIL
    );
    var choiceValue = getNamedValue_(
      e.namedValues,
      responseHeaders.APPLICATION_DATE
    );
    var eventSlot = resolveEventSlotFromChoice_(choiceValue);
    updateResponseEventMetadata_(
      responseSheet,
      e.range.getRow(),
      responseHeaderMap,
      eventSlot
    );
    var participantCount = toPositiveInteger_(
      application[applicationHeaders.PARTICIPANTS]
    );
    var countsBySlot = getApplicationStatusCountsBySlot_();
    var currentCounts = countsBySlot[eventSlot.key] || {
      participating: 0,
      waitlisted: 0,
      canceled: 0,
      declined: 0
    };
    application[applicationHeaders.PARTICIPANTS] = participantCount;
    application[applicationHeaders.APPLICATION_DATE] =
      eventSlot.applicationDate;
    application[applicationHeaders.TITLE] = eventSlot.title;
    application[applicationHeaders.EVENT_SLOT_KEY] = eventSlot.key;
    application[applicationHeaders.STATUS] = determineApplicationStatus_(
      eventSlot,
      participantCount,
      currentCounts
    );
    application[applicationHeaders.MAIL_STATUS] =
      APP_CONFIG.MAIL_STATUS.UNSENT;
    application[applicationHeaders.PAYMENT_STATUS] =
      APP_CONFIG.PAYMENT_STATUS.UNPAID;
    application[applicationHeaders.INTERNAL_NOTE] = '';
    application[applicationHeaders.UPDATED_AT] = new Date();

    rowNumber = appendApplication_(application);
    processMailForSubmission_(application, rowNumber);
    processEventMaintenanceForSubmission_(
      application[applicationHeaders.APPLICATION_ID]
    );
    processEventDiscordMilestonesForSubmission_(
      application[applicationHeaders.APPLICATION_ID]
    );
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.FORM_SUBMIT,
      applicationId,
      APP_CONFIG.TEXT.FORM_PROCESS_COMPLETE,
      ''
    );
  } catch (error) {
    var normalized = normalizeError_(error);
    try {
      appendLog_(
        APP_CONFIG.LOG_LEVEL.ERROR,
        APP_CONFIG.PROCESS.FORM_SUBMIT,
        applicationId,
        normalized.message,
        normalized.detail
      );
    } catch (logError) {
      console.error(logError);
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function updateResponseEventMetadata_(
  responseSheet,
  rowNumber,
  headerMap,
  eventSlot
) {
  responseSheet
    .getRange(rowNumber, headerMap[APP_CONFIG.RESPONSE_HEADERS.TITLE])
    .setValue(sanitizeForSheet_(eventSlot.title));
  responseSheet
    .getRange(
      rowNumber,
      headerMap[APP_CONFIG.RESPONSE_HEADERS.EVENT_SLOT_KEY]
    )
    .setValue(eventSlot.key);
}

function processEventMaintenanceForSubmission_(applicationId) {
  try {
    updateApplicationFormChoices();
  } catch (error) {
    var normalized = normalizeError_(error);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.ERROR,
      APP_CONFIG.PROCESS.FORM_CHOICES,
      applicationId,
      normalized.message,
      normalized.detail
    );
  }
}

function processEventDiscordMilestonesForSubmission_(applicationId) {
  try {
    notifyEventMilestonesForAllSlots_();
  } catch (error) {
    var normalized = normalizeError_(error);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.ERROR,
      APP_CONFIG.PROCESS.DISCORD_MILESTONES,
      applicationId,
      normalized.message,
      normalized.detail
    );
  }
}

function processMailForSubmission_(application, rowNumber) {
  try {
    sendConfirmationMail_(application);
    var success = {};
    success[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS] =
      APP_CONFIG.MAIL_STATUS.SENT;
    updateApplicationFields_(rowNumber, success);
  } catch (error) {
    var failure = {};
    failure[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS] =
      APP_CONFIG.MAIL_STATUS.ERROR;
    updateApplicationFields_(rowNumber, failure);
    var normalized = normalizeError_(error);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.ERROR,
      APP_CONFIG.PROCESS.SEND_MAIL,
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID],
      normalized.message,
      normalized.detail
    );
  }
}
