class Dataset
	constructor: (@data, @settings) ->
		@data ?= []
		# console.log('new Dataset', @data)
		@length = @data.length
	toString: () -> "Dataset (#{@length} elements)"
	valueOf: () -> @data
	toArray: () -> @data
	get: (n) -> @data[n]
	option: (name, val) ->
		# console.log "option", name, val
		if not val?
			if typeof name == "object"
				@settings = name
			else
				return unless @settings
				return @settings[name]
		if not @settings
			@settings = {}
		@settings[name] = val
	clone: (newSettings) ->
		new Dataset(@data.slice(0), newSettings or @settings)
	map: (fun, newSettings) -> new Dataset(@data.map(fun), newSettings or @settings)
	filter: (fun, newSettings) -> new Dataset(@data.filter(fun), newSettings or @settings)
	sort: (arg) ->
		return @ unless arg
		return new Dataset(@data.slice(0).sort(arg)) if arg.constructor == Function
		if arg.constructor == Array
			try
				return new Dataset(sortjs.sort(@data, arg))
			catch e
				throw new Exception("SortJS is needed to sort data using an array of properties. Either use a function or download SortJS from https://github.com/vne/sortjs");
	_cloneObject: (obj) -> JSON.parse(JSON.stringify(obj))
	getPropertyValue: (prop, obj) ->
		names = prop.split '.'
		o = obj
		if names.length > 1
			for i in [0...names.length]
				name = names[i]
				prevname = names[i - 1] if i > 0
				if o.constructor == Object
					return {
						match: "partial"
						depth: i + 1
						name: prop.split(".")[0...i + 1].join "."
						value: o
						previousName: prevname
						previous: prevo
					} unless o.hasOwnProperty name
					prevo = o
					o = o[name]
				else if o.constructor == Array
					return {
						match: "array"
						depth: i + 1
						name: prop.split(".")[0...i].join "."
						part: name
						key: prop.split(".")[i...].join "."
						value: o
						previousName: prevname
						previous: prevo
					}
		else
			prevo = o
			o = o[prop]
		return {
			match: "full"
			depth: i
			name: prop.split(".")[0...i + 1].join "."
			value: o
			previousName: prevname
			previous: prevo
		}
	query: (query) ->
		# console.log('query', query, @settings)
		ndata = []
		for i in [0...@length]
			obj = @objectMatches(@data[i], query)
			ndata.push obj if obj
		new Dataset(ndata)
	# returns object if object matches query, undefined otherwise
	objectMatches: (obj, query) ->
		match = true
		nobj = obj
		for own prop, value of query
			# console.log('query prop', prop, value)
			switch prop
				when '$and'
					for subq in value
						match = match and @objectMatches(obj, subq)?
						break unless match
				when '$or'
					match = value
						.map    (subq)   => @objectMatches(obj, subq)
						.reduce (acc, v) -> acc or v
				else
					pv = @getPropertyValue(prop, obj)
					if pv.match == "full" then match = match and @check(value, pv.value)
					else if pv.match == "array"
						nquery = {}
						nquery[pv.key] = value
						# console.log('array', pv.key, value)
						ds = new Dataset(pv.value, @settings).query(nquery)
						# console.log('     ', ds, match)
						if ds.length > 0
							if @settings and @settings.filter_subarrays
								nobj = @_cloneObject(obj)
								npv = @getPropertyValue(prop, nobj)
								npv.previous[npv.previousName] = ds.toArray()
						else
							match = false
			break unless match
		return unless match
		nobj
	check: (condlist, dval) ->
		if typeof condlist != "object"
			return condlist is dval
		match = true
		for type, cond of condlist
			# console.log('check', cond, type, dval, dval.indexOf(cond) if dval.indexOf)
			switch type
				when '$eq'           then match = false unless cond is dval
				when '$neq', '$ne'   then match = false unless cond isnt dval
				when '$gt'           then match = false unless dval > cond
				when '$gte'          then match = false unless dval >= cond
				when '$lt'           then match = false unless dval < cond
				when '$lte'          then match = false unless dval <= cond
				when '$in'           then match = false unless dval in cond
				when '$nin'          then match = false unless dval not in cond
				when '$between'      then match = false unless cond.length and cond.length == 2 and cond[0] <= dval <= cond[1]
				when '$nbetween'     then match = false unless !cond.length or (cond.length != 2) or (dval < cond[0]) or (dval > cond[1])
				when '$contains'     then match = false unless dval.indexOf and (dval.indexOf(cond) >= 0)
				when '$ncontains'    then match = false unless !dval.indexOf or dval.indexOf(cond) < 0
				when '$icontains'    
					match = false unless dval.toLowerCase and cond.toLowerCase and dval.toLowerCase().indexOf(cond.toLowerCase()) >= 0
				when '$nicontains', '$incontains'
					match = false unless !dval.toLowerCase or !cond.toLowerCase or dval.toLowerCase().indexOf(cond.toLowerCase()) < 0
			break unless match
		match
	eq:          (prop, val) -> new DatasetQuery(@).eq(prop, val)
	ne:          (prop, val) -> new DatasetQuery(@).ne(prop, val)
	neq:         (prop, val) -> new DatasetQuery(@).neq(prop, val)
	gt:          (prop, val) -> new DatasetQuery(@).gt(prop, val)
	gte:         (prop, val) -> new DatasetQuery(@).gte(prop, val)
	lt:          (prop, val) -> new DatasetQuery(@).lt(prop, val)
	lte:         (prop, val) -> new DatasetQuery(@).lte(prop, val)
	in:          (prop, val) -> new DatasetQuery(@).in(prop, val)
	nin:         (prop, val) -> new DatasetQuery(@).nin(prop, val)
	between:     (prop, val) -> new DatasetQuery(@).between(prop, val)
	nbetween:    (prop, val) -> new DatasetQuery(@).nbetween(prop, val)
	contains:    (prop, val) -> new DatasetQuery(@).contains(prop, val)
	ncontains:   (prop, val) -> new DatasetQuery(@).ncontains(prop, val)
	icontains:   (prop, val) -> new DatasetQuery(@).icontains(prop, val)
	nicontains:  (prop, val) -> new DatasetQuery(@).nicontains(prop, val)
	incontains:  (prop, val) -> new DatasetQuery(@).incontains(prop, val)


class DatasetQuery
	constructor: (@dataset) ->
		@query = {}
		@__defineGetter__ "length", () =>
			@apply().length
	get: (n) -> @apply().get(n)
	toArray: () -> @apply().toArray()
	toString: () -> @apply().toString()
	clone: (newSettings) -> @apply().clone(newSettings)
	map: (fun, newSettings) -> @apply().map(fun, newSettings)
	filter: (fun, newSettings) -> @apply().filter(fun, newSettings)
	query: (query) -> @apply().query(query)
	sort: (arg) -> @apply().sort(arg)
	apply: () -> @dataset.query(@query)
	addCondition: (prop, op, val) ->
		@query[prop] = {} unless @query[prop]
		if @query[prop][op]?
			if op in ['$in', '$nin']
				# $in and $nin operators join their values with previous constraints
				@query[prop][op] = @query[prop][op].concat(val)
			else
				# other operators override previous constraints
				@query[prop][op] = val
		else
			@query[prop][op] = val
		@
	eq:          (prop, val) -> @addCondition(prop, '$eq', val)
	ne:          (prop, val) -> @addCondition(prop, '$ne', val)
	neq:         (prop, val) -> @addCondition(prop, '$neq', val)
	gt:          (prop, val) -> @addCondition(prop, '$gt', val)
	gte:         (prop, val) -> @addCondition(prop, '$gte', val)
	lt:          (prop, val) -> @addCondition(prop, '$lt', val)
	lte:         (prop, val) -> @addCondition(prop, '$lte', val)
	in:          (prop, val) -> @addCondition(prop, '$in', val)
	nin:         (prop, val) -> @addCondition(prop, '$nin', val)
	between:     (prop, val) -> @addCondition(prop, '$between', val)
	nbetween:    (prop, val) -> @addCondition(prop, '$nbetween', val)
	contains:    (prop, val) -> @addCondition(prop, '$contains', val)
	ncontains:   (prop, val) -> @addCondition(prop, '$ncontains', val)
	icontains:   (prop, val) -> @addCondition(prop, '$icontains', val)
	nicontains:  (prop, val) -> @addCondition(prop, '$nicontains', val)
	incontains:  (prop, val) -> @addCondition(prop, '$incontains', val)


(exports ? this).Dataset = Dataset











