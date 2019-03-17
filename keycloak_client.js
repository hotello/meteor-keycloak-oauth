Keycloak = {};

// Request Keycloak credentials for the user
//
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Keycloak.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  var config = ServiceConfiguration.configurations.findOne({service: 'keycloak'});
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError());
    return;
  }

  var credentialToken = Random.secret();
  var loginStyle = OAuth._loginStyle('keycloak', config, options);
  var idpHint = options && options.idpHint ? '&kc_idp_hint=' + options.idpHint : '';

  var loginUrl =
    `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/auth` +
    '?client_id=' + encodeURIComponent(config.clientId) +
    '&state=' + OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl) +
    '&redirect_uri=' + OAuth._redirectUri('keycloak', config) +
    '&scope=' + encodeURIComponent(config.scope ? 'openid ' + config.scope : 'openid') +
    '&response_type=code' +  idpHint;

  OAuth.launchLogin({
    loginService: "keycloak",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken
  });
};
