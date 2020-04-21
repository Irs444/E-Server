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
	development: extend(development, defaults),
	test: extend(test, defaults),
	production: extend(production, defaults),
	staging: extend(staging, defaults)
}[process.env.NODE_ENV || 'development'];