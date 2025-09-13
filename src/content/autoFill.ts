(() => {
  const SCRIPT_NAME = "AUTO_FILL";
  if (
    (window as any)._quizScriptRunning &&
    (window as any)._quizScriptRunning !== SCRIPT_NAME
  ) {
    console.warn(
      `⚠️ Script khác đang chạy: ${(window as any)._quizScriptRunning}`
    );
    return;
  }
  // Chặn chạy song song tuyệt đối
  (window as any)._quizScriptRunning = SCRIPT_NAME;
  window.addEventListener("beforeunload", () => {
    (window as any)._quizScriptRunning = null;
  });
  (window as any)._quizScriptObservers ||= [];
  interface Payload {
    title: string;
    content: string;
  }
  // Đợi phần tử xuất hiện & hiển thị
  const waitElement = <T extends Element = Element>(
    selector: string,
    time = 1500
  ): Promise<T[]> =>
    new Promise((resolve, reject) => {
      (window as any)._quizScriptObservers ||= [];
      const scan = () =>
        Array.from(document.querySelectorAll(selector)).filter(
          (el) => (el as HTMLElement).offsetHeight > 0
        ) as T[];

      let idle: number | undefined;
      const first = scan();
      if (first.length > 0) {
        idle = window.setTimeout(() => resolve(scan()), 250);
      }
      const observer = new MutationObserver(() => {
        clearTimeout(idle);
        idle = window.setTimeout(() => {
          observer.disconnect();
          resolve(scan());
        }, 250);
      });

      (window as any)._quizScriptObservers.push(observer);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
      });

      setTimeout(() => {
        clearTimeout(idle);
        observer.disconnect();
        const final = scan();
        final.length
          ? resolve(final)
          : reject(
              new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`)
            );
      }, time);
    });

  const delay = (time: number) => new Promise((res) => setTimeout(res, time));

  const inputTitle = async (inputs: HTMLInputElement[], title: string) => {
    const field = inputs.find((i) => ["text"].includes(i.type) && i.required);
    if (!field) return;
    if (field.value === title) {
      console.log("✅ Title đã tồn tại");
      return;
    }
    field.value = title;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị input:", title);
    delay(200);
  };

  const fillEditorContent = async (editor: HTMLElement, content: string) => {
    const beforeInputEvent = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: content,
    });
    editor.dispatchEvent(beforeInputEvent);

    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: content,
    });
    editor.dispatchEvent(inputEvent);
  };

  const getRandomElement = (item: string[]) => {
    return item[Math.floor(Math.random() * item.length)];
  };
  const createRandomContent = async (): Promise<string> => {
    const jsonFilePath = chrome.runtime.getURL(`content/data/fill.json`);
    try {
      const res = await fetch(jsonFilePath);
      if (!res.ok) {
        return "";
      }
      const data: {
        pronouns: string[];
        words: string[];
        verbs: string[];
        adjectives: string[];
        adverbs: string[];
      } = (await res.json()).data;
      // const data = json.data;

      const sentenceParts = [];
      for (let i = 0; i < 10; i++) {
        const pronoun = getRandomElement(data.pronouns);
        const word = getRandomElement(data.words);
        const verb = getRandomElement(data.verbs);
        const adjective = getRandomElement(data.adjectives);
        const adverb = getRandomElement(data.adverbs);

        // Tạo mỗi phần câu và thêm vào mảng
        sentenceParts.push(`${pronoun} ${adverb} ${verb} ${adjective} ${word}`);
      }

      return sentenceParts.join(", ") + ".";
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  const handleAutoFill = async (payload: Payload, autoSubmit: boolean) => {
    try {
      const inputs = (await waitElement("input#title")) as HTMLInputElement[];
      if (inputs) {
        await inputTitle(inputs, payload.title);
      }

      const editors = (await waitElement(
        ".data-cml-editor-scroll-content"
      )) as HTMLElement[];
      if (editors) {
        for (const item of editors) {
          const editor = item.querySelector(
            '[contenteditable="true"][role="textbox"]'
          ) as HTMLElement;
          const content: string =
            payload.content !== ""
              ? payload.content
              : await createRandomContent();
          fillEditorContent(editor, content);
          await delay(500);
        }
      }

      const checkbox = document.getElementById("agreement-checkbox-base");
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
              'button[data-testid="preview"]'
            ) as HTMLElement;
            if (submitBtn) {
              submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
              submitBtn.click();
            }
            await delay(500);
          }
        }
      } else {
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
          await delay(300);
          const submitBtn = document.querySelector(
            'button[data-testid="preview"]'
          ) as HTMLElement;
          if (submitBtn) {
            submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            submitBtn.click();
          }
          await delay(500);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      (window as any)._quizScriptRunning = null;
    }
  };

  // Gỡ listener cũ nếu có
  if ((window as any)._autoFillListener) {
    chrome.runtime.onMessage.removeListener((window as any)._autoFillListener);
  }

  // Listener mới (có phản hồi và giữ cổng async)
  (window as any)._autoFillListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "AUTO_FILL" && message.payload) {
      (window as any)._quizScriptRunning = SCRIPT_NAME;
      (async () => {
        await handleAutoFill(message.payload, message.autoSubmit);
      })();
    }
  };
  chrome.runtime.onMessage.addListener((window as any)._autoFillListener);

  // Chỉ add listener nếu môi trường có chrome.runtime
  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._autoFillListener;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._autoFillListener;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
