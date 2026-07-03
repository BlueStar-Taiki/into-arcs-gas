/**
 * Discord通知は開催枠単位へ移行する。
 * 現段階では送信処理を実装せず、Webhook取得だけを共通化しておく。
 */
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
