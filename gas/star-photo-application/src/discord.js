function notifyDiscord_(application) {
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

  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var settings = getSettings_();
  var mention = settings[APP_CONFIG.SETTING_KEYS.DISCORD_MENTION] || '';
  var payload = {
    content: mention,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: APP_CONFIG.DISCORD.TITLE,
        color: APP_CONFIG.DISCORD.COLOR,
        fields: [
          {
            name: APP_CONFIG.DISCORD.LABEL_APPLICATION_ID,
            value: String(application[headers.APPLICATION_ID]),
            inline: false
          },
          {
            name: APP_CONFIG.DISCORD.LABEL_RECEIVED_AT,
            value: formatDateTime_(application[headers.RECEIVED_AT]),
            inline: true
          },
          {
            name: APP_CONFIG.DISCORD.LABEL_NAME,
            value: String(application[headers.NAME]),
            inline: true
          },
          {
            name: APP_CONFIG.DISCORD.LABEL_PARTICIPANTS,
            value:
              String(application[headers.PARTICIPANTS]) +
              APP_CONFIG.DISCORD.PARTICIPANTS_SUFFIX,
            inline: true
          }
        ],
        footer: { text: APP_CONFIG.DISCORD.FOOTER },
        timestamp: new Date().toISOString()
      }
    ]
  };

  var response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
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

function notifyDiscordForActiveRow() {
  try {
    var rowNumber = getActiveApplicationRow_();
    var application = getApplicationByRow_(rowNumber);
    notifyDiscord_(application);
    updateApplicationFields_(rowNumber, (function () {
      var updates = {};
      updates[APP_CONFIG.APPLICATION_HEADERS.DISCORD_STATUS] =
        APP_CONFIG.DISCORD_STATUS.NOTIFIED;
      return updates;
    })());
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.RENOTIFY_DISCORD,
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID],
      APP_CONFIG.TEXT.DISCORD_RENOTIFY_LOG,
      ''
    );
    showUiAlert_(APP_CONFIG.UI_MESSAGES.DISCORD_RENOTIFIED);
  } catch (error) {
    handleManualActionError_(
      error,
      APP_CONFIG.PROCESS.RENOTIFY_DISCORD,
      APP_CONFIG.APPLICATION_HEADERS.DISCORD_STATUS,
      APP_CONFIG.DISCORD_STATUS.ERROR
    );
  }
}
