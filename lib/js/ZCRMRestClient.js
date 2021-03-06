var OAuth = require('./OAuth');

var client_id = null;
var client_secret = null;
var redirect_url = null;
var user_identifier = null;
var mysql_module = './mysql/redis_util';
var iamurl = 'accounts.zoho.com';
var baseURL = 'www.zohoapis.com';
var version = 'v2';
var redis_host = '127.0.0.1';
var redis_port = '6379';

var ZCRMRestClient = function() {};

ZCRMRestClient.initialize = function(configJSON) {
  return new Promise(function(resolve, reject) {
    var client_id = configJSON.crm.clientid;
    var client_secret = configJSON.crm.clientsecret;
    var redirect_url = configJSON.crm.redirecturl;

    var iam_url = configJSON.crm.iamurl ? configJSON.crm.iamurl : iamurl;

    mysql_module = configJSON.api.tokenmanagement
      ? configJSON.api.tokenmanagement
      : mysql_module;

    baseURL = configJSON.api.url ? configJSON.api.url : baseURL;

    redis_host = configJSON.redis.host ? configJSON.redis.host : redis_host;
    redis_port = configJSON.redis.port ? configJSON.redis.port : redis_port;

    if (configJSON.api.user_identifier) {
      ZCRMRestClient.setUserIdentifier(configJSON.api.user_identifier);
    }

    if (!client_id || !client_secret || !redirect_url) {
      throw new Error('Populate the oauth_configuration.properties file');
    }

    ZCRMRestClient.setClientId(client_id);
    ZCRMRestClient.setClientSecret(client_secret);
    ZCRMRestClient.setRedirectURL(redirect_url);
    ZCRMRestClient.setIAMUrl(iam_url);

    resolve();
  });
};

ZCRMRestClient.isAccessTokenStored = function() {
  var mysql_util = require(mysql_module);
  return mysql_util.checkTokenExistence();
};

ZCRMRestClient.initializeWithValues = function(configJSON) {
  var client_id = configJSON.client_id;
  var client_secret = configJSON.client_secret;
  var redirect_url = configJSON.redirect_url;
  var iam_url = configJSON.iamurl ? configJSON.iamurl : iamurl;
  mysql_module = configJSON.mysql_module
    ? configJSON.mysql_module
    : mysql_module;

  baseURL = configJSON.baseurl ? configJSON.baseurl : baseURL;
  version = configJSON.version ? configJSON.version : version;

  ZCRMRestClient.setClientId(client_id);
  ZCRMRestClient.setClientSecret(client_secret);
  ZCRMRestClient.setRedirectURL(redirect_url);
};

ZCRMRestClient.generateAuthTokens = function(user_identifier, grant_token) {
  return new Promise(function(resolve, reject) {
    if (!user_identifier) {
      user_identifier = ZCRMRestClient.getUserIdentifier();
    }

    var config = ZCRMRestClient.getConfig(grant_token);
    new OAuth(config, 'generate_token');
    var api_url = OAuth.constructurl('generate_token');

    OAuth.generateTokens(api_url).then(function(response) {
      if (response.statusCode != 200) {
        throw new Error(
          'Problem occured while generating access token from grant token'
        );
      }

      var mysql_util = require(mysql_module);
      var resultObj = ZCRMRestClient.parseAndConstructObject(response);
      resultObj.user_identifier = user_identifier;

      if (resultObj.access_token) {
        mysql_util.saveOAuthTokens(resultObj).then(function(save_resp) {
          ZCRMRestClient.setUserIdentifier(user_identifier), resolve(resultObj);
        });
      } else {
        // throw new Error(
        //   'Problem occured while generating access token and refresh token from grant token'
        // );
        reject(
          'Problem occured while generating access token and refresh token from grant token'
        );
      }
    });
  });
};

ZCRMRestClient.generateAuthTokenfromRefreshToken = function(
  user_identifier,
  refresh_token
) {
  return new Promise(function(resolve, reject) {
    if (!user_identifier) {
      user_identifier = ZCRMRestClient.getUserIdentifier();
    }

    var config = ZCRMRestClient.getConfig_refresh(refresh_token);
    new OAuth(config, 'refresh_access_token');
    var api_url = OAuth.constructurl('generate_token');

    OAuth.generateTokens(api_url).then(function(response) {
      if (response.statusCode != 200) {
        throw new Error(
          'Problem occured while generating access token from refresh token'
        );
      }
      var mysql_util = require(mysql_module);
      var resultObj = ZCRMRestClient.parseAndConstructObject(response);
      resultObj.user_identifier = user_identifier;

      if (resultObj.access_token) {
        mysql_util.saveOAuthTokens(resultObj).then(function(save_response) {
          ZCRMRestClient.setUserIdentifier(user_identifier), resolve(resultObj);
        });
      } else {
        throw new Error(
          'Problem occured while generating access token from refresh token'
        );
      }
    });
  });
};

ZCRMRestClient.getConfig = function(grant_token) {
  var config = {};

  config.client_id = ZCRMRestClient.getClientId();
  config.client_secret = ZCRMRestClient.getClientSecret();
  config.code = grant_token;
  config.redirect_uri = ZCRMRestClient.getRedirectURL();
  config.grant_type = 'authorization_code';

  return config;
};

ZCRMRestClient.getConfig_refresh = function(refresh_token) {
  var config = {};

  config.client_id = ZCRMRestClient.getClientId();
  config.client_secret = ZCRMRestClient.getClientSecret();
  config.refresh_token = refresh_token;
  config.grant_type = 'refresh_token';

  return config;
};

ZCRMRestClient.setClientId = function(clientid) {
  client_id = clientid;
};

ZCRMRestClient.setClientSecret = function(clientsecret) {
  client_secret = clientsecret;
};

ZCRMRestClient.setRedirectURL = function(redirecturl) {
  redirect_url = redirecturl;
};

ZCRMRestClient.setUserIdentifier = function(useridentifier) {
  user_identifier = useridentifier;
};

ZCRMRestClient.setIAMUrl = function(iam_url) {
  iamurl = iam_url;
};

ZCRMRestClient.setBaseURL = function(baseurl) {
  baseURL = baseurl;
};

ZCRMRestClient.getClientId = function() {
  return client_id;
};

ZCRMRestClient.getClientSecret = function() {
  return client_secret;
};

ZCRMRestClient.getRedirectURL = function() {
  return redirect_url;
};

ZCRMRestClient.getUserIdentifier = function() {
  return user_identifier;
};

ZCRMRestClient.getMySQLModule = function() {
  return mysql_module;
};

ZCRMRestClient.getAPIURL = function() {
  return baseURL;
};

ZCRMRestClient.getVersion = function() {
  return version;
};
ZCRMRestClient.getIAMUrl = function() {
  return iamurl;
};
ZCRMRestClient.getRedisHost = function() {
  return redis_host;
};
ZCRMRestClient.getRedisPort = function() {
  return redis_port;
};
ZCRMRestClient.parseAndConstructObject = function(response) {
  var body = response['body'];
  body = JSON.parse(body);

  var date = new Date();
  var current_time = date.getTime();

  var resultObj = {};

  if (body.access_token) {
    resultObj.access_token = body.access_token;
    resultObj.refresh_token = body.refresh_token;
    resultObj.expires_in = body.expires_in + current_time;
  }
  return resultObj;
};

ZCRMRestClient.API = require('./crmapi');

module.exports = ZCRMRestClient;
