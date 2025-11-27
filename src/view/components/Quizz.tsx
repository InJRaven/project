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
    { value: "ada201c", label: "ADA201c" },
    { value: "aet102c", label: "AET102c" },
    { value: "ai-for-everyone", label: "AI For Everyone" },
    { value: "aid301c", label: "AID301c" },
    { value: "bdi302c", label: "BDI302c" },
    { value: "cry303c", label: "CRY303c" },
    { value: "det101c", label: "DET101c" },
    { value: "dma301m", label: "DMA301m" },
    { value: "dms301m", label: "DMS301m" },
    { value: "dwp301c", label: "DWP301c" },
    { value: "eal202c", label: "EAL202c" },
    { value: "ebc301c", label: "EBC301c" },
    { value: "ecc301c", label: "ECC301c" },
    { value: "ecc302c", label: "ECC302c" },
    { value: "elp", label: "ELP311c + ELP321c" },
    { value: "enw492c", label: "ENW492c" },
    { value: "enw493c", label: "ENW493c" },
    { value: "epe301c", label: "EPE301c" },
    { value: "fim302c", label: "FIM302c" },
    { value: "fin306c", label: "FIN306c" },
    { value: "frs401c", label: "FRS401c" },
    { value: "fsb", label: "FSB" },
    { value: "hrm202c", label: "HRM202c" },
    { value: "ift201c", label: "IFT201c" },
    { value: "imc301c", label: "IMC301c" },
    { value: "ipr102c", label: "IPR102c" },
    { value: "ita203c", label: "ITA203c" },
    { value: "itb302c", label: "ITB302c" },
    { value: "ite302c", label: "ITE302c" },
    { value: "ite303c", label: "ITE303c" },
    { value: "lab211c", label: "LAB211c Summer" },
    { value: "lab211c_java_core", label: "LAB211c Fall" },
    { value: "law201c", label: "LAW201c" },
    { value: "mco201c", label: "MCO201c" },
    { value: "mkt205c", label: "MKT205c" },
    { value: "mkt208c", label: "MKT208c" },
    { value: "msm201c", label: "MSM201c" },
    { value: "nlp301c", label: "NLP301c" },
    { value: "nwc203c", label: "NWC203c" },
    { value: "obe102c", label: "OBE102c" },
    { value: "pmg201c", label: "PMG201c" },
    { value: "prc392c", label: "PRC392c" },
    { value: "prj301c", label: "PRJ301c" },
    { value: "prp201c", label: "PRP201c" },
    { value: "rmc", label: "RMC" },
    { value: "seo201c", label: "SEO201c" },
    { value: "ssc302c", label: "SSC302c" },
    { value: "ssl101c", label: "SSL101c" },
    { value: "swe201c", label: "SWE201c" },
    { value: "syb302c", label: "SYB302c" },
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
        files: ["content/selectListQuiz.js"],
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
        files: ["content/oneByOneQuiz.js"],
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

  const handleCheckQuiz = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/checkQuiz.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "checkQuiz",
        subject: value,
      });
    }
  };
  const handleTakeQuiz = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/takeQuiz.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "takeQuiz",
      });
    }
  };
  const handleTakeMissingQuiz = async () => {
    if (!value) return;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/takeMissingQuiz.js"],
      });

      chrome.tabs.sendMessage(tab.id!, {
        action: "takeMissingQuiz",
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
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            size="md"
            onClick={handleSumitQuiz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors w-full"
          >
            List Quiz
          </Button>
          <Button
            size="md"
            onClick={handleSubmitOneByeOneQuizz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors w-full"
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
            onClick={handleCheckQuiz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Check Quizz
          </Button>
          <Button
            size="sm"
            onClick={handleTakeQuiz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Take All Quizz
          </Button>
          <Button
            size="sm"
            onClick={handleTakeMissingQuiz}
            className="bg-blue-500 hover:bg-blue-700 transition-colors"
          >
            Take Missing Quizz
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
