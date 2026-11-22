import { expect, test } from './fixtures';
import { museumUrl, waitForMuseum } from './helpers';

test('dragging a medal keeps the sheet still and swiping beside it scrolls', async ({ page }) => {
  test.skip(test.info().project.name !== 'pixel7');
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(museumUrl('/exhibit/certifications/'));
  await waitForMuseum(page);
  await page.getByRole('button', { name: 'Object', exact: true }).click();
  const stage = page.locator('canvas[aria-label$="rotation and zoom"]');
  await stage.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const sheet = page.locator('dialog[open] [role=region]').filter({ has: stage });
  const offsets = () => sheet.evaluate((el) => [el.scrollTop, window.scrollY]);
  const pixels = () => stage.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await expect
    .poll(() =>
      stage.evaluate(
        (el: HTMLCanvasElement) => el.getContext('2d')!.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const initial = await offsets();
  const front = await pixels();
  const box = (await stage.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const input = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 0, y = 0) =>
    input.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
    });

  await touch('touchStart', x, y);
  await expect(sheet).toHaveCSS('overflow-y', 'hidden');
  for (let i = 1; i <= 6; i++) {
    await touch('touchMove', x + 3 * i, y - ((box.height / 2 + 10) * i) / 6);
    expect(await offsets()).toEqual(initial);
  }
  await touch('touchEnd');
  await expect.poll(pixels).not.toBe(front);
  expect(await offsets()).toEqual(initial);
  await touch('touchStart', x, y);
  await touch('touchCancel');
  await expect(sheet).toHaveCSS('overflow-y', 'auto');
  await expect(stage).not.toHaveAttribute('data-touch-rotating', '');

  // Start on the instructions and cross into the canvas. The start target owns the gesture.
  const instructions = page.getByText('Drag to rotate, or use the arrow keys.', { exact: false });
  const text = (await instructions.boundingBox())!;
  const outsideY = text.y + text.height / 2;
  await touch('touchStart', x, outsideY);
  for (let i = 1; i <= 7; i++) {
    await page.waitForTimeout(20);
    await touch('touchMove', x, outsideY + i * 16);
  }
  await touch('touchEnd');
  await expect.poll(async () => Math.abs((await offsets())[0]! - initial[0]!)).toBeGreaterThan(10);
  expect((await offsets())[1]).toBe(initial[1]);
});
