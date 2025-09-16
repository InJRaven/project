(() => {
  const normalizeText = (text: string | null): string => {
    if (text == null) return "";
    return text
      .replace(/Current Time\s*\d+:\d+\/\d+:\d+\s*Loaded:\s*\d+(\.\d+)?%/gi, "")
      .replace(/\uFEFF/g, "")
      .replace(
        /[\u200B-\u200D\u2060\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g,
        ""
      )
      .replace(/\u00A0/g, " ")
      .normalize("NFKC")
      .replace(/^\d+\.\s*Question\s*\d+/i, "")
      .replace(/\d+\s*point[s]?$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const run = (type: string) => {
    const urls: string[] = [];
    const found = document.querySelectorAll(
      '[data-e2e="ungrouped-non-peer-assignment-row"]'
    );

    switch (type) {
      case "Practice Assignment": {
        const links = Array.from(
          document.querySelectorAll("a")
        ) as HTMLAnchorElement[];

        links.forEach((link) => {
          const text = link.textContent || "";
          if (
            text.includes("Practice Assignment") &&
            !text.includes("Peer-graded") &&
            link.href
          ) {
            urls.push(link.href);
          }
        });
        break;
      }
      case "Practice Peer-graded Assignment": {
        const links = Array.from(
          document.querySelectorAll("a")
        ) as HTMLAnchorElement[];
        links.forEach((link) => {
          const text = normalizeText(link?.innerText);
          if (text.includes("Practice Peer-graded Assignment") && link.href) {
            urls.push(link.href);
          }
        });
        break;
      }
      case "Graded App": {
        found.forEach((item) => {
          const text = item.textContent || "";
          if (text.includes("Graded App Item")) {
            const link = item.querySelector(
              'a[data-click-key="open_course_home.grades_page.click.grades_page_item_link"]'
            ) as HTMLAnchorElement | null;
            if (link?.href) {
              urls.push(link.href);
            }
          }
        });
        break;
      }

      case "Submit Assignment": {
        const elements = document.getElementsByClassName("css-1kvxuy");

        for (let k = 0; k < elements.length; k++) {
          const linkEl = elements[k].querySelector(
            'a[data-click-key="open_course_home.grades_page.click.grades_page_item_link"]'
          ) as HTMLAnchorElement | null;

          const text = linkEl?.textContent || "";
          const href = linkEl?.getAttribute("href");

          if (text.includes("Submit your assignment") && href) {
            urls.push(`${window.location.origin}${href}/submit`);
          }
        }
        break;
      }

      case "Discussion": {
        const links = Array.from(
          document.querySelectorAll("a")
        ) as HTMLAnchorElement[];

        links.forEach((link) => {
          const text = link.textContent || "";
          if (
            text.trim().toLowerCase().includes("discussion prompt") &&
            link.href
          ) {
            urls.push(link.href);
          }
        });
        break;
      }

      case "Graded Assignment": {
        found.forEach((item) => {
          const text = item.textContent || "";
          if (text.includes("Graded Assignment")) {
            const link = item.querySelector(
              'a[data-click-key="open_course_home.grades_page.click.grades_page_item_link"]'
            ) as HTMLAnchorElement | null;
            if (link?.href) {
              urls.push(link.href);
            }
          }
        });
        break;
      }
    }

    if (urls.length > 0) {
      console.log(`✅ [${type}] Found ${urls.length} link(s).`);
      chrome.runtime.sendMessage({ urls });
    } else {
      console.log(`❌ [${type}] Không tìm thấy link nào.`);
    }
  };

  // ✅ Chống đăng ký listener nhiều lần khi script được inject nhiều lần
  if (!(window as any)._courseraToolListenerAdded) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "runAssignment" && msg.type) {
        run(msg.type);
      }
    });

    (window as any)._courseraToolListenerAdded = true;
  }
})();
