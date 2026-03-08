const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (error) => console.log("BROWSER ERROR:", error.message));
  page.on("response", (response) => {
    if (!response.ok()) {
      console.log("BROWSER NETWORK ERROR:", response.url(), response.status());
    }
  });

  try {
    await page.goto("http://localhost:5173", {
      waitUntil: "networkidle0",
      timeout: 10000,
    });
    console.log("Page loaded successfully.");
  } catch (e) {
    console.log("Error loading page:", e.message);
  }

  await browser.close();
})();
