"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Logo } from "@/components/MadarakaHome";
import { ArrowLeft, ArrowLeftRight, ArrowRight, Check, ChevronDown, ChevronRight, Clock3, CreditCard, ExternalLink, MapPin, Minus, Plus, Search, ShieldCheck, Smartphone, TrainFront, Utensils, X } from "lucide-react";

type PassengerType = "adult" | "teenager" | "child" | "infant";
type Passenger = { type: PassengerType; first: string; middle: string; last: string; gender: "M" | "F" | ""; dob: string; nationality: string; documentType: string; document: string; phone: string; email: string; disability: boolean; disabilityNote: string };
type Station = { id: number; name: string; display_name?: string };
type TrainClass = { class: string; fares: Record<string, number>; seats_available: number; seats_total: number };
type Train = { trip_id: number; train_no: string; service: string; route_name: string; from: number; to: number; date: string; departure: string; arrival: string; arrives_next_day: boolean; bookable: boolean; classes: TrainClass[] };
type Leg = { from: string; to: string; date: string; trains: Train[]; selected?: Train };
type SeatStatus = { seat: string; state: "booked" | "locked" | "mine" | "free" };
type SeatLayout = { rows: number; cols: number; letters: string; coaches: number };
type SeatMap = { layout: SeatLayout; seats: SeatStatus[] };
type Order = { group_ref: string; amount: number; bookings: Array<{ ref: string; from: { name: string }; to: { name: string }; train_no: string; travel_date: string; passengers: Array<{ full_name: string; seat: string | null }> }>; payment_window_seconds: number };

const STEP_NAMES = ["Search", "Select Train", "Passengers", "Seats", "Review & Pay", "Payment"];
const passengerNames: Record<PassengerType, string> = { adult: "Adult", teenager: "Teenager", child: "Child", infant: "Infant" };
const MEALS: [string, string][] = [
  ["Chicken drumstick", "Roast chicken drumstick, fried rice, sautéed mixed vegetables."],
  ["Roast lamb chops", "Roast lamb chops, roast potato wedges, African greens and mint sauce."],
  ["Stir fried beef", "Beef with garlic mashed potatoes, fried onion and fresh herbs."],
  ["Vegetable biryani rice", "Vegetable biryani rice with a fragrant spice blend."],
  ["Pindi chole with chapati", "Pindi chole, chapati, spinach and fresh coriander."],
  ["Stir-fried chicken", "Chicken with oyster sauce and seasonal vegetables."],
];

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/console/api${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "We couldn’t complete that request. Please try again.");
  return result.data as T;
}

function todayLocal() {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}
function inDays(date: string, amount: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
}
function money(amount: number) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}
function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 9 && /^[17]/.test(digits)) return `254${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("254")) return digits;
  return digits;
}
function prettyDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function blankPassenger(type: PassengerType): Passenger {
  return { type, first: "", middle: "", last: "", gender: "", dob: "", nationality: "Kenya", documentType: "National ID", document: "", phone: "", email: "", disability: false, disabilityNote: "" };
}
function ageFrom(date: string) {
  if (!date) return "";
  const dob = new Date(`${date}T12:00:00`);
  let age = new Date().getFullYear() - dob.getFullYear();
  if (new Date().getMonth() < dob.getMonth() || (new Date().getMonth() === dob.getMonth() && new Date().getDate() < dob.getDate())) age--;
  return `${age} years`;
}
function initials(passenger: Passenger) {
  return `${passenger.first[0] || ""}${passenger.last[0] || ""}`.toUpperCase() || "P";
}

export function BookingWizard() {
  const [step, setStep] = useState(0);
  const [tripType, setTripType] = useState<"oneway" | "round" | "multi">("oneway");
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [departure, setDeparture] = useState(inDays(todayLocal(), 1));
  const [returnDate, setReturnDate] = useState("");
  const [multiSegments, setMultiSegments] = useState<Array<{ from: string; to: string; date: string }>>([]);
  const [counts, setCounts] = useState<Record<PassengerType, number>>({ adult: 1, teenager: 0, child: 0, infant: 0 });
  const [passengerOpen, setPassengerOpen] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [selectedLeg, setSelectedLeg] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [contact, setContact] = useState({ name: "", phone: "", email: "", documentType: "National ID", document: "" });
  const [emergency, setEmergency] = useState({ name: "", phone: "", email: "" });
  const [sameContact, setSameContact] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [seatToken, setSeatToken] = useState("");
  const [seatMaps, setSeatMaps] = useState<Record<number, SeatMap>>({});
  const [seatAssignments, setSeatAssignments] = useState<Record<string, string>>({});
  const [activePassenger, setActivePassenger] = useState(0);
  const [seatPicker, setSeatPicker] = useState<{ seat: string; leg: number } | null>(null);
  const [seatConfirm, setSeatConfirm] = useState(false);
  const [bookingConfirm, setBookingConfirm] = useState(false);
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paymentUntil, setPaymentUntil] = useState<number | null>(null);
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStage, setPaymentStage] = useState<"refreshments" | "pay">("refreshments");
  const [mealChoices, setMealChoices] = useState<Record<number, string>>({});
  const [crewNote, setCrewNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [autoSearchPending, setAutoSearchPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPassengers = Object.values(counts).reduce((total, amount) => total + amount, 0);
  const origin = useMemo(() => stations.find((station) => String(station.id) === from), [stations, from]);
  const destination = useMemo(() => stations.find((station) => String(station.id) === to), [stations, to]);
  const isRoundTrip = tripType === "round";
  const selectedTrain = legs[selectedLeg]?.selected;
  const seatPickerOwner = seatPicker ? passengers.findIndex((_, index) => seatAssignments[`${seatPicker.leg}:${index}`] === seatPicker.seat) : -1;
  const fareForPassenger = (type: PassengerType) => legs.reduce((sum, leg) => sum + Number(leg.selected?.classes.find((item) => item.class === "premium")?.fares[type] || 0), 0);
  const priceTotal = order?.amount ?? legs.reduce((sum, leg) => sum + passengers.reduce((legSum, passenger) => legSum + Number(leg.selected?.classes.find((item) => item.class === "premium")?.fares[passenger.type] || 0), 0), 0);
  const completePassengers = passengers.filter((person) => person.first && person.last && person.gender && person.dob && person.nationality && person.document && person.phone).length;

  useEffect(() => {
    api<Station[]>("/rest/booking-info/stations").then((loadedStations) => {
      setStations(loadedStations);
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("origin");
      const toParam = params.get("destination");
      if (fromParam) {
        const station = loadedStations.find((item) => String(item.id) === fromParam || item.name.toLowerCase() === fromParam.toLowerCase());
        if (station) setFrom(String(station.id));
      }
      if (toParam) {
        const station = loadedStations.find((item) => String(item.id) === toParam || item.name.toLowerCase() === toParam.toLowerCase());
        if (station) setTo(String(station.id));
      }
      const trip = params.get("trip");
      if (trip === "round" || trip === "multi") setTripType(trip);
      if (params.get("return_date")) setReturnDate(params.get("return_date")!);
      if (params.has("adult")) setCounts({ adult: Number(params.get("adult")) || 0, teenager: Number(params.get("teenager")) || 0, child: Number(params.get("child")) || 0, infant: Number(params.get("infant")) || 0 });
      const segmentParam = params.get("segments");
      if (segmentParam) {
        try {
          const raw = JSON.parse(segmentParam) as Array<{ from: string; to: string; date: string }>;
          const idFor = (value: string) => loadedStations.find((item) => String(item.id) === value || item.name.toLowerCase() === value.toLowerCase());
          if (raw.length) {
            const firstFrom = idFor(raw[0]!.from);
            const firstTo = idFor(raw[0]!.to);
            if (firstFrom) setFrom(String(firstFrom.id));
            if (firstTo) setTo(String(firstTo.id));
            if (raw[0]!.date) setDeparture(raw[0]!.date);
            setMultiSegments(raw.slice(1).map((item) => {
              const segmentFrom = idFor(item.from);
              const segmentTo = idFor(item.to);
              return { from: segmentFrom ? String(segmentFrom.id) : "", to: segmentTo ? String(segmentTo.id) : "", date: item.date };
            }));
          }
        } catch { setError("The multi-booking details from the previous page could not be read. Please enter each trip again."); }
      }
    }).catch(() => setError("We couldn’t load the station list. Refresh the page to try again."));
    const params = new URLSearchParams(window.location.search);
    if (params.get("class") === "premium") {
      if (params.get("departure")) setDeparture(params.get("departure")!);
      if ((params.get("origin") && params.get("destination")) || params.get("segments")) setAutoSearchPending(true);
    }
  }, []);

  useEffect(() => {
    if (!holdUntil) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((holdUntil - Date.now()) / 1000));
      setSecondsLeft(left);
      if (!left) {
        if (seatToken) void api("/rest/seat-locks/release-all", { token: seatToken }).catch(() => undefined);
        setSeatToken("");
        setSeatAssignments({});
        setHoldUntil(null);
        setStep(3);
        setError("Your seat hold expired. Please choose your seats again.");
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [holdUntil, seatToken]);

  useEffect(() => {
    if (!paymentUntil) return;
    const update = () => setPaymentSecondsLeft(Math.max(0, Math.ceil((paymentUntil - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [paymentUntil]);

  const clearError = () => setError("");
  function changeCount(type: PassengerType, amount: number) {
    setCounts((current) => {
      const next = { ...current, [type]: Math.max(0, Math.min(9, current[type] + amount)) };
      const total = Object.values(next).reduce((sum, value) => sum + value, 0);
      if (total > 9 || next.infant > next.adult) return current;
      return next;
    });
  }
  function swapStations() {
    setFrom(to);
    setTo(from);
    setFromSearch(destination?.name || "");
    setToSearch(origin?.name || "");
  }
  async function searchTrains(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    clearError();
    if (!from || !to || !departure || from === to || totalPassengers < 1 || counts.adult < 1) {
      setError("Choose a route, travel date and at least one adult passenger to continue.");
      return;
    }
    if (isRoundTrip && (!returnDate || returnDate < departure)) {
      setError("Choose a return date on or after your departure date.");
      return;
    }
    if (tripType === "multi" && (multiSegments.length < 1 || multiSegments.some((segment) => !segment.from || !segment.to || segment.from === segment.to || !segment.date))) {
      setError("Add at least one complete extra journey segment for a Multi-Booking.");
      return;
    }
    setLoading(true);
    try {
      setSeatToken("");
      setSeatMaps({});
      setSeatAssignments({});
      setHoldUntil(null);
      setOrder(null);
      setPaymentUntil(null);
      setMealChoices({});
      setPaymentComplete(false);
      setContact({ name: "", phone: "", email: "", documentType: "National ID", document: "" });
      setEmergency({ name: "", phone: "", email: "" });
      const passengersList = Object.entries(counts).flatMap(([type, amount]) => Array.from({ length: amount }, () => blankPassenger(type as PassengerType)));
      const requests = [{ from, to, date: departure }, ...(isRoundTrip ? [{ from: to, to: from, date: returnDate }] : tripType === "multi" ? multiSegments : [])];
      const found = await Promise.all(requests.map(async (route) => {
        const query = new URLSearchParams({ from: route.from, to: route.to, date: route.date, class: "premium", ...(isRoundTrip ? { roundTrip: "true" } : {}) });
        const data = await api<Train[]>(`/rest/booking-info/search-trips?${query}`);
        return { ...route, trains: data };
      }));
      if (found.some((leg) => !leg.trains.length)) throw new Error("No Premium trains are available for that route and date. Try another date.");
      setLegs(found);
      setPassengers(passengersList);
      setSelectedLeg(0);
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t find trains for that journey.");
    } finally {
      setLoading(false);
    }
  }
  function selectTrain(train: Train) {
    setLegs((current) => current.map((leg, index) => index === selectedLeg ? { ...leg, selected: train } : leg));
    clearError();
  }
  function continueFromTrains() {
    if (legs.some((leg) => !leg.selected)) {
      setError("Select an available train for every journey before continuing.");
      return;
    }
    setStep(2);
    clearError();
  }
  function setPassenger(index: number, key: keyof Passenger, value: string | boolean) {
    setPassengers((current) => current.map((person, i) => i === index ? { ...person, [key]: value } : person));
  }
  function validatePassengerStep() {
    for (const [index, person] of passengers.entries()) {
      if (!person.first || !person.last || !person.gender || !person.dob || !person.document) return `Complete the required fields for Passenger ${index + 1}.`;
      if (!person.phone) return `Enter a phone number for Passenger ${index + 1}.`;
      const age = Number(ageFrom(person.dob).split(" ")[0]);
      const ageFitsType = person.type === "adult" ? age >= 18 : person.type === "teenager" ? age >= 12 && age <= 17 : person.type === "child" ? age >= 3 && age <= 11 : age <= 2;
      if (!ageFitsType) return `Passenger ${index + 1} does not match the selected ${passengerNames[person.type].toLowerCase()} age group.`;
    }
    if (!contact.name || !contact.phone || !contact.document) return "Complete the booking contact name, phone and document number.";
    if (!emergency.name || !emergency.phone) return "Enter an emergency contact name and phone number.";
    const bookingPhones = [contact.phone, ...passengers.map((person) => person.phone)].filter(Boolean).map(normalizeKenyanPhone);
    if (bookingPhones.includes(normalizeKenyanPhone(emergency.phone))) return "Use a number that is not already on this booking. The emergency contact must be someone else.";
    if (!/^254[17]\d{8}$/.test(normalizeKenyanPhone(contact.phone))) return "Enter a valid Kenyan booking contact phone number.";
    if (!/^254[17]\d{8}$/.test(normalizeKenyanPhone(emergency.phone))) return "Enter a valid Kenyan emergency contact phone number.";
    return "";
  }
  function continueToSeats() {
    const validation = validatePassengerStep();
    if (validation) return setError(validation);
    clearError();
    setStep(3);
    void loadSeats();
  }
  async function loadSeats() {
    setLoading(true);
    try {
      let token = seatToken;
      if (!token) {
        const result = await api<{ token: string; ttl_seconds: number }>("/rest/seat-locks/token", {});
        token = result.token;
        setSeatToken(token);
      }
      const maps = await Promise.all(legs.map(async (leg) => {
        const train = leg.selected!;
        const query = new URLSearchParams({ trip_id: String(train.trip_id), date: train.date, class: "premium", token });
        return api<SeatMap>(`/rest/seat-locks/status?${query}`);
      }));
      setSeatMaps(Object.fromEntries(maps.map((map, index) => [index, map])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t load the seat layout.");
    } finally {
      setLoading(false);
    }
  }
  const seatKey = (legIndex: number, passengerIndex: number) => `${legIndex}:${passengerIndex}`;
  function hasSeat(legIndex: number, passengerIndex: number) { return Boolean(seatAssignments[seatKey(legIndex, passengerIndex)]); }
  async function assignSeat(legIndex: number, passengerIndex: number, seat: string) {
    const train = legs[legIndex]?.selected;
    if (!train || !seatToken) return;
    setLoading(true);
    clearError();
    try {
      const key = seatKey(legIndex, passengerIndex);
      const previous = seatAssignments[key];
      if (previous) await api("/rest/seat-locks/release", { token: seatToken, trip_id: train.trip_id, date: train.date, seat: previous });
      await api("/rest/seat-locks/lock", { token: seatToken, trip_id: train.trip_id, date: train.date, seat, class: "premium" });
      setSeatAssignments((current) => ({ ...current, [key]: seat }));
      setSeatMaps((current) => ({ ...current, [legIndex]: { ...current[legIndex]!, seats: current[legIndex]!.seats.map((item) => item.seat === seat ? { ...item, state: "mine" } : item.seat === previous ? { ...item, state: "free" } : item) } }));
      if (!holdUntil) setHoldUntil(Date.now() + 10 * 60 * 1000);
      setSeatPicker(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That seat is no longer available. Choose another seat.");
      void loadSeats();
    } finally {
      setLoading(false);
    }
  }
  async function autoAssign() {
    clearError();
    for (let legIndex = 0; legIndex < legs.length; legIndex++) {
      const seats = seatMaps[legIndex]?.seats.filter((item) => item.state === "free") || [];
      for (let passengerIndex = 0; passengerIndex < passengers.length; passengerIndex++) {
        if (passengers[passengerIndex]?.type === "infant" || hasSeat(legIndex, passengerIndex)) continue;
        const seat = seats.shift();
        if (!seat) return setError("There aren’t enough seats available for everyone. Choose another train.");
        await assignSeat(legIndex, passengerIndex, seat.seat);
      }
    }
  }
  function allSeatsAssigned() {
    return legs.every((_, legIndex) => passengers.every((person, passengerIndex) => person.type === "infant" || hasSeat(legIndex, passengerIndex)));
  }
  async function confirmSeats() {
    if (!allSeatsAssigned()) return setError("Choose a seat for each passenger before continuing.");
    setSeatConfirm(false);
    setStep(4);
    clearError();
  }
  async function createBooking() {
    if (!agreed) return setError("Please agree to the Terms & Conditions before submitting your booking.");
    setLoading(true);
    clearError();
    try {
      const result = await api<Order>("/rest/booking-management/create", {
        phone: contact.phone,
        token: seatToken,
        trip: tripType,
        legs: legs.map((leg, legIndex) => ({
          trip_id: leg.selected!.trip_id,
          from: leg.from,
          to: leg.to,
          date: leg.date,
          class: "premium",
          passengers: passengers.map((person, passengerIndex) => ({
            ptype: person.type,
            full_name: [person.first, person.middle, person.last].filter(Boolean).join(" "),
            gender: person.gender,
            nationality: person.nationality,
            id_no: person.document,
            seat: person.type === "infant" ? null : seatAssignments[seatKey(legIndex, passengerIndex)],
          })),
        })),
      });
      setOrder(result);
      setPaymentUntil(Date.now() + result.payment_window_seconds * 1000);
      setHoldUntil(null);
      setPaymentStage("refreshments");
      setStep(5);
      setSeatToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t submit the booking. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }
  async function beginPayment() {
    if (!order) return;
    if (paymentMethod === "mpesa" && !/^254[17]\d{8}$/.test(normalizeKenyanPhone(paymentPhone))) {
      setPaymentMessage("Enter a valid Kenyan phone number to receive the M-Pesa prompt.");
      return;
    }
    setPaymentBusy(true);
    setPaymentMessage("");
    try {
      const path = paymentMethod === "mpesa" ? "/rest/booking-info/payment/stk-push" : "/rest/booking-info/payment/card/session";
      const session = await api<{ checkout_id: string; prompt: string }>(path, { group_ref: order.group_ref, ...(paymentMethod === "mpesa" ? { phone: normalizeKenyanPhone(paymentPhone) } : {}) });
      setPaymentMessage(session.prompt);
      const statusPath = paymentMethod === "mpesa" ? "/rest/booking-info/payment/status" : "/rest/booking-info/payment/card/status";
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const query = new URLSearchParams({ checkout_id: session.checkout_id });
        const status = await api<{ status: string }>(`${statusPath}?${query}`);
        if (status.status === "success") { setPaymentComplete(true); setPaymentMessage("Your payment is confirmed. Your tickets are ready."); break; }
        if (status.status === "failed") { setPaymentMessage("Payment wasn’t completed. Check your details and try again."); break; }
      }
    } catch (cause) {
      setPaymentMessage(cause instanceof Error ? cause.message : "We couldn’t start your payment.");
    } finally {
      setPaymentBusy(false);
    }
  }
  function goBack() {
    clearError();
    if (step === 5 && order) return setPaymentStage("refreshments");
    setStep((current) => Math.max(0, current - 1));
  }
  useEffect(() => {
    if (!autoSearchPending || !stations.length || !from || !to || !departure) return;
    setAutoSearchPending(false);
    void searchTrains();
  }, [autoSearchPending, stations.length, from, to, departure, tripType, returnDate, counts, multiSegments, searchTrains]);
  const duration = (departureTime: string, arrivalTime: string) => {
    const [dh, dm] = departureTime.split(":").map(Number);
    const [ah, am] = arrivalTime.split(":").map(Number);
    let minutes = (ah || 0) * 60 + (am || 0) - (dh || 0) * 60 - (dm || 0);
    if (minutes < 0) minutes += 1440;
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  };
  function renderSeat(rowIndex: number, letter: "A" | "B") {
    const seat = `P1-${rowIndex + 1}${letter}`;
    const item = seatMaps[selectedLeg]?.seats.find((value) => value.seat === seat);
    const owner = passengers.findIndex((_, passengerIndex) => seatAssignments[seatKey(selectedLeg, passengerIndex)] === seat);
    const selected = owner >= 0;
    const booked = item?.state === "booked";
    const unavailable = item?.state === "locked" || (!selected && item?.state === "mine");
    const assignedToOther = selected && owner !== activePassenger;
    const free = item?.state === "free";
    return <button key={seat} type="button" disabled={!item || (booked && !selected) || (unavailable && !selected) || assignedToOther} onClick={() => { if (free || selected) setSeatPicker({ seat, leg: selectedLeg }); }} className={`grid h-9 w-10 shrink-0 place-items-center rounded-lg border-2 text-[9px] font-bold transition ${selected ? "border-[#1769e0] bg-[#287af4] text-white shadow-[0_2px_6px_rgba(40,122,244,.28)]" : booked ? "border-[#4b8ef5] bg-[#dceaff] text-[#246bd0]" : free ? "border-[#cdd3dc] bg-[#eef0f4] text-[#8e98a7] hover:border-[#5594f7] hover:bg-[#e5efff]" : "border-[#d4d8de] bg-[#e7e9ed] text-[#b4bac4]"}`} aria-label={`Seat ${seat}${selected ? ", selected" : booked ? ", booked" : free ? ", available" : ", unavailable"}`} title={selected ? "Selected" : booked ? "Booked" : free ? "Available" : "Unavailable"}><span>▣</span>{rowIndex + 1}{letter}</button>;
  }

  const input = "mt-1 h-11 w-full rounded-lg border border-[#e1e4e9] bg-[#fbfbfc] px-3 text-sm text-[#182133] outline-none transition placeholder:text-[#9aa2b1] focus:border-[#8e2333] focus:ring-2 focus:ring-[#8e2333]/10";
  const label = "block text-[10px] font-bold uppercase tracking-[.09em] text-[#687285]";
  const card = "rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]";
  const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8e2333] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#741b2a] disabled:cursor-not-allowed disabled:bg-[#e1e4e9] disabled:text-[#9aa2b1] disabled:shadow-none";

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#182133]">
      <header className="relative z-20 bg-[#8e2333] text-white shadow-sm">
        <div className="mx-auto flex min-h-[58px] max-w-[1200px] items-center justify-between gap-4 px-4">
          <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Madaraka Express home">
            <Logo small />
          </a>
          <nav className="hidden items-center gap-1 text-xs font-medium lg:flex">
            {[ ["Home", "/"], ["Book a Train", "/premium-booking"], ["Manage Booking", "/booking/manage"], ["Stations", "/stations"], ["Fares", "/fares"], ["News & Updates", "/news"] ].map(([name, href]) => <a key={name} href={href} className={`rounded-md px-3 py-2 transition hover:bg-white/10 ${name === "Book a Train" ? "bg-white/15 font-bold" : "text-white/85"}`}>{name}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-3 text-xs"><button type="button" aria-label="Language" className="hidden items-center gap-1 sm:flex">🇬🇧 EN <ChevronDown className="h-3 w-3" /></button><button type="button" aria-label="Toggle dark mode" className="text-lg leading-none">☾</button><a href="/login" className="rounded-full bg-[#f4b400] px-4 py-2 font-bold text-[#58260b]">Sign in</a></div>
        </div>
      </header>
      <div className="relative h-[88px] overflow-hidden bg-[#5d2a30]">
        <img src="/images/hero.jpg" alt="Madaraka Express train" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#461c2a]/90 via-[#521d29]/65 to-[#161d27]/65" />
        <div className="relative mx-auto flex h-full max-w-[960px] flex-col justify-center px-4"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#f4b400]">Kenya Railways</span><h1 className="mt-1 text-lg font-bold text-white">Book a Train</h1></div>
      </div>

      <main className="mx-auto min-h-[700px] max-w-[960px] px-4 pb-28 pt-5 sm:pt-6">
        <nav aria-label="Booking progress" className={`${card} mx-auto mb-6 grid max-w-[760px] grid-cols-6 px-2 py-3 sm:px-5 sm:py-4`}>
          {STEP_NAMES.map((name, index) => <div key={name} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center">
            {index < STEP_NAMES.length - 1 && <span className={`absolute left-[calc(50%+15px)] right-[calc(-50%+15px)] top-[13px] h-px ${index < step ? "bg-[#14b8a6]" : "bg-[#e2e5ea]"}`} />}
            <span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[10px] font-extrabold sm:h-8 sm:w-8 ${index < step ? "bg-[#14b8a6] text-white" : index === step ? "bg-[#8e2333] text-white ring-4 ring-[#8e2333]/15" : "bg-[#e7e9ed] text-[#9ba3b1]"}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
            <span className={`max-w-full truncate text-[8px] font-bold sm:text-[10px] ${index <= step ? index < step ? "text-[#0e9f90]" : "text-[#8e2333]" : "text-[#9aa2b1]"}`}>{name}</span>
          </div>)}
        </nav>

        {error && <div role="alert" className="mb-4 rounded-xl border border-[#efc5cb] bg-[#fff4f5] px-4 py-3 text-sm text-[#a52236]">{error}</div>}

        {step === 0 && (autoSearchPending || loading) ? <div className={`${card} mx-auto max-w-[760px] px-5 py-16 text-center`}><span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-[#d5d9e0] border-t-[#8e2333]" /><h2 className="text-lg font-bold">Searching Premium trains…</h2><p className="mt-1 text-sm text-[#8992a1]">Using the trip details you already entered.</p></div> : step === 0 && <form onSubmit={searchTrains} className="mx-auto max-w-[760px]">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([ ["oneway", "→", "One Way", "Single direction trip"], ["round", "⇄", "Round Trip", "Depart and return"], ["multi", "⊕", "Multi-Booking", "Multiple bookings"] ] as const).map(([value, icon, title, subtitle]) => <button key={value} type="button" onClick={() => { setTripType(value); clearError(); }} className={`flex min-h-[82px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${tripType === value ? "border-[#8e2333] bg-[#8e2333] text-white shadow-md" : "border-[#e1e4e9] bg-white text-[#243047] hover:border-[#8e2333]/45"}`}><span className={`text-2xl ${tripType === value ? "text-[#f4b400]" : "text-[#0ea999]"}`}>{icon}</span><span><b className="block text-sm">{title}</b><small className={`mt-1 block text-[10px] ${tripType === value ? "text-white/75" : "text-[#9099a8]"}`}>{subtitle}</small></span></button>)}
          </div>
          <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-r from-[#8e2333] via-[#992c35] to-[#a13c2a] px-5 py-4 text-white shadow-sm sm:flex-row">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 text-[#f4b400]"><TrainFront className="h-5 w-5" /></span><div className="flex-1 text-center sm:text-left"><b className="block text-sm">Travelling on Kenya Railways’ other services?</b><small className="text-[11px] text-white/75">First Class and Economy tickets are sold on the Kenya Railways portal.</small></div><a href="https://metickets.krc.co.ke/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f4b400] px-4 text-xs font-extrabold text-[#58260b]">Book First class or Economy <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="relative"><label className={label} htmlFor="from">From</label><div className="relative mt-1"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e2333]" /><input id="from" required list="station-options" value={fromSearch || origin?.name || from} onChange={(event) => { setFromSearch(event.target.value); const station = stations.find((item) => item.name.toLowerCase() === event.target.value.toLowerCase()); setFrom(station ? String(station.id) : ""); }} placeholder="Choose origin station" className={`${input} pl-10`} />{from && <button type="button" aria-label="Clear origin" onClick={() => { setFrom(""); setFromSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa2b1]"><X className="h-4 w-4" /></button>}</div></div>
            <div className="relative"><label className={label} htmlFor="to">To</label><div className="relative mt-1"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e2333]" /><input id="to" required list="station-options" value={toSearch || destination?.name || to} onChange={(event) => { setToSearch(event.target.value); const station = stations.find((item) => item.name.toLowerCase() === event.target.value.toLowerCase()); setTo(station ? String(station.id) : ""); }} placeholder="Choose destination station" className={`${input} pl-10`} />{to && <button type="button" aria-label="Clear destination" onClick={() => { setTo(""); setToSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa2b1]"><X className="h-4 w-4" /></button>}<button type="button" onClick={swapStations} aria-label="Swap stations" className="absolute -left-[30px] top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3e6eb] bg-white text-[#8e2333] sm:flex"><ArrowLeftRight className="h-4 w-4" /></button></div></div>
            <datalist id="station-options">{stations.map((station) => <option key={station.id} value={station.name} />)}</datalist>
            <div><label className={label} htmlFor="departure">Departure</label><input required id="departure" type="date" min={todayLocal()} max={inDays(todayLocal(), 60)} value={departure} onChange={(event) => setDeparture(event.target.value)} className={input} /><small className="mt-1 block text-[10px] text-[#9aa2b1]">Tickets are on sale up to 60 days ahead</small></div>
            {isRoundTrip ? <div><label className={label} htmlFor="return-date">Return</label><input required id="return-date" type="date" min={departure || todayLocal()} max={inDays(todayLocal(), 60)} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className={input} /></div> : <div className="relative"><label className={label}>Passengers</label><button type="button" aria-expanded={passengerOpen} onClick={() => setPassengerOpen((open) => !open)} className={`${input} mt-1 flex items-center justify-between text-left`}><span className="inline-flex items-center gap-2"><span className="text-[#8e2333]">♙</span>{totalPassengers} Passenger{totalPassengers === 1 ? "" : "s"}</span><ChevronDown className="h-4 w-4 text-[#9aa2b1]" /></button>{passengerOpen && <div className="absolute right-0 top-[calc(100%+7px)] z-30 w-full min-w-[280px] rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-xl">{([ ["adult", "Adult", "18+ years"], ["teenager", "Teenager", "12–17 years"], ["child", "Child", "3–11 years"], ["infant", "Infant", "No seat unless paid for and booked as a Child"] ] as const).map(([type, name, age]) => <div key={type} className="flex items-center gap-2 border-b border-[#f0f1f3] py-2.5 last:border-0"><div className="flex-1"><b className="block text-xs">{name}</b><small className="text-[9px] text-[#9aa2b1]">{age}</small></div><button type="button" disabled={!counts[type]} onClick={() => changeCount(type, -1)} aria-label={`Remove ${name}`} className="grid h-7 w-7 place-items-center rounded-full border border-[#e3e6eb] text-[#8e2333] disabled:text-[#c8cdd5]"><Minus className="h-3 w-3" /></button><b className="w-4 text-center text-xs">{counts[type]}</b><button type="button" disabled={totalPassengers >= 9} onClick={() => changeCount(type, 1)} aria-label={`Add ${name}`} className="grid h-7 w-7 place-items-center rounded-full border border-[#d99ea6] text-[#8e2333] disabled:text-[#c8cdd5]"><Plus className="h-3 w-3" /></button></div>)}<div className="flex justify-between pt-2 text-[10px]"><span className="text-[#8992a1]">Passengers</span><b className="text-[#8e2333]">{totalPassengers} Passenger{totalPassengers === 1 ? "" : "s"}</b></div></div>}</div>}
          </div>
          {tripType === "multi" && <section className={`${card} mt-4 p-4`}><div className="flex items-center justify-between"><div><b className="text-sm">Additional journey segments</b><p className="mt-1 text-[10px] text-[#929aa8]">Add each extra route to include it in this booking.</p></div><button type="button" disabled={multiSegments.length >= 5} onClick={() => setMultiSegments((current) => [...current, { from: "", to: "", date: departure }])} className="rounded-lg border border-[#d9b7bc] px-3 py-2 text-[10px] font-bold text-[#8e2333] disabled:opacity-40">+ Add segment</button></div>{multiSegments.map((segment, index) => <div key={index} className="mt-3 grid gap-3 rounded-xl border border-[#eef0f3] p-3 sm:grid-cols-3"><label className={label}>Segment {index + 2} · From<select value={segment.from} onChange={(event) => setMultiSegments((current) => current.map((item, i) => i === index ? { ...item, from: event.target.value } : item))} className={input}><option value="">Choose station</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label><label className={label}>To<select value={segment.to} onChange={(event) => setMultiSegments((current) => current.map((item, i) => i === index ? { ...item, to: event.target.value } : item))} className={input}><option value="">Choose station</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label><label className={label}>Date<input type="date" min={todayLocal()} max={inDays(todayLocal(), 60)} value={segment.date} onChange={(event) => setMultiSegments((current) => current.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className={input} /></label><button type="button" onClick={() => setMultiSegments((current) => current.filter((_, i) => i !== index))} className="justify-self-start text-[10px] font-bold text-[#a23c4b] sm:col-span-3">Remove segment</button></div>)}</section>}
          <button type="submit" disabled={loading} className={`${primaryButton} mt-6 w-full bg-[#f4b400] text-[#542708] hover:bg-[#e9a900]`}><Search className="h-4 w-4" />{loading ? "Searching trains…" : "Search Trips"}<ArrowRight className="h-4 w-4" /></button>
        </form>}

        {step === 1 && <section className="mx-auto max-w-[760px]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-extrabold">Select Train</h2><p className="mt-1 text-sm text-[#778193]">{stations.find((station) => String(station.id) === legs[selectedLeg]?.from)?.name} → {stations.find((station) => String(station.id) === legs[selectedLeg]?.to)?.name} <span className="ml-2 rounded-full bg-[#f0f2f5] px-2 py-1 text-[10px]">{prettyDate(legs[selectedLeg]?.date || "")}</span></p></div></div>
          {legs.length > 1 && <div className="mb-4 flex gap-2 overflow-x-auto">{legs.map((leg, index) => <button key={index} type="button" onClick={() => setSelectedLeg(index)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold ${selectedLeg === index ? "border-[#8e2333] bg-[#fbf1f2] text-[#8e2333]" : "border-[#e5e7eb] bg-white text-[#687285]"}`}>{index === 0 ? "Outbound" : "Return"} · {stations.find((station) => String(station.id) === leg.from)?.name} → {stations.find((station) => String(station.id) === leg.to)?.name}</button>)}</div>}
          <div className="space-y-3">{legs[selectedLeg]?.trains.map((train) => {
            const fare = train.classes.find((item) => item.class === "premium");
            const selected = legs[selectedLeg]?.selected?.trip_id === train.trip_id;
            return <article key={train.trip_id} className={`${card} p-4 sm:p-5 ${!train.bookable || !fare?.seats_available ? "opacity-55" : ""} ${selected ? "border-[#8e2333] ring-2 ring-[#8e2333]/10" : ""}`}>
              <div className="flex items-center gap-2 border-b border-[#f0f1f3] pb-3 text-xs font-bold"><TrainFront className="h-4 w-4 text-[#8e2333]" />{train.train_no} {train.route_name}</div>
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 py-4 sm:gap-4"><div><b className="text-xl sm:text-2xl">{train.departure}</b><small className="block text-[10px] text-[#929aa8]">{stations.find((station) => station.id === train.from)?.name}</small></div><div className="min-w-14 text-center"><small className="block text-[9px] text-[#929aa8]">{duration(train.departure, train.arrival)}</small><span className="relative mt-1 block h-px bg-[#dfe3e8]"><TrainFront className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-white text-[#aab2bd]" /></span><small className="mt-1 inline-block rounded-full bg-[#e4faf6] px-2 py-0.5 text-[9px] font-bold text-[#0f9d8c]">On Time</small></div><div><b className="text-xl sm:text-2xl">{train.arrival}{train.arrives_next_day ? " +1" : ""}</b><small className="block text-[10px] text-[#929aa8]">{stations.find((station) => station.id === train.to)?.name}</small></div><div className="text-right">{fare?.seats_available ? <><small className="block text-[10px] font-bold text-[#bc4a37]">{fare.seats_available < 5 ? `Only ${fare.seats_available} seats left` : "Available"}</small><button type="button" disabled={!train.bookable} onClick={() => selectTrain(train)} className={`${primaryButton} mt-2 px-4`}>{selected ? "Selected" : "Select"}</button></> : <><small className="block text-[10px] font-bold text-[#c95555]">Sold out</small><button type="button" disabled className={`${primaryButton} mt-2 px-4`}>Sold out</button></>}</div></div>
              <div className="border-t border-[#f0f1f3] pt-3 text-[10px] text-[#929aa8]">Travel class: <span className="rounded-full bg-[#fff6df] px-2 py-1 font-bold text-[#9e6900]">Premium · {fare?.seats_available ?? 0} seats</span><b className="float-right text-xs text-[#8e2333]">{money(Number(fare?.fares["adult"] || 0))} / adult</b></div>
            </article>;
          })}</div>
          <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-[#e5e7eb] bg-[#f8f9fb]/95 px-1 py-3 backdrop-blur"><button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs font-bold text-[#6e7889]"><ArrowLeft className="h-4 w-4" />Back</button><span className="hidden text-[10px] text-[#a0a7b3] sm:inline">Select a train to continue</span><button type="button" onClick={continueFromTrains} className={primaryButton}>Continue <ChevronRight className="h-4 w-4" /></button></div>
        </section>}

        {step === 2 && <section className="mx-auto max-w-[760px]">
          <header className="mb-4"><h2 className="text-xl font-extrabold">Passengers</h2><p className="mt-1 text-sm text-[#778193]">Fill in details for each traveller. {completePassengers} of {passengers.length} profiles complete.</p></header>
          <div className="space-y-3">{passengers.map((person, index) => {
            const fieldsLeft = [person.first, person.last, person.gender, person.dob, person.nationality, person.document, person.phone].filter((value) => !value).length;
            const complete = fieldsLeft === 0;
            return <details key={index} open className={`${card} p-4 sm:p-5`}><summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#8e2333] text-sm font-extrabold text-white">{index + 1}</span><span className="flex-1"><b className="text-sm">Passenger {index + 1}</b><small className="ml-2 rounded-full bg-[#f3f4f6] px-2 py-1 text-[9px] font-bold uppercase text-[#768093]">{passengerNames[person.type]}</small></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${complete ? "bg-[#e2faf6] text-[#0e9f90]" : "bg-[#fff5df] text-[#9b6b00]"}`}>{complete ? "Complete" : `${fieldsLeft} fields left`}</span><ChevronDown className="h-4 w-4 text-[#9aa2b1]" /></summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={label}>First Name *<input required value={person.first} onChange={(event) => setPassenger(index, "first", event.target.value)} className={input} autoComplete="given-name" /></label>
                <label className={label}>Middle Name<input value={person.middle} onChange={(event) => setPassenger(index, "middle", event.target.value)} placeholder="Optional" className={input} /></label>
                <label className={label}>Surname *<input required value={person.last} onChange={(event) => setPassenger(index, "last", event.target.value)} className={input} autoComplete="family-name" /></label>
                <fieldset><legend className={label}>Gender *</legend><div className="mt-1 grid h-11 grid-cols-2 gap-2">{([ ["M", "Male"], ["F", "Female"] ] as const).map(([value, text]) => <button key={value} type="button" onClick={() => setPassenger(index, "gender", value)} className={`rounded-lg border text-xs font-bold ${person.gender === value ? "border-[#8e2333] bg-[#fbf1f2] text-[#8e2333]" : "border-[#e1e4e9] bg-[#fbfbfc] text-[#778193]"}`}>{text}</button>)}</div></fieldset>
                <label className={label}>Date of Birth *<input required type="date" max={todayLocal()} value={person.dob} onChange={(event) => setPassenger(index, "dob", event.target.value)} className={input} />{person.dob && <small className="mt-1 block text-[10px] text-[#8992a1]">Age: {ageFrom(person.dob)}</small>}</label>
                <label className={label}>Nationality *<select value={person.nationality} onChange={(event) => setPassenger(index, "nationality", event.target.value)} className={input}><option>Kenya</option>{["Burundi", "DR Congo", "Ethiopia", "Rwanda", "Somalia", "South Sudan", "Tanzania", "Uganda", "Other"].map((country) => <option key={country}>{country}</option>)}</select></label>
                <label className={label}>Document Type *<select value={person.documentType} onChange={(event) => setPassenger(index, "documentType", event.target.value)} className={input}><option>National ID</option><option>Passport</option><option>Birth Certificate</option></select></label>
                <label className={label}>Document Number *<input required value={person.document} onChange={(event) => setPassenger(index, "document", event.target.value.toUpperCase())} className={input} /></label>
                <label className={label}>Phone Number *<div className="mt-1 flex"><span className="flex h-11 items-center rounded-l-lg border border-r-0 border-[#e1e4e9] bg-[#f3f4f6] px-3 text-xs text-[#687285]">🇰🇪 +254</span><input required value={person.phone} onChange={(event) => setPassenger(index, "phone", event.target.value)} placeholder="712 345 678" className={`${input} mt-0 rounded-l-none`} /></div></label>
                <label className={label}>Email Address<input type="email" value={person.email} onChange={(event) => setPassenger(index, "email", event.target.value)} className={input} /></label>
                <label className="sm:col-span-2 flex items-start gap-3 rounded-xl bg-[#f8f8f9] p-3 text-xs"><input type="checkbox" checked={person.disability} onChange={(event) => setPassenger(index, "disability", event.target.checked)} className="mt-0.5 accent-[#8e2333]" /><span><b className="block">Person with a disability</b><small className="text-[#8f98a5]">Tell the crew how we can support this traveller.</small>{person.disability && <textarea value={person.disabilityNote} onChange={(event) => setPassenger(index, "disabilityNote", event.target.value)} placeholder="Support required" className={`${input} mt-2`} />}</span></label>
              </div>
            </details>;
          })}</div>
          <button type="button" onClick={() => { if (passengers.length >= 9) return setError("You can add up to 9 passengers."); setPassengers((current) => [...current, blankPassenger("adult")]); setCounts((current) => ({ ...current, adult: current.adult + 1 })); }} className="mt-3 rounded-lg border border-dashed border-[#c7a0a6] px-4 py-2.5 text-xs font-bold text-[#8e2333]">+ Add Passenger</button>
          <section className={`${card} mt-5 p-4 sm:p-5`}><h3 className="font-bold">Booking Contact</h3><p className="mt-1 text-[11px] text-[#929aa8]">Who we send tickets and booking updates to.</p><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={sameContact} onChange={(event) => { setSameContact(event.target.checked); if (event.target.checked && passengers[0]) setContact((current) => ({ ...current, name: [passengers[0]!.first, passengers[0]!.last].filter(Boolean).join(" "), phone: passengers[0]!.phone, email: passengers[0]!.email, documentType: passengers[0]!.documentType, document: passengers[0]!.document })); }} className="accent-[#8e2333]" />Copy details from Passenger 1</label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>Contact Name *<input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className={input} /></label><label className={label}>Phone *<input required value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="0712 345 678" className={input} /></label><label className={label}>Email<input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={input} /></label><label className={label}>Document Type *<select required value={contact.documentType} onChange={(event) => setContact({ ...contact, documentType: event.target.value })} className={input}><option>National ID</option><option>Passport</option></select></label><label className={`${label} sm:col-span-2`}>Document Number *<input required value={contact.document} onChange={(event) => setContact({ ...contact, document: event.target.value })} className={input} /></label></div></section>
          <section className="mt-4 rounded-2xl border border-[#e9cdd1] bg-white p-4 sm:p-5"><h3 className="font-bold text-[#8e2333]">Emergency Contact</h3><p className="mt-1 text-[11px] text-[#929aa8]">Someone not travelling with you, only contacted in an emergency.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>Contact Name *<input required value={emergency.name} onChange={(event) => setEmergency({ ...emergency, name: event.target.value })} className={input} /></label><label className={label}>Contact Phone *<input required value={emergency.phone} onChange={(event) => setEmergency({ ...emergency, phone: event.target.value })} className={input} /></label><label className={`${label} sm:col-span-2`}>Contact Email<input type="email" value={emergency.email} onChange={(event) => setEmergency({ ...emergency, email: event.target.value })} className={input} /></label></div></section>
          <div className="sticky bottom-0 mt-5 flex justify-between border-t border-[#e5e7eb] bg-[#f8f9fb]/95 py-3 backdrop-blur"><button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs font-bold text-[#6e7889]"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" onClick={continueToSeats} className={primaryButton}>Continue to seats <ChevronRight className="h-4 w-4" /></button></div>
        </section>}

        {step === 3 && <section className="mx-auto max-w-[760px]">
          <header className="mb-4"><h2 className="text-xl font-extrabold">Seats</h2><p className="mt-1 text-sm text-[#778193]">{stations.find((station) => String(station.id) === legs[selectedLeg]?.from)?.name} → {stations.find((station) => String(station.id) === legs[selectedLeg]?.to)?.name} <span className="ml-2 rounded-full bg-[#f0f2f5] px-2 py-1 text-[10px]">{prettyDate(legs[selectedLeg]?.date || "")}</span></p></header>
          <div className={`${card} mb-4 p-4`}><span className={`${label} text-[#a6afbd]`}>Travel Class</span><div className="mt-2 flex gap-2"><span className="rounded-lg bg-[#8e2333] px-3 py-2 text-xs font-bold text-white">▦ All {legs.length}</span><span className="rounded-lg border border-[#e5e7eb] bg-[#fbfbfc] px-3 py-2 text-xs font-bold text-[#697486]">Premium <b className="ml-1 text-[#b74854]">{money(Number(selectedTrain?.classes.find((item) => item.class === "premium")?.fares["adult"] || 0))}</b></span></div></div>
          {holdUntil && <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#f2d789] bg-[#fffbed] px-4 py-3 text-[#9c6d00]"><Clock3 className="h-4 w-4" /><span className="flex-1"><b className="block text-xs">Your seats are held</b><small className="text-[10px]">Complete your booking before the timer runs out</small></span><b className="text-xl tabular-nums">{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</b></div>}
          {legs.length > 1 && <div className="mb-3 flex gap-2 overflow-auto">{legs.map((leg, index) => <button key={index} type="button" onClick={() => { setSelectedLeg(index); if (!seatMaps[index]) void loadSeats(); }} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[10px] font-bold ${selectedLeg === index ? "border-[#8e2333] bg-[#fbf1f2] text-[#8e2333]" : "border-[#e5e7eb] bg-white text-[#687285]"}`}>{index === 0 ? "Outbound" : "Return"}</button>)}</div>}
          <div className="mb-3 flex flex-wrap justify-center gap-2">{passengers.map((person, index) => <button key={index} type="button" onClick={() => setActivePassenger(index)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold ${activePassenger === index ? "border-[#8e2333] bg-[#fbf1f2] text-[#8e2333]" : "border-[#e5e7eb] bg-white text-[#738093]"}`}><span className="grid h-5 w-5 place-items-center rounded-full bg-[#eef0f4] text-[8px]">{initials(person)}</span>P{index + 1} {hasSeat(selectedLeg, index) && `· ${seatAssignments[seatKey(selectedLeg, index)]}`}</button>)}</div>
          {loading && !seatMaps[selectedLeg] ? <div className={`${card} py-16 text-center text-sm text-[#828b9a]`}><span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-[#d5d9e0] border-t-[#8e2333]" />Loading seat layout…</div> : <div className="relative mx-auto max-w-[430px] rounded-[26px] border border-[#e2e5ea] border-t-4 border-t-[#3983f6] bg-gradient-to-b from-white to-[#fbfbfc] p-4 shadow-[0_8px_24px_rgba(0,0,0,.09)]">
            <div className="flex items-center gap-2 border-b border-[#f0f1f3] pb-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#8e2333] text-sm font-bold text-white">2</span><span className="flex-1"><b className="block text-sm">Premium</b><small className="text-[10px] text-[#99a1ad]">COACH 2</small></span><b className="rounded-full bg-[#f8edef] px-3 py-2 text-xs text-[#8e2333]">{money(Number(selectedTrain?.classes.find((item) => item.class === "premium")?.fares["adult"] || 0))}</b></div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-dashed border-[#e2e5ea] py-3 text-[9px] text-[#8490a0]">{[["available", "Available"], ["booked", "Booked"], ["selected", "Selected"], ["unavailable", "Unavailable"]].map(([kind, text]) => <span key={kind} className="flex items-center gap-1"><i className={`h-3 w-3 rounded-[4px] border-2 ${kind === "available" ? "border-[#cdd3dc] bg-[#eef0f4]" : kind === "booked" ? "border-[#4b8ef5] bg-[#dceaff]" : kind === "selected" ? "border-[#1769e0] bg-[#287af4]" : "border-[#aeb6c2] bg-[#d4d8df]"}`} />{text}</span>)}</div>
            <p className="mt-3 text-center text-[9px] font-extrabold tracking-[.18em] text-[#a0a8b4]">⌃ FRONT OF TRAIN</p><div className="mx-auto mt-1 w-[190px] rounded-t-[28px] rounded-b-md bg-gradient-to-b from-[#a83b4d] to-[#791b2b] px-3 py-2 text-center text-[7px] font-extrabold tracking-[.2em] text-white shadow">●　 MADARAKA EXPRESS　 ●</div>
            <div className="mx-auto mt-3 grid w-fit grid-cols-[22px_42px_16px_42px_22px] items-center gap-1 text-center text-[9px] text-[#9ba4b1]"><span /> <b>A</b><span /> <b>B</b><span />{Array.from({ length: seatMaps[selectedLeg]?.layout.rows || 15 }, (_, rowIndex) => <div key={rowIndex} className="contents">{rowIndex === 0 || rowIndex === 14 ? <><span>{rowIndex + 1}</span><span className="col-span-3 flex justify-center">{renderSeat(rowIndex, "A")}</span><span>{rowIndex + 1}</span></> : <><span>{rowIndex + 1}</span>{renderSeat(rowIndex, "A")}<span className="mx-auto h-7 w-px bg-[#e7eaf0]" />{renderSeat(rowIndex, "B")}<span>{rowIndex + 1}</span></>}</div>)}</div>
          </div>}
          <div className="sticky bottom-0 mt-5 flex items-center gap-2 border-t border-[#e5e7eb] bg-[#f8f9fb]/95 py-3 backdrop-blur"><button type="button" onClick={goBack} className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-[#6e7889]"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" onClick={() => void autoAssign()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#f2d789] bg-[#fff5d8] px-3 text-xs font-bold text-[#916200]">▤ Auto Assign</button><button type="button" disabled={!allSeatsAssigned()} onClick={() => setSeatConfirm(true)} className={`${primaryButton} px-4`}>Continue <ChevronRight className="h-4 w-4" /></button></div>
        </section>}

        {step === 4 && <section className="mx-auto max-w-[760px]">
          <h2 className="mb-4 text-xl font-extrabold">Review &amp; Pay</h2>
          <div className={`${card} overflow-hidden`}><div className="border-b border-[#f0f1f3] p-4 sm:p-5"><span className={`${label} text-[#a4adba]`}>Trip Summary</span>{legs.map((leg, index) => <div key={index} className="mt-3 border-b border-[#f2f3f5] pb-3 last:border-0 last:pb-0"><b className="text-base text-[#8e2333]">{stations.find((station) => String(station.id) === leg.from)?.name} <TrainFront className="inline h-4 w-4 text-[#9da5b2]" /> {stations.find((station) => String(station.id) === leg.to)?.name}</b><p className="mt-1 text-xs font-bold">{prettyDate(leg.date)} · {leg.selected?.departure} → {leg.selected?.arrival}</p><span className="mt-2 inline-block rounded-full bg-[#f8edef] px-2.5 py-1 text-[10px] font-bold text-[#8e2333]">Coach 2 · {passengers.map((_, passengerIndex) => seatAssignments[seatKey(index, passengerIndex)]).filter(Boolean).join(", ")}</span></div>)}</div><div className="border-b border-[#f0f1f3] p-4 sm:p-5"><span className={`${label} text-[#a4adba]`}>Passengers</span>{passengers.map((person, index) => <div key={index} className="flex justify-between py-2 text-xs"><span>{[person.first, person.middle, person.last].filter(Boolean).join(" ") || `Passenger ${index + 1}`}</span><span className="text-[#8992a1]">{passengerNames[person.type]} · {seatAssignments[seatKey(0, index)] || "Lap infant"}</span></div>)}</div><div className="p-4 sm:p-5"><span className={`${label} text-[#a4adba]`}>Price Breakdown</span>{passengers.map((person, index) => <div key={index} className="flex justify-between py-2 text-xs"><span>{person.type === "adult" ? "Adult" : passengerNames[person.type]} @ Premium</span><span>{money(fareForPassenger(person.type))}</span></div>)}<div className="mt-2 flex justify-between border-t border-[#f0f1f3] pt-3 text-sm font-extrabold"><span>Total</span><span className="text-[#8e2333]">{money(priceTotal)}</span></div></div></div>
          <section className={`${card} mt-4 p-4 sm:p-5`}><h3 className="text-xs font-extrabold uppercase tracking-wide text-[#8e2333]">Useful Information</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-[#697486]">{["Arrive at least one hour before your departure time.", "Carry your original identification document during travel. Copies are not accepted for boarding.", "Cancellations and rescheduling must be requested at least 48 hours before departure.", "Tickets are not transferable. Alcoholic drinks and prohibited items are not allowed on board."].map((item) => <li key={item} className="flex gap-2"><span className="text-[#f4b400]">●</span>{item}</li>)}</ul><div className="mt-3 flex flex-wrap gap-4 border-t border-[#f0f1f3] pt-3 text-[10px] font-bold text-[#8e2333]"><a href="/terms">Read the full Terms &amp; Conditions</a><a href="/terms">↓ Download PDF</a></div></section>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#e0e3e8] bg-white p-4 text-xs"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8e2333]" /><span><b>I agree to the Terms &amp; Conditions</b><small className="mt-1 block text-[#929aa8]">All passenger details are correct. I agree to Kenya Railways’ booking policy.</small></span></label>
          <div className="sticky bottom-0 mt-4 flex justify-between border-t border-[#e5e7eb] bg-[#f8f9fb]/95 py-3 backdrop-blur"><button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs font-bold text-[#6e7889]"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" disabled={!agreed || loading} onClick={() => { clearError(); setBookingConfirm(true); }} className={primaryButton}>{loading ? "Submitting…" : "Submit Booking"}<ChevronRight className="h-4 w-4" /></button></div>
        </section>}

        {step === 5 && order && <section className="mx-auto max-w-[760px]">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#f3dc90] bg-[#fffbed] p-3 text-[#996900]"><span className="flex items-center gap-3"><Clock3 className="h-5 w-5" /><span><b className="block text-xs">Your seats are held</b><small className="text-[10px]">Complete your booking before the timer runs out</small></span></span><b className="text-xl tabular-nums">{String(Math.floor(paymentSecondsLeft / 60)).padStart(2, "0")}:{String(paymentSecondsLeft % 60).padStart(2, "0")}</b></div>
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#8e2333] p-4 text-white"><div><span className="text-[9px] font-bold uppercase tracking-widest text-white/65">Booking Reference</span><b className="mt-1 block text-xl tracking-[.1em]">{order.group_ref}</b><small className="text-[10px] text-white/75">{passengers.length} Passenger{passengers.length === 1 ? "" : "s"}</small></div><div className="text-right"><span className="block text-[9px] uppercase text-white/65">Total</span><b>{money(order.amount)}</b></div></div>
          {paymentComplete ? <div className={`${card} px-6 py-12 text-center`}><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e2faf6] text-[#0e9f90]"><Check className="h-7 w-7" /></span><h2 className="mt-4 text-2xl font-extrabold">Payment confirmed</h2><p className="mt-2 text-sm text-[#778193]">Your booking {order.group_ref} is confirmed. Keep this reference for your trip.</p><a href="/booking/manage" className={`${primaryButton} mt-5`}>Manage booking</a></div> : paymentStage === "refreshments" ? <>
            <div className="mb-3 flex items-center gap-3 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#8e2333] text-[10px] font-bold text-white">1</span><b>Refreshments</b><span className="h-px w-10 bg-[#d6d9df]" /><span className="grid h-6 w-6 place-items-center rounded-full bg-[#edf0f4] text-[10px] font-bold text-[#9aa2b1]">2</span><span className="text-[#929aa8]">Payment</span></div>
            <div className={`${card} overflow-hidden`}><div className="border-b border-[#f0f1f3] p-4"><h2 className="text-sm font-bold"><Utensils className="mr-2 inline h-4 w-4 text-[#8e2333]" />Complimentary Refreshments</h2><p className="mt-1 text-[10px] text-[#929aa8]">Included with your class. Choose what each passenger is served, or skip.</p></div>{passengers.map((person, index) => <div key={index} className="border-b border-[#f0f1f3] p-4 last:border-0"><div className="mb-3 flex items-center justify-between"><b className="text-xs">{[person.first, person.last].filter(Boolean).join(" ")}</b><span className="rounded-full bg-[#f8edef] px-2 py-1 text-[9px] font-bold text-[#8e2333]">Dinner</span></div><div className="grid gap-2 sm:grid-cols-2">{MEALS.map(([meal, description]) => <label key={meal} className={`flex cursor-pointer gap-2 rounded-xl border p-3 transition ${mealChoices[index] === meal ? "border-[#8e2333] bg-[#fbf1f2]" : "border-[#e3e6ea] hover:border-[#c5a1a7]"}`}><input type="radio" name={`meal-${index}`} checked={mealChoices[index] === meal} onChange={() => setMealChoices((current) => ({ ...current, [index]: meal }))} className="mt-0.5 accent-[#8e2333]" /><span><b className="block text-[10px]">{meal}</b><small className="text-[9px] text-[#8992a1]">{description}</small></span></label>)}</div></div>)}<div className="p-4"><label className={label}>Note for the crew (optional)<textarea disabled={!Object.keys(mealChoices).length} value={crewNote} onChange={(event) => setCrewNote(event.target.value)} placeholder="Choose a meal first to add a note" className={`${input} h-20 resize-y py-3`} /></label></div></div>
            <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white/95 p-3 shadow-lg backdrop-blur"><div><b className="block text-xs">{Object.keys(mealChoices).length ? `${Object.keys(mealChoices).length} meal choice${Object.keys(mealChoices).length === 1 ? "" : "s"}` : "Nothing chosen yet"}</b><small className="text-[9px] text-[#929aa8]">Choose meals before payment, or skip.</small></div><div className="flex gap-2"><button type="button" onClick={() => setPaymentStage("pay")} className="rounded-xl border border-[#e0e3e8] bg-white px-3 py-2.5 text-[10px] font-bold text-[#657084]">No refreshments, thanks</button><button type="button" onClick={() => setPaymentStage("pay")} className={primaryButton}>Continue to payment <ChevronRight className="h-4 w-4" /></button></div></div>
            <p className="mt-3 border-t border-[#e8eaee] pt-3 text-[10px] text-[#8c95a3]">Changed your mind? Nothing has been charged yet. <button type="button" onClick={() => void api("/rest/booking-management/abandon", { group_ref: order.group_ref }).then(() => { setOrder(null); setStep(0); }).catch((cause) => setError(cause.message))} className="font-bold text-red-600">Abort this booking</button></p>
          </> : <>
            <div className="mb-3 flex items-center gap-3 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#e6edf3] text-[10px] font-bold text-[#8e2333]">✓</span><span className="text-[#929aa8]">Refreshments</span><span className="h-px w-10 bg-[#8e2333]" /><span className="grid h-6 w-6 place-items-center rounded-full bg-[#8e2333] text-[10px] font-bold text-white">2</span><b>Payment</b></div>
            <div className={`${card} overflow-hidden`}><div className="p-4"><b className="text-xs uppercase tracking-wide text-[#8992a1]">Payment Method</b><div className="mt-3 grid max-w-[400px] grid-cols-2 gap-2">{([ ["mpesa", "M-Pesa", Smartphone], ["card", "Card", CreditCard] ] as const).map(([method, title, Icon]) => <button key={method} type="button" onClick={() => { setPaymentMethod(method); setPaymentMessage(""); }} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${paymentMethod === method ? "border-[#8e2333] bg-[#fbf1f2] text-[#8e2333]" : "border-[#e5e7eb] text-[#929aa8]"}`}><Icon className="h-4 w-4" />{title}</button>)}</div></div>
              <div className="border-t border-[#f0f1f3] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9faf7] text-[#13a999]">{paymentMethod === "mpesa" ? <Smartphone className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</span><span><b className="block text-sm">{paymentMethod === "mpesa" ? "Pay with M-Pesa" : "Visa, Mastercard & more"}</b><small className="text-[10px] text-[#929aa8]">{paymentMethod === "mpesa" ? "You’ll receive a PIN prompt on your phone" : "Secure simulated checkout. No card details are collected."}</small></span></div><div className="my-4 border-y border-[#f0f1f3] py-3 text-xs"><div className="flex justify-between py-1"><span className="text-[#8992a1]">Ticket</span><span>{money(order.amount)}</span></div><div className="flex justify-between py-1 font-extrabold"><span>Total</span><span className="text-[#8e2333]">{money(order.amount)}</span></div></div>{paymentMethod === "mpesa" ? <label className={label}>M-Pesa Phone Number<div className="mt-1 flex"><span className="flex h-11 items-center rounded-l-lg border border-r-0 border-[#e1e4e9] bg-[#f3f4f6] px-3 text-xs text-[#687285]">🇰🇪 +254</span><input value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="712 345 678" className={`${input} mt-0 rounded-l-none`} /></div></label> : <div className="rounded-xl border border-dashed border-[#d9dde4] bg-[#f9fafb] p-5 text-center"><div className="mx-auto mb-2 h-7 w-12 rounded bg-gradient-to-br from-[#e4e7eb] to-white shadow-sm" /><b className="block text-xs">Secure Mastercard checkout</b><small className="text-[10px] text-[#929aa8]">Your card details are entered on the secure payment page. We never see them.</small></div>}
                {paymentMessage && <p role="status" className="mt-3 rounded-lg bg-[#f4f6f8] p-3 text-xs text-[#536074]">{paymentMessage}</p>}
                <button type="button" disabled={paymentBusy} onClick={() => void beginPayment()} className={`${primaryButton} mt-4 w-full bg-[#f4b400] text-[#542708] hover:bg-[#e9a900]`}>{paymentBusy ? "Waiting for payment…" : `Pay ${money(order.amount)}`}<ChevronRight className="h-4 w-4" /></button>
                <div className="mt-4 flex items-start gap-2 text-[10px] text-[#929aa8]"><ShieldCheck className="h-4 w-4 shrink-0 text-[#13a999]" />Mock payment only. Nothing is charged. Card details and PINs are never requested on this page.</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between"><button type="button" onClick={() => setPaymentStage("refreshments")} className="inline-flex items-center gap-2 text-xs font-bold text-[#6e7889]"><ArrowLeft className="h-4 w-4" />Back to refreshments</button><button type="button" onClick={() => void api("/rest/booking-management/abandon", { group_ref: order.group_ref }).then(() => { setOrder(null); setStep(0); }).catch((cause) => setError(cause.message))} className="text-[10px] font-bold text-red-600">Abort this booking</button></div>
          </>}
        </section>}
      </main>

      <footer className="bg-[#101827] text-[#9ca6b7]"><div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4"><div><div className="flex items-center gap-2 text-white"><Logo small /></div><p className="mt-3 max-w-[260px] text-xs leading-5">Kenya’s premier passenger rail experience. Comfortable, reliable, and affordable journeys across the country.</p></div>{[["BOOK & TRAVEL", ["Book a Trip", "/premium-booking"], ["One Way", "/premium-booking"], ["Manage Booking", "/booking/manage"], ["Stations", "/stations"], ["Fares", "/fares"], ["Travel Classes", "/fares"]], ["COMPANY", ["About Us", "/about"], ["News & Updates", "/news"], ["Gallery", "/gallery"]], ["SUPPORT", ["FAQ", "/faq"], ["Contact Support", "/contact"], ["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]]].map(([title, ...links]) => <div key={String(title)}><h3 className="mb-3 text-[11px] font-extrabold text-white">{title as string}</h3><div className="space-y-2">{(links as string[][]).map(([text, href]) => <a key={text} href={href} className="block text-xs hover:text-white">{text}</a>)}</div></div>)}</div><div className="border-t border-white/10"><div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-5 py-4 text-[10px]"><span>© 2026 Kenya Railways Corporation. All rights reserved.</span><span className="flex gap-4"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></span></div></div></footer>

      {seatPicker && <div className="fixed inset-0 z-50 grid place-items-center bg-[#101827]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSeatPicker(null); }}><section role="dialog" aria-modal="true" aria-labelledby="seat-modal-title" className={`${card} w-full max-w-md p-5`}><div className="flex items-start justify-between"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-[#8e2333]">Seat selection</span><h2 id="seat-modal-title" className="mt-1 text-lg font-extrabold">Assign seat {seatPicker.seat}</h2><p className="mt-1 text-xs text-[#8992a1]">Choose a passenger for this seat.</p></div><button type="button" onClick={() => setSeatPicker(null)} aria-label="Close" className="rounded-lg p-1 text-[#7c8797]"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-2">{passengers.map((person, passengerIndex) => <button key={passengerIndex} type="button" disabled={person.type === "infant" || (seatPickerOwner !== -1 && seatPickerOwner !== passengerIndex)} onClick={() => void assignSeat(seatPicker.leg, passengerIndex, seatPicker.seat)} className="flex w-full items-center gap-3 rounded-xl border border-[#e5e7eb] p-3 text-left hover:border-[#8e2333] disabled:opacity-45"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2f3f5] text-[10px] font-bold">{initials(person)}</span><span className="flex-1"><b className="block text-xs">{[person.first, person.last].filter(Boolean).join(" ") || `Passenger ${passengerIndex + 1}`}</b><small className="text-[9px] text-[#929aa8]">{passengerNames[person.type]} · {hasSeat(seatPicker.leg, passengerIndex) ? `Current seat ${seatAssignments[seatKey(seatPicker.leg, passengerIndex)]}` : "Choose this seat"}</small></span><ChevronRight className="h-4 w-4 text-[#9aa2b1]" /></button>)}</div></section></div>}

      {seatConfirm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#101827]/45 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" className={`${card} w-full max-w-lg p-5`}><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Confirm Seat Selection</h2><button type="button" onClick={() => setSeatConfirm(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><p className="mt-1 text-xs text-[#8992a1]">Review each traveller’s seat before continuing.</p><div className="mt-4 divide-y divide-[#edf0f3]">{legs.map((leg, legIndex) => <div key={legIndex} className="py-3"><b className="text-xs">{stations.find((station) => String(station.id) === leg.from)?.name} → {stations.find((station) => String(station.id) === leg.to)?.name}</b>{passengers.map((person, passengerIndex) => <p key={passengerIndex} className="mt-2 flex justify-between text-xs"><span>{[person.first, person.last].filter(Boolean).join(" ") || `Passenger ${passengerIndex + 1}`}</span><b>{seatAssignments[seatKey(legIndex, passengerIndex)] || "Infant · no seat"}</b></p>)}</div>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setSeatConfirm(false)} className="rounded-xl border border-[#e1e4e9] px-4 py-2.5 text-xs font-bold">Edit Seats</button><button type="button" onClick={() => void confirmSeats()} className={primaryButton}>Confirm &amp; Continue</button></div></section></div>}

      {bookingConfirm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#101827]/45 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="booking-confirm-title" className={`${card} w-full max-w-lg p-5`}><div className="flex items-start justify-between"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-[#8e2333]">Final check</span><h2 id="booking-confirm-title" className="mt-1 text-lg font-extrabold">Confirm Your Booking</h2></div><button type="button" onClick={() => setBookingConfirm(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><p className="mt-1 text-xs text-[#8992a1]">Please review before we reserve your seats.</p><div className="mt-4 rounded-xl bg-[#f7f8fa] p-4">{legs.map((leg, index) => <div key={index} className="flex justify-between gap-4 border-b border-[#e8eaee] py-2 last:border-0"><span className="text-xs">{stations.find((station) => String(station.id) === leg.from)?.name} → {stations.find((station) => String(station.id) === leg.to)?.name}<small className="mt-1 block text-[10px] text-[#8992a1]">{prettyDate(leg.date)} · {leg.selected?.departure}</small></span><b className="text-xs">{leg.selected?.train_no}</b></div>)}<div className="mt-3 flex justify-between text-xs"><span>{passengers.length} passenger{passengers.length === 1 ? "" : "s"}</span><b className="text-[#8e2333]">{money(priceTotal)}</b></div></div><p className="mt-3 rounded-lg border border-[#f2d789] bg-[#fffbed] p-3 text-[10px] leading-5 text-[#795700]">Once confirmed, your seats are booked and you will proceed to payment. Your booking remains unpaid until checkout is complete.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setBookingConfirm(false)} className="rounded-xl border border-[#e1e4e9] px-4 py-2.5 text-xs font-bold">Back</button><button type="button" disabled={loading} onClick={() => { setBookingConfirm(false); void createBooking(); }} className={primaryButton}>{loading ? "Reserving…" : "Confirm & Book"}</button></div></section></div>}
    </div>
  );
}
