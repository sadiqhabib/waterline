var assert = require('assert');
var WLTransform = require('waterline-criteria');
var Waterline = require('../../../lib/waterline');

describe('Model', function() {
  describe('associations Many To Many', function() {
    describe('.remove()', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var collections = {};
      var prefValues = [];

      before(function(done) {
        var waterline = new Waterline();

        var User = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'person',
          attributes: {
            preferences: {
              collection: 'preference',
              via: 'people',
              dominant: true
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'preference',
          attributes: {
            foo: 'string',
            people: {
              collection: 'person',
              via: 'preferences'
            }
          }
        });

        waterline.loadCollection(User);
        waterline.loadCollection(Preference);

        var _data = {
          person_preferences__preference_people: [
            { id: 10, preference_people: 1, person_preferences: 1 },
            { id: 11, preference_people: 1, person_preferences: 2 },
            { id: 12, preference_people: 2, person_preferences: 4 },
            { id: 13, preference_people: 2, person_preferences: 3 }
          ],
          person: [
            { id: 1 },
            { id: 2 },
          ],
          preference: [
            { id: 1, foo: 'bar' },
            { id: 2, foo: 'foobar' },
            { id: 3, foo: 'a' },
            { id: 4, foo: 'b' }
          ]
        };

        var i = 1;

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            // if(col === 'person_preference') return cb(null, []);
            cb(null, WLTransform(_data[col], criteria).results);
          },
          destroy: function(con, col, criteria, cb) {
            if(col === 'person_preferences__preference_people') {
              prefValues.push(criteria.where);
            }
            return cb(null, criteria);
          },
          update: function(con, col, criteria, values, cb) {
            return cb(null, values);
          },
          create: function(con, col, values, cb) {
            prefValues.push(values);
            return cb(null, values);
          },
        };

        var connections = {
          'my_foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          collections = colls.collections;
          done();
        });
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass foreign key values to update method for each relationship', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);

          var person = models[0];

          person.preferences.remove(1);
          person.preferences.remove(2);

          person.save(function(err) {
            if(err) return done(err);

            assert(prefValues.length === 2);

            assert(prefValues[0].person_preferences === 1);
            assert(prefValues[0].preference_people === 1);
            assert(prefValues[1].person_preferences === 1);
            assert(prefValues[1].preference_people === 2);

            done();
          });
        });
      });

      it('should error with a failed transaction when an object is used', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);

          var person = models[0];

          person.preferences.remove({ foo: 'foo' });
          person.preferences.remove({ foo: 'bar' });

          person.save(function(err) {
            assert(err);
            assert(Array.isArray(err));
            assert(err.length === 2);
            assert(err[0].type === 'remove');
            assert(err[1].type === 'remove');

            done();
          });
        });
      });

    });
  });
});
