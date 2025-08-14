import { cn } from "@/lib/utils";
import { Button, ButtonArrow } from "@/components/ui/button";
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

const Quizz = () => {
  const subjects = [
    { value: "elp", label: "ELP311c + ELP321c" },
    { value: "enw492c", label: "ENW492c" },
    { value: "enw493c", label: "ENW493c" },
    { value: "ift201c", label: "IFT201c" },
    { value: "ite302c", label: "ITE302c" },
    { value: "mkt205c", label: "MKT205c" },
    { value: "mkt208c", label: "MKT208c" },
    { value: "obe102c", label: "OBE102c" },
    { value: "pmg201c", label: "PMG201c" },
    { value: "prp201c", label: "PRP201c" },
    { value: "seo201c", label: "SEO201c" },
    { value: "ssl101c", label: "SSL101c" },
    { value: "swe201c", label: "SWE201c" },
    { value: "wdu202c", label: "WDU202c" },
    { value: "wdu203c", label: "WDU203c" },
    { value: "wed201c", label: "WED201c" },
  ];

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  useEffect(() => {
    chrome.storage.local.get(["selectedSubject"], (result) => {
      if (result.selectedSubject) {
        setValue(result.selectedSubject);
      }
    });
  }, []);
  const handleSumitQuiz = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/selectListQuizz.js"],
      });

      chrome.storage.local.get("autoSubmit", (result) => {
        chrome.tabs.sendMessage(tab.id!, {
          action: "runQuizz",
          subject: value,
          autoSubmit: result.autoSubmit ?? true,
        });
      });
    }
  };

  const handleSubmitOneByeOneQuizz = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/oneByOneQuizz.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "oneByOne",
        subject: value,
      });
    }
  };
  const handleSubmitTestData = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/testData.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "runTestData",
        subject: value,
      });
    }
  };

  const handleTakeQuizz = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/testTakeQuizz.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "takeQuizz",
        subject: value,
      });
    }
  };
  const handleSelect = (selected: string) => {
    const newValue = selected === value ? "" : selected;
    setValue(newValue);
    chrome.storage.local.set({ selectedSubject: newValue }); // lưu vào storage
    setOpen(false);
  };
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-2 mb-2">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full"
              size={"sm"}
            >
              <span className={cn("truncate")}>
                {value
                  ? subjects.find((subj) => subj.value === value)?.label
                  : "Select Subject..."}
              </span>
              <ButtonArrow />
            </Button>
          </PopoverTrigger>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleSumitQuiz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Submit
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitOneByeOneQuizz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            One By One Quiz
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitTestData}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Test Data Duplicate
          </Button>

          <Button
            size="sm"
            onClick={handleTakeQuizz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Take Quizz
          </Button>
        </div>
        <PopoverContent className="w-[--radix-popper-anchor-width] p-0">
          <Command>
            <CommandInput className="h-10" placeholder="Search Subject..." />
            <ScrollArea viewportClassName="max-h-[150px] [&>div]:block!">
              <CommandList>
                <CommandEmpty>No Subject found.</CommandEmpty>
                <CommandGroup className="[&_[cmdk-group-items]]:space-y-[1px]">
                  {subjects.map((subj) => (
                    <CommandItem
                      key={subj.value}
                      value={subj.value}
                      onSelect={() => handleSelect(subj.value)}
                      className="text-xs cursor-pointer"
                    >
                      <span className="truncate">{subj.label}</span>
                      {value === subj.value && <CommandCheck />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </ScrollArea>
            {/* <CommandSeparator />
            <CommandGroup>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start font-normal px-1.5"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add New Subject
              </Button>
            </CommandGroup> */}
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
};

export { Quizz };
