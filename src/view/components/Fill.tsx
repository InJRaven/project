import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
const Fill = () => {
  return (
    <div className="w-full flex flex-col gap-2">
      <InputGroup>
        <InputAddon>Title</InputAddon>
        <Input type="text" placeholder="Title" />
      </InputGroup>
      <Textarea placeholder="Small" variant="sm" />
      <Button size={'sm'} className="w-full">Fill</Button>
    </div>
  );
};

export { Fill };
