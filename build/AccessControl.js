'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash'),
    Registry = require('@naujs/registry'),
    util = require('@naujs/util'),
    Promise = util.getPromise();

var AccessControl = (function () {
  function AccessControl(authenticate) {
    _classCallCheck(this, AccessControl);

    if (!_.isFunction(authenticate)) throw new Error('Must provide an authentication function');
    this._authenticate = authenticate;
  }

  _createClass(AccessControl, [{
    key: 'authenticate',
    value: function authenticate(args, ctx) {
      ctx = ctx || {};
      return util.tryPromise(this._authenticate.call(null, args, ctx)).then(function (user) {
        ctx.user = user;
        return user;
      });
    }
  }, {
    key: 'authorize',
    value: function authorize(authorizable, access, args, ctx) {
      ctx = ctx || {};
      access = _.clone(access || {});
      if (_.isEmpty(access)) return Promise.resolve([]);

      if (!_.isFunction(authorizable.getRole)) return Promise.reject(new Error('Must have getRole method'));

      return Promise.all(_.map(access, function (role) {
        var checkRole = authorizable.getRole(role);
        if (!checkRole) return Promise.reject(new Error('Role ' + role + ' not found'));
        return util.tryPromise(checkRole(args, ctx)).then(function (result) {
          return result ? role : null;
        });
      })).then(function (roles) {
        ctx.roles = _.chain(roles).compact().uniq().value();
        return ctx.roles;
      });
    }
  }]);

  return AccessControl;
})();

function getRoleByName(name) {
  this._roles = this._roles || {};
  var role = this._roles[name];
  if (!role) role = Registry.getRole(name);
  return role || null;
}

AccessControl.buildMixin = function () {
  return {
    getRole: function getRole(name) {
      return getRoleByName.call(this, name);
    },

    role: function role(name, fn) {
      this._roles = this._roles || [];
      this._roles[name] = fn;
      return this;
    }
  };
};

module.exports = AccessControl;