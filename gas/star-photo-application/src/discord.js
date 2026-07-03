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
      handleEventDiscordNotificationError_(slot, error);
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
      handleEventDiscordNotificationError_(slot, error);
      result.errorCount += 1;
    }
  }
  return result;
}

function shouldNotifyMinimumParticipantsReached_(slot) {
  return Boolean(
    !isEventMilestoneNotificationExcluded_(slot) &&
      slot.participatingCount >= slot.minimumParticipants &&
      !hasMinimumParticipantsNotificationBeenSent_(slot.discordStatus)
  );
}

function shouldNotifyWaitlistStarted_(slot) {
  return Boolean(
    !isEventMilestoneNotificationExcluded_(slot) &&
      slot.waitlistedCount >= 1 &&
      !hasWaitlistNotificationBeenSent_(slot.discordStatus)
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

function hasMinimumParticipantsNotificationBeenSent_(status) {
  return (
    status === APP_CONFIG.DISCORD_STATUS.MINIMUM_NOTIFIED ||
    status === APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
  );
}

function hasWaitlistNotificationBeenSent_(status) {
  return (
    status === APP_CONFIG.DISCORD_STATUS.WAITLIST_NOTIFIED ||
    status === APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
  );
}

function updateEventDiscordNotificationStatus_(slot, notificationType) {
  var currentStatus =
    slot.discordStatus || APP_CONFIG.DISCORD_STATUS.UNNOTIFIED;
  var nextStatus;
  if (notificationType === APP_CONFIG.DISCORD_NOTIFICATION_TYPE.MINIMUM) {
    nextStatus = hasWaitlistNotificationBeenSent_(currentStatus)
      ? APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
      : APP_CONFIG.DISCORD_STATUS.MINIMUM_NOTIFIED;
  } else {
    nextStatus = hasMinimumParticipantsNotificationBeenSent_(currentStatus)
      ? APP_CONFIG.DISCORD_STATUS.BOTH_NOTIFIED
      : APP_CONFIG.DISCORD_STATUS.WAITLIST_NOTIFIED;
  }
  setEventDiscordNotificationStatus_(slot.rowNumber, nextStatus);
  slot.discordStatus = nextStatus;
  return nextStatus;
}

function setEventDiscordNotificationStatus_(rowNumber, status) {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  sheet
    .getRange(
      rowNumber,
      headerMap[APP_CONFIG.EVENT_DATE_HEADERS.DISCORD_STATUS]
    )
    .setValue(status);
}

function handleEventDiscordNotificationError_(slot, error) {
  if (
    !hasMinimumParticipantsNotificationBeenSent_(slot.discordStatus) &&
    !hasWaitlistNotificationBeenSent_(slot.discordStatus)
  ) {
    setEventDiscordNotificationStatus_(
      slot.rowNumber,
      APP_CONFIG.DISCORD_STATUS.ERROR
    );
    slot.discordStatus = APP_CONFIG.DISCORD_STATUS.ERROR;
  }
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
