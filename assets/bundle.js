(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Deodorant = function(mode) {
    var check = (mode === 'debug');
    var aliases = {};
    var filters = {};

    function valueToString(value) {
        if (value !== value) {
            return 'NaN';
        }
        else {
            // Wrap in try catch in case of something like a circular object
            try {
                var value = JSON.stringify(value);
                return value;
            }
            catch (err) {
                return value;
            }
        }
    }

    function stripAnnotation(type) {
        // If the value ends with a ? or * it is a nullable or optional value
        if (typeof type === 'string') {
            // Possible cases:
            // 1) a plain type, return the type and no annotations
            // 2) a type with a ? or *, return the type and the symbol
            // 3) a type with filters, return the type, an empty symbol, and an array of filters
            // 4) a type with a ? or * and filters, return the type, the symbol, and an array of filters
            // Return it like this: [type, [symbol, filters...]] for convenience
            // If there is a ? or * in the annotation, that is the start of the annotation
            var qIdx = type.indexOf('?');
            if (qIdx < 0) {
                qIdx = type.indexOf('*');
                if (qIdx < 0) {
                    qIdx = type.indexOf('|');
                }
            }
            if (qIdx >= 0) {
                return [
                    type.slice(0, qIdx),
                    type.slice(qIdx).split('|')
                ];
            }
            else {
                return [type, []];
            }
        }
        else if (Array.isArray(type)) {
            // If the last element is the filter token, use that
            lastElement = type[type.length - 1]
            if (typeof lastElement === 'string' && lastElement.indexOf('[]') === 0) {
                annotation = type[type.length - 1].slice(2);
                type = type.slice(0, -1);
                return [type, annotation.split('|')];
            }
            else {
                return [type, []];
            }
        }
        else if (type !== null && typeof type == 'object') {
            for (var typeKey in type) {
                if (typeKey.indexOf('{}') === 0) {
                    annotation = typeKey.slice(2);
                    delete type[typeKey];

                    return [type, annotation.split('|')];
                }
            }
            return [type, []];
        }
        else {
            return [type, []];
        }
    }

    function valuesToString(values) {
        var strs = [];
        for (var i=0; i<values.length; i++) {
            var value = values[i];
            strs.push(valueToString(value));
        }
        return strs;
    }

    function checkFilter(value, filter) {
        var pieces = filter.split(':');
        var filterName = pieces[0];
        var fn = filters[filterName];
        if (!fn(value, pieces[1])) {
            throw new Error(value + ' does not pass filter ' + filter);
        }
    }

    function checkFilters(value, theseFilters) {
        for (var i=0; i<theseFilters.length; i++) {
            checkFilter(value, theseFilters[i]);
        }
    }

    function checkRegExpType(value, type) {
        if (!type.test(value)) {
            throw new Error(value + ' does not match ' + type);
        }
    }

    function checkTupleType(value, type) {
        if (!Array.isArray(value)) {
            throw new Error(value + ' is not a JS array of type ' + type);
        }
        // For each type in the tuple, match the corresponding value
        for (var i=0; i<type.length; i++) {
            var subType = type[i];
            var subValue = value[i];
            if (!checkValuesType(subValue, subType)) {
                throw new Error(subValue + ' does not match ' + subType);
            }
        }
    }

    function checkArrayType(value, type) {
        if (!Array.isArray(value)) {
            throw new Error(value + ' is not a JS array of type ' + type);
        }
        // Iterate over each element of the value, comparing it
        // with the one type
        var subType = type[0];
        for (i=0; i<value.length; i++) {
            var subValue = value[i];
            if (!checkValuesType(subValue, subType)) {
                throw new Error(subValue + ' does not match ' + subType);
            }
        }
    }

    function checkSingleTypeObjectType(value, type) {
        var subType = type['*'];
        for (var key in value) {
            var subValue = value[key];
            try {
                checkValuesType(subValue, subType);
            }
            catch (e) {
                throw new Error(key + ' in object does not match: ' + e.message);
            }
        }
    }

    function checkMultipleTypeObjectType(value, type) {
        // Go through each key:value pair and make sure
        // the key is present and the type checks
        for (var key in type) {
            var subType = type[key];
            if (value[key] === undefined) {
                throw new Error('Object missing key ' + key);
            }
            var subValue = value[key];
            try {
                checkValuesType(subValue, subType);
            }
            catch (e) {
                throw new Error('Key ' + key + ' does not match: ' + e.message);
            }
        }
    }

    function checkObjectType(value, type) {
        // {'*': 'Number'} means a dict of string to Number only
        if (type['*'] && Object.keys(type).length === 1) {
            checkSingleTypeObjectType(value, type);
        }
        // otherwise we are looking for specific keys
        // {pos: ['Number', 'Number'], size: {width: 'Number', height: 'Number'}, username: 'String', isLoggedIn: 'Boolean'}
        else {
            checkMultipleTypeObjectType(value, type);
        }
    }

    function checkSimpleType(value, type) {
        // Clean up any extraneous spaces
        type = type.replace(/ /g, '');

        // Always cry if NaN. Nobody would ever want NaN. Why is NaN in the language?
        if (value !== value) {
            throw new Error('NaN does not match type ' + type);
        }

        // Only don't cry for undefined if type is Void
        if (value === undefined) {
            if (type !== 'Void') {
                throw new Error('Undefined does not match type ' + type);
            }
            else {
                return;
            }
        }

        // Null is simple enough, thank goodness for triple-style equals
        if (value === null && type === 'Null') return;

        // typeof works as it should for all of these types yay
        if (typeof value === 'number' && type === 'Number') return;
        if (typeof value === 'string' && type === 'String') return;
        if (typeof value === 'boolean' && type === 'Boolean') return;
        if (typeof value == 'function' && type === 'Function') return;

        // The Any type will cry on undefined or NaN but will accept anything else
        if (type === 'Any' || type === 'Void') return;

        throw new Error(value + ' does not match type ' + type);
    }

    function checkValuesType(value, type) {
        var res = stripAnnotation(type);
        type = res[0];
        var annotation = res[1];
        var isNullable = annotation[0] === '?';
        var isUndefinedable = annotation[0] === '*';
        var theseFilters = annotation.slice(1, annotation.length);

        // Do nullable check
        if (isNullable && value === null) {
            return;
        }
        if (isUndefinedable && value === undefined) {
            return;
        }

        if (theseFilters.length > 0) {
            checkFilters(value, theseFilters);
        }

        //PositiveInteger -> Integer|gte:0 -> Number|isInteger|gte:0

        // Replace any aliases with a deep copy
        // so we can do further modifications, and recurse
        if (typeof type === 'string' && type in aliases) {
            type = JSON.parse(JSON.stringify(aliases[type]));
            checkValuesType(value, type);
            return;
        }


        // Check regexps
        if (Object.prototype.toString.call(type) === '[object RegExp]') {
            checkRegExpType(value, type);
            return;
        }

        // Check arrays and tuples
        else if (Array.isArray(type)) {
            if (type.length === 0) {
                // TODO make this show a better error message somehow
                return false;
            }
            if (type.length === 1) {
                // Array of all the same type or empty
                // ['Number'] ['String']
                try {
                    checkArrayType(value, type);
                }
                catch (err) {
                    return false;
                }
            }
            else {
                // Tuple (array in JS) of a fixed number of different types,
                // at least 2 (1-tuple would be the same syntax as array
                // of same type, but is also mostly useless anyway
                // ['Number', String, Boolean]'
                try {
                    var varr = checkTupleType(value, type);
                    return varr;
                }
                catch (err) {
                    return false;
                }
            }
        }

        // Check objects
        else if (type !== null && typeof type == 'object') {
            checkObjectType(value, type);
        }

        // Check simple values
        else {
            checkSimpleType(value, type);
        }
    }

    function checkFunction(signature, fn, fnName) {
        if (!check) {
            return fn;
        }

        // TODO: Make a more robust checker for errors in type signatures
        //for (var j=0; j<signature.length; j++) {
        //    var type = signature[j];
        //    if ((typeof type) !== 'string') {
        //        throw new Error('Invalid type ' + type);
        //    }
        //}

        if (fnName === undefined) {
            if (fn.name) {
                fnName = fn.name;
            }
            else {
                fnName = 'anonymous';
            }
        }
        var returnType = signature[signature.length-1];
        var argTypes = signature.slice(0, signature.length - 1);

        return function() {
            var args = (1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : []);

            // Check that we have the correct number of arguments
            // Optional parameters make this check harder, do we actually need it though?
            //if (args.length !== signature.length - 1) {
            //    throw new Error('Incorrect number of arguments for function "' + fnName + '": Expected ' + (signature.length - 1) + ', but got ' + args.length);
            //}

            // Check each argument's type
            for (var i=0; i<argTypes.length; i++) {
                var argType = argTypes[i];
                var arg = args[i];

                try {
                    checkValuesType(arg, argType);
                }
                catch (e) {
                    throw new Error('Function "' + fnName + '" argument ' + i + ' does not match: ' + e.message);
                }
            }

            // Actually call the original function
            returnValue = fn.apply(null, args);

            // Check return value type
            try {
                checkValuesType(returnValue, returnType);
            }
            catch (e) {
                throw new Error('Function "' + fnName + '" return value does not match: ' + e.message);
            }

            return returnValue;
        };
    };

    function checkModule(spec, this_) {
        var signatures = {};
        var fns = {};
        var typedModule = {};

        // Parse out the module's type signatures and functions
        for (var key in spec) {
            var value = spec[key];
            if (key[key.length-1] === '_') {
                signatures[key] = value;
            }
            else if (typeof value === 'function') {
                // If there is also a type signature hold on to this fn,
                // otherwise just put it in the new module as is
                value = value.bind(typedModule);
                if (spec[(key + '_')]) {
                    fns[key] = value;
                }
                else {
                    typedModule[key] = value;
                }
            }
            else {
                typedModule[key] = value;
            }
        }


        // Wrap each function in the module
        for (var fnName in fns) {
            var fn = fns[fnName];
            var signature = signatures[fnName + '_'];
            typedModule[fnName] = checkFunction(signature, fn, fnName);
        }

        return typedModule;
    }

    function checkClass(class_) {
        if (!check) {
            return class_;
        }
        var factory = function(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
            return checkModule(new class_(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10));
        }
        if ('constructor_' in class_.prototype) {
            return checkFunction(class_.prototype.constructor_, factory, 'constructor');
        }
        else {
            return factory;
        }
    }

    function addAlias(name, expansion) {
        aliases[name] = expansion;
    }
    function addFilter(name, fn) {
        filters[name] = fn;
    }

    function checkSignatureForValues(signature, values) {
        return function() {
            var argValues = values.slice(0, values.length - 1);
            var returnValue = values[values.length-1];
            var fn = function () {
                return returnValue;
            };

            fn = checkFunction(signature, fn);
            fn.apply(null, argValues);
        }
    }

    return {
        checkFunction: checkFunction,
        checkModule: checkModule,
        checkClass: checkClass,
        addAlias: addAlias,
        addFilter: addFilter,
        checkSignatureForValues: checkSignatureForValues
    };

};

if (typeof module === "object" && module != null && module.exports) {
    module.exports = Deodorant;
}
else if (typeof define === "function" && define.amd) {
    define(function() {
        return Deodorant;
    });
}
else {
    window.Deodorant = Deodorant;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/deodorant/deodorant.js","/node_modules/deodorant")

},{"_process":3,"buffer":5}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/ieee754/index.js","/node_modules/ieee754")

},{"_process":3,"buffer":5}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/process/browser.js","/node_modules/process")

},{"_process":3,"buffer":5}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/base64-js/lib/b64.js","/node_modules/watchify/node_modules/base64-js/lib")

},{"_process":3,"buffer":5}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(array)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/buffer/index.js","/node_modules/watchify/node_modules/buffer")

},{"_process":3,"base64-js":4,"buffer":5,"ieee754":2,"isarray":6}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/buffer/node_modules/isarray/index.js","/node_modules/watchify/node_modules/buffer/node_modules/isarray")

},{"_process":3,"buffer":5}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Boss, Engine, Player, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_SIZE, levels, types,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

types = require('src/types');

levels = require('src/levels');

SCREEN_WIDTH = 1280;

SCREEN_HEIGHT = 704;

TILE_SIZE = 32;

Player = (function() {
  function Player(game, startX, startY) {
    var heart, i, j;
    this.game = game;
    this.sprite = this.game.add.sprite(startX, startY, 'player');
    this.game.physics.arcade.enable(this.sprite);
    this.sprite.body.fixedRotation = true;
    this.sprite.body.collideWorldBounds = false;
    this.game.groups.actors.add(this.sprite);
    this.health = 10;
    this.hearts = [];
    for (i = j = 0; j < 10; i = ++j) {
      heart = this.game.add.sprite(48 + i * 64, 48, 'heart');
      this.hearts.push(heart);
      this.game.groups.ui.add(heart);
    }
  }

  Player.prototype.hurt = function() {
    var heart, i, j, len, ref, results;
    this.health--;
    ref = this.hearts;
    results = [];
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      heart = ref[i];
      results.push(heart.visible = i < this.health);
    }
    return results;
  };

  return Player;

})();

Boss = (function() {
  function Boss(game, startX, startY, key) {
    this.game = game;
    this.sprite = this.game.add.sprite(startX, startY, key);
    this.game.physics.arcade.enable(this.sprite);
    this.sprite.body.bounce.set(0.7);
    this.sprite.body.drag.set(40);
  }

  Boss.prototype.randomBounce = function() {
    this.sprite.body.velocity.y = -800;
    return this.sprite.body.velocity.x = Math.random() * 800 - 400;
  };

  Boss.prototype.bounceLeft = function() {
    this.sprite.body.velocity.y = -800;
    return this.sprite.body.velocity.x = -400;
  };

  Boss.prototype.bounceRight = function() {
    this.sprite.body.velocity.y = -800;
    return this.sprite.body.velocity.x = 400;
  };

  return Boss;

})();

module.exports = types.checkClass(Engine = (function() {
  function Engine(elementId) {
    this.elementId = elementId;
    this.update = bind(this.update, this);
    this.loadMap = bind(this.loadMap, this);
    this.create = bind(this.create, this);
    this.preload = bind(this.preload, this);
    this.game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, this.elementId, {
      preload: this.preload,
      create: this.create,
      update: this.update
    });
  }

  Engine.prototype.doCommand = function(command) {};

  Engine.prototype.preload = function() {
    var key, level;
    for (key in levels) {
      level = levels[key];
      this.game.load.image(level.background, "backgrounds/" + level.background + ".png");
    }
    this.game.load.image('player', 'player.png');
    this.game.load.image('heart', 'heart.png');
    this.game.load.spritesheet('toilet', 'toilet.png', 130, 284, 2);
    this.game.load.image('tiles', 'tiles.png');
    return this.parseLevels();
  };

  Engine.prototype.parseLevels = function() {
    var col, key, level, mapData, ref, results, row, rowData, tile, tileStr;
    results = [];
    for (key in levels) {
      level = levels[key];
      level.callback = (ref = level.callback) != null ? ref.bind(this) : void 0;
      mapData = ((function() {
        var j, len, ref1, results1;
        ref1 = level.tiles.trim().split('\n');
        results1 = [];
        for (row = j = 0, len = ref1.length; j < len; row = ++j) {
          rowData = ref1[row];
          if (row === 0 || row === 23) {
            continue;
          }
          results1.push(((function() {
            var k, len1, ref2, results2;
            ref2 = rowData.split('');
            results2 = [];
            for (col = k = 0, len1 = ref2.length; k < len1; col = ++k) {
              tileStr = ref2[col];
              if (col === 0 || col === 41) {
                continue;
              }
              if (tileStr === ' ') {
                tile = '0';
              } else {
                tile = parseInt(tileStr);
              }
              results2.push(tile);
            }
            return results2;
          })()).join(','));
        }
        return results1;
      })()).join('\n');
      results.push(this.game.load.tilemap(key, null, mapData));
    }
    return results;
  };

  Engine.prototype.create = function() {
    this.roomCol = 1;
    this.roomRow = 0;
    this.keys = this.game.input.keyboard.addKeys({
      comma: Phaser.KeyCode.COMMA,
      o: Phaser.KeyCode.O,
      a: Phaser.KeyCode.A,
      e: Phaser.KeyCode.E,
      w: Phaser.KeyCode.W,
      s: Phaser.KeyCode.S,
      d: Phaser.KeyCode.D,
      space: Phaser.KeyCode.SPACEBAR,
      prevWeapon: Phaser.KeyCode.LEFT,
      nextWeapon: Phaser.KeyCode.RIGHT,
      _1: Phaser.KeyCode.ONE,
      _2: Phaser.KeyCode.TWO,
      _3: Phaser.KeyCode.THREE,
      _4: Phaser.KeyCode.FOUR,
      _5: Phaser.KeyCode.FIVE,
      _6: Phaser.KeyCode.SIX,
      _7: Phaser.KeyCode.SEVEN,
      _8: Phaser.KeyCode.EIGHT,
      _9: Phaser.KeyCode.NINE
    });
    this.game.time.desiredFps = 60;
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = 981;
    this.game.groups = {};
    this.game.groups.background = this.game.add.group();
    this.game.groups.actors = this.game.add.group();
    this.game.groups.ui = this.game.add.group();
    this.player = new Player(this.game, 600, 400);
    this.loadMap();
    return this.currentBoss = new Boss(this.game, 400, 300, 'toilet');
  };

  Engine.prototype.loadMap = function() {
    var key, level;
    key = this.roomCol + "x" + this.roomRow;
    level = levels[key];
    if (this.background) {
      this.background.destroy();
    }
    this.background = this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, level.background);
    this.game.groups.background.add(this.background);
    if (this.layer) {
      this.layer.destroy();
    }
    this.tilemap = this.game.add.tilemap(key, TILE_SIZE, TILE_SIZE);
    this.tilemap.addTilesetImage('tiles');
    this.tilemap.setCollisionByExclusion([0]);
    this.layer = this.tilemap.createLayer(0);
    this.layer.resizeWorld();
    this.game.groups.background.add(this.layer);
    return typeof level.callback === "function" ? level.callback(this) : void 0;
  };

  Engine.prototype.spawnActor = function(x, y) {};

  Engine.prototype.update = function() {
    var total;
    this.game.physics.arcade.collide(this.player.sprite, this.layer);
    if (this.currentBoss != null) {
      this.game.physics.arcade.collide(this.currentBoss.sprite, this.layer);
    }
    if (this.player.sprite.x < 0) {
      if (levels[(this.roomCol - 1) + "x" + this.roomRow] != null) {
        this.player.sprite.x = SCREEN_WIDTH - this.player.sprite.width - 2;
        this.roomCol--;
        this.loadMap();
      }
    } else if (this.player.sprite.x > SCREEN_WIDTH - this.player.sprite.width) {
      if (levels[(this.roomCol + 1) + "x" + this.roomRow] != null) {
        this.player.sprite.x = 2;
        this.roomCol++;
        this.loadMap();
      }
    } else if (this.player.sprite.y < 0) {
      if (levels[this.roomCol + "x" + (this.roomRow - 1)] != null) {
        this.player.sprite.y = SCREEN_HEIGHT - this.player.sprite.height - 2;
        this.roomRow--;
        this.loadMap();
      }
    } else if (this.player.sprite.y > SCREEN_HEIGHT - this.player.sprite.height) {
      if (levels[this.roomCol + "x" + (this.roomRow + 1)] != null) {
        this.player.sprite.y = 2;
        this.roomRow++;
        this.loadMap();
      }
    }
    this.player.sprite.body.velocity.x = 0;
    if (this.player.sprite.body.velocity.y > 400) {
      this.player.sprite.body.velocity.y = 600;
    }
    if (this.keys.a.isDown) {
      this.player.sprite.body.velocity.x = -400;
    }
    if (this.keys.e.isDown || this.keys.d.isDown) {
      this.player.sprite.body.velocity.x = 400;
    }
    if (this.keys.comma.isDown || this.keys.w.isDown) {
      this.player.sprite.body.velocity.y = -600;
    }
    if (this.keys.space.justDown) {
      this.player.hurt();
    }
    if (this.currentBoss != null) {
      if (this.keys._1.justDown) {
        this.currentBoss.randomBounce();
      }
      if (this.keys._2.justDown) {
        this.currentBoss.bounceLeft();
      }
      if (this.keys._3.justDown) {
        this.currentBoss.bounceRight();
      }
    }
    total = Math.abs(this.currentBoss.sprite.body.velocity.x) + Math.abs(this.currentBoss.sprite.body.velocity.y);
    console.log(total);
    if (total < 100) {
      return this.currentBoss.randomBounce();
    }
  };

  return Engine;

})());


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/engine.coffee","/src")

},{"_process":3,"buffer":5,"src/levels":8,"src/types":10}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = {
  '1x0': {
    callback: function() {},
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|1111111111111111111111111111111111111111|\n|1                                       |\n|1                                       |\n|                                        |\n|                                        |\n|                                        |\n|                                        |\n|1                                       |\n|1                                       |\n|1                                       |\n|                                        |\n|                                        |\n|                                        |\n|                                        |\n|1                                       |\n|1                            1114444444 |\n|1                            111 44444  |\n|                           11111   44   |\n|                           11111   44   |\n|                         1111111   44   |\n|                         1111111   44   |\n|1111111111111111111111111111111111111111|\n+----------------------------------------+"
  },
  '0x0': {
    callback: function(game) {
      this.game = game;
    },
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|11111      111111      111111      11111|\n|1                                      1|\n|1                                      1|\n|                                        |\n|                                        |\n|                                        |\n|                                        |\n|11111111      111111111111      11111111|\n|1                                      1|\n|1                                      1|\n|                                        |\n|                                        |\n|                                        |\n|                                        |\n|11111111      111111111111      11111111|\n|1                                      1|\n|1                                      1|\n|                                        |\n|                                        |\n|                                        |\n|                                        |\n|11111      111111      111111      11111|\n+----------------------------------------+"
  },
  '0x-1': {
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|1111111111111111111111111111111111111111|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|11111      111111      111111      11111|\n+----------------------------------------+"
  },
  '0x1': {
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|11111      111111      111111      11111|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1111111111111111111111111111111111111111|\n+----------------------------------------+"
  },
  '-1x0': {
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|1111111111111111111111111111111111111111|\n|1                                      1|\n|1                                      1|\n|1                                       |\n|1                                       |\n|1                                       |\n|1                                       |\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                       |\n|1                                       |\n|1                                       |\n|1                                       |\n|1                                      1|\n|1                                      1|\n|1                                      1|\n|1                                       |\n|1                                       |\n|1                                       |\n|1                                       |\n|1111111111111111111111111111111111111111|\n+----------------------------------------+"
  },
  '2x0': {
    background: 'kitchen',
    tiles: "+----------------------------------------+\n|1111111111111111111111111111111111111111|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|                                       1|\n|   1111111                             1|\n|    1   1                              1|\n|    1   1                              1|\n|    1   1                              1|\n|    1   1                              1|\n|    1   1                              1|\n|1111111111111111111111111111111111111111|\n+----------------------------------------+"
  }
};


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/levels.coffee","/src")

},{"_process":3,"buffer":5}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Engine, engine;

Engine = require('src/engine');

engine = new Engine('game');

window.game = engine.game;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/main.coffee","/src")

},{"_process":3,"buffer":5,"src/engine":7}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Deodorant, types;

Deodorant = require('deodorant');

types = new Deodorant('debug');

types.addFilter('isInteger', function(value) {
  return value % 1 === 0;
});

types.addAlias('Integer', 'Number|isInteger');

types.addAlias('Point', ['Number', 'Number']);

module.exports = types;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/src/types.coffee","/node_modules/src")

},{"_process":3,"buffer":5,"deodorant":1}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2Rlb2RvcmFudC9kZW9kb3JhbnQuanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIi9ob21lL2R2Y29sZ2FuL3Byb2plY3RzL2x1ZHVtZGFyZTM1L3NyYy9lbmdpbmUuY29mZmVlIiwiL2hvbWUvZHZjb2xnYW4vcHJvamVjdHMvbHVkdW1kYXJlMzUvc3JjL2xldmVscy5jb2ZmZWUiLCIvaG9tZS9kdmNvbGdhbi9wcm9qZWN0cy9sdWR1bWRhcmUzNS9zcmMvbWFpbi5jb2ZmZWUiLCIvaG9tZS9kdmNvbGdhbi9wcm9qZWN0cy9sdWR1bWRhcmUzNS9ub2RlX21vZHVsZXMvc3JjL3R5cGVzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaDdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDTEEsSUFBQSwyRUFBQTtFQUFBOztBQUFBLEtBQUEsR0FBUSxPQUFB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QSxLQUFLLENBQUMsUUFBTixDQUFlLE9BQWYsRUFBd0IsQ0FBQyxRQUFELEVBQVcsUUFBWCxDQUF4Qjs7QUFFQSxNQUFNLENBQUMsT0FBUCxHQUFpQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVvZG9yYW50ID0gZnVuY3Rpb24obW9kZSkge1xuICAgIHZhciBjaGVjayA9IChtb2RlID09PSAnZGVidWcnKTtcbiAgICB2YXIgYWxpYXNlcyA9IHt9O1xuICAgIHZhciBmaWx0ZXJzID0ge307XG5cbiAgICBmdW5jdGlvbiB2YWx1ZVRvU3RyaW5nKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiAnTmFOJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdyYXAgaW4gdHJ5IGNhdGNoIGluIGNhc2Ugb2Ygc29tZXRoaW5nIGxpa2UgYSBjaXJjdWxhciBvYmplY3RcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHJpcEFubm90YXRpb24odHlwZSkge1xuICAgICAgICAvLyBJZiB0aGUgdmFsdWUgZW5kcyB3aXRoIGEgPyBvciAqIGl0IGlzIGEgbnVsbGFibGUgb3Igb3B0aW9uYWwgdmFsdWVcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gUG9zc2libGUgY2FzZXM6XG4gICAgICAgICAgICAvLyAxKSBhIHBsYWluIHR5cGUsIHJldHVybiB0aGUgdHlwZSBhbmQgbm8gYW5ub3RhdGlvbnNcbiAgICAgICAgICAgIC8vIDIpIGEgdHlwZSB3aXRoIGEgPyBvciAqLCByZXR1cm4gdGhlIHR5cGUgYW5kIHRoZSBzeW1ib2xcbiAgICAgICAgICAgIC8vIDMpIGEgdHlwZSB3aXRoIGZpbHRlcnMsIHJldHVybiB0aGUgdHlwZSwgYW4gZW1wdHkgc3ltYm9sLCBhbmQgYW4gYXJyYXkgb2YgZmlsdGVyc1xuICAgICAgICAgICAgLy8gNCkgYSB0eXBlIHdpdGggYSA/IG9yICogYW5kIGZpbHRlcnMsIHJldHVybiB0aGUgdHlwZSwgdGhlIHN5bWJvbCwgYW5kIGFuIGFycmF5IG9mIGZpbHRlcnNcbiAgICAgICAgICAgIC8vIFJldHVybiBpdCBsaWtlIHRoaXM6IFt0eXBlLCBbc3ltYm9sLCBmaWx0ZXJzLi4uXV0gZm9yIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhID8gb3IgKiBpbiB0aGUgYW5ub3RhdGlvbiwgdGhhdCBpcyB0aGUgc3RhcnQgb2YgdGhlIGFubm90YXRpb25cbiAgICAgICAgICAgIHZhciBxSWR4ID0gdHlwZS5pbmRleE9mKCc/Jyk7XG4gICAgICAgICAgICBpZiAocUlkeCA8IDApIHtcbiAgICAgICAgICAgICAgICBxSWR4ID0gdHlwZS5pbmRleE9mKCcqJyk7XG4gICAgICAgICAgICAgICAgaWYgKHFJZHggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHFJZHggPSB0eXBlLmluZGV4T2YoJ3wnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocUlkeCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICAgICAgdHlwZS5zbGljZSgwLCBxSWR4KSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZS5zbGljZShxSWR4KS5zcGxpdCgnfCcpXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBbdHlwZSwgW11dO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSBsYXN0IGVsZW1lbnQgaXMgdGhlIGZpbHRlciB0b2tlbiwgdXNlIHRoYXRcbiAgICAgICAgICAgIGxhc3RFbGVtZW50ID0gdHlwZVt0eXBlLmxlbmd0aCAtIDFdXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxhc3RFbGVtZW50ID09PSAnc3RyaW5nJyAmJiBsYXN0RWxlbWVudC5pbmRleE9mKCdbXScpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYW5ub3RhdGlvbiA9IHR5cGVbdHlwZS5sZW5ndGggLSAxXS5zbGljZSgyKTtcbiAgICAgICAgICAgICAgICB0eXBlID0gdHlwZS5zbGljZSgwLCAtMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt0eXBlLCBhbm5vdGF0aW9uLnNwbGl0KCd8JyldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt0eXBlLCBbXV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSAhPT0gbnVsbCAmJiB0eXBlb2YgdHlwZSA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgdHlwZUtleSBpbiB0eXBlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVLZXkuaW5kZXhPZigne30nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhbm5vdGF0aW9uID0gdHlwZUtleS5zbGljZSgyKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHR5cGVbdHlwZUtleV07XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0eXBlLCBhbm5vdGF0aW9uLnNwbGl0KCd8JyldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbdHlwZSwgW11dO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFt0eXBlLCBbXV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWx1ZXNUb1N0cmluZyh2YWx1ZXMpIHtcbiAgICAgICAgdmFyIHN0cnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgc3Rycy5wdXNoKHZhbHVlVG9TdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RycztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0ZpbHRlcih2YWx1ZSwgZmlsdGVyKSB7XG4gICAgICAgIHZhciBwaWVjZXMgPSBmaWx0ZXIuc3BsaXQoJzonKTtcbiAgICAgICAgdmFyIGZpbHRlck5hbWUgPSBwaWVjZXNbMF07XG4gICAgICAgIHZhciBmbiA9IGZpbHRlcnNbZmlsdGVyTmFtZV07XG4gICAgICAgIGlmICghZm4odmFsdWUsIHBpZWNlc1sxXSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcih2YWx1ZSArICcgZG9lcyBub3QgcGFzcyBmaWx0ZXIgJyArIGZpbHRlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0ZpbHRlcnModmFsdWUsIHRoZXNlRmlsdGVycykge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8dGhlc2VGaWx0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjaGVja0ZpbHRlcih2YWx1ZSwgdGhlc2VGaWx0ZXJzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrUmVnRXhwVHlwZSh2YWx1ZSwgdHlwZSkge1xuICAgICAgICBpZiAoIXR5cGUudGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcih2YWx1ZSArICcgZG9lcyBub3QgbWF0Y2ggJyArIHR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tUdXBsZVR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHZhbHVlICsgJyBpcyBub3QgYSBKUyBhcnJheSBvZiB0eXBlICcgKyB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgZWFjaCB0eXBlIGluIHRoZSB0dXBsZSwgbWF0Y2ggdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHR5cGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdWJUeXBlID0gdHlwZVtpXTtcbiAgICAgICAgICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgaWYgKCFjaGVja1ZhbHVlc1R5cGUoc3ViVmFsdWUsIHN1YlR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN1YlZhbHVlICsgJyBkb2VzIG5vdCBtYXRjaCAnICsgc3ViVHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0FycmF5VHlwZSh2YWx1ZSwgdHlwZSkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmFsdWUgKyAnIGlzIG5vdCBhIEpTIGFycmF5IG9mIHR5cGUgJyArIHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBlYWNoIGVsZW1lbnQgb2YgdGhlIHZhbHVlLCBjb21wYXJpbmcgaXRcbiAgICAgICAgLy8gd2l0aCB0aGUgb25lIHR5cGVcbiAgICAgICAgdmFyIHN1YlR5cGUgPSB0eXBlWzBdO1xuICAgICAgICBmb3IgKGk9MDsgaTx2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHN1YlZhbHVlID0gdmFsdWVbaV07XG4gICAgICAgICAgICBpZiAoIWNoZWNrVmFsdWVzVHlwZShzdWJWYWx1ZSwgc3ViVHlwZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3ViVmFsdWUgKyAnIGRvZXMgbm90IG1hdGNoICcgKyBzdWJUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrU2luZ2xlVHlwZU9iamVjdFR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgdmFyIHN1YlR5cGUgPSB0eXBlWycqJ107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2hlY2tWYWx1ZXNUeXBlKHN1YlZhbHVlLCBzdWJUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGtleSArICcgaW4gb2JqZWN0IGRvZXMgbm90IG1hdGNoOiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrTXVsdGlwbGVUeXBlT2JqZWN0VHlwZSh2YWx1ZSwgdHlwZSkge1xuICAgICAgICAvLyBHbyB0aHJvdWdoIGVhY2gga2V5OnZhbHVlIHBhaXIgYW5kIG1ha2Ugc3VyZVxuICAgICAgICAvLyB0aGUga2V5IGlzIHByZXNlbnQgYW5kIHRoZSB0eXBlIGNoZWNrc1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdHlwZSkge1xuICAgICAgICAgICAgdmFyIHN1YlR5cGUgPSB0eXBlW2tleV07XG4gICAgICAgICAgICBpZiAodmFsdWVba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPYmplY3QgbWlzc2luZyBrZXkgJyArIGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjaGVja1ZhbHVlc1R5cGUoc3ViVmFsdWUsIHN1YlR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0tleSAnICsga2V5ICsgJyBkb2VzIG5vdCBtYXRjaDogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja09iamVjdFR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgLy8geycqJzogJ051bWJlcid9IG1lYW5zIGEgZGljdCBvZiBzdHJpbmcgdG8gTnVtYmVyIG9ubHlcbiAgICAgICAgaWYgKHR5cGVbJyonXSAmJiBPYmplY3Qua2V5cyh0eXBlKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNoZWNrU2luZ2xlVHlwZU9iamVjdFR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIG90aGVyd2lzZSB3ZSBhcmUgbG9va2luZyBmb3Igc3BlY2lmaWMga2V5c1xuICAgICAgICAvLyB7cG9zOiBbJ051bWJlcicsICdOdW1iZXInXSwgc2l6ZToge3dpZHRoOiAnTnVtYmVyJywgaGVpZ2h0OiAnTnVtYmVyJ30sIHVzZXJuYW1lOiAnU3RyaW5nJywgaXNMb2dnZWRJbjogJ0Jvb2xlYW4nfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNoZWNrTXVsdGlwbGVUeXBlT2JqZWN0VHlwZSh2YWx1ZSwgdHlwZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1NpbXBsZVR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgLy8gQ2xlYW4gdXAgYW55IGV4dHJhbmVvdXMgc3BhY2VzXG4gICAgICAgIHR5cGUgPSB0eXBlLnJlcGxhY2UoLyAvZywgJycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjcnkgaWYgTmFOLiBOb2JvZHkgd291bGQgZXZlciB3YW50IE5hTi4gV2h5IGlzIE5hTiBpbiB0aGUgbGFuZ3VhZ2U/XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTmFOIGRvZXMgbm90IG1hdGNoIHR5cGUgJyArIHR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSBkb24ndCBjcnkgZm9yIHVuZGVmaW5lZCBpZiB0eXBlIGlzIFZvaWRcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlICE9PSAnVm9pZCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZGVmaW5lZCBkb2VzIG5vdCBtYXRjaCB0eXBlICcgKyB0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE51bGwgaXMgc2ltcGxlIGVub3VnaCwgdGhhbmsgZ29vZG5lc3MgZm9yIHRyaXBsZS1zdHlsZSBlcXVhbHNcbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsICYmIHR5cGUgPT09ICdOdWxsJykgcmV0dXJuO1xuXG4gICAgICAgIC8vIHR5cGVvZiB3b3JrcyBhcyBpdCBzaG91bGQgZm9yIGFsbCBvZiB0aGVzZSB0eXBlcyB5YXlcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdHlwZSA9PT0gJ051bWJlcicpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdHlwZSA9PT0gJ1N0cmluZycpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nICYmIHR5cGUgPT09ICdCb29sZWFuJykgcmV0dXJuO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbicgJiYgdHlwZSA9PT0gJ0Z1bmN0aW9uJykgcmV0dXJuO1xuXG4gICAgICAgIC8vIFRoZSBBbnkgdHlwZSB3aWxsIGNyeSBvbiB1bmRlZmluZWQgb3IgTmFOIGJ1dCB3aWxsIGFjY2VwdCBhbnl0aGluZyBlbHNlXG4gICAgICAgIGlmICh0eXBlID09PSAnQW55JyB8fCB0eXBlID09PSAnVm9pZCcpIHJldHVybjtcblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmFsdWUgKyAnIGRvZXMgbm90IG1hdGNoIHR5cGUgJyArIHR5cGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrVmFsdWVzVHlwZSh2YWx1ZSwgdHlwZSkge1xuICAgICAgICB2YXIgcmVzID0gc3RyaXBBbm5vdGF0aW9uKHR5cGUpO1xuICAgICAgICB0eXBlID0gcmVzWzBdO1xuICAgICAgICB2YXIgYW5ub3RhdGlvbiA9IHJlc1sxXTtcbiAgICAgICAgdmFyIGlzTnVsbGFibGUgPSBhbm5vdGF0aW9uWzBdID09PSAnPyc7XG4gICAgICAgIHZhciBpc1VuZGVmaW5lZGFibGUgPSBhbm5vdGF0aW9uWzBdID09PSAnKic7XG4gICAgICAgIHZhciB0aGVzZUZpbHRlcnMgPSBhbm5vdGF0aW9uLnNsaWNlKDEsIGFubm90YXRpb24ubGVuZ3RoKTtcblxuICAgICAgICAvLyBEbyBudWxsYWJsZSBjaGVja1xuICAgICAgICBpZiAoaXNOdWxsYWJsZSAmJiB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1VuZGVmaW5lZGFibGUgJiYgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoZXNlRmlsdGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjaGVja0ZpbHRlcnModmFsdWUsIHRoZXNlRmlsdGVycyk7XG4gICAgICAgIH1cblxuICAgICAgICAvL1Bvc2l0aXZlSW50ZWdlciAtPiBJbnRlZ2VyfGd0ZTowIC0+IE51bWJlcnxpc0ludGVnZXJ8Z3RlOjBcblxuICAgICAgICAvLyBSZXBsYWNlIGFueSBhbGlhc2VzIHdpdGggYSBkZWVwIGNvcHlcbiAgICAgICAgLy8gc28gd2UgY2FuIGRvIGZ1cnRoZXIgbW9kaWZpY2F0aW9ucywgYW5kIHJlY3Vyc2VcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyAmJiB0eXBlIGluIGFsaWFzZXMpIHtcbiAgICAgICAgICAgIHR5cGUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGFsaWFzZXNbdHlwZV0pKTtcbiAgICAgICAgICAgIGNoZWNrVmFsdWVzVHlwZSh2YWx1ZSwgdHlwZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIENoZWNrIHJlZ2V4cHNcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0eXBlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgICAgICAgIGNoZWNrUmVnRXhwVHlwZSh2YWx1ZSwgdHlwZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBhcnJheXMgYW5kIHR1cGxlc1xuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHR5cGUpKSB7XG4gICAgICAgICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIG1ha2UgdGhpcyBzaG93IGEgYmV0dGVyIGVycm9yIG1lc3NhZ2Ugc29tZWhvd1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIC8vIEFycmF5IG9mIGFsbCB0aGUgc2FtZSB0eXBlIG9yIGVtcHR5XG4gICAgICAgICAgICAgICAgLy8gWydOdW1iZXInXSBbJ1N0cmluZyddXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tBcnJheVR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUdXBsZSAoYXJyYXkgaW4gSlMpIG9mIGEgZml4ZWQgbnVtYmVyIG9mIGRpZmZlcmVudCB0eXBlcyxcbiAgICAgICAgICAgICAgICAvLyBhdCBsZWFzdCAyICgxLXR1cGxlIHdvdWxkIGJlIHRoZSBzYW1lIHN5bnRheCBhcyBhcnJheVxuICAgICAgICAgICAgICAgIC8vIG9mIHNhbWUgdHlwZSwgYnV0IGlzIGFsc28gbW9zdGx5IHVzZWxlc3MgYW55d2F5XG4gICAgICAgICAgICAgICAgLy8gWydOdW1iZXInLCBTdHJpbmcsIEJvb2xlYW5dJ1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJyID0gY2hlY2tUdXBsZVR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgb2JqZWN0c1xuICAgICAgICBlbHNlIGlmICh0eXBlICE9PSBudWxsICYmIHR5cGVvZiB0eXBlID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjaGVja09iamVjdFR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgc2ltcGxlIHZhbHVlc1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNoZWNrU2ltcGxlVHlwZSh2YWx1ZSwgdHlwZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0Z1bmN0aW9uKHNpZ25hdHVyZSwgZm4sIGZuTmFtZSkge1xuICAgICAgICBpZiAoIWNoZWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBNYWtlIGEgbW9yZSByb2J1c3QgY2hlY2tlciBmb3IgZXJyb3JzIGluIHR5cGUgc2lnbmF0dXJlc1xuICAgICAgICAvL2ZvciAodmFyIGo9MDsgajxzaWduYXR1cmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgLy8gICAgdmFyIHR5cGUgPSBzaWduYXR1cmVbal07XG4gICAgICAgIC8vICAgIGlmICgodHlwZW9mIHR5cGUpICE9PSAnc3RyaW5nJykge1xuICAgICAgICAvLyAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUgJyArIHR5cGUpO1xuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vfVxuXG4gICAgICAgIGlmIChmbk5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGZuLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBmbk5hbWUgPSBmbi5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm5OYW1lID0gJ2Fub255bW91cyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldHVyblR5cGUgPSBzaWduYXR1cmVbc2lnbmF0dXJlLmxlbmd0aC0xXTtcbiAgICAgICAgdmFyIGFyZ1R5cGVzID0gc2lnbmF0dXJlLnNsaWNlKDAsIHNpZ25hdHVyZS5sZW5ndGggLSAxKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9ICgxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW10pO1xuXG4gICAgICAgICAgICAvLyBDaGVjayB0aGF0IHdlIGhhdmUgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICAgICAgICAgICAgLy8gT3B0aW9uYWwgcGFyYW1ldGVycyBtYWtlIHRoaXMgY2hlY2sgaGFyZGVyLCBkbyB3ZSBhY3R1YWxseSBuZWVkIGl0IHRob3VnaD9cbiAgICAgICAgICAgIC8vaWYgKGFyZ3MubGVuZ3RoICE9PSBzaWduYXR1cmUubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgLy8gICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgZnVuY3Rpb24gXCInICsgZm5OYW1lICsgJ1wiOiBFeHBlY3RlZCAnICsgKHNpZ25hdHVyZS5sZW5ndGggLSAxKSArICcsIGJ1dCBnb3QgJyArIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBlYWNoIGFyZ3VtZW50J3MgdHlwZVxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPGFyZ1R5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ1R5cGUgPSBhcmdUeXBlc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnc1tpXTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVmFsdWVzVHlwZShhcmcsIGFyZ1R5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Z1bmN0aW9uIFwiJyArIGZuTmFtZSArICdcIiBhcmd1bWVudCAnICsgaSArICcgZG9lcyBub3QgbWF0Y2g6ICcgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWN0dWFsbHkgY2FsbCB0aGUgb3JpZ2luYWwgZnVuY3Rpb25cbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gZm4uYXBwbHkobnVsbCwgYXJncyk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIHJldHVybiB2YWx1ZSB0eXBlXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNoZWNrVmFsdWVzVHlwZShyZXR1cm5WYWx1ZSwgcmV0dXJuVHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRnVuY3Rpb24gXCInICsgZm5OYW1lICsgJ1wiIHJldHVybiB2YWx1ZSBkb2VzIG5vdCBtYXRjaDogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WYWx1ZTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2hlY2tNb2R1bGUoc3BlYywgdGhpc18pIHtcbiAgICAgICAgdmFyIHNpZ25hdHVyZXMgPSB7fTtcbiAgICAgICAgdmFyIGZucyA9IHt9O1xuICAgICAgICB2YXIgdHlwZWRNb2R1bGUgPSB7fTtcblxuICAgICAgICAvLyBQYXJzZSBvdXQgdGhlIG1vZHVsZSdzIHR5cGUgc2lnbmF0dXJlcyBhbmQgZnVuY3Rpb25zXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcGVjKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzcGVjW2tleV07XG4gICAgICAgICAgICBpZiAoa2V5W2tleS5sZW5ndGgtMV0gPT09ICdfJykge1xuICAgICAgICAgICAgICAgIHNpZ25hdHVyZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYWxzbyBhIHR5cGUgc2lnbmF0dXJlIGhvbGQgb24gdG8gdGhpcyBmbixcbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UganVzdCBwdXQgaXQgaW4gdGhlIG5ldyBtb2R1bGUgYXMgaXNcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmJpbmQodHlwZWRNb2R1bGUpO1xuICAgICAgICAgICAgICAgIGlmIChzcGVjWyhrZXkgKyAnXycpXSkge1xuICAgICAgICAgICAgICAgICAgICBmbnNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZWRNb2R1bGVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGVkTW9kdWxlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gV3JhcCBlYWNoIGZ1bmN0aW9uIGluIHRoZSBtb2R1bGVcbiAgICAgICAgZm9yICh2YXIgZm5OYW1lIGluIGZucykge1xuICAgICAgICAgICAgdmFyIGZuID0gZm5zW2ZuTmFtZV07XG4gICAgICAgICAgICB2YXIgc2lnbmF0dXJlID0gc2lnbmF0dXJlc1tmbk5hbWUgKyAnXyddO1xuICAgICAgICAgICAgdHlwZWRNb2R1bGVbZm5OYW1lXSA9IGNoZWNrRnVuY3Rpb24oc2lnbmF0dXJlLCBmbiwgZm5OYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0eXBlZE1vZHVsZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0NsYXNzKGNsYXNzXykge1xuICAgICAgICBpZiAoIWNoZWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xhc3NfO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmYWN0b3J5ID0gZnVuY3Rpb24oYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNiwgYXJnNywgYXJnOCwgYXJnOSwgYXJnMTApIHtcbiAgICAgICAgICAgIHJldHVybiBjaGVja01vZHVsZShuZXcgY2xhc3NfKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYsIGFyZzcsIGFyZzgsIGFyZzksIGFyZzEwKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdjb25zdHJ1Y3Rvcl8nIGluIGNsYXNzXy5wcm90b3R5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGVja0Z1bmN0aW9uKGNsYXNzXy5wcm90b3R5cGUuY29uc3RydWN0b3JfLCBmYWN0b3J5LCAnY29uc3RydWN0b3InKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkQWxpYXMobmFtZSwgZXhwYW5zaW9uKSB7XG4gICAgICAgIGFsaWFzZXNbbmFtZV0gPSBleHBhbnNpb247XG4gICAgfVxuICAgIGZ1bmN0aW9uIGFkZEZpbHRlcihuYW1lLCBmbikge1xuICAgICAgICBmaWx0ZXJzW25hbWVdID0gZm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tTaWduYXR1cmVGb3JWYWx1ZXMoc2lnbmF0dXJlLCB2YWx1ZXMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFyZ1ZhbHVlcyA9IHZhbHVlcy5zbGljZSgwLCB2YWx1ZXMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICB2YXIgcmV0dXJuVmFsdWUgPSB2YWx1ZXNbdmFsdWVzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmbiA9IGNoZWNrRnVuY3Rpb24oc2lnbmF0dXJlLCBmbik7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdWYWx1ZXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2hlY2tGdW5jdGlvbjogY2hlY2tGdW5jdGlvbixcbiAgICAgICAgY2hlY2tNb2R1bGU6IGNoZWNrTW9kdWxlLFxuICAgICAgICBjaGVja0NsYXNzOiBjaGVja0NsYXNzLFxuICAgICAgICBhZGRBbGlhczogYWRkQWxpYXMsXG4gICAgICAgIGFkZEZpbHRlcjogYWRkRmlsdGVyLFxuICAgICAgICBjaGVja1NpZ25hdHVyZUZvclZhbHVlczogY2hlY2tTaWduYXR1cmVGb3JWYWx1ZXNcbiAgICB9O1xuXG59O1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBtb2R1bGUgIT0gbnVsbCAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRGVvZG9yYW50O1xufVxuZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBEZW9kb3JhbnQ7XG4gICAgfSk7XG59XG5lbHNlIHtcbiAgICB3aW5kb3cuRGVvZG9yYW50ID0gRGVvZG9yYW50O1xufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxuZnVuY3Rpb24gaW5pdCAoKSB7XG4gIHZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgbG9va3VwW2ldID0gY29kZVtpXVxuICAgIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxuICB9XG5cbiAgcmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG4gIHJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xufVxuXG5pbml0KClcblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICBwbGFjZUhvbGRlcnMgPSBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG5cbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIGFyciA9IG5ldyBBcnIobGVuICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgLy8gQXZvaWQgZ29pbmcgdGhyb3VnaCBhbiBBcmd1bWVudHNBZGFwdG9yVHJhbXBvbGluZSBpbiB0aGUgY29tbW9uIGNhc2UuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGFyZ3VtZW50c1sxXSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcpXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwXG4gICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWRcbiAgfVxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG4vLyBUT0RPOiBMZWdhY3ksIG5vdCBuZWVkZWQgYW55bW9yZS4gUmVtb3ZlIGluIG5leHQgbWFqb3IgdmVyc2lvbi5cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAob2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gZnJvbVR5cGVkQXJyYXkodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAodGhhdCwgYXJyYXkpIHtcbiAgYXJyYXkuYnl0ZUxlbmd0aCAvLyB0aGlzIHRocm93cyBpZiBgYXJyYXlgIGlzIG5vdCBhIHZhbGlkIEFycmF5QnVmZmVyXG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbVR5cGVkQXJyYXkodGhhdCwgbmV3IFVpbnQ4QXJyYXkoYXJyYXkpKVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbiAgQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgICAvLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgICB2YWx1ZTogbnVsbCxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG4gIH1cbn0gZWxzZSB7XG4gIC8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG4gIEJ1ZmZlci5wcm90b3R5cGUubGVuZ3RoID0gdW5kZWZpbmVkXG4gIEJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG59XG5cbmZ1bmN0aW9uIGFsbG9jYXRlICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgfVxuXG4gIHZhciBmcm9tUG9vbCA9IGxlbmd0aCAhPT0gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplID4+PiAxXG4gIGlmIChmcm9tUG9vbCkgdGhhdC5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdCBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9ICcnICsgc3RyaW5nXG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAvLyBEZXByZWNhdGVkXG4gICAgICBjYXNlICdyYXcnOlxuICAgICAgY2FzZSAncmF3cyc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgc3RhcnQgPSBzdGFydCB8IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kIHwgMFxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG4gIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiAnJ1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCBhbmQgYGlzLWJ1ZmZlcmAgKGluIFNhZmFyaSA1LTcpIHRvIGRldGVjdFxuLy8gQnVmZmVyIGluc3RhbmNlcy5cbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGggfCAwXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAgIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICBpZiAobmV3QnVmLmxlbmd0aCkgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsInR5cGVzID0gcmVxdWlyZSgnc3JjL3R5cGVzJylcbmxldmVscyA9IHJlcXVpcmUoJ3NyYy9sZXZlbHMnKVxuXG5TQ1JFRU5fV0lEVEggPSAxMjgwXG5TQ1JFRU5fSEVJR0hUID0gNzA0XG5USUxFX1NJWkUgPSAzMlxuXG5cbmNsYXNzIFBsYXllclxuICAgIGNvbnN0cnVjdG9yOiAoQGdhbWUsIHN0YXJ0WCwgc3RhcnRZKSAtPlxuICAgICAgICBAc3ByaXRlID0gQGdhbWUuYWRkLnNwcml0ZShzdGFydFgsIHN0YXJ0WSwgJ3BsYXllcicpXG4gICAgICAgIEBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZShAc3ByaXRlKVxuICAgICAgICBAc3ByaXRlLmJvZHkuZml4ZWRSb3RhdGlvbiA9IHRydWVcbiAgICAgICAgQHNwcml0ZS5ib2R5LmNvbGxpZGVXb3JsZEJvdW5kcyA9IGZhbHNlXG4gICAgICAgIEBnYW1lLmdyb3Vwcy5hY3RvcnMuYWRkKEBzcHJpdGUpXG5cbiAgICAgICAgQGhlYWx0aCA9IDEwXG4gICAgICAgIEBoZWFydHMgPSBbXVxuICAgICAgICBmb3IgaSBpbiBbMC4uLjEwXVxuICAgICAgICAgICAgaGVhcnQgPSBAZ2FtZS5hZGQuc3ByaXRlKDQ4ICsgaSAqIDY0LCA0OCwgJ2hlYXJ0JylcbiAgICAgICAgICAgIEBoZWFydHMucHVzaChoZWFydClcbiAgICAgICAgICAgIEBnYW1lLmdyb3Vwcy51aS5hZGQoaGVhcnQpXG5cbiAgICBodXJ0OiAtPlxuICAgICAgICBAaGVhbHRoLS1cbiAgICAgICAgZm9yIGhlYXJ0LCBpIGluIEBoZWFydHNcbiAgICAgICAgICAgIGhlYXJ0LnZpc2libGUgPSBpIDwgQGhlYWx0aFxuXG5cbmNsYXNzIEJvc3NcbiAgICBjb25zdHJ1Y3RvcjogKEBnYW1lLCBzdGFydFgsIHN0YXJ0WSwga2V5KSAtPlxuICAgICAgICBAc3ByaXRlID0gQGdhbWUuYWRkLnNwcml0ZShzdGFydFgsIHN0YXJ0WSwga2V5KVxuICAgICAgICBAZ2FtZS5waHlzaWNzLmFyY2FkZS5lbmFibGUoQHNwcml0ZSlcbiAgICAgICAgQHNwcml0ZS5ib2R5LmJvdW5jZS5zZXQoMC43KVxuICAgICAgICBAc3ByaXRlLmJvZHkuZHJhZy5zZXQoNDApXG5cbiAgICByYW5kb21Cb3VuY2U6IC0+XG4gICAgICAgIEBzcHJpdGUuYm9keS52ZWxvY2l0eS55ID0gLTgwMFxuICAgICAgICBAc3ByaXRlLmJvZHkudmVsb2NpdHkueCA9IE1hdGgucmFuZG9tKCkgKiA4MDAgLSA0MDBcblxuICAgIGJvdW5jZUxlZnQ6IC0+XG4gICAgICAgIEBzcHJpdGUuYm9keS52ZWxvY2l0eS55ID0gLTgwMFxuICAgICAgICBAc3ByaXRlLmJvZHkudmVsb2NpdHkueCA9IC00MDBcblxuICAgIGJvdW5jZVJpZ2h0OiAtPlxuICAgICAgICBAc3ByaXRlLmJvZHkudmVsb2NpdHkueSA9IC04MDBcbiAgICAgICAgQHNwcml0ZS5ib2R5LnZlbG9jaXR5LnggPSA0MDBcbiAgICAgICAgXG5cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlcy5jaGVja0NsYXNzIGNsYXNzIEVuZ2luZVxuICAgIGNvbnN0cnVjdG9yOiAoQGVsZW1lbnRJZCkgLT5cbiAgICAgICAgQGdhbWUgPSBuZXcgUGhhc2VyLkdhbWUoXG4gICAgICAgICAgICBTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFRcbiAgICAgICAgICAgIFBoYXNlci5BVVRPLCBAZWxlbWVudElkXG4gICAgICAgICAgICB7cHJlbG9hZDogQHByZWxvYWQsIGNyZWF0ZTogQGNyZWF0ZSwgdXBkYXRlOiBAdXBkYXRlfVxuICAgICAgICApXG5cbiAgICBkb0NvbW1hbmQ6IChjb21tYW5kKSAtPlxuXG4gICAgcHJlbG9hZDogPT5cbiAgICAgICAgZm9yIGtleSwgbGV2ZWwgb2YgbGV2ZWxzXG4gICAgICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKGxldmVsLmJhY2tncm91bmQsIFwiYmFja2dyb3VuZHMvI3tsZXZlbC5iYWNrZ3JvdW5kfS5wbmdcIilcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgncGxheWVyJywgJ3BsYXllci5wbmcnKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdoZWFydCcsICdoZWFydC5wbmcnKVxuICAgICAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCd0b2lsZXQnLCAndG9pbGV0LnBuZycsIDEzMCwgMjg0LCAyKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCd0aWxlcycsICd0aWxlcy5wbmcnKVxuICAgICAgICBAcGFyc2VMZXZlbHMoKVxuXG4gICAgcGFyc2VMZXZlbHM6IC0+XG4gICAgICAgIGZvciBrZXksIGxldmVsIG9mIGxldmVsc1xuICAgICAgICAgICAgbGV2ZWwuY2FsbGJhY2sgPSBsZXZlbC5jYWxsYmFjaz8uYmluZChAKVxuICAgICAgICAgICAgbWFwRGF0YSA9IChmb3Igcm93RGF0YSwgcm93IGluIGxldmVsLnRpbGVzLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICAgICAgICAgICAgICBpZiByb3cgPT0gMCBvciByb3cgPT0gMjMgdGhlbiBjb250aW51ZVxuICAgICAgICAgICAgICAgIChmb3IgdGlsZVN0ciwgY29sIGluIHJvd0RhdGEuc3BsaXQoJycpXG4gICAgICAgICAgICAgICAgICAgIGlmIGNvbCA9PSAwIG9yIGNvbCA9PSA0MSB0aGVuIGNvbnRpbnVlXG4gICAgICAgICAgICAgICAgICAgIGlmIHRpbGVTdHIgPT0gJyAnXG4gICAgICAgICAgICAgICAgICAgICAgICB0aWxlID0gJzAnXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbGUgPSBwYXJzZUludCh0aWxlU3RyKVxuICAgICAgICAgICAgICAgICAgICB0aWxlXG4gICAgICAgICAgICAgICAgKS5qb2luKCcsJylcbiAgICAgICAgICAgICkuam9pbignXFxuJylcbiAgICAgICAgICAgIEBnYW1lLmxvYWQudGlsZW1hcChrZXksIG51bGwsIG1hcERhdGEpXG5cbiAgICBjcmVhdGU6ID0+XG5cbiAgICAgICAgQHJvb21Db2wgPSAxXG4gICAgICAgIEByb29tUm93ID0gMFxuXG4gICAgICAgIEBrZXlzID0gQGdhbWUuaW5wdXQua2V5Ym9hcmQuYWRkS2V5c1xuICAgICAgICAgICAgY29tbWE6IFBoYXNlci5LZXlDb2RlLkNPTU1BXG4gICAgICAgICAgICBvOiBQaGFzZXIuS2V5Q29kZS5PXG4gICAgICAgICAgICBhOiBQaGFzZXIuS2V5Q29kZS5BXG4gICAgICAgICAgICBlOiBQaGFzZXIuS2V5Q29kZS5FXG4gICAgICAgICAgICB3OiBQaGFzZXIuS2V5Q29kZS5XXG4gICAgICAgICAgICBzOiBQaGFzZXIuS2V5Q29kZS5TXG4gICAgICAgICAgICBkOiBQaGFzZXIuS2V5Q29kZS5EXG4gICAgICAgICAgICBzcGFjZTogUGhhc2VyLktleUNvZGUuU1BBQ0VCQVJcbiAgICAgICAgICAgIHByZXZXZWFwb246IFBoYXNlci5LZXlDb2RlLkxFRlRcbiAgICAgICAgICAgIG5leHRXZWFwb246IFBoYXNlci5LZXlDb2RlLlJJR0hUXG4gICAgICAgICAgICBfMTogUGhhc2VyLktleUNvZGUuT05FXG4gICAgICAgICAgICBfMjogUGhhc2VyLktleUNvZGUuVFdPXG4gICAgICAgICAgICBfMzogUGhhc2VyLktleUNvZGUuVEhSRUVcbiAgICAgICAgICAgIF80OiBQaGFzZXIuS2V5Q29kZS5GT1VSXG4gICAgICAgICAgICBfNTogUGhhc2VyLktleUNvZGUuRklWRVxuICAgICAgICAgICAgXzY6IFBoYXNlci5LZXlDb2RlLlNJWFxuICAgICAgICAgICAgXzc6IFBoYXNlci5LZXlDb2RlLlNFVkVOXG4gICAgICAgICAgICBfODogUGhhc2VyLktleUNvZGUuRUlHSFRcbiAgICAgICAgICAgIF85OiBQaGFzZXIuS2V5Q29kZS5OSU5FXG5cbiAgICAgICAgQGdhbWUudGltZS5kZXNpcmVkRnBzID0gNjBcbiAgICAgICAgQGdhbWUucGh5c2ljcy5zdGFydFN5c3RlbShQaGFzZXIuUGh5c2ljcy5BUkNBREUpXG4gICAgICAgIEBnYW1lLnBoeXNpY3MuYXJjYWRlLmdyYXZpdHkueSA9IDk4MVxuXG4gICAgICAgIEBnYW1lLmdyb3VwcyA9IHt9XG4gICAgICAgIEBnYW1lLmdyb3Vwcy5iYWNrZ3JvdW5kID0gQGdhbWUuYWRkLmdyb3VwKClcbiAgICAgICAgQGdhbWUuZ3JvdXBzLmFjdG9ycyA9IEBnYW1lLmFkZC5ncm91cCgpXG4gICAgICAgIEBnYW1lLmdyb3Vwcy51aSA9IEBnYW1lLmFkZC5ncm91cCgpXG5cbiAgICAgICAgQHBsYXllciA9IG5ldyBQbGF5ZXIoQGdhbWUsIDYwMCwgNDAwKVxuXG4gICAgICAgIEBsb2FkTWFwKClcblxuICAgICAgICBAY3VycmVudEJvc3MgPSBuZXcgQm9zcyhAZ2FtZSwgNDAwLCAzMDAsICd0b2lsZXQnKVxuXG4gICAgICAgICNAcGxheWVyLmJvZHkuc2V0U2l6ZSgzMiwgNjQsIDAsIDApXG5cbiAgICAgICAgI0Bmb250U3R5bGUgPVxuICAgICAgICAjICAgIGZvbnQ6IFwiMjZweCBNb25vc3BhY2VcIlxuICAgICAgICAjICAgIGZpbGw6IFwiI0Q3RDdEN1wiXG4gICAgICAgICMgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAjICAgIGZvbnRXZWlnaHQ6ICdib2xkJ1xuICAgICAgICAjICAgIGJvdW5kc0FsaWduVjogJ21pZGRsZSdcbiAgICAgICAgI1xuICAgIGxvYWRNYXA6ID0+XG4gICAgICAgIGtleSA9IFwiI3tAcm9vbUNvbH14I3tAcm9vbVJvd31cIlxuICAgICAgICBsZXZlbCA9IGxldmVsc1trZXldXG5cbiAgICAgICAgaWYgQGJhY2tncm91bmQgdGhlbiBAYmFja2dyb3VuZC5kZXN0cm95KClcbiAgICAgICAgQGJhY2tncm91bmQgPSBAZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCBTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFQsIGxldmVsLmJhY2tncm91bmQpXG4gICAgICAgIEBnYW1lLmdyb3Vwcy5iYWNrZ3JvdW5kLmFkZChAYmFja2dyb3VuZClcblxuICAgICAgICBpZiBAbGF5ZXIgdGhlbiBAbGF5ZXIuZGVzdHJveSgpXG4gICAgICAgIEB0aWxlbWFwID0gQGdhbWUuYWRkLnRpbGVtYXAoa2V5LCBUSUxFX1NJWkUsIFRJTEVfU0laRSlcbiAgICAgICAgQHRpbGVtYXAuYWRkVGlsZXNldEltYWdlKCd0aWxlcycpXG4gICAgICAgIEB0aWxlbWFwLnNldENvbGxpc2lvbkJ5RXhjbHVzaW9uKFswXSlcbiAgICAgICAgQGxheWVyID0gQHRpbGVtYXAuY3JlYXRlTGF5ZXIoMClcbiAgICAgICAgQGxheWVyLnJlc2l6ZVdvcmxkKClcbiAgICAgICAgQGdhbWUuZ3JvdXBzLmJhY2tncm91bmQuYWRkKEBsYXllcilcblxuICAgICAgICBsZXZlbC5jYWxsYmFjaz8oQClcblxuICAgICAgICAjaWYgQGJhY2tncm91bmQyIHRoZW4gQGJhY2tncm91bmQyLmRlc3Ryb3koKVxuICAgICAgICAjQGJhY2tncm91bmQyID0gQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCBsZXZlbC5iYWNrZ3JvdW5kKVxuICAgICAgICAjQGJhY2tncm91bmQyLmJsZW5kTW9kZSA9IFBJWEkuYmxlbmRNb2Rlcy5PVkVSTEFZXG4gICAgXG4gICAgc3Bhd25BY3RvcjogKHgsIHkpIC0+XG5cbiAgICB1cGRhdGU6ID0+XG4gICAgICAgIEBnYW1lLnBoeXNpY3MuYXJjYWRlLmNvbGxpZGUoQHBsYXllci5zcHJpdGUsIEBsYXllcilcbiAgICAgICAgaWYgQGN1cnJlbnRCb3NzP1xuICAgICAgICAgICAgQGdhbWUucGh5c2ljcy5hcmNhZGUuY29sbGlkZShAY3VycmVudEJvc3Muc3ByaXRlLCBAbGF5ZXIpXG5cbiAgICAgICAgaWYgQHBsYXllci5zcHJpdGUueCA8IDBcbiAgICAgICAgICAgIGlmIGxldmVsc1tcIiN7QHJvb21Db2wtMX14I3tAcm9vbVJvd31cIl0/XG4gICAgICAgICAgICAgICAgQHBsYXllci5zcHJpdGUueCA9IFNDUkVFTl9XSURUSCAtIEBwbGF5ZXIuc3ByaXRlLndpZHRoIC0gMlxuICAgICAgICAgICAgICAgIEByb29tQ29sLS1cbiAgICAgICAgICAgICAgICBAbG9hZE1hcCgpXG4gICAgICAgIGVsc2UgaWYgQHBsYXllci5zcHJpdGUueCA+IFNDUkVFTl9XSURUSCAtIEBwbGF5ZXIuc3ByaXRlLndpZHRoXG4gICAgICAgICAgICBpZiBsZXZlbHNbXCIje0Byb29tQ29sKzF9eCN7QHJvb21Sb3d9XCJdP1xuICAgICAgICAgICAgICAgIEBwbGF5ZXIuc3ByaXRlLnggPSAyXG4gICAgICAgICAgICAgICAgQHJvb21Db2wrK1xuICAgICAgICAgICAgICAgIEBsb2FkTWFwKClcbiAgICAgICAgZWxzZSBpZiBAcGxheWVyLnNwcml0ZS55IDwgMFxuICAgICAgICAgICAgaWYgbGV2ZWxzW1wiI3tAcm9vbUNvbH14I3tAcm9vbVJvdy0xfVwiXT9cbiAgICAgICAgICAgICAgICBAcGxheWVyLnNwcml0ZS55ID0gU0NSRUVOX0hFSUdIVCAtIEBwbGF5ZXIuc3ByaXRlLmhlaWdodCAtIDJcbiAgICAgICAgICAgICAgICBAcm9vbVJvdy0tXG4gICAgICAgICAgICAgICAgQGxvYWRNYXAoKVxuICAgICAgICBlbHNlIGlmIEBwbGF5ZXIuc3ByaXRlLnkgPiBTQ1JFRU5fSEVJR0hUIC0gQHBsYXllci5zcHJpdGUuaGVpZ2h0XG4gICAgICAgICAgICBpZiBsZXZlbHNbXCIje0Byb29tQ29sfXgje0Byb29tUm93KzF9XCJdP1xuICAgICAgICAgICAgICAgIEBwbGF5ZXIuc3ByaXRlLnkgPSAyXG4gICAgICAgICAgICAgICAgQHJvb21Sb3crK1xuICAgICAgICAgICAgICAgIEBsb2FkTWFwKClcblxuICAgICAgICBAcGxheWVyLnNwcml0ZS5ib2R5LnZlbG9jaXR5LnggPSAwXG4gICAgICAgIGlmIEBwbGF5ZXIuc3ByaXRlLmJvZHkudmVsb2NpdHkueSA+IDQwMCB0aGVuIEBwbGF5ZXIuc3ByaXRlLmJvZHkudmVsb2NpdHkueSA9IDYwMFxuXG4gICAgICAgIGlmIEBrZXlzLmEuaXNEb3duXG4gICAgICAgICAgICBAcGxheWVyLnNwcml0ZS5ib2R5LnZlbG9jaXR5LnggPSAtNDAwXG4gICAgICAgIGlmIEBrZXlzLmUuaXNEb3duIG9yIEBrZXlzLmQuaXNEb3duXG4gICAgICAgICAgICBAcGxheWVyLnNwcml0ZS5ib2R5LnZlbG9jaXR5LnggPSA0MDBcbiAgICAgICAgaWYgQGtleXMuY29tbWEuaXNEb3duIG9yIEBrZXlzLncuaXNEb3duXG4gICAgICAgICAgICBAcGxheWVyLnNwcml0ZS5ib2R5LnZlbG9jaXR5LnkgPSAtNjAwXG5cbiAgICAgICAgaWYgQGtleXMuc3BhY2UuanVzdERvd25cbiAgICAgICAgICAgIEBwbGF5ZXIuaHVydCgpXG5cbiAgICAgICAgaWYgQGN1cnJlbnRCb3NzP1xuICAgICAgICAgICAgaWYgQGtleXMuXzEuanVzdERvd25cbiAgICAgICAgICAgICAgICBAY3VycmVudEJvc3MucmFuZG9tQm91bmNlKClcbiAgICAgICAgICAgIGlmIEBrZXlzLl8yLmp1c3REb3duXG4gICAgICAgICAgICAgICAgQGN1cnJlbnRCb3NzLmJvdW5jZUxlZnQoKVxuICAgICAgICAgICAgaWYgQGtleXMuXzMuanVzdERvd25cbiAgICAgICAgICAgICAgICBAY3VycmVudEJvc3MuYm91bmNlUmlnaHQoKVxuICAgICAgICB0b3RhbCA9IE1hdGguYWJzKEBjdXJyZW50Qm9zcy5zcHJpdGUuYm9keS52ZWxvY2l0eS54KSArIE1hdGguYWJzKEBjdXJyZW50Qm9zcy5zcHJpdGUuYm9keS52ZWxvY2l0eS55KVxuICAgICAgICBjb25zb2xlLmxvZyh0b3RhbClcbiAgICAgICAgaWYgdG90YWwgPCAxMDBcbiAgICAgICAgICAgIEBjdXJyZW50Qm9zcy5yYW5kb21Cb3VuY2UoKVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9XG4gICAgJzF4MCc6XG4gICAgICAgIGNhbGxiYWNrOiAtPlxuICAgICAgICAgICAgI2Jvc3MgPSBAZW5naW5lLnNwYXduQWN0b3IoNDAwLCAyMDApXG4gICAgICAgICAgICAjQGFjdG9yID0gQGdhbWUuYWRkLnNwcml0ZSg0MDAsIDIwMCwgJ3RvaWxldCcpXG4gICAgICAgICAgICAjQGFjdG9yLmFuaW1hdGlvbnMuYWRkKCdvcGVuJywgWzIsIDEsIDEsIDEsIDBdKVxuICAgICAgICAgICAgI0BhY3Rvci5hbmltYXRpb25zLmFkZCgnY2xvc2VkJywgWzAsIDEsIDIsIDIsIDIsIDEsIDJdKVxuICAgICAgICAgICAgI0BhY3Rvci5hbmltYXRpb25zLnBsYXkoJ29wZW4nKVxuICAgICAgICAgICAgI0BnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZShAYWN0b3IpXG4gICAgICAgICAgICAjQGFjdG9yLmJvZHkuYm91bmNlLnNldCgxLjApXG4gICAgICAgICAgICAjQGFjdG9yLnVwZGF0ZSA9ID0+XG4gICAgICAgICAgICAjICAgIGlmIEBhY3Rvci5ib2R5LnZlbG9jaXR5LnkgPiAwIGFuZCBAYWN0b3IuYW5pbWF0aW9ucy5jdXJyZW50QW5pbS5uYW1lID09ICdjbG9zZWQnXG4gICAgICAgICAgICAjICAgICAgICBAYWN0b3IuYW5pbWF0aW9ucy5wbGF5KCdvcGVuJylcbiAgICAgICAgICAgICMgICAgZWxzZSBpZiBAYWN0b3IuYm9keS52ZWxvY2l0eS55IDwgMCBhbmQgQGFjdG9yLmFuaW1hdGlvbnMuY3VycmVudEFuaW0ubmFtZSA9PSAnb3BlbidcbiAgICAgICAgICAgICMgICAgICAgIEBhY3Rvci5hbmltYXRpb25zLnBsYXkoJ2Nsb3NlZCcpXG4gICAgICAgICAgICAjcmV0dXJuIEBhY3RvclxuICAgICAgICAgICAgXG4gICAgICAgIGJhY2tncm91bmQ6ICdraXRjaGVuJ1xuICAgICAgICB0aWxlczogXCJcIlwiXG4rLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLStcbnwxMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExMTQ0NDQ0NDQgfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgMTExIDQ0NDQ0ICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgMTExMTEgICA0NCAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAxMTExMSAgIDQ0ICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAxMTExMTExICAgNDQgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgIDExMTExMTEgICA0NCAgIHxcbnwxMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExfFxuKy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0rXG4gICAgICAgIFwiXCJcIlxuXG4gICAgJzB4MCc6XG4gICAgICAgIGNhbGxiYWNrOiAoQGdhbWUpIC0+XG5cblxuICAgICAgICBiYWNrZ3JvdW5kOiAna2l0Y2hlbidcbiAgICAgICAgdGlsZXM6IFwiXCJcIlxuKy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0rXG58MTExMTEgICAgICAxMTExMTEgICAgICAxMTExMTEgICAgICAxMTExMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxMTExMTExMSAgICAgIDExMTExMTExMTExMSAgICAgIDExMTExMTExfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDExMTExMTExICAgICAgMTExMTExMTExMTExICAgICAgMTExMTExMTF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MTExMTEgICAgICAxMTExMTEgICAgICAxMTExMTEgICAgICAxMTExMXxcbistLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xuICAgICAgICBcIlwiXCJcblxuICAgICcweC0xJzpcbiAgICAgICAgYmFja2dyb3VuZDogJ2tpdGNoZW4nXG4gICAgICAgIHRpbGVzOiBcIlwiXCJcbistLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDExMTExICAgICAgMTExMTExICAgICAgMTExMTExICAgICAgMTExMTF8XG4rLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLStcbiAgICAgICAgXCJcIlwiXG5cbiAgICAnMHgxJzpcbiAgICAgICAgYmFja2dyb3VuZDogJ2tpdGNoZW4nXG4gICAgICAgIHRpbGVzOiBcIlwiXCJcbistLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xufDExMTExICAgICAgMTExMTExICAgICAgMTExMTExICAgICAgMTExMTF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG4rLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLStcbiAgICAgICAgXCJcIlwiXG5cblxuICAgICctMXgwJzpcbiAgICAgICAgYmFja2dyb3VuZDogJ2tpdGNoZW4nXG4gICAgICAgIHRpbGVzOiBcIlwiXCJcbistLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG58MSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbnwxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG4rLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLStcbiAgICAgICAgXCJcIlwiXG5cbiAgICAnMngwJzpcbiAgICAgICAgYmFja2dyb3VuZDogJ2tpdGNoZW4nXG4gICAgICAgIHRpbGVzOiBcIlwiXCJcbistLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgIDExMTExMTEgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgIDEgICAxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgMSAgIDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufCAgICAxICAgMSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDF8XG58ICAgIDEgICAxICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMXxcbnwgICAgMSAgIDEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxfFxufDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTF8XG4rLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLStcbiAgICAgICAgXCJcIlwiXG4iLCJFbmdpbmUgPSByZXF1aXJlKCdzcmMvZW5naW5lJylcblxuZW5naW5lID0gbmV3IEVuZ2luZSgnZ2FtZScpXG5cbndpbmRvdy5nYW1lID0gZW5naW5lLmdhbWVcbiIsIkRlb2RvcmFudCA9IHJlcXVpcmUoJ2Rlb2RvcmFudCcpXG5cbnR5cGVzID0gbmV3IERlb2RvcmFudCgnZGVidWcnKVxuXG50eXBlcy5hZGRGaWx0ZXIgJ2lzSW50ZWdlcicsICh2YWx1ZSkgLT4gdmFsdWUgJSAxID09IDBcblxudHlwZXMuYWRkQWxpYXMgJ0ludGVnZXInLCAnTnVtYmVyfGlzSW50ZWdlcidcblxudHlwZXMuYWRkQWxpYXMgJ1BvaW50JywgWydOdW1iZXInLCAnTnVtYmVyJ11cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlc1xuIl19
