/* WINemulator — simulated Python and JavaScript runtimes.
 * Original, sandboxed interpreters. They never use eval(), new Function(),
 * fetch(), or any live host API. File access is routed through the emulated
 * Win.fs tree only.
 */
(function () {
  'use strict';

  Win.langs = Win.langs || {};

  var VERSION = { py: '3.12.0', js: '2.0' };
  var LIMITS = { steps: 300000, depth: 80, loop: 100000, output: 300000 };

  /* ------------------------------------------------------------------ utils */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(v) { return v !== null && typeof v === 'object'; }
  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function num(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') {
      var s = v.trim().replace(/_/g, '');
      if (/^0x/i.test(s)) return parseInt(s, 16);
      if (/^0o/i.test(s)) return parseInt(s, 8);
      if (/^0b/i.test(s)) return parseInt(s, 2);
      return Number(s);
    }
    if (isObj(v) && typeof v.valueOf === 'function') return num(v.valueOf());
    return Number(v);
  }
  function int(v) { return Math.trunc(num(v)); }
  var truthy = null; // assigned to bool below
  function bool(v) {
    if (Array.isArray(v)) return v.length > 0;
    if (v && v.__set) return v.items.size > 0;
    if (v && v.__dict) return v.map.size > 0;
    if (v && v.__map) return v.map.size > 0;
    if (v && v.__tuple) return v.items.length > 0;
    if (v && v.__range) return v.iter.length > 0;
    if (v && v.__iter) { ensureIterator(v); return v.values.length > 0; }
    if (isObj(v)) return true;
    return !!v;
  }
  truthy = bool;
  function plain(v) {
    if (Array.isArray(v)) return v.map(plain);
    if (v && v.__tuple) return v.items.map(plain);
    if (v && v.__set) return Array.from(v.items).map(plain);
    if (v && v.__dict) {
      var d = {};
      v.map.forEach(function (val, key) { d[String(key)] = plain(val); });
      return d;
    }
    if (v && v.__map) {
      var m = {};
      v.map.forEach(function (val, key) { m[String(key)] = plain(val); });
      return m;
    }
    if (v && v.__error) return { name: v.name, message: v.message };
    if (v && v.__date) return v.value.toISOString();
    if (v && v.__regexp) return v.source;
    if (v && v.__file) return '<file ' + v.name + '>';
    if (v && v.__function) return '[Function: ' + (v.name || 'anonymous') + ']';
    if (v && v.__native) return '[Function: ' + (v.name || 'native') + ']';
    if (v === undefined) return null;
    return v;
  }
  function escapeText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  }
  function padWith(pattern, length) {
    if (length <= 0) return '';
    var fill = pattern || ' ';
    return fill.repeat(Math.ceil(length / fill.length)).slice(0, length);
  }
  function regExpRaw(v) {
    try { return v && v.__regexp ? new RegExp(v.source, v.flags) : new RegExp(String(v)); }
    catch (e) { return /.^/; }
  }
  function display(v, lang, nested) {
    if (v === undefined) return lang === 'py' ? 'None' : 'undefined';
    if (v === null) return lang === 'py' ? 'None' : 'null';
    if (typeof v === 'boolean') return lang === 'py' ? (v ? 'True' : 'False') : (v ? 'true' : 'false');
    if (typeof v === 'number') {
      if (isNaN(v)) return lang === 'py' ? 'nan' : 'NaN';
      if (v === Infinity) return lang === 'py' ? 'inf' : 'Infinity';
      if (v === -Infinity) return lang === 'py' ? '-inf' : '-Infinity';
      return String(v);
    }
    if (typeof v === 'string') return nested ? "'" + v.replace(/'/g, "\\'") + "'" : v;
    if (v && v.__error) return v.name + ': ' + v.message;
    if (v && v.__function) return lang === 'py' ? '<function ' + (v.name || '<lambda>') + '>' : '[Function: ' + (v.name || 'anonymous') + ']';
    if (v && v.__native) return lang === 'py' ? '<built-in function ' + (v.name || '?') + '>' : '[Function: ' + (v.name || 'native') + ']';
    if (v && v.__class) return lang === 'py' ? "<class '" + v.name + "'>" : '[class ' + v.name + ']';
    if (v && v.__instance) {
      if (v.fields && has(v.fields, '__repr__')) return 'instance';
      return lang === 'py' ? '<' + v.cls.name + ' object>' : '[object ' + v.cls.name + ']';
    }
    if (v && v.__file) return "<_io.TextIOWrapper name='" + v.name + "' mode='" + v.mode + "'>";
    if (v && v.__range) return 'range(' + v.start + ', ' + v.stop + (v.step !== 1 ? ', ' + v.step : '') + ')';
    if (v && v.__tuple) return '(' + v.items.map(function (x) { return display(x, lang, true); }).join(', ') + (v.items.length === 1 ? ',' : '') + ')';
    if (Array.isArray(v)) {
      if (lang === 'py') return '[' + v.map(function (x) { return display(x, lang, true); }).join(', ') + ']';
      return '[ ' + v.map(function (x) { return display(x, lang, true); }).join(', ') + ' ]';
    }
    if (v && v.__set) return '{' + Array.from(v.items).map(function (x) { return display(x, lang, true); }).join(', ') + '}';
    if (v && v.__dict) {
      var pairs = [];
      v.map.forEach(function (val, key) { pairs.push(display(key, lang, true) + ': ' + display(val, lang, true)); });
      return '{' + pairs.join(', ') + '}';
    }
    if (v && v.__map) {
      var mp = [];
      v.map.forEach(function (val, key) { mp.push(display(key, lang, true) + ' => ' + display(val, lang, true)); });
      return 'Map(' + mp.length + ') {' + mp.join(', ') + '}';
    }
    if (v && v.__date) return v.value.toISOString();
    if (v && v.__regexp) return '/' + v.source + '/' + v.flags;
    if (v && v.__iter) return lang === 'py' ? '<iterator object>' : '[object Iterator]';
    if (v && v.__module) return "<module '" + v.name + "'>";
    if (isObj(v)) {
      var keys = Object.keys(v).filter(function (k) { return !/^__/.test(k); });
      if (lang === 'py') return '{' + keys.map(function (k) { return "'" + k + "': " + display(v[k], lang, true); }).join(', ') + '}';
      return '{ ' + keys.map(function (k) { return k + ': ' + display(v[k], lang, true); }).join(', ') + ' }';
    }
    return String(v);
  }
  function typeName(v, lang) {
    if (v === undefined) return lang === 'py' ? 'NoneType' : 'undefined';
    if (v === null) return lang === 'py' ? 'NoneType' : 'object';
    if (v && v.__error) return v.name;
    if (v && v.__function) return 'function';
    if (v && v.__native) return 'function';
    if (v && v.__class) return lang === 'py' ? 'type' : 'function';
    if (v && v.__instance) return v.cls.name;
    if (v && v.__module) return 'module';
    if (v && v.__file) return 'TextIOWrapper';
    if (v && v.__range) return 'range';
    if (v && v.__iter) return 'iterator';
    if (v && v.__map) return 'Map';
    if (v && v.__set) return lang === 'py' ? 'set' : 'Set';
    if (v && v.__dict) return lang === 'py' ? 'dict' : 'Object';
    if (v && v.__tuple) return 'tuple';
    if (v && v.__date) return 'Date';
    if (v && v.__regexp) return 'RegExp';
    if (Array.isArray(v)) return lang === 'py' ? 'list' : 'Array';
    if (typeof v === 'string') return lang === 'py' ? 'str' : 'string';
    if (typeof v === 'number') return lang === 'py' ? (Number.isInteger(v) ? 'int' : 'float') : 'number';
    if (typeof v === 'boolean') return lang === 'py' ? 'bool' : 'boolean';
    return 'object';
  }
  function jsTypeOf(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'object';
    if (v && (v.__function || v.__native)) return 'function';
    if (Array.isArray(v)) return 'object';
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return typeof v;
    if (v && (v.__error || v.__date || v.__regexp || v.__map || v.__set || v.__instance || v.__dict || v.__iter || v.__module)) return 'object';
    return typeof v;
  }
  function native(fn, name) {
    var f = function (args, named, ctx, self, callerEnv) {
      if (Array.isArray(args) && !has(args, 'named')) {
        try { args.named = named || {}; } catch (e) { /* non-extensible args */ }
      }
      return fn(args, named || {}, ctx, self, callerEnv);
    };
    f.__native = true;
    try { Object.defineProperty(f, 'name', { value: name || '', configurable: true }); } catch (e) { /* keep inferred name */ }
    return f;
  }
  var ERROR_BASES = {
    BaseException: [], Exception: ['BaseException'], SystemExit: ['BaseException'],
    ArithmeticError: ['Exception'], OverflowError: ['ArithmeticError'], ZeroDivisionError: ['ArithmeticError'],
    LookupError: ['Exception'], IndexError: ['LookupError'], KeyError: ['LookupError'],
    OSError: ['Exception'], IOError: ['OSError'], EOFError: ['OSError'], EnvironmentError: ['OSError'], UnsupportedOperation: ['OSError'],
    RuntimeError: ['Exception'], NotImplementedError: ['RuntimeError'],
    ValueError: ['Exception'], UnicodeError: ['ValueError'], JSONDecodeError: ['ValueError'],
    AssertionError: ['Exception'], AttributeError: ['Exception'], ImportError: ['Exception'],
    StopIteration: ['Exception'], SyntaxError: ['Exception'], TypeError: ['Exception'], Warning: ['Exception']
  };
  function langError(type, message) {
    return { __error: true, name: type, message: String(message || ''), bases: (ERROR_BASES[type] || ['Exception']).slice() };
  }
  function throwLang(value) { throw { __langThrow: true, value: value }; }
  function isThrow(e) { return !!(e && e.__langThrow); }
  function fail(type, message) { throwLang(langError(type, message)); }
  function syntax(message) { var e = new SyntaxError(message); e.name = 'SyntaxError'; throw e; }

  /* -------------------------------------------------------------- tokenizer */
  var OPS = [
    '>>>=', '**=', '//=', '<<=', '>>=', '&&=', '||=', '??=', '===', '!==',
    '...', '?.', '??', '=>', ':=', '**', '//', '==', '!=', '<=', '>=',
    '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
    '<<', '>>', '>>>', '+', '->', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|',
    '^', '~', '?', ':', '(', ')', '[', ']', '{', '}', ',', '.', ';', '@'
  ].sort(function (a, b) { return b.length - a.length; });

  function decodeEscapes(s) {
    return s.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|[nrtbfv0\\'"$`])/g, function (m, e) {
      if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
      if (e[0] === 'u') return String.fromCharCode(parseInt(e.slice(1), 16));
      if (e[0] === 'U') { var cp = parseInt(e.slice(1), 16); return cp > 0xffff ? String.fromCodePoint(cp) : String.fromCharCode(cp); }
      return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' })[e] || e;
    });
  }

  function tokenize(src, lang) {
    src = String(src).replace(/\r\n?/g, '\n');
    var toks = [], i = 0, line = 1, indents = [0], bol = true;
    function push(type, value, extra) {
      var t = { type: type, value: value, line: line };
      if (extra) Object.keys(extra).forEach(function (k) { t[k] = extra[k]; });
      toks.push(t);
      return t;
    }
    while (i < src.length) {
      if (bol) {
        if (lang === 'py') {
          var j = i, col = 0;
          while (j < src.length && (src[j] === ' ' || src[j] === '\t')) { col += src[j] === '\t' ? 4 : 1; j++; }
          if (j >= src.length || src[j] === '\n' || src[j] === '#') {
            while (i < src.length && src[i] !== '\n') i++;
            if (i < src.length) { i++; line++; }
            bol = true;
            continue;
          }
          i = j;
          var top = indents[indents.length - 1];
          if (col > top) { indents.push(col); push('indent', 'indent'); }
          else if (col < top) {
            while (indents.length > 1 && col < indents[indents.length - 1]) { indents.pop(); push('dedent', 'dedent'); }
            if (col !== indents[indents.length - 1]) syntax('Unindent does not match any outer indentation level');
          }
        }
        bol = false;
      }
      var c = src[i];
      if (c === '\n') { push('newline', '\n'); i++; line++; bol = true; continue; }
      if (c === ' ' || c === '\t' || c === '\f') { i++; continue; }
      if ((lang === 'py' && c === '#') || (lang === 'js' && c === '/' && src[i + 1] === '/')) {
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      if (lang === 'js' && c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        i += 2;
        continue;
      }
      if (lang === 'js' && c === '/') {
        var prev = toks[toks.length - 1];
        var regexAllowed = !prev || (prev.type === 'op' && !/[)\]}]/.test(prev.value) && prev.value !== '++' && prev.value !== '--')
          || (prev.type === 'id' && /^(return|throw|case|delete|void|typeof|new|in|of|yield|await)$/.test(prev.value));
        if (regexAllowed) {
          i++;
          var regexStart = i, inClass = false;
          while (i < src.length) {
            var rc = src[i];
            if (rc === '\n') syntax('Unterminated regular expression');
            if (rc === '\\') { i += 2; continue; }
            if (rc === '[') inClass = true;
            else if (rc === ']') inClass = false;
            else if (rc === '/' && !inClass) break;
            i++;
          }
          if (i >= src.length) syntax('Unterminated regular expression');
          var regexSource = src.slice(regexStart, i);
          i++;
          var flagStart = i;
          while (i < src.length && /[A-Za-z]/.test(src[i])) i++;
          push('regexp', { source: regexSource, flags: src.slice(flagStart, i) });
          continue;
        }
      }

      var prefix = '';
      if (lang === 'py' && /[rRbBuUfF]/.test(c)) {
        var p = i;
        while (i < src.length && /[rRbBuUfF]/.test(src[i]) && i - p < 2) i++;
        var pre = src.slice(p, i);
        if ((src[i] === '"' || src[i] === "'") && /^(r|b|u|f|br|rb|fr|rf)$/i.test(pre)) { prefix = pre.toLowerCase(); c = src[i]; }
        else i = p;
      }

      if (c === '"' || c === "'" || c === '`') {
        var q = c, triple = lang === 'py' && src.substr(i, 3) === q + q + q;
        var template = (lang === 'js' && q === '`') || prefix.indexOf('f') > -1;
        i += triple ? 3 : 1;
        var parts = [], buf = '';
        function flush() { if (buf) { parts.push({ text: buf }); buf = ''; } }
        while (i < src.length) {
          if (triple && src.substr(i, 3) === q + q + q) { i += 3; break; }
          if (!triple && src[i] === q) { i++; break; }
          if (src[i] === '\n') {
            if (!triple && !(template && lang === 'js')) syntax('Unterminated string literal');
            buf += '\n'; i++; line++; continue;
          }
          var interpolation = template && (lang === 'js'
            ? (src[i] === '$' && src[i + 1] === '{')
            : (src[i] === '{' && src[i + 1] !== '{'));
          if (interpolation) {
            flush();
            i += lang === 'js' ? 2 : 1;
            var start = i, depth = 0, quote = '';
            while (i < src.length) {
              var ch = src[i];
              if (quote) {
                if (ch === '\\') { i += 2; continue; }
                if (ch === quote) quote = '';
                i++; continue;
              }
              if (ch === '"' || ch === "'" || ch === '`') { quote = ch; i++; continue; }
              if (ch === '{') depth++;
              else if (ch === '}') { if (depth === 0) break; depth--; }
              else if (ch === '\n') line++;
              i++;
            }
            if (i >= src.length) syntax('Unterminated interpolation');
            parts.push({ expr: src.slice(start, i) });
            i++;
            continue;
          }
          if (lang === 'py' && template && src[i] === '{' && src[i + 1] === '{') { buf += '{'; i += 2; continue; }
          if (lang === 'py' && template && src[i] === '}' && src[i + 1] === '}') { buf += '}'; i += 2; continue; }
          if (src[i] === '\\' && i + 1 < src.length && prefix.indexOf('r') < 0) {
            var esc = src.slice(i).match(/^\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|[nrtbfv0\\'"$`])/);
            if (esc) { buf += decodeEscapes(esc[0]); i += esc[0].length; continue; }
          }
          buf += src[i++];
        }
        flush();
        push('str', template ? { parts: parts } : (parts.length ? parts[0].text : ''), { template: template, prefix: prefix });
        continue;
      }

      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var m = src.slice(i).match(/^(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)/);
        if (!m) syntax('Invalid number');
        var raw = m[0].replace(/_/g, ''), value;
        if (/^0[xX]/.test(raw)) value = parseInt(raw.slice(2), 16);
        else if (/^0[oO]/.test(raw)) value = parseInt(raw.slice(2), 8);
        else if (/^0[bB]/.test(raw)) value = parseInt(raw.slice(2), 2);
        else value = Number(raw);
        i += m[0].length;
        push('num', value);
        continue;
      }

      if (/[A-Za-z_$]/.test(c)) {
        var startId = i;
        while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) i++;
        push('id', src.slice(startId, i));
        continue;
      }

      var op = null;
      for (var k = 0; k < OPS.length; k++) {
        if (src.substr(i, OPS[k].length) === OPS[k]) { op = OPS[k]; break; }
      }
      if (op) { push('op', op); i += op.length; continue; }
      syntax('Unexpected character "' + c + '"');
    }
    if (toks.length && toks[toks.length - 1].type !== 'newline') push('newline', '\n');
    while (indents.length > 1) { indents.pop(); push('dedent', 'dedent'); }
    push('eof', '');
    return toks;
  }
  /* ---------------------------------------------------------------- parser */
  function Parser(tokens, lang) {
    this.t = tokens; this.i = 0; this.lang = lang; this.noIn = false;
  }
  Parser.prototype.cur = function () { return this.t[this.i] || { type: 'eof', value: '', line: 0 }; };
  Parser.prototype.at = function (v) {
    var t = this.cur();
    return (t.type === 'op' && t.value === v) || t.type === v;
  };
  Parser.prototype.atWord = function (w) { return this.cur().type === 'id' && this.cur().value === w; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.match = function () {
    for (var i = 0; i < arguments.length; i++) {
      if (this.at(arguments[i])) { this.i++; return arguments[i]; }
    }
    return null;
  };
  Parser.prototype.matchWord = function (w) { if (this.atWord(w)) { this.i++; return true; } return false; };
  Parser.prototype.expect = function (v) {
    if (!this.match(v)) syntax('Expected "' + v + '" but found "' + (this.cur().value || 'end of input') + '" at line ' + this.cur().line);
    return v;
  };
  Parser.prototype.expectWord = function (w) {
    if (!this.matchWord(w)) syntax('Expected "' + w + '" but found "' + (this.cur().value || 'end of input') + '" at line ' + this.cur().line);
    return w;
  };
  Parser.prototype.skipNL = function () { while (this.cur().type === 'newline') this.i++; };
  Parser.prototype.consumeEnd = function () {
    while (this.cur().type === 'newline') this.i++;
    if (this.at(';')) this.i++;
    while (this.cur().type === 'newline') this.i++;
  };

  Parser.prototype.parseProgram = function () {
    var out = [];
    if (this.lang === 'py') {
      this.skipNL();
      while (this.cur().type !== 'eof') {
        if (this.cur().type === 'dedent') { this.i++; continue; }
        var part = this.pyStatement();
        out = out.concat(part);
        this.skipNL();
      }
      if (out.length && out[out.length - 1].type === 'expr') out[out.length - 1].echo = true;
    } else {
      this.skipNL();
      while (this.cur().type !== 'eof') {
        out.push(this.jsStatement());
        this.skipNL();
      }
    }
    return out;
  };

  Parser.prototype.expr = function () { return this.lang === 'py' ? this.pyExpression() : this.jsExpr(); };

  /* ------------------------------------------------------- JS expressions */
  Parser.prototype.jsExpr = function () { return this.jsAssign(); };
  Parser.prototype.jsAssign = function () {
    var left = this.jsConditional();
    var op = this.match('=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=', '>>>=', '&&=', '||=', '??=');
    if (op) return { t: 'assign', target: left, op: op === '=' ? 'set' : op.slice(0, -1), value: this.jsAssign() };
    return left;
  };
  Parser.prototype.jsConditional = function () {
    var test = this.jsNullish();
    if (this.match('?')) {
      var cons = this.jsAssign();
      this.expect(':');
      return { t: 'cond', test: test, cons: cons, alt: this.jsConditional() };
    }
    return test;
  };
  Parser.prototype.jsNullish = function () {
    var left = this.jsOr();
    while (this.match('??')) left = { t: 'bin', op: '??', left: left, right: this.jsOr() };
    return left;
  };
  Parser.prototype.jsOr = function () {
    var left = this.jsAnd();
    while (this.match('||')) left = { t: 'bin', op: '||', left: left, right: this.jsAnd() };
    return left;
  };
  Parser.prototype.jsAnd = function () {
    var left = this.jsBitOr();
    while (this.match('&&')) left = { t: 'bin', op: '&&', left: left, right: this.jsBitOr() };
    return left;
  };
  Parser.prototype.jsBitOr = function () {
    var left = this.jsBitXor();
    while (this.at('|') && !this.at('||')) { this.i++; left = { t: 'bin', op: '|', left: left, right: this.jsBitXor() }; }
    return left;
  };
  Parser.prototype.jsBitXor = function () {
    var left = this.jsBitAnd();
    while (this.match('^')) left = { t: 'bin', op: '^', left: left, right: this.jsBitAnd() };
    return left;
  };
  Parser.prototype.jsBitAnd = function () {
    var left = this.jsEquality();
    while (this.at('&') && !this.at('&&')) { this.i++; left = { t: 'bin', op: '&', left: left, right: this.jsEquality() }; }
    return left;
  };
  Parser.prototype.jsEquality = function () {
    var left = this.jsRelational();
    while (this.at('==') || this.at('===') || this.at('!=') || this.at('!==')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.jsRelational() };
    }
    return left;
  };
  Parser.prototype.jsRelational = function () {
    var left = this.jsShift();
    while (this.at('<') || this.at('<=') || this.at('>') || this.at('>=') || this.atWord('instanceof') || this.atWord('in')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.jsShift() };
    }
    return left;
  };
  Parser.prototype.jsShift = function () {
    var left = this.jsAdd();
    while (this.at('<<') || this.at('>>') || this.at('>>>')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.jsAdd() };
    }
    return left;
  };
  Parser.prototype.jsAdd = function () {
    var left = this.jsMul();
    while (this.at('+') || this.at('-')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.jsMul() };
    }
    return left;
  };
  Parser.prototype.jsMul = function () {
    var left = this.jsPow();
    while (this.at('*') || this.at('/') || this.at('%')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.jsPow() };
    }
    return left;
  };
  Parser.prototype.jsPow = function () {
    var left = this.jsUnary();
    if (this.match('**')) return { t: 'bin', op: '**', left: left, right: this.jsPow() };
    return left;
  };
  Parser.prototype.jsUnary = function () {
    if (this.at('!') || this.at('~') || this.at('+') || this.at('-') || this.atWord('typeof') || this.atWord('void') || this.atWord('delete')) {
      var op = this.next().value;
      var arg = this.jsUnary();
      if (this.at('**')) syntax('Unary operator used immediately before exponentiation expression');
      return { t: 'un', op: op, arg: arg, post: false };
    }
    if (this.atWord('await')) { this.i++; return { t: 'un', op: 'await', arg: this.jsUnary(), post: false }; }
    if (this.at('++') || this.at('--')) {
      var preOp = this.next().value;
      return { t: 'pre', op: preOp, arg: this.jsUnary() };
    }
    return this.jsPostfix();
  };
  Parser.prototype.jsPostfix = function () { return this.postfix(function () { return this.jsPrimary(); }); };

  /* ----------------------------------------------------- Python expressions */
  Parser.prototype.pyExpression = function () {
    if (this.atWord('lambda')) {
      this.i++;
      var params = this.pyParams(true);
      this.expect(':');
      return { t: 'lambda', params: params, body: this.expr() };
    }
    return this.pyConditional();
  };
  Parser.prototype.pyConditional = function () {
    var body = this.pyOr();
    if (this.matchWord('if')) {
      var test = this.pyOr();
      this.expectWord('else');
      return { t: 'cond', test: test, cons: body, alt: this.pyExpression() };
    }
    return body;
  };
  Parser.prototype.pyOr = function () {
    var left = this.pyAnd();
    while (this.matchWord('or')) left = { t: 'bin', op: '||', left: left, right: this.pyAnd() };
    return left;
  };
  Parser.prototype.pyAnd = function () {
    var left = this.pyNot();
    while (this.matchWord('and')) left = { t: 'bin', op: '&&', left: left, right: this.pyNot() };
    return left;
  };
  Parser.prototype.pyNot = function () {
    if (this.matchWord('not')) return { t: 'un', op: '!', arg: this.pyNot(), post: false };
    return this.pyCompare();
  };
  Parser.prototype.pyCompare = function () {
    var parts = [this.pyBitOr()], ops = [];
    while (true) {
      var op = null;
      if (this.at('==') || this.at('!=') || this.at('<') || this.at('<=') || this.at('>') || this.at('>=')) op = this.next().value;
      else if (this.noIn) break;
      else if (this.matchWord('in')) op = 'in';
      else if (this.atWord('not') && this.t[this.i + 1] && this.t[this.i + 1].value === 'in') { this.i += 2; op = 'not in'; }
      else if (this.matchWord('is')) { op = this.matchWord('not') ? 'is not' : 'is'; }
      else break;
      ops.push(op);
      parts.push(this.pyBitOr());
    }
    return ops.length ? { t: 'compare', parts: parts, ops: ops } : parts[0];
  };
  Parser.prototype.pyBitOr = function () {
    var left = this.pyBitXor();
    while (this.at('|') && !this.at('||')) { this.i++; left = { t: 'bin', op: '|', left: left, right: this.pyBitXor() }; }
    return left;
  };
  Parser.prototype.pyBitXor = function () {
    var left = this.pyBitAnd();
    while (this.match('^')) left = { t: 'bin', op: '^', left: left, right: this.pyBitAnd() };
    return left;
  };
  Parser.prototype.pyBitAnd = function () {
    var left = this.pyShift();
    while (this.at('&') && !this.at('&&')) { this.i++; left = { t: 'bin', op: '&', left: left, right: this.pyShift() }; }
    return left;
  };
  Parser.prototype.pyShift = function () {
    var left = this.pyAdd();
    while (this.at('<<') || this.at('>>')) { var op = this.next().value; left = { t: 'bin', op: op, left: left, right: this.pyAdd() }; }
    return left;
  };
  Parser.prototype.pyAdd = function () {
    var left = this.pyMul();
    while (this.at('+') || this.at('-')) { var op = this.next().value; left = { t: 'bin', op: op, left: left, right: this.pyMul() }; }
    return left;
  };
  Parser.prototype.pyMul = function () {
    var left = this.pyUnary();
    while (this.at('*') || this.at('/') || this.at('//') || this.at('%') || this.at('@')) {
      var op = this.next().value;
      left = { t: 'bin', op: op, left: left, right: this.pyUnary() };
    }
    return left;
  };
  Parser.prototype.pyUnary = function () {
    if (this.at('-') || this.at('+') || this.at('~')) {
      var op = this.next().value;
      return { t: 'un', op: op, arg: this.pyUnary(), post: false };
    }
    return this.pyPower();
  };
  Parser.prototype.pyPower = function () {
    var left = this.pyPostfix();
    if (this.match('**')) return { t: 'bin', op: '**', left: left, right: this.pyUnary() };
    return left;
  };
  Parser.prototype.pyPostfix = function () { return this.postfix(function () { return this.pyPrimary(); }); };

  /* ------------------------------------------------------- shared postfix */
  Parser.prototype.parseArgs = function () {
    var args = [];
    if (!this.at(')')) {
      do {
        if (this.match('...')) args.push({ t: 'spread', value: this.expr() });
        else if (this.lang === 'py' && this.match('**')) args.push({ t: 'spreadBoth', value: this.expr() });
        else if (this.lang === 'py' && this.match('*')) args.push({ t: 'spread', value: this.expr() });
        else {
          var e = this.lang === 'py' ? this.pyExprArg() : this.expr();
          if (this.lang === 'py' && e.t === 'id' && this.match('=')) args.push({ name: e.name, value: this.pyExprArg() });
          else args.push({ value: e });
        }
      } while (this.match(','));
    }
    this.expect(')');
    return args;
  };
  Parser.prototype.postfix = function (base) {
    var node = base.call(this), chain = false;
    function readIndex(parser) {
      var isSlice = parser.match(':');
      var first = isSlice ? null : parser.expr();
      var second = null, third = null;
      if (isSlice || parser.match(':')) {
        if (!parser.at(':') && !parser.at(']')) second = parser.expr();
        if (parser.match(':')) { if (!parser.at(']')) third = parser.expr(); }
      }
      parser.expect(']');
      return { first: first, slice: isSlice ? { start: first, stop: second, step: third } : null };
    }
    while (true) {
      if (this.match('(')) { node = { t: 'call', callee: node, args: this.parseArgs(), optional: chain }; continue; }
      if (this.match('[')) {
        var indexInfo = readIndex(this);
        node = { t: 'index', obj: node, index: indexInfo.first, slice: indexInfo.slice, optional: chain };
        continue;
      }
      if (this.match('?.')) {
        chain = true;
        if (this.match('(')) { node = { t: 'call', callee: node, args: this.parseArgs(), optional: true }; continue; }
        if (this.match('[')) {
          var optIndex = readIndex(this);
          node = { t: 'index', obj: node, index: optIndex.first, slice: optIndex.slice, optional: true };
          continue;
        }
        var optProp = this.next();
        node = { t: 'member', obj: node, prop: String(optProp.value), optional: true };
        continue;
      }
      if (this.match('.')) {
        var propTok = this.next();
        node = { t: 'member', obj: node, prop: String(propTok.value), optional: chain };
        continue;
      }
      if (this.lang === 'js' && (this.at('++') || this.at('--'))) {
        var op = this.next().value;
        node = { t: 'post', op: op, arg: node };
        continue;
      }
      break;
    }
    return node;
  };

  /* ------------------------------------------------------ shared primaries */
  Parser.prototype.parseTarget = function () { return this.lang === 'py' ? this.pyTarget() : this.expr(); };
  Parser.prototype.jsPattern = function () {
    if (this.at('{')) {
      this.i++;
      var props = [];
      while (!this.at('}') && this.cur().type !== 'eof') {
        if (this.match(',')) continue;
        if (this.match('...')) {
          props.push({ rest: this.next().value });
          if (!this.match(',')) break;
          continue;
        }
        var tok = this.next();
        var key = String(tok.value);
        var value, def = null;
        if (this.match(':')) {
          value = this.jsPattern();
          if (value.t === 'id' && this.match('=')) def = this.expr();
        } else {
          value = { t: 'id', name: key };
          if (this.match('=')) def = this.expr();
        }
        if (value.t === 'id' && def) value.def = def;
        props.push({ key: { t: 'lit', v: key }, value: value, def: def });
        if (!this.match(',')) break;
      }
      this.expect('}');
      return { t: 'object', props: props };
    }
    if (this.at('[')) {
      this.i++;
      var items = [];
      while (!this.at(']') && this.cur().type !== 'eof') {
        if (this.match(',')) { items.push(null); continue; }
        if (this.match('...')) {
          items.push({ t: 'id', name: this.next().value, rest: true });
          if (!this.match(',')) break;
          continue;
        }
        var item = this.jsPattern();
        var itemDef = this.match('=') ? this.expr() : null;
        if (itemDef && item.t === 'id') item.def = itemDef;
        items.push(item);
        if (!this.match(',')) break;
      }
      this.expect(']');
      return { t: 'array', items: items, tuple: false };
    }
    if (this.cur().type === 'id') return { t: 'id', name: this.next().value };
    return this.expr();
  };
  Parser.prototype.pyTarget = function () {
    var first = this.pyPostfix();
    if (!this.at(',')) return first;
    var items = [first];
    while (this.match(',')) {
      if (this.cur().type === 'newline' || this.cur().type === 'eof' || this.at(')') || this.at(']') || this.at(':') || this.atWord('in')) break;
      items.push(this.pyPostfix());
    }
    return { t: 'array', items: items, tuple: true };
  };
  Parser.prototype.pyParams = function (allowDefaults, allowAnnotations) {
    var params = [];
    if (this.at(')') || (allowDefaults && this.at(':'))) return params;
    do {
      if (this.match('**')) { params.push({ name: this.next().value, rest: 'both' }); continue; }
      if (this.match('*')) {
        if (this.at(',') || this.at(')')) { params.push({ name: '', rest: 'keyword' }); continue; }
        params.push({ name: this.next().value, rest: 'many' });
        continue;
      }
      var name = this.next().value;
      if (allowAnnotations && this.match(':')) this.expr();
      var def = (allowDefaults && this.match('=')) ? this.expr() : null;
      params.push({ name: name, def: def });
    } while (this.match(','));
    return params;
  };
  Parser.prototype.jsParam = function () {
    if (this.match('...')) return { name: this.next().value, rest: true };
    if (this.at('[') || this.at('{')) {
      var pattern = this.jsPattern();
      return { pattern: pattern, name: '', def: this.match('=') ? this.expr() : null };
    }
    var name = this.next().value;
    var def = this.match('=') ? this.expr() : null;
    return { name: name, def: def };
  };
  Parser.prototype.jsParams = function () {
    var params = [];
    this.expect('(');
    if (!this.at(')')) do { params.push(this.jsParam()); } while (this.match(','));
    this.expect(')');
    return params;
  };
  Parser.prototype.jsBody = function () {
    if (this.at('{')) return this.jsBlock();
    return [this.jsReturnExpr(this.expr())];
  };
  Parser.prototype.jsReturnExpr = function (e) { return { type: 'return', value: e }; };
  Parser.prototype.pyExprArg = function () {
    var e = this.expr();
    return (this.lang === 'py' && this.atWord('for')) ? this.parseComprehension('generator', e, null) : e;
  };
  Parser.prototype.parseComprehension = function (kind, first, second) {
    var clauses = [];
    while (this.matchWord('for')) {
      this.noIn = true;
      var target = this.parseTarget();
      this.noIn = false;
      this.expectWord('in');
      var iterable = this.lang === 'py' ? this.pyOr() : this.expr();
      var filters = [];
      while (this.matchWord('if')) filters.push(this.lang === 'py' ? this.pyOr() : this.expr());
      clauses.push({ target: target, iterable: iterable, filters: filters });
    }
    return { t: 'comp', kind: kind, first: first, second: second, clauses: clauses };
  };
  Parser.prototype.primary = function () {
    var tok = this.cur();
    if (tok.type === 'num') { this.i++; return { t: 'lit', v: tok.value }; }
    if (tok.type === 'regexp') { this.i++; return { t: 'regexp', source: tok.value.source, flags: tok.value.flags }; }
    if (tok.type === 'str') {
      this.i++;
      if (tok.template) return { t: 'template', parts: tok.value.parts };
      return { t: 'lit', v: tok.value };
    }
    if (this.lang === 'py' && this.atWord('None')) { this.i++; return { t: 'lit', v: null }; }
    if (this.lang === 'py' && this.atWord('True')) { this.i++; return { t: 'lit', v: true }; }
    if (this.lang === 'py' && this.atWord('False')) { this.i++; return { t: 'lit', v: false }; }
    if (this.lang === 'js' && this.atWord('true')) { this.i++; return { t: 'lit', v: true }; }
    if (this.lang === 'js' && this.atWord('false')) { this.i++; return { t: 'lit', v: false }; }
    if (this.lang === 'js' && this.atWord('null')) { this.i++; return { t: 'lit', v: null }; }
    if (this.lang === 'js' && this.atWord('undefined')) { this.i++; return { t: 'lit', v: undefined }; }
    if (this.lang === 'js' && this.atWord('Infinity')) { this.i++; return { t: 'lit', v: Infinity }; }
    if (this.lang === 'js' && this.atWord('NaN')) { this.i++; return { t: 'lit', v: NaN }; }
    if (this.lang === 'js' && this.atWord('this')) { this.i++; return { t: 'this' }; }
    if (this.lang === 'js' && this.atWord('super')) { this.i++; return { t: 'super' }; }
    if (this.lang === 'py' && this.atWord('yield')) {
      this.i++;
      if (this.matchWord('from')) return { t: 'yieldFrom', value: this.expr() };
      return this.at(')') || this.at(']') || this.at('}') || this.cur().type === 'newline' || this.cur().type === 'eof'
        ? { t: 'yield', value: { t: 'lit', v: null } } : { t: 'yield', value: this.expr() };
    }
    if (this.lang === 'js' && this.atWord('yield')) { this.i++; return { t: 'yield', value: this.at(';') ? { t: 'lit', v: undefined } : this.expr() }; }
    if (this.atWord('function') && this.lang === 'js') {
      this.i++;
      var generator = this.match('*');
      var name = this.cur().type === 'id' ? this.next().value : '';
      var params = this.jsParams();
      return { t: 'funcExpr', name: name, params: params, body: this.jsBlock(), arrow: false, generator: generator };
    }
    if (this.lang === 'js' && this.atWord('new')) {
      this.i++;
      var callee = this.primary();
      while (this.match('.')) {
        var pn = this.next();
        callee = { t: 'member', obj: callee, prop: String(pn.value), optional: false };
      }
      return { t: 'new', callee: callee, args: this.at('(') ? (this.i++, this.parseArgs()) : [] };
    }
    if (this.at('(')) {
      var save = this.i;
      this.i++;
      if (this.lang === 'js') {
        var params2 = [], ok = true;
        if (!this.at(')')) {
          do {
            if (this.at('[') || this.at('{') || this.cur().type === 'id' || this.at('...')) params2.push(this.jsParam());
            else { ok = false; break; }
          } while (this.match(','));
        }
        if (ok && this.match(')') && this.match('=>')) return { t: 'funcExpr', name: '', params: params2, body: this.jsBody(), arrow: true, generator: false };
      }
      this.i = save;
      this.i++;
      var first = this.expr();
      if (this.at(',')) {
        var items = [first];
        while (this.match(',')) { if (this.at(')')) break; items.push(this.expr()); }
        this.expect(')');
        return { t: 'array', items: items, tuple: this.lang === 'py' };
      }
      if (this.lang === 'py' && this.atWord('for')) { var cg = this.parseComprehension('tuple', first, null); this.expect(')'); return cg; }
      this.expect(')');
      return first;
    }
    if (this.at('[')) {
      this.i++;
      if (this.at(']')) { this.i++; return { t: 'array', items: [], tuple: false }; }
      var item = (this.lang === 'js' && this.match('...')) ? { t: 'spread', value: this.expr() } : this.expr();
      if (this.lang === 'py' && this.atWord('for')) { var cl = this.parseComprehension('list', item, null); this.expect(']'); return cl; }
      var list = [item];
      while (this.match(',')) {
        if (this.at(']')) break;
        list.push((this.lang === 'js' && this.match('...')) ? { t: 'spread', value: this.expr() } : this.expr());
      }
      this.expect(']');
      return { t: 'array', items: list, tuple: false };
    }
    if (this.at('{')) {
      this.i++;
      if (this.at('}')) { this.i++; return this.lang === 'py' ? { t: 'dict', props: [] } : { t: 'object', props: [] }; }
      var key = (this.lang === 'js' && this.match('...')) ? { t: 'spread', value: this.expr() } : this.expr();
      if (this.lang === 'py' && this.match(':')) {
        var val = this.expr();
        if (this.atWord('for')) { var cd = this.parseComprehension('dict', key, val); this.expect('}'); return cd; }
        var props = [{ key: key, value: val }];
        while (this.match(',')) { if (this.at('}')) break; var k2 = this.expr(); this.expect(':'); props.push({ key: k2, value: this.expr() }); }
        this.expect('}');
        return { t: 'dict', props: props };
      }
      if (this.lang === 'js') {
        var jprops = [];
        function objKey(node, fallback) {
          if (node && node.t === 'id') return { t: 'lit', v: node.name };
          if (node && node.t === 'lit') return { t: 'lit', v: String(node.v) };
          return { t: 'lit', v: String(fallback || '') };
        }
        if (key && key.t === 'spread') jprops.push({ spread: true, value: key.value });
        else jprops.push({ key: objKey(key), value: this.match(':') ? this.expr() : key });
        while (this.match(',')) {
          if (this.at('}')) break;
          if (this.match('...')) { jprops.push({ spread: true, value: this.expr() }); continue; }
          var jk = this.next();
          jprops.push({ key: { t: 'lit', v: String(jk.value) }, value: this.match(':') ? this.expr() : { t: 'id', name: String(jk.value) } });
        }
        this.expect('}');
        return { t: 'object', props: jprops };
      }
      if (this.lang === 'py' && this.atWord('for')) { var cs = this.parseComprehension('set', key, null); this.expect('}'); return cs; }
      if (this.lang === 'py') {
        var setItems = [key];
        while (this.match(',')) { if (this.at('}')) break; setItems.push(this.expr()); }
        this.expect('}');
        return { t: 'set', items: setItems };
      }
      syntax('Invalid object literal at line ' + tok.line);
    }
    if (this.lang === 'js' && tok.type === 'id' && this.t[this.i + 1] && this.t[this.i + 1].value === '=>') {
      this.i += 2;
      return { t: 'funcExpr', name: '', params: [{ name: tok.value, def: null }], body: this.jsBody(), arrow: true, generator: false };
    }
    if (tok.type === 'id') { this.i++; return { t: 'id', name: tok.value }; }
    syntax('Unexpected token "' + (tok.value || 'end of input') + '" at line ' + tok.line);
  };
  Parser.prototype.pyPrimary = Parser.prototype.primary;
  Parser.prototype.jsPrimary = Parser.prototype.primary;
  /* ---------------------------------------------------- Python statements */
  Parser.prototype.pyBlock = function () {
    this.skipNL();
    this.expect('indent');
    var out = [];
    while (this.cur().type !== 'dedent' && this.cur().type !== 'eof') {
      this.skipNL();
      if (this.cur().type === 'dedent' || this.cur().type === 'eof') break;
      out = out.concat(this.pyStatement());
    }
    this.match('dedent');
    return out;
  };
  Parser.prototype.pySuite = function () {
    if (this.cur().type === 'indent') return this.pyBlock();
    this.skipNL();
    if (this.cur().type === 'indent') return this.pyBlock();
    var out = [this.pySimple()];
    while (this.match(';')) {
      if (this.cur().type === 'newline' || this.cur().type === 'eof') break;
      out.push(this.pySimple());
    }
    this.consumeEnd();
    this.skipNL();
    return out;
  };
  Parser.prototype.pyTuple = function () {
    var first = this.expr();
    if (!this.at(',')) return first;
    var items = [first];
    while (this.match(',')) {
      if (this.cur().type === 'newline' || this.cur().type === 'eof' || this.at(')') || this.at(']') || this.at(':') || this.atWord('in')) break;
      items.push(this.expr());
    }
    return { t: 'array', items: items, tuple: true };
  };
  Parser.prototype.pyStatement = function () {
    var decorators = [];
    while (this.at('@')) {
      this.i++;
      decorators.push(this.expr());
      this.consumeEnd();
    }
    if (this.atWord('if')) return [this.pyIf()];
    if (this.atWord('while')) return [this.pyWhile()];
    if (this.atWord('for')) return [this.pyFor()];
    if (this.atWord('def')) return [this.pyFunc(decorators)];
    if (this.atWord('class')) return [this.pyClass(decorators)];
    if (this.atWord('try')) return [this.pyTry()];
    if (this.atWord('with')) return [this.pyWith()];
    var out = [this.pySimple()];
    while (this.match(';')) {
      if (this.cur().type === 'newline' || this.cur().type === 'eof') break;
      out.push(this.pySimple());
    }
    this.consumeEnd();
    return out;
  };
  Parser.prototype.pySimple = function () {
    if (this.matchWord('pass')) return { type: 'pass' };
    if (this.matchWord('break')) return { type: 'break' };
    if (this.matchWord('continue')) return { type: 'continue' };
    if (this.matchWord('return')) return { type: 'return', value: this.at(';') || this.cur().type === 'newline' || this.cur().type === 'eof' || this.at(':') ? { t: 'lit', v: null } : this.pyTuple() };
    if (this.matchWord('raise')) {
      var value = this.cur().type === 'newline' || this.cur().type === 'eof' || this.at(';') ? { t: 'lit', v: null } : this.expr();
      if (this.matchWord('from')) this.expr();
      return { type: 'throw', value: value };
    }
    if (this.matchWord('assert')) {
      var test = this.expr(), msg = this.match(',') ? this.expr() : { t: 'lit', v: '' };
      return { type: 'assert', test: test, message: msg };
    }
    if (this.matchWord('del')) {
      var targets = [this.expr()];
      while (this.match(',')) targets.push(this.expr());
      return { type: 'del', targets: targets };
    }
    if (this.atWord('global') || this.atWord('nonlocal')) {
      var kind = this.next().value, names = [this.next().value];
      while (this.match(',')) names.push(this.next().value);
      return { type: 'scope', kind: kind, names: names };
    }
    if (this.atWord('import')) {
      this.i++;
      var names2 = [];
      do {
        var full = this.next().value, alias = this.matchWord('as') ? this.next().value : full;
        names2.push({ name: full, alias: alias });
      } while (this.match(','));
      return { type: 'import', names: names2, module: null };
    }
    if (this.atWord('from')) {
      this.i++;
      var mod = '';
      while (this.cur().type !== 'eof' && !this.atWord('import') && this.cur().type !== 'newline') mod += this.next().value;
      this.expectWord('import');
      var imports = [];
      if (this.match('*')) imports.push({ name: '*', alias: '*' });
      else do {
        var nm = this.next().value;
        var al = this.matchWord('as') ? this.next().value : nm;
        imports.push({ name: nm, alias: al });
      } while (this.match(','));
      return { type: 'import', names: imports, module: mod };
    }
    var lhs = this.pyTuple();
    var op = this.match('=', '+=', '-=', '*=', '/=', '//=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=');
    if (op) return { type: 'assign', target: lhs, op: op === '=' ? 'set' : op.slice(0, -1), value: this.pyTuple() };
    return { type: 'expr', expr: lhs, echo: false };
  };
  Parser.prototype.pyIf = function () {
    this.expectWord('if');
    var test = this.expr();
    this.expect(':');
    var branches = [{ test: test, body: this.pySuite() }], otherwise = [];
    while (this.atWord('elif')) {
      this.i++;
      var t = this.expr();
      this.expect(':');
      branches.push({ test: t, body: this.pySuite() });
    }
    if (this.matchWord('else')) { this.expect(':'); otherwise = this.pySuite(); }
    return { type: 'if', branches: branches, otherwise: otherwise };
  };
  Parser.prototype.pyWhile = function () {
    this.expectWord('while');
    var test = this.expr();
    this.expect(':');
    var body = this.pySuite(), otherwise = [];
    if (this.matchWord('else')) { this.expect(':'); otherwise = this.pySuite(); }
    return { type: 'while', test: test, body: body, otherwise: otherwise };
  };
  Parser.prototype.pyFor = function () {
    this.expectWord('for');
    this.noIn = true;
    var target = this.pyTarget();
    this.noIn = false;
    this.expectWord('in');
    var iterable = this.pyTuple();
    this.expect(':');
    var body = this.pySuite(), otherwise = [];
    if (this.matchWord('else')) { this.expect(':'); otherwise = this.pySuite(); }
    return { type: 'for', target: target, iterable: iterable, body: body, otherwise: otherwise };
  };
  Parser.prototype.pyFunc = function (decorators) {
    this.expectWord('def');
    var name = this.next().value;
    this.expect('(');
    var params = this.pyParams(true, true);
    this.expect(')');
    if (this.match('->')) this.expr();
    this.expect(':');
    var body = this.pySuite();
    return { type: 'func', name: name, params: params, body: body, generator: containsYield(body), decorators: decorators || [], async: false };
  };
  Parser.prototype.pyClass = function (decorators) {
    this.expectWord('class');
    var name = this.next().value, bases = [];
    if (this.match('(')) {
      if (!this.at(')')) do { bases.push(this.expr()); } while (this.match(','));
      this.expect(')');
    }
    this.expect(':');
    return { type: 'class', name: name, bases: bases, body: this.pySuite(), decorators: decorators || [] };
  };
  Parser.prototype.pyTry = function () {
    this.expectWord('try');
    this.expect(':');
    var body = this.pySuite(), handlers = [], otherwise = [], final = [];
    while (this.matchWord('except')) {
      var test = null, alias = null;
      if (!this.at(':')) {
        test = this.expr();
        if (this.matchWord('as')) alias = this.next().value;
      }
      this.expect(':');
      handlers.push({ test: test, alias: alias, body: this.pySuite() });
    }
    if (this.matchWord('else')) { this.expect(':'); otherwise = this.pySuite(); }
    if (this.matchWord('finally')) { this.expect(':'); final = this.pySuite(); }
    return { type: 'try', body: body, handlers: handlers, otherwise: otherwise, final: final };
  };
  Parser.prototype.pyWith = function () {
    this.expectWord('with');
    var items = [];
    do {
      var value = this.expr();
      var alias = this.matchWord('as') ? this.parseTarget() : null;
      items.push({ value: value, alias: alias });
    } while (this.match(','));
    this.expect(':');
    return { type: 'with', items: items, body: this.pySuite() };
  };

  /* ---------------------------------------------------- JavaScript statements */
  Parser.prototype.jsBlock = function () {
    this.expect('{');
    var out = [];
    while (!this.at('}') && this.cur().type !== 'eof') {
      this.skipNL();
      if (this.at('}')) break;
      out.push(this.jsStatement());
      this.skipNL();
    }
    this.expect('}');
    return out;
  };
  Parser.prototype.jsDecl = function (kind) {
    var decls = [];
    do {
      var target = (this.at('[') || this.at('{')) ? this.jsPattern() : { t: 'id', name: this.next().value };
      decls.push({ target: target, value: this.match('=') ? this.expr() : { t: 'lit', v: undefined } });
    } while (this.match(','));
    return { type: 'var', kind: kind, decls: decls };
  };
  Parser.prototype.jsStatement = function () {
    if (this.at('{')) return { type: 'block', body: this.jsBlock() };
    if (this.match(';')) return { type: 'pass' };
    if (this.atWord('var') || this.atWord('let') || this.atWord('const')) {
      var kind = this.next().value;
      var decl = this.jsDecl(kind);
      this.consumeEnd();
      return decl;
    }
    if (this.atWord('function')) {
      this.i++;
      var gen = this.match('*');
      var fname = this.cur().type === 'id' ? this.next().value : '';
      var fparams = this.jsParams();
      return { type: 'func', name: fname, params: fparams, body: this.jsBlock(), generator: gen, decorators: [] };
    }
    if (this.atWord('class')) return this.jsClass();
    if (this.atWord('if')) {
      this.i++;
      this.expect('(');
      var test = this.expr();
      this.expect(')');
      var body = this.jsStatement(), otherwise = [];
      if (this.matchWord('else')) otherwise = [this.jsStatement()];
      return { type: 'if', branches: [{ test: test, body: [body] }], otherwise: otherwise };
    }
    if (this.atWord('while')) {
      this.i++; this.expect('(');
      var wt = this.expr(); this.expect(')');
      return { type: 'while', test: wt, body: [this.jsStatement()], otherwise: [] };
    }
    if (this.atWord('do')) {
      this.i++;
      var db = this.jsStatement();
      this.expectWord('while'); this.expect('(');
      var dc = this.expr(); this.expect(')'); this.consumeEnd();
      return { type: 'doWhile', test: dc, body: [db] };
    }
    if (this.atWord('for')) return this.jsFor();
    if (this.atWord('switch')) return this.jsSwitch();
    if (this.atWord('try')) {
      this.i++;
      var tb = this.jsBlock(), handlers = [], fin = [];
      if (this.matchWord('catch')) {
        var param = null;
        if (this.match('(')) { param = this.next().value; this.expect(')'); }
        handlers.push({ test: null, alias: param, body: this.jsBlock() });
      }
      if (this.matchWord('finally')) fin = this.jsBlock();
      return { type: 'try', body: tb, handlers: handlers, otherwise: [], final: fin };
    }
    if (this.matchWord('throw')) { var thrown = this.expr(); this.consumeEnd(); return { type: 'throw', value: thrown }; }
    if (this.matchWord('return')) {
      var rv = this.at(';') || this.cur().type === 'newline' || this.cur().type === 'eof' || this.at('}') ? { t: 'lit', v: undefined } : this.expr();
      this.consumeEnd();
      return { type: 'return', value: rv };
    }
    if (this.matchWord('break')) { this.consumeEnd(); return { type: 'break' }; }
    if (this.matchWord('continue')) { this.consumeEnd(); return { type: 'continue' }; }
    if (this.matchWord('debugger')) { this.consumeEnd(); return { type: 'pass' }; }
    var e = this.expr();
    this.consumeEnd();
    return { type: 'expr', expr: e, echo: this.cur().type === 'eof' || this.cur().type === 'newline' };
  };
  Parser.prototype.jsFor = function () {
    this.expectWord('for');
    this.expect('(');
    var init = null;
    if (this.atWord('var') || this.atWord('let') || this.atWord('const')) init = this.jsDecl(this.next().value);
    else if (!this.at(';')) init = { type: 'expr', expr: this.expr(), echo: false };
    if (this.atWord('of') || this.atWord('in')) {
      var kind = this.next().value;
      var target = init && init.type === 'var' ? init.decls[0].target : (init && init.expr);
      var iterable = this.expr();
      this.expect(')');
      return { type: kind === 'of' ? 'forOf' : 'forIn', target: target, iterable: iterable, declKind: init && init.type === 'var' ? init.kind : null, body: [this.jsStatement()] };
    }
    this.expect(';');
    var test = this.at(';') ? { t: 'lit', v: true } : this.expr();
    this.expect(';');
    var update = this.at(')') ? null : this.expr();
    this.expect(')');
    return { type: 'forJS', init: init, test: test, update: update, body: [this.jsStatement()] };
  };
  Parser.prototype.jsSwitch = function () {
    this.expectWord('switch'); this.expect('(');
    var disc = this.expr(); this.expect(')'); this.expect('{');
    var cases = [];
    while (!this.at('}') && this.cur().type !== 'eof') {
      this.skipNL();
      if (this.at('}')) break;
      var test = this.matchWord('case') ? this.expr() : (this.expectWord('default'), null);
      this.expect(':');
      var body = [];
      while (!this.at('case') && !this.atWord('default') && !this.at('}') && this.cur().type !== 'eof') {
        this.skipNL();
        if (this.at('case') || this.atWord('default') || this.at('}')) break;
        body.push(this.jsStatement());
        this.skipNL();
      }
      cases.push({ test: test, body: body });
    }
    this.expect('}');
    return { type: 'switch', discriminant: disc, cases: cases };
  };
  Parser.prototype.jsClass = function () {
    this.expectWord('class');
    var name = this.cur().type === 'id' ? this.next().value : '';
    var base = this.matchWord('extends') ? this.expr() : null;
    this.expect('{');
    var methods = [];
    while (!this.at('}') && this.cur().type !== 'eof') {
      this.skipNL();
      if (this.at('}')) break;
      var isStatic = this.matchWord('static') ? true : false;
      var kind = 'method';
      if (this.atWord('get') && this.t[this.i + 1] && this.t[this.i + 1].type === 'id') { this.i++; kind = 'get'; }
      else if (this.atWord('set') && this.t[this.i + 1] && this.t[this.i + 1].type === 'id') { this.i++; kind = 'set'; }
      var mname = this.next().value;
      var params = this.jsParams();
      methods.push({ name: mname, params: params, body: this.jsBlock(), static: isStatic, kind: kind });
      this.skipNL();
    }
    this.expect('}');
    return { type: 'class', name: name, bases: base ? [base] : [], methods: methods, decorators: [] };
  };
  /* ------------------------------------------------------------- runtime */
  function parseExpr(source, lang) {
    var parser = new Parser(tokenize(String(source), lang), lang);
    parser.skipNL();
    var node = parser.expr();
    parser.skipNL();
    if (parser.cur().type !== 'eof') syntax('Unexpected token "' + (parser.cur().value || 'end of input') + '"');
    return node;
  }
  function splitFormatSpec(text, lang) {
    if (lang !== 'py') return { expr: text, spec: '' };
    var depth = 0, quote = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (depth === 0 && (ch === '!' || ch === ':')) return { expr: text.slice(0, i), spec: ch === ':' ? text.slice(i + 1) : text.slice(i) };
    }
    return { expr: text, spec: '' };
  }
  function formatInterpolation(value, spec, lang) {
    spec = String(spec || '');
    var conv = '';
    var convMatch = spec.match(/^!([rsa])/);
    if (convMatch) { conv = convMatch[1]; spec = spec.slice(2); }
    var text = conv === 'r' ? display(value, lang, true) : display(value, lang);
    if (!spec) return text;
    var number = isNum(value) ? Number(value) : null, match;
    if (spec[0] === '.') {
      match = spec.match(/^\.(\d+)([fFeE%]?)$/);
      if (match && number !== null) {
        var precision = int(match[1]), kind = match[2] || 'f';
        if (kind === '%') return (number * 100).toFixed(precision) + '%';
        if (kind === 'e' || kind === 'E') return number.toExponential(precision);
        return number.toFixed(precision);
      }
      return text;
    }
    match = spec.match(/^([-+ ]?)(#?)(0?)(\d*)(,?)([bcdeEfFgGnosxX%]?)$/);
    if (match && number !== null) {
      var sign = match[1], alt = match[2] === '#', width = int(match[4]);
      var zero = match[3] === '0', grouped = match[5] === ',', type = match[6];
      var body, n = int(number), negative = n < 0;
      if (type === '%') body = (number * 100).toFixed(width ? 0 : 6) + '%';
      else if (type === 'b' || type === 'o' || type === 'x' || type === 'X') {
        var base = type === 'b' ? 2 : type === 'o' ? 8 : 16;
        var digits = Math.abs(n).toString(base);
        if (type === 'X') digits = digits.toUpperCase();
        var prefix = alt ? (type === 'b' ? '0b' : type === 'o' ? '0o' : type === 'x' ? '0x' : '0X') : '';
        body = (negative ? '-' : '') + prefix + digits;
      }
      else if (type === 'e' || type === 'E') body = number.toExponential(6);
      else if (type === 'f' || type === 'F' || type === 'g' || type === 'G') body = number.toFixed(6);
      else body = grouped ? Math.round(number).toLocaleString('en-US') : String(Math.round(number));
      if (!negative) {
        if (sign === '+') body = '+' + body;
        else if (sign === ' ') body = ' ' + body;
      }
      if (sign === '-') return body;
      if (body.length < width) {
        var padLength = width - body.length;
        if (zero) {
          var lead = /^[+\- ]/.test(body) ? body[0] : '';
          var rest = lead ? body.slice(1) : body;
          var basePrefix = /^(0[bBoOxX])/.exec(rest);
          if (basePrefix) rest = basePrefix[0] + padWith('0', padLength) + rest.slice(basePrefix[0].length);
          else rest = padWith('0', padLength) + rest;
          body = lead + rest;
        } else body = padWith(' ', padLength) + body;
      }
      return body;
    }
    match = spec.match(/^([<>=^])(\d+)$/);
    if (match) {
      var size = int(match[2]);
      if (text.length >= size) return text;
      var left = size - text.length, align = match[1];
      if (align === '<') return text + ' '.repeat(left);
      if (align === '>') return ' '.repeat(left) + text;
      var half = Math.floor(left / 2);
      return ' '.repeat(half) + text + ' '.repeat(left - half);
    }
    return text;
  }
  function newEnv(parent, lang) {
    var e = { v: Object.create(null), scopes: Object.create(null), consts: Object.create(null), parent: parent || null, lang: lang || (parent && parent.lang) || null };
    if (parent) { e.this = parent.this; e.builtins = parent.builtins; e.super = parent.super; e.globals = parent.globals || parent; }
    else e.globals = e;
    return e;
  }
  function findEnv(env, name) {
    var e = env;
    while (e) {
      if (has(e.v, name)) return e;
      e = e.parent;
    }
    return null;
  }
  function getVar(env, name) {
    var e = env;
    while (e) {
      if (has(e.v, name)) return e.v[name];
      if (e.builtins && has(e.builtins, name)) return e.builtins[name];
      e = e.parent;
    }
    if (name === 'undefined') return undefined;
    fail(env.lang === 'py' ? 'NameError' : 'ReferenceError', (env.lang === 'py' ? "name '" : '') + name + "' is not defined");
  }
  function setVar(env, name, value) {
    var e = findEnv(env, name) || env;
    if (e.consts && e.consts[name]) fail('TypeError', 'Assignment to constant variable.');
    e.v[name] = value;
    return value;
  }
  function declareVar(env, name, value, kind) {
    if (kind === 'const' && env.consts) env.consts[name] = true;
    env.v[name] = value;
    return value;
  }

  function containsYield(node) {
    if (!node || typeof node !== 'object') return false;
    if (node.t === 'yield' || node.t === 'yieldFrom') return true;
    if (node.t === 'funcExpr' || node.t === 'lambda' || node.type === 'func') return false;
    return Object.keys(node).some(function (k) {
      var child = node[k];
      return Array.isArray(child) ? child.some(containsYield) : containsYield(child);
    });
  }
  function makeFunction(o) {
    var fn = function () {};
    fn.__function = true;
    try { Object.defineProperty(fn, 'name', { value: o.name || '', configurable: true }); } catch (e) { /* keep inferred name */ }
    fn.params = o.params || [];
    fn.body = o.body || [];
    fn.env = o.env || null;
    fn.arrow = !!o.arrow;
    fn.generator = !!o.generator;
    fn.lang = o.lang || null;
    fn.decorators = o.decorators || [];
    fn.cls = o.cls || null;
    return fn;
  }
  function makeClass(name, bases, members, lang) {
    return { __class: true, name: name, bases: bases || [], members: members || {}, lang: lang };
  }
  function makeInstance(cls, lang) {
    return { __instance: true, cls: cls, fields: Object.create(null), lang: lang };
  }
  function classChain(cls) {
    var out = [], seen = [];
    function visit(c) {
      if (!c || seen.indexOf(c) > -1) return;
      seen.push(c); out.push(c);
      (c.bases || []).forEach(visit);
    }
    visit(cls);
    return out;
  }
  function makeDict(entries) {
    var d = { __dict: true, map: new Map() };
    (entries || []).forEach(function (e) { d.map.set(e.key, e.value); });
    return d;
  }
  function makeSet(items) {
    return { __set: true, items: new Set(items || []) };
  }
  function makeTuple(items) { return { __tuple: true, items: items || [] }; }
  function makeRange(start, stop, step) {
    if (step === 0) fail('ValueError', 'range() arg 3 must not be zero');
    var values = [];
    if (step > 0) for (var i = start; i < stop; i += step) values.push(i);
    else for (var j = start; j > stop; j += step) values.push(j);
    return { __range: true, start: start, stop: stop, step: step, iter: values };
  }
  function makeMap(entries) {
    var m = { __map: true, map: new Map() };
    (entries || []).forEach(function (e) { m.map.set(e[0], e[1]); });
    return m;
  }
  function makeJSSet(items) { return { __set: true, items: new Set(items || []) }; }
  function makeDate(value) { return { __date: true, value: value === undefined ? new Date() : new Date(value) }; }
  function makeRegExp(source, flags) { return { __regexp: true, source: String(source), flags: String(flags || '') }; }
  function makeIterator(values, lang, lazy) { return { __iter: true, values: values || [], index: 0, lang: lang, __lazy: lazy || null }; }
  function ensureIterator(it) {
    if (it && it.__iter && it.__lazy) {
      var lazy = it.__lazy;
      it.__lazy = null;
      lazy();
    }
    return it;
  }
  function makeFile(name, mode, lang) {
    return { __file: true, name: name, mode: mode || 'r', pos: 0, closed: false, lang: lang };
  }
  function makeModule(name, members) {
    var m = { __module: true, name: name };
    Object.keys(members || {}).forEach(function (k) { m[k] = members[k]; });
    return m;
  }
  function cloneValue(value, deep, seen) {
    seen = seen || new Map();
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
      var arr = [];
      seen.set(value, arr);
      value.forEach(function (v) { arr.push(deep ? cloneValue(v, true, seen) : v); });
      return arr;
    }
    if (value.__dict) {
      var dict = makeDict();
      seen.set(value, dict);
      value.map.forEach(function (v, k) { dict.map.set(k, deep ? cloneValue(v, true, seen) : v); });
      return dict;
    }
    if (value.__map) {
      var map = makeMap();
      seen.set(value, map);
      value.map.forEach(function (v, k) { map.map.set(k, deep ? cloneValue(v, true, seen) : v); });
      return map;
    }
    if (value.__set) {
      var set = makeSet();
      seen.set(value, set);
      value.items.forEach(function (v) { set.items.add(deep ? cloneValue(v, true, seen) : v); });
      return set;
    }
    if (value.__tuple) {
      var tuple = makeTuple([]);
      seen.set(value, tuple);
      tuple.items = value.items.map(function (v) { return deep ? cloneValue(v, true, seen) : v; });
      return tuple;
    }
    if (value.__instance) {
      var inst = makeInstance(value.cls, value.lang);
      seen.set(value, inst);
      Object.keys(value.fields).forEach(function (k) { inst.fields[k] = deep ? cloneValue(value.fields[k], true, seen) : value.fields[k]; });
      return inst;
    }
    if (value.__date) return makeDate(value.value.getTime());
    if (value.__regexp) return makeRegExp(value.source, value.flags);
    return value;
  }
  function toArrayLike(v, lang) {
    if (Array.isArray(v)) return v.slice();
    if (v && v.__tuple) return v.items.slice();
    if (v && v.__range) return v.iter.slice();
    if (v && v.__iter) { ensureIterator(v); return v.values.slice(v.index || 0); }
    if (v && v.__set) return Array.from(v.items);
    if (v && v.__dict) return Array.from(v.map.keys());
    if (v && v.__map) return lang === 'js' ? Array.from(v.map.entries()) : Array.from(v.map.keys());
    if (typeof v === 'string') return v.split('');
    if (v === null || v === undefined) return [];
    if (isObj(v)) {
      if (lang === 'js') return Object.keys(v);
      return Object.keys(v);
    }
    return [v];
  }
  function contains(container, item, lang) {
    if (typeof container === 'string') return container.indexOf(String(item)) > -1;
    if (Array.isArray(container)) return container.indexOf(item) > -1;
    if (container && container.__tuple) return container.items.indexOf(item) > -1;
    if (container && container.__set) return container.items.has(item);
    if (container && container.__dict) return container.map.has(item);
    if (container && container.__map) return container.map.has(item);
    if (container && container.__range) return container.iter.indexOf(item) > -1;
    if (isObj(container)) return has(container, String(item));
    return false;
  }
  function looseEq(a, b) { return a == b; } // eslint-disable-line eqeqeq
  function strictEq(a, b) {
    if (a === b) return true;
    if (a && a.__date && b && b.__date) return a.value.getTime() === b.value.getTime();
    return false;
  }
  function pyEq(a, b) {
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
    if (typeof a === 'boolean') return (a ? 1 : 0) === num(b);
    if (typeof b === 'boolean') return num(a) === (b ? 1 : 0);
    return strictEq(a, b);
  }
  function compareValues(a, b, op) {
    var x = (typeof a === 'string' && typeof b === 'string') ? a : num(a);
    var y = (typeof a === 'string' && typeof b === 'string') ? b : num(b);
    switch (op) {
      case '<': return x < y;
      case '<=': return x <= y;
      case '>': return x > y;
      case '>=': return x >= y;
      default: return false;
    }
  }
  function instanceOf(value, ctor) {
    if (!ctor) return false;
    if (Array.isArray(value)) return ctor.__builtinName === 'Array';
    if (value && value.__error) return ctor.__errorType ? value.name === ctor.__errorType || value.bases.indexOf(ctor.__errorType) > -1 : false;
    if (value && value.__date) return ctor.__builtinName === 'Date';
    if (value && value.__regexp) return ctor.__builtinName === 'RegExp';
    if (value && value.__map) return ctor.__builtinName === 'Map';
    if (value && value.__set) return ctor.__builtinName === 'Set';
    if (value && value.__instance && ctor.__class) return classChain(value.cls).indexOf(ctor) > -1;
    if (ctor.__builtinName) {
      var want = ctor.__builtinName;
      var got = typeName(value, ctor.__lang || 'js');
      if (got === want) return true;
      if (want === 'list') return Array.isArray(value);
      if (want === 'Array') return Array.isArray(value);
      if (want === 'tuple') return !!(value && value.__tuple);
      if (want === 'dict') return !!(value && value.__dict);
      if (want === 'set') return !!(value && value.__set);
      if (want === 'str') return typeof value === 'string';
      if (want === 'string') return typeof value === 'string';
      if (want === 'int' || want === 'float' || want === 'number') return typeof value === 'number';
      if (want === 'bool' || want === 'boolean') return typeof value === 'boolean';
      if (want === 'function') return !!(value && (value.__function || value.__native));
      return false;
    }
    if (ctor.__class && value && value.__class) return value === ctor;
    return false;
  }

  function applyDecorators(value, decorators, env, ctx) {
    if (!decorators || !decorators.length) return value;
    var values = decorators.map(function (d) { return evalExpr(d, env, ctx); });
    var result = value;
    for (var i = values.length - 1; i >= 0; i--) {
      var d = values[i];
      if (d && (d.__function || d.__native)) result = callValue(d, [result], {}, ctx, null, env);
    }
    return result;
  }

  function evalCallee(node, env, ctx) {
    if (node.t === 'member') {
      if (node.obj.t === 'super') {
        var base = env.super;
        var fn0 = base && (base.members ? base.members[node.prop] : getMember(base, node.prop, env.lang, ctx));
        return { fn: fn0, self: env.this };
      }
      var obj = evalExpr(node.obj, env, ctx);
      if ((obj === null || obj === undefined) && node.optional) return { fn: undefined, self: undefined, optional: true };
      return { fn: getMember(obj, node.prop, env.lang, ctx), self: obj };
    }
    if (node.t === 'id') return { fn: getVar(env, node.name), self: env.this };
    return { fn: evalExpr(node, env, ctx), self: env.this };
  }

  function callValue(fn, args, named, ctx, self, callerEnv) {
    if (fn === undefined || fn === null) fail(callerEnv && callerEnv.lang === 'py' ? 'TypeError' : 'TypeError', 'Value is not callable');
    if (fn.__native) {
      try { return fn(args, named || {}, ctx, self, callerEnv); }
      catch (e) {
        if (isThrow(e)) throw e;
        fail(callerEnv && callerEnv.lang === 'py' ? 'RuntimeError' : 'Error', (e && e.message) || String(e));
      }
    }
    if (fn.__class) return constructClass(fn, args, ctx);
    if (fn.__function) {
      var actualSelf = (self === undefined || self === null) ? fn.__boundThis : self;
      if (fn.__classmethod__ && fn.cls) actualSelf = fn.cls;
      var callArgs = args;
      if (fn.lang === 'py' && fn.cls && !fn.__static__ && actualSelf) callArgs = [actualSelf].concat(args);
      var local = newEnv(fn.env, fn.lang);
      var lexicalThis = fn.arrow ? (fn.env && fn.env.this) : actualSelf;
      local.this = lexicalThis;
      local.super = fn.cls && fn.cls.bases && fn.cls.bases[0] ? fn.cls.bases[0] : null;
      if (fn.generator) {
        var gen;
        gen = makeIterator([], fn.lang, function () {
          if (++ctx.depth > LIMITS.depth) { ctx.depth--; fail('RangeError', 'Maximum call depth exceeded'); }
          var previousYields = ctx.yields, buffer = [];
          ctx.yields = buffer;
          try {
            bindParams(fn, callArgs, named || {}, local, ctx);
            execList(fn.body, local, ctx);
            gen.values = buffer;
            return gen;
          } finally {
            ctx.yields = previousYields;
            ctx.depth--;
          }
        });
        return gen;
      }
      if (++ctx.depth > LIMITS.depth) { ctx.depth--; fail('RangeError', 'Maximum call depth exceeded'); }
      try {
        bindParams(fn, callArgs, named || {}, local, ctx);
        var r = execList(fn.body, local, ctx);
        return r && r.type === 'return' ? r.value : undefined;
      } finally {
        ctx.depth--;
      }
    }
    fail('TypeError', display(fn, callerEnv && callerEnv.lang) + ' is not callable');
  }
  function bindParams(fn, args, named, env, ctx) {
    var params = fn.params || [], argIndex = 0, keywordOnly = false;
    var lang = fn.lang || env.lang, usedNamed = Object.create(null), restBoth = null;
    named = named || {};
    for (var i = 0; i < params.length; i++) {
      var p = params[i];
      if (p.rest === 'many' || p.rest === true) {
        declareVar(env, p.name, args.slice(argIndex));
        argIndex = args.length;
        continue;
      }
      if (p.rest === 'both') { restBoth = p.name; continue; }
      if (p.rest === 'keyword') { keywordOnly = true; continue; }
      var value;
      if (p.name && has(named, p.name)) {
        value = named[p.name];
        usedNamed[p.name] = true;
        if (!keywordOnly && argIndex < args.length) fail('TypeError', "multiple values for argument '" + p.name + "'");
      } else if (!keywordOnly && argIndex < args.length) value = args[argIndex++];
      else if (p.def) value = evalExpr(p.def, lang === 'py' ? (fn.env || env) : env, ctx);
      else value = undefined;
      if (p.pattern) {
        if (value === undefined && p.def) value = evalExpr(p.def, lang === 'py' ? (fn.env || env) : env, ctx);
        assignTarget(env, p.pattern, value, ctx, true);
      } else declareVar(env, p.name, value);
    }
    if (restBoth) {
      var d = makeDict();
      Object.keys(named).forEach(function (k) { if (!usedNamed[k]) d.map.set(k, named[k]); });
      declareVar(env, restBoth, d);
    } else if (lang === 'py') {
      Object.keys(named).forEach(function (k) { if (!usedNamed[k]) fail('TypeError', "unexpected keyword argument '" + k + "'"); });
    }
    return env;
  }
  function constructClass(cls, args, ctx) {
    if (cls.__builtinName) {
      var ctor = cls.__ctor;
      if (ctor) return ctor(args, {}, ctx, null);
      return makeInstance(cls, cls.lang);
    }
    if (cls.__errorType) return langError(cls.__errorType, args.length ? display(args[0], cls.lang) : '');
    var inst = makeInstance(cls, cls.lang);
    var init = null;
    classChain(cls).some(function (c) { init = c.members && has(c.members, '__init__') ? c.members.__init__ : null; return !!init; });
    if (!init && cls.lang === 'js') classChain(cls).some(function (c) { init = c.members && has(c.members, 'constructor') ? c.members.constructor : null; return !!init; });
    if (init) callValue(init, args, {}, ctx, inst, null);
    return inst;
  }
  function assignTarget(env, target, value, ctx, declare, kind) {
    if (target.t === 'id') {
      if (value === undefined && target.def) value = evalExpr(target.def, env, ctx);
      var scopeKind = env.scopes && env.scopes[target.name];
      if (scopeKind === 'global' && env.globals) setVar(env.globals, target.name, value);
      else if (scopeKind === 'nonlocal') {
        var outerEnv = env.parent;
        while (outerEnv) {
          if (has(outerEnv.v, target.name)) { outerEnv.v[target.name] = value; return; }
          if (outerEnv === env.globals) break;
          outerEnv = outerEnv.parent;
        }
        declareVar(env.globals || env, target.name, value);
      }
      else if (declare || env.lang === 'py') declareVar(env, target.name, value, kind);
      else if (findEnv(env, target.name)) setVar(env, target.name, value);
      else declareVar(env, target.name, value, kind);
      return;
    }
    if (target.t === 'member') {
      var obj = evalExpr(target.obj, env, ctx);
      if (obj && obj.__instance) {
        var cls = obj.cls, desc;
        while (cls) {
          desc = cls.members && cls.members[target.prop];
          if (desc && desc.__property) {
            if (desc.fset) { callValue(desc.fset, [value], {}, ctx, obj, env); return; }
            fail('TypeError', 'Cannot set read-only property ' + target.prop);
          }
          cls = cls.bases && cls.bases[0];
        }
        obj.fields[target.prop] = value;
      } else if (isObj(obj)) obj[target.prop] = value;
      return;
    }
    if (target.t === 'index') {
      var base = evalExpr(target.obj, env, ctx);
      var key = evalExpr(target.index, env, ctx);
      setIndex(base, key, value, env.lang || 'js');
      return;
    }
    if (target.t === 'array') {
      var items = toArrayLike(value, env.lang);
      target.items.forEach(function (item, i) {
        if (!item) return;
        if (item.rest) { declareVar(env, item.name, items.slice(i)); return; }
        var itemValue = items[i];
        if (itemValue === undefined && item.def) itemValue = evalExpr(item.def, env, ctx);
        assignTarget(env, item, itemValue, ctx, declare, kind);
      });
      return;
    }
    if (target.t === 'object') {
      var restNames = [];
      target.props.forEach(function (p) {
        if (p.rest) { restNames.push(p.rest); return; }
        var key = p.key.v !== undefined ? p.key.v : p.key.name;
        var propValue = (value === null || value === undefined) ? undefined : getMember(value, key, env.lang, ctx);
        if (propValue === undefined && p.def) propValue = evalExpr(p.def, env, ctx);
        assignTarget(env, p.value, propValue, ctx, declare, kind);
      });
      restNames.forEach(function (name) {
        var rest = {};
        if (value && value.__dict) value.map.forEach(function (v, k) { rest[String(k)] = v; });
        else if (isObj(value)) Object.keys(value).forEach(function (k) {
          if (!target.props.some(function (p) { return !p.rest && (p.key.v !== undefined ? p.key.v : p.key.name) === k; })) rest[k] = value[k];
        });
        declareVar(env, name, rest);
      });
    }
  }
  function getIndex(obj, key, slice, env, ctx) {
    var lang = env.lang || 'js';
    if (slice) {
      var values = toArrayLike(obj, lang);
      var len = values.length;
      var step = slice.step ? num(evalExpr(slice.step, env, ctx)) : 1;
      var s = slice.start ? num(evalExpr(slice.start, env, ctx)) : (step < 0 ? len - 1 : 0);
      var e = slice.stop ? num(evalExpr(slice.stop, env, ctx)) : (step < 0 ? -1 : len);
      if (s < 0) s = Math.max(0, len + s);
      if (e < 0 && (step > 0 || slice.stop)) e = Math.max(0, len + e);
      if (step === 0) fail('ValueError', 'slice step cannot be zero');
      var out = [];
      if (step > 0) for (var i = s; i < e; i += step) out.push(values[i]);
      else for (var j = s; j > e && j >= 0; j += step) out.push(values[j]);
      if (obj && obj.__tuple) return makeTuple(out);
      if (lang === 'py' && typeof obj === 'string') return out.join('');
      return out;
    }
    var idx = evalExpr(key, env, ctx);
    if (obj && obj.__dict) {
      if (!obj.map.has(idx)) fail('KeyError', display(idx, lang));
      return obj.map.get(idx);
    }
    if (obj && obj.__map) return obj.map.get(idx);
    if (Array.isArray(obj) || (obj && obj.__tuple) || (obj && obj.__range) || typeof obj === 'string') {
      var values2 = Array.isArray(obj) ? obj : (obj.items || obj.iter || obj.split(''));
      var n = num(idx);
      if (!Number.isInteger(n)) fail(lang === 'py' ? 'TypeError' : 'TypeError', 'index must be an integer');
      if (lang === 'py' && n < 0) n = values2.length + n;
      if (n < 0 || n >= values2.length) fail(lang === 'py' ? 'IndexError' : 'RangeError', 'index out of range');
      return values2[n];
    }
    if (isObj(obj)) return obj[String(idx)];
    fail('TypeError', 'object is not subscriptable');
  }
  function setIndex(obj, key, value, lang) {
    if (obj && obj.__dict) { obj.map.set(key, value); return value; }
    if (obj && obj.__map) { obj.map.set(key, value); return value; }
    if (Array.isArray(obj)) {
      var n = num(key);
      if (lang === 'py' && n < 0) n = obj.length + n;
      obj[n] = value;
      return value;
    }
    if (isObj(obj)) { obj[String(key)] = value; return value; }
    fail('TypeError', 'object does not support item assignment');
  }
  function evalExpr(node, env, ctx) {
    ctx.steps++;
    if (ctx.steps > LIMITS.steps) fail('RuntimeError', 'Execution limit reached (possible infinite loop)');
    switch (node.t) {
      case 'lit': return node.v;
      case 'regexp': return makeRegExp(node.source, node.flags);
      case 'assign': {
        var target = node.target;
        var current = (node.op === 'set') ? undefined : evalExpr(target, env, ctx);
        var rhs = evalExpr(node.value, env, ctx);
        var assigned = (node.op === 'set') ? rhs
          : evalBinary({ t: 'bin', op: node.op, left: { t: 'lit', v: current }, right: { t: 'lit', v: rhs } }, env, ctx);
        assignTarget(env, target, assigned, ctx);
        return assigned;
      }
      case 'this': return env.this;
      case 'super': return env.super;
      case 'id': return getVar(env, node.name);
      case 'array': {
        var items = [];
        node.items.forEach(function (x) {
          if (x && x.t === 'spread') toArrayLike(evalExpr(x.value, env, ctx), env.lang).forEach(function (v) { items.push(v); });
          else items.push(evalExpr(x, env, ctx));
        });
        if (node.tuple) return makeTuple(items);
        return items;
      }
      case 'set': {
        var s = makeSet();
        node.items.forEach(function (x) { s.items.add(evalExpr(x, env, ctx)); });
        return s;
      }
      case 'dict': {
        var d = makeDict();
        node.props.forEach(function (p) { d.map.set(evalExpr(p.key, env, ctx), evalExpr(p.value, env, ctx)); });
        return d;
      }
      case 'object': {
        var o = {};
        node.props.forEach(function (p) {
          if (p.spread) {
            var src = evalExpr(p.value, env, ctx);
            if (src && src.__dict) src.map.forEach(function (v, k) { o[String(k)] = v; });
            else if (isObj(src)) Object.keys(src).forEach(function (k) { o[k] = src[k]; });
            return;
          }
          var k = p.key.t === 'id' ? p.key.name : String(p.key.v);
          o[k] = evalExpr(p.value, env, ctx);
        });
        return o;
      }
      case 'template': {
        var out = '';
        node.parts.forEach(function (p) {
          if (has(p, 'text')) { out += p.text; return; }
          var interpolation = splitFormatSpec(p.expr, env.lang);
          var value = evalExpr(parseExpr(interpolation.expr, env.lang), env, ctx);
          out += env.lang === 'py' ? formatInterpolation(value, interpolation.spec, env.lang) : display(value, env.lang);
        });
        return out;
      }
      case 'un': return evalUnary(node, env, ctx);
      case 'bin': return evalBinary(node, env, ctx);
      case 'compare': return evalCompare(node, env, ctx);
      case 'cond': return truthy(evalExpr(node.test, env, ctx)) ? evalExpr(node.cons, env, ctx) : evalExpr(node.alt, env, ctx);
      case 'member': {
        if (node.obj.t === 'super') {
          var base = env.super;
          var sup = base && (base.members && has(base.members, node.prop) ? base.members[node.prop] : getMember(base, node.prop, env.lang, ctx));
          if (sup && sup.__property) return sup.fget ? callValue(sup.fget, [], {}, ctx, env.this, env) : undefined;
          return sup && sup.__function ? bindMethod(sup, env.this) : sup;
        }
        var obj = evalExpr(node.obj, env, ctx);
        if ((obj === null || obj === undefined) && node.optional) return undefined;
        return getMember(obj, node.prop, env.lang, ctx);
      }
      case 'index': {
        var indexed = evalExpr(node.obj, env, ctx);
        if ((indexed === null || indexed === undefined) && node.optional) return undefined;
        return getIndex(indexed, node.index, node.slice, env, ctx);
      }
      case 'call': {
        var args = [], named = {};
        node.args.forEach(function (a) {
          if (a.t === 'spread') {
            var spread = evalExpr(a.value, env, ctx);
            toArrayLike(spread, env.lang).forEach(function (x) { args.push(x); });
          } else if (a.t === 'spreadBoth') {
            var spreadMap = evalExpr(a.value, env, ctx);
            if (spreadMap && spreadMap.__dict) spreadMap.map.forEach(function (v, k) { named[String(k)] = v; });
            else if (isObj(spreadMap)) Object.keys(spreadMap).forEach(function (k) { named[k] = spreadMap[k]; });
            else fail('TypeError', 'argument after ** must be a mapping');
          } else {
            var v = evalExpr(a.value, env, ctx);
            if (a.name) named[a.name] = v; else args.push(v);
          }
        });
        if (node.callee.t === 'super' && env.super && env.super.__class) {
          var superClass = env.super;
          var superCtor = superClass.members && (superClass.lang === 'js' ? superClass.members.constructor : superClass.members.__init__);
          if (superCtor) callValue(superCtor, args, named, ctx, env.this, env);
          return undefined;
        }
        var c = evalCallee(node.callee, env, ctx);
        if ((node.optional || c.optional) && c.fn === undefined) return undefined;
        return callValue(c.fn, args, named, ctx, c.self, env);
      }
      case 'new': {
        var ctor = evalExpr(node.callee, env, ctx);
        var nargs = [];
        node.args.forEach(function (a) {
          if (a.t === 'spread') toArrayLike(evalExpr(a.value, env, ctx), env.lang).forEach(function (x) { nargs.push(x); });
          else nargs.push(evalExpr(a.value, env, ctx));
        });
        return constructClass(ctor, nargs, ctx);
      }
      case 'funcExpr': {
        var fe = makeFunction({ name: node.name, params: node.params, body: node.body, env: env, arrow: node.arrow, generator: node.generator, lang: env.lang });
        return applyDecorators(fe, node.decorators || [], env, ctx);
      }
      case 'lambda': return makeFunction({ name: '<lambda>', params: node.params, body: [{ type: 'return', value: node.body }], env: env, arrow: true, lang: 'py' });
      case 'comp': return evalComprehension(node, env, ctx);
      case 'post': {
        var target = node.arg;
        var old = evalExpr(target, env, ctx);
        var nextv = num(old) + (node.op === '++' ? 1 : -1);
        assignTarget(env, target, nextv, ctx);
        return old;
      }
      case 'pre': {
        var preTarget = node.arg;
        var preOld = evalExpr(preTarget, env, ctx);
        var preNext = num(preOld) + (node.op === '++' ? 1 : -1);
        assignTarget(env, preTarget, preNext, ctx);
        return preNext;
      }
      case 'yield':
        if (!ctx.yields) ctx.yields = [];
        ctx.yields.push(evalExpr(node.value, env, ctx));
        return undefined;
      case 'yieldFrom':
        if (!ctx.yields) ctx.yields = [];
        toArrayLike(evalExpr(node.value, env, ctx), env.lang).forEach(function (v) { ctx.yields.push(v); });
        return undefined;
      case 'await': return evalExpr(node.arg, env, ctx);
      default: fail('RuntimeError', 'Unknown expression ' + node.t);
    }
  }
  function bindMethod(fn, self) {
    if (!fn || !fn.__function) return fn;
    var bound = makeFunction({ name: fn.name, params: fn.params, body: fn.body, env: fn.env, arrow: fn.arrow, generator: fn.generator, lang: fn.lang, cls: fn.cls });
    bound.__boundThis = self;
    return bound;
  }
  function evalUnary(node, env, ctx) {
    if (node.op === 'typeof') return env.lang === 'js' ? jsTypeOf(evalExpr(node.arg, env, ctx)) : typeName(evalExpr(node.arg, env, ctx), 'py');
    if (node.op === 'void') { evalExpr(node.arg, env, ctx); return undefined; }
    if (node.op === 'delete') {
      var a = node.arg;
      if (a.t === 'member') {
        var obj = evalExpr(a.obj, env, ctx);
        if (obj && obj.__instance) delete obj.fields[a.prop];
        else if (isObj(obj)) delete obj[a.prop];
        return true;
      }
      if (a.t === 'index') {
        var base = evalExpr(a.obj, env, ctx);
        var key = evalExpr(a.index, env, ctx);
        if (Array.isArray(base)) base.splice(num(key), 1);
        else if (base && base.map && typeof base.map.delete === 'function') base.map.delete(key);
        else if (isObj(base)) delete base[String(key)];
        return true;
      }
      evalExpr(a, env, ctx);
      return true;
    }
    var v = evalExpr(node.arg, env, ctx);
    switch (node.op) {
      case '!': return !bool(v);
      case '-': return -num(v);
      case '+': return num(v);
      case '~': return ~int(v);
      case 'await': return v;
      default: fail('TypeError', 'Unknown unary operator ' + node.op);
    }
  }
  function evalBinary(node, env, ctx) {
    var op = node.op;
    if (op === '&&') {
      var lv = evalExpr(node.left, env, ctx);
      return bool(lv) ? evalExpr(node.right, env, ctx) : lv;
    }
    if (op === '||') { var l = evalExpr(node.left, env, ctx); return bool(l) ? l : evalExpr(node.right, env, ctx); }
    if (op === '??') { var n = evalExpr(node.left, env, ctx); return (n === null || n === undefined) ? evalExpr(node.right, env, ctx) : n; }
    var a = evalExpr(node.left, env, ctx), b = evalExpr(node.right, env, ctx);
    switch (op) {
      case '+':
        if (a && a.__date && b && b.__timedelta) return makeDate(a.value.getTime() + b.ms);
        if (a && a.__timedelta && b && b.__date) return makeDate(b.value.getTime() + a.ms);
        if (a && a.__timedelta && b && b.__timedelta) return { __timedelta: true, days: a.days + b.days, seconds: a.seconds + b.seconds, ms: a.ms + b.ms };
        if (typeof a === 'string' || typeof b === 'string') return display(a, env.lang) + display(b, env.lang);
        if (Array.isArray(a) && env.lang === 'js') return a.concat(toArrayLike(b, env.lang));
        if (Array.isArray(a) && Array.isArray(b) && env.lang === 'py') return a.concat(b);
        if (a && a.__tuple && b && b.__tuple) return makeTuple(a.items.concat(b.items));
        return num(a) + num(b);
      case '-': return num(a) - num(b);
      case '*':
        if ((typeof a === 'string' && isNum(b)) || (isNum(a) && typeof b === 'string')) {
          var str = typeof a === 'string' ? a : b, count = Math.max(0, int(typeof a === 'string' ? b : a));
          return new Array(count + 1).join(str);
        }
        if (Array.isArray(a) && isNum(b)) { var out = []; for (var i = 0; i < Math.max(0, int(b)); i++) out = out.concat(a); return out; }
        return num(a) * num(b);
      case '/':
        if (env.lang === 'py' && num(b) === 0) fail('ZeroDivisionError', 'division by zero');
        return num(a) / num(b);
      case '//':
        if (env.lang === 'py' && num(b) === 0) fail('ZeroDivisionError', 'integer division or modulo by zero');
        return Math.floor(num(a) / num(b));
      case '%': {
        var x = num(a), y = num(b), r;
        if (env.lang === 'py' && y === 0) fail('ZeroDivisionError', 'integer modulo by zero');
        r = x % y;
        return (env.lang === 'py' && r && ((r < 0) !== (y < 0))) ? r + y : r;
      }
      case '**': return Math.pow(num(a), num(b));
      case '&': return int(a) & int(b);
      case '|': return int(a) | int(b);
      case '^': return int(a) ^ int(b);
      case '<<': return int(a) << int(b);
      case '>>': return int(a) >> int(b);
      case '>>>': return int(a) >>> int(b);
      case '@': return fail('TypeError', 'matrix multiplication is not supported');
      case '==': return env.lang === 'js' ? looseEq(a, b) : pyEq(a, b);
      case '===': return strictEq(a, b);
      case '!=': return env.lang === 'js' ? !looseEq(a, b) : !pyEq(a, b);
      case '!==': return !strictEq(a, b);
      case '<': case '<=': case '>': case '>=': return compareValues(a, b, op);
      case 'instanceof': return instanceOf(a, b);
      case 'in': return contains(b, a, env.lang);
      default: fail('TypeError', 'Unknown operator ' + op);
    }
  }
  function evalCompare(node, env, ctx) {
    var a = evalExpr(node.parts[0], env, ctx);
    for (var i = 0; i < node.ops.length; i++) {
      var op = node.ops[i], b = evalExpr(node.parts[i + 1], env, ctx), ok;
      switch (op) {
        case '==': ok = env.lang === 'js' ? looseEq(a, b) : pyEq(a, b); break;
        case '!=': ok = env.lang === 'js' ? !looseEq(a, b) : !pyEq(a, b); break;
        case '<': case '<=': case '>': case '>=': ok = compareValues(a, b, op); break;
        case 'in': ok = contains(b, a, env.lang); break;
        case 'not in': ok = !contains(b, a, env.lang); break;
        case 'is': ok = strictEq(a, b); break;
        case 'is not': ok = !strictEq(a, b); break;
        default: ok = false;
      }
      if (!ok) return false;
      a = b;
    }
    return true;
  }
  function evalComprehension(node, env, ctx) {
    var values = [];
    function walk(index, scope) {
      if (index >= node.clauses.length) {
        if (node.kind === 'dict') {
          var d = makeDict();
          d.map.set(evalExpr(node.first, scope, ctx), evalExpr(node.second, scope, ctx));
          values.push(d);
        } else values.push(evalExpr(node.first, scope, ctx));
        return;
      }
      var clause = node.clauses[index];
      var items = toArrayLike(evalExpr(clause.iterable, scope, ctx), scope.lang);
      items.forEach(function (item) {
        var child = newEnv(scope, scope.lang);
        assignTarget(child, clause.target, item, ctx);
        if (clause.filters.every(function (f) { return bool(evalExpr(f, child, ctx)); })) walk(index + 1, child);
      });
    }
    walk(0, env);
    if (node.kind === 'set') { var s = makeSet(); values.forEach(function (v) { s.items.add(v); }); return s; }
    if (node.kind === 'dict') { var d2 = makeDict(); values.forEach(function (x) { x.map.forEach(function (v, k) { d2.map.set(k, v); }); }); return d2; }
    if (node.kind === 'tuple') return makeTuple(values);
    if (node.kind === 'generator') return makeIterator(values, env.lang);
    return values;
  }
  /* ------------------------------------------------------------ execution */
  function execList(stmts, env, ctx) {
    if (env.lang === 'js' && stmts) {
      stmts.forEach(function (s) {
        if (s && s.type === 'func') declareVar(env, s.name, makeFunction({ name: s.name, params: s.params, body: s.body, env: env, generator: !!s.generator, lang: 'js' }));
      });
    }
    for (var i = 0; i < (stmts || []).length; i++) {
      var r = execStmt(stmts[i], env, ctx);
      if (r && r.type !== 'normal') return r;
    }
    return null;
  }
  function execBlock(stmts, env, ctx) {
    var scope = env.lang === 'js' ? newEnv(env, env.lang) : env;
    return execList(stmts, scope, ctx);
  }
  function completion(type, value, target) { return { type: type || 'normal', value: value, target: target }; }
  function execStmt(stmt, env, ctx) {
    ctx.steps++;
    if (ctx.steps > LIMITS.steps) fail('RuntimeError', 'Execution limit reached (possible infinite loop)');
    switch (stmt.type) {
      case 'pass': return null;
      case 'scope':
        stmt.names.forEach(function (name) {
          if (!env.scopes) env.scopes = Object.create(null);
          env.scopes[name] = stmt.kind;
        });
        return null;
      case 'expr': {
        var v = evalExpr(stmt.expr, env, ctx);
        if (stmt.echo && v !== undefined && v !== null) ctx.write(display(v, env.lang, true) + '\n');
        return null;
      }
      case 'assign': {
        var value;
        if (stmt.op === 'set') value = evalExpr(stmt.value, env, ctx);
        else {
          var current = evalExpr(stmt.target, env, ctx);
          var rhs = evalExpr(stmt.value, env, ctx);
          value = evalBinary({ t: 'bin', op: stmt.op, left: { t: 'lit', v: current }, right: { t: 'lit', v: rhs } }, env, ctx);
        }
        assignTarget(env, stmt.target, value, ctx);
        return null;
      }
      case 'var': {
        stmt.decls.forEach(function (d) {
          var value = evalExpr(d.value, env, ctx);
          assignTarget(env, d.target, value, ctx, true, stmt.kind);
        });
        return null;
      }
      case 'if': {
        for (var i = 0; i < stmt.branches.length; i++) {
          if (bool(evalExpr(stmt.branches[i].test, env, ctx))) return execBlock(stmt.branches[i].body, env, ctx);
        }
        if (stmt.otherwise && stmt.otherwise.length) return execBlock(stmt.otherwise, env, ctx);
        return null;
      }
      case 'while': {
        var guard = 0, broke = false;
        while (bool(evalExpr(stmt.test, env, ctx))) {
          if (++guard > LIMITS.loop) fail('RuntimeError', 'Loop limit reached');
          var r = execBlock(stmt.body, env, ctx);
          if (r && r.type === 'break') { broke = true; break; }
          if (r && r.type === 'return') return r;
        }
        if (!broke && stmt.otherwise && stmt.otherwise.length) return execBlock(stmt.otherwise, env, ctx);
        return null;
      }
      case 'doWhile': {
        var dg = 0;
        do {
          if (++dg > LIMITS.loop) fail('RuntimeError', 'Loop limit reached');
          var dr = execBlock(stmt.body, env, ctx);
          if (dr && dr.type === 'break') break;
          if (dr && dr.type === 'return') return dr;
        } while (bool(evalExpr(stmt.test, env, ctx)));
        return null;
      }
      case 'for': {
        var items = toArrayLike(evalExpr(stmt.iterable, env, ctx), env.lang);
        var fguard = 0, fbroke = false;
        items.forEach(function (item) {
          if (fguard++ > LIMITS.loop) fail('RuntimeError', 'Loop limit reached');
          var scope = env.lang === 'js' ? newEnv(env, env.lang) : env;
          assignTarget(scope, stmt.target, item, ctx);
          var r = execList(stmt.body, scope, ctx);
          if (r && r.type === 'break') { fbroke = true; return false; }
          if (r && r.type === 'return') { ctx._return = r; return false; }
        });
        if (ctx._return) { var rr = ctx._return; ctx._return = null; return rr; }
        if (!fbroke && stmt.otherwise && stmt.otherwise.length) return execBlock(stmt.otherwise, env, ctx);
        return null;
      }
      case 'forOf': case 'forIn': {
        var source = evalExpr(stmt.iterable, env, ctx);
        var values = stmt.type === 'forIn' ? Object.keys(source || {}) : toArrayLike(source, env.lang);
        var og = 0;
        for (var oi = 0; oi < values.length; oi++) {
          if (++og > LIMITS.loop) fail('RuntimeError', 'Loop limit reached');
          var oscope = newEnv(env, env.lang);
          assignTarget(oscope, stmt.target, values[oi], ctx, !!stmt.declKind, stmt.declKind);
          var or = execList(stmt.body, oscope, ctx);
          if (or && or.type === 'break') break;
          if (or && or.type === 'return') return or;
        }
        return null;
      }
      case 'forJS': {
        if (stmt.init) execStmt(stmt.init, env, ctx);
        var jg = 0;
        while (bool(evalExpr(stmt.test, env, ctx))) {
          if (++jg > LIMITS.loop) fail('RuntimeError', 'Loop limit reached');
          var jr = execBlock(stmt.body, env, ctx);
          if (jr && jr.type === 'break') break;
          if (jr && jr.type === 'return') return jr;
          if (stmt.update) evalExpr(stmt.update, env, ctx);
        }
        return null;
      }
      case 'switch': {
        var disc = evalExpr(stmt.discriminant, env, ctx);
        var start = -1, defaultIndex = -1;
        for (var ci = 0; ci < stmt.cases.length; ci++) {
          if (stmt.cases[ci].test === null) { if (defaultIndex < 0) defaultIndex = ci; continue; }
          if (strictEq(disc, evalExpr(stmt.cases[ci].test, env, ctx))) { start = ci; break; }
        }
        if (start < 0) start = defaultIndex;
        if (start < 0) return null;
        for (var s = start; s < stmt.cases.length; s++) {
          var r2 = execList(stmt.cases[s].body, env, ctx);
          if (r2 && r2.type === 'break') break;
          if (r2 && r2.type === 'return') return r2;
        }
        return null;
      }
      case 'try': {
        var pending = null, pendingError = null, hasError = false;
        try {
          pending = execBlock(stmt.body, env, ctx);
        } catch (e) {
          hasError = true;
          pendingError = e;
          if (isThrow(e)) {
            var error = e.value;
            for (var hi = 0; hi < stmt.handlers.length; hi++) {
              var h = stmt.handlers[hi];
              var expected = h.test ? evalExpr(h.test, env, ctx) : null;
              if (!h.test || errorMatches(error, expected, env.lang)) {
                var henv = newEnv(env, env.lang);
                if (h.alias) declareVar(henv, h.alias, error);
                pending = execList(h.body, henv, ctx);
                hasError = false;
                pendingError = null;
                break;
              }
            }
          }
        }
        if (!hasError && !pending && stmt.otherwise && stmt.otherwise.length) {
          pending = execBlock(stmt.otherwise, env, ctx);
        }
        if (stmt.final && stmt.final.length) {
          var fr = execBlock(stmt.final, env, ctx);
          if (fr && fr.type !== 'normal') { pending = fr; hasError = false; pendingError = null; }
        }
        if (hasError) throw pendingError;
        return pending;
      }
      case 'throw': {
        var thrown = evalExpr(stmt.value, env, ctx);
        if (thrown === null || thrown === undefined) thrown = langError('RuntimeError', 'No active exception to reraise');
        throwLang(thrown);
      }
      case 'assert': {
        if (!bool(evalExpr(stmt.test, env, ctx))) fail('AssertionError', display(evalExpr(stmt.message, env, ctx), env.lang));
        return null;
      }
      case 'del': {
        stmt.targets.forEach(function (t) {
          if (t.t === 'id') { delete env.v[t.name]; return; }
          if (t.t === 'member') {
            var host = evalExpr(t.obj, env, ctx);
            if (host && host.__instance) delete host.fields[t.prop];
            else if (host && host.__dict) host.map.delete(t.prop);
            else if (isObj(host)) delete host[String(t.prop)];
            return;
          }
          if (t.t === 'index') {
            var obj = evalExpr(t.obj, env, ctx), key = evalExpr(t.index, env, ctx);
            if (Array.isArray(obj)) obj.splice(num(key), 1);
            else if (obj && obj.map && typeof obj.map.delete === 'function') obj.map.delete(key);
            else if (isObj(obj)) delete obj[String(key)];
          }
        });
        return null;
      }
      case 'return': return completion('return', evalExpr(stmt.value, env, ctx));
      case 'break': return completion('break');
      case 'continue': return completion('continue');
      case 'block': return execBlock(stmt.body, env, ctx);
      case 'func': {
        var fn = makeFunction({ name: stmt.name, params: stmt.params, body: stmt.body, env: env, generator: !!stmt.generator, lang: env.lang, decorators: stmt.decorators || [] });
        fn = applyDecorators(fn, stmt.decorators || [], env, ctx);
        declareVar(env, stmt.name, fn);
        return null;
      }
      case 'class': return execClass(stmt, env, ctx);
      case 'with': {
        var exits = [];
        stmt.items.forEach(function (item) {
          var value = evalExpr(item.value, env, ctx);
          var enter = value && (getMember(value, '__enter__', env.lang, ctx) || getMember(value, 'enter', env.lang, ctx));
          var entered = enter ? callValue(enter, [], {}, ctx, value, env) : value;
          if (item.alias) assignTarget(env, item.alias, entered, ctx);
          exits.push({ value: value, exit: getMember(value, '__exit__', env.lang, ctx) || getMember(value, 'exit', env.lang, ctx) });
        });
        var wr = null, bodyError = null;
        try { wr = execBlock(stmt.body, env, ctx); }
        catch (e) { bodyError = e; }
        finally {
          exits.reverse().forEach(function (x) {
            if (x.exit) callValue(x.exit, bodyError ? [bodyError.name || 'Error', bodyError.message || '', bodyError] : [null, null, null], {}, ctx, x.value, env);
          });
        }
        if (bodyError) throw bodyError;
        return wr;
      }
      case 'import': return execImport(stmt, env, ctx);
      default: fail('RuntimeError', 'Unknown statement ' + stmt.type);
    }
  }
  function errorMatches(error, expected, lang) {
    if (!expected) return true;
    if (expected && expected.__tuple) {
      return expected.items.some(function (item) { return errorMatches(error, item, lang); });
    }
    if (error === expected) return true;
    var wanted = typeof expected === 'string' ? expected
      : expected.__errorType || (expected.__class ? expected.name : (expected.__instance && expected.cls && expected.cls.name));
    if (!wanted || !error) return false;
    var names = [];
    if (error.name) names.push(error.name);
    if (error.bases) names = names.concat(error.bases);
    if (error.__instance && error.cls) {
      classChain(error.cls).forEach(function (c) {
        if (c.name) names.push(c.name);
        if (c.__errorType) names.push(c.__errorType);
      });
    }
    var expanded = Object.create(null);
    function add(name) {
      if (!name || expanded[name]) return;
      expanded[name] = true;
      (ERROR_BASES[name] || []).forEach(add);
    }
    names.forEach(add);
    return !!expanded[wanted];
  }
  function execClass(stmt, env, ctx) {
    if (env.lang === 'js') {
      var members = {}, statics = {};
      (stmt.methods || []).forEach(function (m) {
        var fn = makeFunction({ name: m.name, params: m.params, body: m.body, env: env, lang: 'js', decorators: [], cls: null });
        if (m.static) {
          fn.__static__ = true;
          statics[m.name] = fn;
        } else if (m.kind === 'get' || m.kind === 'set') {
          var desc = members[m.name] && members[m.name].__property ? members[m.name] : { __property: true, fget: null, fset: null };
          if (m.kind === 'get') desc.fget = fn; else desc.fset = fn;
          members[m.name] = desc;
        } else members[m.name] = fn;
      });
      var base = stmt.bases && stmt.bases.length ? evalExpr(stmt.bases[0], env, ctx) : null;
      if (base && base.members) Object.keys(base.members).forEach(function (k) { if (!has(members, k)) members[k] = base.members[k]; });
      if (base && base.statics) Object.keys(base.statics).forEach(function (k) { if (!has(statics, k)) statics[k] = base.statics[k]; });
      var cls = makeClass(stmt.name, base ? [base] : [], members, 'js');
      cls.statics = statics;
      function bindCls(fn) { if (fn && fn.__function && !fn.cls) fn.cls = cls; }
      Object.keys(members).forEach(function (k) {
        var value = members[k];
        if (value && value.__property) { bindCls(value.fget); bindCls(value.fset); }
        else bindCls(value);
        cls[k] = value;
      });
      Object.keys(statics).forEach(function (k) { bindCls(statics[k]); cls[k] = statics[k]; });
      declareVar(env, stmt.name, cls);
      return null;
    }
    var classEnv = newEnv(env, 'py');
    execList(stmt.body, classEnv, ctx);
    var pyMembers = Object.create(null);
    Object.keys(classEnv.v).forEach(function (k) { pyMembers[k] = classEnv.v[k]; });
    var pyBases = (stmt.bases || []).map(function (b) { return evalExpr(b, env, ctx); });
    var pyCls = makeClass(stmt.name, pyBases, pyMembers, 'py');
    Object.keys(pyMembers).forEach(function (k) {
      if (pyMembers[k] && pyMembers[k].__function) {
        pyMembers[k].cls = pyCls;
        if (!pyMembers[k].name) { try { Object.defineProperty(pyMembers[k], 'name', { value: k, configurable: true }); } catch (e) { /* ignore */ } }
      }
    });
    pyCls = applyDecorators(pyCls, stmt.decorators || [], env, ctx);
    declareVar(env, stmt.name, pyCls);
    return null;
  }
  /* -------------------------------------------------------------- members */
  function regExpOf(v) {
    if (v && v.__regexp) { try { return new RegExp(v.source, v.flags.replace(/g|y/g, '')); } catch (e) { return /.^/; } }
    try { return new RegExp(String(v)); } catch (e) { return /.^/; }
  }
  function matchObject(result, source) {
    if (!result) return null;
    var groups = Array.prototype.slice.call(result);
    return {
      __match: true, input: source, index: result.index, 0: groups[0],
      group: native(function (a) { var i = a.length ? int(a[0]) : 0; return groups[i] === undefined ? null : groups[i]; }, 'group'),
      groups: native(function () { return groups.slice(1); }, 'groups'),
      start: native(function (a) { return result.index; }, 'start'),
      end: native(function (a) { return result.index + String(result[0] || '').length; }, 'end')
    };
  }
  function getMember(obj, prop, lang, ctx) {
    prop = String(prop);
    if (obj === null || obj === undefined) {
      fail(lang === 'py' ? 'AttributeError' : 'TypeError', "Cannot read property '" + prop + "' of " + display(obj, lang));
    }
    function m(fn, name) { return native(fn, name || prop); }

    if (typeof obj === 'function' || (obj && obj.__native)) {
      if (prop === '__name__') return obj.name || '';
      if (has(obj, prop)) return obj[prop];
      if (prop === 'name' || prop === 'length') return obj[prop];
      return undefined;
    }
    if (obj && obj.__error) {
      if (prop === 'name') return obj.name;
      if (prop === 'message') return obj.message;
      if (prop === 'args') return obj.message ? [obj.message] : [];
      if (prop === 'toString') return m(function () { return obj.name + ': ' + obj.message; }, 'toString');
    }
    if (obj && obj.__match) {
      if (has(obj, prop)) return obj[prop];
    }
    if (obj && obj.__module) {
      if (has(obj, prop)) return obj[prop];
      if (prop === '__name__') return obj.name;
      return undefined;
    }
    if (obj && obj.__instance) {
      var found;
      classChain(obj.cls).some(function (c) { found = c.members && c.members[prop]; return found !== undefined; });
      if (found) {
        if (found.__property) return found.fget ? callValue(found.fget, [], {}, ctx, obj, null) : undefined;
        if (obj.lang === 'js' && found.__function) return bindMethod(found, obj);
        return found;
      }
      if (has(obj.fields, prop)) return obj.fields[prop];
      if (prop === '__class__') return obj.cls;
      return undefined;
    }
    if (obj && obj.__class) {
      if (obj.statics && has(obj.statics, prop)) return obj.statics[prop];
      if (has(obj.members, prop)) return obj.members[prop];
      if (has(obj, prop)) return obj[prop];
      if (prop === '__name__') return obj.name;
      return undefined;
    }
    if (obj && obj.__file) {
      switch (prop) {
        case 'name': return obj.name;
        case 'mode': return obj.mode;
        case 'closed': return obj.closed;
        case 'read': return m(function (a) {
          if (obj.closed) fail('ValueError', 'I/O operation on closed file');
          var content = Win.fs.read(obj.name);
          if (content === null || content === undefined) return '';
          var size = a.length ? int(a[0]) : content.length - obj.pos;
          var out = content.substr(obj.pos, size);
          obj.pos += out.length;
          return out;
        });
        case 'readline': return m(function () {
          if (obj.closed) fail('ValueError', 'I/O operation on closed file');
          var content = Win.fs.read(obj.name) || '';
          var nl = content.indexOf('\n', obj.pos);
          var end = nl < 0 ? content.length : nl + 1;
          var out = content.slice(obj.pos, end);
          obj.pos = end;
          return out;
        });
        case 'readlines': return m(function () {
          var out = [], line;
          while ((line = getMember(obj, 'readline', lang, ctx)([], {}, ctx))) out.push(line.replace(/\n$/, ''));
          return out;
        });
        case 'write': return m(function (a) {
          if (obj.closed) fail('ValueError', 'I/O operation on closed file');
          if (!/[wa+]/.test(obj.mode)) fail('UnsupportedOperation', 'not writable');
          var text = display(a[0], lang);
          var old = Win.fs.read(obj.name) || '';
          var pos = /a/.test(obj.mode) ? old.length : Math.min(obj.pos, old.length);
          var content = old.slice(0, pos) + text + old.slice(pos + (/[wa]/.test(obj.mode) && !/\+/.test(obj.mode) ? text.length : 0));
          Win.fs.write(obj.name, content, { kind: 'text', app: 'python' });
          obj.pos = pos + text.length;
          return text.length;
        });
        case 'seek': return m(function (a) { obj.pos = Math.max(0, int(a[0])); return obj.pos; });
        case 'tell': return m(function () { return obj.pos; });
        case 'flush': return m(function () { return null; });
        case 'close': return m(function () { obj.closed = true; return null; });
        case '__enter__': return m(function () { return obj; });
        case '__exit__': return m(function () { obj.closed = true; return null; });
      }
      return undefined;
    }
    if (obj && obj.__dict) {
      switch (prop) {
        case 'keys': return m(function () { return Array.from(obj.map.keys()); });
        case 'values': return m(function () { return Array.from(obj.map.values()); });
        case 'items': return m(function () { var out = []; obj.map.forEach(function (v, k) { out.push(makeTuple([k, v])); }); return out; });
        case 'get': return m(function (a) {
          if (obj.map.has(a[0])) return obj.map.get(a[0]);
          if (obj.__default__) {
            var made = callValue(obj.__default__, [], {}, ctx, null, null);
            obj.map.set(a[0], made);
            return made;
          }
          return a.length > 1 ? a[1] : null;
        });
        case 'setdefault': return m(function (a) { if (!obj.map.has(a[0])) obj.map.set(a[0], a[1]); return obj.map.get(a[0]); });
        case 'update': return m(function (a) {
          var src = a[0];
          if (src && src.__dict) src.map.forEach(function (v, k) { obj.map.set(k, v); });
          else if (isObj(src)) Object.keys(src).forEach(function (k) { obj.map.set(k, src[k]); });
          return null;
        });
        case 'pop': return m(function (a) { var v = obj.map.get(a[0]); obj.map.delete(a[0]); if (v === undefined && !a.length) fail('KeyError', display(a[0], lang)); return v; });
        case 'popitem': return m(function () { var e = obj.map.entries().next().value; if (!e) fail('KeyError', 'dictionary is empty'); obj.map.delete(e[0]); return makeTuple(e); });
        case 'clear': return m(function () { obj.map.clear(); return null; });
        case 'copy': return m(function () { var d = makeDict(); obj.map.forEach(function (v, k) { d.map.set(k, v); }); return d; });
        case 'has_key': return m(function (a) { return obj.map.has(a[0]); });
      }
      if (obj.map.has(prop)) return obj.map.get(prop);
      return undefined;
    }
    if (obj && obj.__set) {
      switch (prop) {
        case 'add': return m(function (a) { obj.items.add(a[0]); return null; });
        case 'remove': return m(function (a) { if (!obj.items.has(a[0])) fail('KeyError', display(a[0], lang)); obj.items.delete(a[0]); return null; });
        case 'discard': return m(function (a) { obj.items.delete(a[0]); return null; });
        case 'union': return m(function (a) { var s = makeSet(Array.from(obj.items)); a.forEach(function (x) { toArrayLike(x, lang).forEach(function (v) { s.items.add(v); }); }); return s; });
        case 'intersection': return m(function (a) { var s = makeSet(); var other = new Set(toArrayLike(a[0] || [], lang)); obj.items.forEach(function (v) { if (other.has(v)) s.items.add(v); }); return s; });
        case 'difference': return m(function (a) { var s = makeSet(); var other = new Set(toArrayLike(a[0] || [], lang)); obj.items.forEach(function (v) { if (!other.has(v)) s.items.add(v); }); return s; });
        case 'symmetric_difference': return m(function (a) { var s = makeSet(); var other = new Set(toArrayLike(a[0] || [], lang)); obj.items.forEach(function (v) { if (!other.has(v)) s.items.add(v); }); other.forEach(function (v) { if (!obj.items.has(v)) s.items.add(v); }); return s; });
        case 'issubset': return m(function (a) { var other = new Set(toArrayLike(a[0] || [], lang)); var ok = true; obj.items.forEach(function (v) { if (!other.has(v)) ok = false; }); return ok; });
        case 'issuperset': return m(function (a) { var other = toArrayLike(a[0] || [], lang); return other.every(function (v) { return obj.items.has(v); }); });
        case 'clear': return m(function () { obj.items.clear(); return null; });
        case 'copy': return m(function () { return makeSet(Array.from(obj.items)); });
        case 'pop': return m(function () { var v = obj.items.values().next().value; obj.items.delete(v); return v; });
        case 'size': case 'length': return obj.items.size;
        case 'has': return m(function (a) { return obj.items.has(a[0]); });
        case 'delete': return m(function (a) { var r = obj.items.delete(a[0]); if (lang === 'js') return r; return null; });
        case 'forEach': return m(function (a) { Array.from(obj.items).forEach(function (v, i) { callValue(a[0], [v, v, obj], {}, ctx, null, null); }); return undefined; });
        case 'keys': case 'values': return m(function () { return makeIterator(Array.from(obj.items), lang); });
        case 'entries': return m(function () { return makeIterator(Array.from(obj.items).map(function (v) { return [v, v]; }), lang); });
      }
      return undefined;
    }
    if (obj && obj.__map) {
      switch (prop) {
        case 'size': return obj.map.size;
        case 'set': return m(function (a) { obj.map.set(a[0], a[1]); return obj; });
        case 'get': return m(function (a) { return obj.map.get(a[0]); });
        case 'has': return m(function (a) { return obj.map.has(a[0]); });
        case 'delete': return m(function (a) { return obj.map.delete(a[0]); });
        case 'clear': return m(function () { obj.map.clear(); return undefined; });
        case 'forEach': return m(function (a) { obj.map.forEach(function (v, k) { callValue(a[0], [v, k, obj], {}, ctx, null, null); }); return undefined; });
        case 'keys': return m(function () { return makeIterator(Array.from(obj.map.keys()), lang); });
        case 'values': return m(function () { return makeIterator(Array.from(obj.map.values()), lang); });
        case 'entries': return m(function () { return makeIterator(Array.from(obj.map.entries()), lang); });
      }
      return undefined;
    }
    if (obj && obj.__iter) {
      if (prop === 'next') return m(function () { ensureIterator(obj); if (obj.index >= obj.values.length) return { done: true, value: undefined }; return { done: false, value: obj.values[obj.index++] }; });
      if (prop === '__next__') return m(function () { ensureIterator(obj); if (obj.index >= obj.values.length) fail('StopIteration', 'iterator exhausted'); return obj.values[obj.index++]; });
      if (typeof Symbol === 'function' && Symbol.iterator && prop === Symbol.iterator) return m(function () { return obj; });
      return undefined;
    }
    if (obj && obj.__date) {
      var d = obj.value;
      switch (prop) {
        case 'getTime': case 'valueOf': return m(function () { return d.getTime(); });
        case 'getFullYear': return m(function () { return d.getFullYear(); });
        case 'getMonth': return m(function () { return d.getMonth(); });
        case 'getDate': return m(function () { return d.getDate(); });
        case 'getDay': return m(function () { return d.getDay(); });
        case 'getHours': return m(function () { return d.getHours(); });
        case 'getMinutes': return m(function () { return d.getMinutes(); });
        case 'getSeconds': return m(function () { return d.getSeconds(); });
        case 'getMilliseconds': return m(function () { return d.getMilliseconds(); });
        case 'getTimezoneOffset': return m(function () { return d.getTimezoneOffset(); });
        case 'setFullYear': return m(function (a) { return d.setFullYear(int(a[0])); });
        case 'setMonth': return m(function (a) { return d.setMonth(int(a[0])); });
        case 'setDate': return m(function (a) { return d.setDate(int(a[0])); });
        case 'setHours': return m(function (a) { return d.setHours(int(a[0])); });
        case 'setMinutes': return m(function (a) { return d.setMinutes(int(a[0])); });
        case 'setSeconds': return m(function (a) { return d.setSeconds(int(a[0])); });
        case 'toISOString': return m(function () { return d.toISOString(); });
        case 'toJSON': return m(function () { return d.toISOString(); });
        case 'toString': return m(function () { return d.toString(); });
        case 'toLocaleString': return m(function () { return d.toLocaleString(); });
        case 'toLocaleDateString': return m(function () { return d.toLocaleDateString(); });
      }
      return undefined;
    }
    if (obj && obj.__regexp) {
      if (prop === 'source') return obj.source;
      if (prop === 'flags') return obj.flags;
      if (prop === 'global') return obj.flags.indexOf('g') > -1;
      if (prop === 'ignoreCase') return obj.flags.indexOf('i') > -1;
      if (prop === 'test') return m(function (a) { return regExpOf(obj).test(display(a[0], lang)); });
      if (prop === 'exec') return m(function (a) { var r = regExpOf(obj).exec(display(a[0], lang)); return r ? { __match: true, 0: r[0], index: r.index, input: r.input, group: native(function (x) { return r[int(x[0] || 0)] || null; }, 'group') } : null; });
      return undefined;
    }
    if (obj && obj.__tuple) {
      if (/^\d+$/.test(prop)) return obj.items[int(prop)];
      if (prop === 'count') return m(function (a) { return obj.items.filter(function (v) { return strictEq(v, a[0]); }).length; });
      if (prop === 'index') return m(function (a) { var i = obj.items.indexOf(a[0]); if (i < 0) fail('ValueError', 'tuple.index(x): x not in tuple'); return i; });
      if (prop === 'length') return obj.items.length;
      return undefined;
    }
    if (obj && obj.__range) {
      if (prop === 'start') return obj.start;
      if (prop === 'stop') return obj.stop;
      if (prop === 'step') return obj.step;
      if (prop === 'count') return m(function (a) { return obj.iter.filter(function (v) { return strictEq(v, a[0]); }).length; });
      if (prop === 'index') return m(function (a) { return obj.iter.indexOf(a[0]); });
      if (prop === 'length') return obj.iter.length;
      return undefined;
    }
    if (Array.isArray(obj)) {
      if (prop === 'length') return obj.length;
      if (/^\d+$/.test(prop)) return obj[int(prop)];
      switch (prop) {
        case 'join': return m(function (a) { var sep = a.length ? display(a[0], lang) : ','; return obj.map(function (v) { return display(v, lang); }).join(sep); });
        case 'append': return m(function (a) { obj.push(a[0]); return null; });
        case 'extend': return m(function (a) { toArrayLike(a[0], lang).forEach(function (v) { obj.push(v); }); return null; });
        case 'insert': return m(function (a) { obj.splice(int(a[0]), 0, a[1]); return null; });
        case 'remove': return m(function (a) { var i = obj.indexOf(a[0]); if (i < 0) fail('ValueError', 'list.remove(x): x not in list'); obj.splice(i, 1); return null; });
        case 'pop': return m(function (a) { if (!obj.length) fail('IndexError', 'pop from empty list'); return obj.splice(a.length ? int(a[0]) : -1, 1)[0]; });
        case 'clear': return m(function () { obj.length = 0; return null; });
        case 'index': return m(function (a) { var i = obj.indexOf(a[0]); if (i < 0) fail('ValueError', 'x is not in list'); return i; });
        case 'count': return m(function (a) { return obj.filter(function (v) { return strictEq(v, a[0]); }).length; });
        case 'sort': return m(function (a) {
          var named = a.named || {};
          var keyFn = named.key;
          var rev = bool(named.reverse);
          var cmp = a[0] && (a[0].__function || a[0].__native) ? a[0] : null;
          if (cmp) obj.sort(function (x, y) { return num(callValue(cmp, [x, y], {}, ctx, null, null)); });
          else obj.sort(function (x, y) {
            var kx = keyFn ? callValue(keyFn, [x], {}, ctx, null, null) : x;
            var ky = keyFn ? callValue(keyFn, [y], {}, ctx, null, null) : y;
            return kx < ky ? -1 : kx > ky ? 1 : 0;
          });
          if (rev) obj.reverse();
          return lang === 'js' ? obj : null;
        });
        case 'reverse': return m(function () { obj.reverse(); return lang === 'js' ? obj : null; });
        case 'copy': return m(function () { return obj.slice(); });
        case 'push': return m(function (a) { a.forEach(function (v) { obj.push(v); }); return obj.length; });
        case 'shift': return m(function () { return obj.shift(); });
        case 'unshift': return m(function (a) { a.forEach(function (v) { obj.unshift(v); }); return obj.length; });
        case 'concat': return m(function (a) { var out = obj.slice(); a.forEach(function (v) { out = out.concat(Array.isArray(v) ? v : [v]); }); return out; });
        case 'slice': return m(function (a) { return obj.slice(int(a[0] || 0), a[1] === undefined ? undefined : int(a[1])); });
        case 'splice': return m(function (a) { return obj.splice.apply(obj, [int(a.length ? a[0] : 0), a.length > 1 ? int(a[1]) : obj.length].concat(a.slice(2))); });
        case 'includes': return m(function (a) { return obj.indexOf(a[0]) > -1; });
        case 'indexOf': return m(function (a) { return obj.indexOf(a[0]); });
        case 'lastIndexOf': return m(function (a) { return obj.lastIndexOf(a[0]); });
        case 'find': return m(function (a) { for (var i = 0; i < obj.length; i++) if (bool(callValue(a[0], [obj[i], i, obj], {}, ctx, null, null))) return obj[i]; return undefined; });
        case 'findIndex': return m(function (a) { for (var j = 0; j < obj.length; j++) if (bool(callValue(a[0], [obj[j], j, obj], {}, ctx, null, null))) return j; return -1; });
        case 'some': return m(function (a) { return obj.some(function (v, i) { return bool(callValue(a[0], [v, i, obj], {}, ctx, null, null)); }); });
        case 'every': return m(function (a) { return obj.every(function (v, i) { return bool(callValue(a[0], [v, i, obj], {}, ctx, null, null)); }); });
        case 'filter': return m(function (a) { return obj.filter(function (v, i) { return bool(callValue(a[0], [v, i, obj], {}, ctx, null, null)); }); });
        case 'map': return m(function (a) { return obj.map(function (v, i) { return callValue(a[0], [v, i, obj], {}, ctx, null, null); }); });
        case 'forEach': return m(function (a) { obj.forEach(function (v, i) { callValue(a[0], [v, i, obj], {}, ctx, null, null); }); return undefined; });
        case 'reduce': return m(function (a) { var acc = a.length > 1 ? a[1] : obj[0], start = a.length > 1 ? 0 : 1; for (var k = start; k < obj.length; k++) acc = callValue(a[0], [acc, obj[k], k, obj], {}, ctx, null, null); return acc; });
        case 'reduceRight': return m(function (a) { var acc = a.length > 1 ? a[1] : obj[obj.length - 1], start = a.length > 1 ? obj.length - 1 : obj.length - 2; for (var k = start; k >= 0; k--) acc = callValue(a[0], [acc, obj[k], k, obj], {}, ctx, null, null); return acc; });
        case 'flat': return m(function (a) { var depth = a.length ? int(a[0]) : 1; function flat(arr, d) { var out = []; arr.forEach(function (v) { if (Array.isArray(v) && d > 0) out = out.concat(flat(v, d - 1)); else out.push(v); }); return out; } return flat(obj, depth); });
        case 'flatMap': return m(function (a) { var out = []; obj.forEach(function (v, i) { out = out.concat(toArrayLike(callValue(a[0], [v, i, obj], {}, ctx, null, null), lang)); }); return out; });
        case 'fill': return m(function (a) { for (var f = 0; f < obj.length; f++) obj[f] = a[0]; return obj; });
        case 'at': return m(function (a) { var i = int(a[0]); return obj[i < 0 ? obj.length + i : i]; });
        case 'keys': return m(function () { return makeIterator(obj.map(function (_, i) { return i; }), lang); });
        case 'values': return m(function () { return makeIterator(obj.slice(), lang); });
        case 'entries': return m(function () { return makeIterator(obj.map(function (v, i) { return [i, v]; }), lang); });
      }
      return undefined;
    }
    if (typeof obj === 'string') {
      if (prop === 'length') return obj.length;
      if (/^\d+$/.test(prop)) return obj[int(prop)];
      switch (prop) {
        case 'upper': case 'toUpperCase': return m(function () { return obj.toUpperCase(); });
        case 'lower': case 'toLowerCase': return m(function () { return obj.toLowerCase(); });
        case 'title': return m(function () { return obj.replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase(); }); });
        case 'capitalize': return m(function () { return obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase(); });
        case 'casefold': return m(function () { return obj.toLowerCase(); });
        case 'swapcase': return m(function () { return obj.replace(/[A-Za-z]/g, function (c) { return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); }); });
        case 'strip': case 'trim': return m(function (a) { return a.length ? obj.replace(new RegExp('^[' + escapeText(display(a[0], lang)) + ']+|[' + escapeText(display(a[0], lang)) + ']+$', 'g'), '') : obj.trim(); });
        case 'lstrip': case 'trimStart': return m(function () { return obj.replace(/^\s+/, ''); });
        case 'rstrip': case 'trimEnd': return m(function () { return obj.replace(/\s+$/, ''); });
        case 'split': return m(function (a) { return a.length ? obj.split(display(a[0], lang)) : obj.trim() ? obj.split(/\s+/) : []; });
        case 'rsplit': return m(function (a) { var sep = a.length ? display(a[0], lang) : ' ', parts = obj.split(sep); return parts; });
        case 'splitlines': return m(function () { return obj.split(/\r?\n/); });
        case 'join': return m(function (a) { return toArrayLike(a[0], lang).map(function (v) { return display(v, lang); }).join(obj); });
        case 'replace': case 'replaceAll': return m(function (a) {
          var replacement = display(a[1], lang);
          if (a[0] && a[0].__regexp) {
            var re = regExpRaw(a[0]);
            if (prop === 'replaceAll' && !re.global) re = new RegExp(re.source, re.flags + 'g');
            return obj.replace(re, replacement);
          }
          var needle = display(a[0], lang);
          if (lang === 'js' && prop === 'replace') return obj.replace(needle, replacement);
          return obj.split(needle).join(replacement);
        });
        case 'find': case 'indexOf': return m(function (a) { return obj.indexOf(display(a[0], lang), a[1] === undefined ? 0 : int(a[1])); });
        case 'rfind': case 'lastIndexOf': return m(function (a) { return obj.lastIndexOf(display(a[0], lang)); });
        case 'index': return m(function (a) { var i = obj.indexOf(display(a[0], lang)); if (i < 0) fail('ValueError', 'substring not found'); return i; });
        case 'count': return m(function (a) { return obj.split(display(a[0], lang)).length - 1; });
        case 'startsWith': case 'startswith': return m(function (a) {
          var s = display(a[0], lang), pos = lang === 'js' && a.length > 1 ? Math.max(0, int(a[1])) : 0;
          return obj.substr(pos, s.length) === s;
        });
        case 'endsWith': case 'endswith': return m(function (a) {
          var s = display(a[0], lang);
          var end = lang === 'js' && a.length > 1 ? Math.max(0, Math.min(obj.length, int(a[1]))) : obj.length;
          return obj.slice(end - s.length, end) === s;
        });
        case 'includes': return m(function (a) { return obj.indexOf(display(a[0], lang)) > -1; });
        case 'isalpha': return m(function () { return /^[A-Za-z]+$/.test(obj); });
        case 'isdigit': case 'isdecimal': case 'isnumeric': return m(function () { return /^[0-9]+$/.test(obj); });
        case 'isalnum': return m(function () { return /^[A-Za-z0-9]+$/.test(obj); });
        case 'isspace': return m(function () { return /^\s+$/.test(obj); });
        case 'isupper': return m(function () { return obj === obj.toUpperCase() && /[A-Z]/.test(obj); });
        case 'islower': return m(function () { return obj === obj.toLowerCase() && /[a-z]/.test(obj); });
        case 'zfill': return m(function (a) { var w = int(a[0]); return obj.length >= w ? obj : '0'.repeat(w - obj.length - (obj[0] === '-' ? 1 : 0)) + obj; });
        case 'padStart': case 'ljust': return m(function (a) { var w = int(a[0]), ch = a[1] === undefined ? ' ' : display(a[1], lang); return obj.length >= w ? obj : padWith(ch, w - obj.length) + obj; });
        case 'padEnd': case 'rjust': return m(function (a) { var w = int(a[0]), ch = a[1] === undefined ? ' ' : display(a[1], lang); return obj.length >= w ? obj : obj + padWith(ch, w - obj.length); });
        case 'center': return m(function (a) { var w = int(a[0]), total = Math.max(0, w - obj.length), left = Math.floor(total / 2), ch = a[1] === undefined ? ' ' : display(a[1], lang); return padWith(ch, left) + obj + padWith(ch, total - left); });
        case 'repeat': return m(function (a) { return obj.repeat(int(a[0])); });
        case 'slice': return m(function (a) { return obj.slice(int(a[0] || 0), a[1] === undefined ? undefined : int(a[1])); });
        case 'substring': return m(function (a) { return obj.substring(int(a[0] || 0), a[1] === undefined ? undefined : int(a[1])); });
        case 'charAt': case 'at': return m(function (a) { return obj.charAt(int(a[0] || 0)); });
        case 'charCodeAt': return m(function (a) { return obj.charCodeAt(int(a[0] || 0)); });
        case 'concat': return m(function (a) { return obj + a.map(function (v) { return display(v, lang); }).join(''); });
        case 'match': return m(function (a) {
          var re = regExpRaw(a[0]);
          if (re.global) {
            var matches = obj.match(re);
            return matches ? matches.map(function (x) { return x; }) : null;
          }
          var r = re.exec(obj);
          return r ? matchObject(r, obj) : null;
        });
        case 'search': return m(function (a) { var r = regExpOf(a[0]).exec(obj); return r ? r.index : -1; });
        case 'localeCompare': return m(function (a) { return obj < display(a[0], lang) ? -1 : obj > display(a[0], lang) ? 1 : 0; });
        case 'format': return m(function (a) { var i = 0; return obj.replace(/\{(\d*)\}/g, function (all, n) { return display(a[n === '' ? i++ : int(n)], lang); }); });
        case 'partition': return m(function (a) { var s = display(a[0], lang), i = obj.indexOf(s); return i < 0 ? [obj, '', ''] : [obj.slice(0, i), s, obj.slice(i + s.length)]; });
        case 'encode': return m(function () { return obj; });
      }
      return undefined;
    }
    if (typeof obj === 'number') {
      switch (prop) {
        case 'toFixed': return m(function (a) { return obj.toFixed(int(a[0] || 0)); });
        case 'toPrecision': return m(function (a) { return obj.toPrecision(int(a[0] || 1)); });
        case 'toExponential': return m(function (a) { return obj.toExponential(int(a[0] || 0)); });
        case 'toString': return m(function (a) { return a.length ? obj.toString(int(a[0])) : String(obj); });
        case 'valueOf': return m(function () { return obj; });
      }
      return undefined;
    }
    if (typeof obj === 'boolean') {
      if (prop === 'toString') return m(function () { return String(obj); });
      if (prop === 'valueOf') return m(function () { return obj; });
      return undefined;
    }
    if (isObj(obj)) {
      if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') return undefined;
      if (has(obj, prop)) return obj[prop];
      switch (prop) {
        case 'hasOwnProperty': return m(function (a) { return has(obj, String(a[0])); });
        case 'propertyIsEnumerable': return m(function (a) { return Object.prototype.propertyIsEnumerable.call(obj, String(a[0])); });
        case 'toString': return m(function () { return '[object Object]'; });
        case 'valueOf': return m(function () { return obj; });
        case 'keys': return m(function () { return Object.keys(obj); });
        case 'values': return m(function () { return Object.keys(obj).map(function (k) { return obj[k]; }); });
        case 'entries': return m(function () { return Object.keys(obj).map(function (k) { return [k, obj[k]]; }); });
      }
      return undefined;
    }
    return undefined;
  }
  /* ------------------------------------------------------------- builtins */
  function pyCtor(name, fn) {
    var f = native(fn, name);
    f.__builtinName = name; f.__lang = 'py';
    return f;
  }
  function jsCtor(name, fn) {
    var f = native(fn, name);
    f.__builtinName = name; f.__lang = 'js'; f.__ctor = fn;
    return f;
  }
  function errorCtor(name, lang) {
    var f = native(function (a) {
      return langError(name, a.length ? display(a[0], lang) : '');
    }, name);
    f.__errorType = name; f.__lang = lang;
    return f;
  }
  function numeric(v) { return num(v); }
  function iterable(v, lang) { return toArrayLike(v, lang || 'py'); }
  function withNamedKey(fn, a, named) {
    return named && named.key ? callValue(named.key, [a], {}, currentCtx, null, null) : a;
  }
  var currentCtx = null;

  var DEFAULT_HELP = {
    py: 'WINemulator Python simulation. Use help() from the app for the full command list.\n',
    js: 'WINemulator JavaScript simulation. Use help() from the app for the full command list.\n'
  };
  function helpTextFor(lang) {
    return (Win.langs && Win.langs.helpText && Win.langs.helpText[lang]) || DEFAULT_HELP[lang];
  }

  function buildPythonBuiltins() {
    var b = Object.create(null);
    b.print = native(function (a, named, ctx) {
      var sep = has(named, 'sep') ? display(named.sep, 'py') : ' ';
      var end = has(named, 'end') ? display(named.end, 'py') : '\n';
      var text = a.map(function (v) { return display(v, 'py'); }).join(sep) + end;
      var target = named.file;
      if (target && target.__file && getMember(target, 'write', 'py', ctx)) {
        getMember(target, 'write', 'py', ctx)([text.slice(0, -end.length)], {}, ctx, target);
      } else ctx.write(text);
      return null;
    }, 'print');
    b.input = native(function (a, named, ctx) {
      if (a.length) ctx.write(display(a[0], 'py'));
      var value = ctx.readInput();
      return String(value === null || value === undefined ? '' : value).replace(/[\r\n]+$/, '');
    }, 'input');
    b.len = native(function (a) {
      var v = a[0];
      if (v === null || v === undefined) fail('TypeError', "object of type 'NoneType' has no len()");
      if (v && v.__map || v && v.__dict) return v.map.size;
      if (v && v.__set) return v.items.size;
      if (v && v.__tuple) return v.items.length;
      if (v && v.__range) return v.iter.length;
      if (v && v.__iter) { ensureIterator(v); return v.values.length - (v.index || 0); }
      if (Array.isArray(v) || typeof v === 'string') return v.length;
      if (isObj(v)) return Object.keys(v).length;
      fail('TypeError', "object of type '" + typeName(v, 'py') + "' has no len()");
    }, 'len');
    b.range = pyCtor('range', function (a) {
      var start = a.length > 1 ? int(a[0]) : 0;
      var stop = a.length > 1 ? int(a[1]) : (a.length ? int(a[0]) : 0);
      var step = a.length > 2 ? int(a[2]) : 1;
      return makeRange(start, stop, step);
    });
    b.int = pyCtor('int', function (a) {
      if (a[0] && a[0].__error) fail('ValueError', 'cannot convert exception to int');
      if (typeof a[0] === 'string') {
        var base = a.length > 1 ? int(a[1]) : 10;
        var s = a[0].trim().replace(/_/g, '');
        var sign = /^[+-]/.test(s) ? s[0] : '';
        if (sign) s = s.slice(1);
        if (base === 16) s = s.replace(/^0x/i, '');
        else if (base === 8) s = s.replace(/^0o/i, '');
        else if (base === 2) s = s.replace(/^0b/i, '');
        var parsed = parseInt(s, base);
        if (isNaN(parsed)) fail('ValueError', "invalid literal for int() with base " + base + ": " + display(a[0], 'py'));
        return sign === '-' ? -parsed : parsed;
      }
      return int(a[0]);
    });
    b.float = pyCtor('float', function (a) {
      if (typeof a[0] === 'string') {
        var s = a[0].trim().toLowerCase();
        if (s === 'inf' || s === '+inf' || s === 'infinity') return Infinity;
        if (s === '-inf' || s === '-infinity') return -Infinity;
        if (s === 'nan') return NaN;
        var v = Number(s);
        if (isNaN(v)) fail('ValueError', 'could not convert string to float: ' + display(a[0], 'py'));
        return v;
      }
      return num(a[0]);
    });
    b.str = pyCtor('str', function (a) { return display(a.length ? a[0] : '', 'py'); });
    b.bool = pyCtor('bool', function (a) { return bool(a[0]); });
    b.list = pyCtor('list', function (a) { return a.length ? iterable(a[0], 'py').slice() : []; });
    b.tuple = pyCtor('tuple', function (a) { return makeTuple(a.length ? iterable(a[0], 'py').slice() : []); });
    b.dict = pyCtor('dict', function (a) {
      var d = makeDict();
      if (a.length) {
        var src = a[0];
        if (src && src.__dict) src.map.forEach(function (v, k) { d.map.set(k, v); });
        else if (src && src.__map) src.map.forEach(function (v, k) { d.map.set(k, v); });
        else iterable(src, 'py').forEach(function (pair) {
          var p = iterable(pair, 'py');
          d.map.set(p[0], p[1]);
        });
      }
      Object.keys(namedSafe(a)).forEach(function (k) { d.map.set(k, a.named[k]); });
      return d;
    });
    function namedSafe(a) { return (a && a.named) || {}; }
    b.set = pyCtor('set', function (a) { return makeSet(a.length ? iterable(a[0], 'py') : []); });
    b.frozenset = pyCtor('frozenset', function (a) { return makeSet(a.length ? iterable(a[0], 'py') : []); });
    b.type = pyCtor('type', function (a) {
      var n = typeName(a[0], 'py');
      var ctor = b[n] || b[n === 'NoneType' ? 'str' : n] || b.object;
      return ctor || b.str;
    });
    b.object = pyCtor('object', function () { return makeInstance(makeClass('object', [], {}, 'py'), 'py'); });
    b.isinstance = native(function (a) {
      return instanceOf(a[0], a[1]);
    }, 'isinstance');
    b.issubclass = native(function (a) {
      if (!a[0] || !a[1]) return false;
      if (a[0] === a[1]) return true;
      var c = a[0].bases && a[0].bases[0];
      return c ? b.issubclass([c, a[1]]) : false;
    }, 'issubclass');
    b.hasattr = native(function (a) {
      if (a[0] === null || a[0] === undefined) return false;
      try { return getMember(a[0], display(a[1], 'py'), 'py', currentCtx) !== undefined; }
      catch (e) { if (isThrow(e)) return false; throw e; }
    }, 'hasattr');
    b.getattr = native(function (a) {
      var name = display(a[1], 'py');
      try {
        var value = getMember(a[0], name, 'py', currentCtx);
        if (value === undefined) throw new Error('missing');
        return value;
      } catch (e) {
        if (a.length > 2) return a[2];
        fail('AttributeError', "'" + display(a[0], 'py') + "' object has no attribute '" + name + "'");
      }
    }, 'getattr');
    b.setattr = native(function (a, named, ctx, self, callerEnv) {
      var name = display(a[1], 'py');
      var target = { t: 'member', obj: { t: 'lit', v: a[0] }, prop: name };
      assignTarget(callerEnv || newEnv(null, 'py'), target, a[2], ctx);
      return null;
    }, 'setattr');
    b.delattr = native(function (a) {
      var name = display(a[1], 'py'), obj = a[0];
      if (obj && obj.__instance) delete obj.fields[name];
      else if (obj && obj.__dict) obj.map.delete(name);
      else if (isObj(obj)) delete obj[name];
      else fail('AttributeError', name);
      return null;
    }, 'delattr');
    b.abs = native(function (a) { return Math.abs(num(a[0])); }, 'abs');
    b.all = native(function (a) { return iterable(a[0], 'py').every(function (v) { return bool(v); }); }, 'all');
    b.any = native(function (a) { return iterable(a[0], 'py').some(function (v) { return bool(v); }); }, 'any');
    b.sum = native(function (a) {
      var start = a.length > 1 ? a[1] : 0;
      return iterable(a[0], 'py').reduce(function (acc, v) {
        if (typeof acc === 'string' || typeof v === 'string') return display(acc, 'py') + display(v, 'py');
        return num(acc) + num(v);
      }, start);
    }, 'sum');
    b.min = native(function (a, named, ctx) {
      var values = a.length > 1 ? a : iterable(a[0], 'py');
      var keyFn = named && named.key;
      var best = null, bestKey = null;
      values.forEach(function (v) {
        var k = keyFn ? callValue(keyFn, [v], {}, ctx, null, null) : v;
        if (best === null || k < bestKey) { best = v; bestKey = k; }
      });
      return best;
    }, 'min');
    b.max = native(function (a, named, ctx) {
      var values = a.length > 1 ? a : iterable(a[0], 'py');
      var keyFn = named && named.key;
      var best = null, bestKey = null;
      values.forEach(function (v) {
        var k = keyFn ? callValue(keyFn, [v], {}, ctx, null, null) : v;
        if (best === null || k > bestKey) { best = v; bestKey = k; }
      });
      return best;
    }, 'max');
    b.sorted = native(function (a, named, ctx) {
      var values = iterable(a[0], 'py').slice();
      var keyFn = named && named.key;
      var reverse = !!(named && named.reverse);
      values.sort(function (x, y) {
        var kx = keyFn ? callValue(keyFn, [x], {}, ctx, null, null) : x;
        var ky = keyFn ? callValue(keyFn, [y], {}, ctx, null, null) : y;
        var r = kx && kx.__cmpKey && ky && ky.__cmpKey
          ? num(callValue(kx.cmp, [kx.value, ky.value], {}, kx.ctx || ctx, null, null))
          : (kx < ky ? -1 : kx > ky ? 1 : 0);
        return reverse ? -r : r;
      });
      return values;
    }, 'sorted');
    b.reversed = native(function (a) { return makeIterator(iterable(a[0], 'py').slice().reverse(), 'py'); }, 'reversed');
    b.enumerate = native(function (a) {
      var start = a.length > 1 ? int(a[1]) : 0;
      return makeIterator(iterable(a[0], 'py').map(function (v, i) { return makeTuple([start + i, v]); }), 'py');
    }, 'enumerate');
    b.zip = native(function (a) {
      var lists = a.map(function (v) { return iterable(v, 'py'); });
      if (!lists.length) return makeIterator([], 'py');
      var count = Math.min.apply(null, lists.map(function (l) { return l.length; }));
      var out = [];
      for (var i = 0; i < count; i++) out.push(makeTuple(lists.map(function (l) { return l[i]; })));
      return makeIterator(out, 'py');
    }, 'zip');
    b.map = native(function (a, named, ctx) {
      return makeIterator(iterable(a[1], 'py').map(function (v) { return callValue(a[0], [v], {}, ctx, null, null); }), 'py');
    }, 'map');
    b.filter = native(function (a, named, ctx) {
      return makeIterator(iterable(a[1], 'py').filter(function (v) { return bool(callValue(a[0], [v], {}, ctx, null, null)); }), 'py');
    }, 'filter');
    b.round = native(function (a) {
      var digits = a.length > 1 ? int(a[1]) : 0;
      var factor = Math.pow(10, digits);
      var scaled = num(a[0]) * factor, floor = Math.floor(scaled), fraction = scaled - floor;
      if (fraction > 0.5 || (Math.abs(fraction - 0.5) < 1e-10 && Math.abs(floor % 2) === 1)) floor++;
      return floor / factor;
    }, 'round');
    b.pow = native(function (a) { return Math.pow(num(a[0]), num(a[1])); }, 'pow');
    b.divmod = native(function (a) {
      var x = num(a[0]), y = num(a[1]);
      if (y === 0) fail('ZeroDivisionError', 'integer division or modulo by zero');
      var q = Math.floor(x / y);
      return makeTuple([q, x - q * y]);
    }, 'divmod');
    b.chr = native(function (a) { return String.fromCodePoint(int(a[0])); }, 'chr');
    b.ord = native(function (a) { return String(display(a[0], 'py')).codePointAt(0); }, 'ord');
    b.bin = native(function (a) { return '0b' + int(a[0]).toString(2); }, 'bin');
    b.oct = native(function (a) { return '0o' + int(a[0]).toString(8); }, 'oct');
    b.hex = native(function (a) { return '0x' + int(a[0]).toString(16); }, 'hex');
    b.format = native(function (a) {
      var text = display(a[0], 'py'), i = 0;
      return text.replace(/\{(\d*)(?::([^}]*))?\}/g, function (all, index, spec) {
        var v = a[index === '' ? i++ : int(index) + 1];
        if (spec === 'd') return String(int(v));
        if (spec === 'f') return Number(num(v)).toFixed(6);
        if (spec === 'x') return int(v).toString(16);
        if (/^\d+$/.test(spec || '')) return display(v, 'py').padStart(int(spec), ' ');
        return display(v, 'py');
      });
    }, 'format');
    b.hash = native(function (a) {
      var s = display(a[0], 'py');
      var h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    }, 'hash');
    b.id = native(function (a) { return typeof a[0] === 'object' ? 1000 + (a[0] && a[0].__id || 0) : int(a[0]); }, 'id');
    b.repr = native(function (a) { return display(a[0], 'py', true); }, 'repr');
    b.ascii = native(function (a) { return display(a[0], 'py', true).replace(/[^\x20-\x7e]/g, '?'); }, 'ascii');
    b.callable = native(function (a) { return !!(a[0] && (a[0].__function || a[0].__native || a[0].__class)); }, 'callable');
    b.open = native(function (a) {
      var path = display(a[0], 'py');
      var mode = a.length > 1 ? display(a[1], 'py') : 'r';
      try {
        if (!/^[rwa](?:b?\+?|\+?b?)$/.test(mode)) fail('ValueError', 'invalid mode: ' + mode);
        var normalized = Win.fs.norm(path);
        if (/w/.test(mode)) Win.fs.write(normalized, '', { kind: 'text', app: 'python' });
        var file = makeFile(normalized, mode, 'py');
        if (/a/.test(mode)) file.pos = (Win.fs.read(normalized) || '').length;
        return file;
      } catch (e) {
        if (isThrow(e)) throw e;
        fail('OSError', e.message);
      }
    }, 'open');
    b.__import__ = native(function (a) { return getModule(display(a[0], 'py'), 'py'); }, '__import__');
    b.help = native(function (a, named, ctx) {
      ctx.write(helpTextFor('py'));
      return null;
    }, 'help');
    b.super = native(function (a, named, ctx, self, callerEnv) {
      var base = callerEnv && callerEnv.super;
      if (!base) fail('RuntimeError', 'super(): no parent class');
      var out = Object.create(null);
      if (base.members) Object.keys(base.members).forEach(function (k) {
        out[k] = native(function (args, n, callCtx) {
          var fn = base.members[k];
          var thisValue = callerEnv && callerEnv.this;
          return callValue(fn, args, n || {}, callCtx, thisValue, callerEnv);
        }, k);
      });
      return out;
    }, 'super');
    b.staticmethod = native(function (a) { if (a[0]) a[0].__static__ = true; return a[0]; }, 'staticmethod');
    b.classmethod = native(function (a) { if (a[0]) a[0].__classmethod__ = true; return a[0]; }, 'classmethod');
    b.property = native(function (a) { return { __property: true, fget: a[0], fset: null }; }, 'property');
    b.math = getModule('math', 'py');
    b.random = getModule('random', 'py');

    ['Exception', 'BaseException', 'ArithmeticError', 'LookupError', 'AssertionError', 'AttributeError',
      'ImportError', 'IndexError', 'KeyError', 'NameError', 'OSError', 'IOError', 'RuntimeError',
      'StopIteration', 'SyntaxError', 'TypeError', 'ValueError', 'ZeroDivisionError', 'OverflowError',
      'NotImplementedError', 'SystemExit', 'UnicodeError', 'Warning'].forEach(function (name) {
        b[name] = errorCtor(name, 'py');
      });
    b.EOFError = b.OSError;
    b.EnvironmentError = b.OSError;
    b.Exception.bases = ['BaseException'];
    b.SystemExit.bases = ['BaseException'];
    ['ArithmeticError', 'LookupError'].forEach(function (n) { b[n].bases = ['Exception']; });
    ['AssertionError', 'AttributeError', 'ImportError', 'KeyError', 'NameError', 'OSError', 'RuntimeError',
      'StopIteration', 'SyntaxError', 'TypeError', 'ValueError', 'Warning'].forEach(function (n) { b[n].bases = ['Exception']; });
    b.IndexError.bases = ['LookupError'];
    b.ZeroDivisionError.bases = ['ArithmeticError'];
    b.OverflowError.bases = ['ArithmeticError'];
    b.NotImplementedError.bases = ['RuntimeError'];
    return b;
  }
  /* --------------------------------------------------------------- modules */
  function moduleFn(name, fn) { return native(fn, name); }
  function getModule(name, lang) {
    name = String(name || '').toLowerCase();
    if (name === '__future__') return makeModule(name, { annotations: null });
    if (name === 'math' || name === 'cmath') {
      var math = {
        pi: Math.PI, e: Math.E, tau: Math.PI * 2, inf: Infinity, nan: NaN,
        sqrt: moduleFn('sqrt', function (a) { return Math.sqrt(num(a[0])); }),
        cbrt: moduleFn('cbrt', function (a) { return Math.cbrt(num(a[0])); }),
        floor: moduleFn('floor', function (a) { return Math.floor(num(a[0])); }),
        ceil: moduleFn('ceil', function (a) { return Math.ceil(num(a[0])); }),
        trunc: moduleFn('trunc', function (a) { return Math.trunc(num(a[0])); }),
        fabs: moduleFn('fabs', function (a) { return Math.abs(num(a[0])); }),
        fmod: moduleFn('fmod', function (a) { return num(a[0]) % num(a[1]); }),
        pow: moduleFn('pow', function (a) { return Math.pow(num(a[0]), num(a[1])); }),
        exp: moduleFn('exp', function (a) { return Math.exp(num(a[0])); }),
        expm1: moduleFn('expm1', function (a) { return Math.expm1(num(a[0])); }),
        log: moduleFn('log', function (a) { return a.length > 1 ? Math.log(num(a[0])) / Math.log(num(a[1])) : Math.log(num(a[0])); }),
        log2: moduleFn('log2', function (a) { return Math.log2(num(a[0])); }),
        log10: moduleFn('log10', function (a) { return Math.log10(num(a[0])); }),
        log1p: moduleFn('log1p', function (a) { return Math.log1p(num(a[0])); }),
        sin: moduleFn('sin', function (a) { return Math.sin(num(a[0])); }),
        cos: moduleFn('cos', function (a) { return Math.cos(num(a[0])); }),
        tan: moduleFn('tan', function (a) { return Math.tan(num(a[0])); }),
        asin: moduleFn('asin', function (a) { return Math.asin(num(a[0])); }),
        acos: moduleFn('acos', function (a) { return Math.acos(num(a[0])); }),
        atan: moduleFn('atan', function (a) { return Math.atan(num(a[0])); }),
        atan2: moduleFn('atan2', function (a) { return Math.atan2(num(a[0]), num(a[1])); }),
        sinh: moduleFn('sinh', function (a) { return Math.sinh(num(a[0])); }),
        cosh: moduleFn('cosh', function (a) { return Math.cosh(num(a[0])); }),
        tanh: moduleFn('tanh', function (a) { return Math.tanh(num(a[0])); }),
        degrees: moduleFn('degrees', function (a) { return num(a[0]) * 180 / Math.PI; }),
        radians: moduleFn('radians', function (a) { return num(a[0]) * Math.PI / 180; }),
        hypot: moduleFn('hypot', function (a, named, ctx, self, callerEnv, args2) { return Math.hypot.apply(null, Array.prototype.slice.call(args2 || a)); }),
        factorial: moduleFn('factorial', function (a) { var n = int(a[0]), r = 1; if (n < 0) fail('ValueError', 'factorial() not defined for negative values'); for (var i = 2; i <= n; i++) r *= i; return r; }),
        gcd: moduleFn('gcd', function (a) { var x = Math.abs(int(a[0])), y = Math.abs(int(a[1])); while (y) { var t = y; y = x % y; x = t; } return x; }),
        lcm: moduleFn('lcm', function (a) { var x = Math.abs(int(a[0])), y = Math.abs(int(a[1])); if (!x || !y) return 0; var g = math.gcd([x, y]); return Math.abs(x * y / g); }),
        isfinite: moduleFn('isfinite', function (a) { return isFinite(num(a[0])); }),
        isinf: moduleFn('isinf', function (a) { return !isFinite(num(a[0])) && !isNaN(num(a[0])); }),
        isnan: moduleFn('isnan', function (a) { return isNaN(num(a[0])); }),
        copysign: moduleFn('copysign', function (a) { return Math.sign(num(a[1])) * Math.abs(num(a[0])); }),
        dist: moduleFn('dist', function (a) { var p = iterable(a[0], lang), q = iterable(a[1], lang), s = 0; p.forEach(function (v, i) { s += Math.pow(num(v) - num(q[i]), 2); }); return Math.sqrt(s); })
      };
      return makeModule(name, math);
    }
    if (name === 'random') {
      var seed = null;
      function rand() {
        if (seed === null) return Math.random();
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x80000000;
      }
      var random = {
        random: moduleFn('random', function () { return rand(); }),
        seed: moduleFn('seed', function (a) { seed = a.length ? int(a[0]) : Date.now(); return null; }),
        getstate: moduleFn('getstate', function () { return seed; }),
        setstate: moduleFn('setstate', function (a) { seed = a.length ? int(a[0]) : null; return null; }),
        randint: moduleFn('randint', function (a) { return int(a[0]) + Math.floor(rand() * (int(a[1]) - int(a[0]) + 1)); }),
        randrange: moduleFn('randrange', function (a) {
          var start = a.length > 1 ? int(a[0]) : 0;
          var stop = a.length > 1 ? int(a[1]) : int(a[0]);
          var step = a.length > 2 ? int(a[2]) : 1;
          var choices = [];
          for (var i = start; i < stop; i += step) choices.push(i);
          return choices.length ? choices[int(rand() * choices.length)] : fail('ValueError', 'empty range for randrange()');
        }),
        choice: moduleFn('choice', function (a) { var v = iterable(a[0], lang); if (!v.length) fail('IndexError', 'Cannot choose from an empty sequence'); return v[int(rand() * v.length)]; }),
        choices: moduleFn('choices', function (a, named) { var v = iterable(a[0], lang), k = named && named.k ? int(named.k) : 1, out = []; for (var i = 0; i < k; i++) out.push(v[int(rand() * v.length)]); return out; }),
        sample: moduleFn('sample', function (a) { var v = iterable(a[0], lang).slice(), k = int(a[1]), out = []; for (var i = 0; i < k && v.length; i++) out.push(v.splice(int(rand() * v.length), 1)[0]); return out; }),
        shuffle: moduleFn('shuffle', function (a) { var v = a[0]; for (var i = v.length - 1; i > 0; i--) { var j = int(rand() * (i + 1)), t = v[i]; v[i] = v[j]; v[j] = t; } return null; }),
        uniform: moduleFn('uniform', function (a) { return num(a[0]) + rand() * (num(a[1]) - num(a[0])); }),
        triangular: moduleFn('triangular', function (a) { return (num(a[0]) + num(a[1]) + num(a[2] || ((num(a[0]) + num(a[1])) / 2))) / 3; }),
        betavariate: moduleFn('betavariate', function (a) { return rand(); }),
        expovariate: moduleFn('expovariate', function (a) { return -Math.log(1 - rand()) / num(a[0]); }),
        gammavariate: moduleFn('gammavariate', function (a) { return -Math.log(1 - rand()); }),
        gauss: moduleFn('gauss', function (a) { var u = 1 - rand(), v = rand(); return num(a[0]) + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * num(a[1]); }),
        normalvariate: moduleFn('normalvariate', function (a) { return random.gauss(a); }),
        lognormvariate: moduleFn('lognormvariate', function (a) { return Math.exp(random.gauss(a)); }),
        vonmisesvariate: moduleFn('vonmisesvariate', function (a) { return rand() * Math.PI * 2; }),
        paretovariate: moduleFn('paretovariate', function (a) { return 1 / Math.pow(1 - rand(), 1 / num(a[0])); }),
        weibullvariate: moduleFn('weibullvariate', function (a) { return num(a[1]) * Math.pow(-Math.log(1 - rand()), 1 / num(a[0])); })
      };
      return makeModule(name, random);
    }
    if (name === 'datetime') {
      var dt = {
        date: moduleFn('date', function (a) { return makeDate(new Date(int(a[0]), int(a[1]) - 1, int(a[2] || 1)).getTime()); }),
        datetime: moduleFn('datetime', function (a) {
          if (!a.length) return makeDate();
          return makeDate(new Date(int(a[0]), int(a[1]) - 1, int(a[2] || 1), int(a[3] || 0), int(a[4] || 0), int(a[5] || 0)).getTime());
        }),
        time: moduleFn('time', function (a) { return makeDate(new Date(1970, 0, 1, int(a[0] || 0), int(a[1] || 0), int(a[2] || 0)).getTime()); }),
        timedelta: moduleFn('timedelta', function (a, named) {
          var nd = named && named.days ? int(named.days) : (a.length ? int(a[0]) : 0);
          var sec = named && named.seconds ? int(named.seconds) : (a.length > 1 ? int(a[1]) : 0);
          return { __timedelta: true, days: nd, seconds: sec, ms: (nd * 86400 + sec) * 1000 };
        }),
        now: moduleFn('now', function () { return makeDate(); }),
        today: moduleFn('today', function () { return makeDate(); }),
        utcnow: moduleFn('utcnow', function () { return makeDate(Date.now() + new Date().getTimezoneOffset() * 60000); }),
        fromtimestamp: moduleFn('fromtimestamp', function (a) { return makeDate(num(a[0]) * 1000); }),
        MINYEAR: 1, MAXYEAR: 9999
      };
      return makeModule(name, dt);
    }
    if (name === 'time') {
      return makeModule(name, {
        time: moduleFn('time', function () { return Date.now() / 1000; }),
        monotonic: moduleFn('monotonic', function () { return Date.now() / 1000; }),
        perf_counter: moduleFn('perf_counter', function () { return Date.now() / 1000; }),
        sleep: moduleFn('sleep', function () { return null; }),
        ctime: moduleFn('ctime', function (a) { return new Date((a.length ? num(a[0]) : Date.now() / 1000) * 1000).toString(); }),
        strftime: moduleFn('strftime', function (a) { return new Date().toLocaleString(); }),
        localtime: moduleFn('localtime', function () { var d = new Date(); return makeTuple([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getDay(), d.getDate(), d.getMonth()]); }),
        gmtime: moduleFn('gmtime', function () { var d = new Date(); return makeTuple([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCDay(), d.getUTCDate(), d.getUTCMonth()]); })
      });
    }
    if (name === 'json') {
      return makeModule(name, {
        dumps: moduleFn('dumps', function (a, named) {
          var value = plain(a[0]);
          var indent = named && named.indent ? int(named.indent) : 0;
          try { return JSON.stringify(value, null, indent); }
          catch (e) { fail('TypeError', 'Object of type ' + typeName(a[0], lang) + ' is not JSON serializable'); }
        }),
        dump: moduleFn('dump', function (a, named) { var text = getModule('json', lang).dumps([a[0]], named); if (a[1] && a[1].__file) getMember(a[1], 'write', lang, currentCtx)([text], {}, currentCtx, a[1]); return null; }),
        loads: moduleFn('loads', function (a) {
          try { return JSON.parse(display(a[0], lang)); }
          catch (e) { fail('JSONDecodeError', 'Expecting value'); }
        }),
        load: moduleFn('load', function (a) { var f = a[0]; return getModule('json', lang).loads([getMember(f, 'read', lang, currentCtx)([], {}, currentCtx, f)]); })
      });
    }
    if (name === 're') {
      function compileRe(a) { return { __regexp: true, source: display(a[0], lang), flags: a.length > 1 ? display(a[1], lang) : '' }; }
      function findall(re, text) {
        var rx = regExpOf(re), flags = rx.flags;
        if (flags.indexOf('g') < 0) flags += 'g';
        var globalRx;
        try { globalRx = new RegExp(rx.source, flags); } catch (e) { globalRx = /.^/g; }
        var out = [], m;
        while ((m = globalRx.exec(text))) { out.push(m.length > 1 ? m.slice(1) : m[0]); if (!m[0]) globalRx.lastIndex++; }
        return out;
      }
      var reMod = {
        match: moduleFn('match', function (a) { var rx = regExpOf(compileRe([a[0]])); var r = new RegExp('^(?:' + rx.source + ')', rx.flags).exec(display(a[1], lang)); return r ? matchObject(r, display(a[1], lang)) : null; }),
        fullmatch: moduleFn('fullmatch', function (a) { var rx = regExpOf(compileRe([a[0]])); var r = new RegExp('^(?:' + rx.source + ')$', rx.flags).exec(display(a[1], lang)); return r ? matchObject(r, display(a[1], lang)) : null; }),
        search: moduleFn('search', function (a) { var rx = regExpOf(compileRe([a[0]])), r = rx.exec(display(a[1], lang)); return r ? matchObject(r, display(a[1], lang)) : null; }),
        findall: moduleFn('findall', function (a) { return findall(compileRe([a[0]]), display(a[1], lang)); }),
        finditer: moduleFn('finditer', function (a) {
          var text = display(a[1], lang), rx = regExpOf(compileRe([a[0]])), flags = rx.flags.replace(/g|y/g, '') + 'g';
          var globalRx = new RegExp(rx.source, flags), out = [], m;
          while ((m = globalRx.exec(text))) { out.push(matchObject(m, text)); if (!m[0]) globalRx.lastIndex++; }
          return makeIterator(out, lang);
        }),
        split: moduleFn('split', function (a) { return display(a[1], lang).split(regExpOf(compileRe([a[0]]))); }),
        sub: moduleFn('sub', function (a) { var repl = display(a[1], lang), text = display(a[2], lang), rx = regExpOf(compileRe([a[0]])); var flags = rx.flags.indexOf('g') > -1 ? rx.flags : rx.flags + 'g'; return text.replace(new RegExp(rx.source, flags), repl); }),
        subn: moduleFn('subn', function (a) { var out = reMod.sub(a), rx = regExpOf(compileRe([a[0]])); return makeTuple([out, (display(a[2], lang).match(new RegExp(rx.source, 'g' + rx.flags.replace(/g/g, ''))) || []).length]); }),
        escape: moduleFn('escape', function (a) { return display(a[0], lang).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }),
        compile: moduleFn('compile', function (a) {
          var re = compileRe(a);
          return makeModule('re.Pattern', {
            pattern: re.source, flags: re.flags,
            match: moduleFn('match', function (x) { return reMod.match([re, x[0]]); }),
            search: moduleFn('search', function (x) { return reMod.search([re, x[0]]); }),
            findall: moduleFn('findall', function (x) { return reMod.findall([re, x[0]]); }),
            split: moduleFn('split', function (x) { return reMod.split([re, x[0]]); }),
            sub: moduleFn('sub', function (x) { return reMod.sub([re, x[0], x[1]]); })
          });
        }),
        IGNORECASE: 'i', MULTILINE: 'm', DOTALL: 's', VERBOSE: 'x'
      };
      return makeModule(name, reMod);
    }
    if (name === 'os' || name === 'os.path' || name === 'pathlib') {
      function safePath(p) { return display(p, lang); }
      var osMod = {
        name: 'nt', sep: '\\', linesep: '\r\n', curdir: '.', pardir: '..', devnull: 'NUL',
        getcwd: moduleFn('getcwd', function () { return Win.fs.norm('C:\\') || 'C:\\'; }),
        getcwdb: moduleFn('getcwdb', function () { return Win.fs.norm('C:\\'); }),
        listdir: moduleFn('listdir', function (a) { var out = Win.fs.list(a.length ? safePath(a[0]) : 'C:\\'); return out ? out.map(function (n) { return n.name; }) : []; }),
        mkdir: moduleFn('mkdir', function (a) { Win.fs.mkdir(safePath(a[0])); return null; }),
        makedirs: moduleFn('makedirs', function (a) { Win.fs.mkdir(safePath(a[0])); return null; }),
        remove: moduleFn('remove', function (a) { Win.fs.remove(safePath(a[0])); return null; }),
        unlink: moduleFn('unlink', function (a) { Win.fs.remove(safePath(a[0])); return null; }),
        rmdir: moduleFn('rmdir', function (a) { Win.fs.remove(safePath(a[0])); return null; }),
        rename: moduleFn('rename', function (a) { Win.fs.rename(safePath(a[0]), safePath(a[1])); return null; }),
        stat: moduleFn('stat', function (a) { return Win.fs.stats(safePath(a[0])) || {}; }),
        path: null
      };
      osMod.path = makeModule('os.path', {
        join: moduleFn('join', function (a) {
          var parts = a.map(function (v) { return display(v, lang); }).filter(Boolean);
          if (!parts.length) return '';
          return parts.slice(1).reduce(function (out, part) {
            return out.replace(/[\\/]+$/, '') + '\\' + part.replace(/^[\\/]+/, '');
          }, parts[0]);
        }),
        basename: moduleFn('basename', function (a) { return Win.fs.baseName(safePath(a[0])); }),
        dirname: moduleFn('dirname', function (a) { return Win.fs.parentPath(safePath(a[0])); }),
        exists: moduleFn('exists', function (a) { return !!Win.fs.resolve(safePath(a[0])); }),
        isfile: moduleFn('isfile', function (a) { var n = Win.fs.resolve(safePath(a[0])); return !!(n && n.type === 'file'); }),
        isdir: moduleFn('isdir', function (a) { var n = Win.fs.resolve(safePath(a[0])); return !!(n && n.type === 'dir'); }),
        splitext: moduleFn('splitext', function (a) { var p = safePath(a[0]), ext = Win.fs.extName(p); return makeTuple([p.slice(0, p.length - ext.length), ext]); }),
        abspath: moduleFn('abspath', function (a) { return Win.fs.norm(safePath(a[0])); }),
        normpath: moduleFn('normpath', function (a) { return Win.fs.norm(safePath(a[0])); })
      });
      return makeModule(name, osMod);
    }
    if (name === 'sys') {
      return makeModule(name, {
        version: '3.12.0 (WINemulator simulated)',
        version_info: makeTuple([3, 12, 0, 'final', 0]),
        platform: 'win32', executable: 'python.exe', prefix: 'C:\\Python',
        argv: ['python.exe', '<string>'],
        maxsize: 2147483647,
        exit: moduleFn('exit', function (a) { fail('SystemExit', a.length ? display(a[0], lang) : ''); }),
        stdin: null, stdout: null, stderr: null
      });
    }
    if (name === 'string') {
      return makeModule(name, {
        ascii_lowercase: 'abcdefghijklmnopqrstuvwxyz',
        ascii_uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        ascii_letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digits: '0123456789', hexdigits: '0123456789abcdefABCDEF', octdigits: '01234567',
        punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
        whitespace: ' \t\n\r\x0b\x0c',
        printable: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\x0b\x0c',
        capwords: moduleFn('capwords', function (a) { return display(a[0], lang).split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); })
      });
    }
    if (name === 'statistics') {
      function values(a) { return iterable(a[0], lang).map(num); }
      function variance(v) { if (v.length < 2) return 0; var m = v.reduce(function (x, y) { return x + y; }, 0) / v.length; return v.reduce(function (s, x) { return s + Math.pow(x - m, 2); }, 0) / (v.length - 1); }
      return makeModule(name, {
        mean: moduleFn('mean', function (a) { var v = values(a); return v.reduce(function (x, y) { return x + y; }, 0) / v.length; }),
        fmean: moduleFn('fmean', function (a) { return getModule('statistics', lang).mean(a); }),
        median: moduleFn('median', function (a) { var v = values(a).sort(function (x, y) { return x - y; }), m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }),
        mode: moduleFn('mode', function (a) { var v = values(a), best = v[0], count = 0; v.forEach(function (x) { var c = v.filter(function (y) { return y === x; }).length; if (c > count) { best = x; count = c; } }); return best; }),
        multimode: moduleFn('multimode', function (a) { return [getModule('statistics', lang).mode(a)]; }),
        variance: moduleFn('variance', function (a) { return variance(values(a)); }),
        stdev: moduleFn('stdev', function (a) { return Math.sqrt(variance(values(a))); }),
        pvariance: moduleFn('pvariance', function (a) { var v = values(a), m = getModule('statistics', lang).mean(a); return v.reduce(function (s, x) { return s + Math.pow(x - m, 2); }, 0) / v.length; }),
        pstdev: moduleFn('pstdev', function (a) { return Math.sqrt(getModule('statistics', lang).pvariance(a)); })
      });
    }
    if (name === 'itertools') {
      return makeModule(name, {
        chain: moduleFn('chain', function (a) { var out = []; a.forEach(function (v) { out = out.concat(iterable(v, lang)); }); return out; }),
        count: moduleFn('count', function (a) {
          var n = a.length ? num(a[0]) : 0, step = a.length > 1 ? num(a[1]) : 1, it;
          it = makeIterator([], lang, function () { for (var i = 0; i < LIMITS.loop; i++) { it.values.push(n); n += step; } });
          return it;
        }),
        cycle: moduleFn('cycle', function (a) {
          var v = iterable(a[0], lang), it;
          it = makeIterator([], lang, function () { for (var i = 0; i < LIMITS.loop && v.length; i++) it.values.push(v[i % v.length]); });
          return it;
        }),
        repeat: moduleFn('repeat', function (a) {
          var it, n = a.length > 1 ? int(a[1]) : LIMITS.loop;
          it = makeIterator([], lang, function () { for (var i = 0; i < n; i++) it.values.push(a[0]); });
          return it;
        }),
        product: moduleFn('product', function (a) {
          var lists = a.map(function (v) { return iterable(v, lang); });
          var out = [[]];
          lists.forEach(function (list) { var next = []; out.forEach(function (prefix) { list.forEach(function (v) { next.push(prefix.concat([v])); }); }); out = next; });
          return out.map(function (v) { return makeTuple(v); });
        }),
        permutations: moduleFn('permutations', function (a) {
          var v = iterable(a[0], lang), r = a.length > 1 ? int(a[1]) : v.length, out = [];
          (function go(current, left) {
            if (current.length === r) { out.push(makeTuple(current.slice())); return; }
            left.forEach(function (x, i) { go(current.concat([x]), left.slice(0, i).concat(left.slice(i + 1))); });
          })([], v);
          return out;
        }),
        combinations: moduleFn('combinations', function (a) {
          var v = iterable(a[0], lang), r = int(a[1]), out = [];
          (function go(start, current) {
            if (current.length === r) { out.push(makeTuple(current.slice())); return; }
            for (var i = start; i < v.length; i++) go(i + 1, current.concat([v[i]]));
          })(0, []);
          return out;
        }),
        islice: moduleFn('islice', function (a) {
          var start = a.length > 2 ? int(a[1]) : 0;
          var stop = a.length > 2 ? (a[2] === undefined ? undefined : int(a[2])) : (a[1] === undefined ? undefined : int(a[1]));
          return iterable(a[0], lang).slice(start, stop);
        })
      });
    }
    if (name === 'functools') {
      return makeModule(name, {
        reduce: moduleFn('reduce', function (a, named, ctx) {
          var values = iterable(a[1], lang);
          var acc = a.length > 2 ? a[2] : values.shift();
          values.forEach(function (v) { acc = callValue(a[0], [acc, v], {}, ctx, null, null); });
          return acc;
        }),
        lru_cache: moduleFn('lru_cache', function (a, named, ctx) {
          var fn = a[0] || (named && named.fn);
          if (!fn) return native(function (args, n, callCtx) {
            return getModule('functools', 'py').lru_cache([args[0] || (n && n.fn)], n || {}, callCtx);
          }, 'lru_cache');
          var cache = new Map();
          return native(function (args, n, callCtx) {
            var key = display(args, 'py') + '|' + display(n || {}, 'py');
            if (cache.has(key)) return cache.get(key);
            var value = callValue(fn, args, n || {}, callCtx || ctx, null, null);
            cache.set(key, value);
            return value;
          }, fn.name || 'lru_cache');
        }),
        partial: moduleFn('partial', function (a) {
          var fn = a[0], bound = a.slice(1);
          return native(function (rest) { return callValue(fn, bound.concat(rest), {}, currentCtx, null, null); }, fn.name);
        }),
        cmp_to_key: moduleFn('cmp_to_key', function (a, named, ctx) {
          var cmp = a[0];
          return native(function (args) { return { __cmpKey: true, value: args[0], cmp: cmp, ctx: ctx }; }, 'cmp_to_key');
        })
      });
    }
    if (name === 'collections') {
      return makeModule(name, {
        Counter: moduleFn('Counter', function (a) {
          var d = makeDict();
          iterable(a[0], lang).forEach(function (v) { d.map.set(v, (d.map.get(v) || 0) + 1); });
          return d;
        }),
        defaultdict: moduleFn('defaultdict', function (a) { var d = makeDict(); d.__default__ = a[0]; return d; }),
        OrderedDict: moduleFn('OrderedDict', function (a) { return makeDict(a.length ? iterable(a[0], lang) : []); }),
        deque: moduleFn('deque', function (a) { return a.length ? iterable(a[0], lang).slice() : []; }),
        namedtuple: moduleFn('namedtuple', function (a) {
          var name = display(a[0], lang);
          var fields = String(display(a[1], lang)).replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
          var members = Object.create(null);
          members.__init__ = native(function (args, named, callCtx, self) {
            if (!self) return null;
            fields.forEach(function (key, i) { self.fields[key] = args[i]; });
            return null;
          }, '__init__');
          members.__repr__ = native(function (args, named, callCtx, self) {
            return name + '(' + fields.map(function (k) { return display(self && self.fields[k], 'py', true); }).join(', ') + ')';
          }, '__repr__');
          var cls = makeClass(name, [], members, 'py');
          cls.fields = fields;
          cls.members._fields = makeTuple(fields);
          Object.keys(members).forEach(function (k) { members[k].cls = cls; });
          return cls;
        })
      });
    }
    if (name === 'heapq') {
      function heap(a) { return iterable(a[0], lang).slice().sort(function (x, y) { return num(x) - num(y); }); }
      return makeModule(name, {
        heapify: moduleFn('heapify', function (a) { var v = heap(a); a[0].length = 0; v.forEach(function (x) { a[0].push(x); }); return null; }),
        heappush: moduleFn('heappush', function (a) { a[0].push(a[1]); a[0].sort(function (x, y) { return num(x) - num(y); }); return null; }),
        heappop: moduleFn('heappop', function (a) { return a[0].shift(); }),
        nsmallest: moduleFn('nsmallest', function (a) { return heap(a).slice(0, int(a[0])); }),
        nlargest: moduleFn('nlargest', function (a) { return heap(a).slice(-int(a[0])).reverse(); })
      });
    }
    if (name === 'copy') {
      return makeModule(name, {
        copy: moduleFn('copy', function (a) { return cloneValue(a[0], false); }),
        deepcopy: moduleFn('deepcopy', function (a) { return cloneValue(a[0], true); })
      });
    }
    if (name === 'uuid') {
      return makeModule(name, {
        uuid4: moduleFn('uuid4', function () {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        })
      });
    }
    if (name === 'fs' || name === 'node:fs') {
      return makeModule(name, {
        readFileSync: moduleFn('readFileSync', function (a) { var v = Win.fs.read(display(a[0], lang)); return v === null ? fail('Error', 'ENOENT') : v; }),
        writeFileSync: moduleFn('writeFileSync', function (a) { Win.fs.write(display(a[0], lang), display(a[1], lang), { kind: 'text', app: 'js' }); return undefined; }),
        existsSync: moduleFn('existsSync', function (a) { return !!Win.fs.resolve(display(a[0], lang)); }),
        mkdirSync: moduleFn('mkdirSync', function (a) { Win.fs.mkdir(display(a[0], lang)); return undefined; }),
        unlinkSync: moduleFn('unlinkSync', function (a) { Win.fs.remove(display(a[0], lang)); return undefined; }),
        readdirSync: moduleFn('readdirSync', function (a) { return (Win.fs.list(display(a[0], lang)) || []).map(function (n) { return n.name; }); })
      });
    }
    return null;
  }
  function buildJavaScriptBuiltins() {
    var b = Object.create(null);
    function writeLine(prefix, a, ctx) {
      ctx.write(prefix + a.map(function (v) { return display(v, 'js'); }).join(' ') + '\n');
    }
    var console = {
      log: native(function (a, named, ctx) { writeLine('', a, ctx); }, 'log'),
      info: native(function (a, named, ctx) { writeLine('', a, ctx); }, 'info'),
      warn: native(function (a, named, ctx) { writeLine('Warning: ', a, ctx); }, 'warn'),
      error: native(function (a, named, ctx) { writeLine('Error: ', a, ctx); }, 'error'),
      debug: native(function (a, named, ctx) { writeLine('', a, ctx); }, 'debug'),
      table: native(function (a, named, ctx) { writeLine('', a, ctx); }, 'table'),
      dir: native(function (a, named, ctx) { writeLine('', a, ctx); }, 'dir'),
      trace: native(function (a, named, ctx) { writeLine('Trace: ', a, ctx); }, 'trace'),
      assert: native(function (a, named, ctx) { if (!bool(a[0])) writeLine('Assertion failed: ', a.slice(1), ctx); }, 'assert'),
      count: native(function (a, named, ctx) { writeLine('count: ', a, ctx); }, 'count'),
      time: native(function () { return null; }, 'time'),
      timeEnd: native(function (a, named, ctx) { writeLine('timer: ', a, ctx); }, 'timeEnd'),
      group: native(function () { return null; }, 'group'),
      groupEnd: native(function () { return null; }, 'groupEnd'),
      clear: native(function () { return null; }, 'clear')
    };
    b.console = console;
    b.help = native(function (a, named, ctx) { ctx.write(helpTextFor('js')); return null; }, 'help');
    b.print = native(function (a, named, ctx) { writeLine('', a, ctx); }, 'print');
    b.alert = native(function (a, named, ctx) { writeLine('', a, ctx); }, 'alert');
    b.prompt = native(function (a, named, ctx) {
      if (a.length) ctx.write(display(a[0], 'js'));
      return String(ctx.readInput() || '').replace(/[\r\n]+$/, '');
    }, 'prompt');
    b.parseInt = native(function (a) {
      var s = String(display(a[0], 'js')).trim(), radix = a.length > 1 ? int(a[1]) : 10;
      if (radix < 2 || radix > 36) return NaN;
      if (radix === 16) s = s.replace(/^0x/i, '');
      var digits = '0-' + (radix <= 10 ? String(radix - 1) : '9');
      if (radix > 10) digits += 'a-' + String.fromCharCode(97 + Math.min(radix - 11, 25));
      var m = s.match(new RegExp('^[+-]?[' + digits + ']+', 'i'));
      return m ? parseInt(m[0], radix) : NaN;
    }, 'parseInt');
    b.parseFloat = native(function (a) { var m = String(display(a[0], 'js')).trim().match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/); return m ? Number(m[0]) : NaN; }, 'parseFloat');
    b.isNaN = native(function (a) { return isNaN(num(a[0])); }, 'isNaN');
    b.isFinite = native(function (a) { return isFinite(num(a[0])); }, 'isFinite');
    b.encodeURI = native(function (a) { try { return encodeURI(String(display(a[0], 'js'))); } catch (e) { return String(a[0]); } }, 'encodeURI');
    b.encodeURIComponent = native(function (a) { try { return encodeURIComponent(String(display(a[0], 'js'))); } catch (e) { return String(a[0]); } }, 'encodeURIComponent');
    b.decodeURI = native(function (a) { try { return decodeURI(String(display(a[0], 'js'))); } catch (e) { return String(a[0]); } }, 'decodeURI');
    b.decodeURIComponent = native(function (a) { try { return decodeURIComponent(String(display(a[0], 'js'))); } catch (e) { return String(a[0]); } }, 'decodeURIComponent');
    b.escape = native(function (a) { return String(display(a[0], 'js')); }, 'escape');
    b.unescape = native(function (a) { return String(display(a[0], 'js')); }, 'escape');
    b.structuredClone = native(function (a) { return plain(a[0]); }, 'structuredClone');
    b.eval = undefined; // intentionally unavailable in the sandbox
    b.Function = undefined;

    var mathNames = ['abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'clz32',
      'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'hypot', 'imul', 'log', 'log10', 'log1p', 'log2',
      'max', 'min', 'pow', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc'];
    var math = {
      E: Math.E, LN2: Math.LN2, LN10: Math.LN10, LOG2E: Math.LOG2E, LOG10E: Math.LOG10E,
      PI: Math.PI, SQRT1_2: Math.SQRT1_2, SQRT2: Math.SQRT2
    };
    mathNames.forEach(function (n) {
      math[n] = native(function (a) {
        var values = Array.prototype.slice.call(a);
        try { return Math[n].apply(null, values.map(num)); }
        catch (e) { return NaN; }
      }, n);
    });
    math.random = native(function () { return Math.random(); }, 'random');
    b.Math = math;

    b.JSON = {
      stringify: native(function (a) { try { return JSON.stringify(plain(a[0])); } catch (e) { return undefined; } }, 'stringify'),
      parse: native(function (a) { try { return JSON.parse(String(display(a[0], 'js'))); } catch (e) { fail('SyntaxError', 'Unexpected token in JSON'); } }, 'parse')
    };

    var objCtor = jsCtor('Object', function (a) { return a.length ? plain(a[0]) : {}; });
    objCtor.keys = native(function (a) { return Object.keys(a[0] || {}); }, 'keys');
    objCtor.values = native(function (a) { var o = a[0] || {}; return Object.keys(o).map(function (k) { return o[k]; }); }, 'values');
    objCtor.entries = native(function (a) { var o = a[0] || {}; return Object.keys(o).map(function (k) { return [k, o[k]]; }); }, 'entries');
    objCtor.assign = native(function (a) { var out = a[0] || {}; a.slice(1).forEach(function (src) { if (src) Object.keys(src).forEach(function (k) { out[k] = src[k]; }); }); return out; }, 'assign');
    objCtor.create = native(function (a) { return Object.create(null); }, 'create');
    objCtor.freeze = native(function (a) { return a[0]; }, 'freeze');
    objCtor.isFrozen = native(function (a) { return false; }, 'isFrozen');
    objCtor.getPrototypeOf = native(function () { return null; }, 'getPrototypeOf');
    objCtor.getOwnPropertyNames = native(function (a) { return Object.keys(a[0] || {}); }, 'getOwnPropertyNames');
    b.Object = objCtor;

    var arrayCtor = jsCtor('Array', function (a) {
      if (a.length === 1 && isNum(a[0])) return new Array(Math.max(0, int(a[0])));
      return a.slice();
    });
    arrayCtor.from = native(function (a) { return iterable(a[0], 'js').slice(); }, 'from');
    arrayCtor.of = native(function (a) { return a.slice(); }, 'of');
    arrayCtor.isArray = native(function (a) { return Array.isArray(a[0]); }, 'isArray');
    b.Array = arrayCtor;

    var numberCtor = jsCtor('Number', function (a) { return num(a[0]); });
    numberCtor.MAX_VALUE = Number.MAX_VALUE; numberCtor.MIN_VALUE = Number.MIN_VALUE;
    numberCtor.MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; numberCtor.MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
    numberCtor.NaN = NaN; numberCtor.POSITIVE_INFINITY = Infinity; numberCtor.NEGATIVE_INFINITY = -Infinity;
    numberCtor.isInteger = native(function (a) { return Number.isInteger(num(a[0])); }, 'isInteger');
    numberCtor.isNaN = native(function (a) { return isNaN(num(a[0])); }, 'isNaN');
    numberCtor.isFinite = native(function (a) { return isFinite(num(a[0])); }, 'isFinite');
    numberCtor.isSafeInteger = native(function (a) { return Number.isSafeInteger(num(a[0])); }, 'isSafeInteger');
    numberCtor.parseInt = b.parseInt; numberCtor.parseFloat = b.parseFloat;
    b.Number = numberCtor;

    var stringCtor = jsCtor('String', function (a) { return display(a.length ? a[0] : '', 'js'); });
    stringCtor.fromCharCode = native(function (a) { return String.fromCharCode.apply(null, a.map(int)); }, 'fromCharCode');
    stringCtor.fromCodePoint = native(function (a) { return String.fromCodePoint.apply(null, a.map(int)); }, 'fromCodePoint');
    stringCtor.raw = native(function (a) { return String(display(a[0], 'js')); }, 'raw');
    b.String = stringCtor;

    var boolCtor = jsCtor('Boolean', function (a) { return bool(a[0]); });
    b.Boolean = boolCtor;

    function builtinClass(name, fn) {
      var f = jsCtor(name, fn);
      f.__ctor = fn;
      return f;
    }
    b.Date = builtinClass('Date', function (a) {
      if (!a.length) return makeDate();
      if (a.length === 1 && a[0] && a[0].__date) return makeDate(a[0].value.getTime());
      if (a.length === 1 && typeof a[0] === 'string') return makeDate(new Date(a[0]).getTime());
      return makeDate(new Date(int(a[0]), a.length > 1 ? int(a[1]) : 0, a.length > 2 ? int(a[2]) : 1, a.length > 3 ? int(a[3]) : 0, a.length > 4 ? int(a[4]) : 0, a.length > 5 ? int(a[5]) : 0).getTime());
    });
    b.Date.now = native(function () { return Date.now(); }, 'now');
    b.Date.parse = native(function (a) { return Date.parse(String(display(a[0], 'js'))); }, 'parse');
    b.Date.UTC = native(function (a) { return Date.UTC(int(a[0]), int(a[1] || 0), int(a[2] || 1), int(a[3] || 0), int(a[4] || 0), int(a[5] || 0)); }, 'UTC');
    b.RegExp = builtinClass('RegExp', function (a) { return makeRegExp(a[0], a[1]); });
    b.Map = builtinClass('Map', function (a) { return makeMap(a.length ? a[0] : []); });
    b.Set = builtinClass('Set', function (a) { return makeJSSet(a.length ? iterable(a[0], 'js') : []); });
    b.WeakMap = builtinClass('WeakMap', function () { return makeMap(); });
    b.WeakSet = builtinClass('WeakSet', function () { return makeJSSet(); });

    ['Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'SystemExit', 'TypeError', 'URIError'].forEach(function (n) {
      b[n] = errorCtor(n, 'js');
    });
    b.Error.captureStackTrace = native(function () { return undefined; }, 'captureStackTrace');

    b.Reflect = {
      apply: native(function (a, named, ctx) { return callValue(a[0], iterable(a[2], 'js'), {}, ctx, a[1], null); }, 'apply'),
      get: native(function (a, named, ctx) { return getMember(a[0], display(a[1], 'js'), 'js', ctx); }, 'get'),
      has: native(function (a) { return a[0] ? has(a[0], display(a[1], 'js')) : false; }, 'has'),
      ownKeys: native(function (a) { return Object.keys(a[0] || {}); }, 'ownKeys'),
      deleteProperty: native(function (a) { if (a[0]) delete a[0][display(a[1], 'js')]; return true; }, 'deleteProperty')
    };
    b.Proxy = jsCtor('Proxy', function (a) { return a[0]; });
    b.Symbol = {
      iterator: '@@iterator', asyncIterator: '@@asyncIterator', toStringTag: '@@toStringTag',
      for: native(function (a) { return '@@' + display(a[0], 'js'); }, 'for')
    };
    b.BigInt = native(function (a) { return int(a[0]); }, 'BigInt');
    var timerId = 0;
    b.setTimeout = native(function (a) {
      var id = ++timerId;
      if ((a[0] && a[0].__native) || (a[0] && a[0].__function)) callValue(a[0], a.slice(1), {}, currentCtx, null, null);
      return id;
    }, 'setTimeout');
    b.clearTimeout = native(function () { return undefined; }, 'clearTimeout');
    b.setInterval = native(function () { return ++timerId; }, 'setInterval');
    b.clearInterval = native(function () { return undefined; }, 'clearInterval');
    b.queueMicrotask = b.setTimeout;

    b.require = native(function (a) {
      var mod = getModule(String(display(a[0], 'js')).replace(/^node:/, ''), 'js');
      if (!mod) fail('Error', "Cannot find module '" + display(a[0], 'js') + "'");
      return mod;
    }, 'require');
    b.process = {
      version: 'v20.0.0 (WINemulator simulated)',
      versions: { node: '20.0.0', v8: '11.0.0' },
      platform: 'win32', arch: 'x64',
      argv: ['node', '<eval>'],
      env: { OS: 'Windows_NT' },
      cwd: native(function () { return Win.fs.norm('C:\\'); }, 'cwd'),
      exit: native(function (a) { fail('SystemExit', a.length ? display(a[0], 'js') : ''); }, 'exit')
    };
    b.exports = {};
    b.module = { exports: b.exports };
    b.__dirname = 'C:\\';
    b.__filename = 'C:\\[eval]';
    b.globalThis = b;
    b.global = b;
    b.self = b;
    return b;
  }

  function execImport(stmt, env, ctx) {
    if (stmt.module) {
      var mod = getModule(stmt.module, env.lang);
      if (!mod) fail(env.lang === 'py' ? 'ImportError' : 'Error', "No module named '" + stmt.module + "'");
      stmt.names.forEach(function (name) {
        if (name.alias === '*') {
          Object.keys(mod).forEach(function (k) { if (!/^__/.test(k)) declareVar(env, k, mod[k]); });
        } else {
          var value = getMember(mod, name.name, env.lang, ctx);
          if (value === undefined) fail('ImportError', "cannot import name '" + name.name + "' from '" + stmt.module + "'");
          declareVar(env, name.alias, value);
        }
      });
      return null;
    }
    stmt.names.forEach(function (name) {
      var parts = name.name.split('.');
      var mod = getModule(parts[0], env.lang);
      if (!mod) fail('ImportError', "No module named '" + parts[0] + "'");
      for (var i = 1; i < parts.length; i++) {
        var next = getMember(mod, parts[i], env.lang, ctx);
        if (next && next.__module) mod = next;
      }
      declareVar(env, name.alias, mod);
    });
    return null;
  }
  /* ----------------------------------------------------------- public API */
  function formatRuntimeError(err, lang) {
    if (err && err.__error) return err.name + ': ' + err.message;
    if (err && err.name && err.message) return err.name + ': ' + err.message;
    return display(err, lang);
  }

  function runSource(src, lang, write, readInput) {
    lang = lang === 'js' ? 'js' : 'py';
    var sink = typeof write === 'function' ? write : function () {};
    var collected = '';
    var ctx = {
      steps: 0, depth: 0, yields: [],
      write: function (s) {
        var text = String(s);
        if (collected.length < LIMITS.output) collected += text;
        sink(text);
      },
      readInput: function () {
        return typeof readInput === 'function' ? (readInput() || '') : '';
      },
      builtins: null
    };
    var previousCtx = currentCtx;
    currentCtx = ctx;
    var builtins = lang === 'py' ? buildPythonBuiltins() : buildJavaScriptBuiltins();
    ctx.builtins = builtins;
    var env = newEnv(null, lang);
    env.builtins = builtins;
    env.v.__name__ = '__main__';
    try {
      var tokens = tokenize(String(src === null || src === undefined ? '' : src), lang);
      var program = new Parser(tokens, lang).parseProgram();
      var result = execList(program, env, ctx);
      if (result && result.type === 'return' && result.value !== undefined) {
        ctx.write(display(result.value, lang) + '\n');
      }
      return { ok: true, value: result && result.value, output: collected, error: null };
    } catch (e) {
      var message = formatRuntimeError(e, lang);
      ctx.write(message + '\n');
      return {
        ok: false,
        value: null,
        output: collected,
        error: e && e.__error ? e : { __error: true, name: (e && e.name) || 'Error', message: message.replace(/^[^:]+:\s*/, ''), stack: e && e.stack }
      };
    } finally {
      currentCtx = previousCtx;
    }
  }

  /* ------------------------------------------------------- compatibility */
  var TESTS = [
    // Python: literals, operators and containers
    ['py', 'print(1 + 2 * 3, 7 // 2, 7 % 3, 2 ** 5)', '7 3 1 32'],
    ['py', 'print(-5 % 3, 1 == True, 0 < 2 < 4)', '1 True True'],
    ['py', 'print("a" + "b", "x" * 3, [1] + [2])', 'ab xxx [1, 2]'],
    ['py', 'x = [1, 2, 3]; x.append(4); print(x, len(x), x[-1])', '[1, 2, 3, 4] 4 4'],
    ['py', 'd = {"a": 1}; d["b"] = 2; print(d["b"], len(d), sorted(d.keys()))', '2 2 [\'a\', \'b\']'],
    ['py', 's = {1, 2, 2}; s.add(3); print(len(s), 2 in s)', '3 True'],
    ['py', 't = (1, 2); print(t[1], len(t), list(t))', '2 2 [1, 2]'],
    ['py', 'print(list(range(2, 8, 2)), "abc"[::-1])', '[2, 4, 6] cba'],
    ['py', 'print(int("ff", 16), float("1.5"), round(3.14159, 2), abs(-4))', '255 1.5 3.14 4'],
    ['py', 'print(bin(5), oct(8), hex(255), chr(65), ord("A"))', '0b101 0o10 0xff A 65'],
    ['py', 'print(f"{2 + 3}!", "{}".format(7))', '5! 7'],
    ['py', 'a, b = 1, 2; a, b = b, a; print(a, b)', '2 1'],
    ['py', 'print(min([3, 1, 2]), max(3, 9), sum([1, 2, 3]), sorted([3, 1, 2]))', '1 9 6 [1, 2, 3]'],
    ['py', 'print(list(map(lambda x: x * 2, [1, 2, 3])))', '[2, 4, 6]'],
    ['py', 'print(any([0, 1]), all([1, 1]), bool([]), type(3).__name__)', 'True True False int'],
    // Python: control flow and functions
    ['py', 'if 2 > 1: print("yes")\nelse: print("no")', 'yes'],
    ['py', 'for i in range(3):\n    if i == 1: continue\n    print(i)', '0\n2'],
    ['py', 'i = 0\nwhile i < 3:\n    i += 1\nprint(i)', '3'],
    ['py', 'def add(a, b=5):\n    return a + b\nprint(add(2), add(2, 3))', '7 5'],
    ['py', 'def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\nprint(fact(5))', '120'],
    ['py', 'print([x * x for x in range(5) if x % 2 == 0])', '[0, 4, 16]'],
    ['py', 'print({k: v for k, v in [("a", 1), ("b", 2)]})', '{\'a\': 1, \'b\': 2}'],
    ['py', 'print(list(enumerate(["a", "b"])), list(zip([1, 2], [3, 4])))', '[(0, \'a\'), (1, \'b\')] [(1, 3), (2, 4)]'],
    ['py', 'try:\n    1 / 0\nexcept ZeroDivisionError as e:\n    print("caught")', 'caught'],
    ['py', 'try:\n    raise ValueError("bad")\nexcept (TypeError, ValueError):\n    print("tuple")', 'tuple'],
    ['py', 'try:\n    print("try")\nfinally:\n    print("finally")', 'try\nfinally'],
    ['py', 'class Dog:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return self.name + " woof"\nprint(Dog("Rex").speak())', 'Rex woof'],
    ['py', 'class A:\n    def hi(self): return "A"\nclass B(A):\n    def hi(self): return super().hi() + "B"\nprint(B().hi())', 'AB'],
    ['py', 'with open("C:\\\My Documents\\\\self-test.txt", "w") as f:\n    f.write("ok")\nprint(open("C:\\\My Documents\\\\self-test.txt").read())', 'ok'],
    // Python: modules
    ['py', 'import math\nprint(round(math.sqrt(16), 2), math.floor(2.9), math.factorial(5))', '4 2 120'],
    ['py', 'from math import pi, ceil as c\nprint(round(pi, 2), c(1.2))', '3.14 2'],
    ['py', 'import random\nrandom.seed(1); print(0 <= random.random() < 1, random.randint(2, 2))', 'True 2'],
    ['py', 'import json\nprint(json.loads(json.dumps({"a": 1}))["a"])', '1'],
    ['py', 'import re\nprint(bool(re.match("a+", "aaab")), re.findall("[0-9]+", "a12b3"))', 'True [\'12\', \'3\']'],
    ['py', 'import statistics\nprint(statistics.mean([1, 2, 3]), statistics.median([1, 2, 3]))', '2 2'],
    ['py', 'import itertools\nprint(list(itertools.chain([1], [2]))); print("".join(x[0] + x[1] for x in itertools.product("ab", "12")))', '[1, 2]\na1a2b1b2'],
    ['py', 'import os\nprint(os.path.basename("C:\\\Logs\\\\a.txt"), os.path.exists("C:"))', 'a.txt True'],
    // JavaScript: expressions and statements
    ['js', 'console.log(1 + 2 * 3, 7 % 3, 2 ** 3 ** 2)', '7 1 512'],
    ['js', 'console.log(typeof 1, typeof "a", typeof true, typeof null, typeof {})', 'number string boolean object object'],
    ['js', 'let x = 1; x += 4; x++; console.log(x, --x)', '6 5'],
    ['js', 'const o = {a: 1, b: 2}; o.a = 9; console.log(o.a, Object.keys(o).join(","))', '9 a,b'],
    ['js', 'const {a} = {a: 7}; console.log(a)', '7'],
    ['js', 'if (false) { console.log("no"); } else { console.log("yes"); }', 'yes'],
    ['js', 'for (let i = 0; i < 3; i++) { if (i === 1) continue; console.log(i); }', '0\n2'],
    ['js', 'const v = [1, 2, 3]; for (const n of v) console.log(n);', '1\n2\n3'],
    ['js', 'for (const k in {a: 1, b: 2}) console.log(k);', 'a\nb'],
    ['js', 'let i = 0; while (i < 2) { i++; } do { i++; } while (i < 4); console.log(i)', '4'],
    ['js', 'function f(a, b = 2) { return a + b; } console.log(f(3), f(3, 4))', '5 7'],
    ['js', 'const twice = x => x * 2; console.log([1, 2, 3].map(twice).join("-"))', '2-4-6'],
    ['js', 'console.log([1, 2, 3].filter(x => x > 1).reduce((a, b) => a + b, 0))', '5'],
    ['js', 'console.log([3, 1, 2].sort((a, b) => a - b).join(","))', '1,2,3'],
    ['js', 'switch (2) { case 1: console.log("one"); break; default: console.log("other"); }', 'other'],
    ['js', 'try { throw new Error("x"); } catch (e) { console.log(e.name); } finally { console.log("done"); }', 'Error\ndone'],
    ['js', 'console.log(1 == "1", 1 === "1", null ?? 5, false || "x")', 'true false 5 x'],
    ['js', 'console.log(`${1 + 2} items`, "a".repeat(3))', '3 items aaa'],
    ['js', 'console.log(JSON.stringify({a: 1}), JSON.parse("{\\"b\\":2}").b)', '{"a":1} 2'],
    ['js', 'console.log(Math.max(1, 9), Math.floor(2.9), Math.PI.toFixed(2))', '9 2 3.14'],
    ['js', 'const d = new Date(2020, 0, 2); console.log(d.getFullYear(), d.getMonth() + 1)', '2020 1'],
    ['js', 'const m = new Map(); m.set("a", 1); console.log(m.get("a"), m.has("b"))', '1 false'],
    ['js', 'const s = new Set([1, 2, 2]); console.log(s.size, s.has(2))', '2 true'],
    ['js', 'class A { constructor(n) { this.n = n; } hi() { return "A" + this.n; } }\nclass B extends A { hi() { return super.hi() + "!"; } }\nconsole.log(new B(2).hi())', 'A2!'],
    ['js', 'console.log("a,b,c".split(",").join("-"), "  x ".trim(), "Hello".toLowerCase())', 'a-b-c x hello'],
    ['js', 'console.log(parseInt("12px"), parseFloat("3.5kg"), isNaN("x"))', '12 3.5 true'],
    ['js', 'const fs = require("fs"); console.log(typeof fs.readFileSync)', 'function'],
    ['js', 'console.log(process.version.indexOf("20") === 1)', 'true'],
    // Python: advanced runtime audit coverage
    ['py', 'print(round(2.5), round(3.5), round(-2.5), divmod(-7, 3))', '2 4 -2 (-3, 2)'],
    ['py', 'print(list(zip([1,2],[3,4])), list(map(lambda x:x*2,[1,2])), list(filter(lambda x:x>1,[1,2])))', '[(1, 3), (2, 4)] [2, 4] [2]'],
    ['py', 'x=[1,2,3,4]; print(x[1:], x[:2], x[::2])', '2 [1, 2] [1, 3]'],
    ['py', 'import functools\n@functools.lru_cache\ndef fib(n):\n    return n if n < 2 else fib(n-1)+fib(n-2)\nprint(fib(10))', '55'],
    ['py', 'from functools import cmp_to_key\ndef cmp(a,b): return (a>b)-(a<b)\nprint(sorted([3,1,2], key=cmp_to_key(cmp)))', '[1, 2, 3]'],
    ['py', 'from collections import namedtuple\nP = namedtuple("P", "x y")\np = P(1,2)\nprint(p.x, p.y, p._fields)', "1 2 ('x', 'y')"],
    ['py', 'import copy\na=[[1]]\nb=copy.deepcopy(a)\nb[0][0]=9\nprint(a, b)', '[[1]] [[9]]'],
    ['py', 'with open("C:\\\\multi.txt","w") as f:\n    f.write("a"); f.write("b")\nprint(open("C:\\\\multi.txt").read())', 'ab'],
    ['py', 'f=open("C:\\\\edit.txt","w+"); f.write("abc"); f.seek(1); f.write("Z"); f.close(); print(open("C:\\\\edit.txt").read())', 'aZbc'],
    ['py', 'class X:\n    def __init__(self): self.v=1\nx=X()\nprint(hasattr(x,"v"), getattr(x,"v"), getattr(x,"z",9))\nsetattr(x,"v",5); print(x.v)\ndelattr(x,"v"); print(hasattr(x,"v"))', 'True 1 9\n5\nFalse'],
    ['py', 'try:\n    import sys\n    sys.exit(3)\nexcept SystemExit:\n    print("exit")', 'exit'],
    ['py', 'print(f"{255:#x}", f"{7:+03d}", f"{1234567:,d}")', '0xff +07 1,234,567'],
    ['py', 'x=1\ndef f():\n    global x\n    x=2\nf()\nprint(x)\ndef outer():\n    y=1\n    def inner():\n        nonlocal y\n        y=3\n    inner()\n    return y\nprint(outer())', '2\n3'],
    ['py', 'def d(f):\n    def w(): return "(" + f() + ")"\n    return w\n@d\ndef hi(): return "x"\nprint(hi())', '(x)'],
    ['py', 'def g():\n    print("start")\n    yield 1\n    yield from [2,3]\nit=g()\nprint("created")\nprint(sum(it))', 'created\nstart\n6'],
    ['py', 'class C:\n    def __enter__(self): print("in")\n    def __exit__(self, *a): print("out")\ntry:\n    with C():\n        raise ValueError("x")\nexcept ValueError:\n    print("caught")', 'in\nout\ncaught'],
    ['py', 'class A:\n    def a(self): return "a"\nclass B:\n    def b(self): return "b"\nclass C(A,B): pass\nprint(C().a(), C().b())', 'a b'],
    // JavaScript: advanced runtime audit coverage
    ['js', 'class A { static hi(){return "s"} get v(){return 7} set v(x){this._v=x} } const a=new A(); a.v=8; console.log(A.hi(), a.v, a._v)', 's 7 8'],
    ['js', 'class A { constructor(n){this.n=n} hi(){return "A"+this.n} }\nclass B extends A { constructor(n){ super(n); this.n++; } hi(){ return super.hi()+"!"; } }\nconst b=new B(2); console.log(b.n, b.hi())', '3 A3!'],
    ['js', 'const {a:x=5,b:y=9,...rest}={a:1,c:3}; console.log(x,y,rest.c)', '1 9 3'],
    ['js', 'const a=[1,2]; const b=[...a,3]; const o={...{x:1},y:2}; console.log(b.join("-"), o.x+o.y)', '1-2-3 3'],
    ['js', 'const o={a:{b:1},f:()=>2}; console.log(o?.a?.b, o?.x?.y, o?.["a"].b, o?.f?.())', '1 undefined 1 2'],
    ['js', 'console.log("a1b2".match(/\\d/g).join(","), "abc".startsWith("b",1), "abc".endsWith("b",2), 10 / 2)', '1,2 true true 5'],
    ['js', 'const m=new Map([["a",1],["b",2]]); for (const [k,v] of m) console.log(k,v)', 'a 1\nb 2'],
    ['js', 'console.log(f()); function f(){ return "hoisted"; } const c=1; try { c=2; } catch(e) { console.log(e.name); }', 'hoisted\nTypeError'],
    ['js', 'console.log(parseInt("ff",16), parseInt("101",2))', '255 5'],
    ['js', 'const a=[1,2,3]; console.log(a.reverse(), [...a.keys()], a.splice(1,1,9,8), a)', '[ 3, 9, 8, 1 ] [ 0, 1, 2 ] [ 2 ] [ 3, 9, 8, 1 ]'],
    ['js', 'console.log("a-a-a".replace("a","X"), "a-a-a".replaceAll("a","X"), "abc".padStart(5,"xy"), "abc".center(7))', 'X-a-a X-X-X xyabc   abc'],
    ['js', 'function* g(){ console.log("start"); yield 1; yield 2; }\nconst it=g(); console.log("created"); console.log([...it].join("-"))', 'created\nstart\n1-2'],
    ['js', 'console.log(`a\nb`)', 'a\nb'],
    ['js', 'function f({a}={}){return a} console.log(f(), f({a:3}))', 'undefined 3'],
    ['py', 'def f(x: int) -> int:\n    return x + 1\nprint(f(2))', '3'],
    ['py', 'import itertools\nprint(list(itertools.islice(itertools.count(5,2),3)))', '[5, 7, 9]'],
    ['py', 'import re\nprint([m.group(0) for m in re.finditer("[0-9]+", "a12b3")])', "['12', '3']"],
    ['js', 'try { String.fromCodePoint(-1); } catch (e) { console.log(e.name); }', 'Error'],
    ['py', 'try:\n    1 / 0\nexcept ArithmeticError:\n    print("arith")\nexcept Exception:\n    print("generic")', 'arith'],
    ['py', 'class MyError(Exception): pass\ntry:\n    raise MyError("x")\nexcept MyError:\n    print("custom")\nexcept Exception:\n    print("generic")', 'custom'],
    ['py', 'try:\n    import sys\n    sys.exit(1)\nexcept BaseException:\n    print("base")', 'base'],
    ['py', 'import functools\n@functools.lru_cache(maxsize=4)\ndef add(a, b=1):\n    return a + b\nprint(add(2), add(2))', '3 3'],
    ['js', 'const p = new Proxy({a: 1}, {}); const {a: x} = p; console.log(p.a, x)', '1 1'],
    ['js', 'console.log(new Number(3), new String("x"), new Boolean(1), new Object({a: 2}).a, new Array(1, 2).length)', '3 x true 2 2']
  ];

  function selfTest() {
    var passed = 0, failures = [];
    TESTS.forEach(function (test, index) {
      var lang = test[0], source = test[1], expected = test[2];
      var output = '';
      var result = runSource(source, lang, function (s) { output += s; }, function () { return '40'; });
      var actual = output.replace(/\s+$/, '');
      if (result.ok && actual.indexOf(expected) > -1) passed++;
      else failures.push({ index: index, lang: lang, source: source, expected: expected, actual: actual, error: result.error && result.error.name });
    });
    return { total: TESTS.length, passed: passed, failed: failures.length, failures: failures };
  }

  Win.langsCore = {
    runSource: runSource,
    display: display,
    selfTest: selfTest,
    version: VERSION,
    limits: LIMITS,
    debug: {
      tokenize: tokenize, parseExpr: parseExpr, display: display, Parser: Parser,
      getIndex: getIndex, evalNode: evalExpr, getModule: getModule, regExpOf: regExpOf,
      evalExpr: function (source, lang) {
        lang = lang === 'js' ? 'js' : 'py';
        var builtins = lang === 'py' ? buildPythonBuiltins() : buildJavaScriptBuiltins();
        var ctx = { steps: 0, depth: 0, yields: [], write: function () {}, readInput: function () { return ''; }, builtins: builtins };
        var env = newEnv(null, lang);
        env.builtins = builtins;
        currentCtx = ctx;
        try { return evalExpr(parseExpr(source, lang), env, ctx); }
        finally { currentCtx = null; }
      }
    }
  };
  Win.langs = Win.langs || {};
  Win.langs.runSource = runSource;
  Win.langs.display = display;
  Win.langs.selfTest = selfTest;
})();
