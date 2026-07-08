/**
 * 開催日管理を読み、開催枠オブジェクトの配列を返す。
 */
function getEventSlots_() {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.EVENT_DATE_HEADER_ORDER,
    APP_CONFIG.SHEETS.EVENT_DATES
  );
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return [];
  }

  var values = sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getValues();
  var headers = APP_CONFIG.EVENT_DATE_HEADERS;
  var seenKeys = {};
  return values
    .map(function (row, index) {
      var eventDate = row[headerMap[headers.APPLICATION_DATE] - 1];
      var startTime = row[headerMap[headers.START_TIME] - 1];
      var applicationDate = combineDateAndTime_(eventDate, startTime);
      var title = String(row[headerMap[headers.TITLE] - 1] || '').trim();
      if (!eventDate && !startTime && !title) {
        return null;
      }
      var slot = {
        rowNumber: APP_CONFIG.DATA_START_ROW + index,
        applicationDate: applicationDate,
        eventDate: eventDate,
        startTime: startTime,
        title: title,
        capacity: toNonNegativeInteger_(
          row[headerMap[headers.CAPACITY] - 1]
        ),
        minimumParticipants: toNonNegativeInteger_(
          row[headerMap[headers.MINIMUM_PARTICIPANTS] - 1]
        ),
        waitlistCapacity: toNonNegativeInteger_(
          row[headerMap[headers.WAITLIST_CAPACITY] - 1]
        ),
        pricePerPerson: toNonNegativeNumber_(
          row[headerMap[headers.PRICE_PER_PERSON] - 1]
        ),
        receptionStartTime:
          row[headerMap[headers.RECEPTION_START_TIME] - 1],
        assignee: String(row[headerMap[headers.ASSIGNEE] - 1] || ''),
        participatingCount: toNonNegativeInteger_(
          row[headerMap[headers.PARTICIPATING] - 1]
        ) || 0,
        waitlistedCount: toNonNegativeInteger_(
          row[headerMap[headers.WAITLISTED] - 1]
        ) || 0,
        canceledCount: toNonNegativeInteger_(
          row[headerMap[headers.CANCELED] - 1]
        ) || 0,
        declinedCount: toNonNegativeInteger_(
          row[headerMap[headers.DECLINED] - 1]
        ) || 0,
        totalApplicationParticipants: toNonNegativeInteger_(
          row[headerMap[headers.TOTAL_APPLICATION_PARTICIPANTS] - 1]
        ) || 0,
        recruitmentStatus: String(
          row[headerMap[headers.RECRUITMENT_STATUS] - 1] || ''
        ),
        executionStatus: String(
          row[headerMap[headers.EXECUTION_STATUS] - 1] || ''
        ),
        previousExecutionStatus: String(
          row[headerMap[headers.PREVIOUS_EXECUTION_STATUS] - 1] || ''
        ),
        discordStatus: String(
          row[headerMap[headers.DISCORD_STATUS] - 1] ||
            APP_CONFIG.DISCORD_STATUS.UNNOTIFIED
        ),
        minimumNotificationStatus: String(
          row[headerMap[headers.MINIMUM_NOTIFICATION] - 1] ||
            APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED
        ),
        waitlistNotificationStatus: String(
          row[headerMap[headers.WAITLIST_NOTIFICATION] - 1] ||
            APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED
        ),
        fiveDaysNotificationStatus: String(
          row[headerMap[headers.FIVE_DAYS_NOTIFICATION] - 1] ||
            APP_CONFIG.NOTIFICATION_STATUS.UNNOTIFIED
        ),
        participantRosterUrl: String(
          row[headerMap[headers.PARTICIPANT_ROSTER_URL] - 1] || ''
        )
      };
      if (
        !(slot.applicationDate instanceof Date) ||
        isNaN(slot.applicationDate.getTime()) ||
        !slot.title ||
        slot.capacity === null ||
        slot.capacity < 1 ||
        slot.minimumParticipants === null ||
        slot.minimumParticipants < 1 ||
        slot.minimumParticipants > slot.capacity ||
        slot.waitlistCapacity === null ||
        slot.pricePerPerson === null ||
        !slot.receptionStartTime
      ) {
        throw new Error(
          APP_CONFIG.TEXT.EVENT_SLOT_INVALID +
            ' row=' +
            slot.rowNumber
        );
      }
      slot.key = createEventSlotKey_(slot.applicationDate, slot.title);
      if (seenKeys[slot.key]) {
        throw new Error(
          APP_CONFIG.TEXT.EVENT_SLOT_DUPLICATE_PREFIX +
            getEventSlotBaseLabel_(slot)
        );
      }
      seenKeys[slot.key] = true;
      return slot;
    })
    .filter(function (slot) {
      return slot !== null;
    });
}

function toNonNegativeInteger_(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  var number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function toNonNegativeNumber_(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  var number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function toPositiveInteger_(value) {
  var number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(APP_CONFIG.TEXT.PARTICIPANTS_INVALID);
  }
  return number;
}

function createEventSlotKey_(applicationDate, title) {
  var source =
    Utilities.formatDate(
      applicationDate,
      APP_CONFIG.TIME_ZONE,
      "yyyy-MM-dd'T'HH:mm:ss"
    ) +
    '|' +
    String(title).trim();
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    source,
    Utilities.Charset.UTF_8
  );
  return digest
    .map(function (byte) {
      return ('0' + (byte & 255).toString(16)).slice(-2);
    })
    .join('')
    .slice(0, 24);
}

function getEventSlotBaseLabel_(slot) {
  return (
    formatDateOnly_(slot.applicationDate) +
    ' (' +
    formatJapaneseWeekday_(slot.applicationDate) +
    ') ' +
    formatTimeOnly_(slot.applicationDate) +
    ' ' +
    APP_CONFIG.FORM_CHOICE.TITLE_PREFIX +
    slot.title +
    APP_CONFIG.FORM_CHOICE.TITLE_SUFFIX
  );
}

function getLegacyEventSlotBaseLabel_(slot) {
  return (
    Utilities.formatDate(
      slot.applicationDate,
      APP_CONFIG.TIME_ZONE,
      APP_CONFIG.FORM_CHOICE.LEGACY_DATE_FORMAT
    ) +
    ' ' +
    slot.title
  );
}

function getEventSlotChoiceLabel_(
  slot,
  participatingCount,
  lowRemainingThreshold
) {
  var remaining = Math.max(slot.capacity - participatingCount, 0);
  if (remaining === 0) {
    return getEventSlotBaseLabel_(slot) + APP_CONFIG.FORM_CHOICE.WAITLIST_LABEL;
  }
  if (remaining <= lowRemainingThreshold) {
    return (
      getEventSlotBaseLabel_(slot) +
      APP_CONFIG.FORM_CHOICE.LOW_REMAINING_LABEL
    );
  }
  return (
    getEventSlotBaseLabel_(slot) +
    APP_CONFIG.FORM_CHOICE.REMAINING_PREFIX +
    remaining +
    APP_CONFIG.FORM_CHOICE.REMAINING_SUFFIX
  );
}

/**
 * 残席表示が古いブラウザからの回答でも、日時＋タイトルで開催枠を解決する。
 */
function resolveEventSlotFromChoice_(choiceValue) {
  var baseLabel = String(choiceValue || '')
    .trim()
    .replace(
      new RegExp(APP_CONFIG.FORM_CHOICE.REMAINING_SUFFIX_PATTERN),
      ''
    );
  var matches = getEventSlots_().filter(function (slot) {
    return (
      getEventSlotBaseLabel_(slot) === baseLabel ||
      getLegacyEventSlotBaseLabel_(slot) === baseLabel
    );
  });
  if (!matches.length) {
    throw new Error(APP_CONFIG.TEXT.EVENT_SLOT_NOT_FOUND_PREFIX + choiceValue);
  }
  if (matches.length > 1) {
    throw new Error(
      APP_CONFIG.TEXT.EVENT_SLOT_DUPLICATE_PREFIX + baseLabel
    );
  }
  return matches[0];
}

function getApplicationStatusCountsBySlot_() {
  var counts = {};
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.APPLICATIONS);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.APPLICATION_HEADER_ORDER,
    APP_CONFIG.SHEETS.APPLICATIONS
  );
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return counts;
  }
  var values = sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getValues();
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var statuses = APP_CONFIG.EVENT_APPLICATION_STATUS;
  values.forEach(function (row) {
    var key = String(row[headerMap[headers.EVENT_SLOT_KEY] - 1] || '').trim();
    if (!key) {
      return;
    }
    if (!counts[key]) {
      counts[key] = {
        participating: 0,
        waitlisted: 0,
        canceled: 0,
        declined: 0
      };
    }
    var participants = Number(row[headerMap[headers.PARTICIPANTS] - 1]);
    participants =
      Number.isFinite(participants) && participants > 0 ? participants : 0;
    var status = row[headerMap[headers.STATUS] - 1];
    if (status === statuses.PARTICIPATING) {
      counts[key].participating += participants;
    } else if (status === statuses.WAITLISTED) {
      counts[key].waitlisted += participants;
    } else if (status === statuses.CANCELED) {
      counts[key].canceled += participants;
    } else if (status === statuses.DECLINED) {
      counts[key].declined += participants;
    }
  });
  return counts;
}

function determineApplicationStatus_(
  slot,
  participantCount,
  counts,
  operationalSettings
) {
  var statuses = APP_CONFIG.EVENT_APPLICATION_STATUS;
  var settings = operationalSettings || getEventOperationalSettings_();
  var participationLimit =
    slot.capacity + settings.capacityOverbookAllowance;
  if (slot.recruitmentStatus !== APP_CONFIG.RECRUITMENT_STATUS.OPEN) {
    return statuses.DECLINED;
  }
  if (counts.participating + participantCount <= participationLimit) {
    return statuses.PARTICIPATING;
  }
  if (counts.waitlisted + participantCount <= slot.waitlistCapacity) {
    return statuses.WAITLISTED;
  }
  return statuses.DECLINED;
}

/**
 * 申込管理を正として、開催日管理の人数と募集状況を更新する。
 */
function recalculateEventDateAggregates() {
  var result = recalculateEventDateAggregates_();
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.EVENT_AGGREGATION,
    '',
    APP_CONFIG.TEXT.EVENT_AGGREGATION_COMPLETE,
    JSON.stringify(result)
  );
  return result;
}

function recalculateEventDateAggregates_() {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.EVENT_DATES);
  var headerMap = getHeaderMap_(sheet);
  var headers = APP_CONFIG.EVENT_DATE_HEADERS;
  var countsBySlot = getApplicationStatusCountsBySlot_();
  var slots = getEventSlots_();
  slots.forEach(function (slot) {
    var counts = countsBySlot[slot.key] || {
      participating: 0,
      waitlisted: 0,
      canceled: 0,
      declined: 0
    };
    var total =
      counts.participating +
      counts.waitlisted +
      counts.canceled +
      counts.declined;
    var recruitmentStatus = slot.recruitmentStatus;
    var capacityReached =
      counts.participating + counts.waitlisted >=
      slot.capacity + slot.waitlistCapacity;
    if (recruitmentStatus !== APP_CONFIG.RECRUITMENT_STATUS.CANCELED) {
      if (
        capacityReached ||
        slot.executionStatus ||
        slot.applicationDate.getTime() <= new Date().getTime()
      ) {
        recruitmentStatus = APP_CONFIG.RECRUITMENT_STATUS.CLOSED;
      } else if (!recruitmentStatus) {
        recruitmentStatus = APP_CONFIG.RECRUITMENT_STATUS.OPEN;
      }
    }

    var updates = {};
    updates[headers.PARTICIPATING] = counts.participating;
    updates[headers.WAITLISTED] = counts.waitlisted;
    updates[headers.CANCELED] = counts.canceled;
    updates[headers.DECLINED] = counts.declined;
    updates[headers.TOTAL_APPLICATION_PARTICIPANTS] = total;
    updates[headers.RECRUITMENT_STATUS] = recruitmentStatus;
    Object.keys(updates).forEach(function (header) {
      sheet.getRange(slot.rowNumber, headerMap[header]).setValue(updates[header]);
    });
    slot.participatingCount = counts.participating;
    slot.waitlistedCount = counts.waitlisted;
    slot.recruitmentStatus = recruitmentStatus;
  });
  return {
    updatedSlotCount: slots.length,
    slots: slots
  };
}

/**
 * 募集中の開催枠をGoogleフォームの申し込み日時プルダウンへ反映する。
 */
function updateApplicationFormChoices() {
  validateRequiredProperties();
  var operationalSettings = getEventOperationalSettings_();
  var aggregation = recalculateEventDateAggregates_();
  var choices = aggregation.slots
    .filter(function (slot) {
      return isEventSlotAvailableForForm_(slot);
    })
    .sort(function (left, right) {
      return left.applicationDate.getTime() - right.applicationDate.getTime();
    })
    .map(function (slot) {
      return getEventSlotChoiceLabel_(
        slot,
        slot.participatingCount,
        operationalSettings.lowRemainingThreshold
      );
    });
  if (!choices.length) {
    throw new Error(APP_CONFIG.TEXT.FORM_CHOICES_EMPTY);
  }

  var formId = PropertiesService.getScriptProperties().getProperty(
    APP_CONFIG.SCRIPT_PROPERTIES.APPLICATION_FORM_ID
  );
  var form = FormApp.openById(formId);
  var items = form
    .getItems(FormApp.ItemType.LIST)
    .filter(function (item) {
      return item.getTitle() === APP_CONFIG.FORM_ITEMS.APPLICATION_DATE;
    });
  if (!items.length) {
    throw new Error(
      APP_CONFIG.TEXT.FORM_ITEM_MISSING_PREFIX +
        APP_CONFIG.FORM_ITEMS.APPLICATION_DATE
    );
  }
  if (items.length > 1) {
    throw new Error(
      APP_CONFIG.TEXT.FORM_ITEM_DUPLICATE_PREFIX +
        APP_CONFIG.FORM_ITEMS.APPLICATION_DATE
    );
  }
  items[0].asListItem().setChoiceValues(choices);
  appendLog_(
    APP_CONFIG.LOG_LEVEL.INFO,
    APP_CONFIG.PROCESS.FORM_CHOICES,
    '',
    APP_CONFIG.TEXT.FORM_CHOICES_UPDATED,
    'choiceCount=' + choices.length
  );
  return choices;
}

function isEventSlotAvailableForForm_(slot) {
  var activeCount = slot.participatingCount + slot.waitlistedCount;
  var acceptanceLimit = slot.capacity + slot.waitlistCapacity;
  return (
    slot.recruitmentStatus === APP_CONFIG.RECRUITMENT_STATUS.OPEN &&
    activeCount < acceptanceLimit &&
    (slot.participatingCount < slot.capacity ||
      slot.waitlistedCount < slot.waitlistCapacity)
  );
}

function getEventOperationalSettings_() {
  var settings = getSettings_();
  return {
    capacityOverbookAllowance: getNonNegativeIntegerSetting_(
      settings,
      APP_CONFIG.SETTING_KEYS.CAPACITY_OVERBOOK_ALLOWANCE
    ),
    lowRemainingThreshold: getNonNegativeIntegerSetting_(
      settings,
      APP_CONFIG.SETTING_KEYS.LOW_REMAINING_THRESHOLD
    )
  };
}

function getNonNegativeIntegerSetting_(settings, key) {
  var rawValue = settings[key];
  if (
    rawValue === '' ||
    rawValue === null ||
    typeof rawValue === 'undefined'
  ) {
    throw new Error(
      APP_CONFIG.TEXT.SETTING_NON_NEGATIVE_INTEGER_PREFIX + key
    );
  }
  var value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      APP_CONFIG.TEXT.SETTING_NON_NEGATIVE_INTEGER_PREFIX + key
    );
  }
  return value;
}
