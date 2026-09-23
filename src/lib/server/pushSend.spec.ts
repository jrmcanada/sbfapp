import { describe, expect, it, vi } from 'vitest';
import { sendToAll, type Subscription } from './pushSend';

function sub(id: string): Subscription {
	return { id, endpoint: `https://push.example/${id}`, p256dh: 'key', auth: 'secret' };
}

describe('sendToAll', () => {
	it('counts every successful send', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const result = await sendToAll([sub('a'), sub('b'), sub('c')], 'payload', send);
		expect(result).toEqual({ sent: 3, expiredIds: [] });
		expect(send).toHaveBeenCalledTimes(3);
	});

	it('marks a 410 response as expired, not counted as sent', async () => {
		const send = vi.fn().mockRejectedValue({ statusCode: 410 });
		const result = await sendToAll([sub('a')], 'payload', send);
		expect(result).toEqual({ sent: 0, expiredIds: ['a'] });
	});

	it('marks a 404 response as expired too', async () => {
		const send = vi.fn().mockRejectedValue({ statusCode: 404 });
		const result = await sendToAll([sub('a')], 'payload', send);
		expect(result.expiredIds).toEqual(['a']);
	});

	it('does not mark a non-410/404 failure as expired', async () => {
		const send = vi.fn().mockRejectedValue({ statusCode: 500 });
		const result = await sendToAll([sub('a')], 'payload', send);
		expect(result).toEqual({ sent: 0, expiredIds: [] });
	});

	it('does not mark a plain network error (no statusCode) as expired', async () => {
		const send = vi.fn().mockRejectedValue(new Error('network blip'));
		const result = await sendToAll([sub('a')], 'payload', send);
		expect(result).toEqual({ sent: 0, expiredIds: [] });
	});

	it('handles a mix of outcomes independently', async () => {
		const send = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce({ statusCode: 410 })
			.mockRejectedValueOnce({ statusCode: 500 });
		const result = await sendToAll([sub('ok'), sub('gone'), sub('error')], 'payload', send);
		expect(result.sent).toBe(1);
		expect(result.expiredIds).toEqual(['gone']);
	});

	it('handles an empty subscription list', async () => {
		const send = vi.fn();
		const result = await sendToAll([], 'payload', send);
		expect(result).toEqual({ sent: 0, expiredIds: [] });
		expect(send).not.toHaveBeenCalled();
	});
});
