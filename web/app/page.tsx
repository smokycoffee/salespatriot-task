import { Suspense } from "react";
import Browser from "./browser";

export default function Page() {
  // The browser reads its filters from the URL, so it renders on the client inside Suspense.
  return (
    <Suspense fallback={<div className="boot" aria-busy="true" />}>
      <Browser />
    </Suspense>
  );
}
