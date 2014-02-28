class Dataset
	constructor: (@data, @settings) ->
		@data ?= []
		# console.log('new Dataset', @data)
		@length = @data.length
	toString: () -> "Dataset (#{@length} elements)"
	get: (n) -> @data[n]
	clone: (newSettings) ->
		new Dataset(@data.slice(0), newSettings or @settings)
	asArray: () -> @data
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
		# console.log('query', query)
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
								npv.previous[npv.previousName] = ds.asArray()
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

class DatasetQuery
	constructor: (@dataset) ->
		@query = {}
	query: (query) ->
		ds = @

(exports ? this).Dataset = Dataset











