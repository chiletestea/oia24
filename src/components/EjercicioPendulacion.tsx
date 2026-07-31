'use client';

import { useState } from 'react';

interface EjercicioPendulacionProps {
  onCalmaResponse?: (valor: number) => void;
  onClose?: () => void;
}

export default function EjercicioPendulacion({ onCalmaResponse, onClose }: EjercicioPendulacionProps) {
  const [mostrarAvatar, setMostrarAvatar] = useState(false);
  const [mostrarEscala, setMostrarEscala] = useState(false);
  const [oscilando, setOscilando] = useState(false);

  const iniciarPendulacion = () => {
    setOscilando(true);

    // 2 minutos (120000ms)
    setTimeout(() => {
      finalizarPendulacion();
    }, 120000);
  };

  const finalizarPendulacion = () => {
    setOscilando(false);
    setMostrarAvatar(true);

    setTimeout(() => {
      setMostrarEscala(true);
    }, 1500);
  };

  const procesarCalma = (valor: number) => {
    if (onCalmaResponse) {
      onCalmaResponse(valor);
    } else {
      alert(`Gracias. Tu nivel de calma es ${valor}.`);
    }
  };

  const volverAlChat = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div style={{ textAlign: 'center', maxWidth: '100%', margin: '0', padding: '1rem', position: 'relative', minHeight: '100vh', overflow: 'auto' }}>
      <style>{`
        @keyframes oscilar {
          0%, 100% { transform: translateX(-36px); }
          50% { transform: translateX(36px); }
        }
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
        {mostrarAvatar ? '✓ ¡Excelente!' : 'Pendulación'}
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
        {mostrarAvatar ? 'Tu mente está más calmada.' : 'Alterna tu atención entre seguridad y presencia.'}
      </div>

      {!mostrarAvatar && !mostrarEscala && (
        <>
          <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto 1rem', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '12px', position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 0.5rem' }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e8f5e9', border: '2px solid #4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, margin: '0 auto' }}>
                🟢
              </div>
              <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '6px' }}>Seguridad</div>
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#1D9E75',
                  boxShadow: '0 2px 8px rgba(29, 158, 117, 0.3)',
                  animation: oscilando ? 'oscilar 3s ease-in-out infinite' : 'none',
                  flexShrink: 0
                }}
              />
              <div style={{ width: '100%', maxWidth: '140px', height: '2px', background: '#d0d0d0', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: '-8px', width: '4px', height: '18px', background: '#1D9E75', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', right: 0, top: '-8px', width: '4px', height: '18px', background: '#1D9E75', borderRadius: '2px' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff3e0', border: '2px solid #ff9800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, margin: '0 auto' }}>
                🟠
              </div>
              <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '6px' }}>Presencia</div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#666', marginTop: '2rem', lineHeight: '1.6', maxWidth: '400px', margin: '2rem auto' }}>
            <p><strong>Observa cómo la esfera oscila</strong> entre un lugar seguro (verde) y tu cuerpo/sensaciones (naranja).</p>
            <p>No necesitas hacer nada, solo dejar que tu atención fluya naturalmente. Dura 2 minutos.</p>
          </div>

          <button
            onClick={oscilando ? volverAlChat : iniciarPendulacion}
            style={{
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '2rem'
            }}
          >
            {oscilando ? 'Terminar' : 'Comenzar'}
          </button>
        </>
      )}

      {mostrarEscala && (
        <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem', color: '#333' }}>
            ¿Qué tan calmado te sientes? (0 a 10)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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
        Regulación emocional • Calma tu mente
      </div>
    </div>
  );
}
