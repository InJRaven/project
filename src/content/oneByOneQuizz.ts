(() => {
  const SCRIPT_NAME = "OneByOne";
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
  type BtnAction = "CHECK" | "NEXT" | "SUBMIT" | "UNKNOWN";

  const normalizeText = (text: string | null): string => {
    if (text == null) return "";
    return text
      .replace(/^\d+\.\s*Question\s*\d+/i, "")
      .replace(/\d+\s*point[s]?$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  const containsKeyPhrase = (text: string | null, phrase: string): boolean =>
    normalizeText(text).includes(normalizeText(phrase));

  const delay = (time: number) => new Promise((res) => setTimeout(res, time));

  const checkElement = (selector: string, time = 1500): Promise<Element[]> => {
    return new Promise((resolve, reject) => {
      const container = document.querySelector(
        '[data-testid="scroll-container"]'
      );
      if (!container) {
        return reject(new Error("❌ Không tìm thấy scroll container"));
      }

      const findVisible = (): Element[] =>
        Array.from(container.querySelectorAll(selector)).filter(
          (el) => (el as HTMLElement).offsetHeight > 0
        );

      const initial = findVisible();
      if (initial.length > 0) return resolve(initial);

      const observer = new MutationObserver(() => {
        const visible = findVisible();
        if (visible.length > 0) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(visible);
        }
      });
      (window as any)._quizScriptObservers.push(observer);
      observer.observe(document.body, { childList: true, subtree: true });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`));
      }, time);
    });
  };

  const inputRadioAndCheckbox = async (
    inputs: HTMLInputElement[],
    answer: string
  ) => {
    const inputTypes = new Set(["radio", "checkbox"]);
    const relevantInputs = inputs.filter((i) => inputTypes.has(i.type));
    if (relevantInputs.length === 0) return;

    for (const input of relevantInputs) {
      const labelText = input.closest("label")?.innerText;
      if (!labelText) continue;
      if (normalizeText(labelText) !== normalizeText(answer)) continue;

      if (!input.checked) {
        await delay(200);
        input.dispatchEvent(
          new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
        );
        console.log(`✅ Đã chọn:`, answer);
      } else {
        console.log(`⚠️ Đáp án ${input.type} đã được chọn đúng:`, answer);
      }

      if (input.type === "radio") return true;
    }
    return false;
  };

  const inputField = async (inputs: HTMLInputElement[], answer: string) => {
    const field = inputs.find((i) =>
      ["text", "number", "email", "search", "tel", "url"].includes(i.type)
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

  // const handleSubmitButton = async () => {
  //   const buttons = (await checkElement(
  //     'button[type="button"]'
  //   )) as HTMLElement[];

  //   const submitButton = buttons.find((btn) =>
  //     ["Check", "Next", "Submit assignment"].some((k) =>
  //       normalizeText(btn.innerText).includes(k)
  //     )
  //   );
  //   if (!submitButton) return false;

  //   const text = normalizeText(submitButton.innerText);
  //   await delay(500);
  //   submitButton.dispatchEvent(
  //     new MouseEvent("click", { view: window, bubbles: true, cancelable: true })
  //   );
  //   submitButton.click();
  //   return text !== "Submit assignment";
  // };

  const getButton = async (timeOut = 3000): Promise<HTMLElement | null> => {
    const innerButton = ["Check", "Next", "Submit assignment"];
    try {
      // chờ có button xuất hiện
      const btns = (await checkElement(
        'button[type="button"]',
        timeOut
      )) as HTMLElement[];

      // lọc theo nội dung
      const found =
        btns.find((b) =>
          innerButton.some((i) =>
            normalizeText(b.innerText).includes(normalizeText(i))
          )
        ) || null;

      return found;
    } catch (error) {
      console.warn(
        `⏰ Timeout ${timeOut}ms: không tìm thấy button hợp lệ`,
        error
      );
      return null;
    }
  };
  const getSkipButton = async (timeOut = 3000): Promise<HTMLElement | null> => {
    try {
      const btns = (await checkElement(
        'button[type="button"]',
        timeOut
      )) as HTMLElement[];
      return (
        btns.find((b) =>
          normalizeText(b.innerText).includes(normalizeText("Skip"))
        ) || null
      );
    } catch {
      return null;
    }
  };
  const readAction = (btn: HTMLElement): BtnAction => {
    const t = normalizeText(btn.innerText);

    if (t.includes("Submit assignment")) return "SUBMIT";
    if (t.includes("Next")) return "NEXT";
    if (t.includes("Check")) return "CHECK";
    return "UNKNOWN";
  };

  const handleClickButton = async (btn: HTMLElement, time = 800) => {
    btn.dispatchEvent(
      new MouseEvent("click", { view: window, bubbles: true, cancelable: true })
    );
    btn.click();
    await delay(time);
  };

  const oneByOneQuizz = async (subject: string) => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/${subject}.json`);
    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) return;
      const data: QuestionData[] = await res.json();

      while (true) {
        const confirmBtn = document.querySelector(
          '[data-testid="dialog-submit-button"]'
        ) as HTMLElement | null;

        if (confirmBtn) {
          if (confirmBtn) {
            await delay(500);
            confirmBtn.dispatchEvent(
              new MouseEvent("click", {
                view: window,
                bubbles: true,
                cancelable: true,
              })
            );
            confirmBtn.click();
          }
          break;
        }

        const btn = await getButton(1000);

        if (!btn) {
          await delay(1000);
          continue;
        }

        switch (readAction(btn)) {
          case "SUBMIT":
            await handleClickButton(btn, 800);
            break;
          case "NEXT":
            await handleClickButton(btn, 800);
            break;
          case "CHECK": {
            const talkeQuestionFromCousera = (await checkElement(
              '[data-testid^="part-Submission_"]'
            )) as HTMLElement[];

            if (talkeQuestionFromCousera.length > 1) {
              console.warn("⚠️ Đây Là List Quizz — Dừng script");
              (window as any)._quizScriptRunning = null;
              return;
            }
            for (const item of talkeQuestionFromCousera) {
              const matched = data.find((dt) =>
                containsKeyPhrase(item.innerText, dt.question)
              );
              if (!matched) {
                console.warn("⚠️ Không tìm thấy câu hỏi khớp:", item.innerText);
                if (!matched) {
                  console.warn(
                    "⚠️ Không tìm thấy câu hỏi khớp:",
                    item.innerText
                  );

                  const skipBtn = await getSkipButton(800);
                  if (skipBtn) {
                    await handleClickButton(skipBtn, 800);
                    console.log("⏭ Đã bấm Skip do không tìm thấy câu hỏi khớp");
                  }
                  continue;
                }
              }

              const inputs = Array.from(
                item.querySelectorAll("input")
              ) as HTMLInputElement[];
              const textarea = item.querySelector(
                "textarea[required]"
              ) as HTMLTextAreaElement;

              for (const answer of matched.answers) {
                await inputRadioAndCheckbox(inputs, answer);
                await inputField(inputs, answer);
                await textareaField(textarea, answer);
              }
            }
            await handleClickButton(btn, 800);
            continue;
          }

          default: {
            await delay(800);
            continue;
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      (window as any)._quizScriptRunning = null;
    }
  };

  // Gỡ listener cũ nếu tồn tại
  if ((window as any)._quizMessageListener) {
    chrome.runtime.onMessage.removeListener(
      (window as any)._quizMessageListener
    );
  }

  // Tạo listener mới
  (window as any)._quizMessageListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "oneByOne" && message.subject) {
      (window as any)._quizScriptRunning = SCRIPT_NAME;
      oneByOneQuizz(message.subject);
    }
  };

  // Đăng ký listener
  chrome.runtime.onMessage.addListener((window as any)._quizMessageListener);

  // Dọn dẹp khi rời trang
  // window.addEventListener("beforeunload", () => {
  //   chrome.runtime.onMessage.removeListener(
  //     (window as any)._quizMessageListener
  //   );
  //   delete (window as any)._quizMessageListener;
  //   delete (window as any)._quizScriptRunning;
  // });

  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._quizMessageListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._quizMessageListener;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
