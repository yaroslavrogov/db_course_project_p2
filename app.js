#!/usr/bin/env node

var mongoose = require("mongoose");
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var cache = redis.createClient();
cache.once('ready', function() { console.log("Connected to redis cache."); });

Employee = require('./models/employee');
Product = require('./models/product');
Purchase = require('./models/purchase');
Shop = require('./models/shop');
StockChange = require('./models/stockchange');
Supplier = require('./models/supplier');

mongoose.connect('mongodb://localhost:27017/test');

console.log('App starts!');
console.log('Using mongoose. Version: ' + mongoose.version);

var db = mongoose.connection;
db.on('error', function() { console.log("Connection error!"); });
db.once('open', function() { console.log("Connected to db."); });

var server = express();

server.use(bodyParser.urlencoded({ extended: true}));
server.use(bodyParser.json());
server.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

function isEmpty(obj)
{
	for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

// get employees
server.get('/api/employee', function(req, res) {
	console.log('sending employees');
	cache.get("employees", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		// for( i in rep) console.log(rep[i]['_id']);
		else if(isEmpty(rep)) {
			console.log("did not find in cache, querying db");
			Employee.getEmployees(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("employees", JSON.stringify(emp));
				}
			}, true);
		}
		else {
			console.log("found in cache");
			res.json(JSON.parse(rep));
		}
	});
});

// get employee by id
server.get('/api/employee/:_id', function(req, res) {
	var id = req.params._id;

	console.log('/api/employee/'+id);

	cache.get("employee:" + id, function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Employee.findEmployeeById(id, function (error, emp) {
				console.log("did not find in cache, querying db");
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					console.log('Sending data');
					res.json(emp);
					console.log('Caching data');
					cache.set("employee:"+id, JSON.stringify(emp));
				}
			}, true);
		}
		else {
			console.log("found in cache");
			res.json(JSON.parse(rep));
		}
	})
});

// update employee
server.put('/api/employee/:_id', function(req, res) {
	var id = req.params._id;
	var emp = req.body;

	console.log(JSON.stringify(emp, null, 4));
	console.log('updating ' + id);

	Employee.updateEmployee(id, emp, {}, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			console.log('updated');
			res.json(emp);
			cache.del("employee");
			cache.del("employee:" + id);
		}
	});
});

// add employee
server.post('/api/employee', function(req, res) {
	console.log('adding employees: ' + req.body.lastname);
	Employee.addEmployees(req.body, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			res.json(emp);
			cache.del("employee");
		}
	});
});

// hire employee
server.post('/api/hire/:_id', function(req, res) {
	Employee.addHiring(req.params._id, req.body, function(error, emp) {
		if(error) {
			req.status(400).send(
				{ error: 'failed to add hiring!' });
		}
		else {
			res.json(emp);
			cache.del("employee");
			cache.del("employee:" + id);
		}
	});
});

// fire employee
server.delete('/api/hire/:_id', function(req, res) {
	var id = req.params._id;
	Employee.removeEmployee(id, function(error, emp) {
		if(error) res.status(400).send(
			{ message: 'fail', error: error });
		else {
			res.status(200).send(
				{message: 'ok'});
			cache.del("employee");
			cache.del("employee:" + id);
		}
	});
});

// delete employee
server.delete('/api/employee/:_id', function(req, res) {
	var id = req.params._id;
	console.log('deleting employee ' + id);
	Employee.removeEmployee(id, function(error, emp) {
		if(error) res.status(400).send(
			{ message: 'fail', error: error });
		else {
			res.status(200).send(
				{message: 'ok'});
			cache.del("employee");
			cache.del("employee:" + id);
		}
	});
});


// get products
server.get('/api/product', function(req, res) {
	console.log('sending products');
	cache.get("product", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Product.getProducts(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("product", JSON.stringify(emp));
				}
			});
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// get product by id
server.get('/api/product/:_id', function(req, res) {
	var id = req.params._id;
	cache.get("product:" + id, function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Product.findProductById(id, function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("product:" + id, JSON.stringify(emp));
				}
			}, true);
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// add product
server.post('/api/product', function(req, res) {
	console.log('adding product');
	console.log(JSON.stringify(req.body, null, 4));
	Product.addProduct(req.body, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			res.json(emp);
			cache.del("product");
		}
	});
});

// update product
server.put('/api/product/:_id', function(req, res) {
	var id = req.params._id;
	var jc = req.body;

	console.log('updating ' + id);
	console.log(JSON.stringify(jc, null, 4));

	Product.updateProduct(id, jc, {}, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			console.log('updated');
			cache.del("product");
			cache.del("product:" + id);
			res.json(emp);
		}
	});
});

// delete product
server.delete('/api/product/:_id', function(req, res) {
	var id = req.params._id;
	console.log('deleting product ' + id);
	Product.removeProduct(id, function(error, emp) {
		if(error) res.status(400).send(
			{ message: 'fail', error: error });
		else {
			cache.del("product");
			cache.del("product:" + id);
			res.status(200).send(
				{message: 'ok'});
		}
	});
});


// get purchase
server.get('/api/purchase', function(req, res) {
	console.log('sending purchases');
	cache.get("purchase", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep))
		{
			Purchase.getPurchases(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("purchase", JSON.stringify(emp));
				}
			}, true, true);
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// get purchase by id
server.get('/api/purchase/:_id', function(req, res) {
	var id = req.params._id;
	cache.get("purchase:" + id, function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep))
		{
			Purchase.findPurchaseById(id, function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("purchase:" + id, JSON.stringify(emp));
				}
			});
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// add purchase
server.post('/api/purchase', function(req, res) {
	console.log('adding purchase');
	console.log(JSON.stringify(req.body, null, 4));
	Purchase.addPurchase(req.body, function (error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			cache.del("purchase");
			cache.del("purchase:" + id);
			res.json(emp);
		}
	});
});


// get shops
server.get('/api/shop', function(req, res) {
	console.log('sending shops');
	cache.get("shop", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Shop.getShops(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					res.json(emp);
					cache.set("shop", JSON.stringify(emp));
				}
			});
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// add shop
server.post('/api/shop', function(req, res) {
	console.log('adding shop');
	console.log(JSON.stringify(req.body, null, 4));
	Shop.addShop(req.body, function (error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			cache.del("shop");
			res.json(emp);
		}
	});
});

// delete shop
server.delete('/api/shop/:_id', function(req, res) {
	var id = req.params._id;
	console.log('deleting shop ' + id);
	Shop.deleteShop(id, function(error, emp) {
		if(error) res.status(400).send(
			{ message: 'fail', error: error });
		else {
			cache.del("shop");
			res.status(200).send(
				{message: 'ok'});
		}
	});
});

// update shop
server.put('/api/shop/:_id', function(req, res) {
	var id = req.params._id;
	var jc = req.body;

	console.log('updating ' + id);
	console.log(JSON.stringify(jc, null, 4));

	Shop.updateShop(id, jc, {}, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			console.log('updated');
			cache.del("shop");
			res.json(emp);
		}
	});
});


// get stock changes
server.get('/api/stockchange', function(req, res) {
	console.log('sending stock changes');
	cache.get("stockchange", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			StockChange.getStockChanges(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					cache.set("stockchange", JSON.stringify(emp));
					res.json(emp);
				}
			}, true, true);
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// get stock change by id
server.get('/api/stockchange/:_id', function(req, res) {
	var id = req.params._id;
	cache.get("stockchange:" + id, function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			StockChange.findStockChangeById(id, function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					cache.set("stockchange:" + id, JSON.stringify(emp));
					res.json(emp);
				}
			}, true);
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// add stock change
server.post('/api/stockchange', function(req, res) {
	console.log('adding stock change');
	console.log(JSON.stringify(req.body, null, 4));
	StockChange.addStockChange(req.body, function (error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			cache.del("stockchange");
			res.json(emp);
		}
	});
});

// add stock change
server.post('/api/stockchange/:_id/items', function(req, res) {
	var id = req.params._id;
	console.log('adding stock items');
	console.log(JSON.stringify(req.body, null, 4));
	StockChange.addStockItems(id, req.body, function (error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			cache.del("stockchange");
			cache.del("stockchange:" + id);
			res.json(emp);
		}
	});
});

// update stock change items
server.put('/api/stockchange/:_id/items', function(req, res) {
	var id = req.params._id;
	var jc = req.body;

	console.log('updating ' + id);
	console.log(JSON.stringify(jc, null, 4));

	StockChange.updateStockItems(id, jc, {}, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			console.log('updated');
			cache.del("stockchange");
			cache.del("stockchange:" + id);
			res.json(emp);
		}
	});
});



// get suppliers
server.get('/api/supplier', function(req, res) {
	console.log('sending suppliers');
	cache.get("supplier", function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Supplier.getSuppliers(function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					cache.set("supplier", JSON.stringify(emp));
					res.json(emp);
				}
			});
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// get supplier by id
server.get('/api/supplier/:_id', function(req, res) {
	var id = req.params._id;
	cache.get("supplier:" + id, function(err, rep) {
		if(err) res.status(401).send(
			{ message: 'cache fail', error: err} );
		else if(isEmpty(rep)) {
			Supplier.findSupplierById(id, function (error, emp) {
				if(error) res.status(400).send(
					{ message: 'fail', error: error });
				else {
					cache.set("supplier:" + id, JSON.stringify(emp));
					res.json(emp);
				}
			});
		}
		else {
			res.json(JSON.parse(rep));
		}
	});
});

// add supplier
server.post('/api/supplier', function(req, res) {
	console.log('adding supplier');
	console.log(JSON.stringify(req.body, null, 4));

	Supplier.addSupplier(req.body, function (error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			cache.del("supplier");
			res.json(emp);
		}
	});
});

// delete supplier
server.delete('/api/supplier/:_id', function(req, res) {
	var id = req.params._id;
	console.log('deleting supplier ' + id);
	Supplier.deleteSupplier(id, function(error, emp) {
		if(error) res.status(400).send(
			{ message: 'fail', error: error });
		else {
			cache.del("supplier");
			cache.del("supplier:" + id);
			res.status(200).send(
				{message: 'ok'});
		}
	});
});

// update supplier
server.put('/api/supplier/:_id', function(req, res) {
	var id = req.params._id;
	var jc = req.body;

	console.log('updating ' + id);
	console.log(JSON.stringify(jc, null, 4));

	Supplier.updateSupplier(id, jc, {}, function(error, emp) {
		if(error) {
			console.log(error);
			res.status(400).send(
				{ message: 'fail', error: error });
		}
		else {
			console.log('updated');
			cache.del("supplier");
			cache.del("supplier:" + id);
			res.json(emp);
		}
	});
});


server.listen(3228);
console.log('Running on port 3228');
module.exports = server;