(() => {
  const SCRIPT_NAME = "TakeQuiz";

  // Ngăn script khác đang chạy
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

  // Dọn cờ khi rời trang
  window.addEventListener("beforeunload", () => {
    (window as any)._quizScriptRunning = null;
  });

  type QuestionData = {
    question: string;
    answers: string[];
  };

  const normalizeText = (text: any) => {
    const s = typeof text === "string" ? text : "";
    return s
      .replace(/\uFEFF/g, "")
      .replace(/[\u200B-\u200D\u2060]/g, "")
      .replace(/\u00A0/g, " ")
      .normalize("NFKC")
      .replace(/^\d+\.\s*Question\s*\d+/i, "")
      .replace(/\d+\s*point[s]?$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback bên dưới
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const takeQuiz = async () => {
    // ⚠️ Reset data mỗi lần
    const data: QuestionData[] = [];

    const questionsSection = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid^="part-Submission_"]'
      )
    );

    questionsSection.forEach((item) => {
      const questionEl = item.querySelector<HTMLElement>(
        '[data-testid="cml-viewer"]'
      );
      const legendEl = item.querySelector<HTMLElement>(
        'div[data-testid="legend"]'
      );
      const textReflect = legendEl?.nextElementSibling as HTMLElement | null;

      const inputsEl = Array.from(
        item.querySelectorAll<HTMLInputElement>("input")
      );
      const textareas = Array.from(
        item.querySelectorAll<HTMLTextAreaElement>("textarea")
      );
      const editable = Array.from(
        item.querySelectorAll<HTMLElement>('[contenteditable="true"]')
      );

      const question = normalizeText(questionEl?.innerText || "");
      const answers: string[] = [];

      // Lấy đáp án từ input (radio/checkbox)
      inputsEl.forEach((input) => {
        if (input.checked) {
          const label = input.closest("label") as HTMLElement | null;
          const txt = label
            ? normalizeText(label.innerText)
            : normalizeText(
                input.value || input.getAttribute("aria-label") || ""
              );
          if (txt) answers.push(txt);
        }
      });

      // Nếu không có input được chọn → thử câu trả lời dạng tự luận
      if (answers.length === 0) {
        // 1) Vùng phản hồi đi kèm legend
        if (textReflect && normalizeText(textReflect.innerText)) {
          answers.push(normalizeText(textReflect.innerText));
        }
        // 2) textarea
        textareas.forEach((ta) => {
          const val = normalizeText(ta.value);
          if (val) answers.push(val);
        });
        // 3) contenteditable
        editable.forEach((ed) => {
          const val = normalizeText(ed.innerText);
          if (val) answers.push(val);
        });
      }

      data.push({ question, answers });
    });

    const json = JSON.stringify(data, null, 2);
    const ok = await copyToClipboard(json);
    if (ok) {
      console.log("✅ Đã tự động copy. Dán vào IDE của bạn bằng Ctrl + V.");
    } else {
      console.warn("⚠️ Không thể copy tự động. Mở console để xem dữ liệu.");
      console.log(json);
    }
  };

  // Gỡ listener cũ (nếu có)
  if ((window as any)._takeQuizListener) {
    try {
      chrome.runtime.onMessage.removeListener(
        (window as any)._takeQuizListener
      );
    } catch {}
  }

  // Listener mới
  (window as any)._takeQuizListener = (
    message: any,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: any) => void
  ) => {
    if (message?.action === "takeQuiz") {
      // subject không dùng nên bỏ điều kiện thừa để không chặn chạy
      (async () => {
        try {
          await takeQuiz();
        } catch (err) {
          console.error("❌ takeQuiz error:", err);
        }
      })();
    }
  };

  chrome.runtime.onMessage.addListener((window as any)._takeQuizListener);

  // Dọn dẹp khi rời trang
  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._takeQuizListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._takeQuizListener;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
