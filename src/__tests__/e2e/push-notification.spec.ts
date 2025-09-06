/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

test.describe('Push notifications', () => {
    test.use({ permissions: ['notifications'] });

    test('テスト通知を送信 ボタンで Notification が発火する', async ({ page }) => {
        // Mock Notification to capture invocations
        await page.addInitScript(() => {
            // @ts-ignore
            window.__notifications = [];
            const MockNotification: any = function (this: any, title: string, options?: NotificationOptions) {
                // @ts-ignore
                window.__notifications.push({ title, options });
                return { close: () => { }, onclick: null } as any;
            };
            MockNotification.permission = 'granted';
            MockNotification.requestPermission = async () => 'granted';
            // @ts-ignore
            window.Notification = MockNotification;
        });

        // Mock Service Worker registration and PushManager
        await page.addInitScript(() => {
            const fakeKey = new TextEncoder().encode('fake');
            const fakeSubscription: any = {
                endpoint: 'https://example.com/endpoint',
                getKey: (name: 'p256dh' | 'auth') => fakeKey.buffer,
                toJSON: () => ({ endpoint: 'https://example.com/endpoint', keys: { p256dh: 'x', auth: 'y' } })
            };

            const fakeRegistration: any = {
                active: {},
                pushManager: {
                    getSubscription: async () => fakeSubscription,
                    subscribe: async () => fakeSubscription,
                },
            };

            const sw: any = navigator.serviceWorker as any;
            const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
            navigator.serviceWorker.register = async (...args: any[]) => {
                sw._fakeRegistration = fakeRegistration;
                return fakeRegistration;
            };
            Object.defineProperty(navigator.serviceWorker, 'ready', {
                get() {
                    return Promise.resolve(sw._fakeRegistration || fakeRegistration);
                }
            });
        });

        await page.goto('/settings/notifications');

        // 未購読の場合に備えて「プッシュ通知を有効にする」の行にあるスイッチをクリック
        const pushRow = page.locator('div:has-text("プッシュ通知を有効にする")').first();
        const pushSwitch = pushRow.getByRole('switch').first();
        if (await pushSwitch.isVisible()) {
            await pushSwitch.click();
        }

        // ボタンが表示されるまで待機
        const button = page.getByRole('button', { name: 'テスト通知を送信' });
        await expect(button).toBeVisible();

        await button.click();

        // 通知が発火したことを検証
        const count = await page.evaluate(() => {
            // @ts-ignore
            return (window.__notifications || []).length as number;
        });

        expect(count).toBeGreaterThan(0);

        const first = await page.evaluate(() => {
            // @ts-ignore
            return (window.__notifications || [])[0];
        });

        expect(first.title).toBe('テスト通知');
    });
});


