export default function Loading() {
  return <main className="min-h-screen bg-[#F8FBF9] px-5 py-12" aria-busy="true" aria-live="polite"><span className="sr-only">Page loading</span><div className="mx-auto max-w-7xl animate-pulse"><div className="h-5 w-36 rounded bg-[#DCE8E1]" /><div className="mt-5 h-12 max-w-2xl rounded bg-[#DCE8E1]" /><div className="mt-4 h-5 max-w-xl rounded bg-[#E7EEE9]" /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-52 rounded-2xl border border-[#E0E9E3] bg-white" />)}</div></div></main>;
}
