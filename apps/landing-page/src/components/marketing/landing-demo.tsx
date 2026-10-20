"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Gift,
  Mail,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { beautyDemoRewards, type BeautyDemoSpecialty, type DemoSector } from "@/lib/demo-examples";
import { DemoScratchCard } from "./demo-scratch-card";
import {
  DemoMailPreview,
  DemoRedemption,
  DemoReview,
} from "./demo-story-panels";
import styles from "./landing-demo.module.css";

const wheelSegments = [
  { label: "Dessert", dark: false },
  { label: "Perdu", dark: true },
  { label: "Café", dark: false },
  { label: "Perdu", dark: true },
  { label: "Remise", dark: false },
  { label: "Perdu", dark: true },
  { label: "Boisson", dark: false },
  { label: "Perdu", dark: true },
];
const beautyWheelSegments = [
  { label: "Soin", dark: false },
  { label: "Perdu", dark: true },
  { label: "−10 %", dark: false },
  { label: "Perdu", dark: true },
  { label: "Mini soin", dark: false },
  { label: "Perdu", dark: true },
  { label: "Trousse", dark: false },
  { label: "Perdu", dark: true },
];
const demoChartData = [
  { day: "Lun.", scans: 22, leads: 7 },
  { day: "Mar.", scans: 34, leads: 11 },
  { day: "Mer.", scans: 29, leads: 9 },
  { day: "Jeu.", scans: 48, leads: 17 },
  { day: "Ven.", scans: 61, leads: 23 },
  { day: "Sam.", scans: 74, leads: 31 },
  { day: "Dim.", scans: 52, leads: 19 },
];
const kpis = [
  { label: "Scans", value: "320" },
  { label: "Participations", value: "224" },
  { label: "Contacts collectés", value: "117" },
  { label: "Conversion parties / scans", value: "70 %" },
];
const stages = ["Jouer", "Recevoir", "E-mail"];
type DemoStep =
  | "intro"
  | "action"
  | "google"
  | "spinning"
  | "scratching"
  | "form"
  | "done"
  | "mail";
const panelTitles: Partial<Record<DemoStep, string>> = {
  action: "Avant de jouer",
  google: "Votre avis sur Google",
  done: "Votre gain est confirmé !",
  mail: "Votre e-mail de gain",
};

function wheelPoint(degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return `${150 + 146 * Math.cos(radians)},${150 + 146 * Math.sin(radians)}`;
}

export function LandingDemo({
  variant = "restaurant",
  specialty,
  hideHeading = false,
}: {
  variant?: DemoSector;
  specialty?: BeautyDemoSpecialty;
  hideHeading?: boolean;
}) {
  const id = useId();
  const [step, setStep] = useState<DemoStep>("intro");
  const [rotation, setRotation] = useState(16);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const previousStep = useRef<DemoStep>("intro");
  const isBeauty = variant === "beauty";
  const isRetail = variant === "retail";
  const beautyReward = isBeauty && specialty ? beautyDemoRewards[specialty] : undefined;
  const segments = isBeauty
    ? beautyWheelSegments.map((segment, index) => beautyReward && !segment.dark
      ? { ...segment, label: index === 0 ? beautyReward.wheelLabel : beautyReward.otherLabels[index / 2 - 1] }
      : segment)
    : wheelSegments;
  const segmentDegrees = 360 / segments.length;
  const winningSegmentCenterDegrees = segmentDegrees / 2;
  const winningRotationDegrees = 360 - winningSegmentCenterDegrees;
  const businessName = isRetail ? "La petite boutique" : isBeauty ? "L’atelier beauté" : "Le bistro";
  const rewardLabel = isRetail ? "un produit découverte" : isBeauty ? beautyReward?.reward ?? "un soin découverte" : "1 dessert";
  const hasPanel = step !== "intro" && step !== "spinning" && step !== "scratching";
  const stage =
    step === "done" || step === "mail" ? 2 : step === "form" ? 1 : 0;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (hasPanel) panelHeading.current?.focus({ preventScroll: true });
    if (step === "intro" && previousStep.current !== "intro")
      playButton.current?.focus({ preventScroll: true });
    previousStep.current = step;
  }, [step, hasPanel]);

  function resetDemo() {
    if (timer.current) clearTimeout(timer.current);
    setStep("intro");
    setFirstName("");
    setEmail("");
    setRating(0);
    setRotation(16);
  }

  function beginDemo() {
    captureMarketingEvent("marketing_demo_started", { variant, specialty });
    setStep("action");
  }

  function startSpin() {
    if (isRetail) { setStep("scratching"); return; }
    setStep("spinning");
    setRotation((value) => {
      const normalized = ((value % 360) + 360) % 360;
      return (
        value + 4 * 360 + ((winningRotationDegrees - normalized + 360) % 360)
      );
    });
    if (timer.current) clearTimeout(timer.current);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    timer.current = setTimeout(
      () => setStep("form"),
      reducedMotion ? 100 : 2100,
    );
  }

  function complete() {
    setStep("done");
    captureMarketingEvent("marketing_demo_completed", { variant, specialty });
  }

  return (
    <div className={styles.demo} data-variant={variant}>
      {!hideHeading && <header className={styles.heading}>
        <p className={styles.eyebrow}>
          <span className={styles.liveDot} /> Démo interactive
        </p>
        <h2>À vous de jouer.</h2>
        <p>
          Découvrez le parcours de vos clients, du jeu à l’e-mail de gain.
        </p>
      </header>}
      <div className={styles.workspace}>
        <div className={styles.player}>
          <div className={styles.columnLabel}>
            <span>01</span> Côté client{" "}
          </div>
          <ol
            className={styles.progress}
            aria-label="Étapes de la démonstration"
          >
            {stages.map((label, index) => (
              <li
                key={label}
                aria-current={stage === index ? "step" : undefined}
                data-complete={stage > index}
              >
                <span>
                  {stage > index ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <div className={styles.phone} data-testid="demo-phone">
            <div className={styles.phoneTop} aria-hidden="true">
              <span>9:41</span>
              <span className={styles.speaker} />
              <span>•••</span>
            </div>
            <div className={styles.screen}>
              <p className={styles.business}>
                <span
                  className={styles.businessMark}
                  data-testid="demo-business-mark"
                  aria-hidden="true"
                >
                  {isRetail ? "pb" : isBeauty ? "ab" : "lb"}
                </span>
                <span>
                  {businessName}
                  <small>
                    {isRetail ? "Boutique & cadeaux" : isBeauty ? "Institut de beauté" : "Café · restaurant"}
                  </small>
                </span>
              </p>
              <span className={styles.businessRule} aria-hidden="true" />
              <div className={styles.stageContent}>
                {hasPanel && (
                  <section
                    className={styles.panel}
                    data-step={step}
                    aria-labelledby={`${id}-panel-title`}
                  >
                    <div className={styles.panelIcon} aria-hidden="true">
                      {step === "action" || step === "google" ? (
                        <MessageSquare />
                      ) : step === "form" ? (
                        <Gift />
                      ) : step === "done" ? (
                        <Check />
                      ) : (
                        <Mail />
                      )}
                    </div>
                    <h3
                      id={`${id}-panel-title`}
                      ref={panelHeading}
                      tabIndex={-1}
                    >
                      {step === "form" ? (
                        <>
                          Félicitations ! Vous avez remporté
                          <span className={styles.prizeLabel}>
                            « {rewardLabel} »
                          </span>
                        </>
                      ) : (
                        panelTitles[step]
                      )}
                    </h3>
                    {step === "action" ? (
                      <>
                        <p>
                          Découvrez notre établissement sur Google, puis revenez
                          ici pour jouer.
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep("google")}
                          className={styles.primary}
                        >
                          Écrire un avis{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={startSpin}
                          className={styles.secondary}
                        >
                          Jouer maintenant
                        </button>
                      </>
                    ) : step === "google" ? (
                      <DemoReview
                        rating={rating}
                        onRatingChange={setRating}
                        onContinue={startSpin}
                      />
                    ) : step === "mail" ? (
                      <DemoMailPreview
                        businessName={businessName}
                        rewardLabel={rewardLabel}
                        beauty={isBeauty}
                        onBack={() => setStep("done")}
                      />
                    ) : step === "form" ? (
                      <>
                        <p>
                          Vos informations sont nécessaires pour valider et
                          envoyer votre gain.
                        </p>
                        <div className={styles.fields}>
                          <label>
                            <span className={styles.srOnly}>Prénom</span>
                            <input
                              value={firstName}
                              onChange={(event) =>
                                setFirstName(event.target.value)
                              }
                              placeholder="Prénom"
                              aria-label="Prénom de démonstration"
                              autoComplete="off"
                            />
                          </label>
                          <label>
                            <span className={styles.srOnly}>E-mail</span>
                            <input
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="E-mail"
                              aria-label="E-mail de démonstration"
                              type="email"
                              autoComplete="off"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={complete}
                          className={`${styles.primary} ${styles.receive}`}
                        >
                          Recevoir mon gain
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={styles.reward}>
                          <Gift size={20} aria-hidden="true" />
                          <span>{rewardLabel}</span>
                        </div>
                        <p>
                          Vous allez recevoir votre gain par e-mail (vérifiez
                          vos spams).
                        </p>
                        <DemoRedemption beauty={isBeauty} />
                        <button
                          type="button"
                          onClick={() => setStep("mail")}
                          className={styles.secondary}
                        >
                          Voir l’e-mail{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </section>
                )}
                <div
                  className={styles.game}
                  data-hidden={hasPanel}
                  inert={hasPanel}
                  aria-hidden={hasPanel || undefined}
                >
                  <p className={styles.gameTitle}>
                    {isRetail ? <>Une surprise<br />vous attend.</> : isBeauty ? <>Prenez soin<br />de vous.</> : <>Jouez<br />et gagnez.</>}
                  </p>
                  <p className={styles.gameHint}>
                    {isRetail ? "Découvrez votre cadeau." : "Un tour de roue, une surprise à découvrir."}
                  </p>
                  {isRetail ? step === "scratching" ? <DemoScratchCard onReveal={() => setStep("form")} /> : <div className={styles.scratchGame}>
                    <button ref={playButton} type="button" onClick={beginDemo} className={styles.scratchStart} aria-label="Jouer"><Gift size={54} strokeWidth={1.2} aria-hidden="true" /><span>Jouer</span></button>
                  </div> : <div className={styles.wheel}>
                    <div className={styles.wheelFrame} aria-hidden="true" />
                    <div
                      className={styles.rotor}
                      data-testid="demo-wheel"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transitionDuration:
                          step === "spinning" ? "1650ms" : "0ms",
                      }}
                    >
                      <svg viewBox="0 0 300 300" aria-hidden="true">
                        <defs>
                          <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1">
                            <stop stopColor={isBeauty ? "#fff9f5" : "#fffdf5"} />
                            <stop offset="1" stopColor={isBeauty ? "#f2d6dc" : "#e7d0a9"} />
                          </linearGradient>
                          <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="1" y2="1">
                            <stop stopColor={isBeauty ? "#ad6078" : "#916337"} />
                            <stop offset="1" stopColor={isBeauty ? "#62304a" : "#49351e"} />
                          </linearGradient>
                        </defs>
                        {segments.map((segment, index) => (
                          <g key={index}>
                            <path
                              d={`M150,150 L${wheelPoint(index * segmentDegrees)} A146,146 0 0 1 ${wheelPoint((index + 1) * segmentDegrees)} Z`}
                              fill={`url(#${id}-${segment.dark ? "dark" : "light"})`}
                              stroke="#fff9ef"
                              strokeWidth="1.5"
                            />
                            <text
                              x="150"
                              y="51"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${index * segmentDegrees + winningSegmentCenterDegrees} 150 150)`}
                              fill={segment.dark ? "#ffffff" : isBeauty ? "#512d3b" : "#49351e"}
                              fontSize="14"
                              fontWeight="700"
                            >
                              {segment.label}
                            </text>
                          </g>
                        ))}
                        <circle
                          cx="150"
                          cy="150"
                          r="147"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="6"
                        />
                      </svg>
                    </div>
                    <svg
                      className={styles.pointer}
                      data-testid="demo-pointer"
                      aria-hidden="true"
                      viewBox="0 0 32 42"
                    >
                      <path d="M5 3 Q2 3 3 7 L13 36 Q16 42 19 36 L29 7 Q30 3 27 3 Z" fill="currentColor" stroke="#fffaf2" strokeWidth="3" strokeLinejoin="round" />
                    </svg>
                    <button
                      ref={playButton}
                      type="button"
                      onClick={beginDemo}
                      disabled={step === "spinning"}
                      className={styles.play}
                      aria-label={
                        step === "spinning"
                          ? "Roue en cours de rotation"
                          : "Jouer"
                      }
                    >
                      {step === "spinning" ? (
                        <span className={styles.spinner} aria-hidden="true" />
                      ) : (
                        "Jouer"
                      )}
                    </button>
                  </div>}
                  <p className={styles.wheelHint}>
                    {step === "spinning" ? "La roue tourne…" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.disclaimer} data-testid="demo-disclaimer">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Démo : aucun lot réel, avis publié ou e-mail envoyé.
            </span>
          </p>
          <p className={styles.srOnly} role="status">
            {step === "spinning"
              ? "La roue tourne…"
              : `Étape ${stage + 1} sur 3 : ${panelTitles[step] ?? stages[stage]}`}
          </p>
          <button type="button" onClick={resetDemo} className={styles.reset}>
            <RotateCcw size={15} aria-hidden="true" />
            Redémarrer la démo
          </button>
        </div>
        <div className={styles.merchant}>
          <div className={styles.columnLabel}>
            <span>02</span> Côté commerce{" "}
            <span className={styles.example}>Exemple fictif</span>
          </div>
          <div className={styles.resultsHeading}>
            <p className={styles.eyebrow}>Vos résultats, en un regard</p>
            <h3>
              Du passage en boutique
              <br />
              aux prochaines visites.
            </h3>
            <p>
              Repérez les cadeaux à suivre et les lots à ajuster. Scans,
              parties jouées et retraits restent des événements différents.
            </p>
          </div>
          <dl className={styles.kpis}>
            {kpis.map((kpi) => (
              <div key={kpi.label}>
                <dt>{kpi.label}</dt>
                <dd>{kpi.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.chart}>
            <div className={styles.chartHeading}>
              <div>
                <h4>Scans et contacts sur 7 jours</h4>
                <p>Courbe de démonstration</p>
              </div>
              <span>7 jours</span>
            </div>
            <div className={styles.legend} aria-hidden="true">
              <span>
                <i />
                Scans
              </span>
              <span>
                <i />
                Contacts
              </span>
            </div>
            <div
              className={styles.bars}
              role="img"
              aria-label="Exemple fictif sur 7 jours : 320 scans et 117 contacts collectés. Chaque paire de barres représente un jour."
            >
              {demoChartData.map((day) => (
                <div key={day.day} className={styles.day}>
                  <div>
                    <span
                      title={`${day.scans} scans`}
                      style={{ height: `${(day.scans / 80) * 100}%` }}
                    />
                    <span
                      title={`${day.leads} contacts`}
                      style={{ height: `${(day.leads / 80) * 100}%` }}
                    />
                  </div>
                  <span>{day.day}</span>
                </div>
              ))}
            </div>
          </div>
          <p className={styles.resultsNote}>
            Données illustratives, pas une promesse de résultats. La conversion
            correspond aux participations divisées par les scans.
          </p>
        </div>
      </div>
    </div>
  );
}
