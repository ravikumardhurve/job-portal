import styles from "@/components/admin-dashboard.module.css";

export default function AdminLoading() {
  return <main className={styles.loading} aria-busy="true" role="status"><span>Loading your admin workspace...</span><div>{[1, 2, 3, 4, 5].map((item) => <div key={item} />)}</div></main>;
}
