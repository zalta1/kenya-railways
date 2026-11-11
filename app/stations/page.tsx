const stations = [
  { name: "Nairobi Terminus", image: "/images/stations/nairobi-terminus.png" },
  { name: "Mtito Andei Station", image: "/images/stations/mtito-andei.png" },
  { name: "Mombasa Terminus", image: "/images/stations/mombasa-terminus.png" },
  { name: "Voi Station", image: "/images/stations/voi.png" },
  { name: "Athi River Station", image: "/images/stations/athi-river.png" },
  { name: "Emali Station", image: "/images/stations/emali.png" },
  { name: "Mariakani Station", image: "/images/stations/mariakani.png" },
  { name: "Miasenyi Station", image: "/images/stations/miasenyi.png" },
  { name: "Kibwezi Station", image: "/images/stations/kibwezi.png" },
];

export default function StationsPage() {
  return (
    <main className="min-h-screen border-t border-[#8e2333] bg-white pb-12 pt-10 text-[#172033]">
      <section aria-labelledby="stations-heading" className="mx-auto max-w-[1204px] px-5">
        <h1 id="stations-heading" className="mb-4 text-[19px] font-medium leading-6 text-[#ed3e1c]">
          Stations
        </h1>
        <div className="grid grid-cols-1 gap-x-[30px] gap-y-[30px] sm:grid-cols-2 lg:grid-cols-4">
          {stations.map((station) => (
            <article key={station.name} className="overflow-hidden bg-[#f7f7f7] text-center">
              <img
                src={station.image}
                alt={`${station.name}, Kenya`}
                loading="lazy"
                className="aspect-[3/2] w-full object-cover"
              />
              <div className="flex min-h-[55px] flex-col items-center justify-center px-2 py-2">
                <h2 className="text-[15px] font-medium leading-5 tracking-[.025em]">{station.name}</h2>
                <p className="mt-0.5 text-[8px] leading-3 tracking-[.12em] text-[#7d8795]">KENYA</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
