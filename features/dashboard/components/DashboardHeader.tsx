export function DashboardHeader({ breadcrumb = "Workspace / Dashboard" }: { breadcrumb?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-[#deddd6] bg-[#f5f4f0] px-5 py-4 sm:px-8 lg:px-10">
      <p className="text-[9px] text-[#aaa99f]">{breadcrumb}</p>
      <div className="flex items-center gap-4 text-[9px] text-[#77786f]">
        <span className="hidden sm:inline">Tokyo · 09:00 JST</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e9e5d7] font-medium text-[#5d5e55]">AG</span>
        <span className="hidden sm:inline">Agustin</span>
      </div>
    </header>
  );
}