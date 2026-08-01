'use client';

import { useState } from 'react';

export interface GottmanScores {
  critica: number;
  desprecio: number;
  defensividad: number;
  obstruccionismo: number;
}

export interface GottmanResultado {
  scoresA: GottmanScores;
  scoresB?: GottmanScores;
  comparado: boolean;
}

interface EjercicioGottmanProps {
  onResultado?: (resultado: GottmanResultado) => void;
  onClose?: () => void;
}

// Inventario Gottman — Los 4 Jinetes del Apocalipsis (Crítica, Desprecio,
// Defensividad, Obstruccionismo). 16 preguntas fijas, 4 por variable.
// Escala Likert 1-5 (Nunca..Siempre) -> score por variable 4-20.
const PREGUNTAS: { texto: string; variable: keyof GottmanScores }[] = [
  { texto: 'Critico a mi pareja por sus defectos personales', variable: 'critica' },
  { texto: "Uso palabras como 'siempre' o 'nunca' cuando reclamo", variable: 'critica' },
  { texto: 'Ataco quién es mi pareja, no lo que hace', variable: 'critica' },
  { texto: 'Cuando discutimos, le señalo sus errores de carácter', variable: 'critica' },

  { texto: 'Me burlo o hago chistes a costa de mi pareja', variable: 'desprecio' },
  { texto: 'Siento que mi pareja no me merece', variable: 'desprecio' },
  { texto: 'Menosprecio las opiniones de mi pareja', variable: 'desprecio' },
  { texto: 'Expreso mi desagrado hacia mi pareja con gestos o tonos', variable: 'desprecio' },

  { texto: 'Cuando mi pareja me critica, inmediatamente me defiendo', variable: 'defensividad' },
  { texto: 'Culpo a mi pareja en lugar de reconocer mi parte', variable: 'defensividad' },
  { texto: 'No reconozco mis errores en los conflictos', variable: 'defensividad' },
  { texto: 'Me pongo a la defensiva sin escuchar primero', variable: 'defensividad' },

  { texto: 'Me cierro en mí mismo cuando hay conflicto', variable: 'obstruccionismo' },
  { texto: 'Cambio de tema cuando surge un problema', variable: 'obstruccionismo' },
  { texto: 'Evito hablar sobre cosas difíciles', variable: 'obstruccionismo' },
  { texto: 'Me retiro emocionalmente en momentos de tensión', variable: 'obstruccionismo' },
];

const OPCIONES = [
  { valor: 5, etiqueta: 'Siempre' },
  { valor: 4, etiqueta: 'Frecuentemente' },
  { valor: 3, etiqueta: 'A veces' },
  { valor: 2, etiqueta: 'Rara vez' },
  { valor: 1, etiqueta: 'Nunca' },
];

const VARIABLES: { key: keyof GottmanScores; label: string }[] = [
  { key: 'critica', label: 'Crítica' },
  { key: 'desprecio', label: 'Desprecio' },
  { key: 'defensividad', label: 'Defensividad' },
  { key: 'obstruccionismo', label: 'Obstruccionismo' },
];

function nivelDe(score: number): { nivel: string; color: string } {
  if (score <= 8) return { nivel: 'Saludable', color: '#66BB6A' };
  if (score <= 13) return { nivel: 'Moderado', color: '#FDD835' };
  return { nivel: 'Crítico', color: '#EF5350' };
}

function calcularScores(respuestas: number[]): GottmanScores {
  const scores: GottmanScores = { critica: 0, desprecio: 0, defensividad: 0, obstruccionismo: 0 };
  respuestas.forEach((valor, i) => {
    scores[PREGUNTAS[i].variable] += valor;
  });
  return scores;
}

function Barra({ label, score }: { label: string; score: number }) {
  const { nivel, color } = nivelDe(score);
  const pct = Math.min(100, (score / 20) * 100);
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, color: '#333' }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>
          {score} ({nivel})
        </span>
      </div>
      <div style={{ width: '100%', height: '14px', background: '#ececec', borderRadius: '7px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '7px', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function MiniBarra({ sublabel, score }: { sublabel: string; score: number }) {
  const { nivel, color } = nivelDe(score);
  const pct = Math.min(100, (score / 20) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <span style={{ width: '52px', fontSize: '12px', color: '#666', flexShrink: 0 }}>{sublabel}</span>
      <div style={{ flex: 1, height: '12px', background: '#ececec', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color, width: '92px', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {score} ({nivel})
      </span>
    </div>
  );
}

function BarraDoble({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>{label}</div>
      <MiniBarra sublabel="Tú" score={scoreA} />
      <MiniBarra sublabel="Pareja" score={scoreB} />
    </div>
  );
}

type Vista = 'preguntas' | 'resultado-a' | 'transicion-b' | 'resultado-comparado';

export default function EjercicioGottman({ onResultado, onClose }: EjercicioGottmanProps) {
  const [fase, setFase] = useState<'A' | 'B'>('A');
  const [respuestasA, setRespuestasA] = useState<number[]>([]);
  const [respuestasB, setRespuestasB] = useState<number[]>([]);
  const [vista, setVista] = useState<Vista>('preguntas');

  const respuestasActuales = fase === 'A' ? respuestasA : respuestasB;
  const preguntaActual = respuestasActuales.length;
  const scoresA = calcularScores(respuestasA);
  const scoresB = calcularScores(respuestasB);

  function volverAlChat() {
    if (onClose) onClose();
  }

  function responder(valor: number) {
    if (fase === 'A') {
      const nuevas = [...respuestasA, valor];
      setRespuestasA(nuevas);
      if (nuevas.length >= PREGUNTAS.length) setVista('resultado-a');
    } else {
      const nuevas = [...respuestasB, valor];
      setRespuestasB(nuevas);
      if (nuevas.length >= PREGUNTAS.length) setVista('resultado-comparado');
    }
  }

  function elegirSoloMios() {
    if (onResultado) onResultado({ scoresA, comparado: false });
  }

  function elegirAplicarPareja() {
    setVista('transicion-b');
  }

  function comenzarFaseB() {
    setFase('B');
    setVista('preguntas');
  }

  function finalizarComparado() {
    if (onResultado) onResultado({ scoresA, scoresB, comparado: true });
  }

  return (
    <div style={{ textAlign: 'center', maxWidth: '100%', margin: '0', padding: '1rem', position: 'relative', minHeight: '100vh', overflow: 'auto' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <button
        onClick={volverAlChat}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '22px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
        }}
      >
        ✕
      </button>

      <div style={{ fontSize: '24px', fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>
        Inventario Gottman
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
        Los 4 Jinetes del conflicto en pareja
      </div>

      {vista === 'preguntas' && (
        <div style={{ maxWidth: '420px', margin: '0 auto', animation: 'fadeIn 0.4s ease-in' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.75rem' }}>
            {fase === 'B' && <span style={{ fontWeight: 600, color: '#1D9E75' }}>Tu pareja · </span>}
            Pregunta {preguntaActual + 1} de {PREGUNTAS.length}
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div
              style={{
                height: '100%',
                background: '#1D9E75',
                width: `${(preguntaActual / PREGUNTAS.length) * 100}%`,
                transition: 'width 0.3s',
                borderRadius: '3px',
              }}
            />
          </div>

          <div style={{ fontSize: '17px', fontWeight: 500, color: '#333', marginBottom: '1.5rem', lineHeight: 1.4 }}>
            {PREGUNTAS[preguntaActual].texto}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {OPCIONES.map((op) => (
              <button
                key={op.valor}
                onClick={() => responder(op.valor)}
                style={{
                  background: 'white',
                  border: '2px solid #1D9E75',
                  color: '#1a4d4d',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      {vista === 'resultado-a' && (
        <div style={{ maxWidth: '420px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '1rem', textAlign: 'left' }}>
            Tus Resultados
          </div>
          {VARIABLES.map((v) => (
            <Barra key={v.key} label={v.label} score={scoresA[v.key]} />
          ))}

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9f7', borderRadius: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '14px', color: '#1a4d4d', marginBottom: '1rem', lineHeight: 1.5 }}>
              ¿Quieres ver tus resultados individuales o aplicar esto a tu pareja para ver cómo interactúan?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={elegirSoloMios}
                style={{
                  background: '#1D9E75',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ver solo mis resultados
              </button>
              <button
                onClick={elegirAplicarPareja}
                style={{
                  background: 'white',
                  color: '#1D9E75',
                  border: '2px solid #1D9E75',
                  padding: '12px 16px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Aplicar a mi pareja
              </button>
            </div>
          </div>
        </div>
      )}

      {vista === 'transicion-b' && (
        <div style={{ maxWidth: '400px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#333', marginBottom: '1.5rem' }}>
            Ahora le toca a tu pareja responder
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Pásale el dispositivo. Responderá las mismas 16 preguntas y luego verán ambos resultados juntos.
          </div>
          <button
            onClick={comenzarFaseB}
            style={{
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Comenzar
          </button>
        </div>
      )}

      {vista === 'resultado-comparado' && (
        <div style={{ maxWidth: '440px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '1rem', textAlign: 'left' }}>
            Resultados en Pareja
          </div>
          {VARIABLES.map((v) => (
            <BarraDoble key={v.key} label={v.label} scoreA={scoresA[v.key]} scoreB={scoresB[v.key]} />
          ))}

          <button
            onClick={finalizarComparado}
            style={{
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: '1rem',
            }}
          >
            Ver recomendaciones
          </button>
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666', marginTop: '2rem', lineHeight: '1.6' }}>
        Los 4 Jinetes de Gottman • Crítica • Desprecio • Defensividad • Obstruccionismo
      </div>
    </div>
  );
}
