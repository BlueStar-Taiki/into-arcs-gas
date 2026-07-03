/**
 * 開催枠の通知条件を手動で確認し、未送信の通知だけを送る。
 */
function notifyEventMilestones() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return notifyEventMilestonesForAllSlots_();
  } finally {
    lock.releaseLock();
  }
}

function notifyEventMilestonesForAllSlots_() {
  var webhookUrl = getDiscordWebhookUrl_();
  var aggregation = recalculateEventDateAggregates_();
  var result = {
    checkedSlotCount: aggregation.slots.length,
    minimumNotificationCount: 0,
    waitlistNotificationCount: 0,
    errorCount: 0
  };
  aggregation.slots.forEach(function (slot) {
    var slotResult = notifyEventMilestoneForSlot_(slot, webhookUrl);
    result.minimumNotificationCount += slotResult.minimumNotificationCount;
    result.waitlistNotificationCount += slotResult.waitlistNotificationCount;
    result.errorCount += slotResult.errorCount;
  });
  appendLog_(
    result.errorCount
      ? APP_CONFIG.LOG_LEVEL.WARN
      : APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.DISCORD_MILESTONES,
    '',
    APP_CONFIG.TEXT.DISCORD_MILESTONE_COMPLETE,
    JSON.stringify(result)
  );
  return result;
}

function notifyEventMilestoneForSlot_(slot, webhookUrl) {
  var result = {
    minimumNotificationCount: 0,
    waitlistNotificationCount: 0,
    errorCount: 0
  };
  if (shouldNotifyMinimumParticipantsReached_(slot)) {
    try {
      sendDiscordMessage_(
        webhookUrl,
        buildMinimumParticipantsDiscordMessage_(slot)
      );
      updateEventDiscordNotificationStatus_(
        slot,
        APP_CONFIG.DISCORD_NOTIFICATION_TYPE.MINIMUM
      );
      result.minimumNotificationCount += 1;
    } catch (error) {
      handleEventDiscordNotificationError_(
        slot,
        error,
        APP_CONFIG.DISCORD_NOTIFICATION_TYPE.MINIMUM
      );
      result.errorCount += 1;
    }
  }
  if (shouldNotifyWaitlistStarted_(slot)) {
    try {
      sendDiscordMessage_(
        webhookUrl,
        buildWaitlistStartedDiscordMessage_(slot)
      );
      updateEventDiscordNotificationStatus_(
        slot,
        APP_CONFIG.DISCORD_NOTIFICATION_TYPE.WAITLIST
      );
      result.waitlistNotificationCount += 1;
    } catch (error) {
      handleEventDiscordNotificationError_(
        slot,
        error,
        APP_CONFIG.DISCORD_NOTIFICATION_TYPE.WAITLIST
      );
      result.errorCount += 1;
    }
  }
  return result;
}

function shouldNotifyMinimumParticipantsReached_(slot) {
  return Boolean(
    !isEventMilestoneNotificationExcluded_(slot) &&
      slot.participatingCount >= slot.minimumParticipants &&
      slot.minimumNotificationStatus !==
        APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
  );
}

function shouldNotifyWaitlistStarted_(slot) {
  return Boolean(
    !isEventMilestoneNotificationExcluded_(slot) &&
      slot.participatingCount >= slot.capacity &&
      isEventSlotAvailableForForm_(slot) &&
      slot.waitlistNotificationStatus !==
        APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
  );
}

function isEventMilestoneNotificationExcluded_(slot) {
  var status = slot.executionStatus;
  return (
    status === APP_CONFIG.EXECUTION_STATUS.RAIN_CANCELED ||
    status === APP_CONFIG.EXECUTION_STATUS.INSUFFICIENT_CANCELED ||
    status === APP_CONFIG.EXECUTION_STATUS.COMPLETED
  );
}

function updateEventDiscordNotificationStatus_(slot, notificationType) {
  if (notificationType === APP_CONFIG.DISCORD_NOTIFICATION_TYPE.MINIMUM) {
    setEventNotificationStatus_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.MINIMUM_NOTIFICATION,
      APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
    );
    slot.minimumNotificationStatus = APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED;
  } else {
    setEventNotificationStatus_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.WAITLIST_NOTIFICATION,
      APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
    );
    slot.waitlistNotificationStatus = APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED;
  }
  return refreshCombinedDiscordNotificationStatus_(slot);
}

function setEventNotificationStatus_(rowNumber, header, status) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  sheet.getRange(rowNumber, headerMap[header]).setValue(status);
}

function refreshCombinedDiscordNotificationStatus_(slot) {
  var minimumSent =
    slot.minimumNotificationStatus === APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED;
  var waitlistSent =
    slot.waitlistNotificationStatus === APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED;
  var hasError =
    slot.minimumNotificationStatus === APP_CONFIG.NOTIFICATION_STATUS.ERROR ||
    slot.waitlistNotificationStatus === APP_CONFIG.NOTIFICATION_STATUS.ERROR;
  var combinedStatus = APP_CONFIG.DISCORD_STATUS.UNNOTIFIED;
  if (minimumSent && waitlistSent) {
    combinedStatus = APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED;
  } else if (minimumSent) {
    combinedStatus = APP_CONFIG.DISCORD_STATUS.MINIMUM_NOTIFIED;
  } else if (waitlistSent) {
    combinedStatus = APP_CONFIG.DISCORD_STATUS.WAITLIST_NOTIFIED;
  } else if (hasError) {
    combinedStatus = APP_CONFIG.DISCORD_STATUS.ERROR;
  }
  setEventNotificationStatus_(
    slot.rowNumber,
    APP_CONFIG.EVENT_DATE_HEADERS.DISCORD_STATUS,
    combinedStatus
  );
  slot.discordStatus = combinedStatus;
  return combinedStatus;
}

function handleEventDiscordNotificationError_(
  slot,
  error,
  notificationType
) {
  if (notificationType === APP_CONFIG.DISCORD_NOTIFICATION_TYPE.MINIMUM) {
    setEventNotificationStatus_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.MINIMUM_NOTIFICATION,
      APP_CONFIG.NOTIFICATION_STATUS.ERROR
    );
    slot.minimumNotificationStatus = APP_CONFIG.NOTIFICATION_STATUS.ERROR;
  } else {
    setEventNotificationStatus_(
      slot.rowNumber,
      APP_CONFIG.EVENT_DATE_HEADERS.WAITLIST_NOTIFICATION,
      APP_CONFIG.NOTIFICATION_STATUS.ERROR
    );
    slot.waitlistNotificationStatus = APP_CONFIG.NOTIFICATION_STATUS.ERROR;
  }
  refreshCombinedDiscordNotificationStatus_(slot);
  var normalized = normalizeError_(error);
  appendLog_(
    APP_CONFIG.LOG_LEVEL.ERROR,
    APP_CONFIG.PROCESS.DISCORD_MILESTONES,
    '',
    APP_CONFIG.TEXT.DISCORD_MILESTONE_ERROR_PREFIX + slot.rowNumber,
    normalized.message + '\n' + normalized.detail
  );
}

function buildMinimumParticipantsDiscordMessage_(slot) {
  var labels = APP_CONFIG.DISCORD_EVENT;
  return [
    APP_CONFIG.TEXT.DISCORD_MINIMUM_TITLE,
    labels.LABEL_TITLE + ': ' + slot.title,
    labels.LABEL_APPLICATION_DATE + ': ' + formatDateTime_(slot.applicationDate),
    labels.LABEL_PARTICIPATING +
      ': ' +
      slot.participatingCount +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_MINIMUM_PARTICIPANTS +
      ': ' +
      slot.minimumParticipants +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_CAPACITY + ': ' + slot.capacity + labels.PEOPLE_SUFFIX,
    labels.LABEL_RECRUITMENT_STATUS + ': ' + slot.recruitmentStatus
  ].join('\n');
}

function buildWaitlistStartedDiscordMessage_(slot) {
  var labels = APP_CONFIG.DISCORD_EVENT;
  return [
    APP_CONFIG.TEXT.DISCORD_WAITLIST_TITLE,
    labels.LABEL_TITLE + ': ' + slot.title,
    labels.LABEL_APPLICATION_DATE + ': ' + formatDateTime_(slot.applicationDate),
    labels.LABEL_PARTICIPATING +
      ': ' +
      slot.participatingCount +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_WAITLISTED +
      ': ' +
      slot.waitlistedCount +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_CAPACITY + ': ' + slot.capacity + labels.PEOPLE_SUFFIX,
    labels.LABEL_RECRUITMENT_STATUS + ': ' + slot.recruitmentStatus
  ].join('\n');
}

function notifyUpcomingEventFiveDaysBefore() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return notifyUpcomingEventFiveDaysBeforeForAllSlots_();
  } finally {
    lock.releaseLock();
  }
}

function notifyUpcomingEventFiveDaysBeforeForAllSlots_(now) {
  var webhookUrl = getDiscordWebhookUrl_();
  var slots = recalculateEventDateAggregates_().slots;
  var currentDate = now || new Date();
  var result = {
    checkedSlotCount: slots.length,
    notificationCount: 0,
    errorCount: 0
  };
  slots.forEach(function (slot) {
    if (!shouldNotifyFiveDaysBefore_(slot, currentDate)) {
      return;
    }
    try {
      sendDiscordMessage_(
        webhookUrl,
        buildFiveDaysBeforeDiscordMessage_(slot)
      );
      setEventNotificationStatus_(
        slot.rowNumber,
        APP_CONFIG.EVENT_DATE_HEADERS.FIVE_DAYS_NOTIFICATION,
        APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
      );
      slot.fiveDaysNotificationStatus =
        APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED;
      result.notificationCount += 1;
    } catch (error) {
      setEventNotificationStatus_(
        slot.rowNumber,
        APP_CONFIG.EVENT_DATE_HEADERS.FIVE_DAYS_NOTIFICATION,
        APP_CONFIG.NOTIFICATION_STATUS.ERROR
      );
      slot.fiveDaysNotificationStatus = APP_CONFIG.NOTIFICATION_STATUS.ERROR;
      result.errorCount += 1;
      var normalized = normalizeError_(error);
      appendLog_(
        APP_CONFIG.LOG_LEVEL.ERROR,
        APP_CONFIG.PROCESS.DISCORD_FIVE_DAYS,
        '',
        APP_CONFIG.TEXT.DISCORD_FIVE_DAYS_ERROR_PREFIX + slot.rowNumber,
        normalized.message + '\n' + normalized.detail
      );
    }
  });
  appendLog_(
    result.errorCount
      ? APP_CONFIG.LOG_LEVEL.WARN
      : APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.DISCORD_FIVE_DAYS,
    '',
    APP_CONFIG.TEXT.DISCORD_FIVE_DAYS_COMPLETE,
    JSON.stringify(result)
  );
  return result;
}

function shouldNotifyFiveDaysBefore_(slot, now) {
  if (
    isEventMilestoneNotificationExcluded_(slot) ||
    slot.fiveDaysNotificationStatus ===
      APP_CONFIG.NOTIFICATION_STATUS.NOTIFIED
  ) {
    return false;
  }
  var notificationDate = new Date(
    slot.applicationDate.getTime() -
      APP_CONFIG.UPCOMING_NOTIFICATION_DAYS_BEFORE * 24 * 60 * 60 * 1000
  );
  return (
    Utilities.formatDate(
      notificationDate,
      APP_CONFIG.TIME_ZONE,
      APP_CONFIG.DAY_FORMAT
    ) ===
    Utilities.formatDate(now, APP_CONFIG.TIME_ZONE, APP_CONFIG.DAY_FORMAT)
  );
}

function buildFiveDaysBeforeDiscordMessage_(slot) {
  var labels = APP_CONFIG.DISCORD_EVENT;
  return [
    APP_CONFIG.TEXT.DISCORD_FIVE_DAYS_TITLE,
    labels.LABEL_TITLE + ': ' + slot.title,
    labels.LABEL_APPLICATION_DATE + ': ' + formatDateTime_(slot.applicationDate),
    labels.LABEL_RECRUITMENT_STATUS + ': ' + slot.recruitmentStatus,
    labels.LABEL_PARTICIPATING +
      ': ' +
      slot.participatingCount +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_WAITLISTED +
      ': ' +
      slot.waitlistedCount +
      labels.PEOPLE_SUFFIX,
    labels.LABEL_CAPACITY + ': ' + slot.capacity + labels.PEOPLE_SUFFIX,
    labels.LABEL_MINIMUM_PARTICIPANTS +
      ': ' +
      slot.minimumParticipants +
      labels.PEOPLE_SUFFIX
  ].join('\n');
}

function installFiveDaysBeforeNotificationTrigger_() {
  if (hasFiveDaysBeforeNotificationTrigger_()) {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.TRIGGER_INSTALL,
      '',
      APP_CONFIG.TEXT.FIVE_DAYS_TRIGGER_EXISTS,
      ''
    );
    return { created: false };
  }
  ScriptApp.newTrigger(APP_CONFIG.TRIGGERS.FIVE_DAYS_HANDLER)
    .timeBased()
    .everyDays(1)
    .atHour(APP_CONFIG.FIVE_DAYS_BEFORE_TRIGGER_HOUR)
    .create();
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.TRIGGER_INSTALL,
    '',
    APP_CONFIG.TEXT.FIVE_DAYS_TRIGGER_CREATED,
    ''
  );
  return { created: true };
}

function hasFiveDaysBeforeNotificationTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (trigger) {
    return (
      trigger.getHandlerFunction() === APP_CONFIG.TRIGGERS.FIVE_DAYS_HANDLER &&
      trigger.getEventType() === ScriptApp.EventType.CLOCK &&
      trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
    );
  });
}

function sendDiscordMessage_(webhookUrl, message) {
  var response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      content: message,
      allowed_mentions: { parse: [] }
    }),
    muteHttpExceptions: true
  });
  var responseCode = response.getResponseCode();
  if (responseCode < 200 || responseCode >= 300) {
    throw new Error(
      APP_CONFIG.TEXT.DISCORD_HTTP_ERROR_PREFIX +
        responseCode +
        ': ' +
        response.getContentText().slice(0, 500)
    );
  }
}

function getDiscordWebhookUrl_() {
  var webhookUrl = PropertiesService.getScriptProperties().getProperty(
    APP_CONFIG.SCRIPT_PROPERTIES.DISCORD_WEBHOOK_URL
  );
  if (!webhookUrl) {
    throw new Error(
      APP_CONFIG.TEXT.SCRIPT_PROPERTY_MISSING_PREFIX +
        APP_CONFIG.SCRIPT_PROPERTIES.DISCORD_WEBHOOK_URL +
        APP_CONFIG.TEXT.SCRIPT_PROPERTY_MISSING_SUFFIX
    );
  }
  return webhookUrl;
}
