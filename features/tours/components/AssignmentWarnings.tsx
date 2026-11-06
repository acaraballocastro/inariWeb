/**
 * What an assignment asks the ADMIN to follow up (outside the guide's zones,
 * schedule overlaps). The assignment is done anyway; the warning also stays in
 * the reason of the day's assignment history.
 */
export function AssignmentWarnings({ warnings, className = "", onDismiss }: { warnings: string[]; className?: string; onDismiss?: () => void }) {
  if (warnings.length === 0) return null;
  return (
    <div role="status" className={`border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Assigned with {warnings.length === 1 ? "a warning" : `${warnings.length} warnings`} to follow up</p>
        {onDismiss && <button type="button" onClick={onDismiss} className="shrink-0 text-meta underline">Dismiss</button>}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
      </ul>
    </div>
  );
}
