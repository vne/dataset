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

    Dataset.prototype.valueOf = function() {
      return this.data;
    };

    Dataset.prototype.toArray = function() {
      return this.data;
    };

    Dataset.prototype.get = function(n) {
      return this.data[n];
    };

    Dataset.prototype.option = function(name, val) {
      if (val == null) {
        if (typeof name === "object") {
          this.settings = name;
        } else {
          if (!this.settings) {
            return;
          }
          return this.settings[name];
        }
      }
      if (!this.settings) {
        this.settings = {};
      }
      return this.settings[name] = val;
    };

    Dataset.prototype.clone = function(newSettings) {
      return new Dataset(this.data.slice(0), newSettings || this.settings);
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
                  npv.previous[npv.previousName] = ds.toArray();
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

    Dataset.prototype.eq = function(prop, val) {
      return new DatasetQuery(this).eq(prop, val);
    };

    Dataset.prototype.ne = function(prop, val) {
      return new DatasetQuery(this).ne(prop, val);
    };

    Dataset.prototype.neq = function(prop, val) {
      return new DatasetQuery(this).neq(prop, val);
    };

    Dataset.prototype.gt = function(prop, val) {
      return new DatasetQuery(this).gt(prop, val);
    };

    Dataset.prototype.gte = function(prop, val) {
      return new DatasetQuery(this).gte(prop, val);
    };

    Dataset.prototype.lt = function(prop, val) {
      return new DatasetQuery(this).lt(prop, val);
    };

    Dataset.prototype.lte = function(prop, val) {
      return new DatasetQuery(this).lte(prop, val);
    };

    Dataset.prototype["in"] = function(prop, val) {
      return new DatasetQuery(this)["in"](prop, val);
    };

    Dataset.prototype.nin = function(prop, val) {
      return new DatasetQuery(this).nin(prop, val);
    };

    Dataset.prototype.between = function(prop, val) {
      return new DatasetQuery(this).between(prop, val);
    };

    Dataset.prototype.nbetween = function(prop, val) {
      return new DatasetQuery(this).nbetween(prop, val);
    };

    Dataset.prototype.contains = function(prop, val) {
      return new DatasetQuery(this).contains(prop, val);
    };

    Dataset.prototype.ncontains = function(prop, val) {
      return new DatasetQuery(this).ncontains(prop, val);
    };

    Dataset.prototype.icontains = function(prop, val) {
      return new DatasetQuery(this).icontains(prop, val);
    };

    Dataset.prototype.nicontains = function(prop, val) {
      return new DatasetQuery(this).nicontains(prop, val);
    };

    Dataset.prototype.incontains = function(prop, val) {
      return new DatasetQuery(this).incontains(prop, val);
    };

    return Dataset;

  })();

  DatasetQuery = (function() {
    function DatasetQuery(dataset) {
      this.dataset = dataset;
      this.query = {};
      this.__defineGetter__("length", (function(_this) {
        return function() {
          return _this.apply().length;
        };
      })(this));
    }

    DatasetQuery.prototype.get = function(n) {
      return this.apply().get(n);
    };

    DatasetQuery.prototype.toArray = function() {
      return this.apply().toArray();
    };

    DatasetQuery.prototype.toString = function() {
      return this.apply().toString();
    };

    DatasetQuery.prototype.clone = function(newSettings) {
      return this.apply().clone(newSettings);
    };

    DatasetQuery.prototype.map = function(fun, newSettings) {
      return this.apply().map(fun, newSettings);
    };

    DatasetQuery.prototype.filter = function(fun, newSettings) {
      return this.apply().filter(fun, newSettings);
    };

    DatasetQuery.prototype.query = function(query) {
      return this.apply().query(query);
    };

    DatasetQuery.prototype.sort = function(arg) {
      return this.apply().sort(arg);
    };

    DatasetQuery.prototype.apply = function() {
      return this.dataset.query(this.query);
    };

    DatasetQuery.prototype.addCondition = function(prop, op, val) {
      if (!this.query[prop]) {
        this.query[prop] = {};
      }
      if (this.query[prop][op] != null) {
        if (op === '$in' || op === '$nin') {
          this.query[prop][op] = this.query[prop][op].concat(val);
        } else {
          this.query[prop][op] = val;
        }
      } else {
        this.query[prop][op] = val;
      }
      return this;
    };

    DatasetQuery.prototype.eq = function(prop, val) {
      return this.addCondition(prop, '$eq', val);
    };

    DatasetQuery.prototype.ne = function(prop, val) {
      return this.addCondition(prop, '$ne', val);
    };

    DatasetQuery.prototype.neq = function(prop, val) {
      return this.addCondition(prop, '$neq', val);
    };

    DatasetQuery.prototype.gt = function(prop, val) {
      return this.addCondition(prop, '$gt', val);
    };

    DatasetQuery.prototype.gte = function(prop, val) {
      return this.addCondition(prop, '$gte', val);
    };

    DatasetQuery.prototype.lt = function(prop, val) {
      return this.addCondition(prop, '$lt', val);
    };

    DatasetQuery.prototype.lte = function(prop, val) {
      return this.addCondition(prop, '$lte', val);
    };

    DatasetQuery.prototype["in"] = function(prop, val) {
      return this.addCondition(prop, '$in', val);
    };

    DatasetQuery.prototype.nin = function(prop, val) {
      return this.addCondition(prop, '$nin', val);
    };

    DatasetQuery.prototype.between = function(prop, val) {
      return this.addCondition(prop, '$between', val);
    };

    DatasetQuery.prototype.nbetween = function(prop, val) {
      return this.addCondition(prop, '$nbetween', val);
    };

    DatasetQuery.prototype.contains = function(prop, val) {
      return this.addCondition(prop, '$contains', val);
    };

    DatasetQuery.prototype.ncontains = function(prop, val) {
      return this.addCondition(prop, '$ncontains', val);
    };

    DatasetQuery.prototype.icontains = function(prop, val) {
      return this.addCondition(prop, '$icontains', val);
    };

    DatasetQuery.prototype.nicontains = function(prop, val) {
      return this.addCondition(prop, '$nicontains', val);
    };

    DatasetQuery.prototype.incontains = function(prop, val) {
      return this.addCondition(prop, '$incontains', val);
    };

    return DatasetQuery;

  })();

  (typeof exports !== "undefined" && exports !== null ? exports : this).Dataset = Dataset;

}).call(this);

//# sourceMappingURL=dataset.js.map
