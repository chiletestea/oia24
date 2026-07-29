'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<'exercises' | 'programs' | null>(null);

  // Program data
  const programs = [
    {
      id: 'ansiedad-control',
      title: 'Ansiedad Bajo Control',
      icon: '🎯',
      desc: 'Técnicas específicas para gestionar la ansiedad',
    },
    {
      id: 'respira-trabajo',
      title: 'Respira en el Trabajo',
      icon: '💼',
      desc: 'Ejercicios rápidos para la jornada laboral',
    },
    {
      id: 'regulacion-express',
      title: 'Regulación Express',
      icon: '⚡',
      desc: 'Intervenciones de corta duración, impacto inmediato',
    },
    {
      id: 'deja-sobrepensar',
      title: 'Deja de Sobrepensar',
      icon: '🧠',
      desc: 'Rompe el ciclo de rumiación mental',
    },
    {
      id: 'espejo-emocional',
      title: 'Espejo Emocional',
      icon: '🪞',
      desc: 'Reconoce y comprende tus emociones',
    },
  ];

  // Exercises data
  const exercises = [
    {
      id: 'respiracion-4-7-8',
      title: 'Respiración 4-7-8',
      icon: '🫁',
      desc: 'Para ansiedad aguda y estrés',
      path: '/chat?exercise=respiracion',
    },
    {
      id: 'grounding-5-4-3-2-1',
      title: 'Grounding 5-4-3-2-1',
      icon: '🧭',
      desc: 'Anclaje sensorial para crisis emocionales',
      path: '/chat?exercise=grounding',
    },
    {
      id: 'pendulacion',
      title: 'Pendulación',
      icon: '🌊',
      desc: 'Movimiento bilateral para regulación',
      path: '/chat?exercise=pendulacion',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-teal-900 to-teal-800">
      {/* HERO SECTION - ÚNICO EN LA PÁGINA */}
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Animated orbit background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-96 h-96 border border-dashed border-teal-500/20 rounded-full animate-spin" style={{ animationDuration: '25s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            O tu asistente de bienestar emocional 24/7
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-16">Sin registro de datos</p>

          {/* AVATAR OO - CENTRADO ENTRE LOS GLOBOS */}
          <div className="relative w-full h-80 flex items-center justify-center mb-8">
            {/* Three Bubbles with Avatar in Center */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Top Bubble - Ejercicios */}
              <button
                onClick={() => setActiveModal('exercises')}
                className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-600/10 border-2 border-white/20 flex flex-col items-center justify-center cursor-pointer hover:scale-110 hover:border-teal-500/60 hover:shadow-2xl transition-all duration-300 text-white font-semibold text-sm text-center p-2"
              >
                <span className="text-3xl mb-1">🌊</span>
                <span>Ejercicios<br />guiados</span>
              </button>

              {/* Left Bubble - Chat */}
              <button
                onClick={() => router.push('/chat')}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/30 to-blue-500/10 border-2 border-white/20 flex flex-col items-center justify-center cursor-pointer hover:scale-110 hover:border-blue-500/60 hover:shadow-2xl transition-all duration-300 text-white font-semibold text-sm text-center p-2"
              >
                <span className="text-3xl mb-1">💬</span>
                <span>Chatea<br />con O</span>
              </button>

              {/* Right Bubble - Programas */}
              <button
                onClick={() => setActiveModal('programs')}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-orange-400/30 to-orange-500/10 border-2 border-white/20 flex flex-col items-center justify-center cursor-pointer hover:scale-110 hover:border-orange-500/60 hover:shadow-2xl transition-all duration-300 text-white font-semibold text-sm text-center p-2"
              >
                <span className="text-3xl mb-1">📚</span>
                <span>Programas<br />de entrenamiento</span>
              </button>
            </div>
          </div>

          {/* Trust Markers */}
          <div className="flex flex-wrap gap-6 md:gap-12 justify-center mt-16">
            <div className="text-center">
              <div className="text-teal-400 font-bold text-lg mb-1">✓</div>
              <div className="text-gray-300 text-sm">100% privado</div>
            </div>
            <div className="text-center">
              <div className="text-teal-400 font-bold text-lg mb-1">✓</div>
              <div className="text-gray-300 text-sm">24/7 disponible</div>
            </div>
            <div className="text-center">
              <div className="text-teal-400 font-bold text-lg mb-1">✓</div>
              <div className="text-gray-300 text-sm">Supervisado clínicamente</div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL - EJERCICIOS */}
      {activeModal === 'exercises' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b flex justify-between items-center p-6">
              <h2 className="text-2xl font-bold text-gray-900">🌊 Ejercicios Guiados</h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => {
                    router.push(exercise.path);
                    setActiveModal(null);
                  }}
                  className="border-2 border-teal-500 rounded-lg p-4 text-center cursor-pointer hover:bg-teal-50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-4xl mb-2">{exercise.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{exercise.title}</h3>
                  <p className="text-xs text-gray-600">{exercise.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL - PROGRAMAS */}
      {activeModal === 'programs' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b flex justify-between items-center p-6">
              <h2 className="text-2xl font-bold text-gray-900">📚 Programas de Entrenamiento</h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="border-2 border-teal-500 rounded-lg p-4 text-center cursor-pointer hover:bg-teal-50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-4xl mb-2">{program.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{program.title}</h3>
                  <p className="text-xs text-gray-600">{program.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
