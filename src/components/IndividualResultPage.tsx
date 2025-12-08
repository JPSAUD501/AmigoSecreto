"use client";

import type React from 'react';
import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactConfetti from 'react-confetti';

function IndividualResultContent() {
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('');
  const [drawnName, setDrawnName] = useState('');
  const [error, setError] = useState('');
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokesCounter = useRef(0);

  useEffect(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      const userParam = searchParams.get('u');
      const resultParam = searchParams.get('f');

      if (!userParam || !resultParam) {
        setError('Link inválido. Verifique o link recebido.');
        return;
      }

      const decodedUser = decodeURIComponent(atob(userParam));
      const decodedResult = decodeURIComponent(atob(resultParam));

      setUserName(decodedUser);
      setDrawnName(decodedResult);
    } catch {
      setError('Erro ao processar o link. Verifique o link recebido.');
    }
  }, [searchParams]);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = container.getBoundingClientRect();
    canvas.width = Math.max(width, 240);
    canvas.height = Math.max(height, 120);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1d4ed8');
    gradient.addColorStop(1, '#60a5fa');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 10 + 6;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    setRevealProgress(0);
    setIsRevealed(false);
    setShowConfetti(false);
  }, []);

  useEffect(() => {
    if (drawnName) {
      initializeCanvas();
    }
  }, [drawnName, initializeCanvas]);

  const revealAll = useCallback(() => {
    setIsRevealed(true);
    setShowConfetti(true);
  }, []);

  const calculateProgress = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    let total = 0;

    for (let i = 3; i < imageData.length; i += 32) {
      total += 1;
      if (imageData[i] === 0) {
        transparentPixels += 1;
      }
    }

    const progress = transparentPixels / total;
    setRevealProgress(progress);

    if (progress > 0.6) {
      revealAll();
    }
  }, [revealAll]);

  const scratchAt = useCallback(
    (clientX: number, clientY: number) => {
      if (isRevealed) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
      ctx.stroke();

      strokesCounter.current += 1;
      if (strokesCounter.current % 8 === 0) {
        calculateProgress();
      }
    },
    [calculateProgress, isRevealed]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (isRevealed) return;
      setIsDrawing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      scratchAt(event.clientX, event.clientY);
    },
    [isRevealed, scratchAt]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || isRevealed) return;
      scratchAt(event.clientX, event.clientY);
    },
    [isDrawing, isRevealed, scratchAt]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (isRevealed) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setIsDrawing(false);
      calculateProgress();
    },
    [calculateProgress, isRevealed]
  );

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 w-full">
      {drawnName && (
        <ReactConfetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={500}
          run={showConfetti}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Resultado do Amigo Secreto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <p className="text-lg">
              Olá, <span className="font-semibold">{userName}</span>!
            </p>
            <div className="flex flex-col gap-3" aria-live="polite">
              <div className="sr-only">
                Raspe ou clique na área do nome para revelar o amigo secreto. Também há um botão para revelar diretamente.
              </div>
              <div
                ref={containerRef}
                className="relative overflow-hidden rounded-lg bg-gray-100 p-6"
                role="group"
                aria-label={`Nome sorteado para ${userName}`}
              >
                <p
                  className={`text-2xl font-bold text-blue-600 transition-all duration-700 ${
                    isRevealed ? 'opacity-100 scale-105' : 'opacity-60 blur-[2px]'
                  }`}
                >
                  {drawnName}
                </p>
                <p className="text-sm text-gray-600 mt-2">é o seu amigo secreto!</p>

                {!isRevealed && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 cursor-pointer touch-none rounded-lg"
                    aria-hidden
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                )}

                {isRevealed && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-white/30 animate-pulse rounded-lg" />
                    <div
                      className="absolute -left-1/3 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-lg"
                      style={{ animation: 'shine 1.2s ease-in-out' }}
                    />
                  </div>
                )}
              </div>

              {!isRevealed && (
                <div className="text-sm text-gray-600 flex flex-col gap-2" aria-live="polite">
                  <p>Arraste ou clique para revelar.</p>
                  <div className="h-2 w-full rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(revealProgress * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center" aria-live="polite">
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold shadow hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  onClick={revealAll}
                >
                  Revelar nome
                </button>
                <span className="text-sm text-gray-500" role="status">
                  {isRevealed
                    ? 'Nome revelado com sucesso. Parabéns!'
                    : 'Alternativa acessível: use o botão para revelar instantaneamente.'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Lembre-se de manter o nome em segredo.
              <br />
              Boa sorte na escolha do presente!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IndividualResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IndividualResultContent />
    </Suspense>
  );
}