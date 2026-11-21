import { expect, test } from './fixtures';
import { goToStop, museumUrl, waitForMuseum } from './helpers';

test('the Round Table rotates, zooms, resets and returns to its opener', async ({ page }) => {
  test.skip(!['desktop', 'pixel7'].includes(test.info().project.name));
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  await goToStop(page, 'sdsj');
  const opener = page.getByTestId('card-sdsj').getByRole('button', { name: 'Inspect object' });
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
  await page.getByRole('button', { name: 'Overhead view' }).click();
  await expect.poll(async () => (await pixels()) !== first).toBe(true);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(async () => (await pixels()) === first).toBe(true);
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

test('inspect each credential from both sides and restore the full cabinet', async ({ page }) => {
  test.skip(!['desktop', 'pixel7'].includes(test.info().project.name));
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  await goToStop(page, 'certifications');
  const opener = page
    .getByTestId('card-certifications')
    .getByRole('button', { name: 'Inspect object' });
  const scroll = await page.evaluate(() => scrollY);
  await opener.click();
  const select = page.getByRole('combobox', { name: 'Inspect' });
  const stage = page.locator('canvas[aria-label$="rotation and zoom"]');
  const pixels = () => stage.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await expect
    .poll(() =>
      stage.evaluate(
        (el) => (el as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const whole = await pixels();
  const reverses = new Set<string>();
  for (const title of [
    'AWS Certified Cloud Practitioner',
    'Tech Stewardship Practice Program',
    'Tech Stewardship for the Energy Transition',
  ]) {
    await select.selectOption({ label: title });
    await expect(stage).toHaveAccessibleName(title + ' rotation and zoom');
    await expect.poll(async () => (await pixels()) !== whole).toBe(true);
    await page.getByRole('button', { name: 'View reverse', exact: true }).click();
    await stage.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const reverse = await pixels();
    reverses.add(reverse);
    await stage.focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await pixels()) !== reverse).toBe(true);
    await select.selectOption({ label: 'Whole cabinet' });
    await expect.poll(async () => (await pixels()) === whole).toBe(true);
  }
  expect(reverses.size).toBe(3);
  await page.getByRole('button', { name: 'Story', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});
