import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './triage.service.js';

test('package not arrived is DELIVERY / HIGH', () => {
  assert.deepEqual(classify('My package has not arrived', 'Order placed last week'),
    { category: 'DELIVERY', priority: 'HIGH' });
});
test('refund request is BILLING / HIGH', () => {
  assert.deepEqual(classify('I want a refund', 'Please refund my last invoice'),
    { category: 'BILLING', priority: 'HIGH' });
});
test('locked out is LOGIN / URGENT', () => {
  assert.deepEqual(classify('Locked out', 'I am locked out of my account'),
    { category: 'LOGIN', priority: 'URGENT' });
});
test('500 inside a price does not trigger BUG', () => {
  assert.deepEqual(classify('Price question', 'The plan costs $1500 per year'),
    { category: 'FEATURE_REQUEST', priority: 'MEDIUM' });
});
test('real 500 error is BUG / HIGH', () => {
  assert.deepEqual(classify('Server error 500', 'The page crashes'),
    { category: 'BUG', priority: 'HIGH' });
});
test('no keywords falls back to FEATURE_REQUEST / MEDIUM', () => {
  assert.deepEqual(classify('Add dark mode', 'Please add a dark theme'),
    { category: 'FEATURE_REQUEST', priority: 'MEDIUM' });
});