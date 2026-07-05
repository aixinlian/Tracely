import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A styled Select built on Base UI's Select primitive. Unlike a native
 * `<select>`, the dropdown list is fully rendered by us, so its appearance
 * matches the rest of the app (Dialog/Button) instead of the OS chrome.
 */

const SelectRoot = SelectPrimitive.Root;

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors select-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:border-ring",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
        <ChevronDown className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value {...props} />;
}

function SelectContent({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="z-[60] outline-none"
        sideOffset={4}
        alignItemWithTrigger={false}
      >
        <SelectPrimitive.Popup
          className={cn(
            "max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="shrink-0 text-muted-foreground">
        <Check className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export {
  SelectRoot as Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
