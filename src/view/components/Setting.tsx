import { Fragment, useEffect, useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  return (
    <Fragment>
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
