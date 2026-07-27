'use client';

import { useEffect, useRef, useState } from 'react';

export default function EjercicioRespiracion() {
  const [estado, setEstado] = useState('reposo');
  const [cicloActual, setCicloActual] = useState(0);
  const [contador, setContador] = useState(4);
  const [mostrarAvatar, setMostrarAvatar] = useState(true);
  const [mostrarCirculo, setMostrarCirculo] = useState(false);
  const [mostrarProgreso, setMostrarProgreso] = useState(false);
  const [mostrarEscala, setMostrarEscala] = useState(false);
  const [instruccion, setInstruccion] = useState('Respiración 4-7-8');
  const [progreso, setProgreso] = useState(0);
  const [botonText, setBotonText] = useState('Comenzar');
  const [botonDisabled, setBotonDisabled] = useState(false);

  // Limpia timers pendientes si el componente se desmonta a mitad del
  // ejercicio (p.ej. al volver al chat) — evita setState sobre un
  // componente ya desmontado.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const iniciarEjercicio = () => {
    setBotonDisabled(true);
    setMostrarAvatar(false);
    setMostrarCirculo(true);
    setMostrarProgreso(true);
    setMostrarEscala(false);
    setInstruccion('Respiración 4-7-8');
    ejecutarCiclo(1);
  };

  const ejecutarCiclo = (ciclo: number) => {
    if (ciclo > 3) {
      finalizarEjercicio();
      return;
    }

    setCicloActual(ciclo);
    setProgreso((ciclo / 3) * 100);

    setEstado('inspirando');
    setInstruccion('Toma aire lentamente...');
    contarHasta(4, () => {
      setEstado('sosteniendo');
      setInstruccion('Sostén la respiración...');
      contarHasta(7, () => {
        setEstado('espirando');
        setInstruccion('Bota aire lentamente...');
        contarHasta(8, () => {
          ejecutarCiclo(ciclo + 1);
        });
      });
    });
  };

  const contarHasta = (segundos: number, callback: () => void) => {
    let restantes = segundos;
    setContador(restantes);

    const interval = setInterval(() => {
      restantes--;
      setContador(Math.max(0, restantes));

      if (restantes <= 0) {
        clearInterval(interval);
        callback();
      }
    }, 1000);

    intervalRef.current = interval;
  };

  const finalizarEjercicio = () => {
    setMostrarCirculo(false);
    setMostrarProgreso(false);
    setMostrarAvatar(true);
    setEstado('completado');
    setInstruccion('✓ ¡Lo hiciste excelente!');
    setBotonText('Repetir');
    setBotonDisabled(false);

    timeoutRef.current = setTimeout(() => {
      setMostrarEscala(true);
    }, 1500);
  };

  const procesarRespuestaCalma = (valor: number) => {
    let respuesta = '';

    if (valor <= 3) {
      respuesta = 'Veo que aún hay tensión. ¿Hacemos otro ciclo?';
    } else if (valor <= 5) {
      respuesta = 'Bien, estás avanzando. ¿Un ciclo más?';
    } else if (valor <= 7) {
      respuesta = '¡Excelente! ¿Profundizamos con otro ciclo?';
    } else {
      respuesta = '¡Increíble! Lograste una calma profunda.';
    }

    alert(respuesta);
  };

  const reiniciarParaOtroCiclo = () => {
    setMostrarEscala(false);
    setMostrarAvatar(false);
    setMostrarCirculo(true);
    setMostrarProgreso(true);
    setInstruccion('Respiración 4-7-8');
    setBotonText('Comenzar');
    setBotonDisabled(false);
    ejecutarCiclo(1);
  };

  const volverAlChat = () => {
    if (confirm('¿Volver al chat con O?')) {
      console.log('Volver al chat');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem', position: 'relative', minHeight: '600px' }}>
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
        }}
      >
        ✕
      </button>

      {mostrarAvatar && (
        <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: '#1D9E75', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '50px' }}>◯◯</span>
        </div>
      )}

      <div style={{ fontSize: '22px', fontWeight: '500', marginBottom: '1.5rem', color: '#333', minHeight: '35px' }}>
        {instruccion}
      </div>

      {mostrarProgreso && (
        <div style={{ margin: '0 auto 2rem', maxWidth: '350px' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '0.8rem', fontWeight: '500' }}>
            Ciclo {cicloActual} de 3
          </div>
          <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#1D9E75', width: progreso + '%', transition: 'width 0.3s', borderRadius: '5px' }} />
          </div>
        </div>
      )}

      {mostrarCirculo && (
        <div
          key={`${cicloActual}-${estado}`}
          style={{ width: '220px', height: '220px', border: '5px solid #1D9E75', borderRadius: '50%', margin: '2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: '#1D9E75', animation: estado === 'inspirando' ? 'respirar-inspirar 4s ease-in forwards' : estado === 'sosteniendo' ? 'respirar-sostener 7s ease-in-out forwards' : 'respirar-espirar 8s ease-out forwards' }}
        >
          {contador}
        </div>
      )}

      <style>{`
        @keyframes respirar-inspirar { from { transform: scale(1); } to { transform: scale(1.6); } }
        @keyframes respirar-sostener { from { transform: scale(1.6); } to { transform: scale(1.6); } }
        @keyframes respirar-espirar { from { transform: scale(1.6); } to { transform: scale(1); } }
      `}</style>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={botonText === 'Comenzar' ? iniciarEjercicio : reiniciarParaOtroCiclo}
          disabled={botonDisabled}
          style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '14px 40px', borderRadius: '28px', fontSize: '16px', fontWeight: '500', cursor: botonDisabled ? 'not-allowed' : 'pointer', opacity: botonDisabled ? 0.5 : 1 }}
        >
          {botonText}
        </button>
      </div>

      {mostrarEscala && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem', color: '#333' }}>
            ¿Qué tan calmado te sientes? (0 a 10)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <button key={i} onClick={() => procesarRespuestaCalma(i)} style={{ width: '48px', height: '48px', borderRadius: '50%', border: i <= 3 ? '2px solid #d32f2f' : i >= 8 ? '2px solid #4caf50' : '2px solid #1D9E75', background: 'white', color: i <= 3 ? '#d32f2f' : i >= 8 ? '#4caf50' : '#1D9E75', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
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
