"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WhatsNext({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-pine">
              What&apos;s Next
            </CardTitle>
            <Collapsible.Trigger asChild>
              <Button variant="ghost" size="sm" className="-mr-2">
                {open
                  ? <ChevronUp  className="h-4 w-4 text-pine" />
                  : <ChevronDown className="h-4 w-4 text-pine" />}
              </Button>
            </Collapsible.Trigger>
          </div>
        </CardHeader>
        <Collapsible.Content>
          <CardContent className="pb-3 pt-0">
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-pine">
                  <span className="mt-0.5 shrink-0">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  );
}
