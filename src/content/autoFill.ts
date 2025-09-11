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
  // const waitElement = <T extends Element = Element>(
  //   selector: string,
  //   time = 1500
  // ): Promise<T[]> =>
  //   new Promise((resolve, reject) => {
  //     (window as any)._quizScriptObservers ||= [];
  //     const scan = () =>
  //       Array.from(document.querySelectorAll(selector)).filter(
  //         (el) => (el as HTMLElement).offsetHeight > 0
  //       ) as T[];

  //     let idle: number | undefined; // <-- thêm 1 biến
  //     const first = scan();
  //     if (first.length > 0) {
  //       // đợi yên 250ms để gom đủ, không resolve ngay
  //       idle = window.setTimeout(() => resolve(scan()), 250);
  //     }
  //     console.log(idle);
  //     const observer = new MutationObserver(() => {
  //       // reset idle mỗi khi có thay đổi
  //       clearTimeout(idle);
  //       idle = window.setTimeout(() => {
  //         observer.disconnect();
  //         resolve(scan());
  //       }, 250);
  //     });

  //     (window as any)._quizScriptObservers.push(observer);
  //     observer.observe(document.documentElement, {
  //       childList: true,
  //       subtree: true,
  //       attributes: true,
  //       attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  //     });

  //     setTimeout(() => {
  //       clearTimeout(idle);
  //       observer.disconnect();
  //       const final = scan();
  //       final.length
  //         ? resolve(final)
  //         : reject(
  //             new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`)
  //           );
  //     }, time);
  //   });
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
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`⏰ Timeout ${time}ms: Không tìm thấy ${selector}`));
      }, time);
    });
  };
  const delay = (time: number) => new Promise((res) => setTimeout(res, time));

  const inputTitle = async (inputs: HTMLInputElement[], title: string) => {
    const field = inputs.find((i) => ["text"].includes(i.type) && i.required);
    if (!field) return;
    field.value = title;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("✅ Gán giá trị input:", title);
    delay(200);
  };
  const autoFill = async (payload: Payload) => {
    try {
      const inputs = (await waitElement("input#title")) as HTMLInputElement[];

      if (inputs) {
        await inputTitle(inputs, payload.title);
      }
      // const editors = (await waitElement(
      //   '[contenteditable="true"][role="textbox"]'
      // )) as HTMLInputElement[];
      // if (!editors) {
      //   console.log(editors);
      //   return;
      // }
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
    if (message.action === "AUTO_FILL") {
      (window as any)._quizScriptRunning = SCRIPT_NAME;
      autoFill(message.payload);
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
