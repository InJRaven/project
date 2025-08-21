(() => {
  const normalizeText = (text: string | null): string => {
    if (text == null) return "";
    return text
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
  const testData = async (subject: string) => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/${subject}.json`);

    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) return;
      const data: { question: string; answers: string[] }[] = await res.json();
      const count: Record<string, number> = {};

      data.forEach((item) => {
        const q = normalizeText(item.question);
        count[q] = (count[q] || 0) + 1;
      });

      // In ra những câu hỏi bị trùng
      let hasDuplicate = false;

      for (const q in count) {
        if (count[q] > 1) {
          console.log("❗ Câu hỏi bị trùng:", q);
          hasDuplicate = true;
        }
      }

      if (!hasDuplicate) {
        console.log("✅ Không có câu hỏi nào bị trùng. Chúc mừng bạn! 🎉");
      }
    } catch (error) {
      console.error("Lỗi khi đọc file JSON:", error);
    }
  };
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "runTestData" && message.subject) {
      (async () => {
        await testData(message.subject);
      })();
    }
  });
})();
