"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function IndividualResultContent() {
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('');
  const [drawnName, setDrawnName] = useState('');
  const [error, setError] = useState('');

  // New state variables for animation
  const [displayedName, setDisplayedName] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

  const startNameAnimation = useCallback((finalName: string) => {
    const names = [
      'Maria', 'João', 'Ana', 'Pedro', 'Lucas', 'Carla',
      'José', 'Fernanda', 'Luisa', 'Paulo', 'Mariana', 'Rafael'
    ];

    const animationDuration = 3000; // Duration of the animation in milliseconds
    const intervalDuration = 100;   // Interval between name changes

    const intervalId: NodeJS.Timeout = setInterval(() => {
      // Exclude the user's own name and the final drawn name
      let randomName = '';
      do {
        randomName = names[Math.floor(Math.random() * names.length)];
      } while (randomName === userName || randomName === finalName);
      setDisplayedName(randomName);
    }, intervalDuration);

    setTimeout(() => {
      clearInterval(intervalId);
      setDisplayedName(finalName);
      setIsRevealed(true);
    }, animationDuration);
  }, [userName]);

  useEffect(() => {
    try {
      const userParam = searchParams.get('user');
      const resultParam = searchParams.get('result');

      if (!userParam || !resultParam) {
        setError('Link inválido. Verifique o link recebido.');
        return;
      }

      const decodedUser = decodeURIComponent(atob(userParam));
      const decodedResult = decodeURIComponent(atob(resultParam));

      setUserName(decodedUser);
      setDrawnName(decodedResult);

      // Start the name shuffling animation
      startNameAnimation(decodedResult);
    } catch {
      setError('Erro ao processar o link. Verifique o link recebido.');
    }
  }, [searchParams, startNameAnimation]);

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
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Resultado do Amigo Secreto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <p className="text-lg">
              Olá, <span className="font-semibold">{userName}</span>!
            </p>
            <div className="bg-gray-100 p-6 rounded-lg">
              {isRevealed ? (
                <>
                  <p className="text-2xl font-bold text-blue-600">{drawnName}</p>
                  <p className="text-sm text-gray-600 mt-2">é o seu amigo secreto!</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-600 animate-pulse">{displayedName}</p>
                  <p className="text-sm text-gray-600 mt-2">Descobrindo seu amigo secreto...</p>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Lembre-se de manter o nome em segredo. Boa sorte na escolha do presente!
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