(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"_process":2,"buffer":4}],2:[function(require,module,exports){
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

},{"_process":2,"buffer":4}],3:[function(require,module,exports){
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

},{"_process":2,"buffer":4}],4:[function(require,module,exports){
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

},{"_process":2,"base64-js":3,"buffer":4,"ieee754":1,"isarray":5}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/buffer/node_modules/isarray/index.js","/node_modules/watchify/node_modules/buffer/node_modules/isarray")

},{"_process":2,"buffer":4}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var BootState, GameState, HowToPlayState, IntroState, LevelSelectState, PreloadState, SCREEN_HEIGHT, SCREEN_WIDTH, TitleState, WinLoseState, game,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

SCREEN_WIDTH = 1280;

SCREEN_HEIGHT = 720;

window.selectedLevel = 'arctic';

window.player2 = false;

BootState = (function() {
  function BootState() {}

  BootState.prototype.preload = function() {
    this.game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3);
    return this.game.load.image('healthbar-green', 'healthbar-green.png');
  };

  BootState.prototype.create = function() {
    return this.game.state.start('preload');
  };

  return BootState;

})();

PreloadState = (function() {
  function PreloadState() {
    this.fileComplete = bind(this.fileComplete, this);
  }

  PreloadState.prototype.preload = function() {
    var barX, barY, i, len, levelName, ref, results;
    this.game.load.onFileComplete.add(this.fileComplete);
    this.game.stage.backgroundColor = '#cccccc';
    barX = SCREEN_WIDTH / 2 - 560 / 2;
    barY = SCREEN_HEIGHT / 2 - 50 / 2;
    this.progressbarBackground = this.game.add.sprite(barX, barY, 'healthbar-background');
    this.progressbarBackground.animations.add('glow', [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 10, true);
    this.progressbarBackground.animations.play('glow');
    this.progressbarGreen = this.game.add.sprite(barX + 4, barY + 4, 'healthbar-green');
    this.progressbarGreen.scale.x = 0;
    this.game.load.spritesheet('player1', 'player1.png', 116, 160, 36);
    this.game.load.spritesheet('player2', 'player2.png', 180, 316, 21);
    this.game.load.image('title', 'title.jpg');
    this.game.load.image('how-to-play', 'how-to-play.jpg');
    this.game.load.image('how-to-play-ai', 'how-to-play-ai.jpg');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
    this.game.load.audio('select-a-stage', ['audio/select-a-stage.mp3', 'audio/select-a-stage.ogg']);
    this.game.load.audio('fight', ['audio/fight.mp3', 'audio/fight.ogg']);
    this.game.load.audio('mortal-ro-sham-bo', ['audio/mortal-ro-sham-bo.mp3', 'audio/mortal-ro-sham-bo.ogg']);
    this.game.load.audio('rock-wins', ['audio/rock-wins.mp3', 'audio/rock-wins.ogg']);
    this.game.load.audio('paper-wins', ['audio/paper-wins.mp3', 'audio/paper-wins.ogg']);
    this.game.load.audio('scissors-wins', ['audio/scissors-wins.mp3', 'audio/scissors-wins.ogg']);
    this.game.load.image('intro1', 'intro1.png');
    this.game.load.image('intro2', 'intro1.png');
    this.game.load.image('intro3', 'intro2.png');
    this.game.load.image('intro4', 'intro3.png');
    this.game.load.image('intro5', 'intro4.png');
    this.game.load.audio('intro-talk1', ['audio/intro-talk1.mp3', 'audio/intro-talk1.mp3']);
    this.game.load.audio('intro-talk2', ['audio/intro-talk2.mp3', 'audio/intro-talk2.mp3']);
    this.game.load.audio('intro-talk3', ['audio/intro-talk3.mp3', 'audio/intro-talk3.mp3']);
    this.game.load.audio('intro-talk4', ['audio/intro-talk4.mp3', 'audio/intro-talk4.mp3']);
    this.game.load.audio('intro-talk5', ['audio/intro-talk5.mp3', 'audio/intro-talk5.mp3']);
    this.game.load.spritesheet('rock', 'rock.png', 294, 250, 3);
    this.game.load.spritesheet('paper', 'paper.png', 300, 169, 3);
    this.game.load.spritesheet('scissors', 'scissors.png', 300, 168, 3);
    this.game.load.image('sink', 'backgrounds/sink.png');
    ref = ['arctic', 'city', 'forest', 'kitchen', 'stage', 'table'];
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      levelName = ref[i];
      this.game.load.image(levelName, "backgrounds/" + levelName + ".jpg");
      results.push(this.game.load.image(levelName + '-thumbnail', "backgrounds/" + levelName + "-thumbnail.jpg"));
    }
    return results;
  };

  PreloadState.prototype.create = function() {
    this.game.add.audio('bgm').play('', 0, 0.7, true);
    return this.game.state.start('intro');
  };

  PreloadState.prototype.fileComplete = function(progress, cacheKey, success, totalLoaded, totalFiles) {
    return this.progressbarGreen.scale.x = progress / 100;
  };

  return PreloadState;

})();

IntroState = (function() {
  function IntroState() {}

  IntroState.prototype.showScene = function(which) {
    if (this.background != null) {
      this.background.destroy();
    }
    if (this.text != null) {
      this.text.destroy();
    }
    this.background = this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'intro' + which);
    this.game.add.audio('intro-talk' + which).play();
    return this.text = this.game.add.text(30, 30, this.texts[which - 1], {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      font: '80px bold monospace'
    });
  };

  IntroState.prototype.create = function() {
    this.durations = [2500, 2500, 2500, 2500, 3500];
    this.texts = ['One slice left...', 'I only had one. It\'s mine!', 'Yours was half the pie!', 'Only one way to settle this...', 'RO SHAM BO!!!'];
    this.background = null;
    this.text = null;
    this.current = 1;
    this.showScene(this.current);
    this.switchTime = this.game.time.now + this.durations[0];
    return this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  };

  IntroState.prototype.update = function() {
    if (this.game.time.now >= this.switchTime) {
      this.current++;
      if (this.current >= 6) {
        this.game.state.start('title');
      } else {
        this.switchTime = this.game.time.now + this.durations[this.current - 1];
        this.showScene(this.current, '');
      }
    }
    if (this.spacebar.justDown) {
      return this.game.state.start('title');
    }
  };

  return IntroState;

})();

TitleState = (function() {
  function TitleState() {}

  TitleState.prototype.create = function() {
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'title');
    this.startText = this.game.add.text(30, 400, 'DEPRESS\nSPACEBAR\nTO FIGHT\nTHE COMPUTER', {
      fill: 'white',
      font: '60px bold monospace'
    });
    this.startText2 = this.game.add.text(980, 320, 'DEPRESS\nENTER\nTO FIGHT\nA FRIEND\nHOTSEAT', {
      fill: 'white',
      font: '60px bold monospace'
    });
    this.flipperTime = this.game.time.now + 700;
    this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
    this.enter = this.game.input.keyboard.addKey(Phaser.KeyCode.ENTER);
    return this.game.add.audio('mortal-ro-sham-bo').play();
  };

  TitleState.prototype.update = function() {
    if (this.game.time.now >= this.flipperTime) {
      this.startText.visible = !this.startText.visible;
      this.startText2.visible = !this.startText2.visible;
      if (this.startText.visible) {
        this.flipperTime = this.game.time.now + 700;
      } else {
        this.flipperTime = this.game.time.now + 200;
      }
    }
    if (this.spacebar.justDown) {
      window.player2 = false;
      this.game.state.start('how-to-play');
    }
    if (this.enter.justDown) {
      window.player2 = true;
      return this.game.state.start('how-to-play');
    }
  };

  return TitleState;

})();

HowToPlayState = (function() {
  function HowToPlayState() {}

  HowToPlayState.prototype.create = function() {
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (window.player2 ? 'how-to-play' : 'how-to-play-ai'));
    return this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  };

  HowToPlayState.prototype.update = function() {
    if (this.spacebar.justDown) {
      return this.game.state.start('levelselect');
    }
  };

  return HowToPlayState;

})();

LevelSelectState = (function() {
  function LevelSelectState() {}

  LevelSelectState.prototype.create = function() {
    var col, row, sprite, x, y;
    this.game.add.audio('select-a-stage').play();
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink');
    this.levels = [['arctic', 'city', 'forest'], ['kitchen', 'stage', 'table']];
    this.stageSprites = (function() {
      var i, results;
      results = [];
      for (row = i = 0; i < 2; row = ++i) {
        results.push((function() {
          var j, results1;
          results1 = [];
          for (col = j = 0; j < 3; col = ++j) {
            x = SCREEN_WIDTH / 2 - 400 + col * 300;
            y = 225 + row * 250;
            sprite = this.game.add.sprite(x + 100, y + 100, this.levels[row][col] + '-thumbnail');
            sprite.anchor.setTo(0.5, 0.5);
            this.game.add.text(x + 10, y + 150, this.levels[row][col].toUpperCase(), {
              fill: 'white',
              stroke: 'black',
              strokeThickness: 6,
              font: '30px bold monospace'
            });
            results1.push(sprite);
          }
          return results1;
        }).call(this));
      }
      return results;
    }).call(this);
    this.currentCol = 0;
    this.currentRow = 0;
    this.title = this.game.add.text(0, 0, 'SELECT STAGE', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 12,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '100px bold monospace'
    });
    this.title.setTextBounds(0, 0, SCREEN_WIDTH, 120);
    this.directions = this.game.add.text(0, 80, 'Choose with arrows, space to start', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '48px bold monospace'
    });
    this.directions.setTextBounds(0, 0, SCREEN_WIDTH, 120);
    this.keys = this.game.input.keyboard.addKeys({
      spacebar: Phaser.KeyCode.SPACEBAR,
      up: Phaser.KeyCode.UP,
      down: Phaser.KeyCode.DOWN,
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT
    });
    return this.highlight();
  };

  LevelSelectState.prototype.highlight = function() {
    var col, i, len, ref, results, row, rowData, sprite;
    ref = this.stageSprites;
    results = [];
    for (row = i = 0, len = ref.length; i < len; row = ++i) {
      rowData = ref[row];
      results.push((function() {
        var j, len1, results1;
        results1 = [];
        for (col = j = 0, len1 = rowData.length; j < len1; col = ++j) {
          sprite = rowData[col];
          if (!(col === this.currentCol && row === this.currentRow)) {
            sprite.tint = 0x666666;
            sprite.scale.x = 1;
            results1.push(sprite.scale.y = 1);
          } else {
            sprite.tint = 0xffffff;
            sprite.scale.x = 1.1;
            sprite.scale.y = 1.1;
            results1.push(window.selectedLevel = this.levels[row][col]);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  LevelSelectState.prototype.update = function() {
    if (this.keys.spacebar.justDown) {
      this.game.state.start('game');
    }
    if (this.keys.left.justDown) {
      this.currentCol--;
      if (this.currentCol < 0) {
        this.currentCol = 0;
      }
      this.highlight();
    }
    if (this.keys.right.justDown) {
      this.currentCol++;
      if (this.currentCol > 2) {
        this.currentCol = 2;
      }
      this.highlight();
    }
    if (this.keys.up.justDown) {
      this.currentRow--;
      if (this.currentRow < 0) {
        this.currentRow = 0;
      }
      this.highlight();
    }
    if (this.keys.down.justDown) {
      this.currentRow++;
      if (this.currentRow > 1) {
        this.currentRow = 1;
      }
      return this.highlight();
    }
  };

  return LevelSelectState;

})();

GameState = (function() {
  function GameState() {
    this.doFinished = bind(this.doFinished, this);
  }

  GameState.prototype.makePlayer = function(x, y, healthbarX, healthbarY, spriteKey, animations) {
    var attack, health, healthbarBackground, healthbarGreen, sprite;
    sprite = this.game.add.sprite(x, y, spriteKey);
    sprite.animations.add('pose', animations.pose, 10, true);
    sprite.animations.add('idle', animations.idle, 5, true);
    sprite.animations.add('paper', animations.paper, 10, true);
    sprite.animations.add('scissors', animations.scissors, 10, true);
    sprite.animations.add('rock', animations.rock, 10, true);
    sprite.animations.add('hit', animations.hit, 10, false);
    sprite.animations.add('die', animations.die, 10, false);
    sprite.animations.add('transform', animations.transform, 10, false);
    sprite.anchor.setTo(0.5, 0.5);
    attack = 'idle';
    sprite.animations.play('idle');
    health = 100;
    healthbarBackground = this.game.add.sprite(healthbarX, healthbarY, 'healthbar-background');
    healthbarBackground.animations.add('glow', [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 10, true);
    healthbarBackground.animations.play('glow');
    healthbarGreen = this.game.add.sprite(healthbarX + 4, healthbarY + 4, 'healthbar-green');
    return {
      sprite: sprite,
      attack: attack,
      health: health,
      healthbarBackground: healthbarBackground,
      healthbarGreen: healthbarGreen
    };
  };

  GameState.prototype.create = function() {
    this.keys = this.game.input.keyboard.addKeys({
      spacebar: Phaser.KeyCode.SPACEBAR,
      p1_rock: Phaser.KeyCode.ONE,
      p1_paper: Phaser.KeyCode.TWO,
      p1_scissors: Phaser.KeyCode.THREE,
      p2_rock: Phaser.KeyCode.LEFT,
      p2_paper: Phaser.KeyCode.DOWN,
      p2_scissors: Phaser.KeyCode.RIGHT
    });
    this.game.time.desiredFps = 60;
    this.game.groups = {};
    this.game.groups.background = this.game.add.group();
    this.game.groups.actors = this.game.add.group();
    this.game.groups.player = this.game.add.group();
    this.game.groups.ui = this.game.add.group();
    this.background = this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, selectedLevel);
    this.player1 = this.makePlayer(SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT / 2 + 40, 40, 40, 'player1', {
      pose: [31, 32, 33],
      idle: [6, 7, 9],
      paper: [31, 24],
      scissors: [11, 12, 14],
      rock: [20],
      hit: [21, 22],
      die: [21, 22],
      transform: [16, 17, 18, 19]
    });
    this.player1.sprite.scale.x = -3;
    this.player1.sprite.scale.y = 3;
    this.player2 = this.makePlayer(SCREEN_WIDTH / 2 + 100, SCREEN_HEIGHT / 2 + 40, SCREEN_WIDTH / 2 + 40, 40, 'player2', {
      pose: [3, 4, 11],
      idle: [15, 16, 17],
      paper: [7, 6, 7],
      scissors: [3, 4, 5],
      rock: [0, 1, 2],
      hit: [9, 10, 11],
      die: [9, 10, 11],
      transform: [12, 5, 14, 13]
    });
    this.player2.sprite.scale.x = 1.7;
    this.player2.sprite.scale.y = 1.7;
    return this.doCountdown();
  };

  GameState.prototype.doCountdown = function() {
    this.combatState = 'countdown';
    this.startTime = this.game.time.now + 5000;
    this.countdownDisplay = this.game.add.text(1, 0, '', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 12,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '300px bold monospace'
    });
    return this.countdownDisplay.setTextBounds(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  };

  GameState.prototype.doStartRound = function() {
    this.countdownDisplay.destroy();
    return this.combatState = 'during';
  };

  GameState.prototype.doEndRound = function() {
    if (this.player1.health <= 0) {
      this.player1.sprite.animations.play('die');
      this.player2.sprite.animations.play('transform').onComplete.add((function(_this) {
        return function() {
          var final;
          _this.game.add.audio(_this.player2.attack + '-wins').play();
          final = _this.game.add.sprite(_this.player2.sprite.x + 150, _this.player2.sprite.y - 250, _this.player2.attack);
          final.scale.setTo(-2, 2);
          final.animations.add('transform', [0, 1, 2], 2, false).onComplete.add(function() {
            return _this.doFinished();
          });
          final.animations.play('transform');
          return _this.player2.sprite.destroy();
        };
      })(this));
    } else if (this.player2.health <= 0) {
      this.player2.sprite.animations.play('die');
      this.player1.sprite.animations.play('transform').onComplete.add((function(_this) {
        return function() {
          var final;
          _this.game.add.audio(_this.player1.attack + '-wins').play();
          final = _this.game.add.sprite(_this.player1.sprite.x - 200, _this.player1.sprite.y - 200, _this.player1.attack);
          final.scale.setTo(2, 2);
          final.animations.add('transform', [0, 1, 2], 2, false).onComplete.add(function() {
            return _this.doFinished();
          });
          final.animations.play('transform');
          return _this.player1.sprite.destroy();
        };
      })(this));
    }
    return this.combatState = 'over';
  };

  GameState.prototype.doFinished = function() {
    return this.combatState = 'finished';
  };

  GameState.prototype.update = function() {
    var display, remaining;
    this.player1.healthbarGreen.scale.x = this.player1.health / 100;
    this.player2.healthbarGreen.scale.x = this.player2.health / 100;
    if (this.combatState === 'countdown') {
      remaining = Math.floor((this.startTime - this.game.time.now) / 1000);
      display = remaining - 1;
      if (display === 0) {
        display = 'FIGHT!';
        if (this.countdownDisplay.text === '1') {
          this.game.add.audio('fight').play();
        }
      }
      this.countdownDisplay.text = display.toString();
      if (remaining <= 0) {
        this.doStartRound();
      }
    } else if (this.combatState === 'during') {
      console.log(this.player1.health, this.player2.health);
      if (this.player1.health <= 0 || this.player2.health <= 0) {
        this.doEndRound();
        return;
      }
      if (this.keys.p1_paper.isDown || this.keys.p1_rock.isDown || this.keys.p1_scissors.isDown) {
        if (this.keys.p1_paper.isDown) {
          this.player1.attack = 'paper';
        }
        if (this.keys.p1_rock.isDown) {
          this.player1.attack = 'rock';
        }
        if (this.keys.p1_scissors.isDown) {
          this.player1.attack = 'scissors';
        }
      } else {
        this.player1.attack = 'idle';
      }
      if (this.player1.attack !== this.player1.sprite.animations.currentAnim.name) {
        this.player1.sprite.animations.play(this.player1.attack);
      }
      if (this.keys.p2_paper.isDown || this.keys.p2_rock.isDown || this.keys.p2_scissors.isDown) {
        if (this.keys.p2_paper.isDown) {
          this.player2.attack = 'paper';
        }
        if (this.keys.p2_rock.isDown) {
          this.player2.attack = 'rock';
        }
        if (this.keys.p2_scissors.isDown) {
          this.player2.attack = 'scissors';
        }
      } else {
        this.player2.attack = 'idle';
      }
      if (this.player2.attack !== this.player2.sprite.animations.currentAnim.name) {
        this.player2.sprite.animations.play(this.player2.attack);
      }
      if (this.player1.attack !== this.player2.attack) {
        if (this.player1.attack === 'paper' && this.player2.attack === 'scissors') {
          this.player2.health -= 2;
        }
        if (this.player1.attack === 'scissors' && this.player2.attack === 'rock') {
          this.player2.health -= 2;
        }
        if (this.player1.attack === 'rock' && this.player2.attack === 'paper') {
          this.player2.health -= 2;
        }
        if (this.player2.attack === 'idle') {
          this.player2.health -= 1;
        }
      }
      if (this.player2.attack !== this.player1.attack) {
        if (this.player2.attack === 'paper' && this.player1.attack === 'scissors') {
          this.player1.health -= 2;
        }
        if (this.player2.attack === 'scissors' && this.player1.attack === 'rock') {
          this.player1.health -= 2;
        }
        if (this.player2.attack === 'rock' && this.player1.attack === 'paper') {
          this.player1.health -= 2;
        }
        if (this.player1.attack === 'idle') {
          return this.player1.health -= 1;
        }
      }
    } else if (this.combatState === 'finished') {
      if (this.keys.spacebar.justDown) {
        return this.game.state.start('levelselect');
      }
    }
  };

  return GameState;

})();

WinLoseState = (function() {
  function WinLoseState() {}

  WinLoseState.prototype.create = function() {};

  return WinLoseState;

})();

game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, 'game');

game.state.add('boot', BootState);

game.state.add('preload', PreloadState);

game.state.add('intro', IntroState);

game.state.add('title', TitleState);

game.state.add('how-to-play', HowToPlayState);

game.state.add('levelselect', LevelSelectState);

game.state.add('game', GameState);

game.state.add('winlose', WinLoseState);

game.state.start('boot');


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/main.coffee","/src")

},{"_process":2,"buffer":4}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCIvaG9tZS9kdmNvbGdhbi9wcm9qZWN0cy9sdWR1bWRhcmUzNS9zcmMvbWFpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFDQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQVgsQ0FBZSxTQUFmLEVBQTBCLFlBQTFCOztBQUNBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBWCxDQUFlLE9BQWYsRUFBd0IsVUFBeEI7O0FBQ0EsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFYLENBQWUsT0FBZixFQUF3QixVQUF4Qjs7QUFDQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQVgsQ0FBZSxhQUFmLEVBQThCLGNBQTlCOztBQUNBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBWCxDQUFlLGFBQWYsRUFBOEIsZ0JBQTlCOztBQUNBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBWCxDQUFlLE1BQWYsRUFBdUIsU0FBdkI7O0FBQ0EsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFYLENBQWUsU0FBZixFQUEwQixZQUExQjs7QUFFQSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQVgsQ0FBaUIsTUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxuZnVuY3Rpb24gaW5pdCAoKSB7XG4gIHZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgbG9va3VwW2ldID0gY29kZVtpXVxuICAgIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxuICB9XG5cbiAgcmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG4gIHJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xufVxuXG5pbml0KClcblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICBwbGFjZUhvbGRlcnMgPSBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG5cbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIGFyciA9IG5ldyBBcnIobGVuICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgLy8gQXZvaWQgZ29pbmcgdGhyb3VnaCBhbiBBcmd1bWVudHNBZGFwdG9yVHJhbXBvbGluZSBpbiB0aGUgY29tbW9uIGNhc2UuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGFyZ3VtZW50c1sxXSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcpXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwXG4gICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWRcbiAgfVxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG4vLyBUT0RPOiBMZWdhY3ksIG5vdCBuZWVkZWQgYW55bW9yZS4gUmVtb3ZlIGluIG5leHQgbWFqb3IgdmVyc2lvbi5cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAob2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gZnJvbVR5cGVkQXJyYXkodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAodGhhdCwgYXJyYXkpIHtcbiAgYXJyYXkuYnl0ZUxlbmd0aCAvLyB0aGlzIHRocm93cyBpZiBgYXJyYXlgIGlzIG5vdCBhIHZhbGlkIEFycmF5QnVmZmVyXG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbVR5cGVkQXJyYXkodGhhdCwgbmV3IFVpbnQ4QXJyYXkoYXJyYXkpKVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbiAgQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgICAvLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgICB2YWx1ZTogbnVsbCxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG4gIH1cbn0gZWxzZSB7XG4gIC8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG4gIEJ1ZmZlci5wcm90b3R5cGUubGVuZ3RoID0gdW5kZWZpbmVkXG4gIEJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG59XG5cbmZ1bmN0aW9uIGFsbG9jYXRlICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgfVxuXG4gIHZhciBmcm9tUG9vbCA9IGxlbmd0aCAhPT0gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplID4+PiAxXG4gIGlmIChmcm9tUG9vbCkgdGhhdC5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdCBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9ICcnICsgc3RyaW5nXG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAvLyBEZXByZWNhdGVkXG4gICAgICBjYXNlICdyYXcnOlxuICAgICAgY2FzZSAncmF3cyc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgc3RhcnQgPSBzdGFydCB8IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kIHwgMFxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG4gIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiAnJ1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCBhbmQgYGlzLWJ1ZmZlcmAgKGluIFNhZmFyaSA1LTcpIHRvIGRldGVjdFxuLy8gQnVmZmVyIGluc3RhbmNlcy5cbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGggfCAwXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAgIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICBpZiAobmV3QnVmLmxlbmd0aCkgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIlNDUkVFTl9XSURUSCA9IDEyODBcblNDUkVFTl9IRUlHSFQgPSA3MjBcbndpbmRvdy5zZWxlY3RlZExldmVsID0gJ2FyY3RpYydcbndpbmRvdy5wbGF5ZXIyID0gZmFsc2VcblxuXG5jbGFzcyBCb290U3RhdGVcbiAgICBwcmVsb2FkOiAtPlxuICAgICAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdoZWFsdGhiYXItYmFja2dyb3VuZCcsICdoZWFsdGhiYXItYmFja2dyb3VuZC5wbmcnLCA1NjAsIDUwLCAzKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdoZWFsdGhiYXItZ3JlZW4nLCAnaGVhbHRoYmFyLWdyZWVuLnBuZycpXG5cbiAgICBjcmVhdGU6IC0+XG4gICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCdwcmVsb2FkJylcblxuXG5jbGFzcyBQcmVsb2FkU3RhdGVcbiAgICBwcmVsb2FkOiAtPlxuICAgICAgICBAZ2FtZS5sb2FkLm9uRmlsZUNvbXBsZXRlLmFkZChAZmlsZUNvbXBsZXRlKVxuICAgICAgICBAZ2FtZS5zdGFnZS5iYWNrZ3JvdW5kQ29sb3IgPSAnI2NjY2NjYydcblxuICAgICAgICBiYXJYID0gU0NSRUVOX1dJRFRILzIgLSA1NjAvMlxuICAgICAgICBiYXJZID0gU0NSRUVOX0hFSUdIVC8yIC0gNTAvMlxuICAgICAgICBAcHJvZ3Jlc3NiYXJCYWNrZ3JvdW5kID0gQGdhbWUuYWRkLnNwcml0ZShiYXJYLCBiYXJZLCAnaGVhbHRoYmFyLWJhY2tncm91bmQnKVxuICAgICAgICBAcHJvZ3Jlc3NiYXJCYWNrZ3JvdW5kLmFuaW1hdGlvbnMuYWRkKCdnbG93JywgWzAsMCwwLDAsMCwwLDAsMCwwLDEsMl0sIDEwLCB0cnVlKVxuICAgICAgICBAcHJvZ3Jlc3NiYXJCYWNrZ3JvdW5kLmFuaW1hdGlvbnMucGxheSgnZ2xvdycpXG4gICAgICAgIEBwcm9ncmVzc2JhckdyZWVuID0gQGdhbWUuYWRkLnNwcml0ZShiYXJYICsgNCwgYmFyWSArIDQsICdoZWFsdGhiYXItZ3JlZW4nKVxuICAgICAgICBAcHJvZ3Jlc3NiYXJHcmVlbi5zY2FsZS54ID0gMFxuXG4gICAgICAgIEBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ3BsYXllcjEnLCAncGxheWVyMS5wbmcnLCAxMTYsIDE2MCwgMzYpXG4gICAgICAgIEBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ3BsYXllcjInLCAncGxheWVyMi5wbmcnLCAxODAsIDMxNiwgMjEpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ3RpdGxlJywgJ3RpdGxlLmpwZycpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2hvdy10by1wbGF5JywgJ2hvdy10by1wbGF5LmpwZycpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2hvdy10by1wbGF5LWFpJywgJ2hvdy10by1wbGF5LWFpLmpwZycpXG4gICAgICAgICNAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdoZWFsdGhiYXItYmFja2dyb3VuZCcsICdoZWFsdGhiYXItYmFja2dyb3VuZC5wbmcnLCA1NjAsIDUwLCAzKVxuICAgICAgICAjQGdhbWUubG9hZC5pbWFnZSgnaGVhbHRoYmFyLWdyZWVuJywgJ2hlYWx0aGJhci1ncmVlbi5wbmcnKVxuXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2JnbScsIFsnYXVkaW8vYmdtLm1wMycsICdhdWRpby9iZ20ub2dnJ10pXG5cbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnc2VsZWN0LWEtc3RhZ2UnLCBbJ2F1ZGlvL3NlbGVjdC1hLXN0YWdlLm1wMycsICdhdWRpby9zZWxlY3QtYS1zdGFnZS5vZ2cnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnZmlnaHQnLCBbJ2F1ZGlvL2ZpZ2h0Lm1wMycsICdhdWRpby9maWdodC5vZ2cnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnbW9ydGFsLXJvLXNoYW0tYm8nLCBbJ2F1ZGlvL21vcnRhbC1yby1zaGFtLWJvLm1wMycsICdhdWRpby9tb3J0YWwtcm8tc2hhbS1iby5vZ2cnXSlcblxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdyb2NrLXdpbnMnLCBbJ2F1ZGlvL3JvY2std2lucy5tcDMnLCAnYXVkaW8vcm9jay13aW5zLm9nZyddKVxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdwYXBlci13aW5zJywgWydhdWRpby9wYXBlci13aW5zLm1wMycsICdhdWRpby9wYXBlci13aW5zLm9nZyddKVxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdzY2lzc29ycy13aW5zJywgWydhdWRpby9zY2lzc29ycy13aW5zLm1wMycsICdhdWRpby9zY2lzc29ycy13aW5zLm9nZyddKVxuXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2ludHJvMScsICdpbnRybzEucG5nJylcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaW50cm8yJywgJ2ludHJvMS5wbmcnKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdpbnRybzMnLCAnaW50cm8yLnBuZycpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2ludHJvNCcsICdpbnRybzMucG5nJylcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaW50cm81JywgJ2ludHJvNC5wbmcnKVxuXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2ludHJvLXRhbGsxJywgWydhdWRpby9pbnRyby10YWxrMS5tcDMnLCAnYXVkaW8vaW50cm8tdGFsazEubXAzJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2ludHJvLXRhbGsyJywgWydhdWRpby9pbnRyby10YWxrMi5tcDMnLCAnYXVkaW8vaW50cm8tdGFsazIubXAzJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2ludHJvLXRhbGszJywgWydhdWRpby9pbnRyby10YWxrMy5tcDMnLCAnYXVkaW8vaW50cm8tdGFsazMubXAzJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2ludHJvLXRhbGs0JywgWydhdWRpby9pbnRyby10YWxrNC5tcDMnLCAnYXVkaW8vaW50cm8tdGFsazQubXAzJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ2ludHJvLXRhbGs1JywgWydhdWRpby9pbnRyby10YWxrNS5tcDMnLCAnYXVkaW8vaW50cm8tdGFsazUubXAzJ10pXG5cbiAgICAgICAgQGdhbWUubG9hZC5zcHJpdGVzaGVldCgncm9jaycsICdyb2NrLnBuZycsIDI5NCwgMjUwLCAzKVxuICAgICAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdwYXBlcicsICdwYXBlci5wbmcnLCAzMDAsIDE2OSwgMylcbiAgICAgICAgQGdhbWUubG9hZC5zcHJpdGVzaGVldCgnc2Npc3NvcnMnLCAnc2Npc3NvcnMucG5nJywgMzAwLCAxNjgsIDMpXG5cbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnc2luaycsICdiYWNrZ3JvdW5kcy9zaW5rLnBuZycpXG5cbiAgICAgICAgZm9yIGxldmVsTmFtZSBpbiBbJ2FyY3RpYycsICdjaXR5JywgJ2ZvcmVzdCcsICdraXRjaGVuJywgJ3N0YWdlJywgJ3RhYmxlJ11cbiAgICAgICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UobGV2ZWxOYW1lLCBcImJhY2tncm91bmRzLyN7bGV2ZWxOYW1lfS5qcGdcIilcbiAgICAgICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UobGV2ZWxOYW1lICsgJy10aHVtYm5haWwnLCBcImJhY2tncm91bmRzLyN7bGV2ZWxOYW1lfS10aHVtYm5haWwuanBnXCIpXG5cbiAgICBjcmVhdGU6IC0+XG4gICAgICAgIEBnYW1lLmFkZC5hdWRpbygnYmdtJykucGxheSgnJywgMCwgMC43LCB0cnVlKVxuICAgICAgICBAZ2FtZS5zdGF0ZS5zdGFydCgnaW50cm8nKVxuXG4gICAgZmlsZUNvbXBsZXRlOiAocHJvZ3Jlc3MsIGNhY2hlS2V5LCBzdWNjZXNzLCB0b3RhbExvYWRlZCwgdG90YWxGaWxlcykgPT5cbiAgICAgICAgQHByb2dyZXNzYmFyR3JlZW4uc2NhbGUueCA9IHByb2dyZXNzIC8gMTAwXG5cblxuY2xhc3MgSW50cm9TdGF0ZVxuICAgIHNob3dTY2VuZTogKHdoaWNoKSAtPlxuICAgICAgICBpZiBAYmFja2dyb3VuZD8gdGhlbiBAYmFja2dyb3VuZC5kZXN0cm95KClcbiAgICAgICAgaWYgQHRleHQ/IHRoZW4gQHRleHQuZGVzdHJveSgpXG4gICAgICAgIEBiYWNrZ3JvdW5kID0gQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCAnaW50cm8nICsgd2hpY2gpXG4gICAgICAgIEBnYW1lLmFkZC5hdWRpbygnaW50cm8tdGFsaycgKyB3aGljaCkucGxheSgpXG4gICAgICAgIEB0ZXh0ID0gQGdhbWUuYWRkLnRleHQoMzAsIDMwLCBAdGV4dHNbd2hpY2gtMV0sIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsYWNrJ1xuICAgICAgICAgICAgc3Ryb2tlVGhpY2tuZXNzOiA2XG4gICAgICAgICAgICBmb250OiAnODBweCBib2xkIG1vbm9zcGFjZSdcbiAgICAgICAgfSlcblxuICAgIGNyZWF0ZTogLT5cbiAgICAgICAgQGR1cmF0aW9ucyA9IFtcbiAgICAgICAgICAgIDI1MDBcbiAgICAgICAgICAgIDI1MDBcbiAgICAgICAgICAgIDI1MDBcbiAgICAgICAgICAgIDI1MDBcbiAgICAgICAgICAgIDM1MDBcbiAgICAgICAgXVxuICAgICAgICBAdGV4dHMgPSBbXG4gICAgICAgICAgICAnT25lIHNsaWNlIGxlZnQuLi4nXG4gICAgICAgICAgICAnSSBvbmx5IGhhZCBvbmUuIEl0XFwncyBtaW5lISdcbiAgICAgICAgICAgICdZb3VycyB3YXMgaGFsZiB0aGUgcGllISdcbiAgICAgICAgICAgICdPbmx5IG9uZSB3YXkgdG8gc2V0dGxlIHRoaXMuLi4nXG4gICAgICAgICAgICAnUk8gU0hBTSBCTyEhISdcbiAgICAgICAgXVxuICAgICAgICBAYmFja2dyb3VuZCA9IG51bGxcbiAgICAgICAgQHRleHQgPSBudWxsXG4gICAgICAgIEBjdXJyZW50ID0gMVxuICAgICAgICBAc2hvd1NjZW5lKEBjdXJyZW50KVxuXG4gICAgICAgIEBzd2l0Y2hUaW1lID0gQGdhbWUudGltZS5ub3cgKyBAZHVyYXRpb25zWzBdXG4gICAgICAgIEBzcGFjZWJhciA9IEBnYW1lLmlucHV0LmtleWJvYXJkLmFkZEtleShQaGFzZXIuS2V5Q29kZS5TUEFDRUJBUilcblxuICAgIHVwZGF0ZTogLT5cbiAgICAgICAgaWYgQGdhbWUudGltZS5ub3cgPj0gQHN3aXRjaFRpbWVcbiAgICAgICAgICAgIEBjdXJyZW50KytcbiAgICAgICAgICAgIGlmIEBjdXJyZW50ID49IDZcbiAgICAgICAgICAgICAgICBAZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBzd2l0Y2hUaW1lID0gQGdhbWUudGltZS5ub3cgKyBAZHVyYXRpb25zW0BjdXJyZW50LTFdXG4gICAgICAgICAgICAgICAgQHNob3dTY2VuZShAY3VycmVudCwgJycpXG5cblxuICAgICAgICBpZiBAc3BhY2ViYXIuanVzdERvd25cbiAgICAgICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpXG5cblxuY2xhc3MgVGl0bGVTdGF0ZVxuICAgIGNyZWF0ZTogLT5cbiAgICAgICAgQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCAndGl0bGUnKVxuICAgICAgICBAc3RhcnRUZXh0ID0gQGdhbWUuYWRkLnRleHQoMzAsIDQwMCwgJ0RFUFJFU1NcXG5TUEFDRUJBUlxcblRPIEZJR0hUXFxuVEhFIENPTVBVVEVSJywge1xuICAgICAgICAgICAgZmlsbDogJ3doaXRlJ1xuICAgICAgICAgICAgZm9udDogJzYwcHggYm9sZCBtb25vc3BhY2UnXG4gICAgICAgIH0pXG4gICAgICAgIEBzdGFydFRleHQyID0gQGdhbWUuYWRkLnRleHQoOTgwLCAzMjAsICdERVBSRVNTXFxuRU5URVJcXG5UTyBGSUdIVFxcbkEgRlJJRU5EXFxuSE9UU0VBVCcsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIGZvbnQ6ICc2MHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICB9KVxuICAgICAgICBAZmxpcHBlclRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIDcwMFxuICAgICAgICBAc3BhY2ViYXIgPSBAZ2FtZS5pbnB1dC5rZXlib2FyZC5hZGRLZXkoUGhhc2VyLktleUNvZGUuU1BBQ0VCQVIpXG4gICAgICAgIEBlbnRlciA9IEBnYW1lLmlucHV0LmtleWJvYXJkLmFkZEtleShQaGFzZXIuS2V5Q29kZS5FTlRFUilcbiAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKCdtb3J0YWwtcm8tc2hhbS1ibycpLnBsYXkoKVxuXG4gICAgdXBkYXRlOiAtPlxuICAgICAgICBpZiBAZ2FtZS50aW1lLm5vdyA+PSBAZmxpcHBlclRpbWVcbiAgICAgICAgICAgIEBzdGFydFRleHQudmlzaWJsZSA9IG5vdCBAc3RhcnRUZXh0LnZpc2libGVcbiAgICAgICAgICAgIEBzdGFydFRleHQyLnZpc2libGUgPSBub3QgQHN0YXJ0VGV4dDIudmlzaWJsZVxuICAgICAgICAgICAgaWYgQHN0YXJ0VGV4dC52aXNpYmxlXG4gICAgICAgICAgICAgICAgQGZsaXBwZXJUaW1lID0gQGdhbWUudGltZS5ub3cgKyA3MDBcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBAZmxpcHBlclRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIDIwMFxuXG4gICAgICAgIGlmIEBzcGFjZWJhci5qdXN0RG93blxuICAgICAgICAgICAgd2luZG93LnBsYXllcjIgPSBmYWxzZVxuICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ2hvdy10by1wbGF5JylcblxuICAgICAgICBpZiBAZW50ZXIuanVzdERvd25cbiAgICAgICAgICAgIHdpbmRvdy5wbGF5ZXIyID0gdHJ1ZVxuICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ2hvdy10by1wbGF5JylcblxuXG5jbGFzcyBIb3dUb1BsYXlTdGF0ZVxuICAgIGNyZWF0ZTogLT5cbiAgICAgICAgQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCAoaWYgd2luZG93LnBsYXllcjIgdGhlbiAnaG93LXRvLXBsYXknIGVsc2UgJ2hvdy10by1wbGF5LWFpJykpXG4gICAgICAgIEBzcGFjZWJhciA9IEBnYW1lLmlucHV0LmtleWJvYXJkLmFkZEtleShQaGFzZXIuS2V5Q29kZS5TUEFDRUJBUilcblxuICAgIHVwZGF0ZTogLT5cbiAgICAgICAgaWYgQHNwYWNlYmFyLmp1c3REb3duXG4gICAgICAgICAgICBAZ2FtZS5zdGF0ZS5zdGFydCgnbGV2ZWxzZWxlY3QnKVxuXG5cbmNsYXNzIExldmVsU2VsZWN0U3RhdGVcbiAgICBjcmVhdGU6IC0+XG4gICAgICAgIEBnYW1lLmFkZC5hdWRpbygnc2VsZWN0LWEtc3RhZ2UnKS5wbGF5KClcbiAgICAgICAgQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCAnc2luaycpXG4gICAgICAgIEBsZXZlbHMgPSBbXG4gICAgICAgICAgICBbJ2FyY3RpYycsICdjaXR5JywgJ2ZvcmVzdCddXG4gICAgICAgICAgICBbJ2tpdGNoZW4nLCAnc3RhZ2UnLCAndGFibGUnXVxuICAgICAgICBdXG4gICAgICAgIEBzdGFnZVNwcml0ZXMgPSAoXG4gICAgICAgICAgICBmb3Igcm93IGluIFswLi4uMl1cbiAgICAgICAgICAgICAgICBmb3IgY29sIGluIFswLi4uM11cbiAgICAgICAgICAgICAgICAgICAgeCA9IFNDUkVFTl9XSURUSC8yIC0gNDAwICsgY29sICogMzAwXG4gICAgICAgICAgICAgICAgICAgIHkgPSAyMjUgKyByb3cgKiAyNTBcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlID0gQGdhbWUuYWRkLnNwcml0ZSh4ICsgMTAwLCB5ICsgMTAwLCBAbGV2ZWxzW3Jvd11bY29sXSArICctdGh1bWJuYWlsJylcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLmFuY2hvci5zZXRUbygwLjUsIDAuNSlcbiAgICAgICAgICAgICAgICAgICAgQGdhbWUuYWRkLnRleHQgeCsxMCwgeSsxNTAsIEBsZXZlbHNbcm93XVtjb2xdLnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxsOiAnd2hpdGUnXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJva2U6ICdibGFjaydcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZVRoaWNrbmVzczogNlxuICAgICAgICAgICAgICAgICAgICAgICAgZm9udDogJzMwcHggYm9sZCBtb25vc3BhY2UnXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZVxuICAgICAgICApXG4gICAgICAgIEBjdXJyZW50Q29sID0gMFxuICAgICAgICBAY3VycmVudFJvdyA9IDBcblxuICAgICAgICBAdGl0bGUgPSBAZ2FtZS5hZGQudGV4dCAwLCAwLCAnU0VMRUNUIFNUQUdFJyxcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsYWNrJ1xuICAgICAgICAgICAgc3Ryb2tlVGhpY2tuZXNzOiAxMlxuICAgICAgICAgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAgICAgYm91bmRzQWxpZ25WOiAnbWlkZGxlJ1xuICAgICAgICAgICAgZm9udDogJzEwMHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICBAdGl0bGUuc2V0VGV4dEJvdW5kcygwLCAwLCBTQ1JFRU5fV0lEVEgsIDEyMClcblxuICAgICAgICBAZGlyZWN0aW9ucyA9IEBnYW1lLmFkZC50ZXh0IDAsIDgwLCAnQ2hvb3NlIHdpdGggYXJyb3dzLCBzcGFjZSB0byBzdGFydCcsXG4gICAgICAgICAgICBmaWxsOiAnd2hpdGUnXG4gICAgICAgICAgICBzdHJva2U6ICdibGFjaydcbiAgICAgICAgICAgIHN0cm9rZVRoaWNrbmVzczogNlxuICAgICAgICAgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAgICAgYm91bmRzQWxpZ25WOiAnbWlkZGxlJ1xuICAgICAgICAgICAgZm9udDogJzQ4cHggYm9sZCBtb25vc3BhY2UnXG4gICAgICAgIEBkaXJlY3Rpb25zLnNldFRleHRCb3VuZHMoMCwgMCwgU0NSRUVOX1dJRFRILCAxMjApXG5cbiAgICAgICAgQGtleXMgPSBAZ2FtZS5pbnB1dC5rZXlib2FyZC5hZGRLZXlzXG4gICAgICAgICAgICBzcGFjZWJhcjogUGhhc2VyLktleUNvZGUuU1BBQ0VCQVJcbiAgICAgICAgICAgIHVwOiBQaGFzZXIuS2V5Q29kZS5VUFxuICAgICAgICAgICAgZG93bjogUGhhc2VyLktleUNvZGUuRE9XTlxuICAgICAgICAgICAgbGVmdDogUGhhc2VyLktleUNvZGUuTEVGVFxuICAgICAgICAgICAgcmlnaHQ6IFBoYXNlci5LZXlDb2RlLlJJR0hUXG5cbiAgICAgICAgQGhpZ2hsaWdodCgpXG5cbiAgICBoaWdobGlnaHQ6IC0+XG4gICAgICAgIGZvciByb3dEYXRhLCByb3cgaW4gQHN0YWdlU3ByaXRlc1xuICAgICAgICAgICAgZm9yIHNwcml0ZSwgY29sIGluIHJvd0RhdGFcbiAgICAgICAgICAgICAgICBpZiBub3QgKGNvbCA9PSBAY3VycmVudENvbCBhbmQgcm93ID09IEBjdXJyZW50Um93KVxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGludCA9IDB4NjY2NjY2XG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS5zY2FsZS54ID0gMVxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUuc2NhbGUueSA9IDFcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS50aW50ID0gMHhmZmZmZmZcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnNjYWxlLnggPSAxLjFcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnNjYWxlLnkgPSAxLjFcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LnNlbGVjdGVkTGV2ZWwgPSBAbGV2ZWxzW3Jvd11bY29sXVxuXG5cbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIGlmIEBrZXlzLnNwYWNlYmFyLmp1c3REb3duXG4gICAgICAgICAgICBAZ2FtZS5zdGF0ZS5zdGFydCgnZ2FtZScpXG5cbiAgICAgICAgaWYgQGtleXMubGVmdC5qdXN0RG93blxuICAgICAgICAgICAgQGN1cnJlbnRDb2wtLVxuICAgICAgICAgICAgaWYgQGN1cnJlbnRDb2wgPCAwIHRoZW4gQGN1cnJlbnRDb2wgPSAwXG4gICAgICAgICAgICBAaGlnaGxpZ2h0KClcbiAgICAgICAgaWYgQGtleXMucmlnaHQuanVzdERvd25cbiAgICAgICAgICAgIEBjdXJyZW50Q29sKytcbiAgICAgICAgICAgIGlmIEBjdXJyZW50Q29sID4gMiB0aGVuIEBjdXJyZW50Q29sID0gMlxuICAgICAgICAgICAgQGhpZ2hsaWdodCgpXG5cbiAgICAgICAgaWYgQGtleXMudXAuanVzdERvd25cbiAgICAgICAgICAgIEBjdXJyZW50Um93LS1cbiAgICAgICAgICAgIGlmIEBjdXJyZW50Um93IDwgMCB0aGVuIEBjdXJyZW50Um93ID0gMFxuICAgICAgICAgICAgQGhpZ2hsaWdodCgpXG4gICAgICAgIGlmIEBrZXlzLmRvd24uanVzdERvd25cbiAgICAgICAgICAgIEBjdXJyZW50Um93KytcbiAgICAgICAgICAgIGlmIEBjdXJyZW50Um93ID4gMSB0aGVuIEBjdXJyZW50Um93ID0gMVxuICAgICAgICAgICAgQGhpZ2hsaWdodCgpXG5cblxuY2xhc3MgR2FtZVN0YXRlXG4gICAgbWFrZVBsYXllcjogKHgsIHksIGhlYWx0aGJhclgsIGhlYWx0aGJhclksIHNwcml0ZUtleSwgYW5pbWF0aW9ucykgLT5cbiAgICAgICAgc3ByaXRlID0gQGdhbWUuYWRkLnNwcml0ZSh4LCB5LCBzcHJpdGVLZXkpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgncG9zZScsIGFuaW1hdGlvbnMucG9zZSwgMTAsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgnaWRsZScsIGFuaW1hdGlvbnMuaWRsZSwgNSwgdHJ1ZSlcbiAgICAgICAgc3ByaXRlLmFuaW1hdGlvbnMuYWRkKCdwYXBlcicsIGFuaW1hdGlvbnMucGFwZXIsIDEwLCB0cnVlKVxuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5hZGQoJ3NjaXNzb3JzJywgYW5pbWF0aW9ucy5zY2lzc29ycywgMTAsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgncm9jaycsIGFuaW1hdGlvbnMucm9jaywgMTAsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgnaGl0JywgYW5pbWF0aW9ucy5oaXQsIDEwLCBmYWxzZSlcbiAgICAgICAgc3ByaXRlLmFuaW1hdGlvbnMuYWRkKCdkaWUnLCBhbmltYXRpb25zLmRpZSwgMTAsIGZhbHNlKVxuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5hZGQoJ3RyYW5zZm9ybScsIGFuaW1hdGlvbnMudHJhbnNmb3JtLCAxMCwgZmFsc2UpXG4gICAgICAgIHNwcml0ZS5hbmNob3Iuc2V0VG8oMC41LCAwLjUpXG4gICAgICAgIGF0dGFjayA9ICdpZGxlJ1xuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5wbGF5KCdpZGxlJylcblxuICAgICAgICBoZWFsdGggPSAxMDBcbiAgICAgICAgaGVhbHRoYmFyQmFja2dyb3VuZCA9IEBnYW1lLmFkZC5zcHJpdGUoaGVhbHRoYmFyWCwgaGVhbHRoYmFyWSwgJ2hlYWx0aGJhci1iYWNrZ3JvdW5kJylcbiAgICAgICAgaGVhbHRoYmFyQmFja2dyb3VuZC5hbmltYXRpb25zLmFkZCgnZ2xvdycsIFswLDAsMCwwLDAsMCwwLDAsMCwxLDJdLCAxMCwgdHJ1ZSlcbiAgICAgICAgaGVhbHRoYmFyQmFja2dyb3VuZC5hbmltYXRpb25zLnBsYXkoJ2dsb3cnKVxuICAgICAgICBoZWFsdGhiYXJHcmVlbiA9IEBnYW1lLmFkZC5zcHJpdGUoaGVhbHRoYmFyWCArIDQsIGhlYWx0aGJhclkgKyA0LCAnaGVhbHRoYmFyLWdyZWVuJylcblxuICAgICAgICB7c3ByaXRlLCBhdHRhY2ssIGhlYWx0aCwgaGVhbHRoYmFyQmFja2dyb3VuZCwgaGVhbHRoYmFyR3JlZW59XG5cbiAgICBjcmVhdGU6IC0+XG4gICAgICAgIEBrZXlzID0gQGdhbWUuaW5wdXQua2V5Ym9hcmQuYWRkS2V5c1xuICAgICAgICAgICAgc3BhY2ViYXI6IFBoYXNlci5LZXlDb2RlLlNQQUNFQkFSXG5cbiAgICAgICAgICAgIHAxX3JvY2s6IFBoYXNlci5LZXlDb2RlLk9ORVxuICAgICAgICAgICAgcDFfcGFwZXI6IFBoYXNlci5LZXlDb2RlLlRXT1xuICAgICAgICAgICAgcDFfc2Npc3NvcnM6IFBoYXNlci5LZXlDb2RlLlRIUkVFXG5cbiAgICAgICAgICAgIHAyX3JvY2s6IFBoYXNlci5LZXlDb2RlLkxFRlRcbiAgICAgICAgICAgIHAyX3BhcGVyOiBQaGFzZXIuS2V5Q29kZS5ET1dOXG4gICAgICAgICAgICBwMl9zY2lzc29yczogUGhhc2VyLktleUNvZGUuUklHSFRcblxuICAgICAgICBAZ2FtZS50aW1lLmRlc2lyZWRGcHMgPSA2MFxuXG4gICAgICAgIEBnYW1lLmdyb3VwcyA9IHt9XG4gICAgICAgIEBnYW1lLmdyb3Vwcy5iYWNrZ3JvdW5kID0gQGdhbWUuYWRkLmdyb3VwKClcbiAgICAgICAgQGdhbWUuZ3JvdXBzLmFjdG9ycyA9IEBnYW1lLmFkZC5ncm91cCgpXG4gICAgICAgIEBnYW1lLmdyb3Vwcy5wbGF5ZXIgPSBAZ2FtZS5hZGQuZ3JvdXAoKVxuICAgICAgICBAZ2FtZS5ncm91cHMudWkgPSBAZ2FtZS5hZGQuZ3JvdXAoKVxuXG4gICAgICAgIEBiYWNrZ3JvdW5kID0gQGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgU0NSRUVOX1dJRFRILCBTQ1JFRU5fSEVJR0hULCBzZWxlY3RlZExldmVsKVxuXG4gICAgICAgIEBwbGF5ZXIxID0gQG1ha2VQbGF5ZXIgU0NSRUVOX1dJRFRILzIgLSAxMDAsIFNDUkVFTl9IRUlHSFQvMiArIDQwLCA0MCwgNDAsICdwbGF5ZXIxJyxcbiAgICAgICAgICAgIHBvc2U6IFszMSwzMiwzM11cbiAgICAgICAgICAgIGlkbGU6IFs2LDcsOV1cbiAgICAgICAgICAgIHBhcGVyOiBbMzEsIDI0XVxuICAgICAgICAgICAgc2Npc3NvcnM6IFsxMSwxMiwxNF1cbiAgICAgICAgICAgIHJvY2s6IFsyMF1cbiAgICAgICAgICAgIGhpdDogWzIxLDIyXVxuICAgICAgICAgICAgZGllOiBbMjEsMjJdXG4gICAgICAgICAgICB0cmFuc2Zvcm06IFsxNiwxNywxOCwxOV1cbiAgICAgICAgQHBsYXllcjEuc3ByaXRlLnNjYWxlLnggPSAtM1xuICAgICAgICBAcGxheWVyMS5zcHJpdGUuc2NhbGUueSA9IDNcblxuICAgICAgICBAcGxheWVyMiA9IEBtYWtlUGxheWVyIFNDUkVFTl9XSURUSC8yICsgMTAwLCBTQ1JFRU5fSEVJR0hULzIgKyA0MCwgU0NSRUVOX1dJRFRILzIgKyA0MCwgNDAsICdwbGF5ZXIyJyxcbiAgICAgICAgICAgIHBvc2U6IFszLDQsMTFdXG4gICAgICAgICAgICBpZGxlOiBbMTUsMTYsMTddXG4gICAgICAgICAgICBwYXBlcjogWzcsNiw3XVxuICAgICAgICAgICAgc2Npc3NvcnM6IFszLDQsNV1cbiAgICAgICAgICAgIHJvY2s6IFswLDEsMl1cbiAgICAgICAgICAgIGhpdDogWzksMTAsMTFdXG4gICAgICAgICAgICBkaWU6IFs5LDEwLDExXVxuICAgICAgICAgICAgdHJhbnNmb3JtOiBbMTIsNSwxNCwxM11cbiAgICAgICAgQHBsYXllcjIuc3ByaXRlLnNjYWxlLnggPSAxLjdcbiAgICAgICAgQHBsYXllcjIuc3ByaXRlLnNjYWxlLnkgPSAxLjdcblxuICAgICAgICBAZG9Db3VudGRvd24oKVxuXG4gICAgZG9Db3VudGRvd246IC0+XG4gICAgICAgIEBjb21iYXRTdGF0ZSA9ICdjb3VudGRvd24nXG4gICAgICAgIEBzdGFydFRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIDUwMDBcbiAgICAgICAgQGNvdW50ZG93bkRpc3BsYXkgPSBAZ2FtZS5hZGQudGV4dCAxLCAwLCAnJyxcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsYWNrJ1xuICAgICAgICAgICAgc3Ryb2tlVGhpY2tuZXNzOiAxMlxuICAgICAgICAgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAgICAgYm91bmRzQWxpZ25WOiAnbWlkZGxlJ1xuICAgICAgICAgICAgZm9udDogJzMwMHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICBAY291bnRkb3duRGlzcGxheS5zZXRUZXh0Qm91bmRzKDAsIDAsIFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVClcblxuICAgIGRvU3RhcnRSb3VuZDogLT5cbiAgICAgICAgQGNvdW50ZG93bkRpc3BsYXkuZGVzdHJveSgpXG4gICAgICAgIEBjb21iYXRTdGF0ZSA9ICdkdXJpbmcnXG5cbiAgICBkb0VuZFJvdW5kOiAtPlxuICAgICAgICBpZiBAcGxheWVyMS5oZWFsdGggPD0gMFxuICAgICAgICAgICAgQHBsYXllcjEuc3ByaXRlLmFuaW1hdGlvbnMucGxheSgnZGllJylcbiAgICAgICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoJ3RyYW5zZm9ybScpLm9uQ29tcGxldGUuYWRkID0+XG4gICAgICAgICAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKEBwbGF5ZXIyLmF0dGFjayArICctd2lucycpLnBsYXkoKVxuICAgICAgICAgICAgICAgIGZpbmFsID0gQGdhbWUuYWRkLnNwcml0ZShAcGxheWVyMi5zcHJpdGUueCArIDE1MCwgQHBsYXllcjIuc3ByaXRlLnkgLSAyNTAsIEBwbGF5ZXIyLmF0dGFjaylcbiAgICAgICAgICAgICAgICBmaW5hbC5zY2FsZS5zZXRUbygtMiwgMilcbiAgICAgICAgICAgICAgICBmaW5hbC5hbmltYXRpb25zLmFkZCgndHJhbnNmb3JtJywgWzAsMSwyXSwgMiwgZmFsc2UpLm9uQ29tcGxldGUuYWRkID0+XG4gICAgICAgICAgICAgICAgICAgIEBkb0ZpbmlzaGVkKClcbiAgICAgICAgICAgICAgICBmaW5hbC5hbmltYXRpb25zLnBsYXkoJ3RyYW5zZm9ybScpXG4gICAgICAgICAgICAgICAgQHBsYXllcjIuc3ByaXRlLmRlc3Ryb3koKVxuICAgICAgICBlbHNlIGlmIEBwbGF5ZXIyLmhlYWx0aCA8PSAwXG4gICAgICAgICAgICBAcGxheWVyMi5zcHJpdGUuYW5pbWF0aW9ucy5wbGF5KCdkaWUnKVxuICAgICAgICAgICAgQHBsYXllcjEuc3ByaXRlLmFuaW1hdGlvbnMucGxheSgndHJhbnNmb3JtJykub25Db21wbGV0ZS5hZGQgPT5cbiAgICAgICAgICAgICAgICBAZ2FtZS5hZGQuYXVkaW8oQHBsYXllcjEuYXR0YWNrICsgJy13aW5zJykucGxheSgpXG4gICAgICAgICAgICAgICAgZmluYWwgPSBAZ2FtZS5hZGQuc3ByaXRlKEBwbGF5ZXIxLnNwcml0ZS54IC0gMjAwLCBAcGxheWVyMS5zcHJpdGUueSAtIDIwMCwgQHBsYXllcjEuYXR0YWNrKVxuICAgICAgICAgICAgICAgIGZpbmFsLnNjYWxlLnNldFRvKDIsIDIpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5hZGQoJ3RyYW5zZm9ybScsIFswLDEsMl0sIDIsIGZhbHNlKS5vbkNvbXBsZXRlLmFkZCA9PlxuICAgICAgICAgICAgICAgICAgICBAZG9GaW5pc2hlZCgpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5wbGF5KCd0cmFuc2Zvcm0nKVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5kZXN0cm95KClcbiAgICAgICAgQGNvbWJhdFN0YXRlID0gJ292ZXInXG5cbiAgICBkb0ZpbmlzaGVkOiA9PlxuICAgICAgICBAY29tYmF0U3RhdGUgPSAnZmluaXNoZWQnXG5cbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIEBwbGF5ZXIxLmhlYWx0aGJhckdyZWVuLnNjYWxlLnggPSBAcGxheWVyMS5oZWFsdGggLyAxMDBcbiAgICAgICAgQHBsYXllcjIuaGVhbHRoYmFyR3JlZW4uc2NhbGUueCA9IEBwbGF5ZXIyLmhlYWx0aCAvIDEwMFxuXG4gICAgICAgIGlmIEBjb21iYXRTdGF0ZSA9PSAnY291bnRkb3duJ1xuICAgICAgICAgICAgcmVtYWluaW5nID0gTWF0aC5mbG9vcigoQHN0YXJ0VGltZSAtIEBnYW1lLnRpbWUubm93KSAvIDEwMDApXG4gICAgICAgICAgICBkaXNwbGF5ID0gcmVtYWluaW5nIC0gMVxuICAgICAgICAgICAgaWYgZGlzcGxheSA9PSAwXG4gICAgICAgICAgICAgICAgZGlzcGxheSA9ICdGSUdIVCEnXG4gICAgICAgICAgICAgICAgaWYgQGNvdW50ZG93bkRpc3BsYXkudGV4dCA9PSAnMSdcbiAgICAgICAgICAgICAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKCdmaWdodCcpLnBsYXkoKVxuICAgICAgICAgICAgQGNvdW50ZG93bkRpc3BsYXkudGV4dCA9IGRpc3BsYXkudG9TdHJpbmcoKVxuXG4gICAgICAgICAgICBpZiByZW1haW5pbmcgPD0gMFxuICAgICAgICAgICAgICAgIEBkb1N0YXJ0Um91bmQoKVxuICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGVsc2UgaWYgQGNvbWJhdFN0YXRlID09ICdkdXJpbmcnXG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKEBwbGF5ZXIxLmhlYWx0aCwgQHBsYXllcjIuaGVhbHRoKVxuICAgICAgICAgICAgaWYgQHBsYXllcjEuaGVhbHRoIDw9IDAgb3IgQHBsYXllcjIuaGVhbHRoIDw9IDBcbiAgICAgICAgICAgICAgICBAZG9FbmRSb3VuZCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgICAgIGlmIEBrZXlzLnAxX3BhcGVyLmlzRG93biBvciBAa2V5cy5wMV9yb2NrLmlzRG93biBvciBAa2V5cy5wMV9zY2lzc29ycy5pc0Rvd25cbiAgICAgICAgICAgICAgICBpZiBAa2V5cy5wMV9wYXBlci5pc0Rvd25cbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjEuYXR0YWNrID0gJ3BhcGVyJ1xuICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAxX3JvY2suaXNEb3duXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIxLmF0dGFjayA9ICdyb2NrJ1xuICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAxX3NjaXNzb3JzLmlzRG93blxuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5hdHRhY2sgPSAnc2Npc3NvcnMnXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQHBsYXllcjEuYXR0YWNrID0gJ2lkbGUnXG4gICAgICAgICAgICBpZiBAcGxheWVyMS5hdHRhY2sgIT0gQHBsYXllcjEuc3ByaXRlLmFuaW1hdGlvbnMuY3VycmVudEFuaW0ubmFtZVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoQHBsYXllcjEuYXR0YWNrKVxuXG4gICAgICAgICAgICBpZiBAa2V5cy5wMl9wYXBlci5pc0Rvd24gb3IgQGtleXMucDJfcm9jay5pc0Rvd24gb3IgQGtleXMucDJfc2Npc3NvcnMuaXNEb3duXG4gICAgICAgICAgICAgICAgaWYgQGtleXMucDJfcGFwZXIuaXNEb3duXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmF0dGFjayA9ICdwYXBlcidcbiAgICAgICAgICAgICAgICBpZiBAa2V5cy5wMl9yb2NrLmlzRG93blxuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSAncm9jaydcbiAgICAgICAgICAgICAgICBpZiBAa2V5cy5wMl9zY2lzc29ycy5pc0Rvd25cbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjIuYXR0YWNrID0gJ3NjaXNzb3JzJ1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmF0dGFjayA9ICdpZGxlJ1xuICAgICAgICAgICAgaWYgQHBsYXllcjIuYXR0YWNrICE9IEBwbGF5ZXIyLnNwcml0ZS5hbmltYXRpb25zLmN1cnJlbnRBbmltLm5hbWVcbiAgICAgICAgICAgICAgICBAcGxheWVyMi5zcHJpdGUuYW5pbWF0aW9ucy5wbGF5KEBwbGF5ZXIyLmF0dGFjaylcblxuICAgICAgICAgICAgaWYgQHBsYXllcjEuYXR0YWNrICE9IEBwbGF5ZXIyLmF0dGFja1xuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIxLmF0dGFjayA9PSAncGFwZXInIGFuZCBAcGxheWVyMi5hdHRhY2sgPT0gJ3NjaXNzb3JzJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5oZWFsdGggLT0gMlxuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIxLmF0dGFjayA9PSAnc2Npc3NvcnMnIGFuZCBAcGxheWVyMi5hdHRhY2sgPT0gJ3JvY2snXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmhlYWx0aCAtPSAyXG4gICAgICAgICAgICAgICAgaWYgQHBsYXllcjEuYXR0YWNrID09ICdyb2NrJyBhbmQgQHBsYXllcjIuYXR0YWNrID09ICdwYXBlcidcbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjIuaGVhbHRoIC09IDJcbiAgICAgICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgPT0gJ2lkbGUnXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmhlYWx0aCAtPSAxXG5cbiAgICAgICAgICAgIGlmIEBwbGF5ZXIyLmF0dGFjayAhPSBAcGxheWVyMS5hdHRhY2tcbiAgICAgICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgPT0gJ3BhcGVyJyBhbmQgQHBsYXllcjEuYXR0YWNrID09ICdzY2lzc29ycydcbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjEuaGVhbHRoIC09IDJcbiAgICAgICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgPT0gJ3NjaXNzb3JzJyBhbmQgQHBsYXllcjEuYXR0YWNrID09ICdyb2NrJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5oZWFsdGggLT0gMlxuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIyLmF0dGFjayA9PSAncm9jaycgYW5kIEBwbGF5ZXIxLmF0dGFjayA9PSAncGFwZXInXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIxLmhlYWx0aCAtPSAyXG4gICAgICAgICAgICAgICAgaWYgQHBsYXllcjEuYXR0YWNrID09ICdpZGxlJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5oZWFsdGggLT0gMVxuXG4gICAgICAgICNlbHNlIGlmIEBjb21iYXRTdGF0ZSA9PSAnb3ZlcidcbiAgICAgICAgIyAgICBudWxsXG4gICAgICAgIGVsc2UgaWYgQGNvbWJhdFN0YXRlID09ICdmaW5pc2hlZCdcbiAgICAgICAgICAgIGlmIEBrZXlzLnNwYWNlYmFyLmp1c3REb3duXG4gICAgICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ2xldmVsc2VsZWN0JylcblxuXG5jbGFzcyBXaW5Mb3NlU3RhdGVcbiAgICBjcmVhdGU6IC0+XG5cblxuZ2FtZSA9IG5ldyBQaGFzZXIuR2FtZShTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFQsIFBoYXNlci5BVVRPLCAnZ2FtZScpXG5nYW1lLnN0YXRlLmFkZCgnYm9vdCcsIEJvb3RTdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCdwcmVsb2FkJywgUHJlbG9hZFN0YXRlKVxuZ2FtZS5zdGF0ZS5hZGQoJ2ludHJvJywgSW50cm9TdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCd0aXRsZScsIFRpdGxlU3RhdGUpXG5nYW1lLnN0YXRlLmFkZCgnaG93LXRvLXBsYXknLCBIb3dUb1BsYXlTdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCdsZXZlbHNlbGVjdCcsIExldmVsU2VsZWN0U3RhdGUpXG5nYW1lLnN0YXRlLmFkZCgnZ2FtZScsIEdhbWVTdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCd3aW5sb3NlJywgV2luTG9zZVN0YXRlKVxuXG5nYW1lLnN0YXRlLnN0YXJ0KCdib290JylcbiJdfQ==
