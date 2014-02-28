(function() {
  var Dataset, DatasetQuery,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Dataset = (function() {
    function Dataset(data, settings) {
      this.data = data;
      this.settings = settings;
      if (this.data == null) {
        this.data = [];
      }
      this.length = this.data.length;
    }

    Dataset.prototype.toString = function() {
      return "Dataset (" + this.length + " elements)";
    };

    Dataset.prototype.get = function(n) {
      return this.data[n];
    };

    Dataset.prototype.clone = function(newSettings) {
      return new Dataset(this.data.slice(0), newSettings || this.settings);
    };

    Dataset.prototype.asArray = function() {
      return this.data;
    };

    Dataset.prototype.map = function(fun, newSettings) {
      return new Dataset(this.data.map(fun), newSettings || this.settings);
    };

    Dataset.prototype.filter = function(fun, newSettings) {
      return new Dataset(this.data.filter(fun), newSettings || this.settings);
    };

    Dataset.prototype.sort = function(arg) {
      var e;
      if (!arg) {
        return this;
      }
      if (arg.constructor === Function) {
        return new Dataset(this.data.slice(0).sort(arg));
      }
      if (arg.constructor === Array) {
        try {
          return new Dataset(sortjs.sort(this.data, arg));
        } catch (_error) {
          e = _error;
          throw new Exception("SortJS is needed to sort data using an array of properties. Either use a function or download SortJS from https://github.com/vne/sortjs");
        }
      }
    };

    Dataset.prototype._cloneObject = function(obj) {
      return JSON.parse(JSON.stringify(obj));
    };

    Dataset.prototype.getPropertyValue = function(prop, obj) {
      var i, name, names, o, prevname, prevo, _i, _ref;
      names = prop.split('.');
      o = obj;
      if (names.length > 1) {
        for (i = _i = 0, _ref = names.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          name = names[i];
          if (i > 0) {
            prevname = names[i - 1];
          }
          if (o.constructor === Object) {
            if (!o.hasOwnProperty(name)) {
              return {
                match: "partial",
                depth: i + 1,
                name: prop.split(".").slice(0, i + 1).join("."),
                value: o,
                previousName: prevname,
                previous: prevo
              };
            }
            prevo = o;
            o = o[name];
          } else if (o.constructor === Array) {
            return {
              match: "array",
              depth: i + 1,
              name: prop.split(".").slice(0, i).join("."),
              part: name,
              key: prop.split(".").slice(i).join("."),
              value: o,
              previousName: prevname,
              previous: prevo
            };
          }
        }
      } else {
        prevo = o;
        o = o[prop];
      }
      return {
        match: "full",
        depth: i,
        name: prop.split(".").slice(0, i + 1).join("."),
        value: o,
        previousName: prevname,
        previous: prevo
      };
    };

    Dataset.prototype.query = function(query) {
      var i, ndata, obj, _i, _ref;
      ndata = [];
      for (i = _i = 0, _ref = this.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        obj = this.objectMatches(this.data[i], query);
        if (obj) {
          ndata.push(obj);
        }
      }
      return new Dataset(ndata);
    };

    Dataset.prototype.objectMatches = function(obj, query) {
      var ds, match, nobj, npv, nquery, prop, pv, subq, value, _i, _len;
      match = true;
      nobj = obj;
      for (prop in query) {
        if (!__hasProp.call(query, prop)) continue;
        value = query[prop];
        switch (prop) {
          case '$and':
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              subq = value[_i];
              match = match && (this.objectMatches(obj, subq) != null);
              if (!match) {
                break;
              }
            }
            break;
          case '$or':
            match = value.map((function(_this) {
              return function(subq) {
                return _this.objectMatches(obj, subq);
              };
            })(this)).reduce(function(acc, v) {
              return acc || v;
            });
            break;
          default:
            pv = this.getPropertyValue(prop, obj);
            if (pv.match === "full") {
              match = match && this.check(value, pv.value);
            } else if (pv.match === "array") {
              nquery = {};
              nquery[pv.key] = value;
              ds = new Dataset(pv.value, this.settings).query(nquery);
              if (ds.length > 0) {
                if (this.settings && this.settings.filter_subarrays) {
                  nobj = this._cloneObject(obj);
                  npv = this.getPropertyValue(prop, nobj);
                  npv.previous[npv.previousName] = ds.asArray();
                }
              } else {
                match = false;
              }
            }
        }
        if (!match) {
          break;
        }
      }
      if (!match) {
        return;
      }
      return nobj;
    };

    Dataset.prototype.check = function(condlist, dval) {
      var cond, match, type;
      if (typeof condlist !== "object") {
        return condlist === dval;
      }
      match = true;
      for (type in condlist) {
        cond = condlist[type];
        switch (type) {
          case '$eq':
            if (cond !== dval) {
              match = false;
            }
            break;
          case '$neq':
          case '$ne':
            if (cond === dval) {
              match = false;
            }
            break;
          case '$gt':
            if (!(dval > cond)) {
              match = false;
            }
            break;
          case '$gte':
            if (!(dval >= cond)) {
              match = false;
            }
            break;
          case '$lt':
            if (!(dval < cond)) {
              match = false;
            }
            break;
          case '$lte':
            if (!(dval <= cond)) {
              match = false;
            }
            break;
          case '$in':
            if (__indexOf.call(cond, dval) < 0) {
              match = false;
            }
            break;
          case '$nin':
            if (__indexOf.call(cond, dval) >= 0) {
              match = false;
            }
            break;
          case '$between':
            if (!(cond.length && cond.length === 2 && (cond[0] <= dval && dval <= cond[1]))) {
              match = false;
            }
            break;
          case '$nbetween':
            if (!(!cond.length || (cond.length !== 2) || (dval < cond[0]) || (dval > cond[1]))) {
              match = false;
            }
            break;
          case '$contains':
            if (!(dval.indexOf && (dval.indexOf(cond) >= 0))) {
              match = false;
            }
            break;
          case '$ncontains':
            if (!(!dval.indexOf || dval.indexOf(cond) < 0)) {
              match = false;
            }
            break;
          case '$icontains':
            if (!(dval.toLowerCase && cond.toLowerCase && dval.toLowerCase().indexOf(cond.toLowerCase()) >= 0)) {
              match = false;
            }
            break;
          case '$nicontains':
          case '$incontains':
            if (!(!dval.toLowerCase || !cond.toLowerCase || dval.toLowerCase().indexOf(cond.toLowerCase()) < 0)) {
              match = false;
            }
        }
        if (!match) {
          break;
        }
      }
      return match;
    };

    return Dataset;

  })();

  DatasetQuery = (function() {
    function DatasetQuery(dataset) {
      this.dataset = dataset;
      this.query = {};
    }

    DatasetQuery.prototype.query = function(query) {
      var ds;
      return ds = this;
    };

    return DatasetQuery;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Dataset = Dataset;

}).call(this);

//# sourceMappingURL=dataset.js.map
