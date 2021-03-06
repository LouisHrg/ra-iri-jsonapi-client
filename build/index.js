"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _qs = require("qs");

var _deepmerge = require("deepmerge");

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _actions = require("./actions");

var _defaultSettings = require("./default-settings");

var _defaultSettings2 = _interopRequireDefault(_defaultSettings);

var _errors = require("./errors");

var _resourceLookup = require("./resourceLookup");

var _resourceLookup2 = _interopRequireDefault(_resourceLookup);

var _initializer = require("./initializer");

var _initializer2 = _interopRequireDefault(_initializer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Set HTTP interceptors.
(0, _initializer2.default)();

/**
 * Maps react-admin queries to a JSONAPI REST API
 *
 * @param {string} apiUrl the base URL for the JSONAPI
 * @param {string} userSettings Settings to configure this client.
 *
 * @param {string} type Request type, e.g GET_LIST
 * @param {string} resource Resource name, e.g. "posts"
 * @param {Object} payload Request parameters. Depends on the request type
 * @returns {Promise} the Promise for a data response
 */

exports.default = function (apiUrl) {
  var userSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function (type, resource, params) {
    var url = "";
    var settings = (0, _deepmerge2.default)(_defaultSettings2.default, userSettings);

    var options = {
      headers: settings.headers
    };

    switch (type) {
      case _actions.GET_LIST:
        {
          var _params$pagination = params.pagination,
              page = _params$pagination.page,
              perPage = _params$pagination.perPage;

          // Create query with pagination params.

          var query = {
            "page": page,
            "itemsPerPage": perPage

            // Add all filter params to query.
          };Object.keys(params.filter || {}).forEach(function (key) {
            query["" + key] = params.filter[key];
          });

          // Add sort parameter
          if (params.sort && params.sort.field) {
            var prefix = params.sort.order === "ASC" ? "ASC" : "DESC";
            query["order[" + params.sort.field + "]"] = prefix;
          }

          url = apiUrl + "/" + resource + "?" + (0, _qs.stringify)(query);
          break;
        }

      case _actions.GET_ONE:
        url = apiUrl + "/" + resource + "/" + params.id;
        break;

      case _actions.CREATE:
        url = apiUrl + "/" + resource;
        options.method = "POST";
        options.data = JSON.stringify({
          data: { type: resource, attributes: params.data }
        });
        break;

      case _actions.UPDATE:
        {
          url = apiUrl + "/" + resource + "/" + params.id;

          var data = {
            data: {
              id: params.id,
              type: resource,
              attributes: params.data
            }
          };

          options.method = settings.updateMethod;
          options.data = JSON.stringify(data);
          break;
        }

      case _actions.DELETE:
        url = apiUrl + "/" + resource + "/" + params.id;
        options.method = "DELETE";
        break;

      case _actions.DELETE_MANY:
        {
          console.log(params.ids);
          break;
        }

      case _actions.GET_MANY:
        {
          //const query = {
          //  filter: JSON.stringify({id: params.ids})
          //}
          //url = `${apiUrl}/${resource}?${stringify(query)}`
          var test = params.ids.map(function (el) {
            return "id[]=" + el;
          });

          var joined = test.join('&');

          url = apiUrl + "/" + resource + "?" + joined;

          break;
        }

      case _actions.GET_MANY_REFERENCE:
        {
          var _params$pagination2 = params.pagination,
              _page = _params$pagination2.page,
              _perPage = _params$pagination2.perPage;

          // Create query with pagination params.

          var _query = {
            "page": _page,
            "itemsPerPage": _perPage

            // Add all filter params to query.
          };Object.keys(params.filter || {}).forEach(function (key) {
            _query[key + "[]"] = params.filter[key];
          });

          // Add the reference id to the filter params.
          _query["filter[" + params.target + "]"] = params.id;

          url = apiUrl + "/" + resource + "?" + (0, _qs.stringify)(_query);

          if (resource === 'booking-items') {
            url = url + "&include=product";
          }

          break;
        }

      default:
        throw new _errors.NotImplementedError("Unsupported Data Provider request type " + type);
    }

    return (0, _axios2.default)(_extends({ url: url }, options)).then(function (response) {
      var lookup = new _resourceLookup2.default(response.data);

      switch (type) {
        case _actions.GET_MANY:
        case _actions.GET_MANY_REFERENCE:
        case _actions.GET_LIST:
          return {
            data: response.data.data.map(function (resource) {
              return lookup.unwrapData(resource);
            }),
            total: response.data.meta.totalItems
          };

        case _actions.GET_ONE:
        case _actions.CREATE:
        case _actions.UPDATE:
          return {
            data: lookup.unwrapData(response.data.data)
          };
        case _actions.DELETE_MANY:
          return {
            data: [].concat(_toConsumableArray(params.ids))
          };
        case _actions.DELETE:
          {
            return {
              data: { id: params.id }
            };
          }

        default:
          throw new _errors.NotImplementedError("Unsupported Data Provider request type " + type);
      }
    });
  };
};