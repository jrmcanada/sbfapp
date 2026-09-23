import { describe, expect, it } from 'vitest';
import { isIOS, isStandalone } from './platform';

const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_MACINTOSH_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const REAL_MAC_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const ANDROID_UA =
	'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

describe('isIOS', () => {
	it('detects a real iPhone', () => {
		expect(isIOS(IPHONE_UA, 5)).toBe(true);
	});

	it('detects an iPad reporting as Macintosh via touch points', () => {
		expect(isIOS(IPAD_MACINTOSH_UA, 5)).toBe(true);
	});

	it('does not flag a real Mac with no touch support', () => {
		expect(isIOS(REAL_MAC_UA, 0)).toBe(false);
	});

	it('does not flag Android', () => {
		expect(isIOS(ANDROID_UA, 5)).toBe(false);
	});
});

describe('isStandalone', () => {
	it('is true when navigator.standalone is true (iOS)', () => {
		expect(isStandalone(true, false)).toBe(true);
	});

	it('is true when the display-mode media query matches (other platforms)', () => {
		expect(isStandalone(undefined, true)).toBe(true);
	});

	it('is false when neither signal is present', () => {
		expect(isStandalone(undefined, false)).toBe(false);
		expect(isStandalone(false, false)).toBe(false);
	});
});
