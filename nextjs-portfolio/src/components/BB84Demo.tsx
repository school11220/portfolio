"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Basis = "+" | "×";
type Round = {
  aliceBit: number;
  aliceBasis: Basis;
  eveBasis: Basis | null;
  eveBit: number | null;
  bobBasis: Basis;
  bobBit: number;
  kept: boolean;
};

const randomBit = (random: () => number) => Math.round(random());
const randomBasis = (random: () => number): Basis => (randomBit(random) ? "×" : "+");

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function createRounds(count: number, evePresent: boolean, random: () => number = Math.random): Round[] {
  return Array.from({ length: count }, () => {
    const aliceBit = randomBit(random);
    const aliceBasis = randomBasis(random);
    const bobBasis = randomBasis(random);
    const eveBasis = evePresent ? randomBasis(random) : null;

    // Measuring in the wrong basis gives Eve a random result and disturbs the state.
    const eveBit = evePresent
      ? (eveBasis === aliceBasis ? aliceBit : randomBit(random))
      : null;
    const bobBit = bobBasis === (evePresent ? eveBasis : aliceBasis)
      ? (evePresent ? eveBit! : aliceBit)
      : randomBit(random);

    return {
      aliceBit,
      aliceBasis,
      eveBasis,
      eveBit,
      bobBasis,
      bobBit,
      kept: aliceBasis === bobBasis,
    };
  });
}

export default function BB84Demo() {
  const [isOpen, setIsOpen] = useState(false);
  const [evePresent, setEvePresent] = useState(false);
  const [rounds, setRounds] = useState<Round[]>(() => createRounds(12, false, createSeededRandom(84)));
  const sifted = rounds.filter((round) => round.kept);
  const errors = sifted.filter((round) => round.aliceBit !== round.bobBit).length;
  const qber = sifted.length ? Math.round((errors / sifted.length) * 100) : 0;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
    <button className="bb84-demo-link" type="button" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
      -&gt; interactive demo
    </button>
    {isOpen && createPortal(<div className="bb84-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
    <section className="bb84-demo" id="bb84-demo" role="dialog" aria-modal="true" aria-labelledby="bb84-title">
      <div className="bb84-modal-top"><span>BB84 / INTERACTIVE SIMULATION</span><button type="button" aria-label="Close BB84 demo" onClick={() => setIsOpen(false)}>×</button></div>
      <div className="bb84-heading">
        <div><div className="section-kicker">&gt; interactive project demo</div>
          <h3 id="bb84-title">BB84 key exchange <span>{"// Alice · Bob · Eve"}</span></h3>
          <p>Watch Alice send quantum bits, Bob measure them, then compare bases to build a shared key. Turn Eve on to see how intercepting and resending can introduce detectable errors.</p>
        </div>
        <div className="bb84-controls">
          <label className="eve-toggle"><input type="checkbox" checked={evePresent} onChange={(event) => setEvePresent(event.target.checked)} /> Eve intercepts</label>
          <button className="demo-button" onClick={() => setRounds(createRounds(12, evePresent))}>↻ Run exchange</button>
        </div>
      </div>

      <video className="bb84-art" src="/videos/bb84-exchange.mp4" poster="/images/bb84-exchange.png" aria-label="Animated BB84 photon exchange between Alice, Eve, and Bob" autoPlay loop muted playsInline controls preload="metadata" />

      <div className="bb84-flow" aria-label="Key exchange participants">
        <div><strong>Alice</strong><span>prepares bits + bases</span></div><i aria-hidden="true">→</i>
        {evePresent && <><div className="eve-node"><strong>Eve</strong><span>measures + resends</span></div><i aria-hidden="true">→</i></>}
        <div><strong>Bob</strong><span>measures with random bases</span></div>
        <i aria-hidden="true">⇄</i><div><strong>Public channel</strong><span>compare bases, keep matches</span></div>
      </div>

      <div className="bb84-table-wrap">
        <table className="bb84-table">
          <thead><tr><th>Round</th><th>Alice bit</th><th>Alice basis</th>{evePresent && <><th>Eve basis</th><th>Eve bit</th></>}<th>Bob basis</th><th>Bob bit</th><th>Result</th></tr></thead>
          <tbody>{rounds.map((round, index) => <tr key={index}>
            <td>{String(index + 1).padStart(2, "0")}</td><td>{round.aliceBit}</td><td>{round.aliceBasis}</td>
            {evePresent && <><td>{round.eveBasis}</td><td>{round.eveBit}</td></>}
            <td>{round.bobBasis}</td><td className={round.kept && round.aliceBit !== round.bobBit ? "bit-error" : ""}>{round.bobBit}</td>
            <td><span className={round.kept ? "kept-pill" : "discarded-pill"}>{round.kept ? (round.aliceBit === round.bobBit ? "kept" : "error") : "discarded"}</span></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="bb84-results">
        <div><span>Sifted key</span><strong>{sifted.map((round) => round.aliceBit).join(" ") || "—"}</strong><small>{sifted.length} matching bases</small></div>
        <div><span>Detected errors</span><strong>{errors} / {sifted.length}</strong><small>QBER: {qber}%</small></div>
        <p>{evePresent
          ? "In a real protocol, Alice and Bob compare a sample of their sifted bits. A high error rate warns them to discard the key. This toy simulation demonstrates the idea; it does not perform quantum communication or cryptography."
          : "Only matching bases survive sifting. Enable Eve and run another exchange to see how an intercept-resend measurement can disturb the shared key."}</p>
      </div>
    </section>
    </div>, document.body)}
    </>
  );
}
