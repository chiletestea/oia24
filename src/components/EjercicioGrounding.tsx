'use client';

import { useState } from 'react';

interface EjercicioGroundingProps {
  onPresenciaResponse?: (valor: number) => void;
}

const SENTIDOS = [
  { nombre: 'Ver', emoji: '👁️', cantidad: 5, placeholder: 'Ej: una ventana, un libro...', clase: 'ver' },
  { nombre: 'Tocar', emoji: '✋', cantidad: 4, placeholder: 'Ej: una almohada, mi ropa...', clase: 'tocar' },
  { nombre: 'Escuchar', emoji: '👂', cantidad: 3, placeholder: 'Ej: un pájaro, el viento...', clase: 'escuchar' },
  { nombre: 'Oler', emoji: '👃', cantidad: 2, placeholder: 'Ej: café, flores...', clase: 'oler' },
  { nombre: 'Saborear', emoji: '👅', cantidad: 1, placeholder: 'Ej: mi boca, chicle...', clase: 'saborear' }
];

export default function EjercicioGrounding({ onPresenciaResponse }: EjercicioGroundingProps) {
  const [sentidoActualIdx, setSentidoActualIdx] = useState(0);
  const [mostrarAvatar, setMostrarAvatar] = useState(false);
  const [mostrarEscala, setMostrarEscala] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [progreso, setProgreso] = useState(0);

  const getBotonText = (cantidad: number) => {
    return cantidad === 1 ? 'La tengo' : 'Las tengo';
  };

  const completarSentidoActual = () => {
    const nuevoIdx = sentidoActualIdx + 1;
    setSentidoActualIdx(nuevoIdx);
    setInputValue('');
    const porcentaje = (nuevoIdx / SENTIDOS.length) * 100;
    setProgreso(porcentaje);

    if (nuevoIdx >= SENTIDOS.length) {
      setTimeout(() => {
        finalizarEjercicio();
      }, 500);
    }
  };

  const finalizarEjercicio = () => {
    setMostrarAvatar(true);
    setTimeout(() => {
      setMostrarEscala(true);
    }, 1500);
  };

  const procesarPresencia = (valor: number) => {
    if (onPresenciaResponse) {
      onPresenciaResponse(valor);
    } else {
      alert(`Gracias. Has llegado a un ${valor} de presencia.`);
    }
  };

  const volverAlChat = () => {
    if (confirm('¿Volver al chat con O?')) {
      console.log('Volver al chat');
    }
  };

  const sentidoActual = sentidoActualIdx < SENTIDOS.length ? SENTIDOS[sentidoActualIdx] : null;

  const animacionEmoji = {
    ver: 'pulse 1.5s ease-in-out infinite',
    tocar: 'pulse 1.8s ease-in-out infinite',
    escuchar: 'pulse 1.6s ease-in-out infinite',
    oler: 'pulse 2s ease-in-out infinite',
    saborear: 'pulse 1.4s ease-in-out infinite'
  };

  const getKeyframes = () => {
    const keyframesMap: { [key: string]: string } = {
      ver: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
      `,
      tocar: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `,
      escuchar: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.12); }
          75% { transform: scale(1.12); }
        }
      `,
      oler: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `,
      saborear: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          75% { transform: scale(1.2); }
        }
      `
    };
    return sentidoActual ? keyframesMap[sentidoActual.clase] || '' : '';
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem', position: 'relative', minHeight: '600px' }}>
      <style>{`
        ${getKeyframes()}
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
          fontWeight: 'bold'
        }}
      >
        ✕
      </button>

      {mostrarAvatar && (
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#1D9E75', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
          ◯◯
        </div>
      )}

      <div style={{ fontSize: '24px', fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>
        {mostrarAvatar ? '✓ ¡Excelente!' : 'Anclaje sensorial 5-4-3-2-1'}
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
        {mostrarAvatar ? 'Estás anclado en el presente.' : 'Conecta con tus sentidos. Identifica una cosa para cada uno.'}
      </div>

      {!mostrarAvatar && !mostrarEscala && sentidoActual && (
        <>
          <div style={{ maxWidth: '300px', margin: '0 auto 2rem' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
              Paso {sentidoActualIdx + 1} de 5
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1D9E75', width: progreso + '%', transition: 'width 0.3s', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '2rem 1.5rem', maxWidth: '400px', margin: '0 auto', textAlign: 'left', animation: 'slideIn 0.5s ease-in-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '36px', animation: animacionEmoji[sentidoActual.clase as keyof typeof animacionEmoji] }}>
                {sentidoActual.emoji}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>
                  {sentidoActual.nombre}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {sentidoActual.cantidad} {sentidoActual.cantidad === 1 ? 'cosa' : 'cosas'}
                </div>
              </div>
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={sentidoActual.placeholder}
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'inherit',
                marginBottom: '1rem'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  completarSentidoActual();
                }
              }}
            />

            <button
              onClick={completarSentidoActual}
              disabled={!inputValue.trim()}
              style={{
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                width: '100%',
                opacity: inputValue.trim() ? 1 : 0.5
              }}
            >
              {getBotonText(sentidoActual.cantidad)}
            </button>
          </div>
        </>
      )}

      {mostrarEscala && (
        <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem', color: '#333' }}>
            ¿Qué tan presente te sientes? (0 a 10)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <button
                key={i}
                onClick={() => procesarPresencia(i)}
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
                  transition: 'all 0.2s'
                }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666', marginTop: '2rem', lineHeight: '1.6' }}>
        5 cosas que VES • 4 que TOCAS • 3 que ESCUCHAS • 2 que HUELES • 1 que SABOREAS
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
