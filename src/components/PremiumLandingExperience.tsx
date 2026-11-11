"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeftRight, CalendarDays, Check, ChevronRight, CreditCard, FileText, Globe, Grid3X3, LockKeyhole, MapPin, Minus, Plus, Upload, Users } from "lucide-react";
import { Footer, Header } from "@/components/MadarakaHome";

const STATIONS = ["Nairobi Terminus", "Athi River", "Emali", "Kibwezi", "Mtito Andei", "Voi", "Miasenyi", "Mariakani", "Mombasa Terminus"];
const slides = [
  { image: "/images/premium-landing-station.jpg", tag: "Nairobi Terminus", title: "Your Journey\nStarts Here", body: "Step onto the platform at Nairobi Terminus, where our team is ready to see you off in style." },
  { image: "/images/premium-landing-crew.jpg", tag: "Meet our team", title: "A Crew That's\nAlways Ready", body: "From the platform to the last carriage, a dedicated team keeps every Madaraka Express journey running smoothly." },
  { image: "/images/premium-landing-service.jpg", tag: "Warm hospitality", title: "Service With\nA Smile", body: "Friendly, professional cabin crew are on hand throughout your trip to make you feel at home." },
  { image: "/images/premium-landing-cabin.jpg", tag: "Premium class", title: "Elevate Your\nJourney", body: "Extra legroom, plush seating and dedicated attendants. Travel the SGR the way it was meant to be." },
];
type Trip = "oneway" | "round" | "multi";
const passengerTypes = [
  ["adult", "Adults", "18 years and above"],
  ["teenager", "Teenagers", "13–17 years"],
  ["child", "Children", "3–12 years"],
  ["infant", "Infants", "Under 3 years"],
] as const;

export function PremiumLandingExperience() {
  const [slide, setSlide] = useState(0);
  const [trip, setTrip] = useState<Trip>("oneway");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState({ adult: 0, teenager: 0, child: 0, infant: 0 });
  const [passengerMenu, setPassengerMenu] = useState(false);
  const [showTravelSearch, setShowTravelSearch] = useState(false);
  const [segments, setSegments] = useState([{ from: "", to: "", date: "" }, { from: "", to: "", date: "" }]);
  const [notice, setNotice] = useState("");
  const [bulkNotice, setBulkNotice] = useState("");
  const activeSlide = slides[slide]!;
  const passengerTotal = Object.values(passengers).reduce((sum, count) => sum + count, 0);
  const requiredFields = [Boolean(from), Boolean(to && to !== from), Boolean(departure), passengers.adult > 0];
  if (trip === "round") requiredFields.push(Boolean(returnDate && returnDate >= departure));
  const completion = Math.round((requiredFields.filter(Boolean).length / requiredFields.length) * 100);
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const field = "mt-1 h-11 w-full rounded-lg border border-[#e1e3e8] bg-[#fafafa] px-3 text-sm font-normal normal-case text-[#252833] outline-none focus:border-[#86192c]";
  const label = "text-[10px] font-bold uppercase tracking-wide text-[#4a4c52]";

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  function setTripType(next: Trip) {
    setTrip(next);
    setNotice(next === "multi" ? "Select Multi-Booking below to enter each journey segment." : "");
    document.getElementById("premium-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function chooseTravelMode(next: Trip) {
    setTrip(next);
    setShowTravelSearch(true);
    setNotice(next === "multi" ? "Enter each journey segment below, then search for available trains." : "");
    window.setTimeout(() => document.getElementById("travel-search-options")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function updateSegment(index: number, field: "from" | "to" | "date", value: string) {
    setSegments((current) => current.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, [field]: value } : segment));
    setNotice("");
  }

  function updatePassenger(type: keyof typeof passengers, amount: number) {
    setPassengers((current) => {
      const next = { ...current, [type]: Math.max(0, Math.min(9, current[type] + amount)) };
      if (Object.values(next).reduce((sum, count) => sum + count, 0) > 9 || next.infant > next.adult) return current;
      return next;
    });
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trip === "multi") {
      if (segments.length < 2 || segments.some((segment) => !segment.from || !segment.to || segment.from === segment.to || !segment.date) || passengerTotal < 1 || passengers.adult < 1) return setNotice("Complete every journey segment and add at least one adult passenger.");
      const params = new URLSearchParams({ class: "premium", service: "express", trip, segments: JSON.stringify(segments), adult: String(passengers.adult), teenager: String(passengers.teenager), child: String(passengers.child), infant: String(passengers.infant) });
      window.location.assign(`/premium-booking/steps?${params.toString()}`);
      return;
    }
    if (!from || !to || from === to || !departure || passengerTotal < 1 || passengers.adult < 1 || (trip === "round" && (!returnDate || returnDate < departure))) {
      return setNotice("Choose your route, travel date and at least one adult passenger to continue.");
    }
    const params = new URLSearchParams({ origin: from, destination: to, departure, class: "premium", service: "express", trip,
      adult: String(passengers.adult), teenager: String(passengers.teenager), child: String(passengers.child), infant: String(passengers.infant),
      ...(trip === "round" ? { return_date: returnDate } : {}),
    });
    window.location.assign(`/premium-booking/steps?${params.toString()}`);
  }

  const navCard = "group flex min-h-[80px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md";

  return <>
    <Header interior />
    <main>
      <section className="relative flex min-h-[680px] items-center overflow-hidden bg-[#1a1c22] pt-24 md:min-h-[740px] md:pt-20">
        {slides.map((item, index) => <div key={item.image} className={`absolute inset-0 transition-opacity duration-[1400ms] ${slide === index ? "opacity-100" : "opacity-0"}`}><img src={item.image} alt="" className="h-full w-full object-cover object-center" /></div>)}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15" />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(390px,.95fr)] md:pb-20">
          <div className="max-w-lg text-white">
            <span className="inline-flex rounded-full bg-[#ffbd00] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#55230a]">● {activeSlide.tag}</span>
            <h1 className="mt-5 whitespace-pre-line text-4xl font-extrabold leading-[1.08] tracking-tight drop-shadow md:text-6xl">{activeSlide.title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/85 drop-shadow">{activeSlide.body}</p>
            <div className="mt-7 flex gap-2" aria-label="Featured Premium journeys">{slides.map((item, index) => <button key={item.image} type="button" aria-label={`Show ${item.tag} slide`} onClick={() => setSlide(index)} className={`h-1.5 rounded-full transition-all ${slide === index ? "w-8 bg-white" : "w-2 bg-white/45 hover:bg-white/80"}`} />)}</div>
          </div>

          <section id="premium-search" className="w-full max-w-[590px] justify-self-center rounded-xl shadow-2xl shadow-black/35 md:justify-self-end">
            <div className="grid grid-cols-3 overflow-hidden rounded-t-xl bg-[#18191d] text-white">
              {([ ["oneway", "➜", "One Way"], ["round", "⇄", "Round Trip"], ["multi", "◎", "Multi-Booking"] ] as const).map(([value, icon, title]) => <button key={value} type="button" onClick={() => setTripType(value)} className={`flex h-11 items-center justify-center gap-2 text-[11px] font-bold transition ${trip === value ? "bg-[#86192c] text-white" : "text-white/80 hover:bg-white/10"}`}><span className="text-base">{icon}</span>{title}</button>)}
            </div>
            <form onSubmit={search} className="rounded-b-xl bg-white p-4 md:p-5">
              <div className="relative grid grid-cols-2 gap-3">
                <label className="text-[9px] font-bold uppercase tracking-wide text-[#4a4c52]">From
                  <span className="relative mt-1 block"><MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86192c]" /><select required value={from} onChange={(event) => { setFrom(event.target.value); setNotice(""); }} className="h-10 w-full appearance-none rounded-lg border border-[#e1e3e8] bg-[#fafafa] pl-9 pr-3 text-xs font-normal normal-case text-[#252833] outline-none focus:border-[#86192c]"><option value="">Origin station</option>{STATIONS.filter((station) => station !== to).map((station) => <option key={station}>{station}</option>)}</select></span>
                </label>
                <label className="text-[9px] font-bold uppercase tracking-wide text-[#4a4c52]">To
                  <span className="relative mt-1 block"><MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86192c]" /><select required value={to} onChange={(event) => { setTo(event.target.value); setNotice(""); }} className="h-10 w-full appearance-none rounded-lg border border-[#e1e3e8] bg-[#fafafa] pl-9 pr-3 text-xs font-normal normal-case text-[#252833] outline-none focus:border-[#86192c]"><option value="">Destination station</option>{STATIONS.filter((station) => station !== from).map((station) => <option key={station}>{station}</option>)}</select></span>
                </label>
                <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap origin and destination" className="absolute left-1/2 top-[35px] z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#e1e3e8] bg-white text-[#86192c] shadow-sm"><ArrowLeftRight className="h-4 w-4" /></button>
              </div>
              <div className={`mt-3 grid gap-3 ${trip === "round" ? "grid-cols-2" : "grid-cols-[1fr_1fr_auto]"}`}>
                <label className="text-[9px] font-bold uppercase tracking-wide text-[#4a4c52]">Departure date
                  <span className="relative mt-1 block"><input required type="date" min={todayDate} value={departure} onChange={(event) => { setDeparture(event.target.value); setNotice(""); }} className="h-10 w-full rounded-lg border border-[#e1e3e8] bg-[#fafafa] px-3 pr-8 text-xs font-normal normal-case text-[#252833] outline-none focus:border-[#86192c]" /><CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86192c]" /></span>
                </label>
                {trip === "round" && <label className="text-[9px] font-bold uppercase tracking-wide text-[#4a4c52]">Return date
                  <span className="relative mt-1 block"><input required type="date" min={departure || todayDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="h-10 w-full rounded-lg border border-[#e1e3e8] bg-[#fafafa] px-3 pr-8 text-xs font-normal normal-case text-[#252833] outline-none focus:border-[#86192c]" /><CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86192c]" /></span>
                </label>}
                <div className="relative text-[9px] font-bold uppercase tracking-wide text-[#4a4c52]">Passengers
                  <button type="button" onClick={() => setPassengerMenu(!passengerMenu)} className="mt-1 flex h-10 w-full items-center gap-2 rounded-lg border border-[#e1e3e8] bg-[#fafafa] px-3 text-left text-xs font-normal normal-case text-[#252833]"><Users className="h-3.5 w-3.5 text-[#86192c]" />{passengerTotal || "0 Passengers"}<ChevronRight className="ml-auto h-3.5 w-3.5 rotate-90 text-[#8c9099]" /></button>
                  {passengerMenu && <div className="absolute right-0 top-[60px] z-30 w-[min(320px,85vw)] rounded-xl border border-[#e5e6eb] bg-white p-3 text-[#20232b] shadow-xl">{passengerTypes.map(([key,title,age]) => <div key={key} className="flex items-center justify-between border-b border-[#f0f0f1] py-2.5 last:border-0"><span><b className="block text-xs normal-case">{title}</b><small className="text-[10px] font-normal normal-case text-[#888d98]">{age}</small></span><span className="flex items-center gap-3"><button type="button" onClick={() => updatePassenger(key,-1)} aria-label={`Remove ${title}`} className="grid h-7 w-7 place-items-center rounded-full border text-[#86192c]"><Minus className="h-3.5 w-3.5" /></button><b className="w-3 text-center text-xs">{passengers[key]}</b><button type="button" onClick={() => updatePassenger(key,1)} aria-label={`Add ${title}`} className="grid h-7 w-7 place-items-center rounded-full border text-[#86192c]"><Plus className="h-3.5 w-3.5" /></button></span></div>)}<button type="button" onClick={() => setPassengerMenu(false)} className="mt-2 w-full rounded-md bg-[#86192c] py-2 text-xs font-bold text-white">Done</button></div>}
                </div>
                <button type="submit" disabled={completion < 100 || trip === "multi"} className="mt-[15px] flex h-10 items-center justify-center gap-2 rounded-lg bg-[#86192c] px-4 text-xs font-bold text-white transition hover:bg-[#6f1323] disabled:cursor-not-allowed disabled:bg-[#e4e5e9] disabled:text-[#9397a0]"><LockKeyhole className="h-3.5 w-3.5" />{completion}% complete</button>
              </div>
              {notice && <p role="status" className="mt-3 rounded-md bg-[#fff7dc] px-3 py-2 text-xs text-[#755000]">{notice}</p>}
              {trip !== "multi" && completion === 100 && <p className="mt-2 text-[10px] text-[#8b8f98]">Ready to search Premium seats. Select the progress button to continue.</p>}
            </form>
          </section>
        </div>
        <div className="absolute bottom-5 right-8 z-10 hidden gap-1.5 md:flex">{slides.map((item,index)=><button key={item.image} type="button" aria-label={`Slide ${index+1}`} onClick={()=>setSlide(index)} className={`h-1 w-5 rounded-full ${slide===index?"bg-white":"bg-white/45"}`} />)}</div>
      </section>

      <section className="bg-[#f8f9fb] px-4 py-14 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7"><h2 className="text-2xl font-bold tracking-tight text-[#111827]">What would you like to do?</h2><p className="mt-1 text-sm text-[#728096]">Choose a travel option to get started</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button aria-pressed={showTravelSearch && trip==="oneway"} onClick={()=>chooseTravelMode("oneway")} className={`${navCard} border-[#e9cbd0] ${showTravelSearch&&trip==="oneway"?"ring-2 ring-[#8c2031]/20":""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f7ebed] text-[#912336]"><ArrowRight className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-[#172033]">One Way</b><small className="text-xs text-[#8690a0]">Single trip</small></span><ChevronRight className="h-4 w-4 text-[#c3cbd5]" /></button>
            <button aria-pressed={showTravelSearch && trip==="round"} onClick={()=>chooseTravelMode("round")} className={`${navCard} border-[#f2df9f] ${showTravelSearch&&trip==="round"?"ring-2 ring-[#8c2031]/20":""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff6dc] text-[#bd8500]"><ArrowLeftRight className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-[#172033]">Round Trip</b><small className="text-xs text-[#8690a0]">Return journey</small></span><ChevronRight className="h-4 w-4 text-[#c3cbd5]" /></button>
            <button aria-pressed={showTravelSearch && trip==="multi"} onClick={()=>chooseTravelMode("multi")} className={`${navCard} border-[#f2df9f] ${showTravelSearch&&trip==="multi"?"ring-2 ring-[#8c2031]/20":""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff6dc] text-[#bd8500]"><Globe className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-[#172033]">Multi-Booking</b><small className="text-xs text-[#8690a0]">Multiple bookings</small></span><ChevronRight className="h-4 w-4 text-[#c3cbd5]" /></button>
            <a href="/booking/manage" className={`${navCard} border-[#e9cbd0]`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f7ebed] text-[#912336]"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-[#172033]">Manage Booking</b><small className="text-xs text-[#8690a0]">View or change</small></span><ChevronRight className="h-4 w-4 text-[#c3cbd5]" /></a>
          </div>

          {showTravelSearch && <section id="travel-search-options" className="mt-6 rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-[0_10px_30px_rgba(20,25,38,.06)] md:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#8a2031]">Premium train search</p><h3 className="mt-1 text-xl font-bold text-[#182133]">{trip==="oneway"?"One Way":trip==="round"?"Round Trip":"Multi-Booking"}</h3><p className="mt-1 text-xs text-[#8992a1]">Enter your journey details to check train availability.</p></div><button type="button" onClick={()=>setShowTravelSearch(false)} className="rounded-full px-3 py-1 text-xs text-[#7b8494] hover:bg-[#f3f4f6]">Close</button></div>
            <form onSubmit={search}>
              {trip === "multi" ? <div className="space-y-3">{segments.map((segment,index)=><div key={index} className="relative rounded-xl border border-[#e5e8ee] p-4 pt-6"><span className="absolute -top-2 left-4 rounded-full bg-[#8a2031] px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-white">Segment {index+1}</span>{segments.length>2&&<button type="button" aria-label={`Remove segment ${index+1}`} onClick={()=>setSegments((current)=>current.filter((_,i)=>i!==index))} className="absolute right-3 top-2 text-xs text-[#9b3947]">Remove</button>}<div className="grid gap-3 md:grid-cols-3"><label className={label}>From<select required value={segment.from} onChange={(e)=>updateSegment(index,"from",e.target.value)} className={field}><option value="">Origin station</option>{STATIONS.filter((station)=>station!==segment.to).map((station)=><option key={station}>{station}</option>)}</select></label><label className={label}>To<select required value={segment.to} onChange={(e)=>updateSegment(index,"to",e.target.value)} className={field}><option value="">Destination station</option>{STATIONS.filter((station)=>station!==segment.from).map((station)=><option key={station}>{station}</option>)}</select></label><label className={label}>Date<input required type="date" min={todayDate} value={segment.date} onChange={(e)=>updateSegment(index,"date",e.target.value)} className={field}/></label></div></div>)}<button type="button" onClick={()=>setSegments((current)=>current.length<6?[...current,{from:"",to:"",date:""}]:current)} disabled={segments.length>=6} className="mt-1 text-sm font-semibold text-[#8a2031] disabled:opacity-40">+ Add destination</button></div> : <div className="grid gap-4 md:grid-cols-2"><label className={label}>From<select required value={from} onChange={(e)=>{setFrom(e.target.value);setNotice("");}} className={field}><option value="">Origin station</option>{STATIONS.filter((station)=>station!==to).map((station)=><option key={station}>{station}</option>)}</select></label><label className={label}>To<select required value={to} onChange={(e)=>{setTo(e.target.value);setNotice("");}} className={field}><option value="">Destination station</option>{STATIONS.filter((station)=>station!==from).map((station)=><option key={station}>{station}</option>)}</select></label><label className={label}>Departure date<input required type="date" min={todayDate} value={departure} onChange={(e)=>setDeparture(e.target.value)} className={field}/></label>{trip==="round"&&<label className={label}>Return date<input required type="date" min={departure||todayDate} value={returnDate} onChange={(e)=>setReturnDate(e.target.value)} className={field}/></label>}</div>}
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className={label}>Passengers</p><div className="mt-2 flex flex-wrap gap-2">{passengerTypes.map(([key,title])=><div key={key} className="flex items-center gap-2 rounded-lg border border-[#e2e5eb] px-2 py-1.5"><span className="text-xs text-[#303849]">{title}</span><button type="button" onClick={()=>updatePassenger(key,-1)} className="grid h-6 w-6 place-items-center rounded-full border text-[#8a2031]" aria-label={`Remove ${title}`}><Minus className="h-3 w-3"/></button><b className="w-3 text-center text-xs">{passengers[key]}</b><button type="button" onClick={()=>updatePassenger(key,1)} className="grid h-6 w-6 place-items-center rounded-full border text-[#8a2031]" aria-label={`Add ${title}`}><Plus className="h-3 w-3"/></button></div>)}</div><p className="mt-1 text-[10px] text-[#8d95a2]">{passengerTotal} passenger{passengerTotal===1?"":"s"} · one adult minimum</p></div><button type="submit" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#f5b900] px-6 text-sm font-bold text-[#5b2a00] transition hover:brightness-105">Search Trips <ArrowRight className="h-4 w-4"/></button></div>
              {notice && <p role="alert" className="mt-4 rounded-lg bg-[#fff7dc] px-3 py-2 text-sm text-[#755000]">{notice}</p>}
            </form>
          </section>}

          <section className="mt-12 overflow-hidden rounded-[24px] bg-[#111827] px-7 py-9 text-white md:px-10 md:py-10">
            <div className="grid items-center gap-9 md:grid-cols-[minmax(0,1fr)_222px]">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-[#ffb900]">For organisations & travel agents</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">Bulk Booking</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#a8b5c9]">Book for 10 or 100 passengers from a single spreadsheet. Upload your team list, manage it online, then check out in one go.</p>
                <ul className="mt-5 space-y-2 text-sm text-[#e3e8f0]"><li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-[#453d21] p-0.5 text-[#ffb900]" />Upload a CSV with all passenger details</li><li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-[#453d21] p-0.5 text-[#ffb900]" />Edit the list like a spreadsheet</li><li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-[#453d21] p-0.5 text-[#ffb900]" />One payment for the whole list</li></ul>
                <button type="button" onClick={()=>setBulkNotice("Bulk Booking is not available in the connected booking service yet.")} className="mt-6 rounded-xl bg-[#ffb900] px-6 py-3 text-sm font-bold text-[#5a2700] transition hover:brightness-105">Start Bulk Booking <span aria-hidden="true">→</span></button>
                {bulkNotice && <p role="status" className="mt-3 text-xs text-[#f7d97a]">{bulkNotice}</p>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] p-3.5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#302b1f] text-[#ffb900]"><Upload className="h-5 w-5" /></span><span><b className="block text-sm">Upload passenger list</b><small className="text-[11px] text-[#9da9bb]">CSV or manual entry</small></span></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] p-3.5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#302b1f] text-[#ffb900]"><Grid3X3 className="h-5 w-5" /></span><span><b className="block text-sm">Edit like a spreadsheet</b><small className="text-[11px] text-[#9da9bb]">Inline editing, row by row</small></span></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] p-3.5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#302b1f] text-[#ffb900]"><CreditCard className="h-5 w-5" /></span><span><b className="block text-sm">Single checkout</b><small className="text-[11px] text-[#9da9bb]">One payment for all</small></span></div>
              </div>
            </div>
          </section>

          <div className="mt-12 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#ecd9d5] bg-gradient-to-r from-[#f4eded] to-[#fbf7eb] md:grid-cols-4">
            {[["500K+","Passengers"],["50+","Routes"],["8+","Years"],["4.8★","Rating"]].map(([number,label])=><div key={label} className="flex min-h-[98px] flex-col items-center justify-center border-b border-r border-[#eadbd8] last:border-r-0 md:border-b-0"><b className="text-3xl font-extrabold tracking-tight text-[#922238]">{number}</b><span className="text-[10px] uppercase tracking-wide text-[#7b8798]">{label}</span></div>)}
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
