"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, Search, X } from "lucide-react";
import styles from "./locations.module.css";

type City = { name: string; description: string };

export function CityDirectory({ cities }: { cities: City[] }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const visibleCities = cities.filter((city) => city.name.toLowerCase().includes(query.trim().toLowerCase()));

  function clearSearch() {
    setQuery("");
    input.current?.focus();
  }

  return (
    <>
      <div className={styles.directoryToolbar}>
        <div className={styles.citySearch}>
          <Search size={18} aria-hidden="true" />
          <label htmlFor="city-search" className={styles.srOnly}>Search locations by city name</label>
          <input ref={input} id="city-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your city..." aria-controls="city-results" autoComplete="off" />
          {query && <button type="button" onClick={clearSearch} aria-label="Clear city search"><X size={17} /></button>}
        </div>
        <p role="status" aria-atomic="true">{visibleCities.length} of {cities.length} locations</p>
      </div>
      <div id="city-results" className={styles.cityGrid}>
        {visibleCities.map(({ name, description }) => (
          <article key={name} className={styles.cityCard}>
            <div className={styles.cityTop}><span className={styles.cityIcon}><MapPin size={22} /></span><span>CHHATTISGARH</span></div>
            <h3>{name}</h3>
            <p>{description}</p>
            <div className={styles.cityActions}>
              <Link href={`/jobs?city=${encodeURIComponent(name)}`} aria-label={`Find jobs in ${name}`}>Find Jobs <ArrowRight size={15} /></Link>
              <Link href={`/services/request?city=${encodeURIComponent(name)}`} aria-label={`Request a service in ${name}`}>Request Service <ArrowUpRight size={15} /></Link>
            </div>
          </article>
        ))}
        {visibleCities.length === 0 && <div className={styles.emptyState}><MapPin size={30} /><h3>No matching city in this directory.</h3><p>Try another spelling, or ask our team about your area. You can still share a requirement for a location not listed here.</p><div><button type="button" onClick={clearSearch}>Show All Locations</button><Link href="/contact">Ask About Your Area <ArrowUpRight size={15} /></Link></div></div>}
      </div>
    </>
  );
}
