import { expect, test } from './fixtures';
import { goToStop, museumUrl, waitForMuseum } from './helpers';

test('the Round Table rotates, zooms, resets and returns to its opener', async ({ page }) => {
  test.skip(!['desktop', 'pixel7'].includes(test.info().project.name));
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  await goToStop(page, 'sdsj');
  const opener = page.getByRole('button', { name: 'Inspect object' });
  const scroll = await page.evaluate(() => scrollY);
  await opener.click();
  const stage = page.getByRole('group', { name: 'Round Table rotation and zoom' });
  const pixels = () => stage.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await expect
    .poll(() =>
      stage.evaluate(
        (el) => (el as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const first = await pixels();
  await stage.focus();
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await pixels()) !== first).toBe(true);
  const tilted = await pixels();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(async () => (await pixels()) !== tilted).toBe(true);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(async () => (await pixels()) === first).toBe(true);
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 2 + 15, { steps: 3 });
  await page.mouse.up();
  await expect.poll(async () => (await pixels()) !== first).toBe(true);
  await page.getByRole('button', { name: 'Story', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The work', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Object', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await opener.click();
  await page.goBack();
  await expect(opener).toBeFocused();
});
