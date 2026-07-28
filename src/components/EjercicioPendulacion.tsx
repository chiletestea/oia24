'use client';

import { useState } from 'react';

interface EjercicioPendulacionProps {
  onCalmaResponse?: (valor: number) => void;
}

export default function EjercicioPendulacion({ onCalmaResponse }: EjercicioPendulacionProps) {
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
    if (confirm('¿Volver al chat con O?')) {
      console.log('Volver al chat');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem', position: 'relative', minHeight: '600px' }}>
      <style>{`
        @keyframes oscilar {
          0%, 100% { transform: translateX(-140px); }
          50% { transform: translateX(140px); }
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
          <div style={{ maxWidth: '500px', margin: '2rem auto', height: '400px', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '12px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e8f5e9', border: '2px solid #4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                🟢
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', marginTop: '8px' }}>Seguridad</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#1D9E75',
                  boxShadow: '0 2px 8px rgba(29, 158, 117, 0.3)',
                  animation: oscilando ? 'oscilar 3s ease-in-out infinite' : 'none'
                }}
              />
              <div style={{ width: '280px', height: '2px', background: '#d0d0d0', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: '-8px', width: '4px', height: '18px', background: '#1D9E75', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', right: 0, top: '-8px', width: '4px', height: '18px', background: '#1D9E75', borderRadius: '2px' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff3e0', border: '2px solid #ff9800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                🟠
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', marginTop: '8px' }}>Presencia</div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#666', marginTop: '2rem', lineHeight: '1.6', maxWidth: '400px', margin: '2rem auto' }}>
            <p><strong>Observa cómo la esfera oscila</strong> entre un lugar seguro (verde) y tu cuerpo/sensaciones (naranja).</p>
            <p>No necesitas hacer nada, solo dejar que tu atención fluya naturalmente. Dura 2 minutos.</p>
          </div>

          <button
            onClick={iniciarPendulacion}
            disabled={oscilando}
            style={{
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: oscilando ? 'not-allowed' : 'pointer',
              marginTop: '2rem',
              opacity: oscilando ? 0.5 : 1
            }}
          >
            {oscilando ? 'Oscilando...' : 'Comenzar'}
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
