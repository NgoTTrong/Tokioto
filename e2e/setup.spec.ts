import { test, expect } from "@playwright/test";

test("first-run setup and login", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/setup$/);
  const dots = [0, 1, 2, 5, 8];
  async function draw() {
    const svg = page.locator("svg").first();
    const box = await svg.boundingBox(); if (!box) throw new Error("no svg");
    const pos = (i: number) => ({ x: box.x + (i % 3) * (box.width / 3) + box.width / 6, y: box.y + Math.floor(i / 3) * (box.height / 3) + box.height / 6 });
    const start = pos(dots[0]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const d of dots.slice(1)) { const p = pos(d); await page.mouse.move(p.x, p.y, { steps: 10 }); }
    await page.mouse.up();
  }
  await draw(); // first draw
  await draw(); // confirm draw
  await expect(page).toHaveURL("/");
});
