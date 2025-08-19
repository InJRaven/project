(() => {
  const SCRIPT_NAME = "ListQuizz";

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

  const delay = (time: number) => new Promise((res) => setTimeout(res, time));

  const inputRadioAndCheckbox = async (
    inputs: HTMLInputElement[],
    answer: string
  ) => {
    const inputTypes = new Set(["radio", "checkbox"]);
    const relevantInputs = inputs.filter((i) => inputTypes.has(i.type));

    if (relevantInputs.length === 0) return;
    for (const input of inputs) {
      if (!inputTypes.has(input.type)) continue;

      const takeAnswerFromWebsite = input.closest("label")?.innerText;
      if (!takeAnswerFromWebsite) continue;
      const isMatch =
        normalizeText(takeAnswerFromWebsite) === normalizeText(answer);

      if (!isMatch) continue;

      if (input.checked) {
        console.log(`⚠️ Đáp án ${input.type} đã được chọn đúng:`, answer);
        if (input.type === "radio") break;
        continue;
      }

      await delay(50);
      input.dispatchEvent(
        new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );
      console.log(`✅ Đã chọn:`, answer);
    }
  };

  const inputField = async (inputs: HTMLInputElement[], answer: string) => {
    const field = inputs.find(
      (i) =>
        ["text", "number", "email", "search", "tel", "url"].includes(i.type) &&
        i.required
    );
    if (!field) return;
    await delay(50);
    field.value = answer;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị input:", answer);
  };

  const textareaField = async (
    textarea: HTMLTextAreaElement,
    answer: string
  ) => {
    if (!textarea) return;
    await delay(50);
    textarea.value = answer;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị textarea:", answer);
  };

  const selectAnswers = async (subject: string, autoSubmit: boolean) => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/${subject}.json`);

    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) return;
      const data: QuestionData[] = await res.json();

      const talkeQuestionFromCousera = (await waitElement(
        '[data-testid^="part-Submission_"]'
      )) as HTMLElement[];
      const checkbox = document.getElementById("agreement-checkbox-base");

      if (!talkeQuestionFromCousera) {
        return;
      }

      if (!checkbox) {
        (window as any)._quizScriptRunning = null;
        console.warn("⚠️ Đây Là One By One Không Phải List Quiz ");

        return;
      }

      for (const item of talkeQuestionFromCousera) {
        const matchedQuestion = data.find((dt) =>
          containsKeyPhrase(item.innerText, dt.question)
        );
        if (!matchedQuestion) {
          console.warn("⚠️ Không tìm thấy câu hỏi khớp:", item.innerText);
          continue;
        }
        /** START: TAKE INPUT */
        const inputs = Array.from(item.querySelectorAll("input"));
        /** END: TAKE INPUT */
        const textarea = item.querySelector(
          "textarea[required]"
        ) as HTMLTextAreaElement;
        for (const answer of matchedQuestion.answers) {
          console.log(`🔎 Tìm đáp án: "${answer}"`);

          // Tìm input type phù hợp
          await inputRadioAndCheckbox(inputs, answer);
          await inputField(inputs, answer);
          await textareaField(textarea, answer);
        }
      }

      if (checkbox instanceof HTMLInputElement) {
        checkbox.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        await delay(150);
        if (!checkbox.checked) {
          checkbox.dispatchEvent(
            new MouseEvent("click", {
              view: window,
              bubbles: true,
              cancelable: true,
            })
          );

          checkbox.checked = true;
          checkbox.dispatchEvent(
            new Event("change", {
              bubbles: true,
              cancelable: true,
            })
          );
        }
      }
      if (autoSubmit) {
        const deadline = Date.now() + 5000; // 15s timeout
        while (Date.now() < deadline) {
          const confirmBtn = document.querySelector(
            '[data-testid="dialog-submit-button"]'
          ) as HTMLElement;
          if (confirmBtn) {
            console.log("✅ Đã tìm thấy và click Confirm Button");
            confirmBtn.click();
            break;
          }
          const submitBtn = document.querySelector(
            '[data-testid="submit-button"]'
          ) as HTMLElement;
          if (submitBtn) {
            submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            submitBtn.click();
          }
          await delay(500);
        }
      }
    } catch (err) {
      console.error("Lỗi khi chọn đáp án:", err);
    } finally {
      (window as any)._quizScriptRunning = null;
    }
  };

  if ((window as any)._quizListQuizzListener) {
    chrome.runtime.onMessage.removeListener(
      (window as any)._quizListQuizzListener
    );
  }

  // ===== Tạo listener mới =====
  (window as any)._quizListQuizzListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "runQuizz" && message.subject) {
      (async () => {
        await selectAnswers(message.subject, message.autoSubmit);
      })();
    }
  };

  chrome.runtime.onMessage.addListener((window as any)._quizListQuizzListener);

  // Dọn dẹp khi rời trang
  // window.addEventListener("beforeunload", () => {
  //   chrome.runtime.onMessage.removeListener(
  //     (window as any)._quizListQuizzListener
  //   );
  //   delete (window as any)._quizListQuizzListener;
  //   delete (window as any)._quizScriptRunning;
  // });
  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._quizListQuizzListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._quizListQuizzListener;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
