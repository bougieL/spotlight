import { describe, it, expect } from 'vitest';
import { parseJson } from './parseJson';

describe('parseJson', () => {
  it('parses a plain JSON object', () => {
    expect(parseJson('{"name":"test"}')).toEqual({ name: 'test' });
  });

  it('parses a plain JSON array', () => {
    expect(parseJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('parses a JSON string containing JSON', () => {
    expect(parseJson('"{\\"name\\":\\"test\\"}"')).toEqual({ name: 'test' });
  });

  it('parses a JSON string containing a non-JSON string', () => {
    expect(parseJson('"hello"')).toBe('hello');
  });

  it('extracts JSON object from mixed text', () => {
    const text = 'response: {"code":0,"data":{"id":1}} end';
    expect(parseJson(text)).toEqual({ code: 0, data: { id: 1 } });
  });

  it('extracts JSON array from mixed text', () => {
    const text = 'result: [1, 2, 3] done';
    expect(parseJson(text)).toEqual([1, 2, 3]);
  });

  it('extracts nested JSON with braces in text', () => {
    const text = 'prefix {"a":{"b":1}} suffix';
    expect(parseJson(text)).toEqual({ a: { b: 1 } });
  });

  it('extracts JSON with newlines in mixed text', () => {
    const text = 'log:\n{"key":\n"value"}\n';
    expect(parseJson(text)).toEqual({ key: 'value' });
  });

  it('extracts multi-line JSON from mixed text', () => {
    const text = [
      'Server response:',
      '{',
      '  "status": 200,',
      '  "body": {',
      '    "msg": "ok"',
      '  }',
      '}',
      '--- end ---',
    ].join('\n');
    expect(parseJson(text)).toEqual({ status: 200, body: { msg: 'ok' } });
  });

  it('extracts JSON string escaped in mixed text', () => {
    const text = 'data="{\\"user\\":\\"alice\\"}"';
    expect(parseJson(text)).toEqual({ user: 'alice' });
  });

  it('extracts JSON with escaped quotes inside strings', () => {
    const text = 'msg: {"text":"say \\"hello\\""} done';
    expect(parseJson(text)).toEqual({ text: 'say "hello"' });
  });

  it('fixes unquoted keys', () => {
    const text = '{name: "test", age: 18}';
    expect(parseJson(text)).toEqual({ name: 'test', age: 18 });
  });

  it('fixes unquoted keys in nested objects', () => {
    const text = '{user: {name: "alice", score: 100}}';
    expect(parseJson(text)).toEqual({ user: { name: 'alice', score: 100 } });
  });

  it('fixes unquoted keys mixed with quoted keys', () => {
    const text = '{name: "test", "value": 42}';
    expect(parseJson(text)).toEqual({ name: 'test', value: 42 });
  });

  it('fixes unquoted keys with special chars in mixed text', () => {
    const text = 'log { _id: 1, $type: "user" } end';
    expect(parseJson(text)).toEqual({ _id: 1, $type: 'user' });
  });

  it('picks first JSON object when multiple exist', () => {
    const text = 'first: {"a":1} second: {"b":2}';
    expect(parseJson(text)).toEqual({ a: 1 });
  });

  it('picks first JSON array when multiple exist', () => {
    const text = 'first: [1,2] second: [3,4]';
    expect(parseJson(text)).toEqual([1, 2]);
  });

  it('throws when no JSON found', () => {
    expect(() => parseJson('just plain text')).toThrow('No valid JSON found');
  });

  it('throws on unmatched braces', () => {
    expect(() => parseJson('text {unmatched more')).toThrow('No valid JSON found');
  });

  it('handles empty object', () => {
    expect(parseJson('{}')).toEqual({});
  });

  it('handles empty array', () => {
    expect(parseJson('[]')).toEqual([]);
  });

  it('handles JSON number', () => {
    expect(parseJson('42')).toBe(42);
  });

  it('handles JSON boolean', () => {
    expect(parseJson('true')).toBe(true);
  });

  it('handles JSON null', () => {
    expect(parseJson('null')).toBe(null);
  });
});
