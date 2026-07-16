const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

/**
 * expo-widgets 57 currently adds aps-environment even when
 * enablePushNotifications is false. The calendar widget is refreshed by the
 * app and does not use remote widget pushes, so remove that capability again.
 */
module.exports = function withExpoWidgetsWithoutPush(config) {
  const withoutPushEntitlement = withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

  return withInfoPlist(withoutPushEntitlement, (mod) => {
    mod.modResults.ExpoWidgets_EnablePushNotifications = false;
    return mod;
  });
};
