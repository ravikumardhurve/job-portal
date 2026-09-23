export default function CandidateLoading() {
  return <main className="animate-pulse" aria-busy="true"><span className="sr-only">Candidate account loading</span><div className="h-8 w-52 rounded bg-[#DCE8E1]" /><div className="mt-3 h-4 w-72 max-w-full rounded bg-[#E7EEE9]" /><div className="mt-7 grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-xl border bg-white" />)}</div></main>;
}
