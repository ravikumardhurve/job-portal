"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import styles from "./hero-services-carousel.module.css";

type HeroService = { title: string; description: string; href: string; image: string; visual: string };

export function HeroServicesCarousel({ services }: { services: HeroService[] }) {
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState({ first: true, last: services.length <= 1, index: 0 });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const cards = Array.from(element.children) as HTMLElement[];
      const offset = cards[0]?.offsetLeft ?? 0;
      const nearest = cards.reduce((best, card, index) =>
        Math.abs(card.offsetLeft - offset - element.scrollLeft) < Math.abs(cards[best].offsetLeft - offset - element.scrollLeft) ? index : best, 0);
      const last = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setPosition({ first: element.scrollLeft <= 2, last, index: last ? Math.max(0, cards.length - 1) : nearest });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, [services.length]);

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const target = element.children[Math.max(0, Math.min(services.length - 1, position.index + direction))] as HTMLElement | undefined;
    const first = element.children[0] as HTMLElement | undefined;
    if (target && first) element.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <section className={styles.carousel} aria-label="Explore our services">
      <div className={styles.heading}>
        <div><p>ALL IN ONE PLACE</p><h2>How can we help?</h2></div>
        <div className={styles.controls}>
          <button type="button" aria-label="Previous service" aria-controls={id} disabled={position.first} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Next service" aria-controls={id} disabled={position.last} onClick={() => move(1)}><ArrowRight size={18} /></button>
        </div>
      </div>
      <div id={id} ref={track} className={styles.track} tabIndex={0} role="group" aria-label="Service cards, scroll left or right" onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
          event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}>
        {services.map((service, index) => (
          <Link key={service.href} href={service.href} className={styles.card}>
            <div className={styles.photo}><Image src={service.image} alt="" fill priority={index === 0} sizes="(max-width: 600px) 80vw, (max-width: 820px) 45vw, 360px" unoptimized={service.image.startsWith("http")} /><span aria-hidden="true">{service.visual}</span></div>
            <div className={styles.copy}><h3>{service.title}</h3><p>{service.description}</p><span className={styles.action}>Explore <ArrowRight size={16} /></span></div>
          </Link>
        ))}
      </div>
      <div className={styles.footer}><span>Swipe to explore</span><span aria-live="polite" aria-atomic="true">{position.last ? services.length : position.index + 1} / {services.length}</span></div>
    </section>
  );
}
