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

  it('throws when no JSON found', () => {
    expect(() => parseJson('just plain text')).toThrow('No valid JSON found');
  });

  it('throws on invalid JSON in mixed text', () => {
    expect(() => parseJson('text {broken json} more')).toThrow();
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

  it('prefers first match when multiple JSON objects exist', () => {
    const text = '{"first":1} and {"second":2}';
    expect(parseJson(text)).toEqual({ first: 1 });
  });
});
