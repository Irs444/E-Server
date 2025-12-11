/**
 * Module dependencies.
 */

var path = require('path');
var extend = require('util')._extend;

var development = require('./dev_env');
var test = require('./test_env');
var production = require('./prod_env');
var staging = require('./staging_env');
var defaults = {
	root: path.normalize(__dirname + '/../'),
	// mail:{
	//   mandrillKey : 'pwABzp6CtEQKsLD-lUNx7g',
	//   from : 'system@caretocall.com'
	// }
};

/**
 * Expose
 */

module.exports = {
	development: Object.assign(development, defaults),
	test: Object.assign(test, defaults),
	production: Object.assign(production, defaults),
	staging: Object.assign(staging, defaults)
}[process.env.NODE_ENV || 'development'];