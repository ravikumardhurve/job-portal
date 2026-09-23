export default function AdminLoading() {
  return <main className="animate-pulse" aria-busy="true"><span className="sr-only">Admin data loading</span><div className="h-8 w-56 rounded bg-[#DCE8E1]" /><div className="mt-3 h-4 w-80 max-w-full rounded bg-[#E7EEE9]" /><div className="mt-7 grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-xl border bg-white" />)}</div><div className="mt-6 h-80 rounded-xl border bg-white" /></main>;
}
