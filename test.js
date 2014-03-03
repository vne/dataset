var assert = require('assert'),
	sortjs = require('sortjs'),
	dataset = require('./dataset');

var testData = [
	{ id: 1, s: "qwe-abc-test1", a: 1, obj: { oa: 1, oobj: { ooa: 1 } }, arr: [ { aa: 10 }, { ab: 20 } ] },
	{ id: 2, s: "QWE-def-test2", a: 1, obj: { oa: 2, oobj: { ooa: 3 } }, arr: [ { aa: 10 }, { ab: 30 } ] },
	{ id: 3, s: "qwe-ghi-test3", a: 1, obj: { oa: 4, oobj: { ooa: 1 } }, arr: [ { aa: 11 }, { ab: 29 } ] },
	{ id: 4, s: "QWE-jkl-test4", a: 1, obj: { oa: 1, oobj: { ooa: 6 } }, arr: [ { aa: 10 }, { ab: 20 } ] },
	{ id: 5, s: "qwe-mno-test5", a: 2, obj: { oa: 1, oobj: { ooa: 1 } }, arr: [ { aa: 10 }, { ab: 20 } ] },
];

var ds = new dataset.Dataset(testData),
	ds2 = ds.clone({ filter_subarrays: true });
	// ds2 = new dataset.Dataset(testData, { filter_subarrays: true });

describe('For simple query', function() {
	it('by id it should return single element', function() {
		assert.equal(1, ds.query({ id: 5 }).length);
	});
	it('by id ($eq) it should return single element', function() {
		assert.equal(1, ds.query({ id: { $eq: 5 } }).length);
	});
	it('by id ($neq) it should return all other elements', function() {
		assert.equal(4, ds.query({ id: { $neq: 5 } }).length);
	});
	it('by gt it should return two elements', function() {
		assert.equal(3, ds.query({ id: { $gt: 2 } }).length);
	});
	it('by gte it should return two elements', function() {
		assert.equal(2, ds.query({ id: { $gte: 4 } }).length);
	});
	it('by lt it should return one element', function() {
		assert.equal(1, ds.query({ id: { $lt: 2 } }).length);
	});
	it('by lte it should return four elements', function() {
		assert.equal(4, ds.query({ id: { $lte: 4 } }).length);
	});
	it('by in it should return elements with ids from the list', function() {
		assert.equal(3, ds.query({ id: { $in: [1,3,5,6] } }).length);
	});
	it('by nin it should return elements with ids that are missing in the list', function() {
		assert.equal(2, ds.query({ id: { $nin: [1,3,5,6] } }).length);
	});
	it('by between it should return elements with ids that are in the range (inclusive)', function() {
		assert.equal(3, ds.query({ id: { $between: [2,4] } }).length);
	});
	it('by nbetween it should return elements with ids that are not in the range (inclusive)', function() {
		assert.equal(2, ds.query({ id: { $nbetween: [2,4] } }).length);
	});
	it('by contains it should return elements containing "qwe"', function() {
		assert.equal(3, ds.query({ s: { $contains: "qwe" } }).length);
	});
	it('by contains it should return zero elements containing "bbb"', function() {
		assert.equal(0, ds.query({ s: { $contains: "bbb" } }).length);
	});
	it('by icontains it should return elements containing "qwe"', function() {
		assert.equal(5, ds.query({ s: { $icontains: "qwe" } }).length);
	});
	it('by ncontains it should return elements that does not contain "qwe"', function() {
		assert.equal(2, ds.query({ s: { $ncontains: "qwe" } }).length);
	});
	it('by ncontains it should return elements that does not contain "bbb"', function() {
		assert.equal(5, ds.query({ s: { $ncontains: "bbb" } }).length);
	});
	it('by nicontains it should return zero elements that does not contain "qwe"', function() {
		assert.equal(0, ds.query({ s: { $nicontains: "qwe" } }).length);
	});
	it('by nicontains it should return zero elements that does not contain "bbb"', function() {
		assert.equal(5, ds.query({ s: { $nicontains: "bbb" } }).length);
	});
	it('by incontains it should return same result as for nicontains', function() {
		assert.equal(ds.query({ s: { $nicontains: "qwe" } }).length, ds.query({ s: { $incontains: "qwe" } }).length);
	});
});
describe("For multiple queries", function() {
	it('by contains and eq it should return two elements', function() {
		assert.equal(2, ds.query({ s: { $contains: "qwe" }, a: 1 }).length);
	});
});
describe("For queries with boolean operator", function() {
	it('AND it should return correct subset of data', function() {
		assert.equal(2, ds.query({
			$and: [
				{ s: { $contains: "qwe" } },
				{ a: 1 }
			]
		}).length);
	});
	it('OR it should return correct subset of data', function() {
		assert.equal(3, ds.query({
			$or: [
				{ id: { $in: [1,2] } },
				{ id: 3 },
			]
		}).length);
	});
	it('nested one inside another it should return correct subset of data', function() {
		assert.equal(3, ds.query({
			$or: [
				{
					$or: [
						{ id: 1 },
						{ id: 2 }
					]
				},
				{ id: 3 },
			]
		}).length);
	});
});
describe('For queries that involve nested fields', function() {
	it('it should filter data correctly for one-level nesting', function() {
		assert.equal(2, ds.query({ "obj.oa": { $in: [2,3,4] }}).length);
	});
	it('it should filter data correctly for two-level nesting', function() {
		assert.equal(2, ds.query({ "obj.oobj.ooa": { $in: [3,4,5,6] }}).length);
	});
});
describe('For queries that involve nested arrays', function() {
	it('it should filter data accordingly to the values of array elements', function() {
		assert.equal(4, ds.query({ "arr.aa": 10 }).length);
	});
	it('it should filter subarrays if an appropriate option is set', function() {
		var r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(1, r.get(0).arr.length);
		assert.equal(2, ds2.get(0).arr.length);
	});
	it('should filter subarrays depending on option set in runtime', function() {
		var r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(1, r.get(0).arr.length);
		ds2.option('filter_subarrays', false);
		r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(2, r.get(0).arr.length);
		ds2.option('filter_subarrays', true);
		r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(1, r.get(0).arr.length);
	});
	it('should filter subarrays properly if options are set as object', function() {
		var r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(1, r.get(0).arr.length);
		ds2.option({ filter_subarrays: false });
		r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(2, r.get(0).arr.length);
		ds2.option({ filter_subarrays: true });
		r = ds2.query({ "arr.aa": 10 });
		assert.equal(4, r.length);
		assert.equal(1, r.get(0).arr.length);
	});
});
describe('Sort method', function() {
	it('should sort the dataset using a native function', function() {
		var r = ds.sort(function(a, b) { return a.obj.oa - b.obj.oa });
		assert.equal(5, r.length);
		assert.deepEqual([1,4,5,2,3], r.toArray().map(function(e) { return e.id }));
	});
	it('should sort the dataset using SortJS', function() {
		global.sortjs = sortjs;
		var r = ds.sort(["-id"]);
		delete global.sortjs;
		assert.equal(5, r.length);
		assert.deepEqual([5,4,3,2,1], r.toArray().map(function(e) { return e.id }));
	});
});
describe('DatasetQuery interface', function() {
	it('should filter data with .eq method', function() {
		assert.equal(1, ds.eq('id', 1).length);
	});
	it('should filter data with .in method', function() {
		var r = ds.in('id', [1,3,4]);
		assert.deepEqual([1,3,4], r.apply().toArray().map(function(e) { return e.id }));
		assert.deepEqual([3,4], r.nin('id', [1,2]).apply().toArray().map(function(e) { return e.id }));
	});
	it('should chain subsequent .in methods', function() {
		assert.deepEqual([1,3,4], ds.in('id', [1]).in('id', [3,4]).apply().toArray().map(function(e) { return e.id }));
	});
	it('should override subsequent .eq methods', function() {
		assert.equal(1, ds.eq('id', 4).eq('id', 1).apply().toArray()[0].id);
	});
	it('should filter data with .contains method', function() {
		assert.deepEqual([1,3,5], ds.contains('s', 'qwe').apply().toArray().map(function(e) { return e.id }));
	});
	it('should filter data with chained .contains and .gte methods', function() {
		assert.deepEqual([3,5], ds.contains('s', 'qwe').gte('id', 2).apply().toArray().map(function(e) { return e.id }));
	});
	it('should return the same result as dataset.query method for .eq', function() {
		assert.deepEqual(ds.query({ id: 1 }), ds.eq("id", 1).apply());
	});
	it('should return the same result as dataset.query method for .neq', function() {
		assert.deepEqual(ds.query({ id: { $neq: 1 } }), ds.neq("id", 1).apply());
	});
	it('should return the same result as dataset.query method for .gt', function() {
		assert.deepEqual(ds.query({ id: { $gt: 2 } }), ds.gt("id", 2).apply());
	});
	it('should return the same result as dataset.query method for .lt', function() {
		assert.deepEqual(ds.query({ id: { $gt: 3 } }), ds.gt("id", 3).apply());
	});
	it('should return the same result as dataset.query method for .in', function() {
		assert.deepEqual(ds.query({ id: { $in: [2,3] } }), ds.in("id", [2,3]).apply());
	});
	it('should return the same result as dataset.query method for .nin', function() {
		assert.deepEqual(ds.query({ id: { $nin: [2,3] } }), ds.nin("id", [2,3]).apply());
	});
	it('should return the same result as dataset.query method for .between', function() {
		assert.deepEqual(ds.query({ id: { $between: [2,4] } }), ds.between("id", [2,4]).apply());
	});
	it('should return the same result as dataset.query method for .nbetween', function() {
		assert.deepEqual(ds.query({ id: { $nbetween: [2,4] } }), ds.nbetween("id", [2,4]).apply());
	});
	it('should return the same result as dataset.query method for .contains', function() {
		assert.deepEqual(ds.query({ s: { $contains: "qwe" } }), ds.contains("s", "qwe").apply());
	});
	it('should return the same result as dataset.query method for .ncontains', function() {
		assert.deepEqual(ds.query({ s: { $ncontains: "qwe" } }), ds.ncontains("s", "qwe").apply());
	});
});
















