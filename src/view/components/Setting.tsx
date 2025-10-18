import { Fragment, useEffect, useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Setting = () => {
  const id = useId();
  const [checked, setChecked] = useState<boolean>(true);
  useEffect(() => {
    chrome.storage.local.get("autoSubmit", (result) => {
      setChecked(result.autoSubmit ?? true);
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ autoSubmit: checked });
  }, [checked]);

  const handleSkipModule = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/skipReading.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "SkipReading",
      });
    }
  };
  return (
    <Fragment>
      <div className="flex items-center space-x-2 mb-2">
        <Button
          size="md"
          onClick={handleSkipModule}
          className="bg-blue-500 hover:bg-blue-700 transition-colors"
        >
          Skip Reading
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          size={"sm"}
          className="rounded-sm cursor-pointer"
          onCheckedChange={(value) => setChecked(!!value)}
        />
        <Label htmlFor={id} className="font-normal text-xs">
          Auto Submit
        </Label>
      </div>
    </Fragment>
  );
};

export { Setting };
