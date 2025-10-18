import { Button } from "@/components/ui/button";
const Assignments = () => {
  const assignmentActions = [
    { label: "Graded Assignment" },
    { label: "Graded App" },
    { label: "Video" },
    { label: "Practice Assignment" },
    { label: "Practice Peer-graded Assignment" },
    { label: "Submit Assignment" },
    { label: "Discussion" },
  ];
  const handleClick = async (type: string) => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/assignments.js"], // đường dẫn build ra (sau khi Vite build)
      });

      chrome.tabs.sendMessage(tab.id, { action: "runAssignment", type });
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {assignmentActions.map((item) => {
        return (
          <Button
            key={item.label}
            variant="primary"
            size="sm"
            className="transition-colors hover:bg-blue-600 bg-blue-500"
            onClick={() => handleClick(item.label)}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
};

export { Assignments };
