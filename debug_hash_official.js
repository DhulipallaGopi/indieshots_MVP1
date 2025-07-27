import crypto from 'crypto';

// Your EXACT production credentials
const MERCHANT_KEY = 'xXZDKp';
const MERCHANT_SALT = 'ezsXEEqchsA1ZLmHzn5BrLRl9snmckHn';

// Test parameters matching your payment
const testParams = {
  key: MERCHANT_KEY,
  txnid: 'TEST_OFFICIAL_HASH_123',
  amount: '1.00',
  productinfo: 'IndieShots_Pro_Upgrade',
  firstname: 'Test User',
  email: 'test@example.com'
};

console.log('=== PayU OFFICIAL Hash Formula Debug ===\n');

// Method 1: Empty UDF fields (11 empty pipes after email)
const method1 = `${testParams.key}|${testParams.txnid}|${testParams.amount}|${testParams.productinfo}|${testParams.firstname}|${testParams.email}|||||||||||${MERCHANT_SALT}`;
const hash1 = crypto.createHash('sha512').update(method1).digest('hex');

console.log('Method 1 - Empty UDF (11 pipes):');
console.log('Hash String:', method1);
console.log('Pipe Count:', (method1.match(/\|/g) || []).length);
console.log('Hash:', hash1);
console.log('');

// Method 2: Explicit empty UDF fields (6 empty pipes after udf5)
const method2 = `${testParams.key}|${testParams.txnid}|${testParams.amount}|${testParams.productinfo}|${testParams.firstname}|${testParams.email}|||||||||||${MERCHANT_SALT}`;
const hash2 = crypto.createHash('sha512').update(method2).digest('hex');

console.log('Method 2 - Explicit UDF (same as method 1):');
console.log('Hash String:', method2);
console.log('Pipe Count:', (method2.match(/\|/g) || []).length);  
console.log('Hash:', hash2);
console.log('');

// Method 3: PayU documentation format (exactly as shown)
const method3 = `${testParams.key}|${testParams.txnid}|${testParams.amount}|${testParams.productinfo}|${testParams.firstname}|${testParams.email}|||||||||${MERCHANT_SALT}`;
const hash3 = crypto.createHash('sha512').update(method3).digest('hex');

console.log('Method 3 - PayU Doc Format (9 pipes after email):');
console.log('Hash String:', method3);
console.log('Pipe Count:', (method3.match(/\|/g) || []).length);
console.log('Hash:', hash3);
console.log('');

console.log('=== Verification ===');
console.log('All methods same?', hash1 === hash2 && hash2 === hash3);
console.log('Credential Check:');
console.log('- Merchant Key:', MERCHANT_KEY, '(Length:', MERCHANT_KEY.length, ')');
console.log('- Salt:', MERCHANT_SALT, '(Length:', MERCHANT_SALT.length, ')');
console.log('');

console.log('=== Hash Breakdown ===');
console.log('Parameters in order:');
console.log('1. key:', testParams.key);
console.log('2. txnid:', testParams.txnid);
console.log('3. amount:', testParams.amount);
console.log('4. productinfo:', testParams.productinfo);
console.log('5. firstname:', testParams.firstname);
console.log('6. email:', testParams.email);
console.log('7-11. udf1-5: (empty)');
console.log('12. Additional empty fields');
console.log('13. salt:', MERCHANT_SALT);