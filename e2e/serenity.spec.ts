import { expect, test, type Page } from "@playwright/test";

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

test("scans the overview and verifies a source-backed ticker detail", async ({
  page,
}, testInfo) => {
  await page.goto("/tickers");

  await expect(
    page.getByRole("heading", {
      name: "투자 관점 인텔리전스",
      exact: true,
    }),
  ).toBeVisible();
  const cohrRow = page.getByRole("row", { name: /COHR/ });
  await expect(cohrRow).toContainText("47");
  await expect(cohrRow).toContainText("+38");
  await expect(cohrRow).toContainText("-3");
  await expect(cohrRow).toContainText("긍정 우세");

  const analystTrigger = page.getByRole("button", {
    name: "COHR 언급 분석가 5명 보기",
  });
  await expect(analystTrigger).toBeVisible();
  await expect(analystTrigger).toContainText(
    testInfo.project.name === "mobile-chromium" ? "+3" : "+2",
  );
  await analystTrigger.click();

  const analystDialog = page.getByRole("dialog", {
    name: "COHR 언급 분석가",
  });
  await expect(analystDialog).toBeVisible();
  for (const analystName of [
    "Shay Boloor",
    "Serenity",
    "Growth Desk",
    "Bear Case",
    "Signal Lab",
  ]) {
    await expect(
      analystDialog.getByText(analystName, { exact: true }),
    ).toBeVisible();
  }
  const firstSource = analystDialog.getByRole("link", {
    name: "Serenity 최근 원문",
  });
  await expect(firstSource).toHaveAttribute("target", "_blank");
  await expect(firstSource).toHaveAttribute(
    "href",
    /^https:\/\/x\.com\/aleabitoreddit\/status\/\d+$/,
  );

  await page.keyboard.press("Escape");
  await expect(analystDialog).toBeHidden();
  await expect(analystTrigger).toBeFocused();

  await page
    .getByRole("link", { name: "COHR Coherent Corp.", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "COHR Coherent Corp." }),
  ).toBeVisible();
  await expect(page.getByText("최근 주요 주장")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "최근 90일 Serenity 언급 추이" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /의견과 원문/ }).click();
  await expect(page.getByText("AI 분석").first()).toBeVisible();
  await expect(page.getByText("원문 근거").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "X에서 원문 보기" }).first(),
  ).toHaveAttribute("target", "_blank");
});

test("filters tickers from the URL-driven search control", async ({ page }) => {
  await page.goto("/tickers");
  const search = page.getByRole("textbox", { name: "티커 또는 회사명 검색" });
  await search.fill("coh");
  await search.press("Enter");

  await expect(page).toHaveURL(/q=coh/);
  await expect(
    page.getByRole("link", { name: /COHR Coherent Corp/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /AAOI/ })).toHaveCount(0);
});

test("keeps overview, analyst popover, and detail within the mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");

  await page.goto("/tickers");

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  const cohrRow = page.getByRole("row", { name: /COHR/ });
  await expect(cohrRow).toContainText("총 47");

  const analystTrigger = page.getByRole("button", {
    name: "COHR 언급 분석가 5명 보기",
  });
  await expect(analystTrigger).toContainText("+3");
  await analystTrigger.click();

  const analystDialog = page.getByRole("dialog", {
    name: "COHR 언급 분석가",
  });
  await expect(analystDialog).toBeVisible();
  const viewport = page.viewportSize();
  const panelBounds = await analystDialog.boundingBox();
  if (!viewport || !panelBounds) {
    throw new Error("Expected a measurable mobile viewport and analyst panel");
  }
  const documentBounds = await page.evaluate(() => {
    const bounds = document.documentElement.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right };
  });
  expect(documentBounds.left).toBeGreaterThanOrEqual(0);
  expect(documentBounds.right).toBeLessThanOrEqual(viewport.width);
  expect(panelBounds.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(viewport.width);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(analystDialog).toBeHidden();
  await page
    .getByRole("link", { name: "COHR Coherent Corp.", exact: true })
    .click();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("navigation", { name: "종목 상세 보기" }),
  ).toBeVisible();
});

test("keeps the sticky ticker link above a horizontally scrolled analyst column", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium");
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/tickers");

  const tableScroll = page.locator(".table-scroll");
  const scrollLeft = await tableScroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    return element.scrollLeft;
  });
  expect(scrollLeft).toBeGreaterThan(0);

  const tickerLink = page.getByRole("link", {
    name: "COHR Coherent Corp.",
    exact: true,
  });
  await expect(tickerLink).toBeVisible();
  await tickerLink.click();

  await expect(page).toHaveURL(/\/tickers\/COHR$/);
  await expect(
    page.getByRole("dialog", { name: "COHR 언급 분석가" }),
  ).toHaveCount(0);
});
