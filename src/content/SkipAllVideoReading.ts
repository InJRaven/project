(() => {
  const SCRIPT_NAME = "SkipModuleCoursera";

  if (
    (window as any)._quizScriptRunning &&
    (window as any)._quizScriptRunning !== SCRIPT_NAME
  ) {
    console.warn(
      `⚠️ Script khác đang chạy: ${(window as any)._quizScriptRunning}`
    );
    return;
  }
  (window as any)._quizScriptObservers =
    (window as any)._quizScriptObservers || [];

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

  /** Helpers Function*/
  const getToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; CSRF3-Token=`);
    return parts.length === 2 ? parts.pop()?.split(";").shift() ?? "" : "";
  };
  const fetchJSON = async (url: string, init = {}) => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`[${res.status}] ${res.statusText} @ ${url}`);
    return res.json();
  };

  const dispatchAllWithin5sJitter = <T>(items: T[], start: (it: T) => void) => {
    const n = items.length;
    if (!n) return;
    if (n === 1) return void setTimeout(start, 0, items[0]);
    const w = 5000,
      j = 0.6,
      t0 = performance.now(),
      slot = w / n,
      pad = (slot * (1 - j)) / 2;
    for (let i = 0; i < n; i++) {
      const lo = i * slot + pad,
        hi = (i + 1) * slot - pad;
      const t = lo + Math.random() * (hi - lo);
      const delay = Math.max(0, t0 + t - performance.now());
      setTimeout(start, delay, items[i]);
    }
  };

  /** Take Materials with Slug */
  const fetchMaterialsBySlug = async (slug: string) => {
    const url =
      `https://www.coursera.org/api/onDemandCourseMaterials.v2/` +
      `?q=slug&slug=${slug}` +
      `&includes=modules%2Clessons%2CpassableItemGroups%2CpassableItemGroupChoices%2CpassableLessonElements%2Citems%2Ctracks%2CgradePolicy%2CgradingParameters%2CembeddedContentMapping` +
      `&fields=moduleIds%2ConDemandCourseMaterialItems.v2(name%2CoriginalName%2Cslug%2CtimeCommitment%2CcontentSummary%2CisLocked%2ClockableByItem%2CitemLockedReasonCode%2CtrackId%2ClockedStatus%2CitemLockSummary)` +
      `&showLockedItems=false`;
    const data = await fetchJSON(url, {
      headers: {
        accept: "*/*",
        "x-coursera-application": "ondemand",
        "x-coursera-version": "ddd917819a372a091e366e35ff5cf13c7a398da8",
        "x-requested-with": "XMLHttpRequest",
      },
      referrer: "no-referrer",
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "include",
    });

    const courseIdFromMaterials =
      data?.linked?.["onDemandGradingParameters.v1"]?.[0]?.id;
    const items = data?.linked?.["onDemandCourseMaterialItems.v2"] || [];

    return { courseIdFromMaterials, items };
  };

  /** Filter Content  lecture| supplement*/
  const filterTypeContent = (items: any) => {
    return items.filter(
      (item: any) =>
        item?.contentSummary &&
        (item.contentSummary.typeName === "lecture" ||
          item.contentSummary.typeName === "supplement")
    );
  };

  const contentItem = (
    type: string,
    userId: string,
    slug: string,
    itemId: string,
    courseIdFromMaterials: string,
    token: string
  ) => {
    if (type === "lecture") {
      return fetch(
        `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${slug}/item/${itemId}/lecture/videoEvents/ended?autoEnroll=false`,
        {
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "x-csrf3-token": token,
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          body: JSON.stringify({ contentRequestBody: {} }),
          method: "POST",
          mode: "cors",
          credentials: "include",
        }
      );
    }

    if (type === "supplement") {
      return fetch(
        "https://www.coursera.org/api/onDemandSupplementCompletions.v1",
        {
          method: "POST",
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "x-csrf3-token": token,
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          body: `{\"userId\":${userId},\"courseId\":\"${courseIdFromMaterials}\",\"itemId\":\"${itemId}\"}`,
          mode: "cors",
          credentials: "include",
        }
      );
    }

    /** Fallback */
    return Promise.resolve();
  };

  /** Handle Each Module */
  const processCourseraModuleBySlug = async (
    slug: string,
    userId: string,
    token: string
  ) => {
    console.log(`📘 Bắt đầu xử lý module với slug: ${slug}`);
    const { courseIdFromMaterials, items } = await fetchMaterialsBySlug(slug);
    const filtered = filterTypeContent(items);

    if (filtered.length === 0) {
      console.log(`⚠️ Không có item nào để xử lý cho slug: ${slug}`);
      return;
    }

    const promises: Promise<any>[] = [];

    // Wrap dispatchAllWithin5sJitter để đợi cho đến khi tất cả items được dispatch
    await new Promise<void>((resolve) => {
      let dispatchedCount = 0;

      dispatchAllWithin5sJitter(filtered, (item: any) => {
        console.log(
          `⏳ Chuẩn bị gửi request cho item: ${item.id} (${item.contentSummary.typeName})`
        );
        const p = contentItem(
          item.contentSummary.typeName,
          userId,
          slug,
          item.id,
          courseIdFromMaterials,
          token
        )
          .then(() =>
            console.log(
              `✅ Hoàn tất item: ${item.id} (${item.contentSummary.typeName})`
            )
          )
          .catch((e) =>
            console.error(
              `❌ Lỗi khi xử lý item: ${item.id} (${item.contentSummary.typeName})`,
              e
            )
          );

        promises.push(p);

        // Khi đã dispatch hết tất cả items
        dispatchedCount++;
        if (dispatchedCount === filtered.length) {
          resolve();
        }
      });
    });

    // Đợi tất cả promises hoàn thành
    console.log(`⏳ Đợi ${promises.length} items hoàn thành cho slug: ${slug}`);
    await Promise.allSettled(promises);
    console.log(`✅ Hoàn thành module: ${slug}`);
  };

  /** Handle Module Pool */
  const processCourseraModuleById = async (
    courseId: string,
    userId: string,
    token: string
  ) => {
    try {
      console.log(`📘 Lấy slug cho courseId: ${courseId}`);
      const data = await fetchJSON(
        `https://www.coursera.org/api/courses.v1/${courseId}?showHidden=true&fields=courseStatus,description,instructorIds,partnerIds,photoUrl,plannedLaunchDate,slug,upcomingSessionStartDate,workload`,
        {
          headers: {
            "x-coursera-application": "enterprise-home",
            "x-coursera-version": "7a252ec84d0501c60f47554f14e5371795c58bf8",
            "x-requested-with": "XMLHttpRequest",
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          method: "GET",
          mode: "cors",
          credentials: "include",
        }
      );

      const slug = data?.elements?.[0]?.slug;
      if (!slug) {
        console.warn(`⚠️ Không tìm thấy slug cho courseId: ${courseId}`);
        return;
      }

      return await processCourseraModuleBySlug(slug, userId, token);
    } catch (err) {
      console.error(`❌ Lỗi khi lấy slug cho courseId: ${courseId}`, err);
    }
  };

  const skipAllVideoReading = async () => {
    const modulePool = await waitElement('[id^="circle-menu-item-"]').catch(
      () => [] as HTMLInputElement[]
    );
    const el = document.querySelector(
      'div[data-track="true"][data-track-app="unified_description_page"][data-track-page^="consumer_"][data-track-action="click"][data-track-component="syllabus"][role="presentation"]'
    );
    const modules = Array.from(el?.querySelectorAll("a") ?? []).filter((a) =>
      (a.ariaLabel ?? "").toLowerCase().includes("course")
    );

    const modules2 = Array.from(el?.querySelectorAll("a") ?? []);
    const userId = await fetchUserId();

    const token = getToken();

    try {
      const allModule = [];
      if (modules.length !== 0) {
        console.log(`📦 Tìm thấy ${modules.length} module từ slug`);
        modules.forEach((a) => {
          if (a instanceof HTMLAnchorElement) {
            const slug = a.href.split("/")[4].split("?")[0];
            console.log(`➡️ Xử lý module slug: ${slug}`);
            allModule.push(processCourseraModuleBySlug(slug, userId, token));
          } else {
            console.warn("❌ Skipped element: not an anchor tag", a);
          }
        });
      }
      if (modules2.length !== 0) {
        console.log(`📦 Tìm thấy ${modules2.length} module từ slug`);
        modules2.forEach((a) => {
          if (a instanceof HTMLAnchorElement) {
            const slug = a.href.split("/")[4].split("?")[0];
            console.log(`➡️ Xử lý module slug: ${slug}`);
            allModule.push(processCourseraModuleBySlug(slug, userId, token));
          } else {
            console.warn("❌ Skipped element: not an anchor tag", a);
          }
        });
      }
      if (modulePool.length !== 0) {
        console.log(`📦 Tìm thấy ${modulePool.length} module từ modulePool`);
        modulePool.forEach((a) => {
          if (a instanceof HTMLElement) {
            const courseId = (a.dataset.js || "").split("~")[1];
            console.log(`➡️ Xử lý module từ courseId: ${courseId}`);
            allModule.push(processCourseraModuleById(courseId, userId, token));
          } else {
            console.warn("❌ Không tìm thấy courseId trong dataset.js", a);
          }
        });
      }
      if (!modules.length && !modules2.length && !modulePool.length) {
        const part = location.href.split("/")[4] || "";
        const slug = part.includes("?") ? part.split("?")[0] : part;
        console.log(`➡️ Fallback: xử lý module slug: ${slug}`);
        console.log(slug);
        allModule.push(processCourseraModuleBySlug(slug, userId, token));
      }

      console.log(`⏳ Đang xử lý ${allModule.length} module...`);
      const results = await Promise.allSettled(allModule);

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `✅ Hoàn thành! ${successful}/${allModule.length} module thành công, ${failed} module thất bại`
      );
      alert(
        `✅ Hoàn thành! ${successful}/${allModule.length} module thành công${
          failed > 0 ? `, ${failed} thất bại` : ""
        }!`
      );
    } catch (error) {
      console.error("❌ Có lỗi xảy ra:", error);
      alert("❌ Có lỗi xảy ra: " + error);
    }
  };
  // ===== Tạo listener mới =====
  (window as any)._skipMoocCoursera = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === "SkipVideoReading") {
      (async () => {
        await skipAllVideoReading();
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
