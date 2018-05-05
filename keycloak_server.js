Keycloak = {};

Keycloak.handleAuthFromAccessToken = function handleAuthFromAccessToken(accessToken, expiresAt) {
  var whitelisted = ['email', 'name', 'given_name', 'family_name',
    'picture', 'preferred_username', 'roles'];

  var identity = getIdentity(accessToken);

  var serviceData = {
    accessToken: accessToken,
    expiresAt: expiresAt,
    id: identity.sub
  };

  var fields = _.pick(identity, whitelisted);
  _.extend(serviceData, fields);

  return {
    serviceData: serviceData,
    options: {profile: {name: identity.name}}
  };
};

OAuth.registerService('keycloak', 2, null, function(query) {
  var response = getTokenResponse(query);
  var accessToken = response.accessToken;
  var expiresIn = response.expiresIn;

  return Keycloak.handleAuthFromAccessToken(accessToken, (+new Date) + (1000 * expiresIn));
});

// checks whether a string parses as JSON
var isJSON = function (str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds
var getTokenResponse = function (query) {
  var config = ServiceConfiguration.configurations.findOne({service: 'keycloak'});
  if (!config)
    throw new ServiceConfiguration.ConfigError();

  var responseContent;
  try {
    // Request an access token
    responseContent = HTTP.post(
      `${config.authServerUrl}/auth/realms/${config.realm}/protocol/openid-connect/token`, {
        params: {
          grant_type: "authorization_code",
          client_id: config.clientId,
          redirect_uri: OAuth._redirectUri('keycloak', config),
          client_secret: OAuth.openSecret(config.secret),
          code: query.code
        }
      }).data;
  } catch (err) {
    throw _.extend(new Error("Failed to complete OAuth handshake with Keycloak. " + err.message),
                   {response: err.response});
  }

  var kcAccessToken = responseContent.access_token;
  var kcExpires = responseContent.expires_in;

  if (!kcAccessToken) {
    throw new Error("Failed to complete OAuth handshake with keycloak " +
                    "-- can't find access token in HTTP response. " + responseContent);
  }
  return {
    accessToken: kcAccessToken,
    expiresIn: kcExpires
  };
};

var getIdentity = function (accessToken) {
  var config = ServiceConfiguration.configurations.findOne({service: 'keycloak'});
  if (!config)
    throw new ServiceConfiguration.ConfigError();

  try {
    return HTTP.get(
      `${config.authServerUrl}/auth/realms/${config.realm}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: "Bearer " + accessToken }
    }).data;
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Keycloak. " + err.message),
                   {response: err.response});
  }
};

Keycloak.retrieveCredential = function(credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
