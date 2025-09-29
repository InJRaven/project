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
      return true;
    }
    return false;
  };

  const inputField = async (inputs: HTMLInputElement[], answer: string) => {
    const field = inputs.find(
      (i) =>
        ["text", "number", "email", "search", "tel", "url"].includes(i.type) &&
        i.required
    );
    if (!field) return;
    await delay(200);
    field.value = answer;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị input:", answer);
  };

  const textareaField = async (
    textarea: HTMLTextAreaElement,
    answer: string
  ) => {
    if (!textarea) return;
    await delay(200);
    textarea.value = answer;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị textarea:", answer);
  };
  const richTextBoxField = async (rtb: HTMLElement, answers: string) => {
    if (!rtb) return;
    await delay(500);
    const beforeInputEvent = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: answers,
    });
    rtb.dispatchEvent(beforeInputEvent);

    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: answers,
    });
    rtb.dispatchEvent(inputEvent);
    await delay(500);
  };
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
  const getStartAssignmentBtn = async (
    timeOut = 3000
  ): Promise<HTMLElement | null> => {
    try {
      const btns = (await checkElement(
        'button[type="button"]',
        timeOut
      )) as HTMLElement[];
      return (
        btns.find((b) =>
          normalizeText(b.innerText).includes(normalizeText("Start assignment"))
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
      const checkbox = document.getElementById("agreement-checkbox-base");
      if (checkbox) {
        (window as any)._quizScriptRunning = null;
        console.warn("⚠️ Đây Là List Quiz Không Phải One By One");
        return;
      }
      const startAssignmentBtn = await getStartAssignmentBtn(300);
      if (startAssignmentBtn) {
        await handleClickButton(startAssignmentBtn, 300);
      }
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
            await handleClickButton(btn, 1000);
            break;
          case "NEXT":
            await handleClickButton(btn, 1000);
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
                    await handleClickButton(skipBtn, 1000);
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
              const richTextBox = item.querySelector(
                '[contenteditable="true"][role="textbox"]'
              ) as HTMLElement;
              const chosenAnswers: boolean[] = [];
              for (const answer of matched.answers) {
                const selected = await inputRadioAndCheckbox(inputs, answer);
                if (selected) {
                  chosenAnswers.push(true);
                }
                await inputField(inputs, answer);
                await textareaField(textarea, answer);
                await richTextBoxField(richTextBox, answer);
              }
              if (
                inputs.some(
                  (i) => i.type === "radio" || i.type === "checkbox"
                ) &&
                chosenAnswers.length === 0
              ) {
                const skipBtn = await getSkipButton(800);
                if (skipBtn) {
                  await handleClickButton(skipBtn, 1000);
                  console.log("⏭ [SKIP] Không tick được đáp án nào");
                  continue;
                }
              }
            }

            await handleClickButton(btn, 1000);
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
