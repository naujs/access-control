var AccessControl = require('../../')
  , Registry = require('@naujs/registry')
  , _ = require('lodash');

describe('AccessControl', () => {
  var accessControl;

  describe('.buildMixin', () => {
    var mixin;

    beforeEach(() => {
      mixin = AccessControl.buildMixin();
    });

    it('should return an object with getRole and role', () => {
      expect(_.isFunction(mixin.getRole)).toBe(true);
      expect(_.isFunction(mixin.role)).toBe(true);
    });

    it('should store the role', () => {
      mixin.role('test', () => {
        return 1;
      });

      expect(mixin.getRole('test')()).toEqual(1);
    });

    it('should get the role from global Registery if not found', () => {
      Registry.setRole('test', () => {
        return 2;
      });

      expect(mixin.getRole('test')()).toEqual(2);
    });

    it('should prioritize role defined locally', () => {
      Registry.setRole('test', () => {
        return 2;
      });

      mixin.role('test', () => {
        return 1;
      });

      expect(mixin.getRole('test')()).toEqual(1);
    });
  });

  describe('#authenticate', () => {
    var user = {
      id: 1
    };
    var authenticate;
    var args, ctx;

    beforeEach(() => {
      args = {test: 1};
      ctx = {};

      authenticate = jasmine.createSpy('authenticate');
      accessControl = new AccessControl(authenticate);
      authenticate.and.returnValue(user);

      return accessControl.authenticate(args, ctx);
    });

    it('should call the provided authenticate function with args and context', () => {
      expect(authenticate).toHaveBeenCalledWith(args, ctx);
    });

    it('should store the user in the context', () => {
      expect(ctx.user).toEqual(user);
    });
  });

  describe('#authorize', () => {
    var authorizable;
    var args = {
      test: 1
    };
    var ctx = {};
    var roles;

    beforeEach(() => {
      roles = {
        'authenticated': jasmine.createSpy('authenticated'),
        'admin': jasmine.createSpy('admin'),
        'moderator': jasmine.createSpy('moderator'),
        'guest': jasmine.createSpy('guest')
      };
      authorizable = {
        getRole: function(name) {
          return roles[name];
        }
      };

      accessControl = new AccessControl(function(args, ctx) {
        return {};
      });
    });

    var testCases = [
      {
        input: [['authenticated'], args, ctx],
        output: ['authenticated'],
        mock: function() {
          roles.authenticated.and.returnValue(true);
        }
      },
      {
        input: [['authenticated'], args, ctx],
        output: [],
        mock: function() {
          roles.authenticated.and.returnValue(false);
        }
      },
      {
        input: [['admin'], args, ctx],
        output: ['admin'],
        mock: function() {
          roles.authenticated.and.returnValue(true);
          roles.admin.and.returnValue(true);
        }
      },
      {
        input: [['authenticated', 'admin'], args, ctx],
        output: ['authenticated'],
        mock: function() {
          roles.authenticated.and.returnValue(true);
          roles.admin.and.returnValue(false);
        }
      },
      {
        input: [['moderator', 'admin'], args, ctx],
        output: ['moderator', 'admin'],
        mock: function() {
          roles.moderator.and.returnValue(true);
          roles.admin.and.returnValue(true);
        }
      }
    ];

    testCases.forEach((testCase) => {
      it(`should return ${JSON.stringify(testCase.output)}`, () => {
        testCase.mock();
        return accessControl.authorize.apply(accessControl, [authorizable].concat(testCase.input)).then((_roles) => {
          expect(_roles).toEqual(testCase.output);
          expect(ctx.roles).toEqual(testCase.output);
          testCase.input[0].forEach((role) => {
            expect(roles[role]).toHaveBeenCalledWith(args, ctx);
          });
        });
      });
    });
  });
});
