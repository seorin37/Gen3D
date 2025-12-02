export default function HeaderBar({
  onToggleUnits,
}: { onToggleUnits?: () => void }) {
  return (
    <header className="fixed top-0 inset-x-0 z-20">
      <div className="mx-auto w-screen px-6 py-3 flex items-center gap-4 backdrop-blur bg-[color:var(--panel)] border-b border-[color:var(--stroke)]">
        <div className="flex items-center gap-3">
          <h1 className="text-cyan-100 font-semibold">지구과학 3D 보조교재</h1>
        </div>
        
        
      </div>
    </header>
  );
}
