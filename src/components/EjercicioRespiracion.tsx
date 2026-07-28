'use client';

import { useState } from 'react';

interface EjercicioRespiracionProps {
  onCalmaResponse?: (valor: number) => void;
  onClose?: () => void;
}

const FASES = {
  inspirar: {
    duracion: 4,
    etiqueta: 'Inspira lentamente...',
    colorGradient: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
    colorStroke: '#1976d2',
    clase: 'inspirar',
    escalaInicial: 1,
    escalaFinal: 1.15,
  },
  sostener: {
    duracion: 7,
    etiqueta: 'Sostén la respiración...',
    colorGradient: 'linear-gradient(135deg, #ffb74d 0%, #f57c00 100%)',
    colorStroke: '#f57c00',
    clase: 'sostener',
    escalaInicial: 1.15,
    escalaFinal: 1.15,
  },
  espirar: {
    duracion: 8,
    etiqueta: 'Exhala lentamente...',
    colorGradient: 'linear-gradient(135deg, #ce93d8 0%, #7b1fa2 100%)',
    colorStroke: '#7b1fa2',
    clase: 'espirar',
    escalaInicial: 1.15,
    escalaFinal: 0.8,
  },
};

export default function EjercicioRespiracion({ onCalmaResponse, onClose }: EjercicioRespiracionProps) {
  const [mostrarAvatar, setMostrarAvatar] = useState(false);
  const [mostrarEscala, setMostrarEscala] = useState(false);
  const [circuloColor, setCirculoColor] = useState(FASES.inspirar.colorGradient);
  const [circuloStroke, setCirculoStroke] = useState(FASES.inspirar.colorStroke);
  const [circuloScale, setCirculoScale] = useState(1);
  const [circuloTransition, setCirculoTransition] = useState('fill 0.3s ease, stroke 0.3s ease');
  const [instruccion, setInstruccion] = useState('Inspira lentamente...');
  const [contador, setContador] = useState(4);
  const [contadorClase, setContadorClase] = useState('inspirar');
  const [cicloActual, setCicloActual] = useState(1);
  const [progreso, setProgreso] = useState(0);

  const iniciarEjercicio = () => {
    setCicloActual(1);
    setProgreso(0);
    continuarCiclo();
  };

  const continuarCiclo = (ciclo = 1) => {
    if (ciclo > 3) {
      finalizarEjercicio();
      return;
    }

    setCicloActual(ciclo);
    setProgreso((ciclo / 3) * 100);
    ejecutarFases(ciclo);
  };

  const ejecutarFases = (ciclo: number) => {
    const fases = ['inspirar', 'sostener', 'espirar'] as const;
    let faseIdx = 0;

    const ejecutarFase = () => {
      if (faseIdx >= fases.length) {
        setTimeout(() => continuarCiclo(ciclo + 1), 1000);
        return;
      }

      const fase = fases[faseIdx];
      const config = FASES[fase];

      ejecutarAnimacion(config, () => {
        faseIdx++;
        ejecutarFase();
      });
    };

    ejecutarFase();
  };

  const ejecutarAnimacion = (config: typeof FASES.inspirar, callback: () => void) => {
    setInstruccion(config.etiqueta);
    setContadorClase(config.clase);
    setCirculoColor(config.colorGradient);
    setCirculoStroke(config.colorStroke);

    // Transición de color solo, SIN resetear escala
    setCirculoTransition('fill 0.6s ease-in-out, stroke 0.6s ease-in-out');
    // NO hacer setCirculoScale(config.escalaInicial) - mantener el anterior

    // Después de permitir cambio de color, comenzar animación de tamaño
    setTimeout(() => {
      setCirculoTransition(`transform ${config.duracion}s ease-in-out, fill 0.6s ease-in-out, stroke 0.6s ease-in-out`);
      setCirculoScale(config.escalaFinal);
    }, 50);

    let tiempo = config.duracion;
    setContador(tiempo);

    const timerInterval = setInterval(() => {
      tiempo--;
      setContador(tiempo);

      if (tiempo <= 0) {
        clearInterval(timerInterval);
        callback();
      }
    }, 1000);
  };

  const finalizarEjercicio = () => {
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
    <div style={{ textAlign: 'center', padding: '2rem', position: 'relative', minHeight: '600px' }}>
      <style>{`
        .contador-inspirar { color: #1976d2; }
        .contador-sostener { color: #f57c00; }
        .contador-espirar { color: #7b1fa2; }
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
          width: '30px',
          height: '30px',
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
        {mostrarAvatar ? '✓ ¡Lo hiciste excelente!' : 'Respiración 4-7-8'}
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
        {mostrarAvatar ? 'Tu cuerpo está más calmado.' : 'Regulariza tu sistema nervioso'}
      </div>

      {!mostrarAvatar && !mostrarEscala && (
        <>
          <div style={{ maxWidth: '300px', margin: '0 auto 2rem' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
              Ciclo {cicloActual} de 3
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
              width: '320px',
              height: '320px',
              margin: '0 auto 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '182px',
                height: '182px',
                borderRadius: '50%',
                background: circuloColor,
                border: `6px solid ${circuloStroke}`,
                transform: `scale(${circuloScale})`,
                transition: circuloTransition,
                willChange: 'transform',
              }}
            />
          </div>

          <div style={{ fontSize: '16px', fontWeight: '500', color: '#333', marginBottom: '1rem', height: '24px' }}>
            {instruccion}
          </div>
          <div style={{ fontSize: '42px', fontWeight: '500', margin: '0.5rem 0' }} className={`contador-${contadorClase}`}>
            {contador}
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '1rem' }}>
            Inspira 4 segundos • Sostén 7 segundos • Espira 8 segundos
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
            ¿Qué tan calmado te sientes? (0 a 10)
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
        Inspira 4 segundos • Sostén 7 segundos • Espira 8 segundos
      </div>
    </div>
  );
}
