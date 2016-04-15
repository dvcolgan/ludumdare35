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
  var i
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  var len = code.length

  for (i = 0; i < len; i++) {
    lookup[i] = code[i]
  }

  for (i = 0; i < len; ++i) {
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
    arr[L++] = (tmp & 0xFF0000) >> 16
    arr[L++] = (tmp & 0xFF00) >> 8
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

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
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
  if (this === b) return 0
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
var CHAR2TILE, COLS, COMMANDS, COMMAND_MODE_BINDINGS, Cursor, Engine, INSERT_MODE_BINDINGS, KEYCODES, MODES, ROWS, SCREEN_HEIGHT, SCREEN_WIDTH, Screen, TILE_HEIGHT, TILE_WIDTH, types,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

types = require('src/types');

COLS = 80;

ROWS = 24;

TILE_WIDTH = 16;

TILE_HEIGHT = 32;

SCREEN_WIDTH = COLS * TILE_WIDTH;

SCREEN_HEIGHT = ROWS * TILE_HEIGHT + TILE_HEIGHT;

KEYCODES = [];

KEYCODES[8] = ['backspace', 'backspace'];

KEYCODES[9] = ['tab', 'tab'];

KEYCODES[13] = ['enter', 'enter'];

KEYCODES[27] = ['esc', 'esc'];

KEYCODES[32] = ['space', 'space'];

KEYCODES[48] = ['0', ')'];

KEYCODES[49] = ['1', '!'];

KEYCODES[50] = ['2', '@'];

KEYCODES[51] = ['3', '#'];

KEYCODES[52] = ['4', '$'];

KEYCODES[53] = ['5', '%'];

KEYCODES[54] = ['6', '^'];

KEYCODES[55] = ['7', '&'];

KEYCODES[56] = ['8', '*'];

KEYCODES[57] = ['9', '('];

KEYCODES[65] = ['a', 'A'];

KEYCODES[66] = ['b', 'B'];

KEYCODES[67] = ['c', 'C'];

KEYCODES[68] = ['d', 'D'];

KEYCODES[69] = ['e', 'E'];

KEYCODES[70] = ['f', 'F'];

KEYCODES[71] = ['g', 'G'];

KEYCODES[72] = ['h', 'H'];

KEYCODES[73] = ['i', 'I'];

KEYCODES[74] = ['j', 'J'];

KEYCODES[75] = ['k', 'K'];

KEYCODES[76] = ['l', 'L'];

KEYCODES[77] = ['m', 'M'];

KEYCODES[78] = ['n', 'N'];

KEYCODES[79] = ['o', 'O'];

KEYCODES[80] = ['p', 'P'];

KEYCODES[81] = ['q', 'Q'];

KEYCODES[82] = ['r', 'R'];

KEYCODES[83] = ['s', 'S'];

KEYCODES[84] = ['t', 'T'];

KEYCODES[85] = ['u', 'U'];

KEYCODES[86] = ['v', 'V'];

KEYCODES[87] = ['w', 'W'];

KEYCODES[88] = ['x', 'X'];

KEYCODES[89] = ['y', 'Y'];

KEYCODES[90] = ['z', 'Z'];

KEYCODES[187] = ['+', '='];

KEYCODES[189] = ['-', '_'];

KEYCODES[186] = [';', ':'];

KEYCODES[188] = [',', '<'];

KEYCODES[190] = ['.', '>'];

KEYCODES[191] = ['/', '?'];

KEYCODES[192] = ['`', '~'];

KEYCODES[219] = ['[', '{'];

KEYCODES[220] = ['\\', '|'];

KEYCODES[221] = [']', '}'];

KEYCODES[222] = ["'", '"'];

CHAR2TILE = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
  j: 9,
  k: 10,
  l: 11,
  m: 12,
  n: 13,
  o: 14,
  p: 15,
  q: 16,
  r: 17,
  s: 18,
  t: 19,
  u: 20,
  v: 21,
  w: 22,
  x: 23,
  y: 24,
  z: 25,
  A: 26,
  B: 27,
  C: 28,
  D: 29,
  E: 30,
  F: 31,
  G: 32,
  H: 33,
  I: 34,
  J: 35,
  K: 36,
  L: 37,
  M: 38,
  N: 39,
  O: 40,
  P: 41,
  Q: 42,
  R: 43,
  S: 44,
  T: 45,
  U: 46,
  V: 47,
  W: 48,
  X: 49,
  Y: 50,
  Z: 51,
  '0': 52,
  '1': 53,
  '2': 54,
  '3': 55,
  '4': 56,
  '5': 57,
  '6': 58,
  '7': 59,
  '8': 60,
  '9': 61,
  '0': 62,
  '!': 63,
  '@': 64,
  '#': 65,
  '$': 66,
  '%': 67,
  '^': 68,
  '&': 69,
  '*': 70,
  '(': 71,
  ')': 72,
  '[': 73,
  ']': 74,
  '{': 75,
  '}': 76,
  ' ': 77,
  '`': 78,
  '~': 79,
  '/': 80,
  '=': 81,
  '\\': 82,
  '?': 83,
  '+': 84,
  '|': 85,
  '-': 86,
  '_': 87,
  ';': 88,
  ':': 89,
  ',': 90,
  '.': 91,
  '<': 92,
  '>': 93
};

MODES = {
  'COMMAND': 'COMMAND',
  'INSERT': 'INSERT',
  'VISUAL': 'VISUAL',
  'VISUAL LINE': 'VISUAL LINE',
  'VISUAL BLOCK': 'VISUAL BLOCK'
};

COMMANDS = {
  'ESCAPE': 'ESCAPE',
  'INSERT': 'INSERT',
  'INSERT_AFTER': 'INSERT_AFTER',
  'INSERT_SUBSTITUTE': 'INSERT_SUBSTITUTE',
  'INSERT_OPEN': 'INSERT_OPEN',
  'INSERT_OPEN_ABOVE': 'INSERT_OPEN_ABOVE',
  'CHANGE_REST_OF_LINE': 'CHANGE_REST_OF_LINE',
  'DELETE_REST_OF_LINE': 'DELETE_REST_OF_LINE',
  'BACKWARD_CHARACTER': 'BACKWARD_CHARACTER',
  'PREV_LINE': 'PREV_LINE',
  'NEXT_LINE': 'NEXT_LINE',
  'FORWARD_CHARACTER': 'FORWARD_CHARACTER',
  'BEGINNING_OF_LINE': 'BEGINNING_OF_LINE',
  'END_OF_LINE': 'END_OF_LINE',
  'FORWARD_WORD': 'FORWARD_WORD',
  'BACKWARD_WORD': 'BACKWARD_WORD',
  'FORWARD_END_WORD': 'FORWARD_END_WORD',
  'DELETE_CHARACTER': 'DELETE_CHARACTER',
  'DELETE_BACKWARD_CHARACTER': 'DELETE_BACKWARD_CHARACTER'
};

COMMAND_MODE_BINDINGS = {
  i: COMMANDS.INSERT,
  a: COMMANDS.INSERT_AFTER,
  k: COMMANDS.INSERT_SUBSTITUTE,
  o: COMMANDS.INSERT_OPEN,
  O: COMMANDS.INSERT_OPEN_ABOVE,
  C: COMMANDS.CHANGE_REST_OF_LINE,
  D: COMMANDS.DELETE_REST_OF_LINE,
  h: COMMANDS.BACKWARD_CHARACTER,
  t: COMMANDS.PREV_LINE,
  n: COMMANDS.NEXT_LINE,
  s: COMMANDS.FORWARD_CHARACTER,
  H: COMMANDS.BEGINNING_OF_LINE,
  S: COMMANDS.END_OF_LINE,
  w: COMMANDS.FORWARD_WORD,
  b: COMMANDS.BACKWARD_WORD,
  e: COMMANDS.FORWARD_END_WORD,
  x: COMMANDS.DELETE_CHARACTER
};

INSERT_MODE_BINDINGS = {
  'backspace': COMMANDS.DELETE_BACKWARD_CHARACTER,
  'esc': COMMANDS.ESCAPE,
  'C-c': COMMANDS.ESCAPE,
  'C-[': COMMANDS.ESCAPE,
  'C-w': COMMANDS.BACKWARD_CHARACTER,
  'C-n': COMMANDS.NEXT_LINE,
  'C-t': COMMANDS.PREV_LINE
};

Cursor = (function() {
  function Cursor(game) {
    this.game = game;
    this.sprite = this.game.add.graphics(0, 0);
    this.sprite.beginFill(0x00AA00);
    this.sprite.drawRect(0, 0, TILE_WIDTH, TILE_HEIGHT);
    this.col = 0;
    this.row = 0;
  }

  Cursor.prototype.to = function(col1, row1) {
    this.col = col1;
    this.row = row1;
    return this.sync();
  };

  Cursor.prototype.up = function(times) {
    if (times == null) {
      times = 1;
    }
    this.row -= times;
    return this.sync();
  };

  Cursor.prototype.down = function(times) {
    if (times == null) {
      times = 1;
    }
    this.row += times;
    return this.sync();
  };

  Cursor.prototype.left = function(times) {
    if (times == null) {
      times = 1;
    }
    this.col -= times;
    return this.sync();
  };

  Cursor.prototype.right = function(times) {
    if (times == null) {
      times = 1;
    }
    this.col += times;
    return this.sync();
  };

  Cursor.prototype.sync = function() {
    if (this.col < 0) {
      this.col = 0;
    }
    if (this.col > COLS - 1) {
      this.col = COLS - 1;
    }
    if (this.row < 0) {
      this.row = 0;
    }
    if (this.row > ROWS - 1) {
      this.row = ROWS - 1;
    }
    this.sprite.x = this.col * TILE_WIDTH;
    return this.sprite.y = this.row * TILE_HEIGHT;
  };

  return Cursor;

})();

Screen = (function() {
  function Screen(game) {
    var col, row;
    this.game = game;
    this.tilemap = this.game.add.tilemap(null, TILE_WIDTH, TILE_HEIGHT, COLS, ROWS + 2);
    this.tilemap.addTilesetImage('letters');
    this.layer = this.tilemap.createBlankLayer('buffer', COLS, ROWS + 1, TILE_WIDTH, TILE_HEIGHT);
    this.layer.resizeWorld();
    this.buffer = (function() {
      var j, ref, results;
      results = [];
      for (row = j = 0, ref = ROWS + 1; 0 <= ref ? j < ref : j > ref; row = 0 <= ref ? ++j : --j) {
        results.push((function() {
          var k, ref1, results1;
          results1 = [];
          for (col = k = 0, ref1 = COLS; 0 <= ref1 ? k < ref1 : k > ref1; col = 0 <= ref1 ? ++k : --k) {
            results1.push(null);
          }
          return results1;
        })());
      }
      return results;
    })();
  }

  Screen.prototype.set = function(col, row, char) {
    var tile;
    tile = char != null ? CHAR2TILE[char] : null;
    this.tilemap.putTile(tile, col, row);
    return this.buffer[row][col] = char;
  };

  Screen.prototype.get = function(col, row) {
    return this.buffer[row][col];
  };

  return Screen;

})();

module.exports = types.checkClass(Engine = (function() {
  function Engine(elementId) {
    this.elementId = elementId;
    this.update = bind(this.update, this);
    this.create = bind(this.create, this);
    this.preload = bind(this.preload, this);
    this.game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, this.elementId, {
      preload: this.preload,
      create: this.create,
      update: this.update
    });
  }

  Engine.prototype.doCommand = function(command) {
    var i, j, k, ref, ref1, results;
    switch (command) {
      case COMMANDS.INSERT:
        return this.enterMode(MODES.INSERT);
      case COMMANDS.INSERT_AFTER:
        this.cursor.right();
        return this.enterMode(MODES.INSERT);
      case COMMANDS.INSERT_SUBSTITUTE:
        this.deleteAtCursor();
        return this.enterMode(MODES.INSERT);
      case COMMANDS.INSERT_OPEN:
        this.cursor.down();
        this.openRowAboveCursor();
        return this.enterMode(MODES.INSERT);
      case COMMANDS.INSERT_OPEN_ABOVE:
        this.openRowAboveCursor();
        return this.enterMode(MODES.INSERT);
      case COMMANDS.CHANGE_REST_OF_LINE:
        for (i = j = 0, ref = COLS - this.cursor.col; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          this.deleteAtCursor();
        }
        return this.enterMode(MODES.INSERT);
      case COMMANDS.DELETE_REST_OF_LINE:
        results = [];
        for (i = k = 0, ref1 = COLS - this.cursor.col; 0 <= ref1 ? k <= ref1 : k >= ref1; i = 0 <= ref1 ? ++k : --k) {
          results.push(this.deleteAtCursor());
        }
        return results;
        break;
      case COMMANDS.CHANGE_LINE:
        this.removeRowAtCursor();
        return this.enterMode(MODES.INSERT);
      case COMMANDS.DELETE_LINE:
        return this.removeRowAtCursor();
      case COMMANDS.ESCAPE:
        this.enterMode(MODES.COMMAND);
        return this.cursor.left();
      case COMMANDS.BACKWARD_CHARACTER:
        return this.cursor.left();
      case COMMANDS.PREV_LINE:
        return this.cursor.down();
      case COMMANDS.NEXT_LINE:
        return this.cursor.up();
      case COMMANDS.FORWARD_CHARACTER:
        return this.cursor.right();
      case COMMANDS.BEGINNING_OF_LINE:
        return this.cursor.to(0, this.cursor.row);
      case COMMANDS.END_OF_LINE:
        return this.cursor.to(COLS - 1, this.cursor.row);
      case COMMANDS.FORWARD_WORD:
        return this.cursor.right(5);
      case COMMANDS.BACKWARD_WORD:
        return this.cursor.left(5);
      case COMMANDS.FORWARD_END_WORD:
        return this.cursor.right(5);
      case COMMANDS.DELETE_CHARACTER:
        return this.deleteAtCursor();
      case COMMANDS.DELETE_BACKWARD_CHARACTER:
        this.cursor.left();
        return this.deleteAtCursor();
    }
  };

  Engine.prototype.preload = function() {
    return this.game.load.image('letters', 'font-transparent.png');
  };

  Engine.prototype.create = function() {
    this.cursor = new Cursor(this.game);
    this.screen = new Screen(this.game);
    this.game.stage.backgroundColor = '#121212';
    this.currentCommand = null;
    this.currentCommandNextRepeat = 0;
    this.currentMode = MODES.COMMAND;
    return this.game.input.keyboard.onDownCallback = (function(_this) {
      return function(e) {
        var binding, character, command, modifier, ref;
        if (!(e.shiftKey && e.ctrlKey && (e.keyCode === 82 || e.keyCode === 74))) {
          e.preventDefault();
        }
        character = (ref = KEYCODES[e.keyCode]) != null ? ref[e.shiftKey ? 1 : 0] : void 0;
        if (character == null) {
          return;
        }
        modifier = e.ctrlKey ? 'C-' : '';
        binding = modifier + character;
        if (_this.currentMode === MODES.COMMAND) {
          command = COMMAND_MODE_BINDINGS[binding];
          if (command != null) {
            _this.doCommand(command);
            return;
          }
        }
        if (_this.currentMode === MODES.INSERT) {
          command = INSERT_MODE_BINDINGS[binding];
          if (command != null) {
            _this.doCommand(command);
            return;
          }
          if (character === 'space') {
            character = ' ';
          }
          if (character === 'backspace') {
            return _this.deleteAtCursor();
          } else {
            return _this.insertAtCursor(character);
          }
        }
      };
    })(this);
  };

  Engine.prototype.update = function() {};

  Engine.prototype.setTextAt = function(startCol, row, text) {
    var col, i, j, ref, results;
    results = [];
    for (i = j = 0, ref = text.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      col = startCol + i;
      console.log(col);
      results.push(this.screen.set(col, row, text[i]));
    }
    return results;
  };

  Engine.prototype.enterMode = function(mode) {
    this.currentMode = mode;
    if (mode === MODES.INSERT) {
      return this.setTextAt(0, ROWS, '-- INSERT --');
    } else if (mode === MODES.COMMAND) {
      return this.setTextAt(0, ROWS, '            ');
    }
  };

  Engine.prototype.deleteAtCursor = function() {
    var col, j, ref, ref1, results;
    this.screen.set(this.cursor.col, this.cursor.row, null);
    results = [];
    for (col = j = ref = this.cursor.col, ref1 = COLS; ref <= ref1 ? j < ref1 : j > ref1; col = ref <= ref1 ? ++j : --j) {
      if (col < COLS - 1) {
        results.push(this.screen.set(col, this.cursor.row, this.screen.get(col + 1, this.cursor.row)));
      } else {
        results.push(this.screen.set(col, this.cursor.row, null));
      }
    }
    return results;
  };

  Engine.prototype.insertAtCursor = function(character) {
    var col, j, ref, ref1;
    for (col = j = ref = COLS - 1, ref1 = this.cursor.col; ref <= ref1 ? j <= ref1 : j >= ref1; col = ref <= ref1 ? ++j : --j) {
      if (col < COLS - 1) {
        this.screen.set(col + 1, this.cursor.row, this.screen.get(col, this.cursor.row));
      }
    }
    this.screen.set(this.cursor.col, this.cursor.row, character);
    return this.cursor.right();
  };

  Engine.prototype.openRowAboveCursor = function() {
    var col, j, k, l, ref, ref1, ref2, ref3, results, row;
    for (row = j = ref = ROWS - 1, ref1 = this.cursor.row; ref <= ref1 ? j < ref1 : j > ref1; row = ref <= ref1 ? ++j : --j) {
      if (row < ROWS - 2) {
        for (col = k = 0, ref2 = COLS; 0 <= ref2 ? k < ref2 : k > ref2; col = 0 <= ref2 ? ++k : --k) {
          this.screen.set(col, row + 1, this.screen.get(col, row));
        }
      }
    }
    results = [];
    for (col = l = 0, ref3 = COLS; 0 <= ref3 ? l < ref3 : l > ref3; col = 0 <= ref3 ? ++l : --l) {
      results.push(this.screen.set(col, this.cursor.row, null));
    }
    return results;
  };

  Engine.prototype.removeRowAtCursor = function() {
    var col, j, ref, ref1, results, row;
    results = [];
    for (row = j = ref = this.row, ref1 = ROWS; ref <= ref1 ? j < ref1 : j > ref1; row = ref <= ref1 ? ++j : --j) {
      results.push((function() {
        var k, ref2, results1;
        results1 = [];
        for (col = k = 0, ref2 = COLS; 0 <= ref2 ? k < ref2 : k > ref2; col = 0 <= ref2 ? ++k : --k) {
          if (row < ROWS - 2) {
            results1.push(this.screen.set(col, row, this.screen.get(col, row + 1)));
          } else {
            results1.push(this.screen.set(col, row, null));
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  return Engine;

})());


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/engine.coffee","/src")

},{"_process":3,"buffer":5,"src/types":9}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Engine, engine;

Engine = require('src/engine');

engine = new Engine('game');

window.game = engine.game;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/main.coffee","/src")

},{"_process":3,"buffer":5,"src/engine":7}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Deodorant, types;

Deodorant = require('deodorant');

types = new Deodorant('debug');

types.addFilter('isInteger', function(value) {
  return value % 1 === 0;
});

types.addAlias('Integer', 'Number|isInteger');

types.addAlias('Email', /^.+@.+\..+$/);

types.addAlias('Point', ['Number', 'Number']);

types.addAlias('SpriteData', {
  image: 'String',
  frameSize: 'Point',
  anchor: 'Point',
  animations: {
    '*': ['Integer']
  }
});

types.addAlias('Actor', {
  sprite: 'Any',
  state: 'String',
  direction: /up|down|left|right/
});

module.exports = types;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/src/types.coffee","/node_modules/src")

},{"_process":3,"buffer":5,"deodorant":1}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2Rlb2RvcmFudC9kZW9kb3JhbnQuanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIi9ob21lL2R2Y29sZ2FuL3Byb2plY3RzL3ZpbXJvZ3VlbGlrZS9zcmMvZW5naW5lLmNvZmZlZSIsIi9ob21lL2R2Y29sZ2FuL3Byb2plY3RzL3ZpbXJvZ3VlbGlrZS9zcmMvbWFpbi5jb2ZmZWUiLCIvaG9tZS9kdmNvbGdhbi9wcm9qZWN0cy92aW1yb2d1ZWxpa2Uvbm9kZV9tb2R1bGVzL3NyYy90eXBlcy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0N0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNMQSxJQUFBLGtMQUFBO0VBQUE7O0FBQUEsS0FBQSxHQUFRLE9BQUEsQ0FBUSxXQUFSOztBQUdSLElBQUEsR0FBTzs7QUFDUCxJQUFBLEdBQU87O0FBRVAsVUFBQSxHQUFhOztBQUNiLFdBQUEsR0FBYzs7QUFFZCxZQUFBLEdBQWUsSUFBQSxHQUFPOztBQUN0QixhQUFBLEdBQWdCLElBQUEsR0FBTyxXQUFQLEdBQXFCOztBQUVyQyxRQUFBLEdBQVc7O0FBQ1gsUUFBUyxDQUFBLENBQUEsQ0FBVCxHQUFlLENBQUMsV0FBRCxFQUFjLFdBQWQ7O0FBQ2YsUUFBUyxDQUFBLENBQUEsQ0FBVCxHQUFlLENBQUMsS0FBRCxFQUFRLEtBQVI7O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsT0FBRCxFQUFVLE9BQVY7O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsS0FBRCxFQUFRLEtBQVI7O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsT0FBRCxFQUFVLE9BQVY7O0FBRWYsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBRWYsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2YsUUFBUyxDQUFBLEVBQUEsQ0FBVCxHQUFlLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBRWYsUUFBUyxDQUFBLEdBQUEsQ0FBVCxHQUFpQixDQUFDLEdBQUQsRUFBTSxHQUFOOztBQUNqQixRQUFTLENBQUEsR0FBQSxDQUFULEdBQWlCLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2pCLFFBQVMsQ0FBQSxHQUFBLENBQVQsR0FBZ0IsQ0FBQyxHQUFELEVBQU0sR0FBTjs7QUFDaEIsUUFBUyxDQUFBLEdBQUEsQ0FBVCxHQUFnQixDQUFDLEdBQUQsRUFBTSxHQUFOOztBQUNoQixRQUFTLENBQUEsR0FBQSxDQUFULEdBQWdCLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2hCLFFBQVMsQ0FBQSxHQUFBLENBQVQsR0FBZ0IsQ0FBQyxHQUFELEVBQU0sR0FBTjs7QUFDaEIsUUFBUyxDQUFBLEdBQUEsQ0FBVCxHQUFnQixDQUFDLEdBQUQsRUFBTSxHQUFOOztBQUNoQixRQUFTLENBQUEsR0FBQSxDQUFULEdBQWdCLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBQ2hCLFFBQVMsQ0FBQSxHQUFBLENBQVQsR0FBZ0IsQ0FBQyxJQUFELEVBQU0sR0FBTjs7QUFDaEIsUUFBUyxDQUFBLEdBQUEsQ0FBVCxHQUFnQixDQUFDLEdBQUQsRUFBTSxHQUFOOztBQUNoQixRQUFTLENBQUEsR0FBQSxDQUFULEdBQWdCLENBQUMsR0FBRCxFQUFNLEdBQU47O0FBRWhCLFNBQUEsR0FDSTtFQUFBLENBQUEsRUFBRyxDQUFIO0VBQ0EsQ0FBQSxFQUFHLENBREg7RUFFQSxDQUFBLEVBQUcsQ0FGSDtFQUdBLENBQUEsRUFBRyxDQUhIO0VBSUEsQ0FBQSxFQUFHLENBSkg7RUFLQSxDQUFBLEVBQUcsQ0FMSDtFQU1BLENBQUEsRUFBRyxDQU5IO0VBT0EsQ0FBQSxFQUFHLENBUEg7RUFRQSxDQUFBLEVBQUcsQ0FSSDtFQVNBLENBQUEsRUFBRyxDQVRIO0VBVUEsQ0FBQSxFQUFHLEVBVkg7RUFXQSxDQUFBLEVBQUcsRUFYSDtFQVlBLENBQUEsRUFBRyxFQVpIO0VBYUEsQ0FBQSxFQUFHLEVBYkg7RUFjQSxDQUFBLEVBQUcsRUFkSDtFQWVBLENBQUEsRUFBRyxFQWZIO0VBZ0JBLENBQUEsRUFBRyxFQWhCSDtFQWlCQSxDQUFBLEVBQUcsRUFqQkg7RUFrQkEsQ0FBQSxFQUFHLEVBbEJIO0VBbUJBLENBQUEsRUFBRyxFQW5CSDtFQW9CQSxDQUFBLEVBQUcsRUFwQkg7RUFxQkEsQ0FBQSxFQUFHLEVBckJIO0VBc0JBLENBQUEsRUFBRyxFQXRCSDtFQXVCQSxDQUFBLEVBQUcsRUF2Qkg7RUF3QkEsQ0FBQSxFQUFHLEVBeEJIO0VBeUJBLENBQUEsRUFBRyxFQXpCSDtFQTBCQSxDQUFBLEVBQUcsRUExQkg7RUEyQkEsQ0FBQSxFQUFHLEVBM0JIO0VBNEJBLENBQUEsRUFBRyxFQTVCSDtFQTZCQSxDQUFBLEVBQUcsRUE3Qkg7RUE4QkEsQ0FBQSxFQUFHLEVBOUJIO0VBK0JBLENBQUEsRUFBRyxFQS9CSDtFQWdDQSxDQUFBLEVBQUcsRUFoQ0g7RUFpQ0EsQ0FBQSxFQUFHLEVBakNIO0VBa0NBLENBQUEsRUFBRyxFQWxDSDtFQW1DQSxDQUFBLEVBQUcsRUFuQ0g7RUFvQ0EsQ0FBQSxFQUFHLEVBcENIO0VBcUNBLENBQUEsRUFBRyxFQXJDSDtFQXNDQSxDQUFBLEVBQUcsRUF0Q0g7RUF1Q0EsQ0FBQSxFQUFHLEVBdkNIO0VBd0NBLENBQUEsRUFBRyxFQXhDSDtFQXlDQSxDQUFBLEVBQUcsRUF6Q0g7RUEwQ0EsQ0FBQSxFQUFHLEVBMUNIO0VBMkNBLENBQUEsRUFBRyxFQTNDSDtFQTRDQSxDQUFBLEVBQUcsRUE1Q0g7RUE2Q0EsQ0FBQSxFQUFHLEVBN0NIO0VBOENBLENBQUEsRUFBRyxFQTlDSDtFQStDQSxDQUFBLEVBQUcsRUEvQ0g7RUFnREEsQ0FBQSxFQUFHLEVBaERIO0VBaURBLENBQUEsRUFBRyxFQWpESDtFQWtEQSxDQUFBLEVBQUcsRUFsREg7RUFtREEsQ0FBQSxFQUFHLEVBbkRIO0VBb0RBLEdBQUEsRUFBSyxFQXBETDtFQXFEQSxHQUFBLEVBQUssRUFyREw7RUFzREEsR0FBQSxFQUFLLEVBdERMO0VBdURBLEdBQUEsRUFBSyxFQXZETDtFQXdEQSxHQUFBLEVBQUssRUF4REw7RUF5REEsR0FBQSxFQUFLLEVBekRMO0VBMERBLEdBQUEsRUFBSyxFQTFETDtFQTJEQSxHQUFBLEVBQUssRUEzREw7RUE0REEsR0FBQSxFQUFLLEVBNURMO0VBNkRBLEdBQUEsRUFBSyxFQTdETDtFQThEQSxHQUFBLEVBQUssRUE5REw7RUErREEsR0FBQSxFQUFLLEVBL0RMO0VBZ0VBLEdBQUEsRUFBSyxFQWhFTDtFQWlFQSxHQUFBLEVBQUssRUFqRUw7RUFrRUEsR0FBQSxFQUFLLEVBbEVMO0VBbUVBLEdBQUEsRUFBSyxFQW5FTDtFQW9FQSxHQUFBLEVBQUssRUFwRUw7RUFxRUEsR0FBQSxFQUFLLEVBckVMO0VBc0VBLEdBQUEsRUFBSyxFQXRFTDtFQXVFQSxHQUFBLEVBQUssRUF2RUw7RUF3RUEsR0FBQSxFQUFLLEVBeEVMO0VBeUVBLEdBQUEsRUFBSyxFQXpFTDtFQTBFQSxHQUFBLEVBQUssRUExRUw7RUEyRUEsR0FBQSxFQUFLLEVBM0VMO0VBNEVBLEdBQUEsRUFBSyxFQTVFTDtFQTZFQSxHQUFBLEVBQUssRUE3RUw7RUE4RUEsR0FBQSxFQUFLLEVBOUVMO0VBK0VBLEdBQUEsRUFBSyxFQS9FTDtFQWdGQSxHQUFBLEVBQUssRUFoRkw7RUFpRkEsR0FBQSxFQUFLLEVBakZMO0VBa0ZBLElBQUEsRUFBSyxFQWxGTDtFQW1GQSxHQUFBLEVBQUssRUFuRkw7RUFvRkEsR0FBQSxFQUFLLEVBcEZMO0VBcUZBLEdBQUEsRUFBSyxFQXJGTDtFQXNGQSxHQUFBLEVBQUssRUF0Rkw7RUF1RkEsR0FBQSxFQUFLLEVBdkZMO0VBd0ZBLEdBQUEsRUFBSyxFQXhGTDtFQXlGQSxHQUFBLEVBQUssRUF6Rkw7RUEwRkEsR0FBQSxFQUFLLEVBMUZMO0VBMkZBLEdBQUEsRUFBSyxFQTNGTDtFQTRGQSxHQUFBLEVBQUssRUE1Rkw7RUE2RkEsR0FBQSxFQUFLLEVBN0ZMOzs7QUErRkosS0FBQSxHQUFRO0VBQ0osV0FBQSxTQURJO0VBRUosVUFBQSxRQUZJO0VBR0osVUFBQSxRQUhJO0VBSUosZUFBQSxhQUpJO0VBS0osZ0JBQUEsY0FMSTs7O0FBUVIsUUFBQSxHQUFXO0VBQ1AsVUFBQSxRQURPO0VBRVAsVUFBQSxRQUZPO0VBR1AsZ0JBQUEsY0FITztFQUlQLHFCQUFBLG1CQUpPO0VBS1AsZUFBQSxhQUxPO0VBTVAscUJBQUEsbUJBTk87RUFRUCx1QkFBQSxxQkFSTztFQVNQLHVCQUFBLHFCQVRPO0VBV1Asc0JBQUEsb0JBWE87RUFZUCxhQUFBLFdBWk87RUFhUCxhQUFBLFdBYk87RUFjUCxxQkFBQSxtQkFkTztFQWVQLHFCQUFBLG1CQWZPO0VBZ0JQLGVBQUEsYUFoQk87RUFpQlAsZ0JBQUEsY0FqQk87RUFrQlAsaUJBQUEsZUFsQk87RUFtQlAsb0JBQUEsa0JBbkJPO0VBb0JQLG9CQUFBLGtCQXBCTztFQXFCUCw2QkFBQSwyQkFyQk87OztBQXdCWCxxQkFBQSxHQUNJO0VBQUEsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxNQUFaO0VBQ0EsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxZQURaO0VBRUEsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxpQkFGWjtFQUdBLENBQUEsRUFBRyxRQUFRLENBQUMsV0FIWjtFQUlBLENBQUEsRUFBRyxRQUFRLENBQUMsaUJBSlo7RUFNQSxDQUFBLEVBQUcsUUFBUSxDQUFDLG1CQU5aO0VBT0EsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxtQkFQWjtFQVdBLENBQUEsRUFBRyxRQUFRLENBQUMsa0JBWFo7RUFZQSxDQUFBLEVBQUcsUUFBUSxDQUFDLFNBWlo7RUFhQSxDQUFBLEVBQUcsUUFBUSxDQUFDLFNBYlo7RUFjQSxDQUFBLEVBQUcsUUFBUSxDQUFDLGlCQWRaO0VBZUEsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxpQkFmWjtFQWdCQSxDQUFBLEVBQUcsUUFBUSxDQUFDLFdBaEJaO0VBaUJBLENBQUEsRUFBRyxRQUFRLENBQUMsWUFqQlo7RUFrQkEsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxhQWxCWjtFQW1CQSxDQUFBLEVBQUcsUUFBUSxDQUFDLGdCQW5CWjtFQW9CQSxDQUFBLEVBQUcsUUFBUSxDQUFDLGdCQXBCWjs7O0FBc0JKLG9CQUFBLEdBQ0k7RUFBQSxXQUFBLEVBQWEsUUFBUSxDQUFDLHlCQUF0QjtFQUNBLEtBQUEsRUFBTyxRQUFRLENBQUMsTUFEaEI7RUFFQSxLQUFBLEVBQU8sUUFBUSxDQUFDLE1BRmhCO0VBR0EsS0FBQSxFQUFPLFFBQVEsQ0FBQyxNQUhoQjtFQUlBLEtBQUEsRUFBTyxRQUFRLENBQUMsa0JBSmhCO0VBS0EsS0FBQSxFQUFPLFFBQVEsQ0FBQyxTQUxoQjtFQU1BLEtBQUEsRUFBTyxRQUFRLENBQUMsU0FOaEI7OztBQVNFO0VBQ1csZ0JBQUMsSUFBRDtJQUFDLElBQUMsQ0FBQSxPQUFEO0lBQ1YsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFWLENBQW1CLENBQW5CLEVBQXNCLENBQXRCO0lBQ1YsSUFBQyxDQUFBLE1BQU0sQ0FBQyxTQUFSLENBQWtCLFFBQWxCO0lBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxRQUFSLENBQWlCLENBQWpCLEVBQW9CLENBQXBCLEVBQXVCLFVBQXZCLEVBQW1DLFdBQW5DO0lBQ0EsSUFBQyxDQUFBLEdBQUQsR0FBTztJQUNQLElBQUMsQ0FBQSxHQUFELEdBQU87RUFMRTs7bUJBT2IsRUFBQSxHQUFJLFNBQUMsSUFBRCxFQUFPLElBQVA7SUFBQyxJQUFDLENBQUEsTUFBRDtJQUFNLElBQUMsQ0FBQSxNQUFEO1dBQ1AsSUFBQyxDQUFBLElBQUQsQ0FBQTtFQURBOzttQkFHSixFQUFBLEdBQUksU0FBQyxLQUFEOztNQUFDLFFBQU07O0lBQ1AsSUFBQyxDQUFBLEdBQUQsSUFBUTtXQUNSLElBQUMsQ0FBQSxJQUFELENBQUE7RUFGQTs7bUJBSUosSUFBQSxHQUFNLFNBQUMsS0FBRDs7TUFBQyxRQUFNOztJQUNULElBQUMsQ0FBQSxHQUFELElBQVE7V0FDUixJQUFDLENBQUEsSUFBRCxDQUFBO0VBRkU7O21CQUlOLElBQUEsR0FBTSxTQUFDLEtBQUQ7O01BQUMsUUFBTTs7SUFDVCxJQUFDLENBQUEsR0FBRCxJQUFRO1dBQ1IsSUFBQyxDQUFBLElBQUQsQ0FBQTtFQUZFOzttQkFJTixLQUFBLEdBQU8sU0FBQyxLQUFEOztNQUFDLFFBQU07O0lBQ1YsSUFBQyxDQUFBLEdBQUQsSUFBUTtXQUNSLElBQUMsQ0FBQSxJQUFELENBQUE7RUFGRzs7bUJBSVAsSUFBQSxHQUFNLFNBQUE7SUFDRixJQUFHLElBQUMsQ0FBQSxHQUFELEdBQU8sQ0FBVjtNQUFpQixJQUFDLENBQUEsR0FBRCxHQUFPLEVBQXhCOztJQUNBLElBQUcsSUFBQyxDQUFBLEdBQUQsR0FBTyxJQUFBLEdBQU8sQ0FBakI7TUFBd0IsSUFBQyxDQUFBLEdBQUQsR0FBTyxJQUFBLEdBQU8sRUFBdEM7O0lBQ0EsSUFBRyxJQUFDLENBQUEsR0FBRCxHQUFPLENBQVY7TUFBaUIsSUFBQyxDQUFBLEdBQUQsR0FBTyxFQUF4Qjs7SUFDQSxJQUFHLElBQUMsQ0FBQSxHQUFELEdBQU8sSUFBQSxHQUFPLENBQWpCO01BQXdCLElBQUMsQ0FBQSxHQUFELEdBQU8sSUFBQSxHQUFPLEVBQXRDOztJQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsQ0FBUixHQUFZLElBQUMsQ0FBQSxHQUFELEdBQU87V0FDbkIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxDQUFSLEdBQVksSUFBQyxDQUFBLEdBQUQsR0FBTztFQVBqQjs7Ozs7O0FBVUo7RUFDVyxnQkFBQyxJQUFEO0FBQ1QsUUFBQTtJQURVLElBQUMsQ0FBQSxPQUFEO0lBQ1YsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFDLENBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFWLENBQWtCLElBQWxCLEVBQXdCLFVBQXhCLEVBQW9DLFdBQXBDLEVBQWlELElBQWpELEVBQXVELElBQUEsR0FBTyxDQUE5RDtJQUNYLElBQUMsQ0FBQSxPQUFPLENBQUMsZUFBVCxDQUF5QixTQUF6QjtJQUNBLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBQyxDQUFBLE9BQU8sQ0FBQyxnQkFBVCxDQUEwQixRQUExQixFQUFvQyxJQUFwQyxFQUEwQyxJQUFBLEdBQU8sQ0FBakQsRUFBb0QsVUFBcEQsRUFBZ0UsV0FBaEU7SUFDVCxJQUFDLENBQUEsS0FBSyxDQUFDLFdBQVAsQ0FBQTtJQUVBLElBQUMsQ0FBQSxNQUFEOztBQUNJO1dBQVcscUZBQVg7OztBQUNJO2VBQVcsc0ZBQVg7MEJBQ0k7QUFESjs7O0FBREo7OztFQVBLOzttQkFZYixHQUFBLEdBQUssU0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLElBQVg7QUFDRCxRQUFBO0lBQUEsSUFBQSxHQUFVLFlBQUgsR0FBYyxTQUFVLENBQUEsSUFBQSxDQUF4QixHQUFtQztJQUMxQyxJQUFDLENBQUEsT0FBTyxDQUFDLE9BQVQsQ0FBaUIsSUFBakIsRUFBdUIsR0FBdkIsRUFBNEIsR0FBNUI7V0FDQSxJQUFDLENBQUEsTUFBTyxDQUFBLEdBQUEsQ0FBSyxDQUFBLEdBQUEsQ0FBYixHQUFvQjtFQUhuQjs7bUJBS0wsR0FBQSxHQUFLLFNBQUMsR0FBRCxFQUFNLEdBQU47V0FDRCxJQUFDLENBQUEsTUFBTyxDQUFBLEdBQUEsQ0FBSyxDQUFBLEdBQUE7RUFEWjs7Ozs7O0FBSVQsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFVBQU4sQ0FBdUI7RUFDdkIsZ0JBQUMsU0FBRDtJQUFDLElBQUMsQ0FBQSxZQUFEOzs7O0lBQ1YsSUFBQyxDQUFBLElBQUQsR0FBWSxJQUFBLE1BQU0sQ0FBQyxJQUFQLENBQVksWUFBWixFQUEwQixhQUExQixFQUF5QyxNQUFNLENBQUMsSUFBaEQsRUFBc0QsSUFBQyxDQUFBLFNBQXZELEVBQWtFO01BQUMsT0FBQSxFQUFTLElBQUMsQ0FBQSxPQUFYO01BQW9CLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFBN0I7TUFBcUMsTUFBQSxFQUFRLElBQUMsQ0FBQSxNQUE5QztLQUFsRTtFQURIOzttQkFHYixTQUFBLEdBQVcsU0FBQyxPQUFEO0FBQ1AsUUFBQTtBQUFBLFlBQU8sT0FBUDtBQUFBLFdBQ1MsUUFBUSxDQUFDLE1BRGxCO2VBRVEsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFLLENBQUMsTUFBakI7QUFGUixXQUdTLFFBQVEsQ0FBQyxZQUhsQjtRQUlRLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixDQUFBO2VBQ0EsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFLLENBQUMsTUFBakI7QUFMUixXQU1TLFFBQVEsQ0FBQyxpQkFObEI7UUFPUSxJQUFDLENBQUEsY0FBRCxDQUFBO2VBQ0EsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFLLENBQUMsTUFBakI7QUFSUixXQVNTLFFBQVEsQ0FBQyxXQVRsQjtRQVVRLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFBO1FBQ0EsSUFBQyxDQUFBLGtCQUFELENBQUE7ZUFDQSxJQUFDLENBQUEsU0FBRCxDQUFXLEtBQUssQ0FBQyxNQUFqQjtBQVpSLFdBYVMsUUFBUSxDQUFDLGlCQWJsQjtRQWNRLElBQUMsQ0FBQSxrQkFBRCxDQUFBO2VBQ0EsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFLLENBQUMsTUFBakI7QUFmUixXQWlCUyxRQUFRLENBQUMsbUJBakJsQjtBQWtCUSxhQUEyQixpR0FBM0I7VUFBQSxJQUFDLENBQUEsY0FBRCxDQUFBO0FBQUE7ZUFDQSxJQUFDLENBQUEsU0FBRCxDQUFXLEtBQUssQ0FBQyxNQUFqQjtBQW5CUixXQW9CUyxRQUFRLENBQUMsbUJBcEJsQjtBQXFCUTthQUEyQixzR0FBM0I7dUJBQUEsSUFBQyxDQUFBLGNBQUQsQ0FBQTtBQUFBOztBQURDO0FBcEJULFdBc0JTLFFBQVEsQ0FBQyxXQXRCbEI7UUF1QlEsSUFBQyxDQUFBLGlCQUFELENBQUE7ZUFDQSxJQUFDLENBQUEsU0FBRCxDQUFXLEtBQUssQ0FBQyxNQUFqQjtBQXhCUixXQXlCUyxRQUFRLENBQUMsV0F6QmxCO2VBMEJRLElBQUMsQ0FBQSxpQkFBRCxDQUFBO0FBMUJSLFdBNEJTLFFBQVEsQ0FBQyxNQTVCbEI7UUE2QlEsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFLLENBQUMsT0FBakI7ZUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBQTtBQTlCUixXQStCUyxRQUFRLENBQUMsa0JBL0JsQjtlQWdDUSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBQTtBQWhDUixXQWlDUyxRQUFRLENBQUMsU0FqQ2xCO2VBa0NRLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFBO0FBbENSLFdBbUNTLFFBQVEsQ0FBQyxTQW5DbEI7ZUFvQ1EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxFQUFSLENBQUE7QUFwQ1IsV0FxQ1MsUUFBUSxDQUFDLGlCQXJDbEI7ZUFzQ1EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQUE7QUF0Q1IsV0F3Q1MsUUFBUSxDQUFDLGlCQXhDbEI7ZUF5Q1EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxFQUFSLENBQVcsQ0FBWCxFQUFjLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBdEI7QUF6Q1IsV0EwQ1MsUUFBUSxDQUFDLFdBMUNsQjtlQTJDUSxJQUFDLENBQUEsTUFBTSxDQUFDLEVBQVIsQ0FBVyxJQUFBLEdBQUssQ0FBaEIsRUFBbUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUEzQjtBQTNDUixXQTZDUyxRQUFRLENBQUMsWUE3Q2xCO2VBOENRLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixDQUFjLENBQWQ7QUE5Q1IsV0ErQ1MsUUFBUSxDQUFDLGFBL0NsQjtlQWdEUSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxDQUFiO0FBaERSLFdBaURTLFFBQVEsQ0FBQyxnQkFqRGxCO2VBa0RRLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixDQUFjLENBQWQ7QUFsRFIsV0FtRFMsUUFBUSxDQUFDLGdCQW5EbEI7ZUFvRFEsSUFBQyxDQUFBLGNBQUQsQ0FBQTtBQXBEUixXQXNEUyxRQUFRLENBQUMseUJBdERsQjtRQXVEUSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBQTtlQUNBLElBQUMsQ0FBQSxjQUFELENBQUE7QUF4RFI7RUFETzs7bUJBa0VYLE9BQUEsR0FBUyxTQUFBO1dBQ0wsSUFBQyxDQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBWCxDQUFpQixTQUFqQixFQUE0QixzQkFBNUI7RUFESzs7bUJBUVQsTUFBQSxHQUFRLFNBQUE7SUFLSixJQUFDLENBQUEsTUFBRCxHQUFjLElBQUEsTUFBQSxDQUFPLElBQUMsQ0FBQSxJQUFSO0lBQ2QsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLE1BQUEsQ0FBTyxJQUFDLENBQUEsSUFBUjtJQUVkLElBQUMsQ0FBQSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQVosR0FBOEI7SUFFOUIsSUFBQyxDQUFBLGNBQUQsR0FBa0I7SUFDbEIsSUFBQyxDQUFBLHdCQUFELEdBQTRCO0lBQzVCLElBQUMsQ0FBQSxXQUFELEdBQWUsS0FBSyxDQUFDO1dBUXJCLElBQUMsQ0FBQSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUFyQixHQUFzQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsQ0FBRDtBQUNsQyxZQUFBO1FBQUEsSUFBRyxDQUFJLENBQUMsQ0FBQyxDQUFDLFFBQUYsSUFBZSxDQUFDLENBQUMsT0FBakIsSUFBNkIsQ0FBQyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWIsSUFBbUIsQ0FBQyxDQUFDLE9BQUYsS0FBYSxFQUFqQyxDQUE5QixDQUFQO1VBQ0ksQ0FBQyxDQUFDLGNBQUYsQ0FBQSxFQURKOztRQUdBLFNBQUEsNENBQWlDLENBQUcsQ0FBQyxDQUFDLFFBQUwsR0FBbUIsQ0FBbkIsR0FBMEIsQ0FBMUI7UUFDakMsSUFBTyxpQkFBUDtBQUF1QixpQkFBdkI7O1FBRUEsUUFBQSxHQUFjLENBQUMsQ0FBQyxPQUFMLEdBQWtCLElBQWxCLEdBQTRCO1FBQ3ZDLE9BQUEsR0FBVSxRQUFBLEdBQVc7UUFFckIsSUFBRyxLQUFDLENBQUEsV0FBRCxLQUFnQixLQUFLLENBQUMsT0FBekI7VUFDSSxPQUFBLEdBQVUscUJBQXNCLENBQUEsT0FBQTtVQUNoQyxJQUFHLGVBQUg7WUFDSSxLQUFDLENBQUEsU0FBRCxDQUFXLE9BQVg7QUFDQSxtQkFGSjtXQUZKOztRQU1BLElBQUcsS0FBQyxDQUFBLFdBQUQsS0FBZ0IsS0FBSyxDQUFDLE1BQXpCO1VBQ0ksT0FBQSxHQUFVLG9CQUFxQixDQUFBLE9BQUE7VUFDL0IsSUFBRyxlQUFIO1lBQ0ksS0FBQyxDQUFBLFNBQUQsQ0FBVyxPQUFYO0FBQ0EsbUJBRko7O1VBR0EsSUFBRyxTQUFBLEtBQWEsT0FBaEI7WUFBNkIsU0FBQSxHQUFZLElBQXpDOztVQUVBLElBQUcsU0FBQSxLQUFhLFdBQWhCO21CQUNJLEtBQUMsQ0FBQSxjQUFELENBQUEsRUFESjtXQUFBLE1BQUE7bUJBR0ksS0FBQyxDQUFBLGNBQUQsQ0FBZ0IsU0FBaEIsRUFISjtXQVBKOztNQWhCa0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO0VBcEJsQzs7bUJBZ0RSLE1BQUEsR0FBUSxTQUFBLEdBQUE7O21CQUVSLFNBQUEsR0FBVyxTQUFDLFFBQUQsRUFBVyxHQUFYLEVBQWdCLElBQWhCO0FBQ1AsUUFBQTtBQUFBO1NBQVMsb0ZBQVQ7TUFDSSxHQUFBLEdBQU0sUUFBQSxHQUFXO01BQ2pCLE9BQU8sQ0FBQyxHQUFSLENBQVksR0FBWjttQkFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxHQUFaLEVBQWlCLEdBQWpCLEVBQXNCLElBQUssQ0FBQSxDQUFBLENBQTNCO0FBSEo7O0VBRE87O21CQU1YLFNBQUEsR0FBVyxTQUFDLElBQUQ7SUFDUCxJQUFDLENBQUEsV0FBRCxHQUFlO0lBQ2YsSUFBRyxJQUFBLEtBQVEsS0FBSyxDQUFDLE1BQWpCO2FBQ0ksSUFBQyxDQUFBLFNBQUQsQ0FBVyxDQUFYLEVBQWMsSUFBZCxFQUFvQixjQUFwQixFQURKO0tBQUEsTUFFSyxJQUFHLElBQUEsS0FBUSxLQUFLLENBQUMsT0FBakI7YUFDRCxJQUFDLENBQUEsU0FBRCxDQUFXLENBQVgsRUFBYyxJQUFkLEVBQW9CLGNBQXBCLEVBREM7O0VBSkU7O21CQU9YLGNBQUEsR0FBZ0IsU0FBQTtBQUNaLFFBQUE7SUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQXBCLEVBQXlCLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBakMsRUFBc0MsSUFBdEM7QUFDQTtTQUFXLDhHQUFYO01BQ0ksSUFBRyxHQUFBLEdBQU0sSUFBQSxHQUFPLENBQWhCO3FCQUNJLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLEdBQVosRUFBaUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUF6QixFQUNJLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLEdBQUEsR0FBSSxDQUFoQixFQUFtQixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQTNCLENBREosR0FESjtPQUFBLE1BQUE7cUJBSUksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksR0FBWixFQUFpQixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQXpCLEVBQThCLElBQTlCLEdBSko7O0FBREo7O0VBRlk7O21CQVNoQixjQUFBLEdBQWdCLFNBQUMsU0FBRDtBQUNaLFFBQUE7QUFBQSxTQUFXLG9IQUFYO01BQ0ksSUFBRyxHQUFBLEdBQU0sSUFBQSxHQUFPLENBQWhCO1FBQ0ksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksR0FBQSxHQUFJLENBQWhCLEVBQW1CLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBM0IsRUFDSSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxHQUFaLEVBQWlCLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBekIsQ0FESixFQURKOztBQURKO0lBSUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFwQixFQUF5QixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQWpDLEVBQXNDLFNBQXRDO1dBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQUE7RUFOWTs7bUJBUWhCLGtCQUFBLEdBQW9CLFNBQUE7QUFDaEIsUUFBQTtBQUFBLFNBQVcsa0hBQVg7TUFDSSxJQUFHLEdBQUEsR0FBTSxJQUFBLEdBQU8sQ0FBaEI7QUFDSSxhQUFXLHNGQUFYO1VBQ0ksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksR0FBWixFQUFpQixHQUFBLEdBQUksQ0FBckIsRUFDSSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxHQUFaLEVBQWlCLEdBQWpCLENBREo7QUFESixTQURKOztBQURKO0FBS0E7U0FBVyxzRkFBWDttQkFDSSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxHQUFaLEVBQWlCLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBekIsRUFBOEIsSUFBOUI7QUFESjs7RUFOZ0I7O21CQVNwQixpQkFBQSxHQUFtQixTQUFBO0FBQ2YsUUFBQTtBQUFBO1NBQVcsdUdBQVg7OztBQUNJO2FBQVcsc0ZBQVg7VUFDSSxJQUFHLEdBQUEsR0FBTSxJQUFBLEdBQU8sQ0FBaEI7MEJBQ0ksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksR0FBWixFQUFpQixHQUFqQixFQUNJLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLEdBQVosRUFBaUIsR0FBQSxHQUFJLENBQXJCLENBREosR0FESjtXQUFBLE1BQUE7MEJBSUksSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksR0FBWixFQUFpQixHQUFqQixFQUFzQixJQUF0QixHQUpKOztBQURKOzs7QUFESjs7RUFEZTs7OztJQXZLTjs7Ozs7OztBQ2pTakIsSUFBQTs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFlBQVI7O0FBRVQsTUFBQSxHQUFhLElBQUEsTUFBQSxDQUFPLE1BQVA7O0FBRWIsTUFBTSxDQUFDLElBQVAsR0FBYyxNQUFNLENBQUM7Ozs7Ozs7QUNKckIsSUFBQTs7QUFBQSxTQUFBLEdBQVksT0FBQSxDQUFRLFdBQVI7O0FBRVosS0FBQSxHQUFZLElBQUEsU0FBQSxDQUFVLE9BQVY7O0FBRVosS0FBSyxDQUFDLFNBQU4sQ0FBZ0IsV0FBaEIsRUFBNkIsU0FBQyxLQUFEO1NBQVcsS0FBQSxHQUFRLENBQVIsS0FBYTtBQUF4QixDQUE3Qjs7QUFFQSxLQUFLLENBQUMsUUFBTixDQUFlLFNBQWYsRUFBMEIsa0JBQTFCOztBQUNBLEtBQUssQ0FBQyxRQUFOLENBQWUsT0FBZixFQUF3QixhQUF4Qjs7QUFFQSxLQUFLLENBQUMsUUFBTixDQUFlLE9BQWYsRUFBd0IsQ0FBQyxRQUFELEVBQVcsUUFBWCxDQUF4Qjs7QUFFQSxLQUFLLENBQUMsUUFBTixDQUFlLFlBQWYsRUFDSTtFQUFBLEtBQUEsRUFBTyxRQUFQO0VBQ0EsU0FBQSxFQUFXLE9BRFg7RUFFQSxNQUFBLEVBQVEsT0FGUjtFQUdBLFVBQUEsRUFBWTtJQUFDLEdBQUEsRUFBSyxDQUFDLFNBQUQsQ0FBTjtHQUhaO0NBREo7O0FBTUEsS0FBSyxDQUFDLFFBQU4sQ0FBZSxPQUFmLEVBQ0k7RUFBQSxNQUFBLEVBQVEsS0FBUjtFQUNBLEtBQUEsRUFBTyxRQURQO0VBRUEsU0FBQSxFQUFXLG9CQUZYO0NBREo7O0FBS0EsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIERlb2RvcmFudCA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICB2YXIgY2hlY2sgPSAobW9kZSA9PT0gJ2RlYnVnJyk7XG4gICAgdmFyIGFsaWFzZXMgPSB7fTtcbiAgICB2YXIgZmlsdGVycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gdmFsdWVUb1N0cmluZyh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gJ05hTic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBXcmFwIGluIHRyeSBjYXRjaCBpbiBjYXNlIG9mIHNvbWV0aGluZyBsaWtlIGEgY2lyY3VsYXIgb2JqZWN0XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaXBBbm5vdGF0aW9uKHR5cGUpIHtcbiAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGVuZHMgd2l0aCBhID8gb3IgKiBpdCBpcyBhIG51bGxhYmxlIG9yIG9wdGlvbmFsIHZhbHVlXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIFBvc3NpYmxlIGNhc2VzOlxuICAgICAgICAgICAgLy8gMSkgYSBwbGFpbiB0eXBlLCByZXR1cm4gdGhlIHR5cGUgYW5kIG5vIGFubm90YXRpb25zXG4gICAgICAgICAgICAvLyAyKSBhIHR5cGUgd2l0aCBhID8gb3IgKiwgcmV0dXJuIHRoZSB0eXBlIGFuZCB0aGUgc3ltYm9sXG4gICAgICAgICAgICAvLyAzKSBhIHR5cGUgd2l0aCBmaWx0ZXJzLCByZXR1cm4gdGhlIHR5cGUsIGFuIGVtcHR5IHN5bWJvbCwgYW5kIGFuIGFycmF5IG9mIGZpbHRlcnNcbiAgICAgICAgICAgIC8vIDQpIGEgdHlwZSB3aXRoIGEgPyBvciAqIGFuZCBmaWx0ZXJzLCByZXR1cm4gdGhlIHR5cGUsIHRoZSBzeW1ib2wsIGFuZCBhbiBhcnJheSBvZiBmaWx0ZXJzXG4gICAgICAgICAgICAvLyBSZXR1cm4gaXQgbGlrZSB0aGlzOiBbdHlwZSwgW3N5bWJvbCwgZmlsdGVycy4uLl1dIGZvciBjb252ZW5pZW5jZVxuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSA/IG9yICogaW4gdGhlIGFubm90YXRpb24sIHRoYXQgaXMgdGhlIHN0YXJ0IG9mIHRoZSBhbm5vdGF0aW9uXG4gICAgICAgICAgICB2YXIgcUlkeCA9IHR5cGUuaW5kZXhPZignPycpO1xuICAgICAgICAgICAgaWYgKHFJZHggPCAwKSB7XG4gICAgICAgICAgICAgICAgcUlkeCA9IHR5cGUuaW5kZXhPZignKicpO1xuICAgICAgICAgICAgICAgIGlmIChxSWR4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBxSWR4ID0gdHlwZS5pbmRleE9mKCd8Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHFJZHggPj0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgIHR5cGUuc2xpY2UoMCwgcUlkeCksXG4gICAgICAgICAgICAgICAgICAgIHR5cGUuc2xpY2UocUlkeCkuc3BsaXQoJ3wnKVxuICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3R5cGUsIFtdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHR5cGUpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgbGFzdCBlbGVtZW50IGlzIHRoZSBmaWx0ZXIgdG9rZW4sIHVzZSB0aGF0XG4gICAgICAgICAgICBsYXN0RWxlbWVudCA9IHR5cGVbdHlwZS5sZW5ndGggLSAxXVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsYXN0RWxlbWVudCA9PT0gJ3N0cmluZycgJiYgbGFzdEVsZW1lbnQuaW5kZXhPZignW10nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGFubm90YXRpb24gPSB0eXBlW3R5cGUubGVuZ3RoIC0gMV0uc2xpY2UoMik7XG4gICAgICAgICAgICAgICAgdHlwZSA9IHR5cGUuc2xpY2UoMCwgLTEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBbdHlwZSwgYW5ub3RhdGlvbi5zcGxpdCgnfCcpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBbdHlwZSwgW11dO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgIT09IG51bGwgJiYgdHlwZW9mIHR5cGUgPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHR5cGVLZXkgaW4gdHlwZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlS2V5LmluZGV4T2YoJ3t9JykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbiA9IHR5cGVLZXkuc2xpY2UoMik7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0eXBlW3R5cGVLZXldO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdHlwZSwgYW5ub3RhdGlvbi5zcGxpdCgnfCcpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gW3R5cGUsIFtdXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbdHlwZSwgW11dO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsdWVzVG9TdHJpbmcodmFsdWVzKSB7XG4gICAgICAgIHZhciBzdHJzID0gW107XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTx2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgIHN0cnMucHVzaCh2YWx1ZVRvU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWx0ZXIodmFsdWUsIGZpbHRlcikge1xuICAgICAgICB2YXIgcGllY2VzID0gZmlsdGVyLnNwbGl0KCc6Jyk7XG4gICAgICAgIHZhciBmaWx0ZXJOYW1lID0gcGllY2VzWzBdO1xuICAgICAgICB2YXIgZm4gPSBmaWx0ZXJzW2ZpbHRlck5hbWVdO1xuICAgICAgICBpZiAoIWZuKHZhbHVlLCBwaWVjZXNbMV0pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmFsdWUgKyAnIGRvZXMgbm90IHBhc3MgZmlsdGVyICcgKyBmaWx0ZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWx0ZXJzKHZhbHVlLCB0aGVzZUZpbHRlcnMpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRoZXNlRmlsdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2hlY2tGaWx0ZXIodmFsdWUsIHRoZXNlRmlsdGVyc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1JlZ0V4cFR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgaWYgKCF0eXBlLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmFsdWUgKyAnIGRvZXMgbm90IG1hdGNoICcgKyB0eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrVHVwbGVUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcih2YWx1ZSArICcgaXMgbm90IGEgSlMgYXJyYXkgb2YgdHlwZSAnICsgdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGVhY2ggdHlwZSBpbiB0aGUgdHVwbGUsIG1hdGNoIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTx0eXBlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3ViVHlwZSA9IHR5cGVbaV07XG4gICAgICAgICAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtpXTtcbiAgICAgICAgICAgIGlmICghY2hlY2tWYWx1ZXNUeXBlKHN1YlZhbHVlLCBzdWJUeXBlKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdWJWYWx1ZSArICcgZG9lcyBub3QgbWF0Y2ggJyArIHN1YlR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tBcnJheVR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHZhbHVlICsgJyBpcyBub3QgYSBKUyBhcnJheSBvZiB0eXBlICcgKyB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgZWFjaCBlbGVtZW50IG9mIHRoZSB2YWx1ZSwgY29tcGFyaW5nIGl0XG4gICAgICAgIC8vIHdpdGggdGhlIG9uZSB0eXBlXG4gICAgICAgIHZhciBzdWJUeXBlID0gdHlwZVswXTtcbiAgICAgICAgZm9yIChpPTA7IGk8dmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgaWYgKCFjaGVja1ZhbHVlc1R5cGUoc3ViVmFsdWUsIHN1YlR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN1YlZhbHVlICsgJyBkb2VzIG5vdCBtYXRjaCAnICsgc3ViVHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1NpbmdsZVR5cGVPYmplY3RUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIHZhciBzdWJUeXBlID0gdHlwZVsnKiddO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBzdWJWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNoZWNrVmFsdWVzVHlwZShzdWJWYWx1ZSwgc3ViVHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihrZXkgKyAnIGluIG9iamVjdCBkb2VzIG5vdCBtYXRjaDogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja011bHRpcGxlVHlwZU9iamVjdFR5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgLy8gR28gdGhyb3VnaCBlYWNoIGtleTp2YWx1ZSBwYWlyIGFuZCBtYWtlIHN1cmVcbiAgICAgICAgLy8gdGhlIGtleSBpcyBwcmVzZW50IGFuZCB0aGUgdHlwZSBjaGVja3NcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHR5cGUpIHtcbiAgICAgICAgICAgIHZhciBzdWJUeXBlID0gdHlwZVtrZXldO1xuICAgICAgICAgICAgaWYgKHZhbHVlW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT2JqZWN0IG1pc3Npbmcga2V5ICcgKyBrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHN1YlZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2hlY2tWYWx1ZXNUeXBlKHN1YlZhbHVlLCBzdWJUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdLZXkgJyArIGtleSArICcgZG9lcyBub3QgbWF0Y2g6ICcgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tPYmplY3RUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIC8vIHsnKic6ICdOdW1iZXInfSBtZWFucyBhIGRpY3Qgb2Ygc3RyaW5nIHRvIE51bWJlciBvbmx5XG4gICAgICAgIGlmICh0eXBlWycqJ10gJiYgT2JqZWN0LmtleXModHlwZSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjaGVja1NpbmdsZVR5cGVPYmplY3RUeXBlKHZhbHVlLCB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBvdGhlcndpc2Ugd2UgYXJlIGxvb2tpbmcgZm9yIHNwZWNpZmljIGtleXNcbiAgICAgICAgLy8ge3BvczogWydOdW1iZXInLCAnTnVtYmVyJ10sIHNpemU6IHt3aWR0aDogJ051bWJlcicsIGhlaWdodDogJ051bWJlcid9LCB1c2VybmFtZTogJ1N0cmluZycsIGlzTG9nZ2VkSW46ICdCb29sZWFuJ31cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjaGVja011bHRpcGxlVHlwZU9iamVjdFR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tTaW1wbGVUeXBlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIC8vIENsZWFuIHVwIGFueSBleHRyYW5lb3VzIHNwYWNlc1xuICAgICAgICB0eXBlID0gdHlwZS5yZXBsYWNlKC8gL2csICcnKTtcblxuICAgICAgICAvLyBBbHdheXMgY3J5IGlmIE5hTi4gTm9ib2R5IHdvdWxkIGV2ZXIgd2FudCBOYU4uIFdoeSBpcyBOYU4gaW4gdGhlIGxhbmd1YWdlP1xuICAgICAgICBpZiAodmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05hTiBkb2VzIG5vdCBtYXRjaCB0eXBlICcgKyB0eXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgZG9uJ3QgY3J5IGZvciB1bmRlZmluZWQgaWYgdHlwZSBpcyBWb2lkXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodHlwZSAhPT0gJ1ZvaWQnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmRlZmluZWQgZG9lcyBub3QgbWF0Y2ggdHlwZSAnICsgdHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOdWxsIGlzIHNpbXBsZSBlbm91Z2gsIHRoYW5rIGdvb2RuZXNzIGZvciB0cmlwbGUtc3R5bGUgZXF1YWxzXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCAmJiB0eXBlID09PSAnTnVsbCcpIHJldHVybjtcblxuICAgICAgICAvLyB0eXBlb2Ygd29ya3MgYXMgaXQgc2hvdWxkIGZvciBhbGwgb2YgdGhlc2UgdHlwZXMgeWF5XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIHR5cGUgPT09ICdOdW1iZXInKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHR5cGUgPT09ICdTdHJpbmcnKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyAmJiB0eXBlID09PSAnQm9vbGVhbicpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nICYmIHR5cGUgPT09ICdGdW5jdGlvbicpIHJldHVybjtcblxuICAgICAgICAvLyBUaGUgQW55IHR5cGUgd2lsbCBjcnkgb24gdW5kZWZpbmVkIG9yIE5hTiBidXQgd2lsbCBhY2NlcHQgYW55dGhpbmcgZWxzZVxuICAgICAgICBpZiAodHlwZSA9PT0gJ0FueScgfHwgdHlwZSA9PT0gJ1ZvaWQnKSByZXR1cm47XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHZhbHVlICsgJyBkb2VzIG5vdCBtYXRjaCB0eXBlICcgKyB0eXBlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1ZhbHVlc1R5cGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgdmFyIHJlcyA9IHN0cmlwQW5ub3RhdGlvbih0eXBlKTtcbiAgICAgICAgdHlwZSA9IHJlc1swXTtcbiAgICAgICAgdmFyIGFubm90YXRpb24gPSByZXNbMV07XG4gICAgICAgIHZhciBpc051bGxhYmxlID0gYW5ub3RhdGlvblswXSA9PT0gJz8nO1xuICAgICAgICB2YXIgaXNVbmRlZmluZWRhYmxlID0gYW5ub3RhdGlvblswXSA9PT0gJyonO1xuICAgICAgICB2YXIgdGhlc2VGaWx0ZXJzID0gYW5ub3RhdGlvbi5zbGljZSgxLCBhbm5vdGF0aW9uLmxlbmd0aCk7XG5cbiAgICAgICAgLy8gRG8gbnVsbGFibGUgY2hlY2tcbiAgICAgICAgaWYgKGlzTnVsbGFibGUgJiYgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNVbmRlZmluZWRhYmxlICYmIHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGVzZUZpbHRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY2hlY2tGaWx0ZXJzKHZhbHVlLCB0aGVzZUZpbHRlcnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9Qb3NpdGl2ZUludGVnZXIgLT4gSW50ZWdlcnxndGU6MCAtPiBOdW1iZXJ8aXNJbnRlZ2VyfGd0ZTowXG5cbiAgICAgICAgLy8gUmVwbGFjZSBhbnkgYWxpYXNlcyB3aXRoIGEgZGVlcCBjb3B5XG4gICAgICAgIC8vIHNvIHdlIGNhbiBkbyBmdXJ0aGVyIG1vZGlmaWNhdGlvbnMsIGFuZCByZWN1cnNlXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgJiYgdHlwZSBpbiBhbGlhc2VzKSB7XG4gICAgICAgICAgICB0eXBlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhbGlhc2VzW3R5cGVdKSk7XG4gICAgICAgICAgICBjaGVja1ZhbHVlc1R5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyBDaGVjayByZWdleHBzXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodHlwZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICAgICAgICBjaGVja1JlZ0V4cFR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgYXJyYXlzIGFuZCB0dXBsZXNcbiAgICAgICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSkge1xuICAgICAgICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBtYWtlIHRoaXMgc2hvdyBhIGJldHRlciBlcnJvciBtZXNzYWdlIHNvbWVob3dcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvLyBBcnJheSBvZiBhbGwgdGhlIHNhbWUgdHlwZSBvciBlbXB0eVxuICAgICAgICAgICAgICAgIC8vIFsnTnVtYmVyJ10gWydTdHJpbmcnXVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrQXJyYXlUeXBlKHZhbHVlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVHVwbGUgKGFycmF5IGluIEpTKSBvZiBhIGZpeGVkIG51bWJlciBvZiBkaWZmZXJlbnQgdHlwZXMsXG4gICAgICAgICAgICAgICAgLy8gYXQgbGVhc3QgMiAoMS10dXBsZSB3b3VsZCBiZSB0aGUgc2FtZSBzeW50YXggYXMgYXJyYXlcbiAgICAgICAgICAgICAgICAvLyBvZiBzYW1lIHR5cGUsIGJ1dCBpcyBhbHNvIG1vc3RseSB1c2VsZXNzIGFueXdheVxuICAgICAgICAgICAgICAgIC8vIFsnTnVtYmVyJywgU3RyaW5nLCBCb29sZWFuXSdcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyciA9IGNoZWNrVHVwbGVUeXBlKHZhbHVlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIG9iamVjdHNcbiAgICAgICAgZWxzZSBpZiAodHlwZSAhPT0gbnVsbCAmJiB0eXBlb2YgdHlwZSA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2hlY2tPYmplY3RUeXBlKHZhbHVlLCB0eXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHNpbXBsZSB2YWx1ZXNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjaGVja1NpbXBsZVR5cGUodmFsdWUsIHR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGdW5jdGlvbihzaWduYXR1cmUsIGZuLCBmbk5hbWUpIHtcbiAgICAgICAgaWYgKCFjaGVjaykge1xuICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogTWFrZSBhIG1vcmUgcm9idXN0IGNoZWNrZXIgZm9yIGVycm9ycyBpbiB0eXBlIHNpZ25hdHVyZXNcbiAgICAgICAgLy9mb3IgKHZhciBqPTA7IGo8c2lnbmF0dXJlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIC8vICAgIHZhciB0eXBlID0gc2lnbmF0dXJlW2pdO1xuICAgICAgICAvLyAgICBpZiAoKHR5cGVvZiB0eXBlKSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlICcgKyB0eXBlKTtcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL31cblxuICAgICAgICBpZiAoZm5OYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChmbi5uYW1lKSB7XG4gICAgICAgICAgICAgICAgZm5OYW1lID0gZm4ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZuTmFtZSA9ICdhbm9ueW1vdXMnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciByZXR1cm5UeXBlID0gc2lnbmF0dXJlW3NpZ25hdHVyZS5sZW5ndGgtMV07XG4gICAgICAgIHZhciBhcmdUeXBlcyA9IHNpZ25hdHVyZS5zbGljZSgwLCBzaWduYXR1cmUubGVuZ3RoIC0gMSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSAoMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCB3ZSBoYXZlIHRoZSBjb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHNcbiAgICAgICAgICAgIC8vIE9wdGlvbmFsIHBhcmFtZXRlcnMgbWFrZSB0aGlzIGNoZWNrIGhhcmRlciwgZG8gd2UgYWN0dWFsbHkgbmVlZCBpdCB0aG91Z2g/XG4gICAgICAgICAgICAvL2lmIChhcmdzLmxlbmd0aCAhPT0gc2lnbmF0dXJlLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIC8vICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgZm9yIGZ1bmN0aW9uIFwiJyArIGZuTmFtZSArICdcIjogRXhwZWN0ZWQgJyArIChzaWduYXR1cmUubGVuZ3RoIC0gMSkgKyAnLCBidXQgZ290ICcgKyBhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZWFjaCBhcmd1bWVudCdzIHR5cGVcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxhcmdUeXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBhcmdUeXBlID0gYXJnVHlwZXNbaV07XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3NbaV07XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja1ZhbHVlc1R5cGUoYXJnLCBhcmdUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiBcIicgKyBmbk5hbWUgKyAnXCIgYXJndW1lbnQgJyArIGkgKyAnIGRvZXMgbm90IG1hdGNoOiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IGNhbGwgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayByZXR1cm4gdmFsdWUgdHlwZVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjaGVja1ZhbHVlc1R5cGUocmV0dXJuVmFsdWUsIHJldHVyblR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Z1bmN0aW9uIFwiJyArIGZuTmFtZSArICdcIiByZXR1cm4gdmFsdWUgZG9lcyBub3QgbWF0Y2g6ICcgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNoZWNrTW9kdWxlKHNwZWMsIHRoaXNfKSB7XG4gICAgICAgIHZhciBzaWduYXR1cmVzID0ge307XG4gICAgICAgIHZhciBmbnMgPSB7fTtcbiAgICAgICAgdmFyIHR5cGVkTW9kdWxlID0ge307XG5cbiAgICAgICAgLy8gUGFyc2Ugb3V0IHRoZSBtb2R1bGUncyB0eXBlIHNpZ25hdHVyZXMgYW5kIGZ1bmN0aW9uc1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3BlYykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc3BlY1trZXldO1xuICAgICAgICAgICAgaWYgKGtleVtrZXkubGVuZ3RoLTFdID09PSAnXycpIHtcbiAgICAgICAgICAgICAgICBzaWduYXR1cmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIGFsc28gYSB0eXBlIHNpZ25hdHVyZSBob2xkIG9uIHRvIHRoaXMgZm4sXG4gICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3QgcHV0IGl0IGluIHRoZSBuZXcgbW9kdWxlIGFzIGlzXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5iaW5kKHR5cGVkTW9kdWxlKTtcbiAgICAgICAgICAgICAgICBpZiAoc3BlY1soa2V5ICsgJ18nKV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZm5zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVkTW9kdWxlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlZE1vZHVsZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIFdyYXAgZWFjaCBmdW5jdGlvbiBpbiB0aGUgbW9kdWxlXG4gICAgICAgIGZvciAodmFyIGZuTmFtZSBpbiBmbnMpIHtcbiAgICAgICAgICAgIHZhciBmbiA9IGZuc1tmbk5hbWVdO1xuICAgICAgICAgICAgdmFyIHNpZ25hdHVyZSA9IHNpZ25hdHVyZXNbZm5OYW1lICsgJ18nXTtcbiAgICAgICAgICAgIHR5cGVkTW9kdWxlW2ZuTmFtZV0gPSBjaGVja0Z1bmN0aW9uKHNpZ25hdHVyZSwgZm4sIGZuTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHlwZWRNb2R1bGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tDbGFzcyhjbGFzc18pIHtcbiAgICAgICAgaWYgKCFjaGVjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNsYXNzXztcbiAgICAgICAgfVxuICAgICAgICB2YXIgZmFjdG9yeSA9IGZ1bmN0aW9uKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYsIGFyZzcsIGFyZzgsIGFyZzksIGFyZzEwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hlY2tNb2R1bGUobmV3IGNsYXNzXyhhcmcxLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2LCBhcmc3LCBhcmc4LCBhcmc5LCBhcmcxMCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgnY29uc3RydWN0b3JfJyBpbiBjbGFzc18ucHJvdG90eXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hlY2tGdW5jdGlvbihjbGFzc18ucHJvdG90eXBlLmNvbnN0cnVjdG9yXywgZmFjdG9yeSwgJ2NvbnN0cnVjdG9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFjdG9yeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZEFsaWFzKG5hbWUsIGV4cGFuc2lvbikge1xuICAgICAgICBhbGlhc2VzW25hbWVdID0gZXhwYW5zaW9uO1xuICAgIH1cbiAgICBmdW5jdGlvbiBhZGRGaWx0ZXIobmFtZSwgZm4pIHtcbiAgICAgICAgZmlsdGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrU2lnbmF0dXJlRm9yVmFsdWVzKHNpZ25hdHVyZSwgdmFsdWVzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdWYWx1ZXMgPSB2YWx1ZXMuc2xpY2UoMCwgdmFsdWVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgdmFyIHJldHVyblZhbHVlID0gdmFsdWVzW3ZhbHVlcy5sZW5ndGgtMV07XG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm4gPSBjaGVja0Z1bmN0aW9uKHNpZ25hdHVyZSwgZm4pO1xuICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJnVmFsdWVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNoZWNrRnVuY3Rpb246IGNoZWNrRnVuY3Rpb24sXG4gICAgICAgIGNoZWNrTW9kdWxlOiBjaGVja01vZHVsZSxcbiAgICAgICAgY2hlY2tDbGFzczogY2hlY2tDbGFzcyxcbiAgICAgICAgYWRkQWxpYXM6IGFkZEFsaWFzLFxuICAgICAgICBhZGRGaWx0ZXI6IGFkZEZpbHRlcixcbiAgICAgICAgY2hlY2tTaWduYXR1cmVGb3JWYWx1ZXM6IGNoZWNrU2lnbmF0dXJlRm9yVmFsdWVzXG4gICAgfTtcblxufTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgbW9kdWxlICE9IG51bGwgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IERlb2RvcmFudDtcbn1cbmVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gRGVvZG9yYW50O1xuICAgIH0pO1xufVxuZWxzZSB7XG4gICAgd2luZG93LkRlb2RvcmFudCA9IERlb2RvcmFudDtcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICB2YXIgaVxuICB2YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuICB2YXIgbGVuID0gY29kZS5sZW5ndGhcblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbiAgfVxuICByZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbiAgcmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG59XG5cbmluaXQoKVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG4gIC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcbiAgLy8gcmVwcmVzZW50IG9uZSBieXRlXG4gIC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuICAvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG4gIHBsYWNlSG9sZGVycyA9IGI2NFtsZW4gLSAyXSA9PT0gJz0nID8gMiA6IGI2NFtsZW4gLSAxXSA9PT0gJz0nID8gMSA6IDBcblxuICAvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbiAgYXJyID0gbmV3IEFycihsZW4gKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gbGVuIC0gNCA6IGxlblxuXG4gIHZhciBMID0gMFxuXG4gIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHwgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbTCsrXSA9ICh0bXAgJiAweEZGMDAwMCkgPj4gMTZcbiAgICBhcnJbTCsrXSA9ICh0bXAgJiAweEZGMDApID4+IDhcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICsgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIG91dHB1dCA9ICcnXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAyXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9PSdcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgKHVpbnQ4W2xlbiAtIDFdKVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDEwXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz0nXG4gIH1cblxuICBwYXJ0cy5wdXNoKG91dHB1dClcblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIHJvb3RQYXJlbnQgPSB7fVxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBEdWUgdG8gdmFyaW91cyBicm93c2VyIGJ1Z3MsIHNvbWV0aW1lcyB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXNlZCBldmVuXG4gKiB3aGVuIHRoZSBicm93c2VyIHN1cHBvcnRzIHR5cGVkIGFycmF5cy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqICAgLSBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsXG4gKiAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cblxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXlcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IGJlaGF2ZXMgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUICE9PSB1bmRlZmluZWRcbiAgPyBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVFxuICA6IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDIgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgYXJyLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGtNYXhMZW5ndGggKCkge1xuICByZXR1cm4gQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgICA/IDB4N2ZmZmZmZmZcbiAgICA6IDB4M2ZmZmZmZmZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChhcmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAvLyBBdm9pZCBnb2luZyB0aHJvdWdoIGFuIEFyZ3VtZW50c0FkYXB0b3JUcmFtcG9saW5lIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHJldHVybiBuZXcgQnVmZmVyKGFyZywgYXJndW1lbnRzWzFdKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZylcbiAgfVxuXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzLmxlbmd0aCA9IDBcbiAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZFxuICB9XG5cbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBmcm9tTnVtYmVyKHRoaXMsIGFyZylcbiAgfVxuXG4gIC8vIFNsaWdodGx5IGxlc3MgY29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHRoaXMsIGFyZywgYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiAndXRmOCcpXG4gIH1cblxuICAvLyBVbnVzdWFsLlxuICByZXR1cm4gZnJvbU9iamVjdCh0aGlzLCBhcmcpXG59XG5cbi8vIFRPRE86IExlZ2FjeSwgbm90IG5lZWRlZCBhbnltb3JlLiBSZW1vdmUgaW4gbmV4dCBtYWpvciB2ZXJzaW9uLlxuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIGZyb21OdW1iZXIgKHRoYXQsIGxlbmd0aCkge1xuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGxlbmd0aCkgfCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdGhhdFtpXSA9IDBcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAodGhhdCwgc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgLy8gQXNzdW1wdGlvbjogYnl0ZUxlbmd0aCgpIHJldHVybiB2YWx1ZSBpcyBhbHdheXMgPCBrTWF4TGVuZ3RoLlxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICB0aGF0LndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKHRoYXQsIG9iamVjdCkge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iamVjdCkpIHJldHVybiBmcm9tQnVmZmVyKHRoYXQsIG9iamVjdClcblxuICBpZiAoaXNBcnJheShvYmplY3QpKSByZXR1cm4gZnJvbUFycmF5KHRoYXQsIG9iamVjdClcblxuICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHN0YXJ0IHdpdGggbnVtYmVyLCBidWZmZXIsIGFycmF5IG9yIHN0cmluZycpXG4gIH1cblxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChvYmplY3QuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiBmcm9tVHlwZWRBcnJheSh0aGF0LCBvYmplY3QpXG4gICAgfVxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih0aGF0LCBvYmplY3QpXG4gICAgfVxuICB9XG5cbiAgaWYgKG9iamVjdC5sZW5ndGgpIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iamVjdClcblxuICByZXR1cm4gZnJvbUpzb25PYmplY3QodGhhdCwgb2JqZWN0KVxufVxuXG5mdW5jdGlvbiBmcm9tQnVmZmVyICh0aGF0LCBidWZmZXIpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYnVmZmVyLmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGJ1ZmZlci5jb3B5KHRoYXQsIDAsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5ICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLy8gRHVwbGljYXRlIG9mIGZyb21BcnJheSgpIHRvIGtlZXAgZnJvbUFycmF5KCkgbW9ub21vcnBoaWMuXG5mdW5jdGlvbiBmcm9tVHlwZWRBcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgLy8gVHJ1bmNhdGluZyB0aGUgZWxlbWVudHMgaXMgcHJvYmFibHkgbm90IHdoYXQgcGVvcGxlIGV4cGVjdCBmcm9tIHR5cGVkXG4gIC8vIGFycmF5cyB3aXRoIEJZVEVTX1BFUl9FTEVNRU5UID4gMSBidXQgaXQncyBjb21wYXRpYmxlIHdpdGggdGhlIGJlaGF2aW9yXG4gIC8vIG9mIHRoZSBvbGQgQnVmZmVyIGNvbnN0cnVjdG9yLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyICh0aGF0LCBhcnJheSkge1xuICBhcnJheS5ieXRlTGVuZ3RoIC8vIHRoaXMgdGhyb3dzIGlmIGBhcnJheWAgaXMgbm90IGEgdmFsaWQgQXJyYXlCdWZmZXJcblxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gICAgdGhhdC5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQgPSBmcm9tVHlwZWRBcnJheSh0aGF0LCBuZXcgVWludDhBcnJheShhcnJheSkpXG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIERlc2VyaWFsaXplIHsgdHlwZTogJ0J1ZmZlcicsIGRhdGE6IFsxLDIsMywuLi5dIH0gaW50byBhIEJ1ZmZlciBvYmplY3QuXG4vLyBSZXR1cm5zIGEgemVyby1sZW5ndGggYnVmZmVyIGZvciBpbnB1dHMgdGhhdCBkb24ndCBjb25mb3JtIHRvIHRoZSBzcGVjLlxuZnVuY3Rpb24gZnJvbUpzb25PYmplY3QgKHRoYXQsIG9iamVjdCkge1xuICB2YXIgYXJyYXlcbiAgdmFyIGxlbmd0aCA9IDBcblxuICBpZiAob2JqZWN0LnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqZWN0LmRhdGEpKSB7XG4gICAgYXJyYXkgPSBvYmplY3QuZGF0YVxuICAgIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgfVxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5pZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuICBCdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICAgIC8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcbiAgfVxufSBlbHNlIHtcbiAgLy8gcHJlLXNldCBmb3IgdmFsdWVzIHRoYXQgbWF5IGV4aXN0IGluIHRoZSBmdXR1cmVcbiAgQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbiAgQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcbn1cblxuZnVuY3Rpb24gYWxsb2NhdGUgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICB9XG5cbiAgdmFyIGZyb21Qb29sID0gbGVuZ3RoICE9PSAwICYmIGxlbmd0aCA8PSBCdWZmZXIucG9vbFNpemUgPj4+IDFcbiAgaWYgKGZyb21Qb29sKSB0aGF0LnBhcmVudCA9IHJvb3RQYXJlbnRcblxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwga01heExlbmd0aGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBrTWF4TGVuZ3RoKCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aCgpLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTbG93QnVmZmVyKSkgcmV0dXJuIG5ldyBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuICBkZWxldGUgYnVmLnBhcmVudFxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICB2YXIgaSA9IDBcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIGJyZWFrXG5cbiAgICArK2lcbiAgfVxuXG4gIGlmIChpICE9PSBsZW4pIHtcbiAgICB4ID0gYVtpXVxuICAgIHkgPSBiW2ldXG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3QgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzLicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSBzdHJpbmcgPSAnJyArIHN0cmluZ1xuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgLy8gRGVwcmVjYXRlZFxuICAgICAgY2FzZSAncmF3JzpcbiAgICAgIGNhc2UgJ3Jhd3MnOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgfCAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCB8IDBcblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoZW5kIDw9IHN0YXJ0KSByZXR1cm4gJydcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhlIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgYW5kIGBpcy1idWZmZXJgIChpbiBTYWZhcmkgNS03KSB0byBkZXRlY3Rcbi8vIEJ1ZmZlciBpbnN0YW5jZXMuXG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIDBcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCkge1xuICBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIGJ5dGVPZmZzZXQgPj49IDBcblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiAtMVxuICBpZiAoYnl0ZU9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuIC0xXG5cbiAgLy8gTmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBNYXRoLm1heCh0aGlzLmxlbmd0aCArIGJ5dGVPZmZzZXQsIDApXG5cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHJldHVybiAtMSAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZyBhbHdheXMgZmFpbHNcbiAgICByZXR1cm4gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZih0aGlzLCBbIHZhbCBdLCBieXRlT2Zmc2V0KVxuICB9XG5cbiAgZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCkge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKHZhciBpID0gMDsgYnl0ZU9mZnNldCArIGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJbYnl0ZU9mZnNldCArIGldID09PSB2YWxbZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXhdKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsLmxlbmd0aCkgcmV0dXJuIGJ5dGVPZmZzZXQgKyBmb3VuZEluZGV4XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKHBhcnNlZCkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoIHwgMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIC8vIGxlZ2FjeSB3cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aCkgLSByZW1vdmUgaW4gdjAuMTNcbiAgfSBlbHNlIHtcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGggfCAwXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gICAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKSBuZXdCdWYucGFyZW50ID0gdGhpcy5wYXJlbnQgfHwgdGhpc1xuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDAgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdmFsdWVcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gdXRmOFRvQnl0ZXModmFsdWUudG9TdHJpbmcoKSlcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cbiIsInZhciB0b1N0cmluZyA9IHt9LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwidHlwZXMgPSByZXF1aXJlKCdzcmMvdHlwZXMnKVxuXG5cbkNPTFMgPSA4MFxuUk9XUyA9IDI0XG5cblRJTEVfV0lEVEggPSAxNlxuVElMRV9IRUlHSFQgPSAzMlxuXG5TQ1JFRU5fV0lEVEggPSBDT0xTICogVElMRV9XSURUSFxuU0NSRUVOX0hFSUdIVCA9IFJPV1MgKiBUSUxFX0hFSUdIVCArIFRJTEVfSEVJR0hUXG5cbktFWUNPREVTID0gW11cbktFWUNPREVTWzhdICA9IFsnYmFja3NwYWNlJywgJ2JhY2tzcGFjZSddXG5LRVlDT0RFU1s5XSAgPSBbJ3RhYicsICd0YWInXVxuS0VZQ09ERVNbMTNdID0gWydlbnRlcicsICdlbnRlciddXG5LRVlDT0RFU1syN10gPSBbJ2VzYycsICdlc2MnXVxuS0VZQ09ERVNbMzJdID0gWydzcGFjZScsICdzcGFjZSddXG5cbktFWUNPREVTWzQ4XSA9IFsnMCcsICcpJ11cbktFWUNPREVTWzQ5XSA9IFsnMScsICchJ11cbktFWUNPREVTWzUwXSA9IFsnMicsICdAJ11cbktFWUNPREVTWzUxXSA9IFsnMycsICcjJ11cbktFWUNPREVTWzUyXSA9IFsnNCcsICckJ11cbktFWUNPREVTWzUzXSA9IFsnNScsICclJ11cbktFWUNPREVTWzU0XSA9IFsnNicsICdeJ11cbktFWUNPREVTWzU1XSA9IFsnNycsICcmJ11cbktFWUNPREVTWzU2XSA9IFsnOCcsICcqJ11cbktFWUNPREVTWzU3XSA9IFsnOScsICcoJ11cblxuS0VZQ09ERVNbNjVdID0gWydhJywgJ0EnXVxuS0VZQ09ERVNbNjZdID0gWydiJywgJ0InXVxuS0VZQ09ERVNbNjddID0gWydjJywgJ0MnXVxuS0VZQ09ERVNbNjhdID0gWydkJywgJ0QnXVxuS0VZQ09ERVNbNjldID0gWydlJywgJ0UnXVxuS0VZQ09ERVNbNzBdID0gWydmJywgJ0YnXVxuS0VZQ09ERVNbNzFdID0gWydnJywgJ0cnXVxuS0VZQ09ERVNbNzJdID0gWydoJywgJ0gnXVxuS0VZQ09ERVNbNzNdID0gWydpJywgJ0knXVxuS0VZQ09ERVNbNzRdID0gWydqJywgJ0onXVxuS0VZQ09ERVNbNzVdID0gWydrJywgJ0snXVxuS0VZQ09ERVNbNzZdID0gWydsJywgJ0wnXVxuS0VZQ09ERVNbNzddID0gWydtJywgJ00nXVxuS0VZQ09ERVNbNzhdID0gWyduJywgJ04nXVxuS0VZQ09ERVNbNzldID0gWydvJywgJ08nXVxuS0VZQ09ERVNbODBdID0gWydwJywgJ1AnXVxuS0VZQ09ERVNbODFdID0gWydxJywgJ1EnXVxuS0VZQ09ERVNbODJdID0gWydyJywgJ1InXVxuS0VZQ09ERVNbODNdID0gWydzJywgJ1MnXVxuS0VZQ09ERVNbODRdID0gWyd0JywgJ1QnXVxuS0VZQ09ERVNbODVdID0gWyd1JywgJ1UnXVxuS0VZQ09ERVNbODZdID0gWyd2JywgJ1YnXVxuS0VZQ09ERVNbODddID0gWyd3JywgJ1cnXVxuS0VZQ09ERVNbODhdID0gWyd4JywgJ1gnXVxuS0VZQ09ERVNbODldID0gWyd5JywgJ1knXVxuS0VZQ09ERVNbOTBdID0gWyd6JywgJ1onXVxuXG5LRVlDT0RFU1sxODddICA9IFsnKycsICc9J11cbktFWUNPREVTWzE4OV0gID0gWyctJywgJ18nXVxuS0VZQ09ERVNbMTg2XSA9IFsnOycsICc6J11cbktFWUNPREVTWzE4OF0gPSBbJywnLCAnPCddXG5LRVlDT0RFU1sxOTBdID0gWycuJywgJz4nXVxuS0VZQ09ERVNbMTkxXSA9IFsnLycsICc/J11cbktFWUNPREVTWzE5Ml0gPSBbJ2AnLCAnfiddXG5LRVlDT0RFU1syMTldID0gWydbJywgJ3snXVxuS0VZQ09ERVNbMjIwXSA9IFsnXFxcXCcsJ3wnXVxuS0VZQ09ERVNbMjIxXSA9IFsnXScsICd9J11cbktFWUNPREVTWzIyMl0gPSBbXCInXCIsICdcIiddXG5cbkNIQVIyVElMRSA9XG4gICAgYTogMFxuICAgIGI6IDFcbiAgICBjOiAyXG4gICAgZDogM1xuICAgIGU6IDRcbiAgICBmOiA1XG4gICAgZzogNlxuICAgIGg6IDdcbiAgICBpOiA4XG4gICAgajogOVxuICAgIGs6IDEwXG4gICAgbDogMTFcbiAgICBtOiAxMlxuICAgIG46IDEzXG4gICAgbzogMTRcbiAgICBwOiAxNVxuICAgIHE6IDE2XG4gICAgcjogMTdcbiAgICBzOiAxOFxuICAgIHQ6IDE5XG4gICAgdTogMjBcbiAgICB2OiAyMVxuICAgIHc6IDIyXG4gICAgeDogMjNcbiAgICB5OiAyNFxuICAgIHo6IDI1XG4gICAgQTogMjZcbiAgICBCOiAyN1xuICAgIEM6IDI4XG4gICAgRDogMjlcbiAgICBFOiAzMFxuICAgIEY6IDMxXG4gICAgRzogMzJcbiAgICBIOiAzM1xuICAgIEk6IDM0XG4gICAgSjogMzVcbiAgICBLOiAzNlxuICAgIEw6IDM3XG4gICAgTTogMzhcbiAgICBOOiAzOVxuICAgIE86IDQwXG4gICAgUDogNDFcbiAgICBROiA0MlxuICAgIFI6IDQzXG4gICAgUzogNDRcbiAgICBUOiA0NVxuICAgIFU6IDQ2XG4gICAgVjogNDdcbiAgICBXOiA0OFxuICAgIFg6IDQ5XG4gICAgWTogNTBcbiAgICBaOiA1MVxuICAgICcwJzogNTJcbiAgICAnMSc6IDUzXG4gICAgJzInOiA1NFxuICAgICczJzogNTVcbiAgICAnNCc6IDU2XG4gICAgJzUnOiA1N1xuICAgICc2JzogNThcbiAgICAnNyc6IDU5XG4gICAgJzgnOiA2MFxuICAgICc5JzogNjFcbiAgICAnMCc6IDYyXG4gICAgJyEnOiA2M1xuICAgICdAJzogNjRcbiAgICAnIyc6IDY1XG4gICAgJyQnOiA2NlxuICAgICclJzogNjdcbiAgICAnXic6IDY4XG4gICAgJyYnOiA2OVxuICAgICcqJzogNzBcbiAgICAnKCc6IDcxXG4gICAgJyknOiA3MlxuICAgICdbJzogNzNcbiAgICAnXSc6IDc0XG4gICAgJ3snOiA3NVxuICAgICd9JzogNzZcbiAgICAnICc6IDc3XG4gICAgJ2AnOiA3OFxuICAgICd+JzogNzlcbiAgICAnLyc6IDgwXG4gICAgJz0nOiA4MVxuICAgICdcXFxcJzo4MlxuICAgICc/JzogODNcbiAgICAnKyc6IDg0XG4gICAgJ3wnOiA4NVxuICAgICctJzogODZcbiAgICAnXyc6IDg3XG4gICAgJzsnOiA4OFxuICAgICc6JzogODlcbiAgICAnLCc6IDkwXG4gICAgJy4nOiA5MVxuICAgICc8JzogOTJcbiAgICAnPic6IDkzXG5cbk1PREVTID0ge1xuICAgICdDT01NQU5EJ1xuICAgICdJTlNFUlQnXG4gICAgJ1ZJU1VBTCdcbiAgICAnVklTVUFMIExJTkUnXG4gICAgJ1ZJU1VBTCBCTE9DSydcbn1cblxuQ09NTUFORFMgPSB7XG4gICAgJ0VTQ0FQRSdcbiAgICAnSU5TRVJUJ1xuICAgICdJTlNFUlRfQUZURVInXG4gICAgJ0lOU0VSVF9TVUJTVElUVVRFJ1xuICAgICdJTlNFUlRfT1BFTidcbiAgICAnSU5TRVJUX09QRU5fQUJPVkUnXG5cbiAgICAnQ0hBTkdFX1JFU1RfT0ZfTElORSdcbiAgICAnREVMRVRFX1JFU1RfT0ZfTElORSdcblxuICAgICdCQUNLV0FSRF9DSEFSQUNURVInXG4gICAgJ1BSRVZfTElORSdcbiAgICAnTkVYVF9MSU5FJ1xuICAgICdGT1JXQVJEX0NIQVJBQ1RFUidcbiAgICAnQkVHSU5OSU5HX09GX0xJTkUnXG4gICAgJ0VORF9PRl9MSU5FJ1xuICAgICdGT1JXQVJEX1dPUkQnXG4gICAgJ0JBQ0tXQVJEX1dPUkQnXG4gICAgJ0ZPUldBUkRfRU5EX1dPUkQnXG4gICAgJ0RFTEVURV9DSEFSQUNURVInXG4gICAgJ0RFTEVURV9CQUNLV0FSRF9DSEFSQUNURVInXG59XG5cbkNPTU1BTkRfTU9ERV9CSU5ESU5HUyA9XG4gICAgaTogQ09NTUFORFMuSU5TRVJUXG4gICAgYTogQ09NTUFORFMuSU5TRVJUX0FGVEVSXG4gICAgazogQ09NTUFORFMuSU5TRVJUX1NVQlNUSVRVVEVcbiAgICBvOiBDT01NQU5EUy5JTlNFUlRfT1BFTlxuICAgIE86IENPTU1BTkRTLklOU0VSVF9PUEVOX0FCT1ZFXG5cbiAgICBDOiBDT01NQU5EUy5DSEFOR0VfUkVTVF9PRl9MSU5FXG4gICAgRDogQ09NTUFORFMuREVMRVRFX1JFU1RfT0ZfTElORVxuICAgICNjYzogQ09NTUFORFMuQ0hBTkdFX0xJTkVcbiAgICAjZGQ6IENPTU1BTkRTLkRFTEVURV9MSU5FXG5cbiAgICBoOiBDT01NQU5EUy5CQUNLV0FSRF9DSEFSQUNURVJcbiAgICB0OiBDT01NQU5EUy5QUkVWX0xJTkVcbiAgICBuOiBDT01NQU5EUy5ORVhUX0xJTkVcbiAgICBzOiBDT01NQU5EUy5GT1JXQVJEX0NIQVJBQ1RFUlxuICAgIEg6IENPTU1BTkRTLkJFR0lOTklOR19PRl9MSU5FXG4gICAgUzogQ09NTUFORFMuRU5EX09GX0xJTkVcbiAgICB3OiBDT01NQU5EUy5GT1JXQVJEX1dPUkRcbiAgICBiOiBDT01NQU5EUy5CQUNLV0FSRF9XT1JEXG4gICAgZTogQ09NTUFORFMuRk9SV0FSRF9FTkRfV09SRFxuICAgIHg6IENPTU1BTkRTLkRFTEVURV9DSEFSQUNURVJcblxuSU5TRVJUX01PREVfQklORElOR1MgPVxuICAgICdiYWNrc3BhY2UnOiBDT01NQU5EUy5ERUxFVEVfQkFDS1dBUkRfQ0hBUkFDVEVSXG4gICAgJ2VzYyc6IENPTU1BTkRTLkVTQ0FQRVxuICAgICdDLWMnOiBDT01NQU5EUy5FU0NBUEVcbiAgICAnQy1bJzogQ09NTUFORFMuRVNDQVBFXG4gICAgJ0Mtdyc6IENPTU1BTkRTLkJBQ0tXQVJEX0NIQVJBQ1RFUlxuICAgICdDLW4nOiBDT01NQU5EUy5ORVhUX0xJTkVcbiAgICAnQy10JzogQ09NTUFORFMuUFJFVl9MSU5FXG5cblxuY2xhc3MgQ3Vyc29yXG4gICAgY29uc3RydWN0b3I6IChAZ2FtZSkgLT5cbiAgICAgICAgQHNwcml0ZSA9IEBnYW1lLmFkZC5ncmFwaGljcygwLCAwKVxuICAgICAgICBAc3ByaXRlLmJlZ2luRmlsbCgweDAwQUEwMClcbiAgICAgICAgQHNwcml0ZS5kcmF3UmVjdCgwLCAwLCBUSUxFX1dJRFRILCBUSUxFX0hFSUdIVClcbiAgICAgICAgQGNvbCA9IDBcbiAgICAgICAgQHJvdyA9IDBcblxuICAgIHRvOiAoQGNvbCwgQHJvdykgLT5cbiAgICAgICAgQHN5bmMoKVxuXG4gICAgdXA6ICh0aW1lcz0xKSAtPlxuICAgICAgICBAcm93IC09IHRpbWVzXG4gICAgICAgIEBzeW5jKClcblxuICAgIGRvd246ICh0aW1lcz0xKSAtPlxuICAgICAgICBAcm93ICs9IHRpbWVzXG4gICAgICAgIEBzeW5jKClcblxuICAgIGxlZnQ6ICh0aW1lcz0xKSAtPlxuICAgICAgICBAY29sIC09IHRpbWVzXG4gICAgICAgIEBzeW5jKClcblxuICAgIHJpZ2h0OiAodGltZXM9MSkgLT5cbiAgICAgICAgQGNvbCArPSB0aW1lc1xuICAgICAgICBAc3luYygpXG5cbiAgICBzeW5jOiAtPlxuICAgICAgICBpZiBAY29sIDwgMCB0aGVuIEBjb2wgPSAwXG4gICAgICAgIGlmIEBjb2wgPiBDT0xTIC0gMSB0aGVuIEBjb2wgPSBDT0xTIC0gMVxuICAgICAgICBpZiBAcm93IDwgMCB0aGVuIEByb3cgPSAwXG4gICAgICAgIGlmIEByb3cgPiBST1dTIC0gMSB0aGVuIEByb3cgPSBST1dTIC0gMVxuXG4gICAgICAgIEBzcHJpdGUueCA9IEBjb2wgKiBUSUxFX1dJRFRIXG4gICAgICAgIEBzcHJpdGUueSA9IEByb3cgKiBUSUxFX0hFSUdIVFxuXG5cbmNsYXNzIFNjcmVlblxuICAgIGNvbnN0cnVjdG9yOiAoQGdhbWUpIC0+XG4gICAgICAgIEB0aWxlbWFwID0gQGdhbWUuYWRkLnRpbGVtYXAobnVsbCwgVElMRV9XSURUSCwgVElMRV9IRUlHSFQsIENPTFMsIFJPV1MgKyAyKVxuICAgICAgICBAdGlsZW1hcC5hZGRUaWxlc2V0SW1hZ2UoJ2xldHRlcnMnKVxuICAgICAgICBAbGF5ZXIgPSBAdGlsZW1hcC5jcmVhdGVCbGFua0xheWVyKCdidWZmZXInLCBDT0xTLCBST1dTICsgMSwgVElMRV9XSURUSCwgVElMRV9IRUlHSFQpXG4gICAgICAgIEBsYXllci5yZXNpemVXb3JsZCgpXG5cbiAgICAgICAgQGJ1ZmZlciA9IChcbiAgICAgICAgICAgIGZvciByb3cgaW4gWzAuLi5ST1dTKzFdXG4gICAgICAgICAgICAgICAgZm9yIGNvbCBpbiBbMC4uLkNPTFNdXG4gICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgKVxuXG4gICAgc2V0OiAoY29sLCByb3csIGNoYXIpIC0+XG4gICAgICAgIHRpbGUgPSBpZiBjaGFyPyB0aGVuIENIQVIyVElMRVtjaGFyXSBlbHNlIG51bGxcbiAgICAgICAgQHRpbGVtYXAucHV0VGlsZSh0aWxlLCBjb2wsIHJvdylcbiAgICAgICAgQGJ1ZmZlcltyb3ddW2NvbF0gPSBjaGFyXG5cbiAgICBnZXQ6IChjb2wsIHJvdykgLT5cbiAgICAgICAgQGJ1ZmZlcltyb3ddW2NvbF1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHR5cGVzLmNoZWNrQ2xhc3MgY2xhc3MgRW5naW5lXG4gICAgY29uc3RydWN0b3I6IChAZWxlbWVudElkKSAtPlxuICAgICAgICBAZ2FtZSA9IG5ldyBQaGFzZXIuR2FtZShTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFQsIFBoYXNlci5BVVRPLCBAZWxlbWVudElkLCB7cHJlbG9hZDogQHByZWxvYWQsIGNyZWF0ZTogQGNyZWF0ZSwgdXBkYXRlOiBAdXBkYXRlfSlcblxuICAgIGRvQ29tbWFuZDogKGNvbW1hbmQpIC0+XG4gICAgICAgIHN3aXRjaCBjb21tYW5kXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLklOU0VSVFxuICAgICAgICAgICAgICAgIEBlbnRlck1vZGUoTU9ERVMuSU5TRVJUKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5JTlNFUlRfQUZURVJcbiAgICAgICAgICAgICAgICBAY3Vyc29yLnJpZ2h0KClcbiAgICAgICAgICAgICAgICBAZW50ZXJNb2RlKE1PREVTLklOU0VSVClcbiAgICAgICAgICAgIHdoZW4gQ09NTUFORFMuSU5TRVJUX1NVQlNUSVRVVEVcbiAgICAgICAgICAgICAgICBAZGVsZXRlQXRDdXJzb3IoKVxuICAgICAgICAgICAgICAgIEBlbnRlck1vZGUoTU9ERVMuSU5TRVJUKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5JTlNFUlRfT1BFTlxuICAgICAgICAgICAgICAgIEBjdXJzb3IuZG93bigpXG4gICAgICAgICAgICAgICAgQG9wZW5Sb3dBYm92ZUN1cnNvcigpXG4gICAgICAgICAgICAgICAgQGVudGVyTW9kZShNT0RFUy5JTlNFUlQpXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLklOU0VSVF9PUEVOX0FCT1ZFXG4gICAgICAgICAgICAgICAgQG9wZW5Sb3dBYm92ZUN1cnNvcigpXG4gICAgICAgICAgICAgICAgQGVudGVyTW9kZShNT0RFUy5JTlNFUlQpXG5cbiAgICAgICAgICAgIHdoZW4gQ09NTUFORFMuQ0hBTkdFX1JFU1RfT0ZfTElORVxuICAgICAgICAgICAgICAgIEBkZWxldGVBdEN1cnNvcigpIGZvciBpIGluIFswLi5DT0xTLUBjdXJzb3IuY29sXVxuICAgICAgICAgICAgICAgIEBlbnRlck1vZGUoTU9ERVMuSU5TRVJUKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5ERUxFVEVfUkVTVF9PRl9MSU5FXG4gICAgICAgICAgICAgICAgQGRlbGV0ZUF0Q3Vyc29yKCkgZm9yIGkgaW4gWzAuLkNPTFMtQGN1cnNvci5jb2xdXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLkNIQU5HRV9MSU5FXG4gICAgICAgICAgICAgICAgQHJlbW92ZVJvd0F0Q3Vyc29yKClcbiAgICAgICAgICAgICAgICBAZW50ZXJNb2RlKE1PREVTLklOU0VSVClcbiAgICAgICAgICAgIHdoZW4gQ09NTUFORFMuREVMRVRFX0xJTkVcbiAgICAgICAgICAgICAgICBAcmVtb3ZlUm93QXRDdXJzb3IoKVxuXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLkVTQ0FQRVxuICAgICAgICAgICAgICAgIEBlbnRlck1vZGUoTU9ERVMuQ09NTUFORClcbiAgICAgICAgICAgICAgICBAY3Vyc29yLmxlZnQoKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5CQUNLV0FSRF9DSEFSQUNURVJcbiAgICAgICAgICAgICAgICBAY3Vyc29yLmxlZnQoKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5QUkVWX0xJTkVcbiAgICAgICAgICAgICAgICBAY3Vyc29yLmRvd24oKVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5ORVhUX0xJTkVcbiAgICAgICAgICAgICAgICBAY3Vyc29yLnVwKClcbiAgICAgICAgICAgIHdoZW4gQ09NTUFORFMuRk9SV0FSRF9DSEFSQUNURVJcbiAgICAgICAgICAgICAgICBAY3Vyc29yLnJpZ2h0KClcblxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5CRUdJTk5JTkdfT0ZfTElORVxuICAgICAgICAgICAgICAgIEBjdXJzb3IudG8oMCwgQGN1cnNvci5yb3cpXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLkVORF9PRl9MSU5FXG4gICAgICAgICAgICAgICAgQGN1cnNvci50byhDT0xTLTEsIEBjdXJzb3Iucm93KVxuXG4gICAgICAgICAgICB3aGVuIENPTU1BTkRTLkZPUldBUkRfV09SRFxuICAgICAgICAgICAgICAgIEBjdXJzb3IucmlnaHQoNSlcbiAgICAgICAgICAgIHdoZW4gQ09NTUFORFMuQkFDS1dBUkRfV09SRFxuICAgICAgICAgICAgICAgIEBjdXJzb3IubGVmdCg1KVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5GT1JXQVJEX0VORF9XT1JEXG4gICAgICAgICAgICAgICAgQGN1cnNvci5yaWdodCg1KVxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5ERUxFVEVfQ0hBUkFDVEVSXG4gICAgICAgICAgICAgICAgQGRlbGV0ZUF0Q3Vyc29yKClcblxuICAgICAgICAgICAgd2hlbiBDT01NQU5EUy5ERUxFVEVfQkFDS1dBUkRfQ0hBUkFDVEVSXG4gICAgICAgICAgICAgICAgQGN1cnNvci5sZWZ0KClcbiAgICAgICAgICAgICAgICBAZGVsZXRlQXRDdXJzb3IoKVxuXG4gICAgICAgICNpZiBAY3VycmVudE1vZGUgPT0gTU9ERVMuQ09NTUFORFxuICAgICAgICAjICAgIGlmIG5vdCBAc2NyZWVuLmdldChAY3Vyc29yLmNvbCwgQGN1cnNvci5yb3cpP1xuICAgICAgICAjICAgICAgICB3aGlsZSBAY29sID4gMFxuICAgICAgICAjICAgICAgICAgICAgQGNvbC0tXG4gICAgICAgICMgICAgICAgICAgICBpZiBAYnVmZmVyW0Byb3ddW0Bjb2xdICE9ICcnXG4gICAgICAgICMgICAgICAgICAgICAgICAgYnJlYWtcblxuICAgIHByZWxvYWQ6ID0+XG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2xldHRlcnMnLCAnZm9udC10cmFuc3BhcmVudC5wbmcnKVxuICAgICAgICAjZm9yIHNsdWcsIHNwcml0ZSBvZiBAX3Nwcml0ZXNcbiAgICAgICAgIyAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KHNsdWcsIHNwcml0ZS5pbWFnZSwgc3ByaXRlLmZyYW1lU2l6ZVswXSwgc3ByaXRlLmZyYW1lU2l6ZVsxXSlcbiAgICAgICAgI2ZvciBzbHVnLCBwYXRoIG9mIEBfYmFja2dyb3VuZHNcbiAgICAgICAgIyAgICBAZ2FtZS5sb2FkLmltYWdlKHNsdWcsIHBhdGgpXG4gICAgICAgICNAZ2FtZS5sb2FkLmltYWdlKCdkaWFsb2cnLCAnaW1hZ2VzL2RpYWxvZy1ib3gucG5nJylcblxuICAgIGNyZWF0ZTogPT5cbiAgICAgICAgI0BzdGF0dXNiYXIgPSBAZ2FtZS5hZGQuZ3JhcGhpY3MoMCwgU0NSRUVOX0hFSUdIVCAtIFRJTEVfSEVJR0hUICogMilcbiAgICAgICAgI0BzdGF0dXNiYXIuYmVnaW5GaWxsKDB4RDBEMEQwKVxuICAgICAgICAjQHN0YXR1c2Jhci5kcmF3UmVjdCgwLCAwLCBTQ1JFRU5fV0lEVEgsIFRJTEVfSEVJR0hUKVxuXG4gICAgICAgIEBjdXJzb3IgPSBuZXcgQ3Vyc29yKEBnYW1lKVxuICAgICAgICBAc2NyZWVuID0gbmV3IFNjcmVlbihAZ2FtZSlcblxuICAgICAgICBAZ2FtZS5zdGFnZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzEyMTIxMidcblxuICAgICAgICBAY3VycmVudENvbW1hbmQgPSBudWxsXG4gICAgICAgIEBjdXJyZW50Q29tbWFuZE5leHRSZXBlYXQgPSAwXG4gICAgICAgIEBjdXJyZW50TW9kZSA9IE1PREVTLkNPTU1BTkRcbiAgICAgICAgI0Bmb250U3R5bGUgPVxuICAgICAgICAjICAgIGZvbnQ6IFwiMjZweCBNb25vc3BhY2VcIlxuICAgICAgICAjICAgIGZpbGw6IFwiI0Q3RDdEN1wiXG4gICAgICAgICMgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAjICAgIGZvbnRXZWlnaHQ6ICdib2xkJ1xuICAgICAgICAjICAgIGJvdW5kc0FsaWduVjogJ21pZGRsZSdcblxuICAgICAgICBAZ2FtZS5pbnB1dC5rZXlib2FyZC5vbkRvd25DYWxsYmFjayA9IChlKSA9PlxuICAgICAgICAgICAgaWYgbm90IChlLnNoaWZ0S2V5IGFuZCBlLmN0cmxLZXkgYW5kIChlLmtleUNvZGUgPT0gODIgb3IgZS5rZXlDb2RlID09IDc0KSlcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgICAgY2hhcmFjdGVyID0gS0VZQ09ERVNbZS5rZXlDb2RlXT9baWYgZS5zaGlmdEtleSB0aGVuIDEgZWxzZSAwXVxuICAgICAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cblxuICAgICAgICAgICAgbW9kaWZpZXIgPSBpZiBlLmN0cmxLZXkgdGhlbiAnQy0nIGVsc2UgJydcbiAgICAgICAgICAgIGJpbmRpbmcgPSBtb2RpZmllciArIGNoYXJhY3RlclxuXG4gICAgICAgICAgICBpZiBAY3VycmVudE1vZGUgPT0gTU9ERVMuQ09NTUFORFxuICAgICAgICAgICAgICAgIGNvbW1hbmQgPSBDT01NQU5EX01PREVfQklORElOR1NbYmluZGluZ11cbiAgICAgICAgICAgICAgICBpZiBjb21tYW5kP1xuICAgICAgICAgICAgICAgICAgICBAZG9Db21tYW5kKGNvbW1hbmQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgICAgICBpZiBAY3VycmVudE1vZGUgPT0gTU9ERVMuSU5TRVJUXG4gICAgICAgICAgICAgICAgY29tbWFuZCA9IElOU0VSVF9NT0RFX0JJTkRJTkdTW2JpbmRpbmddXG4gICAgICAgICAgICAgICAgaWYgY29tbWFuZD9cbiAgICAgICAgICAgICAgICAgICAgQGRvQ29tbWFuZChjb21tYW5kKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICBpZiBjaGFyYWN0ZXIgPT0gJ3NwYWNlJyB0aGVuIGNoYXJhY3RlciA9ICcgJ1xuXG4gICAgICAgICAgICAgICAgaWYgY2hhcmFjdGVyID09ICdiYWNrc3BhY2UnXG4gICAgICAgICAgICAgICAgICAgIEBkZWxldGVBdEN1cnNvcigpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAaW5zZXJ0QXRDdXJzb3IoY2hhcmFjdGVyKVxuXG4gICAgdXBkYXRlOiA9PlxuXG4gICAgc2V0VGV4dEF0OiAoc3RhcnRDb2wsIHJvdywgdGV4dCkgLT5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi50ZXh0Lmxlbmd0aF1cbiAgICAgICAgICAgIGNvbCA9IHN0YXJ0Q29sICsgaVxuICAgICAgICAgICAgY29uc29sZS5sb2coY29sKVxuICAgICAgICAgICAgQHNjcmVlbi5zZXQoY29sLCByb3csIHRleHRbaV0pXG5cbiAgICBlbnRlck1vZGU6IChtb2RlKSAtPlxuICAgICAgICBAY3VycmVudE1vZGUgPSBtb2RlXG4gICAgICAgIGlmIG1vZGUgPT0gTU9ERVMuSU5TRVJUXG4gICAgICAgICAgICBAc2V0VGV4dEF0KDAsIFJPV1MsICctLSBJTlNFUlQgLS0nKVxuICAgICAgICBlbHNlIGlmIG1vZGUgPT0gTU9ERVMuQ09NTUFORFxuICAgICAgICAgICAgQHNldFRleHRBdCgwLCBST1dTLCAnICAgICAgICAgICAgJylcblxuICAgIGRlbGV0ZUF0Q3Vyc29yOiAtPlxuICAgICAgICBAc2NyZWVuLnNldChAY3Vyc29yLmNvbCwgQGN1cnNvci5yb3csIG51bGwpXG4gICAgICAgIGZvciBjb2wgaW4gW0BjdXJzb3IuY29sLi4uQ09MU11cbiAgICAgICAgICAgIGlmIGNvbCA8IENPTFMgLSAxXG4gICAgICAgICAgICAgICAgQHNjcmVlbi5zZXQoY29sLCBAY3Vyc29yLnJvdyxcbiAgICAgICAgICAgICAgICAgICAgQHNjcmVlbi5nZXQoY29sKzEsIEBjdXJzb3Iucm93KSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBAc2NyZWVuLnNldChjb2wsIEBjdXJzb3Iucm93LCBudWxsKVxuXG4gICAgaW5zZXJ0QXRDdXJzb3I6IChjaGFyYWN0ZXIpIC0+XG4gICAgICAgIGZvciBjb2wgaW4gW0NPTFMtMS4uQGN1cnNvci5jb2xdXG4gICAgICAgICAgICBpZiBjb2wgPCBDT0xTIC0gMVxuICAgICAgICAgICAgICAgIEBzY3JlZW4uc2V0KGNvbCsxLCBAY3Vyc29yLnJvdyxcbiAgICAgICAgICAgICAgICAgICAgQHNjcmVlbi5nZXQoY29sLCBAY3Vyc29yLnJvdykpXG4gICAgICAgIEBzY3JlZW4uc2V0KEBjdXJzb3IuY29sLCBAY3Vyc29yLnJvdywgY2hhcmFjdGVyKVxuICAgICAgICBAY3Vyc29yLnJpZ2h0KClcblxuICAgIG9wZW5Sb3dBYm92ZUN1cnNvcjogLT5cbiAgICAgICAgZm9yIHJvdyBpbiBbUk9XUy0xLi4uQGN1cnNvci5yb3ddXG4gICAgICAgICAgICBpZiByb3cgPCBST1dTIC0gMlxuICAgICAgICAgICAgICAgIGZvciBjb2wgaW4gWzAuLi5DT0xTXVxuICAgICAgICAgICAgICAgICAgICBAc2NyZWVuLnNldChjb2wsIHJvdysxLFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNjcmVlbi5nZXQoY29sLCByb3cpKVxuICAgICAgICBmb3IgY29sIGluIFswLi4uQ09MU11cbiAgICAgICAgICAgIEBzY3JlZW4uc2V0KGNvbCwgQGN1cnNvci5yb3csIG51bGwpXG5cbiAgICByZW1vdmVSb3dBdEN1cnNvcjogLT5cbiAgICAgICAgZm9yIHJvdyBpbiBbQHJvdy4uLlJPV1NdXG4gICAgICAgICAgICBmb3IgY29sIGluIFswLi4uQ09MU11cbiAgICAgICAgICAgICAgICBpZiByb3cgPCBST1dTIC0gMlxuICAgICAgICAgICAgICAgICAgICBAc2NyZWVuLnNldChjb2wsIHJvdyxcbiAgICAgICAgICAgICAgICAgICAgICAgIEBzY3JlZW4uZ2V0KGNvbCwgcm93KzEpKVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgQHNjcmVlbi5zZXQoY29sLCByb3csIG51bGwpXG5cbiIsIkVuZ2luZSA9IHJlcXVpcmUoJ3NyYy9lbmdpbmUnKVxuXG5lbmdpbmUgPSBuZXcgRW5naW5lKCdnYW1lJylcblxud2luZG93LmdhbWUgPSBlbmdpbmUuZ2FtZVxuIiwiRGVvZG9yYW50ID0gcmVxdWlyZSgnZGVvZG9yYW50JylcblxudHlwZXMgPSBuZXcgRGVvZG9yYW50KCdkZWJ1ZycpXG5cbnR5cGVzLmFkZEZpbHRlciAnaXNJbnRlZ2VyJywgKHZhbHVlKSAtPiB2YWx1ZSAlIDEgPT0gMFxuXG50eXBlcy5hZGRBbGlhcyAnSW50ZWdlcicsICdOdW1iZXJ8aXNJbnRlZ2VyJ1xudHlwZXMuYWRkQWxpYXMgJ0VtYWlsJywgL14uK0AuK1xcLi4rJC9cblxudHlwZXMuYWRkQWxpYXMgJ1BvaW50JywgWydOdW1iZXInLCAnTnVtYmVyJ11cblxudHlwZXMuYWRkQWxpYXMgJ1Nwcml0ZURhdGEnLFxuICAgIGltYWdlOiAnU3RyaW5nJ1xuICAgIGZyYW1lU2l6ZTogJ1BvaW50J1xuICAgIGFuY2hvcjogJ1BvaW50J1xuICAgIGFuaW1hdGlvbnM6IHsnKic6IFsnSW50ZWdlciddfVxuXG50eXBlcy5hZGRBbGlhcyAnQWN0b3InLFxuICAgIHNwcml0ZTogJ0FueSdcbiAgICBzdGF0ZTogJ1N0cmluZydcbiAgICBkaXJlY3Rpb246IC91cHxkb3dufGxlZnR8cmlnaHQvXG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZXNcbiJdfQ==
