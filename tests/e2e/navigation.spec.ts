import { expect, test } from '@playwright/test';

import { active, deck, expectSlide, isPhone, openDeck, SLIDES } from './support.ts';

test.describe('navigation', () => {
  test('the first slide is visible before any input, the others are inert', async ({ page }) => {
    await openDeck(page);
    await expect(page.locator('[data-slide]')).toHaveCount(SLIDES.length);
    await expect(page.locator('[data-slide]:not([inert])')).toHaveCount(1);
    await expect(page.locator('#paradox')).toBeHidden();
  });

  test('keys of a keyboard and of a clicker move through the deck', async ({ page }, info) => {
    test.skip(isPhone(info), 'In the flow layout the vertical keys scroll first; see the next test.');
    await openDeck(page);
    const steps: [string, number][] = [
      ['ArrowRight', 2],
      ['PageDown', 3],
      ['Space', 4],
      ['Enter', 5],
      ['ArrowDown', 6],
      ['ArrowLeft', 5],
      ['PageUp', 4],
      ['Backspace', 3],
      ['ArrowUp', 2],
      ['End', 9],
      ['ArrowRight', 9],
      ['Home', 1],
      ['ArrowLeft', 1],
      ['7', 7],
    ];
    for (const [key, slide] of steps) {
      await page.keyboard.press(key);
      await expectSlide(page, slide);
    }
  });

  test('in the flow layout, the vertical keys scroll a long slide before they change it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await openDeck(page, { slide: 6 });
    const position = (): Promise<number> => active(page).evaluate((slide) => slide.scrollTop);
    expect(await position()).toBe(0);

    await page.keyboard.press('ArrowDown');
    await expect.poll(position).toBeGreaterThan(0);
    await expectSlide(page, 6);

    // The horizontal keys never scroll.
    await page.keyboard.press('ArrowRight');
    await expectSlide(page, 7);
    await page.keyboard.press('ArrowLeft');
    await expectSlide(page, 6);

    // At the end of the slide, the same key moves on.
    for (let press = 0; press < 12 && (await active(page).getAttribute('id')) === 'evidence'; press += 1) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(450);
    }
    await expectSlide(page, 7);
  });

  test('a slide number in the address opens that slide', async ({ page }) => {
    await openDeck(page, { slide: 6 });
    await expect(active(page)).toHaveAttribute('id', 'evidence');
    await page.evaluate(() => {
      location.hash = '#3';
    });
    await expectSlide(page, 3);
  });

  test('the route shows the position and each stop opens its slide', async ({ page }, info) => {
    test.skip(isPhone(info), 'On a phone the route shows progress only.');
    await openDeck(page);
    await page.locator('[data-stop="4"]').click();
    await expectSlide(page, 5);
    await expect(page.locator('[data-stop="4"]')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('[data-stop][data-passed]')).toHaveCount(4);
    await expect(page.locator('[data-stop][aria-current]')).toHaveCount(1);
    expect(await deck(page).evaluate((node) => node.style.getPropertyValue('--progress'))).toBe('0.5');
  });

  test('the next and previous controls work with a pointer', async ({ page }, info) => {
    await openDeck(page);
    const next = page.locator('[data-action="next"]');
    const previous = page.locator('[data-action="previous"]');
    if (isPhone(info)) {
      await next.tap();
      await expectSlide(page, 2);
      await previous.tap();
    } else {
      await next.click({ position: { x: 20, y: 300 } });
      await expectSlide(page, 2);
      await previous.click({ position: { x: 20, y: 300 } });
    }
    await expectSlide(page, 1);
  });

  test('Space moves on after a mouse click on a control', async ({ page }, info) => {
    test.skip(isPhone(info), 'A phone has no keyboard.');
    await openDeck(page);
    await page.locator('[data-stop="2"]').click();
    await expectSlide(page, 3);
    await page.keyboard.press('Space');
    await expectSlide(page, 4);
  });

  test('a swipe changes the slide on a touch screen', async ({ page }, info) => {
    test.skip(!isPhone(info), 'Swipe needs a touch screen.');
    await openDeck(page);
    const swipe = async (fromX: number, toX: number): Promise<void> => {
      await page.evaluate(
        ([from, to]) => {
          const target = document.querySelector('[data-deck]');
          const fire = (type: string, x: number): void => {
            target?.dispatchEvent(
              new PointerEvent(type, { pointerType: 'touch', clientX: x, clientY: 300, bubbles: true }),
            );
          };
          fire('pointerdown', from ?? 0);
          fire('pointerup', to ?? 0);
        },
        [fromX, toX],
      );
    };
    await swipe(320, 60);
    await expectSlide(page, 2);
    await swipe(60, 320);
    await expectSlide(page, 1);
  });

  test('a screen reader hears the number and the title of the new slide', async ({ page }) => {
    await openDeck(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-announce]')).toHaveText(
      'Slide 2 of 9: The stop is near. The seats are free. Still, the car wins.',
    );
  });
});
