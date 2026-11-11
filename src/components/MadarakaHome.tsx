"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Train, CalendarDays, Phone, Mail, Play, ArrowUp, Menu, X, Twitter, Facebook, Youtube } from "lucide-react";
const hero = "/images/hero.jpg";
const qCorporate = "/images/q-corporate.jpg";
const qTerms = "/images/q-terms.jpg";
const qFares = "/images/q-fares.jpg";
const qProhibited = "/images/q-prohibited.jpg";
const fPersonal = "/images/f-personal.jpg";
const fScenery = "/images/f-scenery.jpg";
const fDest = "/images/f-destinations.jpg";
const fSplendid = "/images/f-splendid.jpg";
const nTrain = "/images/n-train.jpg";
const nZebra = "/images/n-zebra.jpg";
const nPass = "/images/n-passengers.jpg";
const g1 = "/images/g1.jpg";
const g2 = "/images/g2.jpg";
const g3 = "/images/g3.jpg";
const g4 = "/images/g4.jpg";
const g5 = "/images/g5.jpg";
const g6 = "/images/g6.jpg";
const logo = "/images/logo-transparent.png";
const logoLight = logo;

const STATIONS = ["Nairobi Terminus", "Athi River", "Emali", "Kibwezi", "Mtito Andei", "Voi", "Miasenyi", "Mariakani", "Mombasa Terminus"];

export function Logo({ small, onLight }: { small?: boolean; onLight?: boolean }) {
  return (
    <img
      src={onLight ? logoLight : logo}
      alt="Madaraka Express"
      width={1295}
      height={492}
      className={`w-auto ${small ? "h-10" : "h-14 md:h-16"}`}
    />
  );
}

export function Header({ interior = false }: { interior?: boolean }) {
  const [scrolled, setScrolled] = useState(interior);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(interior || window.scrollY > 120);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [interior]);
  const links = interior
    ? ["Book a Train", "Manage booking", "Stations", "Fares & times", "FAQs", "About Us", "Contact", "Sign in"]
    : ["Book a Train", "Stations", "About Us"];
  const destinations = interior
    ? ["/", "/booking/manage", "/stations", "/fares", "/faq", "/about", "/contact", "/login"]
    : ["#book", "/stations", "/about"];
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-30">
        <div className="bg-primary text-primary-foreground text-[11px]">
          <div className="mx-auto flex max-w-6xl justify-between px-4 py-1.5">
            <span>Kenya Railways <span className="mx-2 opacity-60">|</span> Right on track</span>
            <span><a href="#" className="hover:underline">Report Corruption</a> <span className="mx-2 opacity-60">|</span> <a href="#footer" className="hover:underline">Contact us</a></span>
          </div>
        </div>
      </div>
      <header className={`fixed inset-x-0 z-40 transition-all duration-300 ${scrolled ? "top-0 bg-background/80 shadow-card backdrop-blur" : "top-7 bg-transparent"}`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 ${scrolled ? "py-2" : "py-3"}`}>
          <a href={interior ? "/" : "#top"}><Logo small={scrolled} onLight={scrolled} /></a>
          <nav className={`hidden text-[13px] font-bold md:flex ${interior ? "gap-4" : "gap-10"}`}>
            {links.map((l, i) => (
              <a key={l} href={destinations[i]} className={i === 0 ? "text-cta" : scrolled ? "text-primary hover:text-cta" : "text-primary-foreground hover:text-cta"}>{l}</a>
            ))}
          </nav>
          {interior && <div className="flex items-center gap-2">
            <button id="langBtn" aria-label="Language" className="rounded-full border border-primary/20 px-3 py-2 text-xs font-bold text-primary">SW</button>
            <button id="themeBtn" aria-label="Toggle dark mode" className="rounded-full border border-primary/20 px-3 py-2 text-xs text-primary">🌙</button>
            <a id="acctBtn" href="/login" className="hidden rounded-full bg-cta px-4 py-2 text-xs font-bold text-cta-foreground md:inline-flex">Sign in</a>
          </div>}
          <button className={`md:hidden ${scrolled ? "text-primary" : "text-primary-foreground"}`} onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-3 bg-background px-4 py-4 text-sm font-bold md:hidden">
            {links.map((l, i) => <a key={l} href={destinations[i]} onClick={() => interior && setOpen(false)} className={i === 0 ? "text-cta" : "text-primary"}>{l}</a>)}
          </nav>
        )}
      </header>
    </>
  );
}

function BookingCard() {
  const [tab, setTab] = useState<"me" | "premium">("me");
  const [from, setFrom] = useState("Nairobi Terminus");
  const [to, setTo] = useState("Mombasa Terminus");
  const today = new Date().toISOString().slice(0, 10);
  const field = "h-8 w-full rounded border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const label = "mb-1 block text-[10px] font-bold uppercase text-primary";
  return (
    <div id="book" className="relative z-10 mx-auto -mt-48 max-w-5xl px-4 md:-mt-40">
      <div className="flex gap-1">
        <button onClick={() => setTab("me")} className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-bold ${tab === "me" ? "bg-background text-foreground" : "bg-primary-deep text-primary-foreground"}`}>
          <Train className="h-4 w-4 text-cta" /> Madaraka Express
        </button>
        <button type="button" onClick={() => window.location.assign("/premium-booking")} className="flex items-center gap-2 rounded-t-lg bg-primary-deep px-4 py-2 text-sm font-bold text-primary-foreground">
          <Crown className="h-4 w-4 text-cta" /> Book Premium
        </button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fields = Array.from(form.querySelectorAll("select, input[type=date]")) as HTMLInputElement[];
        const [trainType, origin, destination, departure] = fields.map((field) => field.value);
        if (!origin || !destination || !departure) return;
        const params = new URLSearchParams({ origin, destination, departure, service: trainType === "Inter County" ? "intercounty" : trainType === "Express" ? "express" : "", class: tab === "premium" ? "premium" : "" });
        const bookingPath = tab === "premium" ? "/premium-booking/steps" : "/booking";
        window.location.assign(`${bookingPath}?${params.toString()}`);
      }} className="rounded-b-lg rounded-tr-lg bg-background p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-1 text-lg text-foreground">
          {tab === "me" ? "Madaraka Express - Online Booking" : "Madaraka Express - Premium Booking"} <Train className="h-4 w-4 text-cta" />
        </h3>
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1.5fr_1.5fr_1fr_auto]">
          <div><label className={label}>Train type</label>
            <select className={field}>{tab === "me" ? <><option>Express</option><option>Inter County</option></> : <option>Premium</option>}</select></div>
          <div><label className={label}>From</label>
            <select className={field} value={from} onChange={(e) => setFrom(e.target.value)}>
              {STATIONS.filter((s) => s !== to).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className={label}>To</label>
            <select className={field} value={to} onChange={(e) => setTo(e.target.value)}>
              {STATIONS.filter((s) => s !== from).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className={label}>Departure date</label>
            <div className="flex">
              <input type="date" min={today} className={`${field} rounded-r-none`} />
              <span className="flex h-8 w-8 items-center justify-center rounded-r bg-cta text-cta-foreground"><CalendarDays className="h-4 w-4" /></span>
            </div></div>
          <button className="h-8 rounded bg-cta px-8 text-xs font-bold text-cta-foreground transition hover:brightness-110">Book a Train</button>
        </div>
      </form>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative">
      <div className="relative h-[620px] overflow-hidden rounded-b-3xl">
        <img src={hero} alt="Madaraka Express staff with luggage" width={1920} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="relative flex h-full flex-col items-center pt-32 text-center text-primary-foreground">
          <h1 className="max-w-4xl text-4xl font-black uppercase leading-tight md:text-6xl">Madaraka Express Passenger Service</h1>
          <p className="mt-4 text-xl font-bold md:text-3xl">Elevate your rail travel experience</p>
          <p className="mt-2 text-lg font-light">comfort, convenience, elegance</p>
        </div>
      </div>
      <BookingCard />
    </section>
  );
}

function QuickLinks() {
  const items = [[qCorporate, "Corporate Information", "/about"], [qTerms, "Terms and Conditions", "#"], [qFares, "Fares and Schedules", "/fares"], [qProhibited, "Prohibited Items", "#"]] as const;
  return (
    <section className="mx-auto mt-16 max-w-[1240px] px-4">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path d="M1250 -20 C 900 60, 700 120, 650 260 S 520 420, 450 440" fill="none" stroke="var(--primary-foreground)" strokeOpacity=".7" strokeWidth="10" strokeDasharray="34 26" />
        </svg>
        <h2 className="relative mb-10 text-center text-2xl font-bold text-primary-foreground md:text-3xl">We provide you with ultimate travel experience</h2>
        <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([img, t, href]) => (
            <a key={t} href={href} className="group rounded-xl bg-card p-6 text-center shadow-card">
              <img src={img} alt={t} loading="lazy" className="mx-auto aspect-[4/3] w-full max-w-[280px] rounded object-cover transition group-hover:scale-105" />
              <span className="mt-4 block text-sm text-primary underline">{t}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function FadeCard({ title, text, img }: { title: string; text: string; img: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && el.classList.add("in"), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="fade-up rounded-lg bg-card p-4 shadow-card">
      <h3 className="mb-3 text-lg font-bold text-primary">{title}</h3>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{text}</p>
      <img src={img} alt={title} loading="lazy" className="aspect-[2/1] w-full rounded-lg object-cover" />
    </div>
  );
}

function Features() {
  const sec = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 1150, y: 0 });
  useEffect(() => {
    const on = () => {
      const s = sec.current, p = path.current;
      if (!s || !p) return;
      const r = s.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (r.height + window.innerHeight)));
      const pt = p.getPointAtLength(p.getTotalLength() * prog);
      setPos({ x: pt.x, y: pt.y });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const d = "M1150 0 C 1180 300, 1250 500, 1100 650 S 300 700, 150 900 S 40 1150, 200 1280 S 700 1350, 900 1400";
  return (
    <section ref={sec} className="relative overflow-hidden bg-muted py-20">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 1300 1400" preserveAspectRatio="none">
        <path ref={path} d={d} fill="none" stroke="var(--border)" strokeWidth="8" strokeDasharray="30 22" />
      </svg>
      <div className="pointer-events-none absolute hidden md:block" style={{ left: `${(pos.x / 1300) * 100}%`, top: `${(pos.y / 1400) * 100}%`, transform: "translate(-50%,-50%)" }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-card">
          <div className="h-0 w-0 border-x-[7px] border-b-[11px] border-x-transparent border-b-cta" />
        </div>
      </div>
      <div className="relative mx-auto grid max-w-[820px] grid-cols-1 gap-6 px-4 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <FadeCard title="Personalized Service" img={fPersonal} text="Experience a journey where every detail is tailor-made for you. Onboard are attentive staff ready to cater to your preferences. We ensure that your journey is as unique and comfortable as possible. Enjoy an exclusive travel experience where your comfort and satisfaction are our top priorities." />
          <FadeCard title="Destinations" img={fDest} text="Embark on a voyage that takes you to a diverse range of destinations, each offering its own charm and allure. Our extensive network of routes covers Nairobi, Athi River, Emali, Kibwezi, Mtito Andei, Voi, Maisenyi, Mariakani, and Mombasa. Our train provides an expansive journey across a wide array of locations, making every trip a new adventure." />
        </div>
        <div className="flex flex-col gap-6 md:pt-16">
          <FadeCard title="Magnificent Scenery" img={fScenery} text="Prepare to be captivated by breathtaking views as you travel through the Tsavo National Park. Our route is designed to showcase stunning scenery and every window offers exciting views." />
          <FadeCard title="Splendid Moments" img={fSplendid} text="Delight in splendid moments that transform your journey into a memorable experience. Whether it's an exceptional meal or celebrating a birthday or anniversary, aboard the Madaraka Express, you can enjoy the little things that truly make every moment unforgettable." />
        </div>
      </div>
    </section>
  );
}

function News() {
  return (
    <section className="bg-news relative overflow-hidden pb-40 pt-12">
      <div className="pointer-events-none absolute right-24 bottom-24 h-40 w-40 rounded-full bg-gold/60 blur-2xl" />
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 1200 160" preserveAspectRatio="none">
        <path fill="var(--primary-deep)" d="M0 160 V110 C80 100 120 120 180 105 L200 60 L210 105 C300 95 360 115 420 100 Q440 40 470 30 L480 95 C540 110 600 90 660 100 L690 70 L700 40 L705 70 L730 100 C820 90 900 115 960 100 Q990 60 1020 55 L1030 100 C1100 110 1150 95 1200 105 V160 Z" />
        <g fill="var(--primary-deep)">
          <ellipse cx="300" cy="118" rx="26" ry="10" /><rect x="282" y="120" width="4" height="22" /><rect x="312" y="120" width="4" height="22" /><rect x="322" y="88" width="5" height="30" transform="rotate(20 324 103)" />
          <ellipse cx="850" cy="120" rx="22" ry="9" /><rect x="836" y="122" width="4" height="20" /><rect x="860" y="122" width="4" height="20" /><rect x="868" y="70" width="4" height="50" />
        </g>
      </svg>
      <div className="relative mx-auto max-w-[1240px] px-4 text-primary-foreground">
        <p className="text-sm uppercase">Latest News</p>
        <h2 className="mt-3 text-2xl font-bold md:text-4xl">Get to Learn more about our travel experiences</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[[nTrain, "SGR train"], [nZebra, "Zebra in Tsavo"], [nPass, "Passengers with a conductor"]].map(([src, alt]) => (
            <img key={alt} src={src} alt={alt} loading="lazy" className="aspect-[16/10] w-full rounded-xl object-cover shadow-card" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const img = "h-full w-full rounded-lg object-cover";
  return (
    <section className="bg-background py-12">
      <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Gallery</h2>
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-3 px-4 md:grid-cols-12">
        <div className="h-64 md:col-span-5"><img src={g1} alt="Staff" loading="lazy" className={img} /></div>
        <div className="h-64 md:col-span-2"><img src={g2} alt="Interior" loading="lazy" className={img} /></div>
        <div className="h-64 md:col-span-5"><img src={g3} alt="Premium seat" loading="lazy" className={img} /></div>
        <div className="h-64 md:col-span-3"><img src={g4} alt="First class seats" loading="lazy" className={img} /></div>
        <div className="h-64 md:col-span-6"><img src={g5} alt="Hostess" loading="lazy" className={img} /></div>
        <div className="h-64 md:col-span-3"><img src={g6} alt="Economy seats" loading="lazy" className={img} /></div>
      </div>
    </section>
  );
}

export function Footer() {
  const links = ["Book a Train", "About us", "Contact", "Our Fleet", "How it works", "Benefits", "FAQs", "Terms", "Payments", "Privacy"];
  const destinations = ["/#book", "/about", "/contact", "#", "#", "#", "/faq", "#", "#", "#"];
  return (
    <footer id="footer">
      <div className="bg-primary-deep py-12 text-primary-foreground">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 text-xs md:grid-cols-[1fr_1fr_2fr]">
          <div>
            <h4 className="mb-4 text-sm font-bold text-gold">About Kenya Railways</h4>
            <p className="leading-relaxed">The Standard Gauge Railway (SGR) is a flagship project by the Government of Kenya as a transport component aimed at delivering Vision 2030 making Kenya a middle income country by 2030... <a href="#" className="hover:underline">more</a></p>
          </div>
          <div className="space-y-3">
            <h4 className="mb-4 text-sm font-bold text-gold">Connect with us</h4>
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-gold" />0709 388 887 - Madaraka Express Passenger Service inquiries, complaints, lost &amp; found.</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-gold" />0709 907 000 , 0709 907 555 - Kenya Railways Headquarters customer care.</p>
            <p className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-gold" />info@krc.co.ke</p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gold">Discover</h4>
            <ul className="grid grid-cols-2 gap-y-3 sm:grid-cols-4">
              {links.map((l, i) => <li key={l}><a href={destinations[i]} className="flex items-center gap-2 hover:text-gold"><Play className="h-2 w-2 fill-current" />{l}</a></li>)}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-b-4 border-primary bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary"><Logo small onLight /> Madaraka Express</span>
          <span className="text-sm text-foreground">© 2026 Kenya Railways</span>
          <div className="flex items-center gap-3">
            {[Twitter, Facebook, Youtube].map((I, i) => <a key={i} href="#" className="flex h-8 w-12 items-center justify-center rounded-full bg-border text-muted-foreground hover:text-primary"><I className="h-4 w-4" /></a>)}
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className="ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-cta text-cta"><ArrowUp className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MadarakaHome() {
  return (
    <div className="font-sans">
      <Header />
      <Hero />
      <QuickLinks />
      <div className="h-16" />
      <Features />
      <News />
      <Gallery />
      <Footer />
    </div>
  );
}
