"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactConfetti from 'react-confetti';

function IndividualResultContent() {
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('');
  const [drawnName, setDrawnName] = useState('');
  const [error, setError] = useState('');
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

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
            <div className="bg-gray-100 p-6 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{drawnName}</p>
              <p className="text-sm text-gray-600 mt-2">é o seu amigo secreto!</p>
            </div>
            <p className="text-sm text-gray-500">
              Lembre-se de manter o nome em segredo.
              <br/>
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