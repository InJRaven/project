(() => {
  const SCRIPT_NAME = "CheckQuiz";

  // Chặn chạy song song nhiều script
  if (
    (window as any)._quizScriptRunning &&
    (window as any)._quizScriptRunning !== SCRIPT_NAME
  ) {
    console.warn(
      `⚠️ Script khác đang chạy: ${(window as any)._quizScriptRunning}`
    );
    return;
  }

  (window as any)._quizScriptRunning = SCRIPT_NAME;

  // Khởi tạo kho observer (nếu chưa có)
  if (!(window as any)._quizScriptObservers) {
    (window as any)._quizScriptObservers = [];
  }

  // Dọn dẹp cờ khi rời trang
  window.addEventListener("beforeunload", () => {
    (window as any)._quizScriptRunning = null;
  });

  type QuestionData = {
    question: string;
    answers: string[];
  };

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

  const containsKeyPhrase = (text: string | null, phrase: string): boolean => {
    return normalizeText(text).includes(normalizeText(phrase));
  };

  const waitElement = (selector: string, time = 1500): Promise<Element[]> => {
    return new Promise((resolve, reject) => {
      const found = Array.from(document.querySelectorAll(selector)).filter(
        (el) => (el as HTMLElement).offsetHeight > 0
      );
      if (found.length > 0) return resolve(found);

      const observer = new MutationObserver(() => {
        const visible = Array.from(document.querySelectorAll(selector)).filter(
          (el) => (el as HTMLElement).offsetHeight > 0
        );
        if (visible.length > 0) {
          observer.disconnect();
          resolve(visible);
        }
      });
      (window as any)._quizScriptObservers.push(observer);
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        try {
          observer.disconnect();
        } catch {}
        reject(new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`));
      }, time);
    });
  };

  const checQuiz = async (subject: string, autoSubmit: boolean) => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/${subject}.json`);

    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) return;
      const data: QuestionData[] = await res.json();

      const talkeQuestionFromCousera = (await waitElement(
        '[data-testid^="part-Submission_"]'
      )) as HTMLElement[];

      for (let idx = 0; idx < talkeQuestionFromCousera.length; idx++) {
        const item = talkeQuestionFromCousera[idx];

        // Tìm câu hỏi trong data
        const matchedQuestion = data.find((dt) =>
          containsKeyPhrase(item.innerText, dt.question)
        );

        if (!matchedQuestion) {
          console.error(
            `⚠️ [Q${idx + 1}] Không tìm thấy câu hỏi khớp:`,
            normalizeText(item.innerText)
          );
          continue;
        }

        const inputs = Array.from(
          item.querySelectorAll("input")
        ) as HTMLInputElement[];

        // Chuẩn hóa đáp án theo data
        const normalizedAnswers = matchedQuestion.answers.map((a) =>
          normalizeText(a)
        );

        // Lấy các label của input.checked hiện tại
        const checkedLabelsNormalized: string[] = inputs
          .filter((inp) => inp.checked)
          .map((inp) => normalizeText(inp.closest("label")?.innerText || ""))
          .filter((t) => t.length > 0);

        // Log các đáp án match (để bạn thấy hệ thống đang khớp gì)
        for (const i of inputs) {
          const labelText = normalizeText(i.closest("label")?.innerText || "");
          if (!labelText) continue;
          if (normalizedAnswers.includes(labelText)) {
            console.log(
              `✅ [Q${idx + 1}] Candidate match in data:`,
              labelText,
              i.checked ? "(checked)" : ""
            );
          }
        }

        // Kiểm tra: có input.checked nào trùng với đáp án trong data không?
        const hasCheckedMatch = checkedLabelsNormalized.some((lbl) =>
          normalizedAnswers.includes(lbl)
        );

        if (!hasCheckedMatch) {
          // THỎA ĐIỀU KIỆN YÊU CẦU: Câu hỏi có trong data nhưng không có đáp án dựa theo input.checked
          console.warn(
            `⚠️ [Q${
              idx + 1
            }] Câu hỏi có trong data nhưng không có đáp án nào (theo input.checked) trùng với data.`,
            {
              questionFromData: normalizeText(matchedQuestion.question),
              expectedAnswers: normalizedAnswers,
              checkedLabels: checkedLabelsNormalized,
            }
          );
        }
      }
    } catch (err) {
      console.error("Lỗi khi chọn đáp án:", err);
    } finally {
      // Dọn dẹp observer (nếu còn)
      try {
        const list: MutationObserver[] =
          (window as any)._quizScriptObservers || [];
        list.forEach((ob) => {
          try {
            ob.disconnect();
          } catch {}
        });
        (window as any)._quizScriptObservers = [];
      } catch {}
      (window as any)._quizScriptRunning = null;
    }
  };

  // Gỡ listener cũ nếu có
  if ((window as any)._checkQuizListener) {
    try {
      chrome.runtime.onMessage.removeListener(
        (window as any)._checkQuizListener
      );
    } catch {}
  }

  // ===== Tạo listener mới =====
  (window as any)._checkQuizListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "checkQuiz" && message.subject) {
      (async () => {
        await checQuiz(message.subject, message.autoSubmit);
      })();
    }
  };

  chrome.runtime.onMessage.addListener((window as any)._checkQuizListener);

  // Dọn dẹp khi rời trang
  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._checkQuizListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._checkQuizListener;
    }
    try {
      const list: MutationObserver[] =
        (window as any)._quizScriptObservers || [];
      list.forEach((ob) => {
        try {
          ob.disconnect();
        } catch {}
      });
      (window as any)._quizScriptObservers = [];
    } catch {}
    delete (window as any)._quizScriptRunning;
  });
})();
