"use client";

export type Emotion = "normal" | "listening" | "worried" | "crisis";

const RING_DARK = "#0e8b6b";
const FEATURE = "#ffffff";
const IRIS = "#0e8b6b";

const TRANSITION = "transform 300ms ease, opacity 300ms ease";

interface EmotionConfig {
  /** grados de inclinación de las cejas; negativo = levantadas */
  eyebrowAngle: number;
  /** escala del ojo (esclerótica) completo */
  eyeScale: number;
  /** escala de la pupila dentro del ojo (dilatación) */
  pupilScale: number;
  mouth: "smile" | "line" | "o";
}

const EMOTION_CONFIG: Record<Emotion, EmotionConfig> = {
  normal: { eyebrowAngle: 0, eyeScale: 1, pupilScale: 1, mouth: "smile" },
  listening: { eyebrowAngle: -8, eyeScale: 1.12, pupilScale: 1.15, mouth: "line" },
  worried: { eyebrowAngle: -15, eyeScale: 1.18, pupilScale: 1.3, mouth: "line" },
  crisis: { eyebrowAngle: -25, eyeScale: 1.28, pupilScale: 1.55, mouth: "o" },
};

function Eyebrow({
  cx,
  cy,
  angle,
  mirror,
}: {
  cx: number;
  cy: number;
  angle: number;
  mirror?: boolean;
}) {
  const finalAngle = mirror ? -angle : angle;
  return (
    <g
      style={{
        transform: `rotate(${finalAngle}deg)`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: TRANSITION,
      }}
    >
      <line
        x1={cx - 7}
        y1={cy}
        x2={cx + 7}
        y2={cy}
        stroke={FEATURE}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

function Eye({
  cx,
  cy,
  eyeScale,
  pupilScale,
}: {
  cx: number;
  cy: number;
  eyeScale: number;
  pupilScale: number;
}) {
  return (
    <g
      style={{
        transform: `scale(${eyeScale})`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: TRANSITION,
      }}
    >
      <circle cx={cx} cy={cy} r={9} fill="#ffffff" stroke={FEATURE} strokeWidth={2} />
      <g
        style={{
          transform: `scale(${pupilScale})`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: TRANSITION,
        }}
      >
        <circle cx={cx} cy={cy} r={4} fill={IRIS} />
      </g>
    </g>
  );
}

function Mouth({ mouth }: { mouth: EmotionConfig["mouth"] }) {
  return (
    <g>
      {/* normal: arco de sonrisa */}
      <path
        d="M 38 66 Q 50 76 62 66"
        fill="none"
        stroke={FEATURE}
        strokeWidth={3}
        strokeLinecap="round"
        style={{
          opacity: mouth === "smile" ? 1 : 0,
          transform: mouth === "smile" ? "scale(1)" : "scale(0.85)",
          transformOrigin: "50px 69px",
          transition: TRANSITION,
        }}
      />
      {/* listening / worried: línea recta horizontal */}
      <path
        d="M 40 68 L 60 68"
        fill="none"
        stroke={FEATURE}
        strokeWidth={3}
        strokeLinecap="round"
        style={{
          opacity: mouth === "line" ? 1 : 0,
          transform: mouth === "line" ? "scale(1)" : "scale(0.85)",
          transformOrigin: "50px 68px",
          transition: TRANSITION,
        }}
      />
      {/* crisis: "O" de preocupación, boca dilatada */}
      <circle
        cx={50}
        cy={69}
        r={6}
        fill="none"
        stroke={FEATURE}
        strokeWidth={3}
        style={{
          opacity: mouth === "o" ? 1 : 0,
          transform: mouth === "o" ? "scale(1)" : "scale(0.6)",
          transformOrigin: "50px 69px",
          transition: TRANSITION,
        }}
      />
    </g>
  );
}

interface OFaceProps {
  emotion?: Emotion;
  size?: number;
  className?: string;
  /** aplica la animación de respiración (para el hero) */
  breathing?: boolean;
}

export default function OFace({
  emotion = "normal",
  size = 40,
  className,
  breathing = false,
}: OFaceProps) {
  const config = EMOTION_CONFIG[emotion];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${breathing ? "animate-breathe" : ""} ${className ?? ""}`}
      role="img"
      aria-label={`O — estado: ${emotion}`}
    >
      <defs>
        <radialGradient id="o-gradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#2fc492" />
          <stop offset="100%" stopColor={RING_DARK} />
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={47} fill="url(#o-gradient)" stroke={RING_DARK} strokeWidth={1} />
      <Eyebrow cx={34} cy={30} angle={config.eyebrowAngle} />
      <Eyebrow cx={66} cy={30} angle={config.eyebrowAngle} mirror />
      <Eye cx={34} cy={42} eyeScale={config.eyeScale} pupilScale={config.pupilScale} />
      <Eye cx={66} cy={42} eyeScale={config.eyeScale} pupilScale={config.pupilScale} />
      <Mouth mouth={config.mouth} />
    </svg>
  );
}
