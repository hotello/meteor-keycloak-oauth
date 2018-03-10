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
  var scope = "oidc";
  var loginStyle = OAuth._loginStyle('keycloak', config, options);

  var loginUrl =
        `${config.authServerUrl}/auth/realms/${config.realm}/protocol/openid-connect/auth?` +
        'client_id=' + config.clientId +
        '&redirect_uri=' + OAuth._redirectUri('keycloak', config) + '&scope=' + scope +
        '&state=' + OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl) +
        '&response_mode=' + encodeURIComponent('query') +
        '&response_type=' + encodeURIComponent('code');

  // Handle authentication type (e.g. for force login you need auth_type: "reauthenticate")
  if (options && options.auth_type) {
    loginUrl += "&auth_type=" + encodeURIComponent(options.auth_type);
  }

  OAuth.launchLogin({
    loginService: "keycloak",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken
  });
};
