import { describe, expect, it, vi } from 'vitest';
import { joinAlertPayload, notifyAdminsOfJoin, type JoinAlertDeps } from './joinAlert';

const sub = { id: 's1', endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' };

function makeDeps(overrides: Partial<JoinAlertDeps> = {}): JoinAlertDeps {
	return {
		claim: vi.fn().mockResolvedValue('Pat Newcomer'),
		adminSubscriptions: vi.fn().mockResolvedValue([sub]),
		send: vi.fn().mockResolvedValue({ sent: 1, expiredIds: [] }),
		removeExpired: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('notifyAdminsOfJoin', () => {
	it('alerts admins once with the newcomer’s name', async () => {
		const deps = makeDeps();
		await notifyAdminsOfJoin('user-1', deps);

		expect(deps.claim).toHaveBeenCalledWith('user-1');
		expect(deps.send).toHaveBeenCalledWith([sub], joinAlertPayload('Pat Newcomer'));
	});

	it('sends nothing when this sign-up was already alerted (or is not pending)', async () => {
		const deps = makeDeps({ claim: vi.fn().mockResolvedValue(null) });
		await notifyAdminsOfJoin('user-1', deps);

		expect(deps.adminSubscriptions).not.toHaveBeenCalled();
		expect(deps.send).not.toHaveBeenCalled();
	});

	it('sends nothing when no admin has a subscribed device', async () => {
		const deps = makeDeps({ adminSubscriptions: vi.fn().mockResolvedValue([]) });
		await notifyAdminsOfJoin('user-1', deps);

		expect(deps.send).not.toHaveBeenCalled();
	});

	it('removes subscriptions the push service reports as gone', async () => {
		const deps = makeDeps({ send: vi.fn().mockResolvedValue({ sent: 0, expiredIds: ['s1'] }) });
		await notifyAdminsOfJoin('user-1', deps);

		expect(deps.removeExpired).toHaveBeenCalledWith(['s1']);
	});

	it('does not touch subscriptions when none expired', async () => {
		const deps = makeDeps();
		await notifyAdminsOfJoin('user-1', deps);

		expect(deps.removeExpired).not.toHaveBeenCalled();
	});
});

describe('joinAlertPayload', () => {
	it('names the person in the body', () => {
		expect(JSON.parse(joinAlertPayload('Pat'))).toEqual({
			title: 'New sign-up request',
			body: 'Pat is asking to join SBF.'
		});
	});
});
