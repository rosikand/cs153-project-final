import { cn } from "@/lib/utils";

function Progress({ className, value = 0, ...props }) {
  return (
    <div
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/15",
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - Math.min(100, value)}%)` }}
      />
    </div>
  );
}

export { Progress };
