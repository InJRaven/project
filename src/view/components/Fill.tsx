import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { useState } from "react";
const Fill = () => {
  const [title, setTitle] = useState(
    "Hỗ trợ coursera 80k liên hệ 0395128655"
  );
  const [content, setContent] = useState("");

  const handleAutoFill = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/autoFill.js"],
      });
      chrome.storage.local.get("autoSubmit", (result) => {
        chrome.tabs.sendMessage(tab.id!, {
          action: "AUTO_FILL",
          payload: { title, content },
          autoSubmit: result.autoSubmit ?? true,
        });
      });
    }
  };
  return (
    <div className="w-full flex flex-col gap-2">
      <InputGroup>
        <InputAddon>Title</InputAddon>
        <Input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </InputGroup>
      <Textarea
        placeholder="Small"
        variant="sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button size={"sm"} className="w-full" onClick={handleAutoFill}>
        Fill
      </Button>
    </div>
  );
};

export { Fill };
