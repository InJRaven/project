import { Assignments } from "@/view/components/Assignments";
import { Fill } from "@/view/components/Fill";
import { Quizz } from "@/view/components/Quizz";
import { Setting } from "@/view/components/Setting";
import {
  BriefcaseBusiness,
  MessageCircleQuestionMark,
  PaintBucket,
  Settings,
} from "lucide-react";

const Content = () => {
  return (
    <div className="grid gap-3">
      <div>
        <span className="flex items-center gap-1 text-sm [&_svg]:size-4 font-semibold mb-2">
          <BriefcaseBusiness /> Assignments
        </span>
        <Assignments />
      </div>
      <div>
        <span className="flex items-center gap-1 text-sm [&_svg]:size-4 font-semibold mb-2">
          <MessageCircleQuestionMark /> Quiz
        </span>
        <Quizz />
      </div>
      <div>
        <span className="flex items-center gap-1 text-sm [&_svg]:size-4 font-semibold mb-2">
          <PaintBucket /> Auto Fill
        </span>
        <Fill />
      </div>
      <div>
        <span className="flex items-center gap-1 text-sm [&_svg]:size-4 font-semibold mb-2">
          <Settings /> Setting
        </span>
        <Setting />
      </div>
    </div>
  );
};

export { Content };
