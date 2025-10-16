(() => {
  const SCRIPT_NAME = "SkipMoocCoursera";

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

  if ((window as any)._skipMoocCoursera) {
    chrome.runtime.onMessage.removeListener((window as any)._skipMoocCoursera);
  }
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

  /** Fetch Data UserID*/
  const fetchUserId = async () => {
    try {
      const response = await fetch(
        "https://www.coursera.org/api/adminUserPermissions.v1?q=my",
        {
          headers: {
            accept: "*/*",
            "x-coursera-version": "291f90f53a5530abbce983e43c3b63c513ffd3ff",
            "x-requested-with": "XMLHttpRequest",
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const id = data.elements[0].id;
      return id; // Trả về ID
    } catch (error) {
      console.error("Error fetching user ID:", error);
      return null; // Trả về null nếu có lỗi
    }
  };

  /** Get Cookie*/
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop()?.split(";").shift() ?? "" : "";
  };

  /** Handle Item */
  const handleItem = async () => {
    
  }

  const skipAllMooc = async () => {
    const modulePool = (await waitElement(
      '[id^="circle-menu-item-"]'
    )) as HTMLElement[];

    const modules = (await waitElement(
      '[class="cds-button-disableElevation cds-button-primary"]'
    )) as HTMLElement[];

    const userId = await fetchUserId();

    const csrfToken = getCookie("CSRF3-Token");

    try {
      const allModule = [];
      if (modulePool.length !== 0) {
      }
      if (modules.length !== 0) {
      }
    } catch (error) {}
  };
  // ===== Tạo listener mới =====
  (window as any)._skipMoocCoursera = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "runQuizz" && message.subject) {
      (async () => {
        await skipAllMooc();
      })();
    }
  };

  chrome.runtime.onMessage.addListener((window as any)._skipMoocCoursera);

  window.addEventListener("beforeunload", () => {
    const fn = (window as any)._skipMoocCoursera;
    if (fn) {
      try {
        chrome.runtime.onMessage.removeListener(fn);
      } catch {}
      delete (window as any)._skipMoocCoursera;
    }
    delete (window as any)._quizScriptRunning;
  });
})();
