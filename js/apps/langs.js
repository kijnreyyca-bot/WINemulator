/* WINemulator — simulated Python and JavaScript REPL applications.
 * These are deliberately small, original interpreters for a documented subset
 * of each language. They do not call eval(), fetch(), or any host API. */
(function () {
  'use strict';

  Win.apps = Win.apps || {};

  /* ------------------------------------------------------------ utilities */
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function stripBlockComments(src) {
    let out = '', quote = '', i = 0;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (quote) {
        out += c;
        if (c === '\\' && i + 1 < src.length) { out += n; i += 2; continue; }
        if (c === quote) quote = '';
        i++;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
      if (c === '/' && n === '*') {
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
          if (src[i] === '\n') out += '\n';
          i++;
        }
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }

  function stripComment(line, lang) {
    let quote = '', out = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i], n = line[i + 1];
      if (quote) {
        out += c;
        if (c === '\\' && i + 1 < line.length) { out += n; i++; }
        else if (c === quote) quote = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
      if (lang === 'py' && c === '#') break;
      if (lang === 'js' && c === '/' && n === '/') break;
      out += c;
    }
    return out;
  }

  function splitTop(text, sep, lang) {
    let quote = '', depth = 0, start = 0, out = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (c === quote) quote = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if ('([{'.indexOf(c) > -1) depth++;
      if (')]}'.indexOf(c) > -1) depth--;
      if (c === sep && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
    }
    out.push(text.slice(start).trim());
    return out;
  }

  function topChar(text, needle, lang) {
    let quote = '', depth = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (c === quote) quote = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if ('([{'.indexOf(c) > -1) depth++;
      if (')]}'.indexOf(c) > -1) depth--;
      if (c === needle && depth === 0) return i;
    }
    return -1;
  }

  function countIndent(s) {
    let n = 0;
    while (n < s.length && (s[n] === ' ' || s[n] === '\t')) n += s[n] === '\t' ? 4 : 1;
    return n;
  }

  /* --------------------------------------------------------------- lexer */
  const OPS = ['===', '!==', '**', '//', '>=', '<=', '&&', '||', '==', '!=',
    '+=', '-=', '*=', '/=', '%=', '++', '--', '=>'];

  function tokenize(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let s = '';
        while (i < src.length && /[0-9.]/.test(src[i])) s += src[i++];
        if ((src[i] === 'e' || src[i] === 'E') && /[0-9+-]/.test(src[i + 1] || '')) {
          s += src[i++];
          if (src[i] === '+' || src[i] === '-') s += src[i++];
          while (i < src.length && /[0-9]/.test(src[i])) s += src[i++];
        }
        out.push({ type: 'num', value: Number(s) });
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        const q = c; i++;
        let s = '';
        while (i < src.length && src[i] !== q) {
          if (src[i] === '\\' && i + 1 < src.length) {
            i++;
            const e = src[i++];
            s += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e;
          } else s += src[i++];
        }
        if (src[i] === q) i++;
        out.push({ type: 'str', value: s });
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        let s = '';
        while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) s += src[i++];
        out.push({ type: 'id', value: s });
        continue;
      }
      let op = null;
      for (let k = 0; k < OPS.length; k++) {
        if (src.substr(i, OPS[k].length) === OPS[k]) { op = OPS[k]; break; }
      }
      if (op) { out.push({ type: 'op', value: op }); i += op.length; continue; }
      if ('+-*/%<>=!()[]{},.;:'.indexOf(c) > -1) { out.push({ type: 'op', value: c }); i++; continue; }
      throw new Error('Unexpected character "' + c + '"');
    }
    out.push({ type: 'eof', value: '' });
    return out;
  }

  /* -------------------------------------------------------------- parser */
  const PREC = {
    '||': 1, '&&': 2, '==': 3, '!=': 3,
    '<': 4, '<=': 4, '>': 4, '>=': 4,
    '+': 5, '-': 5, '*': 6, '/': 6, '//': 6, '%': 6, '**': 7
  };

  function Parser(tokens, lang) {
    this.t = tokens; this.i = 0; this.lang = lang;
  }
  Parser.prototype.peek = function () { return this.t[this.i]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.is = function (v) { return this.peek().value === v; };
  Parser.prototype.accept = function (v) { if (this.is(v)) { this.i++; return true; } return false; };
  Parser.prototype.expect = function (v) {
    if (!this.accept(v)) throw new Error('Expected "' + v + '" but found "' + (this.peek().value || 'end of input') + '"');
  };

  Parser.prototype.normalize = function (op) {
    if (this.lang === 'py') {
      if (op === 'and') return '&&';
      if (op === 'or') return '||';
      if (op === '==') return '==';
    }
    if (op === '===') return '==';
    if (op === '!==') return '!=';
    return op;
  };

  Parser.prototype.expression = function (min) {
    min = min || 0;
    let left = this.unary();
    while (true) {
      const tok = this.peek();
      const isWord = tok.type === 'id' && this.lang === 'py' && (tok.value === 'and' || tok.value === 'or');
      if (!isWord && tok.type !== 'op') break;
      const op = this.normalize(tok.value);
      if (!has(PREC, op)) break;
      const prec = PREC[op];
      if (prec < min) break;
      this.i++;
      const right = this.expression(op === '**' ? prec : prec + 1);
      left = { t: 'bin', op: op, left: left, right: right };
    }
    return left;
  };

  Parser.prototype.unary = function () {
    const tok = this.peek();
    if ((tok.type === 'op' && (tok.value === '-' || tok.value === '+' || tok.value === '!')) ||
        (tok.type === 'id' && this.lang === 'py' && tok.value === 'not')) {
      this.i++;
      return { t: 'un', op: tok.value === 'not' ? '!' : tok.value, arg: this.unary() };
    }
    return this.postfix();
  };

  Parser.prototype.postfix = function () {
    let node = this.primary();
    while (true) {
      if (this.accept('(')) {
        const args = [];
        if (!this.is(')')) {
          do {
            const a = this.expression(0);
            if (this.is('=') && a.t === 'id') { this.i++; args.push({ name: a.name, value: this.expression(0) }); }
            else args.push({ value: a });
          } while (this.accept(','));
        }
        this.expect(')');
        node = { t: 'call', callee: node, args: args };
      } else if (this.accept('[')) {
        const index = this.expression(0);
        this.expect(']');
        node = { t: 'member', obj: node, prop: index, computed: true };
      } else if (this.accept('.')) {
        const p = this.next();
        if (p.type !== 'id' && p.type !== 'num') throw new Error('Expected a property name');
        node = { t: 'member', obj: node, prop: { t: 'lit', v: String(p.value) }, computed: false };
      } else break;
    }
    return node;
  };

  Parser.prototype.primary = function () {
    const tok = this.next();
    if (tok.type === 'num' || tok.type === 'str') return { t: 'lit', v: tok.value };
    if (tok.type === 'id') {
      if (this.lang === 'py') {
        if (tok.value === 'True') return { t: 'lit', v: true };
        if (tok.value === 'False') return { t: 'lit', v: false };
        if (tok.value === 'None') return { t: 'lit', v: null };
      } else {
        if (tok.value === 'true') return { t: 'lit', v: true };
        if (tok.value === 'false') return { t: 'lit', v: false };
        if (tok.value === 'null' || tok.value === 'undefined') return { t: 'lit', v: tok.value === 'null' ? null : undefined };
      }
      return { t: 'id', name: tok.value };
    }
    if (tok.value === '(') {
      const e = this.expression(0);
      this.expect(')');
      return e;
    }
    if (tok.value === '[') {
      const items = [];
      if (!this.is(']')) do { items.push(this.expression(0)); } while (this.accept(','));
      this.expect(']');
      return { t: 'array', items: items };
    }
    if (tok.value === '{') {
      const props = [];
      if (!this.is('}')) {
        do {
          const k = this.next();
          if (k.type !== 'id' && k.type !== 'str' && k.type !== 'num') throw new Error('Invalid object key');
          this.expect(':');
          props.push({ key: String(k.value), value: this.expression(0) });
        } while (this.accept(','));
      }
      this.expect('}');
      return { t: 'object', props: props };
    }
    throw new Error('Unexpected token "' + (tok.value || 'end of input') + '"');
  };

  function parseExpr(src, lang) {
    const p = new Parser(tokenize(String(src)), lang);
    const e = p.expression(0);
    if (p.peek().type !== 'eof') throw new Error('Unexpected token "' + p.peek().value + '"');
    return e;
  }

  /* -------------------------------------------------------- source lines */
  function splitTrailingBlock(seg) {
    const lead = (seg.match(/^\s*/) || [''])[0];
    const start = seg.indexOf('{');
    if (start < 0) return null;
    let depth = 0, quote = '';
    for (let i = start; i < seg.length; i++) {
      const c = seg[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (c === quote) quote = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const rest = seg.slice(i + 1).trim();
          if (!rest || /^else\b/.test(rest)) return null;
          return [seg.slice(0, i + 1), lead + rest];
        }
      }
    }
    return null;
  }

  function expandInlineBlock(seg, acc) {
    if (!/^\s*(if|for|while|function|else)\b/.test(seg.trim()) || !/\{[\s\S]*\}\s*$/.test(seg)) return false;
    const lead = (seg.match(/^\s*/) || [''])[0];
    const m = seg.match(/^([\s\S]*?\{\s*)([\s\S]*?)(\s*\}\s*)$/);
    if (!m) return false;
    acc.push(lead + m[1].trim());
    splitTop(m[2], ';', 'js').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) {
      acc.push(lead + '    ' + s + ';');
    });
    acc.push(lead + '}');
    return true;
  }

  function logicalLines(src, lang) {
    const out = [];
    String(src).replace(/\r/g, '').split('\n').forEach(function (raw) {
      const base = stripComment(raw, lang).replace(/\t/g, '    ');
      if (!base.trim()) return;
      let segments = [base];

      if (lang === 'js') {
        const lead = (base.match(/^\s*/) || [''])[0];
        const parts = splitTop(base, ';', 'js').map(function (s) { return s.trim(); }).filter(Boolean);
        const split = parts.length > 1 ? parts.map(function (s) { return lead + s; }).join('\n') : base;
        const expanded = split.replace(/}\s*(else\b)/, '}\n$1');
        segments = expanded.split('\n').reduce(function (acc, seg) {
          if (/^\s*(if|for|while|function|else)\b/.test(seg.trim())) {
            const tail = splitTrailingBlock(seg);
            if (tail) { expandInlineBlock(tail[0], acc) || acc.push(tail[0]); acc.push(tail[1]); return acc; }
          }
          const trailing = seg.match(/^(\s*\})\s+(?!else\b)(.+)$/);
          if (trailing) {
            acc.push(trailing[1]);
            acc.push((seg.match(/^\s*/) || [''])[0] + trailing[2].trim());
            return acc;
          }
          if (expandInlineBlock(seg, acc)) return acc;
          acc.push(seg);
          return acc;
        }, []);
      }

      segments.forEach(function (clean) {
        if (!clean.trim()) return;
        let indent = countIndent(clean);
        let text = clean.trim();
        let startsBlock = false;

        if (lang === 'js') {
          if (text === '}') { out.push({ kind: 'end', indent: Math.max(0, indent - 4) }); return; }
          if (/^(if|for|while|function|else)\b/.test(text) && /\{\s*$/.test(text)) {
            text = text.replace(/\{\s*$/, '').trim();
            startsBlock = true;
          }
        } else {
          if (/^(if|elif|else|for|while|def)\b/.test(text) && /:\s*$/.test(text)) {
            text = text.replace(/:\s*$/, '').trim();
            startsBlock = true;
          }
        }

        if (lang === 'py' && /^(if|elif|else|for|while|def)\b/.test(text)) {
          const colon = topChar(text, ':');
          if (colon > 0 && text.slice(colon + 1).trim()) {
            out.push({ kind: 'stmt', text: text.slice(0, colon).trim(), indent: indent, startsBlock: true });
            out.push({ kind: 'stmt', text: text.slice(colon + 1).trim(), indent: indent + 4 });
            return;
          }
        }
        out.push({ kind: 'stmt', text: text, indent: indent, startsBlock: startsBlock });
      });
    });
    return out;
  }

  function parseAssignment(text, lang, declare) {
    if (declare) text = text.replace(/^(let|const|var)\s+/, '').trim();
    const m = text.match(/^([A-Za-z_$][\w$]*)\s*(\*\*=|\+=|-=|\*=|\/=|%=|=)\s*([\s\S]+)$/);
    if (!m) return null;
    const op = m[2] === '=' ? 'set' : m[2].slice(0, -1);
    return { type: 'assign', name: m[1], op: op, value: parseExpr(m[3], lang), declare: !!declare };
  }

  function parseStatementLine(line, lang) {
    let text = line.text.trim();
    if (lang === 'js') text = text.replace(/;\s*$/, '').trim();
    if (/^(break|continue)\b/.test(text)) return { type: text === 'break' ? 'break' : 'continue' };
    if (/^return\b/.test(text)) return { type: 'return', value: text.replace(/^return\b\s*/, '').trim() ? parseExpr(text.replace(/^return\b\s*/, ''), lang) : { t: 'lit', v: undefined } };

    if (lang === 'py') {
      let m = text.match(/^for\s+([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+)$/);
      if (m) return { type: 'forpy', name: m[1], iterable: parseExpr(m[2], lang), body: [] };
      m = text.match(/^while\s+([\s\S]+)$/);
      if (m) return { type: 'while', cond: parseExpr(m[1], lang), body: [] };
      m = text.match(/^if\s+([\s\S]+)$/);
      if (m) return { type: 'if', cond: parseExpr(m[1], lang), body: [], els: [] };
      if (/^else$/.test(text)) return { type: 'else', body: [] };
      m = text.match(/^elif\s+([\s\S]+)$/);
      if (m) return { type: 'elif', cond: parseExpr(m[1], lang), body: [] };
      m = text.match(/^def\s+([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);
      if (m) return { type: 'func', name: m[1], params: parseParams(m[2], lang), body: [] };
    } else {
      let m = text.match(/^if\s*\(([\s\S]*?)\)\s*([\s\S]+)$/);
      if (m) return { type: 'if', cond: parseExpr(m[1], lang), body: [{ type: 'expr', expr: parseExpr(m[2], lang), echo: true }], els: [] };
      m = text.match(/^while\s*\(([\s\S]*?)\)\s*([\s\S]+)$/);
      if (m) return { type: 'while', cond: parseExpr(m[1], lang), body: [{ type: 'expr', expr: parseExpr(m[2], lang), echo: true }] };
      m = text.match(/^for\s*\(([\s\S]*)\)\s*([\s\S]+)$/);
      if (m) return parseForJS(m[1], lang, [{ type: 'expr', expr: parseExpr(m[2], lang), echo: true }]);
      m = text.match(/^if\s*\(([\s\S]*)\)$/);
      if (m) return { type: 'if', cond: parseExpr(m[1], lang), body: [], els: [] };
      m = text.match(/^while\s*\(([\s\S]*)\)$/);
      if (m) return { type: 'while', cond: parseExpr(m[1], lang), body: [] };
      m = text.match(/^for\s*\(([\s\S]*)\)$/);
      if (m) return parseForJS(m[1], lang, []);
      if (/^else\b/.test(text)) return { type: 'else', body: [] };
      m = text.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);
      if (m) return { type: 'func', name: m[1], params: parseParams(m[2], lang), body: [] };
    }

    const declare = lang === 'js' && /^(let|const|var)\s/.test(text);
    const assign = parseAssignment(text, lang, declare);
    if (assign) return assign;
    return { type: 'expr', expr: parseExpr(text, lang), echo: true };
  }

  function parseParams(s, lang) {
    if (!s.trim()) return [];
    return splitTop(s, ',', lang).filter(Boolean).map(function (p) {
      const m = p.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/);
      return m ? { name: m[1], def: parseExpr(m[2], lang) } : { name: p };
    });
  }

  function parseForJS(inner, lang, body) {
    const parts = splitTop(inner, ';', lang);
    if (parts.length !== 3) throw new Error('A JS for loop needs three parts: for (init; condition; update)');
    let init = null;
    if (parts[0].trim()) {
      init = parseAssignment(parts[0], lang, /^(let|const|var)\s/.test(parts[0])) || { type: 'expr', expr: parseExpr(parts[0], lang) };
    }
    const cond = parts[1].trim() ? parseExpr(parts[1], lang) : { t: 'lit', v: true };
    let update = null;
    const u = parts[2].trim();
    if (u) {
      let m = u.match(/^([A-Za-z_$][\w$]*)\+\+$/);
      if (m) update = { type: 'assign', name: m[1], op: '+', value: { t: 'lit', v: 1 } };
      else {
        m = u.match(/^([A-Za-z_$][\w$]*)--$/);
        if (m) update = { type: 'assign', name: m[1], op: '-', value: { t: 'lit', v: 1 } };
        else update = parseAssignment(u, lang, false) || { type: 'expr', expr: parseExpr(u, lang) };
      }
    }
    return { type: 'forjs', init: init, cond: cond, update: update, body: body };
  }

  function parseProgram(src, lang) {
    const lines = logicalLines(src, lang);
    let i = 0;
    function attachChild(target, header, base) {
      const next = lines[i];
      const hasChild = next && next.kind === 'stmt' && next.indent > base;
      if (header.startsBlock || hasChild) {
        target.body = block(hasChild ? next.indent : base + 4).stmts;
      }
    }
    function block(base) {
      const out = [];
      while (i < lines.length) {
        const line = lines[i];
        if (line.kind === 'end') { i++; break; }
        if (line.indent < base) break;
        if (line.indent > base) {
          out.push.apply(out, block(line.indent).stmts);
          continue;
        }
        let stmt = parseStatementLine(line, lang);
        i++;
        if (stmt.type === 'if' || stmt.type === 'elif' || stmt.type === 'else') {
          attachChild(stmt, line, base);
          if (stmt.type === 'if') {
            while (i < lines.length && lines[i].kind === 'stmt' && lines[i].indent === base &&
                   /^(elif|else)\b/.test(lines[i].text)) {
              const contLine = lines[i];
              let cont = parseStatementLine(contLine, lang);
              i++;
              attachChild(cont, contLine, base);
              if (cont.type === 'else') { stmt.els = cont.body; break; }
              stmt.els = [cont];
              stmt = cont;
            }
          }
          out.push(stmt);
          continue;
        }
        if (stmt.type === 'forpy' || stmt.type === 'forjs' || stmt.type === 'while' || stmt.type === 'func') {
          attachChild(stmt, line, base);
        }
        out.push(stmt);
      }
      return { stmts: out, i: i };
    }
    return block(lines.length ? lines[0].indent : 0).stmts;
  }

  /* --------------------------------------------------------------- values */
  function truthy(v) {
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === 'object') return true;
    return !!v;
  }

  function escapeString(s, lang) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  }

  function display(v, lang, nested) {
    if (v === undefined) return lang === 'py' ? 'None' : 'undefined';
    if (v === null) return lang === 'py' ? 'None' : 'null';
    if (typeof v === 'boolean') return lang === 'py' ? (v ? 'True' : 'False') : (v ? 'true' : 'false');
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return nested ? "'" + v.replace(/'/g, "\\'") + "'" : v;
    if (v.__native || v.__function) return lang === 'py' ? '<built-in function>' : '[Function]';
    if (Array.isArray(v)) return '[' + v.map(function (x) { return display(x, lang, true); }).join(', ') + ']';
    if (typeof v === 'object') {
      const keys = Object.keys(v).filter(function (k) { return !/^__/.test(k); });
      if (lang === 'py') return '{' + keys.map(function (k) { return "'" + k + "': " + display(v[k], lang, true); }).join(', ') + '}';
      return '{ ' + keys.map(function (k) { return k + ': ' + display(v[k], lang, true); }).join(', ') + ' }';
    }
    return String(v);
  }
  function typeName(v, lang) {
    if (v === undefined) return lang === 'py' ? 'NoneType' : 'undefined';
    if (v === null) return lang === 'py' ? 'NoneType' : 'object';
    if (Array.isArray(v)) return lang === 'py' ? 'list' : 'Array';
    if (v && v.__function) return 'function';
    if (typeof v === 'string') return lang === 'py' ? 'str' : 'string';
    if (typeof v === 'number') return lang === 'py' ? (Number.isInteger(v) ? 'int' : 'float') : 'number';
    if (typeof v === 'boolean') return lang === 'py' ? 'bool' : 'boolean';
    return 'object';
  }
  function native(fn) { const f = function (args, named, ctx) { return fn(args, named || {}, ctx); }; f.__native = true; return f; }

  function getMember(obj, prop, lang) {
    if (obj === null || obj === undefined) throw new Error('Cannot read property "' + prop + '" of ' + display(obj, lang));
    if (Array.isArray(obj)) {
      if (prop === 'length') return obj.length;
      if (/^\d+$/.test(prop)) return obj[Number(prop)];
      if (prop === 'join') return native(function (a) { return obj.map(function (x) { return display(x, lang); }).join(a.length ? display(a[0], lang) : ','); });
      if (prop === 'push') return native(function (a) { a.forEach(function (x) { obj.push(x); }); return obj.length; });
      if (prop === 'pop') return native(function () { return obj.pop(); });
      if (prop === 'slice') return native(function (a) { return obj.slice(a[0] || 0, a[1]); });
      if (prop === 'append' && lang === 'py') return native(function (a) { obj.push(a[0]); return null; });
    }
    if (typeof obj === 'string') {
      if (prop === 'length') return obj.length;
      if (/^\d+$/.test(prop)) return obj[Number(prop)];
      if (prop === 'upper' || prop === 'toUpperCase') return native(function () { return obj.toUpperCase(); });
      if (prop === 'lower' || prop === 'toLowerCase') return native(function () { return obj.toLowerCase(); });
      if (prop === 'strip' || prop === 'trim') return native(function () { return obj.trim(); });
      if (prop === 'split') return native(function (a) { return obj.split(a.length ? display(a[0], lang) : ''); });
      if (prop === 'replace') return native(function (a) { return obj.split(display(a[0], lang)).join(display(a[1], lang)); });
    }
    if (typeof obj === 'object' && has(obj, prop)) return obj[prop];
    return undefined;
  }

  function builtins(lang) {
    const b = {};
    b.help = native(function (a, n, ctx) {
      ctx.write((CONFIG && CONFIG[lang] ? CONFIG[lang].help : '') + '\n');
      return undefined;
    });
    if (lang === 'py') {
      b.print = native(function (a, n, ctx) {
        const sep = n.sep !== undefined ? display(n.sep, lang) : ' ';
        const end = n.end !== undefined ? display(n.end, lang) : '\n';
        ctx.write(a.map(function (x) { return display(x, lang); }).join(sep) + end);
        return null;
      });
      b.len = native(function (a) { const v = a[0]; return v && (Array.isArray(v) || typeof v === 'string') ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0); });
      b.range = native(function (a) {
        let start = a.length === 1 ? 0 : Number(a[0]), stop = a.length === 1 ? Number(a[0]) : Number(a[1]), step = a.length > 2 ? Number(a[2]) : 1;
        if (!step) throw new Error('range() arg 3 must not be zero');
        const out = [];
        if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
        else for (let i = start; i > stop; i += step) out.push(i);
        return out;
      });
      b.sum = native(function (a) { const v = a[0] || []; return (Array.isArray(v) ? v : []).reduce(function (s, x) { return s + Number(x); }, 0); });
      b.min = native(function (a) { return Math.min.apply(null, (a[0] || a).map(Number)); });
      b.max = native(function (a) { return Math.max.apply(null, (a[0] || a).map(Number)); });
      b.abs = native(function (a) { return Math.abs(Number(a[0])); });
      b.round = native(function (a) { const p = a[1] === undefined ? 0 : Number(a[1]); const m = Math.pow(10, p); return Math.round(Number(a[0]) * m) / m; });
      b.int = native(function (a) { return Math.trunc(Number(a[0])); });
      b.float = native(function (a) { return Number(a[0]); });
      b.str = native(function (a) { return display(a[0], lang); });
      b.bool = native(function (a) { return truthy(a[0]); });
      b.list = native(function (a) { return Array.isArray(a[0]) ? a[0].slice() : (a[0] === undefined ? [] : [a[0]]); });
      b.sorted = native(function (a) { return (a[0] || []).slice().sort(function (x, y) { return x < y ? -1 : x > y ? 1 : 0; }); });
      b.type = native(function (a) { return typeName(a[0], lang); });
      b.input = native(function (a, n, ctx) {
        if (a.length) ctx.write(display(a[0], lang) + ' ');
        const value = ctx.readInput ? ctx.readInput() : '';
        ctx.write(String(value) + '\n');
        return String(value);
      });
      b.math = {
        pi: Math.PI, e: Math.E,
        sqrt: native(function (a) { return Math.sqrt(Number(a[0])); }),
        floor: native(function (a) { return Math.floor(Number(a[0])); }),
        ceil: native(function (a) { return Math.ceil(Number(a[0])); }),
        pow: native(function (a) { return Math.pow(Number(a[0]), Number(a[1])); })
      };
    } else {
      b.console = {
        log: native(function (a, n, ctx) { ctx.write(a.map(function (x) { return display(x, lang); }).join(' ') + '\n'); return undefined; }),
        warn: native(function (a, n, ctx) { ctx.write(a.map(function (x) { return display(x, lang); }).join(' ') + '\n'); return undefined; }),
        error: native(function (a, n, ctx) { ctx.write(a.map(function (x) { return display(x, lang); }).join(' ') + '\n'); return undefined; })
      };
      b.Math = {
        PI: Math.PI, E: Math.E,
        sqrt: native(function (a) { return Math.sqrt(Number(a[0])); }),
        abs: native(function (a) { return Math.abs(Number(a[0])); }),
        floor: native(function (a) { return Math.floor(Number(a[0])); }),
        ceil: native(function (a) { return Math.ceil(Number(a[0])); }),
        round: native(function (a) { return Math.round(Number(a[0])); }),
        pow: native(function (a) { return Math.pow(Number(a[0]), Number(a[1])); }),
        max: native(function (a) { return Math.max.apply(null, a.map(Number)); }),
        min: native(function (a) { return Math.min.apply(null, a.map(Number)); })
      };
      b.JSON = {
        stringify: native(function (a) { return JSON.stringify(a[0]); }),
        parse: native(function (a) { return JSON.parse(display(a[0], lang)); })
      };
      b.Number = native(function (a) { return Number(a[0]); });
      b.String = native(function (a) { return display(a[0], lang); });
      b.Boolean = native(function (a) { return truthy(a[0]); });
      b.parseInt = native(function (a) { return parseInt(String(a[0]), a[1] || 10); });
      b.parseFloat = native(function (a) { return parseFloat(String(a[0])); });
      b.isNaN = native(function (a) { return Number.isNaN(Number(a[0])); });
      b.Array = { isArray: native(function (a) { return Array.isArray(a[0]); }) };
      b.typeof = native(function (a) { return typeName(a[0], lang); });
    }
    return b;
  }

  /* ------------------------------------------------------------ evaluator */
  function newEnv(parent) { return { v: Object.create(null), parent: parent || null }; }
  function getVar(env, name) {
    let e = env;
    while (e) {
      if (has(e.v, name)) return e.v[name];
      if (e.builtins && has(e.builtins, name)) return e.builtins[name];
      e = e.parent;
    }
    throw new Error((env.lang === 'py' ? 'name ' : '') + '"' + name + '" is not defined');
  }
  function setVar(env, name, value) { env.v[name] = value; return value; }

  function evaluate(node, env, ctx) {
    ctx.steps++;
    if (ctx.steps > 8000) throw new Error('Execution limit reached (possible infinite loop)');
    switch (node.t) {
      case 'lit': return node.v;
      case 'id': return getVar(env, node.name);
      case 'array': return node.items.map(function (x) { return evaluate(x, env, ctx); });
      case 'object': {
        const o = {};
        node.props.forEach(function (p) { o[p.key] = evaluate(p.value, env, ctx); });
        return o;
      }
      case 'un': {
        const v = evaluate(node.arg, env, ctx);
        return node.op === '!' ? !truthy(v) : node.op === '-' ? -Number(v) : Number(v);
      }
      case 'bin': {
        if (node.op === '&&') return truthy(evaluate(node.left, env, ctx)) ? evaluate(node.right, env, ctx) : false;
        if (node.op === '||') { const l = evaluate(node.left, env, ctx); return truthy(l) ? l : evaluate(node.right, env, ctx); }
        const a = evaluate(node.left, env, ctx), b = evaluate(node.right, env, ctx);
        switch (node.op) {
          case '+': return (typeof a === 'string' || typeof b === 'string') ? display(a, env.lang) + display(b, env.lang) : Number(a) + Number(b);
          case '-': return Number(a) - Number(b);
          case '*': return Number(a) * Number(b);
          case '/': return Number(a) / Number(b);
          case '//': return Math.floor(Number(a) / Number(b));
          case '%': return Number(a) % Number(b);
          case '**': return Math.pow(Number(a), Number(b));
          case '==': return a == b; // eslint-disable-line eqeqeq
          case '!=': return a != b; // eslint-disable-line eqeqeq
          case '<': return a < b;
          case '<=': return a <= b;
          case '>': return a > b;
          case '>=': return a >= b;
          default: throw new Error('Unknown operator ' + node.op);
        }
      }
      case 'member': {
        const obj = evaluate(node.obj, env, ctx);
        const raw = node.computed ? evaluate(node.prop, env, ctx) : node.prop.v;
        const prop = typeof raw === 'string' ? raw : display(raw, env.lang);
        return getMember(obj, prop, env.lang);
      }
      case 'call': {
        const fn = evaluate(node.callee, env, ctx);
        const args = [], named = {};
        node.args.forEach(function (a) {
          const v = evaluate(a.value, env, ctx);
          if (a.name) named[a.name] = v; else args.push(v);
        });
        if (fn && fn.__native) return fn(args, named, ctx);
        if (fn && fn.__function) {
          if (++ctx.depth > 40) throw new Error('Maximum call depth exceeded');
          const local = newEnv(fn.env);
          fn.params.forEach(function (p, i) { setVar(local, p.name, args[i] !== undefined ? args[i] : (p.def ? evaluate(p.def, fn.env, ctx) : undefined)); });
          const r = execList(fn.body, local, ctx);
          ctx.depth--;
          return r && r.type === 'return' ? r.value : undefined;
        }
        throw new Error(display(fn, env.lang) + ' is not callable');
      }
      default: throw new Error('Unknown expression');
    }
  }

  function assign(env, stmt, ctx) {
    let value;
    if (stmt.op === 'set') value = evaluate(stmt.value, env, ctx);
    else {
      const cur = getVar(env, stmt.name);
      const rhs = evaluate(stmt.value, env, ctx);
      const o = stmt.op;
      value = o === '+' ? ((typeof cur === 'string' || typeof rhs === 'string') ? display(cur, env.lang) + display(rhs, env.lang) : Number(cur) + Number(rhs))
        : o === '-' ? Number(cur) - Number(rhs)
        : o === '*' ? Number(cur) * Number(rhs)
        : o === '/' ? Number(cur) / Number(rhs)
        : o === '%' ? Number(cur) % Number(rhs)
        : o === '**' ? Math.pow(Number(cur), Number(rhs)) : rhs;
    }
    return setVar(env, stmt.name, value);
  }

  function execList(stmts, env, ctx) {
    for (let i = 0; i < stmts.length; i++) {
      const r = execStmt(stmts[i], env, ctx);
      if (r && (r.type === 'return' || r.type === 'break' || r.type === 'continue')) return r;
    }
    return null;
  }

  function execStmt(stmt, env, ctx) {
    ctx.steps++;
    if (ctx.steps > 8000) throw new Error('Execution limit reached (possible infinite loop)');
    ctx.line = stmt.line || ctx.line;
    switch (stmt.type) {
      case 'expr': {
        const v = evaluate(stmt.expr, env, ctx);
        if (stmt.echo && v !== undefined && v !== null) ctx.write(display(v, env.lang, true) + '\n');
        return null;
      }
      case 'assign': assign(env, stmt, ctx); return null;
      case 'break': return { type: 'break' };
      case 'continue': return { type: 'continue' };
      case 'return': return { type: 'return', value: evaluate(stmt.value, env, ctx) };
      case 'if':
        if (truthy(evaluate(stmt.cond, env, ctx))) return execList(stmt.body, env, ctx);
        for (let i = 0; i < (stmt.els || []).length; i++) {
          const e = stmt.els[i];
          if (e.type === 'else' || truthy(evaluate(e.cond, env, ctx))) return execList(e.body, env, ctx);
        }
        return null;
      case 'forpy': {
        const list = evaluate(stmt.iterable, env, ctx);
        const items = Array.isArray(list) ? list : (typeof list === 'string' ? list.split('') : []);
        for (let i = 0; i < items.length; i++) {
          setVar(env, stmt.name, items[i]);
          const r = execList(stmt.body, env, ctx);
          if (r && r.type === 'break') break;
          if (r && r.type === 'return') return r;
        }
        return null;
      }
      case 'forjs': {
        if (stmt.init) execStmt(stmt.init, env, ctx);
        let guard = 0;
        while (truthy(evaluate(stmt.cond, env, ctx))) {
          if (++guard > 5000) throw new Error('Loop limit reached');
          const r = execList(stmt.body, env, ctx);
          if (r && r.type === 'break') break;
          if (r && r.type === 'return') return r;
          if (stmt.update) execStmt(stmt.update, env, ctx);
        }
        return null;
      }
      case 'while': {
        let guard = 0;
        while (truthy(evaluate(stmt.cond, env, ctx))) {
          if (++guard > 5000) throw new Error('Loop limit reached');
          const r = execList(stmt.body, env, ctx);
          if (r && r.type === 'break') break;
          if (r && r.type === 'return') return r;
        }
        return null;
      }
      case 'func': {
        const fn = { __function: true, name: stmt.name, params: stmt.params, body: stmt.body, env: env };
        setVar(env, stmt.name, fn);
        return null;
      }
      default: throw new Error('Unknown statement ' + stmt.type);
    }
  }

  function runSource(src, lang, write, readInput) {
    let source = String(src);
    if (lang === 'js') source = stripBlockComments(source);
    const env = newEnv(null);
    env.lang = lang;
    env.builtins = builtins(lang);
    const ctx = { write: write, readInput: readInput, steps: 0, depth: 0, line: 1 };
    const ast = parseProgram(source, lang);
    execList(ast, env, ctx);
  }

  /* --------------------------------------------------------------- shell */
  const CONFIG = {
    py: {
      appId: 'python', title: 'Python', icon: 'python', prompt: '>>>',
      ext: 'py', defaultName: 'Untitled.py', filters: ['py', 'txt'],
      banner: 'Python 3.12.0 (WINemulator simulation)\nType help() for the supported subset. Programs run locally in this tab.\n',
      sample: [
        '# A tiny Python program\nname = "VI OS"\nfor i in range(3):\n    print("Hello", name, i + 1)\n\nvalues = [1, 2, 3, 4]\nprint("total:", sum(values))\nprint("square root:", round(math.sqrt(16), 2))',
        'def greet(who):\n    return "Hi, " + who.upper() + "!"\n\nprint(greet("golden gate"))\nprint(sorted([5, 2, 9, 1]))'
      ],
      help:
        'WINemulator Python is a simulated subset, not a full Python runtime.\n\n' +
        'Supported:\n' +
        '  print(), len(), range(), sum(), min(), max(), abs(), round()\n' +
        '  int(), float(), str(), bool(), list(), sorted(), type(), input()\n' +
        '  math.sqrt/floor/ceil/pow and math.pi/math.e\n' +
        '  if / elif / else, for x in range(...), while, def, return\n' +
        '  lists, dictionaries, strings, + - * / // % ** and comparisons\n\n' +
        'Example:\n  for i in range(3):\n      print("hi", i)\n\n' +
        'Use Run (Ctrl+Enter), Open (Ctrl+O) and Save (Ctrl+S).'
    },
    js: {
      appId: 'js', title: 'JavaScript', icon: 'js', prompt: '›',
      ext: 'js', defaultName: 'Untitled.js', filters: ['js', 'txt'],
      banner: 'JS Console 1.0 (WINemulator simulation)\nType help() for the supported subset. Programs run locally in this tab.\n',
      sample: [
        '// A tiny JavaScript program\nconst name = "VI OS";\nfor (let i = 0; i < 3; i++) {\n  console.log("Hello " + name + " " + (i + 1));\n}\n\nconst nums = [1, 2, 3, 4];\nconsole.log(nums.length, nums.join("-"));',
        'function square(x) {\n  return x * x;\n}\n\nlet total = 0;\nfor (let i = 1; i <= 5; i++) {\n  total += square(i);\n}\nconsole.log("total:", total);'
      ],
      help:
        'WINemulator JavaScript is a simulated subset, not a full JS engine.\n\n' +
        'Supported:\n' +
        '  console.log/warn/error, let/const/var, functions and return\n' +
        '  if / else, for (let i=0; i<n; i++), while, break, continue\n' +
        '  arrays, objects, strings, Math, JSON, Number, String, parseInt\n' +
        '  + - * / % **, comparisons, && / ||, .length and array methods\n\n' +
        'Example:\n  for (let i = 0; i < 3; i++) {\n    console.log(i);\n  }\n\n' +
        'Use Run (Ctrl+Enter), Open (Ctrl+O) and Save (Ctrl+S).'
    }
  };

  function makeApp(lang) {
    const C = CONFIG[lang];
    return {
      name: C.title,
      title: C.title,
      icon: C.icon,
      className: 'app-repl app-repl-' + lang,
      width: 760, height: 500, minWidth: 420, minHeight: 300, placement: 'center',
      mount: function (body, ctx) {
        let path = (ctx.args && ctx.args.path) || '';
        let dirty = false;
        let sample = 1;
        const appDef = Win.apps[C.appId] || {};
        const label = appDef.title || C.title;
        const icon = appDef.icon || C.icon;

        ctx.setTitle(label);
        ctx.setIcon(icon);

        body.innerHTML =
          '<div class="repl-app">' +
            '<div class="repl-bar">' +
              '<button type="button" class="btn default" data-act="run">Run <span class="repl-key">Ctrl+Enter</span></button>' +
              '<button type="button" class="btn" data-act="example">Example</button>' +
              '<button type="button" class="btn" data-act="open">Open</button>' +
              '<button type="button" class="btn" data-act="save">Save</button>' +
              '<button type="button" class="btn" data-act="clear">Clear</button>' +
              '<button type="button" class="btn" data-act="help">Help</button>' +
              '<span class="repl-state"></span>' +
            '</div>' +
            '<div class="repl-work">' +
              '<div class="repl-pane repl-editor-pane">' +
                '<div class="repl-pane-head"><span>Source</span><span class="repl-file"></span></div>' +
                '<textarea class="repl-editor" spellcheck="false" aria-label="' + label + ' source"></textarea>' +
              '</div>' +
              '<div class="repl-pane repl-output-pane">' +
                '<div class="repl-pane-head"><span>Output</span><button type="button" class="repl-copy" title="Copy output">Copy</button></div>' +
                '<pre class="repl-output" role="log" aria-live="polite"></pre>' +
              '</div>' +
            '</div>' +
            '<div class="repl-foot"><span>' + C.prompt + ' ' + label + ' simulation</span>' +
              (lang === 'py' ? '<label class="repl-input-wrap">input() <input class="repl-input-value" value="" spellcheck="false" aria-label="Simulated input value"></label>' : '') +
              '<span class="repl-lines">Ln 1, Col 1</span></div>' +
          '</div>';

        const editor = body.querySelector('.repl-editor');
        const output = body.querySelector('.repl-output');
        const state = body.querySelector('.repl-state');
        const fileLabel = body.querySelector('.repl-file');
        const linesLabel = body.querySelector('.repl-lines');
        const inputValue = body.querySelector('.repl-input-value');

        function setState(text) { state.textContent = text || ''; }
        function updateLabels() {
          fileLabel.textContent = path ? Win.fs.baseName(path) : C.defaultName;
          ctx.setTitle((path ? Win.fs.baseName(path) : C.defaultName) + ' - ' + label);
          const upto = editor.value.slice(0, editor.selectionStart);
          const lines = upto.split('\n');
          linesLabel.textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
        }
        function write(text) { output.textContent += text; output.scrollTop = output.scrollHeight; }
        function setDirty(v) { dirty = !!v; setState(dirty ? 'Modified' : 'Ready'); }

        function clear() { output.textContent = ''; setState('Output cleared'); }
        function example() {
          editor.value = C.sample[sample % C.sample.length];
          sample++;
          setDirty(true);
          updateLabels();
          editor.focus();
          setState('Example loaded — press Run');
        }
        function run() {
          output.textContent = '';
          const src = editor.value;
          write(C.banner);
          try {
            runSource(src, lang, write, function () { return inputValue ? inputValue.value : ''; });
            setState('Finished');
          } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (lang === 'py') write('Traceback (most recent call last):\n  File "' + (path || '<editor>') + '"\n' + (e.name || 'Error') + ': ' + msg + '\n');
            else write((e.name || 'Error') + ': ' + msg + '\n');
            setState('Error');
          }
          output.scrollTop = output.scrollHeight;
        }
        function openFile() {
          return Win.ui.fileDialog({
            mode: 'open', title: 'Open ' + label + ' program',
            startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents', filters: C.filters
          }).then(function (p) {
            if (!p) return;
            const text = Win.fs.read(p);
            if (text === null) throw new Error('File not found.');
            path = Win.fs.norm(p);
            editor.value = String(text).replace(/\r\n/g, '\n');
            setDirty(false); updateLabels(); write('Opened ' + Win.fs.baseName(path) + '\n');
          }).catch(function (e) { Win.ui.error(e.message, 'Open'); });
        }
        function saveFile() {
          const doSave = function (p) {
            try {
              Win.fs.write(p, editor.value.replace(/\n/g, '\r\n'), { kind: 'text', app: C.appId });
              path = p; setDirty(false); updateLabels(); Win.recent.add(p);
              Win.sound.play('save');
              Win.ui.toast('Saved ' + Win.fs.baseName(p), 'save', 1600);
              write('Saved ' + Win.fs.baseName(p) + '\n');
              return Promise.resolve(true);
            } catch (e) { Win.ui.error(e.message, 'Save'); return Promise.resolve(false); }
          };
          if (path) return doSave(path);
          return Win.ui.fileDialog({
            mode: 'save', title: 'Save program', startPath: 'C:\\My Documents',
            defaultName: C.defaultName, filters: C.filters
          }).then(function (p) { return p ? doSave(p) : false; });
        }
        function help() { Win.ui.alert(C.help, label + ' Help', icon); }

        body.querySelector('.repl-bar').addEventListener('click', function (ev) {
          const b = ev.target.closest('button[data-act]');
          if (!b) return;
          const act = b.dataset.act;
          if (act === 'run') run();
          else if (act === 'clear') clear();
          else if (act === 'example') example();
          else if (act === 'open') openFile();
          else if (act === 'save') saveFile();
          else if (act === 'help') help();
        });
        body.querySelector('.repl-copy').addEventListener('click', function () {
          const text = output.textContent;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { setState('Output copied'); }, function () { setState('Copy unavailable'); });
          } else setState('Copy unavailable');
        });
        editor.addEventListener('input', function () { setDirty(true); updateLabels(); });
        editor.addEventListener('click', updateLabels);
        editor.addEventListener('keyup', updateLabels);
        editor.addEventListener('keydown', function (ev) {
          if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); }
          else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); saveFile(); }
          else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'o') { ev.preventDefault(); openFile(); }
          else if (ev.key === 'Tab') {
            ev.preventDefault();
            const s = editor.selectionStart, e = editor.selectionEnd;
            editor.setRangeText('  ', s, e, 'end');
            setDirty(true); updateLabels();
          }
        });

        write(C.banner);
        if (ctx.args && ctx.args.path) {
          const text = Win.fs.read(ctx.args.path);
          if (text !== null) { path = Win.fs.norm(ctx.args.path); editor.value = String(text).replace(/\r\n/g, '\n'); }
        }
        if (!editor.value) editor.value = C.sample[0];
        updateLabels();
        setState('Ready');
        setTimeout(function () { editor.focus(); }, 30);

        return {
          onReopen: function (a) { if (a && a.path) { const t = Win.fs.read(a.path); if (t !== null) { path = Win.fs.norm(a.path); editor.value = String(t).replace(/\r\n/g, '\n'); setDirty(false); updateLabels(); } } },
          run: run, clear: clear,
          onClose: function () { return !dirty || window.confirm('Discard unsaved changes in ' + (path || C.defaultName) + '?'); }
        };
      }
    };
  }

  Win.apps.python = makeApp('py');
  Win.apps.js = makeApp('js');
  Win.langs = { runSource: runSource, display: display };
})();
