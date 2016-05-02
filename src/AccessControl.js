var _ = require('lodash')
  , Registry = require('@naujs/registry')
  , util = require('@naujs/util')
  , Promise = util.getPromise();

class AccessControl {
  constructor(authenticate) {
    if (!_.isFunction(authenticate)) throw new Error('Must provide an authentication function');
    this._authenticate = authenticate;
  }

  authenticate(args, ctx) {
    ctx = ctx || {};
    return util.tryPromise(this._authenticate.call(null, args, ctx)).then((user) => {
      ctx.user = user;
      return user;
    });
  }

  authorize(authorizable, access, args, ctx) {
    ctx = ctx || {};
    access = _.clone(access || {});
    if (_.isEmpty(access)) return Promise.resolve([]);

    if (!_.isFunction(authorizable.getRole)) return Promise.reject(new Error('Must have getRole method'));

    return Promise.all(_.map(access, (role) => {
      var checkRole = authorizable.getRole(role);
      if (!checkRole) return Promise.reject(new Error(`Role ${role} not found`));
      return util.tryPromise(checkRole(args, ctx)).then((result) => {
        return result ? role : null;
      });
    })).then((roles) => {
      ctx.roles = _.chain(roles).compact().uniq().value();
      return ctx.roles;
    });
  }
}

function getRoleByName(name) {
  this._roles = this._roles || {};
  var role = this._roles[name];
  if (!role) role = Registry.getRole(name);
  return role || null;
}

AccessControl.buildMixin = function() {
  return {
    getRole: function(name) {
      return getRoleByName.call(this, name);
    },

    role: function(name, fn) {
      this._roles = this._roles || [];
      this._roles[name] = fn;
      return this;
    }
  };
};

module.exports = AccessControl;
