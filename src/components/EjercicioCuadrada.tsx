'use client';

import { useState } from 'react';

interface EjercicioCuadradaProps {
  onCalmaResponse?: (valor: number) => void;
  onPresenciaResponse?: (valor: number) => void;
  onClose?: () => void;
}

const TOTAL_CICLOS = 8;
const LADO = 400;

type Lado = 'izquierda' | 'arriba' | 'derecha' | 'abajo';

const FASES: { lado: Lado; duracion: number; etiqueta: string; color: string }[] = [
  { lado: 'izquierda', duracion: 4, etiqueta: 'Inhala', color: '#1976d2' },
  { lado: 'arriba', duracion: 4, etiqueta: 'Mantén respiración', color: '#f57c00' },
  { lado: 'derecha', duracion: 4, etiqueta: 'Exhala', color: '#4caf50' },
  { lado: 'abajo', duracion: 4, etiqueta: 'No respires', color: '#757575' },
];

const LINEAS: Record<Lado, { x1: number; y1: number; x2: number; y2: number }> = {
  izquierda: { x1: 50, y1: 450, x2: 50, y2: 50 },
  arriba: { x1: 50, y1: 50, x2: 450, y2: 50 },
  derecha: { x1: 450, y1: 50, x2: 450, y2: 450 },
  abajo: { x1: 450, y1: 450, x2: 50, y2: 450 },
};

export default function EjercicioCuadrada({ onCalmaResponse, onClose }: EjercicioCuadradaProps) {
  const [mostrarAvatar, setMostrarAvatar] = useState(false);
  const [mostrarEscala, setMostrarEscala] = useState(false);
  const [cicloActual, setCicloActual] = useState(1);
  const [progreso, setProgreso] = useState(0);
  const [instruccion, setInstruccion] = useState('Respiración cuadrada');
  const [contador, setContador] = useState(4);
  const [colorActual, setColorActual] = useState('#1976d2');
  const [celebrando, setCelebrando] = useState(false);
  const [activeLado, setActiveLado] = useState<Lado | null>(null);
  const [duracionActiva, setDuracionActiva] = useState(4);
  const [offsets, setOffsets] = useState<Record<Lado, number>>({
    izquierda: LADO,
    arriba: LADO,
    derecha: LADO,
    abajo: LADO,
  });

  const resetLineas = () => {
    setActiveLado(null);
    setOffsets({ izquierda: LADO, arriba: LADO, derecha: LADO, abajo: LADO });
  };

  const iniciarEjercicio = () => {
    setCicloActual(1);
    setProgreso(0);
    ejecutarCiclo(1);
  };

  const ejecutarCiclo = (ciclo: number) => {
    if (ciclo > TOTAL_CICLOS) {
      finalizarEjercicio();
      return;
    }

    setCicloActual(ciclo);
    resetLineas();
    setTimeout(() => {
      ejecutarFases(ciclo, 0);
    }, 50);
  };

  const ejecutarFases = (ciclo: number, faseIdx: number) => {
    if (faseIdx >= FASES.length) {
      celebrarYContinuar(ciclo);
      return;
    }

    const fase = FASES[faseIdx];
    setInstruccion(fase.etiqueta);
    setColorActual(fase.color);
    setDuracionActiva(fase.duracion);
    setActiveLado(fase.lado);

    setTimeout(() => {
      setOffsets((prev) => ({ ...prev, [fase.lado]: 0 }));
    }, 50);

    let tiempo = fase.duracion;
    setContador(tiempo);

    const timerInterval = setInterval(() => {
      tiempo--;
      setContador(tiempo);

      if (tiempo <= 0) {
        clearInterval(timerInterval);
        ejecutarFases(ciclo, faseIdx + 1);
      }
    }, 1000);
  };

  const celebrarYContinuar = (ciclo: number) => {
    setActiveLado(null);
    setInstruccion('¡Bien hecho!');
    setCelebrando(true);

    setTimeout(() => {
      setCelebrando(false);
      setProgreso((ciclo / TOTAL_CICLOS) * 100);
      ejecutarCiclo(ciclo + 1);
    }, 400);
  };

  const finalizarEjercicio = () => {
    resetLineas();
    setMostrarAvatar(true);
    setTimeout(() => {
      setMostrarEscala(true);
    }, 1500);
  };

  const procesarCalma = (valor: number) => {
    if (onCalmaResponse) {
      onCalmaResponse(valor);
    } else {
      alert(`Gracias. Has llegado a un ${valor} de calma.`);
    }
  };

  const volverAlChat = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '1rem', position: 'relative', minHeight: '600px', maxWidth: '100%' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes celebrarPulso {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(29, 158, 117, 0)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 12px rgba(29, 158, 117, 0.6)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(29, 158, 117, 0)); }
        }
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

      {mostrarAvatar && (
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: '#1D9E75',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}
        >
          ◯◯
        </div>
      )}

      <div style={{ fontSize: '24px', fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>
        {mostrarAvatar ? '✓ ¡Lo hiciste excelente!' : 'Respiración cuadrada'}
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
        {mostrarAvatar ? 'Tu cuerpo está más calmado.' : 'Regulariza tu sistema nervioso con un ritmo de 4 tiempos'}
      </div>

      {!mostrarAvatar && !mostrarEscala && (
        <>
          <div style={{ maxWidth: '300px', margin: '0 auto 2rem' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
              Ciclo {cicloActual} de {TOTAL_CICLOS}
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: '#1D9E75',
                  width: progreso + '%',
                  transition: 'width 0.3s',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '350px',
              height: '350px',
              margin: '0 auto 1rem',
              animation: celebrando ? 'celebrarPulso 0.4s ease-in-out' : 'none',
            }}
          >
            <svg width={350} height={350} viewBox="0 0 500 500" style={{ display: 'block' }}>
              <rect x={50} y={50} width={400} height={400} fill="none" stroke="#e0e0e0" strokeWidth={2} />
              {(Object.keys(LINEAS) as Lado[]).map((lado) => {
                const fase = FASES.find((f) => f.lado === lado)!;
                const { x1, y1, x2, y2 } = LINEAS[lado];
                return (
                  <line
                    key={lado}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={fase.color}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={LADO}
                    strokeDashoffset={offsets[lado]}
                    style={{
                      transition: activeLado === lado ? `stroke-dashoffset ${duracionActiva}s linear` : 'none',
                    }}
                  />
                );
              })}
            </svg>

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#333', padding: '0 1rem' }}>
                {instruccion}
              </div>
              <div style={{ fontSize: '42px', fontWeight: '500', marginTop: '0.5rem', color: colorActual }}>
                {contador}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#666', marginTop: '1rem' }}>
            Inhala 4s • Mantén 4s • Exhala 4s • No respires 4s
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={iniciarEjercicio}
              style={{
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Comenzar
            </button>
          </div>
        </>
      )}

      {mostrarEscala && (
        <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem', color: '#333' }}>
            ¿Qué tal tu calma ahora? (0 a 10)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <button
                key={i}
                onClick={() => procesarCalma(i)}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: i <= 3 ? '2px solid #d32f2f' : i >= 8 ? '2px solid #4caf50' : '2px solid #1D9E75',
                  background: 'white',
                  color: i <= 3 ? '#d32f2f' : i >= 8 ? '#4caf50' : '#1D9E75',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666', marginTop: '2rem', lineHeight: '1.6' }}>
        8 ciclos • Inhala • Mantén • Exhala • No respires
      </div>
    </div>
  );
}
