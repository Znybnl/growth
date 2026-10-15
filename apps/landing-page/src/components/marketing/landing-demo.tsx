"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Gift,
  Mail,
  RotateCcw,
  ShieldCheck,
  Star,
} from "lucide-react";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import styles from "./landing-demo.module.css";

const wheelSegments = [
  { label: "Dessert", fill: "#b5bfea", dark: false },
  { label: "Perdu", fill: "#162238", dark: true },
  { label: "Café", fill: "#fffaf1", dark: false },
  { label: "Perdu", fill: "#162238", dark: true },
  { label: "Remise", fill: "#fffaf1", dark: false },
  { label: "Perdu", fill: "#162238", dark: true },
  { label: "Boisson", fill: "#b5bfea", dark: false },
  { label: "Perdu", fill: "#162238", dark: true },
  { label: "Surprise", fill: "#fffaf1", dark: false },
  { label: "Perdu", fill: "#162238", dark: true },
];
const beautyWheelSegments = [
  { label: "Soin", fill: "#edb9c8", dark: false },
  { label: "Perdu", fill: "#3b1936", dark: true },
  { label: "−10 %", fill: "#fff8f2", dark: false },
  { label: "Perdu", fill: "#3b1936", dark: true },
  { label: "Mini soin", fill: "#edb9c8", dark: false },
  { label: "Perdu", fill: "#3b1936", dark: true },
  { label: "15 €", fill: "#fff8f2", dark: false },
  { label: "Perdu", fill: "#3b1936", dark: true },
  { label: "Trousse", fill: "#edb9c8", dark: false },
  { label: "Perdu", fill: "#3b1936", dark: true },
];
const winningSegmentCenterDegrees = 18;
const winningRotationDegrees = 360 - winningSegmentCenterDegrees;
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
const stages = ["Le jeu", "Le gain", "La suite"];
type DemoStep = "intro" | "action" | "spinning" | "form" | "done";

function wheelPoint(degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return `${150 + 146 * Math.cos(radians)},${150 + 146 * Math.sin(radians)}`;
}

export function LandingDemo({
  variant = "restaurant",
}: {
  variant?: "restaurant" | "beauty";
}) {
  const id = useId();
  const [step, setStep] = useState<DemoStep>("intro");
  const [rotation, setRotation] = useState(16);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const previousStep = useRef<DemoStep>("intro");
  const isBeauty = variant === "beauty";
  const segments = isBeauty ? beautyWheelSegments : wheelSegments;
  const businessName = isBeauty ? "L’atelier beauté" : "Le bistro";
  const rewardLabel = isBeauty ? "un soin découverte" : "1 dessert";
  const hasPanel = step === "action" || step === "form" || step === "done";
  const stage = step === "done" ? 2 : step === "form" ? 1 : 0;

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
    setRotation(16);
  }

  function startSpin() {
    if (step === "intro")
      captureMarketingEvent("marketing_demo_started", { variant });
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
    captureMarketingEvent("marketing_demo_completed", { variant });
  }

  return (
    <div className={styles.demo} data-variant={variant}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>
          <span className={styles.liveDot} /> Démo interactive
        </p>
        <h2>À vous de jouer.</h2>
        <p>
          Découvrez le parcours côté client, puis les résultats côté commerce.
        </p>
      </header>
      <div className={styles.workspace}>
        <div className={styles.player}>
          <div className={styles.columnLabel}>
            <span>01</span> Côté client{" "}
            <span className={styles.tryHint}>
              Essayez ici <ArrowRight size={14} aria-hidden="true" />
            </span>
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
                <Star size={17} aria-hidden="true" />
                {businessName}
              </p>
              <div className={styles.stageContent}>
                {hasPanel && (
                  <section
                    className={styles.panel}
                    aria-labelledby={`${id}-panel-title`}
                  >
                    <div className={styles.panelIcon} aria-hidden="true">
                      {step === "action" ? (
                        <Star />
                      ) : step === "form" ? (
                        <Gift />
                      ) : (
                        <Check />
                      )}
                    </div>
                    <p className={styles.panelEyebrow}>
                      {step === "action"
                        ? "Avant de jouer"
                        : step === "form"
                          ? "Bien joué !"
                          : "Et voilà !"}
                    </p>
                    <h3
                      id={`${id}-panel-title`}
                      ref={panelHeading}
                      tabIndex={-1}
                    >
                      {step === "action"
                        ? "Partager votre expérience ?"
                        : step === "form"
                          ? `Bravo, vous avez gagné ${rewardLabel}.`
                          : "Exemple de confirmation du gain."}
                    </h3>
                    {step === "action" ? (
                      <>
                        <p>
                          Un avis reste facultatif, libre et indépendant du jeu.
                          Dans cette démo, aucun avis n’est publié.
                        </p>
                        <button
                          type="button"
                          onClick={startSpin}
                          className={styles.primary}
                        >
                          Simuler le clic vers Google{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={startSpin}
                          className={styles.secondary}
                        >
                          Continuer sans laisser d’avis
                        </button>
                      </>
                    ) : step === "form" ? (
                      <>
                        <p>
                          Exemple de formulaire après un gain. Vous pouvez
                          laisser ces champs vides dans la démo.
                        </p>
                        <div className={styles.fields}>
                          <label>
                            Prénom
                            <input
                              value={firstName}
                              onChange={(event) =>
                                setFirstName(event.target.value)
                              }
                              placeholder="Ex. Camille"
                              aria-label="Prénom de démonstration"
                              autoComplete="off"
                            />
                          </label>
                          <label>
                            E-mail
                            <input
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="Ex. camille@exemple.fr"
                              aria-label="E-mail de démonstration"
                              type="email"
                              autoComplete="off"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={complete}
                          className={styles.primary}
                        >
                          Simuler la confirmation{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={styles.reward}>
                          <Gift size={20} aria-hidden="true" />
                          <span>
                            {rewardLabel}
                            <small>Gain fictif · démonstration</small>
                          </span>
                        </div>
                        <p>
                          Dans une campagne réelle, le joueur reçoit ses
                          informations de retrait. Aucun e-mail n’est envoyé
                          ici.
                        </p>
                        <p className={styles.receipt}>
                          <Mail size={16} aria-hidden="true" />
                          Vous avez terminé le parcours client.
                        </p>
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
                    {isBeauty ? "Prenez soin de vous." : "Jouez et gagnez."}
                  </p>
                  <p className={styles.gameHint}>
                    Un tour de roue, une surprise à découvrir.
                  </p>
                  <div className={styles.wheel}>
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
                        {segments.map((segment, index) => (
                          <g key={index}>
                            <path
                              d={`M150,150 L${wheelPoint(index * 36)} A146,146 0 0 1 ${wheelPoint((index + 1) * 36)} Z`}
                              fill={segment.fill}
                              stroke="#ffffff"
                              strokeWidth="1"
                            />
                            <text
                              x="150"
                              y="51"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${index * 36 + winningSegmentCenterDegrees} 150 150)`}
                              fill={segment.dark ? "#ffffff" : "#162238"}
                              fontSize="12"
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
                    <span
                      className={styles.pointer}
                      data-testid="demo-pointer"
                      aria-hidden="true"
                    />
                    <button
                      ref={playButton}
                      type="button"
                      onClick={() => setStep("action")}
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
                        <>
                          Jouer
                          <ArrowRight size={16} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                  <p className={styles.wheelHint}>
                    {step === "spinning"
                      ? "La roue tourne…"
                      : "Appuyez sur Jouer pour commencer."}
                  </p>
                </div>
              </div>
              <p className={styles.screenFooter}>
                <ShieldCheck size={13} aria-hidden="true" /> Démonstration ·
                aucun lot réel
              </p>
            </div>
          </div>
          <p className={styles.srOnly} role="status">
            {step === "spinning"
              ? "La roue tourne…"
              : `Étape ${stage + 1} sur 3 : ${stages[stage]}`}
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
              Distinguez les scans, les parties jouées et les contacts
              collectés.
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
      <p className={styles.disclaimer}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          Démonstration simplifiée : aucun lot réel, aucune coordonnée
          transmise, aucun e-mail envoyé.
        </span>
      </p>
    </div>
  );
}
