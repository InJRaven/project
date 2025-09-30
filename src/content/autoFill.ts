(() => {
  const SCRIPT_NAME = "AUTO_FILL";

  // Ở TOP (nếu script có thể bị inject lại):
  if ((window as any)._quizScriptRunning) {
    console.warn(`⚠️ Đang chạy: ${(window as any)._quizScriptRunning}`);
    return;
  }
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

      const isVisible = (el: Element) => {
        const he = el as HTMLElement;
        if (!he) return false;
        if (he.hidden) return false;

        const style = getComputedStyle(he);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          return false;
        }
        const rects = he.getClientRects();
        return he.offsetHeight > 0 || he.offsetWidth > 0 || rects.length > 0;
      };

      const scan = () =>
        Array.from(document.querySelectorAll<T>(selector)).filter(
          isVisible
        ) as T[];

      let idle: number | undefined;
      let raf: number | undefined;
      let timer: number | undefined;
      let done = false;

      const cleanup = (observer?: MutationObserver) => {
        if (idle) {
          clearTimeout(idle);
          idle = undefined;
        }
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        if (raf) {
          cancelAnimationFrame(raf);
          raf = undefined;
        }
        if (observer) {
          try {
            observer.disconnect();
          } catch {}
          const arr: MutationObserver[] =
            (window as any)._quizScriptObservers || [];
          const idx = arr.indexOf(observer);
          if (idx > -1) arr.splice(idx, 1);
        }
      };

      const observer = new MutationObserver(() => {
        if (done) return;
        if (idle) {
          clearTimeout(idle);
          idle = undefined;
        }
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const found = scan();
          if (found.length) {
            done = true;
            cleanup(observer);
            resolve(found);
          }
        });
      });

      (window as any)._quizScriptObservers.push(observer);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
      });

      // Nếu đã có sẵn thì resolve sớm (vẫn cleanup observer)
      const first = scan();
      if (first.length) {
        idle = window.setTimeout(() => {
          if (done) return;
          done = true;
          cleanup(observer);
          // re-scan để chắc chắn phần tử còn hiển thị
          resolve(scan());
        }, 50);
      }

      // Timeout cứng như cũ (giữ nguyên hành vi reject)
      timer = window.setTimeout(() => {
        if (done) return;
        const final = scan();
        done = true;
        cleanup(observer);
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
    delay(500);
    field.value = title;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị input:", title);
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
      const inputs = await waitElement<HTMLInputElement>("input#title").catch(
        () => [] as HTMLInputElement[]
      );
      if (inputs.length) {
        await inputTitle(inputs, payload.title);
      }

      const editors = await waitElement<HTMLElement>(
        ".data-cml-editor-scroll-content"
      ).catch(() => [] as HTMLElement[]);

      if (editors.length) {
        for (const item of editors) {
          const editor = item.querySelector(
            '[contenteditable="true"][role="textbox"]'
          ) as HTMLElement;

          if (!editor) continue;
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
