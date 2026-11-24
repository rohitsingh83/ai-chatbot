/**
 * Safe maths evaluator (no eval): numbers, + - * / % ^, parentheses,
 * constants (pi, e) and common functions.
 */
const FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  log: Math.log10, ln: Math.log, log2: Math.log2, exp: Math.exp,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

export function calculate(expression) {
  const src = String(expression).replace(/\*\*/g, '^').replace(/×/g, '*').replace(/÷/g, '/').replace(/,(?=\d{3}\b)/g, '');
  const tokens = src.match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z_][a-z0-9_]*|[-+*/%^(),]/gi);
  if (!tokens || tokens.join('') !== src.replace(/\s+/g, '')) throw new Error('Unsupported characters in expression');
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = (t) => {
    if (next() !== t) throw new Error(`Expected "${t}"`);
  };

  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = unary();
    while (peek() === '*' || peek() === '/' || (peek() === '%' && isOperand(tokens[i + 1]))) {
      const op = next();
      const r = unary();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  // "18%" means 0.18 when % is not followed by an operand; otherwise % is modulo.
  const isOperand = (t) => t !== undefined && (t === '(' || /^[\d.a-z_]/i.test(t));
  function postfix() {
    let v = primary();
    while (peek() === '%' && !isOperand(tokens[i + 1])) {
      next();
      v /= 100;
    }
    return v;
  }
  function power() {
    const base = postfix();
    if (peek() === '^') {
      next();
      return base ** unary(); // right-associative, and 2^-1 works
    }
    return base;
  }
  function unary() {
    if (peek() === '-') {
      next();
      return -unary();
    }
    if (peek() === '+') {
      next();
      return unary();
    }
    return power();
  }
  function primary() {
    const t = next();
    if (t === undefined) throw new Error('Unexpected end of expression');
    if (t === '(') {
      const v = expr();
      expect(')');
      return v;
    }
    if (/^\d|^\./.test(t)) return Number(t);
    const name = t.toLowerCase();
    if (name in CONSTS) return CONSTS[name];
    if (name in FUNCS) {
      expect('(');
      const args = [expr()];
      while (peek() === ',') {
        next();
        args.push(expr());
      }
      expect(')');
      return FUNCS[name](...args);
    }
    throw new Error(`Unknown name "${t}"`);
  }

  const result = expr();
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i]}"`);
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return Math.round(result * 1e12) / 1e12;
}
