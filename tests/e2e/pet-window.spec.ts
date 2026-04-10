import { expect, test } from './fixtures/electron';

test.describe('ShortClaw desktop pet window', () => {
  test('loads the pet sprite from bundled assets in the pet window', async ({ electronApp }) => {
    const deadline = Date.now() + 30_000;
    let petWindow = electronApp
      .windows()
      .find((window) => !window.isClosed() && window.url().includes('#/pet'));

    while (!petWindow && Date.now() < deadline) {
      try {
        const candidate = await electronApp.waitForEvent('window', { timeout: 2_000 });
        if (!candidate.isClosed() && candidate.url().includes('#/pet')) {
          petWindow = candidate;
          break;
        }
      } catch {
        petWindow = electronApp
          .windows()
          .find((window) => !window.isClosed() && window.url().includes('#/pet'));
      }
    }

    expect(petWindow).toBeTruthy();

    await petWindow!.waitForLoadState('domcontentloaded');
    await expect(petWindow!.getByTestId('pet-sprite')).toBeVisible();

    const backgroundImage = await petWindow!.getByTestId('pet-sprite').evaluate((element) => {
      return window.getComputedStyle(element).backgroundImage;
    });

    expect(backgroundImage).toContain('assets/pets/star-working-spritesheet-grid.png');
  });
});
