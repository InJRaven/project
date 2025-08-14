(() => {
  const SCRIPT_NAME = "TakeQuizz";

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
      .replace(/\uFEFF/g, "")
      .replace(/[\u200B-\u200D\u2060]/g, "")
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
        observer.disconnect();
        reject(new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`));
      }, time);
    });
  };

  const takeQuizz = async (subject: string, autoSubmit: boolean) => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/${subject}.json`);

    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) return;
      const data: QuestionData[] = await res.json();

      const talkeQuestionFromCousera = (await waitElement(
        '[data-testid^="part-Submission_"]'
      )) as HTMLElement[];

      for (const item of talkeQuestionFromCousera) {
        const matchedQuestion = data.find((dt) =>
          containsKeyPhrase(item.innerText, dt.question)
        );
        if (!matchedQuestion) {
          console.warn(
            "⚠️ Không tìm thấy câu hỏi khớp:",
            normalizeText(item.innerText)
          );
          continue;
        }
      }
    } catch (err) {
      console.error("Lỗi khi chọn đáp án:", err);
    } finally {
      (window as any)._quizScriptRunning = null;
    }
  };

  if ((window as any)._takeQuizzListener) {
    chrome.runtime.onMessage.removeListener((window as any)._takeQuizzListener);
  }

  // ===== Tạo listener mới =====
  (window as any)._takeQuizzListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "takeQuizz" && message.subject) {
      (async () => {
        await takeQuizz(message.subject, message.autoSubmit);
      })();
    }
  };

  chrome.runtime.onMessage.addListener((window as any)._takeQuizzListener);

  // Dọn dẹp khi rời trang
  // window.addEventListener("beforeunload", () => {
  //   chrome.runtime.onMessage.removeListener(
  //     (window as any)._takeQuizzListener
  //   );
  //   delete (window as any)._takeQuizzListener;
  //   delete (window as any)._quizScriptRunning;
  // });
  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._takeQuizzListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._takeQuizzListener;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
