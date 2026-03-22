import { describe, it, expect } from 'vitest';
import { parseJson } from './parseJson';

describe('parseJson', () => {
  // --- direct parse ---
  it('parses a plain JSON object', () => {
    expect(parseJson('{"name":"test"}')).toEqual({ name: 'test' });
  });

  it('parses a plain JSON array', () => {
    expect(parseJson('[1,2,3]')).toEqual([1, 2, 3]);
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

  // --- JSON string wrapping ---
  it('parses a JSON string containing JSON', () => {
    expect(parseJson('"{\\"name\\":\\"test\\"}"')).toEqual({ name: 'test' });
  });

  it('parses a JSON string containing a non-JSON string', () => {
    expect(parseJson('"hello"')).toBe('hello');
  });

  // --- extract from mixed text ---
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

  // --- unquoted keys ---
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

  // --- trailing commas ---
  it('fixes trailing comma in object', () => {
    const text = '{"a":1, "b":2,}';
    expect(parseJson(text)).toEqual({ a: 1, b: 2 });
  });

  it('fixes trailing comma in array', () => {
    const text = '[1, 2, 3,]';
    expect(parseJson(text)).toEqual([1, 2, 3]);
  });

  it('fixes trailing commas in nested structures', () => {
    const text = '{"a":{"b":1,}, "c":[2,],}';
    expect(parseJson(text)).toEqual({ a: { b: 1 }, c: [2] });
  });

  it('fixes trailing commas with unquoted keys', () => {
    const text = '{name: "test",}';
    expect(parseJson(text)).toEqual({ name: 'test' });
  });

  // --- single quotes ---
  it('fixes single-quoted strings', () => {
    const text = "{'name': 'test'}";
    expect(parseJson(text)).toEqual({ name: 'test' });
  });

  it('fixes single-quoted strings in mixed text', () => {
    const text = "log {'key': 'value'} end";
    expect(parseJson(text)).toEqual({ key: 'value' });
  });

  it('fixes single quotes with unquoted keys', () => {
    const text = "{name: 'test', age: 18}";
    expect(parseJson(text)).toEqual({ name: 'test', age: 18 });
  });

  it('handles escaped single quote inside single-quoted string', () => {
    const text = "{'msg': 'it\\'s ok'}";
    expect(parseJson(text)).toEqual({ msg: "it's ok" });
  });

  // --- unicode ---
  it('handles unicode keys and values', () => {
    const text = '{"名字":"张三"}';
    expect(parseJson(text)).toEqual({ 名字: '张三' });
  });

  it('handles unicode escapes', () => {
    const text = '{"text":"\\u4f60\\u597d"}';
    expect(parseJson(text)).toEqual({ text: '你好' });
  });

  // --- string with braces that are not JSON ---
  it('ignores braces inside JSON string values', () => {
    const text = '{"msg": "{not json}"}';
    expect(parseJson(text)).toEqual({ msg: '{not json}' });
  });

  it('ignores braces inside string in mixed text', () => {
    const text = 'prefix {"msg": "use {name} here"} suffix';
    expect(parseJson(text)).toEqual({ msg: 'use {name} here' });
  });

  // --- multiple JSON candidates ---
  it('picks first JSON object when multiple exist', () => {
    const text = 'first: {"a":1} second: {"b":2}';
    expect(parseJson(text)).toEqual({ a: 1 });
  });

  it('picks first JSON array when multiple exist', () => {
    const text = 'first: [1,2] second: [3,4]';
    expect(parseJson(text)).toEqual([1, 2]);
  });

  // --- error cases ---
  it('throws on empty string', () => {
    expect(() => parseJson('')).toThrow('No valid JSON found');
  });

  it('throws on whitespace only', () => {
    expect(() => parseJson('   \n  ')).toThrow('No valid JSON found');
  });

  it('throws when no JSON found', () => {
    expect(() => parseJson('just plain text')).toThrow('No valid JSON found');
  });

  it('throws on unmatched braces', () => {
    expect(() => parseJson('text {unmatched more')).toThrow('No valid JSON found');
  });

  // --- special characters in keys ---
  it('handles special chars in keys', () => {
    const text = '{"a-b":1, "c.d":2, "a/b":3}';
    expect(parseJson(text)).toEqual({ 'a-b': 1, 'c.d': 2, 'a/b': 3 });
  });

  // --- complex combo ---
  it('handles all fixes combined: single quotes + unquoted keys + trailing commas', () => {
    const text = "log: {name: 'alice', data: {score: 100, tags: ['a', 'b',],},} end";
    expect(parseJson(text)).toEqual({
      name: 'alice',
      data: { score: 100, tags: ['a', 'b'] },
    });
  });
});
